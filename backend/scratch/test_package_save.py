import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import Package
from service_requests.services import catalog as catalog_service
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(username="admin").first()

pkg = Package.objects.filter(name__icontains="Ceiling Fan").first()
print(f"Testing update on package: {pkg.name} (id: {pkg.id}, slug: {pkg.slug})")

updated = catalog_service.update_package(
    pkg,
    {
        "base_price": 249,
        "description": "Expert ceiling fan installation, regulator repair, blade angle balancing and whisper-quiet motor testing.",
        "tools": ["Sturdy step ladder", "Phase voltage tester", "Blade pitch balancing clip set", "Heavy-duty wire crimper"],
        "ready": ["Keep the new fan box in the room", "Ensure clear space below ceiling hook"],
        "reviews": [{"name": "Rajesh V.", "rating": "5.0", "text": "Installed our BLDC fan with zero wobble. Very neat electrical work."}],
        "faqs": [{"q": "Do you install remote-controlled BLDC fans?", "a": "Yes! We specialize in Atomberg, Havells, Crompton BLDC smart fans."}]
    },
    admin,
    reason="Admin custom price & details save test"
)

print(f"SUCCESS! Updated package price: {updated.base_price}, tools: {updated.tools}, faqs count: {len(updated.faqs)}")
