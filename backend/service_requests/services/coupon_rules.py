"""
Coupon redemption rules for Goods Transport / Packers & Movers bookings.

Admin already configures these on the Coupon record (status, start/end date,
usage limits, minimum booking, service eligibility). This module is the single
place that enforces them for a logistics booking, so the quote-time check and
the booking-time check cannot disagree. Nothing here invents a rule: every
value it compares against is a field the Admin set on the coupon.

Service eligibility: GT / P&M are not part of the home-services catalogue that
"Selected Category / Service / Package" coupons point at, so a coupon
restricted to those never applies to a logistics booking unless Admin listed the
logistics category slug (e.g. "goods_transport_truck") on it.
"""
from datetime import date

from django.db.models import Q


def _coupon_allows_category(coupon, service_category):
    eligibility = (coupon.service_eligibility or "All Services").strip().lower()
    if eligibility in ("", "all services"):
        return True
    return coupon.categories.filter(category_id__iexact=service_category).exists()


def check_logistics_coupon(coupon, *, user, amount, service_category, today=None):
    """Return (ok, error_code, message) for redeeming `coupon` on a logistics booking."""
    from service_requests.models import Coupon, CouponUsage

    today = today or date.today()
    if coupon is None or coupon.status != Coupon.Status.ACTIVE:
        return False, "INVALID_COUPON", "This coupon is not valid."
    if coupon.start_date and today < coupon.start_date:
        return False, "COUPON_NOT_STARTED", "This coupon is not active yet."
    if coupon.end_date and today > coupon.end_date:
        return False, "COUPON_EXPIRED", "This coupon has expired."
    if coupon.total_usage_limit is not None and coupon.current_usage >= coupon.total_usage_limit:
        return False, "COUPON_EXHAUSTED", "This coupon has reached its usage limit."
    if user is not None and getattr(user, "is_authenticated", False) and coupon.usage_per_customer:
        used = CouponUsage.objects.filter(coupon=coupon, customer=user).count()
        if used >= coupon.usage_per_customer:
            return False, "COUPON_ALREADY_USED", "You have already used this coupon."
    if float(amount or 0) < float(coupon.min_booking or 0):
        return False, "MIN_BOOKING_NOT_MET", f"Add Rs. {float(coupon.min_booking) - float(amount or 0):.0f} more to use {coupon.code}."
    if not _coupon_allows_category(coupon, service_category):
        return False, "COUPON_NOT_APPLICABLE", "This coupon does not apply to this service."
    return True, "", ""
