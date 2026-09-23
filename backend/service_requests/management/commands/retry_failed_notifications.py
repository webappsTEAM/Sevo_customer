"""
python manage.py retry_failed_notifications [--max-attempts N] [--max-age-hours H] [--dry-run]

HS-D-04: replays FAILED NotificationOutbox rows through the real Django
send backend (not the tracked wrapper in notifications.py -- retrying
should not create a second outbox row for the same logical attempt, it
should update the existing one in place).

Intended to run on a schedule (cron/Celery beat -- whichever this project
ends up using; this command itself has no opinion on the scheduler). Not
wired into any scheduler by this change -- see the note in the HS-D-04
commit message for why setting up a live queue/worker is out of scope for
this pass.
"""
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Retry FAILED NotificationOutbox rows."

    def add_arguments(self, parser):
        parser.add_argument("--max-attempts", type=int, default=5, help="Give up retrying a row after this many total attempts.")
        parser.add_argument("--max-age-hours", type=int, default=72, help="Don't retry rows older than this many hours -- a 3-day-stale booking confirmation is no longer useful to retry blindly.")
        parser.add_argument("--dry-run", action="store_true", help="Report what would be retried without sending anything.")

    def handle(self, *args, **options):
        from service_requests.models import NotificationOutbox

        max_attempts = options["max_attempts"]
        cutoff = timezone.now() - timezone.timedelta(hours=options["max_age_hours"])
        dry_run = options["dry_run"]

        candidates = NotificationOutbox.objects.filter(
            status=NotificationOutbox.Status.FAILED,
            attempt_count__lt=max_attempts,
            created_at__gte=cutoff,
        )

        total = candidates.count()
        self.stdout.write(f"Found {total} FAILED notification(s) eligible for retry.")
        if dry_run:
            for row in candidates:
                self.stdout.write(f"  [DRY-RUN] would retry #{row.id} -> {row.recipient} ({row.subject!r})")
            return

        retried, succeeded, still_failed = 0, 0, 0
        for row in candidates:
            retried += 1
            try:
                if row.subject.startswith("SMS:"):
                    from accounts.services import get_sms_provider
                    provider = get_sms_provider()
                    sent = bool(provider.send_sms(row.recipient, row.body_text))
                else:
                    sent = send_mail(
                        subject=row.subject,
                        message=row.body_text,
                        from_email=row.from_email or None,
                        recipient_list=[row.recipient],
                        html_message=row.body_html or None,
                        fail_silently=False,
                    )
                if sent:
                    row.status = NotificationOutbox.Status.SENT
                    row.error = ""
                    succeeded += 1
                else:
                    row.error = "SMS send failed or send_mail returned 0 messages sent."
                    still_failed += 1
            except Exception as exc:
                row.error = str(exc)
                still_failed += 1

            row.attempt_count += 1
            row.save(update_fields=["status", "error", "attempt_count", "last_attempt_at"])

        self.stdout.write(self.style.SUCCESS(
            f"Retried {retried}: {succeeded} now sent, {still_failed} still failed."
        ))
