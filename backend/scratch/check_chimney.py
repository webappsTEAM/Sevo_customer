import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package

pkg = Package.objects.filter(slug="sandwich-clean").first()
if pkg:
    print("SLUG:", pkg.slug)
    print("TOOLS:", pkg.tools, type(pkg.tools))
    print("READY:", pkg.ready, type(pkg.ready))
    print("REVIEWS:", pkg.reviews, type(pkg.reviews))
    print("FAQS:", pkg.faqs, type(pkg.faqs))
else:
    print("No package found with slug sandwich-clean")
