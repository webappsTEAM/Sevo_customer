from django.db import migrations, models


class Migration(migrations.Migration):
    """
    The live database already has a NOT NULL "eway_bill_number" column on
    service_requests_servicerequest -- added out-of-band, outside Django's
    migration history (confirmed: no migration through 0101 adds it, and it
    isn't in the separate VEN/CalTrack vendor codebase's own models either,
    which runs its own Django project on its own database anyway). See the
    field's comment in models.py for the full story -- this is the same
    class of bug customer_gstin had (an explicit NULL from the ORM
    overriding whatever default the column may or may not already have),
    just for a field Django didn't even know existed yet.

    This migration only brings Django's migration STATE in line with that
    reality via SeparateDatabaseAndState with an empty database_operations
    list. It deliberately does NOT run a real ALTER TABLE / AddField against
    the database -- the column is already physically there, so a normal
    AddField here would fail with "column already exists".
    """

    dependencies = [
        ('service_requests', '0101_gtclaimpolicy_gtextrachargepolicy_gtinsurancepolicy_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='servicerequest',
                    name='eway_bill_number',
                    field=models.CharField(blank=True, default='', max_length=20),
                ),
            ],
            database_operations=[],
        ),
    ]
