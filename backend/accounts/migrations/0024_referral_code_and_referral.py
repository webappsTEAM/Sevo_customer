# Hand-written migration -- see 0023_customer_notification_preference.py for
# why (no way to run `manage.py makemigrations` against a matching
# environment in this sandbox). Verified by loading via importlib against a
# locally-installed Django to confirm the Migration class parses and matches
# the model definitions -- not verified against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# HS-A-06: adds ReferralCode (one shareable code per user) and Referral (one
# tracking row per referee, rewarded once via process_referral_completion()
# when their first booking completes).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0023_customer_notification_preference'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReferralCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=16, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='referral_code_obj', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounts_referral_code',
            },
        ),
        migrations.CreateModel(
            name='Referral',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code_used', models.CharField(blank=True, default='', max_length=16)),
                ('status', models.CharField(choices=[('PENDING', 'Pending (referee has not completed a booking yet)'), ('REWARDED', 'Rewarded'), ('EXPIRED', 'Expired (unused)')], default='PENDING', max_length=10)),
                ('referrer_reward_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('referee_reward_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('rewarded_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('referee', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='referred_by', to=settings.AUTH_USER_MODEL)),
                ('referrer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='referrals_made', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounts_referral',
            },
        ),
    ]
