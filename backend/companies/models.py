from django.db import models


class Region(models.Model):
    """
    Defines region-specific business and catalog defaults for IN, US, UK.
    """

    class Code(models.TextChoices):
        US = "US", "United States"
        UK = "UK", "United Kingdom"
        IN = "IN", "India"

    code = models.CharField(max_length=2, unique=True, choices=Code.choices)
    name = models.CharField(max_length=100)

    # Currency
    currency = models.CharField(max_length=3)           # INR, USD, GBP
    currency_symbol = models.CharField(max_length=5)    # ₹, $, £

    # Date & calendar
    date_format = models.CharField(max_length=20, default="DD/MM/YYYY")
    week_start = models.IntegerField(default=0)         # 0=Mon, 6=Sun

    # Working time / Business hours
    overtime_weekly_hours = models.PositiveIntegerField(default=40)
    max_weekly_hours = models.PositiveIntegerField(default=48)

    statutory_leave_days = models.PositiveIntegerField(default=0)
    tax_year_start_month = models.IntegerField(default=4)
    tax_year_start_day = models.IntegerField(default=1)
    payroll_frequency = models.CharField(max_length=20, default="monthly")
    min_wage = models.DecimalField(max_digits=7, decimal_places=2, default=0)

    national_insurance_enabled = models.BooleanField(default=False)
    paye_enabled = models.BooleanField(default=False)
    flsa_enabled = models.BooleanField(default=False)
    state_tax_enabled = models.BooleanField(default=False)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


def default_module_permissions():
    return {
        "catalog": { "admin": ["view", "modify"], "manager": ["view", "modify"], "support": ["view"] },
        "bookings": { "admin": ["view", "modify"], "manager": ["view", "modify"], "support": ["view", "modify"] },
        "reports": { "admin": ["view"], "manager": ["view"], "support": [] },
        "inventory": { "admin": ["view", "modify"], "manager": ["view", "modify"], "support": ["view"] },
        "customers": {
            "admin": ["view", "modify", "export"],
            "manager": ["view", "modify", "export"],
            "support": ["view", "export"],
            "employee": ["view", "export"]
        },
    }


class Company(models.Model):
    company_name = models.CharField(max_length=255)
    display_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)

    class PrimaryCountry(models.TextChoices):
        US = "US", "United States"
        UK = "UK", "United Kingdom"
        IN = "IN", "India"

    primary_country = models.CharField(
        max_length=2,
        choices=PrimaryCountry.choices,
        default=PrimaryCountry.IN,
    )

    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="companies",
    )

    default_state = models.CharField(max_length=100, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(max_length=255, blank=True, null=True)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    data_region = models.CharField(max_length=50, default="ap-south-1")
    address = models.TextField(blank=True, null=True)
    logo = models.ImageField(upload_to="company_logos/", blank=True, null=True)

    class ComplianceMode(models.TextChoices):
        STRICT = "strict", "Strict"
        FLEXIBLE = "flexible", "Flexible"

    compliance_mode = models.CharField(
        max_length=20,
        choices=ComplianceMode.choices,
        default=ComplianceMode.STRICT,
    )

    class RescheduleRejectionStrategy(models.TextChoices):
        AUTO_REASSIGN           = "auto_reassign",           "Auto Reassign Technician"
        SUGGEST_ALTERNATE_SLOTS = "suggest_alternate_slots", "Suggest Alternate Slots"

    reschedule_rejection_strategy = models.CharField(
        max_length=30,
        choices=RescheduleRejectionStrategy.choices,
        default=RescheduleRejectionStrategy.AUTO_REASSIGN,
    )

    allowed_countries = models.JSONField(default=list, blank=True)
    team_size = models.CharField(max_length=100, blank=True, null=True)
    selected_modules = models.JSONField(default=list, blank=True)
    module_permissions = models.JSONField(default=default_module_permissions, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.display_id:
            import uuid
            self.display_id = f"ORG-{uuid.uuid4().hex[:6].upper()}"

        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.company_name) or "company"
            slug = base_slug
            counter = 1
            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        if self.primary_country and not self.region_id:
            try:
                self.region = Region.objects.get(code=self.primary_country)
            except Region.DoesNotExist:
                pass

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company_name} ({self.display_id})"
