"""
"Areas We Serve" -- derived from real service coverage, never from a
free-standing list.

    City  ->  ServiceZone coverage  ->  covered areas  ->  customer UI

The admin's Service Coverage / Locations screens manage ServiceZone rows, and
service_zone_engine.find_zone_for_service is what actually decides whether a
booking is accepted. This module applies the SAME eligibility rules to answer
the display question "which named areas can this city + service really serve?"
so the list can never advertise an area the booking gate would refuse:

* the city must be live (a City row that is not launched/active serves nothing);
* the zone must be ACTIVE (coming-soon / paused zones are not coverage);
* the zone must belong to the city (untagged zones belong to the default
  launched city, the same convention catalog sync uses);
* Goods & Transport / Packers & Movers use strict slug matching in the engine:
  the zone must be explicitly assigned this service with is_available=True --
  an unassigned zone grants nothing;
* a zone restricted to vehicle classes must allow at least one class the
  category can dispatch.

No zones at all means the engine runs in open-access mode; there is nothing
nameable to advertise, so the answer is an empty list, never a made-up one.
"""
from service_requests.services.logistics_pricing import DISPATCHABLE_VEHICLE_CLASSES

# ServiceTier.category (what the booking pages pass) -> ServiceZoneService slug.
CATEGORY_TO_ZONE_SERVICE_SLUG = {
    "truck": "goods_transport_truck",
    "two_wheeler": "goods_transport_two_wheeler",
    "packers_movers": "packers_movers",
}

# Vehicle classes a category can dispatch. Packers & Movers is matched on
# payload, not vehicle class, so a class restriction never applies to it.
_CATEGORY_VEHICLE_CLASSES = {
    "truck": frozenset(DISPATCHABLE_VEHICLE_CLASSES) - {"two_wheeler"},
    "two_wheeler": frozenset({"two_wheeler"}),
    "packers_movers": None,
}


def _default_city_slug():
    from settings_hub.models import City

    city = City.objects.filter(is_active=True, is_launched=True).first()
    return city.slug if city else "hosur"


def _zone_serves_category(zone, category, service_slug):
    assignments = list(zone.zone_services.all())
    if not any(
        (a.service_slug or "").strip().lower() == service_slug and a.is_available
        for a in assignments
    ):
        return False
    allowed = _CATEGORY_VEHICLE_CLASSES.get(category)
    restricted = [str(v).strip().lower() for v in (zone.vehicle_classes or []) if str(v).strip()]
    if allowed is None or not restricted:
        return True
    return bool(allowed.intersection(restricted))


def covered_area_zones(*, company, city_slug, category):
    """ServiceZone rows that genuinely cover `category` in `city_slug`."""
    from settings_hub.models import City, ServiceZone

    city_slug = (city_slug or "").strip().lower()
    service_slug = CATEGORY_TO_ZONE_SERVICE_SLUG.get((category or "").strip().lower())
    if company is None or not city_slug or service_slug is None:
        return []

    city_row = City.objects.filter(slug__iexact=city_slug).first()
    if city_row is not None and not (city_row.is_launched and city_row.is_active):
        return []

    default_slug = _default_city_slug()
    zones = (
        ServiceZone.objects.filter(company=company, is_active=True)
        .select_related("city")
        .prefetch_related("zone_services")
    )
    covered = []
    for zone in zones:
        if zone.city_id is not None:
            in_city = (zone.city.slug or "").lower() == city_slug
        else:
            in_city = city_slug == default_slug
        if in_city and _zone_serves_category(zone, category.strip().lower(), service_slug):
            covered.append(zone)
    covered.sort(key=lambda z: (z.name or "").lower())
    return covered
