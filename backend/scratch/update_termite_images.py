import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
django.setup()

from service_requests.models import CatalogPackage

# Update all termite control packages to use the new image
pkgs = CatalogPackage.objects.filter(service__slug='termite-control')
print("Before update:")
for p in pkgs:
    print(f"  {p.slug}: {p.image}")

count = pkgs.update(image='/mockups/termite_control.jpg')
print(f"\nUpdated {count} packages")

pkgs2 = CatalogPackage.objects.filter(service__slug='termite-control')
print("\nAfter update:")
for p in pkgs2:
    print(f"  {p.slug}: {p.image}")
