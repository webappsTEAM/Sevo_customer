import os
import sys
import django

# Setup Django
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package

output_path = os.path.join(os.path.dirname(__file__), "active_catalog_tree.txt")

with open(output_path, "w", encoding="utf-8") as f:
    for cat in CatalogCategory.objects.filter(is_active=True).order_by('sort_order'):
        f.write("="*60 + "\n")
        f.write(f"CATEGORY [{cat.id}]: {cat.name} ({cat.slug})\n")
        f.write("="*60 + "\n")
        for svc in cat.services.filter(is_active=True).order_by('sort_order', 'name'):
            pkgs = svc.packages.filter(status='ACTIVE').order_by('sort_order', 'base_price')
            f.write(f"\n  SERVICE [{svc.id}]: {svc.name} ({svc.slug}) -- {pkgs.count()} packages\n")
            subtabs = svc.customization.get('subtabs', []) if svc.customization else []
            f.write(f"  Existing Subtabs/Groups ({len(subtabs)}): {subtabs}\n")
            for p in pkgs:
                f.write(f"    - [{p.id}] \"{p.name}\" | Base: ₹{p.base_price} | Offer: ₹{p.offer_price} | Dur: {p.duration} | SubKey: \"{p.sub_service_key}\" | Tag: \"{p.tag}\"\n")

print(f"Catalog dumped to {output_path}")
