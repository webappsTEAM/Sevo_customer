from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.conf import settings
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def _create_user(self, username, email, password, **extra_fields):
        if not username:
            raise ValueError("Username must be set")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(username, email, password, **extra_fields)


def _generate_customer_id():
    """
    Generate unique human-readable customer ID in CUS0001, CUS0002 format.
    """
    last_user = User.objects.filter(customer_id__startswith="CUS").order_by("-id").first()
    num = 1
    if last_user and last_user.customer_id:
        try:
            num = int(str(last_user.customer_id).replace("CUS", "")) + 1
        except ValueError:
            num = (last_user.id or 1) + 1
    else:
        num = (User.objects.count() + 1)

    cid = f"CUS{str(num).zfill(4)}"
    while User.objects.filter(customer_id=cid).exists():
        num += 1
        cid = f"CUS{str(num).zfill(4)}"
    return cid


class User(AbstractBaseUser):
    """
    Custom user model for QuickTIMS.
    Extends AbstractBaseUser to avoid the Django auth permission/group system
    which requires contenttypes and complex M2M tables not needed in a JWT API.
    """

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, null=True, blank=True, related_name="users")

    username_validator = UnicodeUsernameValidator()

    # Permanent human-readable Customer ID (e.g. CUS0001, CUS0002)
    customer_id = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        editable=False,
        help_text="Permanent unique Customer ID (e.g. CUS0001)",
    )

    username = models.CharField(
        max_length=150,
        unique=True,
        validators=[username_validator],
        error_messages={"unique": "A user with that username already exists."},
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    # null=True (not just blank) so multiple accounts without an email don't
    # collide under the unique constraint below — same pattern mobile_number
    # already used correctly.
    email = models.EmailField(null=True, blank=True, unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        SUPPORT = "support", "Support"
        CATALOG = "catalog", "Catalog Manager"
        FINANCE = "finance", "Finance"
        EMPLOYEE = "employee", "Employee"
        CUSTOMER = "customer", "Customer"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)

    # Per-user module permission overrides, layered on top of the role-based
    # Global RBAC matrix (accounts/permissions.py DEFAULT_GLOBAL_RBAC).
    # Shape: {"<module>": ["<action>", ...]}. A module key present here
    # (including as an empty list, meaning "No Access") always wins over
    # the role's default actions for that module; a module NOT present here
    # simply falls back to the role default — so most Admin/Staff accounts
    # need no entry at all. Only a Super Admin may set this (enforced in
    # platform_control.views.PlatformUserDetailView/PlatformUserInviteView).
    # See accounts.permissions.get_effective_module_actions() — the single
    # place both `can()` and UserSerializer.get_permissions() read this from.
    custom_permissions = models.JSONField(default=dict, blank=True)

    # Extended profile fields
    bio = models.TextField(blank=True, default="")
    # null=True so multiple accounts without a phone don't collide under the
    # unique constraint — one phone = one account, enforced at the DB level.
    phone = models.CharField(max_length=30, null=True, blank=True, unique=True)
    mobile_number = models.CharField(max_length=15, unique=True, null=True, blank=True, db_index=True)
    profile_complete = models.BooleanField(default=False)
    last_known_location = models.JSONField(null=True, blank=True, default=dict)
    timezone = models.CharField(max_length=60, default="UTC")
    language = models.CharField(max_length=10, default="en")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # 2FA & OTP Logins
    totp_secret = models.CharField(max_length=100, blank=True, default="")
    two_fa_enabled = models.BooleanField(default=False)
    email_otp = models.CharField(max_length=6, blank=True, null=True)
    phone_otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-id"]
        indexes = [
            models.Index(fields=["role"], name="idx_user_role"),
            models.Index(fields=["company", "role"], name="idx_user_company_role"),
            models.Index(fields=["role", "date_joined"], name="idx_user_role_date_joined"),
            models.Index(fields=["customer_id"], name="idx_user_customer_id"),
        ]

    def save(self, *args, **kwargs):
        if not self.customer_id:
            self.customer_id = _generate_customer_id()
        super().save(*args, **kwargs)

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name

    def get_short_name(self):
        return self.first_name

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    def is_admin(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.SUPER_ADMIN) or self.is_superuser or self.is_staff

    def is_super_admin(self) -> bool:
        return bool(self.is_superuser or self.role in (self.Role.SUPER_ADMIN, "super_admin", "superadmin"))


class OTPChannel(models.TextChoices):
    PHONE = "PHONE", "Phone"
    EMAIL = "EMAIL", "Email"


class OTPRequest(models.Model):
    """
    Customer OTP request model — channel-agnostic (phone or email).
    Stores hashed OTP codes with 5-minute expiration and attempt counters.
    `identifier` holds a normalized phone number when channel=PHONE, or a
    lowercased email address when channel=EMAIL. Was phone-only (field was
    named `mobile_number`) before customer login was unified onto one OTP
    mechanism for both channels.
    """
    identifier = models.CharField(max_length=255, db_index=True)
    channel = models.CharField(max_length=10, choices=OTPChannel.choices, default=OTPChannel.PHONE)
    otp_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempt_count = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    purpose = models.CharField(max_length=30, default="login")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "OTP Request"
        verbose_name_plural = "OTP Requests"

    def __str__(self):
        return f"OTP for {self.identifier} ({self.channel}/{self.purpose}) - Verified: {self.is_verified}"

    def is_expired(self):
        return timezone.now() > self.expires_at


class OTPAuditLog(models.Model):
    phone = models.CharField(max_length=30)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    action = models.CharField(max_length=30)  # e.g. send_request, send_failed, rate_limited_ip, rate_limited_phone, verify_success, verify_failed, attempts_exceeded
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "OTP Audit Log"
        verbose_name_plural = "OTP Audit Logs"

    def __str__(self):
        return f"{self.phone} - {self.action} @ {self.timestamp}"



class SavedAddress(models.Model):
    """
    Customer saved addresses — supports multiple addresses with a single default.
    Default enforcement is done in customer_services.py, not at the DB constraint level.
    """

    class Label(models.TextChoices):
        HOME  = "home",  "Home"
        WORK  = "work",  "Work"
        OTHER = "other", "Other"

    user          = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="saved_addresses",
        limit_choices_to={"role": "customer"},
    )
    label         = models.CharField(max_length=20, choices=Label.choices, default=Label.HOME)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, default="")
    city          = models.CharField(max_length=100)
    state         = models.CharField(max_length=100)
    pincode       = models.CharField(max_length=20)
    phone_number  = models.CharField(max_length=30, blank=True, default="")
    latitude          = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    formatted_address = models.CharField(max_length=500, blank=True, default="")
    flat_house_no     = models.CharField(max_length=255, blank=True, default="")
    landmark          = models.CharField(max_length=255, blank=True, default="")
    locality          = models.CharField(max_length=255, blank=True, default="")
    receiver_name     = models.CharField(max_length=255, blank=True, default="")
    receiver_phone    = models.CharField(max_length=15, blank=True, default="")
    country           = models.CharField(max_length=100, default="India", blank=True)
    location_source   = models.CharField(max_length=50, blank=True, default="geocoding")
    geocoded_at       = models.DateTimeField(null=True, blank=True)
    geocoding_status  = models.CharField(max_length=50, blank=True, default="pending")
    location_confirmed_at = models.DateTimeField(null=True, blank=True)
    is_default        = models.BooleanField(default=False)
    last_used_at      = models.DateTimeField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-last_used_at", "-created_at"]

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.get_label_display()} ({self.city})"


class CustomerNotificationPreference(models.Model):
    """
    HS-D-05: the vendor app has WorkforceNotificationPreference per employee;
    the customer app had no equivalent -- no opt-out, no channel choice, no
    consent record for any of the ~12 notification types
    service_requests/notifications.py sends. Mirrors the vendor model's shape
    so both sides follow the same convention.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )

    # Booking lifecycle
    booking_confirmations = models.BooleanField(default=True)
    reschedule_updates    = models.BooleanField(default=True)
    technician_updates    = models.BooleanField(default=True)
    completion_feedback   = models.BooleanField(default=True)

    # Money
    payment_receipts  = models.BooleanField(default=True)
    refund_updates    = models.BooleanField(default=True)

    # Support
    complaint_updates = models.BooleanField(default=True)

    # Marketing / non-essential
    promotional_offers = models.BooleanField(default=False)

    # Channels -- account-created/security-relevant mail always sends
    # regardless of these preferences (see notifications.py); these govern
    # everything else.
    channel_email = models.BooleanField(default=True)
    channel_sms   = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_customer_notification_preference"

    def __str__(self):
        return f"Notification Preferences for {self.user.username}"


def _generate_referral_code(user):
    """8-char uppercase alphanumeric, derived from the user id so it's stable
    and collision-free without a retry loop -- same spirit as this codebase's
    existing deterministic-but-unguessable ID generators (request_id etc.),
    but referral codes are meant to be shared, so they don't need the
    cryptographic-randomness requirement OTPs do."""
    import hashlib
    digest = hashlib.sha256(f"referral-{user.pk}-{user.username}".encode()).hexdigest()
    return digest[:8].upper()


class ReferralCode(models.Model):
    """
    HS-A-06: every customer's own shareable referral code. Generated lazily
    (get_or_create) rather than at signup for every user, so this is a no-op
    for the vast majority of existing users who will never use it.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_code_obj",
    )
    code = models.CharField(max_length=16, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_referral_code"

    def __str__(self):
        return self.code


class Referral(models.Model):
    """
    HS-A-06: referrals and loyalty existed only as an empty admin screen with
    no backend and no customer-facing loop. This is the tracking record: one
    row per referee (a person can only be referred once, by whoever's code
    they used at signup), reward paid out once the referee's first booking
    completes (see service_requests.services.process_referral_completion,
    called from the completion webhook path).
    """
    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending (referee has not completed a booking yet)"
        REWARDED  = "REWARDED",  "Rewarded"
        EXPIRED   = "EXPIRED",   "Expired (unused)"

    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referrals_made",
    )
    referee = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referred_by",
    )
    code_used = models.CharField(max_length=16, blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    referrer_reward_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    referee_reward_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rewarded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_referral"

    def __str__(self):
        return f"Referral {self.referrer_id} -> {self.referee_id} ({self.status})"
