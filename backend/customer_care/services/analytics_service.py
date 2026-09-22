from django.db.models import Count, Avg, F, Q
from django.utils import timezone
from customer_care.models import CustomerCareTicket, Escalation

def get_care_analytics(company, date_from=None, date_to=None):
    """
    Get aggregated analytics for customer care tickets.
    """
    tickets = CustomerCareTicket.objects.filter(company=company) if company else CustomerCareTicket.objects.all()
    escalations = Escalation.objects.filter(ticket__company=company) if company else Escalation.objects.all()

    if date_from:
        tickets = tickets.filter(created_at__gte=date_from)
        escalations = escalations.filter(created_at__gte=date_from)
    if date_to:
        tickets = tickets.filter(created_at__lte=date_to)
        escalations = escalations.filter(created_at__lte=date_to)

    status_counts = {item["status"]: item["count"] for item in tickets.values("status").annotate(count=Count("id"))}
    priority_counts = {item["priority"]: item["count"] for item in tickets.values("priority").annotate(count=Count("id"))}
    category_counts = {item["category"]: item["count"] for item in tickets.values("category").annotate(count=Count("id"))}

    agent_counts = {
        item["username"]: item["count"] for item in (
            tickets.filter(assigned_agent__isnull=False)
            .values(username=F("assigned_agent__username"))
            .annotate(count=Count("id"))
        )
    }

    # Open tickets (active queue, excluding resolved & closed)
    open_tickets = tickets.exclude(status__in=["resolved", "closed"])
    open_tickets_count = open_tickets.count()

    # Active high priority tickets
    high_priority_open_count = open_tickets.filter(priority__in=["high", "critical"]).count()

    # Unassigned tickets (active tickets with no agent assigned)
    unassigned_count = open_tickets.filter(assigned_agent__isnull=True).count()

    # Waiting states
    waiting_customer_count = tickets.filter(status="waiting_on_customer").count()
    waiting_internal_count = tickets.filter(status="waiting_on_internal").count()

    # Resolved today vs resolved all-time
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today_count = tickets.filter(
        status="resolved",
        resolved_at__gte=today_start
    ).count()
    resolved_all_count = tickets.filter(status="resolved").count()
    closed_count = tickets.filter(status="closed").count()

    # Average resolution time from resolved tickets
    resolved_tickets = tickets.filter(status="resolved", resolved_at__isnull=False)
    avg_resolution_seconds = 0
    if resolved_tickets.exists():
        total_seconds = sum(
            (t.resolved_at - t.created_at).total_seconds()
            for t in resolved_tickets
            if t.resolved_at and t.created_at
        )
        avg_resolution_seconds = total_seconds / resolved_tickets.count()

    # SLA breached count
    sla_breached_count = tickets.exclude(status__in=["resolved", "closed"]).filter(
        sla_due_at__isnull=False,
        sla_due_at__lt=now
    ).count()

    # Total refund amount
    total_refund_amount = 0
    refund_tickets = tickets.filter(linked_refund_request__isnull=False)
    for t in refund_tickets:
        if t.linked_refund_request and hasattr(t.linked_refund_request, "requested_amount"):
            try:
                total_refund_amount += float(t.linked_refund_request.requested_amount or 0)
            except (ValueError, TypeError):
                pass

    return {
        "status_counts": status_counts,
        "priority_counts": priority_counts,
        "category_counts": category_counts,
        "agent_counts": agent_counts,
        "open_tickets_count": open_tickets_count,
        "high_priority_count": high_priority_open_count,
        "high_priority_total_count": tickets.filter(priority__in=["high", "critical"]).count(),
        "unassigned_count": unassigned_count,
        "waiting_customer_count": waiting_customer_count,
        "waiting_internal_count": waiting_internal_count,
        "resolved_today_count": resolved_today_count,
        "resolved_all_count": resolved_all_count,
        "closed_count": closed_count,
        "avg_resolution_hours": round(avg_resolution_seconds / 3600.0, 1),
        "sla_breached_count": sla_breached_count,
        "escalation_count": escalations.count(),
        "resolved_escalations": escalations.filter(is_resolved=True).count(),
        "total_refund_amount": round(total_refund_amount, 2),
        "total_tickets": tickets.count()
    }
