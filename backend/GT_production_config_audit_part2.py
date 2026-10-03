"""SEVO GT production configuration audit, PART 2 -- READ ONLY (no writes).

CUSTOMER backend:  python manage.py shell < GT_production_config_audit_part2.py
(Covers what part 1 did not print: P&M config, which services each zone serves, tier pricing, PTL tier flags.)
"""
from decimal import Decimal
from django.forms.models import model_to_dict


def show(title, qs, fields=None):
    print(f"\n=== {title} ({qs.count()}) ===")
    for o in qs:
        d = model_to_dict(o)
        if fields:
            d = {k: d.get(k) for k in fields if k in d}
        print({k: (str(v) if isinstance(v, Decimal) else v) for k, v in d.items() if not hasattr(v, "read")})


from logistics.models import ServiceTier, PackersMoversConfig
from settings_hub.models import ServiceZone, ServiceZoneService

show("A. ZONE -> SERVICES SERVED (P&M, truck, two-wheeler must be available in the zone)",
     ServiceZoneService.objects.all(), ["zone", "service_slug", "service_name", "is_available"])
show("B. ZONES (full row, to read the polygon boundary/geometry fields)", ServiceZone.objects.all())
show("C. TIER PRICING (distance pricing present? P&M tiers need it)",
     ServiceTier.objects.all(),
     ["id", "category", "name", "base_fare", "per_km_rate", "free_km", "minimum_fare", "loading_unloading_charge",
      "additional_stop_charge", "starting_price", "ptl_eligible", "is_active"])
show("D. PACKERS & MOVERS CONFIG", PackersMoversConfig.objects.all())
