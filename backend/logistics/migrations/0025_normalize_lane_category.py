from django.db import migrations

ALIASES = {
    "goods_transport_truck": "truck",
    "goods_transport_two_wheeler": "two_wheeler",
    "goods_transport_2w": "two_wheeler",
}


def forwards(apps, schema_editor):
    # Lanes saved by the old admin form carried ServiceRequest category names
    # the fare engine / PTL never match; map them to LogisticsCategory values.
    Lane = apps.get_model("logistics", "Lane")
    for old, new in ALIASES.items():
        Lane.objects.filter(category=old).update(category=new)


class Migration(migrations.Migration):
    dependencies = [("logistics", "0024_light_ptl")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
