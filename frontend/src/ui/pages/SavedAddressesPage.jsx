import React, { useState, useEffect, useRef } from 'react'
import {
  Plus, MapPin, Loader2, AlertCircle, Search, Navigation, Compass,
  CheckCircle2, ShieldCheck, Check
} from 'lucide-react'
import {
  apiListSavedAddresses,
  apiDeleteSavedAddress,
  apiSetDefaultSavedAddress
} from '../../api/addressService.js'
import { getAddress } from '../../api/geocoding.js'
import BookingAddressCard from '../components/AddressPicker/BookingAddressCard.jsx'
import { MapPickerScreen } from '../components/AddressPicker/MapPickerScreen.jsx'
import {
  setCustomerSelectedAddress,
  setCustomerLocation,
  getCustomerSelectedAddress
} from '../../utils/customerLocationStorage.js'

/**
 * SavedAddressesPage
 * The Single Unified Swiggy-Style Address Management & Selection Experience.
 * Exactly matches the layout, hierarchy, and interaction flow of Image 2.
 */
export default function SavedAddressesPage({ user, onClose, onSelectAddress }) {
  const [savedAddresses, setSavedAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [activeLocationForMap, setActiveLocationForMap] = useState(null)
  const [editingAddress, setEditingAddress] = useState(null)
  const [selectedAddressId, setSelectedAddressId] = useState(null)

  // GPS & Search states matching Image 2
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

  const loadAddresses = async () => {
    setSavedAddresses([])
    setLoading(true)
    setError('')
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
      console.error('Failed to load saved addresses:', err)
      setError(err?.message || 'Failed to load saved addresses. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAddresses()
    if (user?.id) {
      const activeSelected = getCustomerSelectedAddress(user.id)
      if (activeSelected?.id) {
        setSelectedAddressId(activeSelected.id)
      }
    }
  }, [user?.id])

  // Live Photon search autocomplete
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
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`
        const res = await fetch(url)
        const data = await res.json()
        if (data && Array.isArray(data.features)) {
          const mapped = data.features.map((f) => {
            const p = f.properties || {}
            const parts = [p.name, p.street, p.district || p.suburb, p.city, p.state, p.postcode].filter(Boolean)
            const formatted = parts.filter((v, i, a) => a.indexOf(v) === i).join(', ')
            return {
              id: `search-${f.geometry.coordinates[0]}-${f.geometry.coordinates[1]}`,
              formatted_address: formatted || p.name || searchQuery,
              street_address: p.name || p.street || '',
              address_line1: p.name || p.street || '',
              city: p.city || 'Hosur',
              state: p.state || 'Tamil Nadu',
              pincode: p.postcode || '',
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
              address_type: 'Other',
              location_source: 'search_result'
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

  // ── Open Add New Address ──────────────────────────────────────────────────
  const handleAddNew = () => {
    setEditingAddress(null)
    const initialObj = {
      id: null,
      formatted_address: '',
      street_address: '',
      address_line1: '',
      flat_house_no: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      latitude: 12.754598,
      longitude: 77.834477,
      address_type: 'Home',
      label: 'home',
      location_source: 'add_new',
      geocoding_status: 'verified',
      isNew: true
    }
    setActiveLocationForMap(initialObj)
    setShowMapPicker(true)
  }

  // ── Open Edit Address ─────────────────────────────────────────────────────
  const handleEdit = (addr) => {
    setEditingAddress(addr)
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
      receiver_name: addr.receiver_name || addr.contact_name || user?.name || '',
      receiver_mobile: addr.receiver_mobile || addr.receiver_phone || addr.contact_phone || user?.phone || '',
      receiver_phone: addr.receiver_phone || addr.receiver_mobile || addr.contact_phone || user?.phone || '',
      address_type: addr.address_type || 'Home',
      label: (addr.address_type || 'home').toLowerCase(),
      is_default: Boolean(addr.is_default),
      isEditing: true
    }
    setActiveLocationForMap(initialObj)
    setShowMapPicker(true)
  }

  // ── Delete Address ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      await apiDeleteSavedAddress(id)
      await loadAddresses()
      if (selectedAddressId === id) {
        setSelectedAddressId(null)
        if (user?.id) {
          const remaining = savedAddresses.filter(a => a.id !== id)
          const nextAddr = remaining.find(a => a.is_default) || remaining[0] || null
          setCustomerSelectedAddress(user.id, nextAddr)
          setCustomerLocation(user.id, nextAddr?.formatted_address || nextAddr?.address_line1 || '')
        }
      }
      window.dispatchEvent(new Event('calservice_address_changed'))
    } catch (err) {
      console.error('Failed to delete address:', err)
      alert(err?.message || 'Failed to delete address.')
    }
  }

  // ── Set as Default Address ────────────────────────────────────────────────
  const handleSetDefault = async (id) => {
    try {
      await apiSetDefaultSavedAddress(id)
      await loadAddresses()
      window.dispatchEvent(new Event('calservice_address_changed'))
    } catch (err) {
      console.error('Failed to set default address:', err)
      alert(err?.message || 'Failed to set default address.')
    }
  }

  // ── GPS Detection ─────────────────────────────────────────────────────────
  const handleUseCurrentLocation = () => {
    setGpsError('')
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }

    setIsDetectingGps(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))

        const initialObj = {
          id: null,
          formatted_address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          street_address: '',
          address_line1: '',
          flat_house_no: '',
          landmark: '',
          city: '',
          state: '',
          pincode: '',
          latitude: lat,
          longitude: lng,
          address_type: 'Home',
          location_source: 'gps',
          geocoding_status: 'verified'
        }

        try {
          const geoStr = await getAddress(lat, lng)
          if (geoStr) {
            initialObj.formatted_address = geoStr
          }
        } catch (_) {}

        setIsDetectingGps(false)
        setActiveLocationForMap(initialObj)
        setShowMapPicker(true)
      },
      (err) => {
        setIsDetectingGps(false)
        setGpsError(err.message || 'Unable to retrieve location.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // ── Open Map Directly ─────────────────────────────────────────────────────
  const handlePickOnMap = () => {
    handleAddNew()
  }

  // ── Select Address ────────────────────────────────────────────────────────
  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id)
    if (user?.id) {
      setCustomerSelectedAddress(user.id, addr)
      setCustomerLocation(user.id, addr.formatted_address || addr.address_line1 || '')
    }
    window.dispatchEvent(new Event('calservice_address_changed'))
    if (typeof onSelectAddress === 'function') {
      onSelectAddress(addr)
    }
    if (typeof onClose === 'function') {
      onClose()
    }
  }

  // ── Handle Confirmation from Map Picker ───────────────────────────────────
  const handleMapConfirm = () => {
    setShowMapPicker(false)
    setEditingAddress(null)
    setActiveLocationForMap(null)
    loadAddresses()
    window.dispatchEvent(new Event('calservice_address_changed'))
  }

  return (
    <div className="w-full font-sans text-slate-800 space-y-5 max-w-2xl mx-auto">
      {/* Header Bar matching Image 2 */}
      <div className="pb-2 border-b border-slate-100">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00875A]" />
          Select Service Address
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Where would you like our service expert to arrive?
        </p>
      </div>

      {/* Search Input matching Image 2 */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search area, apartment, street name..."
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/20 transition-all shadow-2xs"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 w-4 h-4 animate-spin text-[#00875A]" />
          )}
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100">
            {searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setActiveLocationForMap(item)
                  setShowMapPicker(true)
                }}
                className="p-3.5 hover:bg-emerald-50/60 cursor-pointer transition-colors flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-[#00875A] shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {item.formatted_address}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action 1: Use Current Location (GPS) Card matching Image 2 */}
      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#00875A] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Navigation className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">Use Current Location</span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                GPS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Enable device location for precise doorstep arrival
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isDetectingGps}
          className="px-4 py-2 bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
        >
          {isDetectingGps ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Detect'
          )}
        </button>
      </div>

      {gpsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Action 2: Pick on Map Card matching Image 2 */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900">Pick on Map</div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Drag pin &amp; set exact building location
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePickOnMap}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
        >
          Open Map
        </button>
      </div>

      {/* SAVED ADDRESSES (N) Section Header matching Image 2 */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-[#00875A]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            SAVED ADDRESSES ({savedAddresses.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="text-xs font-extrabold text-[#00875A] hover:text-[#00704A] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add New</span>
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAddresses}
            className="text-xs text-rose-700 underline font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Saved Address Cards List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00875A]" />
          <p className="text-xs font-semibold">Loading addresses...</p>
        </div>
      ) : savedAddresses.length === 0 ? (
        <div className="py-10 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MapPin size={22} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-slate-800">No saved addresses yet</h4>
            <p className="text-xs text-slate-500">
              Add your address for fast service booking and accurate arrival.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddNew}
            className="px-4 py-2 bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Address Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {savedAddresses.map((addr) => {
            const isSelected = selectedAddressId && Number(selectedAddressId) === Number(addr.id)
            return (
              <BookingAddressCard
                key={addr.id}
                address={addr}
                isSelected={isSelected}
                onSelect={handleSelectAddress}
                onEdit={() => handleEdit(addr)}
                onDelete={() => handleDelete(addr.id)}
              />
            )
          })}
        </div>
      )}

      {/* Bottom Sticky "+ ADD NEW SERVICE ADDRESS" button matching Image 2 */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleAddNew}
          className="w-full py-3.5 bg-[#00875A] hover:bg-[#00704A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>ADD NEW SERVICE ADDRESS</span>
        </button>
      </div>

      {/* Map Picker Modal for Add / Edit / Re-pin */}
      {showMapPicker && (
        <MapPickerScreen
          initialLocation={activeLocationForMap}
          initialCoords={
            activeLocationForMap?.latitude && activeLocationForMap?.longitude
              ? { lat: activeLocationForMap.latitude, lng: activeLocationForMap.longitude }
              : { lat: 12.754598, lng: 77.834477 }
          }
          initialFlat={activeLocationForMap?.flat_house_no || ''}
          initialLandmark={activeLocationForMap?.landmark || ''}
          onClose={() => {
            setShowMapPicker(false)
            setEditingAddress(null)
            setActiveLocationForMap(null)
          }}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  )
}
