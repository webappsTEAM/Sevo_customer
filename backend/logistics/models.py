"""
backend/logistics/models.py

Read-mostly catalog for the two Goods & Transport flows (per TL-confirmed scope):
  - Goods Transport  → categories TRUCK, TWO_WHEELER
  - Packers & Movers → category  PACKERS_MOVERS

Deliberately NOT the full sevo_PHASE_14 entity set (Vehicle fleet, Trip,
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
import logging
from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

logger = logging.getLogger(__name__)


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

    class VehicleClass(models.TextChoices):
        TWO_WHEELER = "two_wheeler", "Two Wheeler"
        THREE_WHEELER = "three_wheeler", "Three Wheeler"
        TRUCK = "truck", "Truck"
        PICKUP = "pickup", "Pickup"
        HEAVY_TRUCK = "heavy_truck", "Heavy Truck"

    category = models.CharField(max_length=20, choices=LogisticsCategory.choices, db_index=True)
    city = models.CharField(max_length=100, db_index=True)
    slug = models.SlugField(max_length=120)
    name = models.CharField(max_length=150)

    # Authoritative vehicle classification for cargo fitment & category matching
    vehicle_class = models.CharField(
        max_length=30,
        choices=VehicleClass.choices,
        default="",
        blank=True,
        db_index=True,
        help_text="Authoritative vehicle classification (two_wheeler, three_wheeler, truck, pickup, heavy_truck).",
    )

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

    # GT-B-01: real distance-based pricing, per sevo_PHASE_14
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
    gst_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text=(
            "GST already INCLUDED in this tier's fare, as a percentage (18.00 = 18%). "
            "The fare a customer is quoted and pays does not change; the rate is recorded on "
            "each quote and the invoice shows the GST component of the total. "
            "Blank or 0 = no GST line on invoices."
        ),
    )
    minimum_fare = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Floor applied after everything else. Unset means no floor.",
    )
    max_weight_kg = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Maximum payload capacity in kg. DB field is authoritative. NULL/zero means unconfigured and unavailable for fitment."
    )
    max_cft = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Maximum cargo volume in cubic feet (CFT). DB field is authoritative. NULL/zero means unconfigured and unavailable for fitment."
    )
    crew_size = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Configured labor/crew size for relocation tiers. If unset, informational display only."
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

    def get_vehicle_class(self) -> str:
        """
        Authoritative vehicle classification string.
        SEVO P0 Rule: No hardcoded fallback to TRUCK. Blank or unset fails closed as empty string.
        """
        return str(self.vehicle_class) if self.vehicle_class else ""

    def get_max_weight_kg(self) -> Decimal:
        """
        Authoritative payload capacity in kilograms.
        SEVO P0 Rule: Database field `max_weight_kg` is the SOLE authority.
        Unconfigured tiers fail closed (return 0.00). No slug, name, or label guessing.
        """
        if self.max_weight_kg is not None and self.max_weight_kg > 0:
            return Decimal(str(self.max_weight_kg))
        return Decimal("0.00")

    def get_max_cft(self) -> Decimal:
        """
        Authoritative volume capacity in cubic feet (CFT).
        SEVO P0 Rule: Database field `max_cft` is the SOLE authority.
        Unconfigured tiers fail closed (return 0.00). No slug, name, or label guessing.
        """
        if self.max_cft is not None and self.max_cft > 0:
            return Decimal(str(self.max_cft))
        return Decimal("0.00")

    def evaluate_cargo_fit(self, total_weight_kg: Decimal, total_cft: Decimal):
        max_wt = self.get_max_weight_kg()
        max_vol = self.get_max_cft()
        if max_wt <= 0 or max_vol <= 0:
            return False, f"Vehicle capacity is not configured in database for {self.name}."
        if total_weight_kg > max_wt:
            return False, f"Cargo weight ({total_weight_kg} kg) exceeds vehicle payload limit ({max_wt} kg)."
        if total_cft > max_vol:
            return False, f"Cargo volume ({total_cft} CFT) exceeds vehicle cargo bay volume ({max_vol} CFT)."
        return True, "Cargo fits safely within vehicle capacity."


class Lane(models.Model):
    """
    A fixed-fare route card ('Popular Routes from Hosur').

    destination_latitude / destination_longitude: city-centre coordinates for
    the destination. Used by Packers & Movers intercity booking to resolve
    drop_latitude/drop_longitude for the server-side quote without depending
    on geocoding at runtime. Nullable so existing lanes keep working; admin
    fills them in progressively. When blank the P&M booking page falls back
    to geocoding the destination_label string.
    """
    category = models.CharField(max_length=20, choices=LogisticsCategory.choices, db_index=True)
    city = models.CharField(max_length=100, db_index=True)  # origin city, e.g. "Hosur"
    destination_label = models.CharField(max_length=150)     # "Bengaluru", "Whitefield / Bengaluru Hub"
    destination_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="City-centre latitude for P&M intercity drop coordinate resolution. Leave blank to fall back to geocoding.",
    )
    destination_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="City-centre longitude for P&M intercity drop coordinate resolution. Leave blank to fall back to geocoding.",
    )
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
    info_banner = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Custom info or tips banner displayed in customer inventory modal (e.g. 'What we pack in Bedrooms')"
    )
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
    subcategory = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Optional subcategory for UI grouping (e.g. 'Bed', 'Chair', 'Table', 'Cartons & Packaging', 'Appliances')"
    )
    unit = models.CharField(max_length=30, default="piece")
    default_weight_kg = models.DecimalField(
        max_digits=7, decimal_places=2,
        help_text="Explicit item weight in kg. Must be explicitly configured; zero indicates unconfigured."
    )
    default_cft = models.DecimalField(
        max_digits=7, decimal_places=2,
        help_text="Explicit item volume in CFT. Must be explicitly configured; zero indicates unconfigured."
    )

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


# Hard ceiling for PackersMoversConfig.max_helpers (admin-editable up to this).
MAX_HELPERS_CAP = 20


def resolve_helpers_requested(cart_data, city=""):
    """Return the helper count a P&M booking asked for, clamped to the admin
    max for that city (0..PackersMoversConfig.max_helpers). None when the
    booking did not request helpers at all. Never raises."""
    try:
        items = cart_data if isinstance(cart_data, list) else [cart_data]
        raw = None
        for it in items:
            if isinstance(it, dict) and it.get("helpers_requested") not in (None, ""):
                raw = it.get("helpers_requested")
                city = city or str(it.get("city") or "")
                break
        if raw is None:
            return None
        n = int(raw)
    except (TypeError, ValueError):
        return None
    cfg = None
    if city:
        cfg = PackersMoversConfig.objects.filter(city__iexact=city, is_active=True).first()
    if cfg is None:
        cfg = PackersMoversConfig.objects.filter(is_active=True).first()
    limit = cfg.max_helpers if cfg else 2
    return max(0, min(n, limit))


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
    max_helpers = models.PositiveSmallIntegerField(
        default=2,
        validators=[MaxValueValidator(MAX_HELPERS_CAP)],
        help_text=(
            "Maximum number of extra helpers a customer may request on a P&M booking "
            f"(0-{MAX_HELPERS_CAP}). Crew-size/operations setting only -- no price is attached."
        ),
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


class GTFaq(models.Model):
    """
    Admin-manageable FAQ entries for Goods Transport and Packers & Movers
    booking pages.

    category: blank = applies to all GT categories (e.g. platform-wide FAQ).
    city: blank = applies to all cities.
    Admin can create category-specific FAQs (e.g. only for 'truck' pages) or
    city-specific ones (e.g. only for Hosur launch FAQs).
    """
    category = models.CharField(
        max_length=20, choices=LogisticsCategory.choices,
        blank=True, default="", db_index=True,
        help_text="Leave blank to show on all GT category pages.",
    )
    city = models.CharField(
        max_length=100, blank=True, default="", db_index=True,
        help_text="Leave blank to show in all cities.",
    )
    question = models.CharField(max_length=500)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "city", "order"]
        verbose_name = "GT FAQ"
        verbose_name_plural = "GT FAQs"

    def __str__(self):
        cat = self.get_category_display() if self.category else "All"
        city = self.city or "All cities"
        return f"[{cat} / {city}] {self.question[:60]}"


class LogisticsSlot(models.Model):
    """
    Authoritative time-slot configuration for logistics bookings.
    Allows Admin/Superadmin to configure slots, lead times, capacity limits,
    and active states per category and city without code changes.
    """
    category = models.CharField(
        max_length=30, blank=True, default="",
        help_text="Service category (e.g. 'truck', 'two_wheeler', 'packers_movers'), or blank for all."
    )
    city = models.CharField(
        max_length=50, blank=True, default="",
        help_text="Operating city (e.g. 'hosur'), or blank for all."
    )
    group = models.CharField(
        max_length=50, default="Morning",
        help_text="Slot group heading (e.g. 'Morning', 'Afternoon', 'Evening')"
    )
    slot_label = models.CharField(
        max_length=50,
        help_text="Standard slot time representation (e.g. '07:00 AM - 08:00 AM')"
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    capacity = models.PositiveIntegerField(
        default=10,
        help_text="Max concurrent bookings supported in this window"
    )
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "city", "order", "start_time"]
        verbose_name = "Logistics Slot"
        verbose_name_plural = "Logistics Slots"

    def __str__(self):
        cat = self.category or "all"
        city = self.city or "all"
        return f"[{cat}/{city}] {self.group} — {self.slot_label}"

