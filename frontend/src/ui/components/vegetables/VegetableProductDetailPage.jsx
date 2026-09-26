import React, { useEffect, useState, useMemo } from "react"
import {
  ChevronLeft, ShoppingCart, Clock, ShieldCheck, Check,
  Plus, Minus, Sparkles, Utensils, Heart, ChevronRight,
  Flame, Leaf, Award, CheckCircle2, Search, X, RefreshCcw
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { getVegetableProducePhoto } from "../../../utils/vegetablePhotoMap.js"
import { VegetableRecipeCard } from "./VegetableRecipeCard.jsx"
import { RecipeDetails } from "./RecipeDetails.jsx"
import { VegetableProductCard } from "./VegetableProductCard.jsx"

/**
 * VegetableProductDetailPage
 * Full-page Product Detail View (matching Blinkit / modern quick-commerce product layout):
 * 1. Breadcrumbs & Top Navigation
 * 2. Product Hero (Large Image gallery, Name, Unit Selector, Price, Add to Cart, "Why shop from Calservices?")
 * 3. Product Details (Health Benefits, Quality guarantee, Freshness info)
 * 4. Similar Products / You May Also Like carousel/grid
 * 5. What Can You Make? Recipes Section for this vegetable (Recipe cards + inline full recipe drawer/modal view)
 */
export function VegetableProductDetailPage({
  vegetable,
  allVegetables = [],
  foodCart = {},
  setFoodCart,
  onBack,
  onUpdateCartQty,
  onSelectProduct,
  deliveryBadge = "8 MINS",
}) {
  const [selectedImage, setSelectedImage] = useState(vegetable.image)
  const [selectedUnitOption, setSelectedUnitOption] = useState("standard")
  const [recipes, setRecipes] = useState([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [activeRecipeDetail, setActiveRecipeDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [recommendations, setRecommendations] = useState([])

  // Reset selected image when vegetable changes
  useEffect(() => {
    if (vegetable) {
      setSelectedImage(vegetable.image)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [vegetable])

  // Load recipes and recommendations for this product
  useEffect(() => {
    if (!vegetable) return

    setRecipesLoading(true)
    const vegId = vegetable.id
    const vegName = vegetable.name

    const params = new URLSearchParams()
    if (vegId) params.append("package_id", vegId)
    if (vegName) params.append("vegetable", vegName)

    apiRequest(`/catalog/vegetables/recipes/?${params.toString()}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRecipes(res.data)
        } else {
          setRecipes([])
        }
      })
      .catch((err) => {
        console.error("Failed to load recipes:", err)
        setRecipes([])
      })
      .finally(() => {
        setRecipesLoading(false)
      })

    // Load recommendations / similar products
    if (vegId) {
      apiRequest(`/catalog/vegetables/${vegId}/recommendations/`)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setRecommendations(res.data)
          }
        })
        .catch(() => {})
    }
  }, [vegetable])

  // Handle recipe selection
  const handleSelectRecipe = async (recipe) => {
    setActiveRecipe(recipe)
    setDetailLoading(true)
    try {
      window.scrollTo({ top: 0, behavior: "instant" })
    } catch (_) {}
    try {
      const res = await apiRequest(`/catalog/vegetables/recipes/${recipe.id || recipe.slug}/`)
      if (res.success && res.data) {
        setActiveRecipeDetail(res.data)
      } else {
        setActiveRecipeDetail(recipe)
      }
    } catch (err) {
      console.error("Failed to load recipe detail:", err)
      setActiveRecipeDetail(recipe)
    } finally {
      setDetailLoading(false)
      try {
        window.scrollTo({ top: 0, behavior: "instant" })
      } catch (_) {}
    }
  }

  const handleAddAvailableVegetables = (missingVegs) => {
    setFoodCart((prev) => {
      const copy = { ...prev }
      missingVegs.forEach((v) => {
        const name = v.package_name || v.name
        if (!copy[name]) copy[name] = 1
      })
      return copy
    })
  }

  if (!vegetable) return null

  // 1. Pack-specific calculations & custom pack support
  const baseUnit = vegetable.unit || "500 g"
  const customPacks = Array.isArray(vegetable.custom_packs) ? vegetable.custom_packs.filter(p => p.enabled !== false) : []
  
  const standardKey = vegetable.name
  const doubleKey = `${vegetable.name} (2 x ${baseUnit})`

  const standardPrice = vegetable.price || 20
  const standardMrp = vegetable.mrp || (standardPrice > 20 ? standardPrice + 8 : standardPrice + 5)
  const standardDiscount = vegetable.discount || `${Math.round(((standardMrp - standardPrice) / standardMrp) * 100)}% OFF`

  const doublePrice = Math.round(standardPrice * 1.9)
  const doubleMrp = standardMrp * 2
  const doubleDiscount = `${Math.round(((doubleMrp - doublePrice) / doubleMrp) * 100)}% OFF`

  // Resolve active pack info
  const selectedCustomPack = customPacks.find(p => p.id === selectedUnitOption)
  let currentKey = standardKey
  let activePrice = standardPrice
  let activeMrp = standardMrp
  let activeUnitLabel = baseUnit

  if (selectedUnitOption === "double") {
    currentKey = doubleKey
    activePrice = doublePrice
    activeMrp = doubleMrp
    activeUnitLabel = `2 × ${baseUnit}`
  } else if (selectedCustomPack) {
    currentKey = `${vegetable.name} (${selectedCustomPack.unit || selectedCustomPack.title})`
    activePrice = Math.round(Number(selectedCustomPack.price) || 0)
    activeMrp = selectedCustomPack.mrp ? Math.round(Number(selectedCustomPack.mrp)) : null
    activeUnitLabel = selectedCustomPack.unit || selectedCustomPack.title
  }

  const activeCartQty = foodCart[currentKey] || 0

  // Similar products: strictly unique, excluding currently viewed vegetable
  const similarProducts = useMemo(() => {
    const map = new Map()

    // 1. From database recommendations
    if (recommendations && recommendations.length > 0) {
      recommendations.forEach((r) => {
        const id = r.recommended_product_id || r.recommended_product || r.id
        const name = r.recommended_name || r.name
        if (id && id !== vegetable.id && name !== vegetable.name && !map.has(id)) {
          // Look up full product info if available
          const fullPkg = allVegetables.find((v) => v.id === id || v.name === name)
          map.set(id, {
            id: id,
            name: name,
            price: fullPkg ? fullPkg.price : Math.round(Number(r.recommended_price || r.price) || 0),
            mrp: fullPkg ? fullPkg.mrp : (r.recommended_offer_price ? Math.round(Number(r.recommended_offer_price)) : null),
            unit: fullPkg ? fullPkg.unit : (r.recommended_unit || r.unit || "500 g"),
            discount: fullPkg ? fullPkg.discount : (r.recommended_tag || "10% OFF"),
            image: getVegetableProducePhoto(name),
            category: fullPkg ? fullPkg.category : "Daily Essentials",
          })
        }
      })
    }

    // 2. Fill with other unique vegetables if fewer than 6
    if (map.size < 6) {
      allVegetables.forEach((v) => {
        if (v.id !== vegetable.id && v.name !== vegetable.name && !map.has(v.id) && map.size < 6) {
          map.set(v.id, v)
        }
      })
    }

    return Array.from(map.values())
  }, [recommendations, allVegetables, vegetable])

  // ── Full-Page Recipe View ──
  if (activeRecipe) {
    return (
      <div className="min-h-screen bg-[#fafaf9] text-slate-900 flex flex-col font-sans">
        {/* Breadcrumb Header */}
        <div className="bg-white border-b border-slate-200/80 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 font-semibold overflow-x-auto whitespace-nowrap">
              <button
                type="button"
                onClick={() => {
                  setActiveRecipe(null)
                  setActiveRecipeDetail(null)
                }}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-black">Back to {vegetable.name}</span>
              </button>
              <span>/</span>
              <span>Recipes</span>
              <span>/</span>
              <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-none">
                {activeRecipeDetail?.name || activeRecipe.name}
              </span>
            </div>
          </div>
        </div>

        {/* Full-Screen Recipe Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {detailLoading ? (
            <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
              <RefreshCcw className="w-9 h-9 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Loading recipe details &amp; ingredients…</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-8 shadow-xs">
              <RecipeDetails
                recipe={activeRecipeDetail || activeRecipe}
                foodCart={foodCart}
                onAddAvailableVegetables={handleAddAvailableVegetables}
                onUpdateCartQty={onUpdateCartQty}
                recommendations={recommendations}
              />
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Breadcrumb Bar ── */}
      <div className="bg-slate-50 border-b border-slate-200/80 py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold overflow-x-auto whitespace-nowrap">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Vegetables</span>
            </button>
            <span>/</span>
            <span>Farm-Fresh Produce</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{vegetable.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
        {/* ── Top Product Section (Calservices Farm-Direct Signature) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column: Product Studio Showcase */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full aspect-square max-w-lg rounded-3xl bg-gradient-to-b from-[#f4f8f4] to-[#eaf3eb] border border-emerald-100 p-6 sm:p-8 flex items-center justify-center relative shadow-sm overflow-hidden group">
              <img
                src={selectedImage || vegetable.image}
                alt={vegetable.name}
                className="w-full h-full object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = "/mockups/vegetables_realistic.png"
                }}
              />
              
              {/* Organic Farm Direct Tag */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-sm tracking-wide">
                <Leaf className="w-3.5 h-3.5 text-emerald-200" />
                <span>100% Farm Fresh</span>
              </div>

              {/* Delivery Speed Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 shadow-sm border border-slate-200/80">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{deliveryBadge}</span>
              </div>

              {/* Bottom Discount Pill */}
              {standardDiscount && (
                <div className="absolute bottom-4 left-4 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                  {standardDiscount}
                </div>
              )}
            </div>

            {/* Thumbnail Preview (if valid photo exists) */}
            {vegetable.image && (
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedImage(vegetable.image)}
                  className={`w-16 h-16 rounded-2xl border-2 p-1.5 bg-white overflow-hidden cursor-pointer transition-all shadow-xs ${
                    selectedImage === vegetable.image
                      ? "border-emerald-600 ring-2 ring-emerald-500/20 scale-105"
                      : "border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img
                    src={vegetable.image}
                    alt={vegetable.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = "/mockups/vegetables_realistic.png"
                    }}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Details, Pack Selection & Direct Ordering */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <div>
              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {vegetable.name}
              </h1>

              {/* Unit Selection Matrix */}
              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Choose Pack Size
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Standard Unit */}
                  {vegetable.standard_pack_enabled !== false && (
                    <button
                      type="button"
                      onClick={() => setSelectedUnitOption("standard")}
                      className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all relative ${
                        selectedUnitOption === "standard"
                          ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {standardDiscount && (
                        <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase text-white bg-emerald-600 px-2 py-0.5 rounded-md shadow-xs">
                          {standardDiscount}
                        </span>
                      )}
                      <div className="text-xs font-black text-slate-900">
                        Standard Pack ({baseUnit})
                      </div>
                      <div className="text-base font-black text-emerald-800 mt-1 flex items-baseline gap-1.5 flex-wrap">
                        <span>₹{standardPrice}</span>
                        {standardMrp && standardMrp > standardPrice && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            MRP <span className="line-through">₹{standardMrp}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Option 2: Family Saver Pack */}
                  {vegetable.enable_family_saver !== false && (
                    <button
                      type="button"
                      onClick={() => setSelectedUnitOption("double")}
                      className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all relative ${
                        selectedUnitOption === "double"
                          ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase text-white bg-indigo-600 px-2 py-0.5 rounded-md shadow-xs">
                        Family Saver
                      </span>
                      <div className="text-xs font-black text-slate-900">
                        2 × {baseUnit}
                      </div>
                      <div className="text-base font-black text-slate-900 mt-1 flex items-baseline gap-1.5 flex-wrap">
                        <span>₹{doublePrice}</span>
                        {doubleMrp && doubleMrp > doublePrice && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            MRP <span className="line-through">₹{doubleMrp}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Option 3+: Custom Packs / Grams */}
                  {customPacks.map((cp) => {
                    const cpPrice = Math.round(Number(cp.price) || 0)
                    const cpMrp = cp.mrp ? Math.round(Number(cp.mrp)) : null
                    const cpDiscount = cp.tag || (cpMrp && cpMrp > cpPrice ? `${Math.round(((cpMrp - cpPrice) / cpMrp) * 100)}% OFF` : null)
                    const isSelected = selectedUnitOption === cp.id

                    return (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => setSelectedUnitOption(cp.id)}
                        className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all relative ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {cpDiscount && (
                          <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase text-white bg-emerald-600 px-2 py-0.5 rounded-md shadow-xs">
                            {cpDiscount}
                          </span>
                        )}
                        <div className="text-xs font-black text-slate-900">
                          {cp.title || `Pack (${cp.unit})`}
                        </div>
                        <div className="text-base font-black text-emerald-800 mt-1 flex items-baseline gap-1.5 flex-wrap">
                          <span>₹{cpPrice}</span>
                          {cpMrp && cpMrp > cpPrice && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              MRP <span className="line-through">₹{cpMrp}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Price & Primary CTA */}
              <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      ₹{activePrice}
                    </span>
                    {activeMrp && activeMrp > activePrice && (
                      <span className="text-xs sm:text-sm text-slate-400 font-semibold">
                        MRP <span className="line-through">₹{activeMrp}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    Net Price per {activeUnitLabel}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <div>
                  {vegetable.in_stock === false || vegetable.max_quantity === 0 ? (
                    <div className="px-6 py-3 rounded-xl bg-slate-200 text-slate-500 font-black text-sm border border-slate-300 select-none uppercase tracking-wider">
                      OUT OF STOCK
                    </div>
                  ) : activeCartQty > 0 ? (
                    <div className="flex items-center bg-emerald-700 text-white rounded-xl px-2 py-1.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => onUpdateCartQty && onUpdateCartQty(currentKey, -1)}
                        className="text-white hover:text-emerald-200 font-black text-base cursor-pointer px-2.5 active:scale-90"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-sm font-black min-w-[24px] text-center px-1">
                        {activeCartQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateCartQty && onUpdateCartQty(currentKey, 1)}
                        className="text-white hover:text-emerald-200 font-black text-base cursor-pointer px-2.5 active:scale-90"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty && onUpdateCartQty(currentKey, 1)}
                      className="px-6 sm:px-8 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Basket</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Calservices Freshness & Quality Promise */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(vegetable.customization?.promise_farm !== false) && (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{vegetable.customization?.promise_farm_title || "Direct From Farm"}</h5>
                    <p className="text-[10px] text-slate-500">{vegetable.customization?.promise_farm_sub || "Zero cold storage"}</p>
                  </div>
                </div>
              )}

              {(vegetable.customization?.promise_express !== false) && (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{vegetable.customization?.promise_express_title || "Express Delivery"}</h5>
                    <p className="text-[10px] text-slate-500">{vegetable.customization?.promise_express_sub || "Guaranteed slot"}</p>
                  </div>
                </div>
              )}

              {(vegetable.customization?.promise_quality !== false) && (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{vegetable.customization?.promise_quality_title || "100% Quality"}</h5>
                    <p className="text-[10px] text-slate-500">{vegetable.customization?.promise_quality_sub || "Instant replacement"}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Product Details (Health Benefits & Information) ── */}
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-base sm:text-lg font-black text-slate-900 mb-3">
            Product Details
          </h3>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">About This Produce</span>
              <p className="text-xs sm:text-sm text-slate-700 mt-1 font-medium leading-relaxed">
                {vegetable.description || "Rich in natural vitamins, dietary fiber, and essential minerals. Harvested fresh daily to promote digestive health and natural immunity."}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
              {(vegetable.customization?.pesticide_free !== false) && (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Pesticide Screened
                </span>
              )}
              {(vegetable.customization?.ro_washed !== false) && (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Washed with Clean RO Water
                </span>
              )}
              {(vegetable.customization?.handpicked !== false) && (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Handpicked Daily
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Similar Products ── */}
        {similarProducts.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Similar products
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Frequently Paired
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {similarProducts.map((item) => (
                <VegetableProductCard
                  key={`sim-${item.id}`}
                  item={item}
                  cartCount={foodCart[item.name] || 0}
                  onUpdateQty={onUpdateCartQty}
                  onSelectProduct={(veg) => onSelectProduct && onSelectProduct(veg)}
                  deliveryBadge={deliveryBadge}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── What Can You Make With This? (Full Page Recipe Showcase) ── */}
        <div className="pt-8 border-t border-slate-200">
          <div className="bg-gradient-to-br from-amber-50/60 to-emerald-50/40 border-2 border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 mb-2">
                  <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Smart Chef Recommendations</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  What Can You Make With {vegetable.name}?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  Select any recipe below to see the complete ingredients, quick nutrition, and 1-click cart addition.
                </p>
              </div>
            </div>

            {/* Recipes Grid */}
            {recipesLoading ? (
              <div className="py-16 text-center">
                <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Discovering homestyle recipes for {vegetable.name}…</p>
              </div>
            ) : recipes.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl border border-slate-200">
                <span className="text-3xl">🍳</span>
                <h4 className="text-sm font-bold text-slate-800 mt-2">No recipes listed yet for {vegetable.name}</h4>
                <p className="text-xs text-slate-500 mt-1">Our chefs are preparing fresh recipes for this farm produce soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {recipes.map((recipe, idx) => (
                  <VegetableRecipeCard
                    key={idx}
                    recipe={recipe}
                    onSelectRecipe={handleSelectRecipe}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
