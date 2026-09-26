import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  Plus, Trash2, ArrowUp, ArrowDown, GripVertical, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Loader2, MapPin, LocateFixed, Map as MapIcon, Undo2,
} from "lucide-react"
import {
  filterLocationSuggestions,
  searchHosurPlacesOnline,
  formatExactLocation,
  resolveLocationCoords,
} from "../../services/hosurLocations.js"
import { fetchRoadRoute } from "../../api/routing.js"
import { getAddress } from "../../api/geocoding.js"
import { MapPickerScreen } from "../../ui/components/AddressPicker/MapPickerScreen.jsx"

/**
 * MultiStopRouteManager
 *
 * One route, one source of truth: Pickup -> Stop 1..n -> Drop, shown as a
 * single connected timeline with a live route map beneath it. The parent owns
 * `stops` (same shape as before: {id, address, coords:{lat,lng,forAddress},
 * contact_name, contact_phone}); everything here -- the timeline order, the
 * numbers on the map, the route line and the quote the parent requests -- is
 * derived from that one array, so they cannot drift apart.
 *
 * A stop only counts (for the map, the price and the booking) once it is
 * "pinned": its coordinates were resolved for exactly the address currently
 * in the box. Editing the address un-pins it until a suggestion is chosen or
 * it is placed on the map.
 */

// ── shared helpers (also used by the booking pages) ────────────────────────

/** Coordinates of a stop, only when they were resolved for its current address. */
export function stopPoint(stop) {
  const c = stop?.coords
  if (!c || c.lat == null || c.lng == null) return null
  if (c.forAddress !== undefined && c.forAddress !== stop.address) return null
  const lat = Number(c.lat)
  const lng = Number(c.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

/** Stops that have a usable location, with the number the customer sees ("Stop 2"). */
export function locatedStops(stops = []) {
  return stops
    .map((s, i) => ({ id: s.id, number: i + 1, point: stopPoint(s) }))
    .filter((s) => s.point)
}

/**
 * Turn a failed route-coverage result into an issue for the offending stop.
 * The server numbers stops among those it was sent (located ones only), so
 * map that back to the stop's own id and displayed number. `key` pins the
 * issue to the location that was checked so it never outlives an edit.
 */
export function coverageIssueForStops(res, located) {
  if (!res || res.inCoverage || res.failedPoint !== "stop") return null
  const target = located[(Number(res.failedStopIndex) || 0) - 1]
  if (!target) return null
  return {
    id: target.id,
    key: `${target.point.lat},${target.point.lng}`,
    message: String(res.message || "").replace(/\b([Ss])top \d+/g, (_m, s) => `${s}top ${target.number}`),
  }
}

/**
 * First stop that has an address but no usable location. Submitting such a
 * stop would create a TripStop the driver cannot navigate to while the quote
 * (which only prices pinned stops) silently ignored it.
 */
export function findUnpinnedStop(stops = []) {
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]
    if (s?.address && s.address.trim() && !stopPoint(s)) return { index: i, stop: s }
  }
  return null
}

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

function metres(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const newStopId = () => `stop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// ── route preview map ──────────────────────────────────────────────────────

const KIND_STYLE = {
  pickup: { bg: "#059669", label: "A" },
  drop: { bg: "#e11d48", label: "B" },
  stop: { bg: "#2563eb", label: "" },
}

function markerIcon(point, highlighted) {
  const style = KIND_STYLE[point.kind]
  const text = point.kind === "stop" ? point.label : style.label
  const size = highlighted ? 34 : 28
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${style.bg};color:#fff;
      font:800 12px/${size}px system-ui,sans-serif;text-align:center;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.35)${highlighted ? ";outline:3px solid " + style.bg + "55" : ""}">${text}</div>`,
  })
}

function FitToPoints({ points }) {
  const map = useMap()
  const sig = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|")
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
      return
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, map])
  return null
}

function RoutePreviewMap({ points, highlightId }) {
  const [legs, setLegs] = useState([])
  const [loading, setLoading] = useState(false)

  // Real road geometry leg by leg (pickup->stop1, stop1->stop2, ..., ->drop).
  // Recomputed whenever the ordered points change; a token drops any response
  // that belongs to an earlier arrangement, so a slow lookup can never redraw
  // a route the customer has already changed.
  const sig = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|")
  useEffect(() => {
    let cancelled = false
    if (points.length < 2) {
      setLegs([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    Promise.all(
      points.slice(0, -1).map(async (a, i) => {
        const b = points[i + 1]
        const road = await fetchRoadRoute(a.lng, a.lat, b.lng, b.lat).catch(() => null)
        return road?.coordinates?.length
          ? { coords: road.coordinates, km: road.distanceKm, road: true }
          : { coords: [[a.lat, a.lng], [b.lat, b.lng]], km: metres(a, b) / 1000, road: false }
      })
    ).then((res) => {
      if (cancelled) return
      setLegs(res)
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const totalKm = legs.reduce((sum, l) => sum + (Number(l.km) || 0), 0)
  const allRoad = legs.length > 0 && legs.every((l) => l.road)
  const center = points[0] || { lat: 12.7409, lng: 77.8253 }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <div style={{ height: 220 }} data-testid="route-map">
        <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitToPoints points={points} />
          {legs.map((leg, i) => (
            <Polyline
              key={`leg-${i}-${sig}`}
              positions={leg.coords}
              pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85, dashArray: leg.road ? undefined : "6 8" }}
            />
          ))}
          {points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon(p, highlightId === p.id)} />
          ))}
        </MapContainer>
      </div>
      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 flex items-center justify-between bg-white">
        <span>Route preview{loading ? "…" : ""}</span>
        {points.length >= 2 && legs.length > 0 && (
          <span data-testid="route-distance">
            {allRoad ? "≈" : "≈ straight-line"} {totalKm.toFixed(1)} km
          </span>
        )}
      </div>
    </div>
  )
}

function Rail({ color, children, last = false }) {
  return (
    <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
      <div
        className="w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shadow"
        style={{ background: color }}
      >
        {children}
      </div>
      {!last && <div className="flex-1 w-0 border-l-2 border-dashed border-slate-300 min-h-[12px]" />}
    </div>
  )
}

// ── the component ──────────────────────────────────────────────────────────

export function MultiStopRouteManager({
  stops = [],
  onChangeStops,
  maxStops = 3,
  pickupAddress = "",
  dropAddress = "",
  pickupPoint = null,
  dropPoint = null,
  serviceSlug = "goods_transport_truck",
  coverageIssue = null,
  cityName = "Hosur",
}) {
  const [activeSearchId, setActiveSearchId] = useState(null)
  const [suggestionsById, setSuggestionsById] = useState({})
  const [searchingById, setSearchingById] = useState({})
  const [gpsById, setGpsById] = useState({}) // {loading, error} per stop
  const [expandedContactId, setExpandedContactId] = useState(null)
  const [pinTargetId, setPinTargetId] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [showMap, setShowMap] = useState(true)
  const [removed, setRemoved] = useState(null) // {stop, index} for undo
  const [pendingFocusId, setPendingFocusId] = useState(null)

  const dropdownRefs = useRef({})
  const inputRefs = useRef({})
  const searchTimers = useRef({})
  const searchSeq = useRef({})
  const removedTimer = useRef(null)

  // Always read the latest stops inside async callbacks: a geocode that
  // resolves after the customer added/removed/reordered stops must patch the
  // *current* list (by stop id), never write back a stale copy.
  const stopsRef = useRef(stops)
  useEffect(() => { stopsRef.current = stops }, [stops])
  const emit = useCallback((next) => { stopsRef.current = next; onChangeStops(next) }, [onChangeStops])

  const patchStop = useCallback((id, patch) => {
    const cur = stopsRef.current
    if (!cur.some((s) => s.id === id)) return // it was removed while we were working
    emit(cur.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [emit])

  useEffect(() => () => {
    Object.values(searchTimers.current).forEach(clearTimeout)
    clearTimeout(removedTimer.current)
  }, [])

  // Forget per-stop search state for stops that no longer exist.
  useEffect(() => {
    const live = new Set(stops.map((s) => s.id))
    const prune = (setter) => setter((prev) => {
      const keys = Object.keys(prev)
      if (keys.every((k) => live.has(k))) return prev
      return Object.fromEntries(keys.filter((k) => live.has(k)).map((k) => [k, prev[k]]))
    })
    prune(setSuggestionsById)
    prune(setSearchingById)
    if (activeSearchId && !live.has(activeSearchId)) setActiveSearchId(null)
    if (pinTargetId && !live.has(pinTargetId)) setPinTargetId(null)
  }, [stops, activeSearchId, pinTargetId])

  useEffect(() => {
    if (pendingFocusId && inputRefs.current[pendingFocusId]) {
      inputRefs.current[pendingFocusId].focus()
      setPendingFocusId(null)
    }
  }, [pendingFocusId, stops])

  useEffect(() => {
    const onDown = (e) => {
      if (!activeSearchId) return
      const el = dropdownRefs.current[activeSearchId]
      if (el && !el.contains(e.target)) setActiveSearchId(null)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [activeSearchId])

  // ── derived route (single source for badges, map and validation) ──────
  const route = useMemo(() => {
    const nodes = []
    if (pickupPoint) nodes.push({ id: "pickup", kind: "pickup", ...pickupPoint })
    stops.forEach((s, i) => {
      const p = stopPoint(s)
      if (p) nodes.push({ id: s.id, kind: "stop", label: String(i + 1), ...p })
    })
    if (dropPoint) nodes.push({ id: "drop", kind: "drop", ...dropPoint })
    return nodes
  }, [stops, pickupPoint, dropPoint])

  const issues = useMemo(() => {
    const out = {}
    stops.forEach((s, i) => {
      const hasAddr = Boolean(s.address && s.address.trim())
      const p = stopPoint(s)
      if (!hasAddr) { out[s.id] = { kind: "empty" }; return }
      if (!p) { out[s.id] = { kind: "unpinned" }; return }
      if (coverageIssue && coverageIssue.id === s.id && coverageIssue.key === `${p.lat},${p.lng}`) {
        out[s.id] = { kind: "coverage", message: coverageIssue.message }
        return
      }
      const prevStop = stops[i - 1]
      const nextStop = stops[i + 1]
      const neighbours = [
        { name: i === 0 ? "Pickup" : `Stop ${i}`, point: i === 0 ? pickupPoint : stopPoint(prevStop), addr: i === 0 ? pickupAddress : prevStop?.address },
        { name: i === stops.length - 1 ? "Drop" : `Stop ${i + 2}`, point: i === stops.length - 1 ? dropPoint : stopPoint(nextStop), addr: i === stops.length - 1 ? dropAddress : nextStop?.address },
      ]
      const same = neighbours.find((n) => metres(p, n.point) < 40 || (n.addr && norm(n.addr) === norm(s.address)))
      if (same) out[s.id] = { kind: "duplicate", with: same.name }
    })
    return out
  }, [stops, pickupPoint, dropPoint, pickupAddress, dropAddress, coverageIssue])

  const unpinnedCount = stops.filter((s) => issues[s.id]?.kind === "unpinned").length
  const emptyCount = stops.filter((s) => issues[s.id]?.kind === "empty").length

  // ── actions ──────────────────────────────────────────────────────────
  const addStopAt = (index) => {
    if (stops.length >= maxStops) return
    const stop = { id: newStopId(), address: "", coords: null, contact_name: "", contact_phone: "" }
    const next = [...stopsRef.current]
    next.splice(Math.min(Math.max(index, 0), next.length), 0, stop)
    emit(next)
    setPendingFocusId(stop.id)
    setActiveSearchId(stop.id)
  }

  const removeStop = (id) => {
    const cur = stopsRef.current
    const index = cur.findIndex((s) => s.id === id)
    if (index < 0) return
    clearTimeout(searchTimers.current[id])
    searchSeq.current[id] = (searchSeq.current[id] || 0) + 1 // discard any in-flight search
    const stop = cur[index]
    emit(cur.filter((s) => s.id !== id))
    if (stop.address) {
      setRemoved({ stop, index })
      clearTimeout(removedTimer.current)
      removedTimer.current = setTimeout(() => setRemoved(null), 7000)
    }
  }

  const undoRemove = () => {
    if (!removed || stopsRef.current.length >= maxStops) return
    const next = [...stopsRef.current]
    next.splice(Math.min(removed.index, next.length), 0, removed.stop)
    emit(next)
    setRemoved(null)
  }

  const moveStop = (from, to) => {
    const cur = stopsRef.current
    if (from === to || from < 0 || to < 0 || from >= cur.length || to >= cur.length) return
    const next = [...cur]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    emit(next)
  }

  const handleAddressChange = (id, value) => {
    patchStop(id, { address: value, coords: null }) // un-pin until re-resolved
    setActiveSearchId(id)
    clearTimeout(searchTimers.current[id])
    if (!value || value.trim().length < 2) {
      setSuggestionsById((p) => ({ ...p, [id]: [] }))
      return
    }
    const seq = (searchSeq.current[id] || 0) + 1
    searchSeq.current[id] = seq
    searchTimers.current[id] = setTimeout(async () => {
      setSearchingById((p) => ({ ...p, [id]: true }))
      let res = []
      try { res = (await searchHosurPlacesOnline(value, cityName)) || [] } catch { res = [] }
      if (searchSeq.current[id] !== seq) return // superseded, or the stop is gone
      setSuggestionsById((p) => ({ ...p, [id]: res }))
      setSearchingById((p) => ({ ...p, [id]: false }))
    }, 250)
  }

  const selectLocation = (id, loc) => {
    const exact = formatExactLocation(loc, cityName)
    setActiveSearchId(null)
    if (loc.lat != null && loc.lng != null) {
      patchStop(id, { address: exact, coords: { lat: loc.lat, lng: loc.lng, forAddress: exact } })
      return
    }
    patchStop(id, { address: exact, coords: null })
    resolveLocationCoords(loc, cityName).then((c) => {
      if (!c) return
      const cur = stopsRef.current.find((s) => s.id === id)
      if (cur && cur.address === exact) patchStop(id, { coords: { ...c, forAddress: exact } })
    })
  }

  // Same behaviour as the Pickup field's "Live GPS": reverse-geocode the
  // device position and use it as this stop's address + coordinates.
  const fillFromCurrentLocation = (id) => {
    if (!navigator.geolocation) {
      setGpsById((p) => ({ ...p, [id]: { loading: false, error: "Location is not supported by your browser. Enter the address instead." } }))
      return
    }
    setGpsById((p) => ({ ...p, [id]: { loading: true, error: "" } }))
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        let text
        try { text = await getAddress(latitude, longitude) } catch { text = "" }
        text = text || `Current Location (${cityName} - ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        setGpsById((p) => ({ ...p, [id]: { loading: false, error: "" } }))
        if (!stopsRef.current.some((s) => s.id === id)) return // stop was removed meanwhile
        setActiveSearchId(null)
        patchStop(id, { address: text, coords: { lat: latitude, lng: longitude, forAddress: text } })
      },
      (error) => {
        setGpsById((p) => ({
          ...p,
          [id]: { loading: false, error: error?.code === 1 ? "Location permission was denied. Enter the address instead." : "GPS location unavailable. Enter the address instead." },
        }))
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  const confirmPinned = (resolved) => {
    const id = pinTargetId
    setPinTargetId(null)
    if (!id) return
    const addr = resolved?.formatted_address || resolved?.address || resolved?.name || "Selected Location"
    const lat = Number(resolved?.latitude ?? resolved?.lat)
    const lng = Number(resolved?.longitude ?? resolved?.lng)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    patchStop(id, { address: addr, coords: { lat, lng, forAddress: addr } })
  }

  const pinInitial = () => {
    const idx = stops.findIndex((s) => s.id === pinTargetId)
    if (idx < 0) return null
    const own = stopPoint(stops[idx])
    if (own) return own
    return stopPoint(stops[idx - 1]) || (idx === 0 ? pickupPoint : null) || dropPoint || pickupPoint || null
  }

  // ── render ────────────────────────────────────────────────────────────
  const canAdd = stops.length < maxStops
  const summary = stops.length === 0
    ? "Direct route — add a stop if you need to make a detour"
    : `${stops.length} stop${stops.length > 1 ? "s" : ""} between pickup and drop`

  const renderGap = (index, key) => (
    <li key={key} className="flex gap-2" aria-hidden={!canAdd}>
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <div className="flex-1 w-0 border-l-2 border-dashed border-slate-300 min-h-[10px]" />
        {canAdd && (
          <button
            type="button"
            onClick={() => addStopAt(index)}
            aria-label={index === 0 ? "Add a stop right after pickup" : index >= stops.length ? "Add a stop right before drop" : `Add a stop before stop ${index + 1}`}
            title="Add a stop here"
            className="w-5 h-5 rounded-full border border-blue-300 bg-white text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
        <div className="flex-1 w-0 border-l-2 border-dashed border-slate-300 min-h-[10px]" />
      </div>
    </li>
  )

  return (
    <div className="w-full space-y-3" data-testid="multi-stop-manager">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">Your route</p>
          <p className="text-[11px] text-slate-500" data-testid="route-summary">{summary}</p>
        </div>
        {(unpinnedCount > 0 || emptyCount > 0) && (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0" role="status">
            <AlertTriangle className="w-3 h-3" />
            {unpinnedCount > 0 ? `${unpinnedCount} need${unpinnedCount === 1 ? "s" : ""} a location` : "Finish or remove empty stop"}
          </span>
        )}
      </div>

      <ol className="list-none p-0 m-0">
        {/* Pickup (edited in the form above; mirrored here so the route reads end to end) */}
        <li className="flex gap-2">
          <Rail color="#059669">A</Rail>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Pickup</p>
            <p className="text-xs text-slate-700 truncate" data-testid="route-pickup">{pickupAddress || "Choose a pickup location above"}</p>
          </div>
        </li>

        {stops.map((stop, idx) => {
          const issue = issues[stop.id]
          const pinned = Boolean(stopPoint(stop))
          const localMatches = filterLocationSuggestions(stop.address || "")
          const onlineList = suggestionsById[stop.id] || []
          const suggestions = [
            ...localMatches,
            ...onlineList.filter((on) => !localMatches.some((l) => l.name.toLowerCase() === on.name.toLowerCase())),
          ]
          const expanded = expandedContactId === stop.id
          return (
            <React.Fragment key={stop.id}>
              {renderGap(idx, `gap-${stop.id}`)}
              <li
                className={`flex gap-2 ${dragOverIndex === idx && dragId && dragId !== stop.id ? "ring-2 ring-blue-300 rounded-xl" : ""}`}
                data-testid={`stop-row-${idx}`}
                onMouseEnter={() => setHighlightId(stop.id)}
                onMouseLeave={() => setHighlightId(null)}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); setDragOverIndex(idx) } }}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = stopsRef.current.findIndex((s) => s.id === dragId)
                  moveStop(from, idx)
                  setDragId(null); setDragOverIndex(null)
                }}
              >
                <Rail color="#2563eb">{idx + 1}</Rail>
                <div
                  ref={(el) => { if (el) dropdownRefs.current[stop.id] = el; else delete dropdownRefs.current[stop.id] }}
                  className={`min-w-0 flex-1 p-2.5 rounded-2xl border relative ${
                    issue?.kind === "coverage" ? "bg-rose-50/60 border-rose-300"
                      : issue?.kind === "unpinned" || issue?.kind === "empty" ? "bg-amber-50/60 border-amber-300"
                      : issue?.kind === "duplicate" ? "bg-amber-50/40 border-amber-200"
                      : "bg-blue-50/40 border-blue-200/80"
                  } ${dragId === stop.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        role="button"
                        aria-label={`Drag stop ${idx + 1} to reorder`}
                        title="Drag to reorder"
                        draggable
                        onDragStart={(e) => { setDragId(stop.id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", stop.id) } catch { /* ignore */ } }}
                        onDragEnd={() => { setDragId(null); setDragOverIndex(null) }}
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-700 -ml-1"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">Stop {idx + 1}</span>
                      {pinned && !issue && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> On route
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" disabled={idx === 0} onClick={() => moveStop(idx, idx - 1)} aria-label={`Move stop ${idx + 1} up`} title="Move up"
                        className="p-1 rounded-lg hover:bg-blue-100 text-blue-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" disabled={idx === stops.length - 1} onClick={() => moveStop(idx, idx + 1)} aria-label={`Move stop ${idx + 1} down`} title="Move down"
                        className="p-1 rounded-lg hover:bg-blue-100 text-blue-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => removeStop(stop.id)} aria-label={`Remove stop ${idx + 1}`} title="Remove this stop"
                        className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative flex gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <input
                        ref={(el) => { if (el) inputRefs.current[stop.id] = el; else delete inputRefs.current[stop.id] }}
                        type="text"
                        aria-label={`Stop ${idx + 1} address`}
                        placeholder="Search address, or pin it on the map"
                        value={stop.address || ""}
                        onChange={(e) => handleAddressChange(stop.id, e.target.value)}
                        onFocus={() => { setActiveSearchId(stop.id); setHighlightId(stop.id) }}
                        className="w-full pl-3 pr-16 h-9 text-xs bg-white border border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none text-slate-800 font-medium"
                      />
                      {searchingById[stop.id] && (
                        <div className="absolute right-14 top-1/2 -translate-y-1/2"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /></div>
                      )}
                      {activeSearchId === stop.id && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden max-h-56 overflow-y-auto" role="listbox">
                          <div className="p-1 space-y-0.5">
                            {suggestions.length > 0 ? suggestions.map((loc, sIdx) => (
                              <button
                                key={`${loc.name}-${sIdx}`}
                                type="button"
                                role="option"
                                onMouseDown={(e) => { e.preventDefault(); selectLocation(stop.id, loc) }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center justify-between gap-2 group cursor-pointer"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 truncate">{loc.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{loc.subtitle}</p>
                                </div>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{loc.category || "Hosur"}</span>
                              </button>
                            )) : (
                              <div className="p-2 text-center text-xs text-slate-400">
                                {stop.address ? (
                                  <>
                                    <p>No matching location found for "{stop.address}"</p>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => { e.preventDefault(); selectLocation(stop.id, formatExactLocation(stop.address, cityName)) }}
                                      className="mt-1 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                                    >
                                      Use "{stop.address}" as stop address
                                    </button>
                                  </>
                                ) : "Type to search locations"}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setActiveSearchId(null); setPinTargetId(stop.id) }}
                          aria-label={`Pin stop ${idx + 1} on the map`}
                          title="Pick on interactive map"
                          className="p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fillFromCurrentLocation(stop.id)}
                          disabled={gpsById[stop.id]?.loading}
                          aria-label={`Use my current location for stop ${idx + 1}`}
                          title="Fetch live GPS location"
                          className="p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          {gpsById[stop.id]?.loading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            : <LocateFixed className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {gpsById[stop.id]?.error && (
                    <p className="mt-1.5 text-[10px] font-semibold text-amber-800" role="status">{gpsById[stop.id].error}</p>
                  )}
                  {issue?.kind === "empty" && (
                    <p className="mt-1.5 text-[10px] font-semibold text-amber-800" data-testid={`stop-issue-${idx}`}>Add an address, or remove this stop.</p>
                  )}
                  {issue?.kind === "unpinned" && (
                    <p className="mt-1.5 text-[10px] font-semibold text-amber-800 flex items-center gap-1" data-testid={`stop-issue-${idx}`}>
                      <AlertTriangle className="w-3 h-3 shrink-0" /> Pick a suggestion or pin it on the map — it isn't on the route or in the price yet.
                    </p>
                  )}
                  {issue?.kind === "coverage" && (
                    <p className="mt-1.5 text-[10px] font-semibold text-rose-700 flex items-center gap-1" data-testid={`stop-issue-${idx}`}>
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {issue.message}
                    </p>
                  )}
                  {issue?.kind === "duplicate" && (
                    <p className="mt-1.5 text-[10px] font-semibold text-amber-800 flex items-center gap-1" data-testid={`stop-issue-${idx}`}>
                      <AlertTriangle className="w-3 h-3 shrink-0" /> This is the same place as {issue.with}. Remove it or choose a different location.
                    </p>
                  )}

                  <div className="mt-2 pt-2 border-t border-blue-100/80">
                    <button type="button" onClick={() => setExpandedContactId(expanded ? null : stop.id)}
                      className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer">
                      <span>{stop.contact_name ? `Contact: ${stop.contact_name}` : "+ Add contact for this stop"}</span>
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {expanded && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input type="text" placeholder="Contact name" aria-label={`Stop ${idx + 1} contact name`} value={stop.contact_name || ""}
                          onChange={(e) => patchStop(stop.id, { contact_name: e.target.value })}
                          className="h-8 px-2.5 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-medium" />
                        <input type="tel" placeholder="10-digit phone" maxLength={10} aria-label={`Stop ${idx + 1} contact phone`} value={stop.contact_phone || ""}
                          onChange={(e) => patchStop(stop.id, { contact_phone: e.target.value.replace(/\D/g, "") })}
                          className="h-8 px-2.5 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-medium" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            </React.Fragment>
          )
        })}

        {renderGap(stops.length, "gap-end")}

        <li className="flex gap-2">
          <Rail color="#e11d48" last>B</Rail>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Drop</p>
            <p className="text-xs text-slate-700 truncate" data-testid="route-drop">{dropAddress || "Choose a drop location above"}</p>
          </div>
        </li>
      </ol>

      {removed && (
        <div className="flex items-center justify-between gap-2 text-[11px] bg-slate-800 text-white rounded-xl px-3 py-2" role="status">
          <span className="truncate">Stop removed</span>
          <button type="button" onClick={undoRemove} disabled={stops.length >= maxStops}
            className="font-bold flex items-center gap-1 text-emerald-300 hover:text-emerald-200 disabled:opacity-40 cursor-pointer">
            <Undo2 className="w-3 h-3" /> Undo
          </button>
        </div>
      )}

      {canAdd ? (
        <button
          type="button"
          onClick={() => addStopAt(stops.length)}
          className="w-full py-2 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 text-blue-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600" />
          <span>Add stop ({stops.length}/{maxStops})</span>
        </button>
      ) : (
        <p className="text-[11px] text-slate-500 text-center">Maximum of {maxStops} stops reached.</p>
      )}

      {route.length >= 2 && (
        <div>
          <button type="button" onClick={() => setShowMap((v) => !v)}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-1.5 cursor-pointer">
            <MapIcon className="w-3.5 h-3.5" /> {showMap ? "Hide route map" : "Show route map"}
          </button>
          {showMap && <RoutePreviewMap points={route} highlightId={highlightId} />}
          {showMap && unpinnedCount > 0 && (
            <p className="mt-1 text-[10px] text-amber-800 font-semibold">
              {unpinnedCount} stop{unpinnedCount > 1 ? "s aren't" : " isn't"} on the map yet.
            </p>
          )}
        </div>
      )}

      {pinTargetId && (
        <MapPickerScreen
          initialCoords={pinInitial()}
          serviceSlug={serviceSlug}
          onClose={() => setPinTargetId(null)}
          onConfirm={confirmPinned}
        />
      )}
    </div>
  )
}
