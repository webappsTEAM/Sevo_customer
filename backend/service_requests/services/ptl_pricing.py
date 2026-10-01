"""
service_requests/services/ptl_pricing.py

Light PTL (Part Truck Load) for Goods & Transport.

What it is: an advance-booked, slot-based variant of the ordinary Mini Truck
(goods_transport_truck) booking, priced per kg of declared cargo. It is NOT a
separate booking system: a PTL booking is a goods_transport_truck
ServiceRequest with logistics_booking_mode="ptl", so payment, tracking,
cancellation (existing GTCancellationPolicy), invoicing and dispatch run the
same code as Spot. Only the pieces below differ.

Everything is admin/database configured, nothing is hard-coded:
  * which vehicle tiers qualify   -> ServiceTier.ptl_eligible (4W+ only; the
                                     two/three-wheeler classes are refused
                                     even if ticked by mistake)
  * rate / minimum weight / floor -> GTPTLPricingPolicy (platform-wide)
  * route-specific rate           -> Lane.ptl_rate_per_kg (truck lanes)
  * time slots and capacity       -> LogisticsSlot rows with category "ptl"
                                     (or blank = all categories). There is no
                                     built-in fallback grid for PTL: no admin
                                     slot, no PTL booking.
  * city / zone availability      -> the existing service-zone route coverage
                                     engine (same call as Spot booking) plus
                                     the city of the tier and slot rows.

Loading/unloading is the customer's job on PTL (deliberate deviation from
Spot). The quote never includes the tier's loading_unloading_charge and the
booking snapshot carries loading_responsibility="customer".

Load Assist: optional paid add-on, OFF by default (policy.load_assist_enabled).
Only the config and this pricing hook exist. When enabled and requested, the
fee is priced into the quote and the snapshot records load_assist=True, but
NOTHING on the driver side acts on that flag yet (no assist task, no driver
manifest line, no payout split). Build that workflow before switching
load_assist_enabled on in production.

Quote integrity follows the GT/P&M pattern: the server computes the total, a
quote carries quote_id / quote_hash / expires_at, and the hash is an HMAC
(SECRET_KEY) over every priced input plus the pricing-config values used. At
booking or revision the server recomputes from current config: any change of
weight, route, tier, lane, add-on, rate or expiry changes the hash, and the
submitted total must equal the server-verified total.
"""
import hashlib
import logging
import math
import uuid
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from .logistics_pricing import (
    LogisticsFareBreakdown,
    UnresolvedLogisticsFareError,
    _gst_included,
    _gst_rate_str,
    _money,
)

logger = logging.getLogger(__name__)

PTL_MODE = "ptl"
PTL_SERVICE_CATEGORY = "goods_transport_truck"
PTL_PRICING_BASIS = "ptl_per_kg"
PTL_SLOT_CATEGORY = "ptl"
# Porter-style small-vehicle classes never carry part-load freight.
PTL_EXCLUDED_VEHICLE_CLASSES = {"two_wheeler", "three_wheeler"}
# Same "occupies the slot" statuses the slot availability endpoint counts.
SLOT_OCCUPYING_STATUSES = ("new_request", "assigned", "accepted", "in_progress", "scheduled",
                           "confirmed", "waiting_for_payment")
# Before a driver is on the job: the only window in which a PTL quote may be revised.
PRE_DISPATCH_STATUSES = {
    "new_request", "unassigned", "pending_payment", "waiting_for_payment",
    "confirmed", "reviewed", "requested", "rescheduled",
}
_SETTLED_PAYMENT_STATUSES = {"paid", "collected", "refunded", "partially_refunded"}
_HMAC_SALT = "sevo.gt.ptl.quote"


class PTLError(UnresolvedLogisticsFareError):
    """A PTL booking/quote is refused. Subclasses the GT fare error so the booking view's
    existing handler turns it into a clean 400."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def is_ptl(booking_or_mode):
    mode = booking_or_mode if isinstance(booking_or_mode, str) else getattr(booking_or_mode, "logistics_booking_mode", "")
    return str(mode or "").strip().lower() == PTL_MODE


def get_policy():
    from ..models import get_gt_ptl_policy
    policy = get_gt_ptl_policy()
    if policy is None or not policy.is_enabled:
        raise PTLError("PTL_DISABLED", "Part Truck Load bookings are not available right now.")
    if not (policy.rate_per_kg and policy.rate_per_kg > 0):
        raise PTLError("PTL_NOT_CONFIGURED", "Part Truck Load pricing is not configured yet.")
    return policy


def assert_tier_ptl_eligible(tier):
    if tier is None:
        raise PTLError("PTL_TIER_REQUIRED", "Please choose a vehicle for your part-load booking.")
    if getattr(tier, "category", "") != "truck":
        raise PTLError("PTL_TIER_NOT_ELIGIBLE", "Part Truck Load is only available on truck vehicles.")
    vclass = str(getattr(tier, "vehicle_class", "") or "").strip().lower()
    if vclass in PTL_EXCLUDED_VEHICLE_CLASSES:
        raise PTLError("PTL_TIER_NOT_ELIGIBLE",
                       f"'{tier.name}' cannot carry part-load freight. Choose a 4-wheeler or larger vehicle.")
    if not getattr(tier, "ptl_eligible", False) or not getattr(tier, "is_active", True):
        raise PTLError("PTL_TIER_NOT_ELIGIBLE", f"'{tier.name}' is not available for Part Truck Load.")
    if tier.get_max_weight_kg() <= 0:
        raise PTLError("PTL_TIER_NOT_ELIGIBLE", f"'{tier.name}' has no payload capacity configured.")


def eligible_tiers(city=""):
    from logistics.models import ServiceTier
    qs = ServiceTier.objects.filter(is_active=True, ptl_eligible=True, category="truck",
                                    max_weight_kg__gt=0).exclude(vehicle_class__in=PTL_EXCLUDED_VEHICLE_CLASSES)
    if city:
        qs = qs.filter(city__iexact=city)
    return qs


def _weight(value):
    try:
        w = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise PTLError("PTL_WEIGHT_INVALID", "Enter the cargo weight in kg.")
    if not w.is_finite() or w <= 0:
        raise PTLError("PTL_WEIGHT_INVALID", "Cargo weight must be greater than 0 kg.")
    return _money(w)


def _rate_for(policy, tier, lane):
    if lane is None:
        return _money(policy.rate_per_kg), "platform"
    if lane.category != "truck" or not lane.is_active:
        raise PTLError("PTL_LANE_INVALID", "The selected route is not available for Part Truck Load.")
    if str(lane.city or "").strip().lower() != str(tier.city or "").strip().lower():
        raise PTLError("PTL_LANE_INVALID", "The selected route does not start in the vehicle's city.")
    if lane.ptl_rate_per_kg is None:
        raise PTLError("PTL_LANE_INVALID", "The selected route has no Part Truck Load rate.")
    return _money(lane.ptl_rate_per_kg), "lane"


def _straight_km(a_lat, a_lng, b_lat, b_lng):
    r = 6371.0
    p1, p2 = math.radians(float(a_lat)), math.radians(float(b_lat))
    dp, dl = p2 - p1, math.radians(float(b_lng) - float(a_lng))
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _r5(v):
    return None if v in (None, "") else round(float(v), 5)


def _signature(parts):
    raw = "|".join("" if p is None else str(p) for p in parts)
    return salted_hmac(_HMAC_SALT, raw).hexdigest()[:32]


def compute_ptl_quote(*, tier, lane=None, declared_weight_kg, pickup_lat, pickup_lng,
                      drop_lat, drop_lng, load_assist=False, expires_at=None, quote_id=None,
                      declared_value=None, risk_accepted=False):
    """Server-authoritative PTL quote. Pass expires_at/quote_id to re-derive an issued quote
    (verification); omit them to issue a fresh one."""
    policy = get_policy()
    assert_tier_ptl_eligible(tier)
    weight = _weight(declared_weight_kg)
    capacity = tier.get_max_weight_kg()
    if weight > capacity:
        raise PTLError("PTL_WEIGHT_OVER_CAPACITY",
                       f"Declared weight ({weight} kg) exceeds {tier.name}'s capacity ({_money(capacity)} kg).")
    cumulative_cap = policy.ptl_cumulative_weight_cap_kg
    if cumulative_cap is not None and weight > _money(cumulative_cap):
        raise PTLError("PTL_WEIGHT_OVER_CUMULATIVE_CAP",
                       f"Declared weight ({weight} kg) exceeds the Part Truck Load consignment "
                       f"limit of {_money(cumulative_cap)} kg.")
    if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
        raise PTLError("PTL_ROUTE_REQUIRED", "Pickup and drop locations are required.")
    if _straight_km(pickup_lat, pickup_lng, drop_lat, drop_lng) <= 0.05:
        raise PTLError("ZERO_DISTANCE_ROUTE", "Pickup and drop are the same location.")
    if load_assist and not policy.load_assist_enabled:
        raise PTLError("PTL_LOAD_ASSIST_UNAVAILABLE",
                       "Load Assist is not offered for Part Truck Load. Loading and unloading are done by you.")

    rate, rate_source = _rate_for(policy, tier, lane)
    min_weight = _money(policy.minimum_chargeable_weight_kg or 0)
    chargeable = max(weight, min_weight)
    freight = _money(chargeable * rate)
    min_fare = _money(policy.minimum_fare) if policy.minimum_fare is not None else None
    minimum_fare_applied = False
    if min_fare is not None and freight < min_fare:
        freight, minimum_fare_applied = min_fare, True
    assist_fee = _money(policy.load_assist_fee or 0) if load_assist else Decimal("0.00")
    # Optional Porter-style "accepted risk" declared-value charge (porter.in/part-load-service):
    # never automatic -- only applied when the customer declared a positive consignment value AND
    # explicitly opted into the risk charge, and only when Admin has left the rate above 0.
    risk_rate = _money(policy.ptl_declared_value_risk_rate_percent or 0)
    declared_value_dec = None
    risk_charge = Decimal("0.00")
    if risk_accepted and declared_value not in (None, ""):
        try:
            declared_value_dec = _money(Decimal(str(declared_value)))
        except (InvalidOperation, TypeError, ValueError):
            raise PTLError("PTL_DECLARED_VALUE_INVALID", "Enter a valid declared consignment value.")
        if declared_value_dec > 0 and risk_rate > 0:
            risk_charge = _money(declared_value_dec * risk_rate / Decimal("100"))
    total = _money(freight + assist_fee + risk_charge)

    now = timezone.now()
    if expires_at is None:
        from .gt_operations import ops
        expires_at = (now + timedelta(minutes=int(ops("gt_quote_validity_minutes")))).isoformat()
    quote_id = quote_id or f"ptlq_{uuid.uuid4().hex[:16]}"
    quote_hash = _signature([
        quote_id, expires_at, tier.id, getattr(lane, "id", None), weight, bool(load_assist),
        _r5(pickup_lat), _r5(pickup_lng), _r5(drop_lat), _r5(drop_lng),
        rate, min_weight, min_fare, assist_fee, capacity, _gst_rate_str(tier), total,
        cumulative_cap, bool(risk_accepted), declared_value_dec, risk_rate, risk_charge,
    ])
    return LogisticsFareBreakdown(
        pricing_basis=PTL_PRICING_BASIS,
        booking_mode=PTL_MODE,
        quote_id=quote_id,
        quote_hash=quote_hash,
        quoted_at=now.isoformat(),
        expires_at=expires_at,
        tier_id=tier.id,
        tier_name=tier.name,
        vehicle_class=tier.vehicle_class or "",
        weight_class=tier.weight_class or "",
        capacity_label=tier.capacity_label or "",
        lane_id=getattr(lane, "id", None),
        pickup_lat=str(pickup_lat), pickup_lng=str(pickup_lng),
        drop_lat=str(drop_lat), drop_lng=str(drop_lng),
        declared_weight_kg=weight,
        chargeable_weight_kg=chargeable,
        minimum_chargeable_weight_kg=min_weight,
        rate_per_kg=rate,
        rate_source=rate_source,
        tier_max_weight_kg=_money(capacity),
        freight_charge=freight,
        rate_minimum_fare=min_fare,
        minimum_fare_applied=minimum_fare_applied,
        # Customer loads/unloads; never the tier's loading charge.
        loading_responsibility="customer",
        loading_unloading=Decimal("0.00"),
        loading_help=False,
        load_assist=bool(load_assist),
        load_assist_fee=assist_fee,
        # Load Assist execution (driver side) is not implemented -- see module docstring.
        load_assist_execution="not_implemented" if load_assist else None,
        ptl_declared_value=str(declared_value_dec) if declared_value_dec is not None else None,
        ptl_risk_accepted=bool(risk_accepted),
        ptl_declared_value_risk_rate_percent=str(risk_rate),
        ptl_risk_charge=risk_charge,
        ptl_cumulative_weight_cap_kg=str(cumulative_cap) if cumulative_cap is not None else None,
        total=total,
        gst_rate=_gst_rate_str(tier),
        gst_included=_gst_included(total, tier),
        is_authoritative=True,
        is_estimate=False,
        currency=tier.currency or "INR",
    )


def verify_ptl_quote(*, tier, lane, declared_weight_kg, pickup_lat, pickup_lng, drop_lat, drop_lng,
                     load_assist, quote_id, quote_hash, expires_at, submitted_amount,
                     declared_value=None, risk_accepted=False):
    """Recompute the quote from current config and check the submitted one against it.
    Returns the authoritative breakdown. With no quote_id the booking is priced fresh, but the
    submitted total must still equal the server total."""
    if quote_id or quote_hash:
        if not (quote_id and quote_hash and expires_at):
            raise PTLError("PTL_QUOTE_INVALID", "Incomplete quote. Please get a fresh quote.")
        try:
            exp = timezone.datetime.fromisoformat(str(expires_at))
            if timezone.is_naive(exp):
                exp = timezone.make_aware(exp)
        except (ValueError, TypeError):
            raise PTLError("PTL_QUOTE_INVALID", "Quote expiry is malformed. Please get a fresh quote.")
        if timezone.now() > exp:
            raise PTLError("PTL_QUOTE_EXPIRED", "This quote has expired. Please get a fresh quote.")
    breakdown = compute_ptl_quote(
        tier=tier, lane=lane, declared_weight_kg=declared_weight_kg,
        pickup_lat=pickup_lat, pickup_lng=pickup_lng, drop_lat=drop_lat, drop_lng=drop_lng,
        load_assist=load_assist, expires_at=expires_at if quote_id else None, quote_id=quote_id or None,
        declared_value=declared_value, risk_accepted=risk_accepted,
    )
    if quote_id and not constant_time_compare(str(quote_hash), breakdown["quote_hash"]):
        raise PTLError("PTL_QUOTE_MISMATCH",
                       "The weight, route or price changed since this quote. Please get a fresh quote.")
    if submitted_amount is None:
        raise PTLError("PTL_TOTAL_REQUIRED", "The quoted total is required.")
    try:
        submitted = _money(Decimal(str(submitted_amount)))
    except (InvalidOperation, TypeError, ValueError):
        raise PTLError("PTL_TOTAL_MISMATCH", f"Invalid total amount: '{submitted_amount}'.")
    if submitted != breakdown["total"]:
        raise PTLError("PTL_TOTAL_MISMATCH",
                       f"Submitted total ₹{submitted} does not match verified server total ₹{breakdown['total']}.")
    return breakdown


def ptl_inputs_from_cart(cart_data):
    """PTL fields may arrive inside cart_data (like the P&M/GT quote fields) as well as at top level."""
    src = {}
    if isinstance(cart_data, list) and cart_data and isinstance(cart_data[0], dict):
        src = cart_data[0]
    elif isinstance(cart_data, dict):
        src = cart_data
    return {
        "quote_id": src.get("quote_id"),
        "quote_hash": src.get("quote_hash"),
        "expires_at": src.get("expires_at"),
        "declared_weight_kg": src.get("declared_weight_kg"),
        "load_assist": src.get("load_assist"),
        "declared_value": src.get("declared_value") or src.get("ptl_declared_value"),
        "risk_accepted": src.get("risk_accepted") or src.get("ptl_risk_accepted"),
    }


def _truthy(v):
    if isinstance(v, bool):
        return v
    return str(v or "").strip().lower() in ("1", "true", "yes", "on")


def resolve_ptl_fare(*, service_category, logistics_tier, logistics_lane, submitted_amount,
                     pickup_lat, pickup_lng, drop_lat, drop_lng, cart_data=None,
                     declared_weight_kg=None, load_assist=None, waypoints=None):
    """resolve_logistics_fare_v2() branch for booking_mode == 'ptl'."""
    if service_category != PTL_SERVICE_CATEGORY:
        raise PTLError("PTL_CATEGORY_INVALID", "Part Truck Load is booked as a truck (goods transport) trip.")
    if waypoints:
        raise PTLError("PTL_MULTI_STOP", "Part Truck Load bookings are single pickup to single drop.")
    c = ptl_inputs_from_cart(cart_data)
    weight = declared_weight_kg if declared_weight_kg not in (None, "") else c["declared_weight_kg"]
    assist = _truthy(load_assist if load_assist is not None else c["load_assist"])
    breakdown = verify_ptl_quote(
        tier=logistics_tier, lane=logistics_lane, declared_weight_kg=weight,
        pickup_lat=pickup_lat, pickup_lng=pickup_lng, drop_lat=drop_lat, drop_lng=drop_lng,
        load_assist=assist, quote_id=c["quote_id"], quote_hash=c["quote_hash"],
        expires_at=c["expires_at"], submitted_amount=submitted_amount,
        declared_value=c["declared_value"], risk_accepted=_truthy(c["risk_accepted"]),
    )
    return breakdown["total"], breakdown


# ---------------------------------------------------------------------------
# Slots: reuse admin LogisticsSlot rows; no fallback grid for PTL.
# ---------------------------------------------------------------------------

def ptl_slots(city=""):
    from logistics.models import LogisticsSlot
    qs = LogisticsSlot.objects.filter(is_active=True).filter(
        Q(category="") | Q(category__iexact=PTL_SLOT_CATEGORY))
    city = str(city or "").strip()
    qs = qs.filter(Q(city="") | Q(city__iexact=city)) if city else qs.filter(city="")
    return qs.order_by("order", "start_time")


def validate_ptl_slot(*, preferred_date, preferred_time, city, exclude_booking_id=None, now=None):
    """Advance-only date + an admin-configured PTL slot with free capacity."""
    from ..models import ServiceRequest
    policy = get_policy()
    now = timezone.localtime(now or timezone.now())
    if preferred_date is None:
        raise PTLError("PTL_DATE_REQUIRED", "Choose a pickup date.")
    earliest = now.date() + timedelta(days=int(policy.min_advance_days or 0))
    if preferred_date < earliest:
        raise PTLError("PTL_ADVANCE_ONLY",
                       f"Part Truck Load is booked in advance. The earliest pickup date is {earliest.isoformat()}.")
    label = str(preferred_time or "").strip()
    if not label:
        raise PTLError("PTL_SLOT_REQUIRED", "Choose a pickup time slot.")
    slot = next((s for s in ptl_slots(city) if s.slot_label.strip().lower() == label.lower()), None)
    if slot is None:
        raise PTLError("PTL_SLOT_INVALID", "The selected time slot is not available for Part Truck Load.")
    if slot.capacity and slot.capacity > 0:
        qs = ServiceRequest.objects.filter(
            logistics_booking_mode=PTL_MODE, preferred_date=preferred_date,
            preferred_time__iexact=slot.slot_label, status__in=SLOT_OCCUPYING_STATUSES,
        )
        if exclude_booking_id:
            qs = qs.exclude(pk=exclude_booking_id)
        if qs.count() >= slot.capacity:
            raise PTLError("PTL_SLOT_FULL", "This time slot is fully booked. Please choose another slot.")
    return slot


# ---------------------------------------------------------------------------
# Quote revision before dispatch (weight and/or drop change).
# ---------------------------------------------------------------------------

def assert_revisable(booking):
    if not is_ptl(booking):
        raise PTLError("NOT_PTL", "Only Part Truck Load bookings can be re-quoted.")
    if (booking.status or "").lower() not in PRE_DISPATCH_STATUSES:
        raise PTLError("PTL_ALREADY_DISPATCHED", "The trip has already been dispatched; the quote can no longer change.")
    if (booking.technician_name or "").strip() or (booking.external_assignment_id or "").strip():
        raise PTLError("PTL_ALREADY_DISPATCHED", "A driver is already assigned; the quote can no longer change.")
    if (booking.payment_status or "").lower() in _SETTLED_PAYMENT_STATUSES or booking.transaction_id:
        raise PTLError("PTL_ALREADY_PAID", "This booking is already paid. Please contact support to change it.")
    # An online order already raised for the old amount could still be paid; refuse rather than
    # let the customer pay a stale total.
    if booking.payments.filter(status__in=("pending", "processing", "paid")).exists():
        raise PTLError("PTL_PAYMENT_IN_PROGRESS",
                       "A payment for this booking is in progress. Please contact support to change it.")


def _revision_inputs(booking, declared_weight_kg, drop_lat, drop_lng):
    weight = declared_weight_kg if declared_weight_kg not in (None, "") else booking.ptl_declared_weight_kg
    d_lat = drop_lat if drop_lat not in (None, "") else booking.drop_latitude
    d_lng = drop_lng if drop_lng not in (None, "") else booking.drop_longitude
    if d_lat is not None:
        d_lat = Decimal(str(d_lat)).quantize(Decimal("0.000001"))
        d_lng = Decimal(str(d_lng)).quantize(Decimal("0.000001"))
    return weight, d_lat, d_lng


def preview_ptl_revision(booking, *, declared_weight_kg=None, drop_lat=None, drop_lng=None):
    """Issue a revised quote (nothing saved). The customer confirms it with apply_ptl_revision."""
    assert_revisable(booking)
    weight, d_lat, d_lng = _revision_inputs(booking, declared_weight_kg, drop_lat, drop_lng)
    old = booking.fare_breakdown or {}
    quote = compute_ptl_quote(
        tier=booking.logistics_tier, lane=booking.logistics_lane, declared_weight_kg=weight,
        pickup_lat=booking.latitude, pickup_lng=booking.longitude, drop_lat=d_lat, drop_lng=d_lng,
        load_assist=bool(old.get("load_assist")),
        declared_value=old.get("ptl_declared_value"), risk_accepted=bool(old.get("ptl_risk_accepted")),
    )
    from .fare_reconciliation import _payable_after_adjustments
    payable, discount = _payable_after_adjustments(booking, quote["total"])
    out = dict(quote)
    out.update(old_fare=str(old.get("total") or booking.total_amount), new_payable=str(payable),
               old_payable=str(booking.total_amount), discount=str(discount))
    return out


def apply_ptl_revision(booking, user, *, declared_weight_kg=None, drop_lat=None, drop_lng=None,
                       drop_address="", quote_id=None, quote_hash=None, expires_at=None,
                       submitted_amount=None, reason=""):
    """Apply a previewed revision. The quote must verify against current config and the submitted
    total must equal the server total (same tamper rule as booking)."""
    from ..models import ServiceRequest
    from .drop_change import _is_owner_or_admin
    from .fare_reconciliation import _payable_after_adjustments

    if not _is_owner_or_admin(booking, user):
        raise PermissionError("You do not have permission to change this booking.")
    if not quote_id:
        raise PTLError("PTL_QUOTE_REQUIRED", "Get a revised quote first, then confirm it.")
    with transaction.atomic():
        booking = ServiceRequest.objects.select_for_update().get(pk=booking.pk)
        assert_revisable(booking)
        weight, d_lat, d_lng = _revision_inputs(booking, declared_weight_kg, drop_lat, drop_lng)
        old = dict(booking.fare_breakdown or {})
        quote = verify_ptl_quote(
            tier=booking.logistics_tier, lane=booking.logistics_lane, declared_weight_kg=weight,
            pickup_lat=booking.latitude, pickup_lng=booking.longitude, drop_lat=d_lat, drop_lng=d_lng,
            load_assist=bool(old.get("load_assist")), quote_id=quote_id, quote_hash=quote_hash,
            expires_at=expires_at, submitted_amount=submitted_amount,
            declared_value=old.get("ptl_declared_value"), risk_accepted=bool(old.get("ptl_risk_accepted")),
        )
        prev_drop = (booking.drop_latitude, booking.drop_longitude)
        if (d_lat, d_lng) != prev_drop:
            from . import _assert_route_stops_in_coverage
            booking.drop_latitude, booking.drop_longitude = d_lat, d_lng
            try:
                _assert_route_stops_in_coverage(booking, [])
            except ValueError as e:
                raise PTLError("OUT_OF_COVERAGE", str(e))
            if drop_address:
                booking.drop_address = str(drop_address).strip()
        history = list(old.get("ptl_revisions") or [])
        history.append({
            "revised_at": timezone.now().isoformat(),
            "revised_by": getattr(user, "id", None),
            "reason": str(reason or "")[:500],
            "old_weight_kg": str(old.get("declared_weight_kg") or booking.ptl_declared_weight_kg),
            "new_weight_kg": str(quote["declared_weight_kg"]),
            "old_drop": [str(prev_drop[0]), str(prev_drop[1])],
            "new_drop": [str(d_lat), str(d_lng)],
            "old_total": str(old.get("total")),
            "new_total": str(quote["total"]),
            "quote_id": quote["quote_id"],
        })
        from ..views import _jsonable_fare_breakdown
        snapshot = _jsonable_fare_breakdown(quote)
        snapshot["ptl_revisions"] = history
        payable, discount = _payable_after_adjustments(booking, quote["total"])
        booking.fare_breakdown = snapshot
        cart = booking.cart_data if isinstance(booking.cart_data, list) else []
        for item in cart:
            if isinstance(item, dict) and isinstance(item.get("logistics_snapshot"), dict):
                item["logistics_snapshot"] = snapshot
                item["price"] = float(quote["total"])
        booking.ptl_declared_weight_kg = quote["declared_weight_kg"]
        booking.total_amount = payable
        booking.cart_data = cart or booking.cart_data
        fields = ["fare_breakdown", "cart_data", "ptl_declared_weight_kg", "total_amount", "drop_latitude",
                  "drop_longitude", "drop_address", "updated_at"]
        if booking.coupon_id:
            booking.subtotal_amount = quote["total"]
            booking.discount_amount = discount
            booking.final_amount = payable
            fields += ["subtotal_amount", "discount_amount", "final_amount"]
        booking.save(update_fields=fields)
    logger.info("PTL re-quote on booking %s: %s -> %s", booking.pk, old.get("total"), quote["total"])
    return {"total": str(quote["total"]), "payable": str(payable), "declared_weight_kg": str(quote["declared_weight_kg"]),
            "fare_breakdown": snapshot}
