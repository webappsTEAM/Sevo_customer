"""
service_requests/services/packers_movers_pricing.py

SEVO Packers & Movers — Complete Relocation Estimation & Quoting Engine.
Implements database-backed inventory itemization, volume (CFT) calculation,
ServiceTier vehicle recommendation, packing tier estimation, floor/lift labor
adjustments, furniture dismantling/reassembly, and server-authoritative
quote snapshot generation with cryptographic cache integrity.

FINAL PRODUCTION CLOSURE:
- ZERO hardcoded vehicle sizing table (purely ServiceTier DB).
- ZERO keyword heuristics (GoodsItem DB is authoritative).
- ZERO fake distance fallbacks (genuine Haversine straight-line estimate if routing fails).
- ZERO hardcoded pricing fallbacks (rates come strictly from ServiceTier and PackersMoversConfig).
- CITY-SPECIFIC configuration (City A config != City B config).
- CRYPTOGRAPHICALLY REQUEST-BOUND quotes (any mutation of tier, route, inventory, or options is rejected).
"""

import math
import uuid
import logging
import hashlib
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from datetime import timedelta
from typing import Dict, Any, List, Optional, Tuple

from django.core.cache import cache
from django.core import signing
from django.utils import timezone
from django.db.models import Q

from .logistics_pricing import _money, _PAISE

logger = logging.getLogger(__name__)


def _format_db_goods_item(db_item) -> Dict[str, Any]:
    """
    Formats an authoritative GoodsItem record from the database.
    SEVO Micro-Correction 1: GoodsItem capacity MUST FAIL CLOSED.
    Instant-bookable catalog items require default_cft > 0 AND default_weight_kg > 0.
    If either is missing/zero/None: is_known=False, requires_review=True, source='database_unconfigured'.
    Zero manufactured dimensions (no 1.0 CFT or 5.0 KG).
    """
    cft_raw = db_item.default_cft
    weight_raw = db_item.default_weight_kg
    cft_val = float(cft_raw) if cft_raw is not None else None
    weight_val = float(weight_raw) if weight_raw is not None else None

    if getattr(db_item, "is_prohibited", False):
        return {
            "goods_item_id": db_item.id,
            "slug": db_item.slug or "",
            "name": db_item.name,
            "category": db_item.category.name if db_item.category else "Prohibited",
            "cft": cft_val,
            "weight_kg": weight_val,
            "fragile": bool(db_item.is_fragile),
            "dismantle": False,
            "dismantle_charge": 0.0,
            "is_known": False,
            "is_heavy": bool(getattr(db_item, "is_heavy", False)),
            "is_oversized": bool(getattr(db_item, "is_oversized", False)),
            "is_prohibited": True,
            "is_active": bool(getattr(db_item, "is_active", True)),
            "requires_review": True,
            "source": "prohibited_goods",
            "review_reason": f"GoodsItem '{db_item.name}' (#{db_item.id}) is classified as prohibited cargo and cannot be transported.",
        }

    if cft_val is None or cft_val <= 0 or weight_val is None or weight_val <= 0:
        return {
            "goods_item_id": db_item.id,
            "slug": db_item.slug or "",
            "name": db_item.name,
            "category": db_item.category.name if db_item.category else "Unconfigured",
            "cft": cft_val,
            "weight_kg": weight_val,
            "fragile": bool(db_item.is_fragile),
            "dismantle": bool(db_item.requires_special_handling or (db_item.special_handling_charge and db_item.special_handling_charge > 0)),
            "dismantle_charge": float(db_item.special_handling_charge or 0.0),
            "is_known": False,
            "is_heavy": bool(getattr(db_item, "is_heavy", False)),
            "is_oversized": bool(getattr(db_item, "is_oversized", False)),
            "is_prohibited": False,
            "is_active": bool(getattr(db_item, "is_active", True)),
            "requires_review": True,
            "source": "database_unconfigured",
            "review_reason": f"GoodsItem '{db_item.name}' (#{db_item.id}) has unconfigured dimensions (CFT={cft_val}, weight={weight_val}kg). Physical survey or admin configuration required.",
        }

    return {
        "goods_item_id": db_item.id,
        "slug": db_item.slug or "",
        "name": db_item.name,
        "category": db_item.category.name if db_item.category else "Miscellaneous",
        "cft": cft_val,
        "weight_kg": weight_val,
        "fragile": bool(db_item.is_fragile),
        "dismantle": bool(db_item.requires_special_handling or (db_item.special_handling_charge and db_item.special_handling_charge > 0)),
        "dismantle_charge": float(db_item.special_handling_charge or 0.0),
        "is_known": True,
        "is_heavy": bool(getattr(db_item, "is_heavy", False)),
        "is_oversized": bool(getattr(db_item, "is_oversized", False)),
        "is_prohibited": False,
        "is_active": bool(getattr(db_item, "is_active", True)),
        "requires_review": False,
        "source": "database",
    }


def match_catalog_item(item_name: str, goods_item_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Finds catalog attributes for item_name or goods_item_id purely via database GoodsItem.
    SEVO P0 Rule: GoodsItem DB is the SOLE authority.
    No static canonical catalog dictionary. No keyword substring heuristics.
    Unknown items return is_known=False and requires_review=True.
    """
    from logistics.models import GoodsItem

    if goods_item_id is not None:
        try:
            db_item = GoodsItem.objects.filter(id=int(goods_item_id), is_active=True).select_related("category").first()
            if db_item:
                return _format_db_goods_item(db_item)
        except (ValueError, TypeError) as e:
            logger.debug("Invalid goods_item_id '%s': %s", goods_item_id, e)

    key = str(item_name or "").strip()
    if not key:
        return {
            "goods_item_id": None,
            "slug": "",
            "name": "",
            "category": "Uncataloged",
            "cft": None,
            "weight_kg": None,
            "fragile": False,
            "dismantle": False,
            "dismantle_charge": 0.0,
            "is_known": False,
            "requires_review": True,
            "source": "unavailable",
        }

    try:
        slug_key = key.lower().replace(" ", "-").replace("/", "-")
        db_item = GoodsItem.objects.filter(
            Q(name__iexact=key) | Q(slug__iexact=slug_key),
            is_active=True
        ).select_related("category").first()

        if db_item:
            return _format_db_goods_item(db_item)
    except Exception as e:
        logger.debug("Database GoodsItem lookup exception: %s", e)

    # SEVO Part 7 Rule: NO KEYWORD HEURISTICS!
    # Unknown/custom items remain unknown (is_known=False) and require explicit review/survey.
    return {
        "goods_item_id": None,
        "slug": "",
        "name": key,
        "category": "Uncataloged",
        "cft": None,
        "weight_kg": None,
        "fragile": False,
        "dismantle": False,
        "dismantle_charge": 0.0,
        "is_known": False,
        "requires_review": True,
        "source": "unavailable",
    }


def calculate_inventory_metrics(inventory: Any) -> Dict[str, Any]:
    """
    Parses inventory lines (dict or list) into total volume, weight, counts,
    and detailed line item breakdowns.
    SEVO P0 Rule: For known catalog items, server DB values ALWAYS WIN.
    Client-supplied cft/weight_kg are strictly ignored for known items to prevent tampering.
    """
    items_list = []
    total_cft = 0.0
    total_weight = 0.0
    total_count = 0
    fragile_count = 0
    dismantlable_count = 0
    total_dismantle_cost = Decimal("0.00")
    requires_review = False
    has_uncataloged = False
    unrecognized_items = []

    if isinstance(inventory, dict):
        if "items" in inventory and isinstance(inventory["items"], list):
            raw_items = inventory["items"]
        else:
            raw_items = [{"name": k, "quantity": v} for k, v in inventory.items()]
    elif isinstance(inventory, list):
        raw_items = inventory
    else:
        raw_items = []

    for item in raw_items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("item") or item.get("item_name") or "").strip()
        try:
            qty = int(item.get("quantity") or item.get("qty") or 1)
        except (ValueError, TypeError):
            qty = 1
        if qty <= 0:
            continue

        g_id = item.get("goods_item_id") or item.get("id")
        meta = match_catalog_item(name, goods_item_id=g_id)
        is_known = meta.get("is_known", False)
        has_custom_dims = (item.get("cft") is not None and item.get("weight_kg") is not None)

        slug_resolved = meta.get("slug") or ""
        if is_known:
            # SERVER-AUTHORITATIVE FOR KNOWN CATALOG ITEMS:
            # Client cannot alter weight, CFT, fragility, or dismantle rules. DB values ALWAYS WIN!
            unit_cft = float(meta["cft"])
            unit_weight = float(meta["weight_kg"])
            is_fragile = bool(meta.get("fragile", False))
            can_dismantle = bool(meta.get("dismantle", False))
            dismantle_charge = Decimal(str(meta.get("dismantle_charge", 0)))
            item_name_resolved = meta.get("name") or name
            goods_item_id_resolved = meta.get("goods_item_id")
            dims_source = "database"
        else:
            has_uncataloged = True
            # Custom / Uncataloged / Unconfigured items: require explicit survey/review flow
            if meta.get("source") == "database_unconfigured":
                unit_cft = 0.0
                unit_weight = 0.0
                dims_source = "unconfigured_in_database"
                requires_review = True
                goods_item_id_resolved = meta.get("goods_item_id")
                item_name_resolved = meta.get("name") or name
                unrecognized_items.append(f"{item_name_resolved} (unconfigured dimensions)")
            elif has_custom_dims:
                try:
                    cft_val = float(item.get("cft"))
                    wt_val = float(item.get("weight_kg"))
                    if cft_val > 0 and wt_val > 0:
                        unit_cft = cft_val
                        unit_weight = wt_val
                        dims_source = "customer_custom_dimensions"
                    else:
                        unit_cft = 0.0
                        unit_weight = 0.0
                        dims_source = "unavailable"
                except (ValueError, TypeError):
                    unit_cft = 0.0
                    unit_weight = 0.0
                    dims_source = "unavailable"
                requires_review = True
                unrecognized_items.append(name)
                goods_item_id_resolved = None
                item_name_resolved = name
            else:
                unit_cft = 0.0
                unit_weight = 0.0
                dims_source = "unavailable"
                requires_review = True
                unrecognized_items.append(name)
                goods_item_id_resolved = None
                item_name_resolved = name
            is_fragile = bool(item.get("fragile", False))
            can_dismantle = bool(item.get("dismantle", False))
            dismantle_charge = Decimal(str(item.get("dismantle_charge") or 0))

        line_cft = round(unit_cft * qty, 2)
        line_weight = round(unit_weight * qty, 2)

        total_cft += line_cft
        total_weight += line_weight
        total_count += qty

        if is_fragile:
            fragile_count += qty
        if can_dismantle:
            dismantlable_count += qty
            total_dismantle_cost += _money(dismantle_charge * qty)

        items_list.append({
            "goods_item_id": goods_item_id_resolved,
            "slug": slug_resolved,
            "name": item_name_resolved,
            "category": meta["category"],
            "is_known": is_known,
            "has_custom_dimensions": has_custom_dims,
            "dims_source": dims_source,
            "quantity": qty,
            "unit_cft": unit_cft,
            "total_cft": line_cft,
            "unit_weight_kg": unit_weight,
            "total_weight_kg": line_weight,
            "is_fragile": is_fragile,
            "can_dismantle": can_dismantle,
            "unit_dismantle_charge": str(dismantle_charge),
            "total_dismantle_charge": str(_money(dismantle_charge * qty)),
            "is_heavy": meta.get("is_heavy", False),
            "is_oversized": meta.get("is_oversized", False),
            "is_prohibited": meta.get("is_prohibited", False),
            "is_active": meta.get("is_active", True),
        })

    total_cft = round(total_cft, 1)
    total_weight = round(total_weight, 1)

    return {
        "items": items_list,
        "total_cft": total_cft,
        "total_weight_kg": total_weight,
        "total_count": total_count,
        "fragile_count": fragile_count,
        "dismantlable_count": dismantlable_count,
        "default_dismantle_cost": total_dismantle_cost,
        "requires_review": requires_review,
        "has_uncataloged": has_uncataloged,
        "unrecognized_items": unrecognized_items,
    }


def _tier_to_vehicle_dict(tier) -> Dict[str, Any]:
    """
    Maps an authoritative ServiceTier model record into a vehicle pricing descriptor.
    SEVO Part 6 Rule: NO hardcoded pricing fallbacks (25.00, 3.00, 400/700/1100).
    Everything derives from the database ServiceTier.
    """
    max_cft = float(tier.get_max_cft())
    payload_kg = float(tier.get_max_weight_kg())
    base_fare = tier.base_fare if tier.base_fare is not None else tier.starting_price
    per_km = tier.per_km_rate if tier.per_km_rate is not None else Decimal("0.00")
    free_km = tier.free_km if tier.free_km is not None else Decimal("0.00")
    base_labor = tier.loading_unloading_charge if (tier.loading_unloading_charge and tier.loading_unloading_charge > 0) else Decimal("0.00")
    db_crew = getattr(tier, "crew_size", None)
    if db_crew:
        crew_size = int(db_crew)
    else:
        # Informational derived display value only. Zero effect on pricing calculation.
        crew_size = 2 if max_cft <= 250 else (3 if max_cft <= 500 else (4 if max_cft <= 750 else 5))
    return {
        "code": tier.slug,
        "name": tier.name,
        "max_cft": max_cft,
        "payload_kg": payload_kg,
        "base_fare": base_fare,
        "per_km_rate": per_km,
        "free_km": free_km,
        "base_labor": base_labor,
        "crew_size": crew_size,
        "tier_id": tier.id,
        "is_custom": False,
    }


def recommend_vehicle_for_volume(
    volume_cft: float,
    weight_kg: float = 0.0,
    city: str = "Hosur",
    service_tier_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Selects appropriate transport vehicle based on total move volume (CFT), payload weight (kg), and city.
    SEVO Part 2 Micro-Correction:
    - ServiceTier must be active, match requested city, and have explicit DB category == 'packers_movers'.
    - Truck/two-wheeler/other category tiers are strictly rejected even if ID exists in city.
    - Capacity must be configured (max_cft > 0, max_weight_kg > 0).
    - Requested volume and weight must not exceed max_cft and max_weight_kg.
    - Automatic recommendation only searches active 'packers_movers' tiers in the city.
    """
    try:
        from logistics.models import ServiceTier

        if service_tier_id:
            tier = ServiceTier.objects.filter(id=int(service_tier_id)).first()
            if not tier:
                return None
            if not tier.is_active:
                return None
            if not tier.city or tier.city.strip().lower() != city.strip().lower():
                return None
            if tier.category != "packers_movers":
                return None
            max_cft = tier.get_max_cft()
            max_weight = tier.get_max_weight_kg()
            if max_cft <= 0 or max_weight <= 0:
                return None
            if Decimal(str(volume_cft)) > max_cft:
                return None
            if Decimal(str(weight_kg)) > max_weight:
                return None
            return _tier_to_vehicle_dict(tier)

        pm_tiers = list(ServiceTier.objects.filter(
            is_active=True,
            city__iexact=city,
            category="packers_movers",
        ))
        valid_tiers = [t for t in pm_tiers if t.get_max_cft() > 0 and t.get_max_weight_kg() > 0]
        # Sort primarily by volume capacity, secondarily by payload weight
        valid_tiers.sort(key=lambda t: (float(t.get_max_cft()), float(t.get_max_weight_kg())))

        for t in valid_tiers:
            if float(t.get_max_cft()) >= volume_cft and float(t.get_max_weight_kg()) >= weight_kg:
                return _tier_to_vehicle_dict(t)

        return None
    except Exception as e:
        logger.warning("Error resolving ServiceTier for P&M volume and weight: %s", e)
        return None


def compute_packers_movers_quote(
    *,
    pickup_lat: float,
    pickup_lng: float,
    drop_lat: float,
    drop_lng: float,
    inventory: Any,
    city: str = "Hosur",
    packing_tier: str = "standard",
    dismantling_required: bool = True,
    unpacking_required: bool = False,
    pickup_floor: int = 0,
    pickup_has_lift: bool = True,
    drop_floor: int = 0,
    drop_has_lift: bool = True,
    relocation_type: str = "Within City",
    service_tier_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Server-authoritative calculation for a complete relocation booking.
    Returns the comprehensive quotation breakdown dictionary.
    """
    from .routing import get_route_eta
    route = get_route_eta(pickup_lat, pickup_lng, drop_lat, drop_lng)
    route_dist = route.get("distance_km") if route else None
    if route is not None and route_dist is not None:
        try:
            distance_km = _money(str(route_dist))
            is_distance_estimated = bool(route.get("is_estimate", False) or not route.get("is_authoritative", True))
            distance_source = route.get("source") or route.get("distance_source") or ("google_maps" if not is_distance_estimated else "route_estimate")
        except (ValueError, TypeError):
            route_dist = None

    if route is None or route_dist is None:
        # P0-3: Compute genuine straight-line Haversine distance from coordinates with 1.25 winding factor.
        # ZERO arbitrary / fake distances (5.0, 8.50, 10, etc.).
        if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
            raise ValueError("Valid pickup and drop coordinates are required to calculate distance.")
        d_lat = math.radians(drop_lat - pickup_lat)
        d_lng = math.radians(drop_lng - pickup_lng)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(pickup_lat))
            * math.cos(math.radians(drop_lat))
            * math.sin(d_lng / 2) ** 2
        )
        c_dist = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        earth_radius_km = 6371.0
        straight_km = earth_radius_km * c_dist
        # Apply 1.25 road winding estimation factor to genuine Haversine distance
        distance_km = _money(Decimal(str(round(max(0.1, straight_km * 1.25), 2))))
        distance_source = "straight_line_estimate"
        is_distance_estimated = True

    # 2. Inventory Metrics
    metrics = calculate_inventory_metrics(inventory)
    total_cft = metrics["total_cft"]
    total_weight = metrics["total_weight_kg"]

    # P1-1: No arbitrary 30.0 CFT floor. Effective CFT is genuine total CFT.
    effective_cft = total_cft
    is_empty_inventory = bool(effective_cft <= 0 or metrics.get("total_count", 0) == 0)

    # 3. Vehicle Sizing (ServiceTier-backed with BOTH CFT and Weight)
    vehicle = recommend_vehicle_for_volume(
        effective_cft,
        weight_kg=total_weight,
        city=city,
        service_tier_id=service_tier_id,
    )
    no_vehicle_available = False
    capacity_exceeded = False
    if vehicle is None:
        if service_tier_id:
            capacity_exceeded = True
        no_vehicle_available = True
        vehicle = {
            "code": "survey_required",
            "name": "Custom Fleet / Survey Required",
            "max_cft": 0.0,
            "payload_kg": 0.0,
            "base_fare": None,
            "per_km_rate": None,
            "free_km": None,
            "base_labor": None,
            "crew_size": 0,
            "tier_id": None,
            "is_custom": True,
        }

    # 4. Pricing Calculation: Fail Closed if No Vehicle Available, Empty Inventory, Missing Config, or Uncataloged Items
    from logistics.models import PackersMoversConfig
    pm_conf = PackersMoversConfig.objects.filter(is_active=True, city__iexact=city).first()
    city_config_missing = pm_conf is None
    has_unrecognized = bool(metrics.get("requires_review", False))

    if (no_vehicle_available or is_empty_inventory) and not has_unrecognized:
        # SEVO: No vehicle or empty inventory must NEVER produce ₹0 quote.
        # Total, subtotal, GST, transport_total, distance_charge, and labor_total must all be None.
        free_km = Decimal("0.00")
        chargeable_km = Decimal("0.00")
        base_fare = None
        per_km_rate = None
        distance_charge = None
        transport_total = None

        standard_packing_rate = None
        premium_packing_rate = None
        premium_fragile_fee = None
        rate_per_floor_block = None
        unpacking_rate = None
        gst_percentage = None
        survey_cft_limit = float(pm_conf.survey_cft_threshold) if pm_conf else 0.0

        packing_clean = (packing_tier or "standard").lower().strip()
        packing_charge = None
        packing_rate_per_cft = None
        packing_label = (
            "Pricing Unavailable (Inventory Survey Required)"
            if is_empty_inventory
            else "Pricing Unavailable (Vehicle Required)"
        )
        base_labor = None
        crew_size = 0
        pickup_floor_charge = None
        drop_floor_charge = None
        floor_labor_total = None
        total_labor = None
        dismantle_total = None
        unpacking_charge = None
        subtotal = None
        gst = None
        total = None

        survey_status = "SURVEY_REQUIRED"
        requires_survey = True
        is_authoritative = False
        is_estimate = True
        if is_empty_inventory:
            estimate_notice = (
                "Empty or zero-volume relocation inventory provided. "
                "Inventory catalog configuration or a pre-move physical survey is required."
            )
        elif capacity_exceeded and service_tier_id:
            estimate_notice = (
                f"Selected vehicle tier #{service_tier_id} cannot carry requested load "
                f"({effective_cft:.1f} CFT, {total_weight:.1f} kg) in {city}. "
                "A survey is required or an eligible Packers & Movers tier must be selected."
            )
        else:
            estimate_notice = (
                f"Relocation volume ({effective_cft:.1f} CFT) or payload ({total_weight:.1f} kg) "
                f"exceeds available vehicle capacity in {city}. "
                "A pre-move survey is required to arrange multi-truck dispatch or custom transport."
            )
        review_reason = estimate_notice

    elif pm_conf and not has_unrecognized and not city_config_missing:
        # Normal Pricing Calculation
        free_km = vehicle["free_km"]
        chargeable_km = max(Decimal("0.00"), distance_km - free_km)
        base_fare = vehicle["base_fare"]
        per_km_rate = vehicle["per_km_rate"]
        distance_charge = _money(chargeable_km * per_km_rate)
        transport_total = _money(base_fare + distance_charge)

        standard_packing_rate = pm_conf.standard_packing_rate_cft
        premium_packing_rate = pm_conf.premium_packing_rate_cft
        premium_fragile_fee = pm_conf.premium_fragile_addon
        rate_per_floor_block = pm_conf.floor_rate_no_lift_per_100cft
        unpacking_rate = pm_conf.unpacking_rate_cft
        gst_percentage = pm_conf.gst_rate
        survey_cft_limit = float(pm_conf.survey_cft_threshold)

        # 5. Packing Charges
        packing_clean = (packing_tier or "standard").lower().strip()
        if packing_clean in ("no_packing", "none", "customer_packed"):
            packing_charge = Decimal("0.00")
            packing_rate_per_cft = Decimal("0.00")
            packing_label = "No Packing (Customer Packed)"
        elif packing_clean == "premium":
            packing_rate_per_cft = premium_packing_rate
            fragile_addon = premium_fragile_fee * metrics["fragile_count"]
            packing_charge = _money((Decimal(str(effective_cft)) * packing_rate_per_cft) + fragile_addon)
            packing_label = "Premium 4-Layer Fragile Packing"
        else:
            packing_clean = "standard"
            packing_rate_per_cft = standard_packing_rate
            packing_charge = _money(Decimal(str(effective_cft)) * packing_rate_per_cft)
            packing_label = "Standard Multi-Layer Protective Packing"

        # 6. Labor & Floor Surcharge
        base_labor = vehicle["base_labor"]
        crew_size = vehicle["crew_size"]

        cft_blocks = max(1, math.ceil(effective_cft / 100.0))
        pickup_floor_charge = Decimal("0.00")
        if not pickup_has_lift and pickup_floor > 0:
            pickup_floor_charge = _money(Decimal(str(pickup_floor)) * rate_per_floor_block * Decimal(str(cft_blocks)))

        drop_floor_charge = Decimal("0.00")
        if not drop_has_lift and drop_floor > 0:
            drop_floor_charge = _money(Decimal(str(drop_floor)) * rate_per_floor_block * Decimal(str(cft_blocks)))

        floor_labor_total = _money(pickup_floor_charge + drop_floor_charge)
        total_labor = _money(base_labor + floor_labor_total)

        # 7. Dismantling & Reassembly
        dismantle_total = Decimal("0.00")
        if dismantling_required:
            dismantle_total = _money(metrics["default_dismantle_cost"])

        # 8. Unpacking
        unpacking_charge = Decimal("0.00")
        if unpacking_required:
            unpacking_charge = _money(Decimal(str(effective_cft)) * unpacking_rate)

        # 9. Subtotal & GST
        subtotal = _money(
            transport_total
            + packing_charge
            + total_labor
            + dismantle_total
            + unpacking_charge
        )
        gst = _money(subtotal * gst_percentage)
        total = _money(subtotal + gst)

        requires_volume_survey = bool(
            survey_cft_limit > 0 and (
                (total_cft > survey_cft_limit)
                or ("between" in relocation_type.lower() and total_cft > (survey_cft_limit * 0.75))
            )
        )
        requires_survey = bool(requires_volume_survey or is_distance_estimated)

        if is_distance_estimated:
            survey_status = "SURVEY_REQUIRED"
            is_authoritative = False
            is_estimate = True
            estimate_notice = (
                "Road distance could not be determined accurately (estimated straight-line distance used). "
                "Fare is an estimate and a pre-move survey is required before final confirmation."
            )
            review_reason = estimate_notice
        elif requires_volume_survey:
            survey_status = "SURVEY_REQUIRED"
            is_authoritative = False
            is_estimate = True
            estimate_notice = (
                "Large relocation volume requires a pre-move physical or video survey to confirm crew and truck sizing."
            )
            review_reason = estimate_notice
        else:
            survey_status = "INSTANT_ESTIMATE_APPROVED"
            is_authoritative = True
            is_estimate = False
            estimate_notice = None
            review_reason = None

    else:
        # FAIL CLOSED: Missing city configuration or uncataloged inventory
        free_km = vehicle["free_km"] if vehicle.get("free_km") is not None else Decimal("0.00")
        chargeable_km = max(Decimal("0.00"), distance_km - free_km)
        base_fare = vehicle["base_fare"]
        per_km_rate = vehicle["per_km_rate"]
        distance_charge = _money(chargeable_km * per_km_rate) if (base_fare is not None and per_km_rate is not None) else None
        transport_total = _money(base_fare + distance_charge) if (base_fare is not None and distance_charge is not None) else None

        standard_packing_rate = None
        premium_packing_rate = None
        premium_fragile_fee = None
        rate_per_floor_block = None
        unpacking_rate = None
        gst_percentage = None
        survey_cft_limit = float(pm_conf.survey_cft_threshold) if pm_conf else 0.0

        packing_clean = (packing_tier or "standard").lower().strip()
        packing_charge = None
        packing_rate_per_cft = None
        packing_label = "Pricing Unavailable"
        base_labor = vehicle["base_labor"]
        crew_size = vehicle["crew_size"]
        pickup_floor_charge = None
        drop_floor_charge = None
        floor_labor_total = None
        total_labor = None
        dismantle_total = None
        unpacking_charge = None
        subtotal = None
        gst = None
        total = None

        requires_survey = True
        is_authoritative = False
        is_estimate = True

        if city_config_missing:
            survey_status = "SURVEY_REQUIRED"
            estimate_notice = f"Packers & Movers pricing configuration is unavailable for '{city}'."
            review_reason = estimate_notice
        elif has_unrecognized:
            survey_status = "MANUAL_REVIEW_REQUIRED"
            estimate_notice = (
                f"Uncataloged or unconfigured items detected ({', '.join(metrics.get('unrecognized_items', []))}). "
                "Manual review or survey required before final pricing."
            )
            review_reason = estimate_notice

    # SEVO Part K: Differentiate Instant Bookable Price Lock vs Survey Estimate
    if is_authoritative and not is_estimate and survey_status == "INSTANT_ESTIMATE_APPROVED" and total is not None:
        # Price-locked instant-booking quote valid for 30 minutes
        valid_until = timezone.now() + timedelta(minutes=30)
        cache_timeout = 1800  # 30 mins
    else:
        # Non-binding relocation estimate valid for 48 hours for survey scheduling
        valid_until = timezone.now() + timedelta(hours=48)
        cache_timeout = 172800  # 48 hours

    quote_id = f"PMQ-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    # SEVO Part 4/6 Micro-Correction: Bind quote to all authoritative GoodsItem attributes
    inventory_items_sorted = []
    item_snapshots = []
    for it in metrics["items"]:
        g_id = it.get("goods_item_id") or ""
        qty = it.get("quantity") or 1
        name_clean = str(it.get("name") or "").strip().lower()
        slug_clean = str(it.get("slug") or "").strip().lower()
        u_cft = it.get("unit_cft")
        u_wt = it.get("unit_weight_kg")
        frag = int(bool(it.get("is_fragile")))
        dism = int(bool(it.get("can_dismantle")))
        dism_charge = str(it.get("unit_dismantle_charge") or "0.00")

        inventory_items_sorted.append(
            f"{g_id}:{slug_clean}:{name_clean}:{qty}:{u_cft}:{u_wt}:{frag}:{dism}:{dism_charge}"
        )
        item_snapshots.append({
            "goods_item_id": it.get("goods_item_id"),
            "slug": it.get("slug"),
            "name": it.get("name"),
            "category": it.get("category"),
            "quantity": qty,
            "default_cft": u_cft,
            "default_weight_kg": u_wt,
            "unit_cft": u_cft,
            "unit_weight_kg": u_wt,
            "dims_source": it.get("dims_source", "database"),
            "is_fragile": bool(it.get("is_fragile")),
            "requires_special_handling": bool(it.get("can_dismantle")),
            "special_handling_charge": dism_charge,
            "is_heavy": bool(it.get("is_heavy", False)),
            "is_oversized": bool(it.get("is_oversized", False)),
            "is_prohibited": bool(it.get("is_prohibited", False)),
            "is_active": bool(it.get("is_active", True)),
        })
    inventory_items_sorted.sort()
    canonical_inv_str = ";".join(inventory_items_sorted)

    # SEVO Part 6 Micro-Correction: Complete pricing configuration fingerprint
    if pm_conf:
        pm_conf_sig = (
            f"{pm_conf.id}:"
            f"{pm_conf.standard_packing_rate_cft}:"
            f"{pm_conf.premium_packing_rate_cft}:"
            f"{pm_conf.premium_fragile_addon}:"
            f"{pm_conf.floor_rate_no_lift_per_100cft}:"
            f"{pm_conf.unpacking_rate_cft}:"
            f"{pm_conf.gst_rate}:"
            f"{pm_conf.survey_cft_threshold}"
        )
    else:
        pm_conf_sig = "no_config"

    from logistics.models import ServiceTier, GoodsItem
    tier_obj = ServiceTier.objects.filter(id=vehicle.get("tier_id")).first() if vehicle.get("tier_id") else None
    if tier_obj:
        tier_sig = (
            f"{tier_obj.id}:"
            f"{tier_obj.base_fare}:"
            f"{tier_obj.starting_price}:"
            f"{tier_obj.per_km_rate}:"
            f"{tier_obj.free_km}:"
            f"{tier_obj.loading_unloading_charge}:"
            f"{tier_obj.additional_stop_charge}:"
            f"{tier_obj.surge_multiplier}:"
            f"{tier_obj.minimum_fare}:"
            f"{tier_obj.max_cft}:"
            f"{tier_obj.max_weight_kg}"
        )
    else:
        tier_sig = f"{vehicle.get('tier_id')}:{vehicle.get('base_fare')}:{vehicle.get('per_km_rate')}:{vehicle.get('free_km')}:{vehicle.get('base_labor')}"

    # GoodsItem catalog attributes hash
    # Note on is_two_wheeler_compatible: Packers & Movers operations exclusively use commercial
    # trucks and pickup vehicles (never two-wheelers). Two-wheeler compatibility is therefore
    # strictly outside P&M quote authority and is intentionally omitted to avoid spurious invalidation.
    goods_item_ids = [it["goods_item_id"] for it in metrics["items"] if it.get("goods_item_id")]
    goods_db_rows = list(GoodsItem.objects.filter(id__in=goods_item_ids).order_by("id"))
    goods_db_sig_parts = []
    for g in goods_db_rows:
        goods_db_sig_parts.append(
            f"{g.id}:{g.slug}:{g.category_id}:{g.default_cft}:{g.default_weight_kg}:"
            f"{int(bool(g.is_fragile))}:{int(bool(getattr(g, 'is_heavy', False)))}:"
            f"{int(bool(getattr(g, 'is_oversized', False)))}:{int(bool(getattr(g, 'is_prohibited', False)))}:"
            f"{int(bool(g.requires_special_handling))}:{g.special_handling_charge}:{int(bool(g.is_active))}"
        )
    goods_catalog_sig = ";".join(goods_db_sig_parts) if goods_db_sig_parts else "no_goods_items"

    pricing_config_fingerprint = hashlib.sha256(
        f"{pm_conf_sig}|{tier_sig}|{goods_catalog_sig}".encode("utf-8")
    ).hexdigest()[:20]

    raw_quote_str = (
        f"{vehicle.get('tier_id')}:{city.lower()}:"
        f"{round(float(pickup_lat), 5)},{round(float(pickup_lng), 5)}->"
        f"{round(float(drop_lat), 5)},{round(float(drop_lng), 5)}:"
        f"{canonical_inv_str}:{packing_clean}:{bool(dismantling_required)}:{bool(unpacking_required)}:"
        f"{int(pickup_floor)}:{bool(pickup_has_lift)}:{int(drop_floor)}:{bool(drop_has_lift)}:"
        f"{relocation_type.lower()}:{pricing_config_fingerprint}:{str(total)}"
    )
    quote_hash = hashlib.sha256(raw_quote_str.encode("utf-8")).hexdigest()[:24]

    # Process-independent cryptographic signature token binding all quote inputs and config fingerprint
    signature_token = signing.dumps({
        "quote_id": quote_id,
        "quote_hash": quote_hash,
        "pricing_config_fingerprint": pricing_config_fingerprint,
        "service_category": "packers_movers",
        "city": city,
        "tier_id": vehicle.get("tier_id"),
        "pickup_lat": round(float(pickup_lat), 5),
        "pickup_lng": round(float(pickup_lng), 5),
        "drop_lat": round(float(drop_lat), 5),
        "drop_lng": round(float(drop_lng), 5),
        "inventory_str": canonical_inv_str,
        "total_cft": total_cft,
        "total_weight_kg": total_weight,
        "packing_tier": packing_clean,
        "dismantling_required": bool(dismantling_required),
        "unpacking_required": bool(unpacking_required),
        "pickup_floor": int(pickup_floor),
        "pickup_has_lift": bool(pickup_has_lift),
        "drop_floor": int(drop_floor),
        "drop_has_lift": bool(drop_has_lift),
        "relocation_type": str(relocation_type),
        "distance_km": str(distance_km),
        "subtotal": str(subtotal) if subtotal is not None else None,
        "total": str(total) if total is not None else None,
        "valid_until": valid_until.isoformat(),
    })

    breakdown = {
        "quote_id": quote_id,
        "quote_hash": quote_hash,
        "signature_token": signature_token,
        "pricing_config_fingerprint": pricing_config_fingerprint,
        "service_category": "packers_movers",
        "relocation_type": relocation_type,
        "city": city,
        "city_config_missing": city_config_missing,
        "tier_id": vehicle.get("tier_id"),
        "capacity_exceeded": capacity_exceeded,
        "requires_survey": requires_survey,
        "requires_review": bool(has_unrecognized or is_empty_inventory),
        "survey_status": survey_status,
        "is_authoritative": is_authoritative,
        "is_estimate": is_estimate,
        "estimate_notice": estimate_notice,
        "unrecognized_items": metrics.get("unrecognized_items", []),
        "review_reason": review_reason,
        "valid_until": valid_until.isoformat(),
        "total": total,
        "subtotal": subtotal,
        "total_cft": total_cft,
        "total_weight_kg": total_weight,
        "distance_km": distance_km,
        "distance_source": distance_source,
        "chargeable_km": chargeable_km,
        "distance_charge": distance_charge,
        "base_fare": base_fare,
        "additional_stops": 0,
        "additional_stop_charge": Decimal("0.00"),
        "rate_additional_stop": Decimal("0.00"),
        "rate_per_km": per_km_rate,
        "free_km": free_km,
        "currency": "INR",
        # Inventory Summary
        "inventory_summary": {
            "total_items": metrics["total_count"],
            "total_cft": total_cft,
            "effective_cft": effective_cft,
            "total_weight_kg": metrics["total_weight_kg"],
            "fragile_count": metrics["fragile_count"],
            "dismantlable_count": metrics["dismantlable_count"],
            "items": metrics["items"],
        },
        "item_snapshots": item_snapshots,
        # Recommended Vehicle
        "vehicle": {
            "code": vehicle["code"],
            "name": vehicle["name"],
            "tier_id": vehicle.get("tier_id"),
            "crew_size": crew_size,
            "payload_kg": vehicle["payload_kg"],
            "base_fare": str(vehicle["base_fare"]),
            "per_km_rate": str(vehicle["per_km_rate"]),
            "free_km": str(vehicle["free_km"]),
        },
        # Distance & Route
        "route": {
            "pickup_lat": float(pickup_lat),
            "pickup_lng": float(pickup_lng),
            "drop_lat": float(drop_lat),
            "drop_lng": float(drop_lng),
            "distance_km": str(distance_km),
            "chargeable_km": str(chargeable_km),
            "distance_source": distance_source,
            "is_authoritative": is_authoritative,
            "is_estimate": is_estimate,
            "estimate_notice": estimate_notice,
        },
        # Floors & Access
        "access": {
            "pickup_floor": int(pickup_floor),
            "pickup_has_lift": bool(pickup_has_lift),
            "pickup_floor_charge": str(pickup_floor_charge) if pickup_floor_charge is not None else None,
            "drop_floor": int(drop_floor),
            "drop_has_lift": bool(drop_has_lift),
            "drop_floor_charge": str(drop_floor_charge) if drop_floor_charge is not None else None,
            "rate_per_floor_block": str(rate_per_floor_block) if rate_per_floor_block is not None else None,
        },
        # Itemized Cost Breakdown
        "pricing": {
            "transport_base_fare": str(base_fare) if base_fare is not None else None,
            "transport_distance_charge": str(distance_charge) if distance_charge is not None else None,
            "transport_total": str(transport_total) if transport_total is not None else None,
            "packing_tier": packing_clean,
            "packing_label": packing_label,
            "packing_rate_per_cft": str(packing_rate_per_cft) if packing_rate_per_cft is not None else None,
            "packing_charge": str(packing_charge) if packing_charge is not None else None,
            "base_labor_charge": str(base_labor) if base_labor is not None else None,
            "floor_labor_charge": str(floor_labor_total) if floor_labor_total is not None else None,
            "labor_total": str(total_labor) if total_labor is not None else None,
            "dismantling_required": bool(dismantling_required),
            "dismantling_charge": str(dismantle_total) if dismantle_total is not None else None,
            "unpacking_required": bool(unpacking_required),
            "unpacking_charge": str(unpacking_charge) if unpacking_charge is not None else None,
            "subtotal": str(subtotal) if subtotal is not None else None,
            "gst_rate": f"{int(gst_percentage * 100)}%" if gst_percentage is not None else None,
            "gst_amount": str(gst) if gst is not None else None,
            "total": str(total) if total is not None else None,
            "currency": "INR",
        },
        "total": total,
    }

    # Cryptographic quote identity payload for verification (stored in cache FIRST)
    cached_data = dict(breakdown)
    cached_data["quote_hash"] = quote_hash
    cached_data["signature_token"] = signature_token
    cached_data["pricing_config_fingerprint"] = pricing_config_fingerprint
    cached_data["tier_id"] = vehicle.get("tier_id")
    cached_data["city"] = city
    cached_data["pickup_lat"] = round(float(pickup_lat), 5)
    cached_data["pickup_lng"] = round(float(pickup_lng), 5)
    cached_data["drop_lat"] = round(float(drop_lat), 5)
    cached_data["drop_lng"] = round(float(drop_lng), 5)
    cached_data["inventory_str"] = canonical_inv_str
    cached_data["total_weight_kg"] = total_weight
    cached_data["packing_tier"] = packing_clean
    cached_data["dismantling_required"] = bool(dismantling_required)
    cached_data["unpacking_required"] = bool(unpacking_required)
    cached_data["pickup_floor"] = int(pickup_floor)
    cached_data["pickup_has_lift"] = bool(pickup_has_lift)
    cached_data["drop_floor"] = int(drop_floor)
    cached_data["drop_has_lift"] = bool(drop_has_lift)
    cached_data["relocation_type"] = str(relocation_type)
    cached_data["total"] = str(total) if total is not None else None
    cached_data["valid_until"] = valid_until.isoformat()
    cached_data["item_snapshots"] = item_snapshots

    # Cache complete immutable quote snapshot
    cache_key = f"pm_quote_{quote_id}"
    cache.set(cache_key, cached_data, timeout=cache_timeout)

    return breakdown


def verify_packers_movers_quote(
    quote_id: str,
    submitted_total: Any = None,
    current_request: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, Optional[Dict[str, Any]], str]:
    """
    Verifies that a quote_id exists, has not expired, matches the server's
    calculated amount, and strictly matches the current request parameters.
    SEVO Part 9 & P1-8 Rule: Rejects any mutation or missing required booking fields (fail closed).
    Returns (is_valid, breakdown, error_message).
    """
    if not quote_id:
        return False, None, "Missing quote ID."

    cache_key = f"pm_quote_{quote_id}"
    cached = cache.get(cache_key)

    if not cached:
        return False, None, f"Quote '{quote_id}' has expired or is invalid. Please calculate a fresh quote."

    valid_until_str = cached.get("valid_until")
    if valid_until_str:
        try:
            valid_until = timezone.datetime.fromisoformat(valid_until_str)
            if timezone.is_naive(valid_until):
                valid_until = timezone.make_aware(valid_until)
            if timezone.now() > valid_until:
                return False, None, f"Quote '{quote_id}' expired at {valid_until_str}."
        except Exception as parse_err:
            logger.warning("Malformed valid_until timestamp in quote '%s': %s", quote_id, parse_err)
            return False, cached, "Quote expiry could not be verified. Please calculate a fresh quote."

    # Cryptographic signature token verification
    sig_token = cached.get("signature_token")
    if sig_token:
        try:
            signed_payload = signing.loads(sig_token)
            if (
                signed_payload.get("quote_id") != quote_id
                or signed_payload.get("quote_hash") != cached.get("quote_hash")
                or signed_payload.get("pricing_config_fingerprint") != cached.get("pricing_config_fingerprint")
            ):
                return False, cached, f"Cryptographic quote signature mismatch for '{quote_id}'."
        except Exception as sig_err:
            return False, cached, f"Cryptographic quote signature verification failed: {sig_err}"

    # P1-9: Verify complete pricing configuration & catalog identity has not changed in DB since quote creation
    try:
        from logistics.models import PackersMoversConfig, ServiceTier, GoodsItem
        curr_pm_conf = PackersMoversConfig.objects.filter(is_active=True, city__iexact=cached.get("city")).first()
        if curr_pm_conf:
            curr_conf_sig = (
                f"{curr_pm_conf.id}:"
                f"{curr_pm_conf.standard_packing_rate_cft}:"
                f"{curr_pm_conf.premium_packing_rate_cft}:"
                f"{curr_pm_conf.premium_fragile_addon}:"
                f"{curr_pm_conf.floor_rate_no_lift_per_100cft}:"
                f"{curr_pm_conf.unpacking_rate_cft}:"
                f"{curr_pm_conf.gst_rate}:"
                f"{curr_pm_conf.survey_cft_threshold}"
            )
        else:
            curr_conf_sig = "no_config"

        curr_tier = ServiceTier.objects.filter(id=cached.get("tier_id")).first()
        if curr_tier:
            curr_tier_sig = (
                f"{curr_tier.id}:"
                f"{curr_tier.base_fare}:"
                f"{curr_tier.starting_price}:"
                f"{curr_tier.per_km_rate}:"
                f"{curr_tier.free_km}:"
                f"{curr_tier.loading_unloading_charge}:"
                f"{curr_tier.additional_stop_charge}:"
                f"{curr_tier.surge_multiplier}:"
                f"{curr_tier.minimum_fare}:"
                f"{curr_tier.max_cft}:"
                f"{curr_tier.max_weight_kg}"
            )
        else:
            curr_tier_sig = "no_tier"

        goods_ids = [it.get("goods_item_id") for it in cached.get("item_snapshots", []) if it.get("goods_item_id")]
        curr_goods_rows = list(GoodsItem.objects.filter(id__in=goods_ids).order_by("id"))
        curr_goods_sig_parts = []
        for g in curr_goods_rows:
            curr_goods_sig_parts.append(
                f"{g.id}:{g.slug}:{g.category_id}:{g.default_cft}:{g.default_weight_kg}:"
                f"{int(bool(g.is_fragile))}:{int(bool(getattr(g, 'is_heavy', False)))}:"
                f"{int(bool(getattr(g, 'is_oversized', False)))}:{int(bool(getattr(g, 'is_prohibited', False)))}:"
                f"{int(bool(g.requires_special_handling))}:{g.special_handling_charge}:{int(bool(g.is_active))}"
            )
        curr_goods_catalog_sig = ";".join(curr_goods_sig_parts) if curr_goods_sig_parts else "no_goods_items"

        curr_fingerprint = hashlib.sha256(
            f"{curr_conf_sig}|{curr_tier_sig}|{curr_goods_catalog_sig}".encode("utf-8")
        ).hexdigest()[:20]

        if cached.get("pricing_config_fingerprint") and curr_fingerprint != cached.get("pricing_config_fingerprint"):
            return False, cached, f"Pricing configuration or catalog dimensions have been updated since quotation '{quote_id}'. Please recalculate a fresh quote."
    except Exception as conf_err:
        logger.exception("Error verifying pricing config fingerprint for quote '%s': %s", quote_id, conf_err)
        return False, cached, (
            "Unable to verify quote pricing integrity. "
            "Please recalculate the quote."
        )

    quote_total = cached.get("total")
    if quote_total is None:
        reason = cached.get("estimate_notice") or cached.get("review_reason") or "pricing configuration unavailable"
        return False, cached, f"Quote '{quote_id}' has no payable fare ({reason}) and cannot be finalized as an instant booking."

    if submitted_total is not None:
        try:
            sub_dec = _money(submitted_total)
            q_dec = _money(quote_total)
            if sub_dec != q_dec:
                return False, None, f"Submitted total ₹{sub_dec} does not match verified server quote ₹{q_dec}."
        except Exception as e:
            return False, None, f"Invalid total amount format: {e}"

    # P1-8: Verify input parameter mutations if current_request provided (FAIL CLOSED)
    if current_request and isinstance(current_request, dict):
        # 1. Tier verification (mandatory)
        req_tier = current_request.get("tier_id") or current_request.get("logistics_tier")
        if not req_tier:
            return False, cached, "Quote verification failed: missing tier_id in booking request."
        cached_tier = cached.get("tier_id")
        if str(req_tier) != str(cached_tier):
            return False, cached, f"Quote tier mismatch: quote was generated for tier #{cached_tier}, but #{req_tier} was requested."

        # 2. City verification (mandatory)
        req_city = current_request.get("city")
        if not req_city:
            return False, cached, "Quote verification failed: missing city in booking request."
        cached_city = cached.get("city")
        if str(req_city).strip().lower() != str(cached_city).strip().lower():
            return False, cached, f"Quote city mismatch: quote was generated for '{cached_city}', but '{req_city}' was requested."

        # 3. Route coordinates verification (mandatory)
        req_p_lat = current_request.get("pickup_lat") or current_request.get("latitude")
        req_p_lng = current_request.get("pickup_lng") or current_request.get("longitude")
        req_d_lat = current_request.get("drop_lat") or current_request.get("drop_latitude")
        req_d_lng = current_request.get("drop_lng") or current_request.get("drop_longitude")
        if None in (req_p_lat, req_p_lng, req_d_lat, req_d_lng):
            return False, cached, "Quote verification failed: missing route coordinates in booking request."

        c_p_lat = cached.get("pickup_lat")
        c_p_lng = cached.get("pickup_lng")
        c_d_lat = cached.get("drop_lat")
        c_d_lng = cached.get("drop_lng")
        if abs(float(req_p_lat) - float(c_p_lat)) > 0.005 or abs(float(req_p_lng) - float(c_p_lng)) > 0.005:
            return False, cached, "Quote route mismatch: pickup coordinates do not match quoted route."
        if abs(float(req_d_lat) - float(c_d_lat)) > 0.005 or abs(float(req_d_lng) - float(c_d_lng)) > 0.005:
            return False, cached, "Quote route mismatch: drop coordinates do not match quoted route."

        # 4. Relocation type verification (mandatory - fail closed)
        req_reloc = current_request.get("relocation_type")
        if not req_reloc:
            return False, cached, "Quote verification failed: missing relocation_type in booking request."
        cached_reloc = cached.get("relocation_type")
        if str(req_reloc).strip().lower() != str(cached_reloc).strip().lower():
            return False, cached, f"Quote relocation type mismatch: quote was generated for '{cached_reloc}', but '{req_reloc}' was requested."

        # 5. Inventory verification (mandatory)
        req_inv = current_request.get("inventory")
        if req_inv is None:
            return False, cached, "Quote verification failed: missing inventory in booking request."

        req_metrics = calculate_inventory_metrics(req_inv)
        req_sorted = []
        for it in req_metrics["items"]:
            g_id = it.get("goods_item_id") or ""
            qty = it.get("quantity") or 1
            name_clean = str(it.get("name") or "").strip().lower()
            slug_clean = str(it.get("slug") or "").strip().lower()
            u_cft = it.get("unit_cft")
            u_wt = it.get("unit_weight_kg")
            frag = int(bool(it.get("is_fragile")))
            dism = int(bool(it.get("can_dismantle")))
            dism_charge = str(it.get("unit_dismantle_charge") or "0.00")
            req_sorted.append(
                f"{g_id}:{slug_clean}:{name_clean}:{qty}:{u_cft}:{u_wt}:{frag}:{dism}:{dism_charge}"
            )
        req_sorted.sort()
        req_inv_str = ";".join(req_sorted)
        if cached.get("inventory_str") and req_inv_str != cached.get("inventory_str"):
            return False, cached, "Quote inventory mismatch: inventory items, quantities, or catalog attributes have changed since quotation."

        # 5. Options verification
        if "packing_tier" in current_request:
            req_packing = str(current_request.get("packing_tier") or "standard").strip().lower()
            if req_packing != cached.get("packing_tier"):
                return False, cached, "Quote option mismatch: packing tier has changed since quotation."

        if "dismantling_required" in current_request:
            if bool(current_request.get("dismantling_required")) != bool(cached.get("dismantling_required")):
                return False, cached, "Quote option mismatch: dismantling requirement has changed."

        if "unpacking_required" in current_request:
            if bool(current_request.get("unpacking_required")) != bool(cached.get("unpacking_required")):
                return False, cached, "Quote option mismatch: unpacking requirement has changed."

        if "pickup_floor" in current_request:
            if int(current_request.get("pickup_floor") or 0) != int(cached.get("pickup_floor") or 0):
                return False, cached, "Quote access mismatch: pickup floor has changed."

        if "drop_floor" in current_request:
            if int(current_request.get("drop_floor") or 0) != int(cached.get("drop_floor") or 0):
                return False, cached, "Quote access mismatch: drop floor has changed."

        if "pickup_has_lift" in current_request:
            if bool(current_request.get("pickup_has_lift")) != bool(cached.get("pickup_has_lift")):
                return False, cached, "Quote access mismatch: pickup lift status has changed."

        if "drop_has_lift" in current_request:
            if bool(current_request.get("drop_has_lift")) != bool(cached.get("drop_has_lift")):
                return False, cached, "Quote access mismatch: drop lift status has changed."

    survey_status = cached.get("survey_status") or ("INSTANT_ESTIMATE_APPROVED" if cached.get("is_authoritative") else "SURVEY_REQUIRED")

    if survey_status == "MANUAL_REVIEW_REQUIRED" or cached.get("requires_review"):
        unrec = ", ".join(cached.get("unrecognized_items", []))
        reason = cached.get("review_reason") or f"uncataloged inventory ({unrec})"
        return False, cached, f"Quote '{quote_id}' requires manual review ({reason}) and cannot be finalized automatically."

    if survey_status == "SURVEY_REQUIRED" or cached.get("requires_survey") or not cached.get("is_authoritative") or cached.get("is_estimate"):
        reason = cached.get("estimate_notice") or cached.get("review_reason") or "pre-move survey required"
        return False, cached, f"Quote '{quote_id}' requires a pre-move survey ({reason}) and cannot be finalized as an instant booking."

    return True, cached, ""
