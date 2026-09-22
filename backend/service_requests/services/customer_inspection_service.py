"""
service_requests/services/customer_inspection_service.py

Domain service for Customer Inspection & Rate Card Snapshot creation and retrieval.
Guarantees transaction-safe atomic snapshotting of diagnostic fees and master rate-card items
at the exact moment a customer booking is confirmed.
"""
import logging
from decimal import Decimal
from typing import Optional, Tuple
from django.db import transaction

from service_requests.models import (
    ServiceRequest,
    CustomerInspection,
    CustomerInspectionRateSnapshot,
    ACInspectionConfiguration,
    ACInspectionRateItem,
)

logger = logging.getLogger("service_requests.customer_inspection")


class CustomerInspectionService:
    @classmethod
    def create_inspection_and_rate_snapshots(
        cls,
        service_request: ServiceRequest,
        quantity: int = 1,
        inspection_name: Optional[str] = None,
        configuration: Optional[ACInspectionConfiguration] = None,
    ) -> Tuple[CustomerInspection, bool]:
        """
        Atomically creates a CustomerInspection record and snapshots all currently active
        rate-card items from the master catalog into relational CustomerInspectionRateSnapshot rows.
        
        Guarantees that historical customer bookings permanently retain their original
        diagnostic fee and item rates, even if admin updates master rates later.
        """
        # 1. Idempotent check -- don't duplicate if already created for this service_request
        if hasattr(service_request, "customer_inspection"):
            return service_request.customer_inspection, False

        existing = CustomerInspection.objects.filter(service_request=service_request).first()
        if existing:
            return existing, False

        # 2. Master configuration snapshot
        config = configuration or ACInspectionConfiguration.get_solo()
        diagnostic_fee = config.diagnostic_fee if config else Decimal("199.00")
        currency = config.currency if config else "INR"
        name_snapshot = inspection_name or "AC Inspection & Diagnostic Visit"
        qty = max(1, int(quantity or 1))

        # 3. Create the parent CustomerInspection within current or caller transaction
        customer_inspection = CustomerInspection.objects.create(
            service_request=service_request,
            inspection_configuration=config,
            inspection_name_snapshot=name_snapshot,
            diagnostic_fee_snapshot=diagnostic_fee,
            currency=currency,
            quantity=qty,
            status=CustomerInspection.Status.BOOKED,
        )

        # 4. Query all currently active master rate items across active categories
        active_items = ACInspectionRateItem.objects.filter(
            is_active=True,
            category__is_active=True,
        ).select_related("category").order_by(
            "category__display_order",
            "category__id",
            "display_order",
            "id"
        )

        # 5. Bulk create relational rate snapshot rows
        snapshots = [
            CustomerInspectionRateSnapshot(
                customer_inspection=customer_inspection,
                rate_item=item,
                category_name_snapshot=item.category.name,
                item_name_snapshot=item.name,
                description_snapshot=item.description,
                price_snapshot=item.price,
                unit_snapshot=item.unit,
                service_type_snapshot=item.service_type,
                display_order=item.display_order,
            )
            for item in active_items
        ]

        if snapshots:
            CustomerInspectionRateSnapshot.objects.bulk_create(snapshots)

        logger.info(
            f"[CustomerInspectionService] Created CustomerInspection #{customer_inspection.id} "
            f"for ServiceRequest #{service_request.id} ({service_request.request_id}) "
            f"with fee ₹{diagnostic_fee} and {len(snapshots)} rate-card item snapshots."
        )

        return customer_inspection, True

    @classmethod
    def get_booking_inspection_snapshot(cls, service_request: ServiceRequest) -> Optional[dict]:
        """
        Retrieves the structured snapshot data for an existing customer booking.
        Groups rate-card items by category.
        """
        ci = getattr(service_request, "customer_inspection", None)
        if not ci:
            ci = CustomerInspection.objects.filter(service_request=service_request).first()
        if not ci:
            return None

        snapshots = ci.rate_snapshots.all().order_by("display_order", "id")

        # Group by category_name_snapshot preserving order
        categories_map = {}
        for snap in snapshots:
            cat_name = snap.category_name_snapshot
            if cat_name not in categories_map:
                categories_map[cat_name] = {
                    "category_name": cat_name,
                    "items": [],
                }
            
            price_num = float(snap.price_snapshot)
            price_str = "Free" if price_num == 0 else (
                f"₹{int(price_num):,}" if price_num == int(price_num) else f"₹{price_num:,.2f}"
            )

            categories_map[cat_name]["items"].append({
                "id": snap.id,
                "rate_item_id": snap.rate_item_id,
                "name": snap.item_name_snapshot,
                "description": snap.description_snapshot,
                "price": price_str,
                "numeric_price": price_num,
                "unit": snap.unit_snapshot,
                "service_type": snap.service_type_snapshot,
                "display_order": snap.display_order,
            })

        fee_num = float(ci.diagnostic_fee_snapshot)
        fee_str = f"₹{int(fee_num):,}" if fee_num == int(fee_num) else f"₹{fee_num:,.2f}"

        return {
            "id": ci.id,
            "service_request_id": service_request.id,
            "request_id": service_request.request_id,
            "inspection_name": ci.inspection_name_snapshot,
            "diagnostic_fee": fee_num,
            "diagnostic_fee_display": fee_str,
            "currency": ci.currency,
            "quantity": ci.quantity,
            "status": ci.status,
            "created_at": ci.created_at.isoformat() if ci.created_at else None,
            "categories": list(categories_map.values()),
            "total_snapshot_items": len(snapshots),
        }
