import uuid
import secrets
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone


AUTH_USER_MODEL = settings.AUTH_USER_MODEL


class NotificationPreference(models.Model):
    user = models.OneToOneField(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_prefs")

    # Email channel
    email_security_alerts = models.BooleanField(default=True)
    email_login_alerts = models.BooleanField(default=True)
    email_booking_updates = models.BooleanField(default=True)
    email_weekly_digest = models.BooleanField(default=False)
    email_product_updates = models.BooleanField(default=False)

    # In-app channel
    inapp_security_alerts = models.BooleanField(default=True)
    inapp_booking_updates = models.BooleanField(default=True)
    inapp_announcements = models.BooleanField(default=True)

    # SMS channel
    sms_security_alerts = models.BooleanField(default=False)
    sms_booking_updates = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notification Preference"


class LoginSession(models.Model):
    DEVICE_CHOICES = [("browser", "Browser"), ("mobile", "Mobile"), ("api", "API")]

    user = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="login_sessions")
    session_key = models.CharField(max_length=64, unique=True)
    device_type = models.CharField(max_length=20, choices=DEVICE_CHOICES, default="browser")
    device_name = models.CharField(max_length=200, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_active = models.DateTimeField(default=timezone.now)
    is_current = models.BooleanField(default=False)
    revoked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-last_active"]


class LoginHistory(models.Model):
    STATUS_CHOICES = [("success", "Success"), ("failed", "Failed"), ("mfa_required", "MFA Required")]

    user = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="login_history")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="success")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]


class APIKey(models.Model):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="api_keys")
    created_by = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_api_keys")
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=10)
    key_hash = models.CharField(max_length=128)
    scopes = models.JSONField(default=list)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def generate(cls, company, created_by, name, scopes=None):
        raw_key = f"qt_{secrets.token_urlsafe(32)}"
        prefix = raw_key[:10]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        obj = cls.objects.create(
            company=company,
            created_by=created_by,
            name=name,
            key_prefix=prefix,
            key_hash=key_hash,
            scopes=scopes or ["read"],
        )
        return obj, raw_key


class Webhook(models.Model):
    STATUS_CHOICES = [("active", "Active"), ("paused", "Paused"), ("failing", "Failing")]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="webhooks")
    created_by = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_webhooks")
    name = models.CharField(max_length=100)
    url = models.URLField(max_length=500)
    secret = models.CharField(max_length=64)
    events = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    failure_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_hex(32)
        super().save(*args, **kwargs)


class TeamInvite(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("accepted", "Accepted"), ("expired", "Expired"), ("revoked", "Revoked")]
    ROLE_CHOICES = [("admin", "Admin"), ("manager", "Manager"), ("support", "Customer Support")]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="team_invites")
    invited_by = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sent_invites")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="support")
    region = models.CharField(
        max_length=2,
        choices=[("US", "United States"), ("UK", "United Kingdom"), ("IN", "India")],
        blank=True, null=True
    )
    default_state = models.CharField(max_length=100, blank=True, null=True)
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class Invoice(models.Model):
    STATUS_CHOICES = [("paid", "Paid"), ("pending", "Pending"), ("overdue", "Overdue")]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="invoices")
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="paid")
    billing_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    pdf_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-billing_date"]

    def __str__(self):
        return f"{self.invoice_number} - {self.company.company_name}"


class HomePageConfig(models.Model):
    """
    Persists published customer homepage content and layout settings.
    Stores only `image_path` string references in `config_data`.
    """
    key = models.CharField(max_length=50, unique=True, default="default")
    config_data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="homepage_configs"
    )

    class Meta:
        verbose_name = "Home Page Config"
        verbose_name_plural = "Home Page Configs"

    def __str__(self):
        return f"HomePageConfig ({self.key}) - {self.updated_at.strftime('%Y-%m-%d %H:%M')}"


class HomePageMedia(models.Model):
    """
    Tracks all uploaded media assets stored in Supabase Storage.
    Maintains cleanup_status and reference tracking to prevent orphaned storage files.
    """
    CLEANUP_STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("UNREFERENCED", "Unreferenced"),
        ("PENDING_DELETE", "Pending Delete"),
        ("DELETED", "Deleted"),
        ("DELETE_FAILED", "Delete Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.CharField(max_length=50)
    original_name = models.CharField(max_length=255)
    image_path = models.CharField(max_length=500, unique=True)
    mime_type = models.CharField(max_length=50, default="image/webp")
    file_size = models.IntegerField(default=0)
    dimensions = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    uploaded_by = models.ForeignKey(
        AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="homepage_uploads"
    )
    is_active = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    cleanup_status = models.CharField(
        max_length=30,
        choices=CLEANUP_STATUS_CHOICES,
        default="UNREFERENCED"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Home Page Media"
        verbose_name_plural = "Home Page Media Items"

    def __str__(self):
        return f"[{self.section}] {self.image_path} ({self.cleanup_status})"


# ─────────────────────────────────────────────────────────────────────────────
# Service Area Geofencing
# ─────────────────────────────────────────────────────────────────────────────

class ServiceZone(models.Model):
    """
    Admin-defined geographic zone that controls which services are available
    in a specific area. Supports circle (Haversine) and polygon (ray-casting)
    point-in-zone checks without requiring GeoDjango.
    """
    ZONE_TYPE_CHOICES = [
        ("circle", "Circle (Radius)"),
        ("polygon", "Polygon (Drawn)"),
    ]

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="service_zones",
    )
    created_by = models.ForeignKey(
        AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_service_zones",
    )

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default="#4F46E5")  # hex colour for map
    is_active = models.BooleanField(default=True)

    zone_type = models.CharField(max_length=10, choices=ZONE_TYPE_CHOICES, default="circle")

    # Circle zone fields
    center_lat = models.FloatField(null=True, blank=True)
    center_lng = models.FloatField(null=True, blank=True)
    radius_meters = models.FloatField(default=5000.0)  # metres

    # Polygon zone field — stores GeoJSON Polygon geometry
    # e.g. { "type": "Polygon", "coordinates": [[[lng,lat], ...]] }
    polygon = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Service Zone"
        verbose_name_plural = "Service Zones"

    def __str__(self):
        return f"{self.name} ({self.zone_type})"

    # ── Geometry helpers (no GeoDjango) ────────────────────────────────────

    @staticmethod
    def _haversine(lat1, lng1, lat2, lng2):
        """Return distance in metres between two WGS-84 points."""
        import math
        R = 6_371_000  # Earth radius in metres
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lng2 - lng1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    @staticmethod
    def _ray_cast(lat, lng, polygon_coords):
        """
        Ray-casting point-in-polygon test.
        polygon_coords: list of [lng, lat] pairs (GeoJSON order).
        Returns True if (lat, lng) is inside the polygon.
        """
        x, y = lng, lat
        inside = False
        ring = polygon_coords
        n = len(ring)
        j = n - 1
        for i in range(n):
            xi, yi = ring[i][0], ring[i][1]
            xj, yj = ring[j][0], ring[j][1]
            intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi)
            if intersect:
                inside = not inside
            j = i
        return inside

    def contains_point(self, lat, lng):
        """Return True if (lat, lng) falls inside this zone."""
        if self.zone_type == "circle":
            if self.center_lat is None or self.center_lng is None:
                return False
            dist = self._haversine(lat, lng, self.center_lat, self.center_lng)
            return dist <= self.radius_meters
        elif self.zone_type == "polygon":
            if not self.polygon:
                return False
            try:
                coords = self.polygon.get("coordinates", [])
                if not coords:
                    return False
                # Use the outer ring (index 0)
                outer_ring = coords[0]
                return self._ray_cast(lat, lng, outer_ring)
            except Exception:
                return False
        return False


class ServiceZoneService(models.Model):
    """
    Links a ServiceZone to specific service slugs that are available inside it.
    If no entries exist for a zone, all services are considered available.
    """
    zone = models.ForeignKey(
        ServiceZone,
        on_delete=models.CASCADE,
        related_name="zone_services",
    )
    service_slug = models.CharField(max_length=100, help_text="Service slug/key from catalog")
    service_name = models.CharField(max_length=150, blank=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = [("zone", "service_slug")]
        ordering = ["service_slug"]

    def __str__(self):
        status = "✓" if self.is_available else "✗"
        return f"{self.zone.name} — {self.service_slug} {status}"
