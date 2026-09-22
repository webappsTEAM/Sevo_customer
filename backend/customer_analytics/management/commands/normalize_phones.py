import re
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from customer_analytics.models import CustomerIdentity
from service_requests.models import ServiceRequest

User = get_user_model()


def clean_and_normalize(phone):
    if not phone:
        return ""
    clean = re.sub(r"[^\d+]", "", str(phone))
    if not clean.startswith("+"):
        if len(clean) == 10:
            clean = f"+91{clean}"
        elif clean.startswith("91") and len(clean) == 12:
            clean = f"+{clean}"
        else:
            clean = f"+{clean}"
    return clean


class Command(BaseCommand):
    help = "Normalize customer user and service request phone numbers"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Perform a dry run without committing database changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN ACTIVE - no changes will be saved"))

        # 1. Normalize Customer Users
        customers = User.objects.filter(role=User.Role.CUSTOMER)
        self.stdout.write(f"Found {customers.count()} customer users to process.")

        users_updated = 0
        identities_created = 0
        phone_collisions = {}
        email_collisions = {}

        for user in customers:
            phone_val = user.phone or user.mobile_number or ""
            normalized_phone = clean_and_normalize(phone_val)
            normalized_email = str(user.email or "").strip().lower()

            # Track collisions
            if normalized_phone:
                if normalized_phone in phone_collisions:
                    phone_collisions[normalized_phone].append(user.username)
                else:
                    phone_collisions[normalized_phone] = [user.username]

            if normalized_email:
                if normalized_email in email_collisions:
                    email_collisions[normalized_email].append(user.username)
                else:
                    email_collisions[normalized_email] = [user.username]

            # Get or create CustomerIdentity
            try:
                identity = CustomerIdentity.objects.get(user=user)
                is_new = False
            except CustomerIdentity.DoesNotExist:
                identity = CustomerIdentity(user=user, company=user.company)
                is_new = True

            identity.phone_normalized = normalized_phone
            identity.email_normalized = normalized_email

            if is_new:
                identities_created += 1
            users_updated += 1

            if not dry_run:
                identity.save()

        # Log collisions
        for phone, usernames in phone_collisions.items():
            if len(usernames) > 1:
                self.stdout.write(
                    self.style.ERROR(f"COLLISION: Phone {phone} is shared by users: {', '.join(usernames)}")
                )

        for email, usernames in email_collisions.items():
            if len(usernames) > 1:
                self.stdout.write(
                    self.style.ERROR(f"COLLISION: Email {email} is shared by users: {', '.join(usernames)}")
                )

        self.stdout.write(self.style.SUCCESS(f"Processed {users_updated} users. Created/updated {identities_created} new CustomerIdentity entries."))

        # 2. Normalize ServiceRequest.phone in-place
        bookings = ServiceRequest.objects.all()
        self.stdout.write(f"Found {bookings.count()} bookings to process.")

        bookings_updated = 0
        with transaction.atomic():
            for sr in bookings:
                if sr.phone:
                    normalized = clean_and_normalize(sr.phone)
                    if sr.phone != normalized:
                        self.stdout.write(f"Normalizing booking {sr.request_id} phone: {sr.phone} -> {normalized}")
                        sr.phone = normalized
                        bookings_updated += 1
                        if not dry_run:
                            sr.save(update_fields=["phone"])

        self.stdout.write(self.style.SUCCESS(f"Normalized {bookings_updated} booking phone numbers."))
