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
    S.UNASSIGNED:             {S.CONFIRMED, S.REVIEWED, S.ASSIGNED, S.ACCEPTED, S.REJECTED, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.CONFIRMED:              {S.REVIEWED, S.ASSIGNED, S.ACCEPTED, S.REJECTED, S.CANCELLED, S.RESCHEDULED, S.FEEDBACK_RECEIVED},
    S.REVIEWED:               {S.ASSIGNED, S.REJECTED, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.ASSIGNED:               {S.RECEIVED, S.ACCEPTED, S.REJECTED, S.CONFIRMED, S.CANCELLED, S.RESCHEDULED, S.FEEDBACK_RECEIVED},
    S.RECEIVED:               {S.ACCEPTED, S.REJECTED, S.CONFIRMED, S.CANCELLED},
    S.ACCEPTED:               {S.ON_THE_WAY, S.ARRIVED, S.IN_PROGRESS, S.CONFIRMED, S.ASSIGNED, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.ON_THE_WAY:             {S.ARRIVED, S.IN_PROGRESS, S.CONFIRMED, S.CANCELLED, S.FEEDBACK_RECEIVED},
    S.ARRIVED:                {S.IN_PROGRESS, S.CANCELLED, S.FEEDBACK_RECEIVED, S.COMPLETED, S.CLOSED},
    S.IN_PROGRESS:            {S.COMPLETED, S.PROOF_SUBMITTED, S.UNABLE_TO_COMPLETE, S.FEEDBACK_RECEIVED, S.CANCELLED},
    S.PROOF_SUBMITTED:        {S.COMPLETED, S.AWAITING_VERIFICATION, S.VERIFIED, S.FEEDBACK_RECEIVED, S.CANCELLED},
    S.UNABLE_TO_COMPLETE:     {S.CANCELLED, S.REWORK_REQUESTED, S.IN_PROGRESS, S.FEEDBACK_RECEIVED, S.CLOSED},
    S.COMPLETED:              {S.AWAITING_VERIFICATION, S.FEEDBACK_RECEIVED},
    S.AWAITING_VERIFICATION:  {S.VERIFIED, S.REWORK_REQUESTED, S.FEEDBACK_RECEIVED},
    S.VERIFIED:               {S.FEEDBACK_PENDING, S.FEEDBACK_RECEIVED},
    S.FEEDBACK_PENDING:       {S.FEEDBACK_RECEIVED},
    S.FEEDBACK_RECEIVED:      {S.CLOSED},
    S.REWORK_REQUESTED:       {S.IN_PROGRESS, S.FEEDBACK_RECEIVED},
    S.FOLLOW_UP_REQUIRED:     {S.IN_PROGRESS, S.COMPLETED, S.CANCELLED, S.FEEDBACK_RECEIVED, S.CLOSED},
    S.RESCHEDULED:            {S.CONFIRMED, S.ASSIGNED, S.CANCELLED},
    # Estimation lifecycle transitions
    S.REQUESTED:              {S.VENDOR_CONFIRMED, S.CANCELLED, S.CONFIRMED},
    S.VENDOR_CONFIRMED:       {S.TECHNICIAN_ASSIGNED, S.CANCELLED, S.ASSIGNED},
    S.TECHNICIAN_ASSIGNED:    {S.TECHNICIAN_ON_THE_WAY, S.CANCELLED, S.ON_THE_WAY},
    S.TECHNICIAN_ON_THE_WAY:  {S.TECHNICIAN_ARRIVED, S.ARRIVED},
    S.TECHNICIAN_ARRIVED:     {S.INSPECTION_IN_PROGRESS, S.IN_PROGRESS},
    S.INSPECTION_IN_PROGRESS: {S.INSPECTION_COMPLETED, S.COMPLETED},
    S.INSPECTION_COMPLETED:   {S.QUOTATION_SENT},
    S.QUOTATION_SENT:         {S.CUSTOMER_APPROVED, S.CUSTOMER_REJECTED},
    S.CUSTOMER_APPROVED:      {S.CONFIRMED, S.ASSIGNED, S.IN_PROGRESS, S.COMPLETED, S.CLOSED},
    S.CUSTOMER_REJECTED:      {S.ESTIMATION_CLOSED, S.CLOSED},
    S.ESTIMATION_CLOSED:      set(),
    # Terminal states — no further transitions
    S.CLOSED:                 set(),
    S.REJECTED:               set(),
    S.CANCELLED:              set(),

    # X-03: "redispatching" is written directly into this shared table by
    # the vendor app's own, separate state machine (vendor/backend/
    # service_requests/state_machine.py) whenever a technician cancels or
    # is reassigned off a job -- it was never a status this app's Status
    # enum/ALLOWED_TRANSITIONS knew about. Before this entry, apply_transition()
    # here used ALLOWED_TRANSITIONS.get(current_status, set()) -- an unknown
    # current_status silently resolved to the empty set, i.e. "no transitions
    # allowed", so any Customer-app-side action (a customer cancelling their
    # own booking while it happened to be mid-reassignment, an admin
    # correcting it, etc.) on a booking currently sitting at "redispatching"
    # would fail with "Allowed transitions: none (terminal state)" even
    # though the booking is very much not actually finished.
    #
    # Deliberately NOT added to ServiceRequest.Status as a formal enum
    # member -- only this app's own code ever needs to transition *out of*
    # "redispatching" (the vendor app is the only thing that ever writes
    # it), so a plain string key here is enough and keeps this app's own
    # Status choices, serializers, and admin UI unchanged. "en_route",
    # "offering", and "dispatching" also exist in the vendor app's status
    # vocabulary but were confirmed (by search) to never actually be written
    # to this shared column in production code -- only referenced in that
    # app's own transition table and read-side filters -- so they are not
    # added here; if that changes, this comment is the place to revisit it.
    "redispatching":          {S.UNASSIGNED, S.ASSIGNED, S.ACCEPTED, S.CANCELLED},
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
    try:
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
            customer=getattr(service_request, "customer", None),
            company=getattr(service_request, "company", None),
            from_status=from_status or "",
            to_status=to_status or "",
            actor=actor,
            actor_persona=persona,
            reason_code=reason_code or "",
            reason_note=reason_note or "",
            occurred_at=timezone.now(),
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to record BookingStatusEvent: %s", e)


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

    # Enforce advance payment block for Masonry bookings before moving to work-start states
    if service_request.request_kind == "quoted_work" and new_status not in [S.CONFIRMED, S.REJECTED, S.CANCELLED]:
        is_mason = (
            service_request.service_category in ["mason", "masonry"] or
            (service_request.parent_request and service_request.parent_request.service_category in ["mason", "masonry"])
        )
        if is_mason:
            from .models import Payment
            payments = Payment.objects.filter(service_request=service_request, status=ServiceRequest.PaymentStatus.PAID)
            total_paid = sum(p.amount for p in payments)
            
            from .models import PaintingQuote
            quote = PaintingQuote.objects.filter(
                service_request=service_request.parent_request, 
                status=PaintingQuote.Status.APPROVED
            ).first()
            if not quote:
                quote = PaintingQuote.objects.filter(
                    service_request=service_request, 
                    status=PaintingQuote.Status.APPROVED
                ).first()
            
            if quote and quote.advance_amount > 0:
                if total_paid < quote.advance_amount:
                    raise ValidationError(
                        {"detail": f"Cannot transition to '{new_status}'. The required 50% advance payment of ₹{float(quote.advance_amount):.2f} is not successfully recorded for this Masonry work."}
                    )

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())

    if new_status != current_status and new_status not in allowed:
        allowed_display = [s.value if hasattr(s, 'value') else str(s) for s in allowed]
        raise ValidationError(
            {
                "detail": (
                    f"Cannot move from '{current_status}' to '{new_status}'. "
                    f"Allowed transitions: {allowed_display or 'none (terminal state)'}."
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
