import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package
from service_requests.serializers import CatalogServiceSerializer

mason_pkgs = Package.objects.filter(service__category__slug="mason")
serializer = CatalogServiceSerializer(mason_pkgs, many=True)
for p_data in serializer.data:
    print(f"ID: {p_data['id']} | Name: {p_data['name']} | Category: {p_data['category']} | CategorySlug: {p_data['category_slug']} | ServiceName: {p_data['service_name']} | ServiceSlug: {p_data['service_slug']}")
