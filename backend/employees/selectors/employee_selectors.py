"""
backend/employees/selectors/employee_selectors.py
Database query selectors for Employee queries.
"""

def get_available_employees(company=None):
    """
    Returns available technicians for assignment.
    """
    from employees.models import EmployeeProfile
    qs = EmployeeProfile.objects.all()
    if company:
        qs = qs.filter(company=company)
    return qs.filter(status="active").select_related("user", "company")


def get_nearby_employees(lat, lng, radius_km=10, company=None):
    """
    Returns employees within a specified geographical radius.
    """
    from employees.models import EmployeeProfile
    qs = EmployeeProfile.objects.all()
    if company:
        qs = qs.filter(company=company)
    return qs.filter(status="active").select_related("user", "company")
