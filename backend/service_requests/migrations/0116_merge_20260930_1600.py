# Generated during default-branch integration.  This joins independent
# service-request migration branches without changing database state.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0091_consultationpricingconfig_vendorwarehouse"),
        ("service_requests", "0102_eway_bill_number_state_only"),
        ("service_requests", "0102_payment_provider_identifiers"),
        ("service_requests", "0115_gt_max_weight_kg"),
    ]

    operations = []
