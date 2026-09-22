"""
services.py

Root service interface exposing core services for OTP authentication and customer resolution.
Delegates to accounts/services.py.
"""

from accounts.services import (
    request_otp,
    verify_otp,
    complete_customer_profile,
    RateLimitError,
    InvalidOTPError,
    DomainException,
    MockSMSProvider,
    TwilioSMSProvider,
    get_sms_provider,
)

__all__ = [
    "request_otp",
    "verify_otp",
    "complete_customer_profile",
    "RateLimitError",
    "InvalidOTPError",
    "DomainException",
    "MockSMSProvider",
    "TwilioSMSProvider",
    "get_sms_provider",
]
