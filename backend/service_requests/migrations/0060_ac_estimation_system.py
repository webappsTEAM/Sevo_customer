import inspect
import django.db.models.deletion
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


def _check_constraint(expr, name):
    if "condition" in inspect.signature(models.CheckConstraint.__init__).parameters:
        return models.CheckConstraint(condition=expr, name=name)
    return models.CheckConstraint(check=expr, name=name)


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0011_alter_company_data_region_and_more'),
        ('logistics', '0004_alter_servicetier_duration'),
        ('service_requests', '0059_merge_20260902_1200'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Estimation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ac_type', models.CharField(help_text='AC unit type: SPLIT, WINDOW, CASSETTE, TOWER, OTHER', max_length=50)),
                ('ac_brand', models.CharField(help_text='e.g. LG, Daikin, Samsung', max_length=100)),
                ('ac_capacity', models.CharField(help_text='e.g. 1_TON, 1.5_TON, 2_TON, OTHER', max_length=50)),
                ('ac_quantity', models.PositiveSmallIntegerField(default=1, help_text='Number of AC units')),
                ('customer_symptom', models.TextField(help_text='Customer reported issue description')),
                ('customer_notes', models.TextField(blank=True, default='', help_text='Optional customer instructions or notes')),
                ('status', models.CharField(choices=[('REQUESTED', 'Requested'), ('VENDOR_CONFIRMED', 'Vendor Confirmed'), ('TECHNICIAN_ASSIGNED', 'Technician Assigned'), ('TECHNICIAN_ON_THE_WAY', 'Technician On The Way'), ('TECHNICIAN_ARRIVED', 'Technician Arrived'), ('INSPECTION_IN_PROGRESS', 'Inspection In Progress'), ('INSPECTION_COMPLETED', 'Inspection Completed'), ('QUOTATION_SENT', 'Quotation Sent'), ('CUSTOMER_APPROVED', 'Customer Approved'), ('CUSTOMER_REJECTED', 'Customer Rejected'), ('CONVERTED_TO_SERVICE', 'Converted to Service'), ('CLOSED', 'Closed'), ('CANCELLED', 'Cancelled')], db_index=True, default='REQUESTED', max_length=30)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='EstimationFee',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, default=Decimal('199.00'), help_text='Authoritative backend fee (default ₹199)', max_digits=10)),
                ('currency', models.CharField(default='INR', max_length=10)),
                ('status', models.CharField(choices=[('NOT_REQUIRED', 'Not Required'), ('PENDING', 'Pending'), ('COLLECTED', 'Collected'), ('WAIVED', 'Waived'), ('FAILED', 'Failed'), ('REFUNDED', 'Refunded')], db_index=True, default='PENDING', max_length=20)),
                ('payment_reference', models.CharField(blank=True, default='', max_length=100)),
                ('payment_method', models.CharField(blank=True, default='', max_length=50)),
                ('collected_at', models.DateTimeField(blank=True, null=True)),
                ('waived_at', models.DateTimeField(blank=True, null=True)),
                ('waived_reason', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='EstimationQuotation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version', models.PositiveSmallIntegerField(default=1)),
                ('quote_ref', models.CharField(db_index=True, max_length=100, unique=True)),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('SENT', 'Sent to Customer'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('SUPERSEDED', 'Superseded'), ('EXPIRED', 'Expired'), ('CANCELLED', 'Cancelled')], db_index=True, default='DRAFT', max_length=20)),
                ('vendor_id', models.CharField(blank=True, default='', max_length=100)),
                ('technician_id', models.CharField(blank=True, default='', max_length=100)),
                ('subtotal', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('total_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('currency', models.CharField(default='INR', max_length=10)),
                ('notes', models.TextField(blank=True, default='')),
                ('valid_until', models.DateField(blank=True, null=True)),
                ('customer_approved_at', models.DateTimeField(blank=True, null=True)),
                ('customer_rejected_at', models.DateTimeField(blank=True, null=True)),
                ('rejection_reason', models.CharField(blank=True, choices=[('PRICE_TOO_HIGH', 'Price Too High'), ('WILL_DO_LATER', 'Will Do Later'), ('FOUND_ALTERNATIVE', 'Found Alternative'), ('OTHER', 'Other')], default='', max_length=30)),
                ('rejection_note', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['estimation', '-version'],
            },
        ),
        migrations.CreateModel(
            name='EstimationQuotationItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('catalog_service_id', models.CharField(blank=True, default='', help_text='Catalog service or package ID', max_length=100)),
                ('service_name', models.CharField(help_text='Snapshot of service name', max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('quantity', models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=10)),
                ('unit', models.CharField(blank=True, default='job', max_length=50)),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('tax_rate', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=5)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('line_total', models.DecimalField(decimal_places=2, max_digits=12)),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['sort_order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='EventOutbox',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True)),
                ('aggregate_type', models.CharField(db_index=True, help_text='e.g. ServiceRequest, Estimation', max_length=50)),
                ('aggregate_id', models.CharField(db_index=True, help_text='e.g. SR-0001, EST-0001', max_length=100)),
                ('aggregate_version', models.PositiveIntegerField(default=1, help_text='Monotonic version for event ordering')),
                ('event_type', models.CharField(db_index=True, help_text='e.g. estimation.created, quotation.approved', max_length=100)),
                ('payload', models.JSONField(default=dict)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PUBLISHED', 'Published'), ('FAILED', 'Failed'), ('IGNORED', 'Ignored')], db_index=True, default='PENDING', max_length=20)),
                ('retry_count', models.PositiveSmallIntegerField(default=0)),
                ('last_error', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('published_at', models.DateTimeField(blank=True, db_index=True, null=True)),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='Inspection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('technician_external_id', models.CharField(blank=True, default='', help_text='Technician identifier', max_length=100)),
                ('technician_name', models.CharField(blank=True, default='', max_length=150)),
                ('technician_phone', models.CharField(blank=True, default='', max_length=30)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], db_index=True, default='PENDING', max_length=20)),
                ('diagnosis', models.TextField(blank=True, default='', help_text='Overall technician diagnosis summary')),
                ('notes', models.TextField(blank=True, default='', help_text='Internal notes from technician')),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='InspectionFinding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('finding_type', models.CharField(help_text='Finding category or issue type, e.g. Gas Leakage, Coil Cleaning, Electrical', max_length=100)),
                ('title', models.CharField(max_length=255)),
                ('diagnosis', models.TextField(blank=True, default='')),
                ('severity', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=10)),
                ('description', models.TextField(blank=True, default='')),
                ('recommended_action', models.TextField(blank=True, default='')),
                ('quantity', models.DecimalField(decimal_places=2, default=Decimal('1.00'), max_digits=10)),
                ('unit', models.CharField(blank=True, default='unit', max_length=50)),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['sort_order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='InspectionPhoto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('photo', models.ImageField(upload_to='service_requests/inspection_photos/')),
                ('caption', models.CharField(blank=True, default='', max_length=255)),
                ('uploaded_by', models.CharField(blank=True, default='', max_length=100)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['uploaded_at'],
            },
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='idempotency_key',
            field=models.CharField(blank=True, db_index=True, default=None, help_text='Client-supplied idempotency key to prevent duplicate bookings', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='job_type',
            field=models.CharField(choices=[('SERVICE', 'Service'), ('ESTIMATION', 'Estimation'), ('CHANGE_REQUEST', 'Change Request (Post-Estimation)')], db_index=True, default='SERVICE', help_text='High-level job classification: SERVICE, ESTIMATION, or CHANGE_REQUEST', max_length=20),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='vendor_confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='vendor_id',
            field=models.CharField(blank=True, default='', help_text='Opaque vendor identifier', max_length=100),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='vendor_name',
            field=models.CharField(blank=True, default='', help_text='Vendor display name snapshot', max_length=255),
        ),
        migrations.AlterField(
            model_name='servicerequest',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('new_request', 'New Request'), ('unassigned', 'Unassigned'), ('pending_payment', 'Pending Payment'), ('waiting_for_payment', 'Waiting for Payment'), ('confirmed', 'Confirmed'), ('reviewed', 'Reviewed'), ('assigned', 'Assigned'), ('received', 'Received'), ('accepted', 'Accepted'), ('on_the_way', 'On The Way'), ('arrived', 'Arrived'), ('in_progress', 'In Progress'), ('proof_submitted', 'Proof Submitted'), ('completed', 'Completed'), ('awaiting_verification', 'Awaiting Verification'), ('verified', 'Verified'), ('feedback_pending', 'Feedback Pending'), ('feedback_received', 'Feedback Received'), ('closed', 'Closed'), ('rejected', 'Rejected'), ('cancelled', 'Cancelled'), ('rescheduled', 'Rescheduled'), ('rework_requested', 'Rework Requested'), ('unable_to_complete', 'Unable to Complete'), ('follow_up_required', 'Follow-up Required'), ('requested', 'Requested'), ('vendor_confirmed', 'Vendor Confirmed'), ('technician_assigned', 'Technician Assigned'), ('technician_on_the_way', 'Technician On The Way'), ('technician_arrived', 'Technician Arrived'), ('inspection_in_progress', 'Inspection In Progress'), ('inspection_completed', 'Inspection Completed'), ('quotation_sent', 'Quotation Sent'), ('customer_approved', 'Customer Approved'), ('customer_rejected', 'Customer Rejected'), ('estimation_closed', 'Estimation Closed')], default='new_request', max_length=30),
        ),
        migrations.AddIndex(
            model_name='servicerequest',
            index=models.Index(fields=['job_type', 'status'], name='service_req_job_typ_6bd73d_idx'),
        ),
        migrations.AddIndex(
            model_name='servicerequest',
            index=models.Index(fields=['job_type', 'created_at'], name='service_req_job_typ_4f9cb8_idx'),
        ),
        migrations.AddConstraint(
            model_name='servicerequest',
            constraint=models.UniqueConstraint(condition=models.Q(('idempotency_key__isnull', False), models.Q(('idempotency_key', ''), _negated=True)), fields=('customer', 'idempotency_key'), name='unique_customer_idempotency_key'),
        ),
        migrations.AddField(
            model_name='estimation',
            name='service_request',
            field=models.OneToOneField(help_text='The parent authoritative ServiceRequest booking', on_delete=django.db.models.deletion.CASCADE, related_name='estimation', to='service_requests.servicerequest'),
        ),
        migrations.AddField(
            model_name='estimationfee',
            name='estimation',
            field=models.OneToOneField(help_text='The estimation this fee applies to', on_delete=django.db.models.deletion.CASCADE, related_name='fee', to='service_requests.estimation'),
        ),
        migrations.AddField(
            model_name='estimationfee',
            name='waived_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='waived_estimation_fees', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='estimationquotation',
            name='estimation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quotations', to='service_requests.estimation'),
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='quotation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='service_requests.estimationquotation'),
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='service',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quotation_items', to='service_requests.service'),
        ),
        migrations.AddIndex(
            model_name='eventoutbox',
            index=models.Index(fields=['status', 'created_at'], name='service_req_status_e00c6a_idx'),
        ),
        migrations.AddIndex(
            model_name='eventoutbox',
            index=models.Index(fields=['aggregate_type', 'aggregate_id'], name='service_req_aggrega_748174_idx'),
        ),
        migrations.AddIndex(
            model_name='eventoutbox',
            index=models.Index(fields=['event_type'], name='service_req_event_t_dad826_idx'),
        ),
        migrations.AddField(
            model_name='inspection',
            name='estimation',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='inspection', to='service_requests.estimation'),
        ),
        migrations.AddField(
            model_name='inspection',
            name='technician',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inspections', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='inspectionfinding',
            name='inspection',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='findings', to='service_requests.inspection'),
        ),
        migrations.AddField(
            model_name='inspectionfinding',
            name='service',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inspection_findings', to='service_requests.service'),
        ),
        migrations.AddField(
            model_name='inspectionphoto',
            name='finding',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='photos', to='service_requests.inspectionfinding'),
        ),
        migrations.AddField(
            model_name='inspectionphoto',
            name='inspection',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='photos', to='service_requests.inspection'),
        ),
        migrations.AddIndex(
            model_name='estimation',
            index=models.Index(fields=['status'], name='service_req_status_7c771e_idx'),
        ),
        migrations.AddIndex(
            model_name='estimation',
            index=models.Index(fields=['created_at'], name='service_req_created_5f82e8_idx'),
        ),
        migrations.AddConstraint(
            model_name='estimation',
            constraint=_check_constraint(models.Q(('ac_quantity__gte', 1)), name='check_estimation_ac_quantity_gte_1'),
        ),
        migrations.AddConstraint(
            model_name='estimationfee',
            constraint=_check_constraint(models.Q(('amount__gte', Decimal('0.00'))), name='check_estimation_fee_amount_gte_0'),
        ),
        migrations.AddIndex(
            model_name='estimationquotation',
            index=models.Index(fields=['estimation', 'status'], name='service_req_estimat_90d883_idx'),
        ),
        migrations.AddIndex(
            model_name='estimationquotation',
            index=models.Index(fields=['estimation', 'version'], name='service_req_estimat_e39827_idx'),
        ),
        migrations.AddIndex(
            model_name='estimationquotation',
            index=models.Index(fields=['created_at'], name='service_req_created_ffa5cd_idx'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotation',
            constraint=models.UniqueConstraint(fields=('estimation', 'version'), name='unique_estimation_quotation_version'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotation',
            constraint=_check_constraint(models.Q(('subtotal__gte', Decimal('0.00'))), name='check_quotation_subtotal_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotation',
            constraint=_check_constraint(models.Q(('tax_amount__gte', Decimal('0.00'))), name='check_quotation_tax_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotation',
            constraint=_check_constraint(models.Q(('discount_amount__gte', Decimal('0.00'))), name='check_quotation_discount_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotation',
            constraint=_check_constraint(models.Q(('total_amount__gte', Decimal('0.00'))), name='check_quotation_total_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotation',
            constraint=_check_constraint(models.Q(('version__gte', 1)), name='check_quotation_version_gte_1'),
        ),
        migrations.AddIndex(
            model_name='estimationquotationitem',
            index=models.Index(fields=['quotation'], name='service_req_quotati_97f679_idx'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotationitem',
            constraint=_check_constraint(models.Q(('quantity__gt', Decimal('0.00'))), name='check_quote_item_quantity_gt_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotationitem',
            constraint=_check_constraint(models.Q(('unit_price__gte', Decimal('0.00'))), name='check_quote_item_unit_price_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotationitem',
            constraint=_check_constraint(models.Q(('tax_amount__gte', Decimal('0.00'))), name='check_quote_item_tax_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotationitem',
            constraint=_check_constraint(models.Q(('discount_amount__gte', Decimal('0.00'))), name='check_quote_item_discount_gte_0'),
        ),
        migrations.AddConstraint(
            model_name='estimationquotationitem',
            constraint=_check_constraint(models.Q(('line_total__gte', Decimal('0.00'))), name='check_quote_item_line_total_gte_0'),
        ),
        migrations.AddIndex(
            model_name='inspection',
            index=models.Index(fields=['status'], name='service_req_status_b6ca18_idx'),
        ),
        migrations.AddIndex(
            model_name='inspectionfinding',
            index=models.Index(fields=['inspection'], name='service_req_inspect_54f3b2_idx'),
        ),
        migrations.AddIndex(
            model_name='inspectionphoto',
            index=models.Index(fields=['inspection'], name='service_req_inspect_8bd888_idx'),
        ),
        migrations.AddIndex(
            model_name='inspectionphoto',
            index=models.Index(fields=['finding'], name='service_req_finding_ba429b_idx'),
        ),
    ]
