/**
 * MapOverview.jsx
 *
 * Sevo Admin Live Service Coverage & Operations Map Overview.
 *
 * Real Data Integration:
 *  - Queries `/api/settings/service-zones/` for real customer coverage geofences (circles & polygons).
 *  - Queries `/api/service-requests/` for live active customer bookings.
 *  - Queries `/time/locations/` for company office hubs & branch sites.
 *
 * Interactive Features:
 *  - Real-time geofence visualizer with zoom-to-bounds.
 *  - Operational KPI stat cards (Active Service Areas, Covered Radius, Live Dispatches, Hubs).
 *  - Filter by Zone Type (All, Circle Geofences, Polygon Boundaries, Live Jobs).
 *  - Side detail panel with zone details, covered services, and active requests.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { MapContainer, TileLayer, Circle, Polygon, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  Shield, MapPin, Activity, Layers, RefreshCw,
  Navigation, Eye, CheckCircle2, AlertCircle, Wrench,
  Clock, Truck, Phone, ChevronRight, X, Sparkles, Building2
} from "lucide-react"
import { apiRequest, unwrapResults } from "../../../api/client.js"

/* ── Custom Pins ───────────────────────────────────────────────────────────── */

const createZonePin = (color, name) =>
  L.divIcon({
    className: "custom-zone-pin",
    html: `<div style="
      position: relative;
      width: 32px; height: 32px;
      background: ${color || '#4F46E5'};
      border: 2.5px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        width: 10px; height: 10px;
        background: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

const createBookingPin = (status) => {
  const bg = status === "arrived" ? "#10B981" : status === "on_the_way" ? "#F97316" : status === "in_progress" ? "#0284C7" : "#6366F1"
  return L.divIcon({
    className: "custom-booking-pin",
    html: `<div style="
      position: relative;
      width: 28px; height: 28px;
      background: ${bg};
      border: 2px solid white;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 800; font-size: 11px;
    ">
      🛵
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

const createHubPin = () =>
  L.divIcon({
    className: "custom-hub-pin",
    html: `<div style="
      width: 28px; height: 28px;
      background: #1E293B;
      border: 2px solid #38BDF8;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 13px;
    ">
      🏢
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })

/* ── Smart Bounds Updater ─────────────────────────────────────────────────── */
function MapBoundsUpdater({ bounds, center }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true })
    } else if (center) {
      map.setView(center, 12, { animate: true })
    }
  }, [bounds, center, map])
  return null
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: MapOverview
   ═════════════════════════════════════════════════════════════════════════════ */
export function MapOverview() {
  const [serviceZones, setServiceZones] = useState([])
  const [locations, setLocations] = useState([])
  const [activeBookings, setActiveBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterType, setFilterType] = useState("all") // 'all' | 'circle' | 'polygon' | 'active_jobs'
  const [selectedZone, setSelectedZone] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)

  // Fetch real data from all 3 operational sources
  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, locsRes, srRes] = await Promise.allSettled([
        apiRequest("/settings/service-zones/"),
        apiRequest("/time/locations/"),
        apiRequest("/service-requests/?status__in=accepted,on_the_way,arrived,in_progress"),
      ])

      if (zonesRes.status === "fulfilled") {
        const rawZones = unwrapResults(zonesRes.value) || []
        setServiceZones(Array.isArray(rawZones) ? rawZones : (rawZones?.results || []))
      }

      if (locsRes.status === "fulfilled") {
        const rawLocs = unwrapResults(locsRes.value) || []
        setLocations(Array.isArray(rawLocs) ? rawLocs : (rawLocs?.results || []))
      }

      if (srRes.status === "fulfilled") {
        const rawSR = unwrapResults(srRes.value) || []
        setActiveBookings(Array.isArray(rawSR) ? rawSR : (rawSR?.results || []))
      }
    } catch (err) {
      console.warn("Error fetching overview map data:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // Calculate Aggregated Metrics
  const totalZones = serviceZones.length
  const activeZones = serviceZones.filter((z) => z.is_active).length
  const circleZonesCount = serviceZones.filter((z) => z.zone_type === "circle").length
  const polygonZonesCount = serviceZones.filter((z) => z.zone_type === "polygon").length
  const activeJobsCount = activeBookings.length
  const totalHubsCount = locations.length

  // Filtered Zones
  const visibleZones = useMemo(() => {
    if (filterType === "all") return serviceZones
    if (filterType === "circle") return serviceZones.filter((z) => z.zone_type === "circle")
    if (filterType === "polygon") return serviceZones.filter((z) => z.zone_type === "polygon")
    if (filterType === "active_jobs") return []
    return serviceZones
  }, [serviceZones, filterType])

  // Compute bounding box
  const mapBounds = useMemo(() => {
    const latLngs = []
    serviceZones.forEach((z) => {
      if (z.center_lat && z.center_lng) {
        latLngs.push([parseFloat(z.center_lat), parseFloat(z.center_lng)])
      }
      if (z.zone_type === "polygon" && z.polygon) {
        try {
          const poly = typeof z.polygon === "string" ? JSON.parse(z.polygon) : z.polygon
          const coords = poly.coordinates?.[0] || []
          coords.forEach(([lng, lat]) => latLngs.push([lat, lng]))
        } catch { /* skip */ }
      }
    })

    locations.forEach((l) => {
      if (l.lat && l.lng) latLngs.push([parseFloat(l.lat), parseFloat(l.lng)])
    })

    activeBookings.forEach((b) => {
      if (b.latitude && b.longitude) latLngs.push([parseFloat(b.latitude), parseFloat(b.longitude)])
    })

    if (latLngs.length > 0) {
      return L.latLngBounds(latLngs)
    }
    return null
  }, [serviceZones, locations, activeBookings])

  const defaultCenter = [12.754598, 77.834477] // Hosur / Bangalore Hub

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc", position: "relative" }}>
      {/* ── Top Operational KPI Header ────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        padding: "16px 20px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        zIndex: 10,
      }}>
        {/* KPI 1: Active Service Areas */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4F46E5" }}>
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{activeZones} <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>/ {totalZones}</span></div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginTop: 3 }}>Service Areas Active</div>
          </div>
        </div>

        {/* KPI 2: Live Dispatches */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{activeJobsCount}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginTop: 3 }}>Live Dispatched Jobs</div>
          </div>
        </div>

        {/* KPI 3: Geofence Boundaries */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316" }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{polygonZonesCount} <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>Poly · {circleZonesCount} Circle</span></div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginTop: 3 }}>Geofence Boundaries</div>
          </div>
        </div>

        {/* KPI 4: Company Hubs & Sites */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f172a" }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{totalHubsCount}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginTop: 3 }}>Office Hubs & Sites</div>
          </div>
        </div>
      </div>

      {/* ── Sub-header: Quick Filter Pills & Refresh Button ──────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "#ffffff",
        borderBottom: "1px solid #f1f5f9",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All Coverage (${totalZones})` },
            { id: "circle", label: `Circle Geofences (${circleZonesCount})` },
            { id: "polygon", label: `Polygon Boundaries (${polygonZonesCount})` },
            { id: "active_jobs", label: `Live Dispatches (${activeJobsCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                border: filterType === f.id ? "1.5px solid #4F46E5" : "1px solid #e2e8f0",
                background: filterType === f.id ? "#eef2ff" : "#ffffff",
                color: filterType === f.id ? "#4F46E5" : "#64748b",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#0f172a",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Main Map Canvas ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          <MapBoundsUpdater bounds={mapBounds} center={defaultCenter} />

          {/* 1. Render Service Zones (Circles & Polygons) */}
          {visibleZones.map((zone) => {
            const color = zone.color || "#4F46E5"
            const isActive = zone.is_active

            if (zone.zone_type === "circle" && zone.center_lat && zone.center_lng) {
              const radiusM = parseFloat(zone.radius_meters) || (parseFloat(zone.radius_km) ? parseFloat(zone.radius_km) * 1000 : 15000)
              const center = [parseFloat(zone.center_lat), parseFloat(zone.center_lng)]

              return (
                <React.Fragment key={`zone-circle-${zone.id}`}>
                  {/* Coverage Circle */}
                  <Circle
                    center={center}
                    radius={radiusM}
                    pathOptions={{
                      color: isActive ? color : "#94a3b8",
                      fillColor: isActive ? color : "#94a3b8",
                      fillOpacity: isActive ? 0.12 : 0.05,
                      weight: 2,
                      dashArray: isActive ? undefined : "6, 6",
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedZone(zone)
                        setSelectedBooking(null)
                      },
                    }}
                  />

                  {/* Center Zone Pin */}
                  <Marker
                    position={center}
                    icon={createZonePin(isActive ? color : "#94a3b8", zone.name)}
                    eventHandlers={{
                      click: () => {
                        setSelectedZone(zone)
                        setSelectedBooking(null)
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200, padding: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                          <strong style={{ fontSize: 13, color: "#0f172a" }}>{zone.name}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Radius: {(radiusM / 1000).toFixed(1)} km</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#059669" : "#dc2626", marginTop: 4 }}>
                          {isActive ? "● Active Service Zone" : "○ Inactive Zone"}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              )
            }

            if (zone.zone_type === "polygon" && zone.polygon) {
              try {
                const poly = typeof zone.polygon === "string" ? JSON.parse(zone.polygon) : zone.polygon
                const coords = poly.coordinates?.[0] || []
                const positions = coords.map(([lng, lat]) => [lat, lng])
                const center = zone.center_lat && zone.center_lng ? [parseFloat(zone.center_lat), parseFloat(zone.center_lng)] : (positions[0] || defaultCenter)

                return (
                  <React.Fragment key={`zone-poly-${zone.id}`}>
                    <Polygon
                      positions={positions}
                      pathOptions={{
                        color: isActive ? color : "#94a3b8",
                        fillColor: isActive ? color : "#94a3b8",
                        fillOpacity: isActive ? 0.15 : 0.05,
                        weight: 2.5,
                      }}
                      eventHandlers={{
                        click: () => {
                          setSelectedZone(zone)
                          setSelectedBooking(null)
                        },
                      }}
                    />
                    <Marker
                      position={center}
                      icon={createZonePin(isActive ? color : "#94a3b8", zone.name)}
                      eventHandlers={{
                        click: () => {
                          setSelectedZone(zone)
                          setSelectedBooking(null)
                        },
                      }}
                    />
                  </React.Fragment>
                )
              } catch {
                return null
              }
            }

            return null
          })}

          {/* 2. Render Live Dispatched Bookings */}
          {activeBookings.map((b) => {
            if (!b.latitude || !b.longitude) return null
            const pos = [parseFloat(b.latitude), parseFloat(b.longitude)]

            return (
              <Marker
                key={`booking-${b.id || b.request_id}`}
                position={pos}
                icon={createBookingPin(b.status)}
                eventHandlers={{
                  click: () => {
                    setSelectedBooking(b)
                    setSelectedZone(null)
                  },
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200, padding: 4 }}>
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>#{b.request_id}</strong>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{b.issue_title || b.service_category}</div>
                    <div style={{ fontSize: 11, color: "#0f172a", marginTop: 4 }}>Status: <strong>{b.status}</strong></div>
                    {b.technician_name && (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>Pro: {b.technician_name}</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* 3. Render Company Sites & Hubs */}
          {locations.map((loc) => {
            if (!loc.lat || !loc.lng) return null
            const pos = [parseFloat(loc.lat), parseFloat(loc.lng)]

            return (
              <Marker
                key={`hub-${loc.id}`}
                position={pos}
                icon={createHubPin()}
              >
                <Popup>
                  <div style={{ minWidth: 180, padding: 4 }}>
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>🏢 {loc.name}</strong>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{loc.address || "Company Site"}</div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* ── Legend Overlay ──────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(6px)",
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          fontSize: 11,
          fontWeight: 700,
          color: "#334155",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4F46E5" }} />
            <span>Active Service Geofence</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
            <span>Dispatched Live Job (🛵)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#1E293B" }} />
            <span>Company Site / Hub (🏢)</span>
          </div>
        </div>

        {/* ── Side Detail Drawer (When clicking a Zone or Booking) ─────────────── */}
        {selectedZone && (
          <div style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 320,
            maxHeight: "calc(100% - 40px)",
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            zIndex: 1000,
            overflowY: "auto",
            padding: 18,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: selectedZone.color || "#4F46E5" }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{selectedZone.name}</h4>
              </div>
              <button onClick={() => setSelectedZone(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <span style={{
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 800,
                background: selectedZone.is_active ? "#ecfdf5" : "#fef2f2",
                color: selectedZone.is_active ? "#059669" : "#dc2626",
                border: `1px solid ${selectedZone.is_active ? "#a7f3d0" : "#fecaca"}`,
              }}>
                {selectedZone.is_active ? "Active Zone" : "Disabled"}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 800,
                background: "#f1f5f9",
                color: "#475569",
                textTransform: "uppercase",
              }}>
                {selectedZone.zone_type}
              </span>
            </div>

            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
              {selectedZone.description || "Designated geographic coverage area for customer service bookings."}
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, border: "1px solid #f1f5f9", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Coverage Parameters</div>
              <div style={{ fontSize: 12, color: "#0f172a", marginBottom: 4 }}>
                <strong>Type:</strong> {selectedZone.zone_type === "circle" ? "Radius Geofence" : "Custom Polygon Boundary"}
              </div>
              {selectedZone.zone_type === "circle" && (
                <div style={{ fontSize: 12, color: "#0f172a", marginBottom: 4 }}>
                  <strong>Radius:</strong> {((parseFloat(selectedZone.radius_meters) || 15000) / 1000).toFixed(1)} km
                </div>
              )}
              {selectedZone.center_lat && selectedZone.center_lng && (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  Center: {parseFloat(selectedZone.center_lat).toFixed(4)}, {parseFloat(selectedZone.center_lng).toFixed(4)}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedBooking && (
          <div style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 320,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            zIndex: 1000,
            padding: 18,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#0f172a" }}>Booking #{selectedBooking.request_id}</h4>
              <button onClick={() => setSelectedBooking(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5", marginBottom: 6 }}>{selectedBooking.issue_title || selectedBooking.service_category}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>📍 {selectedBooking.address}</div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 10, fontSize: 12 }}>
              <div><strong>Status:</strong> {selectedBooking.status}</div>
              <div><strong>Customer:</strong> {selectedBooking.customer_name} ({selectedBooking.phone})</div>
              {selectedBooking.technician_name && (
                <div><strong>Assigned Pro:</strong> {selectedBooking.technician_name}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
