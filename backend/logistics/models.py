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
from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
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

    starting_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    currency = models.CharField(max_length=3, default="INR")

    # GT-B-01: real distance-based pricing, per CALTRACK_PHASE_14
    # PART H.1 ("Goods Transport - deterministic"):
    #   fare = base_fare + distance_km x per_km_rate
    #        + loading_unloading + additional_stop_charge x (stops - 2)
    #        (x surge), floored at minimum_fare
    # These live on ServiceTier because H.1 scopes base_fare and
    # per_km_rate to the *vehicle class*, and ServiceTier already IS the
    # vehicle class (scoped by category + city). This is the
    # "swapping in real distance-based pricing later is a service-layer
    # change, not a schema change" note on Lane below, made concrete --
    # additive fields, nothing replaced.
    #
    # Every field is optional/zero-default so existing rows keep behaving
    # exactly as before: with per_km_rate unset, resolve_logistics_fare()
    # falls back to the old flat starting_price/Lane.fare lookup. Set
    # per_km_rate on a tier to switch that tier to distance pricing.
    #
    # Waiting charges are deliberately NOT here: H.1 says the quote is
    # "locked at booking" and deviations (extra waiting, extra stops
    # beyond what was booked) go through the existing WorkExtension
    # approval flow, which already exists. Toll/parking are likewise
    # evidenced pass-throughs, not part of the upfront quote.
    base_fare = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Fixed component of the fare. Falls back to starting_price when unset.",
    )
    per_km_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Per-km charge beyond free_km. Leave unset to keep this tier on flat pricing.",
    )
    free_km = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Distance included in base_fare before per_km_rate starts applying.",
    )
    loading_unloading_charge = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    additional_stop_charge = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Charged per stop beyond the standard two (one pickup, one drop).",
    )
    surge_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=1,
        # Bounded on both sides. quote_logistics_fare already treats a
        # zero/negative multiplier as "no surge" rather than zeroing a fare,
        # but that is a safety net, not permission to store one. The upper
        # bound of 5 is a guard against a typo multiplying every fare on a
        # tier by 50 -- not a pricing policy.
        validators=[
            MinValueValidator(Decimal("0.01")),
            MaxValueValidator(Decimal("5.00")),
        ],
        help_text=(
            "Applied to the whole computed fare. A configurable per-tier value, "
            "not a live demand engine -- time-band/demand surge is its own system."
        ),
    )
    minimum_fare = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Floor applied after everything else. Unset means no floor.",
    )
    max_weight_kg = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Maximum payload capacity in kg. If null, computed from capacity_label."
    )
    max_cft = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Maximum cargo volume in cubic feet (CFT). If null, computed from dimensions_label."
    )

    includes = models.JSONField(default=list, blank=True)   # value-added inclusions, movers mainly
    icon = models.CharField(max_length=100, blank=True, default="")  # lucide-react icon name used by frontend
    # Mirrors service_requests.Package.image (the "Package Image" an admin
    # uploads on the catalog Package screen). Blank means the booking page
    # falls back to its built-in technical line-drawing for this vehicle
    # class -- see MiniTruckBookingHosurPage.jsx / TwoWheelerBookingHosurPage.jsx
    # tierToVehicle(). Written by the sync bridge in
    # service_requests/services/catalog.py, same as every other gt_*-mirrored
    # field; never set directly here now that the rate card admin screen is
    # read-only.
    image = models.CharField(max_length=500, blank=True, default="")
    duration = models.CharField(max_length=50, blank=True, default="")
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

    def get_max_weight_kg(self) -> Decimal:
        if self.max_weight_kg is not None:
            return self.max_weight_kg
        import re
        txt = (self.capacity_label or "").lower().replace(",", "")
        m = re.search(r"(\d+(?:\.\d+)?)\s*kg", txt)
        if m:
            return Decimal(m.group(1))
        if self.category == "two_wheeler":
            return Decimal("20.00")
        if "tata" in self.slug or "ace" in self.slug:
            return Decimal("750.00")
        if "3-wheeler" in self.slug:
            return Decimal("500.00")
        if "pickup" in self.slug:
            return Decimal("1250.00")
        if "1-7-ton" in self.slug or "1.7" in self.slug:
            return Decimal("1700.00")
        if "eacher" in self.slug or "eicher" in self.slug:
            return Decimal("2500.00")
        return Decimal("1000.00")

    def get_max_cft(self) -> Decimal:
        if self.max_cft is not None:
            return self.max_cft
        import re
        txt = (self.dimensions_label or "").lower()
        m_ft = re.findall(r"(\d+(?:\.\d+)?)\s*ft", txt)
        if len(m_ft) == 3:
            return (Decimal(m_ft[0]) * Decimal(m_ft[1]) * Decimal(m_ft[2])).quantize(Decimal("0.01"))
        elif len(m_ft) == 2:
            return (Decimal(m_ft[0]) * Decimal(m_ft[1]) * Decimal("4.0")).quantize(Decimal("0.01"))
        if self.category == "two_wheeler":
            return Decimal("2.50")
        if "3-wheeler" in self.slug:
            return Decimal("88.00")
        if "tata" in self.slug:
            return Decimal("157.50")
        if "pickup" in self.slug:
            return Decimal("220.00")
        if "1-7-ton" in self.slug or "1.7" in self.slug:
            return Decimal("300.00")
        return Decimal("100.00")

    def evaluate_cargo_fit(self, total_weight_kg: Decimal, total_cft: Decimal):
        max_wt = self.get_max_weight_kg()
        max_vol = self.get_max_cft()
        if total_weight_kg > max_wt:
            return False, f"Cargo weight ({total_weight_kg} kg) exceeds vehicle payload limit ({max_wt} kg)."
        if total_cft > max_vol:
            return False, f"Cargo volume ({total_cft} CFT) exceeds vehicle cargo bay volume ({max_vol} CFT)."
        return True, "Cargo fits safely within vehicle capacity."


class Lane(models.Model):
    """
    A fixed-fare route card ('Popular Routes from Hosur').
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


class GoodsCategory(models.Model):
    """
    Authoritative goods category (e.g. Furniture, Electronics, Building Materials, FMCG).
    Replaces hardcoded React string arrays with database-driven catalog records.
    """
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=150)
    icon = models.CharField(max_length=50, blank=True, default="package")
    description = models.TextField(blank=True, default="")
    allows_two_wheeler = models.BooleanField(default=True)
    min_vehicle_class = models.CharField(max_length=30, blank=True, default="any")  # any | truck | pickup
    order = models.PositiveIntegerField(default=0)
    is_prohibited = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Goods Category"
        verbose_name_plural = "Goods Categories"

    def __str__(self):
        return self.name


class GoodsItem(models.Model):
    """
    Standard cargo item under a GoodsCategory (e.g. Refrigerator, Office Chair, Cement Bag).
    Defines physical attributes for vehicle fitment, capacity checks, and handling rules.
    """
    category = models.ForeignKey(GoodsCategory, on_delete=models.CASCADE, related_name="items")
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=150)
    unit = models.CharField(max_length=30, default="piece")
    default_weight_kg = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("5.00"))
    default_cft = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("1.00"))

    is_fragile = models.BooleanField(default=False)
    is_heavy = models.BooleanField(default=False)
    is_oversized = models.BooleanField(default=False)
    is_prohibited = models.BooleanField(default=False)
    requires_special_handling = models.BooleanField(default=False)
    special_handling_charge = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))

    is_two_wheeler_compatible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "order", "name"]
        verbose_name = "Goods Item"
        verbose_name_plural = "Goods Items"

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class PackersMoversConfig(models.Model):
    """
    Centralized, Admin-controlled configuration for Packers & Movers relocation pricing parameters.
    Ensures rates per CFT, packing multipliers, floor labor, unpacking, and survey gating
    are database-backed and live-editable rather than hardcoded in Python.
    """
    city = models.CharField(max_length=50, default="Hosur", unique=True, db_index=True)
    standard_packing_rate_cft = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("3.50"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Standard packing rate per CFT in INR"
    )
    premium_packing_rate_cft = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("6.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Premium 4-layer fragile packing rate per CFT in INR"
    )
    premium_fragile_addon = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("200.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Additional fixed surcharge per fragile item in premium tier"
    )
    floor_rate_no_lift_per_100cft = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("120.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Surcharge per floor without elevator per 100 CFT block"
    )
    unpacking_rate_cft = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("2.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Unpacking rate per CFT in INR"
    )
    gst_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.1800"),
        validators=[MinValueValidator(Decimal("0.0000"))],
        help_text="GST decimal rate (e.g. 0.1800 for 18% GST)"
    )
    survey_cft_threshold = models.FloatField(
        default=500.0,
        validators=[MinValueValidator(50.0)],
        help_text="Moves exceeding this CFT volume require an on-site / video survey before binding contract"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["city"]
        verbose_name = "Packers & Movers Configuration"
        verbose_name_plural = "Packers & Movers Configurations"

    def __str__(self):
        return f"P&M Pricing Config ({self.city})"

