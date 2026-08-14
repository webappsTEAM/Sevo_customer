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
    is_booking_reschedule_eligible,
    check_employee_availability,
    _get_employee_for_booking,
    auto_reassign_technician,
)

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

    # Determine availability of assigned employee or auto-reassignment
    employee = rr.proposed_technician or _get_employee_for_booking(booking)
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

