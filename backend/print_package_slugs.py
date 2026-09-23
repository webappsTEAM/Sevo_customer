import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package

for p in Package.objects.filter(service__category__slug="mason"):
    print(f"Package ID: {p.id} | Slug: {p.slug} | Name: {p.name}")
