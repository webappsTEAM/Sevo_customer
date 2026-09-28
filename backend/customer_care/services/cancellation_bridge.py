import logging
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.utils import timezone
from customer_care.models import CancellationRequest, TicketActivity

logger = logging.getLogger(__name__)

from service_requests.models import ServiceRequest
from service_requests.state_machine import apply_transition
from service_requests.services import create_refund_request

def request_cancellation_via_ticket(ticket, actor, reason, reason_note="", retention_offered=False, retention_outcome=""):
    """
    Request booking cancellation from a ticket. Creates a CancellationRequest record.
    If the booking has been paid/collected, automatically creates and links a draft RefundRequest.
    """
    booking = ticket.booking
    if not booking:
        raise ValidationError("Ticket must be associated with a booking to request cancellation.")

    if booking.status in ["cancelled", "completed", "closed"]:
        raise ValidationError(f"Cannot request cancellation for booking in '{booking.status}' status.")

    # Create the CancellationRequest
    cancel_req = CancellationRequest.objects.create(
        ticket=ticket,
        booking=booking,
        reason=reason,
        reason_note=reason_note,
        retention_offered=retention_offered,
        retention_outcome=retention_outcome,
        requested_by=actor,
        status=CancellationRequest.Status.PENDING
    )

    # Check if payment has been made (PaymentStatus PAID or COLLECTED)
    is_paid = booking.payment_status in ["paid", "collected"]
    refund_req = None

    if is_paid:
        from datetime import datetime
        now = timezone.now()
        scheduled_dt = None
        if booking.preferred_date:
            scheduled_dt = timezone.make_aware(
                datetime.combine(booking.preferred_date, datetime.min.time())
            )
        
        hours_diff = None
        if scheduled_dt:
            time_diff = scheduled_dt - now
            hours_diff = time_diff.total_seconds() / 3600.0
            
        base_amount = booking.final_amount or booking.total_amount or Decimal("0.00")
        late_fee = Decimal("0.00")
        
        # Deduct 10% late fee (capped at ₹500) if cancelled < 24 hours in advance
        if hours_diff is not None and hours_diff < 24.0:
            late_fee = min(base_amount * Decimal("0.10"), Decimal("500.00"))
            
        refund_amount = max(Decimal("0.00"), base_amount - late_fee)
        
        customer = ticket.customer or getattr(booking, "customer", None)
        if customer:
            ref_type = "FULL" if late_fee == Decimal("0.00") else "PARTIAL"
            refund_req = create_refund_request(
                booking=booking,
                customer=customer,
                amount=refund_amount,
                refund_type=ref_type,
                reason=f"Auto-generated draft refund from cancellation ticket {ticket.ticket_number}. Reason: {reason}",
                additional_notes=reason_note
            )
            cancel_req.refund_request = refund_req
            cancel_req.save()

            ticket.linked_refund_request = refund_req
            ticket.save()

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="CANCELLATION_REQUESTED",
        description=(
            f"Cancellation request created (Status: PENDING). Reason: {reason}. "
            f"Refund Auto-drafted: {'Yes (ID: ' + str(refund_req.refund_id) + ')' if refund_req else 'No'}."
        )
    )

    return cancel_req

def approve_cancellation_via_ticket(ticket, actor, is_approved=True):
    """
    Approve or reject a cancellation request.
    If approved, applies status='cancelled' to the ServiceRequest booking via its state machine,
    and updates the CancellationRequest status to APPROVED -> COMPLETED.
    """
    cancel_req = ticket.cancellation_requests.filter(status=CancellationRequest.Status.PENDING).first()
    if not cancel_req:
        raise ValidationError("No pending cancellation request found for this ticket.")

    booking = cancel_req.booking

    if is_approved:
        # 1. Update request status
        cancel_req.status = CancellationRequest.Status.APPROVED
        cancel_req.approved_by = actor
        cancel_req.decided_at = timezone.now()
        cancel_req.save()

        # 2. Call service_requests state machine to cancel the booking
        apply_transition(booking, ServiceRequest.Status.CANCELLED, actor=actor)
        booking.save()

        # 3. Transition to COMPLETED
        cancel_req.status = CancellationRequest.Status.COMPLETED
        cancel_req.save()

        TicketActivity.objects.create(
            ticket=ticket,
            actor=actor,
            activity_type="CANCELLATION_APPROVED",
            description=f"Cancellation request approved by {actor.username}. Booking status changed to CANCELLED."
        )
    else:
        # Reject
        cancel_req.status = CancellationRequest.Status.REJECTED
        cancel_req.approved_by = actor
        cancel_req.decided_at = timezone.now()
        cancel_req.save()

        TicketActivity.objects.create(
            ticket=ticket,
            actor=actor,
            activity_type="CANCELLATION_REJECTED",
            description=f"Cancellation request rejected by {actor.username}."
        )

    # Dispatch notification to customer
    try:
        from customer_care.services.notifications import notify_cancellation_processed
        notify_cancellation_processed(ticket, cancel_req, is_approved)
    except Exception as e:
        logger.error(f"Failed to dispatch cancellation notification: {e}")

    return cancel_req

