import React from "react"
import { Clock, Plus, Minus, ChevronDown, Utensils } from "lucide-react"

/**
 * VegetableProductCard
 * Renders individual vegetable produce card with photo, price, delivery badge,
 * Add to Cart counter, and 'What Can I Make?' recipe trigger.
 */
export function VegetableProductCard({
  item,
  cartCount = 0,
  onUpdateQty,
  onOpenOptions,
  onDiscoverRecipes,
  deliveryBadge = "8 MINS",
  fallbackPhoto = "/mockups/vegetables_realistic.png",
}) {
  const hasOptions = item.options && item.options.length > 0

  return (
    <div
      className="group rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md flex flex-col justify-between transition-all duration-200 overflow-hidden relative"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "0 260px",
      }}
    >
      <div
        onClick={() => onDiscoverRecipes && onDiscoverRecipes(item)}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onDiscoverRecipes && onDiscoverRecipes(item)
          }
        }}
      >
        {/* Product Photographic Image */}
        <div className="relative w-full aspect-square bg-[#f5f1eb] overflow-hidden">
          <img
            src={item.image || fallbackPhoto}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = fallbackPhoto
            }}
          />
          
          {/* Delivery speed badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-black text-slate-700 shadow-2xs">
            <Clock className="w-2.5 h-2.5 text-emerald-600" />
            <span>{deliveryBadge}</span>
          </div>

          {/* Discount badge */}
          {item.discount && (
            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
              {item.discount}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-3">
          <h5 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug min-h-[34px] group-hover:text-emerald-700 transition-colors" title={item.name}>
            {item.name}
          </h5>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
            {item.unit || "500 g"}
          </p>
        </div>
      </div>

      {/* Price, Add to Cart & What Can I Make CTA */}
      <div className="p-3 pt-0 flex flex-col gap-2 mt-auto">
        <div className="flex items-center justify-between gap-1.5">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-black text-slate-900">
                ₹{item.price}
              </span>
            </div>
            {item.mrp && item.mrp > item.price && (
              <span className="text-[10px] text-slate-400 line-through">
                ₹{item.mrp}
              </span>
            )}
          </div>

          {/* Add / Qty CTA */}
          {hasOptions ? (
            cartCount > 0 ? (
              <button
                type="button"
                onClick={() => onOpenOptions && onOpenOptions(item)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{cartCount} in Cart</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenOptions && onOpenOptions(item)}
                className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer active:scale-95 bg-white flex items-center gap-1"
              >
                <span>ADD</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )
          ) : cartCount > 0 ? (
            <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 shadow-xs">
              <button
                type="button"
                onClick={() => onUpdateQty && onUpdateQty(item.name, -1)}
                className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1.5 active:scale-90"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="text-xs font-extrabold min-w-[16px] text-center px-0.5">
                {cartCount}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQty && onUpdateQty(item.name, 1)}
                className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1.5 active:scale-90"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onUpdateQty && onUpdateQty(item.name, 1)}
              className="px-4 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-black text-[11px] transition-all cursor-pointer active:scale-95 bg-white shadow-xs"
            >
              ADD
            </button>
          )}
        </div>

        {/* Secondary CTA: What Can I Make? */}
        <button
          type="button"
          onClick={() => onDiscoverRecipes && onDiscoverRecipes(item)}
          className="w-full py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 font-bold text-[10.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
        >
          <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate">🍳 What Can I Make?</span>
        </button>
      </div>
    </div>
  )
}
