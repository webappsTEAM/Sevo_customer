from django.db import migrations

CATEGORY_PREFIX_MAP = {
    "home_services": "HM",
    "home": "HM",
    "plumbing": "PL",
    "electrical": "EL",
    "electrical_repair": "EL",
    "carpentry": "CP",
    "hvac": "AC",
    "ac_repair": "AC",
    "ac_service": "AC",
    "air_conditioner": "AC",
    "appliance_repair": "AC",
    "appliances": "AC",
    "appliance": "AC",
    "washing_machine": "AC",
    "refrigerator": "AC",
    "tv_display": "AC",
    "cleaning": "CL",
    "deep_cleaning": "CL",
    "deep-cleaning": "CL",
    "kitchen_cleaning": "KC",
    "sofa_cleaning": "SC",
    "pest_control": "PC",
    "pest-control": "PC",
    "painting": "PA",
    "security": "SC",
    "mason": "MA",
    "general": "GM",
    "logistics": "LG",
    "goods_transport": "GT",
    "goods_transport_truck": "GT",
    "goods_transport_two_wheeler": "GT",
    "truck": "GT",
    "packers_movers": "PM",
}

def get_prefix(cat):
    c = str(cat or '').strip().lower().replace('-', '_').replace(' ', '_')
    return CATEGORY_PREFIX_MAP.get(c) or 'HM'

def convert_legacy_service_request_ids(apps, schema_editor):
    ServiceRequest = apps.get_model('service_requests', 'ServiceRequest')
    
    existing_ids = set(ServiceRequest.objects.exclude(request_id__startswith='SR').values_list('request_id', flat=True))
    assigned = set(existing_ids)
    
    to_update = []
    for sr in ServiceRequest.objects.filter(request_id__startswith='SR').order_by('id'):
        prefix = get_prefix(sr.service_category)
        num_part = ''.join(filter(str.isdigit, sr.request_id)) or str(sr.id)
        n = int(num_part) if num_part.isdigit() else sr.id
        new_id = f'{prefix}{str(n).zfill(4)}'
        
        while new_id in assigned:
            n += 1
            new_id = f'{prefix}{str(n).zfill(4)}'
        
        assigned.add(new_id)
        sr.request_id = new_id
        to_update.append(sr)
        
    if to_update:
        ServiceRequest.objects.bulk_update(to_update, ['request_id'], batch_size=500)

def noop(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0048_populate_servicerequest_customer_codes'),
    ]

    operations = [
        migrations.RunPython(convert_legacy_service_request_ids, noop),
    ]
