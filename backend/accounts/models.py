from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.validators import UnicodeUsernameValidator
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


class User(AbstractBaseUser):
    """
    Custom user model for QuickTIMS.
    Extends AbstractBaseUser to avoid the Django auth permission/group system
    which requires contenttypes and complex M2M tables not needed in a JWT API.
    """

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, null=True, blank=True, related_name="users")

    username_validator = UnicodeUsernameValidator()

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
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        CUSTOMER = "customer", "Customer"
        SUPPORT = "support", "Support"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)

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
        indexes = [
            models.Index(fields=["role"], name="idx_user_role"),
            models.Index(fields=["company", "role"], name="idx_user_company_role"),
        ]

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
        return self.role == self.Role.ADMIN


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
    is_default        = models.BooleanField(default=False)
    last_used_at      = models.DateTimeField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-last_used_at", "-created_at"]

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.get_label_display()} ({self.city})"

