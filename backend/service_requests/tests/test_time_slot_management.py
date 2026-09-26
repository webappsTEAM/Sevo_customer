"""
Tests for Service-wise Time Slot Management.

Covers:
1. Default fallback slot generation (09:00 AM - 06:00 PM, 30-min duration, ends at 05:30 PM).
2. Admin schedule configuration change (end time 07:00 PM adds 06:00 PM and 06:30 PM).
3. Weekly schedule overrides (Wednesday 09:00-19:00, Sunday closed, unconfigured days fallback to default).
4. Date overrides & holidays (closed holiday, custom hours 10:00-16:00 ends at 15:30).
5. Service resolution priority (ID, slug, package, unambiguous category).
6. Capacity enforcement and exclusion of CANCELLED/REJECTED bookings.
7. Booking race condition / validation safety.
"""
import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from service_requests.models import (
    CatalogCategory,
    Service,
    Package,
    ServiceRequest,
    ServiceTimeSlotConfig,
    ServiceWeeklySchedule,
    ServiceDateOverride,
)
from service_requests.services.time_slot_service import (
    resolve_service,
    generate_slots_for_service_date,
    validate_slot_availability_for_booking,
    get_service_time_slot_config,
)

User = get_user_model()


class ServiceTimeSlotManagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = CatalogCategory.objects.create(
            name="AC & Appliance Repair",
            slug="ac-appliance",
        )
        self.service_ac = Service.objects.create(
            category=self.category,
            name="AC Service & Cleaning",
            slug="ac-service-cleaning",
            is_active=True,
        )
        self.pkg_ac = Package.objects.create(
            service=self.service_ac,
            name="Split AC Deep Cleaning",
            slug="split-ac-deep-clean",
            base_price=599,
        )
        self.service_tv = Service.objects.create(
            category=self.category,
            name="TV Repair",
            slug="tv-repair",
            is_active=True,
        )

        # Admin user for protected endpoints
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@quicktims.com",
            password="testpassword123",
            role="admin",
            is_staff=True,
        )

        # Target future date (Wednesday)
        # Find next Wednesday
        today = timezone.localtime().date()
        days_ahead = (2 - today.weekday()) % 7
        if days_ahead <= 0:
            days_ahead += 7
        self.wednesday = today + datetime.timedelta(days=days_ahead)

        # Find next Sunday
        days_ahead_sun = (6 - today.weekday()) % 7
        if days_ahead_sun <= 0:
            days_ahead_sun += 7
        self.sunday = today + datetime.timedelta(days=days_ahead_sun)

        # Find next Thursday
        days_ahead_thu = (3 - today.weekday()) % 7
        if days_ahead_thu <= 0:
            days_ahead_thu += 7
        self.thursday = today + datetime.timedelta(days=days_ahead_thu)

    def test_default_fallback_slots(self):
        """
        If a service has no time slot config, default is:
        Start 09:00 AM, End 06:00 PM, Duration 30 mins, Capacity 1.
        Slots must run from 09:00 AM through 05:30 PM.
        06:00 PM must NOT be generated as a booking start time.
        """
        res = generate_slots_for_service_date(self.service_ac, self.wednesday)
        self.assertTrue(res["is_open"])
        self.assertEqual(res["slot_duration_minutes"], 30)

        morning = res["groups"]["morning"]
        afternoon = res["groups"]["afternoon"]
        evening = res["groups"]["evening"]

        all_slots = morning + afternoon + evening
        self.assertTrue(len(all_slots) > 0)

        # First slot is 09:00 AM
        self.assertEqual(all_slots[0]["time"], "09:00 AM")
        self.assertEqual(all_slots[0]["value"], "09:00")

        # Last slot must be 05:30 PM (17:30) because 17:30 + 30m = 18:00 (end boundary)
        self.assertEqual(all_slots[-1]["time"], "05:30 PM")
        self.assertEqual(all_slots[-1]["value"], "17:30")

        # 06:00 PM is NOT in the slots
        values = [s["value"] for s in all_slots]
        self.assertNotIn("18:00", values)

    def test_admin_schedule_update(self):
        """
        When admin changes AC end time to 07:00 PM (19:00),
        06:00 PM and 06:30 PM slots must automatically appear.
        """
        ServiceTimeSlotConfig.objects.create(
            service=self.service_ac,
            default_start_time=datetime.time(9, 0),
            default_end_time=datetime.time(19, 0),
            slot_duration_minutes=30,
            slot_capacity=1,
            is_active=True,
        )

        res = generate_slots_for_service_date(self.service_ac, self.wednesday)
        all_slots = res["groups"]["morning"] + res["groups"]["afternoon"] + res["groups"]["evening"]
        values = [s["value"] for s in all_slots]

        self.assertIn("18:00", values)  # 06:00 PM
        self.assertIn("18:30", values)  # 06:30 PM
        self.assertNotIn("19:00", values)  # 07:00 PM boundary is not a start time

        self.assertEqual(all_slots[-1]["time"], "06:30 PM")
        self.assertEqual(all_slots[-1]["value"], "18:30")

    def test_weekly_schedule_overrides(self):
        """
        If AC Wednesday is 09:00 AM - 07:00 PM and Sunday is Closed:
        - Wednesday generates through 06:30 PM.
        - Sunday returns is_open=False and 0 slots.
        - Thursday (no override) uses default 09:00 AM - 06:00 PM.
        """
        # Base config: 09:00 - 18:00
        ServiceTimeSlotConfig.objects.create(
            service=self.service_ac,
            default_start_time=datetime.time(9, 0),
            default_end_time=datetime.time(18, 0),
            slot_duration_minutes=30,
            slot_capacity=1,
            is_active=True,
        )

        # Wednesday override: 09:00 - 19:00
        ServiceWeeklySchedule.objects.create(
            service=self.service_ac,
            day_of_week=2,  # Wednesday
            start_time=datetime.time(9, 0),
            end_time=datetime.time(19, 0),
            is_open=True,
        )

        # Sunday closed
        ServiceWeeklySchedule.objects.create(
            service=self.service_ac,
            day_of_week=6,  # Sunday
            is_open=False,
        )

        # Test Wednesday
        res_wed = generate_slots_for_service_date(self.service_ac, self.wednesday)
        self.assertTrue(res_wed["is_open"])
        wed_values = [s["value"] for s in res_wed["groups"]["morning"] + res_wed["groups"]["afternoon"] + res_wed["groups"]["evening"]]
        self.assertIn("18:30", wed_values)

        # Test Sunday
        res_sun = generate_slots_for_service_date(self.service_ac, self.sunday)
        self.assertFalse(res_sun["is_open"])
        self.assertEqual(len(res_sun["groups"]["morning"]), 0)
        self.assertEqual(len(res_sun["groups"]["afternoon"]), 0)
        self.assertEqual(len(res_sun["groups"]["evening"]), 0)

        # Test Thursday (no weekly override -> falls back to default 09:00-18:00)
        res_thu = generate_slots_for_service_date(self.service_ac, self.thursday)
        self.assertTrue(res_thu["is_open"])
        thu_values = [s["value"] for s in res_thu["groups"]["morning"] + res_thu["groups"]["afternoon"] + res_thu["groups"]["evening"]]
        self.assertNotIn("18:00", thu_values)
        self.assertIn("17:30", thu_values)

    def test_date_override_priority(self):
        """
        Special date override wins over weekly schedule and default.
        - Closed date override: returns is_open=False and holiday reason.
        - Custom hours date override (10:00 - 16:00): generates 10:00 through 15:30.
        """
        # Closed holiday override
        holiday_date = self.wednesday + datetime.timedelta(days=7)
        ServiceDateOverride.objects.create(
            service=self.service_ac,
            date=holiday_date,
            is_closed=True,
            reason="Diwali Holiday",
        )

        res_holiday = generate_slots_for_service_date(self.service_ac, holiday_date)
        self.assertFalse(res_holiday["is_open"])
        self.assertIn("Diwali Holiday", res_holiday["reason"])
        self.assertEqual(res_holiday["total_slots_count"], 0)

        # Custom hours override: 10:00 AM - 04:00 PM
        custom_date = self.wednesday + datetime.timedelta(days=14)
        ServiceDateOverride.objects.create(
            service=self.service_ac,
            date=custom_date,
            is_closed=False,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(16, 0),
            reason="Special Event Hours",
        )

        res_custom = generate_slots_for_service_date(self.service_ac, custom_date)
        self.assertTrue(res_custom["is_open"])
        custom_slots = res_custom["groups"]["morning"] + res_custom["groups"]["afternoon"] + res_custom["groups"]["evening"]
        self.assertEqual(custom_slots[0]["value"], "10:00")
        self.assertEqual(custom_slots[-1]["value"], "15:30")
        self.assertNotIn("16:00", [s["value"] for s in custom_slots])

    def test_service_resolution_priority(self):
        """
        Strict service resolution priority:
        1. Explicit service_id
        2. Explicit service slug
        3. Package -> Service
        4. Category fallback only if unambiguous (fails if category has multiple services).
        """
        # 1. By ID
        svc, err = resolve_service(service_param=self.service_ac.id)
        self.assertEqual(svc, self.service_ac)
        self.assertIsNone(err)

        # 2. By slug
        svc, err = resolve_service(service_param="ac-service-cleaning")
        self.assertEqual(svc, self.service_ac)
        self.assertIsNone(err)

        # 3. By package slug
        svc, err = resolve_service(service_param="split-ac-deep-clean")
        self.assertEqual(svc, self.service_ac)
        self.assertIsNone(err)

        # 4. Category with multiple services (self.category has AC and TV)
        svc, err = resolve_service(category_param="ac-appliance")
        self.assertIsNone(svc)
        self.assertIn("contains multiple services", err)

        # 4b. Category with exactly ONE service
        single_cat = CatalogCategory.objects.create(name="Plumbing", slug="plumbing")
        plumbing_svc = Service.objects.create(category=single_cat, name="Plumber Service", slug="plumber")
        svc, err = resolve_service(category_param="plumbing")
        self.assertEqual(svc, plumbing_svc)
        self.assertIsNone(err)

    def test_capacity_and_unrelated_services(self):
        """
        When a booking exists for 10:00 AM on AC with capacity=1:
        - 10:00 AM slot for AC is unavailable ("Slot full").
        - Other slots for AC remain available.
        - Unrelated service (TV) at the same 10:00 AM slot is NOT affected.
        - CANCELLED / REJECTED bookings on AC do NOT consume capacity.
        """
        target_date = self.wednesday

        # Create active booking for AC at 10:00 AM
        ServiceRequest.objects.create(
            request_id="SR-TEST-001",
            customer_name="Test Customer",
            phone="9876543210",
            address="Hosur",
            preferred_date=target_date,
            preferred_time="10:00 AM",
            catalog_service_id=str(self.service_ac.id),
            service_category=self.service_ac.slug,
            status=ServiceRequest.Status.CONFIRMED,
        )

        res_ac = generate_slots_for_service_date(self.service_ac, target_date)
        ac_slots = {s["value"]: s for s in res_ac["groups"]["morning"] + res_ac["groups"]["afternoon"] + res_ac["groups"]["evening"]}

        self.assertFalse(ac_slots["10:00"]["available"])
        self.assertEqual(ac_slots["10:00"]["reason"], "Slot full")
        self.assertTrue(ac_slots["10:30"]["available"])

        # Check TV service on same date at 10:00 AM -> must still be available!
        res_tv = generate_slots_for_service_date(self.service_tv, target_date)
        tv_slots = {s["value"]: s for s in res_tv["groups"]["morning"] + res_tv["groups"]["afternoon"] + res_tv["groups"]["evening"]}
        self.assertTrue(tv_slots["10:00"]["available"])

        # Cancel the AC booking -> 10:00 AM slot must become available again!
        ServiceRequest.objects.filter(request_id="SR-TEST-001").update(status=ServiceRequest.Status.CANCELLED)
        res_ac_after_cancel = generate_slots_for_service_date(self.service_ac, target_date)
        ac_slots_cancel = {s["value"]: s for s in res_ac_after_cancel["groups"]["morning"] + res_ac_after_cancel["groups"]["afternoon"] + res_ac_after_cancel["groups"]["evening"]}
        self.assertTrue(ac_slots_cancel["10:00"]["available"])

    def test_booking_revalidation_concurrency_guard(self):
        """
        validate_slot_availability_for_booking accurately approves available slots
        and rejects slots that exceed capacity or are outside operating hours.
        """
        target_date = self.wednesday

        # Valid slot
        valid, msg = validate_slot_availability_for_booking(self.service_ac, target_date, "11:00 AM")
        self.assertTrue(valid)
        self.assertIsNone(msg)

        # Outside operating hours (08:00 AM)
        valid_early, msg_early = validate_slot_availability_for_booking(self.service_ac, target_date, "08:00 AM")
        self.assertFalse(valid_early)
        self.assertIn("outside operating hours", msg_early)

        # When slot fills up
        ServiceRequest.objects.create(
            request_id="SR-TEST-002",
            customer_name="Test Customer 2",
            phone="9876543211",
            address="Hosur",
            preferred_date=target_date,
            preferred_time="11:00 AM",
            catalog_service_id=str(self.service_ac.id),
            service_category=self.service_ac.slug,
            status=ServiceRequest.Status.CONFIRMED,
        )

        valid_full, msg_full = validate_slot_availability_for_booking(self.service_ac, target_date, "11:00 AM")
        self.assertFalse(valid_full)
        self.assertIn("no longer available", msg_full)

    def test_customer_and_admin_api_endpoints(self):
        """
        Verify HTTP API responses for:
        - Customer GET /api/services/{id}/time-slots/
        - Admin GET /api/admin/time-slots/{id}/
        - Admin POST /api/admin/time-slots/{id}/preview/
        """
        # Customer endpoint (public)
        url = f"/api/services/{self.service_ac.id}/time-slots/?date={self.wednesday.strftime('%Y-%m-%d')}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["service_id"], self.service_ac.id)
        self.assertIn("morning", data["data"]["groups"])
        self.assertIn("afternoon", data["data"]["groups"])
        self.assertIn("evening", data["data"]["groups"])

        # Admin detail endpoint
        self.client.force_authenticate(user=self.admin_user)
        admin_url = f"/api/admin/time-slots/{self.service_ac.id}/"
        admin_resp = self.client.get(admin_url)
        self.assertEqual(admin_resp.status_code, 200)
        admin_data = admin_resp.json()
        self.assertTrue(admin_data["success"])
        self.assertEqual(len(admin_data["data"]["weekly_schedule"]), 7)

        # Admin preview endpoint (same generator logic)
        preview_url = f"/api/admin/time-slots/{self.service_ac.id}/preview/"
        preview_resp = self.client.post(preview_url, {
            "default_start_time": "10:00",
            "default_end_time": "16:00",
            "slot_duration_minutes": 30,
            "date": self.wednesday.strftime("%Y-%m-%d"),
        }, format="json")
        self.assertEqual(preview_resp.status_code, 200)
        preview_data = preview_resp.json()["data"]
        slots = preview_data["groups"]["morning"] + preview_data["groups"]["afternoon"] + preview_data["groups"]["evening"]
        self.assertEqual(slots[0]["value"], "10:00")
        self.assertEqual(slots[-1]["value"], "15:30")
