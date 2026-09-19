import { useEffect, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  X, ChevronRight, ChevronDown, User as UserIcon,
  Sparkles, Wind, Zap, Droplet, Hammer, Bug, PaintRoller,
  Boxes, Wrench, LayoutGrid, Loader2, Package as PackageIcon,
  Truck, ShieldCheck
} from "lucide-react"
import { apiRequest } from "../../api/client.js"
import { routes } from "../routes.js"
import { resolveImageUrl } from "../../utils/imageUrl.js"

// Icon per category name / icon field (falls back to Wrench/Sparkles).
function getCategoryIcon(cat) {
  const iconStr = (cat?.icon || "").toLowerCase()
  const nameStr = (cat?.name || "").toLowerCase()
  if (iconStr === "truck" || nameStr.includes("truck") || nameStr.includes("transport") || nameStr.includes("goods")) return Truck
  if (iconStr === "wind" || nameStr.includes("ac") || nameStr.includes("appliance") || nameStr.includes("hvac")) return Wind
  if (iconStr === "sparkles" || nameStr.includes("clean") || nameStr.includes("pest")) return Sparkles
  if (iconStr === "palette" || nameStr.includes("paint")) return PaintRoller
  if (iconStr === "hammer" || nameStr.includes("mason")) return Hammer
  if (nameStr.includes("plumb")) return Droplet
  if (nameStr.includes("electr")) return Zap
  if (nameStr.includes("security")) return ShieldCheck
  return Wrench
}

function isGroceryCategory(cat) {
  const s = (cat?.slug || "").toLowerCase()
  const n = (cat?.name || "").toLowerCase()
  const icon = (cat?.icon || "").toLowerCase()
  return (
    s.includes("vegetable") || s.includes("grocery") || s.includes("groceries") ||
    s.includes("fruit") || n.includes("vegetable") || n.includes("grocery") ||
    n.includes("groceries") || n.includes("fruit") || icon === "carrot"
  )
}

// Sitewide "All Services" directory -- an Amazon/Urban-style slide-out panel
// listing every service category from the live Admin Catalog, and on request,
// the real catalog hierarchy nested underneath it:
// Category -> Services (backend "Service" rows) -> Packages.
// Data comes straight from the public catalog endpoints.
export function AllServicesDrawer({ isOpen, onClose, navigate: navigateProp, user, categories: categoriesProp }) {
  const [realCategories, setRealCategories] = useState(() => Array.isArray(categoriesProp) && categoriesProp.length > 0 ? categoriesProp : [])
  const [categoriesLoaded, setCategoriesLoaded] = useState(() => Array.isArray(categoriesProp) && categoriesProp.length > 0)
  const [expandedCats, setExpandedCats] = useState(() => new Set())
  const [expandedServices, setExpandedServices] = useState(() => new Set())
  // real CatalogCategory.id -> "loading" | Service[]
  const [subServicesByCat, setSubServicesByCat] = useState({})
  // Service.id -> "loading" | Package[]
  const [packagesByService, setPackagesByService] = useState({})

  useEffect(() => {
    if (Array.isArray(categoriesProp) && categoriesProp.length > 0) {
      setRealCategories(categoriesProp)
      setCategoriesLoaded(true)
      return
    }
    if (!isOpen || categoriesLoaded) return
    apiRequest("/catalog/categories/")
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setRealCategories(res.data)
        }
      })
      .catch((err) => console.error("Failed to load categories for All Services drawer:", err))
      .finally(() => setCategoriesLoaded(true))
  }, [isOpen, categoriesLoaded, categoriesProp])

  // Filter out inactive and grocery categories
  const serviceCategories = useMemo(() => {
    return realCategories.filter((c) => c.is_active !== false && !isGroceryCategory(c))
  }, [realCategories])

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

  const goTo = (categorySlug, subtabSlug) => {
    const s = String(categorySlug || "").toLowerCase()
    const sub = String(subtabSlug || "").toLowerCase()
    if (s.includes("goods") || s.includes("transport") || s.includes("logistics") || s === "gt") {
      onClose()
      if (sub.includes("two-wheeler") || sub.includes("2-wheeler") || sub.includes("bike")) {
        navigateProp(routes.two_wheeler_booking_hosur)
      } else if (sub.includes("mini-truck") || sub.includes("truck")) {
        navigateProp(routes.truck_booking_hosur)
      } else if (sub.includes("packer") || sub.includes("mover")) {
        navigateProp(routes.packers_movers_booking_hosur)
      } else {
        navigateProp("/home", { state: { openGoodsModal: true } })
      }
      return
    }
    const qs = subtabSlug
      ? `?category=${encodeURIComponent(categorySlug)}&subtab=${encodeURIComponent(subtabSlug)}`
      : `?category=${encodeURIComponent(categorySlug)}`
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

  const onCategoryClick = (cat) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat.id)) next.delete(cat.id)
      else next.add(cat.id)
      return next
    })
    if (!expandedCats.has(cat.id)) loadSubServices(cat)
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
        {/* Greeting Header */}
        <div className="bg-[var(--sevo-primary,#0f766e)] text-white px-4 py-4 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold truncate">
              Hello, {user?.full_name || user?.fullName || user?.first_name || "sign in"}
            </div>
            <div className="text-[11px] text-white/80 font-semibold">Service Directory</div>
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
              Service Categories
            </span>
          </div>

          {!categoriesLoaded && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {categoriesLoaded && serviceCategories.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">
              No active services found in the catalog.
            </div>
          )}

          {categoriesLoaded && serviceCategories.map((cat) => {
            const Icon = getCategoryIcon(cat)
            const isExpanded = expandedCats.has(cat.id)
            const subServices = subServicesByCat[cat.id]
            const subServicesLoading = subServices === "loading"
            const subServiceRows = Array.isArray(subServices) ? subServices : []

            return (
              <div key={cat.id} className="border-b border-[var(--sevo-border,#f1f5f9)]">
                <button
                  type="button"
                  onClick={() => onCategoryClick(cat)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--sevo-surface-raised,#f8fafc)] transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--sevo-primary-light,#f0fdfa)] text-[var(--sevo-primary,#0f766e)] flex items-center justify-center shrink-0 overflow-hidden">
                    {cat.image ? (
                      <img
                        src={resolveImageUrl(cat.image)}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div className={`w-full h-full ${cat.image ? 'hidden' : 'flex'} items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="flex-1 text-sm font-bold text-[var(--sevo-text-primary,#0f172a)] truncate">
                    {cat.name}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pb-2 bg-[var(--sevo-surface-raised,#f8fafc)]/60">
                    {subServicesLoading && (
                      <div className="flex items-center gap-2 pl-[52px] pr-4 py-2 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading services…</span>
                      </div>
                    )}

                    {!subServicesLoading && subServiceRows.length === 0 && (
                      <button
                        type="button"
                        onClick={() => goTo(cat.slug)}
                        className="w-full flex items-center gap-2 pl-[52px] pr-4 py-2 text-xs font-semibold text-[var(--sevo-text-secondary,#475569)] hover:text-[var(--sevo-primary,#0f766e)] transition-colors cursor-pointer text-left"
                      >
                        Explore {cat.name} →
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
                                  onClick={() => goTo(cat.slug, svc.slug)}
                                  className="w-full flex items-center gap-2 pl-[76px] pr-4 py-1.5 text-[11px] font-semibold text-[var(--sevo-text-secondary,#475569)] hover:text-[var(--sevo-primary,#0f766e)] transition-colors cursor-pointer text-left"
                                >
                                  <PackageIcon className="w-3 h-3 text-slate-300 shrink-0" />
                                  <span className="truncate flex-1">{pkg.name}</span>
                                  {pkg.base_price != null && (
                                    <span className="text-slate-500 font-bold shrink-0">
                                      ₹{Number(pkg.offer_price || pkg.base_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </span>
                                  )}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() => goTo(cat.slug, svc.slug)}
                                className="w-full flex items-center gap-2 pl-[76px] pr-4 py-1.5 text-[11px] font-black text-[var(--sevo-primary,#0f766e)] hover:underline transition-colors cursor-pointer text-left"
                              >
                                View all {svc.name} options →
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {!subServicesLoading && subServiceRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => goTo(cat.slug)}
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

