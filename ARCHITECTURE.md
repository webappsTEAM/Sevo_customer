# sevo High-Level Architecture Documentation

## System Topology & Architecture Overview

sevo is structured as a high-performance, maintainable **Modular Monolith** designed for multi-tenant service workforce management, dispatch, live GPS tracking, billing, inventory, and payroll.

```text
sevo Ecosystem
│
├── Frontend (React + Vite + TailwindCSS)
│   ├── App & Router (`src/app/`, `src/app/router/`)
│   ├── Pages (`src/pages/`: customer, employee, admin, auth)
│   ├── Feature Modules (`src/features/`: booking, location, tasks, payroll, etc.)
│   ├── Reusable UI Kit (`src/components/ui/`, `forms/`, `modals/`, `maps/`)
│   └── API & Services Layer (`src/services/`)
│
├── Backend (Django + Django REST Framework)
│   ├── Configuration (`backend/quicktims/`)
│   ├── Common Infrastructure (`backend/common/`: permissions, responses, middleware)
│   └── Domain Apps (`accounts`, `companies`, `service_requests`, `tasks`, `live_locations`, `payroll`, etc.)
│       ├── Services Layer (`domain/services/`: encapsulated business operations)
│       └── Query Selectors (`domain/selectors/`: database queries & optimizations)
│
├── Persistence & Real-Time Data Layers
│   ├── PostgreSQL (Primary operational database with company-level scoping)
│   ├── Redis (Caching, transient live location updates, Celery broker)
│   ├── Django Channels & WebSockets (Real-time GPS tracking & notifications)
│   └── Celery (Async background jobs: payroll, reports, notifications)
```

---

## Architecture Principles

1. **Modular Monolith Structure**: Strict separation of concerns without microservices overhead.
2. **Domain Encapsulation**: HTTP requests are handled in Views, business logic lives inside `services/`, database reads live inside `selectors/`.
3. **Multi-Company Data Isolation**: Scoped queryset managers (`CompanyScopedManager` / `CompanyScopedQuerySet`) and object-level permissions (`IsCompanyMember`) ensure zero data leakage across company tenants.
4. **Resilient Real-Time Infrastructure**: High-frequency location updates flow through Redis and WebSockets, avoiding database lock contention.
