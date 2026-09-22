# Hand-written migration -- see 0053_hs_e01_gt_d03_snapshot_fields.py for why
# (no way to run `manage.py makemigrations` against a matching environment in
# this sandbox). Verified by loading via importlib against a locally-
# installed Django to confirm the Migration class parses and matches the
# model definitions -- not verified against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# HS-C-07: adds CustomerWallet (cached balance) and WalletTransaction
# (immutable append-only ledger) -- see the docstrings on both models in
# service_requests/models.py for the full rationale.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('service_requests', '0053_hs_e01_gt_d03_snapshot_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomerWallet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='wallet', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'service_requests_customer_wallet',
            },
        ),
        migrations.CreateModel(
            name='WalletTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tx_type', models.CharField(choices=[('CREDIT', 'Credit'), ('DEBIT', 'Debit')], max_length=10)),
                ('reason', models.CharField(choices=[('REFUND', 'Refund Credited to Wallet'), ('GOODWILL', 'Goodwill Credit'), ('REFERRAL', 'Referral Reward'), ('BOOKING_DEBIT', 'Applied to Booking Payment'), ('ADJUSTMENT', 'Manual Adjustment'), ('REVERSAL', 'Reversal')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=10)),
                ('note', models.CharField(blank=True, default='', max_length=255)),
                ('reference_type', models.CharField(blank=True, default='', max_length=50)),
                ('reference_id', models.CharField(blank=True, default='', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='wallet_transactions_created', to=settings.AUTH_USER_MODEL)),
                ('wallet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='service_requests.customerwallet')),
            ],
            options={
                'db_table': 'service_requests_wallet_transaction',
                'ordering': ['-created_at'],
            },
        ),
    ]
