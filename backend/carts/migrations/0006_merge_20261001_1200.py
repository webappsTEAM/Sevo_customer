# Joins the current default-branch cart migration lineage with the Seller Hub
# basket fields. Both parents are already applied independently in existing
# environments, so this migration deliberately has no database operations.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("carts", "0005_merge_20260929_2338"),
        ("carts", "0004_basket_support"),
    ]

    operations = []
