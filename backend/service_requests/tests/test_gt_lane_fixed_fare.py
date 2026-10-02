"""GT_LANE_FARE regression: an explicitly selected, active Lane with a configured fixed fare is THE transport fare.

Flow under test:  lane selection -> quote -> GST/RCM -> saved quote snapshot -> booking -> payment amount -> invoice.
Normal distance pricing must be untouched when no lane fixed-fare applies."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import Lane, LogisticsCategory, ServiceTier
from service_requests.models import GTTaxPolicy, ServiceRequest
from settings_hub.models import ServiceZone, ServiceZoneService

User = get_user_model()
ROUTE = {"distance_km": 40.0, "duration_seconds": 5400, "source": "google_maps"}
HOSUR = (12.7409, 77.8253)
BLR = (12.9716, 77.5946)            # the lane destination
BLR_NEAR = (12.9800, 77.6000)       # ~1.1 km from it
BLR_FAR = (13.2000, 77.7000)        # ~27 km from it (Devanahalli side) -> beyond tolerance
MUMBAI = (19.0760, 72.8777)


class LaneFareBase(TestCase):
    def setUp(self):
        cache.clear()
        uid = uuid.uuid4().hex[:6]
        self.co = Company.objects.create(company_name="Lane Co", slug="calservices")
        z = ServiceZone.objects.create(company=self.co, name="Hosur", zone_type="circle", center_lat=HOSUR[0],
                                       center_lng=HOSUR[1], radius_meters=25000, status="active", is_active=True)
        ServiceZoneService.objects.create(zone=z, service_slug="goods_transport_truck", service_name="GT", is_available=True)
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug=f"p8-{uid}", name="Pickup 8ft",
            vehicle_class=ServiceTier.VehicleClass.PICKUP, starting_price=Decimal("380"), base_fare=Decimal("300"),
            per_km_rate=Decimal("25"), free_km=Decimal("2"), loading_unloading_charge=Decimal("40"),
            additional_stop_charge=Decimal("30"), minimum_fare=Decimal("350"), max_weight_kg=Decimal("1250"),
            max_cft=Decimal("200"), gst_rate=Decimal("18.00"), is_active=True)
        self.lane = Lane.objects.create(category="truck", city="Hosur", destination_label="Bengaluru",
                                        destination_latitude=Decimal(str(BLR[0])), destination_longitude=Decimal(str(BLR[1])),
                                        distance_km=Decimal("40"), fare=Decimal("900.00"), is_active=True)
        self.user = User.objects.create_user(username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                             phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    # -- helpers
    def quote(self, drop=BLR, pickup=HOSUR, lane=None, loading_help=False, **extra):
        body = {"service_category": "goods_transport_truck", "tier_id": self.tier.id, "loading_help": loading_help,
                "pickup_latitude": pickup[0], "pickup_longitude": pickup[1],
                "drop_latitude": drop[0], "drop_longitude": drop[1], **extra}
        if lane is not None:
            body["lane_id"] = lane.id
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return self.client.post("/api/logistics/quote/", body, format="json")

    def book(self, q, drop=BLR, pickup=HOSUR, lane=None, **over):
        qhash = over.pop("quote_hash", q.get("quote_hash"))
        body = {
            "customer_name": "Ravi Kumar", "phone": self.user.phone, "email": self.user.email, "city": "hosur",
            "service_category": "goods_transport_truck", "issue_title": "GT", "description": "d",
            "address": "A", "drop_address": "B", "latitude": pickup[0], "longitude": pickup[1],
            "drop_latitude": drop[0], "drop_longitude": drop[1], "preferred_date": "2099-01-02",
            "preferred_time": "Morning", "payment_method": "COD", "logistics_tier": self.tier.id,
            "total_amount": q["total"], **over,
        }
        if q.get("quote_id"):
            body["cart_data"] = [{"quote_id": q["quote_id"], "quote_hash": qhash,
                                  "expires_at": q.get("expires_at")}]
        if lane is not None:
            body["logistics_lane"] = lane.id
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return self.client.post("/api/booking/", body, format="json")


class LaneQuoteTests(LaneFareBase):
    def test_lane_fixed_fare_quote(self):
        r = self.quote(lane=self.lane)
        self.assertEqual(r.status_code, 200, r.content)
        d = r.data["data"]
        self.assertEqual(d["pricing_mode"], "lane_fixed")
        self.assertEqual(d["total"], "900.00")
        self.assertEqual(d["lane_id"], self.lane.id)
        self.assertEqual(d["breakdown"]["fare_basis"], "lane_fixed")
        self.assertEqual(d["breakdown"]["distance_charge"], "0.00")

    def test_lane_fare_is_admin_configurable_not_hardcoded(self):
        Lane.objects.filter(pk=self.lane.pk).update(fare=Decimal("1234.50"))
        self.assertEqual(self.quote(lane=self.lane).data["data"]["total"], "1234.50")

    def test_configured_addons_still_apply_on_top_of_lane_fare(self):
        d = self.quote(lane=self.lane, loading_help=True).data["data"]
        self.assertEqual(d["total"], "940.00")  # 900 lane + 40 loading

    def test_no_lane_still_uses_normal_distance_pricing(self):
        # 40 km straight route inside 25 km zone is not possible, so price a covered drop: Electronic City side
        r = self.quote(drop=(12.7546, 77.8345))
        self.assertEqual(r.status_code, 200, r.content)
        d = r.data["data"]
        self.assertEqual(d["pricing_mode"], "distance")
        self.assertEqual(d["lane_id"], None)
        # base 300 + (40-2)*25 = 950 -> same distance formula as before
        self.assertEqual(d["total"], "1250.00")

    def test_lane_without_fixed_fare_falls_back_to_distance(self):
        Lane.objects.filter(pk=self.lane.pk).update(fare=Decimal("0.00"))
        r = self.quote(drop=(12.7546, 77.8345), lane=self.lane)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["data"]["pricing_mode"], "distance")
        self.assertEqual(r.data["data"]["total"], "1250.00")
        # and without a fixed fare the lane does NOT unlock an out-of-zone drop
        self.assertEqual(self.quote(lane=self.lane).status_code, 400)

    def test_destination_within_15km_accepted(self):
        r = self.quote(drop=BLR_NEAR, lane=self.lane)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["data"]["total"], "900.00")

    def test_destination_beyond_15km_rejected(self):
        r = self.quote(drop=BLR_FAR, lane=self.lane)
        self.assertEqual(r.status_code, 400)
        self.assertIn(r.data["error_code"], ("LANE_DESTINATION_MISMATCH", "DROP_OUT_OF_COVERAGE"))

    def test_far_cities_stay_rejected_with_a_lane(self):
        for drop in (MUMBAI, (11.0168, 76.9558)):  # Mumbai, Coimbatore
            r = self.quote(drop=drop, lane=self.lane)
            self.assertEqual(r.status_code, 400, drop)

    def test_inactive_lane_rejected(self):
        Lane.objects.filter(pk=self.lane.pk).update(is_active=False)
        r = self.quote(lane=self.lane)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error_code"], "LANE_INACTIVE")

    def test_wrong_pickup_zone_rejected_even_with_lane(self):
        r = self.quote(pickup=MUMBAI, lane=self.lane)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error_code"], "PICKUP_OUT_OF_COVERAGE")

    def test_unknown_lane_and_wrong_category_rejected(self):
        body = {"service_category": "goods_transport_truck", "tier_id": self.tier.id, "lane_id": 999999,
                "pickup_latitude": HOSUR[0], "pickup_longitude": HOSUR[1], "drop_latitude": BLR[0], "drop_longitude": BLR[1]}
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            self.assertEqual(self.client.post("/api/logistics/quote/", body, format="json").data["error_code"], "LANE_NOT_FOUND")
        two = Lane.objects.create(category="two_wheeler", city="Hosur", destination_label="Bengaluru",
                                  destination_latitude=Decimal(str(BLR[0])), destination_longitude=Decimal(str(BLR[1])),
                                  fare=Decimal("500"), is_active=True)
        self.assertEqual(self.quote(lane=two).data["error_code"], "LANE_CATEGORY_MISMATCH")


class LaneGstRcmTests(LaneFareBase):
    def test_gst_calculated_from_the_lane_fare(self):
        b = self.quote(lane=self.lane).data["data"]["breakdown"]
        self.assertEqual(b["gst_rate"], "18.00")
        self.assertEqual(b["gst_included"], "137.29")   # 900 - 900/1.18
        self.assertEqual(b["taxable_value"], "900.00")

    def test_rcm_removes_gst_from_the_lane_fare(self):
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=True,
                                   rcm_applies_when_gstin_registered=False, rcm_statement="Tax payable on reverse charge basis.")
        d = self.quote(lane=self.lane).data["data"]
        self.assertTrue(d["breakdown"]["rcm_applicable"])
        self.assertEqual(d["total"], "762.71")          # 900 - 137.29
        self.assertEqual(d["breakdown"]["taxable_value"], "762.71")
        self.assertEqual(d["breakdown"]["gst_included"], "0.00")


class LaneBookingFlowTests(LaneFareBase):
    def _book_lane(self):
        q = self.quote(lane=self.lane).data["data"]
        r = self.book(q, lane=self.lane)
        self.assertEqual(r.status_code, 201, r.content)
        return q, ServiceRequest.objects.latest("id")

    def test_quote_equals_booking_fare_and_ignores_client_amount(self):
        q = self.quote(lane=self.lane).data["data"]
        r = self.book(q, lane=self.lane, total_amount="1.00")
        # a client total that disagrees with the locked quote is refused, never recorded
        self.assertEqual(r.status_code, 400, r.content)
        q, sr = self._book_lane()
        self.assertEqual(sr.total_amount, Decimal(q["total"]))
        self.assertEqual(sr.total_amount, Decimal("900.00"))

    def test_quote_equals_saved_snapshot(self):
        q, sr = self._book_lane()
        fb = sr.fare_breakdown
        self.assertEqual(fb["total"], q["total"])
        self.assertEqual(fb["fare_basis"], "lane_fixed")
        self.assertEqual(fb["lane_id"], self.lane.id)
        self.assertEqual(fb["lane_fixed_fare"], "900.00")
        self.assertEqual(fb["gst_included"], q["breakdown"]["gst_included"])
        self.assertEqual(fb["quote_id"], q["quote_id"])

    def test_snapshot_survives_later_admin_lane_change(self):
        q, sr = self._book_lane()
        Lane.objects.filter(pk=self.lane.pk).update(fare=Decimal("5000"))
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("900.00"))
        self.assertEqual(sr.fare_breakdown["lane_fixed_fare"], "900.00")

    def test_payment_amount_matches_booking(self):
        from service_requests.payment_views import PaymentInitiateView
        q, sr = self._book_lane()
        amount, err = PaymentInitiateView()._amount_due(sr)
        self.assertIsNone(err)
        self.assertEqual(Decimal(str(amount)), sr.total_amount)

    def test_invoice_matches_booking(self):
        from reportlab.pdfgen import canvas
        q, sr = self._book_lane()
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString

        def d1(s_, x, y, t, *a, **k): seen.append(str(t)); return o1(s_, x, y, t, *a, **k)

        def d2(s_, x, y, t, *a, **k): seen.append(str(t)); return o2(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            inv = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(inv.status_code, 200)
        self.assertIn("Rs. 900.00", seen)
        self.assertIn("Rs. 137.29", seen)

    def test_no_lane_booking_uses_distance_pricing(self):
        drop = (12.7546, 77.8345)
        q = self.quote(drop=drop).data["data"]
        r = self.book(q, drop=drop)
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.latest("id")
        self.assertEqual(sr.total_amount, Decimal("1250.00"))
        self.assertEqual(sr.fare_breakdown["fare_basis"], "distance")

    def test_lane_booking_without_a_fresh_quote_gets_the_same_lane_fare(self):
        r = self.book({"total": "940.00"}, lane=self.lane)
        self.assertEqual(r.status_code, 201, r.content)
        # lane fare 900 + the configured loading add-on (40); never the distance fare
        sr = ServiceRequest.objects.latest("id")
        self.assertEqual(sr.total_amount, Decimal("940.00"))
        self.assertEqual(sr.fare_breakdown["fare_basis"], "lane_fixed")
        self.assertEqual(sr.fare_breakdown["lane_fixed_fare"], "900.00")


class LaneTamperingTests(LaneFareBase):
    def test_lane_quote_cannot_be_booked_without_the_lane(self):
        q = self.quote(lane=self.lane).data["data"]
        self.assertEqual(self.book(q).status_code, 400)  # no lane + out-of-zone drop and lane-bound quote

    def test_distance_quote_cannot_be_booked_as_a_lane_fare(self):
        drop = (12.7546, 77.8345)
        q = self.quote(drop=drop).data["data"]
        self.assertEqual(self.book(q, drop=drop, lane=self.lane).status_code, 400)

    def test_quote_for_one_lane_cannot_be_used_with_another(self):
        other = Lane.objects.create(category="truck", city="Hosur", destination_label="Bengaluru East",
                                    destination_latitude=Decimal(str(BLR[0])), destination_longitude=Decimal(str(BLR[1])),
                                    fare=Decimal("400.00"), is_active=True)
        q = self.quote(lane=self.lane).data["data"]
        r = self.book(q, lane=other)
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(ServiceRequest.objects.count(), 0)

    def test_quote_hash_tamper_rejected(self):
        q = self.quote(lane=self.lane).data["data"]
        self.assertEqual(self.book(q, lane=self.lane, quote_hash="deadbeefdeadbeef").status_code, 400)

    def test_lane_deactivated_between_quote_and_booking_is_rejected(self):
        q = self.quote(lane=self.lane).data["data"]
        Lane.objects.filter(pk=self.lane.pk).update(is_active=False)
        self.assertEqual(self.book(q, lane=self.lane).status_code, 400)
        self.assertEqual(ServiceRequest.objects.count(), 0)

    def test_booking_with_far_drop_and_lane_rejected(self):
        q = self.quote(lane=self.lane).data["data"]
        self.assertEqual(self.book(q, drop=BLR_FAR, lane=self.lane).status_code, 400)
        self.assertEqual(self.book(q, drop=MUMBAI, lane=self.lane).status_code, 400)


class LegacyLaneAndCoveragePrecheckTests(LaneFareBase):
    def test_lane_without_destination_coordinates_keeps_distance_pricing(self):
        Lane.objects.filter(pk=self.lane.pk).update(destination_latitude=None, destination_longitude=None)
        r = self.quote(drop=(12.7546, 77.8345), lane=self.lane)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["data"]["pricing_mode"], "distance")
        # and it does not unlock an out-of-zone drop
        self.assertEqual(self.quote(lane=self.lane).status_code, 400)

    def _check(self, drop, lane=None, **extra):
        body = {"lat": HOSUR[0], "lng": HOSUR[1], "drop_lat": drop[0], "drop_lng": drop[1],
                "service_slug": "goods_transport_truck", **extra}
        if lane is not None:
            body["lane_id"] = lane.id
        return APIClient().post("/api/settings/service-zones/check/", body, format="json").json()

    def test_coverage_precheck_matches_quote_and_booking(self):
        self.assertFalse(self._check(BLR)["in_zone"])                               # no lane: out of zone
        self.assertTrue(self._check(BLR, lane=self.lane)["in_zone"])               # lane destination served
        self.assertTrue(self._check(BLR_NEAR, lane=self.lane)["in_zone"])          # within 15 km
        self.assertFalse(self._check(BLR_FAR, lane=self.lane)["in_zone"])          # beyond 15 km
        self.assertFalse(self._check(MUMBAI, lane=self.lane)["in_zone"])
        Lane.objects.filter(pk=self.lane.pk).update(is_active=False)
        self.assertFalse(self._check(BLR, lane=self.lane)["in_zone"])              # inactive lane

    def test_coverage_precheck_pickup_still_zone_checked_with_lane(self):
        body = {"lat": MUMBAI[0], "lng": MUMBAI[1], "drop_lat": BLR[0], "drop_lng": BLR[1],
                "service_slug": "goods_transport_truck", "lane_id": self.lane.id}
        r = APIClient().post("/api/settings/service-zones/check/", body, format="json").json()
        self.assertFalse(r["in_zone"])
        self.assertEqual(r["failed_point"], "pickup")
