/**
 * GTCoverageTab.jsx -- "Service Coverage" tab of the Goods & Transport
 * Management Hub.
 *
 * Coverage answers "is this trip bookable at all?"; the Lanes & Routes tab
 * answers "what does this known route cost?". They are deliberately separate.
 *
 * Every row here is a settings_hub ServiceZone (the same geofence the
 * booking endpoint and /api/logistics/quote/ enforce), limited to zones
 * configured for Goods & Transport service slugs. Expanding coverage
 * (bigger radius, a new city polygon) is an admin action, never a code change.
 *
 * Map: radius mode reuses the Leaflet DrawableMap (click to set the centre).
 * Polygon mode uses the same click-to-add-corners pattern as Locations >
 * Service Areas (no leaflet-draw): each map click adds a numbered corner,
 * corners are draggable, with Undo / Clear. The "lat, lng" textarea is the
 * single source of truth for the vertices, so typing and clicking stay in
 * sync, and it is converted to the same GeoJSON Polygon the API expects.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Circle, Popup, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPinned, Pencil, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react"
import { Button, Input, Modal, Select, TextArea } from "../../components/kit.jsx"
import { DrawableMap } from "../locations/DrawableMap.jsx"
import {
  GT_COVERAGE_SERVICES,
  createCoverageZone,
  deleteCoverageZone,
  fetchCoverageZones,
  updateCoverageZone,
} from "../../../api/logisticsAdminService.js"
import { fetchServiceTiers } from "../../../api/logisticsService.js"

const STATUS_OPTIONS = [
  { value: "active", label: "Active (bookable)" },
  { value: "coming_soon", label: "Coming Soon (not bookable)" },
  { value: "paused", label: "Paused (not bookable)" },
]

const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  coming_soon: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  paused: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}
const STATUS_LABEL = { active: "Active", coming_soon: "Coming Soon", paused: "Paused" }

// Admin-selectable map colour per coverage area (ServiceZone.color).
const DEFAULT_ZONE_COLOR = "#4F46E5"
const ZONE_COLOR_PRESETS = ["#4F46E5", "#2563EB", "#0891B2", "#16A34A", "#CA8A04", "#EA580C", "#DC2626", "#DB2777", "#7C3AED", "#475569"]
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const zoneColor = (z) => (z && HEX_COLOR_RE.test(z.color || "") ? z.color : DEFAULT_ZONE_COLOR)

const EMPTY_FORM = {
  name: "",
  color: DEFAULT_ZONE_COLOR,
  description: "",
  status: "active",
  zone_type: "circle",
  center_lat: "",
  center_lng: "",
  radius_km: "20",
  polygonText: "",
  services: ["goods_transport_truck", "goods_transport_two_wheeler"],
  vehicle_classes: [],
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_STYLE[status] || STATUS_STYLE.paused}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

// GeoJSON ring ([lng, lat]) <-> editable "lat, lng" lines.
function ringToText(polygon) {
  const ring = polygon?.coordinates?.[0] || []
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring
  return pts.map(([lng, lat]) => `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`).join("\n")
}

function textToPolygon(text) {
  const pts = String(text || "")
    .split(/\n+/)
    .map((line) => line.split(/[,\s]+/).filter(Boolean).map(Number))
    .filter((p) => p.length >= 2 && p.every((n) => Number.isFinite(n)))
    .map(([lat, lng]) => [lng, lat])
  if (pts.length < 3) return null
  const [first] = pts
  const last = pts[pts.length - 1]
  const ring = first[0] === last[0] && first[1] === last[1] ? pts : [...pts, first]
  return { type: "Polygon", coordinates: [ring] }
}

// "lat, lng" lines -> [[lat, lng], ...] (open ring, map order). Accepts a
// closed ring (last == first) and drops the duplicate closing point.
function textToPoints(text) {
  const pts = String(text || "")
    .split(/\n+/)
    .map((line) => line.split(/[,\s]+/).filter(Boolean).map(Number))
    .filter((p) => p.length >= 2 && p.every((n) => Number.isFinite(n)))
    .map(([lat, lng]) => [lat, lng])
  if (pts.length > 1) {
    const a = pts[0]
    const b = pts[pts.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) pts.pop()
  }
  return pts
}

function pointsToText(points) {
  return points.map(([lat, lng]) => `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`).join("\n")
}

function makeVertexIcon(index) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#4F46E5;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);color:#fff;font:700 11px/18px system-ui,sans-serif;text-align:center;cursor:grab">${index + 1}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function PolygonClickCapture({ onAdd }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Fit the map to the existing polygon once, when editing an existing zone.
function FitToPoints({ points }) {
  const map = useMap()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (done || points.length < 2) return
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
    setDone(true)
  }, [map, points, done])
  return null
}

/**
 * Click-to-add-corners polygon editor (ported from Locations > Service Areas).
 * `points` are [lat, lng]; every change is reported through onChange(points).
 */
function CoveragePolygonMap({ points, onChange, otherZones, center, zoom, height = "400px", color = DEFAULT_ZONE_COLOR }) {
  const addPoint = useCallback((lat, lng) => onChange([...points, [lat, lng]]), [points, onChange])
  const movePoint = (idx, lat, lng) => onChange(points.map((p, i) => (i === idx ? [lat, lng] : p)))

  return (
    <MapContainer center={points[0] || center} zoom={points.length ? 13 : zoom} style={{ width: "100%", height }} maxZoom={22}>
      <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" maxNativeZoom={19} maxZoom={22} />
      <FitToPoints points={points} />

      {/* Other coverage areas, read-only for context */}
      {otherZones.map((z) =>
        z.zone_type === "polygon" && z.polygon?.coordinates?.[0] ? (
          <Polygon key={`o-${z.id}`} positions={z.polygon.coordinates[0].map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: zoneColor(z), fillColor: zoneColor(z), fillOpacity: 0.08, weight: 1.5, dashArray: "4 4" }} interactive={false} />
        ) : z.center_lat != null && z.radius_meters ? (
          <Circle key={`o-${z.id}`} center={[z.center_lat, z.center_lng]} radius={Number(z.radius_meters)}
            pathOptions={{ color: zoneColor(z), fillColor: zoneColor(z), fillOpacity: 0.08, weight: 1.5, dashArray: "4 4" }} interactive={false} />
        ) : null
      )}

      {points.length === 2 && (
        <Polyline positions={points} pathOptions={{ color, weight: 3, dashArray: "4 6" }} />
      )}
      {points.length >= 3 && (
        <Polygon positions={points} pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 3 }} interactive={false} />
      )}
      {points.map((pt, idx) => (
        <Marker
          key={idx}
          position={pt}
          draggable
          icon={makeVertexIcon(idx)}
          eventHandlers={{
            dragend: (e) => {
              const pos = e.target.getLatLng()
              movePoint(idx, pos.lat, pos.lng)
            },
          }}
        >
          <Popup>Corner #{idx + 1} -- drag to adjust</Popup>
        </Marker>
      ))}

      <PolygonClickCapture onAdd={addPoint} />
    </MapContainer>
  )
}

function zoneToForm(zone) {
  return {
    name: zone.name || "",
    color: zoneColor(zone),
    description: zone.description || "",
    status: zone.status || (zone.is_active ? "active" : "paused"),
    zone_type: zone.zone_type || "circle",
    center_lat: zone.center_lat ?? "",
    center_lng: zone.center_lng ?? "",
    radius_km: zone.radius_meters ? String(Number(zone.radius_meters) / 1000) : "20",
    polygonText: zone.zone_type === "polygon" ? ringToText(zone.polygon) : "",
    services: (zone.services || []).filter((s) => s.is_available !== false).map((s) => s.service_slug),
    vehicle_classes: zone.vehicle_classes || [],
  }
}

// DrawableMap renders "locations" (lat/lng + optional geofence). Adapt zones.
function zonesAsMapLocations(zones, excludeId) {
  return zones
    .filter((z) => z.id !== excludeId && z.center_lat != null && z.center_lng != null)
    .map((z) => ({
      id: z.id,
      name: `${z.name} (${STATUS_LABEL[z.status] || z.status})`,
      lat: z.center_lat,
      lng: z.center_lng,
      is_active: z.status === "active",
      color: zoneColor(z),
      geofence_radius: z.zone_type === "circle" ? z.radius_meters : null,
      geofence_polygon: z.zone_type === "polygon" ? z.polygon : null,
      address: z.description || "",
    }))
}

function CoverageModal({ zone, zones, vehicleOptions, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(zone ? zoneToForm(zone) : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const toggleIn = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }))

  const onMapClick = useCallback((lat, lng) => {
    setForm((f) => ({ ...f, center_lat: lat.toFixed(6), center_lng: lng.toFixed(6) }))
  }, [])
  // Polygon corners: derived from the textarea (single source of truth).
  const polygonPoints = useMemo(() => textToPoints(form.polygonText), [form.polygonText])
  const setPolygonPoints = useCallback((pts) => setForm((f) => ({ ...f, polygonText: pointsToText(pts) })), [])
  const undoPolygonPoint = () => setPolygonPoints(polygonPoints.slice(0, -1))
  const clearPolygon = () => setPolygonPoints([])

  const previewPolygon = form.zone_type === "polygon" ? textToPolygon(form.polygonText) : null
  const mapLocations = useMemo(() => zonesAsMapLocations(zones, zone?.id), [zones, zone?.id])
  const otherZones = useMemo(() => zones.filter((z) => z.id !== zone?.id), [zones, zone?.id])

  const firstZone = zones.find((z) => z.center_lat != null)
  const mapCenter = firstZone ? [firstZone.center_lat, firstZone.center_lng] : [20.5937, 78.9629]

  const submit = async () => {
    setError("")
    if (!form.name.trim()) return setError("Area name is required.")
    if (form.services.length === 0) return setError("Select at least one service this area covers.")
    if (!HEX_COLOR_RE.test(form.color || "")) return setError("Pick a valid map colour.")
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      status: form.status,
      zone_type: form.zone_type,
      vehicle_classes: form.vehicle_classes,
      services: form.services.map((slug) => ({
        service_slug: slug,
        service_name: GT_COVERAGE_SERVICES.find((s) => s.slug === slug)?.label || slug,
        is_available: true,
      })),
    }
    if (form.zone_type === "circle") {
      const lat = parseFloat(form.center_lat)
      const lng = parseFloat(form.center_lng)
      const km = parseFloat(form.radius_km)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setError("Click the map or enter the centre latitude and longitude.")
      if (!Number.isFinite(km) || km <= 0) return setError("Radius must be greater than 0 km.")
      Object.assign(payload, { center_lat: lat, center_lng: lng, radius_meters: km * 1000 })
    } else {
      if (!previewPolygon) return setError("Click the map to add at least 3 corners, or enter at least 3 \"lat, lng\" vertices.")
      payload.polygon = previewPolygon
    }
    setSaving(true)
    const res = zone ? await updateCoverageZone(zone.id, payload) : await createCoverageZone(payload)
    setSaving(false)
    if (!res.ok) return setError(res.error?.message || "Could not save this coverage area.")
    showToast(zone ? "Coverage area updated." : "Coverage area created.")
    onSaved()
  }

  return (
    <Modal title={zone ? `Edit coverage area -- ${zone.name}` : "Add coverage area"} onClose={onClose} maxWidth="max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Input label="Area name" required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Hosur City, Bengaluru South" />
          <div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Map colour</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {ZONE_COLOR_PRESETS.map((c) => (
                <button key={c} type="button" title={c} aria-label={`Use colour ${c}`}
                  onClick={() => set({ color: c })}
                  className={`w-6 h-6 rounded-full border-2 ${form.color.toLowerCase() === c.toLowerCase() ? "border-slate-900 dark:border-white" : "border-white dark:border-slate-700"} shadow`}
                  style={{ background: c }} />
              ))}
              <input type="color" value={HEX_COLOR_RE.test(form.color) && form.color.length === 7 ? form.color : DEFAULT_ZONE_COLOR}
                onChange={(e) => set({ color: e.target.value })}
                className="w-8 h-7 p-0 border border-slate-200 rounded cursor-pointer" title="Custom colour" aria-label="Custom colour" />
            </div>
          </div>
          <TextArea label="Notes (optional)" value={form.description} onChange={(e) => set({ description: e.target.value })} className="min-h-[60px]" />
          <Select label="Status" value={form.status} onChange={(e) => set({ status: e.target.value })} options={STATUS_OPTIONS}
            hint="Only Active areas allow bookings. Coming Soon / Paused areas are kept for planning and messaging." />

          <div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Services covered</div>
            <div className="flex flex-wrap gap-2">
              {GT_COVERAGE_SERVICES.map((s) => (
                <label key={s.slug} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={form.services.includes(s.slug)} onChange={() => toggleIn("services", s.slug)} />
                  {s.label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Mini Truck and Two Wheeler bookings need BOTH pickup and drop inside an Active area. Packers &amp; Movers checks the pickup only.</p>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Vehicle types (optional)</div>
            {vehicleOptions.length === 0 ? (
              <p className="text-[11px] text-slate-400">No vehicle tiers found -- all vehicle types allowed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vehicleOptions.map((v) => (
                  <label key={v.value} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={form.vehicle_classes.includes(v.value)} onChange={() => toggleIn("vehicle_classes", v.value)} />
                    {v.label}
                  </label>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Leave all unticked to allow every vehicle type in this area.</p>
          </div>

          <Select label="Shape" value={form.zone_type} onChange={(e) => set({ zone_type: e.target.value })}
            options={[{ value: "circle", label: "Radius around a centre point" }, { value: "polygon", label: "Custom polygon" }]} />

          {form.zone_type === "circle" ? (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Centre lat" value={form.center_lat} onChange={(e) => set({ center_lat: e.target.value })} />
              <Input label="Centre lng" value={form.center_lng} onChange={(e) => set({ center_lng: e.target.value })} />
              <Input label="Radius (km)" type="number" min="0.1" step="0.1" value={form.radius_km} onChange={(e) => set({ radius_km: e.target.value })} />
            </div>
          ) : (
            <TextArea label='Polygon vertices ("lat, lng" per line)' value={form.polygonText}
              onChange={(e) => set({ polygonText: e.target.value })}
              hint="Filled automatically as you click corners on the map. At least 3 points." />
          )}
          {error && <div className="text-sm font-semibold text-rose-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : zone ? "Save changes" : "Create area"}</Button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[420px]">
          {form.zone_type === "circle" ? (
            <>
              <p className="text-[11px] font-semibold text-slate-500 px-3 py-2 bg-slate-50 dark:bg-slate-800/40">
                Click the map to place the centre.
              </p>
              <DrawableMap
                key="circle"
                locations={mapLocations}
                newLat={parseFloat(form.center_lat) || null}
                newLng={parseFloat(form.center_lng) || null}
                newRadius={(parseFloat(form.radius_km) || 0) * 1000}
                newColor={form.color}
                geofenceType="circle"
                drawMode={false}
                onMapClick={onMapClick}
                center={mapCenter}
                zoom={firstZone ? 10 : 5}
                height="400px"
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-500">
                  {polygonPoints.length === 0 && "Click the map to add the 1st corner."}
                  {polygonPoints.length === 1 && "Click to add the 2nd corner."}
                  {polygonPoints.length === 2 && "Click to add a 3rd corner to close the area."}
                  {polygonPoints.length >= 3 && `${polygonPoints.length} corners. Click to add more, drag a numbered corner to adjust.`}
                </p>
                {polygonPoints.length > 0 && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={undoPolygonPoint}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-200 bg-white text-indigo-600 text-[11px] font-bold hover:bg-indigo-50">
                      <Undo2 size={12} /> Undo
                    </button>
                    <button type="button" onClick={clearPolygon}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-200 bg-white text-rose-600 text-[11px] font-bold hover:bg-rose-50">
                      <Trash2 size={12} /> Clear
                    </button>
                  </div>
                )}
              </div>
              <CoveragePolygonMap
                key={`polygon-${zone?.id || "new"}`}
                points={polygonPoints}
                onChange={setPolygonPoints}
                otherZones={otherZones}
                color={form.color}
                center={mapCenter}
                zoom={firstZone ? 10 : 5}
                height="400px"
              />
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function GTCoverageTab({ showToast }) {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [editing, setEditing] = useState(null) // null | "new" | zone
  const [vehicleOptions, setVehicleOptions] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchCoverageZones()
    setLoading(false)
    if (!res.ok) {
      setLoadError(res.error?.message || "Could not load coverage areas.")
      return
    }
    setLoadError("")
    setZones(res.zones)
  }, [])

  useEffect(() => { load() }, [load])

  // Vehicle options come from the live GT tiers (ServiceTier.vehicle_class),
  // not a hardcoded list.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tiers = await fetchServiceTiers()
        const byClass = new Map()
        ;(tiers || []).forEach((t) => {
          if (!t?.vehicle_class) return
          const names = byClass.get(t.vehicle_class) || new Set()
          names.add(t.name)
          byClass.set(t.vehicle_class, names)
        })
        if (!cancelled) {
          setVehicleOptions(
            [...byClass.entries()].map(([value, names]) => ({
              value,
              label: `${value.replace(/_/g, " ")} (${[...names].slice(0, 2).join(", ")}${names.size > 2 ? ", ..." : ""})`,
            }))
          )
        }
      } catch {
        if (!cancelled) setVehicleOptions([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const remove = async (zone) => {
    if (!window.confirm(`Delete coverage area "${zone.name}"? Bookings inside it will stop being allowed unless another Active area covers them.`)) return
    const res = await deleteCoverageZone(zone.id)
    if (!res.ok) return showToast(res.error?.message || "Delete failed.", "error")
    showToast("Coverage area deleted.")
    load()
  }

  const serviceLabel = (zone) =>
    (zone.services || [])
      .filter((s) => s.is_available !== false)
      .map((s) => GT_COVERAGE_SERVICES.find((g) => g.slug === s.service_slug)?.label || s.service_slug)
      .join(", ") || "All services"

  const activeCount = zones.filter((z) => z.status === "active").length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPinned size={18} /> Service Coverage
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Where Goods &amp; Transport can be booked. Pickup and drop must both fall inside an Active area.
            Fixed-fare pricing for known routes stays in Lanes &amp; Routes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-1.5">Refresh</span>
          </Button>
          <Button onClick={() => setEditing("new")}>
            <Plus size={14} /> <span className="ml-1">Add Area</span>
          </Button>
        </div>
      </div>

      {!loading && activeCount === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          No Active coverage area exists yet for this company, so coverage is not enforced (open access). Add an Active area to start restricting bookings.
        </div>
      )}
      {loadError && <div className="text-sm font-semibold text-rose-600">{loadError}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Area</th>
              <th className="text-left px-4 py-3">Shape</th>
              <th className="text-left px-4 py-3">Services</th>
              <th className="text-left px-4 py-3">Vehicles</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && zones.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading coverage areas...</td></tr>
            ) : zones.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No coverage areas yet. Click "Add Area" to create one.</td></tr>
            ) : (
              zones.map((z) => (
                <tr key={z.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: zoneColor(z) }} title={zoneColor(z)} />
                      {z.name}
                    </div>
                    {z.description && <div className="text-[11px] text-slate-400">{z.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {z.zone_type === "circle"
                      ? `${(Number(z.radius_meters) / 1000).toFixed(1)} km radius`
                      : `Polygon (${Math.max(0, (z.polygon?.coordinates?.[0]?.length || 1) - 1)} pts)`}
                    {z.center_lat != null && (
                      <div className="text-[11px] text-slate-400">{Number(z.center_lat).toFixed(4)}, {Number(z.center_lng).toFixed(4)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{serviceLabel(z)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {(z.vehicle_classes || []).length ? z.vehicle_classes.map((v) => v.replace(/_/g, " ")).join(", ") : "All"}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={z.status} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setEditing(z)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => remove(z)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CoverageModal
          zone={editing === "new" ? null : editing}
          zones={zones}
          vehicleOptions={vehicleOptions}
          showToast={showToast}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

export default GTCoverageTab
