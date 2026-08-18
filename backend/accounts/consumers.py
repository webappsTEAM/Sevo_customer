"""
accounts/consumers.py

Channels WebSocket Consumer for Real-Time Customer Authentication & OTP Verification.
Supports:
- Instant auto-verification of customer phone & email OTPs over WebSocket
- Instant emission of verification status events:
  * otp_verification_started
  * otp_verification_success
  * otp_verification_failed
- Seamless profile & token payload synchronization without page reload
"""
import json
import logging
import re
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger("accounts.consumers")
User = get_user_model()


class AuthOtpConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket endpoint: /ws/auth/otp/
    Provides low-latency real-time verification for customer login and booking entry flows.
    """

    async def connect(self):
        await self.accept()
        await self.send_json({
            "event": "connected",
            "message": "Real-time OTP verification stream active.",
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content):
        action = content.get("action") or content.get("event")

        if action == "ping":
            await self.send_json({"event": "pong", "timestamp": timezone.now().isoformat()})
            return

        # ── 1. Phone OTP Auto-Verification ────────────────────────────────────
        if action in ["verify_otp", "verify_phone_otp"]:
            phone = str(content.get("phone", "")).strip()
            otp = str(content.get("otp") or content.get("code", "")).strip()

            if not phone or not otp:
                await self.send_json({
                    "event": "otp_verification_failed",
                    "error": "Phone number and OTP are required.",
                    "code": "MISSING_PARAMS",
                })
                return

            # Signal verification started immediately
            await self.send_json({
                "event": "otp_verification_started",
                "phone": phone,
                "timestamp": timezone.now().isoformat(),
            })

            result = await self._verify_phone_otp_backend(phone, otp)
            if result.get("success"):
                await self.send_json({
                    "event": "otp_verification_success",
                    "data": result.get("data"),
                    "message": "Phone OTP verified successfully.",
                    "timestamp": timezone.now().isoformat(),
                })
            else:
                await self.send_json({
                    "event": "otp_verification_failed",
                    "error": result.get("error", "Invalid or expired OTP."),
                    "code": result.get("code", "INVALID_OTP"),
                    "attempts_remaining": result.get("attempts_remaining"),
                    "timestamp": timezone.now().isoformat(),
                })
            return

        # ── 2. Email OTP Auto-Verification ────────────────────────────────────
        if action in ["verify_email_otp"]:
            email = str(content.get("email", "")).strip().lower()
            otp = str(content.get("otp") or content.get("code", "")).strip()

            if not email or not otp:
                await self.send_json({
                    "event": "otp_verification_failed",
                    "error": "Email and OTP are required.",
                    "code": "MISSING_PARAMS",
                })
                return

            await self.send_json({
                "event": "otp_verification_started",
                "email": email,
                "timestamp": timezone.now().isoformat(),
            })

            result = await self._verify_email_otp_backend(email, otp)
            if result.get("success"):
                await self.send_json({
                    "event": "otp_verification_success",
                    "data": result.get("data"),
                    "message": "Email OTP verified successfully.",
                    "timestamp": timezone.now().isoformat(),
                })
            else:
                await self.send_json({
                    "event": "otp_verification_failed",
                    "error": result.get("error", "Invalid or expired OTP."),
                    "code": result.get("code", "INVALID_OTP"),
                    "attempts_remaining": result.get("attempts_remaining"),
                    "timestamp": timezone.now().isoformat(),
                })
            return

    # ── Backend Synchronous Verification Helpers ──────────────────────────────

    @sync_to_async
    def _verify_phone_otp_backend(self, phone, otp):
        digits = re.sub(r'\D', '', phone)
        last10 = digits[-10:] if len(digits) >= 10 else digits

        from django.db.models import Q
        user = User.objects.filter(
            Q(phone=phone) | Q(phone__icontains=last10)
        ).first()

        if not user:
            return {"success": False, "error": "User not found for this mobile number.", "code": "USER_NOT_FOUND"}

        if not user.phone_otp or not user.otp_created_at:
            return {"success": False, "error": "No active OTP request found. Please request a new OTP.", "code": "NO_ACTIVE_OTP"}

        # Expiration check (5 minutes = 300 seconds)
        if (timezone.now() - user.otp_created_at).total_seconds() > 300:
            return {"success": False, "error": "OTP has expired. Please request a new OTP.", "code": "OTP_EXPIRED"}

        # OTP match check
        if str(user.phone_otp).strip() != str(otp).strip():
            return {"success": False, "error": "Invalid OTP. Please check the code.", "code": "INVALID_OTP"}

        # Check if user is a new profile (missing name)
        is_new_customer = not bool(user.first_name and user.first_name.strip())

        # Clear OTP and update customer record
        user.phone_otp = None
        user.otp_created_at = None
        user.phone = phone
        user.role = User.Role.CUSTOMER
        user.save(update_fields=["phone_otp", "otp_created_at", "phone", "role"])

        # Link any pending service request if customer object was not set
        try:
            from service_requests.models import ServiceRequest
            sr = ServiceRequest.objects.filter(phone__icontains=last10).order_by("-id").first()
            if sr and not sr.customer:
                sr.customer = user
                sr.save(update_fields=["customer"])
        except Exception:
            pass

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return {
            "success": True,
            "data": {
                "customer_id": user.id,
                "is_new_customer": is_new_customer,
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "full_name": f"{user.first_name} {user.last_name}".strip() or "Customer",
                "phone": user.phone,
                "email": user.email or "",
                "role": user.role,
                "access": access_token,
                "refresh": refresh_token,
            }
        }

    @sync_to_async
    def _verify_email_otp_backend(self, email, otp):
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return {"success": False, "error": "User not found.", "code": "USER_NOT_FOUND"}

        if not user.email_otp or not user.otp_created_at:
            return {"success": False, "error": "No active OTP request found. Please request a new OTP.", "code": "NO_ACTIVE_OTP"}

        if (timezone.now() - user.otp_created_at).total_seconds() > 300:
            return {"success": False, "error": "OTP has expired. Please request a new OTP.", "code": "OTP_EXPIRED"}

        if str(user.email_otp).strip() != str(otp).strip():
            return {"success": False, "error": "Invalid OTP. Please check the code.", "code": "INVALID_OTP"}

        is_new_customer = not bool(user.first_name and user.first_name.strip())

        user.email_otp = None
        user.otp_created_at = None
        user.save(update_fields=["email_otp", "otp_created_at"])

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return {
            "success": True,
            "data": {
                "customer_id": user.id,
                "is_new_customer": is_new_customer,
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "full_name": f"{user.first_name} {user.last_name}".strip() or "Customer",
                "phone": user.phone or "",
                "email": user.email or "",
                "role": user.role,
                "access": access_token,
                "refresh": refresh_token,
            }
        }
