from django.db import migrations, models
from django.utils.text import slugify


def forwards(apps, schema_editor):
    CatalogCategory = apps.get_model('service_requests', 'CatalogCategory')
    Service = apps.get_model('service_requests', 'Service')
    Package = apps.get_model('service_requests', 'Package')

    for category in CatalogCategory.objects.all():
        # One bridge Service per existing category, reusing the category's
        # own slug (already unique) so the bridge Service.slug is guaranteed
        # unique too. Packages that used to hang directly off this category
        # become children of this single Service — admins can split it into
        # more specific Services later through the new UI.
        bridge_service = Service.objects.create(
            category=category,
            name=category.name,
            slug=category.slug,
            description=category.description,
            image=category.image,
            is_active=True,
        )
        for pkg in Package.objects.filter(category_id=category.id):
            pkg.service_id = bridge_service.id
            base_slug = slugify(pkg.name) or "package"
            pkg.slug = f"{base_slug}-{pkg.id}"
            pkg.save(update_fields=["service", "slug"])


def backwards(apps, schema_editor):
    Service = apps.get_model('service_requests', 'Service')
    Package = apps.get_model('service_requests', 'Package')
    Package.objects.update(service=None, slug="")
    Service.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0022_service_model_and_package_rename'),
    ]

    operations = [
        # Package.slug needs to exist (nullable/blank) before this data
        # migration can populate it — tightened to non-null/unique in 0024
        # once every row has a real value. db_index=False here on purpose:
        # SlugField defaults to db_index=True, which would make Django defer
        # a CREATE INDEX to the end of this migration's transaction — but
        # the RunPython step below updates Package.service_id (a FK write),
        # which queues a deferred trigger on this same table, and Postgres
        # refuses CREATE INDEX while trigger events are still pending in the
        # same transaction ("cannot CREATE INDEX ... because it has pending
        # trigger events"). No index is needed on this transient value
        # anyway — 0024's AlterField to unique=True creates the real index
        # once the backfill has already committed in its own transaction.
        migrations.AddField(
            model_name='package',
            name='slug',
            field=models.SlugField(blank=True, default='', max_length=50, db_index=False),
        ),
        migrations.RunPython(forwards, backwards),
    ]
