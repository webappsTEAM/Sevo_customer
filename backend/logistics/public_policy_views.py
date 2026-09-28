"""
logistics/public_policy_views.py

GET /api/logistics/policies/?service_category=<slug>   (public, read-only)

What a customer is told BEFORE booking about the money rules Admin has configured for
Goods Transport / Packers & Movers: cancellation fee, waiting charge, and that the fare is
finalised after delivery. It is derived only from the active policy rows -- nothing is
invented or hardcoded, and a rule Admin has not configured is simply not shown.
"""
from decimal import Decimal

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from service_requests.models import GTCancellationPolicy, GTWaitingChargePolicy
from service_requests.services.logistics_pricing import DISTANCE_PRICED_CATEGORIES, LOGISTICS_CATEGORIES


def _pick(model, category):
    return (
        model.objects.filter(service_category__iexact=category, is_active=True).first()
        or model.objects.filter(service_category="", is_active=True).first()
    )


def _rupees(value):
    d = Decimal(str(value))
    return f"₹{d.quantize(Decimal('1')) if d == d.to_integral_value() else d.quantize(Decimal('0.01'))}"


def build_policy_terms(category):
    terms = []
    cancellation = None
    cp = _pick(GTCancellationPolicy, category)
    if cp and cp.fee_mode != GTCancellationPolicy.FeeMode.NONE:
        amount = _rupees(cp.flat_fee_amount) if cp.fee_mode == GTCancellationPolicy.FeeMode.FLAT else f"{cp.percent_fee.normalize():f}% of the fare"
        when = "once a driver is assigned" if cp.applies_only_after_assignment else "on cancellation"
        text = f"Cancellation fee of {amount} applies {when}."
        if cp.grace_period_seconds:
            mins = max(1, round(cp.grace_period_seconds / 60))
            text += f" Cancel within {mins} min of assignment for free."
        terms.append(text)
        cancellation = {
            "fee_mode": cp.fee_mode, "flat_fee_amount": str(cp.flat_fee_amount), "percent_fee": str(cp.percent_fee),
            "applies_only_after_assignment": cp.applies_only_after_assignment, "grace_period_seconds": cp.grace_period_seconds,
        }
    waiting = None
    wp = _pick(GTWaitingChargePolicy, category)
    if wp and wp.is_enabled and wp.rate_per_minute and wp.rate_per_minute > 0:
        text = f"{wp.free_minutes_per_stop} min of waiting per stop is free, then {_rupees(wp.rate_per_minute)} per minute."
        if wp.max_charge_per_booking is not None:
            text += f" Waiting charges are capped at {_rupees(wp.max_charge_per_booking)} per booking."
        terms.append(text)
        waiting = {
            "free_minutes_per_stop": wp.free_minutes_per_stop, "rate_per_minute": str(wp.rate_per_minute),
            "max_charge_per_booking": None if wp.max_charge_per_booking is None else str(wp.max_charge_per_booking),
        }
    if category in DISTANCE_PRICED_CATEGORIES:
        terms.append("The final fare is confirmed after delivery, from the distance driven and stops actually made.")
    return terms, cancellation, waiting


class PublicGTPolicyView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        category = str(request.query_params.get("service_category") or "").strip().lower()
        if category not in LOGISTICS_CATEGORIES:
            return Response(
                {"success": False, "error_code": "INVALID_CATEGORY", "message": "Unknown service category."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        terms, cancellation, waiting = build_policy_terms(category)
        return Response({
            "success": True,
            "data": {"service_category": category, "terms": terms, "cancellation": cancellation, "waiting": waiting},
        })


class InsuranceTermsView(APIView):
    """
    GET /api/logistics/insurance-terms/?declared_value=25000   (public)

    What transit insurance would cost for a declared goods value -- the same helper the booking
    serializer uses, so the premium shown here is exactly what is billed. Only offered for
    goods transport (not instant Packers & Movers), and only with online / wallet payment.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from service_requests.services.insurance import (
            insurance_max_liability, insurance_offered, insurance_rate, insurance_terms,
        )
        if not insurance_offered():
            return Response({"success": True, "data": {"offered": False}})
        premium, cap = insurance_terms(request.query_params.get("declared_value"))
        if premium is None:
            return Response({"success": False, "message": "declared_value must be a positive amount."},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"success": True, "data": {
            "offered": True,
            "premium": str(premium),
            "liability_cap": str(cap),
            "rate_percent": str((insurance_rate() * 100).normalize()),
            "max_liability": str(insurance_max_liability()),
            "requires_prepaid": True,
        }})
