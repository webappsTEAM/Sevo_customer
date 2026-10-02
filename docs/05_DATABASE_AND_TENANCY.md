# Sevo / CalTrack — Multi-Tenancy & Database Architecture

## 1. Multi-Tenant Data Isolation Strategy

CalTrack enforces multi-tenancy using **tenant-scoped row-level data isolation** within PostgreSQL. Every tenant organization is represented as a `Company` record, and all domain tables reference this parent company.

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
|  - customer_id: FK(User)                 |      |  - item_name: "Fresh Tomatoes"           |
|  - status: "IN_PROGRESS"                 |      |  - stock_quantity: 45.5 kg               |
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
+-----------------------+           +-----------------------+           +-----------------------+
|        Company        | 1       * |         User          | 1       * |    CustomerAddress    |
+-----------------------+ <-------- +-----------------------+ <-------- +-----------------------+
| id: UUID (PK)         |           | id: UUID (PK)         |           | id: UUID (PK)         |
| name: VarChar         |           | company_id: FK        |           | user_id: FK(User)     |
| slug: VarChar         |           | role: Enum            |           | latitude: Decimal     |
+-----------+-----------+           +-----------+-----------+           | longitude: Decimal    |
            | 1                                 | 1                     | formatted_address:Text|
            |                                   |                       +-----------------------+
            | *                                 | *
+-----------v-----------+           +-----------v-----------+
|    ServiceCategory    |           |    ServiceRequest     |
+-----------------------+           +-----------------------+
| id: UUID (PK)         | 1       * | id: UUID (PK)         |
| company_id: FK        | <-------- | company_id: FK        |
| name: VarChar         |           | customer_id: FK(User) |
| base_price: Decimal   |           | technician_id: FK     |
+-----------+-----------+           | address_id: FK        |
            | 1                     | status: StateEnum     |
            | *                     +-----------+-----------+
+-----------v-----------+                       | 1
|    ServicePackage     |                       |
+-----------------------+                       | 1
| id: UUID (PK)         |           +-----------v-----------+
| category_id: FK       |           |       Quotation       |
| name: VarChar         |           +-----------------------+
| price: Decimal        |           | id: UUID (PK)         |
+-----------------------+           | service_request_id:FK |
                                    | token: UUID (Unique)  |
                                    | subtotal: Decimal     |
                                    | tax: Decimal          |
                                    | grand_total: Decimal  |
                                    | status: QuoteEnum     |
                                    +-----------------------+
```

---

## 4. Vegetable Stock, Recipe & Cart Models

```text
+-------------------------+           +-------------------------+
|      VegetableItem      | 1       * |      RecipePackage      |
+-------------------------+ <-------- +-------------------------+
| id: UUID (PK)           |           | id: UUID (PK)           |
| name: VarChar           |           | name: VarChar (Sambhar) |
| price_per_kg: Decimal   |           | ingredients_json: JSON  |
| stock_kg: Decimal       |           | prep_instructions: Text |
| default_daily_stock: Dec|           +-------------------------+
+------------+------------+
             | 1
             | *
+------------v------------+           +-------------------------+
|  VegetableStockHistory  |           |          Cart           |
+-------------------------+           +-------------------------+
| id: UUID (PK)           |           | id: UUID (PK)           |
| vegetable_id: FK        |           | customer_id: FK(User)   |
| change_type: Enum       |           | session_token: VarChar  |
| delta_kg: Decimal       |           +------------+------------+
| reason: VarChar         |                        | 1
+-------------------------+                        | *
                                      +------------v------------+
                                      |        CartItem         |
                                      +-------------------------+
                                      | id: UUID (PK)           |
                                      | cart_id: FK             |
                                      | item_type: Enum         |
                                      | item_id: UUID           |
                                      | quantity: Decimal       |
                                      | unit: VarChar (kg/g)    |
                                      +-------------------------+
```

---

## 5. Logistics & Fleet Models

```text
+-----------------------+           +-----------------------+
|        Vehicle        | 1       * |   TransportBooking    |
+-----------------------+ <-------- +-----------------------+
| id: UUID (PK)         |           | id: UUID (PK)         |
| type: Enum (Tata Ace) |           | customer_id: FK(User) |
| license_plate: VarChar|           | pickup_lat / lng      |
| max_payload_kg: Int   |           | drop_lat / lng        |
+-----------------------+           | distance_km: Decimal  |
                                    | helper_count: Int     |
                                    | floor_no: Int         |
                                    | has_elevator: Bool    |
                                    | estimated_cost: Dec   |
                                    | status: TripStatusEnum|
                                    +-----------------------+
```
