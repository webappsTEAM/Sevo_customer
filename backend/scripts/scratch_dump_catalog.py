import django, os, sys, json
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package

cats = CatalogCategory.objects.filter(is_active=True).order_by('sort_order')
with open(os.path.join(os.path.dirname(__file__), 'catalog_active_summary_utf8.txt'), 'w', encoding='utf-8') as out:
    for c in cats:
        out.write(f"\n=======================================================\n")
        out.write(f"CATEGORY #{c.id} [{c.slug}] '{c.name}'\n")
        out.write(f"=======================================================\n")
        svcs = Service.objects.filter(category=c, is_active=True).order_by('sort_order')
        for s in svcs:
            pkgs = Package.objects.filter(service=s, status='ACTIVE').order_by('id')
            out.write(f"  SERVICE #{s.id} [{s.slug}] '{s.name}' ({pkgs.count()} active pkgs)\n")
            for p in pkgs:
                out.write(f"    - Pkg #{p.id} [{p.slug}] '{p.name}' | Price: ₹{p.offer_price} | {p.duration}\n")
print("Done writing catalog_active_summary_utf8.txt")
