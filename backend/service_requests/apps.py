import json
import logging

from django.apps import AppConfig
from django.db.models.signals import post_migrate

logger = logging.getLogger(__name__)

# (name, dotted task path, minutes). Rows are created once with get_or_create so
# operators can retune the interval or disable a row in the Django admin without
# the next migrate overwriting their choice.
GT_PERIODIC_TASKS = (
    (
        "GT: Expire unpaid online bookings",
        "service_requests.tasks.expire_unpaid_online_bookings_task",
        5,
    ),
)


def register_gt_periodic_tasks(sender=None, **kwargs):
    """Make sure the unpaid-online-booking expiry sweep is actually scheduled."""
    try:
        from django_celery_beat.models import IntervalSchedule, PeriodicTask

        for name, task, minutes in GT_PERIODIC_TASKS:
            schedule, _ = IntervalSchedule.objects.get_or_create(
                every=minutes, period=IntervalSchedule.MINUTES
            )
            PeriodicTask.objects.get_or_create(
                name=name,
                defaults={"task": task, "interval": schedule, "args": json.dumps([])},
            )
    except Exception:  # tables may not exist yet (first migrate) - retried on next migrate
        logger.debug("GT periodic task registration skipped", exc_info=True)


class ServiceRequestsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "service_requests"
    verbose_name = "Service Requests"

    def ready(self):
        import service_requests.signals  # noqa: F401
        post_migrate.connect(register_gt_periodic_tasks, sender=self)
