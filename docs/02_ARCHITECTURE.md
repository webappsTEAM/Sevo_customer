# CalTrack / QuickTIMS — Architecture & Engineering Design

## 1. Architectural Philosophy
The system implements a **Modular Monolith** with clear domain separation. Rather than splitting into complex microservices prematurely, each capability is housed as an independent Django domain application on the backend and modular feature directory on the frontend.

```text
                               +-------------------------------------------------+
                               |                   User / Client                 |
                               +-----------------------+-------------------------+
                                                       |
                                            HTTP / WebSocket / HTTPS
                                                       |
                                                       v
                               +-------------------------------------------------+
                               |             Nginx / Reverse Proxy               |
                               +-----------+-------------------------+-----------+
                                           |                         |
                           Static / SPA    |                         | API / WS Requests
                                           v                         v
                           +----------------------+   +--------------------------+
                           |  Vite SPA (React 19) |   |  Daphne ASGI Server      |
                           +----------------------+   +-------------+------------+
                                                                    |
                                                                    v
                                                      +--------------------------+
                                                      | Django Middleware Stack  |
                                                      | (Tenant, Auth, CORS)     |
                                                      +-------------+------------+
                                                                    |
                                        +---------------------------+---------------------------+
                                        |                           |                           |
                                        v                           v                           v
                             +--------------------+     +-----------------------+   +----------------------+
                             | Accounts & Auth    |     | Service Requests      |   | Logistics & Fleets   |
                             +--------------------+     +-----------------------+   +----------------------+
                                        |                           |                           |
                                        +---------------------------+---------------------------+
                                                                    |
                                        +---------------------------+---------------------------+
                                        |                                                       |
                                        v                                                       v
                             +--------------------+                                 +----------------------+
                             | PostgreSQL Engine  |                                 | Redis Layer          |
                             | (Company Scoped)   |                                 | (Cache + WS Pub/Sub) |
                             +--------------------+                                 +----------+-----------+
                                                                                               |
                                                                                    +----------v-----------+
                                                                                    | Celery Worker & Beat |
                                                                                    | (Async Jobs, Crons)  |
                                                                                    +----------------------+
```

---

## 2. Request Handling & Architectural Layers

For all backend operations, the project enforces a three-tier separation of concerns:

```text
[ HTTP Request / WebSocket ]
             │
             ▼
      [ Views / API Layer ]  ──>  Serializers (Data validation & transformation)
             │
             ▼
     [ Services Layer ]      ──>  Encapsulated business logic & transactional actions
             │
             ▼
     [ Selectors Layer ]     ──>  Optimized database reads & filtered querysets
             │
             ▼
      [ Django ORM ]         ──>  PostgreSQL (Company Scoped Manager)
```

1. **Views (`views.py`, `payment_views.py`, `technician_views.py`)**:
   - Receive HTTP requests, perform authentication/permission checks, and route payload to serializers.
   - Do not contain heavy business calculations or raw database mutations.
2. **Serializers (`serializers.py`)**:
   - Validate incoming payload structure, types, and constraints.
3. **Services (`services/*.py`)**:
   - Execute domain business logic (e.g. calculation of dynamic quotations, assigning technicians, generating invoices, dispatching notifications).
   - Atomic database write operations wrapped in transactions (`@transaction.atomic`).
4. **Selectors (`selectors/*.py`)**:
   - Provide clean, reusable querying interfaces with proper indexing, caching, and `select_related`/`prefetch_related` optimizations.

---

## 3. Real-Time WebSocket Data Flow

Real-time geolocation tracking is decoupled from heavy database writes:

```text
[ Technician App ]  ──(WS: Lat/Lng every 3s)──> [ Daphne ASGI ]
                                                       │
                                                       ▼
                                            [ LocationConsumer ]
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           │                                                       │
                           ▼                                                       ▼
                [ Redis Channel Layer ]                                  [ Redis Geolocation Cache ]
                           │                                            (Last known coords per tech)
                           ▼                                                       │
           [ Broadcast to Customer/Admin Rooms ]                                   ▼
                           │                                            [ Periodic Async Flush ]
                           ▼                                                       │
              [ Leaflet Map Live Render ]                                          ▼
                                                                           [ Database History ]
```

---

## 4. Multi-Tenant Isolation Pattern

1. Every user belongs to a `Company` tenant organization.
2. Models inherit from `CompanyScopedModel` and use `CompanyScopedManager`.
3. Default querysets automatically enforce `filter(company=request.user.company)`.
4. Guarantees cross-tenant data isolation at the ORM layer.

---

## 5. Vegetable Stock & Daily Capacity Architecture

The Vegetable Stock sub-domain handles daily perishable inventory where stock represents vendor selling capacity rather than static warehouse physical bins.

```text
[ Daily 4:00 AM Celery Beat Reset ]  ──>  [ InventoryItem.default_daily_quantity_grams ]
                                                        │
                                                        ▼
[ Customer Cart Checkout ]  ──(Atomic Row Lock)──> [ reserve_stock_for_booking_items() ]
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                       [ StockMovement (SOLD) ]               [ Invalidate Tenant Cache ]
```

### Key Architectural Characteristics:
1. **Integer Gram Standard**: All internal stock mathematical operations, booking reservations, and movements are executed and persisted in integer grams to eliminate floating-point drift.
2. **Deterministic Locking**: Deadlock-free reservations acquire row locks via `select_for_update()` ordered strictly by ascending `InventoryItem.id`.
3. **Idempotent Daily Reset**: Automatic daily reset (scheduled at 4:00 AM via Celery) resets available capacity to `default_daily_quantity_grams` and records an audit movement, with self-healing checks on checkout.
4. **Ledger-Based History**: Daily opening, restocked, sold, and closing history are computed dynamically from `StockMovement` immutable audit rows without dedicated secondary history tables.
