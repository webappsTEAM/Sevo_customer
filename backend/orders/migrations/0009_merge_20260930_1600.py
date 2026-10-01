# Generated during default-branch integration.  This joins independent
# marketplace-order migration branches without changing database state.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0008_marketplace_payment_provider_identifiers"),
        ("orders", "0008_merge_20260929_2338"),
    ]

    operations = []
