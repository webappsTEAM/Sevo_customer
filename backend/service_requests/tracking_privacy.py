"""GT Pass 6: what a *bearer tracking link* (or a socket joined with only that link) may carry.

The tracking token is forwarded freely (SMS, WhatsApp), so it is a read-only credential. It must never carry
the one-time codes that authorise a hand-over (start / delivery / cash-payment confirmation) nor a full phone number
of the customer or the receiver. The authenticated owner still gets the codes from the authenticated endpoints.
"""
OTP_KEYS = ("start_otp", "delivery_otp", "payment_confirmation_otp", "payment_otp", "otp", "cash_otp")
PHONE_KEYS = ("phone", "drop_contact_phone", "customer_phone", "receiver_phone", "contact_phone", "recipient_phone")


def mask_phone(value):
    if "*" in str(value or ""):
        return str(value)   # already masked (keeps the sanitizer idempotent)
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return ("*" * max(len(digits) - 4, 0) + digits[-4:]) if digits else ""


DRIVER_KEYS = ("technician", "driver", "technician_info", "driver_info")   # the driver's own phone stays: the customer must be able to call them


def public_tracking_safe(payload, mask_phones=True):
    """Return a copy of a tracking payload with every OTP removed and customer/receiver phones masked (recursive)."""
    if isinstance(payload, dict):
        out = {}
        for key, val in payload.items():
            if key in OTP_KEYS:
                out[key] = None
            elif mask_phones and key in PHONE_KEYS:
                out[key] = mask_phone(val)
            elif key in DRIVER_KEYS:
                out[key] = public_tracking_safe(val, mask_phones=False)
            else:
                out[key] = public_tracking_safe(val, mask_phones)
        return out
    if isinstance(payload, list):
        return [public_tracking_safe(v, mask_phones) for v in payload]
    return payload
