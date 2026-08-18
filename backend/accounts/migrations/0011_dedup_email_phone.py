from django.db import migrations
from django.db.models import Count


def _dedup(apps, field_name):
    User = apps.get_model('accounts', 'User')
    dupes = (
        User.objects.exclude(**{field_name: ""})
        .values(field_name)
        .annotate(c=Count("id"))
        .filter(c__gt=1)
    )
    for row in dupes:
        value = row[field_name]
        candidates = list(User.objects.filter(**{field_name: value}).order_by("date_joined"))
        # Keep whichever row has actually been logged into; if none (or more
        # than one) has, keep the oldest — never touch the keeper, blank the
        # rest. Written generically (not hardcoded to specific rows) so this
        # is safe to re-run if more test/duplicate data accumulates later.
        keeper = next((u for u in candidates if u.last_login is not None), candidates[0])
        for u in candidates:
            if u.id != keeper.id:
                setattr(u, field_name, "")
                u.save(update_fields=[field_name])


def forwards(apps, schema_editor):
    _dedup(apps, "email")
    _dedup(apps, "phone")


def backwards(apps, schema_editor):
    # Data cleanup is not reversible (the original colliding values aren't
    # recoverable) — intentionally a no-op so `migrate` back doesn't error.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_user_idx_user_email_user_idx_user_role_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
