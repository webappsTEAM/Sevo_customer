# Joins the current default-branch order/payment lineage with the independent
# Seller Hub basket snapshot migration without rewriting either history.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0009_merge_20260930_1600"),
        ("orders", "0006_basket_support"),
    ]

    operations = []
