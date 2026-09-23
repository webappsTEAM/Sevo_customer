# Optional per-invite module permission customization, copied onto the new
# User.custom_permissions when the invite is accepted. Same shape/semantics
# as accounts.models.User.custom_permissions.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_hub', '0010_gt_b06_city'),
    ]

    operations = [
        migrations.AddField(
            model_name='teaminvite',
            name='custom_permissions',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
