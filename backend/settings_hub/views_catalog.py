import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsAdminRole


class ImageUploadView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        file = request.FILES.get('image')
        if not file:
            return Response({"success": False, "message": "No image provided"}, status=400)
        
        ext = file.name.split('.')[-1].lower()
        filename = f"catalog_{uuid.uuid4().hex}.{ext}"
        
        # 1. Save to backend media storage
        path = default_storage.save(f"catalog/{filename}", file)
        
        # 2. Also mirror into frontend/public/mockups/catalog so it's tracked by Git & served everywhere
        try:
            frontend_mockups_dir = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'mockups', 'catalog')
            os.makedirs(frontend_mockups_dir, exist_ok=True)
            dst_path = os.path.join(frontend_mockups_dir, filename)
            file.seek(0)
            with open(dst_path, 'wb') as f_out:
                for chunk in file.chunks():
                    f_out.write(chunk)
        except Exception:
            pass
        
        url = default_storage.url(path)
        return Response({"success": True, "url": url})

