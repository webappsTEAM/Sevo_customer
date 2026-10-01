from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class ZoneAdminRoleParityTests(TestCase):
    def test_owner_and_superadmin_can_create_edit_delete(self):
        U = get_user_model()
        for i, role in enumerate(("admin", "owner", "superadmin", "manager")):
            u = U.objects.create_user(f"zr{i}", f"zr{i}@x.com", "pw12345678")
            u.role = role; u.save()
            c = APIClient(); c.force_authenticate(u)
            r = c.post("/api/settings/service-zones/", {"name": f"Z{i}", "zone_type": "circle", "center_lat": 12.7, "center_lng": 77.8, "radius_meters": 5000}, format="json")
            if r.status_code != 201:
                continue
            zid = r.json()["id"]
            self.assertEqual(c.patch(f"/api/settings/service-zones/{zid}/", {"name": "N"}, format="json").status_code, 200, role)
            self.assertEqual(c.delete(f"/api/settings/service-zones/{zid}/").status_code, 204, role)
