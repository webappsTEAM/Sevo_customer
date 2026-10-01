from django.test import TestCase
from service_requests.services.cargo_fitment import resolve_cargo_payload


def _entry(**kw):
    e = {"is_custom": True, "name": "Handmade clay pots", "quantity": 4, "weight_kg": "6", "cft": "2.5"}
    e.update(kw)
    return e


class UnlistedGoodsTests(TestCase):
    def test_valid_unlisted_goods_counted_in_totals(self):
        r = resolve_cargo_payload(cargo_items=[_entry()], city="hosur")
        self.assertTrue(r["is_valid"], r)
        self.assertEqual(str(r["total_weight_kg"]).split(".")[0], "24")
        self.assertEqual(r["items"][0]["category"], "Other / Not listed")

    def test_missing_or_bad_weight_volume_rejected(self):
        for bad in ({"weight_kg": None}, {"weight_kg": "0"}, {"weight_kg": "-3"}, {"cft": "abc"},
                    {"cft": "0"}, {"weight_kg": "NaN"}, {"weight_kg": "9999999"}, {"name": ""}):
            r = resolve_cargo_payload(cargo_items=[_entry(**bad)], city="hosur")
            self.assertFalse(r["is_valid"], bad)

    def test_prohibited_description_rejected(self):
        r = resolve_cargo_payload(cargo_items=[_entry(name="diwali fireworks crackers")], city="hosur")
        self.assertFalse(r["is_valid"])

    def test_without_flag_unknown_item_still_rejected(self):
        r = resolve_cargo_payload(cargo_items=[{"name": "mystery", "quantity": 1, "weight_kg": 5, "cft": 1}], city="hosur")
        self.assertFalse(r["is_valid"])

    def test_quantity_rules_still_apply(self):
        for q in (0, -1, 100000):
            r = resolve_cargo_payload(cargo_items=[_entry(quantity=q)], city="hosur")
            self.assertFalse(r["is_valid"], q)


class OtherCategoryNameAccepted(TestCase):
    def test_other_not_listed_category_is_not_unknown(self):
        for slug in ("Other / Not listed", "other-not-listed"):
            r = resolve_cargo_payload(cargo_items=[_entry()], goods_category_slug=slug, city="hosur")
            self.assertTrue(r["is_valid"], (slug, r["validation_errors"]))


class CustomNameSanitizedTests(TestCase):
    def test_markup_stripped_from_name(self):
        r = resolve_cargo_payload(cargo_items=[_entry(name="<b>pots</b> <script>x</script>\x00")], city="hosur")
        self.assertTrue(r["is_valid"], r)
        n = r["items"][0]["name"]
        self.assertNotIn("<", n); self.assertNotIn(">", n); self.assertNotIn("\x00", n)
