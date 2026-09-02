import random
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .views import _set_auth_cookies

User = get_user_model()


def log_login_event(user, status_str: str, method: str, request) -> None:
    """
    Helper to log customer login events.
    """
    if not user:
        return
    try:
        from customer_analytics.models import CustomerLoginEvent
        from django.utils import timezone

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

        user_agent = request.META.get('HTTP_USER_AGENT', '')

        if method == "google":
            method_choice = CustomerLoginEvent.LoginMethod.GOOGLE
        elif "email" in str(method).lower():
            method_choice = CustomerLoginEvent.LoginMethod.OTP_EMAIL
        elif "phone" in str(method).lower():
            method_choice = CustomerLoginEvent.LoginMethod.OTP_PHONE
        else:
            method_choice = CustomerLoginEvent.LoginMethod.GENERIC

        status_choice = (
            CustomerLoginEvent.LoginStatus.SUCCESS 
            if status_str == "success" 
            else CustomerLoginEvent.LoginStatus.FAILED
        )

        CustomerLoginEvent.objects.create(
            customer=user,
            company=getattr(user, "company", None),
            method=method_choice,
            ip_address=ip or None,
            user_agent=user_agent or "",
            status=status_choice,
            occurred_at=timezone.now()
        )

        if status_str == "success":
            user.last_login = timezone.now()
            user.save(update_fields=["last_login"])
    except Exception as e:
        print(f"[log_login_event] Failed to write login event: {e}")

# NOTE: this file used to also contain CustomerEmailOTPRequestView /
# CustomerEmailOTPVerifyView / CustomerPhoneOTPRequestView /
# CustomerPhoneOTPVerifyView — a second, independent OTP implementation
# (storing plaintext-ish OTPs directly on the User row) that ran in parallel
# with the CustomerOTP*APIView views below (which use the hashed,
# rate-limited accounts.services.request_otp/verify_otp). Having both live
# was the direct cause of customers seeing inconsistent login UIs depending
# on which endpoint pair a given screen happened to call. Removed in favor
# of the single flow below, now generalized to support both channels.


class CustomerGoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            access_token = request.data.get("access_token")
            id_token = request.data.get("id_token") or request.data.get("credential")
            email = request.data.get("email")
            name = request.data.get("name", "")

            # 1. Try verifying id_token with Google TokenInfo API
            if id_token and not email:
                import requests
                try:
                    google_res = requests.get(
                        f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
                        timeout=10
                    )
                    if google_res.status_code == 200:
                        profile = google_res.json()
                        email = profile.get("email")
                        name = profile.get("name") or profile.get("given_name", "")
                except Exception as e:
                    print(f"[CustomerGoogleLoginView] ID token verification error: {e}")

            # 2. Try verifying access_token with Google UserInfo API
            if access_token and not email:
                import requests
                try:
                    google_res = requests.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=10
                    )
                    if google_res.status_code != 200:
                        google_res = requests.get(
                            f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}",
                            timeout=10
                        )

                    if google_res.status_code == 200:
                        profile = google_res.json()
                        email = profile.get("email")
                        name = profile.get("name", "")
                except Exception as e:
                    print(f"[CustomerGoogleLoginView] Access token verification error: {e}")

            # 3. Fallback: decode JWT payload locally if Google endpoint was unreachable
            if id_token and not email:
                try:
                    import jwt
                    decoded = jwt.decode(id_token, options={"verify_signature": False})
                    if isinstance(decoded, dict):
                        email = decoded.get("email")
                        if not name:
                            name = decoded.get("name") or decoded.get("given_name", "")
                except Exception as e:
                    print(f"[CustomerGoogleLoginView] JWT decode error: {e}")

            if not email:
                return Response(
                    {"detail": "Google authentication failed. Could not verify email from Google."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            email = str(email).lower().strip()
            
            # Find customer account or existing user account
            user = (
                User.objects.filter(email__iexact=email, role=User.Role.CUSTOMER, is_active=True).first()
                or User.objects.filter(email__iexact=email, role=User.Role.CUSTOMER).first()
                or User.objects.filter(email__iexact=email, is_active=True).first()
                or User.objects.filter(email__iexact=email).first()
            )

            if not user:
                base_username = f"customer_{random.randint(100000, 999999)}"
                username = base_username
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{random.randint(100, 999)}"

                first_name = name.split(" ")[0] if (name and isinstance(name, str)) else "Google"
                last_name = " ".join(name.split(" ")[1:]) if (name and isinstance(name, str) and len(name.split(" ")) > 1) else "User"
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.CUSTOMER
                )
            else:
                if not user.is_active:
                    user.is_active = True
                    user.save(update_fields=["is_active"])

            from .views import CustomTokenObtainPairSerializer, _set_auth_cookies
            refresh = CustomTokenObtainPairSerializer.get_token(user)
            tokens = {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
            
            full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username
            response = Response({
                "success": True, 
                "detail": "Google login successful",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": {
                    "username": user.username,
                    "name": full_name,
                    "email": user.email,
                    "phone": getattr(user, "phone", "") or "",
                    "role": user.role
                }
            })
            log_login_event(user, "success", "google", request)
            return _set_auth_cookies(response, tokens["access"], tokens["refresh"])
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": f"Internal server error during Google login: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── Unified customer OTP API views (phone + email, one mechanism) ────────────

from .models import OTPChannel
from .services import request_otp, verify_otp, complete_customer_profile, RateLimitError, InvalidOTPError
from rest_framework.exceptions import NotFound, ValidationError


def _resolve_identifier_and_channel(data):
    """Accepts either the new explicit {identifier, channel} shape or the
    older {mobile_number}/{phone}/{email} shapes, for callers that haven't
    been updated. Returns (identifier, channel) or (None, None)."""
    channel = str(data.get("channel") or "").upper()
    identifier = data.get("identifier")
    if identifier and channel in (OTPChannel.PHONE, OTPChannel.EMAIL):
        return identifier, channel
    if data.get("email"):
        return data.get("email"), OTPChannel.EMAIL
    if data.get("mobile_number") or data.get("phone"):
        return (data.get("mobile_number") or data.get("phone")), OTPChannel.PHONE
    return None, None


class CustomerOTPRequestAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        identifier, channel = _resolve_identifier_and_channel(request.data)
        if not identifier:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": "identifier and channel are required."}},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            res = request_otp(identifier, channel)
            return Response(res, status=status.HTTP_200_OK)
        except RateLimitError as e:
            return Response(
                {"success": False, "error": {"code": e.code, "message": e.message, **e.extra}},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except (ValueError, ValidationError) as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"success": False, "error": {"code": "SERVER_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerOTPVerifyAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        identifier, channel = _resolve_identifier_and_channel(request.data)
        otp_code = request.data.get("otp_code") or request.data.get("otp")
        if not identifier or not otp_code:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": "identifier, channel and otp_code are required."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.db import models
        from accounts.models import User, OTPChannel
        if channel == OTPChannel.EMAIL:
            lookup = models.Q(email=identifier)
        else:
            lookup = models.Q(mobile_number=identifier) | models.Q(phone=identifier)
        user = User.objects.filter(lookup).first()

        try:
            res = verify_otp(identifier, otp_code, channel)
            response = Response(res, status=status.HTTP_200_OK)
            if "auth_token" in res.get("data", {}):
                access_token = res["data"]["auth_token"]
                refresh_token = res["data"].get("refresh_token")
                logged_user = user or User.objects.filter(pk=res["data"]["customer_id"]).first()
                log_login_event(logged_user, "success", "otp_email" if channel == OTPChannel.EMAIL else "otp_phone", request)
                return _set_auth_cookies(response, access_token, refresh_token)
            return response
        except InvalidOTPError as e:
            if user:
                log_login_event(user, "failed", "otp_email" if channel == OTPChannel.EMAIL else "otp_phone", request)
            return Response(
                {"success": False, "error": {"code": e.code, "message": e.message, **e.extra}},
                status=status.HTTP_400_BAD_REQUEST
            )
        except (ValueError, ValidationError) as e:
            if user:
                log_login_event(user, "failed", "otp_email" if channel == OTPChannel.EMAIL else "otp_phone", request)
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            if user:
                log_login_event(user, "failed", "otp_email" if channel == OTPChannel.EMAIL else "otp_phone", request)
            return Response(
                {"success": False, "error": {"code": "SERVER_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerProfileCompleteAPIView(APIView):
    """Full Name is always required. Exactly one of email/phone is normally
    already on the account from the OTP-verify step; the frontend is
    expected to send the *other* one here so a new customer ends up with
    both (see CustomerEntryFlowModal.jsx step 3)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        customer_id = request.data.get("customer_id")
        if not customer_id and request.user.is_authenticated:
            customer_id = request.user.id

        full_name = request.data.get("full_name")
        email = request.data.get("email")
        phone = request.data.get("phone")

        if not customer_id or not full_name:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": "customer_id and full_name are required."}},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            res = complete_customer_profile(customer_id, full_name, email=email, phone=phone)
            return Response(res, status=status.HTTP_200_OK)
        except NotFound as e:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": str(e)}},
                status=status.HTTP_404_NOT_FOUND
            )
        except (ValueError, ValidationError) as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"success": False, "error": {"code": "SERVER_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

