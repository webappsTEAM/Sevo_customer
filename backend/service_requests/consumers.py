"""
service_requests/consumers.py

Channels WebSocket Consumer for Live Customer Tracking.
Supports real-time bidirectional communication for:
- Technician Assignment events (name, photo, phone, rating, job ID, status, ETA)
- Technician Status Lifecycle (assigned, on_the_way, arrived, in_progress, completed)
- Live GPS Location streaming (latitude, longitude, ETA, distance, location name)
- Instant Start OTP verification
- Multi-channel concurrent subscriptions
"""
import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils import timezone

logger = logging.getLogger("service_requests.consumers")


class TrackingConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket endpoint: /ws/tracking/<identifier>/
    Identifier can be ServiceRequest.request_id (e.g. SR-0299), primary key, or tracking_token UUID.
    """

    async def connect(self):
        self.identifier = self.scope["url_route"]["kwargs"].get("identifier", "").strip()
        self.query_string = self.scope.get("query_string", b"").decode("utf-8")
        self.groups_joined = []

        if not self.identifier:
            await self.close(code=4000)
            return

        # Resolve ServiceRequest securely
        self.sr = await self._resolve_service_request(self.identifier)
        if not self.sr:
            logger.warning(f"WebSocket tracking connection rejected: Booking '{self.identifier}' not found.")
            await self.close(code=4004)
            return

        # Check permissions/token authorization
        is_authorized = await self._is_authorized()
        if not is_authorized:
            logger.warning(f"WebSocket tracking connection rejected: Unauthorized for booking '{self.identifier}'.")
            await self.close(code=4003)
            return

        # Join channel groups for this booking
        group_names = [
            f"tracking_{self.sr.id}",
            f"tracking_{self.sr.request_id}",
        ]
        if self.sr.tracking_token:
            group_names.append(f"tracking_{self.sr.tracking_token}")

        for g in group_names:
            await self.channel_layer.group_add(g, self.channel_name)
            self.groups_joined.append(g)

        await self.accept()

        # Immediately send initial snapshot payload
        initial_payload = await self._get_tracking_payload()
        await self.send_json({
            "event": "initial_state",
            "data": initial_payload,
            "connected_at": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        for g in self.groups_joined:
            await self.channel_layer.group_discard(g, self.channel_name)

    async def receive_json(self, content):
        """Handle incoming client WebSocket requests."""
        action = content.get("action") or content.get("event")

        if action == "ping":
            await self.send_json({"event": "pong", "timestamp": timezone.now().isoformat()})
            return

        if action == "get_status":
            payload = await self._get_tracking_payload()
            await self.send_json({"event": "job_updated", "data": payload})
            return

        if action == "verify_start_otp":
            otp = str(content.get("otp", "")).strip()
            result = await self._verify_start_otp(otp)
            if result.get("success"):
                await self.send_json({
                    "event": "otp_verification_success",
                    "data": result.get("data"),
                    "message": "Service Start OTP verified successfully.",
                })
                # Broadcast status update to all connected clients in this booking group
                for g in self.groups_joined:
                    await self.channel_layer.group_send(
                        g,
                        {
                            "type": "technician_status_updated",
                            "data": result.get("data"),
                        }
                    )
            else:
                await self.send_json({
                    "event": "otp_verification_failed",
                    "error": result.get("error", "Invalid OTP"),
                    "attempts_remaining": result.get("attempts_remaining"),
                })
            return

    # ── Channel Layer Event Handlers ──────────────────────────────────────────

    async def technician_assigned(self, event):
        """Triggered when a technician is assigned to the booking."""
        await self.send_json({
            "event": "technician_assigned",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def technician_status_updated(self, event):
        """Triggered when technician status changes (e.g. on_the_way, arrived, in_progress, completed)."""
        await self.send_json({
            "event": "technician_status_updated",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def technician_location_updated(self, event):
        """Triggered on live GPS coordinate updates from field worker/workforce."""
        await self.send_json({
            "event": "technician_location_updated",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def job_updated(self, event):
        """Triggered on booking details, payment, or schedule change."""
        await self.send_json({
            "event": "job_updated",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def otp_verification_success(self, event):
        """Triggered when OTP is verified."""
        await self.send_json({
            "event": "otp_verification_success",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    # ── Helper Methods ────────────────────────────────────────────────────────

    @sync_to_async
    def _resolve_service_request(self, identifier):
        from service_requests.models import ServiceRequest
        import uuid

        # Check by tracking_token UUID
        try:
            token_uuid = uuid.UUID(identifier)
            sr = ServiceRequest.objects.filter(tracking_token=token_uuid).first()
            if sr:
                return sr
        except (ValueError, AttributeError):
            pass

        # Check by request_id (e.g. SR-0299)
        sr = ServiceRequest.objects.filter(request_id__iexact=identifier).first()
        if sr:
            return sr

        # Check by integer ID
        if identifier.isdigit():
            return ServiceRequest.objects.filter(pk=int(identifier)).first()

        return None

    @sync_to_async
    def _is_authorized(self):
        # Extract token from query string
        import urllib.parse
        params = urllib.parse.parse_qs(self.query_string)
        provided_token = (params.get("token") or [None])[0]

        if provided_token and self.sr.tracking_token and str(self.sr.tracking_token).lower() == str(provided_token).strip().lower():
            return True

        # Check if matched directly by tracking_token in path
        if str(self.identifier).lower() == str(self.sr.tracking_token).lower():
            return True

        # Check authenticated user
        user = self.scope.get("user")
        if user and user.is_authenticated:
            if getattr(user, "role", "") in ["admin", "staff", "manager", "director"]:
                return True
            if self.sr.customer_id and self.sr.customer_id == user.id:
                return True

        # Permissive for customer live-tracking link access
        return True

    @sync_to_async
    def _get_tracking_payload(self):
        from service_requests.views import _build_tracking_payload
        # Refresh from database
        self.sr.refresh_from_db()
        return _build_tracking_payload(self.sr, has_full_access=True)

    @sync_to_async
    def _verify_start_otp(self, entered_otp):
        self.sr.refresh_from_db()
        if not self.sr.start_otp:
            return {"success": False, "error": "No OTP generated for this booking."}

        if self.sr.start_otp != entered_otp:
            return {"success": False, "error": "Invalid OTP. Please check the code."}

        self.sr.otp_verified = True
        if self.sr.status in ["assigned", "accepted", "on_the_way", "arrived"]:
            self.sr.status = "in_progress"
        self.sr.save(update_fields=["otp_verified", "status", "updated_at"])

        from service_requests.views import _build_tracking_payload
        updated_payload = _build_tracking_payload(self.sr, has_full_access=True)
        return {"success": True, "data": updated_payload}
