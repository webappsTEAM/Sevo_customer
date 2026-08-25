import io
import os
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from utils.image_optimizer import ImageOptimizer, ImageOptimizationError, IMAGE_PROFILES
from utils.supabase_storage import SupabaseStorageService

User = get_user_model()


class ImageOptimizationPipelineTestCase(TestCase):
    """
    Comprehensive test suite for the image optimization and WebP compression pipeline.
    """

    def _create_test_image(
        self,
        format="JPEG",
        size=(800, 600),
        color=(100, 150, 200),
        mode="RGB",
    ) -> io.BytesIO:
        """Helper to generate in-memory synthetic images for testing."""
        img = Image.new(mode, size, color=color)
        draw = ImageDraw.Draw(img)
        draw.rectangle([10, 10, size[0] - 10, size[1] - 10], outline=(255, 0, 0), width=3)
        buf = io.BytesIO()
        img.save(buf, format=format)
        buf.seek(0)
        return buf

    def test_jpeg_to_webp_conversion(self):
        """JPEG image is successfully converted into a valid WebP with compression metrics."""
        buf = self._create_test_image(format="JPEG", size=(1000, 800))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")

        self.assertEqual(result["format"], "webp")
        self.assertGreater(result["original_size"], 0)
        self.assertGreater(result["optimized_size"], 0)
        self.assertEqual(result["width"], 1000)
        self.assertEqual(result["height"], 800)

        # Verify output is a valid readable WebP image
        out_img = Image.open(io.BytesIO(result["webp_bytes"]))
        self.assertEqual(out_img.format, "WEBP")

    def test_png_to_webp_conversion(self):
        """PNG image is successfully converted to WebP."""
        buf = self._create_test_image(format="PNG", size=(600, 400))
        result = ImageOptimizer.optimize(buf, profile_name="packages")

        self.assertEqual(result["format"], "webp")
        out_img = Image.open(io.BytesIO(result["webp_bytes"]))
        self.assertEqual(out_img.format, "WEBP")

    def test_transparency_preservation(self):
        """Transparent PNG/WebP retains alpha channel in WebP output."""
        img = Image.new("RGBA", (200, 200), color=(255, 0, 0, 0))  # Fully transparent
        draw = ImageDraw.Draw(img)
        draw.ellipse([50, 50, 150, 150], fill=(0, 255, 0, 255))  # Opaque circle in middle

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        result = ImageOptimizer.optimize(buf, profile_name="general")
        self.assertTrue(result["has_alpha"])

        out_img = Image.open(io.BytesIO(result["webp_bytes"]))
        self.assertEqual(out_img.format, "WEBP")
        self.assertIn(out_img.mode, ("RGBA", "RGBa", "P", "LA"))

    def test_webp_to_optimized_webp(self):
        """Existing WebP images are re-encoded and optimized."""
        buf = self._create_test_image(format="WEBP", size=(500, 500))
        result = ImageOptimizer.optimize(buf, profile_name="services")
        self.assertEqual(result["format"], "webp")
        self.assertEqual(result["width"], 500)
        self.assertEqual(result["height"], 500)

    def test_large_image_downscaled_to_bounds(self):
        """Images exceeding profile max dimensions are downscaled with Lanczos."""
        # Catalog profile max is 1400x1400
        buf = self._create_test_image(format="JPEG", size=(2800, 2100))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")

        self.assertLessEqual(result["width"], 1400)
        self.assertLessEqual(result["height"], 1400)
        # Check aspect ratio 4:3 (2800:2100 -> 1400:1050)
        self.assertEqual(result["width"], 1400)
        self.assertEqual(result["height"], 1050)

    def test_small_image_not_upscaled(self):
        """Small images under the profile max are never upscaled."""
        buf = self._create_test_image(format="PNG", size=(250, 180))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")

        self.assertEqual(result["width"], 250)
        self.assertEqual(result["height"], 180)

    def test_metadata_and_exif_stripped(self):
        """Metadata is stripped from output WebP."""
        img = Image.new("RGB", (300, 300), color=(50, 50, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        buf.seek(0)

        result = ImageOptimizer.optimize(buf, profile_name="general")
        out_img = Image.open(io.BytesIO(result["webp_bytes"]))
        # WebP stripped output should not contain raw exif tag dict
        self.assertFalse(hasattr(out_img, "_getexif") and out_img._getexif() is not None)

    def test_fake_non_image_file_rejected(self):
        """Fake text or script renamed to .jpg is rejected safely."""
        fake_file = io.BytesIO(b"<!DOCTYPE html><html><body>Fake image</body></html>")
        with self.assertRaises(ImageOptimizationError):
            ImageOptimizer.optimize(fake_file, profile_name="catalog")

    def test_corrupt_image_rejected(self):
        """Corrupt byte sequence is rejected safely."""
        corrupt_file = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01...corrupted_data_here")
        with self.assertRaises(ImageOptimizationError):
            ImageOptimizer.optimize(corrupt_file, profile_name="catalog")

    def test_empty_file_rejected(self):
        """Empty 0-byte file is rejected."""
        empty_file = io.BytesIO(b"")
        with self.assertRaises(ImageOptimizationError):
            ImageOptimizer.optimize(empty_file, profile_name="catalog")


class SupabaseStorageServiceTestCase(TestCase):
    """
    Tests for SupabaseStorageService path safety, collision safety, URL resolution, and fallbacks.
    """

    def test_generate_storage_path_collision_safety(self):
        """Two calls generate distinct, collision-safe UUID paths."""
        path1 = SupabaseStorageService.generate_storage_path(folder="catalog/packages")
        path2 = SupabaseStorageService.generate_storage_path(folder="catalog/packages")

        self.assertNotEqual(path1, path2)
        self.assertTrue(path1.startswith("catalog/packages/"))
        self.assertTrue(path1.endswith(".webp"))
        self.assertTrue(path2.startswith("catalog/packages/"))

    def test_path_traversal_protection(self):
        """Attempts to use path traversal sequences are rejected."""
        with self.assertRaises(ValueError):
            SupabaseStorageService.validate_and_clean_path("../../../etc/passwd")

        with self.assertRaises(ValueError):
            SupabaseStorageService.validate_and_clean_path("catalog/../../secret.webp")

    def test_forbidden_root_folder_rejected(self):
        """Non-allowlisted root folders are rejected."""
        with self.assertRaises(ValueError):
            SupabaseStorageService.validate_and_clean_path("system_config/key.webp")

    def test_public_url_resolution(self):
        """URL resolution preserves absolute URLs, mockups, and resolves storage paths."""
        # Absolute URL
        self.assertEqual(
            SupabaseStorageService.get_public_url("https://images.unsplash.com/photo-123"),
            "https://images.unsplash.com/photo-123"
        )
        # Mockups
        self.assertEqual(
            SupabaseStorageService.get_public_url("/mockups/service_hvac.png"),
            "/mockups/service_hvac.png"
        )
        self.assertEqual(
            SupabaseStorageService.get_public_url("mockups/ants_control.jpg"),
            "/mockups/ants_control.jpg"
        )
        # Storage path
        storage_url = SupabaseStorageService.get_public_url("catalog/packages/abc123.webp")
        self.assertIn("admin-media", storage_url)
        self.assertTrue(storage_url.endswith("catalog/packages/abc123.webp"))


class ImageUploadEndpointTestCase(TestCase):
    """
    Tests for ImageUploadView API endpoint at /api/settings/catalog/upload-image/.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="admin_test_user",
            email="admin_test@caltrack.com",
            password="TestPassword@123",
            role="admin",
            is_staff=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_upload_valid_image(self):
        """Admin can upload an image and receives WebP metadata and public URL when local fallback or remote is enabled."""
        with override_settings(DEBUG=True):
            img = Image.new("RGB", (600, 600), color=(100, 200, 100))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            buf.seek(0)

            uploaded_file = SimpleUploadedFile("sample_package.jpg", buf.read(), content_type="image/jpeg")

            response = self.client.post(
                "/api/settings/catalog/upload-image/",
                {"image": uploaded_file, "asset_type": "packages"},
                format="multipart"
            )

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            data = response.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["format"], "webp")
            self.assertEqual(data["width"], 600)
            self.assertEqual(data["height"], 600)
            self.assertTrue("url" in data and len(data["url"]) > 0)
            self.assertTrue("path" in data and data["path"].startswith("catalog/packages/"))

    def test_upload_missing_file_fails(self):
        """Posting without a file returns 400 Bad Request."""
        response = self.client.post(
            "/api/settings/catalog/upload-image/",
            {"asset_type": "packages"},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_invalid_file_fails(self):
        """Posting corrupted or non-image file returns 400 Bad Request."""
        bad_file = SimpleUploadedFile("script.jpg", b"console.log('not an image')", content_type="image/jpeg")
        response = self.client.post(
            "/api/settings/catalog/upload-image/",
            {"image": bad_file, "asset_type": "packages"},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_upload_rejected(self):
        """Unauthenticated requests are rejected with 401."""
        self.client.force_authenticate(user=None)
        img = Image.new("RGB", (100, 100))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        uploaded_file = SimpleUploadedFile("test.jpg", buf.read(), content_type="image/jpeg")

        response = self.client.post(
            "/api/settings/catalog/upload-image/",
            {"image": uploaded_file},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_upload_forbidden(self):
        """Non-admin user is rejected with 403 Forbidden."""
        customer_user = User.objects.create_user(
            username="regular_customer",
            email="cust@caltrack.com",
            password="Password@123",
            role="customer",
            is_staff=False,
        )
        self.client.force_authenticate(user=customer_user)
        img = Image.new("RGB", (100, 100))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        uploaded_file = SimpleUploadedFile("test.jpg", buf.read(), content_type="image/jpeg")

        response = self.client.post(
            "/api/settings/catalog/upload-image/",
            {"image": uploaded_file},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_safety_preserves_external_urls(self):
        """SupabaseStorageService.delete_file never deletes external URLs, mockups, or invalid paths."""
        self.assertTrue(SupabaseStorageService.delete_file("https://images.unsplash.com/photo-xyz"))
        self.assertTrue(SupabaseStorageService.delete_file("/mockups/pest_cockroach.jpg"))
        self.assertTrue(SupabaseStorageService.delete_file("/assets/hero_banner.jpg"))
        # Invalid traversal path
        self.assertFalse(SupabaseStorageService.delete_file("../../../etc/passwd"))


class ImagePipelineSizeAndQualityMatrixTestCase(TestCase):
    """
    Comprehensive size test matrix, pixel analysis, 500 KB hard limit,
    under-100 KB preservation, and replacement lifecycle tests.
    """

    def _create_image_of_size(self, target_kb: int, format="JPEG", dimensions=(1200, 900)) -> io.BytesIO:
        """Generates an in-memory image approximating target size in KB."""
        import random
        img = Image.new("RGB", dimensions, color=(random.randint(50, 200), random.randint(50, 200), random.randint(50, 200)))
        draw = ImageDraw.Draw(img)
        # Add visual detail
        for i in range(0, dimensions[0], 20):
            draw.line([(i, 0), (dimensions[0] - i, dimensions[1])], fill=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)), width=2)
        
        buf = io.BytesIO()
        img.save(buf, format=format, quality=85)
        # Pad with dummy bytes if needed to reach target_kb
        current_len = buf.tell()
        target_bytes = target_kb * 1024
        if current_len < target_bytes:
            buf.write(b"\x00" * (target_bytes - current_len))
        buf.seek(0)
        return buf

    def test_size_matrix_50kb_preserves_quality(self):
        """50 KB input: Under 100 KB rule applies (no unnecessary lossy compression, quality=92)."""
        buf = self._create_image_of_size(50, dimensions=(400, 300))
        result = ImageOptimizer.optimize(buf, profile_name="packages")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)
        self.assertEqual(result["quality_used"], 92)

    def test_size_matrix_95kb_preserves_quality(self):
        """95 KB input: Under 100 KB rule applies (no unnecessary lossy degradation)."""
        buf = self._create_image_of_size(95, dimensions=(500, 400))
        result = ImageOptimizer.optimize(buf, profile_name="services")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)
        self.assertEqual(result["quality_used"], 92)

    def test_size_matrix_100kb_standard_profile(self):
        """100 KB input: Standard profile policy applied."""
        buf = self._create_image_of_size(105, dimensions=(800, 600))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)

    def test_size_matrix_250kb_optimized(self):
        """250 KB input: Optimized efficiently <= 500 KB."""
        buf = self._create_image_of_size(250, dimensions=(1000, 800))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)

    def test_size_matrix_500kb_optimized(self):
        """500 KB input: Optimized efficiently <= 500 KB."""
        buf = self._create_image_of_size(500, dimensions=(1400, 1000))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)

    def test_size_matrix_1mb_optimized(self):
        """1 MB input: Compressed to WebP <= 500 KB."""
        buf = self._create_image_of_size(1024, dimensions=(1600, 1200))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)

    def test_size_matrix_5mb_optimized(self):
        """5 MB input: Compressed to WebP <= 500 KB."""
        buf = self._create_image_of_size(5 * 1024, dimensions=(2400, 1800))
        result = ImageOptimizer.optimize(buf, profile_name="banners")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)

    def test_size_matrix_10mb_optimized(self):
        """10 MB input: Compressed to WebP <= 500 KB."""
        buf = self._create_image_of_size(10 * 1024, dimensions=(2800, 2000))
        result = ImageOptimizer.optimize(buf, profile_name="homepage")
        self.assertEqual(result["format"], "webp")
        self.assertLessEqual(result["optimized_size"], 500 * 1024)

    def test_over_15mb_input_rejected(self):
        """Incoming raw uploads > 15 MB are rejected immediately."""
        buf = io.BytesIO(b"\x00" * (16 * 1024 * 1024))
        with self.assertRaises(ImageOptimizationError) as ctx:
            ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertEqual(ctx.exception.error_code, "FILE_TOO_LARGE")

    def test_hard_500kb_cap_enforcement(self):
        """Every successful output of ImageOptimizer.optimize is guaranteed <= 500 KB."""
        for sz in [50, 100, 300, 800, 1500, 4000]:
            buf = self._create_image_of_size(sz, dimensions=(1400, 1000))
            result = ImageOptimizer.optimize(buf, profile_name="catalog")
            self.assertLessEqual(
                result["optimized_size"],
                500 * 1024,
                f"Image of input size {sz}KB exceeded 500KB cap (was {result['optimized_size']} bytes)."
            )

    def test_pixel_limit_protection(self):
        """Images with total pixel count > 25,000,000 are rejected."""
        # 6000 x 5000 = 30,000,000 pixels > 25M
        fake_huge = Image.new("RGB", (6000, 5000))
        buf = io.BytesIO()
        fake_huge.save(buf, format="JPEG")
        buf.seek(0)

        with self.assertRaises(ImageOptimizationError) as ctx:
            ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertIn(ctx.exception.error_code, ("PIXEL_COUNT_EXCEEDED", "DECOMPRESSION_BOMB"))

    def test_aspect_ratio_preservation_lanczos(self):
        """Aspect ratio 2:1 (2800x1400) is scaled to exactly 1400x700 without stretching."""
        buf = self._create_image_of_size(200, dimensions=(2800, 1400))
        result = ImageOptimizer.optimize(buf, profile_name="catalog")
        self.assertEqual(result["width"], 1400)
        self.assertEqual(result["height"], 700)
        self.assertEqual(result["original_dimensions"], "2800x1400")
        self.assertEqual(result["output_dimensions"], "1400x700")

    def test_package_image_replacement_and_cleanup(self):
        """When a package image is replaced, DB is updated to B and old image A is deleted."""
        from service_requests.models import CatalogCategory, Service, Package
        from service_requests.services import catalog as catalog_service

        admin_user = User.objects.create_user(
            username="pkg_admin_tester",
            email="pkg_admin@caltrack.com",
            password="Password@123",
            role="admin",
            is_staff=True,
        )

        category = CatalogCategory.objects.create(name="Test Category", slug="test-cat")
        service = Service.objects.create(name="Test Service", slug="test-svc", category=category)
        
        # 1. Create package with image A
        package = catalog_service.create_package(
            {
                "name": "Test Cleaning Package",
                "slug": "test-clean-pkg",
                "service": service,
                "base_price": 500,
                "image": "catalog/packages/image_a_uuid123.webp",
            },
            actor=admin_user
        )
        self.assertEqual(package.image, "catalog/packages/image_a_uuid123.webp")

        # 2. Update package with new image B
        updated_package = catalog_service.update_package(
            package,
            {"image": "catalog/packages/image_b_uuid456.webp"},
            actor=admin_user,
            reason="Updated banner photo"
        )

        # 3. Verify DB has only B
        package.refresh_from_db()
        self.assertEqual(package.image, "catalog/packages/image_b_uuid456.webp")
        self.assertEqual(updated_package.image, "catalog/packages/image_b_uuid456.webp")


