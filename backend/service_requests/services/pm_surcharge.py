"""
Packers & Movers move-date / move-time surcharge.

Rules are Admin data (logistics.PackersMoversSurchargeRule); with none configured this returns
zero and the move prices exactly as before. Used by the quote engine and, through the quote's
`surcharge_applied` signature, by booking-time verification, so a quote and the booking made
from it can never disagree about which rules applied.
"""
import re
from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP

_TIME_RE = re.compile(r"(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?")


def _money(v):
    return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_move_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not value:
        return None
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def parse_slot_start(value):
    """Start time of a slot label such as '08:00 AM - 09:00 AM' or a plain '14:30'."""
    if isinstance(value, time):
        return value
    if not value:
        return None
    m = _TIME_RE.search(str(value))
    if not m:
        return None
    hour, minute, mer = int(m.group(1)), int(m.group(2) or 0), (m.group(3) or "").lower()
    if mer == "pm" and hour < 12:
        hour += 12
    elif mer == "am" and hour == 12:
        hour = 0
    if hour > 23 or minute > 59:
        return None
    return time(hour, minute)


def _matches(rule, move_date, move_time):
    t = rule.rule_type
    if t == "WEEKDAY":
        days = {int(x) for x in (rule.weekdays or "").split(",") if x.strip() != ""}
        return move_date is not None and move_date.weekday() in days
    if t == "DAY_OF_MONTH":
        if move_date is None or not rule.day_from or not rule.day_to:
            return False
        d = move_date.day
        if rule.day_from <= rule.day_to:
            return rule.day_from <= d <= rule.day_to
        return d >= rule.day_from or d <= rule.day_to          # wraps month end, e.g. 28..3
    if t == "DATE":
        return move_date is not None and rule.on_date == move_date
    if t == "OUTSIDE_HOURS":
        # Cannot judge a time that was not given; never surcharge on a guess.
        return move_time is not None and not (rule.window_start <= move_time < rule.window_end)
    return False


def applicable_rules(city, move_date, move_slot):
    from logistics.models import PackersMoversSurchargeRule
    d = parse_move_date(move_date)
    t = parse_slot_start(move_slot)
    out = []
    for rule in PackersMoversSurchargeRule.objects.filter(is_active=True).order_by("id"):
        if rule.city and str(rule.city).strip().lower() != str(city or "").strip().lower():
            continue
        if _matches(rule, d, t):
            out.append(rule)
    return out


def rule_signature(rules):
    """Stable, comparable fingerprint of what applied (ids + amounts)."""
    return [[r.id, str(_money(r.percent)), str(_money(r.flat_amount))] for r in rules]


def compute_surcharge(base_amount, rules):
    """(total surcharge, itemised lines) for `rules` on the pre-tax `base_amount`."""
    base = Decimal(str(base_amount))
    lines, total = [], Decimal("0.00")
    for r in rules:
        amount = _money(base * (Decimal(str(r.percent)) / Decimal("100")) + Decimal(str(r.flat_amount)))
        if amount <= 0:
            continue
        lines.append({"rule_id": r.id, "name": r.name, "amount": str(amount)})
        total += amount
    return _money(total), lines
