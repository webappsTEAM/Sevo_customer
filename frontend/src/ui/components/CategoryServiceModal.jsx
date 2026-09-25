import React, { useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  X, Sparkles, Wrench, Shield, Home, Droplet, Zap,
  Check, ArrowRight, Clock, Star, Snowflake, Bath, Utensils,
  Sofa, Wind, Tv, Lightbulb, Plug, Hammer, Paintbrush,
  Layers, ShieldCheck, ChevronRight, Bug, Flame, Truck
} from "lucide-react"

// Professional dynamic icon resolver based on service name
function resolveServiceIcon(name = "") {
  const n = (name || "").toLowerCase()
  if (n.includes("bath") || n.includes("toilet") || n.includes("sanitary")) return Bath
  if (n.includes("kitchen") || n.includes("oven") || n.includes("chimney")) return Utensils
  if (n.includes("sofa") || n.includes("carpet") || n.includes("living") || n.includes("cushion")) return Sofa
  if (n.includes("ac") || n.includes("air") || n.includes("hvac") || n.includes("cooling")) return Snowflake
  if (n.includes("electric") || n.includes("wiring") || n.includes("switch") || n.includes("fan")) return Zap
  if (n.includes("plumb") || n.includes("tap") || n.includes("pipe") || n.includes("water") || n.includes("leak")) return Droplet
  if (n.includes("paint") || n.includes("polish") || n.includes("wall")) return Paintbrush
  if (n.includes("mason") || n.includes("tile") || n.includes("brick") || n.includes("plaster")) return Hammer
  if (n.includes("pest") || n.includes("termite") || n.includes("cockroach") || n.includes("bug")) return Bug
  if (n.includes("truck") || n.includes("transport") || n.includes("mover") || n.includes("logistics")) return Truck
  if (n.includes("clean")) return Sparkles
  return Wrench
}

export function CategoryServiceModal({
  isOpen,
  onClose,
  category,
  onSelectService,
  allBackendServices = []
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const categorySlug = useMemo(() => {
    return (category?.slug || category?.serviceCategoryId || category?.id || "").toString().toLowerCase()
  }, [category])

  // Derive services purely dynamically from live backend catalog
  const matchedServices = useMemo(() => {
    const catId = category?.id?.toString()
    const catSlug = (category?.slug || "").toLowerCase()
    return (allBackendServices || []).filter(s => {
      const sCat = s.category?.toString()
      const sSlug = (s.category_slug || "").toLowerCase()
      return (catId && sCat === catId) || (catSlug && sSlug === catSlug)
    })
  }, [category, allBackendServices])

  if (!isOpen || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {category?.name || "Professional Services"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a service to view packages and transparent rates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {matchedServices.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {matchedServices.map((svc, sIdx) => {
                const Icon = resolveServiceIcon(svc.name)
                return (
                  <button
                    key={svc.id || sIdx}
                    type="button"
                    onClick={() => {
                      onClose()
                      onSelectService(categorySlug, svc.slug || svc.name)
                    }}
                    className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/40 dark:bg-slate-800/60 dark:hover:bg-emerald-950/30 border border-slate-200/80 hover:border-emerald-500 dark:border-slate-700 dark:hover:border-emerald-500/60 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-md hover:-translate-y-0.5 justify-between min-h-[104px]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center relative overflow-hidden mb-2 group-hover:scale-105 group-hover:border-emerald-200 transition-all shrink-0 shadow-2xs text-emerald-700 dark:text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>

                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2">
                      {svc.name}
                    </span>

                    {svc.duration && (
                      <span className="text-[10px] text-slate-400 font-medium mt-1">
                        {svc.duration}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              All services for this category are available directly on the page.
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Service Warranty & Quality Guaranteed</span>
          </div>
          <span>Hosur Verified Specialists</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
