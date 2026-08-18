from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_blank_email_phone_to_null'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='user',
            name='idx_user_email',
        ),
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(max_length=254, null=True, blank=True, unique=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='phone',
            field=models.CharField(max_length=30, null=True, blank=True, unique=True),
        ),
    ]
