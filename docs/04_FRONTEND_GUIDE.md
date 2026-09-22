# Sevo / CalTrack — Frontend Engineering Guide

## 1. Directory Structure Overview

```text
frontend/
├── src/
│   ├── main.jsx                 # Vite application entry point and root providers
│   ├── app/                     # App initialization and provider setup
│   ├── api/ & services/         # API clients, axios instance, and domain service adapters
│   │   ├── client.js            # Base HTTP client with JWT interceptors
│   │   ├── authService.js       # Customer and admin authentication logic
│   │   ├── bookingService.js    # Service requests & checkout API handlers
│   │   ├── logisticsService.js  # Logistics rates, vehicle quotes, and bookings
│   │   ├── geocoding.js         # Forward/Reverse geocoding & coordinate search
│   │   ├── routing.js           # Polyline calculation and distance matrix
│   │   ├── websocketService.js  # Live location WebSocket client
│   │   ├── addressService.js    # Customer saved addresses CRUD
│   │   └── customerCareService.js # Tickets, feedback, and complaint handlers
│   ├── auth/                    # Auth context, session helpers, token storage
│   ├── store/ & state/          # Redux Toolkit store and domain slices
│   │   ├── store.js             # Root store configuration
│   │   ├── inventorySlice.js    # Vegetable stock, units, and inventory history
│   │   ├── liveLocationSlice.js # Real-time technician coordinates & WS state
│   │   ├── customerAnalyticsSlice.js # Customer metrics, merges, and LTV
│   │   └── trialSlice.js        # Tenant trial and subscription state
│   ├── ui/                      # Main presentation layer and components
│   │   ├── App.jsx              # Main router switchboard & layout wrapper
│   │   ├── routes.js            # Centralized application route definitions
│   │   ├── styles.css           # Global design system, colors, animations
│   │   ├── components/          # Reusable UI widgets and complex feature modals
│   │   │   ├── ModernServiceCatalogView.jsx # Multi-vertical catalog renderer
│   │   │   ├── CustomerEntryFlowModal.jsx   # Phone/OTP/Google login modal
│   │   │   ├── VegCartDrawerModal.jsx       # Floating vegetable cart drawer
│   │   │   ├── AllServicesDrawer.jsx        # Full service catalog drawer
│   │   │   ├── ActiveSessionBar.jsx         # Floating active booking status bar
│   │   │   ├── SupportHelpCenterModal.jsx   # Live support ticket creator
│   │   │   ├── AddressPicker/               # Leaflet map location picker
│   │   │   └── vegetables/                  # Product cards, recipe cards, details
│   │   └── pages/               # Top-level route page components
│   │       ├── LandingPage.jsx              # Customer homepage
│   │       ├── BookingPage.jsx              # Multi-step service booking wizard
│   │       ├── QuotationDecisionPage.jsx    # Public quotation review & signature
│   │       ├── LiveTrackingPage.jsx         # Real-time Leaflet technician tracking
│   │       ├── MiniTruckBookingHosurPage.jsx# Hosur truck booking interface
│   │       ├── TwoWheelerBookingHosurPage.jsx # 2-Wheeler parcel dispatch
│   │       ├── PackersMoversBookingHosurPage.jsx # Packers & movers calculator
│   │       ├── FeedbackPage.jsx             # Public post-service rating page
│   │       ├── CustomersDashboardPage.jsx   # Customer management dashboard
│   │       └── catalog/ / settings/         # Admin & management pages
│   └── utils/                   # Formatting helpers (currency, date-fns, validators)
├── index.html                   # HTML entry template
├── vite.config.js               # Vite bundler and proxy configuration
└── package.json                 # Dependencies and build scripts
```

---

## 2. Customer Application Route Architecture (`routes.js`)

The application routes are centralized in `frontend/src/ui/routes.js`:

### A. Customer Discovery & Booking Routes
- `/home` (`routes.landing`): Primary customer homepage showcasing multi-vertical categories, fresh vegetables, logistics cards, and promotional banners.
- `/booking` (`routes.booking`): Step-by-step home service booking wizard with dynamic add-ons, date/time picker, and address selector.
- `/vegetables` (`routes.vegetables`): Full-screen vegetable & grocery catalog with recipe integration and dynamic filtering.
- `/trucks/hosur` (`routes.truck_booking_hosur`): Hosur mini-truck transport booking.
- `/two-wheelers/hosur` (`routes.two_wheeler_booking_hosur`): Two-wheeler rapid delivery booking.
- `/packers-and-movers/hosur` (`routes.packers_movers_booking_hosur`): Household moving & relocation calculator.

### B. Public Token-Authenticated Routes (Zero-Login)
- `/customer/quote/:token` (`routes.customer_quotation`): Interactive customer quotation decision page (view items, accept/decline, digital signature).
- `/track/:bookingId` (`routes.live_tracking`): Public live technician GPS tracking page (authenticated via `?token=` query param).
- `/feedback/:token` (`routes.feedback`): Post-service customer feedback and rating submission.

### C. Customer Self-Service Account Hub
- `/account` (`routes.account`): Customer profile and quick-action dashboard.
- `/account/bookings` (`routes.account_bookings`): Booking history, active service status, and downloadable invoices.
- `/account/addresses` (`routes.account_addresses`): Saved address book with interactive map coordinates.
- `/account/wallet` (`routes.account_wallet`): Customer wallet balance and transaction logs.
- `/account/referral` (`routes.account_referral`): Referral code and rewards.
- `/account/help` (`routes.account_help`): Support tickets and help center.

---

## 3. State Management Architecture (Redux Toolkit)

Global state is managed via Redux Toolkit slices:

```text
                             +----------------------------------------+
                             |             Redux Store                |
                             +-------------------+--------------------+
                                                 |
             +-----------------+-----------------+-----------------+-----------------+
             |                 |                 |                 |                 |
             v                 v                 v                 v                 v
      +--------------+  +--------------+  +--------------+  +--------------+  +--------------+
      |inventorySlice|  |liveLocSlice  |  | analytics    |  |  trialSlice  |  | auth / ui    |
      |Veg catalog & |  |WS connection |  |Customer LTV, |  |Subscription  |  |Auth token &  |
      |stock records |  |& GPS coords  |  |merges & SLA  |  |limits & tier |  |modal states |
      +--------------+  +--------------+  +--------------+  +--------------+  +--------------+
```

### Key Redux Slices:
1. **`inventorySlice`**:
   - Stores vegetable catalog with pricing, package unit options (`kg`, `g`, pieces), and real-time stock limits.
   - Dispatches stock changes when items are added to cart.
2. **`liveLocationSlice`**:
   - Manages WebSocket connection state (`CONNECTING`, `OPEN`, `CLOSED`).
   - Ingests incoming technician coordinate packets and updates current latitude, longitude, heading, speed, and calculated ETA.
3. **`customerAnalyticsSlice`**:
   - Tracks customer engagement, merge requests, and dispute logs.

---

## 4. Key Customer Feature Components

### A. `ModernServiceCatalogView.jsx`
- Dynamically renders category cards with rich icons, package descriptions, starting prices, and promotional tags.
- Provides search and quick filtering by vertical (Home Services, Vegetables, Logistics).

### B. `VegCartDrawerModal.jsx` & `VegetableRecommendationSection.jsx`
- Sliding side drawer enabling quick review of fresh vegetable items and recipe kits.
- Supports smooth increment/decrement of quantities with automatic unit conversion (e.g., 250g, 500g, 1kg).
- Real-time stock validation preventing orders exceeding current inventory.

### C. `AddressPicker/` (Leaflet Geolocation Component)
- Full-featured interactive map picker using Leaflet and React-Leaflet.
- Draggable marker allows precision pinning down to doorsteps.
- Auto-fetches street name, locality, and postal code via reverse geocoding.

### D. `QuotationDecisionPage.jsx`
- Standalone, mobile-responsive page accessible via secure link.
- Shows itemized labor charges, parts costs, taxes, and inspection discounts.
- Includes interactive canvas for customer digital signature before submission.

### E. `CustomerLiveTrackingModal.jsx` & `LiveTrackingPage.jsx`
- Real-time map displaying technician's moving icon along the route to customer location.
- Live progress steps: `ASSIGNED` -> `EN_ROUTE` -> `ARRIVED` -> `IN_PROGRESS` -> `COMPLETED`.
- Displays estimated arrival time (ETA) and technician contact information.

---

## 5. Styling, Theming & Design System

- **CSS Variables & Custom Styles (`styles.css`)**: Consistent color tokens for primary brands, dark mode surfaces, glassmorphism cards, and alert badges.
- **Micro-Animations**: Smooth drawer slide-ins, pulsing live tracking indicators, and button ripple effects.
- **Responsive Layout**: Designed mobile-first to ensure flawless usability on smartphones, tablets, and desktop displays.
