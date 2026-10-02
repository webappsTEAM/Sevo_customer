# sevo Frontend Architecture Documentation

## Architecture & File Layout

The React + Vite frontend is structured into domain-driven feature modules and reusable components:

```text
frontend/src/
│
├── app/                  # Application initialization, root router, context providers
├── pages/                # Page route views (customer, employee, admin, auth)
├── features/             # Business feature modules
│   ├── booking/          # Booking flows, validation, pricing
│   ├── location/         # Map pickers, geocoding, current location hooks
│   ├── tasks/            # Work orders, task status management
│   ├── payroll/          # Employee wallet & company payroll processing
│   ├── employee/         # Employee profiles, job views
│   └── scheduling/       # Shift planner & work schedule management
├── components/           # Reusable UI primitives, forms, maps, modals, tables
├── layouts/              # Shell layouts (CustomerLayout, EmployeeLayout, AdminLayout)
├── hooks/                # Global custom React hooks (useAuth, useLocation, useWebSocket)
├── services/             # API HTTP client wrappers (apiClient, authService, locationService)
└── store/                # Redux state slices (inventory, liveLocation, trial)
```

## Feature Architecture Pattern

Each feature module is isolated and self-contained:

```text
features/location/
├── components/           # Feature-specific UI components
├── hooks/                # Feature custom hooks (e.g. useReverseGeocode)
├── services/             # API service integrations
└── index.js              # Clean public module API export
```

## Location Flow Architecture

```text
User Clicks "Current Location"
        ↓
Browser Geolocation API
        ↓
latitude + longitude
        ↓
Accuracy Validation
        ↓
Map Moves to Coordinates
        ↓
Reverse Geocoding (Google Maps API / OpenStreetMap)
        ↓
Formatted Address & Locality
        ↓
Customer Confirms Location
        ↓
Save Address API (`/api/auth/customer-address/`)
```
