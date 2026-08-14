from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from customer_care.models import CustomerCareTicket
from customer_care.services.ticket_service import escalate_ticket

User = get_user_model()

@shared_task
def auto_escalate_sla_violations():
    """
    Background cron check running every 15 minutes.
    Escalates tickets whose SLA due time has passed and are unresolved.
    """
    now = timezone.now()
    
    unresolved_tickets = CustomerCareTicket.objects.exclude(
        status__in=["resolved", "closed"]
    ).filter(
        sla_due_at__lt=now
    )

    system_actor = User.objects.filter(role="admin").first() or User.objects.filter(is_superuser=True).first()
    if not system_actor:
        system_actor = User.objects.first()

    if not system_actor:
        return "No system actor found to execute escalation."

    escalated_count = 0
    for ticket in unresolved_tickets:
        current_tier = "care_executive"
        if ticket.assigned_agent:
            try:
                profile = ticket.assigned_agent.care_profile
                current_tier = profile.care_role
            except Exception:
                pass

        if current_tier == "care_executive":
            target_tier = "ops_manager"
        elif current_tier == "ops_manager":
            target_tier = "admin"
        else:
            continue

        if ticket.escalations.filter(escalated_to_tier=target_tier, is_resolved=False).exists():
            continue

        escalate_ticket(
            ticket=ticket,
            escalated_by=system_actor,
            escalated_to_tier=target_tier,
            reason=f"SLA violation: ticket unresolved past SLA target of {ticket.sla_due_at}."
        )
        escalated_count += 1

    return f"Escalated {escalated_count} tickets due to SLA violations."
