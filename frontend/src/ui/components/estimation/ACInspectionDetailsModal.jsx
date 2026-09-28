import React, { useMemo } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import {
  X, Settings, Home, Wrench, CheckCircle2
} from "lucide-react"

export function ACInspectionDetailsModal({
  isOpen,
  onClose,
  config,
  onBookInspection,
  onIncrementInspection,
  onDecrementInspection,
  inCart = false,
  cartQty = 0,
}) {
  const categories = useMemo(() => {
    return config?.rateCardCategories || []
  }, [config])

  const fee = config?.diagnostic_fee != null ? Number(config.diagnostic_fee) : (config?.fee || 199)

  if (!isOpen) return null

  const includesList = (config?.includes && config.includes.length > 0)
    ? config.includes
    : [
        "Comprehensive 21-point system & safety diagnostics",
        "Cooling delta temp scan & gas pressure test",
        "Compressor load & capacitor electrical scan",
        "Itemized quotation before any repair work",
      ]

  const readyList = (config?.ready && config.ready.length > 0)
    ? config.ready
    : [
        "Continuous power supply and remote control available for testing",
        "Clear access to indoor and outdoor AC units",
        "Area below indoor unit cleared of electronics & valuables",
        "Outdoor unit safely accessible via balcony, terrace, or window",
      ]

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {config?.title || "AC Inspection & Diagnostic Visit"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
              {config?.subtitle || "Certified doorstep diagnostic, itemized quote before repair, and standard spare parts rate card."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. What's Included */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-sky-600" />
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                What's Included
              </h4>
            </div>
            <ul className="space-y-2.5 pl-0.5">
              {includesList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-slate-700 leading-relaxed">
                    {typeof item === "string" ? item : (item?.text || "")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. What You Need to Keep Ready */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                What You Need to Keep Ready
              </h4>
            </div>
            <ul className="space-y-2.5 pl-0.5">
              {readyList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-slate-700 leading-relaxed">
                    {typeof item === "string" ? item : (item?.text || "")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Spare Parts & Repair Rate Card - Single Line NoBroker Style */}
          <div className="space-y-3.5 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  Spare Parts &amp; Repair Rate Card
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Standard fixed pricing • ₹{fee} diagnostic fee adjustable against repairs
                </p>
              </div>
            </div>

            {/* Single Line List View */}
            <div className="space-y-3.5">
              {categories.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold text-center">
                  {config?.error || "Unable to load current rate card."}
                </div>
              ) : (
                categories.map((cat, catIdx) => (
                <div
                  key={cat.id || catIdx}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs"
                >
                  {/* Category Header */}
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      {cat.name}
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-400">
                      {cat.items?.length || 0} items
                    </span>
                  </div>

                  {/* Single Line List Rows (NoBroker style) */}
                  <div className="divide-y divide-slate-100">
                    {(cat.items || []).map((item, idx) => {
                      const isFree = (item.price || "").toLowerCase() === "free"

                      return (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                              {item.name}
                            </span>
                            {item.note && (
                              <span className="text-[11px] text-slate-500 font-normal">
                                ({item.note})
                              </span>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            {isFree ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                Free
                              </span>
                            ) : (
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                                {item.price}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>

        {/* Modal Footer CTA matching the exact UI view style */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          {cartQty === 0 ? (
            <button
              type="button"
              onClick={() => onBookInspection()}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#008f5d] hover:bg-[#007a4f] text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>+ Add to Booking</span>
            </button>
          ) : (
            <div className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-2xl bg-[#008f5d] text-white shadow-md">
              <button
                type="button"
                onClick={() => onDecrementInspection && onDecrementInspection()}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-base cursor-pointer transition-colors"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="text-xs font-black">
                {cartQty} added to booking
              </span>
              <button
                type="button"
                onClick={() => onIncrementInspection && onIncrementInspection()}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 font-black text-base cursor-pointer transition-colors"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
