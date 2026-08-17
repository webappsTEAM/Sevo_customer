from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/live/employee/$", consumers.EmployeeLocationConsumer.as_asgi()),
    re_path(r"^ws/live/admin/$", consumers.AdminMapConsumer.as_asgi()),
    re_path(r"^ws/live/presence/$", consumers.PresenceConsumer.as_asgi()),
    re_path(r"^ws/live/booking/(?P<booking_id>[^/]+)/$", consumers.CustomerBookingConsumer.as_asgi()),
]

