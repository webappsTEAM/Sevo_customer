"""
backend/live_locations/selectors/location_selectors.py
Database query selectors for Live Locations and GPS tracking.
"""

def get_latest_employee_locations(company=None):
    """
    Retrieves the most recent live location ping for each employee.
    """
    from live_locations.models import EmployeeLiveLocation
    qs = EmployeeLiveLocation.objects.all()
    if company:
        qs = qs.filter(company=company)
    return qs.select_related("employee", "company").order_by("employee", "-timestamp").distinct("employee")
