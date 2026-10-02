"""Regression: plural / spaced spellings of prohibited pyrotechnics slipped the gate ("firecrackers" was allowed
because the pattern only matched the exact word "firecracker")."""
from django.test import TestCase
from service_requests.services.prohibited_goods import validate_cargo_safety


class PluralFormsTests(TestCase):
    def _ok(self, text):
        return validate_cargo_safety(description=text, service_category="goods_transport_truck")[0]

    def test_plurals_and_spacing_are_blocked(self):
        for t in ("firecrackers", "box of FireCrackers", "fire crackers", "fire cracker", "detonators", "blasting caps",
                  "firework", "pyrotechnics"):
            self.assertFalse(self._ok(t), t)

    def test_innocent_text_still_allowed(self):
        for t in ("gunny bags of rice", "office chairs", "kitchen knife set"):
            self.assertTrue(self._ok(t), t)
