import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  X, ChevronRight, ChevronDown, User as UserIcon,
  Sparkles, Wind, Zap, Droplet, Hammer, Bug, PaintRoller,
  Boxes, Wrench, ShoppingBag, LayoutGrid
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

// Sitewide "All Services" directory -- an Amazon-style slide-out panel
// listing every category with its live catalog services nested underneath.
// Data comes straight from the public catalog endpoints (same ones
// BookingPage.jsx already uses), so a service the admin adds or renames in
// the catalog shows up here automatically on next open, no code change.
export function AllServicesDrawer({ isOpen, onClose, navigate: navigateProp, user }) {
  const [dbServices, setDbServices] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => {
    if (!isOpen || loaded) return
    apiRequest("/catalog/services/")
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setDbServices(res.data)
        }
      })
      .catch((err) => console.error("Failed to load services for All Services drawer:", err))
      .finally(() => setLoaded(true))
  }, [isOpen, loaded])

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

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const servicesFor = (cat) => {
    if (!dbServices.length) return []
    const catWords = cat.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    return dbServices.filter((s) => {
      const cn = (s.category_name || "").toLowerCase()
      if (!cn) return false
      if (cn === cat.name.toLowerCase()) return true
      return catWords.some((w) => cn.includes(w))
    })
  }

  const goTo = (categoryId, subtab) => {
    const qs = subtab ? `?category=${categoryId}&subtab=${encodeURIComponent(subtab)}` : `?category=${categoryId}`
    navigateProp(`${routes.booking_services}${qs}`)
    onClose()
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
            const isExpanded = expanded.has(cat.id)
            const children = servicesFor(cat)

            return (
              <div key={cat.id} className="border-b border-[var(--sevo-border,#f1f5f9)]">
                <button
                  type="button"
                  onClick={() => (children.length > 0 ? toggle(cat.id) : goTo(cat.id))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--sevo-surface-raised,#f8fafc)] transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--sevo-primary-light,#f0fdfa)] text-[var(--sevo-primary,#0f766e)] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-bold text-[var(--sevo-text-primary,#0f172a)] truncate">
                    {cat.name}
                  </span>
                  {children.length > 0 ? (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                </button>

                {isExpanded && children.length > 0 && (
                  <div className="pb-2 bg-[var(--sevo-surface-raised,#f8fafc)]/60">
                    {children.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => goTo(cat.id, svc.name)}
                        className="w-full flex items-center gap-2 pl-[52px] pr-4 py-2 text-xs font-semibold text-[var(--sevo-text-secondary,#475569)] hover:text-[var(--sevo-primary,#0f766e)] transition-colors cursor-pointer text-left"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                        <span className="truncate">{svc.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => goTo(cat.id)}
                      className="w-full flex items-center gap-2 pl-[52px] pr-4 py-2 text-xs font-black text-[var(--sevo-primary,#0f766e)] hover:underline transition-colors cursor-pointer text-left"
                    >
                      View all {cat.name} →
                    </button>
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
