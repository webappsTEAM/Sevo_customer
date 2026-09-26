from django.db import migrations


def remove_daily_reset_periodic_task(apps, schema_editor):
    try:
        from django_celery_beat.models import PeriodicTask
        PeriodicTask.objects.filter(task="inventory.tasks.daily_vegetable_stock_reset").delete()
    except Exception:
        pass


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0021_remove_vegetablecategory_unit_basis_and_more'),
    ]

    operations = [
        migrations.RunPython(remove_daily_reset_periodic_task, noop_reverse),
    ]
