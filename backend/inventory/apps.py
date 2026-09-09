from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _setup_vegetable_stock_periodic_tasks(sender, **kwargs):
    """
    Registers the 4:00 AM daily vegetable stock reset task with django_celery_beat.
    """
    try:
        from django_celery_beat.models import PeriodicTask, CrontabSchedule
        import json
        from django.conf import settings

        # 4:00 AM daily schedule
        crontab, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="4",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone=getattr(settings, "TIME_ZONE", "Asia/Kolkata"),
        )
        PeriodicTask.objects.update_or_create(
            name="Inventory: Daily Vegetable Stock Reset (4:00 AM)",
            defaults={
                "task": "inventory.tasks.daily_vegetable_stock_reset",
                "crontab": crontab,
                "args": json.dumps([]),
                "enabled": True,
            }
        )
    except Exception:
        # Ignore exceptions during migration steps before celery tables exist
        pass


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'

    def ready(self):
        import inventory.signals  # noqa: F401
        post_migrate.connect(_setup_vegetable_stock_periodic_tasks, sender=self)

