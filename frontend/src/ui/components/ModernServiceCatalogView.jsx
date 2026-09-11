import React, { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useSearchParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Shield, Clock, Wrench, ShieldCheck, CheckCircle2,
  Settings, Home, MapPin, ChevronRight, Info, Check,
  Sparkles, Award, Tag, Headphones, ArrowRight, X,
  Layers, Star, ChevronLeft, SlidersHorizontal, AlertCircle
} from "lucide-react"
import { resolveImageUrl } from "../../utils/imageUrl.js"
import { apiRequest } from "../../api/client.js"
import { useEditMode } from "../../state/editMode/useEditMode.js"
import { EditableText, EditableImage } from "./SuperAdminEditControls.jsx"

// Feature icons map for dynamic icon resolution
const SERVICE_ICON_MAP = {
  ac: Wrench,
  hvac: Wrench,
  heating: Wrench,
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
}

function resolveServiceIcon(name = "") {
  const n = (name || "").toLowerCase()
  for (const [k, Icon] of Object.entries(SERVICE_ICON_MAP)) {
    if (n.includes(k)) return Icon
  }
  return Wrench
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

  const cartTotalQty = cartItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
  const cartSubtotal = cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
  // One convenience fee per distinct package line (not multiplied by its
  // quantity) -- an order-level charge per service type queued, not per unit.
  const cartConvenienceFee = cartItems.reduce((sum, it) => sum + (Number(it.platform_fee) || 29), 0)
  const cartTotal = cartSubtotal + cartConvenienceFee

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

  const rawCatKey = (categoryProp?.id || categoryProp?.slug || categoryProp?.name || "").toString().toLowerCase()
  // Strips everything except letters/digits so "ac_appliance" (url slug),
  // "ac-appliance" (a hyphenated db slug) and "AC & Appliance" (the db
  // display name) all normalize to the same "acappliance" key.
  const normKey = (v) => (v || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "")

  // AC & Appliance has a special, not-from-admin "Book AC Inspection /
  // Estimation" flow (a real standalone booking page at /ac-inspection,
  // built around ACDetailsForm + estimationRepository) that isn't a normal
  // catalog Service/Package, so it can't come from the DB-driven `services`
  // fetch below -- it's shown as an extra hardcoded entry in the Services
  // sidebar only for this one category, same as before ModernServiceCatalogView
  // replaced the old catalog page.
  const isAcApplianceCategory = ["acappliance", "hvac", "ac"].includes(normKey(category?.slug || category?.name || category?.id))

  // Goods & Transport gets a purely visual "vehicle card" treatment for its
  // package list (image, capacity badge, spec lines, "Starting from ₹X",
  // Know More + Proceed to Booking) matching the look of the existing
  // MiniTruckBookingHosurPage.jsx (routed at /trucks) -- same underlying
  // data/handlers as every other category (real packages, same See-details
  // modal, same add-to-cart/stepper), just re-skinned for this one category.
  const isGoodsTransportCategory = ["goodstransports", "goodstransport", "logistics"].includes(normKey(category?.slug || category?.name || category?.id))

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

        // Resolve the real category by normalized slug/name/id match against
        // the raw url-derived key (rawCatKey, e.g. "ac_appliance"). Falls
        // back to the prop unresolved if nothing matches (keeps prior
        // behaviour rather than breaking).
        const realCat = allCats.find(c =>
          normKey(c.slug) === normKey(rawCatKey) ||
          normKey(c.name) === normKey(rawCatKey) ||
          normKey(c.id) === normKey(rawCatKey)
        ) || null
        if (!cancelled && realCat) setLiveCategory(realCat)
        const effectiveCat = realCat || category

        // Filter services for current category
        const categoryId = effectiveCat?.id?.toString()
        const categorySlug = (effectiveCat?.slug || "").toLowerCase()

        // Match strictly on the service's real category id/slug -- the admin
        // catalog already tags every service with the correct category (see
        // Catalog > Services), so this is reliable. The old fallback here
        // used keyword substring checks (e.g. "name contains ac") which
        // wrongly matched unrelated services whose name just happened to
        // contain the substring -- e.g. "Packers & Movers" (Goods &
        // Transport) matched the AC & Appliance category because "Packers"
        // contains "ac". Removed rather than patched: category id/slug
        // matching is exact and covers every category, so no per-category
        // keyword list is needed at all.
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
        let initialSub = matchedSubs[0]
        if (urlSubTab) {
          const found = matchedSubs.find(s =>
            s.name?.toLowerCase() === urlSubTab.toLowerCase() ||
            s.slug?.toLowerCase() === urlSubTab.toLowerCase() ||
            s.name?.toLowerCase().includes(urlSubTab.toLowerCase())
          )
          if (found) initialSub = found
        }
        setActiveSubService(initialSub)

        // Find packages for initial sub-service
        const initialPkgs = allPkgs.filter(p =>
          p.service_id === initialSub.id ||
          p.service_name === initialSub.name ||
          p.service_slug === initialSub.slug
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
      p.service_id === subId ||
      p.service_name === subName ||
      (subSlug && p.service_slug === subSlug)
    )

    if (matched.length > 0) return matched

    // Fallback: match by category if no service-specific packages
    return packages.filter(p =>
      p.category?.toString() === category?.id?.toString() ||
      (category?.slug && p.category_slug === category.slug)
    )
  }, [activeSubService, packages, category?.id, category?.slug])

  // 3. Keep selectedPackage in sync with active sub-service
  useEffect(() => {
    if (currentServicePackages.length > 0) {
      const alreadySelected = currentServicePackages.find(p => p.id === selectedPackage?.id)
      if (!alreadySelected) {
        setSelectedPackage(currentServicePackages[0])
      }
    } else {
      setSelectedPackage(null)
    }
  }, [currentServicePackages])

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

  // Handle proceed to schedule -- checks out every item queued in the cart
  // (any quantity, any package, any service/category), not just one.
  const handleProceedToSchedule = () => {
    if (cartItems.length === 0) return

    if (typeof onCheckout === "function") {
      onCheckout(cartItems)
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-slate-800 pb-16">
      {/* ── 1. Top Breadcrumb & Category Hero Banner ── */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
            <button
              type="button"
              onClick={onClose}
              className="hover:text-emerald-700 transition-colors"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="hover:text-emerald-700 transition-colors">Services</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">{category?.name || "Services"}</span>
          </nav>

          {/* Hero Banner: gradient panel with title/subtitle + tagline + photo */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border border-emerald-100/70">
            <div className="relative flex flex-col md:flex-row items-stretch">
              <div className="flex-1 min-w-0 p-5 sm:p-7 flex flex-col justify-center gap-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                  {category?.name || "Professional Services"}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-lg">
                  {category?.desc || category?.description || "Professional care for a cleaner, healthier and more comfortable space."}
                </p>

                {/* Trust Badge Strip */}
                <div className="flex flex-wrap gap-4 sm:gap-6 pt-2">
                  {[
                    { icon: ShieldCheck, label1: "Verified", label2: "Technicians" },
                    { icon: Clock, label1: "On-time", label2: "Service" },
                    { icon: Wrench, label1: "Genuine", label2: "Spare Parts" },
                    { icon: Tag, label1: "Transparent", label2: "Pricing" },
                  ].map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center shrink-0">
                        <f.icon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="leading-tight">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ── 2/3. Main Layout: vertical Services sidebar + content + Booking Summary ── */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* ════ SERVICES SIDEBAR (vertical list) ════
              Goods & Transport skips this in favor of a full-width layout
              with a horizontal pill row instead (see below), closer to the
              uncluttered, no-sidebar look of MiniTruckBookingHosurPage. */}
          {services.length > 0 && !isGoodsTransportCategory && (
            <div className="w-full lg:w-[240px] shrink-0 flex flex-col gap-1 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
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

              {/* Special, not-from-admin "AC Inspection / Estimation" entry --
                  see isAcApplianceCategory above. Navigates straight to the
                  dedicated booking page instead of switching the active
                  service tab like a normal catalog service would. */}
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
          )}

          {/* ════ CONTENT + BOOKING SUMMARY ════ */}
          <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ════ LEFT COLUMN (~68% width / 8 cols) ════ */}
          <div className="lg:col-span-8 space-y-6">
            {/* Active Service Spotlight Card -- the package image now fills
                the whole card as a background photo, with a dark gradient
                scrim behind the text so it stays readable over any image,
                instead of sitting in a separate box beside the text. Updates
                to whichever package was last clicked/added (see the
                onClick on each package row below, and the cart actions,
                both of which call setSelectedPackage). */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-xs min-h-[280px] sm:min-h-[320px] flex items-end">
              <img
                key={selectedPackage?.image || activeSubService?.image || category?.image}
                src={resolveImageUrl(selectedPackage?.image || activeSubService?.image || category?.image)}
                alt={selectedPackage?.name || "Service hero"}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&fit=crop"
                }}
              />
              {/* Dark scrim: strongest behind the text at the bottom-left,
                  fading out toward the top-right so the photo still reads. */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />

              {/* Floating highlight badge */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xs rounded-xl px-3 py-1.5 shadow-md border border-slate-200/80 flex items-center gap-2">
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
              <div className="relative z-10 p-6 sm:p-7 w-full space-y-3">
                {/* Category / Sub-service Tag */}
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                  <span className="w-1 h-3.5 bg-emerald-400 rounded-full" />
                  <span>{activeSubService?.name || category?.name} PACKAGES</span>
                </div>

                {/* Spotlight Title */}
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                  {selectedPackage?.name || activeSubService?.name}
                </h2>

                {/* Spotlight Description */}
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-xl">
                  {selectedPackage?.description ||
                   activeSubService?.description ||
                   category?.desc ||
                   "Restore performance with certified professional care at your doorstep. Safe, reliable and quick service."}
                </p>

                {/* 4 Feature Pill Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/15 max-w-xl">
                  <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <Shield className="w-4 h-4 text-emerald-300 mb-1" />
                    <span className="text-[10px] font-black text-white leading-tight">Certified</span>
                    <span className="text-[9px] text-white/70 font-medium">Technicians</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <Clock className="w-4 h-4 text-emerald-300 mb-1" />
                    <span className="text-[10px] font-black text-white leading-tight">Quick &</span>
                    <span className="text-[9px] text-white/70 font-medium">Hassle-free</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <Wrench className="w-4 h-4 text-emerald-300 mb-1" />
                    <span className="text-[10px] font-black text-white leading-tight">Genuine</span>
                    <span className="text-[9px] text-white/70 font-medium">Spares & Tools</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 mb-1" />
                    <span className="text-[10px] font-black text-white leading-tight">Quality</span>
                    <span className="text-[9px] text-white/70 font-medium">Assurance</span>
                  </div>
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
                {currentServicePackages.length > 1 && (
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
                {currentServicePackages.map(pkg => {
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
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(pkg)
                              }}
                              className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>Proceed to Booking</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-between gap-2 py-1.5 px-2 rounded-xl bg-emerald-600 text-white">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); decrementCartItem(pkg) }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-sm cursor-pointer transition-colors"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="text-xs font-black">{qty}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); incrementCartItem(pkg) }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-sm cursor-pointer transition-colors"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative rounded-2xl border-2 bg-white transition-all flex flex-col sm:flex-row gap-4 p-4 sm:p-5 cursor-pointer ${
                        isSelected
                          ? "border-emerald-600 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      {pkg.popular && (
                        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-sm">
                          Popular
                        </div>
                      )}

                      {/* Package Image */}
                      <div className="w-full sm:w-32 h-32 sm:h-auto shrink-0 rounded-xl overflow-hidden bg-slate-100" onClick={(e) => serviceEditMode && e.stopPropagation()}>
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
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug pr-14 sm:pr-0" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          {serviceEditMode && pkg.id ? (
                            <EditableText active={true} value={pkg.name} onSave={(v) => handleSaveServiceField(pkg, "name", v)} />
                          ) : (
                            pkg.name
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 font-normal line-clamp-2 leading-relaxed" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                          {serviceEditMode && pkg.id ? (
                            <EditableText active={true} value={pkg.description} multiline onSave={(v) => handleSaveServiceField(pkg, "description", v)} />
                          ) : (
                            pkg.short_description || pkg.description || "Comprehensive service with certified pro execution."
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setDetailsPackage(pkg)
                          }}
                          className="relative z-10 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-2 cursor-pointer"
                        >
                          See details
                        </button>
                      </div>

                      {/* Price + Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:w-44 shrink-0 sm:border-l sm:border-slate-100 sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100" onClick={(e) => serviceEditMode && e.stopPropagation()}>
                        <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-1">
                          <span className="text-lg font-black text-slate-900">
                            {serviceEditMode && pkg.id ? (
                              <EditableText active={true} type="number" prefix="₹" value={pkg.base_price} onSave={(v) => handleSaveServiceField(pkg, "base_price", v)} />
                            ) : (
                              `₹${finalPrice.toLocaleString("en-IN")}`
                            )}
                          </span>
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

                        {/* Quantity stepper: lets the same package be queued
                            multiple times, and multiple different packages
                            (across services/categories) all stay in the cart
                            at once -- replaces the old single "Select
                            Package" radio-style button. */}
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(pkg)
                            }}
                            className="py-2 px-4 sm:w-full rounded-xl font-bold text-xs transition-colors cursor-pointer whitespace-nowrap border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-2 sm:w-full py-1.5 px-2 rounded-xl bg-emerald-600 text-white">
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
                  )
                })}
              </div>
            </div>

          </div>

          {/* ════ RIGHT COLUMN (~32% width / 4 cols, sticky sidebar) ════ */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* Booking Summary Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
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
                  {cartItems.map(item => (
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
                            ₹{Number(item.price).toLocaleString("en-IN")} × {item.quantity}
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
                  ))}
                </div>
              )}

              {/* Selected Address Section */}
              <div className="flex items-start justify-between gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-slate-700 line-clamp-2 leading-tight">
                    {displayLocationText}
                  </span>
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
                <span>Proceed to Schedule</span>
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
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setDetailsPackage(null)}
          >
            <motion.div
              key={detailsPackage.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
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

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* What's Included */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-sky-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      What's Included
                    </h4>
                  </div>
                  <ul className="space-y-2.5">
                    {getIncludesChecklist(detailsPackage).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-slate-700 leading-relaxed">
                          {typeof item === "string" ? item : (item?.text || "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What You Need to Keep Ready */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Home className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      What You Need to Keep Ready
                    </h4>
                  </div>
                  <ul className="space-y-2.5">
                    {getReadyChecklist(detailsPackage).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-slate-700 leading-relaxed">
                          {typeof item === "string" ? item : (item?.text || "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                {(() => {
                  const dQty = getCartQty(detailsPackage)
                  if (dQty === 0) {
                    return (
                      <button
                        type="button"
                        onClick={() => addToCart(detailsPackage)}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                      >
                        + Add to Booking
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
    </div>
  )
}
