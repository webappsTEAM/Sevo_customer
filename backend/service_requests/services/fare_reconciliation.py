"""
service_requests/services/fare_reconciliation.py

GT-C-01: reconcile the fare quoted at booking against what the trip
actually turned out to be, and record the difference explainably.

The estimate half comes from ServiceRequest.fare_breakdown, written at
booking time by services/logistics_pricing.quote_logistics_fare()
(GT-B-01). The actual half is assembled here, at completion, entirely
from server-side facts:

  - the distance actually travelled, if the vendor app reported one
    (re-priced through the SAME tier rates the estimate used, so the
    comparison is like-for-like and a rate change between booking and
    completion cannot silently move the number);
  - stops actually visited, from TripStop.completed_at -- real recorded
    progress, not a claim in the completion payload;
  - additional work the customer already approved, from the existing
    WorkExtension flow, which is the mechanism CALTRACK_PHASE_14 H.1
    explicitly designates for deviations.

Nothing here trusts a client-supplied amount. A completion payload can
report a measured distance (a fact about the trip) but never a price.

Every adjustment is itemised, so the delta is explainable line by line
rather than being one unexplained difference on an invoice.
"""
import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction

from .logistics_pricing import (
    DISTANCE_PRICED_CATEGORIES,
    STANDARD_STOP_COUNT,
    _money,
)

logger = logging.getLogger(__name__)


def _dec(value, default=Decimal("0.00")):
    if value is None:
        return default
    try:
        return _money(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return default


def _approved_extensions_total(booking):
    """
    Sum of extra work the customer has actually approved.

    Only CUSTOMER_ACCEPTED / RESOLVED extensions count: an extension that
    is merely pending, admin-approved-but-not-yet-accepted, rejected or
    declined has not been agreed by the person paying, so it must not
    appear in their final fare.
    """
    from ..models import WorkExtension

    agreed = (WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.RESOLVED)
    total = Decimal("0.00")
    for ext in booking.work_extensions.filter(status__in=agreed):
        amount = ext.final_customer_amount or ext.admin_approved_amount or Decimal("0.00")
        total += _dec(amount)
    return _money(total)


def _completed_stop_count(booking):
    """
    How many stops the driver actually completed, from recorded per-stop
    progress (GT-D-01). Returns None when the booking has no TripStop
    rows at all -- the ordinary single-pickup/single-drop shape, which by
    definition has no extra stops to charge for.
    """
    stops = booking.trip_stops.all()
    if not stops.exists():
        return None
    return stops.exclude(completed_at=None).count()


def reconcile_booking_fare(booking, actual_distance_km=None, notes=""):
    """
    Build (or refresh) the FareReconciliation row for one booking.

    Returns the FareReconciliation, or None when there is nothing to
    reconcile -- a non-distance-priced booking, or one that was never
    given a server-computed estimate in the first place. Returning None
    is not an error; it means "this booking's flat price stands".

    Idempotent: re-running for the same booking updates the existing row
    rather than accumulating duplicates, because the completion webhook
    can retry.
    """
    from ..models import FareReconciliation

    if booking.service_category not in DISTANCE_PRICED_CATEGORIES:
        return None

    estimate = booking.fare_breakdown or {}
    if not estimate:
        # Flat-priced booking: no itemised quote to reconcile against.
        return None

    estimated_amount = _dec(estimate.get("total"))
    adjustments = []
    final_amount = estimated_amount

    # --- 1. Distance actually travelled -------------------------------
    quoted_km = _dec(estimate.get("distance_km"))
    actual_km = _dec(actual_distance_km, default=None) if actual_distance_km is not None else None
    if actual_km is not None and actual_km != quoted_km:
        # Re-price the difference using the SAME per-km rate the estimate
        # used, recovered from the stored quote. Reading the tier's
        # current rate instead would let a rate change between booking and
        # completion silently alter an already-locked fare.
        quoted_chargeable = _dec(estimate.get("chargeable_km"))
        quoted_distance_charge = _dec(estimate.get("distance_charge"))
        if quoted_chargeable > 0:
            effective_rate = _money(quoted_distance_charge / quoted_chargeable)
        else:
            effective_rate = Decimal("0.00")

        # The free-km allowance was already consumed by the quote, so the
        # extra distance is charged at the plain rate.
        extra_km = _money(actual_km - quoted_km)
        distance_adjustment = _money(extra_km * effective_rate)
        if distance_adjustment != 0:
            final_amount = _money(final_amount + distance_adjustment)
            adjustments.append({
                "code": "DISTANCE_VARIANCE",
                "label": (
                    f"Route was {abs(extra_km)} km "
                    f"{'longer' if extra_km > 0 else 'shorter'} than quoted"
                ),
                "amount": str(distance_adjustment),
                "source": "measured_trip_distance",
                "quoted_km": str(quoted_km),
                "actual_km": str(actual_km),
                "rate_applied": str(effective_rate),
            })

    # --- 2. Stops actually visited ------------------------------------
    completed_stops = _completed_stop_count(booking)
    if completed_stops is not None:
        quoted_extra = int(estimate.get("additional_stops") or 0)
        actual_extra = max(0, completed_stops - STANDARD_STOP_COUNT)
        if actual_extra != quoted_extra:
            quoted_stop_charge = _dec(estimate.get("additional_stop_charge"))
            per_stop = (
                _money(quoted_stop_charge / quoted_extra) if quoted_extra > 0
                else _dec(getattr(booking.logistics_tier, "additional_stop_charge", 0))
            )
            stop_adjustment = _money(per_stop * (actual_extra - quoted_extra))
            if stop_adjustment != 0:
                final_amount = _money(final_amount + stop_adjustment)
                adjustments.append({
                    "code": "STOP_VARIANCE",
                    "label": f"{actual_extra} extra stop(s) completed, {quoted_extra} quoted",
                    "amount": str(stop_adjustment),
                    "source": "recorded_stop_progress",
                    "quoted_extra_stops": quoted_extra,
                    "actual_extra_stops": actual_extra,
                })

    # --- 3. Additional work the customer approved ---------------------
    extensions_total = _approved_extensions_total(booking)
    if extensions_total != 0:
        final_amount = _money(final_amount + extensions_total)
        adjustments.append({
            "code": "APPROVED_EXTRA_WORK",
            "label": "Additional work approved by the customer",
            "amount": str(extensions_total),
            "source": "work_extension",
        })

    # --- 4. Never charge below the tier's floor -----------------------
    minimum_fare = _dec(estimate.get("minimum_fare"), default=None) if estimate.get("minimum_fare") else None
    if minimum_fare is not None and final_amount < minimum_fare:
        floor_adjustment = _money(minimum_fare - final_amount)
        final_amount = minimum_fare
        adjustments.append({
            "code": "MINIMUM_FARE",
            "label": "Minimum fare applied",
            "amount": str(floor_adjustment),
            "source": "tier_minimum",
        })

    delta = _money(final_amount - estimated_amount)
    final_breakdown = dict(estimate)
    final_breakdown["total"] = str(final_amount)

    with transaction.atomic():
        recon, _created = FareReconciliation.objects.update_or_create(
            booking=booking,
            defaults=dict(
                estimated_amount=estimated_amount,
                final_amount=final_amount,
                delta=delta,
                estimated_breakdown=estimate,
                final_breakdown=final_breakdown,
                adjustments=adjustments,
                notes=notes or "",
            ),
        )
        # Only touch what the rest of the system charges against when the
        # reconciliation genuinely resolves to a different number.
        if delta != 0 and booking.total_amount != final_amount:
            booking.total_amount = final_amount
            booking.save(update_fields=["total_amount", "updated_at"])

    return recon
