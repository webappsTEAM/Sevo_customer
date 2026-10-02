# Switch the Hosur GT zone from polygon to a circle around its existing centre.
# Edit RADIUS_M below first (25000 = 25 km, 50000 = 50 km). Idempotent. Prints before/after.
RADIUS_M = 50000
from settings_hub.models import ServiceZone
z = ServiceZone.objects.filter(name__icontains="hosur").order_by("id").first()
print("BEFORE", z.id, z.name, z.zone_type, z.radius_meters, z.center_lat, z.center_lng)
z.zone_type = "circle"
z.radius_meters = RADIUS_M
z.save(update_fields=["zone_type", "radius_meters"])
print("AFTER ", z.id, z.zone_type, z.radius_meters)
print("ZONE_DONE")
