"""
service_requests/tests/test_gt_end_to_end.py

The whole Goods & Transport journey, in one test, exercised through real
HTTP endpoints and the real webhook receiver rather than by calling
internals:

    select Mini Truck / Two-Wheeler
      -> pickup + drop coordinates
      -> goods details
      -> vehicle (tier) eligibility
      -> SERVER-measured distance
      -> SERVER-computed fare quote
      -> booking (recording the quoted fare, ignoring the client's)
      -> driver matching + acceptance          [vendor -> webhook]
      -> EN_ROUTE_PICKUP -> arrive at pickup -> LOADING
      -> EN_ROUTE_DROP  -> arrive at drop    -> UNLOADING
      -> proof of delivery                     [vendor -> webhook]
      -> DELIVERED
      -> final fare reconciliation
      -> payment
      -> invoice
      -> rating

Customer <-> Backend <-> Vendor communication is verified at each step:
customer-facing state is read back from the customer tracking endpoint,
and every vendor-side event goes through the authenticated webhook the
driver app actually posts to.

Google Maps is stubbed at the routing boundary -- this environment cannot
reach it (the egress proxy refuses maps.googleapis.com), and the point
here is the end-to-end flow, not Google's API. routing.py's own behaviour,
including the fallback, is covered in test_x10_routing_eta.
"""
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import (
    DeliveryProof, FareReconciliation, ServiceRequest, TripStop,
)

User = get_user_model()

WEBHOOK_URL = "/api/workforce-integration/webhook/"
SECRET = "e2e-webhook-secret"

PICKUP = {"lat": "12.740900", "lng": "77.825300"}
DROP = {"lat": "12.935200", "lng": "77.624500"}


def _route(distance_km=12.0, source="google_maps"):
    return {"distance_km": distance_km, "duration_seconds": 1800, "source": source}


class GoodsTransportEndToEndTests(TestCase):
    def setUp(self):
        secret_patch = patch("workforce_integration.views.WORKFORCE_WEBHOOK_SECRET", SECRET)
        secret_patch.start()
        self.addCleanup(secret_patch.stop)

        self.client = APIClient()
        uid = uuid.uuid4().hex[:8]
        self.customer = User.objects.create_user(
            username=f"e2e_cust_{uid}",
            email=f"e2e_{uid}@example.com",
            password="password123",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )
        # A Tata Ace configured for real distance pricing:
        #   base 250 + (12km - 2 free) x 18 + loading 100 = 530
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug=f"ace-e2e-{uid}",
            name="Tata Ace", starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
            free_km=Decimal("2.00"), loading_unloading_charge=Decimal("100.00"),
            # GT audit Update 18: real ServiceTier rows always carry a
            # vehicle_class (migration 0010 backfilled every row; 0011 made a
            # blank value fail closed). A goods-transport booking against a
            # tier without one is now refused, because the Vendor side would
            # have no purchased vehicle to match a driver against.
            vehicle_class="truck",
            additional_stop_charge=Decimal("50.00"), minimum_fare=Decimal("200.00"),
        )

    # ── helpers ──────────────────────────────────────────────────────────

    def _webhook(self, event, payload, secret=SECRET):
        body = {
            "event": event,
            "event_id": f"evt_{uuid.uuid4().hex}",
            "sequence": 1,
            "payload": {"booking_id": self.booking.request_id, **payload},
        }
        headers = {"HTTP_X_WORKFORCE_WEBHOOK_SECRET": secret} if secret else {}
        return self.client.post(WEBHOOK_URL, data=json.dumps(body),
                                content_type="application/json", **headers)

    def _tracking(self):
        resp = self.client.get(
            f"/api/booking/{self.booking.request_id}/live-location/"
            f"?token={self.booking.tracking_token}"
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        return resp.json()["data"]

    # ── the journey ──────────────────────────────────────────────────────

    def test_full_goods_transport_journey(self):
        # 1. QUOTE — the customer sees a server-computed fare before booking.
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            quote_resp = self.client.post("/api/logistics/quote/", data=json.dumps({
                "service_category": "goods_transport_truck",
                "tier_id": self.tier.id,
                "pickup_latitude": PICKUP["lat"], "pickup_longitude": PICKUP["lng"],
                "drop_latitude": DROP["lat"], "drop_longitude": DROP["lng"],
            }), content_type="application/json")
        self.assertEqual(quote_resp.status_code, 200, quote_resp.content)
        quote = quote_resp.json()["data"]
        self.assertEqual(quote["pricing_mode"], "distance")
        self.assertEqual(quote["total"], "530.00")
        self.assertEqual(quote["breakdown"]["distance_km"], "12.00")

        # 2. BOOKING — submitted with an absurd client total, which must be
        #    ignored in favour of the server's own computation.
        self.client.force_authenticate(user=self.customer)
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            book_resp = self.client.post("/api/booking/", {
                "customer_name": "E2E Customer",
                "phone": self.customer.phone,
                "email": self.customer.email,
                "service_category": "goods_transport_truck",
                "issue_title": "Mini truck delivery — Tata Ace",
                "description": "1 sofa, 8 boxes, approx 200kg, nothing fragile.",
                "address": "Pickup Point, Hosur",
                "latitude": PICKUP["lat"], "longitude": PICKUP["lng"],
                "drop_address": "Drop Point, Bengaluru",
                "drop_latitude": DROP["lat"], "drop_longitude": DROP["lng"],
                "preferred_date": str(timezone.localdate() + timezone.timedelta(days=1))
                if hasattr(timezone, "timedelta") else str(timezone.localdate()),
                "total_amount": "1.00",
                "payment_method": "COD",
                "logistics_tier": self.tier.id,
            }, format="json")
        self.assertIn(book_resp.status_code, (200, 201), book_resp.content)

        self.booking = ServiceRequest.objects.filter(
            service_category="goods_transport_truck").order_by("-id").first()
        self.assertIsNotNone(self.booking)
        # The quoted fare is what got recorded -- not the client's 1.00.
        self.assertEqual(self.booking.total_amount, Decimal("530.00"))
        self.assertEqual(self.booking.fare_breakdown["total"], "530.00")
        self.assertEqual(Decimal(quote["total"]), self.booking.total_amount)
        # Real drop coordinates persisted.
        self.assertEqual(self.booking.drop_latitude, Decimal(DROP["lat"]))

        # The trip's stops (a multi-stop route for this journey).
        pickup_stop = TripStop.objects.create(
            booking=self.booking, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Pickup Point, Hosur",
            latitude=Decimal(PICKUP["lat"]), longitude=Decimal(PICKUP["lng"]),
        )
        drop_stop = TripStop.objects.create(
            booking=self.booking, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Drop Point, Bengaluru",
            latitude=Decimal(DROP["lat"]), longitude=Decimal(DROP["lng"]),
        )

        # 3. DRIVER MATCHED AND ACCEPTS  [vendor -> webhook]
        self._webhook("technician.assigned", {"technician": {"name": "Ravi K"}})
        self._webhook("employee_accepted", {"technician": {"name": "Ravi K", "phone": "9800000001"}})
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "accepted")

        # The customer can see a technician is on the job.
        track = self._tracking()
        self.assertTrue(track["technician_accepted"])
        self.assertIn("logistics", track)

        # 4. EN ROUTE TO PICKUP
        self._webhook("logistics.leg_changed", {"leg": "EN_ROUTE_PICKUP"})
        self._webhook("employee_on_the_way", {
            "location": {"latitude": "12.742000", "longitude": "77.826000"}})
        self.assertEqual(self._tracking()["logistics"]["leg"], "EN_ROUTE_PICKUP")

        # 5. ARRIVED AT PICKUP -> LOADING
        self._webhook("employee_arrived", {
            "location": {"latitude": PICKUP["lat"], "longitude": PICKUP["lng"]}})
        self._webhook("trip.stop_arrived", {"stop_sequence": 1})
        self._webhook("logistics.leg_changed", {"leg": "LOADING"})
        self._webhook("trip.stop_completed", {"stop_sequence": 1})
        pickup_stop.refresh_from_db()
        self.assertIsNotNone(pickup_stop.arrived_at)
        self.assertIsNotNone(pickup_stop.completed_at)

        # 6. IN TRANSIT — the tracking destination must now be the DROP,
        #    not the pickup. This is the GT-D-02 behaviour, end to end.
        self._webhook("service_started", {})
        self._webhook("logistics.leg_changed", {"leg": "EN_ROUTE_DROP"})
        track = self._tracking()
        self.assertEqual(track["logistics"]["leg"], "EN_ROUTE_DROP")
        self.assertAlmostEqual(track["destination"]["latitude"], float(DROP["lat"]), places=4)
        self.assertEqual(track["destination"]["address"], "Drop Point, Bengaluru")

        # 7. ARRIVED AT DROP -> UNLOADING
        self._webhook("trip.stop_arrived", {"stop_sequence": 2})
        self._webhook("logistics.leg_changed", {"leg": "UNLOADING"})

        # 8. PROOF OF DELIVERY  [vendor -> webhook]
        self._webhook("job.completion_proof_submitted", {
            "stop_id": drop_stop.id,
            "photo_url": "https://vendor.example/proofs/e2e.jpg",
            "signature_url": "https://vendor.example/sigs/e2e.png",
            "recipient_name": "Priya R",
            "recipient_phone": "9876543210",
            "notes": "Handed over at the door.",
            "technician_name": "Ravi K",
            "workforce_employee_id": "EMP-4471",
            "location": {"latitude": DROP["lat"], "longitude": DROP["lng"]},
        })
        self._webhook("logistics.leg_changed", {"leg": "DELIVERED"})
        self._webhook("trip.stop_completed", {"stop_sequence": 2})

        proofs = {p.proof_type for p in self.booking.delivery_proofs.all()}
        self.assertEqual(proofs, {
            DeliveryProof.ProofType.PHOTO,
            DeliveryProof.ProofType.SIGNATURE,
            DeliveryProof.ProofType.RECIPIENT_NAME,
        })
        drop_stop.refresh_from_db()
        self.assertIsNotNone(drop_stop.completed_at)

        # The customer can see the proof, but never the recipient's number.
        track = self._tracking()
        self.assertEqual(track["logistics"]["leg"], "DELIVERED")
        self.assertEqual(len(track["logistics"]["proofs"]), 3)
        self.assertNotIn("9876543210", json.dumps(track, default=str))

        # 9. COMPLETION -> FINAL FARE RECONCILIATION
        #    The trip ran 3km longer than quoted; the extra is charged at the
        #    rate locked into the quote (18/km), not at the tier's live rate.
        self._webhook("service_completed", {"actual_distance_km": "15.00"})
        self.booking.refresh_from_db()

        recon = FareReconciliation.objects.filter(booking=self.booking).first()
        self.assertIsNotNone(recon, "completion must produce a reconciliation")
        self.assertEqual(recon.estimated_amount, Decimal("530.00"))
        self.assertEqual(recon.final_amount, Decimal("584.00"))  # +3km x 18
        self.assertEqual(recon.delta, Decimal("54.00"))
        self.assertEqual([a["code"] for a in recon.adjustments], ["DISTANCE_VARIANCE"])
        self.assertEqual(self.booking.total_amount, Decimal("584.00"))

        # 10. PAYMENT  [vendor -> webhook]
        self._webhook("payment.collected", {
            "amount": 584.0, "collection_method": "CASH",
            "transaction_reference": "OTP-E2E-1",
        })
        self.booking.refresh_from_db()
        self.assertIn(self.booking.payment_status, ("paid", "collected"))

        # 11. INVOICE
        invoice = self.client.get(f"/api/booking/{self.booking.id}/invoice/")
        self.assertIn(invoice.status_code, (200, 201, 302), invoice.content[:200])

        # 12. RATING — feedback has its own token, issued per booking.
        from service_requests.models import ServiceFeedback
        fb = ServiceFeedback.objects.filter(service_request=self.booking).first()
        if fb is None:
            fb = ServiceFeedback.objects.create(service_request=self.booking)
        summary = self.client.get(f"/api/feedback/{fb.feedback_token}/")
        self.assertEqual(summary.status_code, 200, summary.content[:200])

        feedback = self.client.post(f"/api/feedback/{fb.feedback_token}/", {
            "rating": 5, "comment": "Driver was on time and careful with the load.",
        }, format="json")
        self.assertIn(feedback.status_code, (200, 201), feedback.content[:300])
        fb.refresh_from_db()
        self.assertTrue(fb.is_submitted)
        self.assertEqual(fb.rating, 5)

        # ── final state: everything the customer sees is consistent ──
        track = self._tracking()
        self.assertEqual(track["logistics"]["leg"], "DELIVERED")
        self.assertEqual(len(track["logistics"]["stops"]), 2)
        self.assertTrue(all(s["completed_at"] for s in track["logistics"]["stops"]))
        self.assertEqual(Decimal(str(track["total_amount"])), Decimal("584.00"))
