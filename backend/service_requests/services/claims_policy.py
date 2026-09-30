"""
Who can claim for damaged / lost goods, how much, and until when.

Insured bookings keep their existing rules (cap = the liability cap recorded at booking). The Admin
GTClaimPolicy adds, only when enabled, Porter-style liability included with every booking (the lower
of the fare and a fixed cap), a claim window measured from delivery, and a photo requirement.
"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

CLAIMABLE_CATEGORIES = ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers")


def policy_for(booking):
    from .ptl_pricing import is_ptl
    return policy_for_category(getattr(booking, "service_category", ""), is_ptl=is_ptl(booking))


def policy_for_category(category, is_ptl=False):
    """PTL bookings share service_category='goods_transport_truck' with ordinary Spot truck
    bookings, so is_ptl=True is what lets a PTL-scoped GTClaimPolicy row (applies_to_ptl=True)
    win over the generic truck row for PTL bookings; is_ptl=False (the default, and every
    non-PTL caller) never matches a PTL-scoped row, so Spot/2W/P&M behaviour is unchanged."""
    from ..models import GTClaimPolicy
    cat = str(category or "").strip().lower()
    qs = GTClaimPolicy.objects.filter(is_active=True, is_enabled=True)
    if is_ptl:
        ptl_qs = qs.filter(applies_to_ptl=True)
        pol = ptl_qs.filter(service_category__iexact=cat).first() or ptl_qs.filter(service_category="").first()
        if pol is not None:
            return pol
    qs = qs.filter(applies_to_ptl=False)
    return qs.filter(service_category__iexact=cat).first() or qs.filter(service_category="").first()


def delivered_at(booking):
    if getattr(booking, "logistics_leg", "") in ("DELIVERED", "COMPLETED") and booking.logistics_leg_updated_at:
        return booking.logistics_leg_updated_at
    return booking.updated_at


def claim_cap(booking):
    """Highest payout for this booking, or None when it cannot be claimed against at all."""
    if booking.insurance_opted_in:
        return booking.insurance_liability_cap
    pol = policy_for(booking)
    if pol is None or pol.included_liability_cap is None or booking.service_category not in CLAIMABLE_CATEGORIES:
        return None
    cap = Decimal(str(pol.included_liability_cap))
    if pol.cap_at_fare:
        cap = min(cap, Decimal(str(booking.total_amount or 0)))
    return cap


def window_ends_at(booking):
    pol = policy_for(booking)
    if pol is None or pol.claim_window_hours is None:
        return None
    return delivered_at(booking) + timedelta(hours=pol.claim_window_hours)


def claim_error(booking, photo_count=0, now=None):
    """Why a claim cannot be filed on this booking now, or None."""
    now = now or timezone.now()
    if not booking.insurance_opted_in and claim_cap(booking) is None:
        return "This booking does not have insurance coverage."
    pol = policy_for(booking)
    end = window_ends_at(booking)
    if end is not None and now > end:
        return f"The claim window for this booking has closed ({pol.claim_window_hours} hours after delivery)."
    if pol is not None and pol.require_photo and photo_count < 1:
        return "Attach at least one photo of the damage."
    return None
