from django.db import migrations, models

# Porter's publicly documented prohibited-items list (customer Terms of Service),
# seeded as ordinary Admin-editable rows. Nothing here is a hidden code rule.
SEED = [
    ("Livestock, pets & animals", ["livestock", "live animal", "live animals", "pet animal", "pet animals", "cattle"], True),
    ("Dry ice", ["dry ice"], True),
    ("Human body parts", ["human body part", "human body parts", "human organ", "human organs"], True),
    ("Precious jewellery, currency, coins, stones & gems", [
        "jewellery", "jewelry", "precious stone", "precious stones", "gemstone", "gemstones", "gems",
        "currency", "currency notes", "coins", "bullion"], True),
    ("Gambling devices & lottery tickets", ["gambling", "lottery", "lottery ticket", "lottery tickets"], True),
    ("Cigarettes & alcohol", ["cigarette", "cigarettes", "alcohol", "liquor"], True),
    ("Pornographic materials", ["pornographic", "porn"], True),
    ("Secure documents", [
        "passport", "passports", "aadhaar", "aadhar", "cheque", "cheques", "cheque book",
        "credit card", "debit card", "bank statement"], True),
    ("Fire extinguishers", ["fire extinguisher", "fire extinguishers"], False),
    ("Flammables", ["flammable", "flammables", "inflammable", "lighter fluid"], True),
    ("Dangerous, hazardous & illegal goods", [
        "dangerous goods", "hazardous goods", "illegal goods"], True),
]


def seed(apps, schema_editor):
    Rule = apps.get_model("logistics", "ProhibitedGoodsRule")
    for label, kws, pm in SEED:
        Rule.objects.get_or_create(
            label=label,
            defaults={
                "keywords": "\n".join(kws),
                "message": f"{label} cannot be booked on sevo Goods & Transport.",
                "applies_to_packers_movers": pm,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0020_servicetier_max_additional_stops"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProhibitedGoodsRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=80, unique=True)),
                ("keywords", models.TextField(help_text="One keyword or phrase per line. Whole-word, case-insensitive.")),
                ("message", models.CharField(blank=True, default="", max_length=255)),
                ("applies_to_packers_movers", models.BooleanField(
                    default=True,
                    help_text="Untick to let household Packers & Movers inventories through while still blocking it on Goods Transport.")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["label"]},
        ),
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
