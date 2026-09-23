# sevo / QuickTIMS — Multi-Tenancy & Database Architecture

## 1. Multi-Tenant Data Isolation Strategy

sevo enforces multi-tenancy using **tenant-scoped row-level data isolation** within PostgreSQL. Every tenant organization is represented as a `Company` record, and all domain tables reference this parent company.

```text
                               +-----------------------------+
                               |     Company (Tenant Org)    |
                               |   id: UUID / PK             |
                               |   name: "Acme Services"     |
                               +--------------+--------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
+------------------------------------------+      +------------------------------------------+
|            CompanyScopedModel            |      |            CompanyScopedModel            |
|       (ServiceRequest / Bookings)        |      |         (Inventory / Stock Items)        |
|  - company_id: FK(Company)               |      |  - company_id: FK(Company)               |
|  - customer_id: FK(User)                 |      |  - item_name: "1.5 Ton AC Compressor"    |
|  - status: "IN_PROGRESS"                 |      |  - quantity: 14                          |
+------------------------------------------+      +------------------------------------------+
```

---

## 2. CompanyScopedManager & QuerySet Isolation

To eliminate the risk of accidental cross-tenant data leaks, backend models inherit from `CompanyScopedModel`:

```python
class CompanyScopedQuerySet(models.QuerySet):
    def for_company(self, company):
        return self.filter(company=company)

class CompanyScopedManager(models.Manager):
    def get_queryset(self):
        return CompanyScopedQuerySet(self.model, using=self._db)

    def for_company(self, company):
        return self.get_queryset().for_company(company)

class CompanyScopedModel(models.Model):
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name="%(class)ss"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyScopedManager()

    class Meta:
        abstract = True
```

---

## 3. Key Entity-Relationship (ER) Diagram

```text
+-----------------------+           +-----------------------+
|        Company        | 1       * |         User          |
+-----------------------+ <-------- +-----------------------+
| id: UUID (PK)         |           | id: UUID (PK)         |
| name: VarChar         |           | company_id: FK        |
| slug: VarChar         |           | role: Enum            |
+-----------+-----------+           +-----------+-----------+
            | 1                                 | 1
            |                                   |
            | *                                 | *
+-----------v-----------+           +-----------v-----------+
|    ServiceCategory    |           |    ServiceRequest     |
+-----------------------+           +-----------------------+
| id: UUID (PK)         | 1       * | id: UUID (PK)         |
| company_id: FK        | <-------- | company_id: FK        |
| name: VarChar         |           | customer_id: FK(User) |
| base_price: Decimal   |           | technician_id: FK     |
+-----------------------+           | status: StateEnum     |
                                    +-----------+-----------+
                                                | 1
                                                |
                                                | 1
                                    +-----------v-----------+
                                    |       Quotation       |
                                    +-----------------------+
                                    | id: UUID (PK)         |
                                    | service_request_id:FK |
                                    | subtotal: Decimal     |
                                    | tax: Decimal          |
                                    | grand_total: Decimal  |
                                    | status: QuoteEnum     |
                                    +-----------------------+
```

---

## 4. Vegetable Stock & Inventory Models

```text
+-----------------------+           +-----------------------+
|        Package        | 1       1 |     InventoryItem     |
+-----------------------+ <-------> +-----------------------+
| id: BigAutoField (PK) |           | id: BigAutoField (PK) |
| name: VarChar         |           | org_id: FK(Company)   |
| stock_item_id: FK(1:1)|           | stock_quantity_grams  |
| base_price: Decimal   |           | default_daily_qty_g   |
+-----------------------+           | unit: VarChar         |
                                    | last_reset_date: Date |
                                    +-----------+-----------+
                                                | 1
                                                |
                                                | *
                                    +-----------v-----------+
                                    |     StockMovement     |
                                    +-----------------------+
                                    | id: BigAutoField (PK) |
                                    | org_id: FK(Company)   |
                                    | item_id: FK           |
                                    | movement_type: Enum   |
                                    | delta_grams: Integer  |
                                    | balance_after_grams   |
                                    | reason: Text          |
                                    | booking_ref: VarChar  |
                                    | created_at: DateTime  |
                                    +-----------------------+
```

---

## 5. Migration & Seeding Workflows

The repository contains automated seed scripts located in `backend/` for catalog initialization:
- `python seed_catalog.py` — Populates standard service categories (Plumbing, Electrical, Carpentry, AC Repair, Masonry).
- `python seed_ac_and_repair_services_data.py` — Populates complex appliance repair subservices.
- `python seed_all_68_vegetable_recipes.py` — Populates customized meal kit recipes and pricing packages.
- `python setup_tenants.py` — Provisions initial demo company tenant and admin account.

