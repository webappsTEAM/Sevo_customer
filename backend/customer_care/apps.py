from django.apps import AppConfig

class CustomerCareConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customer_care"

    def ready(self):
        import customer_care.signals

        try:
            from django_celery_beat.models import PeriodicTask, IntervalSchedule
            import json
            
            schedule, _ = IntervalSchedule.objects.get_or_create(
                every=15,
                period=IntervalSchedule.MINUTES,
            )
            PeriodicTask.objects.update_or_create(
                name="Customer Care: SLA Auto-Escalation Check",
                defaults={
                    "task": "customer_care.tasks.auto_escalate_sla_violations",
                    "interval": schedule,
                    "args": json.dumps([]),
                }
            )
        except Exception:
            pass
