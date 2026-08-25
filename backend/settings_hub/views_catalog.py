import logging
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsAdminRole
from utils.image_optimizer import ImageOptimizer, ImageOptimizationError
from utils.supabase_storage import SupabaseStorageService

logger = logging.getLogger(__name__)

ALLOWED_ASSET_TYPES = {
    "catalog": "catalog/general",
    "packages": "catalog/packages",
    "services": "catalog/services",
    "addons": "catalog/addons",
    "banners": "banners",
    "homepage": "homepage",
    "avatars": "avatars",
    "general": "general",
}


class ImageUploadView(APIView):
    """
    POST /api/settings/catalog/upload-image/
    Unified image upload, EXIF sanitization, Lanczos bounds resizing,
    WebP compression, and Supabase Storage persistence pipeline.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request):
        file_obj = request.FILES.get("image") or request.FILES.get("file")
        if not file_obj:
            return Response(
                {"success": False, "error": "No image file provided in 'image' or 'file' form field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset_type = (
            request.data.get("asset_type")
            or request.data.get("folder")
            or request.data.get("section")
            or "packages"
        ).strip().lower()

        if asset_type not in ALLOWED_ASSET_TYPES:
            target_folder = f"catalog/{asset_type}" if "/" not in asset_type else asset_type
            profile_name = "catalog"
        else:
            target_folder = ALLOWED_ASSET_TYPES[asset_type]
            profile_name = asset_type

        # 1. Optimize, sanitize metadata, downscale and convert to WebP
        try:
            optimized = ImageOptimizer.optimize(file_obj, profile_name=profile_name)
        except ImageOptimizationError as opt_err:
            return Response(
                {"success": False, "error": opt_err.message},
                status=opt_err.status_code,
            )
        except Exception as e:
            logger.error(f"Unexpected image processing error: {e}", exc_info=True)
            return Response(
                {"success": False, "error": f"Failed to process image: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 2. Generate collision-safe storage path
        storage_path = SupabaseStorageService.generate_storage_path(
            folder=target_folder,
            extension="webp",
        )

        # 3. Upload to Supabase Storage (with controlled local dev fallback)
        success, public_url, error_msg = SupabaseStorageService.upload_file(
            file_bytes=optimized["webp_bytes"],
            path=storage_path,
            content_type="image/webp",
        )

        if not success:
            logger.error(f"Image upload to storage failed for {storage_path}: {error_msg}")
            return Response(
                {"success": False, "error": error_msg or "Failed to upload image to storage."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "success": True,
                "url": public_url,
                "path": storage_path,
                "format": optimized["format"],
                "width": optimized["width"],
                "height": optimized["height"],
                "dimensions": optimized["dimensions"],
                "original_size": optimized["original_size"],
                "file_size": optimized["optimized_size"],
                "compression_ratio": optimized["compression_ratio"],
            },
            status=status.HTTP_201_CREATED,
        )
