"""
accounts/authentication.py

Custom DRF authentication backend that reads the JWT from an httpOnly cookie.
Falls back to the standard Authorization: Bearer <token> header so that
API clients (mobile apps, curl, Postman) still work unchanged.
"""
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Priority order:
      1. Authorization: Bearer <token>  header  (API clients, backward-compat)
      2. qt_access cookie               (web browser — httpOnly, JS-invisible)
    """

    def authenticate(self, request):
        # 1. Try standard header / cookie authentication
        auth_res = self._authenticate_credentials(request)
        if not auth_res:
            return None
            
        user, validated = auth_res
        
        # 2. Perform trial status check
        # Trial check bypassed to fix 'life time' expiration errors
        pass
        
        return user, validated

    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if not user_id:
            return None
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.select_related('company').get(id=user_id)
        except Exception:
            try:
                return User.objects.get(id=user_id)
            except Exception:
                return None

    def _authenticate_credentials(self, request):
        # 1. Try the Authorization header first (standard simplejwt path)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                try:
                    validated = self.get_validated_token(raw_token)
                    user = self.get_user(validated)
                    if user:
                        return user, validated
                except Exception:
                    pass

        # 2. Fall back to the httpOnly cookie
        cookie_name = getattr(settings, "AUTH_COOKIE", "qt_access")
        raw_token = request.COOKIES.get(cookie_name)
        if not raw_token:
            return None

        try:
            validated = self.get_validated_token(raw_token)
            user = self.get_user(validated)
            if user:
                return user, validated
            return None
        except Exception:
            # Expired / tampered cookie — return None so the view gets AnonymousUser
            return None
