# sevo / QuickTIMS — Backend Engineering Guide

## 1. Directory Structure

```text
backend/
├── quicktims/                  # Django project root settings, urls, asgi, wsgi
├── accounts/                   # Authentication, custom User model, RBAC, profiles
├── companies/                  # Tenant Company entity, multi-tenant managers & middleware
├── service_requests/           # Core domain: service catalog, bookings, quotations, orders
│   ├── models.py               # Request, Category, ServiceItem, Quotation, Invoice, etc.
│   ├── serializers.py          # DRF serializers for requests, quotations, payments
│   ├── views.py                # Customer & admin REST endpoints
│   ├── technician_views.py     # Technician job management & action endpoints
│   ├── payment_views.py        # Razorpay/Stripe checkout and webhook processing
│   ├── state_machine.py        # Order/Job status transitions & validation
│   ├── consumers.py            # Django Channels WebSocket consumers for live tracking
│   ├── services/               # Catalog, quotation, dispatch, notification services
│   └── selectors/              # Optimized database read queries
├── logistics/                  # Logistics, moving services, vehicle fleet tracking
├── inventory/                  # Parts, raw materials, stock movement per service job
├── customer_care/              # Support tickets, customer ratings, dispute resolution
├── customer_analytics/         # Customer insights, churn, retention metrics
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
| **`accounts`** | User registration, JWT tokens, RBAC roles (`ADMIN`, `MANAGER`, `TECHNICIAN`, `CUSTOMER`), device tokens. | `User`, `UserProfile`, `Role`, `DeviceToken` |
| **`companies`** | Multi-tenant organization boundaries, company settings, domain mapping. | `Company`, `CompanyBranch`, `TenantSettings` |
| **`service_requests`** | Service catalog, pricing formulas, job lifecycle state machine, quotation approvals, invoices. | `ServiceCategory`, `ServicePackage`, `ServiceRequest`, `Quotation`, `Invoice`, `JobStatusLog` |
| **`logistics`** | Vehicle fleets, goods transport, mover packages, driver assignment, dispatch logs. | `Vehicle`, `DriverProfile`, `TransportBooking`, `TripCheckpoint` |
| **`inventory`** | Spare parts inventory, items consumed per repair job, low-stock reorder thresholds. | `InventoryItem`, `StockMovement`, `JobItemUsage` |
| **`customer_care`** | Support tickets, customer communication, feedback & ratings. | `SupportTicket`, `TicketMessage`, `ServiceReview` |
| **`reports`** | Financial summaries, employee work hours, revenue per category, technician performance. | `ReportExport`, `AnalyticsSnapshot` |

---

## 3. Service Request Lifecycle & State Transitions

The `service_requests` module is driven by a deterministic finite state machine (`state_machine.py`):

```text
[ DRAFT / SUBMITTED ]
        │
        ▼
   [ PENDING ] ──────────(Reject)──────────> [ CANCELLED ]
        │
   (Generate Quotation)
        ▼
   [ QUOTED ]  ──────────(Customer Declines)─> [ REJECTED ]
        │
   (Customer Accepts)
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
   (Technician Arrives & Clocks In)
        ▼
  [ IN_PROGRESS ]
        │
   (Job Complete + Signature + Photo)
        ▼
   [ COMPLETED ]
        │
   (Generate Final Invoice)
        ▼
    [ INVOICED ] ──────(Process Payment)────> [ PAID ]
```

---

## 4. Key REST API Endpoints

### Authentication & Profiles (`/api/auth/` & `/api/accounts/`)
- `POST /api/auth/login/` — Authenticate and receive JWT access & refresh tokens.
- `POST /api/auth/register/` — Register a new customer or organization user.
- `GET  /api/auth/me/` — Retrieve currently authenticated user context and roles.

### Service Catalog & Bookings (`/api/service-requests/`)
- `GET  /api/service-requests/categories/` — List active service categories.
- `GET  /api/service-requests/catalog/` — Retrieve catalog hierarchy, pricing cards, and package options.
- `POST /api/service-requests/bookings/` — Create a new customer service request.
- `GET  /api/service-requests/bookings/` — List scoped bookings (filtered for customer, technician, or company admin).
- `GET  /api/service-requests/bookings/<id>/` — Retrieve full booking detail, timeline, and assigned staff.
- `POST /api/service-requests/bookings/<id>/accept-quote/` — Customer quote acceptance.

### Technician Operations (`/api/service-requests/technician/`)
- `GET  /api/service-requests/technician/assigned-jobs/` — List active tasks for current technician.
- `POST /api/service-requests/technician/jobs/<id>/status-update/` — Move status to `EN_ROUTE`, `IN_PROGRESS`, `COMPLETED`.
- `POST /api/service-requests/technician/jobs/<id>/upload-proof/` — Submit job completion photos and customer signature.

### Payments & Invoicing (`/api/service-requests/payments/`)
- `POST /api/service-requests/payments/create-order/` — Initialize payment gateway intent (Razorpay/Stripe).
- `POST /api/service-requests/payments/verify/` — Validate payment signature and mark invoice `PAID`.

### Vegetable Stock & Daily Capacity (`/api/inventory/vegetable-stock/`)
- `GET  /api/inventory/vegetable-stock/` — Admin list of all vegetable items with live stock, default capacity, and status.
- `POST /api/inventory/vegetable-stock/<id>/restock/` — Additive intra-day restock (`quantity`, `unit`).
- `POST /api/inventory/vegetable-stock/<id>/adjust/` — Absolute intra-day stock correction (`quantity`, `unit`, `reason`).
- `POST /api/inventory/vegetable-stock/<id>/set-default/` — Configure daily 4:00 AM reset baseline capacity (`quantity`, `unit`, `apply_now`).
- `GET  /api/inventory/vegetable-stock/<id>/history/` — Dynamic daily opening/sold/closing history ledger and transaction audit log.

