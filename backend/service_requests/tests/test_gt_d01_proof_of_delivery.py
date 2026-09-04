"""
service_requests/tests/test_gt_d01_proof_of_delivery.py

GT-D-01 (proof of delivery + per-stop progress) and the completion of
GT-B-03 (the logistics leg state machine).

Two gaps closed here:

1. `logistics_leg`, `logistics_leg_updated_at` and
   `logistics_leg_history` shipped with GT-B-03, but NOTHING in either
   backend ever wrote them -- the model comment referred to a
   `set_logistics_leg()` that did not exist. So the field was
   permanently "" in production and every consumer of it (the leg-aware
   tracking destination from GT-D-02, the trip timeline) was inert.

2. There was no proof-of-delivery record of any kind. The vendor app
   could POST `job.completion_proof_submitted`, and the handler only
   appended the free-text remarks onto ServiceRequest.description --
   no photo, no signature, no recipient identity, no stop link. And
   TripStop had no arrived_at/completed_at, so "which stop is the
   driver at" did not exist as a concept.
"""
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import DeliveryProof, ServiceRequest, TripStop
from workforce_integration.views import WorkforceWebhookView

User = get_user_model()


def _booking(**extra):
    uid = uuid.uuid4().hex[:8]
    customer = User.objects.create_user(
        username=f"cust_gtd01_{uid}",
        email=f"cust_gtd01_{uid}@example.com",
        phone=f"96{uuid.uuid4().int % 100000000:08d}",
        role=getattr(User.Role, "CUSTOMER", "customer"),
    )
    defaults = dict(
        customer=customer,
        customer_name="Test Customer",
        phone=customer.phone,
        email=customer.email,
        service_category="goods_transport_truck",
        issue_title="Move some furniture",
        address="Pickup Point, Hosur",
        latitude=Decimal("12.740900"),
        longitude=Decimal("77.825300"),
        preferred_date=timezone.localdate(),
        status=ServiceRequest.Status.IN_PROGRESS,
        technician_name="Test Technician",
    )
    defaults.update(extra)
    return ServiceRequest.objects.create(**defaults)


class LogisticsLegStateMachineTests(TestCase):
    def test_sets_leg_and_stamps_the_audit_trail(self):
        sr = _booking()
        self.assertEqual(sr.logistics_leg, "")
        self.assertEqual(sr.logistics_leg_history, [])

        changed = sr.set_logistics_leg(ServiceRequest.LogisticsLeg.EN_ROUTE_PICKUP)
        self.assertTrue(changed)

        sr.refresh_from_db()
        self.assertEqual(sr.logistics_leg, "EN_ROUTE_PICKUP")
        self.assertIsNotNone(sr.logistics_leg_updated_at)
        self.assertEqual(len(sr.logistics_leg_history), 1)
        self.assertEqual(sr.logistics_leg_history[0]["leg"], "EN_ROUTE_PICKUP")
        self.assertIn("at", sr.logistics_leg_history[0])

    def test_history_is_append_only_across_legs(self):
        sr = _booking()
        for leg in ["EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP", "UNLOADING", "DELIVERED"]:
            sr.set_logistics_leg(leg)
        sr.refresh_from_db()
        self.assertEqual(
            [h["leg"] for h in sr.logistics_leg_history],
            ["EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP", "UNLOADING", "DELIVERED"],
        )
        self.assertEqual(sr.logistics_leg, "DELIVERED")

    def test_setting_the_same_leg_twice_is_idempotent(self):
        # The vendor webhook legitimately retries; a repeat must not add a
        # duplicate history entry or move the timestamp.
        sr = _booking()
        self.assertTrue(sr.set_logistics_leg("LOADING"))
        first_stamp = sr.logistics_leg_updated_at
        self.assertFalse(sr.set_logistics_leg("LOADING"))
        sr.refresh_from_db()
        self.assertEqual(len(sr.logistics_leg_history), 1)
        self.assertEqual(sr.logistics_leg_updated_at, first_stamp)

    def test_invalid_leg_is_rejected_loudly(self):
        sr = _booking()
        with self.assertRaises(ValueError):
            sr.set_logistics_leg("EN_ROUTE_MOON")
        sr.refresh_from_db()
        self.assertEqual(sr.logistics_leg, "")

    def test_records_the_actor_when_given_one(self):
        sr = _booking()
        actor = User.objects.create_user(
            username=f"agent_{uuid.uuid4().hex[:6]}", email="a@example.com",
            phone=f"95{uuid.uuid4().int % 100000000:08d}",
        )
        sr.set_logistics_leg("LOADING", actor=actor)
        sr.refresh_from_db()
        self.assertEqual(sr.logistics_leg_history[0]["by"], actor.id)


class StopProgressTests(TestCase):
    def setUp(self):
        self.sr = _booking()
        self.pickup = TripStop.objects.create(
            booking=self.sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
        )
        self.drop = TripStop.objects.create(
            booking=self.sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Customer Home, Hosur",
        )

    def test_stop_arrival_is_recorded(self):
        WorkforceWebhookView._record_stop_progress(
            self.sr, "trip.stop_arrived", {"stop_sequence": 1},
        )
        self.pickup.refresh_from_db()
        self.assertIsNotNone(self.pickup.arrived_at)
        self.assertIsNone(self.pickup.completed_at)

    def test_stop_completion_records_both_when_arrival_was_missed(self):
        # A driver app that only reports completion must still produce a
        # coherent timeline.
        WorkforceWebhookView._record_stop_progress(
            self.sr, "trip.stop_completed", {"stop_id": self.drop.id},
        )
        self.drop.refresh_from_db()
        self.assertIsNotNone(self.drop.arrived_at)
        self.assertIsNotNone(self.drop.completed_at)

    def test_retry_does_not_rewrite_an_existing_timestamp(self):
        WorkforceWebhookView._record_stop_progress(
            self.sr, "trip.stop_arrived", {"stop_sequence": 1},
        )
        self.pickup.refresh_from_db()
        first = self.pickup.arrived_at
        WorkforceWebhookView._record_stop_progress(
            self.sr, "trip.stop_arrived", {"stop_sequence": 1},
        )
        self.pickup.refresh_from_db()
        self.assertEqual(self.pickup.arrived_at, first)

    def test_unresolvable_stop_reference_is_ignored_not_fatal(self):
        WorkforceWebhookView._record_stop_progress(
            self.sr, "trip.stop_arrived", {"stop_sequence": 99},
        )
        self.pickup.refresh_from_db()
        self.drop.refresh_from_db()
        self.assertIsNone(self.pickup.arrived_at)
        self.assertIsNone(self.drop.arrived_at)


class DeliveryProofTests(TestCase):
    def test_photo_and_recipient_produce_separate_proof_rows(self):
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {
            "photo_url": "https://vendor.example/proofs/abc.jpg",
            "recipient_name": "Priya R",
            "recipient_phone": "9876543210",
            "notes": "Left with building security.",
            "location": {"latitude": "12.750000", "longitude": "77.850000"},
        })
        proofs = list(sr.delivery_proofs.all())
        self.assertEqual(len(proofs), 2)
        kinds = {p.proof_type for p in proofs}
        self.assertEqual(kinds, {DeliveryProof.ProofType.PHOTO, DeliveryProof.ProofType.RECIPIENT_NAME})
        photo = next(p for p in proofs if p.proof_type == DeliveryProof.ProofType.PHOTO)
        self.assertEqual(photo.notes, "Left with building security.")
        self.assertEqual(photo.recipient_name, "Priya R")
        self.assertEqual(photo.latitude, Decimal("12.750000"))

    def test_signature_and_otp_are_captured(self):
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {
            "signature_url": "https://vendor.example/sigs/xyz.png",
            "otp_verified": True,
        })
        kinds = {p.proof_type for p in sr.delivery_proofs.all()}
        self.assertEqual(kinds, {DeliveryProof.ProofType.SIGNATURE, DeliveryProof.ProofType.OTP})

    def test_proof_is_linked_to_the_stop_when_one_is_referenced(self):
        sr = _booking()
        drop = TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.DROP, address="Drop 1",
        )
        WorkforceWebhookView._record_delivery_proof(sr, {
            "stop_id": drop.id, "photo_url": "https://vendor.example/p.jpg",
        })
        proof = sr.delivery_proofs.get()
        self.assertEqual(proof.stop_id, drop.id)

    def test_single_drop_booking_records_proof_against_the_booking(self):
        # No TripStop rows at all -- the ordinary case. Proof must still be
        # recorded, just unlinked to a stop.
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {"photo_url": "https://vendor.example/p.jpg"})
        proof = sr.delivery_proofs.get()
        self.assertIsNone(proof.stop_id)

    def test_notes_only_payload_falls_back_to_a_note_proof(self):
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {"notes": "Handed over at gate."})
        proof = sr.delivery_proofs.get()
        self.assertEqual(proof.proof_type, DeliveryProof.ProofType.NOTE)
        self.assertEqual(proof.notes, "Handed over at gate.")

    def test_empty_payload_records_nothing_and_does_not_raise(self):
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {})
        self.assertEqual(sr.delivery_proofs.count(), 0)

    def test_a_failure_never_propagates_into_the_webhook(self):
        # A proof that can't be stored must not roll back the completion
        # event it accompanied. Force a real database-level failure rather
        # than relying on a bad value that str() would quietly coerce.
        from unittest.mock import patch

        sr = _booking()
        with patch(
            "service_requests.models.DeliveryProof.objects.create",
            side_effect=RuntimeError("storage unavailable"),
        ):
            WorkforceWebhookView._record_delivery_proof(
                sr, {"photo_url": "https://vendor.example/p.jpg"}
            )
        # Swallowed, not raised -- and nothing was written.
        self.assertEqual(sr.delivery_proofs.count(), 0)

    def test_technician_identity_is_snapshotted_not_fk_linked(self):
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {
            "photo_url": "https://vendor.example/p.jpg",
            "technician_name": "Ravi K",
            "workforce_employee_id": "EMP-4471",
        })
        proof = sr.delivery_proofs.get()
        self.assertEqual(proof.captured_by_name, "Ravi K")
        self.assertEqual(proof.captured_by_workforce_id, "EMP-4471")


class LogisticsProgressInTrackingPayloadTests(TestCase):
    """
    The leg/stop/proof data is only useful if the customer can actually
    see it, so it is surfaced in the live-tracking payload.
    """
    def test_non_logistics_booking_gets_the_empty_shape_not_a_missing_key(self):
        from service_requests.views import _build_tracking_payload
        sr = _booking(service_category="ac_repair")
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertIn("logistics", payload)
        self.assertEqual(payload["logistics"], {
            "leg": "", "leg_updated_at": None, "leg_history": [],
            "stops": [], "proofs": [],
        })

    def test_logistics_booking_exposes_leg_stops_and_proofs(self):
        from service_requests.views import _build_tracking_payload
        sr = _booking()
        sr.set_logistics_leg(ServiceRequest.LogisticsLeg.EN_ROUTE_DROP)
        drop = TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.DROP,
            address="Customer Home, Hosur",
            latitude=Decimal("12.750000"), longitude=Decimal("77.850000"),
        )
        WorkforceWebhookView._record_stop_progress(sr, "trip.stop_completed", {"stop_id": drop.id})
        WorkforceWebhookView._record_delivery_proof(sr, {
            "stop_id": drop.id,
            "photo_url": "https://vendor.example/p.jpg",
            "recipient_name": "Priya R",
            "recipient_phone": "9876543210",
        })

        payload = _build_tracking_payload(sr, has_full_access=True)
        log = payload["logistics"]
        self.assertEqual(log["leg"], "EN_ROUTE_DROP")
        self.assertIsNotNone(log["leg_updated_at"])
        self.assertEqual(len(log["leg_history"]), 1)

        self.assertEqual(len(log["stops"]), 1)
        self.assertIsNotNone(log["stops"][0]["arrived_at"])
        self.assertIsNotNone(log["stops"][0]["completed_at"])
        self.assertEqual(log["stops"][0]["latitude"], 12.75)

        self.assertEqual(len(log["proofs"]), 2)
        self.assertEqual({p["proof_type"] for p in log["proofs"]},
                         {"PHOTO", "RECIPIENT_NAME"})

    def test_recipient_phone_is_never_exposed_in_the_tracking_payload(self):
        # Same reasoning as the X-09 technician phone masking: don't widen
        # a third party's contact details through the tracking API.
        from service_requests.views import _build_tracking_payload
        sr = _booking()
        WorkforceWebhookView._record_delivery_proof(sr, {
            "photo_url": "https://vendor.example/p.jpg",
            "recipient_name": "Priya R",
            "recipient_phone": "9876543210",
        })
        payload = _build_tracking_payload(sr, has_full_access=True)
        import json
        self.assertNotIn("9876543210", json.dumps(payload, default=str))
