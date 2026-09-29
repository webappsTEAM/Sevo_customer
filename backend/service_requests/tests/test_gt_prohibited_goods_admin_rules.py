"""Porter-documented prohibited items are Admin-managed rows, enforced server-side."""
from django.test import TestCase

from logistics.models import ProhibitedGoodsRule
from service_requests.services.prohibited_goods import validate_cargo_safety

TRUCK = "goods_transport_truck"
PM = "packers_movers"


class AdminProhibitedRulesTests(TestCase):
    def check(self, text, cat=TRUCK):
        return validate_cargo_safety(description=text, service_category=cat)

    def test_seeded_porter_items_blocked(self):
        for text in ["live cattle", "box of dry ice", "cartons of cigarettes", "lottery tickets",
                     "passport and cheque book", "gold jewellery", "bottles of liquor", "flammable paint"]:
            ok, msg, code = self.check(text)
            self.assertFalse(ok, text)
            self.assertEqual(code, "ADMIN_RULE", text)

    def test_ordinary_goods_and_word_boundaries_pass(self):
        for text in ["sofa and dining table", "carpets", "carpeted stairs mat", "coinstar machine parts", "cement bags"]:
            self.assertTrue(self.check(text)[0], text)

    def test_admin_can_add_disable_and_scope_rules(self):
        r = ProhibitedGoodsRule.objects.create(label="Glass panes", keywords="glass pane\nmirror")
        self.assertFalse(self.check("large mirror")[0])
        r.is_active = False
        r.save()
        self.assertTrue(self.check("large mirror")[0])
        ProhibitedGoodsRule.objects.filter(label="Fire extinguishers").update(is_active=True)
        self.assertFalse(self.check("fire extinguisher")[0])
        self.assertTrue(self.check("fire extinguisher", PM)[0])

    def test_pm_scope_flag(self):
        self.assertFalse(self.check("bottles of liquor", PM)[0])
        ProhibitedGoodsRule.objects.filter(label="Cigarettes & alcohol").update(applies_to_packers_movers=False)
        self.assertTrue(self.check("bottles of liquor", PM)[0])
        self.assertFalse(self.check("bottles of liquor", TRUCK)[0])

    def test_non_gt_categories_bypass(self):
        self.assertTrue(validate_cargo_safety(description="liquor", service_category="ac_repair")[0])
