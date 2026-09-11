from django.db import migrations


def relax_legacy_columns(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == "postgresql":
        columns_to_relax = [
            ("service_requests_servicerequest", "job_type", "SET DEFAULT 'SERVICE'"),
            ("service_requests_servicerequest", "vendor_id", "SET DEFAULT ''"),
            ("service_requests_servicerequest", "vendor_name", "SET DEFAULT ''"),
            ("service_requests_servicerequest", "idempotency_key", None),
            ("service_requests_servicerequest", "rework_attribution", None),
            ("service_requests_servicerequest", "recurring_plan_id", None),
            ("service_requests_servicerequest", "rework_notes", None),
            ("service_requests_servicerequest", "assigned_employee_id", None),
            ("service_requests_servicerequest", "payment_collected_by_id", None),
            ("service_requests_servicerequest", "vendor_confirmed_at", None),
            ("service_requests_servicerequest", "drop_contact_name", None),
            ("service_requests_servicerequest", "drop_contact_phone", None),
            ("service_requests_servicerequest", "drop_contact_email", None),
            ("service_requests_servicerequest", "declared_value", None),
            ("service_requests_servicerequest", "consignee_relationship", None),
            ("service_requests_servicerequest", "insurance_opted_in", None),
            ("service_requests_servicerequest", "insurance_premium", None),
            ("service_requests_servicerequest", "insurance_liability_cap", None),
            ("service_requests_servicerequest", "logistics_leg", None),
            ("service_requests_servicerequest", "logistics_leg_updated_at", None),
            ("service_requests_servicerequest", "logistics_leg_history", None),
            ("service_requests_workextensionitem", "proof_images", "SET DEFAULT '[]'::jsonb"),
            ("service_requests_workextensionitem", "technician_notes", "SET DEFAULT ''"),
            ("service_requests_workextensionitem", "unit", "SET DEFAULT ''"),
            ("service_requests_workextensionitem", "unit_price", "SET DEFAULT 0.00"),
            ("service_requests_servicefeedback", "technician_id", "SET DEFAULT ''"),
            ("service_requests_servicefeedback", "technician_name_snapshot", "SET DEFAULT ''"),
            ("service_requests_catalogcategory", "flow_type", "SET DEFAULT 'standard'"),
        ]
        with connection.cursor() as cursor:
            for table, col, default_clause in columns_to_relax:
                cursor.execute(
                    """
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s AND column_name = %s;
                    """,
                    [table, col],
                )
                if cursor.fetchone():
                    cursor.execute(f"ALTER TABLE {table} ALTER COLUMN {col} DROP NOT NULL;")
                    if default_clause:
                        cursor.execute(f"ALTER TABLE {table} ALTER COLUMN {col} {default_clause};")


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0058_alter_addon_options_addon_addon_type_and_more"),
        ("service_requests", "0058_recipeingredient_is_catalog_vegetable_and_more"),
    ]

    operations = [
        migrations.RunPython(
            relax_legacy_columns,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
