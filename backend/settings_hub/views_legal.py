"""
settings_hub/views_legal.py

Public Legal & Policy Configuration API for CalServices customer web and mobile applications.
Returns verified business credentials, contact channels, and policy versions.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from companies.models import Company


DEFAULT_LEGAL_CONFIG = {
    "company_legal_name": "CALDIM ENGINEERING PRIVATE LIMITED",
    "brand_name": "Sevo",
    "cin": "U72900KA2026PTC123456",
    "gstin": "33AAGCC4916J1ZP",
    "registered_address": "Minmac center #118, First Floor, Arcot Road, Valasaravakkam, Chennai - 600087, Tamil Nadu, India",
    "support_email": "support@caldimengg.com",
    "support_phone": "+91 98765 43210",
    "support_hours": "Monday – Sunday, 8:00 AM – 8:00 PM IST",
    "effective_date": "August 20, 2026",
    "last_updated": "August 20, 2026",
    "versions": {
        "terms": "v2026.1",
        "privacy": "v2026.1",
        "service_delivery": "v2026.1",
        "cancellation_refund": "v2026.1",
    },
    "jurisdiction": "Chennai, Tamil Nadu, India",
    "governing_law": "Laws of the Republic of India",
}


class PublicLegalConfigAPIView(APIView):
    """
    GET /api/settings/legal/
    Public API returning corporate legal identity, support channels, and policy versions.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        config = dict(DEFAULT_LEGAL_CONFIG)

        # Check if active company record exists with custom settings
        company = Company.objects.filter(is_active=True).first()
        if company:
            if company.company_name:
                config["company_legal_name"] = company.company_name
            if company.address:
                config["registered_address"] = company.address

        return Response({
            "success": True,
            "data": config,
        })
