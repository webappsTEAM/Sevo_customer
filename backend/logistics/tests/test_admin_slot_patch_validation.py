from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from logistics.models import LogisticsSlot


class AdminSlotPatchValidationTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.admin = U.objects.create_superuser("slotadm", "slotadm@x.com", "pw12345678")
        self.c = APIClient(); self.c.force_authenticate(self.admin)
        self.slot = LogisticsSlot.objects.create(category="truck", city="hosur", group="Morning", slot_label="05:00 AM - 06:00 AM",
                                                 start_time="05:00", end_time="06:00", capacity=2, is_active=True)
        self.url = f"/api/logistics/admin/slots/{self.slot.id}/"

    def test_bad_capacity_rejected_not_silently_ignored(self):
        for bad in (-1, 0, "abc", True):
            r = self.c.patch(self.url, {"capacity": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)
            self.assertEqual(r.json()["error_code"], "INVALID_CAPACITY")
        self.slot.refresh_from_db(); self.assertEqual(self.slot.capacity, 2)

    def test_bad_category_rejected(self):
        r = self.c.patch(self.url, {"category": "bogus"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_valid_update_still_works(self):
        r = self.c.patch(self.url, {"capacity": 5}, format="json")
        self.assertEqual(r.status_code, 200)
        self.slot.refresh_from_db(); self.assertEqual(self.slot.capacity, 5)


class AdminLanePatchValidationTests(TestCase):
    def setUp(self):
        from logistics.models import Lane
        U = get_user_model()
        self.admin = U.objects.create_superuser("laneadm", "laneadm@x.com", "pw12345678")
        self.c = APIClient(); self.c.force_authenticate(self.admin)
        r = self.c.post("/api/logistics/admin/lanes/", {"category": "truck", "city": "Hosur", "destination_label": "QA Hub", "fare": "1000"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.id = r.json()["data"]["id"]; self.Lane = Lane

    def test_bad_values_rejected(self):
        for f, v in (("fare", "-5"), ("fare", "abc"), ("fare", ""), ("distance_km", "-3"), ("destination_latitude", "95"), ("fare", "NaN")):
            r = self.c.patch(f"/api/logistics/admin/lanes/{self.id}/", {f: v}, format="json")
            self.assertEqual(r.status_code, 400, (f, v))
        self.assertEqual(str(self.Lane.objects.get(pk=self.id).fare), "1000.00")

    def test_valid_update(self):
        r = self.c.patch(f"/api/logistics/admin/lanes/{self.id}/", {"fare": "1200"}, format="json")
        self.assertEqual(r.status_code, 200)
