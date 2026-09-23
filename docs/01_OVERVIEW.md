# QuickTIMS / sevo — Comprehensive System Overview

## 1. Project Introduction
**QuickTIMS / sevo** is an enterprise-grade, multi-tenant SaaS platform built for **field workforce management, service requests & dispatching, geofenced real-time GPS tracking, logistics & fleet transport, inventory, customer care, and automated payroll/invoicing**.

The platform caters to multi-role workflows including **Super Admins**, **Company Admins/Managers**, **Technicians/Field Workers**, and **End Customers**.

---

## 2. Technology Stack & Key Libraries

### Backend
- **Core Runtime & Framework**: Python 3.13, Django 5.2, Django REST Framework (DRF)
- **Real-Time Communication**: Django Channels + Daphne (ASGI) + WebSockets
- **Authentication**: JWT (`djangorestframework-simplejwt`), Google OAuth, RBAC permissions
- **Background Jobs & Scheduling**: Celery + Redis + `django_celery_beat`
- **Database & Isolation**: PostgreSQL with tenant/company-level scoping (`CompanyScopedManager`, `CompanyScopedQuerySet`)
- **File & Media Handling**: Pillow, dynamic PDF invoice/receipt generators

### Frontend
- **Framework & Bundler**: React 19, Vite
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Routing**: React Router v6
- **Maps & Geolocation**: Leaflet, React-Leaflet, OpenStreetMap / Geocoding APIs
- **Icons & UI**: Lucide React, CSS variables & Tailwind CSS integration
- **Charts & Visualizations**: Recharts / Chart.js

---

## 3. High-Level System Architecture

```text
                               +---------------------------------------------+
                               |                 CLIENT APPS                 |
                               |    Customer Portal / Admin Dashboard /      |
                               |          Technician Mobile-Web UI           |
                               +----------------------+----------------------+
                                                      |
                                           REST API / WebSockets
                                                      |
                                                      v
                               +---------------------------------------------+
                               |            REVERSE PROXY / NGINX            |
                               +----------------------+----------------------+
                                                      |
                                                      v
                               +---------------------------------------------+
                               |             DAPHNE / ASGI (Django)          |
                               +----------------------+----------------------+
                                                      |
                     +--------------------------------+--------------------------------+
                     |                                                                 |
                     v                                                                 v
+------------------------------------------+                      +------------------------------------------+
|          DJANGO DOMAIN APPS              |                      |         REALTIME & ASYNC ENGINES         |
| • accounts: Auth, RBAC, Users            |                      | • Channels Consumers (Live Tracking WS)  |
| • companies: Multi-tenant scoping        |                      | • Redis Channel Layer & Caching          |
| • service_requests: Catalog, Jobs, State |                      | • Celery Worker (Async Tasks, PDFs)      |
| • logistics: Transport, Moving, Fleets   |                      | • Celery Beat (Scheduled Jobs)           |
| • inventory: Stock, Goods tracking       |                      +------------------------------------------+
| • customer_care & customer_analytics     |
| • settings_hub & platform_control        |
+--------------------+---------------------+
                     |
                     v
+------------------------------------------+
|           PERSISTENCE LAYER              |
| • PostgreSQL Database (Company Scoped)   |
| • Media Storage (Receipts, Signatures)   |
+------------------------------------------+
```

---

## 4. Key Functional Modules

### A. Authentication, Multi-Tenancy & RBAC (`accounts`, `companies`)
- Supports tenant company onboarding, roles (Admin, Dispatcher, Technician, Customer), and company-scoped data partitioning ensuring 100% tenant isolation.

### B. Service Catalog & Request Lifecycle (`service_requests`)
- **Catalog Management**: Home services, appliance repair, kitchen installations, waterproofing, custom vegetable & recipe packages, and labor rate cards.
- **Request State Machine**: Transition states from `PENDING` -> `QUOTED` -> `ACCEPTED` -> `ASSIGNED` -> `EN_ROUTE` -> `IN_PROGRESS` -> `COMPLETED` -> `INVOICED` -> `PAID`.
- **Pricing & Quotations**: Dynamic pricing engine calculating item costs, labor charges, taxes, and customer quotations.

### C. Field Workforce & Live Geolocation (`service_requests/consumers.py`, `logistics`)
- **GPS Verification**: Clock-in/out with geofence verification and photo capture.
- **Live Location Tracking**: High-frequency coordinate ingestion sent over WebSockets through Redis channels to client map views.
- **Dispatch Engine**: Proximity-based and skill-based matching of technicians to service requests.

### D. Logistics, Movers & Fleet Management (`logistics`)
- Vehicle dispatch, truck packages, goods transport tracking, and route checkpoints.

### E. Inventory & Stock Control (`inventory`)
- Parts and materials management, tracking consumption per service job, stock replenishment alerts.

### F. Customer Care & Analytics (`customer_care`, `customer_analytics`)
- Support ticketing, customer feedback, SLA monitoring, and revenue/job performance reporting.

---

## 5. Directory Structure Reference

```text
calservices/
├── docs/                                # Project documentation
│   ├── 01_OVERVIEW.md                   # This document
│   ├── 02_ARCHITECTURE.md              # Deep-dive architecture & data flows
│   ├── 03_BACKEND_GUIDE.md              # Backend apps, models, APIs, and services
│   ├── 04_FRONTEND_GUIDE.md             # Frontend routes, components, state management
│   ├── 05_DATABASE_AND_TENANCY.md       # Database schemas, scoping, and relationships
│   ├── 06_REALTIME_AND_LOGISTICS.md     # WebSockets, live GPS tracking, logistics
│   └── 07_LOCAL_DEVELOPMENT_SETUP.md    # Local setup and run guide
│
├── backend/                             # Django Backend application
│   ├── quicktims/                       # Django project root settings and ASGI/WSGI
│   ├── accounts/                        # User profiles, auth, permissions
│   ├── companies/                       # Tenant companies and organizations
│   ├── service_requests/                # Service catalog, bookings, quotations, orders
│   ├── logistics/                       # Fleet and goods transport
│   ├── inventory/                       # Parts and material stock management
│   ├── customer_care/                   # Support tickets and reviews
│   ├── reports/                         # Business intelligence & export reports
│   ├── settings_hub/                    # Tenant platform settings
│   └── manage.py                        # Django CLI entrypoint
│
├── frontend/                            # React + Vite Frontend application
│   ├── src/
│   │   ├── app/                         # App providers, routes, theme
│   │   ├── features/                    # Feature domains (booking, tracking, auth, admin)
│   │   ├── components/ / ui/            # UI components and reusable widgets
│   │   ├── store/ / state/              # Redux slices and global store
│   │   ├── services/ / api/             # API client services
│   │   └── main.jsx                     # Vite entry point
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml                   # Local Docker stack (Postgres, Redis)
└── README.md                            # Quickstart guide
```
