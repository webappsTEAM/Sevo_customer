import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.test import RequestFactory
from service_requests.views import CatalogServiceListView

factory = RequestFactory()
request = factory.get('/api/catalog/services/')
view = CatalogServiceListView.as_view()
response = view(request)
response.render()

import json
data = json.loads(response.content)
mason_packages = [p for p in data['data'] if p['category_slug'] == 'mason']
for p in mason_packages:
    print(f"ID: {p['id']} | Name: {p['name']} | ServiceSlug: {p['service_slug']}")
