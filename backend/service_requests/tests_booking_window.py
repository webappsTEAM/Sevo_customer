"""
Tests for the same-day booking window (service_requests/booking_window.py).

These cover the boundaries the cut-off rule is easy to get wrong at: just
before the cut-off, exactly on it, just after, and around midnight -- plus the
guarantee that a future date is never constrained and that an existing booking's
own date is never re-validated here.
"""
import datetime

from django.test import TestCase, override_settings
from django.utils import timezone

from .booking_window import (
    is_same_day_closed,
    next_bookable_date,
    parse_slot_time,
    validate_booking_slot,
)


def _local(year, month, day, hour, minute=0):
    """Build an aware datetime in the project timezone."""
    return timezone.make_aware(
        datetime.datetime(year, month, day, hour, minute),
        timezone.get_current_timezone(),
    )


@override_settings(BOOKING_SAME_DAY_CUTOFF_HOUR=18, BOOKING_MIN_LEAD_MINUTES=30)
class BookingWindowTests(TestCase):
    def test_before_cutoff_same_day_is_open(self):
        now = _local(2026, 9, 4, 17, 59)
        self.assertFalse(is_same_day_closed(now))
        self.assertEqual(next_bookable_date(now), datetime.date(2026, 9, 4))

    def test_exactly_at_cutoff_closes_same_day(self):
        now = _local(2026, 9, 4, 18, 0)
        self.assertTrue(is_same_day_closed(now))
        self.assertEqual(next_bookable_date(now), datetime.date(2026, 9, 5))

    def test_after_cutoff_rolls_to_next_day(self):
        now = _local(2026, 9, 4, 20, 30)
        error = validate_booking_slot(datetime.date(2026, 9, 4), "21:00", now=now)
        self.assertIsNotNone(error)
        self.assertIn("05 Sep 2026", error)

    def test_after_cutoff_next_day_is_accepted(self):
        now = _local(2026, 9, 4, 20, 30)
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 9, 5), "09:00", now=now))

    def test_near_midnight_still_offers_the_coming_day(self):
        now = _local(2026, 9, 4, 23, 59)
        self.assertEqual(next_bookable_date(now), datetime.date(2026, 9, 5))
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 9, 5), "07:00", now=now))

    def test_just_after_midnight_same_day_reopens(self):
        now = _local(2026, 9, 5, 0, 5)
        self.assertFalse(is_same_day_closed(now))
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 9, 5), "09:00", now=now))

    def test_slot_already_passed_today_is_rejected(self):
        now = _local(2026, 9, 4, 14, 0)
        error = validate_booking_slot(datetime.date(2026, 9, 4), "09:00", now=now)
        self.assertIsNotNone(error)
        self.assertIn("already passed", error)

    def test_slot_inside_lead_time_is_rejected(self):
        now = _local(2026, 9, 4, 14, 0)
        self.assertIsNotNone(validate_booking_slot(datetime.date(2026, 9, 4), "14:15", now=now))

    def test_slot_beyond_lead_time_is_accepted(self):
        now = _local(2026, 9, 4, 14, 0)
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 9, 4), "14:30", now=now))

    def test_past_date_is_rejected(self):
        now = _local(2026, 9, 4, 10, 0)
        self.assertIsNotNone(validate_booking_slot(datetime.date(2026, 9, 3), "10:00", now=now))

    def test_future_date_is_never_constrained(self):
        now = _local(2026, 9, 4, 23, 30)
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 12, 25), "07:00", now=now))

    def test_unparseable_slot_falls_back_to_day_rule(self):
        # An unreadable slot string must not reject an otherwise valid booking.
        now = _local(2026, 9, 4, 10, 0)
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 9, 4), "sometime later", now=now))
        # ...but the day-level cut-off still applies.
        late = _local(2026, 9, 4, 19, 0)
        self.assertIsNotNone(validate_booking_slot(datetime.date(2026, 9, 4), "whenever", now=late))

    def test_slot_formats_parsed(self):
        self.assertEqual(parse_slot_time("07:00"), datetime.time(7, 0))
        self.assertEqual(parse_slot_time("7:00 AM"), datetime.time(7, 0))
        self.assertEqual(parse_slot_time("5:30 PM"), datetime.time(17, 30))
        self.assertEqual(parse_slot_time("09:00 - 11:00"), datetime.time(9, 0))
        self.assertIsNone(parse_slot_time(""))
        self.assertIsNone(parse_slot_time("not a time"))

    @override_settings(BOOKING_SAME_DAY_CUTOFF_HOUR=21)
    def test_cutoff_hour_is_configurable(self):
        now = _local(2026, 9, 4, 19, 0)
        self.assertFalse(is_same_day_closed(now))
        self.assertIsNone(validate_booking_slot(datetime.date(2026, 9, 4), "20:30", now=now))
