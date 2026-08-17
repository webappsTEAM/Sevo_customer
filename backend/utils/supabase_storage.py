import os
import logging
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
    def get_public_url(cls, path: str) -> str:
        if not path:
            return ""
        if path.startswith("http://") or path.startswith("https://"):
            return path
        
        supabase_url, _, bucket = cls._get_config()
        if not supabase_url:
            return path
            
        clean_path = path.lstrip("/")
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"

    @classmethod
    def upload_file(cls, file_bytes: bytes, path: str, content_type: str = "image/webp") -> bool:
        supabase_url, service_key, bucket = cls._get_config()
        if not supabase_url or not service_key:
            logger.error("Supabase Storage credentials missing.")
            return False

        clean_path = path.lstrip("/")
        url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        try:
            response = requests.post(url, data=file_bytes, headers=headers, timeout=15)
            if response.status_code in (200, 201):
                return True
            logger.error(f"Failed to upload to Supabase Storage: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            logger.error(f"Exception while uploading to Supabase Storage: {e}")
            return False

    @classmethod
    def delete_file(cls, path: str) -> bool:
        supabase_url, service_key, bucket = cls._get_config()
        if not supabase_url or not service_key or not path:
            return False

        clean_path = path.lstrip("/")
        url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        }

        try:
            response = requests.delete(url, headers=headers, timeout=10)
            if response.status_code in (200, 204):
                return True
            logger.warning(f"Failed to delete from Supabase Storage: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            logger.warning(f"Exception while deleting from Supabase Storage: {e}")
            return False
