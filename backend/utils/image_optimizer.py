import io
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Protect against decompression bomb attacks
MAX_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

# Supported input MIME types and formats
SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP", "GIF", "BMP", "TIFF", "MPO"}
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

# Hard 500 KB limit for final optimized WebP asset
MAX_FINAL_OPTIMIZED_SIZE = 500 * 1024  # 512,000 bytes

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
    def __init__(self, message: str, status_code: int = 400, error_code: str = "IMAGE_OPTIMIZATION_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class ImageOptimizer:
    """
    Unified, safe, high-performance image processing engine.
    
    Transforms raw uploaded images into optimized, metadata-stripped WebP assets
    with dimension bounds, transparency preservation, hard 500KB cap,
    and special preservation for already-optimized assets under 100KB.
    """

    @classmethod
    def get_profile(cls, profile_name: Optional[str]) -> Dict[str, Any]:
        key = (profile_name or "general").lower().strip()
        return IMAGE_PROFILES.get(key, IMAGE_PROFILES["general"])

    @classmethod
    def _encode_webp(cls, img: Image.Image, quality: int = 85, method: int = 6, lossless: bool = False) -> bytes:
        """Helper to encode PIL image to WebP bytes."""
        out = io.BytesIO()
        img.save(
            out,
            format="WEBP",
            quality=quality,
            method=method,
            lossless=lossless,
        )
        return out.getvalue()

    @classmethod
    def optimize(
        cls,
        file_obj,
        profile_name: str = "general",
    ) -> Dict[str, Any]:
        """
        Validates, strips metadata, normalizes orientation, constrains bounds,
        and encodes an uploaded image file into modern WebP <= 500 KB.

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
                "original_dimensions": "2800x1400",
                "output_dimensions": "1200x800",
                "quality_used": int,
                "has_alpha": bool,
            }
        """
        if not file_obj:
            raise ImageOptimizationError("No file provided for processing", status_code=400, error_code="EMPTY_FILE")

        # 1. Measure raw original file size
        file_obj.seek(0, io.SEEK_END)
        original_size = file_obj.tell()
        file_obj.seek(0)

        if original_size <= 0:
            raise ImageOptimizationError("Uploaded file is empty (0 bytes)", status_code=400, error_code="EMPTY_FILE")

        if original_size > MAX_RAW_UPLOAD_SIZE:
            raise ImageOptimizationError(
                f"File size ({original_size / (1024 * 1024):.1f}MB) exceeds the 15MB limit.",
                status_code=400,
                error_code="FILE_TOO_LARGE",
            )

        # 2. Safe Pillow verification
        try:
            raw_img = Image.open(file_obj)
            img_format = (raw_img.format or "").upper()
            if img_format not in SUPPORTED_FORMATS:
                raise ImageOptimizationError(
                    f"Unsupported image format '{img_format}'. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF.",
                    status_code=400,
                    error_code="UNSUPPORTED_FORMAT",
                )
            
            # Pixel count sanity check
            raw_w, raw_h = raw_img.size
            if raw_w <= 0 or raw_h <= 0:
                raise ImageOptimizationError("Image has invalid or zero dimensions.", status_code=400, error_code="INVALID_DIMENSIONS")
            if raw_w * raw_h > MAX_PIXELS:
                raise ImageOptimizationError(
                    f"Image total pixels ({raw_w * raw_h:,}) exceeds maximum safe threshold ({MAX_PIXELS:,}).",
                    status_code=400,
                    error_code="PIXEL_COUNT_EXCEEDED",
                )
            raw_img.verify()
        except Image.DecompressionBombError:
            raise ImageOptimizationError(
                "Image dimensions exceed safe processing thresholds (decompression bomb protection).",
                status_code=400,
                error_code="DECOMPRESSION_BOMB",
            )
        except ImageOptimizationError:
            raise
        except Exception as e:
            logger.warning(f"Image verification failed: {e}")
            raise ImageOptimizationError("The uploaded file is not a valid or readable image.", status_code=400, error_code="CORRUPT_IMAGE")

        # 3. Re-open image for actual processing after verification
        file_obj.seek(0)
        try:
            img = Image.open(file_obj)

            # 4. EXIF Auto-Orientation (rotates photos from mobile/cameras based on orientation tag)
            try:
                img = ImageOps.exif_transpose(img)
            except Exception as e:
                logger.debug(f"EXIF transpose skipped: {e}")

            orig_w, orig_h = img.size
            original_dimensions_str = f"{orig_w}x{orig_h}"

            # 5. Determine alpha / transparency support (preserves RGBA without flattening)
            has_alpha = False
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                has_alpha = True
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            # 6. Apply bounded resizing according to profile (never upscales smaller images)
            profile = cls.get_profile(profile_name)
            max_w = profile.get("max_width", 1400)
            max_h = profile.get("max_height", 1400)

            target_img = img.copy()
            if orig_w > max_w or orig_h > max_h:
                # Downscale with high-quality Lanczos resampling preserving exact aspect ratio
                target_img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

            # 7. SPECIAL RULE: Images under 100 KB
            # If the original image is already < 100 KB, avoid unnecessary lossy degradation.
            is_under_100kb = original_size < 100 * 1024

            if is_under_100kb:
                # Use high-fidelity WebP encoding without aggressive compression
                quality_to_use = 92
                webp_bytes = cls._encode_webp(target_img, quality=quality_to_use, method=6, lossless=False)
                quality_used = quality_to_use
            else:
                quality_to_use = profile.get("quality", 85)
                webp_bytes = cls._encode_webp(target_img, quality=quality_to_use, method=6, lossless=False)
                quality_used = quality_to_use

            # 8. HARD 500 KB LIMIT ENFORCEMENT & MULTI-STAGE OPTIMIZATION
            # If output > 500 KB, progressively reduce quality and scale down dimensions intelligently.
            if len(webp_bytes) > MAX_FINAL_OPTIMIZED_SIZE:
                logger.info(f"Initial WebP size ({len(webp_bytes)} bytes) > 500KB. Starting controlled multi-stage reduction...")

                # Stage 1: Controlled Quality Stepping (80, 72, 64, 56, 48, 40)
                quality_steps = [80, 72, 64, 56, 48, 40, 35]
                for q in quality_steps:
                    if q >= quality_to_use:
                        continue
                    test_bytes = cls._encode_webp(target_img, quality=q, method=6)
                    if len(test_bytes) <= MAX_FINAL_OPTIMIZED_SIZE:
                        webp_bytes = test_bytes
                        quality_used = q
                        break
                    quality_used = q
                    webp_bytes = test_bytes

                # Stage 2: Dimension Scaling if still > 500 KB
                if len(webp_bytes) > MAX_FINAL_OPTIMIZED_SIZE:
                    scale_factors = [0.85, 0.72, 0.60, 0.50, 0.40]
                    curr_w, curr_h = target_img.size
                    for scale in scale_factors:
                        new_w = max(250, int(curr_w * scale))
                        new_h = max(250, int(curr_h * scale))
                        scaled_img = target_img.copy()
                        scaled_img.thumbnail((new_w, new_h), Image.Resampling.LANCZOS)

                        for q in [75, 60, 50, 40, 32]:
                            test_bytes = cls._encode_webp(scaled_img, quality=q, method=6)
                            if len(test_bytes) <= MAX_FINAL_OPTIMIZED_SIZE:
                                target_img = scaled_img
                                webp_bytes = test_bytes
                                quality_used = q
                                break
                        if len(webp_bytes) <= MAX_FINAL_OPTIMIZED_SIZE:
                            break

            # 9. Final 500 KB Gate Check
            if len(webp_bytes) > MAX_FINAL_OPTIMIZED_SIZE:
                logger.error(f"Image could not be optimized below 500 KB limit. Final size: {len(webp_bytes)} bytes.")
                raise ImageOptimizationError(
                    "The image could not be optimized below the 500 KB limit.",
                    status_code=400,
                    error_code="IMAGE_TOO_LARGE_AFTER_OPTIMIZATION",
                )

            final_w, final_h = target_img.size
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
                "original_dimensions": original_dimensions_str,
                "output_dimensions": f"{final_w}x{final_h}",
                "quality_used": quality_used,
                "has_alpha": has_alpha,
            }

        except ImageOptimizationError:
            raise
        except Exception as e:
            logger.error(f"Image optimization processing error: {e}", exc_info=True)
            raise ImageOptimizationError(f"Failed to process image: {str(e)}", status_code=500, error_code="PROCESSING_ERROR")
