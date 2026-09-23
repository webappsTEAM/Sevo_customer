# Sevo / CalTrack — Documentation Index

Welcome to the **Sevo / CalTrack (QuickTIMS)** engineering documentation. This directory provides in-depth technical documentation covering the platform architecture, backend domain services, frontend application, database models, real-time live GPS tracking, logistics calculation engines, and the complete customer portal.

---

## 📚 Documentation Sitemap

| Document | Description |
| :--- | :--- |
| **[01_OVERVIEW.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/01_OVERVIEW.md)** | High-level system overview, technology stack, multi-vertical domains, and directory structure. |
| **[02_ARCHITECTURE.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/02_ARCHITECTURE.md)** | Modular monolith design, backend 4-tier layer pattern, token authorization architecture, and geocoding pipelines. |
| **[03_BACKEND_GUIDE.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/03_BACKEND_GUIDE.md)** | Backend domain applications (`service_requests`, `logistics`, `inventory`, `accounts`), state machines, and REST API references. |
| **[04_FRONTEND_GUIDE.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/04_FRONTEND_GUIDE.md)** | React 19 + Vite frontend architecture, route maps, Redux Toolkit slices, component hierarchy, and design tokens. |
| **[05_DATABASE_AND_TENANCY.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/05_DATABASE_AND_TENANCY.md)** | Multi-tenant row-level isolation (`CompanyScopedModel`), PostgreSQL ER diagrams, and inventory/cart schemas. |
| **[06_REALTIME_AND_LOGISTICS.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/06_REALTIME_AND_LOGISTICS.md)** | Django Channels WebSocket architecture, live GPS tracking, and Hosur logistics/moving rate calculations. |
| **[07_LOCAL_DEVELOPMENT_SETUP.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/07_LOCAL_DEVELOPMENT_SETUP.md)** | Local development guide, Docker services (PostgreSQL & Redis), Python virtual environment, and Vite setup. |
| **[08_CUSTOMER_APPLICATION_GUIDE.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/08_CUSTOMER_APPLICATION_GUIDE.md)** | **Customer Portal Deep Dive**: End-to-end customer journeys, multi-vertical discovery, recipe intelligence, quotation approval, live tracking, and account hub. |

---

## 🚀 Quick Navigation by Topic

- **Looking to understand the customer booking flow & quotations?** Check **[08_CUSTOMER_APPLICATION_GUIDE.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/08_CUSTOMER_APPLICATION_GUIDE.md)**.
- **Looking for REST API endpoints and state machines?** Check **[03_BACKEND_GUIDE.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/03_BACKEND_GUIDE.md)**.
- **Looking for real-time WebSocket live tracking details?** Check **[06_REALTIME_AND_LOGISTICS.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/06_REALTIME_AND_LOGISTICS.md)**.
- **Looking for database models and tenancy rules?** Check **[05_DATABASE_AND_TENANCY.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/05_DATABASE_AND_TENANCY.md)**.
- **Setting up your local development environment?** Check **[07_LOCAL_DEVELOPMENT_SETUP.md](file:///c:/Users/USER/Desktop/Caldim%20projects/Sevo/sevo-customer/docs/07_LOCAL_DEVELOPMENT_SETUP.md)**.
