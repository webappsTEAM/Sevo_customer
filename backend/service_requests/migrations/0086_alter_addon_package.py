# Generated manually to resolve pending AddOn.package AlterField
# Previously deferred across migrations 0064-0070.
# Live DB check verified 0 Addon rows exist (Null packages: 0, Total addons: 0).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0085_merge_20260911_0935'),
    ]

    operations = [
        migrations.AlterField(
            model_name='addon',
            name='package',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='addons', to='service_requests.package'),
        ),
    ]
