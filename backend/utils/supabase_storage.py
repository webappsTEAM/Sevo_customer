import os
import requests
import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zqghatybqkztzgjmmlpl.supabase.co").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "admin-media")


class SupabaseStorageService:
    """
    Production storage service for managing public homepage media assets on Supabase Storage
    with seamless local MEDIA_ROOT fallback for development and offline testing.
    """

    @classmethod
    def get_public_url(cls, image_path: str) -> str:
        """
        Resolves a stored image_path (e.g., 'homepage/categories/8f31c2.webp')
        into a fully-qualified public CDN or local /media/ URL.
        """
        if not image_path:
            return ""
        if image_path.startswith("http://") or image_path.startswith("https://") or image_path.startswith("/mockups/") or image_path.startswith("/media/"):
            return image_path

        clean_path = image_path.lstrip("/")

        # Check if local fallback file exists
        local_file = Path(settings.MEDIA_ROOT) / clean_path
        if local_file.exists():
            return f"/media/{clean_path}"

        return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{clean_path}"

    @classmethod
    def upload_file(cls, file_bytes: bytes, image_path: str, content_type: str = "image/webp") -> bool:
        """
        Uploads binary file payload to Supabase Storage.
        If Supabase is unavailable or returns credential errors, safely saves to local MEDIA_ROOT.
        """
        clean_path = image_path.lstrip("/")

        # Attempt Supabase Storage upload if key is valid (not placeholder)
        if SUPABASE_SERVICE_KEY and "placeholder" not in SUPABASE_SERVICE_KEY:
            url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{clean_path}"
            headers = {
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "ApiKey": SUPABASE_SERVICE_KEY,
                "Content-Type": content_type,
                "x-upsert": "true",
            }
            try:
                res = requests.post(url, data=file_bytes, headers=headers, timeout=10)
                if res.status_code in (200, 201):
                    logger.info(f"Successfully uploaded {clean_path} to Supabase bucket '{SUPABASE_BUCKET}'")
                    return True
                else:
                    logger.warning(f"Supabase upload returned {res.status_code}. Falling back to local media storage.")
            except Exception as e:
                logger.warning(f"Supabase storage exception ({clean_path}): {e}. Falling back to local media storage.")

        # Local MEDIA_ROOT fallback save
        try:
            target_path = Path(settings.MEDIA_ROOT) / clean_path
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(file_bytes)
            logger.info(f"Successfully saved {clean_path} to local MEDIA_ROOT: {target_path}")
            return True
        except Exception as local_err:
            logger.error(f"Failed local media storage fallback for {clean_path}: {local_err}")
            return False

    @classmethod
    def delete_file(cls, image_path: str) -> bool:
        """
        Removes specified image_path from Supabase Storage and local MEDIA_ROOT.
        """
        if not image_path or image_path.startswith("/mockups/"):
            return True

        clean_path = image_path.lstrip("/")

        # Delete local file if present
        try:
            local_file = Path(settings.MEDIA_ROOT) / clean_path
            if local_file.exists():
                local_file.unlink()
                logger.info(f"Deleted local file: {local_file}")
        except Exception as e:
            logger.warning(f"Failed deleting local file {clean_path}: {e}")

        # Delete Supabase file if credentials valid
        if SUPABASE_SERVICE_KEY and "placeholder" not in SUPABASE_SERVICE_KEY:
            url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{clean_path}"
            headers = {
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "ApiKey": SUPABASE_SERVICE_KEY,
            }
            try:
                res = requests.delete(url, headers=headers, timeout=10)
                if res.status_code in (200, 204, 404):
                    logger.info(f"Successfully deleted {clean_path} from Supabase bucket '{SUPABASE_BUCKET}'")
                    return True
            except Exception as e:
                logger.warning(f"Supabase storage delete exception ({clean_path}): {e}")

        return True
