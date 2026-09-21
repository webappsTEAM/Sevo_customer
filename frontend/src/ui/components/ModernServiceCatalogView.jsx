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
import { CategoryServiceModal } from "./CategoryServiceModal.jsx"

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

function getServiceDefaultVariants(serviceName = "") {
  const n = (serviceName || "").toLowerCase()
  if (n.includes("full home") || n.includes("home cleaning")) {
    return [
      { id: "apartment", label: "Full Apartment", keywords: ["apartment", "bhk", "flat", "furnished"], description: "Complete deep cleaning for 1, 2, 3+ BHK apartments" },
      { id: "bungalow", label: "Full Bungalow / Duplex", keywords: ["bungalow", "duplex", "villa", "independent"], description: "Multi-floor villa and independent house deep cleaning" },
      { id: "partial", label: "Partial Home Cleaning", keywords: ["partial", "room", "balcony", "window"], description: "Focused cleaning for specific rooms, balconies and areas" },
    ]
  }
  if (n.includes("bath")) {
    return [
      { id: "standard", label: "Standard Clean", keywords: ["standard", "regular", "basic"], description: "Deep cleaning of floor tiles, wall tiles, basin & WC" },
      { id: "intense", label: "Intense Stain Removal", keywords: ["intense", "stain", "hard water", "deep"], description: "Heavy hard-water and limescale stain removal with machine scrubbing" },
      { id: "movein", label: "Move-in Deep Clean", keywords: ["move-in", "movein", "vacant"], description: "Thorough sanitization before moving into a new home" },
    ]
  }
  if (n.includes("kitchen")) {
    return [
      { id: "standard", label: "Standard Cleaning", keywords: ["standard", "regular"], description: "Surface degreasing of slab, sink, gas stove & exterior cabinets" },
      { id: "deep", label: "Chimney & Degreasing", keywords: ["chimney", "oil", "grease", "deep"], description: "Heavy oil and grease removal from tiles and chimney" },
      { id: "complete", label: "Full Modular Kitchen", keywords: ["modular", "complete", "inside", "full"], description: "Inside-out deep scrub including shelves, trolleys and appliances" },
    ]
  }
  if (n.includes("sofa") || n.includes("carpet") || n.includes("upholstery")) {
    return [
      { id: "sofa", label: "Sofa Shampooing", keywords: ["sofa", "couch", "seating"], description: "Injection-extraction deep foam wash for fabric sofas" },
      { id: "cushion", label: "Cushion & Recliner", keywords: ["cushion", "recliner", "chair"], description: "Delicate dry cleaning and stain treatment" },
      { id: "carpet", label: "Carpet Deep Clean", keywords: ["carpet", "rug", "mat"], description: "High-power dust extraction and shampooing" },
    ]
  }
  if (n.includes("ac") && (n.includes("service") || n.includes("clean"))) {
    return [
      { id: "powerjet", label: "Power Jet Wash", keywords: ["power jet", "jet", "water"], description: "High-pressure water jet cleaning of indoor and outdoor coils" },
      { id: "foam", label: "Foam Jet Deep Wash", keywords: ["foam", "antibacterial", "deep"], description: "Antibacterial foam wash for 2x deeper dirt removal" },
      { id: "master", label: "Master Service + Checkup", keywords: ["master", "inspection", "comprehensive"], description: "Complete cleaning plus 12-point diagnostic check" },
    ]
  }
  if (n.includes("ac") && (n.includes("repair") || n.includes("diagnos"))) {
    return [
      { id: "lesscooling", label: "Less / No Cooling", keywords: ["cooling", "compressor", "gas"], description: "Compressor, fan motor and gas pressure diagnosis" },
      { id: "waterleak", label: "Water Leakage", keywords: ["leak", "water", "drain", "drip"], description: "Drain tray, drain pipe blockage and coil freezing fix" },
      { id: "noise", label: "Noise / Smell / Power", keywords: ["noise", "smell", "power", "vibration"], description: "Vibration dampening, blower cleaning and electrical check" },
    ]
  }
  if (n.includes("paint")) {
    return [
      { id: "fullhome", label: "Full Home Repaint", keywords: ["full home", "entire", "apartment"], description: "Laser measurement consultation for whole apartment" },
      { id: "rooms", label: "1-2 Rooms / Rental", keywords: ["room", "rental", "tenant"], description: "Quick refresh painting for tenant handover" },
      { id: "waterproofing", label: "Waterproofing & Seepage", keywords: ["waterproofing", "damp", "seepage", "terrace"], description: "Crack filling, dampness treatment and waterproof primer" },
    ]
  }
  if (n.includes("pest")) {
    return [
      { id: "cockroach", label: "Cockroach Control", keywords: ["cockroach", "roach", "gel"], description: "Odorless gel baiting plus crack spray treatment" },
      { id: "termite", label: "Termite Protection", keywords: ["termite", "wood", "drill"], description: "Drill-fill-seal barrier protection with warranty" },
      { id: "bedbug", label: "Bed Bugs & Ants", keywords: ["bed bug", "ant", "spray"], description: "2-session intensive spray treatment for mattresses and furniture" },
    ]
  }
  return []
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
  const [isChangeServiceModalOpen, setIsChangeServiceModalOpen] = useState(false)

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
          package_id: pkg.id,
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
        package_id: pkg.id,
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

  // Available Service Groups / Variants for the active service (Admin DB tabs OR contextual live variants)
  const serviceGroups = useMemo(() => {
    const rawTabs = activeSubService?.customization?.subtabs
    if (Array.isArray(rawTabs) && rawTabs.length > 1) {
      return rawTabs.filter(t => t && t.enabled !== false)
    }
    return getServiceDefaultVariants(activeSubService?.name || "")
  }, [activeSubService])

  // Active Service Group key
  const urlGroup = searchParams.get("group") || searchParams.get("serviceGroup")
  const [activeGroupKey, setActiveGroupKey] = useState(urlGroup || "all")

  // Keep activeGroupKey in sync with active service and url
  useEffect(() => {
    if (serviceGroups.length > 0) {
      if (urlGroup && (urlGroup === "all" || serviceGroups.some(g => g.id === urlGroup))) {
        setActiveGroupKey(urlGroup)
      } else {
        setActiveGroupKey("all")
      }
    } else {
      setActiveGroupKey("all")
    }
  }, [serviceGroups, urlGroup, activeSubService?.id])

  // Filtered packages by active service group / variant
  const displayedPackages = useMemo(() => {
    if (!serviceGroups || serviceGroups.length === 0 || activeGroupKey === "all") {
      return currentServicePackages
    }
    // 1. Direct match on sub_service_key
    const keyMatches = currentServicePackages.filter(p => p.sub_service_key === activeGroupKey)
    if (keyMatches.length > 0) return keyMatches

    // 2. Keyword match against package name, tag or description
    const activeGroupObj = serviceGroups.find(g => g.id === activeGroupKey)
    if (activeGroupObj) {
      const keywords = (activeGroupObj.keywords || [activeGroupObj.label || ""]).map(k => k.toLowerCase())
      const kwMatches = currentServicePackages.filter(p => {
        const text = `${p.name} ${p.tag || ""} ${p.description || ""} ${p.short_description || ""}`.toLowerCase()
        return keywords.some(kw => text.includes(kw))
      })
      if (kwMatches.length > 0) return kwMatches
    }

    return currentServicePackages
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

  // Group packages into scannable sections (e.g. Full Apartment, Bungalow / Duplex, Partial Cleaning)
  const packageSections = useMemo(() => {
    if (isGoodsTransportCategory || !serviceGroups || serviceGroups.length <= 1) {
      return [{ id: "all", label: "", description: "", packages: displayedPackages }]
    }

    // Always organize all packages into their respective variant section headings!
    const sections = []
    const assignedIds = new Set()

    serviceGroups.forEach(grp => {
      const keywords = (grp.keywords || [grp.label || ""]).map(k => k.toLowerCase())
      const grpPkgs = currentServicePackages.filter(p => {
        if (assignedIds.has(p.id)) return false
        if (p.sub_service_key === grp.id) return true
        const text = `${p.name} ${p.tag || ""} ${p.description || ""} ${p.short_description || ""}`.toLowerCase()
        return keywords.some(kw => text.includes(kw))
      })

      if (grpPkgs.length > 0) {
        grpPkgs.forEach(p => assignedIds.add(p.id))
        sections.push({
          id: grp.id,
          label: grp.label,
          description: grp.description,
          packages: grpPkgs
        })
      }
    })

    const remaining = currentServicePackages.filter(p => !assignedIds.has(p.id))
    if (remaining.length > 0) {
      sections.push({
        id: "other",
        label: sections.length > 0 ? "Other Options" : "",
        description: "",
        packages: remaining
      })
    }

    return sections.length > 0 ? sections : [{ id: "all", label: "", description: "", packages: currentServicePackages }]
  }, [currentServicePackages, displayedPackages, serviceGroups, isGoodsTransportCategory])

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
      {/* ── 1. Compact Modern Category Header (Brings packages immediately above the fold) ── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            {/* Left: Back button + Title + Badges */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Back to home"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                    {category?.name || "Professional Services"}
                  </h1>
                  {activeSubService && (
                    <>
                      <span className="text-slate-300 font-bold hidden sm:inline">/</span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg truncate hidden sm:inline">
                        {activeSubService.name}
                      </span>
                    </>
                  )}
                  {Boolean(category?.rating) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      {category.rating} {category.jobs_count_str ? `• ${category.jobs_count_str}` : ""}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsChangeServiceModalOpen(true)}
                    className="text-[10px] sm:text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100/80 border border-emerald-200/80 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    Change Service
                  </button>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 truncate max-w-xl mt-0.5">
                  {category?.desc || category?.description || "Professional doorstep service with 30-day revisit warranty"}
                </p>
              </div>
            </div>

            {/* Right: Sleek Trust Badges */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-0.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>30-Day Guarantee</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full shrink-0">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>On-Time Arrival</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full shrink-0">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fixed Rate Card</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3 sm:mt-5">

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
          <div className="lg:col-span-8 space-y-4">

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

              {/* Quick Jump Bar -- only rendered when there are 3 or more distinct sections, acting as smooth anchor jumps without hiding packages */}
              {!isGoodsTransportCategory && packageSections.length > 2 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                  {packageSections.map(section => {
                    if (!section.label) return null
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`section-${section.id}`)
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" })
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap border bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 shrink-0 shadow-2xs hover:bg-emerald-50/50"
                      >
                        <span>{section.label}</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {section.packages.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Package List. Goods & Transport gets a "vehicle card" grid
                  (image up top, capacity/spec bullets, Starting-from price,
                  Know More + Proceed to Booking) matching the look of the
                  existing MiniTruckBookingHosurPage.jsx -- every other
                  category keeps the horizontal-row layout. Same underlying
                  data/handlers (getCartQty/addToCart/setDetailsPackage/etc)
                  either way, just a different skin. */}
              {/* Package Sections -- groups packages under meaningful variant sections */}
              <div className="space-y-6">
                {packageSections.map(section => (
                  <div key={section.id} id={`section-${section.id}`} className="space-y-3">
                    {section.label && (
                      <div className="pt-2 pb-1 border-b border-slate-100 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{section.label}</span>
                        </h4>
                        {section.description && (
                          <span className="text-xs text-slate-500 font-medium">
                            {section.description}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={isGoodsTransportCategory
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "flex flex-col gap-3.5"
                    }>
                      {section.packages.map(pkg => {
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
                                e.target.src = "/assets/cat_goods_transport.jpg";
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
                      className={`relative rounded-3xl border bg-white transition-all p-4 sm:p-5 cursor-pointer ${
                        isSelected
                          ? "border-emerald-600 shadow-md ring-1 ring-emerald-500/20"
                          : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      {pkg.popular && (
                        <div className="absolute top-3 left-4 z-10 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs">
                          Most Booked
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3 sm:gap-6">
                        {/* ── LEFT COLUMN: Title, Metrics, Price, Inclusions, View details ── */}
                        <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                          {/* Title */}
                          <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                            {serviceEditMode && pkg.id ? (
                              <EditableText active={true} value={pkg.name} onSave={(v) => handleSaveServiceField(pkg, "name", v)} />
                            ) : (
                              pkg.name
                            )}
                          </h4>

                          {/* Metrics: Rating & Duration in a single clean line */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            {Boolean(pkg.rating || category?.rating) && (
                              <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                <span>{pkg.rating || category.rating || "4.8"}</span>
                                <span className="text-slate-400 font-normal">
                                  {pkg.reviews_count ? `(${pkg.reviews_count})` : "(12K+)"}
                                </span>
                              </span>
                            )}
                            {Boolean(pkg.rating || category?.rating) && <span>•</span>}
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{pkg.duration || "45–60 min"}</span>
                            </span>
                          </div>

                          {/* Price Row */}
                          <div className="flex items-baseline gap-2 pt-0.5" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                            <span className="text-base sm:text-lg font-black text-slate-900">
                              {serviceEditMode && pkg.id ? (
                                <EditableText active={true} type="number" prefix="₹" value={pkg.base_price} onSave={(v) => handleSaveServiceField(pkg, "base_price", v)} />
                              ) : (
                                `₹${finalPrice.toLocaleString("en-IN")}`
                              )}
                            </span>
                            {hasOffer && (
                              <>
                                <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                                  ₹{mrp.toLocaleString("en-IN")}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  {discountPct}% OFF
                                </span>
                              </>
                            )}
                            {isConsultationCategory && (
                              <span className="text-[11px] font-bold text-slate-500">
                                / sq.ft
                              </span>
                            )}
                          </div>

                          {/* 2-3 Concise Inclusions Bullets */}
                          {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {pkg.includes.slice(0, 3).map((inc, i) => {
                                const text = typeof inc === "object" ? (inc.text || inc.name || "") : String(inc || "")
                                if (!text) return null
                                return (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600">
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{text}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* View Details Link */}
                          <div className="pt-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDetailsPackage(pkg)
                              }}
                              className="text-[11px] sm:text-xs font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View details &amp; inclusions</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* ── RIGHT COLUMN: Thumbnail + Add Button / Stepper (Stacked) ── */}
                        <div className="w-24 sm:w-32 shrink-0 flex flex-col items-center gap-2 pt-1" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          <div className="w-24 h-24 sm:w-32 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-2xs relative">
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
                                  e.target.src = "/assets/hero_illustration.jpg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                <Wrench className="w-7 h-7 text-emerald-700" />
                              </div>
                            )}
                          </div>

                          {/* Stepper / Add Button */}
                          <div className="w-full">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(pkg)
                                }}
                                className="w-full py-1.5 sm:py-2 px-3 rounded-xl font-black text-xs sm:text-sm border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer text-center shadow-2xs"
                              >
                                {isConsultationCategory ? "Consult" : "+ Add"}
                              </button>
                            ) : (
                              <div className="flex items-center justify-between w-full py-1 sm:py-1.5 px-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    decrementCartItem(pkg)
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-xs cursor-pointer transition-colors"
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
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-xs cursor-pointer transition-colors"
                                  aria-label="Increase quantity"
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
                ))}
              </div>
            </div>

          </div>

          {/* ════ RIGHT COLUMN (~32% width / 4 cols, sticky sidebar on desktop, hidden on mobile) ════ */}
          <div className="hidden lg:block lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            {cartItems.length === 0 ? (
              /* State A: SEVO Assurance & Service Guarantees (Discovery Mode) */
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      The SEVO Promise
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Doorstep service you can trust
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                      🛡️
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">30-Day Revisit Guarantee</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Free technician revisit if the exact same issue recurs within 30 days.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                      ⭐
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">Verified & Trained Experts</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Strictly background-checked technicians with standard tools and uniforms.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                      ₹
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">Transparent Upfront Rates</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Fixed rate cards with no surprise charges or hidden consultation fees.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                      🔐
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">Secure Doorstep Start OTP</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Work begins only after you verify the professional via your booking OTP.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <p className="text-xs font-bold text-slate-700">
                    Ready to book?
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click "+ Add" on any package to start your order.
                  </p>
                </div>
              </div>
            ) : (
              /* State B: Active Cart Summary (Selection Mode) */
              <div id="booking-summary-card" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Cart Summary</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {cartTotalQty} {cartTotalQty === 1 ? "item" : "items"}
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      cartItems.forEach(item => setCartLineQty(item.db_id, 0))
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>

                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                  {cartItems.map(item => {
                    const isConsult = item.is_consultation || (item.name && item.name.includes("(Site Consultation"))
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50/90 border border-slate-100"
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
                            <div className="text-xs font-black text-slate-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-600 font-bold">
                              {isConsult
                                ? `${item.unit_rate_display || `₹${item.unit_rate || 18}/sq.ft`}`
                                : `₹${Number(item.price).toLocaleString("en-IN")}`}
                            </div>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setCartLineQty(item.db_id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-900 font-black text-xs cursor-pointer transition-colors"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="text-xs font-black text-slate-900 min-w-[1rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCartLineQty(item.db_id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-900 font-black text-xs cursor-pointer transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Subtotal */}
                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-600">Item Total</span>
                  <span className="text-xl font-black text-slate-900">
                    ₹{cartSubtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-medium text-center">
                  Address, scheduling slot & coupons applied at checkout.
                </p>

                {/* Proceed Button */}
                <button
                  type="button"
                  onClick={handleProceedToSchedule}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer active:scale-98"
                >
                  <span>{isConsultationCategory ? "Book Consultation Visit" : "Proceed to Checkout"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified pricing • 30-day doorstep warranty</span>
                </div>
              </div>
            )}

            {/* Support Callout */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-800">Need help booking?</div>
                <div className="text-[11px] text-slate-500">Hosur customer care: 080-4824-SEVO</div>
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

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
                {(() => {
                  const dMrp = parseFloat(detailsPackage.base_price)
                  const dOffer = parseFloat(detailsPackage.offer_price)
                  const dHasOffer = !isNaN(dOffer) && dOffer > 0 && !isNaN(dMrp) && dOffer < dMrp
                  const dFinalPrice = dHasOffer ? dOffer : (!isNaN(dMrp) ? dMrp : 0)
                  const dDiscountPct = dHasOffer ? Math.round((1 - dOffer / dMrp) * 100) : 0

                  return (
                    <>
                      <div className="flex flex-col min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Price
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg sm:text-xl font-black text-slate-900">
                            ₹{dFinalPrice.toLocaleString("en-IN")}
                          </span>
                          {dHasOffer && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{dMrp.toLocaleString("en-IN")}
                            </span>
                          )}
                          {isConsultationCategory && (
                            <span className="text-xs font-semibold text-slate-500">
                              / sq.ft
                            </span>
                          )}
                        </div>
                        {dHasOffer && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {dDiscountPct}% OFF
                          </span>
                        )}
                      </div>

                      <div className="min-w-[140px] sm:min-w-[180px] shrink-0">
                        {isGoodsTransportCategory ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsPackage(null)
                              handleGoodsTransportProceed(detailsPackage)
                            }}
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                          >
                            <span>{getLogisticsButtonText(detailsPackage)}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (() => {
                          const dQty = getCartQty(detailsPackage)
                          if (dQty === 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => addToCart(detailsPackage)}
                                className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs active:scale-95 text-center"
                              >
                                {isConsultationCategory ? "Book Consultation" : "+ Add to Booking"}
                              </button>
                            )
                          }
                          return (
                            <div className="w-full flex items-center justify-between gap-2 py-1.5 px-3 rounded-xl bg-emerald-600 text-white shadow-xs">
                              <button
                                type="button"
                                onClick={() => decrementCartItem(detailsPackage)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 font-black text-base cursor-pointer transition-colors"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="text-xs font-black">
                                {dQty} in cart
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementCartItem(detailsPackage)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 font-black text-base cursor-pointer transition-colors"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {/* ── Category Service Selection Modal (Change Service on Demand) ── */}
      {isChangeServiceModalOpen && (
        <CategoryServiceModal
          isOpen={isChangeServiceModalOpen}
          onClose={() => setIsChangeServiceModalOpen(false)}
          category={category}
          onSelectService={(catSlug, subtabName) => {
            setIsChangeServiceModalOpen(false)
            if (services && services.length > 0) {
              const target = services.find(s =>
                s.name.toLowerCase() === subtabName.toLowerCase() ||
                s.name.toLowerCase().includes(subtabName.toLowerCase()) ||
                subtabName.toLowerCase().includes(s.name.toLowerCase())
              )
              if (target) {
                setActiveSubService(target)
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev)
                  next.set("subtab", target.name)
                  next.set("subTab", target.name)
                  return next
                }, { replace: true })
                return
              }
            }
            setSearchParams(prev => {
              const next = new URLSearchParams(prev)
              next.set("subtab", subtabName)
              next.set("subTab", subtabName)
              return next
            }, { replace: true })
          }}
          allBackendServices={services}
        />
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
              onClick={handleProceedToSchedule}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>View Cart & Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
