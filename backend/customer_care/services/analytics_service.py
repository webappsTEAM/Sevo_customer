from django.db.models import Count, Avg, F
from django.utils import timezone
from customer_care.models import CustomerCareTicket, Escalation

def get_care_analytics(company, date_from=None, date_to=None):
    """
    Get aggregated analytics for customer care tickets.
    """
    tickets = CustomerCareTicket.objects.filter(company=company)
    escalations = Escalation.objects.filter(ticket__company=company)

    if date_from:
        tickets = tickets.filter(created_at__gte=date_from)
        escalations = escalations.filter(created_at__gte=date_from)
    if date_to:
        tickets = tickets.filter(created_at__lte=date_to)
        escalations = escalations.filter(created_at__lte=date_to)

    status_counts = tickets.values("status").annotate(count=Count("id"))
    priority_counts = tickets.values("priority").annotate(count=Count("id"))
    category_counts = tickets.values("category").annotate(count=Count("id"))

    agent_counts = (
        tickets.filter(assigned_agent__isnull=False)
        .values(username=F("assigned_agent__username"))
        .annotate(count=Count("id"))
    )

    resolved_tickets = tickets.filter(status="resolved", resolved_at__isnull=False)
    avg_resolution_seconds = 0
    if resolved_tickets.exists():
        total_seconds = sum(
            (t.resolved_at - t.created_at).total_seconds() for t in resolved_tickets
        )
        avg_resolution_seconds = total_seconds / resolved_tickets.count()

    sla_breached_count = tickets.exclude(status__in=["resolved", "closed"]).filter(
        sla_due_at__lt=timezone.now()
    ).count()

    total_refund_amount = 0
    refund_tickets = tickets.filter(linked_refund_request__isnull=False)
    for t in refund_tickets:
        total_refund_amount += float(t.linked_refund_request.requested_amount)

    return {
        "status_counts": {item["status"]: item["count"] for item in status_counts},
        "priority_counts": {item["priority"]: item["count"] for item in priority_counts},
        "category_counts": {item["category"]: item["count"] for item in category_counts},
        "agent_counts": {item["username"]: item["count"] for item in agent_counts},
        "avg_resolution_hours": round(avg_resolution_seconds / 3600.0, 1),
        "sla_breached_count": sla_breached_count,
        "escalation_count": escalations.count(),
        "resolved_escalations": escalations.filter(is_resolved=True).count(),
        "total_refund_amount": total_refund_amount,
        "total_tickets": tickets.count()
    }
