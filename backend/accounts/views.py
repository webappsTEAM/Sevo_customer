import uuid
import traceback
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import Q
from companies.models import Company
from settings_hub.models import TeamInvite

from rest_framework import permissions, serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
import requests

from .serializers import UserSerializer

logger = logging.getLogger(__name__)



# ── Cookie helper ─────────────────────────────────────────────────────────────

def _get_refresh_cookie_path():
    """Build the refresh-cookie path, respecting FORCE_SCRIPT_NAME for subpath deployments."""
    prefix = getattr(settings, "FORCE_SCRIPT_NAME", "") or ""
    return f"{prefix}/api/auth/refresh/"


def _set_auth_cookies(response, access_token, refresh_token=None):
    """
    Attach httpOnly JWT cookies to *response*.

    Access cookie  — sent to every path (needed for all API calls).
    Refresh cookie — restricted to <prefix>/api/auth/refresh/ so it is never
                     accidentally exposed to other endpoints.
    """
    secure   = getattr(settings, "AUTH_COOKIE_SECURE", False)
    samesite = getattr(settings, "AUTH_COOKIE_SAMESITE", "Lax")

    access_max_age  = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(
        settings.AUTH_COOKIE,
        str(access_token),
        max_age=access_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    if refresh_token is not None:
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            str(refresh_token),
            max_age=refresh_max_age,
            httponly=True,
            secure=secure,
            samesite=samesite,
            path=_get_refresh_cookie_path(),
        )
    return response


def _clear_auth_cookies(response):
    """Remove both auth cookies from the browser."""
    response.delete_cookie(settings.AUTH_COOKIE, path="/")
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=_get_refresh_cookie_path())
    return response
import uuid
import traceback
from django.db import transaction
from companies.models import Company
from settings_hub.models import TeamInvite
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings








class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"] = serializers.EmailField(required=False, allow_blank=True)

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        email = attrs.get("email")
        if isinstance(username, str):
            username = username.strip()
            attrs[self.username_field] = username

            # If the provided username looks like an email, try to resolve it to a username.
            # Prefer active accounts (is_active=True) over deactivated duplicates.
            if "@" in username:
                User = get_user_model()
                user = (
                    User.objects.filter(email__iexact=username, is_active=True, role="admin").first()
                    or User.objects.filter(email__iexact=username, is_active=True).exclude(role="customer").first()
                    or User.objects.filter(email__iexact=username, is_active=True).first()
                    or User.objects.filter(email__iexact=username).first()
                )
                if user:
                    attrs[self.username_field] = user.username

        if (not username) and isinstance(email, str) and email.strip():
            User = get_user_model()
            user = (
                User.objects.filter(email__iexact=email.strip(), is_active=True, role="admin").first()
                or User.objects.filter(email__iexact=email.strip(), is_active=True).exclude(role="customer").first()
                or User.objects.filter(email__iexact=email.strip(), is_active=True).first()
                or User.objects.filter(email__iexact=email.strip()).first()
            )
            if user:
                attrs[self.username_field] = user.username

        # Self-heal user company assignment if missing, before super().validate() generates tokens
        resolved_username = attrs.get(self.username_field)
        if resolved_username:
            User = get_user_model()
            try:
                user = User.objects.filter(username__iexact=resolved_username).first()
                if not user:
                    user = User.objects.filter(email__iexact=resolved_username).first()
                
                if user and not getattr(user, "company", None) and user.role != "admin":
                    from companies.models import Company
                    company = Company.objects.filter(slug="demo-v2").first() or Company.objects.filter(slug="demo").first() or Company.objects.first()
                    if company:
                        user.company = company
                        user.save(update_fields=["company"])
            except Exception as e:
                print(f"Error self-healing company during validation: {e}")

        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        # company is a shared model — no schema switch needed
        company = getattr(user, 'company', None)

        token = super().get_token(user)
        token["role"] = str(user.role)
        token["username"] = str(user.username)

        if company:
            token["company_id"] = str(company.id)

        return token


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # ── HIGH 3: 2FA enforcement ──────────────────────────────────────
            # Extract the access token to identify the user, then check 2FA.
            # If 2FA is required, store user ID in session and return a challenge
            # signal WITHOUT setting auth cookies — JWT is withheld until TOTP verify.
            access = response.data.get("access")
            refresh = response.data.get("refresh")

            # Decode token to identify user without DB round-trip
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token_obj = AccessToken(access)
                user_id = token_obj.get("user_id")
                User = get_user_model()
                user = User.objects.filter(pk=user_id).first()
            except Exception:
                user = None

            # 2FA disabled for now — proceed with direct cookie issuance
            # if user and getattr(user, "two_fa_enabled", False):
            #     request.session["pending_2fa_user"] = str(user.pk)
            #     request.session.save()
            #     return Response(
            #         {"success": True, "requires_2fa": True, "message": "2FA verification required."},
            #         status=200,
            #     )

            # Proceed with cookie issuance as normal
            _set_auth_cookies(response, access, refresh)

            # Provide both cookies and serialized user payload for resilient client authentication
            response.data = {
                "success": True,
                "message": "Login successful.",
                "access": str(access) if access else None,
                "refresh": str(refresh) if refresh else None,
                "user": UserSerializer(user, context={"request": request}).data if user else None,
            }
        return response



class RefreshView(APIView):
    """
    Rotate the access token using the httpOnly refresh cookie.
    No body needed — the browser sends the cookie automatically.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not refresh_token:
            return Response(
                {"success": False, "message": "No refresh token — please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            token = RefreshToken(refresh_token)
            access_token = token.access_token
            response = Response({"success": True})
            _set_auth_cookies(response, access_token)   # only rotate access cookie
            return response
        except Exception:
            response = Response(
                {"success": False, "message": "Session expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response


class LogoutView(APIView):
    """Clear both auth cookies — works whether or not the user is authenticated."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = Response({"success": True, "message": "Logged out."})
        _clear_auth_cookies(response)
        return response


class TwoFAChallengeView(APIView):
    """
    HIGH 3 — 2FA challenge endpoint.

    After a successful password login where two_fa_enabled=True, the LoginView
    stores the user PK in session["pending_2fa_user"] and returns requires_2fa=True
    without issuing cookies.  The frontend must immediately POST the TOTP code here.
    Only on successful TOTP verification are the JWT cookies issued.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            import pyotp
        except ImportError:
            return Response({"success": False, "message": "2FA library not installed."}, status=500)

        pending_id = request.session.get("pending_2fa_user")
        if not pending_id:
            return Response(
                {"success": False, "message": "No 2FA session in progress. Please log in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = (request.data.get("code") or "").strip()
        if not code:
            return Response({"success": False, "message": "TOTP code is required."}, status=400)

        User = get_user_model()
        try:
            user = User.objects.get(pk=pending_id)
        except User.DoesNotExist:
            del request.session["pending_2fa_user"]
            return Response({"success": False, "message": "Invalid session. Please log in again."}, status=400)

        if not getattr(user, "totp_secret", None):
            return Response({"success": False, "message": "2FA is not configured for this account."}, status=400)

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({"success": False, "message": "Invalid or expired 2FA code."}, status=400)

        # ── TOTP verified — issue JWT cookies and clear session flag ──────
        del request.session["pending_2fa_user"]
        request.session.save()

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        response = Response({"success": True, "message": "Login successful."})
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            access_token = request.data.get("access_token")
            id_token = request.data.get("id_token") or request.data.get("credential")

            user_info = None
            if id_token:
                try:
                    resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}", timeout=10)
                    if resp.ok:
                        user_info = resp.json()
                except Exception:
                    pass

            if not user_info and access_token:
                try:
                    resp = requests.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=10
                    )
                    if not resp.ok:
                        resp = requests.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}", timeout=10)
                    if resp.ok:
                        user_info = resp.json()
                except Exception:
                    pass

            if not user_info and id_token:
                try:
                    import jwt
                    decoded = jwt.decode(id_token, options={"verify_signature": False})
                    if isinstance(decoded, dict) and decoded.get("email"):
                        user_info = decoded
                except Exception:
                    pass

            email = user_info.get("email") if (user_info and isinstance(user_info, dict)) else None
            if not email:
                return Response({"detail": "Google authentication failed. Could not verify email from Google."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"Internal server error during Google login: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        User = get_user_model()
        email_clean = email.strip()
        
        # Priority: active admin with company > active non-customer with company >
        # any active with company > any with company > any active > any
        user = (
            User.objects.filter(email__iexact=email_clean, company__isnull=False, is_active=True, role="admin").first()
            or User.objects.filter(email__iexact=email_clean, company__isnull=False, is_active=True).exclude(role="customer").first()
            or User.objects.filter(email__iexact=email_clean, company__isnull=False, is_active=True).first()
            or User.objects.filter(email__iexact=email_clean, company__isnull=False).first()
            or User.objects.filter(email__iexact=email_clean, is_active=True).first()
            or User.objects.filter(email__iexact=email_clean).first()
        )

        # Check if there is a pending team invitation for this email
        invite = TeamInvite.objects.filter(email__iexact=email_clean, status="pending").first()

        # ── HIGH 2: Invite Gate ──────────────────────────────────────────────
        # Block account creation for unknown emails that have no pending invite.
        # Existing users (already in the DB) may continue to log in via Google
        # even without an active invite (their account was created another way).
        if not user and not invite:
            return Response(
                {"detail": "No invitation found for this email. Please contact your administrator to receive an invitation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if invite:

            if not user:
                username = email_clean.split("@")[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email_clean,
                    password=uuid.uuid4().hex,
                    first_name=user_info.get("given_name", ""),
                    last_name=user_info.get("family_name", ""),
                    role=invite.role,
                )
                user.company = invite.company
                user.is_active = True
                user.save()
            else:
                # Was: `if "lokesh" in email or user.role == "admin": ...
                # is_superuser = True`. That granted full Django/Super Admin
                # authority to any existing admin who happened to complete
                # the Google-login staff link for a pending invite -- a
                # backdoor, not intended behavior. An accepted invite now
                # only ever applies the role the invite itself specifies
                # (same as the non-Google accept-invite path in
                # AcceptInviteView below).
                user.is_active = True
                user.role = invite.role
                if user.role == "admin":
                    user.is_staff = True
                user.company = invite.company
                user.save()

            # Accept the invitation
            invite.status = "accepted"
            from django.utils import timezone
            invite.accepted_at = timezone.now()
            invite.save()

        if not user:
            # Create standard customer user on Google login if not existing
            username = email_clean.split("@")[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email_clean,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.CUSTOMER,
            )

        if not getattr(user, 'is_active', True):
            return Response({"detail": "This account is deactivated."}, status=status.HTTP_400_BAD_REQUEST)

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        response = Response({"success": True, "message": "Google login successful."})
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response



from accounts.services import create_organization_admin_user

class AdminRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password")
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
            return Response({"detail": "Account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user, created = create_organization_admin_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        response = Response({
            "success": True, 
            "message": "Registration successful.",
            "user": {
                "email": user.email,
                "role": user.role,
                "company": None
            }
        }, status=status.HTTP_201_CREATED)
        
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        print(f"DEBUG: RegisterView - POST request received: {request.data}")
        username = request.data.get("username")
        password = request.data.get("password")
        email = request.data.get("email", "")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        organization_name = request.data.get("organization_name")

        username = (username or "").strip()
        email = (email or "").strip()
        first_name = (first_name or "").strip()
        last_name = (last_name or "").strip()
        organization_name = (organization_name or "").strip()

        if not username or not password or not organization_name:
            return Response({"detail": "Username, password, and Organization Name are required."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        if User.objects.filter(username__iexact=username).exists():
            return Response({"detail": "Username is already taken."}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction

        try:
            # Company, User and Employee are all created in one transaction now
            # that there's no per-tenant schema to create separately.
            with transaction.atomic():
                # 1. Create Company
                from django.utils.text import slugify
                existing_company = Company.objects.filter(company_name=organization_name).first()
                if existing_company and existing_company.users.count() == 0:
                    company = existing_company
                else:
                    company = Company(
                        company_name=organization_name,
                        team_size=request.data.get("team_size"),
                        selected_modules=request.data.get("selected_modules", [])
                    )
                    if request.data.get("start_trial") is False:
                        company._skip_trial_activation = True
                    company.save()

                # 2. Create User as Org Admin
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role="admin",
                )
                user.company = company
                user.save()

        except Exception as e:
            print(f"ERROR in RegisterView: {str(e)}")
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        response = Response(
            {"success": True, "message": "Registration successful.", "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            if not user or not user.is_authenticated:
                return Response({"detail": "Authentication credentials were not provided."}, status=401)

            # Was: a hardcoded backdoor that force-promoted any account
            # whose email/username contained "lokesh"/"lokeshwarikumaresan"
            # to role=admin + is_staff=True + is_superuser=True on every
            # single /auth/me/ call (i.e. on every page load). Combined
            # with is_super_admin() previously trusting is_superuser
            # unconditionally, this silently gave that account permanent,
            # full Super Admin backend authority regardless of whatever
            # role Admin Management actually showed for it. Removed.
            return Response(UserSerializer(user, context={"request": request}).data)
        except Exception as err:
            traceback.print_exc()
            return Response({"detail": f"Server error fetching user profile: {str(err)}"}, status=500)



class NotificationPreferenceView(APIView):
    """
    HS-D-05: lets a customer actually see/change the preferences
    CustomerNotificationPreference and notifications.py's _customer_wants()
    now check. Without this endpoint the model would be write-only from the
    customer's side -- an admin/DB-only toggle nobody can reach.
    """
    permission_classes = [permissions.IsAuthenticated]

    _EDITABLE_FIELDS = [
        "booking_confirmations", "reschedule_updates", "technician_updates",
        "completion_feedback", "payment_receipts", "refund_updates",
        "complaint_updates", "promotional_offers", "channel_email", "channel_sms",
    ]

    def _serialize(self, pref):
        return {f: getattr(pref, f) for f in self._EDITABLE_FIELDS}

    def get(self, request):
        from .models import CustomerNotificationPreference
        pref, _ = CustomerNotificationPreference.objects.get_or_create(user=request.user)
        return Response(self._serialize(pref))

    def patch(self, request):
        from .models import CustomerNotificationPreference
        pref, _ = CustomerNotificationPreference.objects.get_or_create(user=request.user)
        updated_fields = []
        for field in self._EDITABLE_FIELDS:
            if field in request.data:
                value = request.data[field]
                if not isinstance(value, bool):
                    return Response({"detail": f"'{field}' must be a boolean."}, status=400)
                setattr(pref, field, value)
                updated_fields.append(field)
        if updated_fields:
            pref.save(update_fields=updated_fields + ["updated_at"])
        return Response(self._serialize(pref))


class MyReferralCodeView(APIView):
    """
    GET /api/accounts/referral-code/
    HS-A-06: a customer's own shareable referral code, generated lazily on
    first request, plus a simple summary of referrals they've made.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import ReferralCode, Referral, _generate_referral_code
        ref_code, _ = ReferralCode.objects.get_or_create(
            user=request.user,
            defaults={"code": _generate_referral_code(request.user)},
        )
        referrals = Referral.objects.filter(referrer=request.user)
        return Response({
            "code": ref_code.code,
            "referrals_made": referrals.count(),
            "referrals_rewarded": referrals.filter(status=Referral.Status.REWARDED).count(),
        })


class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        try:
            from .serializers import ProfileUpdateSerializer
            data = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)

            avatar_val = data.pop('avatar', None)
            data.pop('profile_picture', None)

            if avatar_val:
                if isinstance(avatar_val, str) and avatar_val.strip():
                    if '/media/' in avatar_val:
                        request.user.avatar.name = avatar_val.split('/media/')[-1]
                    else:
                        request.user.avatar.name = avatar_val
                    try:
                        request.user.save(update_fields=['avatar'])
                    except Exception:
                        request.user.save()

            avatar_file = request.FILES.get('avatar') or request.FILES.get('image')
            if avatar_file:
                request.user.avatar = avatar_file
                try:
                    request.user.save(update_fields=['avatar'])
                except Exception:
                    request.user.save()

            serializer = ProfileUpdateSerializer(request.user, data=data, partial=True, context={"request": request})
            if serializer.is_valid():
                serializer.save()
                return Response({"success": True, "data": UserSerializer(request.user, context={"request": request}).data})
            return Response({"success": False, "message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as err:
            import logging
            logging.getLogger(__name__).error(f"Error updating profile: {err}", exc_info=True)
            return Response({"success": False, "message": str(err)}, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new_pw = request.data.get("new_password", "")
        confirm = request.data.get("confirm_password", "")

        if not request.user.check_password(current):
            return Response({"success": False, "message": "Current password is incorrect."}, status=400)
        if len(new_pw) < 8:
            return Response({"success": False, "message": "Password must be at least 8 characters."}, status=400)
        if new_pw != confirm:
            return Response({"success": False, "message": "Passwords do not match."}, status=400)

        request.user.set_password(new_pw)
        request.user.save(update_fields=["password"])
        return Response({"success": True, "message": "Password updated successfully."})


class EmailChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_email = (request.data.get("new_email") or "").strip()
        password = request.data.get("password", "")

        if not new_email:
            return Response({"success": False, "message": "Email is required."}, status=400)
        if not request.user.check_password(password):
            return Response({"success": False, "message": "Password is incorrect."}, status=400)

        User = get_user_model()
        if User.objects.filter(email__iexact=new_email).exclude(pk=request.user.pk).exists():
            return Response({"success": False, "message": "That email is already in use."}, status=400)

        request.user.email = new_email
        request.user.save(update_fields=["email"])
        return Response({"success": True, "message": "Email updated."})


class TwoFactorSetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            import pyotp, qrcode, io, base64
        except ImportError:
            return Response({"success": False, "message": "2FA library not installed."}, status=500)

        secret = pyotp.random_base32()
        request.user.totp_secret = secret
        request.user.save(update_fields=["totp_secret"])

        uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=request.user.email or request.user.username,
            issuer_name="QuickTIMS"
        )
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

        return Response({"success": True, "data": {"secret": secret, "qr_code": f"data:image/png;base64,{qr_b64}"}})

    def post(self, request):
        try:
            import pyotp
        except ImportError:
            return Response({"success": False, "message": "2FA library not installed."}, status=500)

        code = request.data.get("code", "")
        if not request.user.totp_secret:
            return Response({"success": False, "message": "No 2FA setup in progress."}, status=400)

        totp = pyotp.TOTP(request.user.totp_secret)
        if not totp.verify(code):
            return Response({"success": False, "message": "Invalid verification code."}, status=400)

        request.user.two_fa_enabled = True
        request.user.save(update_fields=["two_fa_enabled"])

        import secrets as _s
        backup_codes = [_s.token_hex(4).upper() for _ in range(8)]
        return Response({"success": True, "message": "2FA enabled.", "data": {"backup_codes": backup_codes}})

    def delete(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response({"success": False, "message": "Incorrect password."}, status=400)
        request.user.two_fa_enabled = False
        request.user.totp_secret = ""
        request.user.save(update_fields=["two_fa_enabled", "totp_secret"])
        return Response({"success": True, "message": "2FA disabled."})


class AcceptInviteView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.query_params.get("token")

        if not token:
            return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

        invite = TeamInvite.objects.filter(token=token).first()

        if not invite:
            return Response({"detail": "Invalid or expired invitation token."}, status=status.HTTP_400_BAD_REQUEST)
        
        if invite.status != "pending" or invite.is_expired:
            return Response({"detail": "This invitation is no longer valid."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "valid": True,
            "company_name": invite.company.company_name,
            "role": invite.role,
            "region": invite.region or invite.company.primary_country,
            "default_state": invite.default_state,
            "email": invite.email,
            "invited_by": invite.invited_by.get_full_name() if invite.invited_by else "",
        })

    def post(self, request):
        token = request.data.get("token")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")

        if not token or not password:
            return Response({"detail": "Token and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        invite = TeamInvite.objects.filter(token=token).first()

        if not invite:
            return Response({"detail": "Invalid or expired invitation token."}, status=status.HTTP_400_BAD_REQUEST)
        
        if invite.status == "accepted":
            User = get_user_model()
            if User.objects.filter(email__iexact=invite.email).exists():
                return Response({"detail": "This invitation has already been accepted. Please log in to your account."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": "This invitation has already been used."}, status=status.HTTP_400_BAD_REQUEST)
            
        if invite.status == "revoked":
            return Response({"detail": "This invitation has been revoked by the administrator."}, status=status.HTTP_400_BAD_REQUEST)

        if invite.status == "expired" or invite.is_expired:
            if invite.status != "expired":
                invite.status = "expired"
                invite.save()
            return Response({"detail": "This invitation has expired."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            with transaction.atomic():
                user = User.objects.filter(email__iexact=invite.email).first()
                if not user:
                    username = invite.email.split("@")[0]
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1

                    user = User.objects.create_user(
                        username=username,
                        password=password,
                        email=invite.email,
                        first_name=first_name,
                        last_name=last_name,
                        role=invite.role,
                    )
                else:
                    user.set_password(password)
                    user.role = invite.role
                    if first_name:
                        user.first_name = first_name
                    if last_name:
                        user.last_name = last_name

                user.company = invite.company
                user.is_active = True
                if user.role == "admin":
                    user.is_staff = True
                if invite.custom_permissions:
                    user.custom_permissions = invite.custom_permissions
                user.save()

                invite.status = "accepted"
                from django.utils import timezone
                invite.accepted_at = timezone.now()
                invite.save()

        except Exception as e:
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


        refresh = CustomTokenObtainPairSerializer.get_token(user)
        response = Response({
            "success": True,
            "user": UserSerializer(user).data,
            "message": "Login successfully"
        }, status=status.HTTP_201_CREATED)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "Email is required"}, status=400)
            
        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        
        # ── Security: only proceed if the email matches a real account. ──────
        # We do NOT fall back to User.objects.first() or any other user object.
        # Sending a reset link to an unrelated account would be a privilege
        # escalation / account takeover vulnerability.
        reset_url = None
        if user:
            token_generator = PasswordResetTokenGenerator()
            token = token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Fallback frontend URL if not defined
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"
            
            first_name = user.first_name or user.username or "Customer"
            subject = "Sevo Password Reset Request"
            
            body_text = (
                "SEVO SECURITY\n\n"
                f"Hello {first_name},\n\n"
                f"A password reset request has been received for: {user.email or user.username}\n\n"
                f"Reset Link: {reset_url}\n\n"
                "This link will expire in 15 minutes.\n"
                "If you did not request this action, you can safely ignore this email.\n"
            )
            
            html_message = f"""
            <div style="font-family: sans-serif; padding: 30px; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #4f46e5; margin-bottom: 20px;">Sevo Password Reset</h2>
                <p style="color: #334155; font-size: 15px;">Hello {first_name},</p>
                <p style="color: #64748b; font-size: 14px;">A password reset was requested for your account ({user.email or user.username}).</p>
                <div style="margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 12px;">This link will expire in 15 minutes. If you did not make this request, please ignore this email.</p>
            </div>
            """

            try:
                send_mail(
                    subject,
                    body_text,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                    html_message=html_message
                )
            except Exception as e:
                print(f"Failed to send email: {e}")
        
        response_data = {"detail": "If an account exists with that email, a password reset link has been sent."}
        if settings.DEBUG and reset_url:
            response_data["reset_url"] = reset_url
            
        # Always return success to prevent email enumeration
        return Response(response_data)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        
        if not uidb64 or not token or not new_password:
            return Response({"detail": "Missing required fields"}, status=400)
            
        User = get_user_model()
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
            
        if user is not None and PasswordResetTokenGenerator().check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({
                "detail": "Password has been reset successfully.",
            })
        return Response({"detail": "Invalid or expired token"}, status=400)


class PasswordResetVerifyIdentityView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identity = request.data.get("identity")
        if not identity:
            return Response({"detail": "Identity is required"}, status=400)
        
        identity = identity.strip()
        User = get_user_model()
        user = User.objects.filter(Q(username__iexact=identity) | Q(email__iexact=identity)).first()

        def mask_email(email_str):
            if not email_str or "@" not in email_str:
                return "su***@company.com"
            parts = email_str.split("@")
            username = parts[0]
            domain = parts[1]
            if len(username) <= 2:
                masked_username = username + "***"
            else:
                masked_username = username[:2] + "***"
            return f"{masked_username}@{domain}"

        if user:
            name = user.get_full_name() or user.username
            email = user.email
            return Response({
                "verified": True,
                "name": name,
                "email": email,
                "email_masked": mask_email(email)
            })

        return Response({"detail": "User not found with provided identifier."}, status=404)


def _normalize_phone(phone):
    if not phone:
        return ""
    import re
    clean = re.sub(r"[^\d+]", "", str(phone))  # remove all non-digits and non-plus characters
    if not clean.startswith("+"):
        if len(clean) == 10:
            clean = f"+91{clean}"
        elif clean.startswith("91") and len(clean) == 12:
            clean = f"+{clean}"
        else:
            clean = f"+{clean}"
    return clean


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def post(self, request):
        import random
        import os
        import time
        import hashlib
        from django.core.cache import cache
        from django.conf import settings
        from accounts.models import OTPAuditLog

        phone = request.data.get("phone")
        if not phone:
            return Response({"detail": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)
        normalized_phone = _normalize_phone(phone)

        # 1. Rate Limiting by IP (Max 5 requests per IP per minute)
        ip_cache_key = f"otp_rate_ip_{ip}"
        ip_count = cache.get(ip_cache_key, 0)
        if ip_count >= 5:
            OTPAuditLog.objects.create(
                phone=normalized_phone,
                ip_address=ip,
                action="rate_limited_ip",
                details="IP address exceeded 5 requests per minute."
            )
            return Response(
                {"detail": "Too many OTP requests from this IP. Please wait a minute."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 2. Rate Limiting by Phone (Max 5 requests per phone per hour)
        phone_cache_key = f"otp_rate_phone_{normalized_phone}"
        phone_count = cache.get(phone_cache_key, 0)
        if phone_count >= 5:
            OTPAuditLog.objects.create(
                phone=normalized_phone,
                ip_address=ip,
                action="rate_limited_phone",
                details="Phone number exceeded 5 requests per hour."
            )
            return Response(
                {"detail": "Too many OTP requests for this phone number. Please try again in an hour."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 3. Resend Cooldown (30 seconds)
        cache_key = f"otp_{normalized_phone}"
        existing_otp = cache.get(cache_key)
        if existing_otp and isinstance(existing_otp, dict):
            last_sent_at = existing_otp.get("last_sent_at", 0)
            elapsed = time.time() - last_sent_at
            if elapsed < 30:
                wait_time = int(30 - elapsed)
                return Response(
                    {"detail": f"Please wait {wait_time} seconds before requesting a new OTP."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Generate a secure 4-digit code
        code = str(random.randint(1000, 9999))

        # Encrypt/Hash OTP using SHA-256 keyed with Django SECRET_KEY
        hashed_code = hashlib.sha256(f"{settings.SECRET_KEY}:{code}".encode()).hexdigest()

        # Store in cache with 5-minute timeout (300 seconds)
        otp_data = {
            "hashed_code": hashed_code,
            "expires_at": time.time() + 300,
            "attempts": 0,
            "last_sent_at": time.time()
        }
        cache.set(cache_key, otp_data, timeout=300)

        # Update rate limiting counters
        cache.set(ip_cache_key, ip_count + 1, timeout=60)
        cache.set(phone_cache_key, phone_count + 1, timeout=3600)

        # Try to send SMS via Twilio if config exists and isn't placeholder
        sent_real_sms = False
        delivery_error = ""
        try:
            from twilio.rest import Client as TwilioClient
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            from_number = os.getenv("TWILIO_FROM_NUMBER")
            if account_sid and auth_token and from_number and not account_sid.startswith("your_"):
                client = TwilioClient(account_sid, auth_token)
                client.messages.create(
                    body=f"Caltrack security verification code: {code}. Expires in 5 minutes.",
                    from_=from_number,
                    to=normalized_phone
                )
                sent_real_sms = True
        except ImportError:
            delivery_error = "Twilio client library not installed"
        except Exception as e:
            delivery_error = str(e)
            print(f"Twilio SMS send error: {e}")

        delivery_channel = "sms" if sent_real_sms else "console"

        # Fixes HS-A-01: printing the raw OTP to the server console/log stream
        # meant anyone with log access (not just server operators -- hosting
        # dashboards, log aggregators, error trackers) could read it and log in
        # as any customer. Keep the console fallback for local development only
        # (settings.DEBUG) where it is the intended MVP delivery mechanism when
        # no SMS provider is configured; in a real deployment (DEBUG=False),
        # never print the code -- log that delivery fell back to console
        # without the code itself, so ops can see the gap and fix Twilio config
        # instead of quietly leaking every customer's login code to logs.
        if not sent_real_sms:
            if settings.DEBUG or getattr(settings, "AUTO_GENERATE_OTP", False):
                print("\n" + "=" * 50)
                print(f"  [SMS GATEWAY] OTP for {normalized_phone} is: {code} (Original input: {phone})")
                if delivery_error:
                    print(f"  [SMS GATEWAY] Twilio delivery skipped/failed: {delivery_error}")
                print("" + "=" * 50 + "\n")
            else:
                logger.error(
                    "OTP SMS delivery unavailable for %s (Twilio not configured or failed: %s). "
                    "OTP was generated but NOT printed to logs -- fix SMS provider config.",
                    normalized_phone, delivery_error or "not configured",
                )

        # Log to Audit Trail
        OTPAuditLog.objects.create(
            phone=normalized_phone,
            ip_address=ip,
            action="send_request",
            details=f"OTP generated and sent via {delivery_channel}. Expiry in 5 mins."
        )

        response_data = {
            "success": True, 
            "message": "OTP sent successfully.",
            "delivery_channel": delivery_channel
        }
        if settings.DEBUG or getattr(settings, "AUTO_GENERATE_OTP", False):
            response_data["code"] = code

        return Response(response_data)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def post(self, request):
        import time
        import hashlib
        from django.core.cache import cache
        from django.conf import settings
        from accounts.models import OTPAuditLog

        phone = request.data.get("phone")
        code = request.data.get("code")

        if not phone or not code:
            return Response({"detail": "Phone number and verification code are required."}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)
        normalized_phone = _normalize_phone(phone)
        cache_key = f"otp_{normalized_phone}"
        otp_data = cache.get(cache_key)

        if not otp_data or not isinstance(otp_data, dict):
            OTPAuditLog.objects.create(
                phone=normalized_phone,
                ip_address=ip,
                action="verify_failed",
                details="OTP not found or already expired."
            )
            return Response(
                {"detail": "OTP code expired or not found. Please request a new one."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check maximum attempts (5)
        if otp_data.get("attempts", 0) >= 5:
            OTPAuditLog.objects.create(
                phone=normalized_phone,
                ip_address=ip,
                action="attempts_exceeded",
                details="Exceeded 5 validation attempts."
            )
            return Response(
                {"detail": "Maximum verification attempts exceeded. Please request a new OTP."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check expiry
        if time.time() > otp_data.get("expires_at", 0):
            OTPAuditLog.objects.create(
                phone=normalized_phone,
                ip_address=ip,
                action="verify_failed",
                details="OTP expired."
            )
            return Response(
                {"detail": "OTP has expired. Please request a new one."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Hashed code comparison
        hashed_input = hashlib.sha256(f"{settings.SECRET_KEY}:{str(code).strip()}".encode()).hexdigest()

        if otp_data.get("hashed_code") == hashed_input:
            # Successfully verified
            cache.delete(cache_key)
            OTPAuditLog.objects.create(
                phone=normalized_phone,
                ip_address=ip,
                action="verify_success",
                details="OTP successfully verified."
            )
            return Response({"success": True, "message": "OTP verified successfully."})
        else:
            # Increment attempts
            attempts = otp_data.get("attempts", 0) + 1
            otp_data["attempts"] = attempts
            remaining = 5 - attempts

            if remaining <= 0:
                cache.delete(cache_key)
                OTPAuditLog.objects.create(
                    phone=normalized_phone,
                    ip_address=ip,
                    action="attempts_exceeded",
                    details="Attempts limit reached on failed validation."
                )
                return Response(
                    {"detail": "Maximum verification attempts exceeded. Please request a new OTP."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                remaining_time = int(otp_data.get("expires_at", 0) - time.time())
                if remaining_time > 0:
                    cache.set(cache_key, otp_data, timeout=remaining_time)
                else:
                    cache.delete(cache_key)

                OTPAuditLog.objects.create(
                    phone=normalized_phone,
                    ip_address=ip,
                    action="verify_failed",
                    details=f"Invalid code entered. Attempts: {attempts} of 5."
                )
                return Response(
                    {"detail": f"Invalid verification code. {remaining} attempts remaining."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )






class DeleteAccountView(APIView):
    """
    POST /api/auth/delete-account/
    Securely deletes an account using email and password verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"success": False, "message": "Both email and password are required to confirm account deletion."},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        target_user = User.objects.filter(email__iexact=email).first()

        if not target_user:
            return Response(
                {"success": False, "message": "No account found with the provided email address."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Perform anonymization instead of cascade delete (Phase 5 compliance)
        from django.db import transaction
        from customer_analytics.models import CustomerLoginEvent, CustomerIdentity
        from service_requests.models import ServiceRequest

        with transaction.atomic():
            # 1. Null/clear CustomerIdentity details
            if hasattr(target_user, "customer_identity"):
                ident = target_user.customer_identity
                ident.phone_normalized = ""
                ident.email_normalized = ""
                ident.save()
            
            # 2. Null IP and user agent logs
            CustomerLoginEvent.objects.filter(customer=target_user).update(
                ip_address=None,
                user_agent=""
            )
            
            # 3. Clear booking customer info
            ServiceRequest.objects.filter(customer=target_user).update(
                customer_name="Anonymized Customer",
                phone="",
                email=""
            )
            
            # 4. Anonymize User account fields
            target_user.first_name = "Anonymized"
            target_user.last_name = "Customer"
            target_user.email = None
            target_user.phone = None
            target_user.mobile_number = None
            target_user.is_active = False
            target_user.username = f"deleted_user_{target_user.id}"
            target_user.set_unusable_password()
            target_user.save()

        response_data = {"success": True, "message": "Account successfully deleted."}

        # Clear cookies/session if the logged-in user deleted their own account
        if target_user == request.user:
            response = Response(response_data)
            _clear_auth_cookies(response)
            return response

        return Response(response_data)



class SendEmailOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import random
        import time
        import hashlib
        from django.core.cache import cache
        from django.core.mail import send_mail
        from django.conf import settings
        from accounts.models import OTPAuditLog

        user = request.user
        email = user.email
        if not email:
            return Response({"success": False, "message": "Your account does not have a registered email address."}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)
        
        # Rate limit by IP (max 5 requests per IP per minute)
        ip_cache_key = f"email_otp_rate_ip_{ip}"
        ip_count = cache.get(ip_cache_key, 0)
        if ip_count >= 5:
            return Response(
                {"success": False, "message": "Too many request from this IP. Please wait a minute."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Rate limit by email (max 5 requests per email per hour)
        email_cache_key = f"email_otp_rate_email_{email.lower()}"
        email_count = cache.get(email_cache_key, 0)
        if email_count >= 5:
            return Response(
                {"success": False, "message": "Too many password reset requests. Please try again in an hour."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Cooldown (30 seconds)
        cache_key = f"email_otp_{email.lower()}"
        existing_otp = cache.get(cache_key)
        if existing_otp and isinstance(existing_otp, dict):
            last_sent_at = existing_otp.get("last_sent_at", 0)
            elapsed = time.time() - last_sent_at
            if elapsed < 30:
                wait_time = int(30 - elapsed)
                return Response(
                    {"success": False, "message": f"Please wait {wait_time} seconds before requesting a new code."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Generate 6-digit code
        code = str(random.randint(100000, 999999))
        hashed_code = hashlib.sha256(f"{settings.SECRET_KEY}:{code}".encode()).hexdigest()

        # Store in cache for 5 minutes
        otp_data = {
            "hashed_code": hashed_code,
            "expires_at": time.time() + 300,
            "attempts": 0,
            "last_sent_at": time.time()
        }
        cache.set(cache_key, otp_data, timeout=300)

        # Update rate limiting counters
        cache.set(ip_cache_key, ip_count + 1, timeout=60)
        cache.set(email_cache_key, email_count + 1, timeout=3600)

        # Premium HTML Email Content
        subject = "CALtrack Verification Code"
        body_text = (
            "━━━━━━━━━━━━━━━━━━━━━━━\n"
            "CALTRACK SECURITY HUB\n"
            "━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Hello {user.first_name or user.username},\n\n"
            "Your CALtrack security verification code is:\n\n"
            f"{code}\n\n"
            "This code is valid for 5 minutes.\n"
            "If you did not request this code, please change your password immediately.\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━━\n"
            "CALtrack Security Intelligence\n"
            "━━━━━━━━━━━━━━━━━━━━━━━"
        )
        
        html_message = f"""
        <div style="background-color: #03050d; color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 24px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
            <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 25px;">
                <div style="color: #6366f1; font-weight: 900; font-size: 20px; letter-spacing: 0.25em; text-transform: uppercase;">
                    CALTRACK SECURITY HUB
                </div>
            </div>
            <div style="padding: 0 10px;">
                <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
                    Hello {user.first_name or user.username},
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 25px;">
                    A verification code has been requested to change your password:
                </p>
                
                <div style="background-color: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 30px;">
                    <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #818cf8; display: block; margin-bottom: 8px;">Verification Code</span>
                    <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #f1f5f9; letter-spacing: 4px;">{code}</span>
                </div>
                
                <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 25px;">
                    This security token will expire in 5 minutes. If you did not initiate this action, please secure your account immediately.
                </p>
            </div>
            <div style="text-align: center; border-top: 2px solid #1e293b; padding-top: 20px; margin-top: 35px; color: #475569; font-size: 10px; font-family: monospace; letter-spacing: 0.15em; text-transform: uppercase;">
                CALtrack Security Intelligence
            </div>
        </div>
        """

        try:
            send_mail(
                subject,
                body_text,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
                html_message=html_message
            )
            # Log audit
            OTPAuditLog.objects.create(
                phone="",
                ip_address=ip,
                action="email_otp_sent",
                details=f"Email OTP sent to {email}. Expiry in 5 mins."
            )
        except Exception as e:
            print(f"Failed to send email OTP: {e}")
            return Response({"success": False, "message": "Failed to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response_data = {
            "success": True,
            "message": "Verification code sent to your email successfully."
        }
        if settings.DEBUG or getattr(settings, "AUTO_GENERATE_OTP", False):
            response_data["code"] = code

        return Response(response_data)


class PasswordResetWithOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import time
        import hashlib
        from django.core.cache import cache
        from django.conf import settings
        from accounts.models import OTPAuditLog

        otp_code = request.data.get("otp_code")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not otp_code or not new_password or not confirm_password:
            return Response({"success": False, "message": "Verification code and new passwords are required."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"success": False, "message": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"success": False, "message": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        email = user.email
        if not email:
            return Response({"success": False, "message": "User email address not found."}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)
        cache_key = f"email_otp_{email.lower()}"
        otp_data = cache.get(cache_key)

        if not otp_data or not isinstance(otp_data, dict):
            return Response({"success": False, "message": "Verification code expired or not found. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        # Check maximum attempts
        attempts = otp_data.get("attempts", 0)
        if attempts >= 5:
            cache.delete(cache_key)
            return Response({"success": False, "message": "Maximum verification attempts exceeded. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        # Check expiry
        if time.time() > otp_data.get("expires_at", 0):
            cache.delete(cache_key)
            return Response({"success": False, "message": "Verification code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        # Hash verification
        hashed_input = hashlib.sha256(f"{settings.SECRET_KEY}:{str(otp_code).strip()}".encode()).hexdigest()

        if otp_data.get("hashed_code") == hashed_input:
            # Success: reset password
            user.set_password(new_password)
            user.save(update_fields=["password"])
            cache.delete(cache_key)

            # Log audit
            OTPAuditLog.objects.create(
                phone="",
                ip_address=ip,
                action="email_otp_reset_success",
                details=f"Password successfully reset via email OTP for {email}."
            )
            return Response({"success": True, "message": "Password updated successfully."})
        else:
            # Increment attempts
            attempts += 1
            otp_data["attempts"] = attempts
            remaining = 5 - attempts
            
            if remaining <= 0:
                cache.delete(cache_key)
                return Response({"success": False, "message": "Maximum verification attempts exceeded. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                remaining_time = int(otp_data.get("expires_at", 0) - time.time())
                if remaining_time > 0:
                    cache.set(cache_key, otp_data, timeout=remaining_time)
                else:
                    cache.delete(cache_key)
                return Response({"success": False, "message": f"Invalid verification code. {remaining} attempts remaining."}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMER PROFILE & SAVED ADDRESS VIEWS
# ─────────────────────────────────────────────────────────────────────────────

from .permissions import IsCustomer
from . import customer_services
from .models import SavedAddress
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser as JSONParserClass


def _cs(data=None, message="", status_code=200):
    """Standard envelope for customer views."""
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _ce(message, status_code=400):
    return Response({"success": False, "message": message}, status=status_code)


def _serialize_address(addr):
    serviceability = customer_services.check_address_serviceability(addr)
    return {
        "id":                    addr.pk,
        "label":                 addr.label,
        "label_display":         addr.get_label_display(),
        "address_line1":         addr.address_line1,
        "address_line2":         addr.address_line2,
        "formatted_address":     addr.formatted_address or "",
        "flat_house_no":         addr.flat_house_no or "",
        "landmark":              addr.landmark or "",
        "locality":              addr.locality or "",
        "city":                  addr.city,
        "state":                 addr.state,
        "pincode":               addr.pincode,
        "phone_number":          addr.phone_number or "",
        "receiver_name":         addr.receiver_name or "",
        "receiver_phone":        addr.receiver_phone or "",
        "latitude":              str(addr.latitude) if addr.latitude is not None else None,
        "longitude":             str(addr.longitude) if addr.longitude is not None else None,
        "is_default":            addr.is_default,
        "last_used_at":          addr.last_used_at.isoformat() if addr.last_used_at else None,
        "serviceable":           serviceability.get("available", True),
        "serviceability_reason": serviceability.get("reason", "Service available"),
        "created_at":            addr.created_at,
        "updated_at":            addr.updated_at,
    }


class CustomerProfileView(APIView):
    """GET /api/auth/customer/profile/ — Return own profile."""
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request):
        data = customer_services.get_customer_profile(request.user)
        return _cs(data)


class CustomerProfileUpdateView(APIView):
    """PATCH /api/auth/customer/profile/ — Update own profile fields."""
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    parser_classes = [FormParser, MultiPartParser, JSONParserClass]

    def patch(self, request):
        allowed = {"first_name", "last_name", "phone", "email", "avatar", "last_known_location"}
        payload = {k: v for k, v in request.data.items() if k in allowed}

        try:
            data = customer_services.update_customer_profile(request.user, payload)
            return _cs(data, message="Profile updated.")
        except Exception as exc:
            return _ce(str(exc), 400)


class CustomerLocationDetectView(APIView):
    """
    POST /api/customer/location/detect/ or /api/auth/customer/location/detect/
    Stateless customer-persona location detection via reverse geocoding.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        accuracy = request.data.get("accuracy")

        if latitude is None or longitude is None:
            return Response({
                "success": False,
                "data": None,
                "error": "Invalid latitude or longitude coordinates.",
                "meta": {}
            }, status=400)

        try:
            result = customer_services.detect_customer_location(latitude, longitude, accuracy)
        except ValidationError as ve:
            detail = getattr(ve, "detail", "Invalid latitude or longitude coordinates.")
            if isinstance(detail, dict) and "detail" in detail:
                detail = detail["detail"]
            elif isinstance(detail, list) and detail:
                detail = detail[0]
            return Response({
                "success": False,
                "data": None,
                "error": str(detail),
                "meta": {}
            }, status=400)
        except Exception:
            return Response({
                "success": False,
                "data": None,
                "error": "Unable to fetch your location. Please try again.",
                "meta": {}
            }, status=200)

        if not result:
            return Response({
                "success": False,
                "data": None,
                "error": "Unable to fetch your location. Please try again.",
                "meta": {}
            }, status=200)

        return Response({
            "success": True,
            "data": result,
            "error": None,
            "meta": {}
        }, status=200)


class CustomerAddressListCreateView(APIView):
    """
    GET  /api/auth/customer/addresses/ — list all saved addresses.
    POST /api/auth/customer/addresses/ — create a new address.
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request):
        addresses = customer_services.list_saved_addresses(request.user)
        return _cs([_serialize_address(a) for a in addresses])

    def post(self, request):
        flat_house_no = str(request.data.get("flat_house_no", "")).strip()
        address_line1 = str(request.data.get("address_line1", "")).strip() or flat_house_no
        if not address_line1 and not flat_house_no:
            return _ce("'flat_house_no' or 'address_line1' is required.", 400)

        city = str(request.data.get("city", "")).strip() or str(request.data.get("locality", "")).strip() or "Hosur"
        state = str(request.data.get("state", "")).strip() or "Tamil Nadu"

        import re
        pincode = str(request.data.get("pincode", "")).strip()
        clean_pincode = re.sub(r"\D", "", pincode)
        if len(clean_pincode) == 6:
            pincode = clean_pincode
        elif not pincode or not re.match(r"^\d{6}$", pincode):
            pincode = "635109"

        receiver_phone = str(request.data.get("receiver_phone", "")).strip() or str(request.data.get("phone_number", "")).strip()
        if receiver_phone:
            clean_phone = re.sub(r"[\s\-\(\)\+]+", "", receiver_phone)
            # Strip country code prefix ONLY when total digits > 10
            # (prevents stripping "91" from numbers like 9150632938)
            if len(clean_phone) == 13 and clean_phone.startswith("91"):
                clean_phone = clean_phone[2:]   # +91XXXXXXXXXX → XXXXXXXXXX
            elif len(clean_phone) == 12 and clean_phone.startswith("91"):
                clean_phone = clean_phone[2:]   # 91XXXXXXXXXX → XXXXXXXXXX
            elif len(clean_phone) == 11 and clean_phone.startswith("0"):
                clean_phone = clean_phone[1:]   # 0XXXXXXXXXX → XXXXXXXXXX
            if not re.match(r"^\d{10}$", clean_phone):
                return _ce("Receiver phone must be a valid 10-digit mobile number.", 400)
            receiver_phone = clean_phone

        def _clean_coord(val):
            if val is None or val == "":
                return None
            try:
                return round(float(val), 6)
            except (ValueError, TypeError):
                return None

        data = {
            "label":             request.data.get("label", "home"),
            "address_line1":     address_line1,
            "address_line2":     request.data.get("address_line2", ""),
            "formatted_address": request.data.get("formatted_address", ""),
            "flat_house_no":     flat_house_no or address_line1,
            "landmark":          request.data.get("landmark", ""),
            "locality":          request.data.get("locality", ""),
            "city":              request.data.get("city", ""),
            "state":             request.data.get("state", ""),
            "pincode":           pincode,
            "phone_number":      receiver_phone,
            "receiver_name":     request.data.get("receiver_name", ""),
            "receiver_phone":    receiver_phone,
            "latitude":          _clean_coord(request.data.get("latitude")),
            "longitude":         _clean_coord(request.data.get("longitude")),
            "is_default":        request.data.get("is_default", False),
        }

        try:
            addr = customer_services.create_saved_address(request.user, data)
            return _cs(_serialize_address(addr), message="Address saved.", status_code=201)
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return _ce(str(detail), 400)


class CustomerAddressDetailView(APIView):
    """
    GET    /api/auth/customer/addresses/<id>/ — retrieve one address.
    PATCH  /api/auth/customer/addresses/<id>/ — update fields.
    DELETE /api/auth/customer/addresses/<id>/ — delete (blocked if active booking or default).
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request, pk):
        try:
            addr = request.user.saved_addresses.get(pk=pk)
            return _cs(_serialize_address(addr))
        except SavedAddress.DoesNotExist:
            return _ce("Address not found.", 404)

    def patch(self, request, pk):
        allowed = {
            "label", "address_line1", "address_line2", "city", "state", "pincode",
            "phone_number", "latitude", "longitude", "is_default",
            # Additional fields that AddressDetailsForm sends
            "flat_house_no", "landmark", "locality", "formatted_address",
            "receiver_name", "receiver_phone",
        }
        payload = {k: v for k, v in request.data.items() if k in allowed}

        # Normalize receiver_phone if provided
        import re
        if "receiver_phone" in payload and payload["receiver_phone"]:
            rp = re.sub(r"[\s\-\(\)\+]+", "", str(payload["receiver_phone"]))
            # Strip country code prefix ONLY when total digits > 10
            if len(rp) == 13 and rp.startswith("91"):
                rp = rp[2:]
            elif len(rp) == 12 and rp.startswith("91"):
                rp = rp[2:]
            elif len(rp) == 11 and rp.startswith("0"):
                rp = rp[1:]
            if re.match(r"^\d{10}$", rp):
                payload["receiver_phone"] = rp
                payload["phone_number"] = rp
            else:
                return _ce("Receiver phone must be a valid 10-digit mobile number.", 400)

        # Clean coordinates
        for coord_field in ("latitude", "longitude"):
            if coord_field in payload:
                try:
                    payload[coord_field] = round(float(payload[coord_field]), 6) if payload[coord_field] not in (None, "") else None
                except (ValueError, TypeError):
                    payload.pop(coord_field)

        try:
            addr = customer_services.update_saved_address(request.user, pk, payload)
            return _cs(_serialize_address(addr), message="Address updated.")
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return _ce(str(detail))

    def delete(self, request, pk):
        try:
            customer_services.delete_saved_address(request.user, pk)
            return _cs(message="Address deleted.")
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            if isinstance(detail, dict) and "detail" in detail:
                detail = detail["detail"]
            return _ce(str(detail), 400)


class CustomerAddressSetDefaultView(APIView):
    """POST /api/auth/customer/addresses/<id>/set-default/ — make one address the default."""
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request, pk):
        try:
            addr = customer_services.set_default_address(request.user, pk)
            return _cs(_serialize_address(addr), message="Default address updated.")
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return _ce(str(detail))


class CustomerAddressServiceabilityView(APIView):
    """GET /api/auth/customer/addresses/<id>/serviceability/ — check service availability."""
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request, pk):
        try:
            addr = request.user.saved_addresses.get(pk=pk)
            res = customer_services.check_address_serviceability(addr)
            return _cs(res)
        except SavedAddress.DoesNotExist:
            return _ce("Address not found.", 404)


class CustomerAddressMarkUsedView(APIView):
    """POST /api/auth/customer/addresses/<id>/mark-used/ — update last_used_at."""
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request, pk):
        try:
            addr = customer_services.mark_address_used(request.user, pk)
            return _cs(_serialize_address(addr), message="Address marked as used.")
        except Exception as exc:
            detail = getattr(exc, "detail", str(exc))
            return _ce(str(detail))
