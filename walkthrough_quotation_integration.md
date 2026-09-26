# Walkthrough - Phase 2 & Phase 3 Joint Integration

We have fully implemented and verified **Phase 2 (Customer App)** and **Phase 3 (Joint Integration Acceptance path)** of the sevo quotation architecture. This integration bridges the Customer application and the Workforce/Vendor quotation engine.

---

## 1. Database & Django Models Schema

We updated the database schema in the Customer backend to align with the Workforce/Vendor backend to track multi-stage and quote-associated bookings:

- **ServiceRequest Fields**:
  - `parent_request`: Self-referential `ForeignKey` to link Stage 2 (Quoted Work) bookings to Stage 1 (Consultation/Inspection) bookings.
  - `request_kind`: `CharField` with choices `[("standard", "Standard"), ("inspection", "Inspection"), ("quoted_work", "Quoted Work")]` to differentiate booking types.
  - `quote_number`: Unique `CharField` mapping the booking back to its originating vendor quotation.
- **Custom Prefix Mapping (`_generate_request_id`)**:
  - Modified the ID generation logic in `backend/service_requests/models.py`.
  - Uses `CATEGORY_PREFIX_MAP` to dynamically generate uppercase prefixes without hyphens:
    - **Painting**: `PA` prefix (e.g. `PA0042`)
    - **Masonry**: `MS` prefix (e.g. `MS0042`)
    - **Goods Transport Truck**: `GT` prefix (e.g. `GT0042`)
  - Legacy categories continue to fallback to the `SR-XXXX` pattern to ensure backward compatibility.
- **Mirrored Schema Alignment**:
  - Equivalent changes were mirrored in the vendor backend's `managed=False` Django model representing service requests to prevent query mismatch or serialization failures.

---

## 2. Integration APIs & Client Logic

We established secure, service-to-service endpoints and business rules on the Customer backend:

- **POST `/api/workforce-integration/bookings/from-quote/`** in `backend/workforce_integration/views.py`:
  - **Idempotency Protection**: Subsequent calls with the same `quote_number` query and return the existing booking details and `tracking_token`, preventing double booking.
  - **Consultation Fee Deduction**: If the parent Stage 1 booking (inspection/consultation) has been paid (marked `PAID` or `COLLECTED`), the fee of **₹49** is automatically deducted from `total_amount` of the child Stage 2 (quoted work) booking.
  - **Cart Adjustment Line Item**: Appends a negative adjustment record (`"id": "adjust-inspection-fee"`, price: `-49.00`) to `cart_data` to ensure the deduction is itemized in the final ReportLab PDF invoice.
  - **Analytics Integration**: Logs a `BookingStatusEvent` with the reason `"Booking created from Quote <quote_number>"` to feed the customer conversion funnel.
- **GET `/api/booking/quote/<str:token>/`** in `backend/service_requests/views.py`:
  - Fetches the current live quote details dynamically from the vendor service using the decision token.

---

## 3. Customer Portal UI & Page

We enhanced the React frontend to present clean multi-stage progression and quote decisions:

- **Stage Timelines rendering** in `frontend/src/ui/pages/BookingPage.jsx`:
  - Hides Stage 2 child bookings (`parent_request_id IS NOT NULL`) from the primary bookings list.
  - Instead, nests them dynamically under the parent booking card as multi-stage timeline nodes under "Booking Stages" (Stage 1: Site Consultation & Inspection, Stage 2: Quoted Work).
- **Interactive Active Quote Card** in `frontend/src/ui/pages/BookingPage.jsx`:
  - Appears in the live tracking panel when a quote is `SENT_TO_CUSTOMER`.
  - Displays subtotal, discount, taxes, valid-until date, and the net payable amount calculated by the backend.
  - Provides a collapsible table of detailed line items and a direct PDF download link from the vendor's API.
  - **Interactive Decisions**:
    - **Accept**: Calls the vendor API to accept and converts the quote into a Stage 2 booking.
    - **Request Changes**: Requires a custom reason note and updates the quote status to `CHANGES_REQUESTED` to initiate version revision (V2).
    - **Decline**: Presents a radio-button form with validation check reasons (Price too high, Found another provider, Rescheduled, Other) and custom feedback notes, updating status to `DECLINED`.
- **Auto-Redirect on Logistics Acceptance**:
  - Integrated status polling loops on the logistics radar search modal within `frontend/src/ui/pages/MiniTruckBookingHosurPage.jsx` and `frontend/src/ui/pages/TwoWheelerBookingHosurPage.jsx`.
  - Once a driver accepts the booking, details are cached in `sessionStorage`, and the customer is immediately redirected to the secure live tracking interface `/track/:bookingId?token=<uuid>`.

---

## 4. Verification & Testing Results

- **Django System Verification**:
  - Ran `python manage.py check` on both Customer and Vendor backends.
  - **Result**: `System check identified no issues (0 silenced).`
- **Vite Production Compilation**:
  - Executed `npm run build` inside the React client workspace.
  - **Result**: Frontend bundle successfully built for production with zero errors or warnings.
- **Integration Test Suite**:
  - Programmatic scripts verified the following core behaviors:
    - **Prefix formats**: Confirmed prefix `PA` for Painting and `MS` for Masonry without hyphens.
    - **Linking**: Verified parent-child foreign key relationship on the database level.
    - **Pricing Deductions & Cart adjustments**: Verified ₹49 adjustment line-item insertion.
    - **Idempotence**: Verified that multiple client accepts return the exact same booking reference without creating duplicate records.

---

## 5. E2E Manual Verification Checklist

| Step | Scenario | Expected Behavior | Status |
|---|---|---|---|
| 1 | Create Painting Booking | Request created with `PAXXXX` pattern & `request_kind=inspection` | **PASS** |
| 2 | Create Masonry Booking | Request created with `MSXXXX` pattern & `request_kind=inspection` | **PASS** |
| 3 | Legacy Booking Creation | Request created with `SR-XXXX` pattern & `request_kind=standard` | **PASS** |
| 4 | Quote Received UI | User sees active quote card in Live Tracking Page with line items & PDF download | **PASS** |
| 5 | Accept Quote | Child `ServiceRequest` created with `request_kind=quoted_work`, status `CONFIRMED` | **PASS** |
| 6 | Idempotency | Dual-clicking Accept returns existing child request ID and token | **PASS** |
| 7 | Consultation Deduction | ₹49 consultation fee is deducted from child request amount & negative cart line item is appended | **PASS** |
| 8 | Stages Rendering | Primary booking card shows chronological timeline listing Stage 1 and Stage 2 bookings | **PASS** |
| 9 | Request Changes | Quote marked `CHANGES_REQUESTED` and vendor is notified | **PASS** |
| 10| Decline Quote | Quote marked `DECLINED` with reason codes, and no child booking is generated | **PASS** |
| 11| Logistics Radar Polling | Logistics search modal polls, detects driver acceptance, and redirects to live tracking | **PASS** |

---

> [!NOTE]
> All APIs enforce customer-tenant boundaries. A customer can only access, view, and decide on quotes or bookings linked directly to their authenticated user ID.
