from django.db import migrations

def backfill_customer_codes(apps, schema_editor):
    ServiceRequest = apps.get_model('service_requests', 'ServiceRequest')
    User = apps.get_model('accounts', 'User')

    updated = []
    for sr in ServiceRequest.objects.select_related('customer').all():
        if sr.customer and sr.customer.customer_id:
            sr.customer_code = sr.customer.customer_id
            updated.append(sr)
        elif sr.phone or sr.email:
            u = None
            if sr.phone:
                u = User.objects.filter(phone=sr.phone).first() or User.objects.filter(mobile_number=sr.phone).first()
            if not u and sr.email:
                u = User.objects.filter(email=sr.email).first()
            if u and u.customer_id:
                sr.customer_code = u.customer_id
                if not sr.customer:
                    sr.customer = u
                updated.append(sr)

    if updated:
        ServiceRequest.objects.bulk_update(updated, ['customer_code', 'customer'], batch_size=200)

def noop(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0047_servicerequest_customer_code'),
        ('accounts', '0021_populate_customer_ids'),
    ]

    operations = [
        migrations.RunPython(backfill_customer_codes, noop),
    ]
