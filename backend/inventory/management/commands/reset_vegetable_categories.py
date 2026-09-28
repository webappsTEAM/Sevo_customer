from django.core.management.base import BaseCommand
from inventory.models import Vegetable, VegetableCategory


class Command(BaseCommand):
    help = "Clear seeded vegetable categories and reset category mappings"

    def handle(self, *args, **options):
        # Unlink category references from vegetables
        veg_count = Vegetable.objects.filter(category__isnull=False).update(category=None)
        cat_count, _ = VegetableCategory.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully unlinked {veg_count} vegetables and deleted {cat_count} categories."
        ))
