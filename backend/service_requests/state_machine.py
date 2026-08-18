"""
service_requests/state_machine.py

Single source of truth for all status transitions and dual-status compatibility rules.
Call apply_transition(sr, new_status, new_payment_status=None, actor=None) before saving.
Raises rest_framework.exceptions.ValidationError on illegal moves.
"""
from rest_framework.exceptions import ValidationError

from .models import ServiceRequest

S = ServiceRequest.Status
PS = ServiceRequest.PaymentStatus

# Map: current_booking_status → set of allowed next booking_statuses
ALLOWED_TRANSITIONS = {
    S.DRAFT:                  {S.PENDING_PAYMENT, S.CONFIRMED, S.CANCELLED},
    S.PENDING_PAYMENT:        {S.CONFIRMED, S.CANCELLED, S.PENDING_PAYMENT},
    S.WAITING_FOR_PAYMENT:    {S.CONFIRMED, S.REJECTED, S.CANCELLED},
    S.NEW_REQUEST:            {S.CONFIRMED, S.REVIEWED, S.ASSIGNED, S.REJECTED, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.CONFIRMED:              {S.REVIEWED, S.ASSIGNED, S.REJECTED, S.CANCELLED, S.RESCHEDULED, S.FEEDBACK_RECEIVED},
    S.REVIEWED:               {S.ASSIGNED, S.REJECTED, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.ASSIGNED:               {S.RECEIVED, S.ACCEPTED, S.REJECTED, S.CANCELLED, S.RESCHEDULED, S.FEEDBACK_RECEIVED},
    S.RECEIVED:               {S.ACCEPTED, S.REJECTED, S.CANCELLED},
    S.ACCEPTED:               {S.ON_THE_WAY, S.ARRIVED, S.IN_PROGRESS, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.ON_THE_WAY:             {S.ARRIVED, S.IN_PROGRESS, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.ARRIVED:                {S.IN_PROGRESS, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.IN_PROGRESS:            {S.COMPLETED, S.FEEDBACK_RECEIVED},
    S.COMPLETED:              {S.AWAITING_VERIFICATION, S.FEEDBACK_RECEIVED},
    S.AWAITING_VERIFICATION:  {S.VERIFIED, S.REWORK_REQUESTED, S.FEEDBACK_RECEIVED},
    S.VERIFIED:               {S.FEEDBACK_PENDING, S.FEEDBACK_RECEIVED},
    S.FEEDBACK_PENDING:       {S.FEEDBACK_RECEIVED},
    S.FEEDBACK_RECEIVED:      {S.CLOSED},
    S.REWORK_REQUESTED:       {S.IN_PROGRESS, S.FEEDBACK_RECEIVED},
    S.RESCHEDULED:            {S.CONFIRMED, S.ASSIGNED, S.CANCELLED},
    # Terminal states — no further transitions
    S.CLOSED:                 set(),
    S.REJECTED:               set(),
    S.CANCELLED:              set(),
}

"""
STATUS_COMBINATION_RULES
────────────────────────
Dual-status validation matrix defining valid payment_status preconditions and expected outcomes
for every booking_status transition.

Key: (from_booking_status, to_booking_status)
Value: dict containing:
  - allowed_payment_preconditions: set of PaymentStatus values valid BEFORE transition
  - enforce_payment_status: PaymentStatus value set AFTER transition (or None if caller specified)
"""
STATUS_COMBINATION_RULES = {
    (S.DRAFT, S.PENDING_PAYMENT): {
        "allowed_payment_preconditions": {PS.PENDING},
        "enforce_payment_status": PS.PENDING,
    },
    (S.DRAFT, S.CONFIRMED): {
        "allowed_payment_preconditions": {PS.PENDING, PS.PAID},
        "enforce_payment_status": None,
    },
    (S.PENDING_PAYMENT, S.CONFIRMED): {
        "allowed_payment_preconditions": {PS.PENDING, PS.PROCESSING, PS.PAID},
        "enforce_payment_status": PS.PAID,
    },
    (S.PENDING_PAYMENT, S.PENDING_PAYMENT): {
        "allowed_payment_preconditions": {PS.PENDING, PS.PROCESSING, PS.FAILED},
        "enforce_payment_status": None,
    },
    (S.PENDING_PAYMENT, S.CANCELLED): {
        "allowed_payment_preconditions": {PS.PENDING, PS.FAILED, PS.PROCESSING},
        "enforce_payment_status": None,
    },
}


def record_transition(service_request, from_status: str, to_status: str, actor=None, reason_code: str = "", reason_note: str = "") -> None:
    """
    Creates an append-only BookingStatusEvent record to track the transition.
    """
    from customer_analytics.models import BookingStatusEvent
    from django.utils import timezone
    
    if actor is None:
        persona = BookingStatusEvent.ActorPersona.SYSTEM
    elif getattr(actor, "role", "") == "customer":
        persona = BookingStatusEvent.ActorPersona.CUSTOMER
    elif getattr(actor, "role", "") == "admin":
        persona = BookingStatusEvent.ActorPersona.ADMIN
    else:
        persona = BookingStatusEvent.ActorPersona.EMPLOYEE

    BookingStatusEvent.objects.create(
        service_request=service_request,
        customer=service_request.customer,
        company=service_request.company,
        from_status=from_status,
        to_status=to_status,
        actor=actor,
        actor_persona=persona,
        reason_code=reason_code,
        reason_note=reason_note,
        occurred_at=timezone.now(),
    )


def apply_transition(service_request, new_status: str, new_payment_status: str = None, actor=None) -> None:
    """
    Validate and apply a status transition for both booking_status and payment_status.

    Args:
        service_request:    ServiceRequest instance
        new_status:         Target status string (use ServiceRequest.Status values)
        new_payment_status: Target payment status string (optional)
        actor:              The User performing the action (for logging, optional)

    Raises:
        ValidationError: if the transition or status pair combination is not allowed
    """
    current_status = service_request.status
    current_payment_status = service_request.payment_status

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())

    if new_status != current_status and new_status not in allowed:
        raise ValidationError(
            {
                "detail": (
                    f"Cannot move from '{current_status}' to '{new_status}'. "
                    f"Allowed transitions: {[s.value for s in allowed] or 'none (terminal state)'}."
                )
            }
        )

    rule_key = (current_status, new_status)
    if rule_key in STATUS_COMBINATION_RULES:
        rule = STATUS_COMBINATION_RULES[rule_key]
        preconditions = rule.get("allowed_payment_preconditions")
        if preconditions and current_payment_status not in preconditions:
            raise ValidationError(
                {
                    "detail": f"Cannot transition to '{new_status}' with payment_status '{current_payment_status}'. Allowed preconditions: {[p.value for p in preconditions]}."
                }
            )
        enforced = rule.get("enforce_payment_status")
        if enforced:
            new_payment_status = enforced.value if hasattr(enforced, 'value') else enforced

    service_request.status = new_status
    if new_payment_status:
        service_request.payment_status = new_payment_status
    
    # Store temporary actor for save() transition hook
    service_request._status_actor = actor


def get_allowed_transitions(service_request) -> list:
    """Return list of allowed next status values for a given ServiceRequest."""
    current = service_request.status
    return [s.value for s in ALLOWED_TRANSITIONS.get(current, set())]
