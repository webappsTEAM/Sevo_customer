from django.core.management.base import BaseCommand
from django.db import transaction
from service_requests.models import ServiceRequest
from companies.models import Company


class Command(BaseCommand):
    help = "Backfill Company references on ServiceRequest bookings"

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

        # Find default company
        default_company = Company.objects.first()
        if not default_company:
            self.stdout.write(self.style.ERROR("No Company records exist in the database! Cannot backfill."))
            return

        self.stdout.write(f"Default fallback company: {default_company.company_name} (ID: {default_company.id})")

        null_company_bookings = ServiceRequest.objects.filter(company__isnull=True)
        self.stdout.write(f"Found {null_company_bookings.count()} bookings with missing company.")

        backfilled_count = 0

        with transaction.atomic():
            for sr in null_company_bookings:
                # 1. Try customer company
                target_company = None
                if sr.customer and getattr(sr.customer, "company", None):
                    target_company = sr.customer.company
                else:
                    target_company = default_company

                if target_company:
                    self.stdout.write(
                        f"Backfilling booking {sr.request_id} company to: {target_company.company_name}"
                    )
                    sr.company = target_company
                    backfilled_count += 1
                    if not dry_run:
                        sr.save(update_fields=["company"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Completed backfill! Processed {backfilled_count} bookings."
            )
        )
