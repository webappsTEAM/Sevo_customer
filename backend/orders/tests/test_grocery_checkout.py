"""
orders/tests/test_grocery_checkout.py

Phase 3 / Phase 7 coverage (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
adversarial tests for the hard-blocking grocery checkout path -- last-unit
depletion, partial-stock scenarios, and confirming nothing is created or
charged when stock reservation fails.
"""
from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package
from inventory.services import vegetable_stock_service
from inventory.models import VegetableStockMovement
from carts.models import Cart, CartItem, CartType, CartStatus
from orders.models import GroceryOrder, GroceryOrderItem
from vegetable_orders.models import VegetableOrder, VegetableOrderItem

User = get_user_model()


class GroceryCheckoutTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.customer = User.objects.create_user(
            username="grocery_customer", email="gc@gmail.com", phone="9876543210",
            password="Password123!", role="customer", company=self.company,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.customer)

        category = CatalogCategory.objects.create(name="Farm Produce", slug="farm-produce", is_active=True)
        service = Service.objects.create(category=category, name="Fresh Vegetables", slug="vegetables", is_active=True)
        self.pkg_tomato = Package.objects.create(
            service=service, name="Fresh Country Tomato", slug="fresh-country-tomato",
            base_price=Decimal("40.00"), duration="500g", status="ACTIVE",
        )
        self.pkg_potato = Package.objects.create(
            service=service, name="Organic Potato", slug="organic-potato",
            base_price=Decimal("35.00"), duration="1kg", status="ACTIVE",
        )

    def _add_to_cart(self, package, quantity):
        return self.client.post(
            "/api/carts/daily_essentials/items/",
            {"package_id": package.id, "quantity": quantity},
            format="json",
        )

    def test_checkout_succeeds_and_deducts_exact_stock(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)  # 1000g, pack=500g
        self._add_to_cart(self.pkg_tomato, 2)  # 2 packs * 500g = 1000g

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St, Hosur", "delivery_date": "2026-09-26", "delivery_slot": "Evening (6:00 PM – 8:00 PM)"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["data"]["status"], "PLACED")
        self.assertEqual(Decimal(res.data["data"]["items_subtotal"]), Decimal("80.00"))
        self.assertEqual(Decimal(res.data["data"]["delivery_fee"]), Decimal("15.00"))
        self.assertEqual(Decimal(res.data["data"]["small_cart_fee"]), Decimal("5.00"))
        self.assertEqual(Decimal(res.data["data"]["handling_fee"]), Decimal("2.00"))
        self.assertEqual(Decimal(res.data["data"]["total_amount"]), Decimal("102.00"))
        self.assertEqual(res.data["data"]["delivery_slot"], "Evening (6:00 PM – 8:00 PM)")

        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 0)

        order = VegetableOrder.objects.get(id=res.data["data"]["id"])
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.first().quantity_grams, 1000)

        # Cart is checked out, not reusable
        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS)
        self.assertEqual(cart.status, CartStatus.CHECKED_OUT)

    def test_checkout_on_exact_last_unit_succeeds(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 500, "g", self.company)  # exactly 1 pack
        self._add_to_cart(self.pkg_tomato, 1)

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 0)

    def test_checkout_hard_blocks_on_insufficient_stock_and_creates_nothing(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)  # 1000g available
        self._add_to_cart(self.pkg_tomato, 3)  # needs 1500g

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(
            res.data["message"],
            "This quantity is no longer available. Please reduce the quantity and try again.",
        )

        # Nothing created
        self.assertFalse(VegetableOrder.objects.exists())
        self.assertFalse(VegetableOrderItem.objects.exists())
        self.assertFalse(GroceryOrderItem.objects.exists())
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 1000)

        # Cart remains ACTIVE and untouched -- customer can retry
        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS)
        self.assertEqual(cart.status, CartStatus.ACTIVE)
        self.assertEqual(cart.items.count(), 1)

    def test_partial_stock_across_multiple_items_blocks_entire_checkout(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        vegetable_stock_service.add_stock(self.pkg_potato, 500, "g", self.company)  # not enough for 2 packs (2kg)

        self._add_to_cart(self.pkg_tomato, 1)   # fine: 500g of 10000g
        self._add_to_cart(self.pkg_potato, 2)   # needs 2000g, only 500g available

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        # Atomic rollback: tomato stock must remain untouched even though it had enough
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 10000)
        self.assertFalse(VegetableOrder.objects.exists())

    def test_checkout_with_empty_cart_rejected(self):
        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(VegetableOrder.objects.exists())

    def test_checkout_requires_delivery_address(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 1)

        res = self.client.post("/api/orders/grocery/checkout/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(VegetableOrder.objects.exists())

    def test_checkout_booking_ref_matches_order_number_on_stock_movement(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 1)

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        order_number = res.data["data"]["order_number"]
        movement = VegetableStockMovement.objects.filter(
            booking_ref=order_number, movement_type=VegetableStockMovement.MovementType.SOLD,
        ).first()
        self.assertIsNotNone(movement)

    def test_second_checkout_after_success_needs_new_active_cart(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 1)
        self.client.post("/api/orders/grocery/checkout/", {"delivery_address": "123 Market St"}, format="json")

        # No ACTIVE cart left -- a second checkout attempt is rejected as empty, not double-charged
        res = self.client.post("/api/orders/grocery/checkout/", {"delivery_address": "123 Market St"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(VegetableOrder.objects.count(), 1)

    def test_checkout_pricing_tier_mid_level_100_to_199(self):
        # 3 packs of tomato @ 40 = 120. Subtotal 120 -> Delivery ₹10, Small cart ₹0, Handling ₹2 -> Total ₹132
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 3)

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St", "tip_amount": 20},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data["data"]["items_subtotal"]), Decimal("120.00"))
        self.assertEqual(Decimal(res.data["data"]["delivery_fee"]), Decimal("10.00"))
        self.assertEqual(Decimal(res.data["data"]["small_cart_fee"]), Decimal("0.00"))
        self.assertEqual(Decimal(res.data["data"]["handling_fee"]), Decimal("2.00"))
        self.assertEqual(Decimal(res.data["data"]["tip_amount"]), Decimal("20.00"))
        self.assertEqual(Decimal(res.data["data"]["total_amount"]), Decimal("152.00"))

    def test_checkout_pricing_tier_free_delivery_200_plus(self):
        # 6 packs of tomato @ 40 = 240. Subtotal 240 -> Delivery ₹0, Small cart ₹0, Handling ₹2 -> Total ₹242
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 6)

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data["data"]["items_subtotal"]), Decimal("240.00"))
        self.assertEqual(Decimal(res.data["data"]["delivery_fee"]), Decimal("0.00"))
        self.assertEqual(Decimal(res.data["data"]["small_cart_fee"]), Decimal("0.00"))
        self.assertEqual(Decimal(res.data["data"]["handling_fee"]), Decimal("2.00"))
        self.assertEqual(Decimal(res.data["data"]["total_amount"]), Decimal("242.00"))

    def test_delivery_slots_endpoint_returns_all_seven_days(self):
        res = self.client.get("/api/vegetable-orders/slots/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])
        self.assertEqual(len(res.data["dates"]), 7)
        for d in res.data["dates"]:
            self.assertIn("day_name", d)
            self.assertIn("weekday", d)
            self.assertIn("slots", d)

    def test_weekday_template_disabling_slot_on_specific_weekday(self):
        from vegetable_orders.models import VegetableDeliverySlotConfig, VegetableWeekdaySlotConfig
        from django.utils import timezone
        import datetime

        # Ensure default templates exist
        self.client.get("/api/vegetable-orders/slots/")
        evening_slot = VegetableDeliverySlotConfig.objects.get(code="evening")

        # Find the weekday of the 3rd date in the 7-day window (days_ahead = 2)
        today = timezone.localdate()
        target_date = today + datetime.timedelta(days=2)
        target_weekday = int(target_date.strftime("%w"))

        # Disable evening slot for this target weekday
        wc = VegetableWeekdaySlotConfig.objects.get(weekday=target_weekday, slot_config=evening_slot)
        wc.is_enabled = False
        wc.save()

        res = self.client.get("/api/vegetable-orders/slots/")
        self.assertEqual(res.status_code, 200)
        day_entry = res.data["dates"][2]
        self.assertEqual(day_entry["date"], target_date.isoformat())

        evening_result = next((s for s in day_entry["slots"] if s["slot_config_id"] == evening_slot.id), None)
        self.assertIsNotNone(evening_result)
        self.assertFalse(evening_result["available"])
        self.assertTrue(evening_result["is_closed"])

    def test_date_override_full_day_closure(self):
        from vegetable_orders.models import VegetableSlotDateOverride
        from django.utils import timezone
        import datetime

        today = timezone.localdate()
        target_date = today + datetime.timedelta(days=3)

        # Create whole-day closure override
        VegetableSlotDateOverride.objects.create(
            date=target_date,
            slot_config=None,
            is_closed=True,
            reason="National Holiday Closure",
        )

        res = self.client.get("/api/vegetable-orders/slots/")
        self.assertEqual(res.status_code, 200)
        day_entry = res.data["dates"][3]
        self.assertEqual(day_entry["date"], target_date.isoformat())
        self.assertTrue(day_entry["is_closed"])
        self.assertEqual(day_entry["reason"], "National Holiday Closure")
        self.assertEqual(len(day_entry["slots"]), 0)

    def test_date_override_single_slot_closure(self):
        from vegetable_orders.models import VegetableDeliverySlotConfig, VegetableSlotDateOverride
        from django.utils import timezone
        import datetime

        self.client.get("/api/vegetable-orders/slots/")
        morning_slot = VegetableDeliverySlotConfig.objects.get(code="morning")

        today = timezone.localdate()
        target_date = today + datetime.timedelta(days=4)

        VegetableSlotDateOverride.objects.create(
            date=target_date,
            slot_config=morning_slot,
            is_closed=True,
            reason="Morning Maintenance",
        )

        res = self.client.get("/api/vegetable-orders/slots/")
        self.assertEqual(res.status_code, 200)
        day_entry = res.data["dates"][4]
        morning_result = next((s for s in day_entry["slots"] if s["slot_config_id"] == morning_slot.id), None)
        self.assertIsNotNone(morning_result)
        self.assertFalse(morning_result["available"])
        self.assertEqual(morning_result["reason"], "Morning Maintenance")

    def test_admin_slot_management_endpoints(self):
        # Authenticate as admin user
        admin_user = User.objects.create_user(
            username="admin_slot_user", email="asu@gmail.com", phone="9876500000",
            password="Password123!", role="admin", is_staff=True, is_superuser=True,
            company=self.company,
        )
        self.client.force_authenticate(user=admin_user)

        # 1. GET admin slots
        res_get = self.client.get("/api/vegetable-orders/admin/slots/")
        self.assertEqual(res_get.status_code, 200)
        self.assertTrue(res_get.data["success"])
        self.assertEqual(len(res_get.data["weekday_template"]), 7)

        # 2. POST save weekday template
        slot_id = res_get.data["slots"][0]["id"]
        res_post = self.client.post(
            "/api/vegetable-orders/admin/slots/",
            {
                "action": "save_weekday_template",
                "template": [
                    {
                        "weekday": 0,
                        "slot_config_id": slot_id,
                        "is_enabled": False,
                        "cutoff_time_override": "05:00",
                        "capacity": 50,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(res_post.status_code, 200)
        self.assertTrue(res_post.data["success"])

    def test_day_level_closure_surfaces_specific_reason_string(self):
        from vegetable_orders.models import VegetableDeliverySlotConfig, VegetableWeekdaySlotConfig, VegetableSlotDateOverride
        from django.utils import timezone
        import datetime

        self.client.get("/api/vegetable-orders/slots/")
        today = timezone.localdate()
        target_date = today + datetime.timedelta(days=3)

        # 1. Full day closure override
        VegetableSlotDateOverride.objects.create(
            date=target_date,
            slot_config=None,
            is_closed=True,
            reason="Festival Holiday",
        )

        res = self.client.get("/api/vegetable-orders/slots/")
        self.assertEqual(res.status_code, 200)
        day_3 = res.data["dates"][3]
        self.assertTrue(day_3["is_closed"])
        self.assertEqual(day_3["reason"], "Festival Holiday")
        self.assertEqual(day_3["available_slots_count"], 0)

    def test_admin_cart_pricing_config_and_dynamic_checkout_billing(self):
        from vegetable_orders.models import GroceryCartPricingConfig

        # 1. Check customer public pricing config endpoint
        res_cfg = self.client.get("/api/vegetable-orders/pricing-config/")
        self.assertEqual(res_cfg.status_code, 200)
        self.assertTrue(res_cfg.data["success"])
        self.assertEqual(Decimal(str(res_cfg.data["data"]["free_delivery_threshold"])), Decimal("200.00"))

        # 2. Update pricing config via admin endpoint:
        # Free delivery threshold = 300
        # Small cart threshold = 150
        # Small cart fee = 8
        # Low tier delivery fee = 25
        # Mid tier delivery fee = 18
        # Handling fee = 5
        # Tip presets = [25, 50, 100]
        admin_user = User.objects.create_user(
            username="admin_pricing_user", email="apu@gmail.com", phone="9876500001",
            password="Password123!", role="admin", is_staff=True, is_superuser=True,
            company=self.company,
        )
        self.client.force_authenticate(user=admin_user)

        res_update = self.client.post(
            "/api/vegetable-orders/admin/pricing-config/",
            {
                "free_delivery_threshold": 300,
                "small_cart_fee_threshold": 150,
                "small_cart_fee_amount": 8,
                "low_tier_delivery_fee": 25,
                "mid_tier_delivery_fee": 18,
                "handling_fee_amount": 5,
                "tip_preset_amounts": [25, 50, 100],
            },
            format="json",
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertTrue(res_update.data["success"])
        self.assertEqual(Decimal(str(res_update.data["data"]["free_delivery_threshold"])), Decimal("300.00"))
        self.assertEqual(Decimal(str(res_update.data["data"]["small_cart_fee_amount"])), Decimal("8.00"))
        self.assertEqual(Decimal(str(res_update.data["data"]["low_tier_delivery_fee"])), Decimal("25.00"))
        self.assertEqual(Decimal(str(res_update.data["data"]["mid_tier_delivery_fee"])), Decimal("18.00"))
        self.assertEqual(Decimal(str(res_update.data["data"]["handling_fee_amount"])), Decimal("5.00"))

        # 3. Authenticate customer and perform checkout under new config
        self.client.force_authenticate(user=self.customer)

        # Test Case A: Subtotal = 80 (below small_cart_threshold ₹150)
        # Low delivery fee ₹25 + Small cart fee ₹8 + Handling fee ₹5 + Tip ₹25 = Total ₹146
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 2) # 2 * 40 = 80

        res_checkout_a = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St", "tip_amount": 25},
            format="json",
        )
        self.assertEqual(res_checkout_a.status_code, 201)
        data_a = res_checkout_a.data["data"]
        self.assertEqual(Decimal(data_a["items_subtotal"]), Decimal("80.00"))
        self.assertEqual(Decimal(data_a["delivery_fee"]), Decimal("25.00"))
        self.assertEqual(Decimal(data_a["small_cart_fee"]), Decimal("8.00"))
        self.assertEqual(Decimal(data_a["handling_fee"]), Decimal("5.00"))
        self.assertEqual(Decimal(data_a["tip_amount"]), Decimal("25.00"))
        self.assertEqual(Decimal(data_a["total_amount"]), Decimal("143.00"))



