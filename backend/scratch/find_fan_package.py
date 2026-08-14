import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import Package

pkg_id = Package.objects.filter(name__icontains="Fan").first()
print("Found Fan package:", pkg_id.id, pkg_id.slug, pkg_id.name if pkg_id else "None")

all_fan_pkgs = Package.objects.filter(name__icontains="Fan")
for p in all_fan_pkgs:
    print(f"ID: {p.id} | Slug: '{p.slug}' | Name: '{p.name}' | Base Price: {p.base_price}")
