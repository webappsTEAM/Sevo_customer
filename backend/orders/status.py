"""
orders/status.py

compute_order_status(order) -- derives a parent booking's overall status
from its child ServiceRequests (spec section 7). This is a pure, read-only
computation, never stored on Order.status (Order.status stays the small
draft/confirmed/cancelled checkout-lifecycle field it already was, per
orders/models.py's own docstring) -- so it can never drift out of sync with
the child ServiceRequests, and adding/changing this rule never needs a
migration or touches state_machine.py.

Rule (matches the examples in the spec):
  - No child ServiceRequests yet                      -> "draft"
  - Every child is CANCELLED                          -> "cancelled"
  - Every non-cancelled child is COMPLETED/CLOSED      -> "completed"
  - Otherwise, at least one child is dispatched/active -> "in_progress"
  - Otherwise (nothing past CONFIRMED yet)             -> "confirmed"

A child being flagged `is_delayed` does NOT change this rule -- delay is a
non-blocking flag alongside a task's real status (see ServiceRequest.is_delayed
in service_requests/models.py), so a delayed-but-still-accepted task counts
the same as any other in-flight task: the parent booking stays "in_progress",
exactly as spec example #7 shows (AC=COMPLETED, TV=DELAYED -> IN_PROGRESS).
"""

_COMPLETED_LIKE = {"completed", "closed", "verified", "feedback_pending", "feedback_received"}
_CANCELLED_LIKE = {"cancelled", "rejected"}
_PRE_DISPATCH_LIKE = {"draft", "new_request", "pending_payment", "waiting_for_payment", "confirmed", "reviewed"}


def compute_order_status(order):
    statuses = [
        oi.service_request.status
        for oi in order.items.all()
        if oi.service_request_id and getattr(oi.service_request, "status", None)
    ]
    if not statuses:
        return "draft"

    if all(s in _CANCELLED_LIKE for s in statuses):
        return "cancelled"

    non_cancelled = [s for s in statuses if s not in _CANCELLED_LIKE]
    if non_cancelled and all(s in _COMPLETED_LIKE for s in non_cancelled):
        return "completed"

    if all(s in _PRE_DISPATCH_LIKE or s in _CANCELLED_LIKE for s in statuses):
        return "confirmed"

    return "in_progress"
