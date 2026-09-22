# Generated manually to decouple workforce models and fields from accounts
from django.db import migrations, models


def migrate_legacy_user_roles(apps, schema_editor):
    """
    Migrate any existing users with role 'employee' or 'kiosk' to 'customer' or 'admin'.
    """
    User = apps.get_model("accounts", "User")
    User.objects.filter(role__in=["employee", "kiosk"]).update(role="customer")


def reverse_legacy_user_roles(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_user_idx_user_email_user_idx_user_role_and_more"),
    ]

    operations = [
        migrations.RunPython(migrate_legacy_user_roles, reverse_legacy_user_roles),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("admin", "Admin"),
                    ("manager", "Manager"),
                    ("customer", "Customer"),
                    ("support", "Support"),
                ],
                default="customer",
                max_length=20,
            ),
        ),
        migrations.DeleteModel(
            name="RegistrationDossier",
        ),
    ]
