"""
backend/service_requests/services/pricing_service.py
Service layer for service request pricing calculations.
"""
from decimal import Decimal


class PricingService:

    @staticmethod
    def calculate_price(service_type, distance_km=0, item_count=1, base_rate=None):
        """
        Calculates total price based on service type, distance, and base rate.
        """
        base = Decimal(str(base_rate or 500))
        distance_charge = Decimal(str(distance_km)) * Decimal("15")
        item_charge = Decimal(str(item_count - 1 if item_count > 1 else 0)) * Decimal("100")
        total = base + distance_charge + item_charge
        return {
            "base_rate": float(base),
            "distance_charge": float(distance_charge),
            "item_charge": float(item_charge),
            "total_price": float(total),
        }
