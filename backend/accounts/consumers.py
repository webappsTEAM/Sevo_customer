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
        from accounts.services import verify_otp, OTPChannel, InvalidOTPError
        try:
            res = verify_otp(phone, str(otp).strip(), channel=OTPChannel.PHONE)
            return res
        except InvalidOTPError as e:
            return {"success": False, "error": str(e), "code": getattr(e, "code", "INVALID_OTP")}
        except Exception as e:
            return {"success": False, "error": str(e), "code": "SERVER_ERROR"}

    @sync_to_async
    def _verify_email_otp_backend(self, email, otp):
        from accounts.services import verify_otp, OTPChannel, InvalidOTPError
        try:
            res = verify_otp(email, str(otp).strip(), channel=OTPChannel.EMAIL)
            return res
        except InvalidOTPError as e:
            return {"success": False, "error": str(e), "code": getattr(e, "code", "INVALID_OTP")}
        except Exception as e:
            return {"success": False, "error": str(e), "code": "SERVER_ERROR"}

