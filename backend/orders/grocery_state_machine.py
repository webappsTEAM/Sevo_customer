"""
orders/grocery_state_machine.py

Phase 5 (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md): a small transition-
validation helper for GroceryOrder.status. Deliberately much simpler than
service_requests/state_machine.py -- no technician dispatch, no
inspection/quote states, just the linear pick -> pack -> deliver pipeline
plus early cancellation.
"""
import os

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import GroceryOrder

S = GroceryOrder.Status

# Map: current status -> set of allowed next statuses. Mirrors the shape of
# service_requests.state_machine.ALLOWED_TRANSITIONS, at a fraction of the size.
ALLOWED_TRANSITIONS = {
    S.PLACED:           {S.PACKED, S.CANCELLED},
    S.PACKED:           {S.OUT_FOR_DELIVERY, S.CANCELLED},
    S.OUT_FOR_DELIVERY: {S.DELIVERED},
    S.DELIVERED:        set(),
    S.CANCELLED:        set(),
}


class _StockReleaseTarget:
    """
    Minimal duck-typed stand-in for the ServiceRequest object that
    inventory.services.vegetable_stock_service.release_stock_for_booking()
    expects -- that function only ever reads `.request_id` and `.company`
    off its argument, and a GroceryOrder is a different model entirely.
    This keeps the already-built release function reusable as-is instead
    of widening a ServiceRequest-specific signature for a second caller.
    """
    def __init__(self, request_id, company):
        self.request_id = request_id
        self.company = company


def _resolve_company():
    """Same default-company resolution used by GroceryCheckoutView (orders/views.py)."""
    from companies.models import Company
    default_slug = os.environ.get("DEFAULT_COMPANY_SLUG", "calservices")
    company = Company.objects.filter(slug=default_slug).first()
    if company:
        return company
    if Company.objects.count() == 1:
        return Company.objects.first()
    return None


@transaction.atomic
def apply_grocery_transition(order: GroceryOrder, new_status: str) -> GroceryOrder:
    """
    Validates and applies a GroceryOrder.status transition, raising
    ValidationError on illegal moves (same contract as
    service_requests.state_machine.apply_transition). Cancelling from
    PLACED or PACKED restores reserved stock via the already-built,
    idempotent release_stock_for_booking().
    """
    current = order.status
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise ValidationError(
            f"Cannot transition GroceryOrder from '{current}' to '{new_status}'. "
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
