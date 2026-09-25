# sevo REST & WebSocket API Documentation

## API Versioning & Endpoints Architecture

All API endpoints follow standardized REST principles and envelope formatting.

Base URL: `/api/v1/` (or `/api/`)

### Authentication & Account Endpoints
- `POST /api/auth/token/` - Obtain JWT access/refresh token
- `POST /api/auth/refresh/` - Refresh JWT token
- `GET /api/auth/me/` - Retrieve authenticated user profile & permissions
- `POST /api/auth/register/` - Organization signup

### Booking & Service Request Endpoints
- `GET /api/booking/` - List company/customer bookings
- `POST /api/booking/` - Create a new booking request
- `POST /api/service-requests/calculate-price/` - Dynamic pricing calculation
- `PATCH /api/service-requests/{id}/reschedule/` - Request booking reschedule
- `POST /api/service-requests/{id}/refund/` - Request booking refund

### Live Tracking & WebSocket Channels
- `WS /ws/live/location/` - Real-time employee GPS streaming consumer
- `WS /ws/live/admin/` - Admin map live stream consumer
- `WS /ws/live/presence/` - Real-time workforce online/offline presence

### Response Envelope Format

Success Response (HTTP 200/201):
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully."
}
```

Error Response (HTTP 400/401/403/404):
```json
{
  "success": false,
  "data": null,
  "message": "Error description.",
  "errors": { ... }
}
```
