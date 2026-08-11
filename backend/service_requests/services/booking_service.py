"""
backend/service_requests/services/booking_service.py
Service layer for booking creation, updates, and state transitions.
"""
from django.db import transaction
from django.utils import timezone


class BookingService:

    @staticmethod
    @transaction.atomic
    def create_booking(user, data, company=None):
        """
        Coordinates creation of a new booking request.
        """
        from service_requests.models import Booking
        company_obj = company or getattr(user, "company", None)
        
        booking = Booking.objects.create(
            customer=user if getattr(user, "role", "") == "customer" else None,
            company=company_obj,
            service_type=data.get("service_type", "general"),
            scheduled_date=data.get("scheduled_date"),
            status=data.get("status", "pending"),
            notes=data.get("notes", ""),
        )
        return booking

    @staticmethod
    @transaction.atomic
    def cancel_booking(booking, reason="", user=None):
        """
        Cancels an active booking request.
        """
        booking.status = "cancelled"
        if hasattr(booking, "cancellation_reason"):
            booking.cancellation_reason = reason
        booking.save()
        return booking
