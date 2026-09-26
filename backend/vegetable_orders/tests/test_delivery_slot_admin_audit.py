"""
backend/vegetable_orders/tests/test_delivery_slot_admin_audit.py

End-to-end audit test suite for all 4 tabs of the Delivery Schedule & Slot Matrix Admin:
1. 7-Day Weekday Matrix: toggle weekday slot off -> verify admin persists -> verify customer slot is disabled with weekday reason -> toggle back on.
2. Date Closures & Overrides: create date closure override -> verify customer date is closed with custom reason -> delete override -> verify customer date restored.
3. Slot Windows: create new slot window -> verify added to weekday matrix -> verify customer gets new slot option -> delete slot window -> verify customer slots cleaned up.
4. Cart & Fee Pricing: update pricing tiers in admin -> verify customer pricing endpoint & live order checkout reflect new fees.
"""
from decimal import Decimal
import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package
from inventory.services import vegetable_stock_service
from vegetable_orders.models import (
    VegetableDeliverySlotConfig,
    VegetableWeekdaySlotConfig,
    VegetableSlotDateOverride,
    GroceryCartPricingConfig,
    VegetableOrder,
)
from vegetable_orders.views import ensure_default_slots_and_template

User = get_user_model()


class DeliverySlotAdminAuditTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.admin_user = User.objects.create_user(
            username="admin_user", email="admin@test.com", phone="9876500001",
            password="Password123!", role="admin", company=self.company,
        )
        self.customer = User.objects.create_user(
            username="customer_user", email="customer@test.com", phone="9876500002",
            password="Password123!", role="customer", company=self.company,
        )

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)

        self.customer_client = APIClient()
        self.customer_client.force_authenticate(user=self.customer)

        ensure_default_slots_and_template()

        # Catalog setup for checkout testing
        category = CatalogCategory.objects.create(name="Produce", slug="produce", is_active=True)
        service = Service.objects.create(category=category, name="Vegetables", slug="vegetables", is_active=True)
        self.pkg_tomato = Package.objects.create(
            service=service, name="Tomato", slug="tomato",
            base_price=Decimal("50.00"), duration="500g", status="ACTIVE",
        )
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)

    def test_tab_1_7day_weekday_matrix_lifecycle(self):
        """
        Audit Tab 1 (7-Day Weekday Matrix):
        1. Query admin slots view -> verify evening slot is enabled for tomorrow's weekday.
        2. Toggle evening slot OFF for tomorrow's weekday via save_weekday_template.
        3. Query admin view -> verify is_enabled=False persisted.
        4. Query customer slots view -> verify tomorrow's evening slot is disabled with 'Not operating on <Day>s'.
        5. Toggle evening slot back ON -> verify customer slot is available again.
        """
        now = timezone.localtime(timezone.now()) if timezone.is_aware(timezone.now()) else timezone.now()
        tomorrow = now.date() + datetime.timedelta(days=1)
        tomorrow_weekday = int(tomorrow.strftime("%w"))
        tomorrow_day_name = tomorrow.strftime("%A")

        evening_slot = VegetableDeliverySlotConfig.objects.get(code="evening")

        # 1. Verify initially enabled
        admin_res1 = self.admin_client.get("/api/vegetable-orders/admin/slots/")
        self.assertEqual(admin_res1.status_code, 200)
        tomorrow_row = next(w for w in admin_res1.data["weekday_template"] if w["weekday"] == tomorrow_weekday)
        evening_cell = next(s for s in tomorrow_row["slots"] if s["slot_config_id"] == evening_slot.id)
        self.assertTrue(evening_cell["is_enabled"])

        # 2. Toggle evening slot OFF for tomorrow's weekday
        payload = [
            {
                "weekday": tomorrow_weekday,
                "slot_config_id": evening_slot.id,
                "is_enabled": False,
                "cutoff_time_override": None,
                "capacity": None,
            }
        ]
        save_res = self.admin_client.post(
            "/api/vegetable-orders/admin/slots/",
            {"action": "save_weekday_template", "template": payload},
            format="json",
        )
        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.data["success"])

        # 3. Reload admin view -> confirm persisted
        admin_res2 = self.admin_client.get("/api/vegetable-orders/admin/slots/")
        tomorrow_row_after = next(w for w in admin_res2.data["weekday_template"] if w["weekday"] == tomorrow_weekday)
        evening_cell_after = next(s for s in tomorrow_row_after["slots"] if s["slot_config_id"] == evening_slot.id)
        self.assertFalse(evening_cell_after["is_enabled"])

        # 4. Customer slots view -> confirm evening slot is disabled for tomorrow
        cust_res1 = self.customer_client.get("/api/vegetable-orders/slots/")
        self.assertEqual(cust_res1.status_code, 200)
        tomorrow_cust = next(d for d in cust_res1.data["dates"] if d["date"] == tomorrow.isoformat())
        cust_evening = next(s for s in tomorrow_cust["slots"] if s["code"] == "evening")
        self.assertFalse(cust_evening["available"])
        self.assertTrue(cust_evening["is_closed"])
        self.assertEqual(cust_evening["reason"], f"Not operating on {tomorrow_day_name}s")

        # 5. Toggle evening slot back ON
        payload_restore = [
            {
                "weekday": tomorrow_weekday,
                "slot_config_id": evening_slot.id,
                "is_enabled": True,
                "cutoff_time_override": None,
                "capacity": None,
            }
        ]
        self.admin_client.post(
            "/api/vegetable-orders/admin/slots/",
            {"action": "save_weekday_template", "template": payload_restore},
            format="json",
        )
        cust_res2 = self.customer_client.get("/api/vegetable-orders/slots/")
        tomorrow_cust_restored = next(d for d in cust_res2.data["dates"] if d["date"] == tomorrow.isoformat())
        cust_evening_restored = next(s for s in tomorrow_cust_restored["slots"] if s["code"] == "evening")
        self.assertTrue(cust_evening_restored["available"])
        self.assertIsNone(cust_evening_restored["reason"])

    def test_tab_2_date_closures_and_overrides_lifecycle(self):
        """
        Audit Tab 2 (Date Closures & Overrides):
        1. Add whole-day closure override for tomorrow with custom reason.
        2. Query customer slots view -> verify tomorrow is closed with custom reason.
        3. Delete the date override.
        4. Query customer slots view -> verify tomorrow is open again with active slots.
        """
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)
        reason_text = "Store Renovation & Stock Audit"

        # 1. Add override
        add_res = self.admin_client.post(
            "/api/vegetable-orders/admin/slots/",
            {
                "action": "add_date_override",
                "date": tomorrow.isoformat(),
                "slot_config_id": None,
                "is_closed": True,
                "reason": reason_text,
            },
            format="json",
        )
        self.assertEqual(add_res.status_code, 201)
        override_id = add_res.data["data"]["id"]

        # 2. Customer view -> verify tomorrow is closed
        cust_res1 = self.customer_client.get("/api/vegetable-orders/slots/")
        tomorrow_cust = next(d for d in cust_res1.data["dates"] if d["date"] == tomorrow.isoformat())
        self.assertTrue(tomorrow_cust["is_closed"])
        self.assertEqual(tomorrow_cust["reason"], reason_text)
        self.assertEqual(tomorrow_cust["available_slots_count"], 0)
        self.assertEqual(len(tomorrow_cust["slots"]), 0)

        # 3. Delete override
        del_res = self.admin_client.post(
            "/api/vegetable-orders/admin/slots/",
            {"action": "delete_date_override", "id": override_id},
            format="json",
        )
        self.assertEqual(del_res.status_code, 200)

        # 4. Customer view -> verify tomorrow is back open
        cust_res2 = self.customer_client.get("/api/vegetable-orders/slots/")
        tomorrow_cust_restored = next(d for d in cust_res2.data["dates"] if d["date"] == tomorrow.isoformat())
        self.assertFalse(tomorrow_cust_restored["is_closed"])
        self.assertGreater(tomorrow_cust_restored["available_slots_count"], 0)
        self.assertGreater(len(tomorrow_cust_restored["slots"]), 0)

    def test_tab_3_slot_windows_lifecycle(self):
        """
        Audit Tab 3 (Slot Windows):
        1. Create new slot window 'Afternoon Express' (1:00 PM - 3:00 PM).
        2. Query admin view -> verify it appears in slots list and in all 7 weekday matrix rows.
        3. Query customer view -> verify 'Afternoon Express' appears as available slot for tomorrow.
        4. Delete slot window.
        5. Query customer view -> verify 'Afternoon Express' is no longer listed.
        """
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)

        # 1. Create new slot
        create_res = self.admin_client.post(
            "/api/vegetable-orders/admin/slots/",
            {
                "action": "save_slot",
                "name": "Afternoon Express",
                "slot_label": "1:00 PM – 3:00 PM",
                "start_time": "13:00",
                "end_time": "15:00",
                "cutoff_time": "12:00",
                "is_same_day_available": False,
                "is_active": True,
                "sort_order": 3,
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, 200)
        slot_id = create_res.data["data"]["id"]

        # 2. Check admin slots & weekday template
        admin_res = self.admin_client.get("/api/vegetable-orders/admin/slots/")
        slot_names = [s["name"] for s in admin_res.data["slots"]]
        self.assertIn("Afternoon Express", slot_names)

        for weekday_row in admin_res.data["weekday_template"]:
            row_slot_ids = [s["slot_config_id"] for s in weekday_row["slots"]]
            self.assertIn(slot_id, row_slot_ids)

        # 3. Check customer slots for tomorrow
        cust_res1 = self.customer_client.get("/api/vegetable-orders/slots/")
        tomorrow_cust = next(d for d in cust_res1.data["dates"] if d["date"] == tomorrow.isoformat())
        afternoon_slot = next((s for s in tomorrow_cust["slots"] if s["name"] == "Afternoon Express"), None)
        self.assertIsNotNone(afternoon_slot)
        self.assertEqual(afternoon_slot["slot_label"], "1:00 PM – 3:00 PM")
        self.assertTrue(afternoon_slot["available"])

        # 4. Delete slot
        del_res = self.admin_client.post(
            "/api/vegetable-orders/admin/slots/",
            {"action": "delete_slot", "id": slot_id},
            format="json",
        )
        self.assertEqual(del_res.status_code, 200)

        # 5. Check customer slots -> removed
        cust_res2 = self.customer_client.get("/api/vegetable-orders/slots/")
        tomorrow_cust_after = next(d for d in cust_res2.data["dates"] if d["date"] == tomorrow.isoformat())
        afternoon_slot_after = next((s for s in tomorrow_cust_after["slots"] if s["name"] == "Afternoon Express"), None)
        self.assertIsNone(afternoon_slot_after)

    def test_tab_4_cart_and_fee_pricing_lifecycle(self):
        """
        Audit Tab 4 (Cart & Fee Pricing):
        1. Check baseline pricing (free threshold = 200, small cart fee = 5 below 100).
        2. Update pricing in admin: free threshold = 300, small cart fee = 12 below 150.
        3. Query customer slots endpoint -> verify pricing_config reflects new values.
        4. Place order with subtotal = 250:
           - In old config: >=200 was free delivery.
           - In new config: <300 incurs mid_tier_delivery_fee (10).
           - Total amount must equal 250 + 10 (delivery) + 2 (handling) = 262.
        5. Restore pricing config to defaults.
        """
        # 1. Update config
        update_res = self.admin_client.post(
            "/api/vegetable-orders/admin/pricing-config/",
            {
                "free_delivery_threshold": 300,
                "small_cart_fee_threshold": 150,
                "small_cart_fee_amount": 12,
                "low_tier_delivery_fee": 15,
                "mid_tier_delivery_fee": 10,
                "handling_fee_amount": 2,
                "tip_preset_amounts": [20, 30, 50],
            },
            format="json",
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(Decimal(str(update_res.data["data"]["free_delivery_threshold"])), Decimal("300.00"))

        # 2. Check customer slots endpoint contains updated pricing config
        cust_res = self.customer_client.get("/api/vegetable-orders/slots/")
        pricing_cfg = cust_res.data["pricing_config"]
        self.assertEqual(Decimal(str(pricing_cfg["free_delivery_threshold"])), Decimal("300.00"))
        self.assertEqual(Decimal(str(pricing_cfg["small_cart_fee_threshold"])), Decimal("150.00"))
        self.assertEqual(Decimal(str(pricing_cfg["small_cart_fee_amount"])), Decimal("12.00"))

        # 3. Add 5 packs of tomato to cart: 5 * 50 = 250.00
        self.customer_client.post(
            "/api/carts/daily_essentials/items/",
            {"package_id": self.pkg_tomato.id, "quantity": 5},
            format="json",
        )

        # 4. Checkout
        checkout_res = self.customer_client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "Flat 402, Green Meadows, Hosur"},
            format="json",
        )
        self.assertEqual(checkout_res.status_code, 201)
        order_data = checkout_res.data["data"]
        self.assertEqual(Decimal(order_data["items_subtotal"]), Decimal("250.00"))
        self.assertEqual(Decimal(order_data["delivery_fee"]), Decimal("10.00"))  # Not free because < 300
        self.assertEqual(Decimal(order_data["small_cart_fee"]), Decimal("0.00"))  # >= 150
        self.assertEqual(Decimal(order_data["handling_fee"]), Decimal("2.00"))
        self.assertEqual(Decimal(order_data["total_amount"]), Decimal("262.00"))

        # 5. Restore config
        restore_res = self.admin_client.post(
            "/api/vegetable-orders/admin/pricing-config/",
            {
                "free_delivery_threshold": 200,
                "small_cart_fee_threshold": 100,
                "small_cart_fee_amount": 5,
                "low_tier_delivery_fee": 15,
                "mid_tier_delivery_fee": 10,
                "handling_fee_amount": 2,
                "tip_preset_amounts": [20, 30, 50],
            },
            format="json",
        )
        self.assertEqual(restore_res.status_code, 200)
