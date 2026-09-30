"""
Packers & Movers add-on/value-added service catalogue (Porter-documented: rope pulling,
appliance install/uninstall, electrician, carpenter, and labour/helper-only line items).

Server-authoritative: prices come only from PMAddOnService, never the client. A booking's
selected codes/quantities are validated (active, in-city, quantity within max_quantity) and
priced here; the caller adds the total on top of the base quote/fare and stores the itemised
list for the invoice and Vendor/driver view.
"""
from decimal import Decimal


def _extract_selection(cart_data):
    """cart_data is the same list/dict shape logistics_pricing.py already unpacks for P&M; the
    add-on selection travels alongside it as `pm_addons`: [{"code": "...", "quantity": N}, ...]."""
    if isinstance(cart_data, list) and cart_data and isinstance(cart_data[0], dict):
        raw = cart_data[0].get("pm_addons")
    elif isinstance(cart_data, dict):
        raw = cart_data.get("pm_addons")
    else:
        raw = None
    if not raw:
        return []
    out = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        code = str(row.get("code") or "").strip()
        if not code:
            continue
        try:
            qty = int(row.get("quantity") or 1)
        except (TypeError, ValueError):
            qty = 1
        out.append({"code": code, "quantity": max(1, qty)})
    return out


def price_pm_addons(cart_data, city, total_cft):
    """(addon_total: Decimal, line_items: list, error: str|None). error is set (and the other
    two are empty/zero) when a selected add-on code is unknown, inactive, wrong-city, or the
    quantity exceeds what's allowed -- callers surface it as the booking error rather than
    silently dropping or re-pricing the selection."""
    from logistics.models import PMAddOnService

    selection = _extract_selection(cart_data)
    if not selection:
        return Decimal("0.00"), [], None

    total = Decimal("0.00")
    items = []
    for row in selection:
        svc = PMAddOnService.objects.filter(code=row["code"], is_active=True).first()
        if not svc or (svc.city and city and svc.city.strip().lower() != str(city).strip().lower()):
            return Decimal("0.00"), [], f"'{row['code']}' is not an available add-on service."
        qty = row["quantity"] if svc.pricing_mode != PMAddOnService.PricingMode.FLAT else 1
        if qty > svc.max_quantity:
            return Decimal("0.00"), [], f"'{svc.name}' allows at most {svc.max_quantity}."
        price = svc.price_for(qty, total_cft)
        total += price
        items.append({
            "code": svc.code, "name": svc.name, "pricing_mode": svc.pricing_mode,
            "quantity": qty, "unit_price": str(svc.unit_price), "amount": str(price),
            "is_labour_only": svc.is_labour_only,
        })
    return total.quantize(Decimal("0.01")), items, None
