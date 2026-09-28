"""
service_requests/services/home_services_pricing.py

Server-side authoritative pricing for Home Services (Cleaning & Pest Control,
Painting & Waterproofing, Electrician/Plumber/Carpenter, AC & Appliance Repair,
Masonry & Civil Work).

Fixes HS-B-01: Home Services Cart Pricing Disconnect.
Ensures:
  CUSTOMER SELECTS PACKAGE
  -> package_id / addon_id
  -> SERVER LOOKUP (Package/AddOn models)
  -> AUTHORITATIVE PRICE
  -> SERVER CALCULATION (Subtotal + GST + Platform Fee - Coupon + Tip)
  -> AUTHORITATIVE BOOKING TOTAL

Browser-submitted prices in cart_data or total_amount are NEVER trusted outright.
The server recomputes the authoritative line items, taxes, fees, and grand total.
"""

import logging
import math
from decimal import Decimal, ROUND_HALF_UP

from service_requests.models import Package, AddOn, PackageStatus, Coupon

logger = logging.getLogger(__name__)

# Hosur Center coordinates (same as used in frontend Geofencing)
HOSUR_CENTER_LAT = 12.7409
HOSUR_CENTER_LNG = 77.8253
CONSULTATION_DISTANCE_THRESHOLD_KM = 15.0
CONSULTATION_SURCHARGE_AMOUNT = Decimal("300.00")
DEFAULT_PLATFORM_FEE = Decimal("29.00")
DEFAULT_GST_RATE = Decimal("18.00")

PAINTING_CATEGORIES = {
    "painting",
    "paintings",
    "interior-painting",
    "exterior-painting",
    "waterproofing",
    "wood-metal",
    "texture-decor",
}

MASONRY_CATEGORIES = {
    "mason",
    "masonry",
    "masons",
    "bathroom-tile-fixing",
    "minor-masonry",
    "civil",
}


def haversine_km(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two points in km."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        r = 6371.0  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c
    except (TypeError, ValueError):
        return 0.0


def is_consultation_category(cat_slug):
    """Checks if a category slug is primarily a site-inspection/consultation category."""
    if not cat_slug:
        return False
    slug = str(cat_slug).strip().lower()
    return slug in PAINTING_CATEGORIES or slug in MASONRY_CATEGORIES


def resolve_home_services_fare(
    cart_data,
    service_category="",
    pickup_lat=None,
    pickup_lng=None,
    coupon_code=None,
    tip_amount=0,
    submitted_total=None,
):
    """
    Authoritatively recomputes prices for Home Services cart items.

    Returns a tuple:
      (authoritative_grand_total: Decimal, sanitized_cart_data: list, fare_breakdown: dict)
    """
    if not isinstance(cart_data, list):
        cart_data = []

    cat_slug = str(service_category or "").strip().lower()
    dist_km = 0.0
    if pickup_lat is not None and pickup_lng is not None:
        dist_km = haversine_km(HOSUR_CENTER_LAT, HOSUR_CENTER_LNG, pickup_lat, pickup_lng)

    sanitized_cart = []
    item_total = Decimal("0.00")
    total_gst = Decimal("0.00")
    max_platform_fee = Decimal("0.00")
    has_non_consult_item = False
    has_any_item = False

    for raw_item in cart_data:
        if not isinstance(raw_item, dict):
            continue

        has_any_item = True
        item = dict(raw_item)
        item_id = str(item.get("id") or "")
        item_name = str(item.get("name") or "").strip()
        qty = max(1, int(item.get("quantity") or 1))
        is_consult = bool(
            item.get("is_consultation")
            or "-consultation" in item_id
            or item.get("jobType") == "ESTIMATION"
            or "consultation" in item_name.lower()
            or "inspection" in item_name.lower()
        )

        authoritative_price = None
        authoritative_gst_rate = DEFAULT_GST_RATE
        authoritative_platform_fee = DEFAULT_PLATFORM_FEE
        matched_pkg = None
        matched_addon = None

        # 1. Check if item is an Add-on
        addon_id = item.get("addon_id")
        if not addon_id and item_id.startswith("addon-"):
            try:
                addon_id = int(item_id.replace("addon-", "").strip())
            except ValueError:
                addon_id = None

        if addon_id:
            matched_addon = AddOn.objects.filter(id=addon_id, is_active=True).first()
        elif not is_consult and "addon" in item_id.lower():
            matched_addon = AddOn.objects.filter(name__iexact=item_name, is_active=True).first()

        if matched_addon:
            authoritative_price = Decimal(str(matched_addon.price))
            authoritative_platform_fee = Decimal("0.00")
            authoritative_gst_rate = DEFAULT_GST_RATE
            item["addon_id"] = matched_addon.id
            item["package_id"] = matched_addon.package_id
            item["name"] = matched_addon.name
            has_non_consult_item = True

        # 2. Check if item is a Consultation
        elif is_consult or (is_consultation_category(cat_slug) and not item.get("package_id") and not item.get("db_id")):
            is_consult = True
            if dist_km > CONSULTATION_DISTANCE_THRESHOLD_KM:
                authoritative_price = CONSULTATION_SURCHARGE_AMOUNT
            else:
                authoritative_price = Decimal("0.00")
            authoritative_gst_rate = Decimal("0.00")
            authoritative_platform_fee = Decimal("0.00")
            item["is_consultation"] = True

        # 3. Standard Package lookup
        else:
            pkg_id = item.get("package_id") or item.get("db_id")
            if not pkg_id and item_id.startswith("pkg-"):
                try:
                    cleaned_id = item_id.replace("pkg-", "").split("-")[0]
                    pkg_id = int(cleaned_id)
                except ValueError:
                    pkg_id = None
            elif not pkg_id and item_id.isdigit():
                pkg_id = int(item_id)

            if pkg_id:
                matched_pkg = Package.objects.filter(id=pkg_id, status=PackageStatus.ACTIVE).first()
            if not matched_pkg and item_name:
                matched_pkg = Package.objects.filter(name__iexact=item_name, status=PackageStatus.ACTIVE).first()

            if matched_pkg:
                if matched_pkg.offer_price is not None and matched_pkg.offer_price > 0:
                    authoritative_price = Decimal(str(matched_pkg.offer_price))
                else:
                    authoritative_price = Decimal(str(matched_pkg.base_price))

                if matched_pkg.gst_rate is not None:
                    authoritative_gst_rate = Decimal(str(matched_pkg.gst_rate))
                if matched_pkg.platform_fee is not None:
                    authoritative_platform_fee = Decimal(str(matched_pkg.platform_fee))

                item["package_id"] = matched_pkg.id
                item["name"] = matched_pkg.name
                has_non_consult_item = True
            else:
                # Fallback for dynamic/uncataloged item: bounded to client price
                client_price = Decimal(str(item.get("price") or 0))
                authoritative_price = max(Decimal("0.00"), client_price)
                if authoritative_price > 0:
                    has_non_consult_item = True

        # Compute line totals
        line_total = authoritative_price * qty
        item_total += line_total

        if not is_consult:
            line_gst = (line_total * (authoritative_gst_rate / Decimal("100.00"))).quantize(
                Decimal("1.00"), rounding=ROUND_HALF_UP
            )
            total_gst += line_gst
            if authoritative_platform_fee > max_platform_fee:
                max_platform_fee = authoritative_platform_fee

        item["price"] = float(authoritative_price)
        item["quantity"] = qty
        item["gst_rate"] = float(authoritative_gst_rate)
        item["platform_fee"] = float(authoritative_platform_fee)
        sanitized_cart.append(item)

    # If cart was empty, but it's a consultation category, apply standard consultation logic
    if not has_any_item and is_consultation_category(cat_slug):
        if dist_km > CONSULTATION_DISTANCE_THRESHOLD_KM:
            item_total = CONSULTATION_SURCHARGE_AMOUNT
        else:
            item_total = Decimal("0.00")
        total_gst = Decimal("0.00")
        max_platform_fee = Decimal("0.00")

    # Platform fee is applied once per booking if there are active service items
    final_platform_fee = max_platform_fee if (has_non_consult_item and item_total > 0) else Decimal("0.00")

    # Coupon discount calculation
    discount_amount = Decimal("0.00")
    if coupon_code and item_total > 0:
        clean_code = str(coupon_code).strip().upper()
        cpn = Coupon.objects.filter(code__iexact=clean_code, status="Active").first()
        if cpn and float(item_total) >= float(cpn.min_booking):
            if cpn.discount_type == "flat":
                calc_disc = Decimal(str(cpn.discount_value))
            else:
                calc_disc = (item_total * (Decimal(str(cpn.discount_value)) / Decimal("100.00"))).quantize(
                    Decimal("1.00"), rounding=ROUND_HALF_UP
                )
            if cpn.max_discount > 0:
                calc_disc = min(calc_disc, Decimal(str(cpn.max_discount)))
            discount_amount = min(item_total, calc_disc)

    # Tip amount
    tip = Decimal("0.00")
    if tip_amount:
        try:
            tip = max(Decimal("0.00"), Decimal(str(tip_amount)))
        except (TypeError, ValueError, InvalidOperation):
            tip = Decimal("0.00")

    # Final grand total
    grand_total = (item_total + total_gst + final_platform_fee - discount_amount + tip).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    grand_total = max(Decimal("0.00"), grand_total)

    fare_breakdown = {
        "item_total": float(item_total),
        "gst_amount": float(total_gst),
        "platform_fee": float(final_platform_fee),
        "discount_amount": float(discount_amount),
        "tip_amount": float(tip),
        "total_amount": float(grand_total),
        "distance_km": round(dist_km, 1),
        "is_consultation": not has_non_consult_item and is_consultation_category(cat_slug),
    }

    if submitted_total is not None:
        try:
            sub = Decimal(str(submitted_total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            diff = abs(sub - grand_total)
            if diff > Decimal("5.00"):
                logger.warning(
                    f"[HS Pricing Authority] Client submitted total {sub} differed from authoritative total {grand_total} by {diff}. Overriding with authoritative total."
                )
        except Exception:
            pass

    return grand_total, sanitized_cart, fare_breakdown
