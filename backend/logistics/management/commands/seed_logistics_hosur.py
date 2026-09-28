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
import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand

from logistics.models import GTFaq, Lane, LogisticsCategory, LogisticsSlot, ServiceArea, ServiceTier

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
# P&M supports instant authoritative estimates when all required
# catalog, vehicle, city configuration and routing inputs are available.
# Moves requiring survey/review remain non-payable estimates until final
# quotation. DISTANCE_PRICED_CATEGORIES excludes it from the simple distance
# card because it uses dedicated volume/inventory/crew configuration.
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
    dict(slug="3-wheeler", name="3 Wheeler", weight_class="light", vehicle_class="three_wheeler",
         max_weight_kg=Decimal("500.00"), max_cft=Decimal("88.00"), capacity_label="500kg",
         dimensions_label="5.5ft x 4ft x 4ft", starting_price="160.00", order=1,
         description="Small appliances, electronics, carton boxes, luggage shifting",
         includes=[
             "Groceries & provisions", "Small parcels & packages", "Clothing & cartons",
             "Small household items", "Small appliances", "Office supplies", "Local shop deliveries",
         ]),
    dict(slug="tata-ace", name="Tata Ace", weight_class="light", vehicle_class="truck",
         max_weight_kg=Decimal("750.00"), max_cft=Decimal("120.00"), capacity_label="750kg",
         dimensions_label="7ft x 4.5ft x 5ft", starting_price="205.00", order=2,
         description="1 RK / 1 BHK furniture, home appliances, retail supply transport",
         includes=[
             "Household furniture", "Home appliances", "Grocery & retail stock",
             "Multiple cartons", "Small business goods", "Electronics",
             "Small construction materials", "Shop/warehouse deliveries",
         ]),
    dict(slug="pickup-8ft", name="Pickup 8ft", weight_class="heavy", vehicle_class="pickup",
         max_weight_kg=Decimal("1200.00"), max_cft=Decimal("150.00"), capacity_label="1250 kg",
         dimensions_label="8ft x 5ft x 5.5ft", starting_price="300.00", order=3,
         description="Bulky electronics, commercial goods, furniture, home shifting",
         includes=[
             "Sofas, beds & wardrobes", "Refrigerators & washing machines", "Furniture sets",
             "Bulk cartons", "Construction materials", "Business/industrial goods",
             "Machinery & equipment", "Warehouse stock",
         ]),
    dict(slug="1-7-ton", name="1.7 ton", weight_class="heavy", vehicle_class="heavy_truck",
         max_weight_kg=Decimal("1700.00"), max_cft=Decimal("300.00"), capacity_label="1700 kg",
         dimensions_label="9ft x 5.5ft x 6.1ft", starting_price="380.00", order=4,
         description="Heavy manufacturing loads, industrial raw materials, large 2 BHK relocation",
         includes=[
             "Heavy furniture", "Large appliances", "Bulk construction materials",
             "Industrial equipment", "Machinery", "Large commercial inventory",
         ]),
]

TRUCK_LANES = [
    dict(destination_label="Bengaluru", destination_latitude=Decimal("12.971600"), destination_longitude=Decimal("77.594600"), distance_km="40", eta_label="~1.5 hrs", fare="900.00", order=1),
    dict(destination_label="Krishnagiri", destination_latitude=Decimal("12.526600"), destination_longitude=Decimal("78.214700"), distance_km="55", eta_label="~1.2 hrs", fare="1200.00", order=2),
    dict(destination_label="Salem", destination_latitude=Decimal("11.664300"), destination_longitude=Decimal("78.146000"), distance_km="155", eta_label="~3.5 hrs", fare="3000.00", order=3),
    dict(destination_label="Chennai", destination_latitude=Decimal("13.082700"), destination_longitude=Decimal("80.270700"), distance_km="310", eta_label="~6.5 hrs", fare="6200.00", order=4),
    dict(destination_label="Coimbatore", destination_latitude=Decimal("11.016800"), destination_longitude=Decimal("76.955800"), distance_km="310", eta_label="~6.0 hrs", fare="6000.00", order=5),
    dict(destination_label="Dharmapuri", destination_latitude=Decimal("12.127700"), destination_longitude=Decimal("78.157900"), distance_km="85", eta_label="~2.0 hrs", fare="1800.00", order=6),
    dict(destination_label="Vellore", destination_latitude=Decimal("12.916500"), destination_longitude=Decimal("79.132500"), distance_km="140", eta_label="~3.0 hrs", fare="2800.00", order=7),
    dict(destination_label="Tiruvannamalai", destination_latitude=Decimal("12.225300"), destination_longitude=Decimal("79.074700"), distance_km="170", eta_label="~3.8 hrs", fare="3400.00", order=8),
    dict(destination_label="Madurai", destination_latitude=Decimal("9.925200"), destination_longitude=Decimal("78.119800"), distance_km="380", eta_label="~7.5 hrs", fare="7500.00", order=9),
]

TWO_WHEELER_TIERS = [
    dict(slug="2-wheeler", name="2 Wheeler", vehicle_class="two_wheeler",
         max_weight_kg=Decimal("20.00"), max_cft=Decimal("2.50"), capacity_label="20 kg",
         dimensions_label="40cm x 40cm", starting_price="48.00", order=1,
         description="Base fare is inclusive of 1.0 km distance & 25 minutes of order time. Pricing may vary basis locality.",
         includes=[
             "Documents & legal papers", "Keys & small items", "Medicines & pharmacy",
             "Food & parcels", "Gifts & clothing", "Small electronics & cables",
         ]),
    dict(slug="2-wheeler-electric-express", name="2 Wheeler Electric / Express", vehicle_class="two_wheeler",
         max_weight_kg=Decimal("20.00"), max_cft=Decimal("2.50"), capacity_label="20 kg",
         dimensions_label="40cm x 40cm", starting_price="55.00", order=2,
         description="Base fare is inclusive of 1.0 km distance & 25 minutes of order time. Pricing may vary basis locality.",
         includes=[
             "Express documents & parcels", "Priority medicine deliveries",
             "Keys & urgent items", "Eco-friendly zero-emission deliveries",
         ]),
]

TWO_WHEELER_LANES = [
    dict(destination_label="SIPCOT Phase 1 & 2", destination_latitude=Decimal("12.730000"), destination_longitude=Decimal("77.810000"), distance_km="4", eta_label="12 mins", fare="65.00", order=1),
    dict(destination_label="Bagalur Road", destination_latitude=Decimal("12.745000"), destination_longitude=Decimal("77.830000"), distance_km="6", eta_label="15 mins", fare="78.00", order=2),
    dict(destination_label="Attibele Border", destination_latitude=Decimal("12.780000"), destination_longitude=Decimal("77.770000"), distance_km="8", eta_label="18 mins", fare="95.00", order=3),
    dict(destination_label="Electronic City Phase 1", destination_latitude=Decimal("12.840000"), destination_longitude=Decimal("77.677000"), distance_km="28", eta_label="45 mins", fare="240.00", order=4),
    dict(destination_label="Bengaluru Central (Majestic)", destination_latitude=Decimal("12.976700"), destination_longitude=Decimal("77.571300"), distance_km="40", eta_label="65 mins", fare="340.00", order=5),
    dict(destination_label="Krishnagiri Town", destination_latitude=Decimal("12.526600"), destination_longitude=Decimal("78.214700"), distance_km="55", eta_label="80 mins", fare="450.00", order=6),
]

PACKERS_MOVERS_TIERS = [
    dict(slug="1rk-1bhk-shifting", name="1 RK / 1 BHK Shifting", vehicle_class="truck",
         max_weight_kg=Decimal("750.00"), max_cft=Decimal("250.00"), crew_size=2,
         capacity_label="Up to 750 kg", starting_price="1499.00", order=1,
         description="Bed, mattress, wardrobe, 10-15 cartons, TV & basic kitchenware",
         includes=[
             "1 Cot & Mattress", "1 Wardrobe (standard)", "Single door refrigerator",
             "Semi-automatic washing machine", "10-15 Carton boxes", "Basic kitchen essentials",
         ]),
    dict(slug="2bhk-3bhk-shifting", name="2 BHK / 3 BHK Shifting", vehicle_class="truck",
         max_weight_kg=Decimal("1800.00"), max_cft=Decimal("500.00"), crew_size=3,
         capacity_label="Up to 1,800 kg", starting_price="2999.00", order=2,
         description="Sofa set, dining table, fridge, washing machine, 2 beds & 25+ boxes",
         includes=[
             "2 Cots & Mattresses", "Sofa Set (3+1+1)", "Dining table with chairs",
             "Double door refrigerator", "Fully automatic washing machine", "20-30 Carton boxes & luggage",
         ]),
    dict(slug="villa-office-relocation", name="Villa / Office Relocation", vehicle_class="heavy_truck",
         max_weight_kg=Decimal("4000.00"), max_cft=Decimal("1000.00"), crew_size=5,
         capacity_label="Custom Load", starting_price="4499.00", order=3,
         description="Large residential villas, corporate workstations, IT server equipment & machinery",
         includes=[
             "Complete villa/bungalow furniture", "Multi-room bedroom sets",
             "Heavy appliances & electronics", "Office workstations & modular desks",
             "IT server racks & office computers", "50+ Carton boxes & packing materials",
         ]),
]

PACKERS_MOVERS_LANES = [
    dict(destination_label="Electronic City Phase 1 & 2", destination_latitude=Decimal("12.839974"), destination_longitude=Decimal("77.677002"), distance_km="28", eta_label="Same Day", fare="2800.00", order=1),
    dict(destination_label="Whitefield / Bengaluru Hub", destination_latitude=Decimal("12.969800"), destination_longitude=Decimal("77.749900"), distance_km="42", eta_label="Same Day", fare="3500.00", order=2),
    dict(destination_label="Bengaluru Central (Majestic)", destination_latitude=Decimal("12.976700"), destination_longitude=Decimal("77.571300"), distance_km="40", eta_label="Same Day", fare="3200.00", order=3),
    dict(destination_label="Krishnagiri Town", destination_latitude=Decimal("12.526600"), destination_longitude=Decimal("78.214700"), distance_km="55", eta_label="Same Day", fare="4200.00", order=4),
    dict(destination_label="Salem Junction", destination_latitude=Decimal("11.664300"), destination_longitude=Decimal("78.146000"), distance_km="155", eta_label="1-2 Days", fare="8500.00", order=5),
    dict(destination_label="Chennai (Koyambedu / Port)", destination_latitude=Decimal("13.069400"), destination_longitude=Decimal("80.194800"), distance_km="310", eta_label="1-2 Days", fare="14500.00", order=6),
]

GT_FAQS = [
    # Mini Truck FAQs
    dict(category=LogisticsCategory.TRUCK, city=CITY, order=1,
         question="What happens in case of an accident or breakdown during the transportation period?",
         answer="We provide comprehensive on-road transit support in and around Hosur. In the unlikely event of an issue, a backup vehicle is immediately dispatched from our local fleet hub to safely transfer goods without additional charges."),
    dict(category=LogisticsCategory.TRUCK, city=CITY, order=2,
         question="What should I consider when determining the truck size I need to book?",
         answer="Consider cargo dimensions, total weight, and loading height. For 1-2 small appliances or cartons, a 3-Wheeler (500kg) is best. For 1 BHK home shifting or factory supplies, choose a Tata Ace (750kg) or 8ft Pickup (1200kg)."),
    dict(category=LogisticsCategory.TRUCK, city=CITY, order=3,
         question="How do I track my mini truck delivery in real time?",
         answer="Once your mini truck booking in Hosur is confirmed and a driver arrives at the pickup point, live GPS tracking becomes active. You can track route progress and share live updates directly with the recipient."),
    dict(category=LogisticsCategory.TRUCK, city=CITY, order=4,
         question="Can I book a mini truck in advance in Hosur?",
         answer="Yes! You can schedule your mini truck up to 7 days in advance or request immediate on-demand dispatch within 15-20 minutes anywhere in Hosur and industrial SIPCOT corridors."),

    # 2 Wheeler FAQs
    dict(category=LogisticsCategory.TWO_WHEELER, city=CITY, order=1,
         question="What is the maximum weight and parcel size for 2 Wheeler delivery?",
         answer="Our two-wheelers can comfortably carry packages weighing up to 20 kg with dimensions up to 40 cm x 40 cm x 40 cm in safe, weatherproof cargo boxes."),
    dict(category=LogisticsCategory.TWO_WHEELER, city=CITY, order=2,
         question="How fast will a rider arrive at my pickup address in Hosur?",
         answer="With our dense rider network across Hosur and SIPCOT, a verified delivery partner is assigned immediately and arrives at your pickup location within 10–15 minutes."),
    dict(category=LogisticsCategory.TWO_WHEELER, city=CITY, order=3,
         question="Can I send important documents, keys, or medicines securely?",
         answer="Yes! Two-wheeler delivery is ideal for time-sensitive parcels, corporate contracts, legal paperwork, keys, gifts, and pharmacy items with real-time live GPS tracking and secure OTP delivery."),
    dict(category=LogisticsCategory.TWO_WHEELER, city=CITY, order=4,
         question="What are the payment options available for 2 Wheeler bookings?",
         answer="You can pay securely via UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, or Cash on Pickup/Delivery to the rider partner."),

    # Packers & Movers FAQs
    dict(category=LogisticsCategory.PACKERS_MOVERS, city=CITY, order=1,
         question="What packing materials are included with Sevo Packers and Movers?",
         answer="We provide high-grade multi-layer bubble wrap, waterproof stretch film, heavy-duty 5-ply corrugated cartons, corner protectors, and heavy furniture blankets to ensure zero damage."),
    dict(category=LogisticsCategory.PACKERS_MOVERS, city=CITY, order=2,
         question="Do you offer disassembly and reassembly of beds and wardrobes?",
         answer="Yes! Our experienced carpenters and crew handle dismantling of standard cot frames, modular wardrobes, and dining tables, and reassemble them at your new location."),
    dict(category=LogisticsCategory.PACKERS_MOVERS, city=CITY, order=3,
         question="How early should I book my house shifting in Hosur?",
         answer="While we can arrange on-demand shifting in as little as 2 hours, we recommend booking 24–48 hours in advance to guarantee your preferred moving slot and packing team."),
    dict(category=LogisticsCategory.PACKERS_MOVERS, city=CITY, order=4,
         question="Is transit insurance covered for fragile and high-value items?",
         answer="Transit insurance coverage is available through our pre-move survey / eligible survey flow, where our survey expert verifies item valuations and policy options prior to movement (instant online bookings intentionally exclude direct insurance add-ons)."),
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
        faq_count = self._seed_faqs()
        slot_count = self._seed_slots()

        self.stdout.write(self.style.SUCCESS(
            f"Seeded logistics catalog for {CITY}: "
            f"{area_count} areas, "
            f"{truck_tier_count} truck tiers / {truck_lane_count} truck lanes, "
            f"{two_wheeler_tier_count} two-wheeler tiers / {two_wheeler_lane_count} two-wheeler lanes, "
            f"{movers_tier_count} movers tiers / {movers_lane_count} movers lanes, "
            f"{faq_count} FAQs, "
            f"{slot_count} logistics slots."
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
        Capacities and vehicle_class are seeded for unconfigured tiers, while
        preserving admin-tuned capacities unless --force-pricing is passed.
        Pricing is handled separately by _apply_launch_pricing so that a
        re-seed cannot revert rates that were tuned after launch.
        """
        count = 0
        for tier_data in tiers:
            slug = tier_data["slug"]
            existing = ServiceTier.objects.filter(category=category, city=CITY, slug=slug).first()
            defaults = {**tier_data, "is_active": True}
            if existing and not self.force_pricing:
                if existing.max_weight_kg is not None and existing.max_weight_kg > 0:
                    defaults["max_weight_kg"] = existing.max_weight_kg
                if existing.max_cft is not None and existing.max_cft > 0:
                    defaults["max_cft"] = existing.max_cft
                if existing.vehicle_class:
                    defaults["vehicle_class"] = existing.vehicle_class
                if existing.crew_size:
                    defaults["crew_size"] = existing.crew_size
                if existing.includes:
                    defaults["includes"] = existing.includes

            obj, _created = ServiceTier.objects.update_or_create(
                category=category, city=CITY, slug=slug,
                defaults=defaults,
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

    def _seed_faqs(self):
        count = 0
        for faq_data in GT_FAQS:
            GTFaq.objects.update_or_create(
                category=faq_data["category"],
                city=faq_data.get("city", ""),
                question=faq_data["question"],
                defaults={
                    "answer": faq_data["answer"],
                    "order": faq_data.get("order", 0),
                    "is_active": True,
                },
            )
            count += 1
        return count

    def _seed_slots(self):
        count = 0
        truck_2w_slots = [
            ("Morning", "06:00 AM - 07:00 AM", datetime.time(6, 0), datetime.time(7, 0), 1),
            ("Morning", "07:00 AM - 08:00 AM", datetime.time(7, 0), datetime.time(8, 0), 2),
            ("Morning", "08:00 AM - 09:00 AM", datetime.time(8, 0), datetime.time(9, 0), 3),
            ("Morning", "09:00 AM - 10:00 AM", datetime.time(9, 0), datetime.time(10, 0), 4),
            ("Morning", "10:00 AM - 11:00 AM", datetime.time(10, 0), datetime.time(11, 0), 5),
            ("Morning", "11:00 AM - 12:00 PM", datetime.time(11, 0), datetime.time(12, 0), 6),
            ("Afternoon", "12:00 PM - 01:00 PM", datetime.time(12, 0), datetime.time(13, 0), 7),
            ("Afternoon", "01:00 PM - 02:00 PM", datetime.time(13, 0), datetime.time(14, 0), 8),
            ("Afternoon", "02:00 PM - 03:00 PM", datetime.time(14, 0), datetime.time(15, 0), 9),
            ("Afternoon", "03:00 PM - 04:00 PM", datetime.time(15, 0), datetime.time(16, 0), 10),
            ("Afternoon", "04:00 PM - 05:00 PM", datetime.time(16, 0), datetime.time(17, 0), 11),
            ("Evening", "05:00 PM - 06:00 PM", datetime.time(17, 0), datetime.time(18, 0), 12),
            ("Evening", "06:00 PM - 07:00 PM", datetime.time(18, 0), datetime.time(19, 0), 13),
            ("Evening", "07:00 PM - 08:00 PM", datetime.time(19, 0), datetime.time(20, 0), 14),
            ("Evening", "08:00 PM - 09:00 PM", datetime.time(20, 0), datetime.time(21, 0), 15),
            ("Evening", "09:00 PM - 10:00 PM", datetime.time(21, 0), datetime.time(22, 0), 16),
        ]
        pm_slots = [
            ("Morning", "07:00 AM - 08:00 AM", datetime.time(7, 0), datetime.time(8, 0), 1),
            ("Morning", "08:00 AM - 09:00 AM", datetime.time(8, 0), datetime.time(9, 0), 2),
            ("Morning", "09:00 AM - 10:00 AM", datetime.time(9, 0), datetime.time(10, 0), 3),
            ("Morning", "10:00 AM - 11:00 AM", datetime.time(10, 0), datetime.time(11, 0), 4),
            ("Morning", "11:00 AM - 12:00 PM", datetime.time(11, 0), datetime.time(12, 0), 5),
            ("Afternoon", "12:00 PM - 01:00 PM", datetime.time(12, 0), datetime.time(13, 0), 6),
            ("Afternoon", "01:00 PM - 02:00 PM", datetime.time(13, 0), datetime.time(14, 0), 7),
            ("Afternoon", "02:00 PM - 03:00 PM", datetime.time(14, 0), datetime.time(15, 0), 8),
            ("Afternoon", "03:00 PM - 04:00 PM", datetime.time(15, 0), datetime.time(16, 0), 9),
            ("Evening", "04:00 PM - 05:00 PM", datetime.time(16, 0), datetime.time(17, 0), 10),
            ("Evening", "05:00 PM - 06:00 PM", datetime.time(17, 0), datetime.time(18, 0), 11),
            ("Evening", "06:00 PM - 07:00 PM", datetime.time(18, 0), datetime.time(19, 0), 12),
        ]

        for cat in [LogisticsCategory.TRUCK, LogisticsCategory.TWO_WHEELER]:
            for grp, lbl, st, et, ord_val in truck_2w_slots:
                LogisticsSlot.objects.update_or_create(
                    category=cat, city=CITY.lower(), slot_label=lbl,
                    defaults={
                        "group": grp,
                        "start_time": st,
                        "end_time": et,
                        "order": ord_val,
                        "capacity": 10,
                        "is_active": True,
                    }
                )
                count += 1

        for grp, lbl, st, et, ord_val in pm_slots:
            LogisticsSlot.objects.update_or_create(
                category=LogisticsCategory.PACKERS_MOVERS, city=CITY.lower(), slot_label=lbl,
                defaults={
                    "group": grp,
                    "start_time": st,
                    "end_time": et,
                    "order": ord_val,
                    "capacity": 8,
                    "is_active": True,
                }
            )
            count += 1

        return count


