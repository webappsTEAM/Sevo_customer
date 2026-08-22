import io
import uuid
import logging
from PIL import Image

from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from utils.supabase_storage import SupabaseStorageService
from .models import HomePageConfig, HomePageMedia

logger = logging.getLogger(__name__)

ALLOWED_SECTIONS = {
    "hero", "categories", "offers", "why-choose-us",
    "how-it-works", "featured-pros", "testimonials", "general"
}

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _extract_image_paths(config_data):
    """
    Recursively scans config_data to collect all string values that match an image_path format.
    """
    paths = set()
    if isinstance(config_data, dict):
        for k, v in config_data.items():
            if k in ("image_path", "image", "avatar", "photo", "icon") and isinstance(v, str) and v.startswith("homepage/"):
                paths.add(v)
            elif isinstance(v, (dict, list)):
                paths.update(_extract_image_paths(v))
    elif isinstance(config_data, list):
        for item in config_data:
            if isinstance(item, str) and item.startswith("homepage/"):
                paths.add(item)
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
            resolved[k] = _resolve_image_urls(v)
            if k in ("image_path", "image", "avatar", "photo", "cover") and isinstance(v, str) and v:
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
    """

    def get_permissions(self):
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
                        {"id": "cat-2", "title": "Food and Health", "subtitle": "Groceries & farm-fresh vegetables", "badge": "Groceries & Veggies", "image": "/mockups/category_food_health.png", "link": "/booking?category=groceries", "enabled": True, "display_order": 2},
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
                        "ctaUrl": "https://calservices-vendor.vercel.app",
                        "learnMoreText": "Learn more",
                        "learnMoreUrl": "https://calservices-vendor.vercel.app",
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

            with transaction.atomic():
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
    POST: Uploads image file to Supabase Storage, validates via Pillow, converts to WebP,
          and saves HomePageMedia record in PostgreSQL.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = request.user if request.user and request.user.is_authenticated else None

        file_obj = request.FILES.get("file")
        section = request.data.get("section", "general").strip().lower()

        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if section not in ALLOWED_SECTIONS:
            return Response({"error": f"Invalid section '{section}'. Allowed: {list(ALLOWED_SECTIONS)}"}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > MAX_FILE_SIZE:
            return Response({"error": "File size exceeds 5MB limit"}, status=status.HTTP_400_BAD_REQUEST)

        content_type = getattr(file_obj, "content_type", "").lower()
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            return Response({"error": f"Unsupported MIME type '{content_type}'. Allowed: JPEG, PNG, WebP"}, status=status.HTTP_400_BAD_REQUEST)

        # Pillow image validation & WebP conversion
        try:
            img = Image.open(file_obj)
            img.verify()
            file_obj.seek(0)
            img = Image.open(file_obj)

            dimensions = f"{img.width}x{img.height}"

            # Strip EXIF metadata and convert to RGB/RGBA
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img_converted = img.convert("RGBA")
            else:
                img_converted = img.convert("RGB")

            # Max dimension check / auto-resize for homepage performance (max width/height 2400px)
            if img_converted.width > 2400 or img_converted.height > 2400:
                img_converted.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
                dimensions = f"{img_converted.width}x{img_converted.height}"

            out_buffer = io.BytesIO()
            img_converted.save(out_buffer, format="WEBP", quality=96, method=6)
            webp_bytes = out_buffer.getvalue()

        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return Response({"error": "Invalid or corrupted image file"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique storage path
        file_uuid = uuid.uuid4().hex
        image_path = f"homepage/{section}/{file_uuid}.webp"

        # 1. Upload file to Supabase Storage
        upload_success = SupabaseStorageService.upload_file(webp_bytes, image_path, content_type="image/webp")
        if not upload_success:
            return Response({"error": "Failed to upload image to Supabase Storage"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Database Record Creation with transaction rollback safety
        try:
            with transaction.atomic():
                media = HomePageMedia.objects.create(
                    section=section,
                    original_name=file_obj.name,
                    image_path=image_path,
                    mime_type="image/webp",
                    file_size=len(webp_bytes),
                    dimensions=dimensions,
                    uploaded_by=user,
                    is_active=False,
                    cleanup_status="UNREFERENCED"
                )

            public_url = SupabaseStorageService.get_public_url(image_path)

            return Response({
                "success": True,
                "media_id": str(media.id),
                "image_path": image_path,
                "image_url": public_url,
                "original_name": file_obj.name,
                "dimensions": dimensions,
                "file_size": len(webp_bytes)
            }, status=status.HTTP_201_CREATED)

        except Exception as db_err:
            logger.error(f"Database creation failed after Storage upload: {db_err}. Cleaning up Storage file.")
            SupabaseStorageService.delete_file(image_path)
            return Response({"error": "Database record creation failed. Storage upload rolled back."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomePageImageDeleteAPIView(APIView):
    """
    DELETE /api/settings/homepage/images/<media_id>/
    Deletes specified media record by ID and removes underlying file from Supabase Storage.
    """
    permission_classes = [permissions.AllowAny]

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
