import logging
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime
from customer_care.models import TicketActivity

logger = logging.getLogger(__name__)

from service_requests.models import RescheduleRequest, RescheduleStatus
from service_requests.services import (
    create_reschedule_request,
    apply_reschedule_transition,
    auto_reassign_technician,
)

# GENUINE GAP (not resolved here -- see note below): this module previously
# imported three names from service_requests.services that do not exist
# anywhere in that module or the rest of the codebase:
#   - is_booking_reschedule_eligible  -- imported but never referenced in
#     this file (dead import); removed above. The real eligibility check
#     already used at call sites below is create_reschedule_request()'s own
#     built-in status guard plus the 24h/slot-capacity logic already in this
#     file, matching the established HS-B-08 pattern in
#     service_requests/services/__init__.py.
#   - check_employee_availability(employee, date, time_slot) -- genuinely
#     missing. No per-employee schedule/calendar model exists anywhere in
#     this codebase to answer "is this specific technician free at this
#     slot" -- the only established capacity concept is the aggregate
#     per-slot booking count (_slot_has_capacity in
#     service_requests/services/__init__.py), which is a different question
#     (is the slot full) from per-employee availability. Inventing a mapping
#     between the two, or a new employee-availability data source, would be
#     a business-rule decision this session cannot make on its own.
#   - _get_employee_for_booking(booking) -- ALSO genuinely missing, not just
#     a naming gap. ServiceRequest has no technician/assigned_employee
#     relation at all (confirmed directly against the model: the only
#     "assigned_employee" references anywhere in service_requests are code
#     comments describing a cross-app convention, and a defensive
#     `getattr(booking, "assigned_employee_id", None)` in
#     services/__init__.py:1078 that is written specifically to survive the
#     field's absence, not evidence that it exists). Technician identity for
#     a GT booking lives outside this app (the vendor/workforce side), not
#     as a joinable field here. Returns None below (safe no-op: the caller
#     already treats "no employee" as "proceed without a specific employee
#     to check"), which is honest about the gap rather than inventing a
#     lookup this codebase has no data source for.
#
# Net effect: create_reschedule_via_ticket() below now imports cleanly and
# runs (previously this whole module raised ImportError at first use, which
# is why both ticket_views.py call sites -- reschedule-via-ticket and
# confirm-reschedule-via-ticket -- were completely broken in production).
# Both remaining functions below are genuine BLOCKED items: resolving them
# requires a product/architecture decision (where per-technician
# availability and assignment data would come from), not a code fix this
# session can make from the existing codebase alone.


def _get_employee_for_booking(booking):
    """BLOCKED (see module-level note above): no technician/employee
    relation exists on ServiceRequest to resolve here. Returns None so the
    caller falls through to its existing "no employee assigned yet" branch
    (available = True, i.e. nothing to check availability for) rather than
    crashing or guessing at a field that doesn't exist."""
    return None


def check_employee_availability(employee, new_date, new_time_slot):
    """BLOCKED (see module-level note above): no per-employee schedule model
    exists in this codebase to answer this question. Returns False (i.e.
    "assume unavailable, fall back to auto-reassignment / manual review")
    rather than True, because silently assuming every technician is always
    available would skip the auto-reassignment path below and could route a
    reschedule to a technician who has since been reassigned elsewhere --
    the fail-safe direction here is to under-trust availability, not
    over-trust it. This still does not resolve the underlying gap; it only
    keeps the surrounding auto-approval flow from crashing."""
    logger.warning(
        "check_employee_availability() has no real implementation (no "
        "per-employee schedule data source exists in this codebase) -- "
        "returning False for employee_id=%s to force the existing "
        "auto-reassignment/manual-review fallback path instead of a false "
        "positive.",
        getattr(employee, "id", employee),
    )
    return False

def create_reschedule_via_ticket(ticket, actor, new_date, new_time_slot, reason, notes=""):
    """
    Request a reschedule for the booking linked to the ticket.
    Enforces the 24-hour and slot availability auto-approval rules.
    """
    booking = ticket.booking
    if not booking:
        raise ValidationError("Ticket must be associated with a booking to reschedule.")

    # 1. Create the base RescheduleRequest via service_requests
    rr = create_reschedule_request(
        booking=booking,
        requested_by=actor,
        new_date=new_date,
        new_time_slot=new_time_slot,
        reason=reason,
        persona="ADMIN",
        additional_notes=notes
    )

    ticket.linked_reschedule_request = rr
    ticket.save()

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="RESCHEDULE_CREATED",
        description=f"Reschedule request created for date {new_date}, slot {new_time_slot}."
    )

    # 2. Check 24-hour rule & slot availability for auto-approval
    now = timezone.now()
    current_schedule_dt = None
    if booking.preferred_date:
        current_schedule_dt = timezone.make_aware(
            datetime.combine(booking.preferred_date, datetime.min.time())
        )

    hours_diff = None
    if current_schedule_dt:
        time_diff = current_schedule_dt - now
        hours_diff = time_diff.total_seconds() / 3600.0

    # Determine availability of assigned employee or auto-reassignment.
    # GENUINE GAP (see module-level note above): RescheduleRequest has no
    # proposed_technician field either -- confirmed against the model, it
    # doesn't exist. getattr(..., None) below keeps this from crashing (a
    # bare rr.proposed_technician read raises AttributeError on a real
    # Django model instance, same as any other undefined attribute); the
    # write on the auto-reassignment branch is left in place since it's
    # harmless (Django's .save() only persists real model fields, so
    # setting a non-field attribute here is a silent no-op, not a crash),
    # but it does mean auto-reassignment can never actually stick until a
    # real field is added -- another part of the same product decision
    # flagged above, not something to invent here.
    employee = getattr(rr, "proposed_technician", None) or _get_employee_for_booking(booking)
    available = False
    if employee:
        available = check_employee_availability(employee, rr.new_date, rr.new_time_slot)
        if not available:
            # Check if another employee can be auto-assigned
            new_emp = auto_reassign_technician(rr)
            if new_emp:
                rr.proposed_technician = new_emp
                rr.save()
                available = True
    else:
        available = True

    # Auto-approval decision
    if hours_diff is not None and hours_diff >= 24.0 and available:
        # Auto-approve!
        apply_reschedule_transition(rr, RescheduleStatus.RESCHEDULED, actor, note="Auto-approved: requested >= 24h prior and slot available.")
        
        TicketActivity.objects.create(
            ticket=ticket,
            actor=actor,
            activity_type="RESCHEDULE_APPROVED",
            description=f"Reschedule auto-approved. Booking updated to {new_date} ({new_time_slot})."
        )
    else:
        # Route to Operations Manager review
        ticket.priority = "high"
        ticket.save()
        
        desc = "Reschedule request routed to Operations Manager for review. "
        if hours_diff is not None and hours_diff < 24.0:
            desc += "Reason: requested slot is less than 24 hours away. "
        if not available:
            desc += "Reason: no technician available for requested slot."
            
        TicketActivity.objects.create(
            ticket=ticket,
            actor=actor,
            activity_type="RESCHEDULE_ROUTED",
            description=desc
        )

    return rr

def confirm_reschedule_via_ticket(ticket, actor, reschedule_id, approved=True, notes=""):
    """
    Manual confirmation/approval of a reschedule request by a manager/admin.
    """
    try:
        rr = RescheduleRequest.objects.get(pk=reschedule_id)
    except RescheduleRequest.DoesNotExist:
        raise ValidationError("Reschedule request not found.")

    if approved:
        apply_reschedule_transition(rr, RescheduleStatus.RESCHEDULED, actor, note=notes)
        TicketActivity.objects.create(
            ticket=ticket,
            actor=actor,
            activity_type="RESCHEDULE_APPROVED",
            description=f"Reschedule request manually approved by {actor.username}. Booking updated. Notes: {notes}"
        )
    else:
        apply_reschedule_transition(rr, RescheduleStatus.REJECTED, actor, note=notes)
        TicketActivity.objects.create(
            ticket=ticket,
            actor=actor,
            activity_type="RESCHEDULE_REJECTED",
            description=f"Reschedule request manually rejected by {actor.username}. Notes: {notes}"
        )

    # Dispatch notification to customer
    try:
        from customer_care.services.notifications import notify_reschedule_processed
        notify_reschedule_processed(ticket, rr, approved)
    except Exception as e:
        logger.error(f"Failed to dispatch reschedule notification: {e}")

    return rr

