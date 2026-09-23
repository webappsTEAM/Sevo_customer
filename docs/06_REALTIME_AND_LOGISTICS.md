# CalTrack / QuickTIMS — Real-Time Geolocation, Logistics & Transport

## 1. Real-Time Geolocation Architecture

The real-time tracking engine is designed for **low-latency location updates** (every 3–5 seconds per active technician) while shielding the PostgreSQL database from excessive disk I/O.

```text
[ Technician Mobile App ]
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
    ▼ (1. Low-latency In-Memory Pub/Sub)      ▼ (2. Cache Latest State)
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
`ws://<host>/ws/live-location/<service_request_id>/?token=<jwt_token>`

### Message Ingestion (Technician -> Server)
```json
{
  "action": "location_update",
  "data": {
    "latitude": 12.971598,
    "longitude": 77.594566,
    "accuracy": 4.5,
    "heading": 89.2,
    "speed": 24.5,
    "timestamp": "2026-09-03T08:45:00Z"
  }
}
```

### Message Broadcast (Server -> Customer & Admin Map)
```json
{
  "type": "technician_location",
  "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "technician_name": "John Doe",
  "latitude": 12.971598,
  "longitude": 77.594566,
  "heading": 89.2,
  "speed": 24.5,
  "eta_minutes": 12,
  "updated_at": "2026-09-03T08:45:00Z"
}
```

---

## 3. Geofencing & Clock-In Rules

1. **Clock-In Validation**:
   - Field workers clocking into a job site or office must submit `{ latitude, longitude, photo }`.
   - The backend computes the Haversine distance between worker coordinates and designated job location.
   - If distance > `geofence_radius_meters` (default: 150m), the clock-in request is rejected with `403 Forbidden: Outside assigned geofence`.
2. **Photo Verification**:
   - Photo is verified and stored using Pillow before confirming clock-in timestamp.

---

## 4. Logistics, Movers & Goods Transport Module (`logistics`)

The `logistics` app extends workforce tracking to **cargo and goods transportation**:
- **Truck & Vehicle Categories**: Mini Trucks (Tata Ace / Piaggio Ape), 14ft Trucks, 19ft Trucks.
- **Cargo Types & Checkpoints**: Household moving, industrial goods, perishable items.
- **Trip Lifecycle**: `DISPATCHED` -> `PICKUP_COMPLETED` -> `IN_TRANSIT` -> `DELIVERY_COMPLETED`.
- **Digital Proof of Delivery (e-POD)**: Receiver signature and photos captured on job completion.
