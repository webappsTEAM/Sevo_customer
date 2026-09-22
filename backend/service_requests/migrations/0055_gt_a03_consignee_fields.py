# Hand-written migration -- see 0054_customer_wallet.py for why. Verified by
# loading via importlib against a locally-installed Django to confirm the
# Migration class parses and matches the model definitions -- not verified
# against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# GT-A-03: adds ServiceRequest.declared_value and .consignee_relationship,
# enforced together (with the already-existing drop_contact_name/phone)
# once declared_value crosses HIGH_VALUE_CONSIGNMENT_THRESHOLD -- see
# ServiceRequestPublicCreateSerializer.validate().

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0054_customer_wallet'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='declared_value',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='consignee_relationship',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
