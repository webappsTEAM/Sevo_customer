import React, { useState, useEffect } from "react"
import { ChevronDown, Utensils, Pencil, Plus, Minus } from "lucide-react"
import { EditableText, EditableImage } from "../SuperAdminEditControls.jsx"

/**
 * VegetableProductCard
 * Renders individual vegetable produce card with photo, price, discount
 * ribbon, variant pill selector (when multi-pack), a Blinkit-style floating
 * Add-to-Cart button, and 'What Can I Make?' recipe trigger.
 */
export function VegetableProductCard({
  item,
  cartCount = 0,
  foodCart = null,
  onUpdateQty,
  onOpenOptions,
  onDiscoverRecipes,
  onSelectProduct,
  deliveryBadge = "8 MINS",
  fallbackPhoto = "/mockups/vegetables_realistic.png",
  editable = false,
  onSaveField,
}) {
  const hasOptions = item.options && item.options.length > 0
  const isOutOfStock = item.in_stock === false || item.max_quantity === 0

  // ── Multi-variant support ───────────────────────────────────────────
  const variants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : []
  const hasMultipleVariants = variants.length > 1
  const defaultVariant = variants.find((v) => v.is_default) || variants[0] || null

  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id || null)

  useEffect(() => {
    if (variants.length > 0 && (!selectedVariantId || !variants.some(v => v.id === selectedVariantId))) {
      setSelectedVariantId(defaultVariant?.id || null)
    }
  }, [item.id, variants.length])

  const activeVariant = variants.find((v) => v.id === selectedVariantId) || defaultVariant

  // Active pricing and unit resolution
  const activePrice = activeVariant ? Math.round(Number(activeVariant.base_price) || 0) : item.price
  const activeMrp = activeVariant?.mrp ? Math.round(Number(activeVariant.mrp) || 0) : item.mrp
  const activeUnit = activeVariant
    ? (activeVariant.name || `${activeVariant.pack_value} ${activeVariant.unit}`)
    : (item.unit || "500 g")

  const activeDiscount = (activeMrp && activeMrp > activePrice)
    ? `${Math.round(((activeMrp - activePrice) / activeMrp) * 100)}% OFF`
    : item.discount

  // Variant-specific cart key
  const variantCartKey = hasMultipleVariants && activeVariant
    ? `${item.name} (${activeUnit})`
    : item.name

  // Resolve current active item/variant quantity in cart
  const resolvedCartCount = foodCart
    ? (foodCart[variantCartKey] || (variants.length <= 1 ? (foodCart[item.name] || 0) : 0))
    : (typeof cartCount === "object" && cartCount !== null ? (cartCount[variantCartKey] || 0) : cartCount)

  const handleCardClick = () => {
    if (editable) return
    if (onSelectProduct) {
      onSelectProduct(item)
    } else if (onDiscoverRecipes) {
      onDiscoverRecipes(item)
    }
  }

  const handleQtyChange = (delta) => {
    if (onUpdateQty) {
      onUpdateQty(variantCartKey, delta, { variant: activeVariant, packageId: item.id })
    }
  }

  return (
    <div
      className="group rounded-lg border border-slate-200 bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col justify-between transition-shadow duration-200 overflow-visible relative"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "0 260px",
      }}
    >
      <div
        onClick={handleCardClick}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleCardClick()
          }
        }}
      >
        {/* Product Photographic Image */}
        <div className="relative w-full aspect-square bg-[#f8f8f8] overflow-hidden rounded-t-lg">
          {editable ? (
            <EditableImage
              active={true}
              value={item.image || fallbackPhoto}
              onSave={(url) => onSaveField && onSaveField(item, "image", url)}
              assetType="packages"
              alt={item.name}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
          ) : (
            <img
              src={item.image || fallbackPhoto}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = fallbackPhoto
              }}
            />
          )}

          {/* Discount ribbon — Blinkit-style green badge, top-left */}
          {activeDiscount && (
            <div className="absolute top-0 left-0 bg-[#0C831F] text-white text-[9px] font-black px-1.5 py-1 rounded-tl-lg rounded-br-lg uppercase tracking-wide leading-none shadow-xs">
              {activeDiscount}
            </div>
          )}

          {/* Delivery speed badge */}
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-white/95 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-800 border border-slate-200/60 shadow-xs">
            <span>⚡</span>
            <span>{deliveryBadge}</span>
          </div>

          {editable && (
            <div className="absolute bottom-2 right-2 bg-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider flex items-center gap-1 pointer-events-none">
              <Pencil className="w-2.5 h-2.5" /> Edit mode
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="px-2 pt-2 pb-1">
          <h5 className="text-[11px] sm:text-xs font-semibold text-slate-900 line-clamp-2 leading-snug min-h-[30px]" title={item.name}>
            <EditableText
              active={editable}
              value={item.name}
              onSave={(v) => onSaveField && onSaveField(item, "name", v)}
              className="text-[11px] sm:text-xs"
              inputClassName="w-24"
            />
          </h5>

          {/* Unit / Pack Size pills */}
          {hasMultipleVariants ? (
            <div
              className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5 no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {variants.map((v) => {
                const isSelected = (activeVariant?.id === v.id)
                const vLabel = v.name || `${v.pack_value} ${v.unit}`
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedVariantId(v.id)
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-all shrink-0 cursor-pointer border leading-none ${
                      isSelected
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-600/30"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {vLabel}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-[10px] font-medium text-slate-500 mt-0.5">
              {activeUnit}
            </p>
          )}
        </div>
      </div>

      {/* Price row + floating Add button */}
      <div className="px-2 pb-2 pt-0.5 relative">
        <div className="flex items-end justify-between gap-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[13px] font-black text-slate-900">
              {editable ? (
                <EditableText
                  active={true}
                  type="number"
                  prefix="₹"
                  value={activePrice}
                  onSave={(v) => onSaveField && onSaveField(item, "base_price", v)}
                  inputClassName="w-16"
                />
              ) : (
                <>₹{activePrice}</>
              )}
            </span>
            {editable ? (
              <span className="text-[9px] text-slate-400">
                MRP: <EditableText
                  active={true}
                  type="number"
                  prefix="₹"
                  value={activeMrp || 0}
                  onSave={(v) => onSaveField && onSaveField(item, "offer_price", v)}
                  inputClassName="w-16"
                />
              </span>
            ) : (
              activeMrp && activeMrp > activePrice && (
                <span className="text-[10px] text-slate-400 line-through">₹{activeMrp}</span>
              )
            )}
          </div>
        </div>

        {/* Floating ADD / qty control — offset upward so it overlaps the
            image's bottom-right corner, matching Blinkit's product card. */}
        <div className="absolute -top-6 right-2">
          {isOutOfStock ? (
            <div className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 font-bold text-[9px] border border-slate-200 select-none uppercase tracking-wide whitespace-nowrap">
              Sold out
            </div>
          ) : hasOptions ? (
            resolvedCartCount > 0 ? (
              <button
                type="button"
                onClick={() => onOpenOptions && onOpenOptions(item)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0C831F] text-white font-extrabold text-[11px] shadow-sm flex items-center gap-0.5 cursor-pointer"
              >
                <span>{resolvedCartCount}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenOptions && onOpenOptions(item)}
                className="px-3 py-1.5 rounded-lg border border-[#0C831F] text-[#0C831F] hover:bg-[#0C831F] hover:text-white bg-white font-extrabold text-[11px] transition-colors cursor-pointer active:scale-95 shadow-sm flex items-center gap-0.5"
              >
                <span>ADD</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )
          ) : resolvedCartCount > 0 ? (
            <div className="flex items-center bg-[#0C831F] text-white rounded-lg shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                className="text-white hover:bg-white/10 font-bold text-xs cursor-pointer w-6 h-7 flex items-center justify-center active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-black min-w-[16px] text-center">
                {resolvedCartCount}
              </span>
              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                className="text-white hover:bg-white/10 font-bold text-xs cursor-pointer w-6 h-7 flex items-center justify-center active:scale-90"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleQtyChange(1)}
              className="px-3.5 py-1.5 rounded-lg border border-[#0C831F] text-[#0C831F] hover:bg-[#0C831F] hover:text-white bg-white font-extrabold text-[11px] transition-colors cursor-pointer active:scale-95 shadow-sm"
            >
              ADD
            </button>
          )}
        </div>
      </div>

      {/* Secondary CTA: What Can I Make? */}
      <button
        type="button"
        onClick={() => onDiscoverRecipes && onDiscoverRecipes(item)}
        className="w-full py-1.5 px-2 rounded-b-lg bg-amber-50/80 hover:bg-amber-100/80 border-t border-amber-100 text-amber-900 font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
      >
        <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
        <span className="truncate">🍳 What Can I Make?</span>
      </button>
    </div>
  )
}
