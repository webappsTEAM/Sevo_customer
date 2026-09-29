"""
"Areas We Serve" must come from real coverage: City -> ServiceZone coverage ->
covered areas -> UI. Exercised through the public endpoint the booking pages call.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import ServiceArea
from settings_hub.models import City, ServiceZone, ServiceZoneService

TRUCK, TW, PM = "goods_transport_truck", "goods_transport_two_wheeler", "packers_movers"


class AreasWeServeTests(TestCase):
    def setUp(self):
        self.company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        City.objects.exclude(slug__in=["hosur", "bengaluru"]).update(is_launched=False)
        self.hosur, _ = City.objects.update_or_create(slug="hosur", defaults=dict(name="Hosur", is_launched=True, is_active=True))
        self.blr, _ = City.objects.update_or_create(slug="bengaluru", defaults=dict(name="Bengaluru", is_launched=False, is_active=True))
        # The old free-standing list: must never leak into the response.
        for n in ("Sipcot Phase 1", "Unsupported Suburb"):
            ServiceArea.objects.create(city="hosur", name=n)

    def zone(self, name, city="hosur", services=(TRUCK, TW), **kw):
        z = ServiceZone.objects.create(
            company=self.company, name=name, city=City.objects.get(slug=city) if city else None,
            center_lat=12.74, center_lng=77.82, **kw)
        for s in services:
            ServiceZoneService.objects.create(zone=z, service_slug=s, is_available=True)
        return z

    def names(self, city="hosur", category="truck"):
        r = APIClient().get("/api/logistics/areas/", {"city": city, "category": category})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        return [a["name"] for a in body.get("data", body)]

    def test_only_covered_zone_names_and_never_the_legacy_list(self):
        self.zone("Sipcot")
        self.assertEqual(self.names(), ["Sipcot"])

    def test_no_coverage_is_empty(self):
        self.assertEqual(self.names(), [])
        self.assertEqual(self.names(category="packers_movers"), [])

    def test_service_specific(self):
        self.zone("Bike Only", services=(TW,))
        self.zone("All GT", services=(TRUCK, TW, PM))
        self.assertEqual(self.names(category="truck"), ["All GT"])
        self.assertEqual(self.names(category="two_wheeler"), ["All GT", "Bike Only"])
        self.assertEqual(self.names(category="packers_movers"), ["All GT"])

    def test_unassigned_or_unavailable_zone_is_not_coverage(self):
        self.zone("No Services", services=())
        z = self.zone("Switched Off")
        z.zone_services.update(is_available=False)
        self.assertEqual(self.names(), [])

    def test_paused_and_coming_soon_zones_excluded(self):
        self.zone("Paused", status=ServiceZone.STATUS_PAUSED)
        self.zone("Soon", status=ServiceZone.STATUS_COMING_SOON)
        self.zone("Live")
        self.assertEqual(self.names(), ["Live"])

    def test_other_city_zones_excluded(self):
        self.zone("Elsewhere", city="bengaluru")
        self.zone("Here")
        self.assertEqual(self.names("hosur"), ["Here"])

    def test_unlaunched_city_serves_nothing(self):
        self.zone("Blr Zone", city="bengaluru")
        self.assertEqual(self.names("bengaluru"), [])

    def test_vehicle_class_restriction(self):
        self.zone("Trucks Only", vehicle_classes=["truck"])
        self.zone("Bikes Only", vehicle_classes=["two_wheeler"])
        self.assertEqual(self.names(category="truck"), ["Trucks Only"])
        self.assertEqual(self.names(category="two_wheeler"), ["Bikes Only"])

    def test_untagged_zone_belongs_to_default_launched_city(self):
        self.zone("Legacy", city=None)
        self.assertEqual(self.names("hosur"), ["Legacy"])
        self.assertEqual(self.names("bengaluru"), [])

    def test_admin_change_propagates(self):
        z = self.zone("Live")
        self.assertEqual(self.names(), ["Live"])
        z.name = "Renamed"; z.save()
        self.assertEqual(self.names(), ["Renamed"])
        z.status = ServiceZone.STATUS_PAUSED; z.save()
        self.assertEqual(self.names(), [])

    def test_unknown_category_or_missing_params_empty(self):
        self.zone("Live")
        self.assertEqual(self.names(category="bogus"), [])
        self.assertEqual(self.names(category=""), [])
        self.assertEqual(self.names(city=""), [])
