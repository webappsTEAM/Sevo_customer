# Adds per-user module permission overrides layered on top of the
# role-based Global RBAC matrix (accounts/permissions.py). See the field's
# help text on the model for the exact override semantics.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0025_merge_20260902_1401'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='custom_permissions',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
