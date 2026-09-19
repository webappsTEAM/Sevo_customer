import React, { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useSearchParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Shield, Clock, Wrench, ShieldCheck, CheckCircle2,
  Settings, Home, MapPin, ChevronRight, Info, Check,
  Sparkles, Award, Tag, Headphones, ArrowRight, X,
  Layers, Star, ChevronLeft, SlidersHorizontal, AlertCircle,
  Trash2, Calculator, Calendar
} from "lucide-react"
import { resolveImageUrl } from "../../utils/imageUrl.js"
import { apiRequest } from "../../api/client.js"
import { useEditMode } from "../../state/editMode/useEditMode.js"
import { EditableText, EditableImage } from "./SuperAdminEditControls.jsx"
import { getCustomerSelectedAddress } from "../../utils/customerLocationStorage.js"

// Feature icons map for dynamic icon resolution
const SERVICE_ICON_MAP = {
  ac: Wrench,
  hvac: Wrench,
  heating: Wrench,
  geyser: Wrench,
  heater: Wrench,
  purifier: Sparkles,
  ro: Sparkles,
  water: Sparkles,
  cleaning: Sparkles,
  fridge: Wrench,
  refrigerator: Wrench,
  painting: Layers,
  paint: Layers,
  pest: Shield,
  mason: Home,
  plumb: Wrench,
  elec: Wrench,
  wash: Sparkles,
  micro: Wrench,
  tv: Layers,
  room: Home,
  sofa: Sparkles,
  carpet: Sparkles,
  curtain: Sparkles,
  bath: Sparkles,
  kitchen: Sparkles,
  chimney: Wrench,
  drain: Wrench,
}

function resolveServiceIcon(name = "") {
  const n = (name || "").toLowerCase()
  for (const [k, Icon] of Object.entries(SERVICE_ICON_MAP)) {
    if (n.includes(k)) return Icon
  }
  return Wrench
}

function getCategorySymptomGuide(category) {
  const k = (category?.slug || category?.id || category?.name || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "")
  if (k.includes("ac") || k.includes("hvac") || k.includes("appliance")) {
    return {
      prompt: "What's wrong?",
      subtitle: "Select your issue to find the exact diagnostic or maintenance package",
      symptoms: [
        { label: "❄️ AC Service & Gas", subtabQuery: "AC Service & Cleaning", keywords: ["ac service", "cleaning", "foam", "gas", "power jet"] },
        { label: "🔧 AC Diagnostics & Repair", subtabQuery: "AC Repair & Diagnostics", keywords: ["repair", "diagnostic", "cooling", "leak"] },
        { label: "⚡ Geyser / Water Heater", subtabQuery: "Geyser & Water Heater", keywords: ["geyser", "water heater", "heating", "thermostat"] },
        { label: "💧 RO Water Purifier", subtabQuery: "Water Purifier RO", keywords: ["water purifier", "ro", "filter", "tds"] },
        { label: "🧺 Washing Machine", subtabQuery: "Washing Machine", keywords: ["washing machine", "drain", "spin"] },
        { label: "🧊 Refrigerator", subtabQuery: "Refrigerator", keywords: ["refrigerator", "fridge", "freezer"] },
        { label: "📦 Install / Uninstall", subtabQuery: "Installation & Uninstallation", keywords: ["install", "uninstall"] },
      ]
    }
  }
  if (k.includes("clean") || k.includes("pest")) {
    return {
      prompt: "What do you need?",
      subtitle: "Choose the area that requires professional deep sanitization",
      symptoms: [
        { label: "🛁 Bathroom & Weekly Plans", subtabQuery: "Bathroom Cleaning", keywords: ["bathroom", "washroom", "weekly", "limescale"] },
        { label: "🍳 Kitchen & Appliances", subtabQuery: "Kitchen Cleaning", keywords: ["kitchen", "chimney", "appliance", "fridge", "stove"] },
        { label: "🛋️ Sofa, Carpet & Curtains", subtabQuery: "Sofa, Carpet & Upholstery Cleaning", keywords: ["sofa", "carpet", "curtain", "upholstery", "stain"] },
        { label: "🪟 Windows, Balcony & Room Care", subtabQuery: "Room Care & Mini Services", keywords: ["room", "window", "balcony", "living room", "bedroom", "fan"] },
        { label: "🏠 Full Home Deep Clean", subtabQuery: "Full Home Deep Cleaning", keywords: ["full home", "house", "deep clean", "villa", "apartment"] },
        { label: "🪳 Pest Control", subtabQuery: "Pest Control", keywords: ["pest", "cockroach", "termite", "bed bug"] },
      ]
    }
  }
  if (k.includes("paint")) {
    return {
      prompt: "What do you need?",
      subtitle: "Book laser measurement consultation or room repainting",
      symptoms: [
        { label: "🏠 Interior painting", subtabQuery: "Interior Painting", keywords: ["interior"] },
        { label: "🏢 Exterior painting", subtabQuery: "Exterior Painting", keywords: ["exterior"] },
        { label: "💧 Waterproofing", subtabQuery: "Waterproofing", keywords: ["waterproofing", "damp", "seepage"] },
        { label: "🪵 Wood & metal painting", subtabQuery: "Wood & Metal", keywords: ["wood", "metal", "enamel"] },
      ]
    }
  }
  if (k.includes("mason")) {
    return {
      prompt: "What do you need?",
      subtitle: "Verified expert masons with laser measurements",
      symptoms: [
        { label: "🧱 Tile fixing", subtabQuery: "Tile Work", keywords: ["tile", "fixing", "laying"] },
        { label: "🔨 Minor masonry work", subtabQuery: "Masonry Repair", keywords: ["masonry", "repair", "plaster", "wall"] },
      ]
    }
  }
  if (k.includes("transport") || k.includes("goods") || k.includes("truck") || k.includes("logistics")) {
    return {
      prompt: "What do you need?",
      subtitle: "Doorstep transport with verified drivers and live GPS tracking",
      symptoms: [
        { label: "🚚 Move goods", route: "/trucks/hosur", keywords: ["truck", "goods"] },
        { label: "📦 Send a package", route: "/two-wheelers/hosur", keywords: ["courier", "package"] },
        { label: "🏠 Shift home", route: "/packers-and-movers/hosur", keywords: ["packers", "shift", "movers"] },
        { label: "🛵 Two-wheeler delivery", route: "/two-wheelers/hosur", keywords: ["bike", "delivery"] },
      ]
    }
  }
  if (k.includes("elec") || k.includes("plumb") || k.includes("carpent") || k.includes("maint")) {
    return {
      prompt: "What needs fixing?",
      subtitle: "Verified doorstep technicians, upfront rates & 30-day rework warranty",
      symptoms: [
        { label: "⚡ Switch / Socket / MCB", subtabQuery: "Electrician", keywords: ["switch", "socket", "mcb", "electric", "wiring"] },
        { label: "🚰 Tap / Leak / Drain", subtabQuery: "Plumber", keywords: ["tap", "leak", "drain", "plumbing", "sink"] },
        { label: "🚪 Door lock / Carpentry", subtabQuery: "Carpenter", keywords: ["door", "lock", "carpenter", "handle", "wood"] },
        { label: "🌀 Fan installation", subtabQuery: "Electrician", keywords: ["fan", "regulator", "installation"] },
      ]
    }
  }
  return null
}

export function ModernServiceCatalogView({
  category: categoryProp,
  cart = [],
  setCart,
  packagesData = {},
  onCheckout,
  onClose,
  displayLocationText = "Select Location",
  onOpenAddressPicker,
  brandName = "SEVO"
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSubService, setActiveSubService] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [detailsPackage, setDetailsPackage] = useState(null) // package currently shown in the "See details" modal

  // categoryProp (from LandingPage's URL-based lookup against the old static
  // categoriesData.js list) almost never matches a real category for
  // anything created in the admin catalog -- that static list only has
  // ~14 hardcoded legacy ids (hvac, cleaning, pest_control, ...) and none of
  // them are "ac_appliance" or "home_pest_control" etc, so LandingPage falls
  // back to a fake { id: <url-slug>, name: <url-slug> } object with no real
  // database id/slug at all. Filtering Services/Packages against that fake
  // id always returned zero matches. liveCategory is the REAL CatalogCategory
  // row (fetched below by matching the url slug against the live catalog),
  // and once resolved it takes over as the source of truth for both
  // filtering and display (name/image/description), while categoryProp
  // still covers the instant before that fetch resolves.
  const [liveCategory, setLiveCategory] = useState(null)
  const category = liveCategory || categoryProp

  // Trade detection: Painting and Masonry follow a Site Consultation & Laser Measurement
  // workflow where base_price is a rate-card unit rate (e.g. ₹18/sq.ft) and initial booking
  // is for an on-site consultation & inspection visit.
  const isConsultationCategory = useMemo(() => {
    const k = (categoryProp?.slug || categoryProp?.id || categoryProp?.name || category?.slug || category?.id || category?.name || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "")
    return k.includes("paint") || k.includes("mason")
  }, [categoryProp, category])

  // Geofencing consultation fee from Hosur center (12.7409, 77.8253):
  // Distance <= 15 km -> Fee: ₹0 (FREE), Convenience Fee: ₹0, GST: ₹0
  // Distance > 15 km -> Fee: ₹300, Convenience Fee: ₹0, GST: ₹0, Total: ₹300
  const consultationFeeDetails = useMemo(() => {
    if (!isConsultationCategory) return { fee: 0, isOver15km: false, distanceKm: 0, convenienceFee: 0, gst: 0, total: 0 }
    let lat = 12.7409
    let lng = 77.8253
    try {
      const saved = getCustomerSelectedAddress()
      if (saved?.latitude && saved?.longitude) {
        lat = parseFloat(saved.latitude)
        lng = parseFloat(saved.longitude)
      }
    } catch (e) {}

    const R = 6371 // km
    const dLat = (lat - 12.7409) * Math.PI / 180
    const dLon = (lng - 77.8253) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(12.7409 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distKm = R * c

    if (distKm > 15) {
      const baseFee = 300
      return {
        fee: baseFee,
        isOver15km: true,
        distanceKm: Math.round(distKm * 10) / 10,
        convenienceFee: 0,
        gst: 0,
        total: baseFee
      }
    }

    return {
      fee: 0,
      isOver15km: false,
      distanceKm: Math.round(distKm * 10) / 10,
      convenienceFee: 0,
      gst: 0,
      total: 0
    }
  }, [isConsultationCategory, displayLocationText])

  // Same shared Edit Mode switch as the homepage/checkout/service modals (see
  // main.jsx's EditModeProvider) -- when a Super Admin has it on (or opened
  // this page via the admin panel's Edit Preview iframe), package name,
  // description, price and image become inline-editable right here on the
  // live catalog page instead of only being changeable from the admin panel.
  const { isEditMode: serviceEditMode } = useEditMode()

  const handleSaveServiceField = async (item, field, value) => {
    if (!item?.id) return
    try {
      await apiRequest(`/settings/catalog/v2/packages/${item.id}/`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      })
      const patch = (p) => (p && p.id === item.id ? { ...p, [field]: value } : p)
      setPackages(prev => prev.map(patch))
      setSelectedPackage(prev => patch(prev))
      setDetailsPackage(prev => patch(prev))
    } catch (err) {
      console.error("Failed to save package field:", err)
    }
  }

  const symptomGuide = useMemo(() => getCategorySymptomGuide(category), [category])

  const handleSymptomClick = (sym) => {
    if (sym.route) {
      navigate(sym.route)
      return
    }
    if (services && services.length > 0) {
      const found = services.find(s => {
        const sName = (s.name || "").toLowerCase()
        return (sym.keywords || []).some(kw => sName.includes(kw.toLowerCase())) ||
               (sym.subtabQuery && sName.includes(sym.subtabQuery.toLowerCase()))
      })
      if (found) {
        setActiveSubService(found)
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          next.set("subtab", found.name)
          next.set("subTab", found.name)
          return next
        }, { replace: true })
      }
    }
  }

  // Multi-item cart: any number of units of any package, across any service
  // or category, can be queued up before checkout -- replaces the old
  // single "selectedPackage = the one thing being booked" model. Uses the
  // cart/setCart the parent (LandingPage) already threads through for its
  // shared shopping cart when provided; falls back to local state so this
  // component still works standalone if a parent doesn't wire it up.
  const [localCart, setLocalCart] = useState([])
  const cartItems = Array.isArray(cart) ? cart : localCart
  const updateCart = typeof setCart === "function" ? setCart : setLocalCart

  // Keep consultation cart items dynamically in sync with distance and geofenced fee
  useEffect(() => {
    if (!isConsultationCategory) return
    updateCart((prev) => {
      const list = Array.isArray(prev) ? prev : []
      let hasChanged = false
      const next = list.map(item => {
        if (item.is_consultation || (item.name && item.name.includes("(Site Consultation"))) {
          const targetPrice = consultationFeeDetails.fee
          const targetFee = consultationFeeDetails.convenienceFee
          const targetGst = consultationFeeDetails.gst
          if (item.price !== targetPrice || item.platform_fee !== targetFee || item.gst !== targetGst) {
            hasChanged = true
            return {
              ...item,
              price: targetPrice,
              platform_fee: targetFee,
              gst: targetGst
            }
          }
        }
        return item
      })
      return hasChanged ? next : prev
    })
  }, [consultationFeeDetails, isConsultationCategory])

  const getCartQty = (pkg) => cartItems.find(it => it.db_id === pkg.id)?.quantity || 0

  const setCartQty = (pkg, qty) => {
    const offer = parseFloat(pkg.offer_price)
    const base = parseFloat(pkg.base_price)
    const unitPrice = (!isNaN(offer) && offer > 0 && offer < base) ? offer : (!isNaN(base) ? base : 0)

    updateCart((prev) => {
      const list = Array.isArray(prev) ? prev : []
      const idx = list.findIndex(it => it.db_id === pkg.id)
      if (qty <= 0) {
        return idx === -1 ? list : list.filter((_, i) => i !== idx)
      }

      if (isConsultationCategory) {
        const consultItem = {
          id: `pkg-${pkg.id}`,
          db_id: pkg.id,
          name: `${pkg.name} (Site Consultation)`,
          price: consultationFeeDetails.fee,
          platform_fee: consultationFeeDetails.convenienceFee,
          gst: consultationFeeDetails.gst,
          unit_rate: unitPrice,
          unit_rate_display: `₹${unitPrice}/sq.ft`,
          duration: pkg.duration || "45 mins",
          quantity: 1,
          is_consultation: true,
          image: pkg.image || activeSubService?.image || category?.image || "",
          category_id: category?.id,
          category_name: category?.name,
          service_id: activeSubService?.id,
          service_name: activeSubService?.name,
        }
        if (idx === -1) return [...list, consultItem]
        const next = [...list]
        next[idx] = consultItem
        return next
      }

      const item = {
        id: `pkg-${pkg.id}`,
        db_id: pkg.id,
        name: pkg.name,
        price: unitPrice,
        platform_fee: parseFloat(pkg.platform_fee) || 29,
        duration: pkg.duration || "1 hr",
        quantity: qty,
        image: pkg.image || activeSubService?.image || category?.image || "",
        category_id: category?.id,
        category_name: category?.name,
        service_id: activeSubService?.id,
        service_name: activeSubService?.name,
      }
      if (idx === -1) return [...list, item]
      const next = [...list]
      next[idx] = item
      return next
    })
    setSelectedPackage(pkg) // keep the hero spotlight card showing whatever was just touched
  }

  const addToCart = (pkg) => setCartQty(pkg, getCartQty(pkg) + 1)
  const incrementCartItem = (pkg) => setCartQty(pkg, getCartQty(pkg) + 1)
  const decrementCartItem = (pkg) => setCartQty(pkg, getCartQty(pkg) - 1)

  // Adjusts quantity for a line already sitting in the cart (used by the
  // Booking Summary list), by its cart line id -- keeps the item's stored
  // unit price as-is instead of recomputing it from a partial package object.
  const setCartLineQty = (dbId, qty) => {
    updateCart((prev) => {
      const list = Array.isArray(prev) ? prev : []
      if (qty <= 0) return list.filter(it => it.db_id !== dbId)
      return list.map(it => it.db_id === dbId ? { ...it, quantity: qty } : it)
    })
  }

  // Smart route forwarding for Goods & Transport packages to dedicated booking flows
  const handleGoodsTransportProceed = (pkg) => {
    const pkgName = (pkg?.name || "").toLowerCase()
    const pkgSlug = (pkg?.slug || "").toLowerCase()
    const subName = (activeSubService?.name || "").toLowerCase()
    const subSlug = (activeSubService?.slug || "").toLowerCase()

    if (
      subSlug.includes("2_wheeler") ||
      subSlug.includes("two_wheeler") ||
      subName.includes("2-wheeler") ||
      subName.includes("bike") ||
      pkgSlug.includes("bike") ||
      pkgSlug.includes("scooter") ||
      pkgName.includes("bike") ||
      pkgName.includes("scooter")
    ) {
      navigate("/two-wheelers/hosur")
      return
    }

    if (
      subSlug.includes("packers") ||
      subName.includes("packers") ||
      pkgSlug.includes("shifting") ||
      pkgSlug.includes("packers") ||
      pkgName.includes("shifting") ||
      pkgName.includes("packers")
    ) {
      navigate("/packers-and-movers/hosur")
      return
    }

    // Default to Mini Truck Hosur specialized booking page
    navigate("/trucks/hosur")
  }

  const getLogisticsButtonText = (pkg) => {
    const pkgName = (pkg?.name || "").toLowerCase()
    const subName = (activeSubService?.name || "").toLowerCase()
    if (subName.includes("packers") || pkgName.includes("shifting")) return "Book Shifting"
    if (subName.includes("2-wheeler") || pkgName.includes("bike") || pkgName.includes("scooter")) return "Book Delivery"
    return "Book Vehicle"
  }

  const cartTotalQty = cartItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
  const cartSubtotal = cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
  // For consultation categories, convenience fee and GST apply only when beyond 15 km
  const cartConvenienceFee = isConsultationCategory
    ? (cartItems.length > 0 ? consultationFeeDetails.convenienceFee : 0)
    : cartItems.reduce((sum, it) => sum + (Number(it.platform_fee) || 29), 0)
  const cartGst = isConsultationCategory
    ? (cartItems.length > 0 ? consultationFeeDetails.gst : 0)
    : 0
  const cartTotal = cartSubtotal + cartConvenienceFee + cartGst

  const rawCatKey = (categoryProp?.id || categoryProp?.slug || categoryProp?.name || "").toString().toLowerCase()
  // Strips everything except letters/digits so "ac_appliance" (url slug),
  // "ac-appliance" (a hyphenated db slug) and "AC & Appliance" (the db
  // display name) all normalize to the same "acappliance" key.
  const normKey = (v) => (v || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "")

  const CATEGORY_ALIASES = {
    hvac: "ac_appliance",
    ac: "ac_appliance",
    ac_heating: "ac_appliance",
    appliance: "ac_appliance",
    appliance_repair: "ac_appliance",
    ac_appliance: "ac_appliance",
    geyser: "ac_appliance",
    water_heater: "ac_appliance",
    water_purifier: "ac_appliance",
    ro: "ac_appliance",
    cleaning: "home_pest_control",
    home_cleaning: "home_pest_control",
    pest_control: "home_pest_control",
    pest: "home_pest_control",
    home_pest_control: "home_pest_control",
    home_services: "home_pest_control",
    sofa_cleaning: "home_pest_control",
    kitchen_cleaning: "home_pest_control",
    bathroom_cleaning: "home_pest_control",
    room_care: "home_pest_control",
    room_care_mini_services: "home_pest_control",
    mini_services: "home_pest_control",
    balcony_cleaning: "home_pest_control",
    window_cleaning: "home_pest_control",
    plumbing: "electrician_plumbing_carpentry",
    electrical: "electrician_plumbing_carpentry",
    carpentry: "electrician_plumbing_carpentry",
    electrician: "electrician_plumbing_carpentry",
    plumber: "electrician_plumbing_carpentry",
    carpenter: "electrician_plumbing_carpentry",
    electrician_plumbing_carpentry: "electrician_plumbing_carpentry",
    painting: "paintings",
    paintings: "paintings",
    paint: "paintings",
    mason: "mason",
    masonry: "mason",
    goods: "goods_transports",
    transport: "goods_transports",
    logistics: "goods_transports",
    goods_transport: "goods_transports",
    goods_transports: "goods_transports",
    trucks: "goods_transports",
    two_wheelers: "goods_transports",
    packers_movers: "goods_transports",
    vegetables: "vegetables_groceries",
    groceries: "vegetables_groceries",
    vegetables_groceries: "vegetables_groceries",
  }

  // AC & Appliance has a special, not-from-admin "Book AC Inspection /
  // Estimation" flow (a real standalone booking page at /ac-inspection,
  // built around ACDetailsForm + estimationRepository) that isn't a normal
  // catalog Service/Package, so it can't come from the DB-driven `services`
  // fetch below -- it's shown as an extra hardcoded entry in the Services
  // sidebar only for this one category, same as before ModernServiceCatalogView
  // replaced the old catalog page.
  const isAcApplianceCategory = ["acappliance", "hvac", "ac", "appliance", "appliancerepair"].includes(normKey(category?.slug || category?.name || category?.id))

  // Goods & Transport gets a purely visual "vehicle card" treatment for its
  // package list (image, capacity badge, spec lines, "Starting from ₹X",
  // Know More + Proceed to Booking) matching the look of the existing
  // MiniTruckBookingHosurPage.jsx (routed at /trucks) -- same underlying
  // data/handlers as every other category (real packages, same See-details
  // modal, same add-to-cart/stepper), just re-skinned for this one category.
  const isGoodsTransportCategory = ["goodstransports", "goodstransport", "goods", "transport", "logistics", "trucks"].includes(normKey(category?.slug || category?.name || category?.id))

  // 1. Fetch live sub-services and catalog packages for this category
  useEffect(() => {
    let cancelled = false
    async function loadCategoryCatalog() {
      setLoading(true)
      try {
        // Fetch all packages, all services, and the real category list --
        // resolving the true CatalogCategory row (by matching the url slug
        // against it) is what fixes the "categoryProp has no real id" gap
        // explained above.
        const [svcRes, subRes, catRes] = await Promise.all([
          apiRequest("/catalog/services/"),
          apiRequest("/catalog/sub-services/"),
          apiRequest("/catalog/categories/"),
        ])

        if (cancelled) return

        let allPkgs = []
        if (svcRes?.success && Array.isArray(svcRes.data)) {
          allPkgs = svcRes.data
        }

        let allSubs = []
        if (subRes?.success && Array.isArray(subRes.data)) {
          allSubs = subRes.data
        }

        let allCats = []
        if (catRes?.success && Array.isArray(catRes.data)) {
          allCats = catRes.data
        }

        const aliasTarget = CATEGORY_ALIASES[rawCatKey] || CATEGORY_ALIASES[normKey(rawCatKey)] || rawCatKey

        // 1. Direct match on slug, name, or id (including normalized and alias)
        let realCat = allCats.find(c =>
          normKey(c.slug) === normKey(aliasTarget) ||
          normKey(c.name) === normKey(aliasTarget) ||
          String(c.id) === String(aliasTarget) ||
          normKey(c.slug) === normKey(rawCatKey) ||
          normKey(c.name) === normKey(rawCatKey) ||
          String(c.id) === String(rawCatKey)
        ) || null

        // 2. If not matched, check if rawCatKey matches a service (e.g. "kitchen_cleaning", "fridge", "bathroom-cleaning")
        let initialSubFromCatKey = null
        if (!realCat && allSubs.length > 0) {
          const matchedService = allSubs.find(s =>
            normKey(s.slug) === normKey(rawCatKey) ||
            normKey(s.name) === normKey(rawCatKey) ||
            (rawCatKey.length > 3 && normKey(s.slug).includes(normKey(rawCatKey))) ||
            (rawCatKey.length > 3 && normKey(rawCatKey).includes(normKey(s.slug)))
          )
          if (matchedService) {
            initialSubFromCatKey = matchedService
            realCat = allCats.find(c =>
              String(c.id) === String(matchedService.category) ||
              (matchedService.category_slug && normKey(c.slug) === normKey(matchedService.category_slug))
            ) || null
          }
        }

        // 3. Substring / fuzzy match on category name or slug (e.g. "painting" matches "paintings", "pest" matches "home_pest_control")
        if (!realCat) {
          realCat = allCats.find(c =>
            (normKey(c.slug).length > 3 && normKey(rawCatKey).includes(normKey(c.slug))) ||
            (normKey(rawCatKey).length > 3 && normKey(c.slug).includes(normKey(rawCatKey))) ||
            (normKey(c.name).length > 3 && normKey(rawCatKey).includes(normKey(c.name))) ||
            (normKey(rawCatKey).length > 3 && normKey(c.name).includes(normKey(rawCatKey)))
          ) || null
        }

        // 4. If still not matched, fallback to first category so user NEVER gets an empty screen
        if (!realCat && allCats.length > 0) {
          realCat = allCats[0]
        }

        if (!cancelled && realCat) setLiveCategory(realCat)
        const effectiveCat = realCat || category

        // Filter services for current category
        const categoryId = effectiveCat?.id?.toString()
        const categorySlug = (effectiveCat?.slug || "").toLowerCase()

        let matchedSubs = allSubs.filter(s => {
          const sCatId = s.category?.toString()
          const sCatSlug = (s.category_slug || "").toLowerCase()
          return sCatId === categoryId || (categorySlug && sCatSlug === categorySlug)
        })

        // Fallback: If no subservices explicitly linked in db, group packages by service_name
        if (matchedSubs.length === 0 && allPkgs.length > 0) {
          const catPkgs = allPkgs.filter(p => {
            const pCatId = p.category?.toString()
            const pCatSlug = (p.category_slug || "").toLowerCase()
            return pCatId === categoryId || (categorySlug && pCatSlug === categorySlug)
          })

          const serviceMap = new Map()
          catPkgs.forEach(p => {
            const sName = p.service_name || p.name
            if (!serviceMap.has(sName)) {
              serviceMap.set(sName, {
                id: p.service_id || p.id,
                name: sName,
                slug: p.service_slug || p.slug,
                description: p.service_description || p.description,
                image: p.service_image || p.image,
              })
            }
          })
          matchedSubs = Array.from(serviceMap.values())
        }

        // If still empty, create default service from category
        if (matchedSubs.length === 0) {
          matchedSubs = [{
            id: effectiveCat?.id || "default",
            name: effectiveCat?.name || "Services",
            slug: effectiveCat?.slug || "services",
            description: effectiveCat?.desc || effectiveCat?.description || "",
            image: effectiveCat?.image || ""
          }]
        }

        setServices(matchedSubs)
        setPackages(allPkgs)

        // Set initial active sub-service, respecting url subtab if provided
        const urlSubTab = searchParams.get("subtab") || searchParams.get("subTab")
        let initialSub = initialSubFromCatKey || matchedSubs[0]
        if (urlSubTab) {
          const found = matchedSubs.find(s =>
            normKey(s.name) === normKey(urlSubTab) ||
            normKey(s.slug) === normKey(urlSubTab) ||
            normKey(s.name).includes(normKey(urlSubTab)) ||
            normKey(urlSubTab).includes(normKey(s.slug))
          )
          if (found) initialSub = found
        }
        setActiveSubService(initialSub)

        // Find packages for initial sub-service
        const initialPkgs = allPkgs.filter(p =>
          String(p.service_id) === String(initialSub?.id) ||
          (initialSub?.name && p.service_name?.toLowerCase() === initialSub.name.toLowerCase()) ||
          (initialSub?.slug && p.service_slug?.toLowerCase() === initialSub.slug.toLowerCase())
        )

        if (initialPkgs.length > 0) {
          setSelectedPackage(initialPkgs[0])
        }
      } catch (err) {
        console.error("Failed to load catalog data for ModernServiceCatalogView:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCategoryCatalog()
    return () => { cancelled = true }
    // Keyed on the raw incoming prop (what actually changes when the user
    // navigates to a different category), not the derived `category`
    // (categoryProp || liveCategory) -- that derived value itself changes
    // once when liveCategory resolves inside this same effect, which would
    // otherwise immediately re-trigger a second, redundant fetch cycle.
  }, [categoryProp?.id, categoryProp?.slug, categoryProp?.name])

  // 2. Compute packages for the active sub-service
  const currentServicePackages = useMemo(() => {
    if (!activeSubService) return []
    const subId = activeSubService.id
    const subName = activeSubService.name
    const subSlug = activeSubService.slug

    const matched = packages.filter(p =>
      String(p.service_id) === String(subId) ||
      (subName && p.service_name?.toLowerCase() === subName.toLowerCase()) ||
      (subSlug && p.service_slug?.toLowerCase() === subSlug.toLowerCase())
    )

    if (matched.length > 0) return matched

    // Fallback: match by category if no service-specific packages
    return packages.filter(p =>
      String(p.category) === String(category?.id) ||
      (category?.slug && p.category_slug?.toLowerCase() === category.slug.toLowerCase())
    )
  }, [activeSubService, packages, category?.id, category?.slug])

  // Available Service Groups for the active service (from Service.customization.subtabs)
  const serviceGroups = useMemo(() => {
    const rawTabs = activeSubService?.customization?.subtabs
    if (!Array.isArray(rawTabs) || rawTabs.length <= 1) return []
    return rawTabs.filter(t => t && t.enabled !== false)
  }, [activeSubService])

  // Active Service Group key
  const urlGroup = searchParams.get("group") || searchParams.get("serviceGroup")
  const [activeGroupKey, setActiveGroupKey] = useState(urlGroup || "all")

  // Keep activeGroupKey in sync with active service and url
  useEffect(() => {
    if (serviceGroups.length > 1) {
      if (urlGroup && serviceGroups.some(g => g.id === urlGroup)) {
        setActiveGroupKey(urlGroup)
      } else if (activeGroupKey === "all" || !serviceGroups.some(g => g.id === activeGroupKey)) {
        setActiveGroupKey(serviceGroups[0].id)
      }
    } else {
      setActiveGroupKey("all")
    }
  }, [serviceGroups, urlGroup, activeSubService?.id])

  // Filtered packages by active service group
  const displayedPackages = useMemo(() => {
    if (!serviceGroups || serviceGroups.length <= 1 || activeGroupKey === "all") {
      return currentServicePackages
    }
    const filtered = currentServicePackages.filter(p => p.sub_service_key === activeGroupKey)
    return filtered.length > 0 ? filtered : currentServicePackages
  }, [currentServicePackages, serviceGroups, activeGroupKey])

  const handleSelectServiceGroup = (groupId) => {
    setActiveGroupKey(groupId)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (groupId && groupId !== "all") {
        next.set("group", groupId)
      } else {
        next.delete("group")
      }
      return next
    }, { replace: true })
  }

  // 3. Keep selectedPackage in sync with displayed packages
  useEffect(() => {
    if (displayedPackages.length > 0) {
      const alreadySelected = displayedPackages.find(p => p.id === selectedPackage?.id)
      if (!alreadySelected) {
        setSelectedPackage(displayedPackages[0])
      }
    } else if (currentServicePackages.length > 0) {
      setSelectedPackage(currentServicePackages[0])
    } else {
      setSelectedPackage(null)
    }
  }, [displayedPackages, currentServicePackages])

  // "What's Included" / "What You Need to Keep Ready" moved out of the
  // always-visible page body and into a per-package "See details" modal
  // (opened via detailsPackage below) -- these are now plain helpers that
  // take whichever package the modal is showing, instead of a useMemo tied
  // to the currently selected package card.
  const getReadyChecklist = (pkg) => {
    if (Array.isArray(pkg?.ready) && pkg.ready.length > 0) {
      return pkg.ready
    }
    // Dynamic universal service preparation guidelines (zero hardcoded specifics)
    return [
      "Ensure easy and clear access to the service area or appliance",
      "Keep surrounding workspace free of fragile items & valuables",
      "Ensure standard power switch and water supply are available if needed",
      "Share any specific past issues or observed symptoms with the specialist"
    ]
  }

  const getIncludesChecklist = (pkg) => {
    if (Array.isArray(pkg?.includes) && pkg.includes.length > 0) {
      return pkg.includes
    }
    return [
      "Comprehensive initial performance and safety diagnostics",
      "High-grade equipment & professional service execution",
      "Post-service operational test & cooling/functional verification",
      "Clean-up of work area and verified digital service sign-off"
    ]
  }

  const getExcludesChecklist = (pkg) => {
    if (Array.isArray(pkg?.excludes) && pkg.excludes.length > 0) {
      return pkg.excludes
    }
    return [
      "Spare parts, replacements & consumable components (billed as per rate card)",
      "Major piping, external scaffolding or civil masonry modifications",
      "Refrigerant gas top-up beyond basic diagnostic leak testing",
      "Repairs for pre-existing external physical casing damage"
    ]
  }

  const getPossibleCharges = (pkg) => {
    return [
      { item: "Spare parts / hardware replacement", fee: "As per SEVO standard rate card", note: "Approved with customer before installing" },
      { item: "Refrigerant gas top-up (if required)", fee: "Market transparent unit rate", note: "Only charged if pressure test requires it" },
      { item: "Height scaffolding above 10ft", fee: "₹150 height safety support", note: "Optional if customer provides ladder" },
    ]
  }

  const getWarrantyDetails = (pkg) => {
    return {
      duration: "30-Day Doorstep Guarantee",
      coverage: "Full service warranty covering service workmanship and diagnostic accuracy",
      revisit: "Free revisit within 30 days if the exact issue recurs"
    }
  }

  // Handle proceed to schedule -- checks out every item queued in the cart
  // (any quantity, any package, any service/category), not just one.
  const handleProceedToSchedule = () => {
    if (cartItems.length === 0) return

    if (typeof onCheckout === "function") {
      onCheckout(cartItems)
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-slate-800 pb-28 lg:pb-16">
      {/* ── 1. Top Breadcrumb & Category Hero Banner ── */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-6">
          {/* Breadcrumb - Compact on mobile */}
          <nav className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-slate-500 font-medium mb-1.5 sm:mb-3 overflow-x-auto scrollbar-none whitespace-nowrap">
            <button
              type="button"
              onClick={onClose}
              className="hover:text-emerald-700 transition-colors shrink-0"
            >
              Home
            </button>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
            <span className="hover:text-emerald-700 transition-colors shrink-0">Services</span>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-semibold truncate">{category?.name || "Services"}</span>
          </nav>

          {/* Hero Banner: Blinkit-style compact, responsive, fit-to-screen */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border border-emerald-100/70 shadow-xs">
            <div className="relative flex flex-col md:flex-row items-stretch">
              <div className="flex-1 min-w-0 p-3 sm:p-5 lg:p-7 flex flex-col justify-center gap-1 sm:gap-3">
                <h1 className="text-base sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {category?.name || "Professional Services"}
                </h1>
                <p className="text-[11px] sm:text-sm text-slate-600 font-normal leading-snug sm:leading-relaxed max-w-lg line-clamp-1 sm:line-clamp-2">
                  {category?.desc || category?.description || "Professional care for a cleaner, healthier and more comfortable space."}
                </p>

                {/* Trust Badge Strip: Blinkit-style sleek horizontal micro-pills on mobile, grid on desktop */}
                <div className="flex items-center gap-1.5 sm:gap-6 pt-1 sm:pt-2 overflow-x-auto scrollbar-none">
                  {[
                    { icon: ShieldCheck, label: "Verified Pros", label1: "Verified", label2: "Technicians" },
                    { icon: Clock, label: "On-time", label1: "On-time", label2: "Service" },
                    { icon: Wrench, label: "Genuine Spares", label1: "Genuine", label2: "Spare Parts" },
                    { icon: Tag, label: "Transparent Price", label1: "Transparent", label2: "Pricing" },
                  ].map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 sm:gap-2 px-2 py-0.5 sm:px-0 sm:py-0 rounded-full sm:rounded-none bg-white/90 sm:bg-transparent border border-emerald-100/80 sm:border-0 shrink-0 shadow-2xs sm:shadow-none"
                    >
                      <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-emerald-50 sm:bg-white sm:shadow-xs sm:border sm:border-emerald-100 flex items-center justify-center shrink-0">
                        <f.icon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                      </div>
                      <span className="sm:hidden text-[10px] font-bold text-slate-700 whitespace-nowrap leading-none">
                        {f.label}
                      </span>
                      <div className="hidden sm:block leading-tight">
                        <div className="text-[11px] font-black text-slate-800">{f.label1}</div>
                        <div className="text-[10px] font-medium text-slate-500">{f.label2}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Photo + Tagline */}
              <div className="relative hidden md:block md:w-[42%] shrink-0">
                {category?.image ? (
                  <img
                    src={resolveImageUrl(category.image)}
                    alt={category?.name || "Service banner"}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none" }}
                  />
                ) : (
                  <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-emerald-100/70 to-teal-100/70 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-emerald-600/70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-emerald-50/90" />
                <div className="absolute top-6 left-6 max-w-[180px]">
                  <div className="text-lg font-black text-slate-900 leading-tight drop-shadow-sm">
                    Trusted Care,
                  </div>
                  <div className="text-lg font-black text-emerald-700 leading-tight drop-shadow-sm">
                    Happier Living
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3 sm:mt-6">
        {/* ── Human-Language Symptom Discovery Guide ── */}
        {symptomGuide && (
          <div className="mb-4 sm:mb-5 p-3.5 sm:p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {symptomGuide.prompt}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 hidden sm:inline">
                  Instant Match
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {symptomGuide.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {symptomGuide.symptoms.map((sym, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleSymptomClick(sym)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 hover:border-emerald-500 border border-slate-200 text-slate-800 hover:text-emerald-900 text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 2/3. Main Layout: vertical Services sidebar + content + Booking Summary ── */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* ════ SERVICES SUBTABS (Mobile Horizontal Bar + Desktop Vertical Sidebar) ════ */}
          {services.length > 0 && !isGoodsTransportCategory && (
            <>
              {/* Mobile Horizontal Subservice Pill Tab Bar (Sticky on mobile, Blinkit style) */}
              <div className="lg:hidden w-full overflow-x-auto scrollbar-none py-1.5 sm:py-2 -mx-3 px-3 sm:mx-0 sm:px-0 flex items-center gap-1.5 sm:gap-2 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-20">
                {services.map(sub => {
                  const isSelected = activeSubService?.id === sub.id
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setActiveSubService(sub)
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev)
                          next.set("subtab", sub.name)
                          next.set("subTab", sub.name)
                          return next
                        }, { replace: true })
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs font-black"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {sub.image && (
                        <img
                          src={resolveImageUrl(sub.image)}
                          alt={sub.name}
                          className="w-4 h-4 object-contain rounded-full bg-white/80"
                        />
                      )}
                      <span>{sub.name}</span>
                    </button>
                  )
                })}
                {isAcApplianceCategory && (
                  <button
                    type="button"
                    onClick={() => navigate("/ac-inspection")}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Book Inspection</span>
                  </button>
                )}
              </div>

              {/* Desktop Vertical Services Sidebar */}
              <div className="hidden lg:flex lg:w-[240px] shrink-0 flex-col gap-1 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 pb-1">
                  Services
                </h3>
                {services.map(sub => {
                  const isSelected = activeSubService?.id === sub.id
                  const IconComp = resolveServiceIcon(sub.name)

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setActiveSubService(sub)
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev)
                          next.set("subtab", sub.name)
                          next.set("subTab", sub.name)
                          return next
                        }, { replace: true })
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-emerald-50/90 border-emerald-600 shadow-xs"
                          : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected ? "bg-white text-emerald-700 shadow-xs border border-emerald-200" : "bg-slate-50 text-slate-600"
                      }`}>
                        {sub.image ? (
                          <img
                            src={resolveImageUrl(sub.image)}
                            alt={sub.name}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`flex-1 min-w-0 text-xs leading-snug ${
                        isSelected ? "font-black text-emerald-900" : "font-bold text-slate-700"
                      }`}>
                        {sub.name}
                      </span>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />}
                    </button>
                  )
                })}

                {/* Special, not-from-admin "AC Inspection / Estimation" entry */}
                {isAcApplianceCategory && (
                  <button
                    type="button"
                    onClick={() => navigate("/ac-inspection")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 hover:bg-amber-50 transition-all cursor-pointer text-left"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-white text-amber-600 border border-amber-200 shadow-xs">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-black text-amber-900 leading-snug">
                        Not Sure? Book Inspection
                      </span>
                      <span className="block text-[10px] font-semibold text-amber-700">
                        Certified diagnostic visit
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}

          {/* ════ CONTENT + BOOKING SUMMARY ════ */}
          <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ════ LEFT COLUMN (~68% width / 8 cols) ════ */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-6">
            {/* Active Service Spotlight Card -- Blinkit-style compact, fit-to-screen */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs min-h-[110px] sm:min-h-[220px] lg:min-h-[280px] flex items-end">
              <img
                key={selectedPackage?.image || activeSubService?.image || category?.image}
                src={resolveImageUrl(selectedPackage?.image || activeSubService?.image || category?.image)}
                alt={selectedPackage?.name || "Service hero"}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&fit=crop"
                }}
              />
              {/* Dark scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />

              {/* Floating highlight badge */}
              <div className="hidden sm:flex absolute top-4 right-4 bg-white/95 backdrop-blur-xs rounded-xl px-3 py-1.5 shadow-md border border-slate-200/80 items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-slate-900 leading-tight">
                    {selectedPackage?.tag || "Top Rated Care"}
                  </div>
                  <div className="text-[9px] font-semibold text-emerald-700 leading-tight">
                    Guaranteed Quality
                  </div>
                </div>
              </div>

              {/* Text content, overlaid on the image */}
              <div className="relative z-10 p-3 sm:p-5 lg:p-7 w-full space-y-1 sm:space-y-2.5">
                {/* Category / Sub-service Tag */}
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-300">
                  <span className="w-1 h-2.5 sm:h-3.5 bg-emerald-400 rounded-full" />
                  <span>{activeSubService?.name || category?.name} PACKAGES</span>
                </div>

                {/* Spotlight Title */}
                <h2 className="text-base sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                  {selectedPackage?.name || activeSubService?.name}
                </h2>

                {/* Spotlight Description: hidden on mobile to avoid redundant repetition & save screen height */}
                {selectedPackage?.description && selectedPackage.description.toLowerCase() !== (selectedPackage.name || "").toLowerCase() && (
                  <p className="hidden sm:block text-xs sm:text-sm text-white/85 leading-relaxed max-w-xl line-clamp-1 sm:line-clamp-2">
                    {selectedPackage.description}
                  </p>
                )}

                {/* 4 Feature Badges: Blinkit-style compact inline micro-pills on mobile, grid on desktop */}
                <div className="flex sm:grid sm:grid-cols-4 items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2.5 border-t border-white/15 overflow-x-auto scrollbar-none max-w-xl">
                  {[
                    { icon: Shield, title: "Certified", sub: "Technicians", short: "Certified Pros" },
                    { icon: Clock, title: "Quick &", sub: "Hassle-free", short: "Quick & Easy" },
                    { icon: Wrench, title: "Genuine", sub: "Spares & Tools", short: "Genuine Tools" },
                    { icon: ShieldCheck, title: "Quality", sub: "Assurance", short: "Quality Assured" },
                  ].map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center sm:flex-col sm:items-center sm:text-center gap-1 sm:gap-0 px-2 py-0.5 sm:p-2 rounded-full sm:rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 shrink-0"
                    >
                      <b.icon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-300 sm:mb-1 shrink-0" />
                      <span className="sm:hidden text-[9px] font-bold text-white whitespace-nowrap leading-none">
                        {b.short}
                      </span>
                      <div className="hidden sm:block leading-tight">
                        <div className="text-[10px] font-black text-white leading-tight">{b.title}</div>
                        <div className="text-[9px] text-white/70 font-medium">{b.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Goods & Transport horizontal service pills -- replaces the
                vertical Services sidebar (hidden above for this category)
                so switching between Mini Truck / 2-Wheeler / Packers &
                Movers-style sub-services still works exactly the same way
                (same setActiveSubService/searchParams call), just laid out
                as a row instead of a side column. */}
            {isGoodsTransportCategory && services.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {services.map(sub => {
                  const isSelected = activeSubService?.id === sub.id
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setActiveSubService(sub)
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev)
                          next.set("subtab", sub.name)
                          next.set("subTab", sub.name)
                          return next
                        }, { replace: true })
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      {sub.name}
                    </button>
                  )
                })}
              </div>
            )}

            {/* "Choose a Package" Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {isGoodsTransportCategory ? "Choose Your Vehicle" : "Choose a Package"}
                  </h3>
                  {isGoodsTransportCategory && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Select the right vehicle for your goods
                    </p>
                  )}
                </div>
                {displayedPackages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsCompareModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Compare Packages</span>
                  </button>
                )}
              </div>

              {/* ── 3-Tier Service Group Navigation Bar (Category -> Service -> Service Group -> Package) ── */}
              {serviceGroups.length > 1 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                    {serviceGroups.map(group => {
                      const isSelected = activeGroupKey === group.id
                      const groupCount = currentServicePackages.filter(p => p.sub_service_key === group.id).length
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleSelectServiceGroup(group.id)}
                          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                            isSelected
                              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-slate-50"
                          }`}
                        >
                          <span>{group.label}</span>
                          {groupCount > 0 && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {groupCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => handleSelectServiceGroup("all")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                        activeGroupKey === "all"
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>All ({currentServicePackages.length})</span>
                    </button>
                  </div>

                  {/* Active Group Contextual Description Helper */}
                  {(() => {
                    const activeGroupObj = serviceGroups.find(g => g.id === activeGroupKey)
                    if (!activeGroupObj || !activeGroupObj.description) return null
                    return (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-snug">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium">{activeGroupObj.description}</span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Package List. Goods & Transport gets a "vehicle card" grid
                  (image up top, capacity/spec bullets, Starting-from price,
                  Know More + Proceed to Booking) matching the look of the
                  existing MiniTruckBookingHosurPage.jsx -- every other
                  category keeps the horizontal-row layout. Same underlying
                  data/handlers (getCartQty/addToCart/setDetailsPackage/etc)
                  either way, just a different skin. */}
              <div className={isGoodsTransportCategory
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-3.5"
              }>
                {displayedPackages.map(pkg => {
                  const qty = getCartQty(pkg)
                  const isSelected = qty > 0

                  // Real MRP/discount only -- base_price is the MRP, offer_price
                  // (when set by the admin and genuinely lower) is the selling
                  // price. No invented strike-through: if there's no real
                  // offer, the card just shows one price and no % badge.
                  const mrp = parseFloat(pkg.base_price)
                  const offer = parseFloat(pkg.offer_price)
                  const hasOffer = !isNaN(offer) && offer > 0 && !isNaN(mrp) && offer < mrp
                  const finalPrice = hasOffer ? offer : (!isNaN(mrp) ? mrp : 0)
                  const discountPct = hasOffer ? Math.round((1 - offer / mrp) * 100) : 0

                  if (isGoodsTransportCategory) {
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative rounded-2xl border-2 flex flex-col p-4 transition-all cursor-pointer ${
                          pkg.popular
                            ? "border-emerald-500 bg-emerald-50/50"
                            : isSelected
                              ? "border-emerald-600 bg-white shadow-xs ring-1 ring-emerald-500/30"
                              : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs"
                        }`}
                      >
                        {pkg.popular && (
                          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                            Most Booked
                          </div>
                        )}

                        {/* Vehicle photo */}
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-white border border-slate-100 flex items-center justify-center mb-3" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          {serviceEditMode && pkg.id ? (
                            <EditableImage
                              active={true}
                              value={pkg.image}
                              alt={pkg.name}
                              assetType="services"
                              className="w-full h-full"
                              imgClassName="w-full h-full object-contain p-2"
                              onSave={(v) => handleSaveServiceField(pkg, "image", v)}
                            />
                          ) : pkg.image ? (
                            <img
                              src={resolveImageUrl(pkg.image)}
                              alt={pkg.name}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80&fit=crop";
                              }}
                            />
                          ) : (
                            <Wrench className="w-8 h-8 text-emerald-700" />
                          )}
                        </div>

                        {/* Name + capacity badge */}
                        <div className="flex items-center gap-2 flex-wrap pr-16" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          <h4 className="text-sm font-black text-slate-900 leading-snug">
                            {serviceEditMode && pkg.id ? (
                              <EditableText active={true} value={pkg.name} onSave={(v) => handleSaveServiceField(pkg, "name", v)} />
                            ) : (
                              pkg.name
                            )}
                          </h4>
                          {pkg.tag && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                              {pkg.tag}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 font-normal line-clamp-2 leading-relaxed mt-1.5" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          {serviceEditMode && pkg.id ? (
                            <EditableText active={true} value={pkg.description} multiline onSave={(v) => handleSaveServiceField(pkg, "description", v)} />
                          ) : (
                            pkg.short_description || pkg.description || "Reliable doorstep pickup & delivery."
                          )}
                        </p>

                        {/* Spec bullets -- only real data, nothing fabricated */}
                        <div className="space-y-1.5 mt-2.5">
                          {pkg.tag && (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                              <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{pkg.tag}</span>
                            </div>
                          )}
                          {pkg.duration && (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{pkg.duration}</span>
                            </div>
                          )}
                        </div>

                        {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                          <div className="space-y-1 mt-2.5">
                            {pkg.includes.slice(0, 2).map((inc, i) => {
                              const text = typeof inc === "object" ? (inc.text || inc.name || "") : String(inc || "")
                              if (!text) return null
                              return (
                                <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{text}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Starting from
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-slate-900">
                              {serviceEditMode && pkg.id ? (
                                <EditableText active={true} type="number" prefix="₹" value={pkg.base_price} onSave={(v) => handleSaveServiceField(pkg, "base_price", v)} />
                              ) : (
                                `₹${finalPrice.toLocaleString("en-IN")}`
                              )}
                            </span>
                            {hasOffer && (
                              <>
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  {discountPct}% OFF
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Know More + Proceed to Booking */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setDetailsPackage(pkg)
                            }}
                            className="flex-1 py-2 px-3 rounded-xl font-bold text-xs border border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            Know More
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGoodsTransportProceed(pkg)
                            }}
                            className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>{getLogisticsButtonText(pkg)}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative rounded-2xl border-2 bg-white transition-all p-3.5 sm:p-5 cursor-pointer ${
                        isSelected
                          ? "border-emerald-600 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      {pkg.popular && (
                        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-400 text-amber-950 text-[9px] sm:text-[10px] font-black shadow-sm">
                          Popular
                        </div>
                      )}

                      {/* ── DESKTOP LAYOUT (>= sm: 640px) ── */}
                      <div className="hidden sm:flex flex-row gap-4">
                        {/* Package Image */}
                        <div className="w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-slate-100" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          {serviceEditMode && pkg.id ? (
                            <EditableImage
                              active={true}
                              value={pkg.image}
                              alt={pkg.name}
                              assetType="services"
                              className="w-full h-full"
                              imgClassName="w-full h-full object-cover"
                              onSave={(v) => handleSaveServiceField(pkg, "image", v)}
                            />
                          ) : pkg.image ? (
                            <img
                              src={resolveImageUrl(pkg.image)}
                              alt={pkg.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                              <Wrench className="w-8 h-8 text-emerald-700" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-base font-black text-slate-900 leading-snug" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                              {serviceEditMode && pkg.id ? (
                                <EditableText active={true} value={pkg.name} onSave={(v) => handleSaveServiceField(pkg, "name", v)} />
                              ) : (
                                pkg.name
                              )}
                            </h4>
                          </div>

                          {/* Key Metrics */}
                          <div className="flex flex-wrap items-center gap-2 text-xs py-0.5">
                            <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              {pkg.duration || "45–60 min"}
                            </span>
                            {Boolean(pkg.rating || (category?.rating && category.rating !== "4.8")) && (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                {pkg.rating || category.rating} {pkg.reviews_count ? `(${pkg.reviews_count})` : (category.reviews_count ? `(${category.reviews_count})` : "")}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              30-Day Guarantee
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 font-normal line-clamp-2 leading-relaxed" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                            {serviceEditMode && pkg.id ? (
                              <EditableText active={true} value={pkg.description} multiline onSave={(v) => handleSaveServiceField(pkg, "description", v)} />
                            ) : (
                              pkg.short_description || pkg.description || "Comprehensive service with certified pro execution."
                            )}
                          </p>

                          {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                            <div className="space-y-1 pt-1 pb-0.5">
                              {pkg.includes.slice(0, 3).map((inc, i) => {
                                const text = typeof inc === "object" ? (inc.text || inc.name || "") : String(inc || "")
                                if (!text) return null
                                return (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{text}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setDetailsPackage(pkg)
                            }}
                            className="relative z-10 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer mt-1"
                          >
                            <Info className="w-3.5 h-3.5 text-emerald-600" />
                            <span>View Details & Inclusions</span>
                          </button>
                        </div>

                        {/* Price + Action Rail */}
                        <div className="flex flex-col items-end justify-between w-44 shrink-0 border-l border-slate-100 pl-4" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          <div className="flex flex-col items-end gap-0.5 w-full">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900">
                                {serviceEditMode && pkg.id ? (
                                  <EditableText active={true} type="number" prefix="₹" value={pkg.base_price} onSave={(v) => handleSaveServiceField(pkg, "base_price", v)} />
                                ) : (
                                  `₹${finalPrice.toLocaleString("en-IN")}`
                                )}
                              </span>
                              {!isConsultationCategory && (
                                <span className="text-xs font-bold text-slate-500">
                                  onwards
                                </span>
                              )}
                              {isConsultationCategory && (
                                <span className="text-xs font-bold text-slate-500">
                                  / sq.ft
                                </span>
                              )}
                            </div>
                            {hasOffer && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  {discountPct}% OFF
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Stepper / Add button */}
                          <div className="w-full mt-3">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(pkg)
                                }}
                                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs transition-colors cursor-pointer whitespace-nowrap border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-center"
                              >
                                {isConsultationCategory ? "Book Consultation" : "+ Add"}
                              </button>
                            ) : (
                              <div className="flex items-center justify-between w-full py-1.5 px-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    decrementCartItem(pkg)
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-sm cursor-pointer transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <span className="text-xs font-black min-w-[1.25rem] text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    incrementCartItem(pkg)
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-sm cursor-pointer transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── MOBILE SPLIT CARD LAYOUT (< sm: 640px) ── */}
                      <div className="sm:hidden flex items-start justify-between gap-3">
                        {/* Left Column (Content, Metrics, Price) */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-sm font-black text-slate-900 leading-snug pr-8 line-clamp-2">
                            {pkg.name}
                          </h4>

                          {/* Compact Metrics */}
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 py-0.5">
                            {Boolean(pkg.rating || (category?.rating && category.rating !== "4.8")) && (
                              <>
                                <span className="flex items-center gap-0.5 text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.2 rounded">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                  {pkg.rating || category.rating}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className="flex items-center gap-0.5 text-slate-600">
                              <Clock className="w-2.5 h-2.5 text-emerald-600" />
                              {pkg.duration || "45m"}
                            </span>
                          </div>

                          {/* Price & Offer */}
                          <div className="flex items-baseline gap-1.5 pt-0.5">
                            <span className="text-base font-black text-slate-900">
                              ₹{finalPrice.toLocaleString("en-IN")}
                            </span>
                            {hasOffer && (
                              <>
                                <span className="text-[11px] font-semibold text-slate-400 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                                  {discountPct}% OFF
                                </span>
                              </>
                            )}
                          </div>

                          {/* 1 Inclusions snippet */}
                          {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                            <div className="text-[10.5px] text-slate-500 truncate pt-0.5">
                              ✓ {typeof pkg.includes[0] === "object" ? (pkg.includes[0].text || pkg.includes[0].name || "") : String(pkg.includes[0] || "")}
                            </div>
                          )}

                          {/* Details Link */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDetailsPackage(pkg)
                              }}
                              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                            >
                              View details →
                            </button>
                          </div>
                        </div>

                        {/* Right Column (Thumbnail + Action Button) */}
                        <div className="w-24 shrink-0 flex flex-col items-center gap-2">
                          <div className="w-22 h-22 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shadow-2xs">
                            {pkg.image ? (
                              <img
                                src={resolveImageUrl(pkg.image)}
                                alt={pkg.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                <Wrench className="w-6 h-6 text-emerald-700" />
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="w-full">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(pkg)
                                }}
                                className="w-full py-1.5 px-2 rounded-xl font-black text-xs border-2 border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50 text-center shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                {isConsultationCategory ? "Consult" : "+ Add"}
                              </button>
                            ) : (
                              <div className="w-full flex items-center justify-between py-1 px-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    decrementCartItem(pkg)
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white/20 font-black text-xs cursor-pointer"
                                >
                                  −
                                </button>
                                <span className="text-xs font-black min-w-[1rem] text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    incrementCartItem(pkg)
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white/20 font-black text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ════ RIGHT COLUMN (~32% width / 4 cols, sticky sidebar) ════ */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* Booking Summary Card */}
            <div id="booking-summary-card" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900">
                Booking Summary
                {cartTotalQty > 0 && (
                  <span className="ml-1.5 text-[11px] font-bold text-emerald-700">
                    ({cartTotalQty} item{cartTotalQty > 1 ? "s" : ""})
                  </span>
                )}
              </h3>

              {/* Cart Items -- every package + quantity queued so far,
                  across any service/category, not just one selection. */}
              {cartItems.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-500">
                    No packages added yet.
                  </p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    Tap "+ Add" on a package to start your booking.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {cartItems.map(item => {
                    const isConsult = item.is_consultation || (item.name && item.name.includes("(Site Consultation"))
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={resolveImageUrl(item.image)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Wrench className="w-4 h-4 text-emerald-700" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11.5px] font-black text-slate-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {isConsult
                                ? `${item.unit_rate_display || `₹${item.unit_rate || 18}/sq.ft`} × ${item.quantity}`
                                : `₹${Number(item.price).toLocaleString("en-IN")} × ${item.quantity}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCartLineQty(item.db_id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs cursor-pointer transition-colors"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="text-[11px] font-black text-slate-900 min-w-[1rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCartLineQty(item.db_id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs cursor-pointer transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Selected Address Section */}
              <div className="flex items-start justify-between gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-slate-700 line-clamp-2 leading-tight">
                      {displayLocationText}
                    </span>
                    {isConsultationCategory && (
                      <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                        {consultationFeeDetails.distanceKm > 0 ? `Distance: ~${consultationFeeDetails.distanceKm} km` : "Hosur Center"} • {consultationFeeDetails.isOver15km ? "Chargeable Visit (> 15 km)" : "Standard Consultation Zone (≤ 15 km)"}
                      </div>
                    )}
                  </div>
                </div>
                {typeof onOpenAddressPicker === "function" && (
                  <button
                    type="button"
                    onClick={onOpenAddressPicker}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                {isConsultationCategory ? (
                  <>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <span>Site Visit & Inspection</span>
                        <span className="text-[10px] text-slate-400">
                          ({consultationFeeDetails.distanceKm > 0 ? `${consultationFeeDetails.distanceKm} km` : "Hosur Area"})
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {consultationFeeDetails.fee > 0 ? `₹${consultationFeeDetails.fee}` : "₹0 (≤ 15 km)"}
                      </span>
                    </div>

                    {consultationFeeDetails.convenienceFee > 0 && (
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <span>Convenience Fee</span>
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="font-bold text-slate-900">₹{consultationFeeDetails.convenienceFee}</span>
                      </div>
                    )}

                    {consultationFeeDetails.gst > 0 && (
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <span>Taxes & GST (18%)</span>
                        </div>
                        <span className="font-bold text-slate-900">₹{consultationFeeDetails.gst}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">Total Amount</span>
                      <span className="text-xl font-black text-emerald-700">
                        ₹{cartTotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[10.5px] text-amber-900 leading-snug">
                      <span className="font-bold">Inspection Notice: </span>
                      An expert will visit for precision digital laser measurement and generate an itemized quote based on rate card.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>Item Total</span>
                      <span className="font-bold text-slate-900">₹{cartSubtotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <span>Convenience Fee</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <span className="font-bold text-slate-900">₹{cartConvenienceFee.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">Total Amount</span>
                      <span className="text-xl font-black text-emerald-700">₹{cartTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Full-width CTA Button */}
              <button
                type="button"
                onClick={handleProceedToSchedule}
                disabled={cartItems.length === 0}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                  cartItems.length === 0
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-[#0A7E6C] hover:bg-[#086a5b] cursor-pointer hover:shadow-md"
                }`}
              >
                <span>{isConsultationCategory ? "Book Consultation" : "Proceed to Schedule"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* 100% Safe & Secure Booking Guarantee */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-xs font-black text-emerald-950">100% Safe & Secure Booking</div>
                  <div className="text-[10.5px] text-emerald-800 font-medium leading-tight">
                    Your information is always protected with us.
                  </div>
                </div>
              </div>
            </div>

            {/* "Why Choose Brand?" Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-black text-slate-900">
                Why Choose {brandName}?
              </h4>
              <div className="space-y-3.5">
                {[
                  { icon: Shield, label: "Verified & Trained Professionals", bg: "bg-emerald-50", fg: "text-emerald-700" },
                  { icon: Clock, label: "On-time Service Guarantee", bg: "bg-teal-50", fg: "text-teal-700" },
                  { icon: Wrench, label: "Genuine Parts & Tools", bg: "bg-sky-50", fg: "text-sky-700" },
                  { icon: Headphones, label: "Dedicated Customer Support", bg: "bg-indigo-50", fg: "text-indigo-700" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <item.icon className={`w-4 h-4 ${item.fg}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
          </div>
        </div>
      </div>

      {/* ── Compare Packages Modal ──
          Rendered through a portal straight into document.body: this
          component sits inside LandingPage's category-view wrapper, which
          runs a CSS "fadeUp" animation on `transform` -- any ancestor with
          an active transform/animation becomes the containing block for
          `position: fixed` descendants (per spec), so without the portal
          this modal was positioned relative to that animated wrapper
          instead of the viewport, and scrolled with the page instead of
          staying fixed on screen. */}
      {/* No AnimatePresence wrapper here -- AnimatePresence clones its
          children to attach exit-animation bookkeeping, and that cloning
          does not reliably work on a React Portal node (createPortal
          returns a portal object, not a plain element), which was silently
          preventing this modal from ever mounting when clicked. Plain
          conditional rendering + createPortal is what actually shows it;
          we lose the fade-out-on-close animation but gain a modal that
          reliably opens. */}
      {isCompareModalOpen && createPortal(
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsCompareModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Compare Packages
                  </h3>
                  <p className="text-xs text-slate-500">
                    Side-by-side comparison of all packages for {activeSubService?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentServicePackages.map(pkg => {
                    const mrp = parseFloat(pkg.base_price)
                    const offer = parseFloat(pkg.offer_price)
                    const hasOffer = !isNaN(offer) && offer > 0 && !isNaN(mrp) && offer < mrp
                    const finalPrice = hasOffer ? offer : (!isNaN(mrp) ? mrp : 0)
                    const discountPct = hasOffer ? Math.round((1 - offer / mrp) * 100) : 0
                    const qty = getCartQty(pkg)
                    const isSelected = qty > 0

                    return (
                      <div
                        key={pkg.id}
                        className={`p-5 rounded-2xl border-2 flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/20"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="space-y-3">
                          <h4 className="font-black text-slate-900 text-base">
                            {pkg.name}
                          </h4>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">
                              ₹{finalPrice.toLocaleString("en-IN")}
                              {isConsultationCategory && <span className="text-xs font-bold text-slate-500"> / sq.ft</span>}
                            </span>
                            {isConsultationCategory ? (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                                Rate Card Unit
                              </span>
                            ) : hasOffer ? (
                              <>
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  {discountPct}% OFF
                                </span>
                              </>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500">
                            {pkg.short_description || pkg.description}
                          </p>

                          <div className="pt-3 border-t border-slate-100">
                            <div className="text-[11px] font-black uppercase text-slate-500 mb-2">
                              What's Included
                            </div>
                            <ul className="space-y-1.5">
                              {(Array.isArray(pkg.includes) && pkg.includes.length > 0 ? pkg.includes : ["Standard execution"]).map((inc, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{typeof inc === "string" ? inc : (inc?.text || "")}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addToCart(pkg)}
                            className="mt-5 w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800"
                          >
                            + Add to Booking
                          </button>
                        ) : (
                          <div className="mt-5 w-full flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-emerald-600 text-white">
                            <button
                              type="button"
                              onClick={() => decrementCartItem(pkg)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-sm cursor-pointer transition-colors"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="text-xs font-black">
                              {qty} in booking
                            </span>
                            <button
                              type="button"
                              onClick={() => incrementCartItem(pkg)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-sm cursor-pointer transition-colors"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* ── Package "See Details" Modal: What's Included & What to Keep Ready ──
          Also portaled to document.body -- see the Compare Packages Modal
          comment above for why AnimatePresence isn't used here either. */}
      {detailsPackage && createPortal(
          <div
            className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setDetailsPackage(null)}
          >
            <motion.div
              key={detailsPackage.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden"
            >
              {/* Mobile bottom sheet drag indicator handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {serviceEditMode && detailsPackage.id ? (
                      <EditableText active={true} value={detailsPackage.name} onSave={(v) => handleSaveServiceField(detailsPackage, "name", v)} />
                    ) : (
                      detailsPackage.name
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {serviceEditMode && detailsPackage.id ? (
                      <EditableText active={true} value={detailsPackage.description} multiline onSave={(v) => handleSaveServiceField(detailsPackage, "description", v)} />
                    ) : (
                      detailsPackage.short_description || detailsPackage.description || "Package details"
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsPackage(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* 1. What's Included */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      What's Included
                    </h4>
                  </div>
                  <ul className="space-y-2 pl-1">
                    {getIncludesChecklist(detailsPackage).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-slate-700 leading-relaxed">
                          {typeof item === "string" ? item : (item?.text || "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. What's Not Included */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                      <X className="w-4 h-4 text-rose-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      What's Not Included
                    </h4>
                  </div>
                  <ul className="space-y-2 pl-1">
                    {getExcludesChecklist(detailsPackage).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">✕</span>
                        <span className="text-xs font-medium text-slate-600 leading-relaxed">
                          {typeof item === "string" ? item : (item?.text || "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Possible Additional Charges */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        Possible Additional Charges
                      </h4>
                      <p className="text-[11px] text-slate-500">Transparent policy — always confirmed with you before service</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {getPossibleCharges(detailsPackage).map((c, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{c.item}</div>
                          <div className="text-[11px] text-slate-500">{c.note}</div>
                        </div>
                        <span className="font-extrabold text-slate-900 shrink-0 text-right">{c.fee}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Warranty & Revisit Guarantee */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-teal-200 flex items-center justify-center text-[#0B8F7A] shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-black text-slate-900">
                      30-Day Doorstep Guarantee
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      If the same problem recurs within 30 days of completion, SEVO provides a certified technician revisit completely free of charge.
                    </p>
                  </div>
                </div>

                {/* 5. Customer Reviews & Rating */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-amber-400">
                        {"★★★★★".split("").map((s, i) => (
                          <span key={i} className="text-sm leading-none">{s}</span>
                        ))}
                      </div>
                      <span className="text-xs font-black text-slate-900">4.8 / 5</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">Based on 1,240+ verified bookings</span>
                  </div>
                  <div className="text-xs text-slate-600 italic border-t border-slate-200/60 pt-2">
                    "Specialist arrived promptly with complete tools, explained the diagnostic findings clearly, and completed the repair neatly. Highly recommended!"
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                {(() => {
                  if (isGoodsTransportCategory) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsPackage(null)
                          handleGoodsTransportProceed(detailsPackage)
                        }}
                        className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>{getLogisticsButtonText(detailsPackage)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )
                  }
                  const dQty = getCartQty(detailsPackage)
                  if (dQty === 0) {
                    return (
                      <button
                        type="button"
                        onClick={() => addToCart(detailsPackage)}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                      >
                        {isConsultationCategory ? "Book Consultation Visit" : "+ Add to Booking"}
                      </button>
                    )
                  }
                  return (
                    <div className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-emerald-600 text-white">
                      <button
                        type="button"
                        onClick={() => decrementCartItem(detailsPackage)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-base cursor-pointer transition-colors"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="text-xs font-black">
                        {dQty} added to booking
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementCartItem(detailsPackage)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-base cursor-pointer transition-colors"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      {/* ── Mobile Floating Cart Bar (Appears when items are in cart) ── */}
      {cartTotalQty > 0 && (
        <div className="lg:hidden fixed bottom-[calc(4.25rem+var(--safe-area-bottom))] left-3 right-3 z-40 animate-in slide-in-from-bottom-3 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-slate-700/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs">
                {cartTotalQty}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isConsultationCategory ? "Consultation Visit" : "Cart Total"}
                </div>
                <div className="text-sm font-black text-white truncate">
                  {cartTotal > 0 ? `₹${Number(cartTotal).toLocaleString("en-IN")}` : "₹0"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const summaryEl = document.getElementById("booking-summary-card");
                if (summaryEl) {
                  summaryEl.scrollIntoView({ behavior: "smooth" });
                } else {
                  handleProceedToSchedule();
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>View Summary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
