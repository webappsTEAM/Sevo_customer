from logistics.models import ServiceTier
for t in ServiceTier.objects.filter(name__icontains="pickup"):
    print("BEFORE", t.pk, t.slug, repr(t.name), t.max_weight_kg, t.capacity_label, t.category)
    t.max_weight_kg = 1250
    t.capacity_label = "1250 kg"
    t.save(update_fields=["max_weight_kg", "capacity_label"])
    print("AFTER ", t.pk, t.max_weight_kg)
print("FIX_DONE")
