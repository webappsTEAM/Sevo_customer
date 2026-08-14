"""
Management command to fix an admin user account that is inactive or has wrong role.
Usage:
    python manage.py fix_admin --email suryaramya111111@gmail.com
    python manage.py fix_admin --email suryaramya111111@gmail.com --reset-password NewPass@123
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Activate admin account and optionally reset password"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email of the admin account to fix")
        parser.add_argument("--reset-password", default=None, help="Set a new password for the account")

    def handle(self, *args, **options):
        User = get_user_model()
        email = options["email"].strip()
        new_password = options.get("reset_password")

        users = User.objects.filter(email__iexact=email)
        self.stdout.write(f"\nFound {users.count()} account(s) with email '{email}':")
        for u in users:
            self.stdout.write(
                f"  ID={u.id} | username={u.username} | role={u.role} "
                f"| is_active={u.is_active} | is_staff={u.is_staff}"
            )

        # Target the admin account first, fall back to first match
        target = users.filter(role="admin").first() or users.first()

        if not target:
            self.stderr.write(self.style.ERROR(f"\nNo account found for '{email}'"))
            return

        target.is_active    = True
        target.is_staff     = True
        target.is_superuser = True
        target.role         = "admin"

        if new_password:
            target.set_password(new_password)
            self.stdout.write(f"\n  Password has been reset.")

        target.save()

        self.stdout.write(self.style.SUCCESS(
            f"\n[OK] Fixed! ID={target.id} username='{target.username}' "
            f"is now active as admin."
        ))
        self.stdout.write("   Try logging in now.\n")
