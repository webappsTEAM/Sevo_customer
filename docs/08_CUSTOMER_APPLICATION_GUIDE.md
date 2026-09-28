# Sevo / CalTrack — Customer Application Engineering & User Guide

## 1. Executive Summary
The **Sevo / CalTrack Customer Application** is a high-performance, mobile-responsive web application designed for on-demand service booking, fresh vegetable/grocery delivery with recipe intelligence, logistics and relocation transport, dynamic quotation decision-making, live technician/driver GPS tracking, and comprehensive self-service account management.

This guide provides a comprehensive technical and functional breakdown of all customer workflows, frontend components, state management slices, backend API integrations, and security mechanisms.

---

## 2. Customer Application Architecture & Route Mapping

```text
+---------------------------------------------------------------------------------------------------------+
|                                           CUSTOMER APPLICATION                                          |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  1. DISCOVERY & BROWSING                                                                                |
|     ├── /home                           LandingPage.jsx (Multi-vertical grid, banners, active session)  |
|     ├── /vegetables                     VegetableFullScreenPage.jsx (Fresh catalog & recipe kits)       |
|     └── /catalog/services               ModernServiceCatalogView.jsx (Category details & packages)      |
|                                                                                                         |
|  2. SERVICE BOOKING WIZARDS                                                                             |
|     ├── /booking                        BookingPage.jsx (Home services booking & add-on selector)       |
|     ├── /trucks/hosur                   MiniTruckBookingHosurPage.jsx (Mini truck freight calculator)   |
|     ├── /two-wheelers/hosur             TwoWheelerBookingHosurPage.jsx (Express parcel delivery)        |
|     └── /packers-and-movers/hosur       PackersMoversBookingHosurPage.jsx (Relocation planner)          |
|                                                                                                         |
|  3. ZERO-LOGIN SECURE TOKEN WORKFLOWS                                                                   |
|     ├── /customer/quote/:token          QuotationDecisionPage.jsx (Itemized quote review & signature)   |
|     ├── /track/:bookingId?token=...     LiveTrackingPage.jsx (Live WebSocket Leaflet tracking map)      |
|     └── /feedback/:token                FeedbackPage.jsx (Multi-criteria ratings & review submission)   |
|                                                                                                         |
|  4. CUSTOMER ACCOUNT & SELF-SERVICE HUB                                                                 |
|     ├── /account                        Account Overview & Profile                                      |
|     ├── /account/bookings               Booking History, Invoices & Cancellation                        |
|     ├── /account/addresses              Saved Address Book with Interactive Leaflet Pinning             |
|     ├── /account/wallet                 Customer Wallet Balance & Refund Transactions                   |
|     ├── /account/referral               Referral Code & Reward Points                                   |
|     ├── /account/amc                    Annual Maintenance Contracts (AMC)                              |
|     └── /account/help                   Support Tickets & Live Dispute Resolution                       |
|                                                                                                         |
|  5. LEGAL & POLICIES                                                                                    |
|     ├── /terms & /terms-and-conditions  Terms of Service                                                |
|     ├── /privacy & /privacy-policy      Privacy Policy                                                  |
|     ├── /service-delivery-policy        Delivery & SLA Policy                                           |
|     └── /cancellation-and-refund-policy Cancellation & Refund Rules                                     |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. End-to-End Customer User Journeys

### Journey A: Home Services Booking & Dynamic Quotation Approval
1. **Service Selection**: Customer selects a service (e.g. AC Deep Cleaning / Repair) on `/home` or `/booking`.
2. **Package & Add-Ons**: Customer chooses specific sub-packages (e.g. 1.5 Ton Split AC, Gas Charging add-on).
3. **Address & Slot**: Customer pins their location using the interactive `AddressPicker` and picks a preferred time slot.
4. **Instant Booking or Inspection**:
   - For standard services: Order is confirmed immediately.
   - For custom repairs / inspections: A technician is dispatched for diagnostic evaluation.
5. **Interactive Quotation Review**:
   - Technician submits an itemized quotation through the field app.
   - Customer receives a signed SMS/WhatsApp link: `https://app.sevo.in/customer/quote/a8f9-4b2c-91e8`.
   - On `QuotationDecisionPage.jsx`, the customer inspects itemized parts, labor costs, and tax breakdown.
   - Customer clicks **Accept** (with digital signature capture) or **Decline** (specifying a reason).
6. **Execution & Completion**:
   - Technician arrives, starts work, completes the task, and uploads completion proof.
7. **Invoice & Payment**: Digital invoice is rendered with direct payment options (UPI, Net Banking, Cards, Cash).

---

### Journey B: Fresh Vegetables & Recipe Kits Workflow
1. **Catalog Browsing (`/vegetables`)**: Customer browses vegetable stock with real-time availability badges.
2. **Flexible Weight Selection**: Uncapped quantity inputs supporting dynamic unit conversions (`kg` and `g`, e.g. 250g, 500g, 1.5kg).
3. **Recipe Intelligence (`RecipeDetails.jsx`, `VegetableRecommendationSection.jsx`)**:
   - Customers can select complete dish recipes (e.g. South Indian Sambhar, Poriyal, Biryani kit).
   - The app dynamically suggests all necessary vegetable ingredients with a single **"Add Recipe Kit to Cart"** button.
4. **Cart Drawer (`VegCartDrawerModal.jsx`)**:
   - Slide-over drawer displaying live subtotal, delivery fees, and stock verification.
5. **Checkout & Delivery Slot**: Customer confirms address and preferred morning/evening delivery window.

---

### Journey C: Logistics, Mini Trucks & Movers (Hosur)
1. **Vertical Selection**: Customer chooses Mini Truck (Tata Ace / Ape), 2-Wheeler Courier, or Packers & Movers.
2. **Pickup & Destination Geocoding**:
   - Interactive search or map drag for both source and destination points.
   - Road distance and polyline route calculated via OSRM / Google Routing.
3. **Labor & Moving Parameters**:
   - Number of helpers required (1, 2, or 3).
   - Pickup floor level & drop floor level.
   - Elevator availability toggle (`Elevator Available` vs. `Stairs Only`).
4. **Dynamic Fare Estimation**: Real-time breakdown of base fare, distance rate, helper fee, and floor surcharges.
5. **Dispatch & e-POD**: Real-time driver tracking followed by digital signature upon cargo delivery.

---

### Journey D: Real-Time Live Tracking Flow
1. Customer receives tracking link or opens active booking modal: `/track/:bookingId?token=<uuid>`.
2. Frontend initiates WebSocket connection to `ws://<host>/ws/live-location/<booking_id>/?token=<uuid>`.
3. The server validates the token and streams technician/driver coordinate packets every 3 seconds.
4. Leaflet map renders:
   - Destination marker (Customer doorstep).
   - Live moving vehicle icon with orientation/heading rotation.
   - Route polyline with real-time ETA calculation.

---

## 4. Key Frontend Components & Modal Ecosystem

| Component | Location | Description |
| :--- | :--- | :--- |
| `ModernServiceCatalogView` | `frontend/src/ui/components/` | Multi-vertical service grid with dynamic filtering and pricing cards. |
| `CustomerEntryFlowModal` | `frontend/src/ui/components/` | Auth modal supporting phone OTP, password login, and guest onboarding. |
| `VegCartDrawerModal` | `frontend/src/ui/components/` | Slide-over cart drawer with weight calculators and stock validation. |
| `VegetableProductCard` | `frontend/src/ui/components/vegetables/` | Interactive vegetable card supporting unit toggle (`kg`/`g`) and quick add. |
| `RecipeDetails` | `frontend/src/ui/components/vegetables/` | Recipe modal showing ingredients, nutrition details, and batch kit additions. |
| `AddressPicker` | `frontend/src/ui/components/AddressPicker/` | Leaflet map modal with draggable pin and reverse geocoding. |
| `QuotationDecisionPage` | `frontend/src/ui/pages/` | Standalone quote review page with itemized costs and signature canvas. |
| `LiveTrackingPage` | `frontend/src/ui/pages/` | Full-screen live tracking map with WebSocket status and ETA badge. |
| `SupportHelpCenterModal` | `frontend/src/ui/components/` | In-app support ticket generator for customer complaints and inquiries. |

---

## 5. State Management & Data Flow Architecture

### 1. `inventorySlice.js`
- **State**: `items`, `units`, `cart`, `stockThresholds`.
- **Actions**:
  - `addToCart({ itemId, quantity, unit })`
  - `updateCartQuantity({ itemId, quantity, unit })`
  - `removeFromCart({ itemId })`
  - `syncStockLevels(stockPayload)`

### 2. `liveLocationSlice.js`
- **State**: `isConnected`, `technicianLocation: { lat, lng, heading, speed }`, `destination: { lat, lng }`, `etaMinutes`, `status`.
- **Actions**:
  - `setConnectionStatus(bool)`
  - `updateCoordinates(locationPacket)`
  - `setETA(minutes)`

### 3. `authService.js` & Guest Session Management
- Manages seamless transition from anonymous guest browsing (session storage) to authenticated customer profile without losing cart items or booking inputs.

---

## 6. Security & Token-Based Public Access Standards

1. **Zero-Login Token Verification**:
   - Public URLs (`/customer/quote/:token`, `/track/:id?token=...`, `/feedback/:token`) validate single-purpose cryptographic tokens.
   - Expired or tampered tokens return structured error pages preventing unauthorized state mutation.
2. **Address & Geolocation Privacy**:
   - Customer phone numbers and exact landmark coordinates are masked until dispatch is confirmed.
3. **Cross-Tenant Isolation**:
   - All backend API calls enforce company-level data scoping via `CompanyScopedManager`.
