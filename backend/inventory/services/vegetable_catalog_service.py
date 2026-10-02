"""
backend/inventory/services/vegetable_catalog_service.py

Service layer for Vegetable Catalog bulk upload parsing, preview validation,
and atomic commit execution.
"""
import io
import csv
import re
from decimal import Decimal
from typing import Dict, Any, List, Tuple
from django.db import transaction
from django.utils.text import slugify
from django.core.cache import cache

from inventory.models import Vegetable, VegetableCategory, VegetableStockMovement, ApprovalStatus, ItemSource
from inventory.utils.unit_conversion import to_grams
from service_requests.models import Package, Service, PackageStatus


CSV_HEADERS = [
    "sku",
    "name",
    "category",
    "price",
    "mrp",
    "unit",
    "pack_size",
    "stock_quantity_kg",
    "default_daily_stock_kg",
    "image_url",
    "tag",
    "description",
]

SAMPLE_CSV_ROWS = [
    {
        "sku": "VEG-TOMATO-HYBRID",
        "name": "Fresh Hybrid Tomato",
        "category": "Daily Staples & Aromatics",
        "price": "38.00",
        "mrp": "45.00",
        "unit": "kg",
        "pack_size": "1kg",
        "stock_quantity_kg": "50",
        "default_daily_stock_kg": "50",
        "image_url": "/mockups/veg_tomato.png",
        "tag": "15% OFF",
        "description": "Farm-fresh ripe hybrid tomatoes, perfect for everyday curries and salads.",
    },
    {
        "sku": "VEG-PALAK-GREENS",
        "name": "Fresh Palak (Spinach)",
        "category": "Leafy Greens & Herbs",
        "price": "25.00",
        "mrp": "30.00",
        "unit": "bunch",
        "pack_size": "1 bunch (250g)",
        "stock_quantity_kg": "20",
        "default_daily_stock_kg": "25",
        "image_url": "/mockups/veg_palak.png",
        "tag": "Harvested Today",
        "description": "Crisp green spinach leaves rich in iron and vitamins.",
    },
    {
        "sku": "VEG-CARROT-OOTY",
        "name": "Ooty Carrots",
        "category": "Root Vegetables & Tubers",
        "price": "60.00",
        "mrp": "70.00",
        "unit": "kg",
        "pack_size": "500g",
        "stock_quantity_kg": "40",
        "default_daily_stock_kg": "40",
        "image_url": "/mockups/veg_carrot.png",
        "tag": "Sweet & Crisp",
        "description": "Sweet hill-grown carrots, washed and graded.",
    },
]


def generate_catalog_template_csv() -> str:
    """
    Returns CSV text for catalog upload template with sample rows.
    """
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_HEADERS)
    writer.writeheader()
    for row in SAMPLE_CSV_ROWS:
        writer.writerow(row)
    return output.getvalue()


def parse_csv_or_excel_content(file_obj, filename: str = "") -> List[Dict[str, Any]]:
    """
    Parses an uploaded file (CSV or XLSX/XLS) into normalized dict rows.
    """
    content = file_obj.read()
    if isinstance(content, bytes):
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("latin-1")
    else:
        text = str(content)

    rows = []
    # If standard CSV / text
    reader = csv.DictReader(io.StringIO(text))
    for r in reader:
        # Normalize header keys: strip whitespace, lower-case, replace spaces/dashes with underscores
        normalized = {}
        for k, v in r.items():
            if k is None:
                continue
            clean_key = re.sub(r"[^a-zA-Z0-9_]", "_", k.strip().lower()).strip("_")
            normalized[clean_key] = (v or "").strip()
        if any(normalized.values()):
            rows.append(normalized)
    return rows


def preview_catalog_upload(raw_rows: List[Dict[str, Any]], company=None) -> Dict[str, Any]:
    """
    Validates rows against existing VegetableCategory, Vegetable, and Package tables.
    Matches existing items by SKU, slug, or name.
    Rejects rows with unknown categories with a descriptive error.
    Returns preview results including created vs updated vs rejected breakdown.
    """
    # Load all active categories for fast matching
    all_categories = list(VegetableCategory.objects.all())
    cat_by_name = {c.name.lower().strip(): c for c in all_categories}
    cat_by_slug = {c.slug.lower().strip(): c for c in all_categories}

    # Load existing vegetable items and packages
    existing_veg_by_sku = {v.sku.lower().strip(): v for v in Vegetable.objects.all() if v.sku}
    existing_pkg_by_slug = {p.slug.lower().strip(): p for p in Package.objects.filter(service__slug="vegetables")}
    existing_pkg_by_name = {p.name.lower().strip(): p for p in Package.objects.filter(service__slug="vegetables")}

    processed_rows = []
    to_create_count = 0
    to_update_count = 0
    to_reject_count = 0

    for idx, raw in enumerate(raw_rows, start=2): # Line 1 is header
        sku = raw.get("sku", "").strip()
        name = raw.get("name", "").strip()
        cat_name = raw.get("category", "") or raw.get("category_name", "") or raw.get("category_slug", "")
        cat_name = cat_name.strip()
        price_str = raw.get("price", "") or raw.get("base_price", "")
        mrp_str = raw.get("mrp", "") or raw.get("offer_price", "")
        unit = raw.get("unit", "") or "kg"
        pack_size = raw.get("pack_size", "") or raw.get("duration", "") or "500g"
        stock_kg_str = raw.get("stock_quantity_kg", "") or raw.get("stock_kg", "") or raw.get("stock_quantity", "")
        default_stock_kg_str = raw.get("default_daily_stock_kg", "") or raw.get("default_daily_stock", "") or raw.get("restock_level", "")
        image_url = raw.get("image_url", "") or raw.get("image", "")
        tag = raw.get("tag", "")
        description = raw.get("description", "")

        errors = []
        changes = []
        action = "create"

        # 1. Name validation
        if not name:
            errors.append("Product name is required.")

        # 2. Category validation
        matched_cat = None
        if cat_name:
            cat_key = cat_name.lower().strip()
            matched_cat = cat_by_name.get(cat_key) or cat_by_slug.get(cat_key)
            if not matched_cat:
                errors.append(
                    f"Category '{cat_name}' does not exist. Please create this category under 'Categories' first."
                )
        else:
            errors.append("Category is required.")

        # 3. Price validation
        price_val = None
        if price_str:
            try:
                price_val = Decimal(str(price_str).replace("₹", "").replace(",", "").strip())
                if price_val < 0:
                    errors.append("Price cannot be negative.")
            except Exception:
                errors.append(f"Invalid price value: '{price_str}'.")
        else:
            if not errors:
                errors.append("Price is required.")

        mrp_val = None
        if mrp_str:
            try:
                mrp_val = Decimal(str(mrp_str).replace("₹", "").replace(",", "").strip())
                if mrp_val < 0:
                    errors.append("MRP cannot be negative.")
            except Exception:
                errors.append(f"Invalid MRP value: '{mrp_str}'.")

        # 4. Stock validation
        stock_kg = None
        if stock_kg_str:
            try:
                stock_kg = float(stock_kg_str)
                if stock_kg < 0:
                    errors.append("Stock quantity cannot be negative.")
            except Exception:
                errors.append(f"Invalid stock quantity: '{stock_kg_str}'.")

        default_stock_kg = None
        if default_stock_kg_str:
            try:
                default_stock_kg = float(default_stock_kg_str)
                if default_stock_kg < 0:
                    errors.append("Default daily stock cannot be negative.")
            except Exception:
                errors.append(f"Invalid default daily stock: '{default_stock_kg_str}'.")

        # 5. Check if matching existing item
        matched_veg = None
        matched_pkg = None

        if sku and sku.lower() in existing_veg_by_sku:
            matched_veg = existing_veg_by_sku[sku.lower()]
            matched_pkg = matched_veg.package
        elif name:
            slug_cand = slugify(name)
            if slug_cand in existing_pkg_by_slug:
                matched_pkg = existing_pkg_by_slug[slug_cand]
                matched_veg = getattr(matched_pkg, "stock_item", None)
            elif name.lower() in existing_pkg_by_name:
                matched_pkg = existing_pkg_by_name[name.lower()]
                matched_veg = getattr(matched_pkg, "stock_item", None)

        if matched_pkg or matched_veg:
            action = "update"
            if matched_pkg:
                if price_val is not None and matched_pkg.base_price != price_val:
                    changes.append(f"Price: ₹{matched_pkg.base_price} → ₹{price_val}")
                if mrp_val is not None and matched_pkg.offer_price != mrp_val:
                    changes.append(f"MRP: ₹{matched_pkg.offer_price or 0} → ₹{mrp_val}")
                if pack_size and matched_pkg.duration != pack_size:
                    changes.append(f"Pack size: {matched_pkg.duration} → {pack_size}")
            if matched_veg:
                if matched_cat and matched_veg.category_id != matched_cat.id:
                    old_cat_name = matched_veg.category.name if matched_veg.category else "Uncategorized"
                    changes.append(f"Category: {old_cat_name} → {matched_cat.name}")
                if stock_kg is not None:
                    curr_kg = (matched_veg.stock_quantity_grams or 0) / 1000.0
                    if abs(curr_kg - stock_kg) > 0.001:
                        changes.append(f"Stock: {curr_kg:.1f}kg → {stock_kg:.1f}kg")
                if default_stock_kg is not None:
                    curr_def_kg = (matched_veg.default_daily_quantity_grams or 0) / 1000.0
                    if abs(curr_def_kg - default_stock_kg) > 0.001:
                        changes.append(f"Daily restock: {curr_def_kg:.1f}kg → {default_stock_kg:.1f}kg")
            if not changes and not errors:
                changes.append("No changes detected (values match current catalog)")
        else:
            action = "create"
            if not errors:
                changes.append(f"Create new vegetable product '{name}' with {stock_kg or 0}kg initial stock")

        if errors:
            action = "reject"
            to_reject_count += 1
        elif action == "update":
            to_update_count += 1
        else:
            to_create_count += 1

        processed_rows.append({
            "row_number": idx,
            "sku": sku or (matched_veg.sku if matched_veg else f"VEG-{slugify(name).upper()[:20]}"),
            "name": name,
            "category": matched_cat.name if matched_cat else cat_name,
            "category_id": matched_cat.id if matched_cat else None,
            "price": float(price_val) if price_val is not None else None,
            "mrp": float(mrp_val) if mrp_val is not None else None,
            "unit": unit,
            "pack_size": pack_size,
            "stock_quantity_kg": stock_kg,
            "default_daily_stock_kg": default_stock_kg,
            "image_url": image_url,
            "tag": tag,
            "description": description,
            "action": action,
            "changes": changes,
            "errors": errors,
            "error": " | ".join(errors) if errors else None,
            "matched_package_id": matched_pkg.id if matched_pkg else None,
            "matched_vegetable_id": matched_veg.id if matched_veg else None,
        })

    return {
        "success": True,
        "summary": {
            "total": len(processed_rows),
            "to_create": to_create_count,
            "to_update": to_update_count,
            "to_reject": to_reject_count,
            "can_commit": (to_create_count + to_update_count) > 0,
        },
        "rows": processed_rows,
    }


@transaction.atomic
def commit_catalog_upload(validated_rows: List[Dict[str, Any]], company, user=None) -> Dict[str, Any]:
    """
    Executes validated catalog rows atomically.
    Creates and updates Package and Vegetable pairs, applies stock movements,
    and invalidates catalog caches.
    """
    veg_service = Service.objects.filter(slug="vegetables").first()
    if not veg_service:
        # Fallback or create vegetable service
        from service_requests.models import CatalogCategory
        cat = CatalogCategory.objects.first()
        veg_service = Service.objects.create(
            category=cat,
            name="Farm-Fresh Vegetable",
            slug="vegetables",
            is_active=True,
        )

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for r in validated_rows:
        action = r.get("action")
        if action == "reject":
            skipped_count += 1
            continue

        name = r.get("name", "").strip()
        sku = r.get("sku", "").strip()
        cat_id = r.get("category_id")
        price = r.get("price")
        mrp = r.get("mrp")
        unit = r.get("unit", "kg")
        pack_size = r.get("pack_size", "500g")
        stock_kg = r.get("stock_quantity_kg")
        default_stock_kg = r.get("default_daily_stock_kg")
        image_url = r.get("image_url", "")
        tag = r.get("tag", "")
        description = r.get("description", "")

        cat_obj = VegetableCategory.objects.filter(id=cat_id).first() if cat_id else None
        if not cat_obj and r.get("category"):
            cat_name = r.get("category").strip()
            cat_slug = slugify(cat_name)
            cat_obj = VegetableCategory.objects.filter(name__iexact=cat_name).first()
            if not cat_obj:
                base_cslug = cat_slug or "cat"
                cslug = base_cslug
                ccounter = 1
                while VegetableCategory.objects.filter(slug=cslug).exists():
                    cslug = f"{base_cslug}-{ccounter}"
                    ccounter += 1
                cat_obj = VegetableCategory.objects.create(
                    org=company,
                    name=cat_name,
                    slug=cslug,
                    status=ApprovalStatus.PENDING,
                    source=ItemSource.REQUEST,
                    requested_by=user,
                )

        pkg_id = r.get("matched_package_id")
        veg_id = r.get("matched_vegetable_id")
        pkg = Package.objects.filter(id=pkg_id).first() if pkg_id else None
        veg = Vegetable.objects.filter(id=veg_id).first() if veg_id else None

        stock_grams = int(stock_kg * 1000) if stock_kg is not None else None
        default_stock_grams = int(default_stock_kg * 1000) if default_stock_kg is not None else None

        if not pkg:
            # CREATE FLOW
            slug = slugify(name)
            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Package.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            pkg = Package.objects.create(
                service=veg_service,
                name=name,
                slug=slug,
                base_price=Decimal(str(price or 0)),
                offer_price=Decimal(str(mrp)) if mrp is not None else None,
                duration=pack_size,
                image=image_url or "",
                tag=tag or "Fresh",
                description=description,
                status=PackageStatus.DRAFT,
            )

            veg = Vegetable.objects.create(
                org=company,
                package=pkg,
                category=cat_obj,
                name=f"{name} (Produce)",
                sku=sku or f"VEG-{slug.upper()[:20]}",
                unit=unit or "kg",
                stock_quantity_grams=stock_grams if stock_grams is not None else 0,
                default_daily_quantity_grams=default_stock_grams,
                image=image_url or "",
                status=ApprovalStatus.PENDING,
                source=ItemSource.REQUEST,
                requested_by=user,
            )

            pkg.stock_item = veg
            pkg.save(update_fields=["stock_item"])

            if stock_grams and stock_grams > 0:
                VegetableStockMovement.objects.create(
                    org=company,
                    vegetable=veg,
                    movement_type=VegetableStockMovement.MovementType.RESTOCK,
                    delta_grams=stock_grams,
                    balance_after_grams=stock_grams,
                    reason="Initial stock from Catalog Upload",
                    entered_by=user,
                )

            created_count += 1
        else:
            # UPDATE FLOW
            pkg_fields = []
            if price is not None and pkg.base_price != Decimal(str(price)):
                pkg.base_price = Decimal(str(price))
                pkg_fields.append("base_price")
            if mrp is not None and pkg.offer_price != Decimal(str(mrp)):
                pkg.offer_price = Decimal(str(mrp))
                pkg_fields.append("offer_price")
            if pack_size and pkg.duration != pack_size:
                pkg.duration = pack_size
                pkg_fields.append("duration")
            if image_url and pkg.image != image_url:
                pkg.image = image_url
                pkg_fields.append("image")
            if tag and pkg.tag != tag:
                pkg.tag = tag
                pkg_fields.append("tag")
            if description and pkg.description != description:
                pkg.description = description
                pkg_fields.append("description")

            if pkg_fields:
                pkg.save(update_fields=pkg_fields)

            if not veg:
                veg = getattr(pkg, "stock_item", None)
                if not veg:
                    veg = Vegetable.objects.create(
                        org=company,
                        package=pkg,
                        category=cat_obj,
                        name=f"{name} (Produce)",
                        sku=sku or f"VEG-{pkg.slug.upper()[:20]}",
                        unit=unit or "kg",
                        stock_quantity_grams=stock_grams if stock_grams is not None else 0,
                        default_daily_quantity_grams=default_stock_grams,
                        image=image_url or pkg.image,
                    )
                    pkg.stock_item = veg
                    pkg.save(update_fields=["stock_item"])

            veg_fields = []
            if cat_obj and veg.category_id != cat_obj.id:
                veg.category = cat_obj
                veg_fields.append("category")
            if sku and veg.sku != sku:
                veg.sku = sku
                veg_fields.append("sku")
            if unit and veg.unit != unit:
                veg.unit = unit
                veg_fields.append("unit")
            if default_stock_grams is not None and veg.default_daily_quantity_grams != default_stock_grams:
                veg.default_daily_quantity_grams = default_stock_grams
                veg_fields.append("default_daily_quantity_grams")

            if stock_grams is not None and veg.stock_quantity_grams != stock_grams:
                old_stock = veg.stock_quantity_grams or 0
                delta = stock_grams - old_stock
                veg.stock_quantity_grams = stock_grams
                veg_fields.append("stock_quantity_grams")
                VegetableStockMovement.objects.create(
                    org=company,
                    vegetable=veg,
                    movement_type=VegetableStockMovement.MovementType.ADJUSTMENT,
                    delta_grams=delta,
                    balance_after_grams=stock_grams,
                    reason="Updated via Catalog Upload",
                    entered_by=user,
                )

            if veg_fields:
                veg.save(update_fields=veg_fields)

            updated_count += 1

    # Invalidate cache
    try:
        cache.clear()
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Catalog upload completed: {created_count} products created, {updated_count} updated, {skipped_count} skipped.",
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
    }
