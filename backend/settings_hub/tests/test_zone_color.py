"""Admin-configurable ServiceZone map colour (Service Coverage tab)."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from settings_hub.models import ServiceZone

User = get_user_model()
URL = "/api/settings/service-zones/"


class ZoneColorApiTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="Color Co")
        self.admin = User.objects.create_user(
            username="coloradmin", email="c@x.com", password="Pw123456!",
            role="admin", is_staff=True, company=self.company,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _payload(self, **extra):
        p = {"name": "Hosur", "zone_type": "circle", "center_lat": 12.74, "center_lng": 77.82,
             "radius_meters": 10000, "services": [{"service_slug": "goods_transport_truck"}]}
        p.update(extra)
        return p

    def test_default_color_when_omitted(self):
        r = self.client.post(URL, self._payload(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["color"], "#4F46E5")

    def test_valid_hex_accepted_and_normalised(self):
        r = self.client.post(URL, self._payload(color="#2563EB"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["color"], "#2563eb")
        self.assertEqual(ServiceZone.objects.get(pk=r.json()["id"]).color, "#2563eb")
        r = self.client.post(URL, self._payload(name="B", color="#0f0"), format="json")
        self.assertEqual(r.json()["color"], "#00ff00")

    def test_invalid_colors_rejected(self):
        for bad in ["blue", "#12345", "#GGGGGG", "2563eb", "#2563eb; x", 123, "rgb(1,2,3)"]:
            with self.subTest(bad=bad):
                r = self.client.post(URL, self._payload(color=bad), format="json")
                self.assertEqual(r.status_code, 400)
        self.assertEqual(ServiceZone.objects.count(), 0)

    def test_patch_color(self):
        zid = self.client.post(URL, self._payload(), format="json").json()["id"]
        r = self.client.patch(f"{URL}{zid}/", {"color": "#DC2626"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["color"], "#dc2626")
        r = self.client.patch(f"{URL}{zid}/", {"color": "red"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ServiceZone.objects.get(pk=zid).color, "#dc2626")

    def test_color_returned_in_list_and_does_not_affect_coverage(self):
        from settings_hub.service_zone_engine import find_zone_for_service
        self.client.post(URL, self._payload(color="#16a34a"), format="json")
        lst = self.client.get(URL + "?services=goods_transport_truck").json()
        self.assertEqual(lst[0]["color"], "#16a34a")
        self.assertTrue(find_zone_for_service(12.74, 77.82, "goods_transport_truck", self.company.pk).allowed)
