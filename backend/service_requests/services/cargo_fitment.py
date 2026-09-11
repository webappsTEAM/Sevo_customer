"""
service_requests/services/cargo_fitment.py

Authoritative cargo catalog resolution, vehicle capacity fitment evaluation,
and vehicle recommendation engine for Goods & Transport.

Guarantees:
1. Strict integer quantity validation (no silent 0 -> 1 or negative -> 1).
2. Explicit unknown and inactive item rejection (no silent dropping of cargo).
3. Bulk item resolution to eliminate N+1 database queries.
4. Server-authoritative catalog weights & volumes (client declaration cannot lower weight).
5. Deterministic vehicle fitment and capacity recommendation.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional, Tuple
from django.db.models import Q

from logistics.models import GoodsCategory, GoodsItem, ServiceTier

MAX_ITEM_QUANTITY = 500
MAX_TOTAL_QUANTITY = 1000


def _money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CargoValidationError(Exception):
    def __init__(self, message: str, code: str = "CARGO_VALIDATION_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


def resolve_cargo_payload(
    cargo_items: Optional[List[Dict[str, Any]]] = None,
    goods_category_id: Optional[int] = None,
    goods_category_slug: Optional[str] = None,
    declared_weight_kg: Optional[Any] = None,
    strict: bool = False,
) -> Dict[str, Any]:
    """
    Resolves client cargo inputs into authoritative server-side cargo attributes.
    Never trusts client-supplied weights, dimensions, or item prices.
    Returns a comprehensive cargo summary dict with validation status.
    """
    validation_errors = []
    resolved_items = []
    prohibited_item_names = []
    category_mismatches = []
    
    total_catalog_weight_kg = Decimal("0.00")
    total_cft = Decimal("0.00")
    special_handling_charge = Decimal("0.00")
    fragile_count = 0
    heavy_count = 0
    oversized_count = 0
    has_2w_incompatible_item = False

    # 1. Resolve Category
    category_obj = None
    if goods_category_id is not None:
        try:
            category_obj = GoodsCategory.objects.filter(id=int(goods_category_id)).first()
        except (ValueError, TypeError):
            category_obj = None
        if not category_obj:
            validation_errors.append({
                "error": f"Goods category ID '{goods_category_id}' does not exist in the catalog.",
                "code": "UNKNOWN_GOODS_CATEGORY",
                "field": "goods_category_id",
            })
    elif goods_category_slug:
        slug_clean = str(goods_category_slug).strip()
        category_obj = GoodsCategory.objects.filter(
            Q(slug__iexact=slug_clean) | Q(name__iexact=slug_clean)
        ).first()
        if not category_obj:
            keywords = [w.lower() for w in slug_clean.replace("/", " ").replace("-", " ").replace("_", " ").replace("&", " ").split() if len(w) > 3]
            for kw in keywords:
                cat = GoodsCategory.objects.filter(
                    Q(name__icontains=kw) | Q(slug__icontains=kw)
                ).first()
                if cat:
                    category_obj = cat
                    break
        if not category_obj:
            validation_errors.append({
                "error": f"Goods category '{slug_clean}' does not exist in the catalog.",
                "code": "UNKNOWN_GOODS_CATEGORY",
                "field": "goods_category_slug",
            })

    if category_obj and not category_obj.is_active:
        validation_errors.append({
            "error": f"Goods category '{category_obj.name}' is inactive and cannot be booked.",
            "code": "INACTIVE_GOODS_CATEGORY",
            "field": "goods_category",
        })

    category_allows_2w = category_obj.allows_two_wheeler if category_obj else True
    is_category_prohibited = bool(category_obj.is_prohibited) if category_obj else False
    if is_category_prohibited and category_obj:
        prohibited_item_names.append(f"Category: {category_obj.name}")

    if isinstance(cargo_items, dict):
        if not goods_category_id and "goods_category_id" in cargo_items:
            goods_category_id = cargo_items["goods_category_id"]
        if not goods_category_slug and "goods_category_slug" in cargo_items:
            goods_category_slug = cargo_items["goods_category_slug"]
        if declared_weight_kg is None and "declared_weight_kg" in cargo_items:
            declared_weight_kg = cargo_items["declared_weight_kg"]
        cargo_items = cargo_items.get("items") or cargo_items.get("cargo_items") or []

    # 2. Bulk load cargo items to prevent N+1 queries
    if cargo_items and isinstance(cargo_items, list):
        item_ids = []
        item_slugs = []
        for entry in cargo_items:
            if isinstance(entry, dict):
                iid = entry.get("item_id") or entry.get("id")
                islug = entry.get("item_slug") or entry.get("slug")
                if iid:
                    try:
                        item_ids.append(int(iid))
                    except (ValueError, TypeError):
                        pass
                if islug:
                    item_slugs.append(str(islug).strip())

        q_filter = Q()
        if item_ids:
            q_filter |= Q(id__in=item_ids)
        if item_slugs:
            q_filter |= Q(slug__in=item_slugs)

        items_by_id = {}
        items_by_slug = {}
        if q_filter:
            for item_row in GoodsItem.objects.filter(q_filter).select_related("category"):
                items_by_id[item_row.id] = item_row
                items_by_slug[item_row.slug] = item_row

        # 3. Validate and resolve each item
        total_items_count = 0
        for entry in cargo_items:
            if not isinstance(entry, dict):
                validation_errors.append({
                    "error": "Invalid cargo entry format: expected an item object.",
                    "code": "INVALID_CARGO_ENTRY",
                    "entry": str(entry),
                })
                continue

            iid = entry.get("item_id") or entry.get("id")
            islug = entry.get("item_slug") or entry.get("slug")
            identifier = islug or iid or "unknown"

            # Strict quantity validation
            if "quantity" not in entry and "qty" not in entry:
                validation_errors.append({
                    "error": f"Quantity is required for item '{identifier}'.",
                    "code": "INVALID_CARGO_QUANTITY",
                    "item": identifier,
                })
                continue

            raw_qty = entry.get("quantity") if "quantity" in entry else entry.get("qty")
            if raw_qty is None or raw_qty == "":
                validation_errors.append({
                    "error": f"Quantity cannot be null or empty for item '{identifier}'.",
                    "code": "INVALID_CARGO_QUANTITY",
                    "item": identifier,
                })
                continue

            try:
                if isinstance(raw_qty, float):
                    if not raw_qty.is_integer():
                        validation_errors.append({
                            "error": f"Quantity for '{identifier}' must be a whole positive integer (received {raw_qty}).",
                            "code": "INVALID_CARGO_QUANTITY",
                            "item": identifier,
                        })
                        continue
                if isinstance(raw_qty, str):
                    clean_str = raw_qty.strip()
                    if not clean_str.lstrip("-").isdigit():
                        validation_errors.append({
                            "error": f"Quantity for '{identifier}' must be a numeric integer (received '{raw_qty}').",
                            "code": "INVALID_CARGO_QUANTITY",
                            "item": identifier,
                        })
                        continue
                quantity = int(raw_qty)
            except (ValueError, TypeError):
                validation_errors.append({
                    "error": f"Invalid cargo quantity '{raw_qty}' for item '{identifier}'.",
                    "code": "INVALID_CARGO_QUANTITY",
                    "item": identifier,
                })
                continue

            if quantity <= 0:
                validation_errors.append({
                    "error": f"Quantity for item '{identifier}' must be at least 1 (received {quantity}).",
                    "code": "INVALID_CARGO_QUANTITY",
                    "item": identifier,
                })
                continue

            if quantity > MAX_ITEM_QUANTITY:
                validation_errors.append({
                    "error": f"Quantity for item '{identifier}' exceeds maximum allowable limit of {MAX_ITEM_QUANTITY} (received {quantity}).",
                    "code": "EXCESSIVE_CARGO_QUANTITY",
                    "item": identifier,
                })
                continue

            total_items_count += quantity
            if total_items_count > MAX_TOTAL_QUANTITY:
                validation_errors.append({
                    "error": f"Total cargo items count exceeds maximum booking limit of {MAX_TOTAL_QUANTITY}.",
                    "code": "EXCESSIVE_TOTAL_QUANTITY",
                })
                break

            # Resolve item from bulk cache
            item = None
            if iid:
                try:
                    item = items_by_id.get(int(iid))
                except (ValueError, TypeError):
                    item = None
            if not item and islug:
                item = items_by_slug.get(str(islug).strip())

            if not item:
                validation_errors.append({
                    "error": f"Cargo item '{identifier}' is not recognized in the Goods & Transport catalog.",
                    "code": "UNKNOWN_CARGO_ITEM",
                    "item": identifier,
                })
                continue

            if not item.is_active:
                validation_errors.append({
                    "error": f"Cargo item '{item.name}' is inactive or discontinued and cannot be booked.",
                    "code": "INACTIVE_CARGO_ITEM",
                    "item": item.slug,
                })
                continue

            if getattr(item, "is_prohibited", False):
                prohibited_item_names.append(item.name)

            # Category consistency notice
            if category_obj and item.category_id != category_obj.id:
                category_mismatches.append({
                    "item": item.name,
                    "item_category": item.category.name,
                    "selected_category": category_obj.name,
                })

            item_weight = item.default_weight_kg * quantity
            item_cft = item.default_cft * quantity
            item_sp_handling = (item.special_handling_charge * quantity) if item.requires_special_handling else Decimal("0.00")

            total_catalog_weight_kg += item_weight
            total_cft += item_cft
            special_handling_charge += item_sp_handling

            if item.is_fragile:
                fragile_count += quantity
            if item.is_heavy:
                heavy_count += quantity
            if item.is_oversized:
                oversized_count += quantity
            if not item.is_two_wheeler_compatible:
                has_2w_incompatible_item = True

            resolved_items.append({
                "item_id": item.id,
                "item_slug": item.slug,
                "name": item.name,
                "category": item.category.name,
                "category_slug": item.category.slug,
                "unit": item.unit,
                "quantity": quantity,
                "unit_weight_kg": str(item.default_weight_kg),
                "total_weight_kg": str(item_weight),
                "unit_cft": str(item.default_cft),
                "total_cft": str(item_cft),
                "is_fragile": item.is_fragile,
                "is_heavy": item.is_heavy,
                "is_oversized": item.is_oversized,
                "is_prohibited": getattr(item, "is_prohibited", False),
                "requires_special_handling": item.requires_special_handling,
                "special_handling_charge": str(item_sp_handling),
            })

    # 4. Declared Weight vs Catalog Weight
    # Rule: Catalog weight is authoritative. Customer declaration can increase weight for safety,
    # but cannot lower it below catalog weight.
    parsed_declared_weight = None
    final_weight_kg = total_catalog_weight_kg
    if declared_weight_kg is not None:
        try:
            parsed_declared_weight = Decimal(str(declared_weight_kg))
            if parsed_declared_weight < Decimal("0.00"):
                validation_errors.append({
                    "error": f"Declared weight cannot be negative (received {declared_weight_kg}).",
                    "code": "INVALID_DECLARED_WEIGHT",
                })
            else:
                if parsed_declared_weight > final_weight_kg:
                    final_weight_kg = parsed_declared_weight
        except Exception:
            validation_errors.append({
                "error": f"Invalid declared weight format '{declared_weight_kg}'.",
                "code": "INVALID_DECLARED_WEIGHT",
            })

    # 5. Two-Wheeler Compatibility Check
    is_2w_compatible = category_allows_2w and (not has_2w_incompatible_item)
    if final_weight_kg > Decimal("20.00") or total_cft > Decimal("2.50"):
        is_2w_compatible = False

    has_prohibited = len(prohibited_item_names) > 0
    if has_prohibited:
        validation_errors.append({
            "error": f"Cargo contains prohibited or hazardous goods ({', '.join(prohibited_item_names)}) that cannot be booked or transported.",
            "code": "PROHIBITED_CARGO",
        })

    is_valid = len(validation_errors) == 0

    if strict and not is_valid:
        first_err = validation_errors[0]
        raise CargoValidationError(first_err["error"], code=first_err["code"], details={"errors": validation_errors})

    return {
        "is_valid": is_valid,
        "validation_errors": validation_errors,
        "category_mismatches": category_mismatches,
        "items": resolved_items,
        "items_count": sum(it["quantity"] for it in resolved_items),
        "catalog_weight_kg": _money(total_catalog_weight_kg),
        "declared_weight_kg": _money(parsed_declared_weight) if parsed_declared_weight is not None else None,
        "total_weight_kg": _money(final_weight_kg),
        "total_cft": _money(total_cft),
        "fragile_count": fragile_count,
        "heavy_count": heavy_count,
        "oversized_count": oversized_count,
        "has_prohibited": has_prohibited,
        "prohibited_item_names": prohibited_item_names,
        "prohibited_reason": (
            f"Cargo contains prohibited or hazardous goods ({', '.join(prohibited_item_names)}) that cannot be booked or transported."
            if has_prohibited else ""
        ),
        "requires_special_handling": special_handling_charge > 0,
        "special_handling_charge": _money(special_handling_charge),
        "category_allows_two_wheeler": category_allows_2w,
        "is_two_wheeler_compatible": is_2w_compatible,
        "category_name": category_obj.name if category_obj else "",
        "category_slug": category_obj.slug if category_obj else "",
    }


def evaluate_vehicle_fitment(
    tier: ServiceTier,
    cargo_summary: Dict[str, Any],
) -> Tuple[bool, str]:
    """
    Evaluates whether the given vehicle tier can safely carry the specified cargo.
    Returns (is_fit, explanation).
    """
    if not tier:
        return False, "Vehicle tier not specified."

    if not cargo_summary.get("is_valid", True):
        first_err = cargo_summary.get("validation_errors", [{}])[0]
        return False, first_err.get("error", "Invalid cargo details.")

    if cargo_summary.get("has_prohibited", False):
        return False, cargo_summary.get("prohibited_reason") or "Cargo contains prohibited items."

    total_wt = Decimal(str(cargo_summary.get("total_weight_kg", 0)))
    total_vol = Decimal(str(cargo_summary.get("total_cft", 0)))

    # 1. Two-wheeler specific checks
    if tier.category == "two_wheeler":
        if not cargo_summary.get("is_two_wheeler_compatible", True):
            return False, "This cargo contains items or category incompatible with two-wheeler transport."
        if total_wt > Decimal("20.00"):
            return False, f"Cargo weight ({total_wt} kg) exceeds two-wheeler safety limit (20 kg)."
        if total_vol > Decimal("2.50"):
            return False, f"Cargo volume ({total_vol} CFT) exceeds two-wheeler cargo bay volume (2.50 CFT)."

    # 2. General payload and volume check against tier
    return tier.evaluate_cargo_fit(total_wt, total_vol)


def recommend_vehicles_for_cargo(
    cargo_summary: Dict[str, Any],
    city: str = "Hosur",
    vehicle_category: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates all active vehicle tiers in the city and returns:
    - recommended_tier: smallest suitable vehicle that safely accommodates the cargo
    - suitable_tiers: all tiers that can carry the cargo (sorted by capacity then price)
    - incompatible_tiers: tiers that cannot carry the cargo with reasons
    """
    if vehicle_category:
        tiers = ServiceTier.objects.filter(is_active=True, city__iexact=city, category=vehicle_category)
        if not tiers.exists():
            tiers = ServiceTier.objects.filter(is_active=True, category=vehicle_category)
    else:
        tiers = ServiceTier.objects.filter(is_active=True, city__iexact=city, category__in=["two_wheeler", "truck"])
        if not tiers.exists():
            tiers = ServiceTier.objects.filter(is_active=True, category__in=["two_wheeler", "truck"])

    suitable = []
    incompatible = []

    for tier in tiers:
        is_fit, reason = evaluate_vehicle_fitment(tier, cargo_summary)
        tier_info = {
            "id": tier.id,
            "name": tier.name,
            "slug": tier.slug,
            "category": tier.category,
            "capacity_label": tier.capacity_label,
            "dimensions_label": tier.dimensions_label,
            "max_weight_kg": str(tier.get_max_weight_kg()),
            "max_cft": str(tier.get_max_cft()),
            "starting_price": str(tier.starting_price),
            "is_fit": is_fit,
            "fitment_reason": reason,
        }
        if is_fit:
            suitable.append(tier_info)
        else:
            incompatible.append(tier_info)

    # Sort suitable vehicles:
    # 1. Smallest payload capacity (max_weight_kg)
    # 2. Smallest volume capacity (max_cft)
    # 3. Starting price
    suitable.sort(key=lambda t: (
        float(t["max_weight_kg"]),
        float(t["max_cft"]),
        float(t["starting_price"])
    ))

    # FIX #1: Never recommend an incompatible vehicle.
    # If one or more suitable vehicles exist: pick best suitable vehicle.
    # If NO vehicle is suitable: recommended_tier MUST be None.
    recommended = suitable[0] if suitable else None

    has_prohibited = cargo_summary.get("has_prohibited", False)
    is_valid = cargo_summary.get("is_valid", True)
    if not suitable:
        if not is_valid:
            first_err = (cargo_summary.get("validation_errors") or [{}])[0]
            fit_error_code = first_err.get("code", "INVALID_CARGO_DETAILS")
            fit_reason = first_err.get("error", "Invalid cargo details.")
        elif has_prohibited:
            fit_error_code = "PROHIBITED_CARGO"
            fit_reason = cargo_summary.get("prohibited_reason") or "Cargo contains prohibited or hazardous goods."
        else:
            fit_error_code = "NO_VEHICLE_FITS_CARGO"
            fit_reason = "No vehicle in our fleet can safely accommodate this cargo payload or volume."
    else:
        fit_error_code = None
        fit_reason = None

    return {
        "cargo_summary": {
            "total_weight_kg": str(cargo_summary.get("total_weight_kg", "0.00")),
            "total_cft": str(cargo_summary.get("total_cft", "0.00")),
            "items_count": cargo_summary.get("items_count", 0),
            "special_handling_charge": str(cargo_summary.get("special_handling_charge", "0.00")),
            "requires_special_handling": cargo_summary.get("requires_special_handling", False),
            "is_valid": cargo_summary.get("is_valid", True),
            "validation_errors": cargo_summary.get("validation_errors", []),
        },
        "recommended_tier": recommended,
        "suitable_tiers": suitable,
        "incompatible_tiers": incompatible,
        "has_suitable_vehicle": bool(suitable),
        "reason": fit_reason,
        "error_code": fit_error_code,
    }

