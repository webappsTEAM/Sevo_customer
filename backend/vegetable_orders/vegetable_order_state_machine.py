import os
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import VegetableOrder

S = VegetableOrder.Status

ALLOWED_TRANSITIONS = {
    S.PLACED:           {S.PACKED, S.CANCELLED},
    S.PACKED:           {S.OUT_FOR_DELIVERY, S.CANCELLED},
    S.OUT_FOR_DELIVERY: {S.DELIVERED},
    S.DELIVERED:        set(),
    S.CANCELLED:        set(),
}


class _StockReleaseTarget:
    """
    Duck-typed stand-in for ServiceRequest expected by vegetable_stock_service.release_stock_for_booking().
    """
    def __init__(self, request_id, company):
        self.request_id = request_id
        self.company = company


def _resolve_company():
    from companies.models import Company
    default_slug = os.environ.get("DEFAULT_COMPANY_SLUG", "calservices")
    company = Company.objects.filter(slug=default_slug).first()
    if company:
        return company
    if Company.objects.count() == 1:
        return Company.objects.first()
    return None


@transaction.atomic
def apply_vegetable_transition(order: VegetableOrder, new_status: str) -> VegetableOrder:
    """
    Validates and applies a VegetableOrder.status transition.
    Cancelling from PLACED or PACKED restores reserved stock via release_stock_for_booking().
    """
    current = order.status
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise ValidationError(
            f"Cannot transition VegetableOrder from '{current}' to '{new_status}'. "
            f"Allowed: {sorted(allowed) or 'none (terminal state)'}"
        )

    order.status = new_status
    order.save(update_fields=["status", "updated_at"])

    if new_status == S.CANCELLED:
        from inventory.services.vegetable_stock_service import release_stock_for_booking
        company = _resolve_company()
        if company is None:
            raise ValidationError("Unable to resolve operating company; cannot release reserved stock.")
        release_stock_for_booking(_StockReleaseTarget(order.order_number, company))

    return order
