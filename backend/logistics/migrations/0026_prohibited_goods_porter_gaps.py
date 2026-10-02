from django.db import migrations

# Porter's part-load-service page (porter.in/part-load-service) lists these refused/
# restricted categories: dangerous, explosives, hazardous, inflammable, combustible,
# contraband, prohibited goods, bullion, gems, currency notes.
#
# Round-2026-09-29 audit cross-checked the Admin-editable ProhibitedGoodsRule rows
# (seeded in 0021_prohibitedgoodsrule.py) against that list. Most categories are
# already covered by existing seeded keywords ("dangerous"/"hazardous" ->
# "Dangerous, hazardous & illegal goods", "inflammable" -> "Flammables", "bullion" /
# "gems" / "currency notes" -> "Precious jewellery, currency, coins, stones & gems").
# Three Porter-named terms had no keyword anywhere in the table: "explosives",
# "combustible"/"combustibles", and "contraband". This migration fills only those
# missing keywords onto the closest existing, already-seeded rows -- it never creates
# a new row and never touches any other field (message, applies_to_packers_movers,
# is_active) on the rows it edits, and it is a no-op if a term is already present
# (e.g. because Admin already added it by hand).

ADDITIONS = {
    "Dangerous, hazardous & illegal goods": ["explosive", "explosives", "contraband"],
    "Flammables": ["combustible", "combustibles"],
}


def add_missing_keywords(apps, schema_editor):
    Rule = apps.get_model("logistics", "ProhibitedGoodsRule")
    for label, new_terms in ADDITIONS.items():
        rule = Rule.objects.filter(label=label).first()
        if rule is None:
            # Row was renamed/removed by Admin since seeding; do not recreate it.
            continue
        existing_lines = [
            line.strip() for line in (rule.keywords or "").splitlines() if line.strip()
        ]
        existing_lower = {line.lower() for line in existing_lines}
        added = False
        for term in new_terms:
            if term.lower() not in existing_lower:
                existing_lines.append(term)
                existing_lower.add(term.lower())
                added = True
        if added:
            rule.keywords = "\n".join(existing_lines)
            rule.save(update_fields=["keywords", "updated_at"])


def noop_reverse(apps, schema_editor):
    # Intentionally not removing keywords on reverse: Admin may have relied on
    # them, and a keyword addition is not schema-reversible in a safe way.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0025_normalize_lane_category"),
    ]

    operations = [
        migrations.RunPython(add_missing_keywords, noop_reverse),
    ]
