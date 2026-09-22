import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import PaintingRateCard

def seed():
    # Clear existing rate cards
    deleted_count, _ = PaintingRateCard.objects.all().delete()
    print(f"Deleted {deleted_count} existing rate card entries.")

    rates = [
        # 1. Waterproofing — Confirmed
        {
            "category": "Waterproofing",
            "sub_service": "Water Tank Waterproofing — 10,000L",
            "unit": "flat",
            "base_rate": "17000.00",
            "is_confirmed": True,
            "comments": "10,000L capacity slab. Flat rate, do not derive per-litre rate."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Bathroom Waterproofing — Small/Medium",
            "unit": "flat",
            "base_rate": "3500.00",
            "is_confirmed": True,
            "comments": "Small/Medium bathroom flat rate."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Bathroom Waterproofing — Large",
            "unit": "flat",
            "base_rate": "8000.00",
            "is_confirmed": True,
            "comments": "Large bathroom flat rate."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Terrace Waterproofing — 2 Coat",
            "unit": "sq.ft",
            "base_rate": "20.00",
            "is_confirmed": True,
            "comments": "Standard 2 coat terrace coating."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Terrace Waterproofing — 4 Coat",
            "unit": "sq.ft",
            "base_rate": "50.00",
            "warranty": "5-year warranty, labour-only if issues arise",
            "is_confirmed": True,
            "comments": "Premium 4 coat terrace system. Labour-only warranty (no material cost) if issues arise."
        },
        {
            "category": "Waterproofing",
            "sub_service": "3 mm Tar Sheet / Gas Heating Waterproofing",
            "unit": "sq.ft",
            "base_rate": "100.00",
            "warranty": "10-year warranty",
            "is_confirmed": True,
            "comments": "3mm torch-applied APP modified bituminous membrane."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Industrial Epoxy Flooring — 1mm",
            "unit": "sq.ft",
            "base_rate": "60.00",
            "is_confirmed": True,
            "comments": "1mm thickness, separately selectable option."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Industrial Epoxy Flooring — 2mm",
            "unit": "sq.ft",
            "base_rate": "90.00",
            "is_confirmed": True,
            "comments": "2mm thickness, separately selectable option."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Industrial Epoxy Flooring — 3mm",
            "unit": "sq.ft",
            "base_rate": "110.00",
            "is_confirmed": True,
            "comments": "3mm thickness, separately selectable option."
        },

        # 2. Waterproofing — Unconfirmed
        {
            "category": "Waterproofing",
            "sub_service": "Water Tank Waterproofing — 1,000L",
            "unit": "flat",
            "base_rate": "1700.00",
            "is_confirmed": True,
            "comments": "1,000L capacity slab. Confirmed rate after vendor callback."
        },
        {
            "category": "Waterproofing",
            "sub_service": "PU Coating / Dampness Treatment",
            "unit": "PENDING_VENDOR_INPUT",
            "base_rate": "0.00",
            "is_confirmed": False,
            "comments": "Unit is unclear (vendor mentioned points at ~₹1,200 each, and separately ~₹4,500). PENDING_VENDOR_INPUT unit used."
        },
        {
            "category": "Waterproofing",
            "sub_service": "Roof Repair / Patch Work",
            "unit": "sq.ft",
            "base_rate": "25.00",
            "is_confirmed": False,
            "comments": "Vendor's number is ₹25/sq.ft. Keep is_confirmed=False."
        },

        # 3. Interior Painting
        {
            "category": "Interior Painting",
            "sub_service": "Premium Interior Emulsion",
            "unit": "sq.ft",
            "base_rate": "15.00",
            "is_confirmed": True,
            "comments": "Standard interior emulsion rate."
        },
        {
            "category": "Interior Painting",
            "sub_service": "Ceiling Painting",
            "unit": "sq.ft",
            "base_rate": "12.00",
            "is_confirmed": True,
            "comments": "Standard ceiling painting rate."
        },

        # 4. Exterior Painting
        {
            "category": "Exterior Painting",
            "sub_service": "Weatherproof Exterior Emulsion",
            "unit": "sq.ft",
            "base_rate": "18.00",
            "is_confirmed": True,
            "comments": "Standard exterior weatherproof paint."
        },

        # 5. Wood & Metal
        {
            "category": "Wood & Metal",
            "sub_service": "PU Coat Gates / Doors",
            "unit": "sq.ft",
            "base_rate": "85.00",
            "is_confirmed": True,
            "comments": "Standard PU coat protective application."
        },

        # 6. Texture Decor
        {
            "category": "Texture Decor",
            "sub_service": "Royal Texture Play / Stencil Design",
            "unit": "sq.ft",
            "base_rate": "120.00",
            "is_confirmed": True,
            "comments": "Designer accent wall texture."
        }
    ]

    for r in rates:
        PaintingRateCard.objects.create(
            category=r["category"],
            sub_service=r["sub_service"],
            unit=r["unit"],
            base_rate=r["base_rate"],
            warranty=r.get("warranty", ""),
            is_confirmed=r["is_confirmed"],
            comments=r["comments"]
        )
        print(f"Seeded: {r['category']} - {r['sub_service']} (Rs.{r['base_rate']}/{r['unit']})")

    print("Finished seeding PaintingRateCard successfully.")

if __name__ == "__main__":
    seed()
