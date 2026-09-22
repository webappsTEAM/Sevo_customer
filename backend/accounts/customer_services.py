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

    # Server-side calls must prefer the SERVER key. The browser key
    # (VITE_*) is meant to be restricted by HTTP referrer, and a request
    # from this process sends no referrer -- so a correctly-restricted
    # browser key is REJECTED here, and the only way to make this path work
    # with it is to leave the browser key unrestricted, which is exactly
    # what must not happen. Reading GOOGLE_MAPS_API_KEY first means the
    # server uses its own IP-restricted key; the VITE names stay as a
    # last-resort fallback so deployments that only set those keep working.
    google_api_key = (
        os.environ.get("GOOGLE_MAPS_API_KEY")
        or os.environ.get("VITE_GOOGLE_MAPS_KEY")
        or os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
    )
    if google_api_key:
        try:
            g_url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={google_api_key}"
            req = urllib.request.Request(g_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=5) as resp:
                g_data = json.loads(resp.read())
            
            if g_data.get("status") == "OK" and g_data.get("results"):
                first = g_data["results"][0]
                comps = first.get("address_components", [])
                
                sublocality = ""
                route = ""
                city = ""
                state = ""
                pincode = ""
                country = ""

                for c in comps:
                    types = c.get("types", [])
                    if "sublocality" in types or "sublocality_level_1" in types:
                        sublocality = c.get("long_name", "")
                    if "route" in types:
                        route = c.get("long_name", "")
                    if "locality" in types:
                        city = c.get("long_name", "")
                    if "administrative_area_level_1" in types:
                        state = c.get("long_name", "")
                    if "postal_code" in types:
                        pincode = c.get("long_name", "")
                    if "country" in types:
                        country = c.get("long_name", "")

                area = ", ".join(filter(None, [sublocality, route])) or sublocality or route or "Current Location"
                return {
                    "latitude": lat,
                    "longitude": lng,
                    "accuracy": acc,
                    "area": area,
                    "city": city,
                    "state": state,
                    "country": country or "India",
                    "pincode": pincode,
                    "formatted_address": first.get("formatted_address", ""),
                }
        except Exception:
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
    if not getattr(user, "customer_id", None):
        from .models import _generate_customer_id
        user.customer_id = _generate_customer_id()
        user.save(update_fields=["customer_id"])
    return {
        "id": user.id,
        "customer_id": user.customer_id,
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
        if field == "email" and value:
            val_clean = str(value).strip().lower()
            from django.contrib.auth import get_user_model
            from rest_framework.exceptions import ValidationError
            User = get_user_model()
            if User.objects.filter(email__iexact=val_clean).exclude(pk=user.pk).exists():
                raise ValidationError("A user with this email address already exists.")
            value = val_clean
        setattr(user, field, value)
        update_fields.append(field)

    if "avatar" in validated_data or "remove_avatar" in validated_data:
        avatar_val = validated_data.get("avatar")
        remove_flag = str(validated_data.get("remove_avatar", "")).lower() in ("true", "1", "yes")
        if remove_flag or avatar_val in (None, "", "null"):
            if user.avatar:
                user.avatar.delete(save=False)
            user.avatar = None
            update_fields.append("avatar")
        elif avatar_val is not None:
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
    Create a new saved address or update existing if duplicate.
    If is_default=True, unset all other defaults for this user first inside an atomic transaction.
    Enforces max 10 addresses per customer.
    """
    line1_clean = str(validated_data.get("address_line1") or "").strip().lower()
    pin_clean = str(validated_data.get("pincode") or "").strip()
    lat = validated_data.get("latitude")
    lng = validated_data.get("longitude")
    label_clean = str(validated_data.get("label") or "").strip().lower()

    existing = None
    if line1_clean and pin_clean:
        existing = user.saved_addresses.filter(
            address_line1__iexact=line1_clean,
            pincode=pin_clean
        ).first()

    if not existing and lat is not None and lng is not None:
        try:
            existing = user.saved_addresses.filter(
                latitude__gte=float(lat) - 0.0001,
                latitude__lte=float(lat) + 0.0001,
                longitude__gte=float(lng) - 0.0001,
                longitude__lte=float(lng) + 0.0001,
            ).first()
        except Exception:
            pass

    is_default = validated_data.get("is_default", False)

    with transaction.atomic():
        if existing:
            # Update existing duplicate record
            for k, v in validated_data.items():
                if k != "is_default" and v is not None:
                    setattr(existing, k, v)
            if is_default:
                user.saved_addresses.filter(is_default=True).exclude(pk=existing.pk).update(is_default=False)
                existing.is_default = True
            existing.save()
            return existing

        if user.saved_addresses.count() >= 10:
            raise ValidationError({"detail": "Maximum of 10 saved addresses allowed."})

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
