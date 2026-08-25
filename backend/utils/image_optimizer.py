import io
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Protect against decompression bomb attacks
Image.MAX_IMAGE_PIXELS = 25_000_000

# Supported input MIME types and formats
SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF", "MPO"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
}

# 15 MB max file size limit for raw upload before processing
MAX_RAW_UPLOAD_SIZE = 15 * 1024 * 1024

# Configuration profiles for different asset classes
IMAGE_PROFILES: Dict[str, Dict[str, Any]] = {
    "catalog": {
        "max_width": 1400,
        "max_height": 1400,
        "quality": 85,
        "method": 6,
    },
    "packages": {
        "max_width": 1400,
        "max_height": 1400,
        "quality": 85,
        "method": 6,
    },
    "services": {
        "max_width": 1400,
        "max_height": 1400,
        "quality": 85,
        "method": 6,
    },
    "addons": {
        "max_width": 1200,
        "max_height": 1200,
        "quality": 85,
        "method": 6,
    },
    "banners": {
        "max_width": 1920,
        "max_height": 1080,
        "quality": 85,
        "method": 6,
    },
    "homepage": {
        "max_width": 1920,
        "max_height": 1080,
        "quality": 85,
        "method": 6,
    },
    "avatars": {
        "max_width": 400,
        "max_height": 400,
        "quality": 85,
        "method": 6,
    },
    "general": {
        "max_width": 1600,
        "max_height": 1600,
        "quality": 85,
        "method": 6,
    },
}


class ImageOptimizationError(Exception):
    """Raised when an image fails validation or processing."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ImageOptimizer:
    """
    Unified, safe, high-performance image processing engine.
    
    Transforms raw uploaded images into optimized, metadata-stripped WebP assets
    with dimension bounds and transparency preservation.
    """

    @classmethod
    def get_profile(cls, profile_name: Optional[str]) -> Dict[str, Any]:
        key = (profile_name or "general").lower().strip()
        return IMAGE_PROFILES.get(key, IMAGE_PROFILES["general"])

    @classmethod
    def optimize(
        cls,
        file_obj,
        profile_name: str = "general",
    ) -> Dict[str, Any]:
        """
        Validates, strips metadata, normalizes orientation, constrains bounds,
        and encodes an uploaded image file into modern WebP.

        Returns:
            {
                "webp_bytes": bytes,
                "original_size": int,
                "optimized_size": int,
                "compression_ratio": float,  # Percentage reduced (e.g. 84.5)
                "format": "webp",
                "width": int,
                "height": int,
                "dimensions": "1200x800",
                "has_alpha": bool,
            }
        """
        if not file_obj:
            raise ImageOptimizationError("No file provided for processing", status_code=400)

        # 1. Measure raw original file size
        file_obj.seek(0, io.SEEK_END)
        original_size = file_obj.tell()
        file_obj.seek(0)

        if original_size <= 0:
            raise ImageOptimizationError("Uploaded file is empty (0 bytes)", status_code=400)

        if original_size > MAX_RAW_UPLOAD_SIZE:
            raise ImageOptimizationError(
                f"File size ({original_size / (1024 * 1024):.1f}MB) exceeds the 15MB limit.",
                status_code=400,
            )

        # 2. Safe Pillow verification
        try:
            raw_img = Image.open(file_obj)
            img_format = (raw_img.format or "").upper()
            if img_format not in SUPPORTED_FORMATS:
                raise ImageOptimizationError(
                    f"Unsupported image format '{img_format}'. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF.",
                    status_code=400,
                )
            raw_img.verify()
        except Image.DecompressionBombError:
            raise ImageOptimizationError(
                "Image dimensions exceed safe processing thresholds (decompression bomb protection).",
                status_code=400,
            )
        except ImageOptimizationError:
            raise
        except Exception as e:
            logger.warning(f"Image verification failed: {e}")
            raise ImageOptimizationError("The uploaded file is not a valid or readable image.", status_code=400)

        # 3. Re-open image for actual processing after verification
        file_obj.seek(0)
        try:
            img = Image.open(file_obj)

            # 4. EXIF Auto-Orientation (rotates photos from mobile/cameras based on orientation tag)
            try:
                img = ImageOps.exif_transpose(img)
            except Exception as e:
                logger.debug(f"EXIF transpose skipped: {e}")

            # 5. Determine alpha / transparency support
            has_alpha = False
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                has_alpha = True
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            # 6. Apply bounded resizing according to profile
            profile = cls.get_profile(profile_name)
            max_w = profile.get("max_width", 1400)
            max_h = profile.get("max_height", 1400)

            orig_w, orig_h = img.size
            if orig_w > max_w or orig_h > max_h:
                # Downscale with high-quality Lanczos resampling
                img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

            final_w, final_h = img.size

            # 7. WebP Encoding (stripping all metadata, clean buffer)
            quality = profile.get("quality", 85)
            method = profile.get("method", 6)

            out_buffer = io.BytesIO()
            img.save(
                out_buffer,
                format="WEBP",
                quality=quality,
                method=method,
                lossless=False,
            )
            webp_bytes = out_buffer.getvalue()
            optimized_size = len(webp_bytes)

            # Calculate actual compression ratio
            if original_size > 0:
                compression_ratio = round((1.0 - (optimized_size / original_size)) * 100.0, 1)
            else:
                compression_ratio = 0.0

            return {
                "webp_bytes": webp_bytes,
                "original_size": original_size,
                "optimized_size": optimized_size,
                "compression_ratio": compression_ratio,
                "format": "webp",
                "width": final_w,
                "height": final_h,
                "dimensions": f"{final_w}x{final_h}",
                "has_alpha": has_alpha,
            }

        except ImageOptimizationError:
            raise
        except Exception as e:
            logger.error(f"Image optimization processing error: {e}", exc_info=True)
            raise ImageOptimizationError(f"Failed to process image: {str(e)}", status_code=500)
