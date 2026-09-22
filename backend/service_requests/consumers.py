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
        try:
            self.identifier = self.scope["url_route"]["kwargs"].get("identifier", "").strip()
            self.query_string = self.scope.get("query_string", b"").decode("utf-8")
            self.groups_joined = []

            if not self.identifier:
                # Handle general live-location stream
                await self.channel_layer.group_add("tracking_general", self.channel_name)
                self.groups_joined.append("tracking_general")
                await self.accept()
                await self.send_json({
                    "event": "connected",
                    "connected_at": timezone.now().isoformat(),
                })
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
        except Exception as e:
            logger.error(f"Error during WebSocket connection handshake: {e}", exc_info=True)
            try:
                await self.close(code=4500)
            except Exception:
                pass

    async def disconnect(self, code):
        for g in self.groups_joined:
            await self.channel_layer.group_discard(g, self.channel_name)

    async def receive_json(self, content, **kwargs):
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
            if not await self._can_verify_otp():
                await self.send_json({
                    "event": "otp_verification_error",
                    "error": "You are not authorized to verify this booking's OTP.",
                })
                return
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
    def _resolve_service_request(self, identifier):
        from service_requests.models import ServiceRequest
        import uuid

        if not identifier:
            return None

        clean_id = str(identifier).replace("#", "").strip()

        # Check by tracking_token UUID
        try:
            token_uuid = uuid.UUID(clean_id)
            sr = ServiceRequest.objects.filter(tracking_token=token_uuid).first()
            if sr:
                return sr
        except (ValueError, AttributeError):
            pass

        # Check by exact request_id (e.g. SR-0299, KC3902)
        sr = ServiceRequest.objects.filter(request_id__iexact=clean_id).first()
        if sr:
            return sr

        # Check by integer ID
        if clean_id.isdigit():
            sr = ServiceRequest.objects.filter(pk=int(clean_id)).first()
            if sr:
                return sr

        # Check by embedded digits (e.g. KC3902 -> 3902)
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
        from service_requests.views import _tracking_token_is_expired
        params = urllib.parse.parse_qs(self.query_string)
        provided_token = (params.get("token") or [None])[0]

        # 1. Authorized via valid, non-expired tracking_token query parameter
        if (
            provided_token
            and self.sr.tracking_token
            and str(self.sr.tracking_token).lower() == str(provided_token).strip().lower()
            and not _tracking_token_is_expired(self.sr)  # Fixes EC-08 parity with the REST endpoint below
        ):
            return True

        # 2. Authorized via tracking_token UUID as path identifier
        if (
            str(self.identifier).lower() == str(self.sr.tracking_token).lower()
            and not _tracking_token_is_expired(self.sr)
        ):
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

        # Bug found (BLOCKER): this used to have a 4th branch here --
        # "if self.sr: return True" -- which granted full read access to
        # ANY booking's live GPS position, technician name/photo, ETA, and
        # customer address to anyone who could resolve a request_id or PK,
        # no authentication or tracking token required at all. That
        # directly contradicted the properly-secured REST sibling serving
        # the same data (CustomerBookingLiveLocationView), which requires a
        # matching non-expired tracking token, or an authenticated
        # owner/admin/assigned-technician. Removed -- this consumer now
        # uses exactly that same model (also added the matching non-expired
        # token check to branches 1 and 2 above, which this REST sibling
        # already enforces but this consumer previously didn't).
        return False

    @sync_to_async
    def _can_verify_otp(self):
        """
        Fixes EC-02 (WebSocket path): _is_authorized()'s branch 4 grants read
        access to anyone who can resolve a booking ID/request_id, by design,
        for the public live-tracking stream. That is NOT an acceptable rule
        for the verify_start_otp action, since it would let anyone who can
        merely open this socket attempt to move a booking to "in_progress" —
        the whole point of the OTP is to prove the *technician* is on site.
        This mirrors branches 1-3 of _is_authorized() only: a valid tracking
        token, or an authenticated super-admin/permitted-staff/assigned
        technician. It deliberately excludes the "anyone who knows the
        booking ID" branch.
        """
        if not self.sr:
            return False

        import urllib.parse
        params = urllib.parse.parse_qs(self.query_string)
        provided_token = (params.get("token") or [None])[0]

        if provided_token and self.sr.tracking_token and str(self.sr.tracking_token).lower() == str(provided_token).strip().lower():
            return True
        if str(self.identifier).lower() == str(self.sr.tracking_token).lower():
            return True

        user = self.scope.get("user")
        if user and user.is_authenticated:
            from accounts.permissions import is_super_admin, can
            if is_super_admin(user) or can(user, "live_tracking", "verify") or can(user, "dispatch", "manage"):
                return True
            if getattr(self.sr, "assigned_employee", None) and getattr(self.sr.assigned_employee, "user_id", None) == user.id:
                return True

        return False

    @sync_to_async
    def _get_tracking_payload(self):
        if not self.sr:
            return {}
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
        if not self.sr:
            return {"success": False, "error": "Booking not found."}
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
