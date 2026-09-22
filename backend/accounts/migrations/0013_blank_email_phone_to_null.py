from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email="").update(email=None)
    User.objects.filter(phone="").update(phone=None)


def backwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email__isnull=True).update(email="")
    User.objects.filter(phone__isnull=True).update(phone="")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_user_email_phone_nullable'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
