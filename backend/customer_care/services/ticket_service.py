import logging
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from customer_care.models import CustomerCareTicket, TicketMessage, TicketActivity, Escalation

logger = logging.getLogger(__name__)


TICKET_TRANSITIONS = {
    "new": {"assigned", "escalated", "closed"},
    "assigned": {"in_progress", "escalated", "closed"},
    "in_progress": {"waiting_on_customer", "waiting_on_internal", "escalated", "resolved"},
    "waiting_on_customer": {"in_progress", "escalated", "closed"},
    "waiting_on_internal": {"in_progress", "escalated"},
    "escalated": {"in_progress", "resolved"},
    "resolved": {"closed", "reopened"},
    "reopened": {"assigned", "in_progress"},
    "closed": set(),
}

SLA_HOURS_BY_PRIORITY = {
    "critical": 4,
    "high": 8,
    "medium": 24,
    "low": 72,
}

def create_ticket(company, created_by, category, priority, channel, customer=None, customer_name="", phone="", email="", booking=None, linked_complaint=None):
    # Compute SLA target
    hours = SLA_HOURS_BY_PRIORITY.get(priority, 24)
    sla_due_at = timezone.now() + timedelta(hours=hours)

    ticket = CustomerCareTicket.objects.create(
        company=company,
        created_by=created_by,
        category=category,
        priority=priority,
        channel=channel,
        customer=customer,
        # customer.phone/email can themselves be None (not just absent), in
        # which case `phone or (getattr(...) if customer else "")` still
        # evaluates to None -- `getattr` returns the real (None) attribute
        # value here, it only falls back to its default when the attribute
        # doesn't exist at all. CustomerCareTicket.phone is NOT NULL, so an
        # unwrapped None reaching .create() raises IntegrityError. Coercing
        # each fallback to "" if it's falsy closes that gap without changing
        # behavior for the common case (a real phone/email/name present).
        customer_name=customer_name or ((customer.get_full_name() if customer else "") or ""),
        phone=phone or ((getattr(customer, "phone", "") if customer else "") or ""),
        email=email or ((getattr(customer, "email", "") if customer else "") or ""),
        booking=booking,
        linked_complaint=linked_complaint,
        sla_due_at=sla_due_at,
        status="new"
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=created_by,
        activity_type="CREATED",
        to_status="new",
        description=f"Ticket created via {ticket.get_channel_display()}."
    )

    return ticket

def change_ticket_status(ticket, actor, new_status, note=""):
    from_status = ticket.status
    if new_status == from_status:
        return ticket

    allowed_next = TICKET_TRANSITIONS.get(from_status, set())
    if new_status not in allowed_next:
        raise ValidationError(f"Transition from {from_status} to {new_status} is not allowed.")

    ticket.status = new_status
    if new_status == "resolved":
        ticket.resolved_at = timezone.now()
        ticket.resolution_summary = note
    elif new_status == "closed":
        ticket.closed_at = timezone.now()
    elif new_status in ["in_progress", "assigned"]:
        ticket.resolved_at = None
        ticket.closed_at = None

    ticket.save()

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="STATUS_CHANGE",
        from_status=from_status,
        to_status=new_status,
        description=f"Status changed from {from_status} to {new_status}. Note: {note}"
    )

    # Dispatch notification if resolved
    if new_status == "resolved":
        try:
            from customer_care.services.notifications import notify_ticket_resolved
            notify_ticket_resolved(ticket)
        except Exception as e:
            logger.error(f"Failed to dispatch ticket resolution notification: {e}")

    return ticket


def assign_ticket(ticket, actor, agent):
    """
    Assign ticket to an agent. Transitions status to 'assigned' if currently 'new'.
    """
    old_agent = ticket.assigned_agent
    ticket.assigned_agent = agent
    
    from_status = ticket.status
    to_status = from_status
    if ticket.status == "new":
        ticket.status = "assigned"
        to_status = "assigned"

    ticket.save()

    desc = f"Ticket assigned to {agent.username}."
    if old_agent:
        desc = f"Ticket reassigned from {old_agent.username} to {agent.username}."

    TicketActivity.objects.create(
        ticket=ticket,
        actor=actor,
        activity_type="ASSIGNMENT",
        from_status=from_status,
        to_status=to_status,
        description=desc
    )

    return ticket

def add_message(ticket, sender, message, is_internal_note=False):
    # Determine persona
    persona = TicketMessage.SenderPersona.AGENT
    if ticket.customer == sender:
        persona = TicketMessage.SenderPersona.CUSTOMER
    elif getattr(sender, "role", "") == "customer":
        persona = TicketMessage.SenderPersona.CUSTOMER

    msg = TicketMessage.objects.create(
        ticket=ticket,
        sender=sender,
        sender_persona=persona,
        message=message,
        is_internal_note=is_internal_note
    )

    if persona == TicketMessage.SenderPersona.AGENT and not ticket.first_response_at:
        ticket.first_response_at = timezone.now()
        ticket.save()

    TicketActivity.objects.create(
        ticket=ticket,
        actor=sender,
        activity_type="MESSAGE_ADDED",
        description=f"Added message (Internal Note: {is_internal_note})."
    )

    return msg

def escalate_ticket(ticket, escalated_by, escalated_to_tier, reason):
    """
    Escalate a ticket. Forces priority to high or critical, creates an Escalation,
    and transitions ticket status to 'escalated'.
    """
    if ticket.priority in ["low", "medium"]:
        ticket.priority = "high"

    from_status = ticket.status
    ticket.status = "escalated"
    ticket.save()

    esc = Escalation.objects.create(
        ticket=ticket,
        escalated_by=escalated_by,
        escalated_to_tier=escalated_to_tier,
        reason=reason
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=escalated_by,
        activity_type="ESCALATION",
        from_status=from_status,
        to_status="escalated",
        description=f"Ticket escalated to {escalated_to_tier}. Reason: {reason}"
    )

    return esc

def resolve_escalation(escalation, resolved_by, note=""):
    escalation.is_resolved = True
    escalation.resolution_note = note
    escalation.resolved_at = timezone.now()
    escalation.save()

    ticket = escalation.ticket
    from_status = ticket.status
    ticket.status = "in_progress"
    ticket.save()

    TicketActivity.objects.create(
        ticket=ticket,
        actor=resolved_by,
        activity_type="STATUS_CHANGE",
        from_status=from_status,
        to_status="in_progress",
        description=f"Escalation resolved by {resolved_by.username}. Note: {note}"
    )

    return escalation
