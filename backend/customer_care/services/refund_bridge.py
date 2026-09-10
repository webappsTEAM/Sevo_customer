from decimal import Decimal
from django.core.exceptions import ValidationError
from rest_framework.exceptions import PermissionDenied
from customer_care.models import TicketActivity
from customer_care.permissions import get_care_access

# Import service functions from service_requests
from service_requests.services import (
    create_refund_request,
    admin_approve_refund,
    admin_reject_refund,
    admin_send_to_finance,
    admin_complete_refund,
)

def request_refund_via_ticket(ticket, actor, refund_type, requested_amount, reason, additional_notes="", evidence_files=None):
    """
    Request a refund for the booking associated with the ticket.
    Delegates to service_requests.services.create_refund_request.
    """
    if not ticket.booking:
        raise ValidationError({"detail": "Ticket must have a Service Request Booking ID set before requesting a refund. Please edit the ticket and link a booking."})

    # Resolve customer: prefer ticket.customer (linked User), fall back to booking's own customer
    customer = ticket.customer or getattr(ticket.booking, "customer", None)
    if not customer:
        raise ValidationError({"detail": "Could not resolve a customer for this ticket. Please link the ticket to a registered customer account."})

    refund_req = create_refund_request(
        booking=ticket.booking,
        customer=customer,
        amount=requested_amount,
        reason=reason,
        additional_notes=additional_notes,
        refund_type=refund_type,
    )

    ticket.linked_refund_request = refund_req
    ticket.save()

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="REFUND_LINKED",
        description=f"Refund request of ₹{requested_amount} created and linked to ticket. Refund ID: {refund_req.refund_id}"
    )

    return refund_req

def approve_refund_via_ticket(ticket, actor, is_full=True, approved_amount=None, internal_note=""):
    """
    Approve the linked refund request for this ticket.
    Checks care tier refund limits before calling admin_approve_refund.
    """
    refund_req = ticket.linked_refund_request
    if not refund_req:
        raise ValidationError({"detail": "No refund request is currently linked to this ticket."})

    amount_to_check = refund_req.requested_amount
    if not is_full and approved_amount is not None:
        amount_to_check = Decimal(str(approved_amount))

    access = get_care_access(actor)
    limit = access["refund_limit"]
    
    if limit is not None and amount_to_check > limit:
        raise PermissionDenied(
            f"Your care agent role ({access['tier']}) is limited to approving refunds up to ₹{limit}. "
            f"The requested amount is ₹{amount_to_check}."
        )

    result = admin_approve_refund(
        admin_user=actor,
        refund_id=refund_req.id,
        is_full=is_full,
        approved_amount=approved_amount,
        internal_note=internal_note
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="REFUND_STATUS",
        description=f"Refund request approved by {actor.username}. Approved Amount: ₹{amount_to_check}."
    )

    return result

def reject_refund_via_ticket(ticket, actor, internal_note=""):
    """
    Reject the linked refund request.
    """
    refund_req = ticket.linked_refund_request
    if not refund_req:
        raise ValidationError({"detail": "No refund request is currently linked to this ticket."})

    result = admin_reject_refund(
        admin_user=actor,
        refund_id=refund_req.id,
        internal_note=internal_note
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="REFUND_STATUS",
        description=f"Refund request rejected by {actor.username}. Note: {internal_note}"
    )

    return result

def send_refund_to_finance_via_ticket(ticket, actor):
    """
    Send approved refund to finance.
    """
    refund_req = ticket.linked_refund_request
    if not refund_req:
        raise ValidationError({"detail": "No refund request is currently linked to this ticket."})

    result = admin_send_to_finance(
        admin_user=actor,
        refund_id=refund_req.id
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="REFUND_STATUS",
        description="Refund request submitted to finance department."
    )

    return result

def complete_refund_via_ticket(ticket, actor):
    """
    Complete the refund payment.
    """
    refund_req = ticket.linked_refund_request
    if not refund_req:
        raise ValidationError({"detail": "No refund request is currently linked to this ticket."})

    result = admin_complete_refund(
        admin_user=actor,
        refund_id=refund_req.id
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="REFUND_STATUS",
        description="Refund request completed (payment disbursed)."
    )

    return result
