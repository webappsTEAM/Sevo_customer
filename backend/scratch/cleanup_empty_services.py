import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import Service, Package

# Deactivate or delete empty duplicate services that have 0 packages
for s in Service.objects.all():
    count = Package.objects.filter(service=s).count()
    if count == 0:
        print(f"Deleting empty unused service: {s.name} (id: {s.id}, slug: {s.slug}, cat: {s.category.name if s.category else 'None'})")
        s.delete()

print("\nActive Services remaining with packages:")
for s in Service.objects.all():
    print(f"Service: '{s.name}' (id: {s.id}, slug: '{s.slug}', cat: '{s.category.name if s.category else 'None'}') -> {Package.objects.filter(service=s).count()} packages")
