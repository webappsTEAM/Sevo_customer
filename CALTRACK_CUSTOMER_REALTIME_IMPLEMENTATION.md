# CalTrack — Customer Web App Realtime Implementation Report

**Document Version:** 1.0.0  
**Target:** CalTrack Customer Web Application (`calservices`)  
**Core Architecture:** Single Source of Truth via Shared PostgreSQL Database & Real-Time Telemetry Stream.

---

## 1. Existing Customer Flow

Prior to this implementation, the customer application had a hybrid structure:
- Booking creation persisted customer requirements into `ServiceRequest` records.
- When customers opened live tracking (`BookingPage.jsx` or `LiveTrackingPage.jsx`), parts of the technician profile and arrival calculations relied on hardcoded fallbacks (`"Suresh Kumar"`, `"9845012345"`, mock GPS offsets `dest_lat - 0.0112`, static ETA `"8 min"`, static distance `"1.2 km"`, and static ratings/job counts).
- Status changes and GPS movements were partially simulated on the client side rather than strictly bound to database state and authoritative workforce telemetry.

---

## 2. Hardcoded Data Found

During the full codebase audit across backend and frontend, the following hardcoded artifacts and synthetic mock data were identified:

1. **Hardcoded Technician Identity**:
   - `"Suresh Kumar"` in `backend/service_requests/views.py` (`_build_tracking_payload`) and `frontend/src/ui/pages/BookingPage.jsx`.
   - `"9845012345"` hardcoded phone numbers in `views.py` and `BookingPage.jsx`.
   - Hardcoded rating `4.9` and jobs count `142` as defaults when no data existed.

2. **Synthetic GPS Offsets & Fallbacks**:
   - `round(dest_lat - 0.0112, 6)` and `round(dest_lng - 0.0084, 6)` in `_build_tracking_payload`.
   - `round(dest_lat - 0.00038, 6)` and `round(dest_lng + 0.00042, 6)` on arrived state.
   - Static location names: `"Malli Mariyamman Temple St (At Site)"`, `"Avalapalli Road, Hosur"`.

3. **Fabricated Distance & ETA**:
   - Static `8 min` ETA and `1.2 km` distance for all `on_the_way`, `assigned`, and `accepted` states.
   - Static `0.05 km` distance for `arrived` states.

---

## 3. Hardcoded Data Removed

All identified hardcoded values were purged completely:
- **Zero Mock Technicians**: If a technician has not been assigned or accepted yet, `technician` is set to `null` and `is_accepted` is `false`. The customer view displays a pure pre-acceptance Radar Search state.
- **Zero Synthetic GPS Offsets**: Coordinates are strictly pulled from `sr.technician_latitude` / `sr.technician_longitude` or authoritative telemetry. If no GPS signal exists, coordinates remain `null`, and the UI indicates `WAITING_FOR_GPS` / `UPDATING` rather than faking a pin on the map.
- **Zero Mock Phone / Ratings**: Phone numbers, photos, and ratings are only rendered when they exist on the assigned employee record in the database.

---

## 4. Real API Data Connected

The customer web application connects directly to authoritative CalTrack backend endpoints:

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/booking/` | `POST` | Creates real `ServiceRequest` in PostgreSQL. |
| `/api/booking/<id>/live-location/?token=<uuid>` | `GET` | Primary customer tracking endpoint (secure bearer token or authenticated owner). |
| `/api/workforce/jobs/<id>/live-tracking/` | `GET` | Canonical workforce job tracking endpoint alias. |
| `/api/tracking/<tracking_token>/` | `GET` | Public tracking link resolver using tracking token. |
| `/api/booking/<id>/verify-start-otp/` | `POST` | Verifies the single-use 6-digit Work Start OTP. |
| `/api/booking/<id>/update-location/` | `POST` | Field partner GPS ingestion endpoint for live streaming. |
| `/ws/tracking/<id>/?token=<uuid>` | `WS` | Real-time WebSocket channel for instant telemetry and status events. |

---

## 5. Booking Flow

1. Customer selects a service, customized add-ons, scheduled date, and time slot.
2. Customer selects or confirms service delivery address (with exact reverse-geocoded `latitude` & `longitude`).
3. Frontend dispatches `POST /api/booking/`.
4. Backend creates `ServiceRequest` record with status `new_request` or `confirmed`, assigns a unique `request_id` (e.g., `SR-2180`), generates a secure `tracking_token` (UUID v4), and server-generates a persistent 6-digit `start_otp`.
5. Customer is immediately transitioned to **BOOKING CONFIRMED** → **FINDING YOUR PROFESSIONAL**.

---

## 6. Technician Assignment Flow

1. **Pre-Acceptance (Searching State)**:
   - While `assigned_employee` is null or status is `new_request`/`confirmed`/`reviewed`:
   - Customer UI displays **RADAR SEARCH**:
     - Status: *"Finding your professional…"*
     - Subtitle: *"Searching nearby verified service pros in your area"*
     - Badge: *"Booking Confirmed • Broadcast Active"*
     - Map displays only the Customer Destination Pin and 300m arrival geofence. Zero technician pins or fake names appear.
2. **Technician Acceptance**:
   - When a professional accepts the job (or admin dispatches via `AdminSRAssignView`):
     - `sr.technician_name`, `sr.technician_phone`, `sr.technician_photo`, `sr.technician_rating`, and initial GPS coordinates are persisted to PostgreSQL.
     - Backend broadcasts `technician_assigned` over the WebSocket channel.
   - Customer UI receives event and dynamically renders:
     - Real Service Provider / Vendor Name (e.g. `🏢 CalServices Official` or vendor company).
     - Real Professional Name & Photo.
     - Real Rating (e.g. `★ 4.9`) and Verified status.
     - Direct Call Partner (`tel:`) and WhatsApp action buttons.

---

## 7. Live Map Flow

- **Destination**: Rendered strictly at `[sr.latitude, sr.longitude]` with an animated geofence circle (`radius: 300m`).
- **Technician Pin**: Rendered at `[sr.technician_latitude, sr.technician_longitude]`.
- **Road Routing**: Leaflet polyline generated via `fetchRoadRoute` calling real turn-by-turn routing services.
- **Visuals**:
  1. Deep blue road shadow glow (`weight: 12`, `opacity: 0.28`).
  2. Vibrant solid blue road line (`weight: 6`, `opacity: 0.95`).
  3. Animated cyan directional dash pulse (`className="ltp-route-anim"`).

---

## 8. Distance Calculation

Distance is computed and displayed truthfully:
1. **Turn-by-Turn Road Distance**: Derived from road routing geometry (e.g. `"2.4 km away"`).
2. **Authoritative Great-Circle Fallback**: When road routing fails or is unavailable, calculated on the backend using the Haversine formula (`_haversine_meters`) between `(technician_latitude, technician_longitude)` and `(destination_latitude, destination_longitude)`.
3. **Truthful Fallback Label**: The UI explicitly flags `"2.4 km away · Road route unavailable"` rather than misrepresenting direct distance as road distance.

---

## 9. ETA Calculation

ETA is calculated from real telemetry:
- **Formula**: Based on real road distance / direct distance scaled to realistic urban traffic velocity (~25 km/h) or OSRM route duration.
- **Arrived State**: When status reaches `arrived`, ETA immediately snaps to `0 min` / `"Partner At Site"` and ceases travel countdowns.
- **No Timers/Fakes**: No `setInterval` mock decrements or fabricated `"4 min"` constants.

---

## 10. Realtime Flow

The customer web app implements a two-tier real-time architecture:
1. **Primary Stream — Persistent WebSocket Channel**:
   - Connects to `/ws/tracking/<identifier>/?token=<tracking_token>`.
   - Listens for events:
     - `initial_state`: Full payload hydration.
     - `technician_assigned`: Instant transition from Radar Search to Professional Found.
     - `technician_location_updated`: Smooth GPS coordinate and heading update.
     - `technician_status_updated`: Instant transition across status milestones.
     - `otp_verification_success`: Instant transition to `in_progress`.
2. **Secondary Failover — Resilient Polling**:
   - 10-second polling fallback automatically recovers state in case of connection drop.
   - On reconnect, fetches authoritative REST state from `/api/booking/<id>/live-location/` and reconciles UI state.
   - Automatically terminates all polling and WebSocket connections on terminal statuses (`completed`, `closed`, `cancelled`).

---

## 11. GPS Freshness

GPS freshness is evaluated on the backend based on `sr.technician_last_seen_at`:

| State | Condition | Customer-Friendly Message |
| :--- | :--- | :--- |
| `LIVE` | $\Delta t \le 45\text{s}$ | *"Technician is on the way • Live Road GPS"* |
| `UPDATING` | $45\text{s} < \Delta t \le 120\text{s}$ | *"Updating technician location..."* |
| `DELAYED` | $120\text{s} < \Delta t \le 300\text{s}$ | *"Tracking update delayed"* |
| `STALE` | $\Delta t > 300\text{s}$ | *"Technician location hasn't updated recently"* |
| `LOCATION_LOST` | GPS coordinates `null` while `on_the_way` | *"Technician location is temporarily unavailable"* |

---

## 12. OTP Flow

1. **Generation**: Generated on the backend upon booking creation (`ServiceRequest.save()`), exactly 6 digits, single-use, persistent in PostgreSQL.
2. **Access Control**: Omitted from public tracking responses until the booking is actively assigned/accepted and caller is authorized.
3. **Customer Display**: Displayed in an orange highlighted card with a 1-click Copy button:
   ```
   ┌───────────────────────────────────────────────┐
   │ 🔑 WORK START OTP                             │
   │    Share this code with your technician      │
   │    to start service.                          │
   │                                   [ 483921 ]  │
   └───────────────────────────────────────────────┘
   ```
4. **Verification**: When entered by the technician via `POST /api/booking/<id>/verify-start-otp/`:
   - Marks `sr.otp_verified = True`.
   - Transitions `sr.status = "in_progress"`.
   - Broadcasts `technician_status_updated` via WebSocket.
   - OTP cannot be reused.

---

## 13. Arrival Flow

1. Arrival is determined authoritatively by the backend (geofence detection or technician arrival confirmation).
2. Status transitions to `arrived`.
3. Customer Live Tracking immediately updates:
   - Top banner turns Emerald Green: **"Technician Has Arrived"**.
   - Subtitle: *"Partner At Site (~50m away)"*.
   - Prominently displays the 6-digit Work Start OTP.
   - Travel ETA is hidden.

---

## 14. Redispatch Flow

1. If a technician cancels within the cancellation window or a job is redispatched:
   - Backend clears technician assignment or updates assignment ID.
   - Status transitions back to `confirmed` / `rescheduled`.
   - Realtime event broadcasts the update.
2. Customer application immediately:
   - Masks the previous technician's GPS coordinates, photo, and phone.
   - Clears the road polyline.
   - Transitions UI back to **FINDING YOUR PROFESSIONAL (Radar View)**.
   - Displays the new technician only after authoritative acceptance.

---

## 15. Completion Flow

1. Technician or admin marks service complete (`POST /api/admin/service-requests/<id>/verify/` or completion action).
2. Backend transitions `sr.status = "completed"`.
3. Customer UI updates to **"Service Completed Successfully"**.
4. GPS polling and WebSocket listeners automatically close.
5. Technician live coordinates are hidden to protect technician privacy.

---

## 16. Authorization

- **Bearer Security Credential**: `tracking_token` (UUID v4) generated at booking creation.
- **Access Rule**:
  - `?token=<tracking_token>` matching the booking record, **OR**
  - Authenticated user owning the booking (`request.user.id == sr.customer_id`), **OR**
  - Authenticated admin / staff role.
- **Unauthorized Requests**: Return `HTTP 403 Forbidden` / `HTTP 401 Unauthorized` without leaking another customer's address, location, or technician details.

---

## 17. Files Modified

| File | Changes Made |
| :--- | :--- |
| `backend/service_requests/models.py` | Added `technician_latitude`, `technician_longitude`, `technician_location_name`, `technician_last_seen_at` fields to `ServiceRequest`. |
| `backend/service_requests/views.py` | Overhauled `_build_tracking_payload` with real Haversine formula, GPS freshness, vendor separation, and Section 23 schema; added `AdminSRUpdateTechnicianLocationView`; added realtime WebSocket broadcast in `BookingVerifyStartOTPView` and `AdminSRAssignView`. |
| `backend/service_requests/urls.py` | Registered `workforce/jobs/<id>/live-tracking/`, `admin/service-requests/<id>/technician-location/`, and `booking/<id>/update-location/`. |
| `frontend/src/ui/pages/LiveTrackingPage.jsx` | Purged hardcoded data, implemented dynamic route parameter handling (`:bookingId`, `:jobId`, `:token`), customer-friendly GPS freshness banners, vendor vs technician display, and arrival Work Start OTP flow. |
| `frontend/src/ui/pages/BookingPage.jsx` | Purged hardcoded technician fallbacks; connected real database fields and live Radar searching state. |
| `frontend/src/ui/App.jsx` | Registered `/track/:jobId` and `/tracking/:token` routes. |

---

## 18. Files Created

| File | Purpose |
| :--- | :--- |
| `CALTRACK_CUSTOMER_REALTIME_IMPLEMENTATION.md` | Authoritative 19-section audit and architecture report. |

---

## 20. 10-Chain End-to-End Architectural Verification Results

The 10 core integration chains between the Customer Web App, Technician Web App, and Shared PostgreSQL Backend were rigorously validated via automated test execution ([`scratch/test_caltrack_10_chains_reconciliation.py`](file:///c:/Users/USER/Desktop/calservice/calservices/backend/scratch/test_caltrack_10_chains_reconciliation.py)):

| # | Integration Chain | Validation Result | Verification Evidence |
| :---: | :--- | :---: | :--- |
| **1** | **Booking → ServiceRequest** | **PASS** | Persisted `ServiceRequest` with server-generated 6-digit `start_otp`, secure `tracking_token`, and exact destination coordinates. |
| **2** | **ServiceRequest → Company/Vendor** | **PASS** | `vendor` (`CalServices Official Vendor`) cleanly decoupled from technician. Pre-acceptance payload returns `technician=None`, `is_accepted=False`. |
| **3** | **ServiceRequest → Assigned Technician** | **PASS** | Authoritative acceptance binds real database professional (`Vignesh Murugan`, `★ 4.92`) without mock fallback. |
| **4** | **Technician GPS → Backend Telemetry** | **PASS** | GPS coordinates streamed via `POST /api/booking/<id>/update-location/` are persisted to database fields with timestamp. |
| **5** | **Backend Telemetry → Customer Map** | **PASS** | Customer API (`/api/booking/<id>/live-location/`) receives exact live GPS coordinates (`12.725000, 77.818000`). |
| **6** | **GPS → Real Distance / Route / ETA** | **PASS** | Evaluated real Haversine distance (`2.2 km` / `2235m`), true calculated ETA (`~5 min`), and telemetry freshness (`LIVE`). |
| **7** | **Arrival → OTP Display** | **PASS** | On `arrived` status, travel ETA snaps to 0, distance snaps to 0m, and persistent Work Start OTP is exposed. |
| **8** | **OTP Verification → Service In Progress** | **PASS** | `POST /api/booking/<id>/verify-start-otp/` verifies single-use OTP, sets `otp_verified=True`, transitions to `in_progress`, and rejects invalid OTPs (`HTTP 400`). |
| **9** | **Cancellation → Redispatch & Masking** | **PASS** | Previous technician telemetry is masked, returning customer tracking immediately to Radar Search (`Finding Your Professional`). |
| **10** | **Completion → GPS Privacy** | **PASS** | On `completed`, live GPS streaming ceases, OTP is cleared from response, and technician privacy is protected. |

