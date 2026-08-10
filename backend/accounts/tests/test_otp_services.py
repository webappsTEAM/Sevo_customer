"""
accounts/tests/test_otp_services.py

Comprehensive tests for Prompt 1:
- OTPRequest model and OTP hashing
- request_otp with rate limits (60s gap, 5/hour max) and 10-digit mobile validation
- verify_otp with attempt counter (3 max), hash check, and atomic customer resolution
- complete_customer_profile with full_name & email
- Customer last_known_location and profile_complete fields
"""

import time
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from accounts.models import OTPRequest
from accounts.services import (
    request_otp,
    verify_otp,
    complete_customer_profile,
    RateLimitError,
    InvalidOTPError,
)

User = get_user_model()


class OTPAuthServicesTestCase(TestCase):
    def setUp(self):
        self.mobile_1 = "9876543210"
        self.mobile_2 = "9123456789"

    def test_request_otp_success_and_envelope(self):
        res = request_otp(self.mobile_1)
        self.assertTrue(res["success"])
        self.assertEqual(res["data"]["resend_after_seconds"], 60)
        self.assertIn("dev_otp", res["data"])
        
        # Check DB record
        req = OTPRequest.objects.filter(mobile_number=self.mobile_1).first()
        self.assertIsNotNone(req)
        self.assertFalse(req.is_verified)
        self.assertEqual(req.attempt_count, 0)
        self.assertGreater(req.expires_at, timezone.now())

    def test_request_otp_invalid_mobile_format(self):
        with self.assertRaises(ValueError):
            request_otp("12345")  # Less than 10 digits
        
        with self.assertRaises(ValueError):
            request_otp("5555555555")  # Doesn't start with 6-9

    def test_request_otp_rate_limit_60_seconds_gap(self):
        request_otp(self.mobile_1)
        # Immediate second request should trigger 60s rate limit
        with self.assertRaises(RateLimitError) as ctx:
            request_otp(self.mobile_1)
        self.assertEqual(ctx.exception.code, "RATE_LIMITED")
        self.assertIn("resend_after_seconds", ctx.exception.extra)

    def test_request_otp_rate_limit_5_per_hour(self):
        now = timezone.now()
        # Seed 5 requests within the last hour
        for i in range(5):
            OTPRequest.objects.create(
                mobile_number=self.mobile_2,
                otp_hash="dummy_hash",
                created_at=now - timedelta(minutes=10 + i),
                expires_at=now + timedelta(minutes=5),
                attempt_count=0,
                is_verified=False
            )
        
        with self.assertRaises(RateLimitError) as ctx:
            request_otp(self.mobile_2)
        self.assertEqual(ctx.exception.code, "RATE_LIMITED")

    def test_verify_otp_invalid_code_attempts_increment(self):
        res = request_otp(self.mobile_1)
        dev_otp = res["data"]["dev_otp"]
        wrong_otp = "000000" if dev_otp != "000000" else "111111"

        # Attempt 1 wrong
        with self.assertRaises(InvalidOTPError) as ctx1:
            verify_otp(self.mobile_1, wrong_otp)
        self.assertEqual(ctx1.exception.code, "INVALID_OTP")
        self.assertEqual(ctx1.exception.extra["attempts_remaining"], 2)

        # Attempt 2 wrong
        with self.assertRaises(InvalidOTPError) as ctx2:
            verify_otp(self.mobile_1, wrong_otp)
        self.assertEqual(ctx2.exception.code, "INVALID_OTP")
        self.assertEqual(ctx2.exception.extra["attempts_remaining"], 1)

        # Attempt 3 wrong -> Invalidation
        with self.assertRaises(InvalidOTPError) as ctx3:
            verify_otp(self.mobile_1, wrong_otp)
        self.assertEqual(ctx3.exception.code, "MAX_ATTEMPTS_EXCEEDED")

        # Further attempts fail due to no active/unexpired request
        with self.assertRaises(InvalidOTPError) as ctx4:
            verify_otp(self.mobile_1, dev_otp)
        self.assertEqual(ctx4.exception.code, "NO_ACTIVE_OTP")

    def test_verify_otp_success_new_customer_resolution(self):
        res = request_otp(self.mobile_1)
        dev_otp = res["data"]["dev_otp"]

        verify_res = verify_otp(self.mobile_1, dev_otp)
        self.assertTrue(verify_res["success"])
        self.assertTrue(verify_res["data"]["is_new_customer"])
        self.assertFalse(verify_res["data"]["profile_complete"])
        self.assertIn("auth_token", verify_res["data"])

        # Check DB Customer model
        customer = User.objects.filter(mobile_number=self.mobile_1).first()
        self.assertIsNotNone(customer)
        self.assertEqual(customer.role, User.Role.CUSTOMER)
        self.assertFalse(customer.profile_complete)

    def test_verify_otp_success_existing_customer_resolution(self):
        # Create existing customer first
        existing_cust = User.objects.create(
            username="cust_existing",
            mobile_number=self.mobile_1,
            phone=self.mobile_1,
            role=User.Role.CUSTOMER,
            first_name="Anita",
            last_name="Roy",
            profile_complete=True
        )

        res = request_otp(self.mobile_1)
        dev_otp = res["data"]["dev_otp"]

        verify_res = verify_otp(self.mobile_1, dev_otp)
        self.assertTrue(verify_res["success"])
        self.assertFalse(verify_res["data"]["is_new_customer"])
        self.assertTrue(verify_res["data"]["profile_complete"])
        self.assertEqual(verify_res["data"]["customer_id"], existing_cust.id)

    def test_complete_customer_profile(self):
        cust = User.objects.create(
            username="cust_pending",
            mobile_number=self.mobile_1,
            role=User.Role.CUSTOMER,
            profile_complete=False
        )

        res = complete_customer_profile(
            customer_id=cust.id,
            full_name="Rajesh Kumar",
            email="rajesh@example.com"
        )
        self.assertTrue(res["success"])
        self.assertTrue(res["data"]["profile_complete"])

        cust.refresh_from_db()
        self.assertTrue(cust.profile_complete)
        self.assertEqual(cust.first_name, "Rajesh")
        self.assertEqual(cust.last_name, "Kumar")
        self.assertEqual(cust.email, "rajesh@example.com")

    def test_customer_last_known_location_field(self):
        cust = User.objects.create(
            username="cust_loc",
            mobile_number="9988776655",
            role=User.Role.CUSTOMER,
            last_known_location={"latitude": 12.9716, "longitude": 77.5946, "label": "Koramangala"}
        )
        cust.refresh_from_db()
        self.assertEqual(cust.last_known_location["label"], "Koramangala")
        self.assertEqual(cust.last_known_location["latitude"], 12.9716)
