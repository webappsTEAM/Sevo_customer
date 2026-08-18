"""
service_requests/signals.py

Signals for service_requests app.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="service_requests.ServiceFeedback")
def on_feedback_submitted(sender, instance, **kwargs):
    """Signal receiver when customer submits feedback."""
    if not instance.is_submitted:
        return
    # Any necessary catalog rating cache invalidation or notifications
    from django.core.cache import cache
    try:
        cache.delete("catalog_categories_list")
    except Exception:
        pass
