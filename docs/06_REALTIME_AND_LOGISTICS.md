# Sevo / CalTrack — Real-Time Geolocation, Logistics & Transport

## 1. Real-Time Geolocation Architecture

The real-time tracking engine is engineered for **low-latency location streaming** (every 3 seconds per active technician/driver) while isolating the primary PostgreSQL database from excessive disk I/O.

```text
[ Technician / Driver App ]
            │
            │ (WebSocket / GPS Coordinate Packet)
            ▼
[ Daphne ASGI Server ]
            │
            ▼
[ LocationConsumer (service_requests/consumers.py) ]
            │
     ┌──────┴──────────────────────────────────┐
     │                                         │
     ▼ (1. Low-latency Pub/Sub)                ▼ (2. Cache Latest State)
[ Redis Channel Layer ]                   [ Redis Key-Value Store ]
     │                                       Key: `tech:loc:<tech_id>`
     ▼                                       TTL: 1 hour
[ Customer Live Map Listener ]                │
                                               ▼ (3. Debounced Batch Flush)
                                          [ Celery Periodic Task ]
                                               │
                                               ▼
                                    [ PostgreSQL LocationHistory ]
```

---

## 2. WebSocket Protocol Specification

### Connection URL
`ws://<host>/ws/live-location/<service_request_id>/?token=<token>`

### Message Ingestion (Technician/Driver -> Server)
```json
{
  "action": "location_update",
  "data": {
    "latitude": 12.971598,
    "longitude": 77.594566,
    "accuracy": 4.5,
    "heading": 89.2,
    "speed": 24.5,
    "timestamp": "2026-09-22T08:45:00Z"
  }
}
```

### Message Broadcast (Server -> Customer Live Map)
```json
{
  "type": "technician_location",
  "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "technician_name": "Ramesh Kumar",
  "technician_phone": "+91 98765 43210",
  "latitude": 12.971598,
  "longitude": 77.594566,
  "heading": 89.2,
  "speed": 24.5,
  "eta_minutes": 14,
  "status": "EN_ROUTE",
  "updated_at": "2026-09-22T08:45:00Z"
}
```

---

## 3. Customer Live Tracking Interface (`LiveTrackingPage.jsx`)

When a customer navigates to `/track/:bookingId?token=<uuid>` or opens the in-app tracking modal:
1. **Token Authentication**: The backend verifies that the token matches the active booking.
2. **Initial Snapshot**: Loads destination coordinates (customer address), assigned technician details, and service status.
3. **Live Polyline & Marker Animation**:
   - Leaflet map renders the destination pin and vehicle marker.
   - Incoming coordinate packets smoothly interpolate vehicle movement along the road geometry.
   - Dynamic ETA badge recalculates remaining time based on current road distance and traffic.

---

## 4. Logistics, Movers & Goods Transport Module (`logistics`)

The `logistics` domain provides specialized transport booking engines for Hosur and regional areas:

### A. Vehicle Fleet Categories
- **Two-Wheelers**: Instant parcel & document courier.
- **Three-Wheelers / Piaggio Ape**: Small freight & appliance moves (up to 500 kg).
- **Mini Trucks (Tata Ace)**: Medium loads (up to 750 kg / 850 kg).
- **8ft Pickup / 14ft Trucks**: Commercial freight & full house shifting.

### B. Dynamic Pricing Formula
$$\text{Total Price} = \text{Base Fare} + (\text{Distance (km)} \times \text{Per KM Rate}) + (\text{Helpers} \times \text{Helper Rate}) + \text{Floor Surcharge}$$

- **Floor Surcharge**: Added per floor when `has_elevator = false`.
- **Toll & Parking**: Configurable dynamically in checkout.

### C. Trip Lifecycle & Delivery Verification
```text
[ BOOKED ] ──> [ DISPATCHED ] ──> [ EN_ROUTE_PICKUP ] ──> [ LOADING ] ──> [ IN_TRANSIT ] ──> [ UNLOADING ] ──> [ DELIVERED ]
```
- **Digital Proof of Delivery (e-POD)**: Receiver signature, recipient OTP verification, and cargo unloading photo confirmation.
