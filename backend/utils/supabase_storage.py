import os
import uuid
import logging
from pathlib import Path
from typing import Tuple, Optional, Set
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Allowed root storage directories to prevent arbitrary path traversal
ALLOWED_ROOT_FOLDERS: Set[str] = {
    "catalog",
    "services",
    "packages",
    "addons",
    "banners",
    "homepage",
    "general",
    "avatars",
    "logos",
}


class SupabaseStorageService:
    """
    Production-grade public media storage service.
    
    Supports Cloudflare R2 and the legacy Supabase Storage backend while
    preserving collision-safe paths and the controlled development fallback.
    The historical class name is retained to avoid a risky, all-at-once caller
    migration.
    """

    @classmethod
    def _get_provider(cls) -> str:
        provider = os.getenv(
            "MEDIA_STORAGE_PROVIDER",
            getattr(settings, "MEDIA_STORAGE_PROVIDER", "supabase"),
        ).strip().lower()
        return provider or "supabase"

    @classmethod
    def _get_config(cls):
        supabase_url = os.getenv("SUPABASE_URL", getattr(settings, "SUPABASE_URL", "")).rstrip("/")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", ""))
        bucket = os.getenv("SUPABASE_STORAGE_BUCKET", getattr(settings, "SUPABASE_STORAGE_BUCKET", "admin-media"))
        
        # Local fallback allowed in DEBUG mode or when explicitly enabled
        enable_fallback_env = os.getenv("ENABLE_LOCAL_STORAGE_FALLBACK", "")
        if enable_fallback_env.lower() in ("true", "1", "yes"):
            enable_local_fallback = True
        elif enable_fallback_env.lower() in ("false", "0", "no"):
            enable_local_fallback = False
        else:
            enable_local_fallback = getattr(settings, "DEBUG", True)

        return supabase_url, service_role_key, bucket, enable_local_fallback

    @classmethod
    def _get_r2_config(cls):
        endpoint_url = os.getenv(
            "R2_ENDPOINT_URL", getattr(settings, "R2_ENDPOINT_URL", "")
        ).rstrip("/")
        access_key_id = os.getenv(
            "R2_ACCESS_KEY_ID", getattr(settings, "R2_ACCESS_KEY_ID", "")
        ).strip()
        secret_access_key = os.getenv(
            "R2_SECRET_ACCESS_KEY", getattr(settings, "R2_SECRET_ACCESS_KEY", "")
        ).strip()
        bucket = os.getenv(
            "R2_PUBLIC_BUCKET", getattr(settings, "R2_PUBLIC_BUCKET", "")
        ).strip()
        public_base_url = os.getenv(
            "R2_PUBLIC_BASE_URL", getattr(settings, "R2_PUBLIC_BASE_URL", "")
        ).rstrip("/")
        _, _, _, enable_local_fallback = cls._get_config()
        return (
            endpoint_url,
            access_key_id,
            secret_access_key,
            bucket,
            public_base_url,
            enable_local_fallback,
        )

    @classmethod
    def _get_r2_client(cls):
        """Create the S3-compatible client lazily so local fallback needs no SDK."""
        try:
            import boto3
            from botocore.config import Config
        except ImportError as exc:
            raise RuntimeError(
                "Cloudflare R2 storage requires the boto3 dependency."
            ) from exc

        endpoint_url, access_key_id, secret_access_key, _, _, _ = cls._get_r2_config()
        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    @classmethod
    def extract_managed_path(cls, path: str) -> str:
        """Return an object key for managed URLs/paths, or an empty string."""
        if not path:
            return ""

        trimmed = str(path).strip()
        supabase_url, _, supabase_bucket, _ = cls._get_config()
        _, _, _, _, r2_public_base_url, _ = cls._get_r2_config()
        prefixes = []
        if supabase_url:
            prefixes.append(
                f"{supabase_url}/storage/v1/object/public/{supabase_bucket}/"
            )
        if r2_public_base_url:
            prefixes.append(f"{r2_public_base_url}/")

        for prefix in prefixes:
            if trimmed.startswith(prefix):
                return trimmed[len(prefix):]

        if trimmed.startswith("/media/"):
            return trimmed[len("/media/"):]
        if trimmed.startswith("media/"):
            return trimmed[len("media/"):]
        if trimmed.startswith(("http://", "https://", "data:", "blob:")):
            return ""
        return trimmed.lstrip("/")

    @classmethod
    def validate_and_clean_path(cls, path: str) -> str:
        """
        Validates that a path is safe, normalized, and within allowed folders.
        Prevents path traversal attacks.
        """
        if not path or not isinstance(path, str):
            raise ValueError("Storage path cannot be empty.")

        # Normalize and remove leading/trailing slashes
        clean = path.replace("\\", "/").strip("/ ")
        parts = [p for p in clean.split("/") if p]

        if not parts:
            raise ValueError("Invalid storage path.")

        if ".." in parts or "." in parts:
            raise ValueError("Path traversal sequences are strictly forbidden.")

        root_folder = parts[0].lower()
        if root_folder not in ALLOWED_ROOT_FOLDERS:
            raise ValueError(
                f"Root folder '{root_folder}' is not permitted. Allowed: {sorted(list(ALLOWED_ROOT_FOLDERS))}"
            )

        return "/".join(parts)

    @classmethod
    def generate_storage_path(cls, folder: str = "catalog/packages", extension: str = "webp") -> str:
        """
        Generates a collision-safe, deterministic UUID storage path.
        Example: catalog/packages/e7b92f9a12c448d390a030d9cb52fa31.webp
        """
        clean_folder = folder.replace("\\", "/").strip("/ ")
        parts = [p for p in clean_folder.split("/") if p]
        
        if not parts:
            root = "catalog"
            sub = "general"
        elif len(parts) == 1:
            root = parts[0].lower()
            sub = ""
        else:
            root = parts[0].lower()
            sub = "/".join(parts[1:])

        if root not in ALLOWED_ROOT_FOLDERS:
            root = "catalog"

        file_uuid = uuid.uuid4().hex
        ext = extension.lstrip(".").lower() or "webp"

        if sub:
            raw_path = f"{root}/{sub}/{file_uuid}.{ext}"
        else:
            raw_path = f"{root}/{file_uuid}.{ext}"

        return cls.validate_and_clean_path(raw_path)

    @classmethod
    def _save_local_file(cls, file_bytes: bytes, clean_path: str) -> bool:
        """Saves file into local Django MEDIA_ROOT directory."""
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
            logger.info(f"Saved media file locally at: {target_path}")
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
            if target_path.exists() and target_path.is_file():
                target_path.unlink()
                logger.info(f"Deleted local media file: {target_path}")
            return True
        except Exception as err:
            logger.warning(f"Failed to delete local media file: {err}")
            return False

    @classmethod
    def get_public_url(cls, path: str) -> str:
        """
        Resolves a canonical public CDN URL from a storage path.
        Safe against already-absolute URLs and legacy mockups.
        """
        if not path:
            return ""

        trimmed = str(path).strip()
        if (
            trimmed.startswith("http://") or 
            trimmed.startswith("https://") or
            trimmed.startswith("data:") or
            trimmed.startswith("blob:")
        ):
            return trimmed

        if (
            trimmed.startswith("/mockups/") or
            trimmed.startswith("mockups/") or
            trimmed.startswith("/assets/") or
            trimmed.startswith("assets/")
        ):
            return trimmed if trimmed.startswith("/") else f"/{trimmed}"

        clean_path = trimmed.lstrip("/")

        # Check if stored as local media explicitly
        if clean_path.startswith("media/"):
            return f"/{clean_path}"

        provider = cls._get_provider()
        if provider == "r2":
            _, _, _, _, public_base_url, enable_local_fallback = cls._get_r2_config()
            if public_base_url:
                return f"{public_base_url}/{clean_path}"
            if enable_local_fallback:
                return f"/media/{clean_path}"
            return ""

        supabase_url, service_key, bucket, enable_local_fallback = cls._get_config()

        # If Supabase credentials are not configured and file exists locally
        media_root = getattr(settings, "MEDIA_ROOT", None)
        if media_root and (Path(media_root) / clean_path).exists():
            if not supabase_url or not service_key or "placeholder" in service_key.lower():
                return f"/media/{clean_path}"

        if not supabase_url:
            return f"/media/{clean_path}"

        return f"{supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"

    @classmethod
    def upload_file(
        cls,
        file_bytes: bytes,
        path: str,
        content_type: str = "image/webp",
        cache_control: str = "public, max-age=31536000, immutable",
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Uploads image bytes to the configured public media provider.

        Returns:
            (success: bool, public_url: str, error_message: Optional[str])
        """
        try:
            clean_path = cls.validate_and_clean_path(path)
        except ValueError as val_err:
            return False, "", str(val_err)

        provider = cls._get_provider()
        if provider == "r2":
            (
                endpoint_url,
                access_key_id,
                secret_access_key,
                bucket,
                public_base_url,
                enable_local_fallback,
            ) = cls._get_r2_config()
            has_valid_remote_creds = bool(
                endpoint_url
                and access_key_id
                and secret_access_key
                and bucket
                and public_base_url
            )
            if has_valid_remote_creds:
                try:
                    cls._get_r2_client().put_object(
                        Bucket=bucket,
                        Key=clean_path,
                        Body=file_bytes,
                        ContentType=content_type,
                        CacheControl=cache_control,
                    )
                    logger.info("R2 upload succeeded for path: %s", clean_path)
                    return True, cls.get_public_url(clean_path), None
                except Exception as r2_err:
                    logger.warning("R2 upload failed for path %s: %s", clean_path, r2_err)
                    if not enable_local_fallback:
                        return False, "", "Remote storage upload failed."

            if enable_local_fallback:
                saved = cls._save_local_file(file_bytes, clean_path)
                if saved:
                    return True, f"/media/{clean_path}", None
                return False, "", "Failed to write image to local media fallback."

            return False, "", "Cloudflare R2 credentials are missing or invalid."

        if provider != "supabase":
            return False, "", f"Unsupported media storage provider: {provider}."

        supabase_url, service_key, bucket, enable_local_fallback = cls._get_config()
        has_valid_remote_creds = bool(
            supabase_url and service_key and "placeholder" not in service_key.lower()
        )

        # 1. Attempt Supabase Storage Upload if credentials configured
        if has_valid_remote_creds:
            url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
            headers = {
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": content_type,
                "Cache-Control": cache_control,
                "x-upsert": "false",
            }

            try:
                response = requests.post(url, data=file_bytes, headers=headers, timeout=12)
                if response.status_code in (200, 201):
                    public_url = cls.get_public_url(clean_path)
                    logger.info(f"Supabase upload succeeded for path: {clean_path}")
                    return True, public_url, None

                err_msg = f"Supabase Storage returned HTTP {response.status_code}: {response.text}"
                logger.warning(err_msg)

                # If local fallback is disallowed (production), do not mask error
                if not enable_local_fallback:
                    return False, "", f"Remote storage upload failed ({response.status_code})."

            except Exception as net_err:
                err_msg = f"Network exception during Supabase upload: {net_err}"
                logger.warning(err_msg)
                if not enable_local_fallback:
                    return False, "", f"Remote storage connection error: {str(net_err)}"

        # 2. Local Fallback (Development Only)
        if enable_local_fallback:
            logger.info(f"Saving to local media fallback for path: {clean_path}")
            saved = cls._save_local_file(file_bytes, clean_path)
            if saved:
                public_url = f"/media/{clean_path}"
                return True, public_url, None
            return False, "", "Failed to write image to local media fallback."

        return False, "", "Supabase Storage credentials are missing or invalid in production configuration."

    @classmethod
    def delete_file(cls, path: str) -> bool:
        """
        Deletes a managed asset from the configured provider and local fallback.
        Ignores external URLs and unmanaged paths.
        """
        if not path:
            return False

        trimmed = str(path).strip()
        # Never delete external third-party images or static mockups
        if (
            "unsplash.com" in trimmed or
            trimmed.startswith("/mockups/") or
            trimmed.startswith("/assets/")
        ):
            return True

        # Extract clean storage path
        clean_path = cls.extract_managed_path(trimmed)
        if not clean_path:
            return False

        try:
            clean_path = cls.validate_and_clean_path(clean_path)
        except ValueError:
            return False

        # 1. Delete local copy if present
        cls._delete_local_file(clean_path)

        provider = cls._get_provider()
        if provider == "r2":
            (
                endpoint_url,
                access_key_id,
                secret_access_key,
                bucket,
                _,
                enable_local_fallback,
            ) = cls._get_r2_config()
            if endpoint_url and access_key_id and secret_access_key and bucket:
                try:
                    cls._get_r2_client().delete_object(Bucket=bucket, Key=clean_path)
                    logger.info("R2 file deleted: %s", clean_path)
                    return True
                except Exception as r2_err:
                    logger.warning("R2 delete failed for path %s: %s", clean_path, r2_err)
                    return False
            return enable_local_fallback

        # 2. Delete remote Supabase copy if configured
        supabase_url, service_key, bucket, _ = cls._get_config()
        if supabase_url and service_key and "placeholder" not in service_key.lower():
            url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
            headers = {
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
            }
            try:
                response = requests.delete(url, headers=headers, timeout=6)
                if response.status_code in (200, 204):
                    logger.info(f"Supabase file deleted: {clean_path}")
                    return True
                logger.warning(f"Supabase delete returned HTTP {response.status_code}")
                return True
            except Exception as e:
                logger.warning(f"Exception during Supabase delete: {e}")
                return True

        return True
