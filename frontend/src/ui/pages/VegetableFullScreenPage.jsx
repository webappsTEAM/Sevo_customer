import React, { useEffect, useState, useMemo } from "react"
import { AnimatePresence } from "framer-motion"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  ChevronLeft, Search, ShoppingCart, Clock, X,
  MapPin, Sparkles, Filter, CheckCircle2, ChevronRight,
  ArrowRight, ShieldCheck, HeartPulse
} from "lucide-react"
import { routes } from "../routes.js"
import { apiRequest } from "../../api/client.js"
import { getVegetableTimingInfo } from "../../utils/vegetableSchedule.js"
import { VegCartDrawerModal } from "../components/VegCartDrawerModal.jsx"
import { VegetableProductCard } from "../components/vegetables/VegetableProductCard.jsx"
import { VegetableRecipeModal } from "../components/vegetables/VegetableRecipeModal.jsx"
import { VegetableProductDetailPage } from "../components/vegetables/VegetableProductDetailPage.jsx"
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx"

import { getVegetableProducePhoto } from "../../utils/vegetablePhotoMap.js"

import { useAuth } from "../../state/auth/useAuth.js"
import { getCustomerSelectedAddress, getCustomerLocation } from "../../utils/customerLocationStorage.js"

// Quick categories mapping
const VEG_CATEGORY_FILTERS = [
  "All",
  "Daily Essentials",
  "Herbs & Leafy",
  "Gourds & Roots",
  "Organic & Exotic",
  "Herbs & Seasoning"
]

export function VegetableFullScreenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const vegTiming = getVegetableTimingInfo()

  const [vegetables, setVegetables] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")

  // Selected product for full-page detail view
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Cart state persisted to localStorage
  const [foodCart, setFoodCart] = useState(() => {
    try {
      const saved = localStorage.getItem("calservice_veg_food_cart")
      if (saved) return JSON.parse(saved)
    } catch {}
    return {}
  })
  const [showCartDrawer, setShowCartDrawer] = useState(false)

  // Recipe Discovery Modal state
  const [selectedRecipeVegetable, setSelectedRecipeVegetable] = useState(null)
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)

  // Active address & Location label
  const [activeAddressObj, setActiveAddressObj] = useState(null)
  const [activeLocationLabel, setActiveLocationLabel] = useState(() => {
    return localStorage.getItem("calservice_user_location") || "Hosur, Tamil Nadu"
  })

  // Customer-scoped address synchronization
  useEffect(() => {
    let isMounted = true
    const syncAddress = async () => {
      if (user?.id) {
        const storedSelected = getCustomerSelectedAddress(user.id)
        const storedLoc = getCustomerLocation(user.id)
        if (storedSelected && isMounted) {
          setActiveAddressObj(storedSelected)
          setActiveLocationLabel(storedSelected.formatted_address || storedSelected.address || storedLoc || "Hosur, Tamil Nadu")
        } else if (storedLoc && isMounted) {
          setActiveLocationLabel(storedLoc)
        }
        try {
          const res = await apiRequest("/auth/customer/addresses/")
          const addresses = res?.data || (Array.isArray(res) ? res : [])
          if (Array.isArray(addresses) && addresses.length > 0 && isMounted) {
            let activeAddr = null
            if (storedSelected?.id) {
              activeAddr = addresses.find((a) => Number(a.id) === Number(storedSelected.id))
            }
            if (!activeAddr) {
              activeAddr = addresses.find((a) => a.is_default) || addresses[0]
            }
            if (activeAddr) {
              setActiveAddressObj(activeAddr)
              setActiveLocationLabel(activeAddr.formatted_address || activeAddr.address || activeAddr.address_line1 || "Hosur, Tamil Nadu")
            }
          }
        } catch (_) {}
      }
    }
    syncAddress()
    return () => { isMounted = false }
  }, [user?.id])

  // Sync foodCart with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("calservice_veg_food_cart", JSON.stringify(foodCart || {}))
    } catch {}
  }, [foodCart])

  // Fetch active vegetables from database catalog with live real-time sync
  useEffect(() => {
    let isMounted = true

    const fetchVegetables = () => {
      apiRequest("/catalog/services/?service_slug=vegetables&status=ACTIVE")
        .then((res) => {
          if (!isMounted) return
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const items = res.data.map((pkg) => {
              const price = Math.round(Number(pkg.price || pkg.base_price) || 0)
              const mrp = pkg.offer_price ? Math.round(Number(pkg.offer_price)) : null
              const discount = pkg.tag || (mrp && mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : "")
              const customPhoto = pkg.image && pkg.image.trim() ? pkg.image : getVegetableProducePhoto(pkg.name)
              return {
                id: pkg.id,
                name: pkg.name,
                unit: pkg.duration || "500 g",
                price: price,
                mrp: mrp,
                discount: discount,
                delivery: "8 MINS",
                category: getCategoryFromName(pkg.name),
                image: customPhoto,
                description: pkg.description || "",
                in_stock: pkg.in_stock !== false,
                max_quantity: typeof pkg.max_quantity === "number" ? pkg.max_quantity : null,
                custom_packs: Array.isArray(pkg.custom_packs) ? pkg.custom_packs : [],
                customization: pkg.customization || {},
                tag: pkg.tag || "",
                standard_pack_enabled: pkg.customization?.standard_pack_enabled !== false,
                enable_family_saver: pkg.customization?.enable_family_saver !== false,
                show_net_price_bar: pkg.customization?.show_net_price_bar !== false,
                show_add_to_basket_cta: pkg.customization?.show_add_to_basket_cta !== false,
              }
            })
            setVegetables(items)
          }
        })
        .catch((err) => {
          console.error("Failed to load catalog vegetables:", err)
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    }

    // Initial fetch
    fetchVegetables()

    // Real-time live polling every 3 seconds for instant stock & availability updates
    const interval = setInterval(fetchVegetables, 3000)

    // Instant refetch when customer refocuses the browser window/tab
    const handleFocus = () => fetchVegetables()
    window.addEventListener("focus", handleFocus)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  // Helper category classification
  function getCategoryFromName(name) {
    const l = name.toLowerCase()
    if (l.includes("coriander") || l.includes("curry") || l.includes("mint") || l.includes("spinach") || l.includes("keerai") || l.includes("palak") || l.includes("methi") || l.includes("moringa") || l.includes("drumstick leaves")) {
      return "Herbs & Leafy"
    }
    if (l.includes("ginger") || l.includes("inji") || l.includes("garlic") || l.includes("poondu") || l.includes("chilli") || l.includes("milagai") || l.includes("turmeric")) {
      return "Herbs & Seasoning"
    }
    if (l.includes("gourd") || l.includes("pavakkai") || l.includes("surakkai") || l.includes("beetroot") || l.includes("potato") || l.includes("carrot") || l.includes("radish") || l.includes("mullangi") || l.includes("colocasia") || l.includes("yam")) {
      return "Gourds & Roots"
    }
    if (l.includes("broccoli") || l.includes("mushroom") || l.includes("baby corn") || l.includes("zucchini") || l.includes("capsicum") || l.includes("amla")) {
      return "Organic & Exotic"
    }
    return "Daily Essentials"
  }

  function getProducePhotoFallback(name) {
    const l = name.toLowerCase()
    if (l.includes("tomato")) return "https://images.unsplash.com/photo-1546470427-e26264be0b11?auto=format&fit=crop&w=400&q=80"
    if (l.includes("onion")) return "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80"
    if (l.includes("potato")) return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80"
    if (l.includes("cucumber")) return "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80"
    if (l.includes("carrot")) return "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80"
    if (l.includes("beetroot")) return "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=400&q=80"
    return "/mockups/vegetables_realistic.png"
  }

  // Toast notice for stock limits
  const [toastMessage, setToastMessage] = useState("")
  const showStockToast = (msg = "Limited stock — can't add more right now") => {
    setToastMessage(msg)
    window.clearTimeout(showStockToast._t)
    showStockToast._t = window.setTimeout(() => setToastMessage(""), 2800)
  }

  // Cart actions with stock limit enforcement
  const handleUpdateQty = (name, delta) => {
    // Find matching vegetable product to inspect stock
    const matchedVeg = vegetables.find((v) => v.name === name || name.startsWith(v.name))
    
    if (matchedVeg) {
      if (matchedVeg.in_stock === false || matchedVeg.max_quantity === 0) {
        showStockToast("This item is currently OUT OF STOCK")
        return
      }
      if (delta > 0 && typeof matchedVeg.max_quantity === "number") {
        // Calculate units in cart for this vegetable
        let unitsInCart = 0
        Object.entries(foodCart).forEach(([k, qty]) => {
          if (k === matchedVeg.name) {
            unitsInCart += qty
          } else if (k.includes(" (2 x ") && k.startsWith(matchedVeg.name)) {
            unitsInCart += qty * 2
          } else if (k.startsWith(matchedVeg.name)) {
            unitsInCart += qty
          }
        })
        const multiplier = name.includes(" (2 x ") ? 2 : 1
        if (unitsInCart + (delta * multiplier) > matchedVeg.max_quantity) {
          showStockToast("Limited stock — can't add more right now")
          return
        }
      }
    }

    setFoodCart((prev) => {
      const current = prev[name] || 0
      const next = Math.max(0, current + delta)
      const copy = { ...prev }
      if (next === 0) {
        delete copy[name]
      } else {
        copy[name] = next
      }
      return copy
    })
  }

  // Add all available recipe vegetables in one click
  const handleAddAvailableVegetables = (missingVegs) => {
    setFoodCart((prev) => {
      const copy = { ...prev }
      missingVegs.forEach((v) => {
        const name = v.package_name || v.name
        if (!copy[name]) {
          copy[name] = 1
        }
      })
      return copy
    })
  }

  const totalCartCount = Object.values(foodCart).reduce((a, b) => a + b, 0)
  const totalCartValue = Object.entries(foodCart).reduce((sum, [nameWithUnit, qty]) => {
    let itemPrice = 30
    // Check if it's a 2x saver pack
    if (nameWithUnit.includes(" (2 x ")) {
      const matched = vegetables.find((v) => nameWithUnit.startsWith(v.name))
      if (matched) {
        itemPrice = Math.round(matched.price * 1.9)
      }
    } else {
      const matched = vegetables.find((v) => v.name === nameWithUnit)
      if (matched) {
        itemPrice = matched.price
      }
    }
    return sum + itemPrice * qty
  }, 0)

  // Filtered produce list
  const filteredVegetables = useMemo(() => {
    return vegetables.filter((v) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        v.name.toLowerCase().includes(q) ||
        (v.category && v.category.toLowerCase().includes(q))
      const matchesCategory =
        categoryFilter === "All" || v.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [vegetables, searchQuery, categoryFilter])

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 flex flex-col font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (selectedProduct) {
                  setSelectedProduct(null)
                } else {
                  navigate(routes.landing)
                }
              }}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-black cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
              <span className="hidden sm:inline">
                {selectedProduct ? "Back to All Vegetables" : "Back to Home"}
              </span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm text-lg">
                🥕
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-none">
                  Farm-Fresh Vegetables
                </h1>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1">
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-[260px]">{activeLocationLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Badges & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{vegTiming.headerBadge}</span>
            </span>

            {/* Cart Button */}
            {totalCartCount > 0 && (
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                className="bg-[#0B8860] hover:bg-[#097351] text-white px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer active:scale-95 animate-in fade-in"
              >
                <ShoppingCart className="w-4 h-4" />
                <div className="flex items-center gap-1.5 leading-none">
                  <span>{totalCartCount} {totalCartCount === 1 ? "item" : "items"}</span>
                  <span>•</span>
                  <span>₹{totalCartValue}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Conditional Full-Screen Body ── */}
      {selectedProduct ? (
        <VegetableProductDetailPage
          vegetable={selectedProduct}
          allVegetables={vegetables}
          foodCart={foodCart}
          setFoodCart={setFoodCart}
          onBack={() => setSelectedProduct(null)}
          onUpdateCartQty={handleUpdateQty}
          onSelectProduct={(veg) => setSelectedProduct(veg)}
          deliveryBadge={vegTiming.cardDeliveryBadge}
        />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Banner Hero */}
          <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="z-10 max-w-xl text-center md:text-left">
              <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 inline-block mb-3">
                ⚡ Farm-to-Kitchen Direct Express
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                100% Crisp, Fresh Harvested Vegetables
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-2 leading-relaxed opacity-90">
                Pick your daily produce and tap <strong className="text-amber-300">"🍳 What Can I Make?"</strong> on any vegetable to discover healthy homestyle recipes and required vegetables in 1 click!
              </p>
            </div>

            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center min-w-[120px]">
                <div className="text-2xl font-black text-amber-300">68+</div>
                <div className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider mt-0.5">Farm Veggies</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center min-w-[120px]">
                <div className="text-2xl font-black text-white">8 Mins</div>
                <div className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider mt-0.5">Express Speed</div>
              </div>
            </div>
          </div>

          {/* Search & Category Tabs */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh vegetables (e.g. Tomato, Onion, Potato, Spinach, Drumstick)..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {VEG_CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Vegetables Produce Grid ── */}
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading farm produce catalog…</p>
            </div>
          ) : filteredVegetables.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
              <span className="text-4xl">🥬</span>
              <h3 className="text-base font-bold text-slate-800 mt-2">No vegetables found matching "{searchQuery}"</h3>
              <p className="text-xs text-slate-500 mt-1">Try another search term or clear the category filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setCategoryFilter("All")
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredVegetables.map((item) => (
                <VegetableProductCard
                  key={item.id}
                  item={item}
                  cartCount={foodCart[item.name] || 0}
                  onUpdateQty={handleUpdateQty}
                  onSelectProduct={(veg) => setSelectedProduct(veg)}
                  onDiscoverRecipes={(veg) => {
                    setSelectedRecipeVegetable(veg)
                    setIsRecipeModalOpen(true)
                  }}
                  deliveryBadge={vegTiming.cardDeliveryBadge}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── Recipe Discovery & What Can I Make Modal ── */}
      <VegetableRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false)
          setSelectedRecipeVegetable(null)
        }}
        selectedVegetable={selectedRecipeVegetable}
        foodCart={foodCart}
        setFoodCart={setFoodCart}
        onAddAvailableVegetables={handleAddAvailableVegetables}
        onUpdateCartQty={handleUpdateQty}
      />

      {/* ── Cart Drawer Modal ── */}
      <AnimatePresence>
        {showCartDrawer && (
          <VegCartDrawerModal
            isOpen={showCartDrawer}
            onClose={() => setShowCartDrawer(false)}
            foodCart={foodCart}
            setFoodCart={setFoodCart}
            deliveryAddress={activeAddressObj?.formatted_address || activeAddressObj?.address || activeLocationLabel}
            deliveryAddressType={activeAddressObj?.address_type || activeAddressObj?.type || "Home"}
            onChangeAddress={() => {
              setShowCartDrawer(false)
              navigate(routes.booking_checkout)
            }}
            selectedFoodSubModule={{
              id: "vegetables",
              name: "Farm-Fresh Vegetables",
              items: vegetables,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[10090] bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <AppBannerAndFooter />
    </div>
  )
}
