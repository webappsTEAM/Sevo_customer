from django.db import models
from django.conf import settings
from django.utils import timezone
from companies.models import Company
from service_requests.models import ServiceRequest


class BookingStatusEvent(models.Model):
    """
    Append-only transition log tracking status lifecycle changes for bookings.
    """
    class ActorPersona(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        EMPLOYEE = "employee", "Employee"
        ADMIN    = "admin",    "Admin"
        SYSTEM   = "system",   "System"

    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="status_events"
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_status_events"
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_status_events"
    )
    from_status     = models.CharField(max_length=30, blank=True)
    to_status       = models.CharField(max_length=30)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acted_status_events"
    )
    actor_persona   = models.CharField(max_length=30, choices=ActorPersona.choices)
    reason_code     = models.CharField(max_length=50, blank=True)
    reason_note     = models.TextField(blank=True)
    occurred_at     = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["company", "to_status", "occurred_at"]),
            models.Index(fields=["customer", "occurred_at"]),
            models.Index(fields=["company", "occurred_at"]),
        ]

    def __str__(self):
        return f"Event: SR {self.service_request_id} ({self.from_status} -> {self.to_status}) by {self.actor_persona}"


class CustomerIdentity(models.Model):
    """
    Single identity record normalized by phone and email. Used for manual deduplication.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_identity"
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_identities"
    )
    phone_normalized = models.CharField(max_length=15, db_index=True, blank=True)
    email_normalized = models.EmailField(db_index=True, blank=True)
    first_seen_at    = models.DateTimeField(auto_now_add=True)
    first_booking_at = models.DateTimeField(null=True, blank=True)
    merged_into = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="merged_identities"
    )
    account_status   = models.CharField(max_length=20, default="active", choices=[("active", "Active"), ("suspended", "Suspended"), ("blocked", "Blocked")])
    customer_tier    = models.CharField(max_length=20, default="standard", choices=[("standard", "Standard"), ("vip", "VIP")])
    risk_status      = models.CharField(max_length=20, default="normal", choices=[("normal", "Normal"), ("flagged", "Flagged"), ("restricted", "Restricted"), ("blacklisted", "Blacklisted")])
    internal_notes   = models.TextField(blank=True)
    merge_note       = models.TextField(blank=True)
    tags             = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name_plural = "Customer Identities"

    def __str__(self):
        return f"Identity of {self.user.username} ({self.phone_normalized or self.email_normalized})"


class CustomerLoginEvent(models.Model):
    """
    Tracks customer login attempts and channels.
    """
    class LoginMethod(models.TextChoices):
        OTP_PHONE = "otp_phone", "Phone OTP"
        OTP_EMAIL = "otp_email", "Email OTP"
        GOOGLE    = "google",    "Google Sign-In"
        GENERIC   = "generic",   "Generic Login"

    class LoginStatus(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED  = "failed",  "Failed"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_logins"
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_login_events"
    )
    method      = models.CharField(max_length=30, choices=LoginMethod.choices)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    user_agent  = models.TextField(blank=True)
    status      = models.CharField(max_length=15, choices=LoginStatus.choices)
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"Login for {self.customer.username} via {self.method} [{self.status}]"


class PlatformAuditEvent(models.Model):
    """
    Unified platform-wide audit log for all privileged and sensitive administrative operations.
    """
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="platform_audit_events")
    actor_role = models.CharField(max_length=50, blank=True)
    action = models.CharField(max_length=100, db_index=True)
    module = models.CharField(max_length=50, db_index=True)
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_id = models.CharField(max_length=64, blank=True)
    severity = models.CharField(max_length=20, default="INFO")

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["module", "timestamp"]),
            models.Index(fields=["action", "timestamp"]),
            models.Index(fields=["actor", "timestamp"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.action} by {self.actor.username if self.actor else 'system'} at {self.timestamp}"


class AuditLog(models.Model):
    """
    Audit log for compliance and sensitive actions (merges, exports).
    """
    actor       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action      = models.CharField(max_length=255)
    details     = models.TextField(blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"AuditLog: {self.action} by {self.actor.username if self.actor else 'system'}"


class CustomerUser(models.Model):
    """
    Model representing customer_users table. Syncs with User table for customer roles.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_user_profile"
    )
    name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_users"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "customer_users"

    def __str__(self):
        return f"CustomerUser: {self.name} ({self.phone or self.email})"


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def sync_customer_user(sender, instance, created, **kwargs):
    if getattr(instance, "role", "customer") == "customer":
        CustomerUser.objects.update_or_create(
            user=instance,
            defaults={
                "name": instance.get_full_name() or instance.username,
                "phone": instance.phone or "",
                "email": instance.email or "",
                "company": instance.company,
                "last_login": instance.last_login
            }
        )
