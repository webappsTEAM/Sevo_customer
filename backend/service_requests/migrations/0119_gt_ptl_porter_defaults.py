# NOTE: stray filename artifact from this round's migration authoring (the underlying
# device file could not be deleted from this sandbox -- see git history/report for why).
# Intentionally a no-op migration; the real Round 11 seed logic lives in
# 0119_gt_ptl_porter_gaps.py, which this depends on.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0119_gt_ptl_porter_gaps'),
    ]

    operations = []
