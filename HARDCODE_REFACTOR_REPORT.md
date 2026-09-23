# sevo Hardcode Removal & Dynamic Refactoring Final Report

This report documents the repository-wide scanning, classification, remediation, and verification carried out across **sevo / calservices**.

---

## 1. Metrics & Remediation Summary

| Category | Initial Scanned | Remediated / Converted | Status |
| :--- | :---: | :---: | :--- |
| **Critical Security / Fallback Findings** | 9 | 9 | **100% Remediated** |
| **High Risk Environment / Configs** | 5 | 5 | **100% Centralized** |
| **Static Location Databases (`HOSUR_LOCATIONS_DATABASE`)** | 3 | 3 | **Removed & Replaced with `searchPlaces`** |
| **Synthetic Customer Coordinates (`custLat = 12.9716 + ...`)** | 1 | 1 | **Removed (Uses actual DB address coordinates)** |
| **Silent GPS Fallbacks (`useLocation.js` / `BookingPage.jsx`)** | 4 | 4 | **Removed (Explicit error / manual selection)** |
| **Silent `Company.objects.first()` Fallbacks** | 3 | 3 | **Remediated (Failed closed / gated)** |
| **Committed DB Credentials in Frontend `.env`** | 1 | 1 | **Removed from `frontend/.env`** |
| **Legitimate Code Constants & Enums** | Preserved | Preserved | **Intentionally Preserved** |

---

## 2. Dynamic Feature Conversions Detailed

### 1. Customer Location Search & Geolocation System
- **Dynamic Search**: Replaced `HOSUR_LOCATIONS_DATABASE` arrays in `TwoWheelerBookingHosurPage.jsx`, `MiniTruckBookingHosurPage.jsx`, and `PackersMoversBookingHosurPage.jsx` with dynamic `searchPlaces` calls to OpenStreetMap Nominatim / Google Places API via [locationService.js](file:///c:/Users/user/Documents/Calservice/calservices/frontend/src/services/locationService.js).
- **Current Location GPS Fix**: Removed silent fallbacks to Chennai (`13.0827, 80.2707`) or Hosur (`12.7409, 77.8253`) in `useLocation.js` and `BookingPage.jsx`. On GPS denial/failure, the application alerts the user and prompts for explicit manual address selection.
- **Synthetic Coordinates**: Removed `const custLat = 12.9716 + ((sr.id || 1) % 100) * 0.001` in `EmployeeJobsPage.jsx` and replaced it with actual service request address coordinates (`sr.address_obj.latitude` / `longitude`).

### 2. Centralized Configuration Layer
- **Frontend Config**: All environment variables and base URLs are unified in [environment.js](file:///c:/Users/user/Documents/Calservice/calservices/frontend/src/config/environment.js), [api.js](file:///c:/Users/user/Documents/Calservice/calservices/frontend/src/config/api.js), and [websocket.js](file:///c:/Users/user/Documents/Calservice/calservices/frontend/src/config/websocket.js).
- **Static URLs**: Replaced hardcoded `http://localhost:8000` URLs across `BookingPage.jsx`, `AppShell.jsx`, `ProfileSection.jsx`, and `faceVerify.js` with `API_BASE_URL` and `window.location.origin`.

### 3. Backend Multi-Tenant Security & Scoping
- Gated self-healing company assignment in `accounts/views.py` and fail closed unauthenticated requests without silent `Company.objects.first()` leakages.

---

## 3. Explanation of Preserved Matches (Final Scan Verification)

The final repository-wide scan confirmed that remaining occurrences of strings or numbers fall strictly under allowed categories:

1. **`test_workflow.py` / `seed_reports_data.py` / `create_admin.py`**:
   - *Reason*: Development setup scripts and automated test fixtures isolated from live runtime execution.
2. **`service_requests/views.py` (`Company.objects.count() == 1`)**:
   - *Reason*: Gated single-tenant fallback operating only when the system has exactly 1 company registered, while preserving multi-company isolation when multiple companies exist.
3. **HTTP Status Codes & Status Enums (`pending`, `assigned`, `completed`)**:
   - *Reason*: Legitimate domain model enums and DRF status constants.

---

## 4. Verification Check Matrix

| Automated Verification Check | Execution Command | Result |
| :--- | :--- | :---: |
| **Frontend Production Bundle** | `npm run build` | **PASS (0 errors, 25.34s)** |
| **Backend Integration Test Suite** | `python manage.py test tests.integration.test_company_isolation` | **PASS (2/2 tests OK)** |
| **Dynamic Location Search** | `locationService.searchPlaces` | **VERIFIED** |
| **Customer Geolocation Fallback** | `useLocation.js` | **VERIFIED (0 hardcoded coords)** |
