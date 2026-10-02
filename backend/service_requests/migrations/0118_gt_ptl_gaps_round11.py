# Round 11 (2026-09-30): PTL Porter-documented gaps -- new schema fields.
#
# gtclaimpolicy.applies_to_ptl and the two GTPTLPricingPolicy fields are new,
# Admin-configurable columns backing the Round 11 PTL gap-closure (cumulative weight
# cap, PTL-scoped claim cap/window, optional declared-value risk charge). See
# 0119_gt_ptl_porter_gaps.py for the fill-missing-only seeded default values.

import django.core.validators
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0117_gt_cancellation_and_claim_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='gtclaimpolicy',
            name='applies_to_ptl',
            field=models.BooleanField(default=False, help_text="Scope this policy to Part Truck Load bookings specifically. PTL bookings share service_category='goods_transport_truck' with ordinary Spot truck bookings, so this flag is the only way to give PTL its own claim cap/window distinct from Spot truck (Porter-documented PTL cap ~Rs 1,000 / 72h window vs Rs 5,000 / 24h for Spot truck). A row with this on is only ever matched for a booking whose logistics_booking_mode is 'ptl'; non-PTL bookings always skip it."),
        ),
        migrations.AddField(
            model_name='gtptlpricingpolicy',
            name='ptl_cumulative_weight_cap_kg',
            field=models.DecimalField(blank=True, decimal_places=2, default=Decimal('3000.00'), help_text="Porter-documented (porter.in/part-load-service): a Part Truck Load consignment's declared weight may not exceed this, independent of the vehicle tier's own capacity. Default 3000 kg is Porter's published figure; read here as a per-consignment cap (Porter's wording does not distinguish per-consignment vs cumulative-across-bookings; per-consignment is the safer, more literal reading -- see ptl_pricing.py). Blank = no cap.", max_digits=8, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))]),
        ),
        migrations.AddField(
            model_name='gtptlpricingpolicy',
            name='ptl_declared_value_risk_rate_percent',
            field=models.DecimalField(decimal_places=2, default=Decimal('2.00'), help_text="Porter-documented (porter.in/part-load-service): optional 'accepted risk' declared-value charge, as a percent of the declared consignment value. Only applied when the customer declares a value AND opts into the risk charge for this PTL booking -- never automatic. Set to 0 to disable the option entirely.", max_digits=5, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]),
        ),
    ]
