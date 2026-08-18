"""
quicktims/routing.py

Channels WebSocket URL Routing configuration.
Maps real-time WebSocket endpoints to their respective consumers:
- /ws/tracking/<identifier>/ -> TrackingConsumer
- /ws/auth/otp/             -> AuthOtpConsumer
"""
from django.urls import re_path
from service_requests.consumers import TrackingConsumer
from accounts.consumers import AuthOtpConsumer

websocket_urlpatterns = [
    re_path(r"^ws/tracking/(?P<identifier>[\w-]+)/?$", TrackingConsumer.as_asgi()),
    re_path(r"^ws/auth/otp/?$", AuthOtpConsumer.as_asgi()),
]
