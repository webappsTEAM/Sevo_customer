from django.core.management.base import BaseCommand
from django.db import transaction
from customer_analytics.models import CustomerIdentity
from service_requests.models import ServiceRequest
from .normalize_phones import clean_and_normalize


def resolve_primary_user(user):
    current = user
    visited = set()
    while hasattr(current, "customer_identity") and current.customer_identity.merged_into:
        target = current.customer_identity.merged_into.user
        if target.id in visited:
            break  # prevent infinite loop
        visited.add(target.id)
        current = target
    return current


class Command(BaseCommand):
    help = "Link guest bookings (where customer is NULL) to registered users by normalized phone matching"

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

        guest_bookings = ServiceRequest.objects.filter(customer__isnull=True)
        self.stdout.write(f"Found {guest_bookings.count()} guest bookings.")

        linked_count = 0
        ambiguous_count = 0
        skipped_count = 0

        with transaction.atomic():
            for sr in guest_bookings:
                if not sr.phone:
                    skipped_count += 1
                    continue

                norm_phone = clean_and_normalize(sr.phone)
                if not norm_phone:
                    skipped_count += 1
                    continue

                # Find matching identities
                identities = CustomerIdentity.objects.filter(phone_normalized=norm_phone, merged_into__isnull=True)
                
                if identities.count() == 1:
                    matched_identity = identities.first()
                    primary_user = resolve_primary_user(matched_identity.user)
                    
                    self.stdout.write(
                        self.style.SUCCESS(f"Linking booking {sr.request_id} (phone: {sr.phone}) to user {primary_user.username}")
                    )
                    
                    sr.customer = primary_user
                    linked_count += 1
                    
                    if not dry_run:
                        sr.save(update_fields=["customer"])
                elif identities.count() > 1:
                    usernames = [ident.user.username for ident in identities]
                    self.stdout.write(
                        self.style.ERROR(
                            f"AMBIGUOUS: Booking {sr.request_id} matches multiple users for phone {norm_phone}: {', '.join(usernames)}. Added to review queue."
                        )
                    )
                    ambiguous_count += 1
                else:
                    skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Completed! Linked: {linked_count} bookings. Ambiguous: {ambiguous_count}. Skipped: {skipped_count}."
            )
        )
