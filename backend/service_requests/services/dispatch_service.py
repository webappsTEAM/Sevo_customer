"""
backend/service_requests/services/dispatch_service.py
Service layer for booking dispatch and external workforce integration.
"""
from workforce_integration.services import WorkforceIntegrationService


class DispatchService:

    @staticmethod
    def dispatch_booking(booking, notes=""):
        """
        Dispatches booking to external workforce management system.
        """
        return WorkforceIntegrationService.dispatch_job(booking, notes=notes)


# Backwards compatibility alias
AssignmentService = DispatchService
