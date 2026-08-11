"""
backend/service_requests/services/assignment_service.py
Service layer for technician matching, auto-assignment, and dispatch.
"""
from django.db import transaction


class AssignmentService:

    @staticmethod
    @transaction.atomic
    def assign_technician(booking, employee, assigned_by=None):
        """
        Assigns an employee to a booking request.
        """
        if hasattr(booking, "assigned_employee"):
            booking.assigned_employee = employee
        booking.status = "assigned"
        booking.save()
        return booking
