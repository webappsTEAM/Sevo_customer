# Sevo / CalTrack — Backend Engineering Guide

## 1. Directory Structure

```text
backend/
├── quicktims/                  # Django project root settings, URLs, ASGI, WSGI
├── accounts/                   # Authentication, custom User model, RBAC, customer profiles, saved addresses
├── companies/                  # Tenant Company entity, multi-tenant managers & middleware
├── service_requests/           # Core service catalog, bookings, quotations, orders, state machine
│   ├── models.py               # Request, Category, ServiceItem, Quotation, Invoice, WorkExtension
│   ├── serializers.py          # DRF serializers for requests, quotations, payments
│   ├── views.py                # Customer & admin REST endpoints
│   ├── public_views.py         # Token-authenticated public endpoints (quotes, tracking)
│   ├── technician_views.py     # Technician job management & action endpoints
│   ├── payment_views.py        # Razorpay/Stripe checkout and webhook processing
│   ├── state_machine.py        # Order/Job status transitions & validation
│   ├── consumers.py            # Django Channels WebSocket consumers for live tracking
│   ├── services/               # Catalog, quotation, dispatch, notification services
│   └── selectors/              # Optimized database read queries
├── logistics/                  # Logistics, moving services, vehicle fleet tracking, Hosur rate engine
├── inventory/                  # Vegetable catalog, recipe mapping, spare parts, stock movements
├── carts/                      # Customer cart persistence & checkout sync
├── customer_care/              # Support tickets, customer communication, feedback & reviews
├── customer_analytics/         # Customer insights, retention, customer merge tools
├── reports/                    # Analytics aggregator, exports (CSV, PDF, Excel)
├── settings_hub/               # Global company configuration and tenant preferences
├── trial_management/           # Subscription tiers, trial expiration, billing cycles
├── workforce_integration/      # Third-party HR/Workforce integrations & sync
└── manage.py                   # Django CLI utility
```

---

## 2. Core Backend Domain Apps & Responsibilities

| App Name | Main Responsibilities | Key Models |
| :--- | :--- | :--- |
| **`accounts`** | User registration, JWT auth, RBAC roles (`ADMIN`, `MANAGER`, `TECHNICIAN`, `CUSTOMER`), customer saved addresses, device tokens. | `User`, `UserProfile`, `CustomerAddress`, `Role`, `DeviceToken` |
| **`companies`** | Multi-tenant organization boundaries, company settings, domain mapping. | `Company`, `CompanyBranch`, `TenantSettings` |
| **`service_requests`** | Service catalog hierarchy, dynamic quotations, state machine, job execution, payment processing, public quote tokens. | `ServiceCategory`, `ServicePackage`, `ServiceRequest`, `Quotation`, `Invoice`, `WorkExtension`, `JobStatusLog` |
| **`logistics`** | Vehicle fleet, Hosur mini-truck rate cards, two-wheeler parcel deliveries, packers & movers pricing rules. | `Vehicle`, `DriverProfile`, `TransportBooking`, `TripCheckpoint`, `LogisticsRateCard` |
| **`inventory`** | Fresh vegetables, recipe nutrition & ingredient links, spare parts, daily default stock, stock audit ledgers. | `VegetableItem`, `RecipePackage`, `InventoryItem`, `StockMovement`, `VegetableStockHistory` |
| **`carts`** | Customer active shopping carts, multi-item session synchronization, capacity validation. | `Cart`, `CartItem` |
| **`customer_care`** | Support tickets, dispute resolution, service ratings & feedback reviews with secure tokens. | `SupportTicket`, `TicketMessage`, `ServiceReview`, `FeedbackToken` |
| **`customer_analytics`** | Customer lifetime value (LTV), booking frequency, customer merges, SLA tracking. | `CustomerMetric`, `CustomerMergeLog` |

---

## 3. Service Request State Machine & Transition Rules

The lifecycle of a service booking is managed by a deterministic finite state machine (`service_requests/state_machine.py`):

```text
[ DRAFT / SUBMITTED ]
        │
        ▼
   [ PENDING ] ──────────(Cancel / Decline)──────────> [ CANCELLED ]
        │
   (Generate Quotation)
        ▼
   [ QUOTED ]  ──────────(Customer Declines)─────────> [ REJECTED ]
        │
   (Customer Accepts via /customer/quote/:token)
        ▼
   [ ACCEPTED ]
        │
   (Auto/Manual Dispatch)
        ▼
   [ ASSIGNED ]
        │
   (Technician starts travel)
        ▼
   [ EN_ROUTE ]
        │
   (Technician Arrives & Clocks In with Geofence)
        ▼
  [ IN_PROGRESS ]
        │
   (Job Complete + Customer Signature + Photos)
        ▼
   [ COMPLETED ]
        │
   (Generate Final Invoice)
        ▼
    [ INVOICED ] ──────(Process Payment)─────────────> [ PAID ]
```

---

## 4. Key REST API Endpoints Reference

### A. Authentication & Customer Profiles (`/api/auth/` & `/api/accounts/`)
- `POST /api/auth/login/` — Authenticate and receive JWT access & refresh tokens.
- `POST /api/auth/register/` — Register a new customer user.
- `GET  /api/auth/me/` — Retrieve currently authenticated user context, roles, and profile.
- `GET  /api/accounts/addresses/` — List customer saved addresses.
- `POST /api/accounts/addresses/` — Save a new address with geocoded latitude, longitude, and formatted text.
- `DELETE /api/accounts/addresses/<id>/` — Delete a saved address.

### B. Service Catalog & Customer Bookings (`/api/service-requests/`)
- `GET  /api/service-requests/categories/` — List active categories (AC, Cleaning, Electrical, Plumbing, Painting, Pest Control, etc.).
- `GET  /api/service-requests/catalog/` — Retrieve hierarchical catalog with packages, sub-services, and add-ons.
- `POST /api/service-requests/bookings/` — Create a new customer booking request with selected packages, date/time slot, and address.
- `GET  /api/service-requests/bookings/` — List customer bookings (scoped to authenticated user).
- `GET  /api/service-requests/bookings/<id>/` — Retrieve full booking details, technician details, and event timeline.
- `POST /api/service-requests/bookings/<id>/cancel/` — Cancel a pending/assigned booking with reason code.

### C. Public Token Decision Endpoints (`/api/service-requests/public/`)
- `GET  /api/service-requests/public/quote/<token>/` — Retrieve itemized quotation details without authentication.
- `POST /api/service-requests/public/quote/<token>/decide/` — Submit customer decision (`action`: `ACCEPT` or `DECLINE`, `signature`: base64, `decline_reason`: text).
- `GET  /api/service-requests/public/track/<id>/` — Validate tracking token and fetch initial booking coordinates and technician status.

### D. Vegetables & Recipe Catalog (`/api/inventory/` & `/api/vegetables/`)
- `GET  /api/inventory/vegetables/` — Retrieve fresh vegetable stock, unit options (`kg`/`g`), and pricing.
- `GET  /api/inventory/recipes/` — List curated recipes with ingredients, preparation instructions, and recommended vegetables.
- `POST /api/inventory/cart/sync/` — Sync customer cart items and validate live stock availability.
- `POST /api/inventory/vegetables/order/` — Submit vegetable cart order with delivery slot.

### E. Logistics & Transport Endpoints (`/api/logistics/`)
- `POST /api/logistics/quote/` — Calculate estimated price for Mini Trucks, 2-Wheelers, or Packers & Movers based on pickup/drop coordinates, vehicle type, helpers, and floor levels.
- `POST /api/logistics/bookings/` — Create a goods transport / moving booking.
- `GET  /api/logistics/bookings/<id>/` — Retrieve transport booking status and assigned driver.

### F. Customer Care & Reviews (`/api/customer-care/`)
- `POST /api/customer-care/tickets/` — Submit a new support ticket or complaint.
- `GET  /api/customer-care/tickets/` — List customer support tickets and status updates.
- `POST /api/customer-care/public/feedback/<token>/` — Submit multi-criteria star rating, technician evaluation, and comments.

---

## 5. Security, Tenancy & Permissions Rules
1. **Tenant Isolation**: Every database query on scoped models must pass through `CompanyScopedManager` ensuring cross-tenant boundaries are strictly maintained.
2. **Customer Data Partitioning**: Customer endpoints always scope querysets to `request.user.id` so customers can only access their own bookings, addresses, and invoices.
3. **Public Token Validation**: All token-accessible views verify token signature, cryptographic hash, expiry timestamp, and one-time decision state before mutating records.
