"""Admin slot capacity must be enforced when a booking is created, not only hidden in the availability list."""
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from logistics.models import LogisticsSlot
from service_requests.booking_window import slot_capacity_error
from service_requests.models import ServiceRequest


class SlotCapacityTests(TestCase):
    def setUp(self):
        self.day = timezone.localdate() + timedelta(days=3)
        LogisticsSlot.objects.create(category="packers_movers", city="hosur", group="Morning", slot_label="07:00 AM - 08:00 AM",
                                     start_time="07:00", end_time="08:00", capacity=1, order=1, is_active=True)

    def _sr(self, status="unassigned", cat="packers_movers"):
        return ServiceRequest.objects.create(customer_name="x", phone="9", email="x@e.com", service_category=cat,
                                             preferred_date=self.day, preferred_time="07:00 AM - 08:00 AM", status=status,
                                             issue_title="t", description="d", address="a")

    def test_free_slot_ok_then_full(self):
        self.assertIsNone(slot_capacity_error("packers_movers", self.day, "07:00 AM - 08:00 AM", "hosur"))
        self._sr()
        err = slot_capacity_error("packers_movers", self.day, "07:00 AM - 08:00 AM", "hosur")
        self.assertIn("fully booked", err)

    def test_cancelled_booking_frees_the_slot(self):
        self._sr(status="cancelled")
        self.assertIsNone(slot_capacity_error("packers_movers", self.day, "07:00 AM - 08:00 AM", "hosur"))

    def test_other_category_does_not_consume_slot(self):
        self._sr(cat="goods_transport_truck")
        self.assertIsNone(slot_capacity_error("packers_movers", self.day, "07:00 AM - 08:00 AM", "hosur"))

    def test_unconfigured_label_is_not_blocked(self):
        self.assertIsNone(slot_capacity_error("packers_movers", self.day, "Morning", "hosur"))
