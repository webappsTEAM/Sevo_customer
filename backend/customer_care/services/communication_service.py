from django.utils import timezone
from customer_care.models import CommunicationLog, TicketActivity

def log_communication(ticket, logged_by, channel, direction, summary, duration_seconds=None, occurred_at=None):
    """
    Log a manual communication (call, SMS, email, WhatsApp, in person) on a ticket.
    """
    log = CommunicationLog.objects.create(
        ticket=ticket,
        channel=channel,
        direction=direction,
        summary=summary,
        duration_seconds=duration_seconds,
        logged_by=logged_by,
        occurred_at=occurred_at or timezone.now()
    )

    TicketActivity.objects.create(
        ticket=ticket,
        actor=logged_by,
        activity_type="COMMUNICATION_LOGGED",
        description=f"Logged manual {direction} {channel}. Summary: {summary[:100]}..."
    )

    return log
