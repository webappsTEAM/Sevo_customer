from django.db import migrations

def _blank_duplicate_idempotency_keys(apps, schema_editor):
    """Migration 0087 dropped unique_customer_idempotency_key (and it was never re-added although the
    model still declares it), so duplicate (customer, idempotency_key) pairs may exist by now. Keep the
    earliest booking's key and blank the rest, otherwise re-adding the constraint would fail on a live
    database. The key is only a de-duplication token; blanking a later duplicate loses nothing."""
    ServiceRequest = apps.get_model("service_requests", "ServiceRequest")
    from django.db.models import Count
    dupes = (
        ServiceRequest.objects.exclude(idempotency_key__isnull=True).exclude(idempotency_key="").exclude(customer__isnull=True)
        .values("customer_id", "idempotency_key").annotate(n=Count("id")).filter(n__gt=1)
    )
    for group in dupes:
        rows = list(
            ServiceRequest.objects.filter(
                customer_id=group["customer_id"], idempotency_key=group["idempotency_key"],
            ).order_by("id").values_list("id", flat=True)
        )
        ServiceRequest.objects.filter(id__in=rows[1:]).update(idempotency_key="")


class Migration(migrations.Migration):
    """Data step kept in its own migration so it runs (and commits) before the schema migration that
    re-adds the constraint -- mixing row updates and ALTER TABLE in one transaction can fail on Postgres."""

    dependencies = [
        ('service_requests', '0099_package_gt_gst_rate'),
    ]

    operations = [
        migrations.RunPython(_blank_duplicate_idempotency_keys, migrations.RunPython.noop),
    ]
