# Sevo / CalTrack — Comprehensive System Overview

## 1. Project Introduction
**Sevo / CalTrack (QuickTIMS)** is an enterprise-grade, multi-tenant SaaS platform built for **customer on-demand services, fresh vegetable & grocery provisioning with recipe intelligence, logistics & moving transport, real-time geofenced GPS tracking, field workforce management, dynamic quotations, and automated customer care**.

The platform provides a unified ecosystem connecting:
1. **End Customers**: A modern, responsive web application for booking home services, ordering fresh vegetables/recipes, scheduling logistics/moving trucks, approving interactive quotations, tracking service providers live on a map, and managing saved addresses, wallets, and AMC plans.
2. **Technicians & Drivers**: Field worker interface for clocking in/out with geofencing, receiving job dispatches, streaming live GPS coordinates, capturing photos/signatures, and managing service extensions.
3. **Company Admins & Dispatchers**: Multi-tenant operational portal for dispatching jobs, managing catalog categories/pricing/rate cards, approving vegetable inventory & claims, tracking fleets, and resolving support tickets.
4. **Super Admins**: Global multi-tenant administration, tenant company provisioning, platform control, branding, and billing/trial management.

---

## 2. Technology Stack & Key Libraries

### Backend
- **Core Runtime & Framework**: Python 3.13, Django 5.2, Django REST Framework (DRF)
- **Real-Time Communication**: Django Channels + Daphne (ASGI) + WebSockets
- **Authentication & Security**: JWT (`djangorestframework-simplejwt`), Google OAuth, RBAC permissions, Secure Token-Based Public Access (Quotes, Tracking, Feedback)
- **Background Jobs & Scheduling**: Celery + Redis + `django_celery_beat`
- **Database & Multi-Tenancy**: PostgreSQL with tenant/company-level scoping (`CompanyScopedManager`, `CompanyScopedQuerySet`)
- **File & Media Handling**: Pillow, dynamic PDF generation for invoices, receipts, and inventory audit reports

### Frontend
- **Framework & Bundler**: React 19, Vite
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Routing**: React Router v6 with public token routes and authenticated customer account routes
- **Maps & Geolocation**: Leaflet, React-Leaflet, OpenStreetMap, Nominatim & OSRM Geocoding/Routing APIs
- **Icons & UI**: Lucide React, Tailwind CSS, custom CSS design system & micro-animations
- **Charts & Visualizations**: Recharts / Chart.js

---

## 3. High-Level System Architecture

```text
                               +-------------------------------------------------+
                               |                   CLIENT APPS                   |
                               |  Customer Web Portal / Admin Operations Hub /   |
                               |           Technician Field Worker Web           |
                               +-----------------------+-------------------------+
                                                       |
                                            REST API / WebSockets
                                                       |
                                                       v
                               +-------------------------------------------------+
                               |              REVERSE PROXY / NGINX              |
                               +-----------------------+-------------------------+
                                                       |
                                                       v
                               +-------------------------------------------------+
                               |             DAPHNE / ASGI (Django)              |
                               +-----------------------+-------------------------+
                                                       |
                      +--------------------------------+--------------------------------+
                      |                                                                 |
                      v                                                                 v
+------------------------------------------+                      +------------------------------------------+
|          DJANGO DOMAIN APPS              |                      |         REALTIME & ASYNC ENGINES         |
| • accounts: Auth, RBAC, Customer Profile |                      | • Channels Consumers (Live Tracking WS)  |
| • companies: Multi-tenant scoping        |                      | • Redis Channel Layer & Caching          |
| • service_requests: Catalog, Jobs, Quotes|                      | • Celery Worker (Async Tasks, PDFs)      |
| • logistics: Transport, Moving, Fleets   |                      | • Celery Beat (Scheduled Jobs)           |
| • inventory & carts: Stock, Vegetables   |                      +------------------------------------------+
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

### A. Customer Multi-Vertical Services Portal
- **Home Services**: AC repair & maintenance, appliance repair, plumbing, electrical, carpentry, bathroom cleaning, full-house deep cleaning, sofa cleaning, pest control (cockroach, bed bugs, ants), masonry, painting, and waterproofing.
- **Vegetables & Daily Essentials (`/vegetables`)**: Dynamic catalog with unit switching (`kg`/`g`), recipe-driven dish packages (e.g. Sambhar, Poriyal, Biryani kits), live stock deduction, unconstrained quantity inputs, and quick-access Cart Drawer.
- **Logistics & Goods Transport (`/trucks/hosur`, `/two-wheelers/hosur`, `/packers-and-movers/hosur`)**: Dedicated booking engines with automated distance-based pricing, vehicle capacity selection (Tata Ace, 8ft Pickup, 3-Wheeler), helper count, and floor elevator configurations.

### B. Quotation Lifecycle & Token-Based Decision Engine
- **Itemized Quotations**: Labor charges, spare parts, taxes, add-ons, and diagnostic inspection adjustments.
- **Public Token Access (`/customer/quote/:token`)**: Secure, zero-login quotation acceptance or rejection with customer signature capture and reason recording.

### C. Live Real-Time Geolocation Tracking
- **WebSocket Streaming (`/track/:bookingId?token=...`)**: Real-time technician GPS coordinates streamed over WebSockets.
- **Interactive Map**: Leaflet map with animated vehicle position, destination pin, polyline route, and dynamic ETA calculation.

### D. Customer Self-Service & Account Hub (`/account/*`)
- **Bookings Management**: Historical and active booking list with status timelines.
- **Address Book**: Interactive Leaflet address picker with forward/reverse geocoding.
- **Wallet & Refunds**: Balance tracking, refund statuses, and payment histories.
- **Customer Care & Complaints**: In-app dispute ticketing, live support modal, and token-based star ratings (`/feedback/:token`).

### E. Field Workforce & Dispatch (`service_requests`, `logistics`)
- **Geofenced Clock-in**: Haversine distance verification with selfie photo capture.
- **Skill & Proximity Dispatch**: Automated/manual assignment of technicians and drivers to pending service requests.

### F. Multi-Tenancy & Data Isolation (`companies`, `accounts`)
- **Row-Level Tenant Scoping**: Enforced across models via `CompanyScopedManager` and `CompanyScopedQuerySet` ensuring strict tenant boundary isolation.

---

## 5. Directory Structure Reference

```text
sevo-customer/
├── docs/                                # System & Engineering Documentation
│   ├── 01_OVERVIEW.md                   # System overview & high-level architecture
│   ├── 02_ARCHITECTURE.md              # Deep-dive architecture & data flows
│   ├── 03_BACKEND_GUIDE.md              # Backend domain apps, models, APIs, and services
│   ├── 04_FRONTEND_GUIDE.md             # Frontend routes, components, and state management
│   ├── 05_DATABASE_AND_TENANCY.md       # Database schemas, scoping, and relationships
│   ├── 06_REALTIME_AND_LOGISTICS.md     # WebSockets, live GPS tracking, and logistics rates
│   ├── 07_LOCAL_DEVELOPMENT_SETUP.md    # Local setup and run guide
│   └── 08_CUSTOMER_APPLICATION_GUIDE.md # Comprehensive Customer Application deep-dive
│
├── backend/                             # Django Backend Application
│   ├── quicktims/                       # Project root settings, URLs, ASGI/WSGI
│   ├── accounts/                        # User profiles, auth, RBAC, customer addresses
│   ├── companies/                       # Tenant companies and organizations
│   ├── service_requests/                # Catalog, bookings, quotations, orders, state machine
│   ├── logistics/                       # Fleet, goods transport, and movers rate engine
│   ├── inventory/                       # Vegetable catalog, spare parts, stock movement
│   ├── carts/                           # Customer cart management
│   ├── customer_care/                   # Support tickets, disputes, reviews
│   ├── customer_analytics/              # Customer metrics, retention, merges
│   ├── reports/                         # Analytics aggregations & PDF/CSV exports
│   ├── settings_hub/                    # Tenant settings and preferences
│   └── manage.py                        # Django CLI entrypoint
│
├── frontend/                            # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── api/ & services/             # Axios/Fetch API clients & WebSocket services
│   │   ├── app/                         # Providers, router configuration
│   │   ├── auth/                        # Auth context & guest session managers
│   │   ├── components/ / ui/            # UI components, modals, and design system
│   │   │   ├── customer/                # Customer tracking and portal components
│   │   │   ├── vegetables/              # Product cards, recipe modals, recommendation bar
│   │   │   └── AddressPicker/           # Leaflet interactive address selection
│   │   ├── features/                    # Feature domain modules
│   │   ├── store/ & state/              # Redux Toolkit store and slices
│   │   └── main.jsx                     # Vite root entrypoint
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml                   # Local Docker stack (PostgreSQL, Redis)
└── README.md                            # Quickstart guide
```
