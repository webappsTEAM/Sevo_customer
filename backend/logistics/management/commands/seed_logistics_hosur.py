"""
Seeds the logistics catalog with the exact Hosur data currently hardcoded
inside MiniTruckBookingHosurPage.jsx, TwoWheelerBookingHosurPage.jsx and
PackersMoversBookingHosurPage.jsx. Sourced from those three components'
own LIGHT_VEHICLES/HEAVY_VEHICLES/LONG_DISTANCE_ROUTES/POPULAR_ROUTES/
PACKERS_PACKAGES/HOSUR_AREAS arrays (the authoritative source — two truck
lanes were illegible in the design PDF export but are readable here).

Idempotent — safe to re-run. Run with:
    python manage.py seed_logistics_hosur
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from logistics.models import Lane, LogisticsCategory, ServiceArea, ServiceTier

CITY = "Hosur"

SERVICE_AREAS = [
    "Sipcot Phase 1", "Sipcot Phase 2", "Bagalur Road", "Mathigiri", "Zuzuvadi",
    "Avalapalli", "Moranapalli", "Mookandapalli", "Denkanikottai Road", "Rayakottai Road",
    "Thally Road", "Alasanatham", "Railway Station Area", "Dinnur", "Kelamangalam Road",
    "Kamaraj Nagar",
]

# ── SEVO Goods & Transport launch rate card ──────────────────────────────────
# Supplied by the business as SEVO's own proposed rates. Not derived from,
# benchmarked against, or copied from any competitor's pricing.
#
# Applied by slug, and ONLY to a tier that has never been priced (per_km_rate
# is NULL). A tier whose rates someone has since tuned in the admin is left
# alone, because this command is re-run on deploys and silently reverting
# live pricing would be the worst possible thing for it to do. Use
# --force-pricing to deliberately reset every tier back to this card.
#
# Packers & Movers is deliberately absent: it stays survey/quotation priced
# (CALTRACK_PHASE_14 H.2), and DISTANCE_PRICED_CATEGORIES excludes it, so a
# per-km rate there would be data the fare engine never reads.
#
# surge_multiplier is not in the card and is left at its default of 1.00 --
# no surge value was supplied, and inventing one would change every fare.
LAUNCH_PRICING = {
    "3-wheeler": dict(
        base_fare="150.00", per_km_rate="18.00", free_km="2.00",
        minimum_fare="150.00", loading_unloading_charge="40.00",
        additional_stop_charge="30.00",
    ),
    "tata-ace": dict(
        base_fare="220.00", per_km_rate="22.00", free_km="3.00",
        minimum_fare="220.00", loading_unloading_charge="60.00",
        additional_stop_charge="40.00",
    ),
    "pickup-8ft": dict(
        base_fare="300.00", per_km_rate="28.00", free_km="3.00",
        minimum_fare="300.00", loading_unloading_charge="80.00",
        additional_stop_charge="50.00",
    ),
    "1-7-ton": dict(
        base_fare="450.00", per_km_rate="40.00", free_km="5.00",
        minimum_fare="450.00", loading_unloading_charge="120.00",
        additional_stop_charge="75.00",
    ),
    "2-wheeler": dict(
        base_fare="50.00", per_km_rate="10.00", free_km="1.00",
        minimum_fare="50.00", loading_unloading_charge="10.00",
        additional_stop_charge="15.00",
    ),
    "2-wheeler-electric-express": dict(
        base_fare="60.00", per_km_rate="11.00", free_km="1.00",
        minimum_fare="60.00", loading_unloading_charge="10.00",
        additional_stop_charge="15.00",
    ),
}

TRUCK_TIERS = [
    dict(slug="3-wheeler", name="3 Wheeler", weight_class="light", capacity_label="500kg",
         dimensions_label="5.5ft x 4ft x 4ft", starting_price="160.00", order=1,
         description="Small appliances, electronics, carton boxes, luggage shifting"),
    dict(slug="tata-ace", name="Tata Ace", weight_class="light", capacity_label="750kg",
         dimensions_label="7ft x 4.5ft x 5ft", starting_price="205.00", order=2,
         description="1 RK / 1 BHK furniture, home appliances, retail supply transport"),
    dict(slug="pickup-8ft", name="Pickup 8ft", weight_class="heavy", capacity_label="1250 kg",
         dimensions_label="8ft x 5ft x 5.5ft", starting_price="300.00", order=3,
         description="Bulky electronics, commercial goods, furniture, home shifting"),
    dict(slug="1-7-ton", name="1.7 ton", weight_class="heavy", capacity_label="1700 kg",
         dimensions_label="9ft x 5.5ft x 6.1ft", starting_price="380.00", order=4,
         description="Heavy manufacturing loads, industrial raw materials, large 2 BHK relocation"),
]

TRUCK_LANES = [
    dict(destination_label="Bengaluru", distance_km="40", eta_label="~1.5 hrs", fare="900.00", order=1),
    dict(destination_label="Krishnagiri", distance_km="55", eta_label="~1.2 hrs", fare="1200.00", order=2),
    dict(destination_label="Salem", distance_km="155", eta_label="~3.5 hrs", fare="3000.00", order=3),
    dict(destination_label="Chennai", distance_km="310", eta_label="~6.5 hrs", fare="6200.00", order=4),
    dict(destination_label="Coimbatore", distance_km="310", eta_label="~6.0 hrs", fare="6000.00", order=5),
    dict(destination_label="Dharmapuri", distance_km="85", eta_label="~2.0 hrs", fare="1800.00", order=6),
    dict(destination_label="Vellore", distance_km="140", eta_label="~3.0 hrs", fare="2800.00", order=7),
    dict(destination_label="Tiruvannamalai", distance_km="170", eta_label="~3.8 hrs", fare="3400.00", order=8),
    dict(destination_label="Madurai", distance_km="380", eta_label="~7.5 hrs", fare="7500.00", order=9),
]

TWO_WHEELER_TIERS = [
    dict(slug="2-wheeler", name="2 Wheeler", capacity_label="20 kg",
         dimensions_label="40cm x 40cm", starting_price="48.00", order=1,
         description="Base fare is inclusive of 1.0 km distance & 25 minutes of order time. Pricing may vary basis locality."),
    dict(slug="2-wheeler-electric-express", name="2 Wheeler Electric / Express", capacity_label="20 kg",
         dimensions_label="40cm x 40cm", starting_price="55.00", order=2,
         description="Base fare is inclusive of 1.0 km distance & 25 minutes of order time. Pricing may vary basis locality."),
]

TWO_WHEELER_LANES = [
    dict(destination_label="SIPCOT Phase 1 & 2", distance_km="4", eta_label="12 mins", fare="65.00", order=1),
    dict(destination_label="Bagalur Road", distance_km="6", eta_label="15 mins", fare="78.00", order=2),
    dict(destination_label="Attibele Border", distance_km="8", eta_label="18 mins", fare="95.00", order=3),
    dict(destination_label="Electronic City Phase 1", distance_km="28", eta_label="45 mins", fare="240.00", order=4),
    dict(destination_label="Bengaluru Central (Majestic)", distance_km="40", eta_label="65 mins", fare="340.00", order=5),
    dict(destination_label="Krishnagiri Town", distance_km="55", eta_label="80 mins", fare="450.00", order=6),
]

PACKERS_MOVERS_TIERS = [
    dict(slug="1rk-1bhk-shifting", name="1 RK / 1 BHK Shifting", capacity_label="Up to 750 kg",
         starting_price="1499.00", order=1,
         description="Bed, mattress, wardrobe, 10-15 cartons, TV & basic kitchenware"),
    dict(slug="2bhk-3bhk-shifting", name="2 BHK / 3 BHK Shifting", capacity_label="Up to 1,800 kg",
         starting_price="2999.00", order=2,
         description="Sofa set, dining table, fridge, washing machine, 2 beds & 25+ boxes"),
    dict(slug="villa-office-relocation", name="Villa / Office Relocation", capacity_label="Custom Load",
         starting_price="4499.00", order=3,
         description="Large residential villas, corporate workstations, IT server equipment & machinery"),
]

PACKERS_MOVERS_LANES = [
    dict(destination_label="Electronic City Phase 1 & 2", distance_km="28", eta_label="Same Day", fare="2800.00", order=1),
    dict(destination_label="Whitefield / Bengaluru Hub", distance_km="42", eta_label="Same Day", fare="3500.00", order=2),
    dict(destination_label="Bengaluru Central (Majestic)", distance_km="40", eta_label="Same Day", fare="3200.00", order=3),
    dict(destination_label="Krishnagiri Town", distance_km="55", eta_label="Same Day", fare="4200.00", order=4),
    dict(destination_label="Salem Junction", distance_km="155", eta_label="1-2 Days", fare="8500.00", order=5),
    dict(destination_label="Chennai (Koyambedu / Port)", distance_km="310", eta_label="1-2 Days", fare="14500.00", order=6),
]


class Command(BaseCommand):
    help = "Seed logistics catalog (ServiceTier, Lane, ServiceArea) with Hosur data from the design PDFs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-pricing",
            action="store_true",
            help=(
                "Reset every tier's distance-pricing fields back to the launch "
                "rate card, overwriting rates changed since. Without this, a "
                "tier that already has a per_km_rate is left untouched so a "
                "routine re-seed on deploy cannot revert live pricing."
            ),
        )

    def handle(self, *args, **options):
        self.force_pricing = options.get("force_pricing", False)
        if self.force_pricing:
            self.stdout.write(self.style.WARNING(
                "--force-pricing: resetting all tier pricing to the launch rate card."
            ))
        area_count = self._seed_areas()
        truck_tier_count = self._seed_tiers(LogisticsCategory.TRUCK, TRUCK_TIERS)
        truck_lane_count = self._seed_lanes(LogisticsCategory.TRUCK, TRUCK_LANES)
        two_wheeler_tier_count = self._seed_tiers(LogisticsCategory.TWO_WHEELER, TWO_WHEELER_TIERS)
        two_wheeler_lane_count = self._seed_lanes(LogisticsCategory.TWO_WHEELER, TWO_WHEELER_LANES)
        movers_tier_count = self._seed_tiers(LogisticsCategory.PACKERS_MOVERS, PACKERS_MOVERS_TIERS)
        movers_lane_count = self._seed_lanes(LogisticsCategory.PACKERS_MOVERS, PACKERS_MOVERS_LANES)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded logistics catalog for {CITY}: "
            f"{area_count} areas, "
            f"{truck_tier_count} truck tiers / {truck_lane_count} truck lanes, "
            f"{two_wheeler_tier_count} two-wheeler tiers / {two_wheeler_lane_count} two-wheeler lanes, "
            f"{movers_tier_count} movers tiers / {movers_lane_count} movers lanes."
        ))

    def _seed_areas(self):
        count = 0
        for order, name in enumerate(SERVICE_AREAS, start=1):
            ServiceArea.objects.update_or_create(
                city=CITY, name=name, defaults={"order": order, "is_active": True},
            )
            count += 1
        return count

    def _seed_tiers(self, category, tiers):
        """
        Identity and display fields are upserted every run, as before.
        Pricing is handled separately by _apply_launch_pricing so that a
        re-seed cannot revert rates that were tuned after launch.
        """
        count = 0
        for tier in tiers:
            obj, _created = ServiceTier.objects.update_or_create(
                category=category, city=CITY, slug=tier["slug"],
                defaults={**tier, "is_active": True},
            )
            self._apply_launch_pricing(obj)
            count += 1
        return count

    def _apply_launch_pricing(self, tier):
        """
        Write the launch rate card onto a tier that has never been priced.

        `per_km_rate is None` is the test for "never priced": it is the field
        that switches a tier from flat starting_price to the distance
        formula, and nothing else sets it. A tier that already has one is
        skipped unless --force-pricing was passed.

        Returns "applied", "forced", "skipped" or "not-in-card".
        """
        card = LAUNCH_PRICING.get(tier.slug)
        if card is None:
            # Packers & Movers, and anything added later that is not
            # distance-priced.
            return "not-in-card"

        already_priced = tier.per_km_rate is not None
        if already_priced and not self.force_pricing:
            self.stdout.write(
                "  = %-30s already priced (per_km_rate=%s) -- left alone"
                % (tier.slug, tier.per_km_rate)
            )
            return "skipped"

        for field, value in card.items():
            setattr(tier, field, Decimal(value))
        tier.save(update_fields=list(card.keys()) + ["updated_at"])
        verb = "forced" if already_priced else "applied"
        self.stdout.write(
            "  %s %-30s base=%s per_km=%s free_km=%s min=%s load=%s stop=%s"
            % ("~" if already_priced else "+", tier.slug,
               card["base_fare"], card["per_km_rate"], card["free_km"],
               card["minimum_fare"], card["loading_unloading_charge"],
               card["additional_stop_charge"])
        )
        return verb

    def _seed_lanes(self, category, lanes):
        count = 0
        for lane in lanes:
            Lane.objects.update_or_create(
                category=category, city=CITY, destination_label=lane["destination_label"],
                defaults={**lane, "is_active": True},
            )
            count += 1
        return count
