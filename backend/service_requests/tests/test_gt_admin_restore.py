"""
Round 6: Admin GT data restoration, map/coverage company resolution, and the new Admin lists.

* restore_gt_admin_config: audit is read-only; --apply restores the evidence-backed Hosur
  configuration so the booking gate serves GT again; a second run changes nothing; existing
  admin rows are never overwritten, reactivated or deleted.
* The customer map / pin check and the booking gate resolve the same operating company even
  when other Company rows exist (Company.ordering is by a blank `code`).
* /api/logistics/admin/lists/<resource>/ validates with the model's own rules.
"""
import io
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import GTFaq, Lane, LogisticsSlot, PackersMoversSurchargeRule, ProhibitedGoodsRule, ServiceTier
from service_requests.models import Package
from settings_hub.models import City, ServiceZone, ServiceZoneService
from settings_hub.service_zone_engine import check_route_coverage

User = get_user_model()
HOSUR_A = (12.7409, 77.8253)
HOSUR_B = (12.7300, 77.8100)
GT = ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers")


def _user(role):
    n = uuid.uuid4().hex[:8]
    return User.objects.create_user(username=f"r6_{n}", email=f"r6_{n}@e.com", password="pw12345678",
                                     phone=f"96{uuid.uuid4().int % 100000000:08d}", role=role)


def _run(*args):
    out = io.StringIO()
    call_command("restore_gt_admin_config", *args, stdout=out)
    return out.getvalue()


def _gate(company, slug):
    return check_route_coverage(pickup_lat=HOSUR_A[0], pickup_lng=HOSUR_A[1], drop_lat=HOSUR_B[0],
                                drop_lng=HOSUR_B[1], service_slug=slug, company=company)


class RestoreGTAdminConfigTests(TestCase):
    def setUp(self):
        Company.objects.create(company_name="Fixture A", slug="aaa-fixture")
        self.company = Company.objects.create(company_name="SEVO", slug="calservices")
        # The pre-loss Hosur zone only carried the legacy GT slugs (2026-09-23 backup).
        self.zone = ServiceZone.objects.create(company=self.company, name="hosur", zone_type="circle",
                                               center_lat=12.754598, center_lng=77.834477, radius_meters=50000)
        for slug in ("truck", "two-wheeler", "packers-movers", "electrician"):
            ServiceZoneService.objects.create(zone=self.zone, service_slug=slug)

    def test_audit_writes_nothing_and_reports_gaps(self):
        before = (ServiceTier.objects.count(), Lane.objects.count(), ServiceZoneService.objects.count())
        out = _run()
        self.assertIn("[LEGACY  ] Coverage", out)
        self.assertIn("[MISSING ] Vehicle tier", out)
        self.assertEqual(before, (ServiceTier.objects.count(), Lane.objects.count(), ServiceZoneService.objects.count()))
        for slug in GT:
            self.assertFalse(_gate(self.company, slug).allowed)   # legacy-only zone: GT refused

    def test_apply_restores_bookable_gt_and_is_idempotent(self):
        out = _run("--apply")
        self.assertIn("RESTORED", out)
        for slug in GT:
            self.assertTrue(_gate(self.company, slug).allowed, slug)
        ace = ServiceTier.objects.get(slug="tata-ace")
        self.assertEqual((ace.category, ace.per_km_rate, ace.base_fare, ace.max_weight_kg),
                         ("truck", Decimal("22.00"), Decimal("220.00"), Decimal("850.00")))
        self.assertTrue(Package.objects.filter(gt_service_tier_id=ace.id).exists())   # Admin-editable
        self.assertEqual(Lane.objects.filter(category="truck", city__iexact="hosur").count(), 9)
        self.assertEqual(LogisticsSlot.objects.filter(category="truck").count(), 16)
        self.assertEqual(GTFaq.objects.count(), 12)
        counts = (ServiceTier.objects.count(), Lane.objects.count(), ServiceZoneService.objects.count(),
                  Package.objects.count())
        again = _run("--apply")
        self.assertNotIn("RESTORED", again)
        self.assertEqual(counts, (ServiceTier.objects.count(), Lane.objects.count(),
                                  ServiceZoneService.objects.count(), Package.objects.count()))
        self.assertNotIn("[MISSING", _run())

    def test_existing_admin_rows_are_never_overwritten_or_reactivated(self):
        Lane.objects.create(category="truck", city="Hosur", destination_label="Only lane", fare=Decimal("999"),
                            is_active=False)
        slot = LogisticsSlot.objects.create(category="truck", city="hosur", slot_label="Custom", capacity=2,
                                            is_active=False)
        _run("--apply")
        self.assertEqual(Lane.objects.filter(category="truck").count(), 1)           # partial scope left alone
        self.assertFalse(Lane.objects.get(destination_label="Only lane").is_active)
        slot.refresh_from_db()
        self.assertFalse(slot.is_active)
        self.assertEqual(LogisticsSlot.objects.filter(category="truck").count(), 1)
        tier = ServiceTier.objects.get(slug="tata-ace")
        tier.per_km_rate = Decimal("30.00")
        tier.save(update_fields=["per_km_rate"])
        _run("--apply")
        tier.refresh_from_db()
        self.assertEqual(tier.per_km_rate, Decimal("30.00"))
        self.assertIn("PARTIAL", _run())

    def test_zone_created_when_company_has_no_gt_coverage(self):
        self.zone.delete()
        _run("--apply")
        zone = ServiceZone.objects.get(company=self.company)
        self.assertEqual(zone.radius_meters, 50000)
        self.assertEqual(zone.city, City.objects.filter(slug="hosur").first())
        for slug in GT:
            self.assertTrue(_gate(self.company, slug).allowed, slug)


class CoverageCompanyResolutionTests(TestCase):
    """The map picker, the pin check and the booking gate must read the same company's zones."""

    def setUp(self):
        for s in ("aaa-fixture", "bbb-fixture"):
            Company.objects.create(company_name=s, slug=s)
        self.company = Company.objects.create(company_name="SEVO", slug="calservices")
        zone = ServiceZone.objects.create(company=self.company, name="Hosur GT", zone_type="circle",
                                          center_lat=12.754598, center_lng=77.834477, radius_meters=50000)
        ServiceZoneService.objects.create(zone=zone, service_slug="goods_transport_truck")

    def test_anonymous_map_and_pin_check_use_the_operating_company(self):
        anon = APIClient()
        zones = anon.get("/api/settings/service-zones/", {"services": "goods_transport_truck"}).json()
        self.assertEqual([z["name"] for z in zones], ["Hosur GT"])
        r = anon.post("/api/settings/service-zones/check/", {
            "lat": HOSUR_A[0], "lng": HOSUR_A[1], "service_slug": "goods_transport_truck", "point": "pickup"},
            format="json").json()
        self.assertTrue(r["in_zone"], r)
        self.assertFalse(r["open_access"])
        far = anon.post("/api/settings/service-zones/check/", {
            "lat": 13.0827, "lng": 80.2707, "service_slug": "goods_transport_truck", "point": "pickup"},
            format="json").json()
        self.assertFalse(far["in_zone"])


class AdminListsTests(TestCase):
    def setUp(self):
        self.admin = APIClient()
        self.admin.force_authenticate(_user("admin"))
        self.base = "/api/logistics/admin/lists/"

    def test_prohibited_rule_create_validate_deactivate(self):
        r = self.admin.post(self.base + "prohibited-rules/", {"label": "Batteries", "keywords": ""}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.admin.post(self.base + "prohibited-rules/", {"label": "Batteries", "keywords": "car battery\nlithium"},
                            format="json")
        self.assertEqual(r.status_code, 200, r.content)
        pk = r.json()["data"]["id"]
        self.assertEqual(self.admin.post(self.base + "prohibited-rules/", {"label": "Batteries", "keywords": "x"},
                                         format="json").status_code, 400)          # unique label
        self.assertEqual(self.admin.delete(f"{self.base}prohibited-rules/{pk}/").status_code, 200)
        self.assertFalse(ProhibitedGoodsRule.objects.get(pk=pk).is_active)

    def test_surcharge_uses_model_rules(self):
        r = self.admin.post(self.base + "pm-surcharges/", {"name": "Weekend", "rule_type": "WEEKDAY", "weekdays": "5,6"},
                            format="json")
        self.assertEqual(r.status_code, 400)                                        # charges nothing
        r = self.admin.post(self.base + "pm-surcharges/", {"name": "Weekend", "rule_type": "WEEKDAY", "weekdays": "9",
                                                           "percent": "10"}, format="json")
        self.assertEqual(r.status_code, 400)                                        # bad weekday
        r = self.admin.post(self.base + "pm-surcharges/", {"name": "Weekend", "rule_type": "WEEKDAY", "weekdays": "5,6",
                                                           "percent": "10"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(PackersMoversSurchargeRule.objects.filter(name="Weekend", is_active=True).exists())

    def test_city_launch_and_permissions(self):
        r = self.admin.post(self.base + "cities/", {"name": "Salem", "slug": "salem", "state": "Tamil Nadu"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        pk = r.json()["data"]["id"]
        self.assertEqual(self.admin.patch(f"{self.base}cities/{pk}/", {"is_launched": True}, format="json").status_code, 200)
        self.assertTrue(City.objects.get(pk=pk).is_launched)
        self.assertEqual(self.admin.post(self.base + "cities/", {"name": "Dup", "slug": "salem"}, format="json").status_code, 400)
        self.assertEqual(self.admin.get(self.base + "nope/").status_code, 404)
        cust = APIClient()
        cust.force_authenticate(_user("customer"))
        self.assertEqual(cust.post(self.base + "cities/", {"name": "X", "slug": "x"}, format="json").status_code, 403)
        self.assertEqual(cust.get(self.base + "cities/").status_code, 403)
