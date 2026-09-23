"""
accounts/jwt_channels_middleware.py

Channels ASGI Middleware for JWT Authentication.
Enables seamless user authentication over WebSockets using:
1. HttpOnly JWT Cookie (settings.AUTH_COOKIE / 'qt_access')
2. Authorization header ('Bearer <jwt_token>')
3. Query parameters (?token=<jwt_token> / ?access_token=<jwt_token>)
"""
import urllib.parse
from http.cookies import SimpleCookie
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async


@database_sync_to_async
def get_user_from_jwt_token(token_str):
    if not token_str:
        return None
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token_obj = AccessToken(token_str)
        user_id = token_obj.get("user_id")
        if user_id:
            User = get_user_model()
            return User.objects.filter(pk=user_id, is_active=True).first()
    except Exception:
        pass
    return None


class JwtAuthMiddleware:
    """
    ASGI middleware that parses JWT credentials from cookies, headers, or query parameters
    and attaches the authenticated user to scope["user"].
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "websocket":
            user = scope.get("user")
            if not user or not user.is_authenticated:
                cookie_name = getattr(settings, "AUTH_COOKIE", "qt_access")
                raw_token = None

                # 1. Inspect scope cookies dict
                cookies = scope.get("cookies") or {}
                if cookie_name in cookies:
                    raw_token = cookies[cookie_name]

                # 2. Inspect raw headers for cookie or Authorization header
                if not raw_token:
                    headers = dict(scope.get("headers", []))
                    cookie_header = headers.get(b"cookie", b"").decode("utf-8")
                    if cookie_header:
                        try:
                            c = SimpleCookie()
                            c.load(cookie_header)
                            if cookie_name in c:
                                raw_token = c[cookie_name].value
                        except Exception:
                            pass

                    if not raw_token:
                        auth_header = headers.get(b"authorization", b"").decode("utf-8")
                        if auth_header.lower().startswith("bearer "):
                            raw_token = auth_header[7:].strip()

                # 3. Inspect query string token
                if not raw_token:
                    query_string = scope.get("query_string", b"").decode("utf-8")
                    if query_string:
                        params = urllib.parse.parse_qs(query_string)
                        token_candidate = (
                            (params.get("token") or [None])[0]
                            or (params.get("access_token") or [None])[0]
                            or (params.get("jwt") or [None])[0]
                        )
                        if token_candidate and token_candidate.count(".") == 2:
                            raw_token = token_candidate.strip()

                if raw_token:
                    resolved_user = await get_user_from_jwt_token(raw_token)
                    if resolved_user:
                        scope["user"] = resolved_user

        return await self.inner(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    from channels.auth import AuthMiddlewareStack
    return AuthMiddlewareStack(JwtAuthMiddleware(inner))
