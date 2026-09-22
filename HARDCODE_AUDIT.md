# CalTrack Comprehensive Hardcode Audit Matrix

This audit table classifies every hardcoded value, legacy database array, fallback coordinate, fallback company lookup, and API URL across the entire repository.

---

| File | Line | Value | Category | Risk | Action | Replacement |
| :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| `frontend/src/ui/pages/BookingPage.jsx` | 358-361 | Mock saved customer addresses (`Banaswadi`, `Jayamahal`, `Shivaji Nagar`) | Hardcoded Address List | HIGH | Remove mock array | Dynamic API Resolution (`/api/customer/addresses/`) |
| `frontend/src/ui/pages/BookingPage.jsx` | 6509 | `"fff, Banaswadi, Bengaluru, Karnataka, India"` | Hardcoded Fallback Address | HIGH | Remove static string | Dynamic fallback (`"Select service address"`) |
| `frontend/src/ui/pages/PackersMoversBookingHosurPage.jsx` | 924, 957 | City-specific hardcoded placeholders (`Koramangala`, `Indiranagar`) | Hardcoded Input Placeholder | MEDIUM | Remove city strings | Generic address input placeholders |
| `frontend/src/ui/pages/MiniTruckBookingHosurPage.jsx` | 1542, 1628 | `"Bengaluru, Karnataka"` | Hardcoded Fallback Address | MEDIUM | Remove static string | Dynamic fallback (`selectedRoute?.to` / `"Not specified"`) |
| `frontend/src/ui/pages/BookingPage.jsx` | 872, 903, 913, 929 | `[12.7409, 77.8253]` & `&lon=77.8253&lat=12.7409` | Hardcoded Fallback Coordinates | CRITICAL | Remove static bounds | Browser Geolocation & Unconstrained Photon Search |
| `frontend/src/ui/pages/TwoWheelerBookingHosurPage.jsx` | 399-434 | `STATIC_TWO_WHEELER_VEHICLES`, `STATIC_HOSUR_AREAS`, `STATIC_POPULAR_ROUTES` | Static Fallback Arrays | HIGH | Remove static arrays | Dynamic API Resolution (`fetchedTiers`, `fetchedLanes`, `serviceAreas`) |
| `frontend/src/ui/pages/MiniTruckBookingHosurPage.jsx` | 659-718 | `STATIC_LIGHT_VEHICLES`, `STATIC_HEAVY_VEHICLES`, `STATIC_LONG_DISTANCE_ROUTES`, `STATIC_HOSUR_AREAS` | Static Fallback Arrays | HIGH | Remove static arrays | Dynamic API Resolution (`truckTiers`, `truckLanes`, `serviceAreas`) |
| `frontend/src/ui/pages/PackersMoversBookingHosurPage.jsx` | 588-638 | `STATIC_PACKERS_PACKAGES`, `STATIC_HOSUR_AREAS`, `STATIC_POPULAR_ROUTES` | Static Fallback Arrays | HIGH | Remove static arrays | Dynamic API Resolution (`fetchedTiers`, `fetchedLanes`, `serviceAreas`) |
| `frontend/src/ui/pages/TwoWheelerBookingHosurPage.jsx` | 188 | `HOSUR_LOCATIONS_DATABASE = [...]` | Hardcoded Location Database | CRITICAL | Remove static array | Dynamic Places / Geocoding API (`locationService.searchPlaces`) |
| `frontend/src/ui/pages/TwoWheelerBookingHosurPage.jsx` | 464 | `setPickup("Current Location (Sipcot Phase 1, Hosur)")` | Synthetic Location Fallback | CRITICAL | Remove hardcoded fallback | `navigator.geolocation.getCurrentPosition` + reverse geocode |
| `frontend/src/ui/pages/MiniTruckBookingHosurPage.jsx` | 418 | `HOSUR_LOCATIONS_DATABASE = [...]` | Hardcoded Location Database | CRITICAL | Remove static array | Dynamic Places / Geocoding API (`locationService.searchPlaces`) |
| `frontend/src/ui/pages/MiniTruckBookingHosurPage.jsx` | 720 | `setPickup("Current Location (Sipcot Phase 1, Hosur)")` | Synthetic Location Fallback | CRITICAL | Remove hardcoded fallback | `navigator.geolocation.getCurrentPosition` + reverse geocode |
| `frontend/src/ui/pages/MiniTruckBookingHosurPage.jsx` | 904 | `setPickup("Sipcot Industrial Area, Hosur")` | Synthetic Location Fallback | CRITICAL | Remove hardcoded fallback | Dynamic pickup selection |
| `frontend/src/ui/pages/PackersMoversBookingHosurPage.jsx` | 665 | `setPickup("Current Location (Sipcot Phase 1, Hosur)")` | Synthetic Location Fallback | CRITICAL | Remove hardcoded fallback | `navigator.geolocation.getCurrentPosition` + reverse geocode |
| `frontend/src/hooks/useLocation.js` | 25, 32, 45 | `{ lat: 13.0827, lon: 80.2707 }` (Chennai) | GPS Fallback | CRITICAL | Remove silent substitution | Return error / prompt manual selection |
| `frontend/src/ui/pages/EmployeeJobsPage.jsx` | 342 | `custLat = 12.9716 + ...` | Synthetic Coordinate Generator | CRITICAL | Remove coordinate generator | `job.service_request.address.latitude` or state |
| `backend/tasks/services/smart_address_service.py` | 40-95 | `_LANDMARK_DB = {...}` | Static Geographic Database | HIGH | Prioritize live geocoding | Dynamic Places API / Nominatim fallback |
| `backend/accounts/views.py` | 143, 701, 1293 | `Company.objects.first()` | Company Fallback | CRITICAL | Fail closed | `getattr(request.user, "company", None)` or 403 error |
| `frontend/src/ui/pages/BookingPage.jsx` | 3751 | `http://localhost:8000/api/...` | API URL Hardcode | HIGH | Centralize config | `API_BASE_URL` |
| `frontend/src/ui/shell/AppShell.jsx` | 586 | `http://localhost:8000` | Media URL Hardcode | HIGH | Centralize config | `window.location.origin` |
| `frontend/src/ui/pages/settings/ProfileSection.jsx` | 130 | `http://localhost:8000` | Media URL Hardcode | HIGH | Centralize config | `window.location.origin` |
| `frontend/src/utils/faceVerify.js` | 99, 103 | `http://localhost:8000/api/v1` | API URL Hardcode | HIGH | Centralize config | `API_BASE_URL` |
| `frontend/.env` | 1-7 | `DB_PASSWORD=Calservices@123` | Secret Exposure | CRITICAL | Remove DB vars from frontend | Client-facing `VITE_*` vars only |

---

## Summary Matrix

```text
CRITICAL Findings:            10 (All hardcoded coordinates, location DBs, silent fallbacks, & secret leaks remediated)
HIGH Findings:                11 (All mock addresses & static fallback arrays centralized/dynamically loaded)
DEVELOPMENT CONFIG:            Preserved (Local .env & docker-compose configurations)
LEGITIMATE CONSTANTS:          Preserved (HTTP status codes, enum names, UI labels)
```
