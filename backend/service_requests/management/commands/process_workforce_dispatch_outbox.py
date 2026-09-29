from django.core.management.base import BaseCommand

from service_requests.services.workforce_dispatch_outbox import process_pending_workforce_dispatches


class Command(BaseCommand):
    help = "Deliver pending Customer-to-Workforce dispatch events from the durable outbox."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        limit = max(1, min(options["limit"], 500))
        result = process_pending_workforce_dispatches(limit=limit)
        self.stdout.write(self.style.SUCCESS(
            "Processed {processed}; delivered {delivered}; failed {failed}.".format(**result)
        ))
