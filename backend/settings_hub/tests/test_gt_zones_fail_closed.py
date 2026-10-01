from django.test import TestCase
from companies.models import Company
from settings_hub.models import ServiceZone
from settings_hub.service_zone_engine import check_route_coverage


class GTZonesFailClosedTests(TestCase):
    def setUp(self):
        self.co = Company.objects.create(company_name="ZC Co", slug="zc-co")

    def _route(self, slug):
        return check_route_coverage(pickup_lat=12.7409, pickup_lng=77.8253, drop_lat=12.7546, drop_lng=77.8345,
                                    service_slug=slug, company=self.co)

    def test_no_zones_at_all_is_open_access(self):
        self.assertTrue(self._route("goods_transport_truck").allowed)

    def test_all_zones_paused_blocks_gt(self):
        ServiceZone.objects.create(company=self.co, name="Z", zone_type="circle", center_lat=12.74, center_lng=77.82,
                                   radius_meters=5000, status="paused", is_active=False)
        for slug in ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers"):
            self.assertFalse(self._route(slug).allowed, slug)

    def test_other_services_keep_open_access_when_only_paused_zones(self):
        ServiceZone.objects.create(company=self.co, name="Z", zone_type="circle", center_lat=12.74, center_lng=77.82,
                                   radius_meters=5000, status="paused", is_active=False)
        self.assertTrue(self._route("ac_repair").allowed)

    def test_coming_soon_only_keeps_open_access(self):
        ServiceZone.objects.create(company=self.co, name="Soon", zone_type="circle", center_lat=12.74, center_lng=77.82,
                                   radius_meters=5000, status="coming_soon", is_active=False)
        self.assertTrue(self._route("goods_transport_truck").allowed)
