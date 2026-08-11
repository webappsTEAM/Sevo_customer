"""
accounts/customer_services.py

Business logic for Customer Profile and Saved Addresses.
All model writes happen here — views are thin.
"""
import json
import urllib.parse
import urllib.request
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied

from .models import SavedAddress

User = get_user_model()

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "QuickTIMS/1.0 (field-service; caldimengg@gmail.com)"


def detect_customer_location(latitude: float, longitude: float, accuracy: float = None) -> dict | None:
    """
    Stateless reverse geocoding of GPS coordinates (lat, lng) to structured location:
      latitude, longitude, accuracy, area, city, state, country, pincode, formatted_address.
    No database persistence (stateless). Returns None if reverse geocoding fails.
    """
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (ValueError, TypeError):
        raise ValidationError({"detail": "Invalid latitude or longitude coordinates."})

    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        raise ValidationError({"detail": "Invalid latitude or longitude coordinates."})

    acc = None
    if accuracy is not None:
        try:
            acc = float(accuracy)
        except (ValueError, TypeError):
            pass

    try:
        encoded = urllib.parse.urlencode({
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": "1",
            "accept-language": "en"
        })
        req = urllib.request.Request(
            f"{NOMINATIM_URL}/reverse?{encoded}",
            headers={"User-Agent": USER_AGENT, "Accept-Language": "en"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())

        if not data:
            return None

        addr = data.get("address", {})
        raw_area_parts = [
            addr.get("building"),
            addr.get("house_number"),
            addr.get("road"),
            addr.get("suburb"),
            addr.get("neighbourhood"),
            addr.get("residential"),
            addr.get("city_district"),
        ]
        clean_parts = []
        for p in raw_area_parts:
            if p and p not in clean_parts:
                clean_parts.append(p)

        area = ", ".join(clean_parts[:2]) if clean_parts else (
            addr.get("suburb") or addr.get("neighbourhood") or addr.get("city_district") or ""
        )
        city = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("county")
            or ""
        )
        state = addr.get("state", "")
        country = addr.get("country", "")
        pincode = addr.get("postcode", "")
        formatted_address = data.get("display_name", "")

        # Hosur Geo-fencing & Pincode Resolution
        if (pincode and pincode.startswith("635")) or (12.55 <= lat <= 12.85 and 77.70 <= lng <= 77.98) or "hosur" in formatted_address.lower():
            city = "Hosur"
            state = "Tamil Nadu"
            if not pincode:
                pincode = "635109"

        return {
            "latitude": lat,
            "longitude": lng,
            "accuracy": acc,
            "area": area,
            "city": city,
            "state": state,
            "country": country,
            "pincode": pincode,
            "formatted_address": formatted_address,
        }
    except Exception as e:
        print(f"Reverse geocode error for coords ({lat}, {lng}): {e}")
        return None


# ── Profile ───────────────────────────────────────────────────────────────────

def get_customer_profile(user):
    """Return a plain dict of the customer's profile fields."""
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.get_full_name(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "avatar": user.avatar.url if user.avatar else None,
        "date_joined": user.date_joined,
    }


def update_customer_profile(user, validated_data):
    """
    Update allowed profile fields for a customer.
    Raises ValidationError on bad data.
    Returns updated profile dict.
    """
    allowed_fields = {"first_name", "last_name", "phone", "email", "last_known_location"}
    update_fields = []

    for field, value in validated_data.items():
        if field not in allowed_fields or field == "avatar":
            continue
        setattr(user, field, value)
        update_fields.append(field)

    if "avatar" in validated_data and validated_data["avatar"] is not None:
        avatar_val = validated_data["avatar"]
        if isinstance(avatar_val, str):
            if "/media/" in avatar_val:
                user.avatar.name = avatar_val.split("/media/")[-1]
            else:
                user.avatar.name = avatar_val
        else:
            user.avatar = avatar_val
        update_fields.append("avatar")

    if update_fields:
        user.save()

    return get_customer_profile(user)


from django.db import transaction
from django.utils import timezone
 

# ── Saved Addresses ───────────────────────────────────────────────────────────

def list_saved_addresses(user):
    """Return all saved addresses for this customer, default first, then last_used_at desc."""
    return user.saved_addresses.all().order_by("-is_default", "-last_used_at", "-created_at")


def create_saved_address(user, validated_data):
    """
    Create a new saved address.
    If is_default=True, unset all other defaults for this user first inside an atomic transaction.
    Enforces max 10 addresses per customer.
    """
    if user.saved_addresses.count() >= 10:
        raise ValidationError({"detail": "Maximum of 10 saved addresses allowed."})

    is_default = validated_data.get("is_default", False)

    with transaction.atomic():
        if is_default:
            user.saved_addresses.filter(is_default=True).update(is_default=False)
        elif not user.saved_addresses.exists():
            is_default = True

        address = SavedAddress.objects.create(
            user=user,
            is_default=is_default,
            **{k: v for k, v in validated_data.items() if k != "is_default"},
        )
    return address


def update_saved_address(user, address_id, validated_data):
    """Update fields on an existing address. Enforces single-default rule atomically."""
    address = _get_address_or_404(user, address_id)

    is_default = validated_data.pop("is_default", None)
    with transaction.atomic():
        if is_default is True:
            user.saved_addresses.filter(is_default=True).exclude(pk=address.pk).update(is_default=False)
            address.is_default = True
        elif is_default is False and address.is_default:
            raise ValidationError({"detail": "Cannot remove default status without setting another address as default."})

        for field, value in validated_data.items():
            setattr(address, field, value)

        address.save()
    return address




def delete_saved_address(user, address_id):
    """
    Delete a saved address.
    If deleting default address while other addresses exist, automatically reassign default to the next address.
    """
    address = _get_address_or_404(user, address_id)

    # 1. Check active booking reference
    NON_ACTIVE_STATUSES = {"closed", "rejected", "completed", "cancelled"}
    try:
        from service_requests.models import ServiceRequest
        active_count = ServiceRequest.objects.filter(
            customer=user,
        ).filter(
            address__icontains=address.address_line1
        ).exclude(status__in=NON_ACTIVE_STATUSES).count()

        if active_count > 0:
            raise ValidationError({
                "detail": f"Cannot delete address: it is currently referenced by {active_count} active booking(s)."
            })
    except ValidationError:
        raise
    except Exception:
        pass

    was_default = address.is_default
    address.delete()

    if was_default:
        next_addr = user.saved_addresses.first()
        if next_addr:
            next_addr.is_default = True
            next_addr.save(update_fields=["is_default", "updated_at"])


def set_default_address(user, address_id):
    """Make one address the default, unsetting all others atomically."""
    address = _get_address_or_404(user, address_id)
    with transaction.atomic():
        user.saved_addresses.filter(is_default=True).exclude(pk=address.pk).update(is_default=False)
        address.is_default = True
        address.save(update_fields=["is_default", "updated_at"])
    return address


def check_address_serviceability(address):
    """
    Checks real-time serviceability for an address.
    Returns dict: {"available": bool, "reason": str}
    """
    if not address or not address.pincode:
        return {"available": True, "reason": "Standard service area"}

    # Basic pincode/geo validation
    pincode_clean = str(address.pincode).strip()
    if len(pincode_clean) < 4:
        return {"available": False, "reason": "Invalid or incomplete postal code"}

    return {"available": True, "reason": "Service Available"}


def mark_address_used(user, address_id):
    """Update last_used_at timestamp when customer selects address for booking."""
    address = _get_address_or_404(user, address_id)
    address.last_used_at = timezone.now()
    address.save(update_fields=["last_used_at", "updated_at"])
    return address


# ── Private helpers ───────────────────────────────────────────────────────────

def _get_address_or_404(user, address_id):
    """Retrieve address scoped to this user or raise NotFound."""
    try:
        return user.saved_addresses.get(pk=address_id)
    except SavedAddress.DoesNotExist:
        raise NotFound({"detail": f"Address {address_id} not found."})
