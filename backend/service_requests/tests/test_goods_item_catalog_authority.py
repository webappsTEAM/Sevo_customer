"""
service_requests/tests/test_goods_item_catalog_authority.py

Regression test suite for GoodsItem catalog authority:
1. Blank/missing weight on admin create/update cannot silently become 5.00 kg.
2. Blank/missing CFT on admin create/update cannot silently become 1.00 CFT.
3. Valid explicit values are strictly preserved.
4. Model-level creation without explicit weight/CFT cannot silently default to 5 kg or 1 CFT.
5. Unconfigured items (weight <= 0 or CFT <= 0) cannot receive an instant authoritative quote in GT or P&M.
6. Existing valid catalog items remain completely unaffected.
"""
from decimal import Decimal
import json
import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient

from logistics.models import GoodsCategory, GoodsItem, LogisticsCategory, ServiceTier, PackersMoversConfig
from service_requests.services.cargo_fitment import resolve_cargo_payload

User = get_user_model()


def _route(distance_km=10.0, source="google_maps"):
    return {"distance_km": distance_km, "duration_seconds": 1200, "source": source}


class GoodsItemCatalogAuthorityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.uid = uuid.uuid4().hex[:6]
        self.admin_user = User.objects.create_superuser(
            username=f"admin_{self.uid}",
            phone=f"+9198888{self.uid[:5]}",
            email=f"admin_{self.uid}@test.com",
            password="adminpassword123",
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.category = GoodsCategory.objects.create(
            name=f"Test Cat {self.uid}",
            slug=f"test-cat-{self.uid}",
            allows_two_wheeler=True,
            is_active=True,
        )

        self.truck_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"truck-{self.uid}",
            name="Authority Test Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("500.00"),
            base_fare=Decimal("300.00"),
            per_km_rate=Decimal("20.00"),
            free_km=Decimal("2.00"),
            max_cft=Decimal("100.0"),
            max_weight_kg=Decimal("1000.0"),
            is_active=True,
        )

        self.pm_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug=f"pm-tier-{self.uid}",
            name="1 BHK Mini",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("4000.00"),
            base_fare=Decimal("3500.00"),
            per_km_rate=Decimal("40.00"),
            free_km=Decimal("5.00"),
            max_cft=Decimal("350.0"),
            max_weight_kg=Decimal("2000.0"),
            crew_size=2,
            is_active=True,
        )

        self.pm_config, _ = PackersMoversConfig.objects.get_or_create(
            city="Hosur",
            defaults={
                "standard_packing_rate_cft": Decimal("3.50"),
                "premium_packing_rate_cft": Decimal("6.00"),
                "premium_fragile_addon": Decimal("200.00"),
                "floor_rate_no_lift_per_100cft": Decimal("120.00"),
                "unpacking_rate_cft": Decimal("2.00"),
                "gst_rate": Decimal("0.1800"),
                "survey_cft_threshold": Decimal("400.00"),
                "is_active": True,
            },
        )

    # 1. Blank weight cannot silently become 5 kg
    def test_admin_create_blank_weight_cannot_silently_become_5kg(self):
        url = "/api/logistics/admin/items/"
        payload = {
            "name": f"Mystery Box {self.uid}",
            "category": self.category.id,
            "default_cft": "2.50",
            # default_weight_kg intentionally omitted
        }
        res = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get("error_code"), "INVALID_WEIGHT")

        # Explicit blank string
        payload["default_weight_kg"] = ""
        res2 = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res2.status_code, 400)
        self.assertEqual(res2.json().get("error_code"), "INVALID_WEIGHT")

        # Verify no item was created
        self.assertFalse(GoodsItem.objects.filter(name=payload["name"]).exists())

    # 2. Blank CFT cannot silently become 1 CFT
    def test_admin_create_blank_cft_cannot_silently_become_1cft(self):
        url = "/api/logistics/admin/items/"
        payload = {
            "name": f"Mystery Parcel {self.uid}",
            "category": self.category.id,
            "default_weight_kg": "15.00",
            # default_cft intentionally omitted
        }
        res = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json().get("error_code"), "INVALID_CFT")

        # Explicit blank string
        payload["default_cft"] = "   "
        res2 = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res2.status_code, 400)
        self.assertEqual(res2.json().get("error_code"), "INVALID_CFT")

        # Verify no item was created
        self.assertFalse(GoodsItem.objects.filter(name=payload["name"]).exists())

    # 3. Valid explicit values are preserved
    def test_admin_create_and_update_preserves_explicit_values(self):
        url = "/api/logistics/admin/items/"
        payload = {
            "name": f"Explicit Measurement Box {self.uid}",
            "category": self.category.id,
            "default_weight_kg": "37.75",
            "default_cft": "6.25",
        }
        res = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 201, res.content)
        item_data = res.json().get("data", {})
        item_id = item_data["id"]

        db_item = GoodsItem.objects.get(pk=item_id)
        self.assertEqual(db_item.default_weight_kg, Decimal("37.75"))
        self.assertEqual(db_item.default_cft, Decimal("6.25"))

        # Update via PATCH with explicit new values
        detail_url = f"/api/logistics/admin/items/{item_id}/"
        patch_res = self.client.patch(
            detail_url,
            data=json.dumps({"default_weight_kg": "42.00", "default_cft": "8.50"}),
            content_type="application/json",
        )
        self.assertEqual(patch_res.status_code, 200)
        db_item.refresh_from_db()
        self.assertEqual(db_item.default_weight_kg, Decimal("42.00"))
        self.assertEqual(db_item.default_cft, Decimal("8.50"))

        # PATCH with blank weight/CFT is rejected
        bad_patch_wt = self.client.patch(
            detail_url,
            data=json.dumps({"default_weight_kg": ""}),
            content_type="application/json",
        )
        self.assertEqual(bad_patch_wt.status_code, 400)
        self.assertEqual(bad_patch_wt.json().get("error_code"), "INVALID_WEIGHT")

        bad_patch_cft = self.client.patch(
            detail_url,
            data=json.dumps({"default_cft": " "}),
            content_type="application/json",
        )
        self.assertEqual(bad_patch_cft.status_code, 400)
        self.assertEqual(bad_patch_cft.json().get("error_code"), "INVALID_CFT")

    # 4. Model creation without dimensions cannot silently default to 5kg or 1cft
    def test_model_level_creation_without_dimensions_fails(self):
        with self.assertRaises(IntegrityError):
            GoodsItem.objects.create(
                category=self.category,
                name=f"No Dimensions {self.uid}",
                slug=f"no-dimensions-{self.uid}",
                # default_weight_kg and default_cft omitted
            )

    # 5. Unconfigured items cannot receive an instant authoritative quote in GT
    @patch("service_requests.services.routing.get_route_eta")
    def test_unconfigured_item_cannot_receive_instant_gt_quote(self, mock_route):
        mock_route.return_value = _route(10.0)
        unconf_item = GoodsItem.objects.create(
            category=self.category,
            name=f"Unconfigured Cargo {self.uid}",
            slug=f"unconf-cargo-{self.uid}",
            default_weight_kg=Decimal("0.00"),
            default_cft=Decimal("0.00"),
            is_active=True,
        )

        gt_quote_url = "/api/logistics/quote/"
        payload = {
            "service_category": "goods_transport_truck",
            "tier_id": self.truck_tier.id,
            "pickup_latitude": "12.740900",
            "pickup_longitude": "77.825300",
            "drop_latitude": "12.935200",
            "drop_longitude": "77.624500",
            "cargo_items": [{"goods_item_id": unconf_item.id, "quantity": 1}],
        }
        res = self.client.post(gt_quote_url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        json_data = res.json()
        self.assertEqual(json_data.get("error_code"), "UNCONFIGURED_CARGO_ITEM")
        self.assertIn("dimensions", json_data.get("message", "").lower())

    # 6. Unconfigured items cannot receive an instant authoritative quote in P&M
    @patch("service_requests.services.routing.get_route_eta")
    def test_unconfigured_item_cannot_receive_instant_pm_quote(self, mock_route):
        mock_route.return_value = _route(12.0)
        unconf_pm_item = GoodsItem.objects.create(
            category=self.category,
            name=f"Unmeasured Wardrobe {self.uid}",
            slug=f"unmeasured-wardrobe-{self.uid}",
            default_weight_kg=Decimal("0.00"),
            default_cft=Decimal("0.00"),
            is_active=True,
        )

        pm_quote_url = "/api/logistics/packers-movers/quote/"
        payload = {
            "city": "Hosur",
            "pickup_lat": 12.7409,
            "pickup_lng": 77.8253,
            "drop_lat": 12.7500,
            "drop_lng": 77.8300,
            "inventory": [{"goods_item_id": unconf_pm_item.id, "quantity": 1}],
            "service_tier_id": self.pm_tier.id,
        }
        res = self.client.post(pm_quote_url, data=json.dumps(payload), content_type="application/json")
        # In P&M, an unconfigured item triggers manual review/survey gating
        self.assertEqual(res.status_code, 200)
        quote = res.json().get("data", {})
        self.assertFalse(quote.get("is_authoritative"), "Unconfigured item must not receive an authoritative quote")
        self.assertIsNone(quote.get("total"), "Authoritative total must be None when unconfigured item is present")
        self.assertTrue(quote.get("requires_survey"), "Survey must be required for unconfigured items")
        self.assertEqual(quote.get("survey_status"), "MANUAL_REVIEW_REQUIRED")

    # 7. Existing valid catalog items remain unaffected
    @patch("service_requests.services.routing.get_route_eta")
    def test_existing_valid_catalog_items_remain_unaffected(self, mock_route):
        mock_route.return_value = _route(10.0)
        valid_item = GoodsItem.objects.create(
            category=self.category,
            name=f"Configured Standard Item {self.uid}",
            slug=f"conf-item-{self.uid}",
            default_weight_kg=Decimal("25.00"),
            default_cft=Decimal("5.00"),
            is_active=True,
        )

        gt_quote_url = "/api/logistics/quote/"
        payload = {
            "service_category": "goods_transport_truck",
            "tier_id": self.truck_tier.id,
            "pickup_latitude": "12.740900",
            "pickup_longitude": "77.825300",
            "drop_latitude": "12.935200",
            "drop_longitude": "77.624500",
            "cargo_items": [{"goods_item_id": valid_item.id, "quantity": 2}],
        }
        res = self.client.post(gt_quote_url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json().get("data", {})
        self.assertEqual(Decimal(str(data.get("cargo_summary", {}).get("total_weight_kg"))), Decimal("50.00"))
        self.assertEqual(Decimal(str(data.get("cargo_summary", {}).get("total_cft"))), Decimal("10.00"))
        self.assertTrue(data.get("cargo_summary", {}).get("is_valid"))
        self.assertIsNotNone(data.get("total"))
