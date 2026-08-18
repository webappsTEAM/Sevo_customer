from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_user_email_phone_unique'),
    ]

    operations = [
        migrations.RenameField(
            model_name='otprequest',
            old_name='mobile_number',
            new_name='identifier',
        ),
        migrations.AlterField(
            model_name='otprequest',
            name='identifier',
            field=models.CharField(max_length=255, db_index=True),
        ),
        migrations.AddField(
            model_name='otprequest',
            name='channel',
            field=models.CharField(choices=[('PHONE', 'Phone'), ('EMAIL', 'Email')], default='PHONE', max_length=10),
        ),
    ]
