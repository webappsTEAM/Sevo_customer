import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  X, ChevronRight, ChevronDown, User as UserIcon,
  Sparkles, Wind, Zap, Droplet, Hammer, Bug, PaintRoller,
  Boxes, Wrench, ShoppingBag, LayoutGrid, Loader2, Package as PackageIcon
} from "lucide-react"
import { apiRequest } from "../../api/client.js"
import { CATEGORIES } from "../pages/categoriesData.js"
import { routes } from "../routes.js"

// Icon per pillar-level category id (falls back to Wrench). Kept local and
// small on purpose -- this drawer only needs a glance-icon per row, not the
// full per-service icon logic BookingPage.jsx already owns.
const CATEGORY_ICONS = {
  cleaning: Sparkles,
  sofa_cleaning: Sparkles,
  kitchen_cleaning: Sparkles,
  bathroom_cleaning: Sparkles,
  plumbing: Droplet,
  electrical: Zap,
  carpentry: Hammer,
  hvac: Wind,
  pest_control: Bug,
  painting: PaintRoller,
  mason: Hammer,
  appliance_repair: Boxes,
  security: ShieldIconFallback,
  general: Wrench,
}

function ShieldIconFallback(props) {
  return <Wrench {...props} />
}

// Fuzzy-match a local CATEGORIES entry (categoriesData.js -- this drawer's
// own hardcoded id/name/icon list, independent of the backend's ids) to the
// real backend CatalogCategory it corresponds to. Exact name match first,
// then a word-overlap fallback for the few that are phrased differently
// (e.g. local "Appliances" vs backend "Appliance Repair").
function resolveRealCategory(localCat, realCategories) {
  if (!realCategories.length) return null
  const localName = localCat.name.toLowerCase()
  const exact = realCategories.find((c) => (c.name || "").toLowerCase() === localName)
  if (exact) return exact
  const localWords = localName.split(/\s+/).filter((w) => w.length > 3)
  if (!localWords.length) return null
  return realCategories.find((c) => {
    const cn = (c.name || "").toLowerCase()
    return localWords.some((w) => cn.includes(w))
  }) || null
}

// Sitewide "All Services" directory -- an Amazon-style slide-out panel
// listing every category, and on request, the real catalog hierarchy
// nested underneath it: Category -> Sub-Services (backend "Service" rows,
// exactly what /api/catalog/sub-services/ calls them) -> Packages (the
// actual bookable, priced items). Data comes straight from the public
// catalog endpoints (same ones BookingPage.jsx already uses), so a
// category/sub-service/package the admin adds or renames in the catalog
// shows up here automatically on next open, no code change.
//
// Both inner levels load lazily, one API call per row the customer
// actually expands, rather than one big upfront fetch of everything --
// this panel is meant to be a quick glance-and-drill directory, not a
// full catalog dump.
export function AllServicesDrawer({ isOpen, onClose, navigate: navigateProp, user }) {
  const [realCategories, setRealCategories] = useState([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [expandedCats, setExpandedCats] = useState(() => new Set())
  const [expandedServices, setExpandedServices] = useState(() => new Set())
  // real CatalogCategory.id -> "loading" | Service[]
  const [subServicesByCat, setSubServicesByCat] = useState({})
  // Service.id -> "loading" | Package[]
  const [packagesByService, setPackagesByService] = useState({})

  useEffect(() => {
    if (!isOpen || categoriesLoaded) return
    apiRequest("/catalog/categories/")
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setRealCategories(res.data)
        }
      })
      .catch((err) => console.error("Failed to load categories for All Services drawer:", err))
      .finally(() => setCategoriesLoaded(true))
  }, [isOpen, categoriesLoaded])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === "undefined") return null

  const goTo = (categoryId, subtab) => {
    const qs = subtab ? `?category=${categoryId}&subtab=${encodeURIComponent(subtab)}` : `?category=${categoryId}`
    navigateProp(`${routes.booking_services}${qs}`)
    onClose()
  }

  const loadSubServices = async (realCat) => {
    if (subServicesByCat[realCat.id]) return
    setSubServicesByCat((prev) => ({ ...prev, [realCat.id]: "loading" }))
    try {
      const res = await apiRequest(`/catalog/sub-services/?category_slug=${encodeURIComponent(realCat.slug)}`)
      const rows = (res?.success && Array.isArray(res.data)) ? res.data.filter((s) => s.is_active !== false) : []
      setSubServicesByCat((prev) => ({ ...prev, [realCat.id]: rows }))
    } catch (err) {
      console.error("Failed to load sub-services:", err)
      setSubServicesByCat((prev) => ({ ...prev, [realCat.id]: [] }))
    }
  }

  const loadPackages = async (service) => {
    if (packagesByService[service.id]) return
    setPackagesByService((prev) => ({ ...prev, [service.id]: "loading" }))
    try {
      const res = await apiRequest(`/catalog/services/?service_slug=${encodeURIComponent(service.slug)}&status=ACTIVE`)
      const rows = (res?.success && Array.isArray(res.data)) ? res.data : []
      setPackagesByService((prev) => ({ ...prev, [service.id]: rows }))
    } catch (err) {
      console.error("Failed to load packages:", err)
      setPackagesByService((prev) => ({ ...prev, [service.id]: [] }))
    }
  }

  const onCategoryClick = (localCat) => {
    const real = resolveRealCategory(localCat, realCategories)
    if (!real) {
      // Nothing in the live catalog matches this local category card yet --
      // same behaviour as before: go straight to its page rather than
      // opening onto an empty list.
      goTo(localCat.id)
      return
    }
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(localCat.id)) next.delete(localCat.id)
      else next.add(localCat.id)
      return next
    })
    if (!expandedCats.has(localCat.id)) loadSubServices(real)
  }

  const onServiceClick = (service) => {
    setExpandedServices((prev) => {
      const next = new Set(prev)
      if (next.has(service.id)) next.delete(service.id)
      else next.add(service.id)
      return next
    })
    if (!expandedServices.has(service.id)) loadPackages(service)
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="All Services" className="fixed inset-0 z-[10000] flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Slide-in Panel */}
      <div className="relative w-[86vw] max-w-sm h-full bg-[var(--sevo-surface,white)] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Greeting Header (Amazon-style) */}
        <div className="bg-[var(--sevo-primary,#0f766e)] text-white px-4 py-4 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold truncate">
              Hello, {user?.full_name || user?.fullName || user?.first_name || "sign in"}
            </div>
            <div className="text-[11px] text-white/80 font-semibold">All Services</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--sevo-text-muted,#64748b)]">
              Browse Categories
            </span>
          </div>
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || LayoutGrid
            const isExpanded = expandedCats.has(cat.id)
            const real = resolveRealCategory(cat, realCategories)
            const canExpand = categoriesLoaded && Boolean(real)
            const subServices = real ? subServicesByCat[real.id] : undefined
            const subServicesLoading = subServices === "loading"
            const subServiceRows = Array.isArray(subServices) ? subServices : []

            return (
              <div key={cat.id} className="border-b border-[var(--sevo-border,#f1f5f9)]">
                <button
                  type="button"
                  onClick={() => onCategoryClick(cat)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--sevo-surface-raised,#f8fafc)] transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--sevo-primary-light,#f0fdfa)] text-[var(--sevo-primary,#0f766e)] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-bold text-[var(--sevo-text-primary,#0f172a)] truncate">
                    {cat.name}
                  </span>
                  {canExpand ? (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                </button>

                {isExpanded && canExpand && (
                  <div className="pb-2 bg-[var(--sevo-surface-raised,#f8fafc)]/60">
                    {subServicesLoading && (
                      <div className="flex items-center gap-2 pl-[52px] pr-4 py-2 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading sub-services…</span>
                      </div>
                    )}

                    {!subServicesLoading && subServiceRows.length === 0 && (
                      <button
                        type="button"
                        onClick={() => goTo(cat.id)}
                        className="w-full flex items-center gap-2 pl-[52px] pr-4 py-2 text-xs font-semibold text-[var(--sevo-text-secondary,#475569)] hover:text-[var(--sevo-primary,#0f766e)] transition-colors cursor-pointer text-left"
                      >
                        View {cat.name} →
                      </button>
                    )}

                    {!subServicesLoading && subServiceRows.map((svc) => {
                      const svcExpanded = expandedServices.has(svc.id)
                      const pkgs = packagesByService[svc.id]
                      const pkgsLoading = pkgs === "loading"
                      const pkgRows = Array.isArray(pkgs) ? pkgs : []

                      return (
                        <div key={svc.id}>
                          <button
                            type="button"
                            onClick={() => onServiceClick(svc)}
                            className="w-full flex items-center gap-2 pl-[44px] pr-4 py-2 text-xs font-bold text-[var(--sevo-text-secondary,#475569)] hover:text-[var(--sevo-primary,#0f766e)] transition-colors cursor-pointer text-left"
                          >
                            {svcExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate flex-1">{svc.name}</span>
                          </button>

                          {svcExpanded && (
                            <div className="pb-1.5">
                              {pkgsLoading && (
                                <div className="flex items-center gap-2 pl-[76px] pr-4 py-1.5 text-[11px] text-slate-400">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Loading packages…</span>
                                </div>
                              )}

                              {!pkgsLoading && pkgRows.length === 0 && (
                                <div className="pl-[76px] pr-4 py-1.5 text-[11px] text-slate-400 italic">
                                  No active packages yet
                                </div>
                              )}

                              {!pkgsLoading && pkgRows.map((pkg) => (
                                <button
                                  key={pkg.id}
                                  type="button"
                                  onClick={() => goTo(cat.id, svc.name)}
                                  className="w-full flex items-center gap-2 pl-[76px] pr-4 py-1.5 text-[11px] font-semibold text-[var(--sevo-text-secondary,#475569)] hover:text-[var(--sevo-primary,#0f766e)] transition-colors cursor-pointer text-left"
                                >
                                  <PackageIcon className="w-3 h-3 text-slate-300 shrink-0" />
                                  <span className="truncate flex-1">{pkg.name}</span>
                                  {pkg.price != null && (
                                    <span className="text-slate-400 shrink-0">₹{Number(pkg.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                                  )}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() => goTo(cat.id, svc.name)}
                                className="w-full flex items-center gap-2 pl-[76px] pr-4 py-1.5 text-[11px] font-black text-[var(--sevo-primary,#0f766e)] hover:underline transition-colors cursor-pointer text-left"
                              >
                                View all {svc.name} →
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {!subServicesLoading && subServiceRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => goTo(cat.id)}
                        className="w-full flex items-center gap-2 pl-[44px] pr-4 py-2 text-xs font-black text-[var(--sevo-primary,#0f766e)] hover:underline transition-colors cursor-pointer text-left"
                      >
                        View all {cat.name} →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
