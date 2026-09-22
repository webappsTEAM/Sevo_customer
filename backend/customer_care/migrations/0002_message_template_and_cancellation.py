import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customer_care', '0001_initial'),
        ('service_requests', '0027_rename_service_req_entity__idx_service_req_entity__1965a7_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='careagentprofile',
            name='care_role',
            field=models.CharField(choices=[('care_executive', 'Care Executive'), ('ops_manager', 'Ops Manager'), ('admin', 'Admin Support')], max_length=30),
        ),
        migrations.CreateModel(
            name='MessageTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('channel', models.CharField(choices=[('call', 'Phone Call'), ('sms', 'SMS Message'), ('whatsapp', 'WhatsApp'), ('email', 'Email'), ('in_person', 'In Person')], max_length=20)),
                ('category', models.CharField(choices=[('general', 'General Support'), ('billing', 'Billing & Payments'), ('technical', 'Technical Issue'), ('scheduling', 'Scheduling & Dispatch'), ('feedback', 'Customer Feedback'), ('other', 'Other')], default='general', max_length=30)),
                ('body', models.TextField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='CancellationRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(max_length=50)),
                ('reason_note', models.TextField(blank=True, default='')),
                ('retention_offered', models.BooleanField(default=False)),
                ('retention_outcome', models.CharField(blank=True, default='', max_length=50)),
                ('status', models.CharField(choices=[('pending', 'Pending Approval'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('completed', 'Completed')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('decided_at', models.DateTimeField(blank=True, null=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_cancellations', to=settings.AUTH_USER_MODEL)),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='service_requests.servicerequest')),
                ('refund_request', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='service_requests.refundrequest')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requested_cancellations', to=settings.AUTH_USER_MODEL)),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cancellation_requests', to='customer_care.customercareticket')),
            ],
        ),
    ]
