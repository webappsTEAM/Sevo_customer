import React, { useState, useEffect, useRef } from "react"
import {
  MapPin, Plus, Trash2, ArrowUp, ArrowDown, User, Phone,
  ChevronDown, ChevronUp, CheckCircle2, LocateFixed, Loader2, Navigation
} from "lucide-react"
import {
  filterLocationSuggestions,
  searchHosurPlacesOnline,
  formatExactLocation,
  resolveLocationCoords,
} from "../../services/hosurLocations.js"

/**
 * MultiStopRouteManager
 *
 * Dedicated waypoint & intermediate stop manager for SEVO Goods & Transport.
 * Conforms to SEVO GT Sections 7 & 8:
 * - Pickup -> Stop 1 -> Stop 2 -> Final Drop sequence
 * - Add stop, remove stop, reorder stops
 * - Address search with debounced Hosur suggestions & online geocoding
 * - Real latitude/longitude coordinate resolution per stop
 * - Contact / receiver info per stop
 */
export function MultiStopRouteManager({
  stops = [],
  onChangeStops,
  maxStops = 3,
  pickupAddress = "",
  dropAddress = "",
}) {
  const [activeSearchIndex, setActiveSearchIndex] = useState(null)
  const [onlineSuggestions, setOnlineSuggestions] = useState({})
  const [isSearchingOnline, setIsSearchingOnline] = useState({})
  const [expandedDetailsIndex, setExpandedDetailsIndex] = useState(null)
  const dropdownRefs = useRef([])

  // Close suggestions on outside click
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (activeSearchIndex !== null) {
        const ref = dropdownRefs.current[activeSearchIndex]
        if (ref && !ref.contains(e.target)) {
          setActiveSearchIndex(null)
        }
      }
    }
    document.addEventListener("mousedown", handleDocumentClick)
    return () => document.removeEventListener("mousedown", handleDocumentClick)
  }, [activeSearchIndex])

  // Debounced search for the stop currently being typed into
  const handleStopAddressChange = (index, value) => {
    const updated = [...stops]
    updated[index] = {
      ...updated[index],
      address: value,
      coords: null, // Invalidate previous coords until resolved
    }
    onChangeStops(updated)
    setActiveSearchIndex(index)

    if (!value || value.trim().length < 2) {
      setOnlineSuggestions((prev) => ({ ...prev, [index]: [] }))
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline((prev) => ({ ...prev, [index]: true }))
      const res = await searchHosurPlacesOnline(value)
      setOnlineSuggestions((prev) => ({ ...prev, [index]: res || [] }))
      setIsSearchingOnline((prev) => ({ ...prev, [index]: false }))
    }, 250)

    return () => clearTimeout(timer)
  }

  const handleSelectLocation = (index, loc) => {
    const exact = formatExactLocation(loc)
    const updated = [...stops]
    updated[index] = {
      ...updated[index],
      address: exact,
    }

    if (loc.lat != null && loc.lng != null) {
      updated[index].coords = { lat: loc.lat, lng: loc.lng, forAddress: exact }
      onChangeStops(updated)
    } else {
      resolveLocationCoords(loc).then((c) => {
        if (c) {
          const fresh = [...updated]
          fresh[index] = {
            ...fresh[index],
            coords: { ...c, forAddress: exact },
          }
          onChangeStops(fresh)
        }
      })
      onChangeStops(updated)
    }

    setActiveSearchIndex(null)
  }

  const handleAddStop = () => {
    if (stops.length >= maxStops) return
    const newStop = {
      id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      address: "",
      coords: null,
      contact_name: "",
      contact_phone: "",
    }
    onChangeStops([...stops, newStop])
  }

  const handleRemoveStop = (index) => {
    const updated = stops.filter((_, idx) => idx !== index)
    onChangeStops(updated)
    if (activeSearchIndex === index) setActiveSearchIndex(null)
  }

  const handleMoveStop = (index, direction) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= stops.length) return
    const updated = [...stops]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    onChangeStops(updated)
  }

  const handleUpdateContact = (index, field, value) => {
    const updated = [...stops]
    updated[index] = {
      ...updated[index],
      [field]: value,
    }
    onChangeStops(updated)
  }

  return (
    <div className="w-full space-y-3">
      {/* Waypoints List */}
      {stops.map((stop, idx) => {
        const localMatches = filterLocationSuggestions(stop.address || "")
        const onlineList = onlineSuggestions[idx] || []
        const suggestions = [
          ...localMatches,
          ...onlineList.filter(
            (on) => !localMatches.some((l) => l.name.toLowerCase() === on.name.toLowerCase())
          ),
        ]
        const isExpanded = expandedDetailsIndex === idx

        return (
          <div
            key={stop.id || idx}
            ref={(el) => (dropdownRefs.current[idx] = el)}
            className="p-3 bg-blue-50/40 border border-blue-200/80 rounded-2xl relative transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                  {idx + 1}
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">
                  Stop {idx + 1} (Waypoint)
                </span>
                {stop.coords && (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> GPS Pinned
                  </span>
                )}
              </div>

              {/* Reorder and Delete controls */}
              <div className="flex items-center gap-1">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveStop(idx, -1)}
                    title="Move stop up"
                    className="p-1 rounded-lg hover:bg-blue-100 text-blue-700 cursor-pointer transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                )}
                {idx < stops.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMoveStop(idx, 1)}
                    title="Move stop down"
                    className="p-1 rounded-lg hover:bg-blue-100 text-blue-700 cursor-pointer transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveStop(idx)}
                  title="Remove this stop"
                  className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Address Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Enter waypoint address in Hosur / Bengaluru..."
                value={stop.address || ""}
                onChange={(e) => handleStopAddressChange(idx, e.target.value)}
                onFocus={() => setActiveSearchIndex(idx)}
                className="w-full pl-3 pr-8 h-9 text-xs bg-white border border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none text-slate-800 font-medium"
              />
              {isSearchingOnline[idx] && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {activeSearchIndex === idx && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden max-h-56 overflow-y-auto">
                  <div className="p-1 space-y-0.5">
                    {suggestions.length > 0 ? (
                      suggestions.map((loc, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelectLocation(idx, loc)
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-900 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-900 truncate">
                              {loc.name}
                            </p>
                            <p className="text-[10px] text-slate-400 group-hover:text-blue-700 truncate">
                              {loc.subtitle}
                            </p>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {loc.category || "Hosur"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-center text-xs text-slate-400">
                        {stop.address ? `No matches found for "${stop.address}"` : "Type to search locations"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Receiver / Contact toggle for this stop */}
            <div className="mt-2 pt-2 border-t border-blue-100/80">
              <button
                type="button"
                onClick={() => setExpandedDetailsIndex(isExpanded ? null : idx)}
                className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{stop.contact_name ? `Receiver: ${stop.contact_name}` : "+ Add Receiver Contact for this stop"}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-1">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={stop.contact_name || ""}
                    onChange={(e) => handleUpdateContact(idx, "contact_name", e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="10-digit Phone"
                    maxLength={10}
                    value={stop.contact_phone || ""}
                    onChange={(e) => handleUpdateContact(idx, "contact_phone", e.target.value.replace(/\D/g, ""))}
                    className="h-8 px-2.5 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Add Stop Button */}
      {stops.length < maxStops && (
        <button
          type="button"
          onClick={handleAddStop}
          className="w-full py-2 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-600" />
          <span>Add Stop / Waypoint ({stops.length}/{maxStops})</span>
        </button>
      )}
    </div>
  )
}
