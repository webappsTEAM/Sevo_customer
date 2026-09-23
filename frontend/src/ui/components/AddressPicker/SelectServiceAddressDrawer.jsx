import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin, Plus, Check, X,
  Search, Navigation, AlertCircle, ShieldCheck, CheckCircle2,
  Loader2, Compass
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import {
  apiListSavedAddresses,
  apiDeleteSavedAddress,
  apiSetDefaultSavedAddress
} from "../../../api/addressService.js"
import { getAddress } from "../../../api/geocoding.js"
import { useAuth } from "../../../state/auth/useAuth.js"
import { setCustomerSelectedAddress, setCustomerLocation, getCustomerCoordinates } from "../../../utils/customerLocationStorage.js"
import { MapPickerScreen } from "./MapPickerScreen.jsx"
import BookingAddressCard from "./BookingAddressCard.jsx"

/**
 * Helper to produce a single canonical address object across the entire application.
 */
export function formatCanonicalAddress(addr) {
  if (!addr) return null
  const lat = addr.latitude ? Number(addr.latitude) : null
  const lng = addr.longitude ? Number(addr.longitude) : null
  const rawType = addr.address_type || addr.tag || addr.label || "Home"
  const flat = addr.flat_house_no || addr.house_number || addr.flat || ""
  const line1 = addr.address_line1 || addr.street_address || ""
  const landmark = addr.landmark || ""
  const locality = addr.locality || addr.area || ""
  const city = addr.city || "Hosur"
  const state = addr.state || "Tamil Nadu"
  const pincode = addr.pincode || addr.postcode || "635109"

  let formatted = addr.formatted_address || ""
  if (!formatted) {
    formatted = [flat, line1, landmark, locality, city, state, pincode].filter(Boolean).join(", ")
  }

  return {
    id: addr.id || addr.address_id || addr.saved_address_id || `addr_${Date.now()}`,
    address_type: rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase(),
    label: rawType.toLowerCase(),
    flat_house_no: flat,
    address_line1: line1,
    landmark: landmark,
    locality: locality,
    city: city,
    state: state,
    pincode: pincode,
    formatted_address: formatted,
    latitude: lat,
    longitude: lng,
    location_source: addr.location_source || "map_pin",
    geocoding_status: addr.geocoding_status || "verified",
    serviceable: addr.serviceable !== undefined ? Boolean(addr.serviceable) : true,
    zone_id: addr.zone_id || null,
    zone_name: addr.zone_name || "Hosur City"
  }
}

/**
 * SelectServiceAddressDrawer
 * The SINGLE Universal Swiggy-Style Address Selection Drawer.
 * Used across all address selection entry points:
 * 1. Home / Header location selector
 * 2. Booking checkout service address
 * 3. Cart checkout address
 * 4. Change Location buttons
 * 5. Service unavailable location actions
 */
export function SelectServiceAddressDrawer({
  isOpen = true,
  onClose,
  currentAddress = "",
  currentAddressId = null,
  serviceSlug = "",
  onSelectAddress,
  onOpenMapSearch,
  onAddNewAddress
}) {
  const { user } = useAuth()
  const [savedAddresses, setSavedAddresses] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(currentAddressId || null)
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [gpsError, setGpsError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

  // Map confirmation state (Sub-workflow to MapPickerScreen)
  const [showConfirmMap, setShowConfirmMap] = useState(false)
  const [activeConfirmLocation, setActiveConfirmLocation] = useState(null)

  // Load customer saved addresses
  const loadSavedAddresses = async () => {
    setSavedAddresses([])
    setLoadingSaved(true)
    try {
      const res = await apiListSavedAddresses()
      if (res && res.success && Array.isArray(res.data)) {
        setSavedAddresses(res.data)
      } else if (Array.isArray(res)) {
        setSavedAddresses(res)
      } else {
        setSavedAddresses([])
      }
    } catch (err) {
      setSavedAddresses([])
    } finally {
      setLoadingSaved(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSavedAddresses()
      setGpsError("")
      setSearchQuery("")
      setSearchResults([])
      setSelectedAddressId(currentAddressId || null)
      setShowConfirmMap(false)
      setActiveConfirmLocation(null)
    }
  }, [isOpen, currentAddressId, user?.id])

  // Live Photon / Komoot search debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=6`
        const res = await fetch(url)
        const data = await res.json()
        if (data && Array.isArray(data.features)) {
          const mapped = data.features.map((f) => {
            const p = f.properties || {}
            const parts = [p.name, p.street, p.district || p.suburb, p.city, p.state, p.postcode].filter(Boolean)
            const formatted = parts.filter((v, i, a) => a.indexOf(v) === i).join(", ")
            return {
              id: `search-${f.geometry.coordinates[0]}-${f.geometry.coordinates[1]}`,
              formatted_address: formatted || p.name || searchQuery,
              street_address: p.name || p.street || "",
              address_line1: p.name || p.street || "",
              city: p.city || "",
              state: p.state || "",
              pincode: p.postcode || "",
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
              address_type: "Other",
              location_verified: true,
              location_source: "search",
              geocoding_status: "verified"
            }
          })
          setSearchResults(mapped)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  // ── Sync canonical selection across localStorage & components ───────────
  const syncCanonicalSelection = (canonicalObj) => {
    try {
      if (user?.id) {
        setCustomerSelectedAddress(user.id, canonicalObj)
        setCustomerLocation(user.id, canonicalObj.formatted_address)
      }
    } catch (_) { }

    window.dispatchEvent(new Event("calservice_address_changed"))
  }

  // ── FLOW 1: Select Saved Address Card ───────────────────────────────────
  const handleSelectSaved = async (addr) => {
    const canonical = formatCanonicalAddress(addr)
    setSelectedAddressId(canonical.id)
    syncCanonicalSelection(canonical)

    if (typeof onSelectAddress === "function") {
      onSelectAddress(canonical)
    }
    if (typeof onClose === "function") {
      onClose()
    }
  }

  // ── FLOW 2: Select Live Search Result ───────────────────────────────────
  const handleSelectSearchItem = (searchItem) => {
    const locObj = {
      ...searchItem,
      latitude: Number(searchItem.latitude),
      longitude: Number(searchItem.longitude),
      location_source: "search_result"
    }
    setActiveConfirmLocation(locObj)
    setShowConfirmMap(true)
  }

  // ── FLOW 3: Real Browser GPS Detection ──────────────────────────────────
  const handleUseCurrentLocation = () => {
    setGpsError("")
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.")
      return
    }

    setIsDetectingGps(true)

    const processPosition = async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(6))
      const lng = parseFloat(pos.coords.longitude.toFixed(6))
      const acc = pos.coords.accuracy ? `Accuracy ~${Math.round(pos.coords.accuracy)}m` : null
      setGpsAccuracy(acc)

      // Instantly prepare and launch confirmation map on detected coordinates
      const initialResolvedObj = {
        id: null,
        formatted_address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        street_address: "",
        address_line1: "",
        flat_house_no: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        address_type: "Home",
        location_verified: true,
        location_source: "gps",
        geocoding_status: "verified",
        serviceable: true
      }

      setActiveConfirmLocation(initialResolvedObj)
      setShowConfirmMap(true)
      setIsDetectingGps(false)

      // In parallel, reverse-geocode to populate door and area details without blocking UI
      try {
        let addressData = null
        try {
          const apiRes = await apiRequest("/auth/customer/location/detect/", {
            method: "POST",
            json: { latitude: lat, longitude: lng, accuracy: pos.coords.accuracy }
          })
          if (apiRes && apiRes.success && apiRes.data) {
            addressData = apiRes.data
          }
        } catch (_) { }

        if (!addressData || !addressData.formatted_address) {
          const geoStr = await getAddress(lat, lng)
          if (geoStr) {
            addressData = { formatted_address: geoStr }
          }
        }

        if (addressData && addressData.formatted_address) {
          setActiveConfirmLocation(prev => ({
            ...prev,
            ...addressData,
            formatted_address: addressData.formatted_address || prev.formatted_address,
            address_line1: addressData.address_line1 || addressData.street_address || prev.address_line1,
            street_address: addressData.address_line1 || addressData.street_address || prev.street_address,
            locality: addressData.locality || prev.locality,
            city: addressData.city || prev.city,
            state: addressData.state || prev.state,
            pincode: addressData.pincode || prev.pincode,
          }))
        }
      } catch (err) {
        console.warn("GPS reverse geocoding fallback warning:", err)
      }
    }

    navigator.geolocation.getCurrentPosition(
      processPosition,
      (err) => {
        // Fast fallback for devices without high-accuracy GPS satellite fix
        navigator.geolocation.getCurrentPosition(
          processPosition,
          (err2) => {
            setIsDetectingGps(false)
            if (err2.code === 1) {
              setGpsError("Location permission denied. Please enable GPS permissions in your browser.")
            } else if (err2.code === 2) {
              setGpsError("Location position unavailable. Please try searching for your area.")
            } else {
              setGpsError("Location request timed out. Please try searching or picking on map.")
            }
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        )
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 120000 }
    )
  }

  // ── FLOW 4: Pick on Map ────────────────────────────────────────────────
  const handleOpenMapPicker = () => {
    let lat = 12.754598
    let lng = 77.834477
    try {
      const storedCoords = getCustomerCoordinates(user?.id)
      if (storedCoords && storedCoords.lat && storedCoords.lng) {
        lat = Number(storedCoords.lat)
        lng = Number(storedCoords.lng)
      }
    } catch (_) { }

    const locObj = {
      id: null,
      formatted_address: currentAddress || "",
      street_address: "",
      address_line1: "",
      flat_house_no: "",
      landmark: "",
      city: "Hosur",
      state: "Tamil Nadu",
      pincode: "635109",
      latitude: lat,
      longitude: lng,
      address_type: "Home",
      location_source: "map_picker",
      geocoding_status: "verified"
    }

    setActiveConfirmLocation(locObj)
    setShowConfirmMap(true)
  }

  // ── FLOW 5: Add New Service Address ────────────────────────────────────
  const handleAddNewAddressFlow = () => {
    let lat = 12.754598
    let lng = 77.834477
    try {
      const storedCoords = getCustomerCoordinates(user?.id)
      if (storedCoords && storedCoords.lat && storedCoords.lng) {
        lat = Number(storedCoords.lat)
        lng = Number(storedCoords.lng)
      }
    } catch (_) { }

    const locObj = {
      id: null,
      formatted_address: "",
      street_address: "",
      address_line1: "",
      flat_house_no: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      latitude: lat,
      longitude: lng,
      address_type: "Home",
      location_source: "add_new",
      geocoding_status: "verified",
      isNew: true
    }

    setActiveConfirmLocation(locObj)
    setShowConfirmMap(true)
  }

  // ── Handle Edit Address ───────────────────────────────────────────────────
  const handleEditAddress = (addr) => {
    const lat = addr.latitude ? parseFloat(addr.latitude) : 12.754598
    const lng = addr.longitude ? parseFloat(addr.longitude) : 77.834477
    const initialObj = {
      id: addr.id,
      address_id: addr.id,
      saved_address_id: addr.id,
      formatted_address: addr.formatted_address || addr.address_line1 || '',
      street_address: addr.address_line1 || '',
      address_line1: addr.address_line1 || '',
      flat_house_no: addr.flat_house_no || addr.house_number || '',
      landmark: addr.landmark || '',
      locality: addr.locality || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      latitude: lat,
      longitude: lng,
      address_type: addr.address_type || 'Home',
      label: (addr.address_type || 'home').toLowerCase(),
      is_default: Boolean(addr.is_default),
      isEditing: true
    }
    setActiveConfirmLocation(initialObj)
    setShowConfirmMap(true)
  }

  // ── Handle Delete Address ─────────────────────────────────────────────────
  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      await apiDeleteSavedAddress(id)
      await loadSavedAddresses()
      if (selectedAddressId === id) {
        setSelectedAddressId(null)
        if (user?.id) {
          const remaining = savedAddresses.filter((a) => a.id !== id)
          const nextAddr = remaining.find((a) => a.is_default) || remaining[0] || null
          if (nextAddr) {
            const canonical = formatCanonicalAddress(nextAddr)
            setSelectedAddressId(canonical.id)
            syncCanonicalSelection(canonical)
          } else {
            setCustomerSelectedAddress(user.id, null)
            setCustomerLocation(user.id, '')
            window.dispatchEvent(new Event('calservice_address_changed'))
          }
        }
      } else {
        window.dispatchEvent(new Event('calservice_address_changed'))
      }
    } catch (err) {
      console.error('Failed to delete address:', err)
      alert(err?.message || 'Failed to delete address.')
    }
  }

  // ── Handle Set Default Address ────────────────────────────────────────────
  const handleSetDefaultAddress = async (id) => {
    try {
      await apiSetDefaultSavedAddress(id)
      await loadSavedAddresses()
      window.dispatchEvent(new Event('calservice_address_changed'))
    } catch (err) {
      console.error('Failed to set default address:', err)
      alert(err?.message || 'Failed to set default address.')
    }
  }

  // ── Handle Confirmation from MapPickerScreen ───────────────────────────
  const handleConfirmFromMap = (finalServiceLocation) => {
    setShowConfirmMap(false)
    if (finalServiceLocation) {
      const canonical = formatCanonicalAddress(finalServiceLocation)
      setSelectedAddressId(canonical.id)
      syncCanonicalSelection(canonical)
      loadSavedAddresses()

      if (typeof onSelectAddress === "function") {
        onSelectAddress(canonical)
      }
      if (typeof onClose === "function") {
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        />

        {/* Slide-over Drawer */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden font-sans text-slate-800"
        >
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00875A]" />
                <h3 className="text-base sm:text-lg font-black text-slate-900">Select Service Address</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Where would you like our service expert to arrive?
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
            {/* Quick Search Input */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-[#00875A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00875A]/20 transition-all shadow-xs">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search area, apartment, street name..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold outline-none text-slate-800 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {isSearching && (
                <div className="mt-2 p-3 bg-white border border-slate-100 rounded-xl shadow-md text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00875A]" />
                  <span>Searching locations...</span>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-lg overflow-hidden divide-y divide-slate-100 z-20">
                  <div className="p-2 bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Search Results
                  </div>
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelectSearchItem(res)}
                      className="w-full text-left p-3 hover:bg-emerald-50/50 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                        <MapPin size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 truncate">
                          {res.address_line1 || res.formatted_address.split(",")[0]}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {res.formatted_address}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action 1: Use Current Location (GPS) */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#00875A] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#00875A]/25">
                    {isDetectingGps ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Navigation className="w-5 h-5 stroke-[2.2]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      Use Current Location
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        GPS
                      </span>
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                      Enable device location for precise doorstep arrival
                    </p>
                    {gpsAccuracy && (
                      <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                        <ShieldCheck size={12} />
                        <span>{gpsAccuracy}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isDetectingGps}
                  className="px-4 py-2 bg-[#00875A] hover:bg-[#00704A] disabled:bg-emerald-400 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
                >
                  {isDetectingGps ? "Detecting..." : "Detect"}
                </button>
              </div>
              {gpsError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  <span>{gpsError}</span>
                </div>
              )}
            </div>

            {/* Quick Action 2: Pick on Interactive Map */}
            <div className="border border-slate-200/80 bg-white rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">Pick on Map</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Drag pin & set exact building location</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenMapPicker}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
              >
                Open Map
              </button>
            </div>

            {/* SAVED ADDRESSES SECTION */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-[#00875A] rounded-full" />
                  SAVED ADDRESSES ({savedAddresses.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddNewAddressFlow}
                  className="text-xs font-black text-[#00875A] hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add New</span>
                </button>
              </div>

              {loadingSaved ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00875A]" />
                  <p className="text-xs font-semibold">Loading your saved addresses...</p>
                </div>
              ) : savedAddresses.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MapPin size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">No saved addresses found</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Save your home or office address to book faster with a single tap.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewAddressFlow}
                    className="px-4 py-2 bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add New Address</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => {
                    const isSelected =
                      (selectedAddressId && Number(selectedAddressId) === Number(addr.id)) ||
                      (currentAddressId && Number(currentAddressId) === Number(addr.id)) ||
                      (currentAddress && addr.formatted_address && currentAddress.trim() === addr.formatted_address.trim()) ||
                      (currentAddress && addr.address_line1 && currentAddress.includes(addr.address_line1))

                    return (
                      <BookingAddressCard
                        key={addr.id}
                        address={addr}
                        isSelected={isSelected}
                        onSelect={handleSelectSaved}
                        onEdit={handleEditAddress}
                        onDelete={handleDeleteAddress}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Drawer Sticky Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleAddNewAddressFlow}
              className="w-full py-3.5 bg-[#00875A] hover:bg-[#00704A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>ADD NEW SERVICE ADDRESS</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* MapPickerScreen Modal for Search, GPS, Pick on Map, and Add New Address */}
      {showConfirmMap && (
        <MapPickerScreen
          initialLocation={activeConfirmLocation}
          initialCoords={
            activeConfirmLocation?.latitude && activeConfirmLocation?.longitude
              ? { lat: Number(activeConfirmLocation.latitude), lng: Number(activeConfirmLocation.longitude) }
              : { lat: 12.754598, lng: 77.834477 }
          }
          initialFlat={activeConfirmLocation?.flat_house_no || ""}
          initialLandmark={activeConfirmLocation?.landmark || ""}
          serviceSlug={serviceSlug}
          onClose={() => setShowConfirmMap(false)}
          onConfirm={handleConfirmFromMap}
        />
      )}
    </>
  )
}
export default SelectServiceAddressDrawer
