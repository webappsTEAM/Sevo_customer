import React, { useEffect, useState, useMemo } from "react"
import { AnimatePresence } from "framer-motion"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  ChevronLeft, Search, ShoppingCart, Clock, X,
  MapPin, Sparkles, Filter, CheckCircle2, ChevronRight,
  ArrowRight, ShieldCheck, HeartPulse, ShieldAlert, Pencil
} from "lucide-react"
import { routes } from "../routes.js"
import { apiRequest } from "../../api/client.js"
import { useCanEditCustomerUI } from "../components/SuperAdminEditControls.jsx"
import { getVegetableTimingInfo } from "../../utils/vegetableSchedule.js"
import { VegCartDrawerModal } from "../components/VegCartDrawerModal.jsx"
import { VegetableProductCard } from "../components/vegetables/VegetableProductCard.jsx"
import { VegetableRecipeModal } from "../components/vegetables/VegetableRecipeModal.jsx"
import { VegetableProductDetailPage } from "../components/vegetables/VegetableProductDetailPage.jsx"
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx"

import { getVegetableProducePhoto } from "../../utils/vegetablePhotoMap.js"

import { useAuth } from "../../state/auth/useAuth.js"
import { getCustomerSelectedAddress, getCustomerLocation } from "../../utils/customerLocationStorage.js"
import {
  fetchDailyEssentialsCart,
  syncPackageQuantity,
} from "../../services/dailyEssentialsCartSync.js"

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

  // ── Super Admin Customer UI Edit Mode ──────────────────────────────────
  // Entry point: PlatformDashboardPage's "View Customer App" link deep-links
  // here with ?admin_edit=1. `canEnterEditMode` is the authorization check —
  // it is frontend UX only; the actual save PUTs through the same admin
  // catalog endpoint the existing Catalog admin panel uses
  // (settings_hub AdminPackageDetailView), which is backend-permission-gated
  // independently (accounts.permissions.RequireModuleAccess("catalog","edit")).
  // A normal customer never sees this bar because canEnterEditMode is false.
  const canEnterEditMode = useCanEditCustomerUI()
  const [editMode, setEditMode] = useState(() => {
    try {
      return canEnterEditMode && new URLSearchParams(location.search).get("admin_edit") === "1"
    } catch {
      return false
    }
  })
  const [saveNotice, setSaveNotice] = useState(null)

  const [vegetables, setVegetables] = useState(() => {
    try {
      const saved = localStorage.getItem('calservice_veg_catalog_cache_v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return []
  })
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('calservice_veg_catalog_cache_v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return false
      }
    } catch {}
    return true
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")

  // Selected product for full-page detail view
    const [selectedProduct, setSelectedProduct] = useState(null)

  // Multi-Vendor Marketplace Stores State
  const [stores, setStores] = useState([])
  const [activeStore, setActiveStore] = useState(null)
  const [storeCoupons, setStoreCoupons] = useState([])

  // Fetch verified grocery stores from backend
  useEffect(() => {
    fetch("/api/workforce/public/stores/")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data)
          const savedStoreSlug = localStorage.getItem("calservice_selected_store_slug")
          const matched = data.find((s) => s.store_slug === savedStoreSlug) || data.find((s) => s.store_slug === "caldim-fresh-produce") || data[0]
          setActiveStore(matched)
        }
      })
      .catch((err) => console.error("Failed to load stores:", err))
  }, [])

  // When activeStore changes, load store coupons and details
  useEffect(() => {
    if (!activeStore?.store_slug) return
    localStorage.setItem("calservice_selected_store_slug", activeStore.store_slug)
    fetch(`/api/workforce/public/stores/${activeStore.store_slug}/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.coupons) {
          setStoreCoupons(data.coupons)
        }
      })
      .catch((err) => console.error("Failed to load store details:", err))
  }, [activeStore])

  const handleSelectStore = (store) => {
    if (activeStore?.id === store.id) return
    const cartCount = Object.values(foodCart || {}).reduce((a, b) => a + b, 0)
    if (cartCount > 0) {
      if (window.confirm(`Your cart has items from '${activeStore?.store_name}'. Would you like to clear your cart to switch to '${store.store_name}'?`)) {
        setFoodCart({})
        setActiveStore(store)
      }
    } else {
      setActiveStore(store)
    }
  }

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

  // Hydrate from the real backend cart (carts app, /api/carts/daily_essentials/)
  // on mount -- this is what lets the cart survive a reload on another
  // device or after re-login, not just localStorage on this browser. Only
  // overwrites local state when the backend actually has items; an empty
  // backend cart with a non-empty localStorage cart is left alone (most
  // likely means those local adds haven't synced yet -- see handleUpdateQty
  // below, which is what performs that sync going forward).
  useEffect(() => {
    let cancelled = false
    fetchDailyEssentialsCart()
      .then((items) => {
        if (cancelled || !Array.isArray(items) || items.length === 0) return
        const hydrated = {}
        items.forEach((it) => {
          if (it && it.package_name && it.quantity > 0) {
            const key = it.variant_name
              ? `${it.package_name} (${it.variant_name})`
              : (it.variant_pack_value && it.variant_unit
                  ? `${it.package_name} (${it.variant_pack_value} ${it.variant_unit})`
                  : it.package_name)
            hydrated[key] = it.quantity
          }
        })
        if (Object.keys(hydrated).length > 0) setFoodCart(hydrated)
      })
      .catch((err) => {
        console.error("Failed to load your saved Daily Essentials cart:", err)
      })
    return () => { cancelled = true }
  }, [])

  // Load approved categories from database
  const [approvedCategories, setApprovedCategories] = useState([])
  useEffect(() => {
    let isMounted = true
    apiRequest("/inventory/vegetable-categories/?status=APPROVED&only_roots=true")
      .then((res) => {
        if (!isMounted) return
        const list = res?.data || (Array.isArray(res) ? res : [])
        if (Array.isArray(list)) {
          setApprovedCategories(list.filter((c) => c.is_active && c.name))
        }
      })
      .catch((err) => console.error("Failed to load approved categories:", err))
    return () => { isMounted = false }
  }, [])

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
                category: pkg.vegetable_category_name || "Daily Essentials",
                category_parent: pkg.vegetable_category_parent_name || null,
                category_full_path: pkg.vegetable_category_full_path || "",
                image: customPhoto,
                description: pkg.description || "",
                in_stock: pkg.in_stock !== false,
                max_quantity: typeof pkg.max_quantity === "number" ? pkg.max_quantity : null,
                variants: Array.isArray(pkg.variants) ? pkg.variants : [],
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
            try {
              localStorage.setItem('calservice_veg_catalog_cache_v2', JSON.stringify(items))
            } catch {}
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

    // Periodic background sync (30s) + instant on-focus sync for latest stock & prices
    const interval = setInterval(fetchVegetables, 30000)

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

  // Cart actions with stock limit enforcement and variant awareness
  const handleUpdateQty = (name, delta, meta = {}) => {
    // Find matching vegetable product to inspect stock
    const matchedVeg = vegetables.find((v) => v.name === name || name.startsWith(v.name) || (meta.packageId && v.id === meta.packageId))
    
    if (matchedVeg) {
      if (matchedVeg.in_stock === false || matchedVeg.max_quantity === 0) {
        showStockToast("This item is currently OUT OF STOCK")
        return
      }
      if (delta > 0 && typeof matchedVeg.max_quantity === "number") {
        // Calculate units in cart for this vegetable
        let unitsInCart = 0
        Object.entries(foodCart).forEach(([k, qty]) => {
          if (k === matchedVeg.name || k.startsWith(matchedVeg.name)) {
            const multiplier = k.includes(" (2 x ") ? 2 : 1
            unitsInCart += qty * multiplier
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

      // Mirror to backend Cart
      if (matchedVeg) {
        const variantId = meta.variant?.id || (matchedVeg.variants?.find(v => name.includes(v.name) || name === matchedVeg.name)?.id)
        if (variantId) {
          syncPackageQuantity(matchedVeg.id, next, { variantId }).then((result) => {
            if (!result.ok) {
              showStockToast(result.message || "Couldn't update your cart — check your connection")
            }
          })
        } else {
          let totalUnitsForPackage = 0
          Object.entries(copy).forEach(([k, q]) => {
            if (k === matchedVeg.name || k.startsWith(matchedVeg.name)) {
              totalUnitsForPackage += q * (k.includes(" (2 x ") ? 2 : 1)
            }
          })
          syncPackageQuantity(matchedVeg.id, totalUnitsForPackage).then((result) => {
            if (!result.ok) {
              showStockToast(result.message || "Couldn't update your cart — check your connection")
            }
          })
        }
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

  // Super Admin Edit Mode save: PATCHes the real Package row through the
  // existing admin catalog endpoint, then updates local state from the
  // server's response so the price shown here matches the database (no
  // client-side value is ever treated as the source of truth).
  const handleSaveField = async (item, field, value) => {
    if (!canEnterEditMode) return
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${item.id}/`, {
        method: "PUT",
        json: { [field]: value },
      })
      if (res && res.success && res.data) {
        const pkg = res.data
        const price = Math.round(Number(pkg.base_price) || 0)
        const mrp = pkg.offer_price ? Math.round(Number(pkg.offer_price)) : null
        setVegetables((prev) =>
          prev.map((v) => (v.id === item.id ? { ...v, name: pkg.name, price, mrp, image: pkg.image || v.image } : v))
        )
        setSaveNotice({ type: "success", text: `Saved "${pkg.name}" — customers will see this on next load.` })
      } else {
        setSaveNotice({ type: "error", text: res?.message || "Save failed." })
      }
    } catch (err) {
      setSaveNotice({ type: "error", text: err?.body?.message || "Save failed — you may not have permission to edit the catalog." })
    } finally {
      setTimeout(() => setSaveNotice(null), 4000)
    }
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
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.category_parent && v.category_parent.toLowerCase().includes(q)) ||
        (v.category_full_path && v.category_full_path.toLowerCase().includes(q))

      const matchesCategory =
        categoryFilter === "All" ||
        v.category === categoryFilter ||
        v.category_parent === categoryFilter ||
        (v.category_full_path && v.category_full_path.includes(categoryFilter))

      return matchesSearch && matchesCategory
    })
  }, [vegetables, searchQuery, categoryFilter])

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-slate-900 flex flex-col font-sans pb-24 lg:pb-0">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (selectedProduct) {
                  setSelectedProduct(null)
                } else {
                  navigate(routes.landing)
                }
              }}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors flex items-center cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-[15px] sm:text-base font-extrabold text-slate-900 leading-none">
                <span className="bg-[#FFC300] text-slate-900 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                  {vegTiming.headerBadge || "8 mins"}
                </span>
                <span>Farm-Fresh Vegetables</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[160px] sm:max-w-[260px]">{activeLocationLabel}</span>
                <span className="text-slate-300">•</span>
                <span className="truncate max-w-[140px] font-bold text-slate-600">{activeStore?.store_name || "Caldim Fresh Produce"}</span>
              </div>
            </div>
          </div>

          {/* Right Header Badges & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Button */}
            {totalCartCount > 0 && (
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                className="bg-[#0C831F] hover:bg-[#0a6d19] text-white px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 animate-in fade-in"
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

      {/* ── Super Admin Customer UI Edit Mode toggle — never rendered for a
          normal customer; canEnterEditMode is false unless useCanEditCustomerUI()
          resolves the current user as Super Admin ── */}
      {canEnterEditMode && (
        <div className={`sticky top-[57px] z-30 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-bold ${editMode ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}>
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Super Admin viewing the live Customer App{editMode ? " — Edit Mode ON" : ""}
          </span>
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer ${editMode ? "bg-white text-indigo-700" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}
          >
            <Pencil className="w-3 h-3" />
            {editMode ? "Exit Edit Mode" : "Enable Edit Mode"}
          </button>
        </div>
      )}
      {saveNotice && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg ${saveNotice.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {saveNotice.text}
        </div>
      )}

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
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4">
          {/* Slim promo strip — replaces the old decorative hero */}
          <div className="rounded-lg bg-[#0C831F] px-4 py-2.5 text-white flex items-center gap-2 text-[11px] sm:text-xs font-bold">
            <span className="text-base leading-none">⚡</span>
            <span>100% Crisp, Farm-Harvested Vegetables — tap</span>
            <span className="bg-white/15 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px]">🍳 What Can I Make?</span>
            <span>on any item for instant recipe ideas</span>
          </div>

          {/* ── Multi-Vendor Store Selector Strip ── */}
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-lg shrink-0">
                  🏪
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {activeStore?.store_name || "Caldim Fresh Vegetables & Produce"}
                    </h2>
                    <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
                      ★ {activeStore?.rating_average ? Number(activeStore.rating_average).toFixed(1) : "5.0"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {activeStore?.estimated_delivery_mins || 25} mins delivery • {activeStore?.tagline || "Direct farm-fresh vegetables"}
                  </p>
                </div>
              </div>

              {/* Store Switcher Selection */}
              {stores.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {stores.map((s) => {
                    const isSelected = activeStore?.id === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStore(s)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <span>{s.store_name}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Active Store Promo / Coupon Strip */}
            {storeCoupons.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="text-[#0C831F] font-black shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Offers:
                </span>
                {storeCoupons.map((c) => (
                  <span key={c.code} className="bg-[#FFF6DA] text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200 text-[10.5px] font-bold shrink-0 flex items-center gap-1">
                    <span>Use code <strong className="underline uppercase tracking-wide">{c.code}</strong>: ₹{Math.round(c.discount_value)} OFF (Min ₹{Math.round(c.min_order_amount)})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search & Category Tabs */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fresh vegetables (e.g. Tomato, Onion, Potato, Spinach, Drumstick)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:border-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Array.from(new Set([
                "All",
                ...approvedCategories
                  .map((c) => c.name)
                  .filter((n) => Boolean(n) && n.trim().toLowerCase() !== "all")
              ])).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                    categoryFilter === cat
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
              <div className="w-8 h-8 border-4 border-[#0C831F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading farm produce catalog…</p>
            </div>
          ) : filteredVegetables.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-lg border border-slate-200">
              <span className="text-4xl">🥬</span>
              <h3 className="text-base font-bold text-slate-800 mt-2">No vegetables found matching "{searchQuery}"</h3>
              <p className="text-xs text-slate-500 mt-1">Try another search term or clear the category filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setCategoryFilter("All")
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-[#0C831F] text-white text-xs font-bold hover:bg-[#0a6d19] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
              {filteredVegetables.map((item) => (
                <VegetableProductCard
                  key={item.id}
                  item={item}
                  foodCart={foodCart}
                  cartCount={foodCart[item.name] || 0}
                  onUpdateQty={handleUpdateQty}
                  onSelectProduct={(veg) => setSelectedProduct(veg)}
                  onDiscoverRecipes={(veg) => {
                    setSelectedRecipeVegetable(veg)
                    setIsRecipeModalOpen(true)
                  }}
                  deliveryBadge={vegTiming.cardDeliveryBadge}
                  editable={canEnterEditMode && editMode}
                  onSaveField={handleSaveField}
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
            onUpdateCartQty={handleUpdateQty}
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
