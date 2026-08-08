"""
backend/logistics/models.py

Read-mostly catalog for the two Goods & Transport flows (per TL-confirmed scope):
  - Goods Transport  → categories TRUCK, TWO_WHEELER
  - Packers & Movers → category  PACKERS_MOVERS

Deliberately NOT the full CALTRACK_PHASE_14 entity set (Vehicle fleet, Trip,
TripStop, Consignment, ManifestItem, EWayBill, InsurancePolicy...). That set
is ~255 days of work per the architecture doc's own effort table and several
of its pieces (e-way bill exemption, GST RCM mechanics) are marked [COUNSEL]
— not implementable without legal sign-off. This app is the MVP slice: real,
server-owned pricing/catalog data to replace what's currently hardcoded
inside the three booking page components, plus enough on ServiceRequest
(see service_requests/models.py) to actually persist a booking.

No `company` FK on any model here — same convention as
service_requests.CatalogCategory / CatalogService: this is public catalog
data served pre-login on marketing/booking pages, not tenant-scoped data.
"""
from django.db import models


class LogisticsCategory(models.TextChoices):
    TRUCK = "truck", "Truck / Mini Truck"
    TWO_WHEELER = "two_wheeler", "Two Wheeler"
    PACKERS_MOVERS = "packers_movers", "Packers & Movers"


class ServiceArea(models.Model):
    """
    'Areas We Serve in <city>' — identical list reused across all three
    booking pages for a given city (confirmed by comparing the three PDFs:
    Sipcot Phase 1/2, Bagalur Road, Mathigiri... appears verbatim on all
    three). One table per city, not one per category.
    """
    city = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["city", "order", "name"]
        unique_together = [["city", "name"]]
        verbose_name = "Service Area"
        verbose_name_plural = "Service Areas"

    def __str__(self):
        return f"{self.name} ({self.city})"


class ServiceTier(models.Model):
    """
    A bookable option card: vehicle class for Goods Transport (3 Wheeler,
    Tata Ace, 2 Wheeler, 2 Wheeler Electric/Express) or a package for
    Packers & Movers (1RK/1BHK, 2BHK/3BHK, Villa/Office Relocation).

    Fields are a deliberate union of both use-cases rather than two
    separate models — the two flows only diverge in which fields they
    populate (a truck tier has capacity_kg/dimensions; a movers tier has
    max_weight_kg/includes), and keeping one model is what lets a single
    admin screen and a single `/api/logistics/tiers/` endpoint serve both
    booking pages.
    """
    class WeightClass(models.TextChoices):
        LIGHT = "light", "Light"
        HEAVY = "heavy", "Heavy"

    category = models.CharField(max_length=20, choices=LogisticsCategory.choices, db_index=True)
    city = models.CharField(max_length=100, db_index=True)
    slug = models.SlugField(max_length=120)
    name = models.CharField(max_length=150)

    # Truck-only tab split (Light below 750kg / Heavy above 750kg per the UI).
    # Blank for two_wheeler and packers_movers, which don't have this tab.
    weight_class = models.CharField(max_length=10, choices=WeightClass.choices, blank=True, default="")

    # Display
    capacity_label = models.CharField(max_length=100, blank=True, default="")   # "500kg", "20kg", "Up to 1,800 kg"
    dimensions_label = models.CharField(max_length=100, blank=True, default="") # "6ft x 5ft"
    description = models.TextField(blank=True, default="")                     # "Bed, mattress, wardrobe..."

    starting_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")

    includes = models.JSONField(default=list, blank=True)   # value-added inclusions, movers mainly
    icon = models.CharField(max_length=100, blank=True, default="")  # lucide-react icon name used by frontend

    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "city", "order", "name"]
        unique_together = [["category", "city", "slug"]]
        verbose_name = "Service Tier"

    def __str__(self):
        return f"{self.get_category_display()} / {self.city} / {self.name}"


class Lane(models.Model):
    """
    A fixed-fare route card ('Popular Routes from Hosur'). This is
    intentionally NOT the doc's RouteLane + distance-computed pricing —
    the current UI shows flat, pre-agreed lane fares, not a live distance
    engine, so that's what the backend models. Swapping in real
    distance-based pricing later is a service-layer change, not a schema
    change (see H.1 in the plan doc — same reasoning Phase 5A used for
    Address/Assignment: model what's needed now, keep the field additive).
    """
    category = models.CharField(max_length=20, choices=LogisticsCategory.choices, db_index=True)
    city = models.CharField(max_length=100, db_index=True)  # origin city, e.g. "Hosur"
    destination_label = models.CharField(max_length=150)     # "Bengaluru", "Whitefield / Bengaluru Hub"
    distance_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    eta_label = models.CharField(max_length=50, blank=True, default="")  # "~1.5 hrs", "Same Day", "1-2 Days"
    fare = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")

    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "city", "order"]
        verbose_name = "Lane (Popular Route)"

    def __str__(self):
        return f"{self.city} → {self.destination_label} ({self.get_category_display()})"
