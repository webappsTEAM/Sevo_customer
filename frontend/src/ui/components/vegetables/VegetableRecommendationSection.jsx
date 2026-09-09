import React from "react"
import { Sparkles, Plus, Check, Clock } from "lucide-react"

/**
 * VegetableRecommendationSection
 * Displays database-driven 'Goes Well With' or 'You May Also Like' vegetable recommendations.
 * Allows instant 1-click adding to cart.
 */
export function VegetableRecommendationSection({
  title = "Goes Well With This",
  subtitle = "Commonly prepared together with your selected vegetables",
  recommendations = [],
  foodCart = {},
  onUpdateQty,
  fallbackPhoto = "/mockups/vegetables_realistic.png",
}) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mt-6">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{title}</span>
          </h4>
          {subtitle && (
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
          Farm Fresh
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {recommendations.map((rec, idx) => {
          const name = rec.recommended_name || rec.name
          const price = Math.round(Number(rec.recommended_price || rec.price) || 0)
          const mrp = rec.recommended_offer_price ? Math.round(Number(rec.recommended_offer_price)) : null
          const unit = rec.recommended_unit || rec.unit || "500 g"
          const image = rec.recommended_image || rec.image || fallbackPhoto
          const inCart = (foodCart[name] || 0) > 0

          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/90 hover:border-emerald-500 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all"
            >
              <div>
                <div className="w-full aspect-square rounded-lg bg-slate-100 overflow-hidden relative mb-2">
                  <img
                    src={image}
                    alt={name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = fallbackPhoto
                    }}
                  />
                  <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-700">
                    8 MINS
                  </div>
                </div>

                <h5 className="text-xs font-bold text-slate-900 line-clamp-1" title={name}>
                  {name}
                </h5>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  {unit}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-black text-slate-900">
                  ₹{price}
                </span>

                {rec.in_stock === false || rec.max_quantity === 0 ? (
                  <div className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-extrabold text-[10px] border border-slate-200 select-none uppercase tracking-wider">
                    OUT OF STOCK
                  </div>
                ) : inCart ? (
                  <div className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-2 py-1 text-[11px] font-extrabold shadow-2xs">
                    <Check className="w-3 h-3" />
                    <span>In Cart</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateQty && onUpdateQty(name, 1)}
                    className="px-2.5 py-1 rounded-lg border border-emerald-600 bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white font-black text-[11px] transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ADD</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
