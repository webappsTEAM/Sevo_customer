# CalTrack Database Architecture Documentation

## Primary Database: PostgreSQL

CalTrack utilizes PostgreSQL as its primary production relational database.

### Schema Architecture & Multi-Company Scoping

```text
Company (Tenant Root Entity)
   │
   ├── User / EmployeeProfile / CustomerProfile
   ├── ServiceRequest / Booking
   ├── Task / WorkOrder
   ├── EmployeeLiveLocation
   ├── PayrollRecord
   ├── InventoryItem
   └── MileageLog
```

### Multi-Company Isolation Mechanism

Row-level data isolation is enforced through `CompanyScopedManager` and `CompanyScopedQuerySet` (`common/models.py`):

```python
class CompanyScopedQuerySet(models.QuerySet):
    def for_company(self, company):
        if company is None:
            return self.none()
        return self.filter(company=company)

    def visible_to(self, user):
        if user is None or not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self
        company = getattr(user, "company", None)
        return self.for_company(company)
```

### Indexing & Performance Strategies
1. **Foreign Key Indexes**: Automatic indexes on `company_id`, `customer_id`, `employee_id`.
2. **Composite Indexes**: Added for high-frequency queries e.g. `(company_id, status)`, `(company_id, created_at)`.
3. **Query Optimization**: Database query logic is isolated in `selectors/` using `select_related()` and `prefetch_related()` to eliminate N+1 query overhead.
