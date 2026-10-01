# SEVO GT data check - READ ONLY (SELECT/count only, writes nothing).
# Run from CUS/calservices/backend:
#     python gt_db_check.py
# or:
#     python manage.py shell < gt_db_check.py

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if not os.environ.get("DJANGO_SETTINGS_MODULE"):
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
    import django
    django.setup()

from django.db import connection
from django.db.models import Count
print("DB:", connection.settings_dict.get("ENGINE"), connection.settings_dict.get("HOST"), connection.settings_dict.get("NAME"))

def sect(t): print("\n=== " + t)
from logistics.models import ServiceTier, GoodsCategory, GoodsItem, LogisticsSlot, PackersMoversConfig, Lane
sect("ServiceTier by category / city / active   (the 2W page needs category=two_wheeler, city=hosur, active)")
for r in ServiceTier.objects.values("category", "city", "is_active").annotate(n=Count("id")).order_by("category", "city"): print(r)
sect("Active tiers detail")
for t in ServiceTier.objects.order_by("category", "order"):
    print(t.id, t.category, repr(t.city), t.slug, t.name, "active=%s" % t.is_active, "vclass=%s" % t.vehicle_class,
          "start=%s base=%s perkm=%s min=%s" % (t.starting_price, t.base_fare, t.per_km_rate, t.minimum_fare),
          "kg=%s cft=%s" % (t.max_weight_kg, t.max_cft), "ptl=%s" % getattr(t, "ptl_eligible", None))
sect("Goods categories / items")
print("categories:", GoodsCategory.objects.count(), "items:", GoodsItem.objects.count(), "active items:", GoodsItem.objects.filter(is_active=True).count())
sect("LogisticsSlot by category / city / active")
for r in LogisticsSlot.objects.values("category", "city", "is_active").annotate(n=Count("id")).order_by("category", "city"): print(r)
sect("PackersMoversConfig")
for c in PackersMoversConfig.objects.all(): print(c.city, "active=%s" % c.is_active)
sect("Lanes"); print(Lane.objects.count())
try:
    from settings_hub.models import ServiceZone, ServiceZoneService
    sect("Service areas (coverage) and the GT services enabled in each")
    for z in ServiceZone.objects.all():
        print(z.id, z.name, "active=%s" % getattr(z, "is_active", "?"), [(s.service_slug, s.is_available) for s in ServiceZoneService.objects.filter(zone=z)])
except Exception as e: print("zone check failed:", e)
try:
    from logistics import models as lm
    for n in ("ProhibitedGoodsRule",):
        if hasattr(lm, n): sect(n); print(getattr(lm, n).objects.count())
    from service_requests.models import GTWaitingChargePolicy, GTCancellationPolicy, GTAdvancePaymentPolicy
    sect("Policies (rows)")
    print("waiting", GTWaitingChargePolicy.objects.count(), "cancellation", GTCancellationPolicy.objects.count(), "advance", GTAdvancePaymentPolicy.objects.count())
except Exception as e: print("policy check failed:", e)
sect("What the 2W page asks the API for -> rows returned")
q = ServiceTier.objects.filter(category="two_wheeler", is_active=True)
print("active two_wheeler tiers (any city):", q.count(), "| city iexact 'hosur':", q.filter(city__iexact="hosur").count())
print("\nIf 'two_wheeler ... hosur ... active' is missing: dry-run first: python manage.py restore_gt_admin_config   (writes nothing)")
print("then add --apply to create only the missing rows (and seed_logistics_hosur for Hosur tiers)")
