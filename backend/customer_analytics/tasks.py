from celery import shared_task
from django.utils import timezone
import datetime
from customer_analytics.models import CustomerLoginEvent


@shared_task
def purge_old_login_events():
    """
    Purges CustomerLoginEvent logs older than 12 months.
    """
    cutoff = timezone.now() - datetime.timedelta(days=365)
    deleted, _ = CustomerLoginEvent.objects.filter(occurred_at__lt=cutoff).delete()
    return f"Purged {deleted} login events older than 12 months."
