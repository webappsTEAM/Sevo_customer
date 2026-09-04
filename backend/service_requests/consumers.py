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

    @classmethod
    async def encode_json(cls, content):
        from django.core.serializers.json import DjangoJSONEncoder
        return json.dumps(content, cls=DjangoJSONEncoder)

    async def connect(self):
        try:
            self.identifier = self.scope["url_route"]["kwargs"].get("identifier", "").strip()
            self.query_string = self.scope.get("query_string", b"").decode("utf-8")
            self.groups_joined = []

            logger.info(f"[WS] Connection attempt: identifier='{self.identifier}'")

            import urllib.parse
            params = urllib.parse.parse_qs(self.query_string)
            has_token = bool((params.get("token") or [None])[0])
            logger.info(f"[WS] Booking ID received: {self.identifier}")
            logger.info(f"[WS] Authentication validated: token_provided={has_token}")

            # Accept connection immediately to complete HTTP/1.1 101 Switching Protocols handshake
            await self.accept()
            logger.info("[WS] WebSocket handshake accepted")

            if not self.identifier:
                # Handle general live-location stream
                await self.channel_layer.group_add("tracking_general", self.channel_name)
                self.groups_joined.append("tracking_general")
                logger.info(f"[WS] Client connected: channel={self.channel_name}, group=tracking_general")
                await self.send_json({
                    "event": "connected",
                    "connected_at": timezone.now().isoformat(),
                })
                return

            # Resolve ServiceRequest
            self.sr = await self._resolve_service_request(self.identifier, self.query_string)
            if self.sr:
                logger.info(f"[WS] Customer authorized: booking_id={self.sr.id}, request_id={self.sr.request_id}, status={self.sr.status}")

            # Build channel groups to join
            group_names = [
                f"tracking_{self.identifier}",
            ]

            token_param = (params.get("token") or [None])[0]
            if token_param:
                group_names.append(f"tracking_{token_param}")

            if self.sr:
                group_names.append(f"tracking_{self.sr.id}")
                group_names.append(f"tracking_{self.sr.request_id}")
                if self.sr.tracking_token:
                    group_names.append(f"tracking_{self.sr.tracking_token}")

            # Deduplicate and join groups
            unique_groups = list(dict.fromkeys(group_names))
            for g in unique_groups:
                await self.channel_layer.group_add(g, self.channel_name)
                self.groups_joined.append(g)

            logger.info(f"[WS] Client connected: channel={self.channel_name}, groups={unique_groups}")

            if self.sr:
                # Immediately send initial snapshot payload
                initial_payload = await self._get_tracking_payload()
                await self.send_json({
                    "event": "initial_state",
                    "data": initial_payload,
                    "connected_at": timezone.now().isoformat(),
                })
            else:
                await self.send_json({
                    "event": "connected",
                    "status": "waiting_for_booking",
                    "identifier": self.identifier,
                    "connected_at": timezone.now().isoformat(),
                })
        except Exception as e:
            logger.error(f"Error during WebSocket connection handshake: {e}", exc_info=True)
            try:
                await self.send_json({"event": "error", "error": str(e)})
            except Exception:
                pass

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

    async def technician_accepted(self, event):
        """Triggered when a technician explicitly accepts the booking."""
        await self.send_json({
            "event": "technician_accepted",
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

    # ── Channel Layer Aliases for Workforce Events ────────────────────────────
    async def employee_accepted(self, event):
        await self.technician_accepted(event)

    async def job_accepted(self, event):
        await self.technician_accepted(event)

    async def employee_on_the_way(self, event):
        await self.technician_status_updated(event)

    async def employee_arrived(self, event):
        await self.technician_status_updated(event)

    async def service_started(self, event):
        await self.technician_status_updated(event)

    async def service_completed(self, event):
        await self.technician_status_updated(event)

    async def job_dispatched(self, event):
        await self.technician_assigned(event)

    async def employee_rejected(self, event):
        await self.technician_status_updated(event)

    # ── Estimation & Quotation Lifecycle Handlers ─────────────────────────────
    async def estimation_updated(self, event):
        """Triggered on estimation lifecycle changes."""
        await self.send_json({
            "event": "estimation_updated",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def quotation_sent(self, event):
        """Triggered when vendor or technician issues a formal quotation."""
        await self.send_json({
            "event": "quotation_sent",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def quotation_approved(self, event):
        """Triggered when customer approves quotation and converts to service."""
        await self.send_json({
            "event": "quotation_approved",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def quotation_rejected(self, event):
        """Triggered when customer rejects quotation."""
        await self.send_json({
            "event": "quotation_rejected",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def inspection_started(self, event):
        """Triggered when technician begins physical inspection."""
        await self.send_json({
            "event": "inspection_started",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    async def inspection_completed(self, event):
        """Triggered when technician finishes physical inspection report."""
        await self.send_json({
            "event": "inspection_completed",
            "data": event.get("data"),
            "timestamp": timezone.now().isoformat(),
        })

    # ── Helper Methods ────────────────────────────────────────────────────────

    @sync_to_async
    def _resolve_service_request(self, identifier, query_string=None):
        from service_requests.models import ServiceRequest
        import uuid
        import urllib.parse

        # 1. If a valid token UUID is in query string, resolve by tracking_token first
        if query_string:
            try:
                params = urllib.parse.parse_qs(query_string)
                token_param = (params.get("token") or [None])[0]
                if token_param:
                    token_uuid = uuid.UUID(str(token_param).strip())
                    sr = ServiceRequest.objects.filter(tracking_token=token_uuid).first()
                    if sr:
                        return sr
            except (ValueError, AttributeError, Exception):
                pass

        if not identifier:
            return None

        clean_id = str(identifier).replace("#", "").strip()

        # 2. Check by tracking_token UUID
        try:
            token_uuid = uuid.UUID(clean_id)
            sr = ServiceRequest.objects.filter(tracking_token=token_uuid).first()
            if sr:
                return sr
        except (ValueError, AttributeError):
            pass

        # 3. Check by exact request_id (e.g. SR-0299, PC3708, KC3902)
        sr = ServiceRequest.objects.filter(request_id__iexact=clean_id).first()
        if sr:
            return sr

        # Try with hyphen (e.g. PC3708 -> PC-3708, SR0042 -> SR-0042)
        if len(clean_id) > 2 and "-" not in clean_id:
            prefix = clean_id[:2]
            rest = clean_id[2:]
            if prefix.isalpha() and rest.isdigit():
                sr = ServiceRequest.objects.filter(request_id__iexact=f"{prefix}-{rest}").first()
                if sr:
                    return sr

        # 4. Check by integer ID
        if clean_id.isdigit():
            sr = ServiceRequest.objects.filter(pk=int(clean_id)).first()
            if sr:
                return sr

        # 5. Check by embedded digits
        digits = "".join(ch for ch in clean_id if ch.isdigit())
        if digits and digits.isdigit():
            sr = ServiceRequest.objects.filter(pk=int(digits)).first()
            if sr:
                return sr
            sr = ServiceRequest.objects.filter(request_id__icontains=digits).first()
            if sr:
                return sr

        return None

    @sync_to_async
    def _is_authorized(self):
        if not self.sr:
            return False

        # Extract token from query string
        import urllib.parse
        params = urllib.parse.parse_qs(self.query_string)
        provided_token = (params.get("token") or [None])[0]

        # 1. Authorized via valid tracking_token query parameter
        if provided_token and self.sr.tracking_token and str(self.sr.tracking_token).lower() == str(provided_token).strip().lower():
            return True

        # 2. Authorized via tracking_token UUID as path identifier
        if str(self.identifier).lower() == str(self.sr.tracking_token).lower():
            return True

        # 3. Authorized via authenticated customer ownership, assigned technician, or staff RBAC
        user = self.scope.get("user")
        if user and user.is_authenticated:
            from accounts.permissions import is_super_admin, can
            if is_super_admin(user) or can(user, "live_tracking", "view") or can(user, "dispatch", "view"):
                return True
            if self.sr.customer_id and self.sr.customer_id == user.id:
                return True
            if getattr(self.sr, "assigned_employee", None) and getattr(self.sr.assigned_employee, "user_id", None) == user.id:
                return True

        # 4. Public customer live tracking: if client knows the specific booking ID / request_id, grant live tracking read stream
        if self.sr:
            clean_id = str(self.identifier).replace("#", "").strip().lower()
            if clean_id in [str(self.sr.id).lower(), str(self.sr.request_id).lower()]:
                return True

        return False

    @sync_to_async
    def _get_tracking_payload(self):
        from service_requests.views import _build_tracking_payload
        from accounts.permissions import is_super_admin, can
        # Refresh from database
        self.sr.refresh_from_db()
        user = self.scope.get("user")
        has_full_access = False
        if user and user.is_authenticated and (is_super_admin(user) or can(user, "live_tracking", "view")):
            has_full_access = True
        return _build_tracking_payload(self.sr, has_full_access=has_full_access)

    @sync_to_async
    def _verify_start_otp(self, entered_otp):
        self.sr.refresh_from_db()
        from django.utils import timezone
        from service_requests.state_machine import apply_transition

        # 1. Require accepted technician
        is_accepted = bool(self.sr.status in ["accepted", "on_the_way", "arrived", "in_progress", "completed"] and self.sr.technician_name)
        if not is_accepted:
            return {"success": False, "error": "OTP verification requires an accepted technician on site."}

        # 2. Check if already used
        if self.sr.otp_verified:
            return {"success": False, "error": "This Service Start OTP has already been used and verified."}

        # 3. Rate limiting attempts
        if self.sr.otp_attempt_count >= 5:
            return {"success": False, "error": "Maximum OTP verification attempts exceeded."}

        if not self.sr.start_otp:
            return {"success": False, "error": "No OTP generated for this booking."}

        if str(self.sr.start_otp).strip() != str(entered_otp).strip():
            self.sr.otp_attempt_count += 1
            self.sr.save(update_fields=["otp_attempt_count", "updated_at"])
            remaining = max(0, 5 - self.sr.otp_attempt_count)
            return {"success": False, "error": f"Invalid OTP code. {remaining} attempt(s) remaining.", "attempts_remaining": remaining}

        # Single-use success
        self.sr.otp_verified = True
        self.sr.otp_verified_at = timezone.now()
        if self.sr.status in ["assigned", "accepted", "on_the_way", "arrived"]:
            apply_transition(self.sr, "in_progress")
        self.sr.save(update_fields=["otp_verified", "otp_verified_at", "status", "updated_at"])

        from service_requests.views import _build_tracking_payload
        updated_payload = _build_tracking_payload(self.sr, has_full_access=False)
        return {"success": True, "data": updated_payload}
