"""
service_requests/services/drop_change.py

GT en-route destination change (Porter parity).

Porter's goods-transport FAQ: "Please ask the driver to proceed to the new
location. We will automatically calculate the new price based on the new
drop location." SEVO could not do this: set_trip_stops() deliberately
refuses any route edit once a driver is assigned, and nothing else could
move the drop point of a live trip. The completion-time fare
reconciliation already re-prices a *measured* distance variance, but the
booking's drop address/coordinates -- what the driver app navigates to,
what live tracking targets and what the invoice prints -- could never
change.

Rules (all server-side; the client supplies a place, never a price):
  * distance-priced goods-transport bookings only (same set that the
    reconciliation engine re-prices);
  * only while the trip is live (not completed/cancelled/closed...);
  * single-drop bookings only -- a multi-stop route is a TripStop list and
    has its own edit flow; silently rewriting its final stop mid-trip is
    out of scope here;
  * the new drop must pass the same route-coverage engine booking uses;
  * the new route (pickup -> new drop) is routed by the same routing
    service the quote uses, and the distance difference is re-priced at the
    per-km rate LOCKED into the stored quote -- exactly the rule
    fare_reconciliation applies -- so a tier rate edit after booking cannot
    move the fare. The tier minimum fare recorded in the quote is honoured.
  * what the customer pays is recomputed with the same coupon/insurance
    rules as reconciliation (_payable_after_adjustments).
  * every change is appended to fare_breakdown["drop_changes"] as an
    itemised, explainable audit row.

No change fee is applied: Porter's public material documents none, so
inventing one would be an unbacked charge.

At completion, reconcile_booking_fare() compares the measured distance
against the *updated* quote, so the final invoice reflects the final route.
"""
import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from .logistics_pricing import DISTANCE_PRICED_CATEGORIES, _money
from .fare_reconciliation import _dec, _payable_after_adjustments

logger = logging.getLogger(__name__)

# Statuses in which the trip is over (or never going to happen): no re-route.
CLOSED_STATUSES = {
    "proof_submitted", "completed", "awaiting_verification", "verified",
    "feedback_pending", "feedback_received", "closed", "rejected",
    "cancelled", "unable_to_complete", "draft",
}


class DropChangeError(ValueError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def _coord(value, lo, hi, name):
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise DropChangeError("INVALID_COORDINATES", f"Invalid {name}: {value!r}")
    if not (lo <= d <= hi):
        raise DropChangeError("INVALID_COORDINATES", f"{name} {d} is out of range.")
    return d.quantize(Decimal("0.000001"))


def _is_owner_or_admin(booking, user):
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "role", "").upper() == "ADMIN" or getattr(user, "is_superuser", False):
        return True
    return booking.customer_id is not None and booking.customer_id == user.id


def _resolve(drop_address, drop_lat, drop_lng):
    """Coordinates if given, else server-side geocode of the address (same as set_trip_stops)."""
    if drop_lat in (None, "") or drop_lng in (None, ""):
        addr = str(drop_address or "").strip()
        if not addr:
            raise DropChangeError("VALIDATION_ERROR", "A drop address or coordinates are required.")
        from .address_service import AddressService
        geo = AddressService.resolve_address_coordinates(street_address=addr)
        if not geo or geo.get("latitude") is None or geo.get("longitude") is None:
            raise DropChangeError("GEOCODE_FAILED", f"Could not locate '{addr}'. Please pick a more precise address.")
        drop_lat, drop_lng = geo["latitude"], geo["longitude"]
    return _coord(drop_lat, -90, 90, "latitude"), _coord(drop_lng, -180, 180, "longitude")


def preview_drop_change(booking, *, drop_lat=None, drop_lng=None, drop_address=""):
    """Price a prospective drop change without saving anything."""
    lat, lng = _resolve(drop_address, drop_lat, drop_lng)
    return _compute(booking, lat, lng)


def _compute(booking, new_lat, new_lng):
    if booking.service_category not in DISTANCE_PRICED_CATEGORIES:
        raise DropChangeError("NOT_SUPPORTED", "Drop location can only be changed on goods-transport trips.")
    if getattr(booking, "logistics_booking_mode", "") == "ptl":
        # PTL is per-kg; its route/weight changes go through the pre-dispatch re-quote
        # (services/ptl_pricing.apply_ptl_revision), not the per-km en-route re-price.
        raise DropChangeError(
            "PTL_USE_REQUOTE",
            "For a Part Truck Load booking, change the drop through 'Revise quote' before the driver is assigned.",
        )
    if (booking.status or "").lower() in CLOSED_STATUSES:
        raise DropChangeError("TRIP_CLOSED", "This trip is no longer active; its drop location cannot be changed.")
    if booking.trip_stops.exists():
        raise DropChangeError(
            "MULTI_STOP_BOOKING",
            "This is a multi-stop trip; please contact support to change its route.",
        )
    estimate = booking.fare_breakdown or {}
    if not estimate or None in (booking.latitude, booking.longitude):
        raise DropChangeError("NO_QUOTE", "This booking has no server quote to re-price against.")

    from .routing import get_route_eta
    leg = get_route_eta(booking.latitude, booking.longitude, new_lat, new_lng)
    if not leg or leg.get("distance_km") is None:
        raise DropChangeError("ROUTING_FAILED", "Could not route to the new drop location. Please try again.")
    new_km = _money(str(leg["distance_km"]))

    old_km = _dec(estimate.get("distance_km"))
    old_total = _dec(estimate.get("total"))
    chargeable = _dec(estimate.get("chargeable_km"))
    dist_charge = _dec(estimate.get("distance_charge"))
    rate = _money(dist_charge / chargeable) if chargeable > 0 else _dec(estimate.get("rate_per_km"))

    delta_km = _money(new_km - old_km)
    adjustment = _money(delta_km * rate)
    new_total = _money(old_total + adjustment)
    minimum = _dec(estimate.get("rate_minimum_fare"), default=None)
    if minimum is None:
        minimum = _dec(estimate.get("minimum_fare"), default=None)
    minimum_applied = False
    if minimum is not None and minimum > 0 and new_total < minimum:
        new_total = minimum
        minimum_applied = True
    payable, discount = _payable_after_adjustments(booking, new_total)
    return {
        "old_distance_km": str(old_km),
        "new_distance_km": str(new_km),
        "delta_km": str(delta_km),
        "rate_applied": str(rate),
        "fare_adjustment": str(_money(new_total - old_total)),
        "old_fare": str(old_total),
        "new_fare": str(new_total),
        "minimum_fare_applied": minimum_applied,
        "old_payable": str(_dec(booking.total_amount)),
        "new_payable": str(payable),
        "discount": str(discount),
        "distance_source": leg.get("source"),
        "_chargeable_km": chargeable,
        "_dist_charge": dist_charge,
        "_new_lat": new_lat,
        "_new_lng": new_lng,
    }


def change_drop_location(booking, user, *, drop_address, drop_lat, drop_lng, reason=""):
    """
    Move a live trip's drop point and re-price it. Returns the public
    summary dict (no private keys). Raises PermissionError / DropChangeError.
    """
    from ..models import ServiceRequest

    if not _is_owner_or_admin(booking, user):
        raise PermissionError("You do not have permission to change this booking's drop location.")
    drop_address = str(drop_address or "").strip()
    if not drop_address:
        raise DropChangeError("VALIDATION_ERROR", "A drop address is required.")
    new_lat, new_lng = _resolve(drop_address, drop_lat, drop_lng)

    with transaction.atomic():
        booking = ServiceRequest.objects.select_for_update().get(pk=booking.pk)
        result = _compute(booking, new_lat, new_lng)

        # Same coverage engine booking/route edits use, against the NEW drop.
        from . import _assert_route_stops_in_coverage
        prev = (booking.drop_latitude, booking.drop_longitude)
        booking.drop_latitude, booking.drop_longitude = new_lat, new_lng
        try:
            _assert_route_stops_in_coverage(booking, [])
        except ValueError as e:
            booking.drop_latitude, booking.drop_longitude = prev
            raise DropChangeError("OUT_OF_COVERAGE", str(e))

        estimate = dict(booking.fare_breakdown or {})
        delta_km = Decimal(result["delta_km"])
        rate = Decimal(result["rate_applied"])
        history = list(estimate.get("drop_changes") or [])
        history.append({
            "changed_at": timezone.now().isoformat(),
            "changed_by": getattr(user, "id", None),
            "reason": str(reason or "")[:500],
            "from_address": booking.drop_address,
            "from_lat": str(prev[0]) if prev[0] is not None else None,
            "from_lng": str(prev[1]) if prev[1] is not None else None,
            "to_address": drop_address,
            "to_lat": str(new_lat),
            "to_lng": str(new_lng),
            **{k: v for k, v in result.items() if not k.startswith("_")},
        })
        estimate.update({
            "distance_km": result["new_distance_km"],
            "chargeable_km": str(_money(max(Decimal("0"), result["_chargeable_km"] + delta_km))),
            "distance_charge": str(_money(max(Decimal("0"), result["_dist_charge"] + delta_km * rate))),
            "drop_lat": float(new_lat),
            "drop_lng": float(new_lng),
            "total": result["new_fare"],
            "drop_changes": history,
        })
        booking.fare_breakdown = estimate
        booking.drop_address = drop_address
        fields = ["fare_breakdown", "drop_address", "drop_latitude", "drop_longitude",
                  "total_amount", "updated_at"]
        booking.total_amount = Decimal(result["new_payable"])
        if booking.coupon_id:
            booking.subtotal_amount = Decimal(result["new_fare"])
            booking.discount_amount = Decimal(result["discount"])
            booking.final_amount = Decimal(result["new_payable"])
            fields += ["subtotal_amount", "discount_amount", "final_amount"]
        booking.save(update_fields=fields)

    logger.info("GT drop change on booking %s: %s -> %s km, fare %s -> %s",
                booking.pk, result["old_distance_km"], result["new_distance_km"],
                result["old_fare"], result["new_fare"])
    out = {k: v for k, v in result.items() if not k.startswith("_")}
    out["drop_address"] = drop_address
    return out
