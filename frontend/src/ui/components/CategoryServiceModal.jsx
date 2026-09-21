import React, { useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Sparkles, Wrench, Shield, Layers, Home, Droplet, Zap,
  Check, ArrowRight, Clock, Star
} from "lucide-react"
import { resolveImageUrl } from "../../utils/imageUrl.js"

// Category grouping configuration following mature marketplace patterns
const CATEGORY_GROUPS_CONFIG = {
  home_pest_control: {
    title: "Cleaning & Pest Control",
    groups: [
      {
        heading: "Cleaning",
        services: [
          { name: "Bathroom Cleaning", eta: "25 mins", subtab: "Bathroom Cleaning", icon: "🛁", image: "/mockups/category_home_repair_3d.jpg" },
          { name: "Kitchen Cleaning", eta: "45 mins", subtab: "Kitchen Cleaning", icon: "🍳", image: "/mockups/category_home_repair_3d.jpg" },
          { name: "Living & Bedroom Cleaning", eta: "45 mins", subtab: "Sofa, Carpet & Upholstery Cleaning", icon: "🛋️", image: "/mockups/category_home_repair_3d.jpg" },
          { name: "Full Home Deep Cleaning", eta: "2-4 hrs", subtab: "Full Home Deep Cleaning", icon: "🏠", image: "/mockups/category_home_repair_3d.jpg" },
          { name: "Room Care & Mini Services", eta: "30 mins", subtab: "Room Care & Mini Services", icon: "🪟", image: "/mockups/category_home_repair_3d.jpg" },
        ]
      },
      {
        heading: "Pest Control",
        services: [
          { name: "Cockroach Control", eta: "30 mins", subtab: "Pest & Termite Control", icon: "🪳", image: "/mockups/category_home_repair_3d.jpg" },
          { name: "Termite Control", eta: "1 hr", subtab: "Pest & Termite Control", icon: "🐜", image: "/mockups/category_home_repair_3d.jpg" },
          { name: "Ants & Bed Bugs Control", eta: "45 mins", subtab: "Pest & Termite Control", icon: "🦟", image: "/mockups/category_home_repair_3d.jpg" },
        ]
      }
    ]
  },
  ac_appliance: {
    title: "AC & Appliance Repair",
    groups: [
      {
        heading: "Air Conditioner",
        services: [
          { name: "AC Service & Cleaning", eta: "35 mins", subtab: "AC Service & Cleaning", icon: "❄️", image: "/assets/hvac/ac_inspection_banner_collage.png" },
          { name: "AC Repair & Diagnostics", eta: "45 mins", subtab: "AC Repair & Diagnostics", icon: "🔧", image: "/assets/hvac/ac_inspection_banner_collage.png" },
          { name: "AC Gas Top-Up", eta: "30 mins", subtab: "AC Gas & Refrigerant", icon: "💨", image: "/assets/hvac/ac_inspection_banner_collage.png" },
          { name: "Installation & Uninstallation", eta: "1 hr", subtab: "AC Installation & Uninstallation", icon: "📦", image: "/assets/hvac/ac_inspection_banner_collage.png" },
        ]
      },
      {
        heading: "Home Appliances",
        services: [
          { name: "Washing Machine", eta: "45 mins", subtab: "Washing Machine Repair", icon: "🧺", image: "/assets/hero_illustration.jpg" },
          { name: "Refrigerator", eta: "45 mins", subtab: "Refrigerator Repair", icon: "🧊", image: "/assets/hero_illustration.jpg" },
          { name: "Water Purifier (RO)", eta: "30 mins", subtab: "Water Purifier (RO) Service & Repair", icon: "💧", image: "/assets/hero_illustration.jpg" },
          { name: "Geyser & Water Heater", eta: "30 mins", subtab: "Geyser & Water Heater Repair", icon: "⚡", image: "/assets/hero_illustration.jpg" },
          { name: "Microwave & Oven", eta: "40 mins", subtab: "Microwave Repair", icon: "🍲", image: "/assets/hero_illustration.jpg" },
          { name: "TV Installation & Repair", eta: "45 mins", subtab: "TV Installation & Repair", icon: "📺", image: "/assets/hero_illustration.jpg" },
        ]
      }
    ]
  },
  electrician_plumbing_carpentry: {
    title: "Electrician, Plumber & Carpenter",
    groups: [
      {
        heading: "Electrician",
        services: [
          { name: "Switch & Socket Repair", eta: "20 mins", subtab: "Electrician Services", icon: "⚡", image: "/assets/hero_pro_electrical.jpg" },
          { name: "Fan & Light Installation", eta: "25 mins", subtab: "Electrician Services", icon: "💡", image: "/assets/hero_pro_electrical.jpg" },
          { name: "MCB & Fuse Diagnostics", eta: "30 mins", subtab: "Electrician Services", icon: "🔌", image: "/assets/hero_pro_electrical.jpg" },
        ]
      },
      {
        heading: "Plumber",
        services: [
          { name: "Tap, Mixer & Shower Repair", eta: "25 mins", subtab: "Plumber Services", icon: "🚰", image: "/assets/hero_pro_electrical.jpg" },
          { name: "Toilet & Sanitary Fittings", eta: "40 mins", subtab: "Plumber Services", icon: "🚽", image: "/assets/hero_pro_electrical.jpg" },
          { name: "Drainage Leakage & De-clog", eta: "30 mins", subtab: "Plumber Services", icon: "🚿", image: "/assets/hero_pro_electrical.jpg" },
          { name: "Water Tank Cleaning", eta: "1 hr", subtab: "Plumber Services", icon: "💧", image: "/assets/hero_pro_electrical.jpg" },
        ]
      },
      {
        heading: "Carpenter",
        services: [
          { name: "Door Locks & Handles", eta: "30 mins", subtab: "Carpenter Services", icon: "🚪", image: "/assets/hero_pro_electrical.jpg" },
          { name: "Furniture Repair & Assembly", eta: "45 mins", subtab: "Carpenter Services", icon: "🪑", image: "/assets/hero_pro_electrical.jpg" },
          { name: "Curtain Rod & Wall Hanging", eta: "20 mins", subtab: "Carpenter Services", icon: "🖼️", image: "/assets/hero_pro_electrical.jpg" },
        ]
      }
    ]
  },
  paintings: {
    title: "Painting & Waterproofing",
    groups: [
      {
        heading: "Painting",
        services: [
          { name: "Interior Wall Painting", eta: "Laser Quote", subtab: "Interior Painting", icon: "🏠", image: "/assets/Painting/Interior.webp" },
          { name: "Exterior Home Painting", eta: "Laser Quote", subtab: "Exterior Painting", icon: "🏢", image: "/assets/Painting/Interior.webp" },
          { name: "Wood & Metal Polish", eta: "Laser Quote", subtab: "Wood & Metal", icon: "🪵", image: "/assets/Painting/Interior.webp" },
        ]
      },
      {
        heading: "Waterproofing",
        services: [
          { name: "Terrace Waterproofing", eta: "Laser Quote", subtab: "Waterproofing", icon: "💧", image: "/assets/Painting/Interior.webp" },
          { name: "Wall Dampness & Seepage", eta: "Laser Quote", subtab: "Waterproofing", icon: "🛡️", image: "/assets/Painting/Interior.webp" },
        ]
      }
    ]
  },
  mason: {
    title: "Masonry & Civil Work",
    groups: [
      {
        heading: "Masonry & Civil",
        services: [
          { name: "Bathroom Tile Fixing", eta: "Laser Quote", subtab: "Bathroom Tile Fixing", icon: "🧱", image: "/mockups/brick_wall_construction_red.jpg" },
          { name: "Wall Plaster & Brick Repair", eta: "Laser Quote", subtab: "Minor Masonry / Small Construction Work", icon: "🔨", image: "/mockups/brick_wall_construction_red.jpg" },
          { name: "Civil Drilling & Minor Repairs", eta: "Laser Quote", subtab: "Minor Masonry / Small Construction Work", icon: "📐", image: "/mockups/brick_wall_construction_red.jpg" },
        ]
      }
    ]
  }
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
    const raw = (category?.slug || category?.serviceCategoryId || category?.id || "").toString().toLowerCase().replace(/[^a-z0-9_]/g, "")
    if (raw.includes("ac") || raw.includes("appliance") || raw.includes("hvac")) return "ac_appliance"
    if (raw.includes("clean") || raw.includes("pest")) return "home_pest_control"
    if (raw.includes("elec") || raw.includes("plumb") || raw.includes("carpent")) return "electrician_plumbing_carpentry"
    if (raw.includes("paint")) return "paintings"
    if (raw.includes("mason")) return "mason"
    return raw
  }, [category])

  const modalConfig = useMemo(() => {
    if (CATEGORY_GROUPS_CONFIG[categorySlug]) {
      return CATEGORY_GROUPS_CONFIG[categorySlug]
    }

    // Dynamic fallback for any other category: group all matched backend services
    const catId = category?.id?.toString()
    const catSlug = (category?.slug || "").toLowerCase()
    const matched = allBackendServices.filter(s => {
      const sCat = s.category?.toString()
      const sSlug = (s.category_slug || "").toLowerCase()
      return sCat === catId || (catSlug && sSlug === catSlug)
    })

    return {
      title: category?.name || "Professional Services",
      groups: [
        {
          heading: "Available Services",
          services: matched.map(s => ({
            name: s.name,
            eta: s.duration || "45 mins",
            subtab: s.name,
            icon: "✨",
            image: s.image ? resolveImageUrl(s.image) : "/assets/hero_illustration.jpg"
          }))
        }
      ]
    }
  }, [categorySlug, category, allBackendServices])

  if (!isOpen || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {modalConfig.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a service to view packages and upfront rates
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
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {modalConfig.groups.map((grp, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{grp.heading}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {grp.services.map((svc, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      onClose()
                      onSelectService(categorySlug, svc.subtab || svc.name)
                    }}
                    className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-800/60 dark:hover:bg-emerald-950/30 border border-slate-200/80 hover:border-emerald-500 dark:border-slate-700 dark:hover:border-emerald-500/60 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-md hover:-translate-y-0.5 justify-between min-h-[110px]"
                  >
                    <div className="w-13 h-13 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center relative overflow-hidden mb-2 group-hover:scale-105 transition-transform shrink-0 shadow-2xs">
                      {svc.image ? (
                        <img
                          src={svc.image}
                          alt={svc.name}
                          className="w-full h-full object-cover p-1 rounded-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = "flex"
                            }
                          }}
                        />
                      ) : null}
                      <span className={`text-2xl ${svc.image ? "hidden" : "flex"} items-center justify-center`}>
                        {svc.icon}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight line-clamp-2">
                      {svc.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Guarantee */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>30-Day Revisit Guarantee</span>
          </div>
          <span>Hosur verified specialists</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
