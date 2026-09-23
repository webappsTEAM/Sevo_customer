import React, { useState, useEffect, useMemo } from "react"
import {
  X, Search, Plus, Minus, Trash2, Package, Boxes, ShieldAlert,
  Sparkles, Check, AlertCircle, Info, Truck, Bike
} from "lucide-react"
import { fetchGoodsCategories, fetchGoodsItems } from "../../api/logisticsService.js"

/**
 * GoodsCargoSelectorModal
 * 
 * Production-ready dynamic Cargo & Goods Item Selection Modal.
 * Strictly adheres to SEVO GT Definition of Done:
 * - Real GoodsCategory selection (from backend DB)
 * - Real GoodsItem selection (from backend DB)
 * - Quantity stepper & validation (prevents 0 or negative quantities)
 * - Multi-item support with dynamic total weight & CFT calculation
 * - 2-Wheeler compatibility enforcement (disables truck-only items when isTwoWheeler=true)
 * - Prohibited cargo rejection
 * - Special handling detection & badging
 */
export function GoodsCargoSelectorModal({
  isOpen,
  onClose,
  selectedCargoItems = [],
  onApplyCargo,
  isTwoWheeler = false,
  selectedCategory = null,
  onSelectCategory = null,
}) {
  const [categories, setCategories] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategory?.id || null)
  const [itemsByCat, setItemsByCat] = useState({})
  const [loadingCats, setLoadingCats] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [stagedItems, setStagedItems] = useState(selectedCargoItems || [])

  // Sync staged items when modal opens
  useEffect(() => {
    if (isOpen) {
      setStagedItems(selectedCargoItems || [])
    }
  }, [isOpen, selectedCargoItems])

  // Fetch categories on open
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingCats(true)

    fetchGoodsCategories()
      .then((cats) => {
        if (cancelled) return
        if (Array.isArray(cats)) {
          // Filter out prohibited categories and P&M categories
          let validCats = cats.filter((c) => !c.is_prohibited && !c.slug?.startsWith("pm-"))
          if (isTwoWheeler) {
            validCats = validCats.filter((c) => c.allows_two_wheeler !== false)
          }
          setCategories(validCats)
          if (validCats.length > 0 && (!activeCategoryId || !validCats.some((c) => c.id === activeCategoryId))) {
            setActiveCategoryId(validCats[0].id)
            if (onSelectCategory) onSelectCategory(validCats[0])
          }
        }
      })
      .catch((err) => console.error("Failed to load goods categories:", err))
      .finally(() => {
        if (!cancelled) setLoadingCats(false)
      })

    return () => { cancelled = true }
  }, [isOpen])

  // Fetch items for the active category
  useEffect(() => {
    if (!isOpen || !activeCategoryId) return
    if (itemsByCat[activeCategoryId]) return // Already cached

    let cancelled = false
    setLoadingItems(true)

    fetchGoodsItems(activeCategoryId)
      .then((items) => {
        if (cancelled) return
        if (Array.isArray(items)) {
          setItemsByCat((prev) => ({
            ...prev,
            [activeCategoryId]: items.filter((it) => it.is_active && !it.is_prohibited),
          }))
        }
      })
      .catch((err) => console.error(`Failed to load goods items for cat ${activeCategoryId}:`, err))
      .finally(() => {
        if (!cancelled) setLoadingItems(false)
      })

    return () => { cancelled = true }
  }, [isOpen, activeCategoryId, itemsByCat])

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId) || categories[0] || null
  }, [categories, activeCategoryId])

  const currentItems = useMemo(() => {
    if (!activeCategoryId) return []
    const items = itemsByCat[activeCategoryId] || []
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((it) => it.name.toLowerCase().includes(q))
  }, [itemsByCat, activeCategoryId, searchQuery])

  // Helper to get staged quantity for an item
  const getItemQuantity = (itemId) => {
    const found = stagedItems.find((it) => it.goods_item_id === itemId || it.goods_item === itemId)
    return found ? found.quantity : 0
  }

  // Update item quantity with boundary and format validation
  const handleSetQuantity = (item, nextQty) => {
    let cleanQty = nextQty
    if (typeof cleanQty === "string") {
      cleanQty = cleanQty.replace(/[^\d]/g, "")
    }
    let qty = Math.floor(Number(cleanQty) || 0)
    if (isNaN(qty) || qty < 0) qty = 0
    if (qty > 500) qty = 500 // Max sensible boundary per item

    setStagedItems((prev) => {
      const existingIdx = prev.findIndex((it) => (it.goods_item_id || it.goods_item) === item.id)
      if (qty === 0) {
        if (existingIdx >= 0) {
          const updated = [...prev]
          updated.splice(existingIdx, 1)
          return updated
        }
        return prev
      }

      const itemPayload = {
        goods_item_id: item.id,
        goods_item: item.id,
        name: item.name,
        category_id: item.category,
        category_name: item.category_name,
        quantity: qty,
        unit: item.unit || "unit",
        weight_kg: Number(item.default_weight_kg) || 0,
        cft: Number(item.default_cft) || 0,
        is_fragile: Boolean(item.is_fragile),
        is_heavy: Boolean(item.is_heavy),
        is_oversized: Boolean(item.is_oversized),
        requires_special_handling: Boolean(item.requires_special_handling),
        special_handling_charge: Number(item.special_handling_charge) || 0,
        is_two_wheeler_compatible: Boolean(item.is_two_wheeler_compatible),
      }

      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx] = itemPayload
        return updated
      } else {
        return [...prev, itemPayload]
      }
    })
  }

  // Running totals across all staged items
  const totals = useMemo(() => {
    let totalCount = 0
    let totalWeightKg = 0
    let totalCft = 0
    let hasSpecialHandling = false
    let hasIncompatible2W = false

    stagedItems.forEach((it) => {
      totalCount += it.quantity
      totalWeightKg += (it.weight_kg || 0) * it.quantity
      totalCft += (it.cft || 0) * it.quantity
      if (it.requires_special_handling) hasSpecialHandling = true
      if (isTwoWheeler && it.is_two_wheeler_compatible === false) hasIncompatible2W = true
    })

    return {
      totalCount,
      totalWeightKg: Math.round(totalWeightKg * 10) / 10,
      totalCft: Math.round(totalCft * 10) / 10,
      hasSpecialHandling,
      hasIncompatible2W,
    }
  }, [stagedItems, isTwoWheeler])

  const handleApply = () => {
    if (onSelectCategory && activeCategory) {
      onSelectCategory(activeCategory)
    }
    onApplyCargo(stagedItems, activeCategory)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Select Goods & Cargo Items</h3>
              <p className="text-xs text-slate-500 font-medium">
                Choose item and quantity to calculate authoritative vehicle fitment & route fare
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Wheeler notice if applicable */}
        {isTwoWheeler && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-900">
            <Bike className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Two-Wheeler Service: Items requiring 3-Wheeler or Truck are marked and cannot be carried on bike.</span>
          </div>
        )}

        {/* Main Content: Category Tabs (Left) & Items Grid (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[350px]">
          {/* Left: Category Sidebar */}
          <div className="md:w-60 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60 p-3 overflow-y-auto max-h-48 md:max-h-none shrink-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-2">Categories</p>
            <div className="space-y-1">
              {loadingCats ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading catalog...</div>
              ) : (
                categories.map((cat) => {
                  const isSelected = activeCategoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(cat.id)
                        if (onSelectCategory) onSelectCategory(cat)
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: Items Browser & Quantity Adjustment */}
          <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search items in ${activeCategory?.name || "category"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-800 font-medium"
              />
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
              {loadingItems ? (
                <div className="p-8 text-center text-xs text-slate-400">Fetching available goods items...</div>
              ) : currentItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery ? "No matching goods found." : "No active items in this category."}
                </div>
              ) : (
                currentItems.map((item) => {
                  const qty = getItemQuantity(item.id)
                  const isIncompatible = isTwoWheeler && item.is_two_wheeler_compatible === false

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        qty > 0
                          ? "border-emerald-400 bg-emerald-50/40"
                          : isIncompatible
                          ? "border-slate-200 bg-slate-50/60 opacity-60"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          {item.is_fragile && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Fragile
                            </span>
                          )}
                          {item.requires_special_handling && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                              Special Handling
                            </span>
                          )}
                          {isIncompatible && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <Truck className="w-2.5 h-2.5" /> Requires Truck
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                          <span>~{item.default_weight_kg} kg</span>
                          <span>•</span>
                          <span>~{item.default_cft} CFT</span>
                          {item.special_handling_charge > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">+₹{item.special_handling_charge} handling</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      {isIncompatible ? (
                        <div className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
                          Not 2W fit
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0 bg-slate-100 rounded-xl p-1 border border-slate-200">
                          {qty > 0 ? (
                            <>
                              <button
                                type="button"
                                title="Decrease quantity"
                                onClick={() => handleSetQuantity(item, qty - 1)}
                                className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                aria-label={`Quantity for ${item.name}`}
                                value={qty}
                                onChange={(e) => handleSetQuantity(item, e.target.value)}
                                className="w-9 h-6 text-center text-xs font-black bg-white rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                title="Increase quantity"
                                onClick={() => handleSetQuantity(item, qty + 1)}
                                className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                title="Remove item"
                                onClick={() => handleSetQuantity(item, 0)}
                                className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetQuantity(item, 1)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer with Summary Banner & Apply Button */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Selected</p>
              <p className="font-extrabold text-slate-900">
                {totals.totalCount} {totals.totalCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="h-6 w-[1px] bg-slate-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cargo Weight</p>
              <p className="font-extrabold text-emerald-800">{totals.totalWeightKg} kg</p>
            </div>
            <div className="h-6 w-[1px] bg-slate-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume</p>
              <p className="font-extrabold text-emerald-800">{totals.totalCft} CFT</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {stagedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setStagedItems([])}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Confirm Cargo ({totals.totalCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
