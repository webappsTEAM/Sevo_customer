"""
python manage.py seed_customer_facing_services

Adds the real customer-facing sub-services (as seen on the booking pages'
category pillar modals — Cleaning & Pest Control, Painting, Mason, AC &
Appliance, Electrician/Plumbing/Carpentry) as `Service` rows under their
matching existing `CatalogCategory`. Idempotent — safe to re-run, skips any
service that already exists (matched by category + name).

Deliberately excludes "Goods & Transports" (Truck / Two Wheeler / Packers &
Movers) — that's already correctly modeled in the separate `logistics` app
(ServiceTier/Lane), so adding it here would create a second, disconnected
pricing source for the same bookable items.

No Packages are created here — only the Service layer. Prices/packages are
left for the admin to add via the new Service Catalog > Packages screen,
since this script has no authoritative price data for these new services.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from service_requests.models import CatalogCategory, Service
from service_requests.services import catalog as catalog_service

SERVICES_TO_ADD = {
    "cleaning": ["Kitchen Cleaning", "Sofa Cleaning", "Bathroom Cleaning", "Full House Cleaning"],
    "pest_control": ["Cockroach Control", "Termite Control", "Ants & Bed Bugs Control"],
    "painting": ["Interior Painting", "Exterior Painting", "Waterproofing", "Wood & Metal", "Texture Decor"],
    "mason": ["Brick & Block Work", "Plastering & Wall Repair", "Wall & Partition Construction", "Wall Breaking & Demolition"],
    "hvac": ["Air Conditioner"],
    "appliance_repair": ["Refrigerator", "Washing Machine", "TV & Display", "Microwave Oven"],
    "electrical": ["Electrician"],
    "plumbing": ["Plumber"],
    "carpentry": ["Carpentry Services"],  # "Carpentry" alone collides with the bridge service's slug
}


def _unique_slug(name):
    base = slugify(name)
    slug = base
    n = 2
    while Service.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class Command(BaseCommand):
    help = "Seed real customer-facing sub-services under their existing categories."

    def handle(self, *args, **options):
        created, skipped, missing_categories = 0, 0, []

        for category_slug, service_names in SERVICES_TO_ADD.items():
            try:
                category = CatalogCategory.objects.get(slug=category_slug)
            except CatalogCategory.DoesNotExist:
                missing_categories.append(category_slug)
                continue

            for name in service_names:
                if Service.objects.filter(category=category, name=name).exists():
                    skipped += 1
                    continue
                catalog_service.create_service(
                    {
                        "category": category,
                        "name": name,
                        "slug": _unique_slug(name),
                        "description": "",
                        "icon": "",
                        "image": "",
                        "is_active": True,
                        "sort_order": 0,
                    },
                    actor=None,
                )
                created += 1
                self.stdout.write(f"  + {category.name} / {name}")

        if missing_categories:
            self.stdout.write(self.style.WARNING(f"Categories not found (skipped): {missing_categories}"))
        self.stdout.write(self.style.SUCCESS(f"Done. Created {created} services, skipped {skipped} already present."))
