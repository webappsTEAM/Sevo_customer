import io
import uuid
import logging
from PIL import Image

from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from typing import cast, Any
from utils.supabase_storage import SupabaseStorageService
from utils.image_optimizer import ImageOptimizer, ImageOptimizationError
from accounts.permissions import IsAdminRole, RequireModuleAccess
from .models import HomePageConfig, HomePageMedia

logger = logging.getLogger(__name__)

ALLOWED_SECTIONS = {
    "hero", "categories", "offers", "why-choose-us",
    "how-it-works", "featured-pros", "testimonials", "general",
    # Added 2026-09-17 per explicit request ("add a side section 'Mobile'
    # ... give the access to upload the banners, advertisement, top cards
    # [Groceries, Services] images"): these three back the new "Mobile App"
    # admin nav section (HomePageCustomizerPage.jsx tabs mobileBanners /
    # mobileAds / mobileTopCards) so mobile-only image uploads get their own
    # Supabase Storage folder (homepage/mobile-*) instead of being mixed
    # into the web's "offers"/"categories" folders.
    "mobile-banners", "mobile-ads", "mobile-top-cards",
}

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# Added 2026-09-21 per explicit request ("the banners and advertisement
# could allow admin to upload video and images... and that should be
# reflected in mobile application"): banners/ads previously only ever
# accepted a still image (this view ran every upload through
# ImageOptimizer, which opens the file with PIL — a video file would
# simply fail there). Video files skip optimization entirely (there's no
# safe way to "compress a video with PIL") and upload as-is, capped well
# below the image limit's assumption of "a photo" since a banner is meant
# to be a short, small looping clip, not a full video, and every extra MB
# here is a customer on mobile data waiting for the Home screen to load.
ALLOWED_VIDEO_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
VIDEO_EXTENSION_BY_MIME = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}
MAX_VIDEO_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def _extract_image_paths(config_data):
    """
    Recursively scans config data to collect all Supabase Storage paths (homepage/...)
    stored as relative paths or full canonical Supabase URLs.
    """
    supabase_url, _, bucket, _ = SupabaseStorageService._get_config()
    prefix = f"{supabase_url}/storage/v1/object/public/{bucket}/" if supabase_url else ""
    paths = set()

    def _extract_val(v):
        if not isinstance(v, str):
            return
        trimmed = v.strip()
        if prefix and trimmed.startswith(prefix):
            paths.add(trimmed[len(prefix):])
            return
        clean = trimmed.lstrip("/")
        if clean.startswith("media/"):
            clean = clean[len("media/"):]
        if clean.startswith("homepage/"):
            paths.add(clean)

    if isinstance(config_data, dict):
        for k, v in config_data.items():
            if k in ("image_path", "image", "avatar", "photo", "icon", "cover", "heroImage", "heroIllustration") and isinstance(v, str):
                _extract_val(v)
            elif isinstance(v, (dict, list)):
                paths.update(_extract_image_paths(v))
    elif isinstance(config_data, list):
        for item in config_data:
            if isinstance(item, str):
                _extract_val(item)
            elif isinstance(item, (dict, list)):
                paths.update(_extract_image_paths(item))
    return paths


def _resolve_image_urls(config_data):
    """
    Recursively attaches resolved image_url properties to all sections containing image_path or image fields.
    """
    if isinstance(config_data, dict):
        resolved = {}
        for k, v in config_data.items():
            if k.endswith("_url") and k[:-4] in config_data:
                continue
            resolved[k] = _resolve_image_urls(v)
            if k in ("image_path", "image", "avatar", "photo", "cover", "heroImage", "heroIllustration") and isinstance(v, str) and v:
                resolved[f"{k}_url"] = SupabaseStorageService.get_public_url(v)
            if k == "collageImages" and isinstance(v, list):
                resolved[f"{k}_url"] = [SupabaseStorageService.get_public_url(item) for item in v if isinstance(item, str)]
        return resolved
    elif isinstance(config_data, list):
        return [_resolve_image_urls(item) for item in config_data]
    return config_data


class HomePageConfigAPIView(APIView):
    """
    GET: Serves published homepage configuration from PostgreSQL with resolved CDN image URLs. Public access.
    PUT: Allows authenticated admins to update published homepage config.

    Bug found (gap): get_permissions() previously returned AllowAny()
    unconditionally for every method, including PUT — so PUT (which
    overwrites the entire live homepage config straight into the DB) had
    NO authorization check at all, despite the docstring's claim. Fixed to
    only allow GET publicly; PUT now requires the same `cms:edit_sections`
    Global RBAC action already defined for this module (matches `manager`
    and `catalog` roles' existing rights, Super Admin always passes).
    """

    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAdminRole(), RequireModuleAccess("cms", "edit_sections")]
        return [permissions.AllowAny()]

    def get(self, request):
        try:
            cfg = HomePageConfig.objects.filter(key="default").first()
            if not cfg or not cfg.config_data:
                # Return default initial seed structure without mutating DB on GET
                default_config = {
                    "hero": {
                        "badge": "Reliable. Affordable. Right at Your Doorstep.",
                        "mainHeadingFirst": "Professional",
                        "mainHeadingHighlight": "Services",
                        "mainHeadingLast": "Made Simple",
                        "subtitle": "Quick booking. Quality work. Guaranteed satisfaction.",
                        "searchPlaceholder": "What service do you need?",
                        "searchLocation": "Hosur",
                        "quickBadges": [
                            {"id": "b-1", "text": "Verified Pros"},
                            {"id": "b-2", "text": "4.8★ Rated"},
                            {"id": "b-3", "text": "1M+ Happy Homes"},
                            {"id": "b-4", "text": "30 Day Guarantee"}
                        ],
                        "collageImages": [
                            "/mockups/service_hvac.png",
                            "/mockups/service_electrical.png",
                            "/mockups/service_cleaning.png",
                            "/mockups/service_plumbing.png"
                        ]
                    },
                    "categories": [
                        {"id": "cat-1", "title": "For You", "subtitle": "Curated services & recommendations", "badge": "For You", "image": "/mockups/category_for_you.png", "link": "/booking?category=for_you", "enabled": True, "display_order": 1},
                        {"id": "cat-2", "title": "Food and Health", "subtitle": "Farm-fresh vegetables & wellness essentials", "badge": "Vegetables", "image": "/mockups/category_food_health.png", "link": "/vegetables", "enabled": True, "display_order": 2},
                        {"id": "cat-3", "title": "Home & Repair Services", "subtitle": "Cleaning, repairs, painting & masonry", "badge": "5 Services", "image": "/mockups/category_home_transport.png", "link": "/booking?category=home_repairs", "enabled": True, "display_order": 3},
                        {"id": "cat-4", "title": "Goods & Transport", "subtitle": "Mini trucks, 2-wheelers & logistics", "badge": "Transport", "image": "/mockups/service_transport.jpg", "link": "/logistics", "enabled": True, "display_order": 4}
                    ],
                    "vendorBanner": {
                        "enabled": True,
                        "badgeText": "We're Looking for Professionals",
                        "badgeIcon": "🤝",
                        "titlePrefix": "We Hire",
                        "titleHighlight": "Technicians, Employees",
                        "titleSuffix": "& Vendors",
                        "subtitle": "Join our team of skilled professionals and be part of a growing service community that works with trust and quality.",
                        "ctaText": "Join as a Professional",
                        "ctaUrl": "https://vendor.sevo.co.in",
                        "learnMoreText": "Learn more",
                        "learnMoreUrl": "https://vendor.sevo.co.in",
                        "image": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=320&h=420&q=90&fit=crop&crop=top",
                        "features": [
                            {"id": "vf-1", "icon": "📅", "label": "Flexible Timings"},
                            {"id": "vf-2", "icon": "💼", "label": "Stable Work"},
                            {"id": "vf-3", "icon": "🤝", "label": "Team Support"}
                        ],
                        "benefits": [
                            {"id": "vb-1", "icon": "✅", "text": "Verified & trusted customers"},
                            {"id": "vb-2", "icon": "🕐", "text": "On-time service & support"},
                            {"id": "vb-3", "icon": "📍", "text": "Work close to your area"},
                            {"id": "vb-4", "icon": "🌟", "text": "Recognition for quality work"}
                        ]
                    },
                    "offers": {
                        "mainCard": {"title": "Limited Time Offers!", "subtitle": "Great deals on services you love.", "buttonText": "Explore Offers"},
                        "items": [
                            {"id": "off-1", "tag": "UPTO", "discount": "20% OFF", "title": "on Home Cleaning", "cta": "Book Now →", "enabled": True},
                            {"id": "off-2", "tag": "FLAT", "discount": "15% OFF", "title": "on Painting", "cta": "Book Now →", "enabled": True},
                            {"id": "off-3", "tag": "UPTO", "discount": "₹500 OFF", "title": "on AC Service", "cta": "Book Now →", "enabled": True}
                        ]
                    },
                    "trustBadges": [
                        {"id": "t-1", "title": "Verified & Background Checked", "description": "Skilled professionals you can trust.", "enabled": True},
                        {"id": "t-2", "title": "Transparent & Fair Pricing", "description": "No hidden charges, what you see is what you pay.", "enabled": True},
                        {"id": "t-3", "title": "On-time Service", "description": "We value your time as much as you do.", "enabled": True},
                        {"id": "t-4", "title": "Service Warranty", "description": "We stand by the quality of our work.", "enabled": True},
                        {"id": "t-5", "title": "24/7 Customer Support", "description": "We're here whenever you need us.", "enabled": True}
                    ],
                    "howItWorks": {
                        "heading": "How It Works",
                        "steps": [
                            {"num": 1, "title": "Choose Service", "description": "Select the service you need"},
                            {"num": 2, "title": "Pick Date & Time", "description": "Choose a convenient slot"},
                            {"num": 3, "title": "We Assign Expert", "description": "We'll assign the best professional"},
                            {"num": 4, "title": "Service at Your Door", "description": "Expert arrives & gets the job done"},
                            {"num": 5, "title": "Pay & Rate", "description": "Make payment & share your feedback"}
                        ]
                    },
                    "statsBar": [
                        {"id": "st-1", "number": "45K+", "label": "Happy Customers"},
                        {"id": "st-2", "number": "1200+", "label": "Verified Experts"},
                        {"id": "st-3", "number": "85K+", "label": "Services Completed"},
                        {"id": "st-4", "number": "30 min", "label": "Average Response"},
                        {"id": "st-5", "number": "4.8/5", "label": "Average Rating"}
                    ],
                    "featuredPros": {
                        "title": "Featured Professionals",
                        "subtitle": "Top-rated experts ready to help",
                        "pros": [
                            {"id": "p-1", "name": "Sarah J.", "title": "Licensed Electrician", "rating": 4.9, "jobs": "620+", "image": ""},
                            {"id": "p-2", "name": "Elite Plumbing", "title": "Plumbing Specialist", "rating": 4.8, "jobs": "540+", "image": ""},
                            {"id": "p-3", "name": "Advanced Climate", "title": "AC & Appliance Tech", "rating": 4.9, "jobs": "410+", "image": ""},
                            {"id": "p-4", "name": "Eco Shine", "title": "Home Cleaning Pro", "rating": 4.7, "jobs": "780+", "image": ""}
                        ]
                    },
                    "testimonials": {
                        "title": "What Our Customers Say",
                        "viewAllText": "View all reviews →",
                        "reviews": [
                            {"id": "rev-1", "initials": "KR", "name": "Kavya R.", "rating": 5, "text": "Booked cleaning service and the professional was punctual and did a fantastic job!"},
                            {"id": "rev-2", "initials": "AS", "name": "Arvind S.", "rating": 5, "text": "Very professional electrician. Fixed the issue quickly and the pricing was fair."},
                            {"id": "rev-3", "initials": "PM", "name": "Priya M.", "rating": 5, "text": "Great experience with the painting service. Highly recommend Sevo!"}
                        ]
                    },
                    "footer": {
                        "brandName": "Sevo",
                        "tagline": "Your trusted partner for all home services. Quality you can count on.",
                        "phone": "+91 98765 43210",
                        "email": "support@calservices.com",
                        "workingHours": "Mon – Sun (8 AM – 8 PM)"
                    },
                    # Added 2026-09-17: mobile-app-only assets, edited from the
                    # admin's new "Mobile App" nav section. Kept separate from
                    # "hero"/"offers"/"categories" (the web homepage's own
                    # banners/categories) so an admin can upload different
                    # creative for the app without touching the website, and
                    # so the app never accidentally shows a web-only asset (or
                    # vice versa). Consumed by the customer app's
                    # homepage_repository.dart / home_screen.dart.
                    "mobile": {
                        # Home-screen banner carousel — same shape as
                        # "offers.items" (single admin-uploaded image + an
                        # optional click-through link, no code-drawn text).
                        "banners": [],
                        # In-app advertisement slot(s) — same shape as banners;
                        # rendered as an extra promo card on the Home screen
                        # when at least one enabled item has an image.
                        "ads": [],
                        # The quick-access card row at the top of the Home
                        # screen. Fixed 2026-09-18 per explicit request
                        # ("Top cards 'Groceries' and 'Services' could be
                        # editable like add new, delete and make text also
                        # editable from admin panel"): this used to be a
                        # fixed {groceries, services} object with only an
                        # image+link each (no editable label) — now a plain
                        # list so the admin can add, delete and relabel any
                        # number of cards. The mobile app falls back to the
                        # matching catalog Category's own image whenever a
                        # card's "image" is empty. The customer app's
                        # homepage_repository.dart still accepts the older
                        # object shape too, for any config saved before this
                        # change, and upgrades it to this list shape the
                        # next time the admin publishes.
                        "topCards": [
                            {"id": "groceries", "label": "Groceries", "image": "", "link": "", "enabled": True},
                            {"id": "services", "label": "Services", "image": "", "link": "", "enabled": True}
                        ]
                    }
                }
                return Response({
                    "success": True,
                    "is_default": True,
                    "config": _resolve_image_urls(default_config)
                })

            resolved_config = _resolve_image_urls(cfg.config_data)

            return Response({
                "success": True,
                "is_default": False,
                "updated_at": cfg.updated_at,
                "config": resolved_config
            })
        except Exception as e:
            logger.error(f"Error fetching HomePageConfig: {e}")
            return Response(
                {"error": "Failed to fetch homepage configuration"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        user = request.user if request.user.is_authenticated else None

        new_config_data = request.data.get("config")
        if not isinstance(new_config_data, dict):
            return Response({"error": "Invalid payload format. Expected 'config' dictionary."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_referenced_paths = _extract_image_paths(new_config_data)

            old_unreferenced_ids = []

            with cast(Any, transaction.atomic()):
                cfg, created = HomePageConfig.objects.get_or_create(key="default")
                cfg.config_data = new_config_data
                cfg.updated_by = user
                cfg.save()

                # Activate all referenced media items
                if new_referenced_paths:
                    HomePageMedia.objects.filter(image_path__in=new_referenced_paths).update(
                        is_active=True,
                        cleanup_status="ACTIVE"
                    )

                # Identify media items that were previously active but are no longer referenced
                no_longer_active = HomePageMedia.objects.filter(is_active=True).exclude(image_path__in=new_referenced_paths)
                for item in no_longer_active:
                    item.is_active = False
                    item.cleanup_status = "PENDING_DELETE"
                    item.save()
                    old_unreferenced_ids.append(item.id)

            # On successful PostgreSQL commit, attempt storage deletions
            def _cleanup_old_files():
                for media_id in old_unreferenced_ids:
                    try:
                        media = HomePageMedia.objects.get(id=media_id)
                        if SupabaseStorageService.delete_file(media.image_path):
                            media.cleanup_status = "DELETED"
                            media.deleted_at = timezone.now()
                            media.save()
                        else:
                            media.cleanup_status = "DELETE_FAILED"
                            media.save()
                    except Exception as err:
                        logger.error(f"Failed to cleanup old media {media_id}: {err}")

            transaction.on_commit(_cleanup_old_files)

            resolved_config = _resolve_image_urls(new_config_data)

            return Response({
                "success": True,
                "message": "Homepage configuration published successfully",
                "config": resolved_config
            })

        except Exception as e:
            logger.error(f"Failed to update HomePageConfig: {e}")
            return Response({"error": f"Failed to save homepage config: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomePageImageUploadAPIView(APIView):
    """
    POST: Uploads image file to Supabase Storage, validates via ImageOptimizer, converts to WebP,
          and saves HomePageMedia record in PostgreSQL.

    Bug found (gap): this endpoint was `AllowAny` — any unauthenticated
    caller could upload files straight into the platform's Supabase
    Storage bucket. Fixed to require the same `cms:edit_sections` action
    used for homepage config saves.
    """
    permission_classes = [IsAdminRole, RequireModuleAccess("cms", "edit_sections")]

    # Added 2026-09-21 alongside the video-upload feature: video is only
    # accepted for the two sections that actually render admin media as a
    # single full-bleed asset (the banner carousel and the advertisement
    # card) — never hero/categories/etc, which compose an uploaded image
    # into a larger designed layout no video player belongs in.
    VIDEO_ALLOWED_SECTIONS = {"mobile-banners", "mobile-ads"}

    def post(self, request):
        user = request.user if request.user and request.user.is_authenticated else None

        file_obj = request.FILES.get("file") or request.FILES.get("image")
        section = request.data.get("section", "general").strip().lower()

        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if section not in ALLOWED_SECTIONS:
            return Response({"error": f"Invalid section '{section}'. Allowed: {list(ALLOWED_SECTIONS)}"}, status=status.HTTP_400_BAD_REQUEST)

        content_type = (getattr(file_obj, "content_type", "") or "").lower()
        is_video = content_type in ALLOWED_VIDEO_MIME_TYPES

        if is_video:
            return self._upload_video(request, file_obj, section, content_type, user)

        # 1. Optimize and WebP compress <= 500KB with under-100KB preservation
        try:
            profile = "homepage" if section in ("hero", "categories", "general") else "catalog"
            optimized = ImageOptimizer.optimize(file_obj, profile_name=profile)
        except ImageOptimizationError as opt_err:
            resp_data = {
                "success": False,
                "error": opt_err.message,
                "message": opt_err.message,
            }
            if getattr(opt_err, "error_code", None):
                resp_data["error_code"] = opt_err.error_code
            return Response(resp_data, status=opt_err.status_code)
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return Response({"success": False, "error": "Invalid or corrupted image file", "message": "Invalid or corrupted image file"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Generate collision-safe storage path
        storage_path = SupabaseStorageService.generate_storage_path(
            folder=f"homepage/{section}",
            extension="webp",
        )

        # 3. Upload file to Supabase Storage
        upload_success, public_url, error_msg = SupabaseStorageService.upload_file(
            file_bytes=optimized["webp_bytes"],
            path=storage_path,
            content_type="image/webp",
        )
        if not upload_success:
            return Response({"success": False, "error": error_msg or "Failed to upload image to Supabase Storage", "message": error_msg or "Failed to upload image to Supabase Storage"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. If replacing an existing image
        old_image_path = (request.data.get("old_image_path") or request.data.get("old_path") or "").strip()
        old_deleted = False
        if old_image_path:
            try:
                old_deleted = SupabaseStorageService.delete_file(old_image_path)
            except Exception as del_err:
                logger.warning(f"Failed to delete old homepage media '{old_image_path}': {del_err}")

        # 5. Database Record Creation with transaction rollback safety
        try:
            with cast(Any, transaction.atomic()):
                media = HomePageMedia.objects.create(
                    section=section,
                    original_name=file_obj.name,
                    image_path=storage_path,
                    mime_type="image/webp",
                    file_size=optimized["optimized_size"],
                    dimensions=optimized["dimensions"],
                    uploaded_by=user,
                    is_active=False,
                    cleanup_status="UNREFERENCED"
                )

            return Response({
                "success": True,
                "url": public_url,
                "path": storage_path,
                "media_id": str(media.id),
                "image_path": storage_path,
                "image_url": public_url,
                "media_type": "image",
                "original_name": file_obj.name,
                "dimensions": optimized["dimensions"],
                "original_dimensions": optimized.get("original_dimensions"),
                "output_dimensions": optimized.get("output_dimensions"),
                "file_size": optimized["optimized_size"],
                "original_size": optimized["original_size"],
                "compression_ratio": optimized["compression_ratio"],
                "quality_used": optimized.get("quality_used"),
                "has_alpha": optimized.get("has_alpha", False),
                "old_deleted": old_deleted,
            }, status=status.HTTP_201_CREATED)

        except Exception as db_err:
            logger.error(f"Database creation failed after Storage upload: {db_err}. Cleaning up Storage file.")
            SupabaseStorageService.delete_file(storage_path)
            return Response({"success": False, "error": "Database record creation failed. Storage upload rolled back."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _upload_video(self, request, file_obj, section, content_type, user):
        """
        Added 2026-09-21 per explicit request ("the banners and
        advertisement could allow admin to upload video and images").
        Mirrors the image path above (validate -> upload to Supabase ->
        HomePageMedia record -> old-file cleanup -> JSON response) but
        uploads the raw video bytes as-is — there's no equivalent to
        ImageOptimizer's WebP re-encode for video here, so this is the one
        step video skips relative to the image flow, not a shortcut taken
        on the validation/cleanup/response contract.
        """
        if section not in self.VIDEO_ALLOWED_SECTIONS:
            return Response({
                "success": False,
                "error": f"Video uploads are only supported for: {sorted(self.VIDEO_ALLOWED_SECTIONS)}.",
                "message": f"Video uploads are only supported for: {sorted(self.VIDEO_ALLOWED_SECTIONS)}.",
            }, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > MAX_VIDEO_FILE_SIZE:
            size_mb = file_obj.size / (1024 * 1024)
            limit_mb = MAX_VIDEO_FILE_SIZE // (1024 * 1024)
            msg = f"Video is too large ({size_mb:.1f} MB). Maximum is {limit_mb} MB — keep banner/ad clips short."
            return Response({"success": False, "error": msg, "message": msg}, status=status.HTTP_400_BAD_REQUEST)

        extension = VIDEO_EXTENSION_BY_MIME.get(content_type, "mp4")

        try:
            file_bytes = file_obj.read()
        except Exception as e:
            logger.error(f"Failed to read uploaded video file: {e}")
            return Response({"success": False, "error": "Could not read uploaded video file", "message": "Could not read uploaded video file"}, status=status.HTTP_400_BAD_REQUEST)

        storage_path = SupabaseStorageService.generate_storage_path(
            folder=f"homepage/{section}",
            extension=extension,
        )

        upload_success, public_url, error_msg = SupabaseStorageService.upload_file(
            file_bytes=file_bytes,
            path=storage_path,
            content_type=content_type,
        )
        if not upload_success:
            return Response({"success": False, "error": error_msg or "Failed to upload video to Supabase Storage", "message": error_msg or "Failed to upload video to Supabase Storage"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        old_image_path = (request.data.get("old_image_path") or request.data.get("old_path") or "").strip()
        old_deleted = False
        if old_image_path:
            try:
                old_deleted = SupabaseStorageService.delete_file(old_image_path)
            except Exception as del_err:
                logger.warning(f"Failed to delete old homepage media '{old_image_path}': {del_err}")

        try:
            with cast(Any, transaction.atomic()):
                media = HomePageMedia.objects.create(
                    section=section,
                    original_name=file_obj.name,
                    image_path=storage_path,
                    mime_type=content_type,
                    file_size=file_obj.size,
                    dimensions="",
                    uploaded_by=user,
                    is_active=False,
                    cleanup_status="UNREFERENCED",
                )

            return Response({
                "success": True,
                "url": public_url,
                "path": storage_path,
                "media_id": str(media.id),
                "image_path": storage_path,
                "image_url": public_url,
                "media_type": "video",
                "original_name": file_obj.name,
                "file_size": file_obj.size,
                "original_size": file_obj.size,
                "old_deleted": old_deleted,
            }, status=status.HTTP_201_CREATED)

        except Exception as db_err:
            logger.error(f"Database creation failed after video Storage upload: {db_err}. Cleaning up Storage file.")
            SupabaseStorageService.delete_file(storage_path)
            return Response({"success": False, "error": "Database record creation failed. Storage upload rolled back."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomePageImageDeleteAPIView(APIView):
    """
    DELETE /api/settings/homepage/images/<media_id>/
    Deletes specified media record by ID and removes underlying file from Supabase Storage.

    Bug found (gap): this endpoint was `AllowAny` — any unauthenticated
    caller could delete homepage media. Fixed to require the same
    `cms:edit_sections` action used for the other homepage-editing endpoints.
    """
    permission_classes = [IsAdminRole, RequireModuleAccess("cms", "edit_sections")]

    def delete(self, request, media_id):

        try:
            media = HomePageMedia.objects.get(id=media_id)
        except HomePageMedia.DoesNotExist:
            return Response({"error": "Media record not found"}, status=status.HTTP_404_NOT_FOUND)

        if not media.image_path.startswith("homepage/"):
            return Response({"error": "Invalid image path"}, status=status.HTTP_400_BAD_REQUEST)

        # Perform deletion
        storage_deleted = SupabaseStorageService.delete_file(media.image_path)
        
        media.deleted_at = timezone.now()
        media.cleanup_status = "DELETED" if storage_deleted else "DELETE_FAILED"
        media.is_active = False
        media.save()

        return Response({
            "success": True,
            "message": "Media deleted successfully",
            "storage_deleted": storage_deleted
        })
