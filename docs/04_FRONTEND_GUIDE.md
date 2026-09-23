# sevo / QuickTIMS — Frontend Engineering Guide

## 1. Directory Structure Overview

```text
frontend/
├── src/
│   ├── main.jsx                 # Vite application root entry point
│   ├── app/                     # App initialization, routing configs, providers
│   │   ├── router/              # Route configuration and route guards (AuthGuard, RoleGuard)
│   │   └── App.jsx              # Core root component with theme & global toast
│   ├── api/ & services/         # Axios / Fetch client and domain API adapters
│   ├── auth/                    # Auth context, token storage, login/signup handlers
│   ├── store/ & state/          # Redux Toolkit store, rootReducer, and domain slices
│   ├── features/                # Feature-based domain modules
│   │   ├── booking/             # Service booking flow & wizard
│   │   ├── tracking/            # Real-time Leaflet map & WebSocket listener
│   │   ├── customer/            # Customer portal, order history, quotations
│   │   ├── technician/          # Field worker job card, status controls, proof upload
│   │   ├── admin/               # Admin dashboards, scheduling, dispatch board
│   │   ├── logistics/           # Goods & transport booking & fleet view
│   │   └── payroll/             # Payslips and staff compensation
│   ├── components/ & ui/        # Shared presentation components (cards, tables, modals, badges)
│   ├── hooks/                   # Custom React hooks (useGeolocation, useWebSocket, useAuth)
│   └── utils/                   # Formatting helpers (currency, date-fns, validation)
├── index.html                   # HTML template
├── vite.config.js               # Vite bundler configuration & proxy settings
└── package.json                 # Dependencies and scripts
```

---

## 2. State Management Strategy (Redux Toolkit)

The frontend manages global application state using **Redux Toolkit**:

```text
                           +----------------------------------------+
                           |             Root Store                 |
                           +-------------------+--------------------+
                                               |
           +-----------------+-----------------+-----------------+-----------------+
           |                 |                 |                 |                 |
           v                 v                 v                 v                 v
    +--------------+  +--------------+  +--------------+  +--------------+  +--------------+
    |  authSlice   |  | bookingSlice |  | trackingSlice|  |  jobsSlice   |  | uiStateSlice |
    | User session |  | Active cart  |  | Live coords  |  | Tech tasks   |  | Modals, theme|
    | & tokens     |  | & quote state|  | & WS status  |  | & dispatch   |  | & toasts     |
    +--------------+  +--------------+  +--------------+  +--------------+  +--------------+
```

### Key Principles:
- **Never prop drill**: Shared entities across routes live in Redux slices.
- **Local Component State**: Ephemeral UI toggles (dropdown open, form inputs before submit) use `useState`.
- **Async Actions**: All API network calls use `createAsyncThunk` with structured `pending`, `fulfilled`, and `rejected` states.

---

## 3. Real-Time Geolocation & Live Map Component

The tracking view connects via WebSocket to the Daphne backend:

1. **`useLiveTracking` hook**:
   - Opens WebSocket connection to `ws://<backend>/ws/live-location/<request_id>/`.
   - Listens for technician coordinate packets `{ lat, lng, speed, heading, timestamp }`.
   - Dispatches coordinates to `trackingSlice`.
2. **`LiveMap.jsx` (Leaflet / React-Leaflet)**:
   - Renders customer location marker (destination) and moving technician vehicle icon.
   - Smoothly interpolates vehicle position between updates.
   - Computes route polyline and estimated time of arrival (ETA).

---

## 4. Design Guidelines & Component Standard

- **Colors & Theming**: Configured via CSS variables with consistent dark/light mode palette.
- **Named Exports**: All components and page modules use explicit named exports:
  ```javascript
  export function ServiceBookingModal({ isOpen, onClose, serviceId }) { ... }
  ```
- **Animations**: Subtle page entry transitions and status badge pulse animations for live status indicators.
- **Accessibility**: Semantic HTML5 elements (`<header>`, `<main>`, `<section>`, `<nav>`) and descriptive form labels.

---

## 5. Vegetable Stock & Capacity Management (`/inventory/vegetables`)

- **State Management**: `inventorySlice` manages `vegetables` catalog items and `historyByProduct` ledgers.
- **Admin Dashboard (`VegetableStockAdminPage.jsx`)**:
  - Live stock state indicators (`In Stock`, `Out of Stock`, `Not Tracked`).
  - **Set Default Modal**: Baseline daily stock with instant application toggle (`apply_now`).
  - **Restock Modal**: Additive stock increment in `kg` / `g`.
  - **Adjust Modal**: Absolute stock level correction requiring mandatory reason.
  - **History Modal**: Custom date range picker with PDF print/download.
- **Customer Product Pages**:
  - Uncapped quantity input supporting `kg`/`g` conversion.
  - Reactive Out-of-Stock badge and disabled purchase flow when capacity reaches zero.

