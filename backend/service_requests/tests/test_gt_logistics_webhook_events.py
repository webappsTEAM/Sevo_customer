"""
service_requests/tests/test_gt_logistics_webhook_events.py

End-to-end tests for the four Goods & Transport lifecycle events the
vendor/driver app sends and the Customer app consumes, driven through the
REAL webhook endpoint (POST /api/workforce-integration/webhook/) rather
than by calling handlers directly:

    logistics.leg_changed
    trip.stop_arrived
    trip.stop_completed
    job.completion_proof_submitted   (the rich payload)

Plus the four hostile/awkward delivery conditions a webhook receiver
actually faces in production:

    duplicate     -- the sender retries; nothing may be double-applied
    invalid       -- a bad leg value or an unresolvable stop
    unauthorized  -- wrong or missing shared secret
    out-of-order  -- webhook delivery is not ordered, so a stale event
                     naming an earlier leg can arrive after a later one
"""
import json
import uuid
from decimal import Decimal

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import DeliveryProof, ServiceRequest, TripStop

User = get_user_model()

WEBHOOK_URL = "/api/workforce-integration/webhook/"
SECRET = "test-webhook-secret-not-real"


def _booking(**extra):
    uid = uuid.uuid4().hex[:8]
    customer = User.objects.create_user(
        username=f"cust_evt_{uid}",
        email=f"cust_evt_{uid}@example.com",
        phone=f"93{uuid.uuid4().int % 100000000:08d}",
        role=getattr(User.Role, "CUSTOMER", "customer"),
    )
    defaults = dict(
        customer=customer,
        customer_name="Test Customer",
        phone=customer.phone,
        service_category="goods_transport_truck",
        issue_title="Move furniture",
        address="Pickup, Hosur",
        latitude=Decimal("12.740900"),
        longitude=Decimal("77.825300"),
        drop_address="Drop, Bengaluru",
        drop_latitude=Decimal("12.935200"),
        drop_longitude=Decimal("77.624500"),
        preferred_date=timezone.localdate(),
        status=ServiceRequest.Status.IN_PROGRESS,
        technician_name="Test Driver",
    )
    defaults.update(extra)
    return ServiceRequest.objects.create(**defaults)


class LogisticsWebhookEventTests(TestCase):
    """
    The receiver reads its shared secret into a MODULE-LEVEL constant at
    import time (workforce_integration.views.WORKFORCE_WEBHOOK_SECRET), so
    override_settings cannot reach it -- the constant is patched instead.
    """
    def setUp(self):
        secret_patch = patch(
            "workforce_integration.views.WORKFORCE_WEBHOOK_SECRET", SECRET
        )
        secret_patch.start()
        self.addCleanup(secret_patch.stop)
        self.sr = _booking()
        self.pickup = TripStop.objects.create(
            booking=self.sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
            latitude=Decimal("12.700000"), longitude=Decimal("77.800000"),
        )
        self.drop = TripStop.objects.create(
            booking=self.sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Customer Home, Bengaluru",
            latitude=Decimal("12.935200"), longitude=Decimal("77.624500"),
        )

    def _send(self, event, payload=None, secret=SECRET, event_id=None):
        body = {
            "event": event,
            "event_id": event_id or f"evt_{uuid.uuid4().hex}",
            "sequence": 1,
            "payload": {"booking_id": self.sr.request_id, **(payload or {})},
        }
        headers = {}
        if secret is not None:
            headers["HTTP_X_WORKFORCE_WEBHOOK_SECRET"] = secret
        return self.client.post(
            WEBHOOK_URL, data=json.dumps(body),
            content_type="application/json", **headers
        )

    # ── the happy path, in trip order ────────────────────────────────────

    def test_full_trip_lifecycle_is_received_and_persisted(self):
        resp = self._send("logistics.leg_changed", {"leg": "EN_ROUTE_PICKUP"})
        self.assertEqual(resp.status_code, 200, resp.content)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "EN_ROUTE_PICKUP")

        self._send("trip.stop_arrived", {"stop_sequence": 1})
        self.pickup.refresh_from_db()
        self.assertIsNotNone(self.pickup.arrived_at)

        self._send("logistics.leg_changed", {"leg": "LOADING"})
        self._send("trip.stop_completed", {"stop_sequence": 1})
        self.pickup.refresh_from_db()
        self.assertIsNotNone(self.pickup.completed_at)

        self._send("logistics.leg_changed", {"leg": "EN_ROUTE_DROP"})
        self._send("trip.stop_arrived", {"stop_sequence": 2})
        self._send("logistics.leg_changed", {"leg": "UNLOADING"})

        self._send("job.completion_proof_submitted", {
            "stop_id": self.drop.id,
            "photo_url": "https://vendor.example/proofs/p.jpg",
            "recipient_name": "Priya R",
            "recipient_phone": "9876543210",
            "notes": "Handed over at the door.",
            "technician_name": "Ravi K",
            "workforce_employee_id": "EMP-4471",
            "location": {"latitude": "12.935200", "longitude": "77.624500"},
        })
        self._send("logistics.leg_changed", {"leg": "DELIVERED"})
        self._send("trip.stop_completed", {"stop_sequence": 2})

        self.sr.refresh_from_db()
        self.drop.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "DELIVERED")
        self.assertIsNotNone(self.drop.completed_at)
        # Every leg recorded, in order, exactly once.
        self.assertEqual(
            [h["leg"] for h in self.sr.logistics_leg_history],
            ["EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP", "UNLOADING", "DELIVERED"],
        )
        kinds = {p.proof_type for p in self.sr.delivery_proofs.all()}
        self.assertEqual(kinds, {DeliveryProof.ProofType.PHOTO,
                                 DeliveryProof.ProofType.RECIPIENT_NAME})
        proof = self.sr.delivery_proofs.filter(proof_type=DeliveryProof.ProofType.PHOTO).get()
        self.assertEqual(proof.stop_id, self.drop.id)
        self.assertEqual(proof.captured_by_name, "Ravi K")
        self.assertEqual(proof.captured_by_workforce_id, "EMP-4471")
        self.assertEqual(proof.latitude, Decimal("12.935200"))

    # ── unauthorized ─────────────────────────────────────────────────────

    def test_missing_secret_is_rejected_and_changes_nothing(self):
        resp = self._send("logistics.leg_changed", {"leg": "LOADING"}, secret=None)
        self.assertEqual(resp.status_code, 401)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "")

    def test_wrong_secret_is_rejected_and_changes_nothing(self):
        resp = self._send("logistics.leg_changed", {"leg": "LOADING"}, secret="not-the-secret")
        self.assertEqual(resp.status_code, 401)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "")

    def test_unauthorized_stop_event_does_not_advance_a_stop(self):
        resp = self._send("trip.stop_arrived", {"stop_sequence": 1}, secret="nope")
        self.assertEqual(resp.status_code, 401)
        self.pickup.refresh_from_db()
        self.assertIsNone(self.pickup.arrived_at)

    def test_unauthorized_proof_event_records_no_proof(self):
        resp = self._send("job.completion_proof_submitted",
                          {"photo_url": "https://vendor.example/p.jpg"}, secret=None)
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(self.sr.delivery_proofs.count(), 0)

    # ── duplicate ────────────────────────────────────────────────────────

    def test_duplicate_leg_event_does_not_duplicate_history(self):
        self._send("logistics.leg_changed", {"leg": "LOADING"})
        self._send("logistics.leg_changed", {"leg": "LOADING"})
        self.sr.refresh_from_db()
        self.assertEqual(len(self.sr.logistics_leg_history), 1)

    def test_replayed_event_id_is_ignored(self):
        eid = f"evt_{uuid.uuid4().hex}"
        self._send("logistics.leg_changed", {"leg": "LOADING"}, event_id=eid)
        self._send("logistics.leg_changed", {"leg": "EN_ROUTE_DROP"}, event_id=eid)
        self.sr.refresh_from_db()
        # The replayed id must not be processed, so the leg stays at LOADING.
        self.assertEqual(self.sr.logistics_leg, "LOADING")

    def test_duplicate_stop_event_does_not_move_the_timestamp(self):
        self._send("trip.stop_arrived", {"stop_sequence": 1})
        self.pickup.refresh_from_db()
        first = self.pickup.arrived_at
        self._send("trip.stop_arrived", {"stop_sequence": 1})
        self.pickup.refresh_from_db()
        self.assertEqual(self.pickup.arrived_at, first)

    # ── out of order ─────────────────────────────────────────────────────

    def test_stale_earlier_leg_arriving_late_is_ignored(self):
        # Webhook delivery is not ordered. An EN_ROUTE_PICKUP event landing
        # after UNLOADING must not drag the customer's view backwards.
        self._send("logistics.leg_changed", {"leg": "EN_ROUTE_DROP"})
        self._send("logistics.leg_changed", {"leg": "UNLOADING"})
        self._send("logistics.leg_changed", {"leg": "EN_ROUTE_PICKUP"})
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "UNLOADING")
        self.assertEqual(
            [h["leg"] for h in self.sr.logistics_leg_history],
            ["EN_ROUTE_DROP", "UNLOADING"],
        )

    def test_skipping_a_leg_forward_is_allowed(self):
        # A driver who never signals LOADING must not be blocked from
        # reporting that they are on the way to the drop.
        self._send("logistics.leg_changed", {"leg": "EN_ROUTE_PICKUP"})
        self._send("logistics.leg_changed", {"leg": "UNLOADING"})
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "UNLOADING")

    def test_stop_completed_before_arrived_still_yields_a_coherent_timeline(self):
        self._send("trip.stop_completed", {"stop_sequence": 2})
        self.drop.refresh_from_db()
        self.assertIsNotNone(self.drop.arrived_at)
        self.assertIsNotNone(self.drop.completed_at)

    # ── invalid ──────────────────────────────────────────────────────────

    def test_invalid_leg_value_is_ignored_without_a_500(self):
        resp = self._send("logistics.leg_changed", {"leg": "EN_ROUTE_MOON"})
        self.assertEqual(resp.status_code, 200, resp.content)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "")

    def test_leg_event_on_a_non_logistics_booking_is_ignored(self):
        self.sr.service_category = "ac_repair"
        self.sr.save(update_fields=["service_category"])
        resp = self._send("logistics.leg_changed", {"leg": "LOADING"})
        self.assertEqual(resp.status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.logistics_leg, "")

    def test_unresolvable_stop_reference_is_ignored_without_a_500(self):
        resp = self._send("trip.stop_arrived", {"stop_sequence": 99})
        self.assertEqual(resp.status_code, 200, resp.content)
        self.pickup.refresh_from_db()
        self.drop.refresh_from_db()
        self.assertIsNone(self.pickup.arrived_at)
        self.assertIsNone(self.drop.arrived_at)

    def test_stop_belonging_to_another_booking_is_not_touched(self):
        other = _booking()
        foreign = TripStop.objects.create(
            booking=other, sequence=1, stop_type=TripStop.StopType.DROP, address="Elsewhere",
        )
        resp = self._send("trip.stop_arrived", {"stop_id": foreign.id})
        self.assertEqual(resp.status_code, 200)
        foreign.refresh_from_db()
        self.assertIsNone(foreign.arrived_at)

    def test_proof_event_with_no_evidence_records_nothing_but_succeeds(self):
        resp = self._send("job.completion_proof_submitted", {})
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(self.sr.delivery_proofs.count(), 0)

    def test_unknown_booking_id_is_rejected_cleanly(self):
        body = {
            "event": "logistics.leg_changed",
            "event_id": f"evt_{uuid.uuid4().hex}",
            "sequence": 1,
            "payload": {"booking_id": "NOPE9999", "leg": "LOADING"},
        }
        resp = self.client.post(
            WEBHOOK_URL, data=json.dumps(body), content_type="application/json",
            HTTP_X_WORKFORCE_WEBHOOK_SECRET=SECRET,
        )
        self.assertIn(resp.status_code, (400, 404), resp.content)
