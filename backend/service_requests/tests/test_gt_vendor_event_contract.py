"""
Goods & Transport / Packers & Movers: the events the vendor app actually emits
(payload shapes recorded from the vendor's real lifecycle, see the vendor's
tests_gt/test_realdb_gt_lifecycle.py), replayed through the real webhook
endpoint, plus the delivery OTP the customer must be able to see.
"""
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.utils import timezone

from service_requests.models import BookingAssignment, DeliveryProof, ServiceRequest
from service_requests.views import _build_tracking_payload

User = get_user_model()
URL = "/api/workforce-integration/webhook/"
SECRET = "contract-test-secret"


def _booking(category="goods_transport_truck", status="accepted", **extra):
    uid = uuid.uuid4().hex[:8]
    customer = User.objects.create_user(
        username=f"c{uid}", email=f"c{uid}@example.com",
        phone=f"93{uuid.uuid4().int % 100000000:08d}", role="customer",
    )
    sr = ServiceRequest.objects.create(
        customer=customer, customer_name="C", phone=customer.phone, service_category=category, issue_title="Move",
        address="Pickup", latitude=Decimal("12.9716"), longitude=Decimal("77.5946"),
        drop_address="Drop", drop_latitude=Decimal("13.0355"), drop_longitude=Decimal("77.5970"),
        preferred_date=timezone.localdate(), status=status, payment_method="COD", total_amount=Decimal("500"),
        **extra,
    )
    return sr


class VendorEventContractTests(TestCase):
    def setUp(self):
        patcher = patch("workforce_integration.views.WORKFORCE_WEBHOOK_SECRET", SECRET)
        patcher.start()
        self.addCleanup(patcher.stop)

    def send(self, sr, event, payload=None):
        body = {
            "event": event, "event_id": f"evt_{uuid.uuid4().hex}", "sequence": 1544901413,
            "payload": {"booking_id": sr.request_id, "workforce_job_id": str(sr.id), **(payload or {})},
        }
        return self.client.post(URL, data=json.dumps(body), content_type="application/json",
                                HTTP_X_WORKFORCE_WEBHOOK_SECRET=SECRET)

    # ---- proof of delivery --------------------------------------------------
    def test_vendor_proof_event_records_the_delivery_evidence(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        resp = self.send(sr, "job.completion_proof_submitted", {
            "notes": "handed over", "otp_verified": True, "technician_name": "Ravi",
            "workforce_employee_id": "7", "photo_url": "/media/logistics_checkpoints/p_abc.png",
            "location": {"latitude": "13.0355", "longitude": "77.597"},
        })
        self.assertEqual(resp.status_code, 200, resp.content)
        kinds = {p.proof_type for p in sr.delivery_proofs.all()}
        self.assertEqual(kinds, {DeliveryProof.ProofType.PHOTO, DeliveryProof.ProofType.OTP})
        photo = sr.delivery_proofs.get(proof_type=DeliveryProof.ProofType.PHOTO)
        self.assertEqual(photo.captured_by_workforce_id, "7")
        self.assertEqual(photo.notes, "handed over")

    def test_a_resubmitted_identical_proof_is_not_duplicated(self):
        sr = _booking(status="in_progress")
        payload = {"photo_url": "/media/logistics_checkpoints/p_abc.png", "otp_verified": True, "notes": "x"}
        self.send(sr, "job.completion_proof_submitted", payload)
        self.send(sr, "job.completion_proof_submitted", payload)     # new event id, same evidence
        self.assertEqual(sr.delivery_proofs.count(), 2)              # one PHOTO + one OTP, not four

    # ---- arrival / technician withdrawal ------------------------------------
    def test_vendor_arrival_event_moves_the_booking_to_arrived(self):
        sr = _booking(status="accepted", technician_name="Ravi")
        resp = self.send(sr, "employee_arrived", {
            "technician": {"id": "7", "name": "Ravi", "phone": ""},
            "location": {"latitude": 12.9716, "longitude": 77.5946},
        })
        self.assertEqual(resp.status_code, 200, resp.content)
        sr.refresh_from_db()
        self.assertEqual(sr.status, "arrived")

    def test_technician_withdrawal_returns_the_booking_for_redispatch(self):
        for start_status in ("accepted", "on_the_way"):
            sr = _booking(status=start_status, technician_name="Ravi", technician_phone="9800000001")
            BookingAssignment.objects.create(booking=sr, workforce_job_id=str(sr.id),
                                             status=BookingAssignment.Status.ACCEPTED, technician_name="Ravi")
            resp = self.send(sr, "employee_rejected", {
                "reason": "[VEHICLE_ISSUE] flat tyre", "technician": {"id": "7", "name": "Ravi"},
            })
            self.assertEqual(resp.status_code, 200, resp.content)
            sr.refresh_from_db()
            self.assertEqual(sr.status, "confirmed", start_status)
            self.assertEqual(sr.technician_name, "")
            self.assertEqual(sr.technician_phone, "")
            self.assertEqual(BookingAssignment.objects.get(booking=sr).status, BookingAssignment.Status.REJECTED)

    def test_withdrawal_after_the_trip_started_does_not_rewind_it(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        self.send(sr, "employee_rejected", {"reason": "late"})
        sr.refresh_from_db()
        self.assertEqual(sr.status, "in_progress")


class DeliveryOtpVisibilityTests(TestCase):
    """The vendor issues the drop OTP as a DELIVERY_OTP notification addressed to
    the customer; the tracking payload must surface it to the customer (only)."""

    def setUp(self):
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS workforce_notification ("
                "id integer primary key autoincrement, related_object_id varchar(64), "
                "notification_type varchar(64), message text, created_at datetime)"
            )
        self.addCleanup(self._drop_table)

    @staticmethod
    def _drop_table():
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS workforce_notification")

    def _issue(self, sr, code, when=None):
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO workforce_notification (related_object_id, notification_type, message, created_at) "
                "VALUES (%s, 'DELIVERY_OTP', %s, %s)",
                [str(sr.id), f"Your goods for job #{sr.id} have reached the drop location. Share delivery OTP {code} "
                             f"with the driver only after you receive them.", (when or timezone.now()).isoformat()],
            )

    def _set_leg(self, sr, leg, status="in_progress"):
        ServiceRequest.objects.filter(pk=sr.pk).update(logistics_leg=leg, status=status)
        sr.refresh_from_db()

    def payload(self, sr, **kw):
        return _build_tracking_payload(sr, has_full_access=True, **kw)

    def test_customer_sees_the_code_while_the_trip_is_at_the_drop(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        self._issue(sr, "482913")
        for leg in ("EN_ROUTE_DROP", "UNLOADING"):
            self._set_leg(sr, leg)
            self.assertEqual(self.payload(sr, include_delivery_otp=True)["delivery_otp"], "482913", leg)

    def test_latest_code_wins_after_a_resend(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        self._issue(sr, "111111", when=timezone.now() - timezone.timedelta(minutes=5))
        self._issue(sr, "222222")
        self._set_leg(sr, "UNLOADING")
        self.assertEqual(self.payload(sr, include_delivery_otp=True)["delivery_otp"], "222222")

    def test_code_is_not_shown_before_the_drop_or_after_delivery(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        self._issue(sr, "482913")
        for leg in ("EN_ROUTE_PICKUP", "LOADING", "DELIVERED", ""):
            self._set_leg(sr, leg)
            self.assertIsNone(self.payload(sr, include_delivery_otp=True)["delivery_otp"], leg)
        self._set_leg(sr, "UNLOADING", status="completed")
        self.assertIsNone(self.payload(sr, include_delivery_otp=True)["delivery_otp"])

    def test_code_is_opt_in_so_driver_facing_and_broadcast_payloads_never_carry_it(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        self._issue(sr, "482913")
        self._set_leg(sr, "UNLOADING")
        self.assertIsNone(_build_tracking_payload(sr, has_full_access=True)["delivery_otp"])
        self.assertIsNone(_build_tracking_payload(sr, has_full_access=False, include_delivery_otp=True)["delivery_otp"])

    def test_non_logistics_bookings_never_expose_it(self):
        sr = _booking(category="ac_repair", status="in_progress", technician_name="Ravi")
        self._issue(sr, "482913")
        self._set_leg(sr, "UNLOADING")
        self.assertIsNone(self.payload(sr, include_delivery_otp=True)["delivery_otp"])

    def test_live_location_endpoint_gives_it_to_the_token_holder_only_when_due(self):
        sr = _booking(status="in_progress", technician_name="Ravi")
        self._issue(sr, "482913")
        self._set_leg(sr, "EN_ROUTE_DROP")
        url = f"/api/booking/{sr.request_id}/live-location/?token={sr.tracking_token}"
        self.assertEqual(self.client.get(url).json()["data"]["delivery_otp"], "482913")
        self.assertEqual(self.client.get(f"/api/booking/{sr.request_id}/live-location/?token=wrong").status_code, 403)
