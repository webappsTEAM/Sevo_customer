"""
backend/inventory/tests/test_vegetable_stock.py

Comprehensive test suite for the Vegetable Stock Management system.
Tests all 24 required behaviors including atomic multi-item locking,
daily reset idempotency, lazy self-healing reset, cancellation restoration,
and multi-tenant catalog cache isolation.
"""
from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase, override_settings
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError

from companies.models import Company
from inventory.models import InventoryItem, StockMovement
from service_requests.models import CatalogCategory, Service, Package, ServiceRequest
from inventory.utils.unit_conversion import to_grams, format_grams_for_display
from inventory.services import vegetable_stock_service
from inventory.selectors import vegetable_stock_selectors
from service_requests.services.booking_service import BookingService
from service_requests.state_machine import apply_transition

User = get_user_model()


class VegetableStockTestSuite(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Company & Admin
        self.company = Company.objects.create(company_name="CalServices Tamil Nadu", slug="calservices-tn")
        self.company2 = Company.objects.create(company_name="CalServices Karnataka", slug="calservices-ka")
        
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@calservices.com",
            password="Password123!",
            role="admin",
            company=self.company,
        )
        self.customer_user = User.objects.create_user(
            username="customer_user",
            email="cust@gmail.com",
            phone="9876543210",
            password="Password123!",
            role="customer",
            company=self.company,
        )

        # Catalog Setup
        self.category = CatalogCategory.objects.create(
            name="Farm Produce",
            slug="farm-produce",
            is_active=True,
            sort_order=1,
        )
        self.veg_service = Service.objects.create(
            category=self.category,
            name="Fresh Vegetables",
            slug="vegetables",
            is_active=True,
        )

        # Vegetable 1: Tomato
        self.pkg_tomato = Package.objects.create(
            service=self.veg_service,
            name="Fresh Country Tomato",
            slug="fresh-country-tomato",
            base_price=Decimal("40.00"),
            duration="500g",
            status="ACTIVE",
        )
        # Vegetable 2: Potato
        self.pkg_potato = Package.objects.create(
            service=self.veg_service,
            name="Organic Potato",
            slug="organic-potato",
            base_price=Decimal("35.00"),
            duration="1kg",
            status="ACTIVE",
        )
        # Vegetable 3: Onion
        self.pkg_onion = Package.objects.create(
            service=self.veg_service,
            name="Red Onion",
            slug="red-onion",
            base_price=Decimal("50.00"),
            duration="1kg",
            status="ACTIVE",
        )

    # 1. test_add_stock_converts_unit_and_logs_movement
    def test_add_stock_converts_unit_and_logs_movement(self):
        item = vegetable_stock_service.add_stock(
            product=self.pkg_tomato,
            quantity=5,
            unit="kg",
            company=self.company,
            entered_by_user=self.admin_user,
        )
        self.assertEqual(item.stock_quantity_grams, 5000)
        movement = StockMovement.objects.filter(item=item, movement_type=StockMovement.MovementType.RESTOCK).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.delta_grams, 5000)
        self.assertEqual(movement.balance_after_grams, 5000)

        # Add more (additive restock)
        item = vegetable_stock_service.add_stock(
            product=self.pkg_tomato,
            quantity=500,
            unit="g",
            company=self.company,
        )
        self.assertEqual(item.stock_quantity_grams, 5500)
        self.assertEqual(StockMovement.objects.filter(item=item).count(), 2)

    # 2. test_adjust_stock_sets_absolute_value_and_logs_reason_and_delta
    def test_adjust_stock_sets_absolute_value_and_logs_reason_and_delta(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        item = vegetable_stock_service.adjust_stock(
            product=self.pkg_tomato,
            quantity=8,
            unit="kg",
            reason="Produce spoilage during morning sorting",
            company=self.company,
            entered_by_user=self.admin_user,
        )
        self.assertEqual(item.stock_quantity_grams, 8000)
        adj_movement = StockMovement.objects.filter(item=item, movement_type=StockMovement.MovementType.ADJUSTMENT).first()
        self.assertIsNotNone(adj_movement)
        self.assertEqual(adj_movement.delta_grams, -2000)
        self.assertEqual(adj_movement.balance_after_grams, 8000)
        self.assertIn("Produce spoilage", adj_movement.reason)

    # 3. test_booking_deducts_grams_on_success
    def test_booking_deducts_grams_on_success(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        items = [{"product": self.pkg_tomato, "quantity": 1.5, "unit": "kg"}]
        vegetable_stock_service.reserve_stock_for_booking_items(items, self.company, booking_ref="SR-TEST-001")
        
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 8500)
        sold_m = StockMovement.objects.filter(booking_ref="SR-TEST-001", movement_type=StockMovement.MovementType.SOLD).first()
        self.assertIsNotNone(sold_m)
        self.assertEqual(sold_m.delta_grams, -1500)
        self.assertEqual(sold_m.balance_after_grams, 8500)

    # 4. test_booking_fails_with_400_and_generic_message_on_insufficient_stock
    def test_booking_fails_with_400_and_generic_message_on_insufficient_stock(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company) # 1000g available
        
        # Try booking 2 kg via BookingCreateView
        self.client.force_authenticate(user=self.customer_user)
        payload = {
            "customer_name": "Test Customer",
            "phone": "9876543210",
            "service_category": "vegetables",
            "issue_title": "Vegetable Delivery",
            "address": "123 Market St, Hosur",
            "preferred_date": timezone.localdate().strftime("%Y-%m-%d"),
            "cart_data": [
                {"id": self.pkg_tomato.id, "name": self.pkg_tomato.name, "quantity": 2, "unit": "kg"}
            ],
        }
        res = self.client.post("/api/booking/", payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("message"), "This quantity is no longer available. Please reduce the quantity and try again.")
        # Ensure no stock deducted
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 1000)

    # 5. test_multi_item_atomic_booking_rolls_back_all_on_one_failure
    def test_multi_item_atomic_booking_rolls_back_all_on_one_failure(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company) # 10000g
        vegetable_stock_service.add_stock(self.pkg_potato, 1, "kg", self.company)  # 1000g

        items = [
            {"product": self.pkg_tomato, "quantity": 2, "unit": "kg"},
            {"product": self.pkg_potato, "quantity": 5, "unit": "kg"}, # exceeds 1000g
        ]
        with self.assertRaises(vegetable_stock_service.InsufficientStockError):
            vegetable_stock_service.reserve_stock_for_booking_items(items, self.company, booking_ref="SR-FAIL-01")

        # Confirm atomic rollback — Tomato remains untouched at 10000g
        self.pkg_tomato.stock_item.refresh_from_db()
        self.pkg_potato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 10000)
        self.assertEqual(self.pkg_potato.stock_item.stock_quantity_grams, 1000)
        self.assertFalse(StockMovement.objects.filter(booking_ref="SR-FAIL-01").exists())

    # 6. test_deadlock_free_sorting
    def test_deadlock_free_sorting(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        vegetable_stock_service.add_stock(self.pkg_potato, 5, "kg", self.company)
        vegetable_stock_service.add_stock(self.pkg_onion, 5, "kg", self.company)

        # Unsorted input list
        items = [
            {"product": self.pkg_onion, "quantity": 1, "unit": "kg"},
            {"product": self.pkg_tomato, "quantity": 1, "unit": "kg"},
            {"product": self.pkg_potato, "quantity": 1, "unit": "kg"},
        ]
        vegetable_stock_service.reserve_stock_for_booking_items(items, self.company, booking_ref="SR-SORT-01")
        self.pkg_onion.stock_item.refresh_from_db()
        self.pkg_tomato.stock_item.refresh_from_db()
        self.pkg_potato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_onion.stock_item.stock_quantity_grams, 4000)
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 4000)
        self.assertEqual(self.pkg_potato.stock_item.stock_quantity_grams, 4000)

    # 7. test_cancellation_restores_stock_idempotently
    def test_cancellation_restores_stock_idempotently(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company) # 5000g
        
        # Create booking and reserve
        sr = ServiceRequest.objects.create(
            request_id="SR-CANCEL-001",
            company=self.company,
            customer=self.customer_user,
            customer_name="Test Customer",
            phone="9876543210",
            service_category="vegetables",
            issue_title="Vegetable Delivery",
            address="123 Market St",
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.CONFIRMED,
        )
        vegetable_stock_service.reserve_stock_for_booking_items(
            [{"product": self.pkg_tomato, "quantity": 1, "unit": "kg"}],
            self.company,
            booking_ref=sr.request_id,
        )
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 4000)

        # Transition to CANCELLED via state machine
        apply_transition(sr, ServiceRequest.Status.CANCELLED)
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 5000)

        # Call release again — verify idempotency (no double restore)
        vegetable_stock_service.release_stock_for_booking(sr)
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 5000)
        self.assertEqual(
            StockMovement.objects.filter(booking_ref="SR-CANCEL-001", movement_type=StockMovement.MovementType.RESTOCKED_ON_CANCELLATION).count(),
            1
        )

    # 8. test_exact_depletion_no_drift
    def test_exact_depletion_no_drift(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company) # 1000g
        for i in range(4):
            vegetable_stock_service.reserve_stock_for_booking_items(
                [{"product": self.pkg_tomato, "quantity": 250, "unit": "g"}],
                self.company,
                booking_ref=f"SR-DEPLETE-{i}",
            )
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 0)
        status = vegetable_stock_selectors.get_admin_stock_status(self.pkg_tomato)
        self.assertEqual(status["state"], "out_of_stock")

    # 9. test_non_vegetable_inventory_fields_unchanged
    def test_non_vegetable_inventory_fields_unchanged(self):
        equipment = InventoryItem.objects.create(
            org=self.company,
            name="Ladder 6ft",
            category=InventoryItem.Category.EQUIPMENT,
            total_quantity=5,
            available_quantity=5,
            reserved_quantity=0,
        )
        self.assertIsNone(equipment.stock_quantity_grams)
        self.assertIsNone(equipment.default_daily_quantity_grams)
        self.assertEqual(equipment.effective_available_quantity, 5)

    # 10. test_customer_serializer_does_not_expose_exact_stock
    def test_customer_serializer_does_not_expose_exact_stock(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 18, "kg", self.company)
        res = self.client.get(f"/api/catalog/services/?service_slug=vegetables&status=ACTIVE")
        self.assertEqual(res.status_code, 200)
        for item in res.data.get("data", []):
            self.assertNotIn("stock_quantity_grams", item)
            self.assertNotIn("default_daily_quantity_grams", item)
            self.assertIn("in_stock", item)
            self.assertIsInstance(item["in_stock"], bool)

    # 11. test_customer_in_stock_boolean_correctness
    def test_customer_in_stock_boolean_correctness(self):
        # Tomato has 5kg -> True
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        self.assertTrue(vegetable_stock_selectors.get_stock_status(self.pkg_tomato)["in_stock"])

        # Deplete to 0 -> False
        vegetable_stock_service.adjust_stock(self.pkg_tomato, 0, "kg", "Sold out", self.company)
        self.pkg_tomato.refresh_from_db()
        self.assertFalse(vegetable_stock_selectors.get_stock_status(self.pkg_tomato)["in_stock"])

    # 12. test_admin_stock_display_formats_grams
    def test_admin_stock_display_formats_grams(self):
        self.assertEqual(format_grams_for_display(18000), "18 kg")
        self.assertEqual(format_grams_for_display(18500), "18.5 kg")
        self.assertEqual(format_grams_for_display(500), "500 g")
        self.assertEqual(format_grams_for_display(0), "0 g")

    # 13. test_admin_serializer_distinguishes_three_states
    def test_admin_serializer_distinguishes_three_states(self):
        # 1. Not tracked
        status_untracked = vegetable_stock_selectors.get_admin_stock_status(self.pkg_onion)
        self.assertEqual(status_untracked["state"], "not_tracked")

        # 2. In stock
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        status_instock = vegetable_stock_selectors.get_admin_stock_status(self.pkg_tomato)
        self.assertEqual(status_instock["state"], "in_stock")

        # 3. Out of stock
        vegetable_stock_service.adjust_stock(self.pkg_potato, 0, "kg", "Zeroed", self.company)
        status_out = vegetable_stock_selectors.get_admin_stock_status(self.pkg_potato)
        self.assertEqual(status_out["state"], "out_of_stock")

    # 14. test_missing_stock_item_preserves_existing_behavior
    def test_missing_stock_item_preserves_existing_behavior(self):
        self.assertIsNone(self.pkg_onion.stock_item)
        items = [{"product": self.pkg_onion, "quantity": 10, "unit": "kg"}]
        # Booking without stock_item passes through unchanged
        vegetable_stock_service.reserve_stock_for_booking_items(items, self.company, booking_ref="SR-NOTRACK-01")
        self.assertFalse(StockMovement.objects.filter(booking_ref="SR-NOTRACK-01").exists())

    # 15. test_cache_invalidated_on_stock_movement
    def test_cache_invalidated_on_stock_movement(self):
        # Set cache key
        company_id = self.company.id
        cat_id = self.category.id
        cache_key = f"catalog_services_list_{company_id}_{cat_id}_vegetables_ACTIVE"
        cache.set(cache_key, {"cached": True}, timeout=300)
        self.assertIsNotNone(cache.get(cache_key))

        # Restock triggers signal -> invalidates cache key
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        self.assertIsNone(cache.get(cache_key))

    # 16. test_daily_reset_sets_live_stock_to_default_and_logs_movement
    def test_daily_reset_sets_live_stock_to_default_and_logs_movement(self):
        vegetable_stock_service.set_default_daily_quantity(self.pkg_tomato, 25, "kg", self.company)
        item = self.pkg_tomato.stock_item
        # Simulate previous day
        item.last_reset_date = timezone.localdate() - timedelta(days=1)
        item.stock_quantity_grams = 2000 # 2kg remaining from yesterday
        item.save()

        applied = vegetable_stock_service.apply_daily_reset(item, self.company)
        self.assertTrue(applied)
        item.refresh_from_db()
        self.assertEqual(item.stock_quantity_grams, 25000)
        self.assertEqual(item.last_reset_date, timezone.localdate())
        m = StockMovement.objects.filter(item=item, movement_type=StockMovement.MovementType.DAILY_RESET).first()
        self.assertIsNotNone(m)
        self.assertEqual(m.delta_grams, 23000)
        self.assertEqual(m.balance_after_grams, 25000)

    # 17. test_daily_reset_is_idempotent_within_same_business_day
    def test_daily_reset_is_idempotent_within_same_business_day(self):
        vegetable_stock_service.set_default_daily_quantity(self.pkg_tomato, 20, "kg", self.company, apply_now=True)
        item = self.pkg_tomato.stock_item
        self.assertEqual(item.last_reset_date, timezone.localdate())

        # Calling apply_daily_reset again today should no-op
        applied = vegetable_stock_service.apply_daily_reset(item, self.company)
        self.assertFalse(applied)
        # Should only have 1 movement
        self.assertEqual(StockMovement.objects.filter(item=item, movement_type=StockMovement.MovementType.DAILY_RESET).count(), 1)

    # 18. test_daily_reset_does_not_carry_over_previous_remaining
    def test_daily_reset_does_not_carry_over_previous_remaining(self):
        vegetable_stock_service.set_default_daily_quantity(self.pkg_tomato, 15, "kg", self.company)
        item = self.pkg_tomato.stock_item
        item.last_reset_date = timezone.localdate() - timedelta(days=1)
        item.stock_quantity_grams = 8000 # 8kg remaining
        item.save()

        vegetable_stock_service.apply_daily_reset(item, self.company)
        item.refresh_from_db()
        # Exactly 15000g, NOT 15000 + 8000
        self.assertEqual(item.stock_quantity_grams, 15000)

    # 19. test_lazy_reset_fallback_applies_missed_reset_before_booking_check
    def test_lazy_reset_fallback_applies_missed_reset_before_booking_check(self):
        vegetable_stock_service.set_default_daily_quantity(self.pkg_tomato, 20, "kg", self.company)
        item = self.pkg_tomato.stock_item
        item.last_reset_date = timezone.localdate() - timedelta(days=1)
        item.stock_quantity_grams = 0 # 0g leftover from yesterday
        item.save()

        # Customer attempts booking 5kg today — lazy reset should fire and restore to 20kg, then reserve 5kg -> 15kg
        items = [{"product": self.pkg_tomato, "quantity": 5, "unit": "kg"}]
        vegetable_stock_service.reserve_stock_for_booking_items(items, self.company, booking_ref="SR-LAZY-01")
        item.refresh_from_db()
        self.assertEqual(item.stock_quantity_grams, 15000)
        self.assertEqual(item.last_reset_date, timezone.localdate())

    # 20. test_default_daily_quantity_null_skips_auto_reset
    def test_default_daily_quantity_null_skips_auto_reset(self):
        item = vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        self.assertIsNone(item.default_daily_quantity_grams)
        item.last_reset_date = timezone.localdate() - timedelta(days=1)
        item.save()

        applied = vegetable_stock_service.apply_daily_reset(item, self.company)
        self.assertFalse(applied)
        item.refresh_from_db()
        self.assertEqual(item.stock_quantity_grams, 10000)

    # 21. test_same_day_restock_after_sellout_returns_item_to_in_stock
    def test_same_day_restock_after_sellout_returns_item_to_in_stock(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)
        vegetable_stock_service.adjust_stock(self.pkg_tomato, 0, "kg", "Sold out", self.company)
        self.pkg_tomato.refresh_from_db()
        self.assertFalse(vegetable_stock_selectors.get_stock_status(self.pkg_tomato)["in_stock"])

        # Restock 5kg later in day
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        self.pkg_tomato.refresh_from_db()
        self.assertTrue(vegetable_stock_selectors.get_stock_status(self.pkg_tomato)["in_stock"])

    # 22. test_set_default_with_apply_now_immediately_resets_today
    def test_set_default_with_apply_now_immediately_resets_today(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        item = vegetable_stock_service.set_default_daily_quantity(
            product=self.pkg_tomato,
            quantity=30,
            unit="kg",
            company=self.company,
            apply_now=True,
        )
        self.assertEqual(item.stock_quantity_grams, 30000)
        self.assertEqual(item.default_daily_quantity_grams, 30000)
        self.assertEqual(item.last_reset_date, timezone.localdate())

    # 23. test_set_default_without_apply_now_does_not_change_todays_live_stock
    def test_set_default_without_apply_now_does_not_change_todays_live_stock(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        item = vegetable_stock_service.set_default_daily_quantity(
            product=self.pkg_tomato,
            quantity=30,
            unit="kg",
            company=self.company,
            apply_now=False,
        )
        self.assertEqual(item.stock_quantity_grams, 5000) # Live stock remains 5kg
        self.assertEqual(item.default_daily_quantity_grams, 30000)

    # 24. test_daily_history_report_derives_opening_sold_closing_correctly
    def test_daily_history_report_derives_opening_sold_closing_correctly(self):
        today = timezone.localdate()
        # Create daily reset movement (opening 20kg)
        item = vegetable_stock_service.set_default_daily_quantity(self.pkg_tomato, 20, "kg", self.company, apply_now=True)
        # Sell 4kg
        vegetable_stock_service.reserve_stock_for_booking_items(
            [{"product": self.pkg_tomato, "quantity": 4, "unit": "kg"}],
            self.company,
            booking_ref="SR-HIST-01",
        )
        # Sell 2kg
        vegetable_stock_service.reserve_stock_for_booking_items(
            [{"product": self.pkg_tomato, "quantity": 2, "unit": "kg"}],
            self.company,
            booking_ref="SR-HIST-02",
        )

        history = vegetable_stock_selectors.get_daily_stock_history(self.pkg_tomato, today, today)
        self.assertEqual(len(history), 1)
        day_report = history[0]
        self.assertEqual(day_report["date"], today.strftime("%Y-%m-%d"))
        self.assertEqual(day_report["opening_grams"], 20000)
        self.assertEqual(day_report["sold_grams"], 6000)
        self.assertEqual(day_report["closing_grams"], 14000)

    # 25. Multi-Tenant Catalog Cache Isolation Test
    @override_settings(DEBUG=False)
    def test_multi_tenant_catalog_cache_isolation(self):
        # Tenant 1 request
        self.client.force_authenticate(user=self.admin_user)
        res1 = self.client.get(f"/api/catalog/services/?service_slug=vegetables&status=ACTIVE")
        self.assertEqual(res1.status_code, 200)

        # Tenant 2 User & Request
        admin_user2 = User.objects.create_user(
            username="admin2",
            email="admin2@calservices.com",
            password="Password123!",
            role="admin",
            company=self.company2,
        )
        self.client.force_authenticate(user=admin_user2)
        res2 = self.client.get(f"/api/catalog/services/?service_slug=vegetables&status=ACTIVE")
        self.assertEqual(res2.status_code, 200)

        # Confirm distinct cache keys exist per company
        key1 = f"catalog_services_list_{self.company.id}__vegetables_ACTIVE"
        key2 = f"catalog_services_list_{self.company2.id}__vegetables_ACTIVE"
        self.assertIsNotNone(cache.get(key1))
        self.assertIsNotNone(cache.get(key2))
