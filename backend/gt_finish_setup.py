# Idempotent GT finishing setup. Run:  python manage.py shell < gt_finish_setup.py
# Only CREATES what is missing; never overwrites values you already set in Admin.
from decimal import Decimal as D
from service_requests.models import GTWaitingChargePolicy, GTAdvancePaymentPolicy, GTPTLPricingPolicy, GTCancellationPolicy
from logistics.models import LogisticsSlot, ServiceTier
from settings_hub.models import ServiceZone

def mk(model, **vals):
    sc = {"service_category": ""} if any(f.name == "service_category" for f in model._meta.fields) else {}
    o = model.objects.filter(is_active=True, **sc).first()
    if o: print("exists ", model.__name__, o.pk); return
    o = model.objects.create(is_active=True, **sc, **vals); print("created", model.__name__, o.pk)

mk(GTWaitingChargePolicy, is_enabled=True, free_minutes_per_stop=10, rate_per_minute=D("2.00"))
mk(GTAdvancePaymentPolicy, is_enabled=False, advance_percent=0)
mk(GTPTLPricingPolicy, is_enabled=True, rate_per_kg=D("8.00"))
if not GTCancellationPolicy.objects.filter(is_active=True).exists():
    GTCancellationPolicy.objects.create(service_category="", is_active=True, fee_mode="FLAT", flat_fee_amount=D("50.00")); print("created cancellation")

if not LogisticsSlot.objects.filter(category="ptl").exists():
    for i,(lab,s,e) in enumerate([("09:00 AM - 11:00 AM","09:00","11:00"),("02:00 PM - 04:00 PM","14:00","16:00")]):
        LogisticsSlot.objects.create(category="ptl", city="hosur", group="Morning" if i==0 else "Afternoon", slot_label=lab, start_time=s, end_time=e, capacity=10, order=i+1, is_active=True)
    print("created ptl slots")
else: print("ptl slots exist")

for z in ServiceZone.objects.all():
    n = z.zone_services.count()
    if n == 0:
        print("deleting empty zone", z.pk, z.name); z.delete()
print("zones left:", [(z.pk, z.name) for z in ServiceZone.objects.all()])
for t in ServiceTier.objects.filter(category="packers_movers"):
    print("P&M tier", t.pk, t.name, "NEEDS distance pricing in Catalog > Packages" )

# --- rename zone "H" -> "Hosur" and give it Packers & Movers too
from settings_hub.models import ServiceZoneService
for z in ServiceZone.objects.filter(name="H"):
    z.name = "Hosur"; z.save(); print("renamed zone", z.pk, "-> Hosur")
    if not z.zone_services.filter(service_slug="packers_movers").exists():
        ServiceZoneService.objects.create(zone=z, service_slug="packers_movers", service_name="Packers & Movers", is_available=True); print("added P&M to zone", z.pk)

# --- P&M distance pricing placeholders (ONLY where unset; edit real rates in Catalog > Packages)
defaults = {"1rk-1bhk-shifting": (D("1500"), D("40")), "2bhk-3bhk-shifting": (D("3000"), D("60"))}
for t in ServiceTier.objects.filter(category="packers_movers"):
    if not t.per_km_rate:
        b, k = defaults.get(t.slug, (D("5000"), D("90")))
        t.base_fare = t.base_fare or b; t.per_km_rate = k; t.save(update_fields=["base_fare", "per_km_rate"])
        print("P&M placeholder pricing set on", t.pk, t.name, t.base_fare, t.per_km_rate)
print("DONE")

# --- Pickup 8ft capacity must be 1250 kg (public Porter spec); the restore had 1200
from logistics.models import ServiceTier as _ST
for t in _ST.objects.filter(slug__icontains="pickup-8ft", max_weight_kg=1200):
    t.max_weight_kg = 1250
    if "1.2 Ton" in (t.name or ""): t.name = t.name.replace("1.2 Ton", "1.25 Ton")
    if (t.capacity_label or "").replace(" ", "").lower() in ("1200kg", "1,200kg", "1.2ton"): t.capacity_label = "1250 kg"
    t.save(update_fields=["max_weight_kg", "name", "capacity_label"]); print("pickup-8ft capacity -> 1250 kg", t.pk, t.name)
