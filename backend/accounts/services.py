"""
accounts/services.py

Mobile OTP authentication and customer profile management service.
Handles OTP generation, hashing, rate limiting, verification, and customer profile resolution.
"""

import hashlib
import hmac
import os
import random
import re
from datetime import timedelta
from typing import Dict, Any, Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.core.validators import validate_email as _django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction, models
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OTPRequest, OTPChannel

User = get_user_model()


# ── Domain Exceptions ─────────────────────────────────────────────────────────

class DomainException(Exception):
    def __init__(self, message: str, code: str = "ERROR", extra: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.extra = extra or {}


class RateLimitError(DomainException):
    def __init__(self, message: str = "Rate limit exceeded", code: str = "RATE_LIMITED", extra: Optional[Dict[str, Any]] = None):
        super().__init__(message, code=code, extra=extra)


class InvalidOTPError(DomainException):
    def __init__(self, message: str = "Invalid OTP", code: str = "INVALID_OTP", extra: Optional[Dict[str, Any]] = None):
        super().__init__(message, code=code, extra=extra)


# ── SMS Provider Interface ───────────────────────────────────────────────────

class SMSProviderInterface:
    def send_sms(self, mobile_number: str, message: str) -> bool:
        raise NotImplementedError("SMS provider must implement send_sms()")


class MockSMSProvider(SMSProviderInterface):
    """Development/testing SMS gateway mock."""
    def send_sms(self, mobile_number: str, message: str) -> bool:
        print("\n" + "=" * 60)
        print(f"  [SMS GATEWAY MOCK] To: {mobile_number}")
        print(f"  [SMS GATEWAY MOCK] Message: {message}")
        print("=" * 60 + "\n")
        return True


class TwilioSMSProvider(SMSProviderInterface):
    """Twilio production SMS provider."""
    def send_sms(self, mobile_number: str, message: str) -> bool:
        try:
            from twilio.rest import Client as TwilioClient
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            from_number = os.getenv("TWILIO_FROM_NUMBER")
            if account_sid and auth_token and from_number and not account_sid.startswith("your_"):
                client = TwilioClient(account_sid, auth_token)
                client.messages.create(
                    body=message,
                    from_=from_number,
                    to=f"+91{mobile_number}" if not mobile_number.startswith("+") else mobile_number
                )
                return True
        except Exception as e:
            print(f"Twilio SMS Error: {e}")
        # Fallback to Mock if Twilio fails
        return MockSMSProvider().send_sms(mobile_number, message)


def get_sms_provider() -> SMSProviderInterface:
    provider_name = getattr(settings, "SMS_PROVIDER", "mock").lower()
    if provider_name == "twilio":
        return TwilioSMSProvider()
    return MockSMSProvider()


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _normalize_mobile_number(mobile_number: str) -> str:
    """Normalize input string to a clean 10-digit Indian mobile number."""
    if not mobile_number:
        raise ValueError("Mobile number is required.")
    
    digits = re.sub(r'\D', '', str(mobile_number))
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    
    if not re.match(r'^[6-9]\d{9}$', digits):
        raise ValueError("Invalid Indian mobile number format. Must be a 10-digit number starting with 6-9.")
    
    return digits


def _normalize_email(email: str) -> str:
    """Normalize + validate an email address for OTP login."""
    if not email:
        raise ValueError("Email is required.")
    clean = str(email).strip().lower()
    try:
        _django_validate_email(clean)
    except DjangoValidationError:
        raise ValueError("Invalid email address format.")
    return clean


def _normalize_identifier(identifier: str, channel: str) -> str:
    return _normalize_email(identifier) if channel == OTPChannel.EMAIL else _normalize_mobile_number(identifier)


def _hash_otp(identifier: str, otp_code: str) -> str:
    """Hash OTP using HMAC-SHA256 with server SECRET_KEY."""
    secret = getattr(settings, "SECRET_KEY", "fallback-secret-key").encode('utf-8')
    data = f"{identifier}:{otp_code}".encode('utf-8')
    return hmac.new(secret, data, hashlib.sha256).hexdigest()


def _send_email_otp(email: str, otp_code: str):
    send_mail(
        subject="Your CalServices login OTP",
        message=f"Your CalServices login OTP is: {otp_code}. Valid for 5 minutes.",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[email],
        fail_silently=True,
    )


def _get_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ── Public Service API ───────────────────────────────────────────────────────

def request_otp(identifier: str, channel: str = OTPChannel.PHONE) -> dict:
    """
    1. Validates identifier format (10-digit Indian mobile, or email) & phone blocklist.
    2. Enforces rate limits, scoped per (identifier, channel):
       - 60s minimum gap between consecutive sends.
       - Max 5 OTP sends per rolling 1 hour.
       - Raises RateLimitError (code=RATE_LIMITED) on violation.
    3. Hashes & stores OTP in DB with 5-minute expiration.
    4. Dispatches via SMS (phone channel) or email (email channel).
    """
    clean_identifier = _normalize_identifier(identifier, channel)

    if channel == OTPChannel.PHONE:
        blocked_numbers = getattr(settings, "OTP_BLOCKED_NUMBERS", ["0000000000"])
        if clean_identifier in blocked_numbers:
            raise RateLimitError("This mobile number is blocked from requesting OTPs.", code="BLOCKED_NUMBER")

    now = timezone.now()

    # Rate Limit 1: 60-second gap check
    last_request = OTPRequest.objects.filter(identifier=clean_identifier, channel=channel).order_by('-created_at').first()
    if last_request:
        elapsed_seconds = (now - last_request.created_at).total_seconds()
        if elapsed_seconds < 60:
            wait_seconds = int(60 - elapsed_seconds)
            raise RateLimitError(
                f"Please wait {wait_seconds} seconds before requesting a new OTP.",
                code="RATE_LIMITED",
                extra={"resend_after_seconds": wait_seconds}
            )

    # Rate Limit 2: Max 5 sends per rolling hour
    one_hour_ago = now - timedelta(hours=1)
    recent_count = OTPRequest.objects.filter(
        identifier=clean_identifier,
        channel=channel,
        created_at__gte=one_hour_ago
    ).count()

    if recent_count >= 5:
        raise RateLimitError(
            "Maximum OTP request limit (5 per hour) reached for this identifier.",
            code="RATE_LIMITED"
        )

    # Generate 6-digit OTP code & hash it
    otp_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    otp_hash = _hash_otp(clean_identifier, otp_code)
    expires_at = now + timedelta(minutes=5)

    OTPRequest.objects.create(
        identifier=clean_identifier,
        channel=channel,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempt_count=0,
        is_verified=False,
        purpose="login"
    )

    # Dispatch
    if channel == OTPChannel.EMAIL:
        _send_email_otp(clean_identifier, otp_code)
    else:
        provider = get_sms_provider()
        provider.send_sms(clean_identifier, f"Your CalServices login OTP is: {otp_code}. Valid for 5 minutes.")

    response_data = {
        "resend_after_seconds": 60,
    }
    import sys
    if getattr(settings, "DEBUG", False) or getattr(settings, "TESTING", False) or 'test' in sys.argv:
        response_data["dev_otp"] = otp_code

    return {
        "success": True,
        "data": response_data,
        "error": None,
        "meta": {}
    }


def verify_otp(identifier: str, otp_code: str, channel: str = OTPChannel.PHONE) -> dict:
    """
    1. Rejects if no active (unexpired, unverified) OTP request exists, or if attempt_count >= 3.
    2. On mismatch: increments attempt_count, raises InvalidOTPError (code=INVALID_OTP) with attempts_remaining.
    3. On 3rd failed attempt: invalidates OTP entirely.
    4. On match: marks is_verified=True, atomically resolves Customer:
       - If Customer with this identifier exists: issue auth token.
       - If not: create minimal Customer record (identifier only, profile_complete=False), issue auth token.
    """
    clean_identifier = _normalize_identifier(identifier, channel)
    otp_code_str = str(otp_code).strip()

    now = timezone.now()

    # Find active unexpired, unverified OTP request
    otp_request = OTPRequest.objects.filter(
        identifier=clean_identifier,
        channel=channel,
        is_verified=False,
        expires_at__gt=now
    ).order_by('-created_at').first()

    if not otp_request:
        raise InvalidOTPError("No active or unexpired OTP request found. Please request a new OTP.", code="NO_ACTIVE_OTP")

    # Reject if attempts >= 3
    if otp_request.attempt_count >= 3:
        otp_request.expires_at = now
        otp_request.save(update_fields=['expires_at'])
        raise InvalidOTPError("OTP invalidated due to maximum failed attempts (3). Please request a fresh OTP.", code="MAX_ATTEMPTS_EXCEEDED")

    expected_hash = _hash_otp(clean_identifier, otp_code_str)

    if otp_request.otp_hash != expected_hash:
        otp_request.attempt_count += 1
        if otp_request.attempt_count >= 3:
            otp_request.expires_at = now
            otp_request.save(update_fields=['attempt_count', 'expires_at'])
            raise InvalidOTPError(
                "Invalid OTP code. Maximum failed attempts reached; OTP has been invalidated.",
                code="MAX_ATTEMPTS_EXCEEDED",
                extra={"attempts_remaining": 0}
            )
        else:
            otp_request.save(update_fields=['attempt_count'])
            attempts_remaining = 3 - otp_request.attempt_count
            raise InvalidOTPError(
                f"Invalid OTP code. {attempts_remaining} attempt(s) remaining.",
                code="INVALID_OTP",
                extra={"attempts_remaining": attempts_remaining}
            )

    # Match! Mark verified
    otp_request.is_verified = True
    otp_request.save(update_fields=['is_verified'])

    # Single DB transaction with select_for_update to avoid race conditions
    with transaction.atomic():
        if channel == OTPChannel.EMAIL:
            lookup = models.Q(email=clean_identifier)
        else:
            lookup = models.Q(mobile_number=clean_identifier) | models.Q(phone=clean_identifier)
        matched_user = User.objects.select_for_update().filter(lookup).first()

        # This identifier belongs to a non-customer (staff) account — never
        # let the customer-facing OTP flow authenticate into it, even though
        # it technically "matches". One phone/email = one account already
        # means a customer can't register this identifier separately either,
        # so surface that clearly instead of silently logging them in as
        # staff or hitting a raw uniqueness error on create.
        if matched_user and matched_user.role != User.Role.CUSTOMER:
            raise InvalidOTPError(
                "This phone number or email is linked to a staff account and can't be used for customer login.",
                code="IDENTIFIER_NOT_CUSTOMER"
            )

        customer = matched_user
        is_new_customer = False

        if customer:
            if channel == OTPChannel.PHONE:
                if not customer.mobile_number:
                    customer.mobile_number = clean_identifier
                    customer.save(update_fields=['mobile_number'])
                if not customer.phone:
                    customer.phone = clean_identifier
                    customer.save(update_fields=['phone'])
        else:
            is_new_customer = True
            base_username = f"cust_{clean_identifier}" if channel == OTPChannel.PHONE else f"cust_{clean_identifier.split('@')[0]}"
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            create_kwargs = dict(
                username=username,
                role=User.Role.CUSTOMER,
                profile_complete=False,
                is_active=True,
            )
            if channel == OTPChannel.PHONE:
                create_kwargs.update(mobile_number=clean_identifier, phone=clean_identifier)
            else:
                create_kwargs.update(email=clean_identifier)

            customer = User.objects.create(**create_kwargs)
            customer.set_unusable_password()
            customer.save()

        tokens = _get_tokens_for_user(customer)

        return {
            "success": True,
            "data": {
                "is_new_customer": is_new_customer,
                "profile_complete": customer.profile_complete,
                "auth_token": tokens["access"],
                "refresh_token": tokens["refresh"],
                "customer_id": customer.id
            },
            "error": None,
            "meta": {}
        }


def complete_customer_profile(customer_id: int, full_name: str, email: Optional[str] = None, phone: Optional[str] = None) -> dict:
    """
    Mandatory: full_name. One of email/phone is normally already captured
    from the OTP-verify step (whichever channel the customer logged in
    with) — the caller is responsible for requiring the *other* one here so
    a new customer ends up with both (see accounts/customer_auth.py). Each
    provided identifier is validated for format and checked for uniqueness
    against every other account before being saved.
    Sets profile_complete = True. Does NOT require location yet.
    Returns standard response envelope.
    """
    if not full_name or not str(full_name).strip():
        raise ValidationError({"detail": "full_name is required to complete customer profile."})

    clean_name = str(full_name).strip()
    parts = clean_name.split(' ')
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    try:
        customer = User.objects.get(id=customer_id, role=User.Role.CUSTOMER)
    except User.DoesNotExist:
        raise NotFound(f"Customer with ID {customer_id} not found.")

    update_fields = ['first_name', 'last_name', 'profile_complete']

    if email:
        try:
            clean_email = _normalize_email(email)
        except ValueError as e:
            raise ValidationError({"detail": str(e)})
        if User.objects.filter(email=clean_email).exclude(id=customer.id).exists():
            raise ValidationError({"detail": "This email is already linked to another account."})
        customer.email = clean_email
        update_fields.append('email')

    if phone:
        try:
            clean_phone = _normalize_mobile_number(phone)
        except ValueError as e:
            raise ValidationError({"detail": str(e)})
        if User.objects.filter(models.Q(phone=clean_phone) | models.Q(mobile_number=clean_phone)).exclude(id=customer.id).exists():
            raise ValidationError({"detail": "This phone number is already linked to another account."})
        customer.phone = clean_phone
        customer.mobile_number = clean_phone
        update_fields.extend(['phone', 'mobile_number'])

    customer.first_name = first_name
    customer.last_name = last_name
    customer.profile_complete = True
    customer.save(update_fields=update_fields)

    return {
        "success": True,
        "data": {
            "customer_id": customer.id,
            "full_name": customer.get_full_name(),
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
            "phone": customer.phone or customer.mobile_number,
            "profile_complete": True
        },
        "error": None,
        "meta": {}
    }


def create_organization_admin_user(email: str, password: str, first_name: str = "", last_name: str = "", is_superuser: bool = True, company=None):
    clean_email = email.strip().lower() if "@" in email else email.strip()
    username = clean_email
    user = User.objects.filter(models.Q(email__iexact=clean_email) | models.Q(username=username)).first()
    created = False
    if not user:
        user = User.objects.create_user(
            username=username,
            email=clean_email if "@" in clean_email else "",
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=is_superuser,
            company=company
        )
        created = True
    else:
        user.set_password(password)
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.is_superuser = is_superuser
        if company:
            user.company = company
        user.save()
    return user, created


# Re-export customer_services
from .customer_services import (
    get_customer_profile,
    update_customer_profile,
    list_saved_addresses,
    create_saved_address,
    update_saved_address,
    delete_saved_address,
    set_default_address,
    check_address_serviceability,
    mark_address_used,
)

