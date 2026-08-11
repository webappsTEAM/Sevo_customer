"""
backend/payroll/selectors/payroll_selectors.py
Database query selectors for Payroll records.
"""

def get_company_payroll(company, period_start=None, period_end=None):
    """
    Retrieves payroll records for a company within an optional date range.
    """
    from payroll.models import PayrollRecord
    if not company:
        return PayrollRecord.objects.none()
    qs = PayrollRecord.objects.filter(company=company)
    if period_start:
        qs = qs.filter(created_at__gte=period_start)
    if period_end:
        qs = qs.filter(created_at__lte=period_end)
    return qs.select_related("employee", "company").order_by("-created_at")
