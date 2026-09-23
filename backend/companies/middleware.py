"""
CompanyMiddleware is deprecated and removed from the active middleware stack.
The platform operates as a unified global single-application architecture.
"""
from django.utils.deprecation import MiddlewareMixin


class CompanyMiddleware(MiddlewareMixin):
    """Deprecated no-op middleware retained only for backwards compatibility."""
    def process_request(self, request):
        return None
