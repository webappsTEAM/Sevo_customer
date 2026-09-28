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
    <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#0C831F]" />
            <span>{title}</span>
          </h4>
          {subtitle && (
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-[10px] font-bold text-[#0C831F] bg-[#E6F6F1] px-2 py-0.5 rounded-full">
          Farm Fresh
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
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
              className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-between hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div>
                <div className="w-full aspect-square rounded-md bg-[#f8f8f8] overflow-hidden relative mb-1.5">
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
                </div>

                <h5 className="text-[11px] font-semibold text-slate-900 line-clamp-1" title={name}>
                  {name}
                </h5>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                  {unit}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                <span className="text-xs font-black text-slate-900">
                  ₹{price}
                </span>

                {rec.in_stock === false || rec.max_quantity === 0 ? (
                  <div className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[9px] border border-slate-200 select-none uppercase tracking-wide">
                    Sold out
                  </div>
                ) : inCart ? (
                  <div className="flex items-center gap-1 bg-[#0C831F] text-white rounded-md px-2 py-1 text-[10px] font-bold">
                    <Check className="w-3 h-3" />
                    <span>In Cart</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateQty && onUpdateQty(name, 1)}
                    className="px-2 py-1 rounded-md border border-[#0C831F] bg-white hover:bg-[#0C831F] text-[#0C831F] hover:text-white font-bold text-[10px] transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
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
