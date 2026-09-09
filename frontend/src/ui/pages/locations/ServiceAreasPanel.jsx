/**
 * ServiceAreasPanel.jsx
 *
 * Admin UI for managing Service Area Geofence Zones.
 *
 * Features:
 *  - List all service zones with color dot, type badge, active toggle
 *  - Draw new polygon zones via DrawableMap (leaflet-draw)
 *  - Set circle zones with center + radius
 *  - Assign which services are available per zone
 *  - Live map preview of all zones as polygons/circles
 */
import React, { useState, useEffect, useCallback, useRef } from "react"
import { MapContainer, TileLayer, Circle, Polygon, Polyline, Popup, Marker, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import {
  Plus, Trash2, Pencil, X, Save, Loader2, MapPin, Target,
  CheckCircle2, XCircle, AlertTriangle, ToggleLeft, ToggleRight,
  Map, List, Shield, Navigation, Search, Layers, CheckSquare, Square,
  Crosshair, LocateFixed, Compass, Sparkles, Undo2, RotateCcw
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { getAddress } from "../../../api/geocoding.js"
import { searchHosurPlacesOnline, filterLocationSuggestions, formatExactLocation } from "../../../services/hosurLocations.js"

/* ── Constants ───────────────────────────────────────────────────────────────── */

const COLOURS = [
  "#4F46E5", "#F97316", "#10B981", "#EF4444",
  "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899",
  "#0EA5E9", "#84CC16",
]

// India Geographical Bounds [South-West, North-East]
const INDIA_BOUNDS = [
  [6.5, 68.0],
  [37.5, 97.5]
]

// Default to Hosur / Bengaluru, India
const DEFAULT_INDIA_CENTER = [12.7409, 77.8253]

const REAL_SERVICE_FALLBACK = [
  // Deep Cleaning
  { slug: "full-home-deep-clean", name: "Full Home Deep Cleaning", category: "Deep Cleaning", category_slug: "deep-cleaning" },

  // Goods & Transport
  { slug: "truck", name: "Truck", category: "Goods & Transport", category_slug: "goods_transports" },
  { slug: "two-wheeler", name: "Two Wheeler", category: "Goods & Transport", category_slug: "goods_transports" },
  { slug: "packers-movers", name: "Packer & Mover", category: "Goods & Transport", category_slug: "goods_transports" },

  // Electrician, Plumbing & Carpentry
  { slug: "plumbing", name: "Plumbing", category: "Electrician, Plumbing & Carpentry", category_slug: "electrician_plumbing_carpentry" },
  { slug: "electrician", name: "Electrician", category: "Electrician, Plumbing & Carpentry", category_slug: "electrician_plumbing_carpentry" },
  { slug: "carpentry", name: "Carpentry Services", category: "Electrician, Plumbing & Carpentry", category_slug: "electrician_plumbing_carpentry" },

  // AC & Appliance
  { slug: "ac-service-cleaning", name: "AC Service & Cleaning", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "ac-repair", name: "AC Repair & Diagnostics", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "ac-gas-refill", name: "AC Gas & Refrigerant", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "ac-installation", name: "AC Installation & Uninstallation", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "ac-pcb-electrical", name: "AC PCB & Electrical", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "ac-parts-accessories", name: "AC Parts & Accessories", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "refrigerator", name: "Refrigerator", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "washing-machine", name: "Washing Machine", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "tv-display", name: "TV & Display", category: "AC & Appliance", category_slug: "ac_appliance" },
  { slug: "microwave", name: "Microwave Oven Repair", category: "AC & Appliance", category_slug: "ac_appliance" },

  // Home Services & Pest Control
  { slug: "full-house-cleaning", name: "Full House Cleaning", category: "Home Services & Pest Control", category_slug: "home_pest_control" },
  { slug: "bathroom-cleaning", name: "Bathroom Cleaning", category: "Home Services & Pest Control", category_slug: "home_pest_control" },
  { slug: "kitchen-cleaning", name: "Kitchen Cleaning", category: "Home Services & Pest Control", category_slug: "home_pest_control" },
  { slug: "sofa-cleaning", name: "Sofa Cleaning", category: "Home Services & Pest Control", category_slug: "home_pest_control" },
  { slug: "cockroach-control", name: "Cockroach Control", category: "Home Services & Pest Control", category_slug: "home_pest_control" },
  { slug: "termite-control", name: "Termite Control", category: "Home Services & Pest Control", category_slug: "home_pest_control" },
  { slug: "ants-bed-bugs-control", name: "Ants & Bed Bugs Control", category: "Home Services & Pest Control", category_slug: "home_pest_control" },

  // Paintings
  { slug: "interior-painting", name: "Interior Painting", category: "Paintings", category_slug: "paintings" },
  { slug: "exterior-painting", name: "Exterior Painting", category: "Paintings", category_slug: "paintings" },
  { slug: "waterproofing", name: "Waterproofing", category: "Paintings", category_slug: "paintings" },
  { slug: "wood-metal", name: "Wood & Metal", category: "Paintings", category_slug: "paintings" },
  { slug: "texture-decor", name: "Texture Decor", category: "Paintings", category_slug: "paintings" },

  // Mason
  { slug: "home-construction", name: "Home Construction", category: "Mason", category_slug: "mason" },
  { slug: "full-house-construction", name: "Full House construction", category: "Mason", category_slug: "mason" },
  { slug: "brick-block-work", name: "Brick & Block Work", category: "Mason", category_slug: "mason" },
  { slug: "plastering-wall-repair", name: "Plastering & Wall Repair", category: "Mason", category_slug: "mason" },
  { slug: "wall-partition-construction", name: "Wall & Partition Construction", category: "Mason", category_slug: "mason" },
  { slug: "wall-breaking-demolition", name: "Wall Breaking & Demolition", category: "Mason", category_slug: "mason" },

  // Farm-Fresh Vegetables & Groceries
  { slug: "vegetables", name: "Farm-Fresh Vegetable", category: "Farm-Fresh Vegetables & Groceries", category_slug: "vegetables_groceries" },
  { slug: "groceries", name: "Groceries", category: "Farm-Fresh Vegetables & Groceries", category_slug: "vegetables_groceries" },
]

const SERVICE_OPTIONS = REAL_SERVICE_FALLBACK

/* ── Custom Pin & Location Icons ─────────────────────────────────────────────── */

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const createPinIcon = (color = "#4F46E5", label = "") =>
  L.divIcon({
    className: "service-zone-pin-icon",
    html: `<div style="
      width: 32px; height: 32px;
      background: ${color};
      border: 2.5px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      cursor: grab;
    ">
      <div style="
        width: 10px; height: 10px;
        background: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

const createCurrentLocationIcon = () =>
  L.divIcon({
    className: "current-location-pulse-marker",
    html: `<div style="
      position: relative;
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 24px; height: 24px;
        background: rgba(37, 99, 235, 0.35);
        border-radius: 50%;
        animation: pin-pulse 1.8s infinite ease-out;
      "></div>
      <div style="
        width: 14px; height: 14px;
        background: #2563eb;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(37,99,235,0.6);
      "></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })

const createVertexIcon = (index = 0, color = "#4F46E5") =>
  L.divIcon({
    className: "polygon-vertex-badge",
    html: `<div style="
      width: 24px; height: 24px;
      background: ${color};
      color: #ffffff;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 900;
      cursor: pointer;
    ">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

function MapClickCapture({ enabled, onMapClick }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled) return
    const handler = (e) => onMapClick(e.latlng.lat, e.latlng.lng)
    map.on("click", handler)
    return () => map.off("click", handler)
  }, [map, enabled, onMapClick])
  return null
}

function DrawControl({ active, onDrawComplete, onDrawDelete }) {
  const map = useMap()
  const fgRef = useRef(null)
  const dcRef = useRef(null)

  useEffect(() => {
    if (!active) return
    import("leaflet-draw").then(() => {
      if (!fgRef.current) {
        fgRef.current = new L.FeatureGroup()
        map.addLayer(fgRef.current)
      }
      if (dcRef.current) { map.removeControl(dcRef.current); dcRef.current = null }

      dcRef.current = new L.Control.Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: "#4F46E5", fillOpacity: 0.15 } },
          polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
        },
        edit: { featureGroup: fgRef.current },
      })
      map.addControl(dcRef.current)

      const onCreated = (e) => {
        fgRef.current.clearLayers()
        fgRef.current.addLayer(e.layer)
        onDrawComplete(e.layer.toGeoJSON().geometry)
      }
      const onDeleted = () => { fgRef.current.clearLayers(); onDrawDelete() }
      map.on(L.Draw.Event.CREATED, onCreated)
      map.on(L.Draw.Event.DELETED, onDeleted)

      return () => {
        map.off(L.Draw.Event.CREATED, onCreated)
        map.off(L.Draw.Event.DELETED, onDeleted)
        if (dcRef.current) { map.removeControl(dcRef.current); dcRef.current = null }
        if (fgRef.current) { map.removeLayer(fgRef.current); fgRef.current = null }
      }
    })
  }, [map, active, onDrawComplete, onDrawDelete])

  return null
}

function FlyTo({ lat, lng, zoom = 14 }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom, { duration: 1 })
  }, [map, lat, lng, zoom])
  return null
}

/* ── Zone Map Preview ────────────────────────────────────────────────────────── */

function ZoneOverlays({ zones, selectedZoneId, onSelectZone }) {
  return zones.map(zone => {
    const isSelected = selectedZoneId === zone.id
    if (zone.zone_type === "polygon" && zone.polygon?.coordinates?.[0]) {
      const positions = zone.polygon.coordinates[0].map(([lng, lat]) => [lat, lng])
      return (
        <Polygon
          key={zone.id}
          positions={positions}
          eventHandlers={{
            click: () => onSelectZone?.(zone)
          }}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: isSelected ? 0.35 : 0.15,
            weight: isSelected ? 3.5 : 2,
            dashArray: isSelected ? "6, 6" : undefined
          }}
        >
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>{zone.name}</strong><br />
              {zone.is_active ? "✅ Active" : "⛔ Inactive"}<br />
              <span style={{ fontSize: 10, color: "#64748b" }}>Polygon Area ({positions.length} corners)</span>
            </div>
          </Popup>
        </Polygon>
      )
    }
    if (zone.zone_type === "circle" && zone.center_lat && zone.center_lng) {
      return (
        <Circle
          key={zone.id}
          center={[zone.center_lat, zone.center_lng]}
          radius={zone.radius_meters || 5000}
          eventHandlers={{
            click: () => onSelectZone?.(zone)
          }}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: isSelected ? 0.35 : 0.15,
            weight: isSelected ? 3.5 : 2,
            dashArray: isSelected ? "6, 6" : undefined
          }}
        >
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>{zone.name}</strong><br />
              Radius: {(zone.radius_meters / 1000).toFixed(1)} km<br />
              {zone.is_active ? "✅ Active" : "⛔ Inactive"}
            </div>
          </Popup>
        </Circle>
      )
    }
    return null
  })
}

/* ── Zone Form (Create / Edit) ───────────────────────────────────────────────── */

const EMPTY_FORM = {
  name: "", description: "", color: COLOURS[0],
  is_active: true, zone_type: "circle",
  center_lat: null, center_lng: null, radius_meters: 5000,
  polygon: null, services: [],
}

function ZoneForm({ editZone, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    let initLat = editZone?.center_lat ?? null
    let initLng = editZone?.center_lng ?? null
    if (editZone?.zone_type === "polygon" && editZone?.polygon?.coordinates?.[0]) {
      const pts = editZone.polygon.coordinates[0].map(([lng, lat]) => [lat, lng])
      if (pts.length >= 3) {
        initLat = pts.reduce((s, p) => s + p[0], 0) / pts.length
        initLng = pts.reduce((s, p) => s + p[1], 0) / pts.length
      }
    }
    return editZone ? {
      name: editZone.name || "",
      description: editZone.description || "",
      color: editZone.color || COLOURS[0],
      is_active: editZone.is_active !== false,
      zone_type: editZone.zone_type || "circle",
      center_lat: initLat,
      center_lng: initLng,
      radius_meters: editZone.radius_meters || 5000,
      polygon: editZone.polygon || null,
      services: (editZone.services || []).map(s => s.service_slug),
    } : { ...EMPTY_FORM }
  })
  const [polygonPoints, setPolygonPoints] = useState(() => {
    if (editZone?.zone_type === "polygon" && editZone?.polygon?.coordinates?.[0]) {
      const pts = editZone.polygon.coordinates[0].map(([lng, lat]) => [lat, lng])
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
        return pts.slice(0, -1)
      }
      return pts
    }
    return []
  })
  const [drawn, setDrawn] = useState(editZone?.polygon || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [locatingGPS, setLocatingGPS] = useState(false)
  const [serviceCatalog, setServiceCatalog] = useState(SERVICE_OPTIONS)
  const [serviceSearch, setServiceSearch] = useState("")
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all")
  const [centerSearch, setCenterSearch] = useState(() => {
    if (editZone?.name && !editZone.name.startsWith("Service Area @") && !editZone.name.startsWith("Zone @")) {
      return editZone.name.replace(/ Service Area$/i, "")
    }
    return ""
  })
  const [centerSearching, setCenterSearching] = useState(false)
  const [onlineCenterSuggestions, setOnlineCenterSuggestions] = useState([])
  const [showCenterSuggestions, setShowCenterSuggestions] = useState(false)
  const centerSearchWrapperRef = useRef(null)

  // Debounced dynamic search for Hosur center location (Matching customer booking page)
  useEffect(() => {
    if (!centerSearch || centerSearch.trim().length < 2) {
      setOnlineCenterSuggestions([])
      setCenterSearching(false)
      return
    }
    setCenterSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await searchHosurPlacesOnline(centerSearch)
        setOnlineCenterSuggestions(res || [])
      } catch {
        setOnlineCenterSuggestions([])
      } finally {
        setCenterSearching(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [centerSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (centerSearchWrapperRef.current && !centerSearchWrapperRef.current.contains(e.target)) {
        setShowCenterSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const localCenterMatches = filterLocationSuggestions(centerSearch)
  const centerSuggestions = [
    ...localCenterMatches,
    ...onlineCenterSuggestions.filter(
      (on) => !localCenterMatches.some((loc) => loc.name.toLowerCase() === on.name.toLowerCase())
    ),
  ]

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Handler for adding corner points when clicking map in Polygon mode
  const handlePolygonMapClick = (lat, lng) => {
    setPolygonPoints(prev => {
      const next = [...prev, [lat, lng]]
      if (next.length >= 3) {
        const closed = [...next, next[0]].map(([la, ln]) => [ln, la])
        const geom = { type: "Polygon", coordinates: [closed] }
        set("polygon", geom)
        const avgLat = next.reduce((s, p) => s + p[0], 0) / next.length
        const avgLng = next.reduce((s, p) => s + p[1], 0) / next.length
        set("center_lat", avgLat)
        set("center_lng", avgLng)
        setDrawn(geom)
      } else {
        set("polygon", null)
        setDrawn(null)
      }
      setError("")
      return next
    })
  }

  const handleVertexDrag = (index, lat, lng) => {
    setPolygonPoints(prev => {
      const next = [...prev]
      next[index] = [lat, lng]
      if (next.length >= 3) {
        const closed = [...next, next[0]].map(([la, ln]) => [ln, la])
        const geom = { type: "Polygon", coordinates: [closed] }
        set("polygon", geom)
        const avgLat = next.reduce((s, p) => s + p[0], 0) / next.length
        const avgLng = next.reduce((s, p) => s + p[1], 0) / next.length
        set("center_lat", avgLat)
        set("center_lng", avgLng)
        setDrawn(geom)
      }
      return next
    })
  }

  const handleUndoPolygonPoint = () => {
    setPolygonPoints(prev => {
      const next = prev.slice(0, -1)
      if (next.length >= 3) {
        const closed = [...next, next[0]].map(([la, ln]) => [ln, la])
        const geom = { type: "Polygon", coordinates: [closed] }
        set("polygon", geom)
        const avgLat = next.reduce((s, p) => s + p[0], 0) / next.length
        const avgLng = next.reduce((s, p) => s + p[1], 0) / next.length
        set("center_lat", avgLat)
        set("center_lng", avgLng)
        setDrawn(geom)
      } else {
        set("polygon", null)
        setDrawn(null)
      }
      return next
    })
  }

  const handleClearPolygon = () => {
    setPolygonPoints([])
    set("polygon", null)
    setDrawn(null)
  }

  // Auto-pin user's current GPS location if creating a new zone without coordinates
  useEffect(() => {
    if (!form.center_lat && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          setForm(f => ({
            ...f,
            center_lat: f.center_lat || lat,
            center_lng: f.center_lng || lng,
          }))
          try {
            const addr = await getAddress(lat, lng)
            if (addr) {
              setCenterSearch(addr)
              setForm(f => ({
                ...f,
                name: f.name ? f.name : `${addr.split(",")[0].trim()} Service Area`
              }))
            }
          } catch {}
        },
        () => {
          // Default to Hosur / Bengaluru if GPS denied
          setForm(f => ({
            ...f,
            center_lat: f.center_lat || DEFAULT_INDIA_CENTER[0],
            center_lng: f.center_lng || DEFAULT_INDIA_CENTER[1],
            name: f.name || "Hosur Service Area"
          }))
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  // Load dynamic real service catalog from database
  useEffect(() => {
    async function loadCatalogServices() {
      try {
        const res = await apiRequest("/catalog/sub-services/")
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map(s => ({
            id: s.id,
            slug: s.slug || (s.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: s.name,
            category: s.category_name || (typeof s.category === "string" ? s.category : "General Services"),
            category_slug: (s.category_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          }))
          const unique = []
          const seen = new Set()
          mapped.forEach(item => {
            if (!seen.has(item.slug)) {
              seen.add(item.slug)
              unique.push(item)
            }
          })
          setServiceCatalog(unique)
        } else {
          setServiceCatalog(REAL_SERVICE_FALLBACK)
        }
      } catch (e) {
        setServiceCatalog(REAL_SERVICE_FALLBACK)
      }
    }
    loadCatalogServices()
  }, [])

  const toggleService = (slug) =>
    setForm(f => ({
      ...f,
      services: f.services.includes(slug)
        ? f.services.filter(s => s !== slug)
        : [...f.services, slug],
    }))

  const selectAllServices = () => set("services", serviceCatalog.map(s => s.slug))
  const clearAllServices = () => set("services", [])

  const toggleCategory = (categoryName, shouldSelect) => {
    const catSlugs = serviceCatalog.filter(s => s.category === categoryName).map(s => s.slug)
    setForm(f => {
      if (shouldSelect) {
        const next = new Set([...f.services, ...catSlugs])
        return { ...f, services: Array.from(next) }
      } else {
        return { ...f, services: f.services.filter(s => !catSlugs.includes(s)) }
      }
    })
  }

  const handleDrawComplete = useCallback((geom) => {
    setDrawn(geom)
    set("polygon", geom)
    if (geom?.coordinates?.[0]) {
      const coords = geom.coordinates[0]
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
      set("center_lat", lat); set("center_lng", lng)
    }
    setError("")
  }, [])

  // Pin Current GPS Location
  const handlePinCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.")
      return
    }
    setLocatingGPS(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        set("center_lat", lat)
        set("center_lng", lng)
        setLocatingGPS(false)
        try {
          const addr = await getAddress(lat, lng)
          if (addr) {
            setCenterSearch(addr)
            if (!form.name.trim() || form.name.startsWith("Service Area") || form.name.startsWith("Zone @")) {
              const locality = addr.split(",")[0].trim()
              set("name", `${locality} Service Area`)
            }
          } else {
            if (!form.name.trim()) set("name", `Service Area @ ${lat.toFixed(3)}, ${lng.toFixed(3)}`)
          }
        } catch {
          if (!form.name.trim()) set("name", `Service Area @ ${lat.toFixed(3)}, ${lng.toFixed(3)}`)
        }
      },
      (err) => {
        setLocatingGPS(false)
        setError("Could not retrieve GPS location. Click anywhere on the map to pin manually.")
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Handle map click or pin drop
  const handleMapPin = async (lat, lng) => {
    set("center_lat", lat)
    set("center_lng", lng)
    setError("")
    try {
      const addr = await getAddress(lat, lng)
      if (addr) {
        setCenterSearch(addr)
        if (!form.name.trim() || form.name.startsWith("Service Area") || form.name.startsWith("Zone @")) {
          const locality = addr.split(",")[0].trim()
          set("name", `${locality} Service Area`)
        }
      } else {
        if (!form.name.trim()) set("name", `Service Area @ ${lat.toFixed(3)}, ${lng.toFixed(3)}`)
      }
    } catch {
      if (!form.name.trim()) set("name", `Service Area @ ${lat.toFixed(3)}, ${lng.toFixed(3)}`)
    }
  }

  // Exact coordinate lookup map for Hosur landmarks & residential layouts
  const HOSUR_COORDINATES_MAP = {
    "vassuthaa garden": [12.75140, 77.84035],
    "vassudha garden": [12.75140, 77.84035],
    "flower by design": [12.75265, 77.84158],
    "samathuvapuram": [12.75132, 77.83987],
    "kcc nagar": [12.7542, 77.8382],
    "nallur": [12.7560, 77.8410],
    "sipcot": [12.7475, 77.7950],
    "sipcot phase 1": [12.7475, 77.7950],
    "sipcot phase 2": [12.7215, 77.8540],
    "golden fairmart": [12.7215, 77.8540],
    "hosur bus stand": [12.7335, 77.8283],
    "central bus stand": [12.7335, 77.8283],
    "hosur railway station": [12.7380, 77.8220],
    "mathigiri": [12.7120, 77.8010],
    "titan township": [12.7120, 77.8010],
    "cattle farm": [12.7130, 77.7980],
    "bagalur": [12.7620, 77.8420],
    "bagalur road": [12.7620, 77.8420],
    "attibele": [12.7780, 77.7710],
    "attibele border": [12.7780, 77.7710],
    "zuzuvadi": [12.7750, 77.7820],
    "moranapalli": [12.7650, 77.8650],
    "mookandapalli": [12.7480, 77.8150],
    "avalapalli": [12.7580, 77.8120],
    "avalapalli road": [12.7580, 77.8120],
    "denkanikottai road": [12.7250, 77.8180],
    "thally road": [12.7150, 77.7850],
    "dinnur": [12.7410, 77.8290],
    "kamaraj nagar": [12.7430, 77.8310],
    "shanthi nagar": [12.7390, 77.8350],
    "nethaji nagar": [12.7440, 77.8330],
    "alasanatham": [12.7305, 77.8340],
    "chennathur": [12.7190, 77.8410],
    "rayakottai road": [12.7190, 77.8410],
    "kelamangalam": [12.6020, 77.8520],
    "elcot it park": [12.7350, 77.8450],
    "grand city mall": [12.7250, 77.8180],
    "fairmart": [12.7250, 77.8180],
    "nilgiris": [12.7370, 77.8280],
    "mg road": [12.7370, 77.8280],
  }

  const handleSelectCenterSuggestion = (loc) => {
    const key = (loc.name || "").toLowerCase()
    const foundCoord = HOSUR_COORDINATES_MAP[key] ||
      (Object.entries(HOSUR_COORDINATES_MAP).find(([k]) => key.includes(k) || k.includes(key))?.[1])

    const lat = loc.lat || (foundCoord ? foundCoord[0] : (loc.geometry?.location?.lat || 12.7542))
    const lng = loc.lng || (foundCoord ? foundCoord[1] : (loc.geometry?.location?.lng || 77.8382))

    set("center_lat", lat)
    set("center_lng", lng)
    const exact = formatExactLocation(loc)
    setCenterSearch(exact)
    setShowCenterSuggestions(false)
    if (!form.name.trim() || form.name.startsWith("Service Area") || form.name.startsWith("Zone @")) {
      const cleanName = loc.name.split("(")[0].trim()
      set("name", `${cleanName} Service Area`)
    }

    if (form.zone_type === "polygon") {
      // Trace initial rectangular boundary centered around the searched location (~180m)
      const dLat = 0.0014
      const dLng = 0.0014
      const initialBox = [
        [lat + dLat, lng - dLng],
        [lat + dLat, lng + dLng],
        [lat - dLat, lng + dLng],
        [lat - dLat, lng - dLng],
      ]
      setPolygonPoints(initialBox)
      const closed = [...initialBox, initialBox[0]].map(([la, ln]) => [ln, la])
      const geom = { type: "Polygon", coordinates: [closed] }
      set("polygon", geom)
      setDrawn(geom)
    }
  }

  const handleSave = async () => {
    let centerLat = form.center_lat ? Number(form.center_lat) : null
    let centerLng = form.center_lng ? Number(form.center_lng) : null

    if (form.zone_type === "polygon") {
      if (!form.polygon || polygonPoints.length < 3) {
        setError("Please click at least 3 points on the map below to define a closed polygon boundary.")
        return
      }
      centerLat = polygonPoints.reduce((s, p) => s + p[0], 0) / polygonPoints.length
      centerLng = polygonPoints.reduce((s, p) => s + p[1], 0) / polygonPoints.length
    } else if (form.zone_type === "circle") {
      if (!centerLat || !centerLng) {
        setError("Please click on the map or use GPS to pin the center location.")
        return
      }
    }

    const finalName = form.name.trim() || (centerLat ? `Service Area @ ${centerLat.toFixed(3)}, ${centerLng?.toFixed(3)}` : "Primary Service Area")

    setSaving(true); setError("")
    try {
      const payload = {
        name: finalName,
        description: form.description.trim(),
        color: form.color,
        is_active: form.is_active,
        zone_type: form.zone_type,
        center_lat: centerLat,
        center_lng: centerLng,
        radius_meters: Number(form.radius_meters),
        polygon: form.polygon,
        services: form.services.map(slug => ({
          service_slug: slug,
          service_name: serviceCatalog.find(o => o.slug === slug)?.name || slug,
          is_available: true,
        })),
      }
      const result = editZone?.id
        ? await apiRequest(`/settings/service-zones/${editZone.id}/`, { method: "PATCH", json: payload })
        : await apiRequest("/settings/service-zones/", { method: "POST", json: payload })
      onSaved(result)
    } catch (e) {
      setError(e?.body?.detail || "Failed to save service area.")
    } finally {
      setSaving(false)
    }
  }

  const flyLat = form.center_lat || (polygonPoints.length > 0 ? polygonPoints[0][0] : DEFAULT_INDIA_CENTER[0])
  const flyLng = form.center_lng || (polygonPoints.length > 0 ? polygonPoints[0][1] : DEFAULT_INDIA_CENTER[1])
  const radiusKm = (Number(form.radius_meters) / 1000).toFixed(1)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eef2ff", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--fg)" }}>
            {editZone ? "Edit Service Area" : "New Service Area (India Only)"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Pin location on map, set coverage radius & manage services</div>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Quick Pin Action Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(79,70,229,0.06)", border: "1px solid #c7d2fe", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={18} style={{ color: "#4F46E5" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>
                {form.zone_type === "polygon" ? "Draw Polygon Layout on Map" : "Pin Place on Map (India)"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {form.zone_type === "polygon" ? "Click points directly on the map to trace your layout boundary" : "Click any location on the map below or use your current GPS"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePinCurrentLocation}
            disabled={locatingGPS}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
              borderRadius: 8, border: "none", background: "#4F46E5", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(79,70,229,0.3)"
            }}
          >
            {locatingGPS ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={13} />}
            {locatingGPS ? "Locating..." : "📍 Pin Current Location"}
          </button>
        </div>

        {/* Name (Optional / Auto-Generated) */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Service Area Name
            </label>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Auto-generated if left blank</span>
          </div>
          <input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="e.g. Hosur Service Area, KCC Nagar Layout, Attibele..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--stroke)", background: "var(--bg)", color: "var(--fg)", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>

        {/* Zone type */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Boundary Shape</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: "circle", label: "Radius (KM)", icon: <Target size={14} /> }, { v: "polygon", label: "Polygon Boundary", icon: <Map size={14} /> }].map(opt => (
              <button key={opt.v} onClick={() => set("zone_type", opt.v)}
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${form.zone_type === opt.v ? "#4F46E5" : "var(--stroke)"}`,
                  background: form.zone_type === opt.v ? "#eef2ff" : "var(--bg)",
                  color: form.zone_type === opt.v ? "#4F46E5" : "var(--muted)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                }}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Search & Direct Coordinates (Circle and Polygon) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--surface)", padding: 12, borderRadius: 10, border: "1px solid var(--stroke)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {form.zone_type === "polygon" ? "Search Location / Landmark to Center Polygon (India Only)" : "Search Location (India Only)"}
              </label>
              <span style={{ fontSize: 10, color: "#4F46E5", fontWeight: 700 }}>🇮🇳 India Locations</span>
            </div>
            <div ref={centerSearchWrapperRef} style={{ position: "relative" }}>
              <input
                value={centerSearch}
                onFocus={() => setShowCenterSuggestions(true)}
                onClick={() => setShowCenterSuggestions(true)}
                onChange={e => {
                  setCenterSearch(e.target.value)
                  setShowCenterSuggestions(true)
                }}
                placeholder="Search Indian city, area, pin code (e.g. Vassuthaa Garden, KCC Nagar, Hosur)..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--stroke)", background: "var(--bg)", color: "var(--fg)", fontSize: 13, boxSizing: "border-box" }}
                autoComplete="off"
              />
              {centerSearching && (
                <div style={{ position: "absolute", right: 10, top: 10, fontSize: 11, color: "#6366F1", fontWeight: 700 }}>
                  Searching...
                </div>
              )}
              {showCenterSuggestions && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1050, background: "#ffffff", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", overflow: "hidden", maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
                  <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>{centerSearch ? `Suggestions for "${centerSearch}"` : "Suggested Hosur Locations"}</span>
                    <span style={{ fontSize: 9, color: "#059669", fontWeight: 700 }}>{centerSuggestions.length} found</span>
                  </div>
                  <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                    {centerSuggestions.length > 0 ? (
                      centerSuggestions.map((loc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelectCenterSuggestion(loc)
                          }}
                          style={{
                            width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 10,
                            background: "transparent", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "#ecfdf5"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <MapPin size={14} style={{ color: "#64748b" }} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {loc.name}
                              </div>
                              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {loc.subtitle || loc.fullAddress}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9", color: "#475569", flexShrink: 0 }}>
                            {loc.category || "Hosur Location"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#64748b" }}>
                        No matching location found for "{centerSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Latitude / Longitude numerical inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Latitude</label>
              <input
                type="number" step="any"
                value={form.center_lat ?? ""}
                onChange={e => set("center_lat", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 12.7409"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--stroke)", background: "var(--bg)", color: "var(--fg)", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Longitude</label>
              <input
                type="number" step="any"
                value={form.center_lng ?? ""}
                onChange={e => set("center_lng", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 77.8253"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--stroke)", background: "var(--bg)", color: "var(--fg)", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        {/* Radius input + presets */}
        {form.zone_type === "circle" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Coverage Radius (KM)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number" min={1} max={150} step={1}
                  value={radiusKm}
                  onChange={e => set("radius_meters", Math.max(500, Number(e.target.value) * 1000))}
                  style={{ width: 60, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--stroke)", background: "var(--bg)", color: "#4F46E5", fontWeight: 800, fontSize: 12, textAlign: "right" }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5" }}>KM</span>
              </div>
            </div>

            {/* Quick radius preset buttons */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[5, 10, 15, 20, 30, 50].map(km => (
                <button
                  key={km}
                  type="button"
                  onClick={() => set("radius_meters", km * 1000)}
                  style={{
                    flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${Number(form.radius_meters) === km * 1000 ? "#4F46E5" : "var(--stroke)"}`,
                    background: Number(form.radius_meters) === km * 1000 ? "#eef2ff" : "var(--bg)",
                    color: Number(form.radius_meters) === km * 1000 ? "#4F46E5" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {km} KM
                </button>
              ))}
            </div>

            <input
              type="range" min={1000} max={100000} step={1000}
              value={form.radius_meters}
              onChange={e => set("radius_meters", Number(e.target.value))}
              style={{ width: "100%", accentColor: "#4F46E5" }}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {form.center_lat
                ? <span style={{ color: "#10B981", fontWeight: 600 }}>✓ Pinned at ({form.center_lat?.toFixed(4)}, {form.center_lng?.toFixed(4)}) • Coverage: {radiusKm} KM</span>
                : <span style={{ color: "#F59E0B" }}>⚡ Click anywhere on the map to pin the center location</span>}
            </div>
          </div>
        )}

        {/* Polygon Interactive Draw Control Header */}
        {form.zone_type === "polygon" && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: polygonPoints.length >= 3 ? "#ecfdf5" : "#eef2ff", border: `1.5px solid ${polygonPoints.length >= 3 ? "#a7f3d0" : "#c7d2fe"}`, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: polygonPoints.length >= 3 ? "#065f46" : "#3730a3", background: polygonPoints.length >= 3 ? "#d1fae5" : "#e0e7ff", padding: "3px 8px", borderRadius: 6 }}>
                  📍 {polygonPoints.length} Point{polygonPoints.length === 1 ? "" : "s"} Plotted
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: polygonPoints.length >= 3 ? "#047857" : "#4338ca" }}>
                  {polygonPoints.length === 0 && "Click anywhere on the map to add your 1st boundary point."}
                  {polygonPoints.length === 1 && "Click to add your 2nd boundary point."}
                  {polygonPoints.length === 2 && "Click to add your 3rd point to form a closed layout."}
                  {polygonPoints.length >= 3 && `✓ Custom polygon layout marked (${polygonPoints.length} corners). Click more points to refine shape.`}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {polygonPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoPolygonPoint}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #c7d2fe", background: "#ffffff", color: "#4F46E5", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    <Undo2 size={12} /> Undo Point
                  </button>
                )}
                {polygonPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPolygon}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#ffffff", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Map with Pin / Vertices */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--stroke)", height: 340, minHeight: 340, width: "100%", position: "relative", zIndex: 1 }}>
          <MapContainer
            key={`zone_map_${form.zone_type}_${editZone?.id || 'new'}`}
            center={[form.center_lat || DEFAULT_INDIA_CENTER[0], form.center_lng || DEFAULT_INDIA_CENTER[1]]}
            zoom={form.center_lat ? 14 : 12}
            maxBounds={INDIA_BOUNDS}
            minZoom={4}
            style={{ width: "100%", height: "100%", minHeight: 340 }}
            zoomControl={true}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
            />
            {/* Auto-fly map to selected / typed coordinates */}
            {form.center_lat && form.center_lng && (
              <FlyTo lat={form.center_lat} lng={form.center_lng} zoom={14} />
            )}
            {/* Draggable Center Pin (Circle Mode) */}
            {form.zone_type === "circle" && form.center_lat && form.center_lng && (
              <>
                <Marker
                  position={[form.center_lat, form.center_lng]}
                  draggable={true}
                  icon={createPinIcon(form.color)}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target
                      const pos = marker.getLatLng()
                      handleMapPin(pos.lat, pos.lng)
                    }
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: 12 }}>
                      <strong>📍 Pinned Center</strong><br />
                      {form.name || "Service Zone Center"}<br />
                      <span style={{ fontSize: 10, color: "#64748b" }}>Drag or click map to move</span>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[form.center_lat, form.center_lng]}
                  radius={Number(form.radius_meters)}
                  pathOptions={{ color: form.color, fillColor: form.color, fillOpacity: 0.2, weight: 2 }}
                />
              </>
            )}

            {/* Polygon Mode: Display Numbered Vertices */}
            {form.zone_type === "polygon" && polygonPoints.map((pt, idx) => (
              <Marker
                key={idx}
                position={pt}
                draggable={true}
                icon={createVertexIcon(idx, form.color)}
                eventHandlers={{
                  dragend: (e) => {
                    const pos = e.target.getLatLng()
                    handleVertexDrag(idx, pos.lat, pos.lng)
                  }
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12 }}>
                    <strong>Corner Point #{idx + 1}</strong><br />
                    <span style={{ fontSize: 10, color: "#64748b" }}>Drag to adjust corner position</span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Polygon Mode: Connecting Lines (2 points) */}
            {form.zone_type === "polygon" && polygonPoints.length === 2 && (
              <Polyline
                positions={polygonPoints}
                pathOptions={{ color: form.color, weight: 3, dashArray: "4, 6" }}
              />
            )}

            {/* Polygon Mode: Shaded Enclosed Area (>= 3 points) */}
            {form.zone_type === "polygon" && polygonPoints.length >= 3 && (
              <Polygon
                positions={polygonPoints}
                pathOptions={{ color: form.color, fillColor: form.color, fillOpacity: 0.25, weight: 3 }}
              />
            )}

            {/* Map click listener for Circle or Polygon */}
            <MapClickCapture
              enabled={true}
              onMapClick={(lat, lng) => {
                if (form.zone_type === "polygon") {
                  handlePolygonMapClick(lat, lng)
                } else {
                  handleMapPin(lat, lng)
                }
              }}
            />
            <FlyTo lat={flyLat} lng={flyLng} zoom={form.center_lat ? 13 : 11} />
          </MapContainer>
        </div>

        {/* Colour */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Zone Marker Colour</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLOURS.map(c => (
              <button key={c} type="button" onClick={() => set("color", c)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? "3px solid var(--fg)" : "2px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
        </div>

        {/* Active toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => set("is_active", !form.is_active)} style={{ background: "none", border: "none", cursor: "pointer", color: form.is_active ? "#10B981" : "var(--muted)", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
            {form.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            Status: {form.is_active ? "ACTIVE (Enabled for customer bookings)" : "INACTIVE (Disabled)"}
          </button>
        </div>

        {/* Services Section */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Available Services in This Zone ({form.services.length}/{serviceCatalog.length} Selected)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={selectAllServices} style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Select All ({serviceCatalog.length})
              </button>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>•</span>
              <button type="button" onClick={clearAllServices} style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Clear All
              </button>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            Select the real services offered in this area. Unchecked services will be blocked for customers booking within this zone.
          </div>

          {/* Search and Category Filter Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                placeholder="Search real services (e.g., AC, Plumbing, Painting, Transport)..."
                style={{
                  width: "100%", padding: "7px 30px 7px 32px", borderRadius: 8,
                  border: "1.5px solid var(--stroke)", background: "var(--bg)", color: "var(--fg)",
                  fontSize: 12, outline: "none", boxSizing: "border-box"
                }}
              />
              {serviceSearch && (
                <button type="button" onClick={() => setServiceSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin" }}>
              {(() => {
                const categories = ["all", ...Array.from(new Set(serviceCatalog.map(s => s.category || "Other")))]
                return categories.map(cat => {
                  const isAll = cat === "all"
                  const count = isAll
                    ? serviceCatalog.length
                    : serviceCatalog.filter(s => (s.category || "Other") === cat).length
                  const selectedCount = isAll
                    ? form.services.length
                    : serviceCatalog.filter(s => (s.category || "Other") === cat && form.services.includes(s.slug)).length
                  const active = activeCategoryFilter === cat

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat)}
                      style={{
                        padding: "4px 9px",
                        borderRadius: 16,
                        border: `1px solid ${active ? "#4F46E5" : "var(--stroke)"}`,
                        background: active ? "#4F46E5" : "var(--surface)",
                        color: active ? "#ffffff" : "var(--fg)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0
                      }}
                    >
                      <span>{isAll ? "All Services" : cat}</span>
                      <span style={{
                        fontSize: 10,
                        padding: "1px 5px",
                        borderRadius: 10,
                        background: active ? "rgba(255,255,255,0.25)" : "var(--stroke)",
                        color: active ? "#fff" : "var(--muted)",
                      }}>
                        {selectedCount}/{count}
                      </span>
                    </button>
                  )
                })
              })()}
            </div>
          </div>

          {/* Grouped Services List */}
          <div style={{
            maxHeight: 290,
            overflowY: "auto",
            padding: "4px",
            border: "1px solid var(--stroke)",
            borderRadius: 10,
            background: "var(--bg)"
          }}>
            {(() => {
              // Filter catalog by search query and category filter
              const filtered = serviceCatalog.filter(opt => {
                const matchesSearch = !serviceSearch.trim() ||
                  opt.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                  (opt.category && opt.category.toLowerCase().includes(serviceSearch.toLowerCase())) ||
                  opt.slug.toLowerCase().includes(serviceSearch.toLowerCase())
                const matchesCategory = activeCategoryFilter === "all" || (opt.category || "Other") === activeCategoryFilter
                return matchesSearch && matchesCategory
              })

              if (filtered.length === 0) {
                return (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                    No services found matching "{serviceSearch}".
                    <div style={{ marginTop: 6 }}>
                      <button type="button" onClick={() => { setServiceSearch(""); setActiveCategoryFilter("all") }}
                        style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", background: "none", border: "none", cursor: "pointer" }}>
                        Reset filters
                      </button>
                    </div>
                  </div>
                )
              }

              // Group by category
              const groups = {}
              filtered.forEach(item => {
                const cat = item.category || "General Services"
                if (!groups[cat]) groups[cat] = []
                groups[cat].push(item)
              })

              return Object.entries(groups).map(([categoryName, items]) => {
                const totalInCat = serviceCatalog.filter(s => (s.category || "General Services") === categoryName).length
                const selectedInCat = serviceCatalog.filter(s => (s.category || "General Services") === categoryName && form.services.includes(s.slug)).length
                const allSelectedInCat = selectedInCat === totalInCat && totalInCat > 0

                return (
                  <div key={categoryName} style={{ marginBottom: 12, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--stroke)", padding: 8 }}>
                    {/* Category Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingBottom: 4, borderBottom: "1px dashed var(--stroke)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Layers size={13} style={{ color: "#4F46E5" }} />
                        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--fg)" }}>{categoryName}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 8,
                          background: selectedInCat > 0 ? "rgba(79,70,229,0.1)" : "var(--stroke)",
                          color: selectedInCat > 0 ? "#4F46E5" : "var(--muted)"
                        }}>
                          {selectedInCat}/{totalInCat}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCategory(categoryName, !allSelectedInCat)}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: allSelectedInCat ? "#EF4444" : "#4F46E5",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        {allSelectedInCat ? "Deselect All" : "Select Category"}
                      </button>
                    </div>

                    {/* Services in Category */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {items.map(opt => {
                        const checked = form.services.includes(opt.slug)
                        return (
                          <label key={opt.slug} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
                            borderRadius: 6, cursor: "pointer",
                            background: checked ? "rgba(79,70,229,0.08)" : "var(--bg)",
                            border: `1px solid ${checked ? "#818cf8" : "var(--stroke)"}`,
                            transition: "all 0.15s ease",
                          }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(opt.slug)}
                              style={{ accentColor: "#4F46E5", cursor: "pointer" }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                              <span style={{ fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? "#4338ca" : "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {opt.name}
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          {form.services.length === 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#b45309", background: "#fffbeb", padding: "6px 10px", borderRadius: 6, border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 6 }}>
              <span>ℹ️</span>
              <span><strong>Open Access Mode:</strong> When 0 services are selected, all services will be allowed in this zone.</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Description (Optional)</label>
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            rows={2}
            placeholder="Internal notes (e.g. covers 30 KM radius around Hosur)..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--stroke)", background: "var(--bg)", color: "var(--fg)", fontSize: 13, resize: "none", boxSizing: "border-box" }}
          />
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#991b1b", fontSize: 13, fontWeight: 600, border: "1px solid #fecaca" }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--stroke)", display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--stroke)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--fg2)" }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #4F46E5, #6366F1)", color: "#fff",
          cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
          {saving ? "Saving…" : editZone ? "Update Zone" : "Create Zone"}
        </button>
      </div>
    </div>
  )
}

/* ── Zone Card ───────────────────────────────────────────────────────────────── */

function ZoneCard({ zone, isSelected, onSelect, onEdit, onDelete, onToggleActive }) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async (e) => {
    e?.stopPropagation?.()
    setToggling(true)
    try {
      const updated = await apiRequest(`/settings/service-zones/${zone.id}/`, {
        method: "PATCH", json: { is_active: !zone.is_active },
      })
      onToggleActive(updated)
    } catch { } finally { setToggling(false) }
  }

  return (
    <div
      onClick={() => onSelect?.(zone)}
      style={{
        borderRadius: 14,
        border: isSelected ? "2px solid #4F46E5" : "1px solid var(--stroke)",
        background: isSelected ? "linear-gradient(135deg, #f8faff, #eef2ff)" : "var(--surface)",
        boxShadow: isSelected ? "0 8px 24px rgba(79,70,229,0.16)" : "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        position: "relative"
      }}
    >
      {/* Colour band */}
      <div style={{ height: isSelected ? 5 : 4, background: zone.color }} />

      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${zone.color}20`, color: zone.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {zone.zone_type === "circle" ? <Target size={20} /> : <Map size={20} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: isSelected ? "#3730a3" : "var(--fg)", lineHeight: 1.2 }}>{zone.name}</div>
              {isSelected && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "#4F46E5", color: "#fff", flexShrink: 0 }}>
                  👁️ VIEWING
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${zone.color}18`, color: zone.color }}>
                {zone.zone_type === "circle" ? `⊙ Circle · ${(zone.radius_meters / 1000).toFixed(1)} km` : "⬡ Polygon"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: zone.is_active ? "#dcfce7" : "#f1f5f9",
                color: zone.is_active ? "#166534" : "#64748b",
              }}>
                {zone.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {zone.services?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
                  {zone.services.length} Allowed Service{zone.services.length !== 1 ? "s" : ""}:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {zone.services.slice(0, 3).map(s => (
                    <span key={s.service_slug} style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6,
                      background: "rgba(79,70,229,0.08)", color: "#4F46E5", border: "1px solid rgba(79,70,229,0.2)"
                    }}>
                      {s.service_name || s.service_slug}
                    </span>
                  ))}
                  {zone.services.length > 3 && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6,
                      background: "var(--stroke)", color: "var(--muted)"
                    }}>
                      +{zone.services.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {(!zone.services || zone.services.length === 0) && (
              <div style={{ fontSize: 11, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginTop: 6, fontWeight: 600 }}>
                ✓ All Services Allowed (Open Access)
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <button onClick={handleToggle} disabled={toggling}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--stroke)", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: zone.is_active ? "#F59E0B" : "#10B981" }}>
            {zone.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {zone.is_active ? "Disable" : "Enable"}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={(e) => { e?.stopPropagation?.(); onEdit(zone) }}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--stroke)", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e?.stopPropagation?.(); onDelete(zone.id) }}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "transparent", cursor: "pointer", color: "#EF4444" }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Panel ──────────────────────────────────────────────────────────────── */

export function ServiceAreasPanel() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editZone, setEditZone] = useState(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const [mapView, setMapView] = useState(true)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [pinnedLocation, setPinnedLocation] = useState(null)
  const [locatingGPS, setLocatingGPS] = useState(false)

  useEffect(() => { loadZones() }, [])

  // Auto-detect user's GPS location on mount & pin it
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          setCurrentLocation({ lat, lng })
          try {
            const addr = await getAddress(lat, lng)
            setPinnedLocation({ lat, lng, name: addr || "Current Location" })
          } catch {
            setPinnedLocation({ lat, lng, name: "Current Location" })
          }
        },
        () => {
          // Default pin to Hosur / Bengaluru if GPS permission is not granted
          setPinnedLocation({
            lat: DEFAULT_INDIA_CENTER[0],
            lng: DEFAULT_INDIA_CENTER[1],
            name: "Hosur, Tamil Nadu (India)"
          })
        },
        { enableHighAccuracy: true, timeout: 6000 }
      )
    } else {
      setPinnedLocation({
        lat: DEFAULT_INDIA_CENTER[0],
        lng: DEFAULT_INDIA_CENTER[1],
        name: "Hosur, Tamil Nadu (India)"
      })
    }
  }, [])

  const loadZones = async () => {
    setLoading(true)
    try {
      const data = await apiRequest("/settings/service-zones/")
      setZones(Array.isArray(data) ? data : [])
    } catch { setZones([]) } finally { setLoading(false) }
  }

  const handleSaved = (saved) => {
    setZones(prev => {
      const idx = prev.findIndex(z => z.id === saved.id)
      return idx >= 0 ? prev.map(z => z.id === saved.id ? saved : z) : [saved, ...prev]
    })
    setShowForm(false); setEditZone(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service zone? Customers in this area will lose access restrictions.")) return
    try {
      await apiRequest(`/settings/service-zones/${id}/`, { method: "DELETE" })
      setZones(prev => prev.filter(z => z.id !== id))
    } catch { alert("Failed to delete zone.") }
  }

  const handleEdit = (zone) => { setEditZone(zone); setShowForm(true) }
  const handleToggleActive = (updated) => setZones(prev => prev.map(z => z.id === updated.id ? updated : z))

  const handleSelectZone = async (zone) => {
    if (selectedZone?.id === zone.id) {
      setSelectedZone(null)
      return
    }
    setSelectedZone(zone)
    const polyCoords = zone.polygon?.coordinates?.[0]
    const zLat = zone.center_lat ?? (polyCoords ? polyCoords.reduce((s, c) => s + c[1], 0) / polyCoords.length : DEFAULT_INDIA_CENTER[0])
    const zLng = zone.center_lng ?? (polyCoords ? polyCoords.reduce((s, c) => s + c[0], 0) / polyCoords.length : DEFAULT_INDIA_CENTER[1])
    setPinnedLocation({
      lat: zLat,
      lng: zLng,
      name: zone.name || `Service Zone (${zLat.toFixed(4)}, ${zLng.toFixed(4)})`
    })
    try {
      const addr = await getAddress(zLat, zLng)
      if (addr) {
        setPinnedLocation({ lat: zLat, lng: zLng, name: addr })
      }
    } catch {}
  }

  // Overview map click handler: pin anywhere in India
  const handleOverviewMapClick = async (lat, lng) => {
    setSelectedZone(null)
    setPinnedLocation({ lat, lng, name: "Loading address..." })
    try {
      const addr = await getAddress(lat, lng)
      setPinnedLocation({ lat, lng, name: addr || `Pinned @ ${lat.toFixed(4)}, ${lng.toFixed(4)}` })
    } catch {
      setPinnedLocation({ lat, lng, name: `Pinned @ ${lat.toFixed(4)}, ${lng.toFixed(4)}` })
    }
  }

  // Trigger GPS Locate Me
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    setLocatingGPS(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        setCurrentLocation({ lat, lng })
        setLocatingGPS(false)
        try {
          const addr = await getAddress(lat, lng)
          setPinnedLocation({ lat, lng, name: addr || "Current Location" })
        } catch {
          setPinnedLocation({ lat, lng, name: "Current Location" })
        }
      },
      () => {
        setLocatingGPS(false)
        alert("Could not access your GPS location. Please click directly on the map to pin.")
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Quick create zone from pinned place
  const handleCreateZoneFromPin = () => {
    const targetLat = pinnedLocation?.lat || currentLocation?.lat || DEFAULT_INDIA_CENTER[0]
    const targetLng = pinnedLocation?.lng || currentLocation?.lng || DEFAULT_INDIA_CENTER[1]
    const locName = pinnedLocation?.name && !pinnedLocation.name.includes("Loading")
      ? `${pinnedLocation.name.split(",")[0].trim()} Service Area`
      : `Service Area @ ${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`

    setEditZone({
      name: locName,
      description: "",
      color: COLOURS[0],
      is_active: true,
      zone_type: "circle",
      center_lat: targetLat,
      center_lng: targetLng,
      radius_meters: 5000,
      polygon: null,
      services: [],
    })
    setShowForm(true)
  }

  // Map center: prefer pinned place > active zone > current location > default India center
  const mapCenter = pinnedLocation?.lat
    ? [pinnedLocation.lat, pinnedLocation.lng]
    : zones.find(z => z.center_lat)
      ? [zones.find(z => z.center_lat).center_lat, zones.find(z => z.center_lat).center_lng]
      : currentLocation?.lat
        ? [currentLocation.lat, currentLocation.lng]
        : DEFAULT_INDIA_CENTER

  if (showForm) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <ZoneForm
          editZone={editZone}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditZone(null) }}
        />
      </div>
    )
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={18} style={{ color: "#4F46E5" }} />
            Service Area Control (India)
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Pin your location and define service zones — customers outside active zones will see "Service not available"
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMapView(!mapView)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--stroke)", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            {mapView ? <List size={14} /> : <Map size={14} />}
            {mapView ? "List View" : "Map View"}
          </button>
          <button
            onClick={handleCreateZoneFromPin}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4F46E5, #6366F1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}>
            <Plus size={14} /> New Zone
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Zone list */}
          <div style={{ width: 340, borderRight: "1px solid var(--stroke)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
            {zones.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#eef2ff", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <MapPin size={24} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)", marginBottom: 4 }}>No Service Zones Yet</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
                  Click anywhere on the map to pin your area, or click below to create your first zone.
                </div>
                <button
                  type="button"
                  onClick={handleCreateZoneFromPin}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                    background: "#4F46E5", color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  <Plus size={14} /> Pin & Create Service Zone
                </button>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fefce8", border: "1px solid #fde68a", fontSize: 11, color: "#92400e", fontWeight: 600, marginTop: 12 }}>
                  ℹ️ With no zones configured, all Indian customers have open access.
                </div>
              </div>
            ) : (
              zones.map(zone => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  isSelected={selectedZone?.id === zone.id}
                  onSelect={handleSelectZone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))
            )}
          </div>

          {/* Interactive Map overview */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* Top Floating Action Controls */}
            <div style={{ position: "absolute", top: 12, right: 12, zIndex: 900, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locatingGPS}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 20, border: "1.5px solid #c7d2fe", background: "#ffffff",
                  color: "#4F46E5", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
                }}
              >
                {locatingGPS ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <LocateFixed size={14} />}
                {locatingGPS ? "Locating..." : "📍 Locate Me (GPS)"}
              </button>
              <div style={{
                padding: "8px 12px", borderRadius: 20, background: "#ffffff",
                border: "1px solid var(--stroke)", fontSize: 11, fontWeight: 700,
                color: "#166534", display: "flex", alignItems: "center", gap: 5,
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)"
              }}>
                <span>🇮🇳</span>
                <span>India Coverage</span>
              </div>
            </div>

            {/* Bottom Floating Pinned Location Banner */}
            {pinnedLocation && (
              <div style={{
                position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 900,
                background: "rgba(255, 255, 255, 0.96)", backdropFilter: "blur(8px)",
                border: "1.5px solid #c7d2fe", borderRadius: 12, padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid #fed7aa" }}>
                    <MapPin size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Pinned Place
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pinnedLocation.name || `Location (${pinnedLocation.lat.toFixed(4)}, ${pinnedLocation.lng.toFixed(4)})`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleCreateZoneFromPin}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #4F46E5, #6366F1)", color: "#ffffff",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(79,70,229,0.3)"
                    }}
                  >
                    <Plus size={14} /> Create Zone Here
                  </button>
                </div>
              </div>
            )}

            <MapContainer
              center={mapCenter}
              zoom={11}
              maxBounds={INDIA_BOUNDS}
              minZoom={4}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
              />
              <ZoneOverlays zones={zones} selectedZoneId={selectedZone?.id} onSelectZone={handleSelectZone} />

              {/* Auto-fly to selected zone geofence on card click */}
              {selectedZone && (
                <FlyTo
                  lat={
                    selectedZone.center_lat ||
                    (selectedZone.polygon?.coordinates?.[0]
                      ? selectedZone.polygon.coordinates[0].reduce((s, c) => s + c[1], 0) / selectedZone.polygon.coordinates[0].length
                      : DEFAULT_INDIA_CENTER[0])
                  }
                  lng={
                    selectedZone.center_lng ||
                    (selectedZone.polygon?.coordinates?.[0]
                      ? selectedZone.polygon.coordinates[0].reduce((s, c) => s + c[0], 0) / selectedZone.polygon.coordinates[0].length
                      : DEFAULT_INDIA_CENTER[1])
                  }
                  zoom={
                    selectedZone.zone_type === "polygon"
                      ? 15
                      : selectedZone.radius_meters >= 40000
                        ? 9
                        : selectedZone.radius_meters >= 20000
                          ? 10
                          : selectedZone.radius_meters >= 10000
                            ? 12
                            : 13
                  }
                />
              )}

              {/* User Current GPS Location Marker */}
              {currentLocation && (
                <Marker
                  position={[currentLocation.lat, currentLocation.lng]}
                  icon={createCurrentLocationIcon()}
                >
                  <Popup>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      📍 Your Current Location<br />
                      <span style={{ fontSize: 11, color: "#64748b" }}>GPS Coords: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Pinned Marker on overview map */}
              {pinnedLocation && (
                <Marker
                  position={[pinnedLocation.lat, pinnedLocation.lng]}
                  icon={createPinIcon("#F97316")}
                >
                  <Popup>
                    <div style={{ fontSize: 12 }}>
                      <strong>📍 Pinned Location</strong><br />
                      {pinnedLocation.name}<br />
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={handleCreateZoneFromPin}
                          style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          + Create Service Zone Here
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Click anywhere to drop a pin */}
              <MapClickCapture
                enabled={true}
                onMapClick={(lat, lng) => handleOverviewMapClick(lat, lng)}
              />

              <FlyTo lat={mapCenter[0]} lng={mapCenter[1]} zoom={11} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* Info bar */}
      {zones.length > 0 && (
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--stroke)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={13} style={{ color: "#10B981" }} />
            {zones.filter(z => z.is_active).length} active zone{zones.filter(z => z.is_active).length !== 1 ? "s" : ""}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <XCircle size={13} style={{ color: "#94a3b8" }} />
            {zones.filter(z => !z.is_active).length} inactive
          </span>
          <span style={{ marginLeft: "auto", color: "#4F46E5", fontWeight: 600 }}>
            Customers outside all active zones will see "Service not available in your area"
          </span>
        </div>
      )}

      {/* Styles for animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pin-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
