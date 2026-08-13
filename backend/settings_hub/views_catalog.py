from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from accounts.permissions import IsAdminRole
import uuid
from django.core.files.storage import default_storage

# The old AdminCatalogCategory*/AdminCatalogService* views that used to live
# here were removed when the Category/Service/Package/AddOn hierarchy
# replaced the flat CatalogCategory/CatalogService model (see
# service_requests/models.py). Their only consumer,
# frontend/src/ui/pages/settings/CatalogSettingsSection.jsx, was an orphaned
# admin screen (no nav entry) and was deleted at the same time — replaced by
# the Service Catalog module at /catalog/*, backed by
# settings_hub/views_catalog_v2.py.

class ImageUploadView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        file = request.FILES.get('image')
        if not file:
            return Response({"success": False, "message": "No image provided"}, status=400)
        
        ext = file.name.split('.')[-1]
        filename = f"catalog_{uuid.uuid4().hex}.{ext}"
        path = default_storage.save(f"catalog/{filename}", file)
        
        url = default_storage.url(path)
        return Response({"success": True, "url": url})
