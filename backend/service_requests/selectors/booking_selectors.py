"""
backend/service_requests/selectors/booking_selectors.py
Database query selectors for ServiceRequests and Bookings.
"""

def get_customer_bookings(customer):
    """
    Retrieves all bookings for a given customer account.
    """
    from service_requests.models import ServiceRequest
    if customer is None or not getattr(customer, "is_authenticated", False):
        return ServiceRequest.objects.none()
    return (
        ServiceRequest.objects.filter(customer=customer)
        .select_related("assigned_employee", "company")
        .order_by("-created_at")
    )


def get_company_bookings(company):
    """
    Retrieves all bookings for a company tenant.
    """
    from service_requests.models import ServiceRequest
    if not company:
        return ServiceRequest.objects.none()
    return (
        ServiceRequest.objects.filter(company=company)
        .select_related("customer", "assigned_employee")
        .order_by("-created_at")
    )
