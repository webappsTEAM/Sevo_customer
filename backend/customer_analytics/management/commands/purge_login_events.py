from django.core.management.base import BaseCommand
from customer_analytics.tasks import purge_old_login_events


class Command(BaseCommand):
    help = "Purge customer login events older than 12 months"

    def handle(self, *args, **options):
        result = purge_old_login_events()
        self.stdout.write(self.style.SUCCESS(result))
