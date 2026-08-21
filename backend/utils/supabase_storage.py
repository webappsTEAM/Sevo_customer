import os
import logging
from pathlib import Path
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class SupabaseStorageService:
    @classmethod
    def _get_config(cls):
        supabase_url = os.getenv("SUPABASE_URL", getattr(settings, "SUPABASE_URL", "")).rstrip("/")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", ""))
        bucket = os.getenv("SUPABASE_STORAGE_BUCKET", getattr(settings, "SUPABASE_STORAGE_BUCKET", "admin-media"))
        return supabase_url, service_role_key, bucket

    @classmethod
    def _save_local_file(cls, file_bytes: bytes, clean_path: str) -> bool:
        """Saves file into local Django MEDIA_ROOT directory as reliable fallback."""
        try:
            media_root = getattr(settings, "MEDIA_ROOT", None)
            if not media_root:
                media_root = Path(getattr(settings, "BASE_DIR", ".")) / "media"
            else:
                media_root = Path(media_root)

            target_path = media_root / clean_path
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(file_bytes)
            logger.info(f"Successfully saved media file locally at: {target_path}")
            return True
        except Exception as err:
            logger.error(f"Failed to save local media file: {err}")
            return False

    @classmethod
    def _delete_local_file(cls, clean_path: str) -> bool:
        try:
            media_root = getattr(settings, "MEDIA_ROOT", None)
            if not media_root:
                media_root = Path(getattr(settings, "BASE_DIR", ".")) / "media"
            else:
                media_root = Path(media_root)

            target_path = media_root / clean_path
            if target_path.exists():
                target_path.unlink()
            return True
        except Exception as err:
            logger.warning(f"Failed to delete local media file: {err}")
            return False

    @classmethod
    def get_public_url(cls, path: str) -> str:
        if not path:
            return ""
        if (
            path.startswith("http://") or 
            path.startswith("https://") or
            path.startswith("data:") or
            path.startswith("/mockups/") or
            path.startswith("mockups/") or
            path.startswith("/assets/") or
            path.startswith("assets/") or
            path.startswith("/media/") or
            path.startswith("media/")
        ):
            return path if path.startswith("/") or path.startswith("http") or path.startswith("data:") else f"/{path}"
        
        clean_path = path.lstrip("/")

        # Check if stored locally in MEDIA_ROOT
        media_root = getattr(settings, "MEDIA_ROOT", None)
        if media_root and (Path(media_root) / clean_path).exists():
            return f"/media/{clean_path}"

        supabase_url, service_key, bucket = cls._get_config()
        if not supabase_url or not service_key or "placeholder" in service_key.lower():
            return f"/media/{clean_path}"
            
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"

    @classmethod
    def upload_file(cls, file_bytes: bytes, path: str, content_type: str = "image/webp") -> bool:
        supabase_url, service_key, bucket = cls._get_config()
        clean_path = path.lstrip("/")

        # If Supabase credentials are missing or placeholder, save locally
        if not supabase_url or not service_key or "placeholder" in service_key.lower():
            logger.info("Supabase credentials missing or placeholder; saving to local media storage.")
            return cls._save_local_file(file_bytes, clean_path)

        url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        try:
            response = requests.post(url, data=file_bytes, headers=headers, timeout=10)
            if response.status_code in (200, 201):
                return True
            logger.warning(f"Supabase upload returned {response.status_code} ({response.text}); falling back to local media.")
            return cls._save_local_file(file_bytes, clean_path)
        except Exception as e:
            logger.warning(f"Exception during Supabase upload: {e}; falling back to local media.")
            return cls._save_local_file(file_bytes, clean_path)

    @classmethod
    def delete_file(cls, path: str) -> bool:
        if not path:
            return False
        clean_path = path.lstrip("/")

        # Delete local copy if exists
        cls._delete_local_file(clean_path)

        supabase_url, service_key, bucket = cls._get_config()
        if not supabase_url or not service_key or "placeholder" in service_key.lower():
            return True

        url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        }

        try:
            response = requests.delete(url, headers=headers, timeout=5)
            if response.status_code in (200, 204):
                return True
            return True
        except Exception as e:
            logger.warning(f"Exception while deleting from Supabase Storage: {e}")
            return True

