import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.core.cache import cache
from django.db.models import Q
from inventory.models import (
    Vegetable,
    VegetableStockMovement,
    VegetableClaim,
    VegetableCategory,
    StockMovement,
)
from service_requests.models import Package

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Wipes all Vegetable product rows, stock movements, claims, and linked packages while preserving the VegetableCategory hierarchy."

    def handle(self, *args, **options):
        with transaction.atomic():
            # 1. Collect all Vegetable items
            vegetables = list(Vegetable.objects.all())
            veg_ids = [v.id for v in vegetables]
            veg_names = [v.name for v in vegetables]

            # 2. Collect linked and upload-test Package rows
            linked_pkg_ids = list(Package.objects.filter(
                Q(vegetable_stock__isnull=False) |
                Q(stock_item_id__in=veg_ids) |
                Q(id__in=[1080, 1081, 1083, 1084, 1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094])
            ).values_list("id", flat=True))

            # 3. Delete Vegetable Claims
            claims_deleted, _ = VegetableClaim.objects.filter(
                Q(vegetable_id__in=veg_ids) | Q(vegetable__isnull=True)
            ).delete()

            # 4. Delete Vegetable Stock Movements
            movements_deleted, _ = VegetableStockMovement.objects.filter(
                Q(vegetable_id__in=veg_ids) | Q(vegetable__isnull=True)
            ).delete()

            # 5. Delete Stock Movements referencing these vegetables
            stock_movements_deleted = 0
            try:
                stock_movements_deleted, _ = StockMovement.objects.filter(
                    item__name__in=veg_names
                ).delete()
            except Exception:
                pass

            # 6. Unlink Package foreign keys before deleting
            Vegetable.objects.all().update(package=None)
            Package.objects.filter(id__in=linked_pkg_ids).update(stock_item=None)

            # Also ensure any legacy packages without stock_item are set to DRAFT
            Package.objects.filter(service__slug="vegetables", stock_item__isnull=True).update(status="DRAFT")

            # 7. Delete Vegetable rows
            veg_deleted, _ = Vegetable.objects.all().delete()

            # 8. Delete linked Package rows
            pkg_deleted, _ = Package.objects.filter(id__in=linked_pkg_ids).delete()

            # 9. Clear catalog caches
            try:
                from inventory.views import _clear_catalog_cache
                _clear_catalog_cache()
            except Exception:
                pass
            cache.clear()

            # 10. Verify preserved categories
            categories_count = VegetableCategory.objects.count()
            category_names = list(VegetableCategory.objects.values_list("name", flat=True))

            self.stdout.write(self.style.SUCCESS(
                f"\n=== VEGETABLES DATA WIPE COMPLETED ===\n"
                f"- Deleted {veg_deleted} Vegetable records: {veg_names}\n"
                f"- Deleted {pkg_deleted} linked Package records (IDs: {linked_pkg_ids})\n"
                f"- Deleted {claims_deleted} VegetableClaim records\n"
                f"- Deleted {movements_deleted} VegetableStockMovement records\n"
                f"- Cleared all catalog and Redis caches\n"
                f"- Preserved {categories_count} VegetableCategory records: {category_names}\n"
            ))
