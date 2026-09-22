# Hand-written migration -- see 0055_gt_a03_consignee_fields.py for why.
# Verified by loading via importlib against a locally-installed Django to
# confirm the Migration class parses and matches the model definitions --
# not verified against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# GT-C-03: adds insurance opt-in/premium/liability_cap to ServiceRequest,
# plus InsuranceClaim and InsuranceClaimAttachment for the damage-claim path.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('service_requests', '0055_gt_a03_consignee_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='insurance_opted_in',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='insurance_premium',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='insurance_liability_cap',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.CreateModel(
            name='InsuranceClaimAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='insurance_claims/attachments/')),
                ('original_name', models.CharField(blank=True, max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='insurance_claim_attachments', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='InsuranceClaim',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.TextField()),
                ('claimed_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('approved_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('status', models.CharField(choices=[('OPEN', 'Open'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('PAID', 'Paid')], default='OPEN', max_length=10)),
                ('resolution_notes', models.TextField(blank=True, default='')),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('attachments', models.ManyToManyField(blank=True, related_name='claims', to='service_requests.insuranceclaimattachment')),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='insurance_claims', to='service_requests.servicerequest')),
                ('filed_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='insurance_claims_filed', to=settings.AUTH_USER_MODEL)),
                ('resolved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='insurance_claims_resolved', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'service_requests_insurance_claim',
                'ordering': ['-created_at'],
            },
        ),
    ]
