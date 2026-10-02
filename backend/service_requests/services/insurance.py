"""
Transit insurance terms for goods-transport bookings -- one place that turns a declared goods value
into a premium and a liability cap, used by the booking serializer AND the pre-booking preview so
the customer is shown exactly what will be billed.

Rate and ceiling come from the Admin GTInsurancePolicy when one exists, else the Django settings (INSURANCE_RATE, INSURANCE_MAX_LIABILITY). Porter
publishes neither, so there is no built-in claim of parity here; they are business inputs.

SEVO-ONLY FEATURE: Porter offers no goods-in-transit insurance product whatsoever (its
terms tell customers to self-insure), so this module has no Porter feature to achieve
parity with -- it is a SEVO value-add layered on top of the Porter-parity claim policy
(GTClaimPolicy / get_gt_claim_policy), not a replacement for it. Both can be configured
at once: GTClaimPolicy is the baseline included liability every booking gets; this module
prices an optional higher cap the customer pays extra for.
"""
from decimal import Decimal

from django.conf import settings

_CENT = Decimal("0.01")


def _policy():
    """The Admin GTInsurancePolicy override, or None (settings apply)."""
    try:
        from ..models import GTInsurancePolicy
        return GTInsurancePolicy.objects.filter(is_active=True).order_by("-id").first()
    except Exception:
        return None


def insurance_offered():
    p = _policy()
    return True if p is None else bool(p.is_offered)


def insurance_rate():
    p = _policy()
    if p is not None:
        return Decimal(str(p.premium_percent)) / Decimal("100")
    return Decimal(str(getattr(settings, "INSURANCE_RATE", "0.02")))


def insurance_max_liability():
    p = _policy()
    if p is not None:
        return Decimal(str(p.max_liability))
    return Decimal(str(getattr(settings, "INSURANCE_MAX_LIABILITY", "500000")))


def insurance_terms(declared_value):
    """(premium, liability_cap) for a declared value, or (None, None) when it is not a positive number."""
    if not insurance_offered():
        return None, None
    try:
        value = Decimal(str(declared_value))
    except Exception:
        return None, None
    if value <= 0:
        return None, None
    return (value * insurance_rate()).quantize(_CENT), min(value, insurance_max_liability()).quantize(_CENT)
