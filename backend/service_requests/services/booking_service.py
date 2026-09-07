"""
backend/service_requests/services/booking_service.py
Service layer for booking creation, updates, and state transitions.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from inventory.services.vegetable_stock_service import reserve_stock_for_booking_items, InsufficientStockError


class BookingService:

    @staticmethod
    def extract_vegetable_items(cart_data) -> list:
        """
        Parses cart_data JSON items to extract vegetable package line items for stock reservation.
        Robustly resolves packages by package_id, id, slug, or name (including 'veg_' prefixes),
        and calculates total effective quantity in grams/units.
        """
        import re
        from service_requests.models import Package
        from inventory.utils.unit_conversion import to_grams

        if not cart_data or not isinstance(cart_data, list):
            return []

        extracted = []
        for item in cart_data:
            if not isinstance(item, dict):
                continue

            pkg = None
            pkg_id = item.get("package_id") or item.get("packageId")
            if pkg_id:
                try:
                    if str(pkg_id).isdigit():
                        pkg = Package.objects.select_related("stock_item", "service").filter(id=int(pkg_id)).first()
                    else:
                        pkg = Package.objects.select_related("stock_item", "service").filter(slug=str(pkg_id)).first()
                except Exception:
                    pass

            item_id = item.get("id")
            if not pkg and item_id:
                try:
                    item_id_str = str(item_id).strip()
                    if item_id_str.isdigit():
                        pkg = Package.objects.select_related("stock_item", "service").filter(id=int(item_id_str)).first()
                    else:
                        pkg = Package.objects.select_related("stock_item", "service").filter(slug=item_id_str).first()
                        if not pkg and item_id_str.startswith("veg_"):
                            clean_id = item_id_str[4:].strip().replace("_", " ")
                            pkg = (
                                Package.objects.select_related("stock_item", "service").filter(name__iexact=clean_id).first()
                                or Package.objects.select_related("stock_item", "service").filter(slug__iexact=clean_id).first()
                            )
                except Exception:
                    pass

            name_val = item.get("name") or item.get("displayName") or item.get("title")
            if not pkg and name_val:
                try:
                    name_str = str(name_val).strip()
                    pkg = (
                        Package.objects.select_related("stock_item", "service").filter(name__iexact=name_str).first()
                        or Package.objects.select_related("stock_item", "service").filter(slug__iexact=name_str).first()
                    )
                    if not pkg:
                        # Try matching base name if name has extra info like (Nellikaai) or weight
                        base_match = re.split(r"[\(\[\-]", name_str)[0].strip()
                        if base_match:
                            pkg = Package.objects.select_related("stock_item", "service").filter(name__icontains=base_match).first()
                except Exception:
                    pass

            if pkg:
                raw_qty = item.get("quantity") or item.get("qty") or item.get("count") or 1
                try:
                    qty_num = float(raw_qty)
                except Exception:
                    qty_num = 1.0

                unit_str = str(item.get("unit") or (pkg.duration if pkg.duration else "")).strip()

                # Check if unit contains multiplier (e.g., '2 x 500 g', '2 × 500 g')
                m_mult = re.search(r'(\d+(?:\.\d+)?)\s*[xX\u00d7]\s*(\d+(?:\.\d+)?)\s*(kg|g|kilogram|gram)', unit_str, re.IGNORECASE)
                if m_mult:
                    count = float(m_mult.group(1))
                    weight = float(m_mult.group(2))
                    u = m_mult.group(3)
                    base_pack_grams = to_grams(weight, u)
                    total_grams = int(round(qty_num * count * base_pack_grams))
                    extracted.append({
                        "product": pkg,
                        "quantity": total_grams,
                        "unit": "g",
                    })
                    continue

                # Check if unit contains single weight (e.g., '500 g', '250 g', '1 kg', '0.5 kg')
                m_single = re.search(r'(\d+(?:\.\d+)?)\s*(kg|g|kilogram|gram)', unit_str, re.IGNORECASE)
                if m_single:
                    weight = float(m_single.group(1))
                    u = m_single.group(2)
                    base_pack_grams = to_grams(weight, u)
                    total_grams = int(round(qty_num * base_pack_grams))
                    extracted.append({
                        "product": pkg,
                        "quantity": total_grams,
                        "unit": "g",
                    })
                    continue

                # Fallback to direct quantity & unit
                extracted.append({
                    "product": pkg,
                    "quantity": qty_num,
                    "unit": unit_str or "g",
                })
        return extracted

    @staticmethod
    @transaction.atomic
    def create_service_request_booking(
        serializer,
        request_data,
        company,
        customer_user,
        final_email,
        final_address,
        final_lat,
        final_lng,
        saved_addr,
        location_snapshot,
        initial_status,
        payment_method,
        initial_payment_status,
        corrected_fare,
        zone_id_snapshot,
        zone_name_snapshot,
    ):
        """
        Creates a ServiceRequest and atomically reserves stock for any tracked vegetable items
        using the real permanent request_id as the booking_ref.
        """
        from service_requests.models import Coupon, CouponUsage
        from workforce_integration.services import WorkforceIntegrationService

        # 1. Save ServiceRequest instance to acquire its permanent request_id
        sr = serializer.save(
            company=company,
            customer=customer_user,
            email=final_email,
            address=final_address,
            latitude=final_lat,
            longitude=final_lng,
            saved_address_id=saved_addr.id if saved_addr else None,
            service_location_snapshot=location_snapshot,
            status=initial_status,
            payment_method=payment_method,
            payment_status=initial_payment_status,
            total_amount=corrected_fare,
            service_zone_id_snapshot=zone_id_snapshot,
            service_zone_name_snapshot=zone_name_snapshot,
        )

        # 2. Extract vegetable items from cart_data
        veg_items = BookingService.extract_vegetable_items(sr.cart_data)

        # 3. Atomically validate and deduct vegetable stock with real booking_ref
        if veg_items:
            reserve_stock_for_booking_items(
                items=veg_items,
                company=company,
                booking_ref=sr.request_id,
            )

        # 4. Process coupon discounts if applicable
        coupon_code = str(request_data.get("coupon_code") or request_data.get("coupon_code_snapshot") or "").strip().upper()
        if coupon_code:
            cpn = Coupon.objects.filter(code__iexact=coupon_code, status="Active").first()
            if cpn:
                subtotal = float(corrected_fare)
                if cpn.discount_type == "flat":
                    calc_disc = float(cpn.discount_value)
                else:
                    calc_disc = subtotal * (float(cpn.discount_value) / 100.0)

                if cpn.max_discount > 0:
                    disc = min(calc_disc, float(cpn.max_discount))
                else:
                    disc = calc_disc

                disc = min(subtotal, disc)
                final_tot = max(0.0, subtotal - disc)

                sr.coupon = cpn
                sr.coupon_code_snapshot = cpn.code
                sr.subtotal_amount = subtotal
                sr.discount_amount = disc
                sr.final_amount = final_tot
                sr.save(update_fields=["coupon", "coupon_code_snapshot", "subtotal_amount", "discount_amount", "final_amount"])

                cpn.current_usage += 1
                cpn.save(update_fields=["current_usage"])
                CouponUsage.objects.create(
                    coupon=cpn,
                    customer=sr.customer,
                    booking=sr,
                    discount_amount=disc,
                    order_amount=subtotal,
                    final_amount=final_tot
                )

        # 5. Dispatch booking notification to workforce management system
        WorkforceIntegrationService.dispatch_job(sr.id)

        return sr

    @staticmethod
    @transaction.atomic
    def create_booking(user, data, company=None):
        """
        Coordinates creation of a new booking request.
        """
        from service_requests.models import Booking
        company_obj = company or getattr(user, "company", None)
        
        booking = Booking.objects.create(
            customer=user if getattr(user, "role", "") == "customer" else None,
            company=company_obj,
            service_type=data.get("service_type", "general"),
            scheduled_date=data.get("scheduled_date"),
            status=data.get("status", "pending"),
            notes=data.get("notes", ""),
        )
        return booking

    @staticmethod
    @transaction.atomic
    def cancel_booking(booking, reason="", user=None):
        """
        Cancels an active booking request.
        """
        booking.status = "cancelled"
        if hasattr(booking, "cancellation_reason"):
            booking.cancellation_reason = reason
        booking.save()
        return booking

