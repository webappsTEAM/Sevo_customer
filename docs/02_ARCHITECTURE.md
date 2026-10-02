# Sevo / CalTrack — Architecture & Engineering Design

## 1. Architectural Philosophy
The system implements a **Modular Monolith** architecture with strict domain boundaries. Each core vertical and capability operates as an independent Django domain application on the backend, complemented by modular UI feature components and state slices on the frontend.

```text
                               +-------------------------------------------------+
                               |                   User / Client                 |
                               | (Customer Web / Admin Portal / Technician Web)  |
                               +-----------------------+-------------------------+
                                                       |
                                            HTTP / WebSocket / HTTPS
                                                       |
                                                       v
                               +-------------------------------------------------+
                               |              Nginx / Reverse Proxy              |
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

## 2. Request Handling & Backend Architectural Layers

For all backend operations, the project enforces a clear separation of concerns across four distinct tiers:

```text
[ HTTP Request / WebSocket ]
             │
             ▼
      [ Views / API Layer ]  ──>  Serializers (Data validation & transformation)
             │
             ▼
     [ Services Layer ]      ──>  Encapsulated business logic & transactional workflows
             │
             ▼
     [ Selectors Layer ]     ──>  Optimized database reads & filtered querysets
             │
             ▼
      [ Django ORM ]         ──>  PostgreSQL (Company Scoped Manager)
```

1. **Views (`views.py`, `payment_views.py`, `technician_views.py`)**:
   - Receive HTTP requests, validate permissions, route payload to serializers, and invoke appropriate domain services.
   - Kept thin: free from raw database mutations or heavy business calculations.
2. **Serializers (`serializers.py`)**:
   - Validate incoming payload structure, types, and domain constraints.
3. **Services (`services/*.py`)**:
   - Execute core business logic (e.g., dynamic quotation calculation, technician dispatch, invoice generation, customer notification triggers).
   - Atomic database write operations wrapped in transactions (`@transaction.atomic`).
4. **Selectors (`selectors/*.py`)**:
   - Provide clean, reusable querying interfaces with proper indexing, caching, and `select_related`/`prefetch_related` optimizations.

---

## 3. Real-Time Geolocation WebSocket Data Flow

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
                [ Redis Channel Layer ]                                [ Redis In-Memory State ]
             Group: `location_<request_id>`                          Key: `tech:loc:<tech_id>`
                           │                                          (TTL: 3600 seconds)
                           │                                                       │
                           ▼                                                       ▼ (Debounced Batch)
               [ Customer Live Map ]                                     [ Celery Periodic Task ]
             Receives live coordinates &                                           │
                interpolates marker                                                ▼
                                                                     [ PostgreSQL LocationHistory ]
```

---

## 4. Customer Token-Based Public Access Architecture

To enable frictionless customer access without forcing account creation or active sessions for time-sensitive workflows, CalTrack implements **Cryptographic Token Authorization**:

```text
                                  +-----------------------------+
                                  |   SMS / Email / WhatsApp    |
                                  |  (Sent with signed tokens)  |
                                  +--------------+--------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                             |                             |
                   v                             v                             v
    +------------------------------+ +------------------------------+ +------------------------------+
    |     Quotation Decision       | |       Customer Tracking      | |       Feedback Review        |
    |  /customer/quote/:token      | |   /track/:id?token=:token    | |      /feedback/:token        |
    +--------------+---------------+ +--------------+---------------+ +--------------+---------------+
                   |                                |                                |
                   v                                v                                v
    +------------------------------+ +------------------------------+ +------------------------------+
    | • Validates token validity   | | • Establishes WS connection  | | • Submits multi-criteria     |
    | • Renders itemized breakdown | | • Stream real-time coords    | |   star ratings & notes       |
    | • Accepts/Declines with sign | | • Displays ETA & live map    | | • Closes feedback loop       |
    +------------------------------+ +------------------------------+ +------------------------------+
```

### Security Properties:
1. **Scope-Limited Tokens**: Tokens are bound strictly to a single `ServiceRequest` or `Quotation` UUID.
2. **Deterministic Expiry**: Quotation tokens have configurable validity windows (default: 48 hours).
3. **No Credential Leaks**: Tokens grant read/action rights only for the specific target record, never exposing customer passwords or broader account data.

---

## 5. Multi-Vertical Frontend Customer Architecture

The customer web portal (`frontend/src/ui`) is engineered around high-conversion, modular workflows:

```text
+---------------------------------------------------------------------------------------------------+
|                                      CUSTOMER WEB APPLICATION                                     |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ ModernServiceCatalogView / LandingPage ]                                                       |
|  ├── Home Services Grid (AC, Cleaning, Electrical, Plumbing, Painting, Pest Control)             |
|  ├── Fresh Vegetables & Recipes Carousel (Dynamic unit toggle, stock badge, recipe modal)         |
|  ├── Logistics & Moving Cards (Mini Trucks, 2-Wheelers, Packers & Movers)                         |
|  └── Active Session / Cart Bar (Persistent cross-vertical booking indicators)                     |
|                                                                                                   |
|  [ Booking Engine ]                   [ Vegetable Cart Drawer ]         [ Logistics Booking ]     |
|  ├── Multi-step package selection     ├── Uncapped quantity inputs      ├── Rate calculator       |
|  ├── Dynamic add-ons & inspection     ├── Real-time weight conversions  ├── Vehicle selection     |
|  └── Leaflet Address Picker modal     └── Stock availability validation └── Floor & elevator cfg  |
|                                                                                                   |
|  [ Customer Account Hub (/account) ]                                                              |
|  ├── Bookings Timeline & Invoices     ├── Saved Addresses & Geocoding   ├── Wallet & Refunds      |
|  ├── AMC Contract Management          ├── Referral Program              ├── Support Ticket Modal  |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Address & Geolocation Subsystem Architecture

The customer application provides an interactive location selection pipeline:

1. **GPS Auto-Detect**: Uses browser Geolocation API (`navigator.geolocation`) with high-accuracy fallback.
2. **Reverse Geocoding**: Converts coordinates to readable street names, postal codes, and city metadata using OpenStreetMap / Nominatim.
3. **Interactive Map Pinning (`AddressPicker.jsx`)**: Draggable Leaflet map marker updating coordinate state in real time.
4. **Distance & Routing Matrix (`routing.js`)**: Calculates road distance, duration, and route polyline for logistics and technician travel.
