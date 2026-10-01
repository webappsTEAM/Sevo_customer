import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  Search, ShoppingCart, Store, ChevronRight, X, ArrowLeft,
  CheckCircle2, AlertTriangle, PackageCheck, Truck, Clock,
  ShieldCheck, Sparkles, Filter, Trash2, Plus, Minus,
  RefreshCw, ChevronDown, Check, Info, AlertCircle, ShoppingBag,
  Layers, FolderTree, Tag, SlidersHorizontal, ArrowUpRight,
  ListFilter, Grid, ChevronLeft, Boxes, Gift, Zap,
  CreditCard, Banknote, MapPin,
  Apple, Carrot, Milk, Coffee, Utensils, CupSoda, Cookie,
  Fish, Egg, Beef, Shirt, Dumbbell, Laptop, Smartphone,
  Tv, Bath, Baby, Home, Package, Droplet, Hammer,
  PaintRoller, Wrench, HeartPulse, Croissant
} from "lucide-react"
import { routes } from "../routes.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { apiRequest } from "../../api/client.js"
import { getCustomerSelectedAddress, getCustomerLocation } from "../../utils/customerLocationStorage.js"
import { resolveImageUrl } from "../../utils/imageUrl.js"
import {
  fetchMarketplaceProducts,
  fetchMarketplaceProductDetail,
  fetchMarketplaceCategories,
  fetchMarketplaceCart,
  addMarketplaceCartItem,
  updateMarketplaceCartItem,
  removeMarketplaceCartItem,
  clearMarketplaceCart,
  validateMarketplaceCart,
  checkoutMarketplaceOrder,
  loadRazorpayScript,
  initiateMarketplacePayment,
  verifyMarketplacePayment,
  fetchMarketplaceOrderDetail,
  cancelMarketplaceOrder,
  fetchMyOrders,
  fetchMarketplaceBaskets,
  fetchMarketplaceBasketDetail,
  addBasketToCart,
  fetchMarketplaceDeliverySlots,
} from "../../services/marketplaceApi.js"
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"

// Icon resolver for category icon_key / icon fallback
const CATEGORY_ICON_LOOKUP = {
  grid: Grid,
  all: Grid,
  shoppingbag: ShoppingBag,
  shopping_bag: ShoppingBag,
  apple: Apple,
  fruit: Apple,
  fruits: Apple,
  carrot: Carrot,
  vegetable: Carrot,
  vegetables: Carrot,
  groceries: ShoppingBag,
  grocery: ShoppingBag,
  dairy: Milk,
  milk: Milk,
  beverages: CupSoda,
  beverage: CupSoda,
  drinks: CupSoda,
  coffee: Coffee,
  tea: Coffee,
  snacks: Cookie,
  snack: Cookie,
  cookie: Cookie,
  cookies: Cookie,
  biscuit: Cookie,
  meat: Beef,
  chicken: Beef,
  fish: Fish,
  seafood: Fish,
  egg: Egg,
  eggs: Egg,
  bakery: Croissant,
  bread: Croissant,
  personalcare: Bath,
  personal_care: Bath,
  cleaning: Sparkles,
  household: Home,
  babycare: Baby,
  baby_care: Baby,
  baby: Baby,
  electronics: Laptop,
  mobile: Smartphone,
  appliances: Tv,
  appliance: Tv,
  fashion: Shirt,
  clothing: Shirt,
  health: HeartPulse,
  fitness: Dumbbell,
  package: Package,
  boxes: Boxes,
  store: Store,
  tag: Tag,
  layers: Layers,
  default: ShoppingBag,
}

function getCategoryIconComponent(iconKey, categoryName = "") {
  if (iconKey) {
    const key = String(iconKey).toLowerCase().replace(/[-_\s]+/g, "")
    if (CATEGORY_ICON_LOOKUP[key]) return CATEGORY_ICON_LOOKUP[key]
  }
  const name = String(categoryName || "").toLowerCase()
  if (name.includes("veg") || name.includes("carrot")) return Carrot
  if (name.includes("fruit") || name.includes("apple")) return Apple
  if (name.includes("dairy") || name.includes("milk") || name.includes("curd")) return Milk
  if (name.includes("bev") || name.includes("drink") || name.includes("juice") || name.includes("soda") || name.includes("cola")) return CupSoda
  if (name.includes("snack") || name.includes("cookie") || name.includes("biscuit") || name.includes("chip") || name.includes("namkeen")) return Cookie
  if (name.includes("meat") || name.includes("chicken") || name.includes("mutton")) return Beef
  if (name.includes("fish") || name.includes("prawn") || name.includes("sea")) return Fish
  if (name.includes("egg")) return Egg
  if (name.includes("bake") || name.includes("bread") || name.includes("cake")) return Croissant
  if (name.includes("clean") || name.includes("detergent") || name.includes("wash")) return Sparkles
  if (name.includes("care") || name.includes("bath") || name.includes("soap") || name.includes("shampoo")) return Bath
  if (name.includes("baby") || name.includes("diaper")) return Baby
  if (name.includes("cloth") || name.includes("fashion") || name.includes("wear")) return Shirt
  if (name.includes("electro") || name.includes("tech") || name.includes("gadget")) return Laptop
  if (name.includes("phone") || name.includes("mobile")) return Smartphone
  if (name.includes("appliance") || name.includes("tv")) return Tv
  if (name.includes("fit") || name.includes("gym")) return Dumbbell
  if (name.includes("health") || name.includes("pharma") || name.includes("med")) return HeartPulse
  
  return ShoppingBag
}

// Helper to recursively find category by slug or id in a tree
function findCategoryInTree(nodes, slugOrId) {
  if (!Array.isArray(nodes) || !slugOrId) return null
  for (const node of nodes) {
    if (node.slug === slugOrId || String(node.id) === String(slugOrId)) return node
    if (node.children && node.children.length > 0) {
      const found = findCategoryInTree(node.children, slugOrId)
      if (found) return found
    }
  }
  return null
}

// Helper to find breadcrumb path to category in tree
function getCategoryPathFromTree(nodes, slugOrId, currentPath = []) {
  if (!Array.isArray(nodes) || !slugOrId) return []
  for (const node of nodes) {
    const newPath = [...currentPath, node]
    if (node.slug === slugOrId || String(node.id) === String(slugOrId)) {
      return Array.isArray(node.path) && node.path.length > 0 ? node.path : newPath
    }
    if (node.children && node.children.length > 0) {
      const found = getCategoryPathFromTree(node.children, slugOrId, newPath)
      if (found.length > 0) return found
    }
  }
  return []
}

// Subcategory Nested Sidebar Item Component (Instamart Style Stacked)
function SubcategorySidebarTile({ child, isSelected, onSelect }) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = child?.image_url || child?.image || null
  const iconKey = child?.icon_key || child?.icon || child?.slug || ""
  const name = child?.name || ""
  const count = child?.total_product_count !== undefined ? child.total_product_count : (child?.product_count || 0)

  const IconComponent = useMemo(() => {
    return getCategoryIconComponent(iconKey, name)
  }, [iconKey, name])

  const showImage = Boolean(imageUrl && !imgError)

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onSelect(child)
      }}
      role="button"
      tabIndex={0}
      aria-current={isSelected ? "page" : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          e.stopPropagation()
          onSelect(child)
        }
      }}
      className={`group relative flex flex-col items-center text-center p-2 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
        isSelected
          ? "bg-emerald-100/90 border-emerald-500 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-500/20"
          : "bg-white/90 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900"
      }`}
    >
      {/* Active Left Indicator Bar */}
      {isSelected && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-emerald-600" />
      )}

      {/* Subcategory Thumbnail / Icon Box (Fixed Square Container Matching Top-Level w-16 h-16) */}
      <div className="relative">
        <div
          className={`w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.03] border ${
            isSelected
              ? "bg-white border-emerald-300 text-emerald-700"
              : "bg-slate-50 border-slate-200/70 text-slate-500 group-hover:bg-white group-hover:border-slate-300"
          }`}
        >
          {showImage ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover object-center"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3">
              <IconComponent className={`w-7 h-7 transition-colors ${isSelected ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"}`} />
            </div>
          )}
        </div>

        {/* Count Badge on Image Corner */}
        {count > 0 && (
          <span
            className={`absolute -bottom-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shadow-xs transition-colors ring-2 ${
              isSelected
                ? "bg-emerald-600 text-white ring-white"
                : "bg-slate-700 text-white ring-white group-hover:bg-slate-800"
            }`}
          >
            {count}
          </span>
        )}
      </div>

      {/* Subcategory Label Centered Below Image */}
      <div className="mt-2 w-full px-0.5">
        <span className={`text-[11.5px] leading-snug line-clamp-2 block text-center transition-colors ${
          isSelected ? "font-extrabold text-emerald-950" : "font-semibold text-slate-700 group-hover:text-slate-900"
        }`}>
          {name}
        </span>
      </div>
    </div>
  )
}

// Instamart-Style Visual Category Sidebar Tile Component (Stacked Vertical Layout)
function CategorySidebarTile({
  cat,
  isSelected,
  selectedSlug,
  onSelect,
  isExpanded = false,
  toggleExpand,
  isAll = false,
  totalCount = 0
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = isAll ? null : (cat?.image_url || cat?.image || null)
  const iconKey = isAll ? "grid" : (cat?.icon_key || cat?.icon || cat?.slug || "")
  const name = isAll ? "All Products" : (cat?.name || "")
  const count = isAll ? totalCount : (cat?.total_product_count !== undefined ? cat.total_product_count : (cat?.product_count || 0))
  const hasChildren = !isAll && Array.isArray(cat?.children) && cat.children.length > 0

  const IconComponent = useMemo(() => {
    if (isAll) return Grid
    return getCategoryIconComponent(iconKey, name)
  }, [isAll, iconKey, name])

  const showImage = Boolean(imageUrl && !imgError)

  const handleTileClick = () => {
    onSelect(isAll ? null : cat)
    if (hasChildren && !isExpanded && toggleExpand) {
      toggleExpand(cat.id || cat.slug)
    }
  }

  return (
    <div className="select-none">
      <div
        onClick={handleTileClick}
        role="button"
        tabIndex={0}
        aria-current={isSelected ? "page" : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleTileClick()
          }
        }}
        className={`group relative flex flex-col items-center text-center p-2.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
          isSelected
            ? "bg-emerald-50/95 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30 text-emerald-950 font-bold"
            : "bg-white border-slate-200/80 hover:bg-slate-50/90 hover:border-slate-300 text-slate-700 hover:text-slate-900"
        }`}
      >
        {/* Active Left Indicator Bar */}
        {isSelected && (
          <span className="absolute left-0 top-2.5 bottom-2.5 w-1.5 bg-emerald-600 rounded-r-full" />
        )}

        {/* Expand / Collapse Chevron Button for Categories with Children */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand?.(cat.id || cat.slug)
            }}
            className={`absolute top-1.5 right-1.5 p-1 rounded-lg transition-colors cursor-pointer z-10 ${
              isSelected
                ? "text-emerald-800 hover:bg-emerald-200/70"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
            aria-label={isExpanded ? `Collapse ${name}` : `Expand ${name}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        )}

        {/* Instamart Photo Thumbnail / Icon Box (Fixed Square Container w-16 h-16) */}
        <div className="relative">
          <div
            className={`w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.03] border ${
              isSelected
                ? "bg-white border-emerald-300 shadow-xs text-emerald-700"
                : "bg-slate-50 border-slate-200/80 text-slate-600 group-hover:bg-white group-hover:border-slate-300"
            }`}
          >
            {showImage ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover object-center"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-3">
                <IconComponent className={`w-7 h-7 transition-colors ${isSelected ? "text-emerald-700" : "text-slate-500 group-hover:text-slate-700"}`} />
              </div>
            )}
          </div>

          {/* Product Count Badge on Image Corner */}
          {count > 0 && (
            <span
              className={`absolute -bottom-1.5 -right-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums shadow-xs transition-colors ring-2 ${
                isSelected
                  ? "bg-emerald-600 text-white ring-white"
                  : "bg-slate-800 text-white ring-white group-hover:bg-slate-900"
              }`}
            >
              {count}
            </span>
          )}
        </div>

        {/* Category Label Below Image */}
        <div className="mt-2 w-full px-0.5">
          <span className={`text-xs leading-snug line-clamp-2 block text-center transition-colors ${
            isSelected ? "font-black text-emerald-950" : "font-semibold text-slate-800 group-hover:text-slate-950"
          }`}>
            {name}
          </span>
        </div>
      </div>

      {/* Nested Expandable Subcategory List (Indented Single Column) */}
      {hasChildren && isExpanded && (
        <div className="ml-2 pl-2 border-l-2 border-slate-200/80 space-y-1.5 mt-1.5 pb-1">
          {cat.children.map((child) => {
            const isChildSelected = selectedSlug === child.slug || String(selectedSlug) === String(child.id)
            return (
              <SubcategorySidebarTile
                key={child.id || child.slug}
                child={child}
                isSelected={isChildSelected}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MarketplacePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, refreshMe } = useAuth()

  // Customer Entry Modal & Pending Cart Action
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [pendingAddToCart, setPendingAddToCart] = useState(null)

  // Basket/Combo Offer State
  const [baskets, setBaskets] = useState([])
  const [basketsLoading, setBasketsLoading] = useState(true)
  const [basketDetailModal, setBasketDetailModal] = useState(null)
  const [basketDetailLoading, setBasketDetailLoading] = useState(false)
  const [selectedBasketSlotOptions, setSelectedBasketSlotOptions] = useState({})

  // Product Catalog & Category State
  const [products, setProducts] = useState([])
  const [selectedVariantByGroup, setSelectedVariantByGroup] = useState({})
  const [categoryTree, setCategoryTree] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false)
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(new Set())
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false)
  const [categoryFilterSearch, setCategoryFilterSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSeller, setSelectedSeller] = useState("All")

  // Cart State
  const [cart, setCart] = useState({ items: [], subtotal: 0, seller_id: null, seller_name: "" })
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)

  // Seller Conflict Modal State
  const [sellerConflict, setSellerConflict] = useState(null)

  // Product Detail Modal State
  const [detailProduct, setDetailProduct] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isDescExpanded, setIsDescExpanded] = useState(false)

  // Checkout & Order Tracking State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("UPI")
  const [activeOrder, setActiveOrder] = useState(null)
  const [trackingModalOpen, setTrackingModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Delivery Slot Selection State
  const [slotTypeMode, setSlotTypeMode] = useState("EXPRESS") // "EXPRESS" (Fast Delivery) | "STANDARD" (Schedule a Slot)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Drawer Accordion Expansion States (Instamart Pattern)
  const [deliveryPreferenceExpanded, setDeliveryPreferenceExpanded] = useState(false)
  const [paymentMethodExpanded, setPaymentMethodExpanded] = useState(false)
  const [billDetailsExpanded, setBillDetailsExpanded] = useState(false)

  // Delivery Address & Location
  const [deliveryAddress, setDeliveryAddress] = useState("Hosur, Tamil Nadu")
  const [savedAddresses, setSavedAddresses] = useState([])

  // Toast State
  const [toast, setToast] = useState(null)
  const showToast = (message, type = "info") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Active Category resolution from URL (?category=<slug>)
  const currentCategorySlug = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("category") || "all"
  }, [location.search])

  const activeCategoryNode = useMemo(() => {
    if (currentCategorySlug === "all") return null
    return findCategoryInTree(categoryTree, currentCategorySlug)
  }, [categoryTree, currentCategorySlug])

  const categoryNotFound = useMemo(() => {
    if (categoriesLoading || currentCategorySlug === "all") return false
    return categoryTree.length > 0 && !activeCategoryNode
  }, [categoriesLoading, currentCategorySlug, categoryTree, activeCategoryNode])

  const breadcrumbs = useMemo(() => {
    if (currentCategorySlug === "all" || !activeCategoryNode) return []
    return getCategoryPathFromTree(categoryTree, currentCategorySlug)
  }, [categoryTree, currentCategorySlug, activeCategoryNode])

  // Primary warehouse ID for delivery slots (v1 limitation: for multi-warehouse orders, delivery slot is resolved against primary/first warehouse group)
  const primaryWarehouseId = useMemo(() => {
    if (cart?.warehouse_groups?.length > 0) {
      return cart.warehouse_groups[0].warehouse_id
    }
    const itemWithWh = cart?.items?.find((it) => it.warehouse_id !== null && it.warehouse_id !== undefined)
    return itemWithWh?.warehouse_id || null
  }, [cart])

  // Slot Date Options (Today + next 3 days)
  const slotDateOptions = useMemo(() => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 4; i++) {
      const d = new Date()
      d.setDate(today.getDate() + i)
      const iso = d.toISOString().split("T")[0]
      let label = ""
      if (i === 0) label = "Today"
      else if (i === 1) label = "Tomorrow"
      else {
        label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
      }
      dates.push({ date: iso, label })
    }
    return dates
  }, [])

  // Fetch Delivery Slots when cart drawer opens or warehouse / date changes
  useEffect(() => {
    if (!cartDrawerOpen || !cart?.items?.length) return

    let isMounted = true
    setSlotsLoading(true)

    fetchMarketplaceDeliverySlots({
      warehouse_id: primaryWarehouseId,
      date: selectedDate,
    })
      .then((res) => {
        if (!isMounted) return
        const rawData = res?.data
        const slots = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.slots)
          ? rawData.slots
          : Array.isArray(rawData?.results)
          ? rawData.results
          : []
        setAvailableSlots(slots)

        // In Fast Delivery mode, auto-pick earliest available EXPRESS slot
        if (slotTypeMode === "EXPRESS") {
          const expressSlot = slots.find((s) => s.slot_type === "EXPRESS" && s.available !== false)
          if (expressSlot) {
            setSelectedSlot(expressSlot)
          } else {
            // Fallback to first available slot if no EXPRESS slot configured
            const anyAvailable = slots.find((s) => s.available !== false)
            if (anyAvailable) setSelectedSlot(anyAvailable)
            else setSelectedSlot(null)
          }
        } else {
          // In STANDARD mode, maintain selected slot if valid, else pick first available STANDARD slot
          setSelectedSlot((prev) => {
            if (prev && slots.some((s) => s.id === prev.id && s.available !== false)) {
              return prev
            }
            const firstStandard = slots.find((s) => s.slot_type === "STANDARD" && s.available !== false)
            return firstStandard || slots.find((s) => s.available !== false) || null
          })
        }
      })
      .catch((err) => {
        console.error("Failed to load delivery slots:", err)
        if (isMounted) setAvailableSlots([])
      })
      .finally(() => {
        if (isMounted) setSlotsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [cartDrawerOpen, primaryWarehouseId, selectedDate, slotTypeMode, cart?.items?.length])

  const handleSwitchSlotMode = (mode) => {
    setSlotTypeMode(mode)
    if (mode === "EXPRESS") {
      const todayIso = new Date().toISOString().split("T")[0]
      setSelectedDate(todayIso)
    }
  }

  // Deduplicated / aggregated root categories only (no leaf/child categories) for Instamart sidebar & top pill bar
  const uniqueRootCategories = useMemo(() => {
    if (!Array.isArray(categoryTree)) return []
    const seen = new Map()
    for (const cat of categoryTree) {
      // Exclude leaf/child categories -- only include root categories (parent_id is null/None)
      if (cat.parent_id !== null && cat.parent_id !== undefined && cat.parent_id !== "" && cat.parent_id !== "null") {
        continue
      }
      const key = (cat.slug || cat.name || "").toLowerCase().trim()
      if (!seen.has(key)) {
        seen.set(key, { ...cat })
      } else {
        const existing = seen.get(key)
        const addCount = cat.total_product_count !== undefined ? cat.total_product_count : (cat.product_count || 0)
        existing.total_product_count = (existing.total_product_count || existing.product_count || 0) + addCount
        existing.product_count = existing.total_product_count
        if (Array.isArray(cat.children) && cat.children.length > 0) {
          const currentChildren = existing.children || []
          existing.children = [...currentChildren, ...cat.children]
        }
        if (!existing.image_url && cat.image_url) existing.image_url = cat.image_url
        if (!existing.image && cat.image) existing.image = cat.image
        if (!existing.icon_key && cat.icon_key) existing.icon_key = cat.icon_key
        if (!existing.icon && cat.icon) existing.icon = cat.icon
      }
    }
    return Array.from(seen.values())
  }, [categoryTree])

  // Total products in catalog across all categories
  const totalCatalogProductsCount = useMemo(() => {
    if (!Array.isArray(categoryTree)) return 0
    return categoryTree.reduce((sum, cat) => sum + (cat.total_product_count || cat.product_count || 0), 0)
  }, [categoryTree])

  // Auto-expand active breadcrumb ancestors
  useEffect(() => {
    if (breadcrumbs.length > 0) {
      setExpandedCategoryIds((prev) => {
        const next = new Set(prev)
        breadcrumbs.forEach((crumb) => {
          if (crumb.id) next.add(crumb.id)
          if (crumb.slug) next.add(crumb.slug)
        })
        return next
      })
    }
  }, [breadcrumbs])

  const toggleCategoryExpand = (idOrSlug) => {
    if (!idOrSlug) return
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(idOrSlug)) next.delete(idOrSlug)
      else next.add(idOrSlug)
      return next
    })
  }

  const handleSelectCategory = useCallback((cat) => {
    const slug = cat?.slug && cat.slug !== "all" ? cat.slug : null
    const searchParams = new URLSearchParams(location.search)
    if (slug) {
      searchParams.set("category", slug)
    } else {
      searchParams.delete("category")
    }
    const query = searchParams.toString()
    navigate({ search: query ? `?${query}` : "" }, { replace: false })
    setCategoryDrawerOpen(false)
  }, [location.search, navigate])

  // Stale request cancellation ref
  const activeRequestRef = useRef(0)

  // Load Products with request cancellation token
  const loadProducts = useCallback(async () => {
    const reqId = ++activeRequestRef.current
    setLoading(true)
    try {
      const res = await fetchMarketplaceProducts({
        search: searchQuery,
        category_slug: currentCategorySlug !== "all" ? currentCategorySlug : "",
        seller_id: selectedSeller !== "All" ? selectedSeller : "",
      })
      if (reqId !== activeRequestRef.current) return // Ignore stale request
      if (res?.results) {
        setProducts(res.results)
      } else if (res?.data?.results) {
        setProducts(res.data.results)
      } else if (Array.isArray(res)) {
        setProducts(res)
      } else {
        setProducts([])
      }
    } catch (err) {
      if (reqId !== activeRequestRef.current) return
      console.error("Failed to load marketplace products:", err)
      if (err?.status === 404 || err?.body?.code === "CATEGORY_NOT_FOUND") {
        setProducts([])
      } else {
        showToast("Unable to load marketplace products. Please check connection.", "error")
      }
    } finally {
      if (reqId === activeRequestRef.current) {
        setLoading(false)
      }
    }
  }, [searchQuery, currentCategorySlug, selectedSeller])

  // Load Categories on mount
  useEffect(() => {
    setCategoriesLoading(true)
    fetchMarketplaceCategories({ tree: true, hide_empty: true })
      .then((res) => {
        const list = res?.data || (Array.isArray(res) ? res : [])
        if (Array.isArray(list) && list.length > 0) {
          setCategoryTree(list)
          setCategoriesUnavailable(false)
        } else {
          setCategoryTree([])
        }
      })
      .catch((err) => {
        console.warn("Categories feed unavailable:", err)
        setCategoriesUnavailable(true)
      })
      .finally(() => {
        setCategoriesLoading(false)
      })
  }, [])

  // Refetch products when category, seller, or debounced search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts()
    }, 250)
    return () => clearTimeout(timer)
  }, [loadProducts])

  // Load Cart
  const reloadCart = async () => {
    if (!user) return
    try {
      const res = await fetchMarketplaceCart()
      if (res?.data) {
        setCart(res.data)
      }
    } catch (err) {
      console.error("Failed to load marketplace cart:", err)
    }
  }

  // Load Active Marketplace Order on mount / user change (survives page reload)
  const reloadActiveOrder = async () => {
    if (!user) return
    try {
      const res = await fetchMyOrders()
      if (res?.data && Array.isArray(res.data)) {
        const terminalStatuses = ["DELIVERED", "CANCELLED"]
        const activeMkt = res.data.find(
          (o) => o.order_type === "marketplace" && !terminalStatuses.includes(o.status)
        )
        if (activeMkt?.order_number) {
          const detailRes = await fetchMarketplaceOrderDetail(activeMkt.order_number)
          if (detailRes?.data) {
            setActiveOrder(detailRes.data)
          } else {
            setActiveOrder(activeMkt)
          }
        } else {
          setActiveOrder(null)
        }
      }
    } catch (err) {
      console.error("Failed to load active marketplace order:", err)
    }
  }

  // Load Baskets on mount
  useEffect(() => {
    setBasketsLoading(true)
    fetchMarketplaceBaskets({ page_size: 20 })
      .then((res) => {
        const raw = res?.results || res?.data?.results || (Array.isArray(res?.data) ? res.data : null) || (Array.isArray(res) ? res : [])
        setBaskets(Array.isArray(raw) ? raw : [])
      })
      .catch(() => setBaskets([]))
      .finally(() => setBasketsLoading(false))
  }, [])

  useEffect(() => {
    reloadCart()
    reloadActiveOrder()
  }, [user])

  // Sellers list derived from current products
  const availableSellers = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      if (p.seller_id && p.seller_name) {
        map.set(p.seller_id, p.seller_name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [products])

  // Group products by variant_group_id so variant siblings collapse into 1 product card
  const groupedProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return []

    const groupMap = new Map()
    const result = []

    for (const prod of products) {
      const gId = prod.variant_group_id
      if (gId) {
        if (!groupMap.has(gId)) {
          const groupEntry = {
            isVariantFamily: true,
            groupId: gId,
            groupTitle: prod.title,
            brand: prod.brand,
            seller_id: prod.seller_id,
            seller_name: prod.seller_name,
            variantAttributeName: prod.variant_attribute_name || "Size",
            variants: [],
          }
          groupMap.set(gId, groupEntry)
          result.push(groupEntry)
        }
        const group = groupMap.get(gId)

        const exists = group.variants.some((v) => (v.id || v.seller_product_id) === (prod.id || prod.seller_product_id))
        if (!exists) {
          group.variants.push(prod)
        }

        if (Array.isArray(prod.variants) && prod.variants.length > 0) {
          for (const v of prod.variants) {
            const vId = v.id || v.seller_product_id
            if (vId && !group.variants.some((existing) => (existing.id || existing.seller_product_id) === vId)) {
              group.variants.push({
                ...prod,
                ...v,
                id: vId,
                seller_product_id: vId,
                variant_label: v.variant_label || v.label || v.pack_size || prod.pack_size,
                pack_size: v.pack_size || v.label || v.variant_label || prod.pack_size,
                selling_price: v.selling_price ?? v.price ?? prod.selling_price,
                mrp: v.mrp ?? prod.mrp,
                in_stock: v.in_stock !== undefined ? Boolean(v.in_stock) : (v.available !== undefined ? Boolean(v.available) : (v.availability !== undefined ? Boolean(v.availability) : true)),
                available: v.available !== undefined ? Boolean(v.available) : (v.in_stock !== undefined ? Boolean(v.in_stock) : true),
                variant_group_id: gId,
                variant_attribute_name: v.variant_attribute_name || prod.variant_attribute_name || group.variantAttributeName,
              })
            }
          }
        }
      } else {
        if (Array.isArray(prod.variants) && prod.variants.length > 1) {
          const syntheticGroupId = `synth_group_${prod.id}`
          const groupEntry = {
            isVariantFamily: true,
            groupId: syntheticGroupId,
            groupTitle: prod.title,
            brand: prod.brand,
            seller_id: prod.seller_id,
            seller_name: prod.seller_name,
            variantAttributeName: prod.variant_attribute_name || "Size",
            variants: [prod],
          }
          for (const v of prod.variants) {
            const vId = v.id || v.seller_product_id
            if (vId && !groupEntry.variants.some((existing) => (existing.id || existing.seller_product_id) === vId)) {
              groupEntry.variants.push({
                ...prod,
                ...v,
                id: vId,
                seller_product_id: vId,
                variant_label: v.variant_label || v.label || v.pack_size || prod.pack_size,
                pack_size: v.pack_size || v.label || v.variant_label || prod.pack_size,
                selling_price: v.selling_price ?? v.price ?? prod.selling_price,
                mrp: v.mrp ?? prod.mrp,
                in_stock: v.in_stock !== undefined ? Boolean(v.in_stock) : (v.available !== undefined ? Boolean(v.available) : true),
                available: v.available !== undefined ? Boolean(v.available) : true,
                variant_group_id: syntheticGroupId,
              })
            }
          }
          result.push(groupEntry)
        } else {
          result.push({
            isVariantFamily: false,
            product: prod,
          })
        }
      }
    }

    for (const item of result) {
      if (item.isVariantFamily) {
        for (const v of item.variants) {
          v.variants = item.variants
          v.variant_group_id = item.groupId
          v.variant_attribute_name = item.variantAttributeName
        }
        const defaultVar = item.variants.find((v) => v.in_stock !== false && v.available !== false) || item.variants[0]
        item.defaultVariant = defaultVar
      }
    }

    return result
  }, [products])

  // Handle Add To Cart (products only)
  const handleAddToCart = async (product, quantityDelta = 1) => {
    if (!user) {
      setPendingAddToCart({ product, quantityDelta })
      setShowCustomerEntryModal(true)
      return
    }

    const cartItems = Array.isArray(cart?.items) ? cart.items : []
    const existingItem = cartItems.find((i) => i.seller_product_id === product.id)
    const newQty = existingItem ? existingItem.quantity + quantityDelta : quantityDelta

    if (existingItem && newQty <= 0) {
      // Remove item
      try {
        await removeMarketplaceCartItem(existingItem.id)
        await reloadCart()
        showToast(`Removed "${product.title}" from cart`)
      } catch (err) {
        showToast("Failed to remove item.", "error")
      }
      return
    }

    if (existingItem && newQty > 0) {
      // Update quantity on existing item
      try {
        await updateMarketplaceCartItem(existingItem.id, { quantity: newQty })
        await reloadCart()
      } catch (err) {
        showToast(err?.body?.message || "Failed to update item quantity.", "error")
      }
      return
    }

    // Add new item to cart
    setCartLoading(true)
    try {
      const res = await addMarketplaceCartItem({
        seller_product_id: product.id,
        quantity: quantityDelta,
        clear_cart: false,
      })
      if (res?.success) {
        await reloadCart()
        showToast(`Added "${product.title}" to cart`, "success")
      } else if (res?.error === "seller_mismatch" || res?.status_code === 409) {
        // Trigger Single-Seller Conflict Modal
        setSellerConflict({
          current_seller_name: res.current_seller_name || cart?.seller_name || "another seller",
          new_seller_name: product.seller_name || "New Seller",
          pendingProduct: product,
          pendingBasket: null,
          pendingQty: quantityDelta,
        })
      } else {
        showToast(res?.message || "Could not add product to cart.", "error")
      }
    } catch (err) {
      if (err?.body?.error === "seller_mismatch" || err?.status === 409) {
        setSellerConflict({
          current_seller_name: err.body?.current_seller_name || cart?.seller_name || "another seller",
          new_seller_name: product.seller_name || "New Seller",
          pendingProduct: product,
          pendingBasket: null,
          pendingQty: quantityDelta,
        })
      } else {
        showToast(err?.body?.message || "Failed to update cart.", "error")
      }
    } finally {
      setCartLoading(false)
    }
  }

  // Helper to extract default selections from a basket
  const initBasketSlotSelections = (b) => {
    const initial = {}
    if (Array.isArray(b?.slots) && b.slots.length > 0) {
      b.slots.forEach((slot) => {
        const defaultOpt = slot.options?.find((o) => o.is_default) || slot.options?.[0]
        if (defaultOpt) {
          initial[slot.id] = defaultOpt.id
        }
      })
    }
    return initial
  }

  // Handle Add Basket To Cart
  const handleAddBasketToCart = async (basket, clearExisting = false, customOptions = null) => {
    if (!user) {
      // Store pending basket, reuse modal flow
      setPendingAddToCart({ basket, isBasket: true, customOptions })
      setShowCustomerEntryModal(true)
      return
    }
    const customization = customOptions ? {
      slot_selections: customOptions.slot_selections || [],
      live_mrp: customOptions.live_mrp,
    } : (basket.customization || {})

    const cartItems = Array.isArray(cart?.items) ? cart.items : []
    const existingItem = cartItems.find((i) => {
      if (i.basket_id !== basket.id) return false
      if (!customOptions && (!i.customization || !i.customization.slot_selections)) return true
      const existingSelections = i.customization?.slot_selections || []
      const targetSelections = customOptions?.slot_selections || []
      return JSON.stringify(existingSelections) === JSON.stringify(targetSelections)
    })

    if (existingItem && !clearExisting) {
      // Already in cart - just increment
      try {
        await updateMarketplaceCartItem(existingItem.id, { quantity: existingItem.quantity + 1 })
        await reloadCart()
        showToast(`Added another "${basket.title}" bundle to cart`, "success")
      } catch (err) {
        showToast(err?.body?.message || "Failed to update cart.", "error")
      }
      return
    }
    setCartLoading(true)
    try {
      const res = await addBasketToCart({
        basket_id: basket.id,
        quantity: 1,
        clear_cart: clearExisting,
        customization,
      })
      if (res?.success) {
        await reloadCart()
        showToast(`Bundle "${basket.title}" added to cart!`, "success")
      } else if (res?.error === "seller_mismatch" || res?.status_code === 409) {
        setSellerConflict({
          current_seller_name: res.current_seller_name || cart?.seller_name || "another seller",
          new_seller_name: basket.seller_name || "New Seller",
          pendingBasket: basket,
          pendingProduct: null,
          pendingQty: 1,
          pendingCustomOptions: customOptions,
        })
      } else {
        showToast(res?.message || "Could not add bundle to cart.", "error")
      }
    } catch (err) {
      if (err?.body?.error === "seller_mismatch" || err?.status === 409) {
        setSellerConflict({
          current_seller_name: err.body?.current_seller_name || cart?.seller_name || "another seller",
          new_seller_name: basket.seller_name || "New Seller",
          pendingBasket: basket,
          pendingProduct: null,
          pendingQty: 1,
          pendingCustomOptions: customOptions,
        })
      } else {
        showToast(err?.body?.message || "Failed to add bundle to cart.", "error")
      }
    } finally {
      setCartLoading(false)
    }
  }

  // Handle Open Basket Detail Modal
  const handleOpenBasketDetail = async (basket) => {
    setBasketDetailModal(basket)
    setSelectedBasketSlotOptions(initBasketSlotSelections(basket))
    setBasketDetailLoading(true)
    try {
      const res = await fetchMarketplaceBasketDetail(basket.id)
      const detailed = res?.data || res
      if (detailed?.id) {
        setBasketDetailModal(detailed)
        setSelectedBasketSlotOptions(initBasketSlotSelections(detailed))
      }
    } catch (err) {
      console.error("Failed to load basket detail:", err)
    } finally {
      setBasketDetailLoading(false)
    }
  }

  // Handle Confirm Seller Switch
  const handleConfirmSellerSwitch = async () => {
    if (!sellerConflict) return
    const { pendingProduct, pendingBasket, pendingQty } = sellerConflict
    setCartLoading(true)
    try {
      if (pendingBasket) {
        // Basket seller switch
        const customOpt = sellerConflict.pendingCustomOptions
        const customization = customOpt ? {
          slot_selections: customOpt.slot_selections || [],
          live_mrp: customOpt.live_mrp,
        } : (pendingBasket.customization || {})
        const res = await addBasketToCart({
          basket_id: pendingBasket.id,
          quantity: pendingQty || 1,
          clear_cart: true,
          customization,
        })
        if (res?.success) {
          setSellerConflict(null)
          reloadCart()
          showToast(`Cart updated with bundle from "${pendingBasket.seller_name}"`, "success")
        } else {
          showToast(res?.message || "Failed to switch seller.", "error")
        }
      } else {        // Product seller switch (existing logic)
        const res = await addMarketplaceCartItem({
          seller_product_id: pendingProduct.id,
          quantity: pendingQty,
          clear_cart: true,
        })
        if (res?.success) {
          setSellerConflict(null)
          reloadCart()
          showToast(`Cart updated with items from "${pendingProduct.seller_name}"`, "success")
        } else {
          showToast(res?.message || "Failed to switch seller.", "error")
        }
      }
    } catch (err) {
      showToast(err?.body?.message || "Failed to switch seller.", "error")
    } finally {
      setCartLoading(false)
    }
  }

  // Handle Selecting a Variant within Product Detail Modal
  const handleSelectModalVariant = async (variant) => {
    if (!variant || (variant.id || variant.seller_product_id) === (detailProduct?.id || detailProduct?.seller_product_id)) return
    const isAvailable = variant.in_stock !== false && variant.available !== false && variant.availability !== false
    if (!isAvailable) return

    const targetId = variant.id || variant.seller_product_id
    const currentVariants = detailProduct?.variants || []

    const variantImg = variant.primary_image || (variant.images && variant.images[0]) || ""
    // Update detailProduct state in place immediately
    setDetailProduct((prev) => ({
      ...prev,
      ...variant,
      id: targetId,
      seller_product_id: targetId,
      title: variant.title || prev?.title,
      pack_size: variant.pack_size || variant.variant_label || variant.label || prev?.pack_size,
      unit: variant.unit || prev?.unit,
      sku: variant.sku || prev?.sku,
      selling_price: variant.selling_price ?? variant.price ?? prev?.selling_price,
      mrp: variant.mrp ?? prev?.mrp,
      in_stock: isAvailable,
      available: isAvailable,
      primary_image: variantImg || prev?.primary_image,
      images: (variant.images && variant.images.length > 0) ? variant.images : (variantImg ? [variantImg] : prev?.images),
      description: variant.description || prev?.description,
      variant_label: variant.variant_label || variant.label || prev?.variant_label,
      variants: currentVariants,
    }))

    // Keep grid card in sync with this selection
    const gId = detailProduct?.variant_group_id || variant.variant_group_id
    if (gId) {
      setSelectedVariantByGroup((prev) => ({ ...prev, [gId]: targetId }))
    }

    // Refresh full detail for the newly selected variant if possible
    try {
      const res = await fetchMarketplaceProductDetail(targetId)
      const data = res?.data || (res?.id ? res : null)
      if (data) {
        setDetailProduct((prev) => {
          if ((prev?.id || prev?.seller_product_id) !== targetId) return prev
          return {
            ...prev,
            ...data,
            primary_image: data.primary_image || (data.images && data.images[0]) || variantImg || prev?.primary_image,
            variants: (prev?.variants && prev.variants.length > 0) ? prev.variants : (data.variants || currentVariants),
          }
        })
      }
    } catch (err) {
      console.warn("Failed to fetch variant details:", err)
    }
  }

  // Handle Product Card Click (Open detail)
  const handleOpenDetail = async (prod, familyVariants = null) => {
    const allVariants = familyVariants || prod.variants || (prod.variant_group_id ? groupedProducts.find((g) => g.isVariantFamily && g.groupId === prod.variant_group_id)?.variants : null) || []
    const initialDetail = {
      ...prod,
      variants: allVariants && allVariants.length > 0 ? allVariants : (prod.variants || [])
    }
    setIsDescExpanded(false)
    setDetailProduct(initialDetail)
    setDetailLoading(true)
    try {
      const res = await fetchMarketplaceProductDetail(prod.id || prod.seller_product_id)
      const data = res?.data || (res?.id ? res : null)
      if (data) {
        setDetailProduct((prev) => {
          const mergedVariants = (data.variants && data.variants.length > 0)
            ? data.variants
            : (prev?.variants && prev.variants.length > 0 ? prev.variants : allVariants)
          return {
            ...data,
            variants: mergedVariants,
          }
        })
      }
    } catch (err) {
      console.error("Failed to fetch product details:", err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle Checkout Order via UPI (Razorpay) or Cash on Delivery (COD)
  const handleProceedToCheckout = async () => {
    if (cart.items.length === 0) return
    setCheckoutError("")
    setCheckoutLoading(true)

    // Option A: Cash on Delivery (COD) Flow
    if (paymentMethod === "COD") {
      try {
        const res = await checkoutMarketplaceOrder({
          delivery_address: deliveryAddress,
          customer_name: user?.name || "",
          customer_phone: user?.phone || "",
          customer_email: user?.email || "",
          payment_method: "COD",
          fulfilment_type: "DELIVERY",
          delivery_slot_id: selectedSlot?.id || null,
          delivery_slot_label: selectedSlot?.label || "",
          delivery_date: selectedDate || null,
        })

        if (res?.success && res?.data) {
          setActiveOrder(res.data)
          setCartDrawerOpen(false)
          setTrackingModalOpen(true)
          reloadCart()
          const amount = res.data.total_amount || cart.subtotal
          showToast(`Order placed! Pay ₹${amount} in cash on delivery.`, "success")
        } else {
          setCheckoutError(res?.message || "Failed to place Cash on Delivery order.")
        }
      } catch (err) {
        console.error("COD checkout error:", err)
        setCheckoutError(err?.body?.message || err?.message || "Failed to place Cash on Delivery order.")
      } finally {
        setCheckoutLoading(false)
      }
      return
    }

    // Option B: UPI (Razorpay) Flow
    try {
      // Step 1: Initiate Payment Intent on backend
      const intentRes = await initiateMarketplacePayment({
        delivery_address: deliveryAddress,
        customer_name: user?.name || "",
        customer_phone: user?.phone || "",
        customer_email: user?.email || "",
        payment_method: "UPI",
        fulfilment_type: "DELIVERY",
        delivery_slot_id: selectedSlot?.id || null,
        delivery_slot_label: selectedSlot?.label || "",
        delivery_date: selectedDate || null,
      })

      if (!intentRes?.success || !intentRes?.data) {
        setCheckoutError(intentRes?.message || "Failed to initialize payment.")
        setCheckoutLoading(false)
        return
      }

      const intentData = intentRes.data

      // If sandbox fallback mode is active (no keys configured on backend)
      if (intentData.sandbox_fallback) {
        const verifyRes = await verifyMarketplacePayment({
          razorpay_order_id: intentData.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "sandbox_mock_signature",
        })
        if (verifyRes?.success && verifyRes?.data) {
          setActiveOrder(verifyRes.data)
          setCartDrawerOpen(false)
          setTrackingModalOpen(true)
          reloadCart()
          showToast("Order placed successfully!", "success")
        } else {
          setCheckoutError(verifyRes?.message || "Order verification failed.")
        }
        setCheckoutLoading(false)
        return
      }

      // Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded || !window.Razorpay) {
        setCheckoutError("Unable to load payment gateway. Please check your network connection.")
        setCheckoutLoading(false)
        return
      }

      // Step 2: Open Razorpay Checkout widget configured for UPI default
      const options = {
        key: intentData.key_id,
        amount: intentData.amount_paise || Math.round(Number(intentData.amount) * 100),
        currency: intentData.currency || "INR",
        name: intentData.name || "Sevo Mart",
        description: intentData.description || "Sevo Grocery Marketplace Order",
        order_id: intentData.razorpay_order_id,
        prefill: intentData.prefill || {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay by UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: false },
          },
        },
        theme: {
          color: "#059669",
        },
        handler: async (paymentResponse) => {
          setCheckoutLoading(true)
          setCheckoutError("")
          try {
            // Step 3: Authoritative HMAC signature verification on backend
            const verifyRes = await verifyMarketplacePayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            })

            if (verifyRes?.success && verifyRes?.data) {
              setActiveOrder(verifyRes.data)
              setCartDrawerOpen(false)
              setTrackingModalOpen(true)
              reloadCart()
              showToast("Payment successful! Order placed.", "success")
            } else {
              setCheckoutError(verifyRes?.message || "Payment verification failed. Please contact support.")
            }
          } catch (verifyErr) {
            console.error("Payment verification error:", verifyErr)
            setCheckoutError(verifyErr?.body?.message || verifyErr?.message || "Payment verification failed. Please try again.")
          } finally {
            setCheckoutLoading(false)
          }
        },
        modal: {
          ondismiss: () => {
            // Customer closed popup without paying - leave cart untouched
            setCheckoutLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", (failedRes) => {
        console.warn("Payment failed or declined:", failedRes)
        setCheckoutError(failedRes?.error?.description || "Payment failed or was declined.")
        setCheckoutLoading(false)
      })
      rzp.open()
    } catch (err) {
      console.error("Checkout initiation error:", err)
      setCheckoutError(err?.body?.message || err?.message || "Failed to initiate payment. Please try again.")
      setCheckoutLoading(false)
    }
  }

  // Handle Cancel Order
  const handleCancelOrder = async () => {
    if (!activeOrder?.order_number) return
    if (!window.confirm("Are you sure you want to cancel this order?")) return
    setCancelLoading(true)
    try {
      const res = await cancelMarketplaceOrder(activeOrder.order_number, "Customer cancelled from tracking screen")
      if (res?.success) {
        setActiveOrder((prev) => ({ ...prev, status: "CANCELLED", status_label: "Cancelled" }))
        showToast("Order cancelled and reservation released.", "info")
      } else {
        showToast(res?.message || "Could not cancel order.", "error")
      }
    } catch (err) {
      showToast(err?.body?.message || "Failed to cancel order.", "error")
    } finally {
      setCancelLoading(false)
    }
  }

  // Live polling while Tracking Modal is open for non-terminal orders
  useEffect(() => {
    if (!trackingModalOpen || !activeOrder?.order_number) return
    const terminalStatuses = ["DELIVERED", "CANCELLED"]
    if (terminalStatuses.includes(activeOrder.status)) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchMarketplaceOrderDetail(activeOrder.order_number)
        if (res?.data) {
          setActiveOrder(res.data)
          if (terminalStatuses.includes(res.data.status)) {
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error("Failed to poll marketplace order tracking detail:", err)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [trackingModalOpen, activeOrder?.order_number, activeOrder?.status])

  const totalCartCount = (cart?.items || []).reduce((acc, i) => acc + i.quantity, 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col justify-between">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[99999] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-indigo-50 text-indigo-900 border-indigo-200"
            }`}
          >
            {toast.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            ) : toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-600" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div>
        {/* Marketplace Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={routes.landing} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">
                    Seller Hub Marketplace
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">Verified Stores</span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  Sevo Mart
                </h1>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg hidden md:block">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search groceries, dairy, staples, brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Cart & Account CTA */}
            <div className="flex items-center gap-3">
              {!user && (
                <button
                  type="button"
                  onClick={() => setShowCustomerEntryModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
              {user && (
                <Link
                  to={routes.account_bookings}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  title="My Orders"
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Orders</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setCartDrawerOpen(true)}
                className="relative flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalCartCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-full">
                    {totalCartCount}
                  </span>
                )}
                {cart?.subtotal > 0 && (
                  <span className="border-l border-emerald-500 pl-2 hidden sm:inline">
                    ₹{cart.subtotal}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="px-4 pb-3 md:hidden">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 text-sm rounded-xl border border-slate-200 focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Top Categories Pill Bar + Mobile Drawer Trigger */}
          <div className="border-t border-slate-100 bg-slate-50/90 overflow-x-auto no-scrollbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2">
              {/* Mobile Category Drawer Button */}
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shrink-0 shadow-sm cursor-pointer hover:bg-emerald-700 transition-colors"
                aria-label="Open categories menu"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Categories</span>
              </button>

              <span className="hidden sm:inline-flex text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 items-center gap-1">
                <Filter className="w-3 h-3" /> Quick Filter:
              </span>

              {/* All Option */}
              <button
                onClick={() => handleSelectCategory(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-sm ${
                  currentCategorySlug === "all"
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                All
              </button>

              {/* Unique Root Categories Horizontal Pills */}
              {uniqueRootCategories.map((cat) => {
                const isSelected = currentCategorySlug === cat.slug || breadcrumbs.some((b) => b.slug === cat.slug)
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-md"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {(cat.total_product_count || cat.product_count) > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected ? "bg-slate-700 text-emerald-300" : "bg-slate-100 text-slate-600"
                      }`}>
                        {cat.total_product_count || cat.product_count}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Seller Filter if multiple sellers */}
              {availableSellers.length > 1 && (
                <div className="ml-auto shrink-0 flex items-center gap-1.5 pl-4 border-l border-slate-200">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none"
                  >
                    <option value="All">All Stores</option>
                    {availableSellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Products Grid Section with Left Category Rail */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Category Not Found Banner */}
          {categoryNotFound && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm">Category "{currentCategorySlug}" is not available</span>
                  <p className="text-xs text-amber-700 mt-0.5">The category you requested may be inactive or does not exist. Showing all products.</p>
                </div>
              </div>
              <button
                onClick={() => handleSelectCategory(null)}
                className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Browse All Products
              </button>
            </div>
          )}

          <div className="flex items-start gap-4 lg:gap-6">
            {/* Desktop Left Category Rail (Instamart Compact Rail) */}
            <aside className="w-28 sm:w-32 lg:w-36 shrink-0 hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-0.5 space-y-2">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider truncate">
                      Categories
                    </span>
                  </div>
                  {currentCategorySlug !== "all" && (
                    <button
                      onClick={() => handleSelectCategory(null)}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* All Products Tile */}
                <CategorySidebarTile
                  isAll={true}
                  isSelected={currentCategorySlug === "all"}
                  onSelect={handleSelectCategory}
                  totalCount={totalCatalogProductsCount}
                />

                {/* Category Image Tiles */}
                {categoriesLoading ? (
                  <div className="space-y-2 py-1 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-14 bg-slate-100 rounded-2xl" />
                    ))}
                  </div>
                ) : categoriesUnavailable ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <span>Categories temporarily unavailable</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-0.5">
                    {uniqueRootCategories.map((cat) => {
                      const catKey = cat.id || cat.slug
                      const isDirectSelected = currentCategorySlug === cat.slug || String(currentCategorySlug) === String(cat.id)
                      const isAncestorOfSelected = breadcrumbs.some((b) => b.slug === cat.slug || String(b.id) === String(cat.id))
                      const isSelected = isDirectSelected || isAncestorOfSelected
                      const isExpanded = expandedCategoryIds.has(cat.id) || expandedCategoryIds.has(cat.slug)

                      return (
                        <CategorySidebarTile
                          key={catKey}
                          cat={cat}
                          isSelected={isSelected}
                          selectedSlug={currentCategorySlug}
                          isExpanded={isExpanded}
                          toggleExpand={toggleCategoryExpand}
                          onSelect={handleSelectCategory}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>

            {/* Right Products Container */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 flex-wrap bg-white/70 border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-sm">
                <button
                  onClick={() => handleSelectCategory(null)}
                  className={`hover:text-emerald-700 transition-colors cursor-pointer ${
                    currentCategorySlug === "all" ? "font-bold text-slate-900" : "font-medium"
                  }`}
                >
                  All
                </button>
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id || crumb.slug || idx}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectCategory(crumb)}
                        className="hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </React.Fragment>
                ))}
                {currentCategorySlug !== "all" && (
                  <button
                    onClick={() => handleSelectCategory(null)}
                    className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Filter
                  </button>
                )}
              </div>

              {/* Products Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {activeCategoryNode?.name || (currentCategorySlug === "all" ? "Featured Products" : currentCategorySlug)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {loading ? "Searching inventory..." : `${groupedProducts.length} product(s) found`}
                  </p>
                </div>

                {/* Active single seller banner if cart has items */}
                {cart?.seller_name && totalCartCount > 0 && (
                  <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Current Cart Store: <strong>{cart.seller_name}</strong></span>
                  </div>
                )}
              </div>

              {/* ── Combo Deals / Basket Offers Strip ── */}
              {currentCategorySlug === "all" && !searchQuery && (baskets.length > 0 || basketsLoading) && (
                <div className="mb-7">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-violet-600" />
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">Combo Deals</h4>
                    <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                      Bundle & Save
                    </span>
                  </div>

                  {basketsLoading ? (
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="shrink-0 w-64 h-36 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {baskets.map((basket) => {
                        const bundlePrice = Number(basket.bundle_price || 0)
                        const mrpTotal = Number(basket.mrp_total || 0)
                        const savings = Number(basket.savings || (mrpTotal > bundlePrice ? mrpTotal - bundlePrice : 0))
                        const savingsPct = mrpTotal > 0 ? Math.round((savings / mrpTotal) * 100) : 0
                        const inCartItem = cart.items?.find((i) => i.basket_id === basket.id)
                        const inCartQty = inCartItem ? inCartItem.quantity : 0

                        return (
                          <motion.div
                            key={basket.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="shrink-0 w-64 bg-white rounded-2xl border border-violet-200/60 hover:border-violet-400/60 hover:shadow-xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 cursor-pointer group"
                            onClick={() => handleOpenBasketDetail(basket)}
                          >
                            {/* Top Banner */}
                            <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-3.5 pt-3 pb-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-violet-200 shrink-0" />
                                <span className="text-[11px] font-black text-white uppercase tracking-wide">Bundle Deal</span>
                              </div>
                              {savingsPct > 0 && (
                                <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                  Save {savingsPct}%
                                </span>
                              )}
                            </div>

                            {/* Basket Body */}
                            <div className="px-3.5 pt-2.5 pb-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h5 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug mb-1 group-hover:text-violet-800 transition-colors">
                                  {basket.title}
                                </h5>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {basket.item_count || basket.items?.length || "?"} items · {basket.seller_name || "Seller Hub Partner"}
                                </p>
                                {/* Preview items */}
                                {Array.isArray(basket.items) && basket.items.length > 0 && (
                                  <div className="mt-2 flex gap-1">
                                    {basket.items.slice(0, 3).map((it, idx) => (
                                      <div key={idx} className="w-8 h-8 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                                        {it.primary_image ? (
                                          <img src={it.primary_image} alt={it.product_title} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }} />
                                        ) : (
                                          <Boxes className="w-4 h-4 text-slate-300" />
                                        )}
                                      </div>
                                    ))}
                                    {(basket.items?.length || 0) > 3 && (
                                      <div className="w-8 h-8 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                        +{basket.items.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Price + CTA */}
                              <div className="flex items-center justify-between mt-3 gap-2">
                                <div>
                                  <div className="text-sm font-black text-slate-900">₹{bundlePrice}</div>
                                  {mrpTotal > bundlePrice && (
                                    <div className="text-[11px] text-slate-400 line-through">₹{mrpTotal}</div>
                                  )}
                                </div>
                                {(() => {
                                  const isMultiOption = Boolean(basket.is_multi_option || basket.slots?.some((s) => s.options?.length > 1))
                                  if (isMultiOption) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleOpenBasketDetail(basket) }}
                                        className="px-3 py-1.5 bg-violet-50 hover:bg-violet-600 hover:text-white text-violet-700 border border-violet-200 hover:border-violet-600 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                                      >
                                        Customize
                                      </button>
                                    )
                                  }
                                  if (inCartQty > 0) {
                                    return (
                                      <div
                                        className="flex items-center bg-violet-600 text-white rounded-xl overflow-hidden shadow-sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); removeMarketplaceCartItem(inCartItem.id).then(reloadCart) }}
                                          className="px-2 py-1.5 hover:bg-violet-700 transition-colors"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="px-2 text-xs font-black">{inCartQty}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleAddBasketToCart(basket) }}
                                          className="px-2 py-1.5 hover:bg-violet-700 transition-colors"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )
                                  }
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleAddBasketToCart(basket) }}
                                      className="px-3 py-1.5 bg-violet-50 hover:bg-violet-600 hover:text-white text-violet-700 border border-violet-200 hover:border-violet-600 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                      Add Bundle
                                    </button>
                                  )
                                })()}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Loading Skeletons */}

              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse flex flex-col gap-3">
                      <div className="w-full h-36 bg-slate-100 rounded-xl" />
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="h-8 bg-slate-100 rounded-xl mt-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && groupedProducts.length === 0 && (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-md mx-auto my-12 shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-4">
                    <PackageCheck className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    {currentCategorySlug !== "all" ? `No products in "${activeCategoryNode?.name || currentCategorySlug}"` : "No products found"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    We couldn't find any approved products matching your selection. Try clearing search filters or choosing another category.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedSeller("All")
                      handleSelectCategory(null)
                    }}
                    className="mt-5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}

              {/* Product Cards */}
              {!loading && groupedProducts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {groupedProducts.map((item) => {
                    const isFamily = item.isVariantFamily
                    let activeProduct = null
                    let familyVariants = []

                    if (isFamily) {
                      familyVariants = item.variants || []
                      const selectedVariantId = selectedVariantByGroup[item.groupId]
                      activeProduct = familyVariants.find((v) => (v.id || v.seller_product_id) === selectedVariantId) || item.defaultVariant || familyVariants[0]
                    } else {
                      activeProduct = item.product
                    }

                    if (!activeProduct) return null

                    const cartItem = cart.items?.find((i) => i.seller_product_id === (activeProduct.id || activeProduct.seller_product_id))
                    const inCartQty = cartItem ? cartItem.quantity : 0
                    const price = Number(activeProduct.selling_price || 0)
                    const mrp = Number(activeProduct.mrp || 0)
                    const hasDiscount = mrp > price
                    const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0
                    const isAvailable = activeProduct.in_stock !== false && activeProduct.available !== false

                    return (
                      <motion.div
                        key={isFamily ? `group-${item.groupId}` : `prod-${activeProduct.id || activeProduct.seller_product_id}`}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-0.5"
                      >
                        {/* Top Image & Badge */}
                        <div
                          className="relative p-4 bg-slate-50/50 cursor-pointer overflow-hidden flex items-center justify-center min-h-[160px]"
                          onClick={() => handleOpenDetail(activeProduct, isFamily ? familyVariants : null)}
                        >
                          {hasDiscount && (
                            <span className="absolute top-2.5 left-2.5 z-10 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                              {discountPct}% OFF
                            </span>
                          )}

                          <img
                            src={activeProduct.primary_image || (activeProduct.images && activeProduct.images[0]) || "/mockups/vegetables_realistic.png"}
                            alt={activeProduct.title}
                            className="w-full h-32 object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = "/mockups/vegetables_realistic.png"
                            }}
                          />

                          {!isAvailable && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                              <span className="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-sm">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Meta */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            {activeProduct.brand && (
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {activeProduct.brand}
                              </div>
                            )}
                            <h4
                              onClick={() => handleOpenDetail(activeProduct, isFamily ? familyVariants : null)}
                              className="text-sm font-extrabold text-slate-900 line-clamp-2 hover:text-emerald-700 cursor-pointer mt-0.5 leading-snug"
                            >
                              {activeProduct.title}
                            </h4>
                            <div className="text-xs text-slate-500 mt-1 font-medium">
                              {activeProduct.pack_size || activeProduct.variant_label || activeProduct.unit || "1 unit"}
                            </div>

                            {/* Variant / Size Chips on Card */}
                            {isFamily && familyVariants.length > 1 && (
                              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                {familyVariants.map((v) => {
                                  const vId = v.id || v.seller_product_id
                                  const isSelected = vId === (activeProduct.id || activeProduct.seller_product_id)
                                  const vAvailable = v.in_stock !== false && v.available !== false
                                  return (
                                    <button
                                      key={vId}
                                      type="button"
                                      disabled={!vAvailable}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (vAvailable) {
                                          setSelectedVariantByGroup((prev) => ({ ...prev, [item.groupId]: vId }))
                                        }
                                      }}
                                      title={v.variant_label || v.label || v.pack_size}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                        !vAvailable
                                          ? "bg-slate-50 border-slate-200/60 text-slate-400 line-through opacity-50 cursor-not-allowed"
                                          : isSelected
                                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500/20 shadow-2xs font-extrabold"
                                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                                      }`}
                                    >
                                      {v.variant_label || v.label || v.pack_size || v.unit}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Store Tag */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-400 font-semibold truncate">
                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{activeProduct.seller_name || "Seller Store"}</span>
                          </div>

                          {/* Price & Add To Cart */}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-base font-black text-slate-900">
                                ₹{price}
                              </div>
                              {hasDiscount && (
                                <div className="text-xs text-slate-400 line-through">
                                  ₹{mrp}
                                </div>
                              )}
                            </div>

                            {/* Add / Stepper CTA */}
                            {isAvailable ? (
                              inCartQty === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(activeProduct, 1)}
                                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 hover:border-emerald-600 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                  ADD
                                </button>
                              ) : (
                                <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-sm overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(activeProduct, -1)}
                                    className="px-2 py-1.5 hover:bg-emerald-700 transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-2 text-xs font-black">{inCartQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(activeProduct, 1)}
                                    className="px-2 py-1.5 hover:bg-emerald-700 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400 uppercase">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Product Detail Modal (Instamart Style) ── */}
      <AnimatePresence>
        {detailProduct && (() => {
          const detailCartItem = cart?.items?.find(
            (i) => i.seller_product_id === (detailProduct.id || detailProduct.seller_product_id)
          )
          const detailInCartQty = detailCartItem ? detailCartItem.quantity : 0
          const hasDetailDiscount = detailProduct.mrp && Number(detailProduct.mrp) > Number(detailProduct.selling_price)
          const detailDiscountPct = hasDetailDiscount
            ? Math.round(((Number(detailProduct.mrp) - Number(detailProduct.selling_price)) / Number(detailProduct.mrp)) * 100)
            : 0
          const displayImg = detailProduct.primary_image || (detailProduct.images && detailProduct.images[0]) || ""
          const resolvedImg = resolveImageUrl(displayImg) || "/mockups/vegetables_realistic.png"

          return (
            <div
              className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setDetailProduct(null)
                setIsDescExpanded(false)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col font-sans"
              >
                {/* Modal Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                      {detailProduct.brand || "Fresh & Direct"}
                    </span>
                    {detailProduct.seller_name && (
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-400" />
                        {detailProduct.seller_name}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailProduct(null)
                      setIsDescExpanded(false)
                    }}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                  {/* Large Square Hero Image Container (Instamart style) */}
                  <div className="relative w-full h-64 sm:h-72 bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-2xl p-4 flex items-center justify-center overflow-hidden border border-slate-100">
                    {hasDetailDiscount && (
                      <span className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                        {detailDiscountPct}% OFF
                      </span>
                    )}
                    <img
                      src={resolvedImg}
                      alt={detailProduct.title}
                      className="max-h-56 sm:max-h-64 w-full object-contain hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "/mockups/vegetables_realistic.png"
                      }}
                    />
                    {!detailProduct.in_stock && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md uppercase tracking-wider">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Subtitle / Pack Info */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                      {detailProduct.title}
                    </h3>
                    <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{detailProduct.pack_size || detailProduct.variant_label || detailProduct.unit || "Standard Pack"}</span>
                      {detailProduct.sku && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400">SKU: {detailProduct.sku}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price & Discount Block */}
                  <div className="flex items-center justify-between bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Price</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900">
                          ₹{detailProduct.selling_price}
                        </span>
                        {hasDetailDiscount && (
                          <span className="text-sm font-bold text-slate-400 line-through">
                            ₹{detailProduct.mrp}
                          </span>
                        )}
                        {hasDetailDiscount && (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2 py-0.5 rounded-md">
                            {detailDiscountPct}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                        detailProduct.in_stock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {detailProduct.in_stock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>

                  {/* Variant Options Selector (Instamart Pill Pattern) */}
                  {Array.isArray(detailProduct.variants) && detailProduct.variants.length > 1 && (
                    <div className="space-y-2.5 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                          Select {detailProduct.variant_attribute_name || "Size / Option"}: <strong className="text-emerald-700 ml-1">{detailProduct.variant_label || detailProduct.pack_size || detailProduct.unit || "Selected"}</strong>
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {detailProduct.variants.length} options
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap pt-1">
                        {detailProduct.variants.map((v) => {
                          const vId = v.id || v.seller_product_id
                          const isSelected = vId === (detailProduct.id || detailProduct.seller_product_id)
                          const isAvailable = v.in_stock !== false && v.available !== false
                          const vPrice = v.selling_price ?? v.price

                          return (
                            <button
                              key={vId}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => handleSelectModalVariant(v)}
                              className={`min-w-[80px] px-3.5 py-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                !isAvailable
                                  ? "bg-slate-50 border-slate-200/70 text-slate-400 line-through opacity-50 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-600/30 shadow-sm font-bold"
                                  : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30"
                              }`}
                            >
                              <span className={`text-xs font-black leading-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                                {v.variant_label || v.label || v.pack_size || v.unit || "Option"}
                              </span>
                              {vPrice !== undefined && vPrice !== null && (
                                <span className={`text-[11px] font-bold ${isSelected ? "text-emerald-100" : "text-slate-500"}`}>
                                  ₹{vPrice}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Description / Product Details Section (Collapsible) */}
                  {detailProduct.description && (
                    <div className="border-t border-slate-100 pt-4">
                      <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Product Details</h5>
                      <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <p className={!isDescExpanded && detailProduct.description.length > 180 ? "line-clamp-3" : ""}>
                          {detailProduct.description}
                        </p>
                        {detailProduct.description.length > 180 && (
                          <button
                            type="button"
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-1.5 inline-flex items-center gap-1 cursor-pointer"
                          >
                            {isDescExpanded ? "Read Less" : "Read More"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Bottom CTA Bar */}
                <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Price</span>
                    <span className="text-base sm:text-lg font-black text-slate-900">₹{detailProduct.selling_price}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailProduct(null)
                        setIsDescExpanded(false)
                      }}
                      className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      Close
                    </button>

                    {detailProduct.in_stock ? (
                      detailInCartQty > 0 ? (
                        <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20 overflow-hidden font-black">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(detailProduct, -1)}
                            className="px-3.5 py-2 hover:bg-emerald-700 transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs sm:text-sm font-black min-w-[24px] text-center">{detailInCartQty}</span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(detailProduct, 1)}
                            className="px-3.5 py-2 hover:bg-emerald-700 transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(detailProduct, 1)}
                          className="px-5 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Cart • ₹{detailProduct.selling_price}
                        </button>
                      )
                    ) : (
                      <span className="px-4 py-2.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-black">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* ── Basket / Combo Deal Detail Modal ── */}
      <AnimatePresence>
        {basketDetailModal && (() => {
          const slots = Array.isArray(basketDetailModal.slots) && basketDetailModal.slots.length > 0 ? basketDetailModal.slots : []
          const legacyItems = Array.isArray(basketDetailModal.items) ? basketDetailModal.items : []
          const bundlePrice = Number(basketDetailModal.bundle_price || basketDetailModal.selling_price || 0)

          // Compute Dynamic Live Total MRP based on currently chosen options
          let liveTotalMrp = 0
          let hasOutOfStockChoice = false

          if (slots.length > 0) {
            slots.forEach((slot) => {
              const selectedOptId = selectedBasketSlotOptions[slot.id] || slot.options?.find((o) => o.is_default)?.id || slot.options?.[0]?.id
              const chosenOpt = slot.options?.find((o) => o.id === selectedOptId) || slot.options?.[0]
              const optMrp = Number(chosenOpt?.mrp || chosenOpt?.selling_price || 0)
              const qty = Number(slot.quantity || 1)
              liveTotalMrp += optMrp * qty
              if (chosenOpt && (chosenOpt.in_stock === false || (chosenOpt.available_stock !== undefined && chosenOpt.available_stock <= 0))) {
                hasOutOfStockChoice = true
              }
            })
          } else if (legacyItems.length > 0) {
            legacyItems.forEach((it) => {
              const itMrp = Number(it.mrp || it.unit_price || 0)
              const qty = Number(it.quantity || 1)
              liveTotalMrp += itMrp * qty
            })
          } else {
            liveTotalMrp = Number(basketDetailModal.mrp_total || basketDetailModal.total_mrp || 0)
          }

          const liveSavings = Math.max(0, liveTotalMrp - bundlePrice)
          const liveSavingsPct = liveTotalMrp > 0 ? Math.round((liveSavings / liveTotalMrp) * 100) : 0

          return (
            <div className="fixed inset-0 z-[10006] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col font-sans"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Boxes className="w-4 h-4 text-violet-700" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-violet-800 bg-violet-100/90 px-2.5 py-1 rounded-md">
                      Combo Offer
                    </span>
                    {slots.some((s) => s.options?.length > 1) && (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Customizable
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setBasketDetailModal(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  {/* Title & Meta */}
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {basketDetailModal.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5 text-slate-400" />{basketDetailModal.seller_name || "Seller Hub Partner"}</span>
                      <span className="flex items-center gap-1"><Boxes className="w-3.5 h-3.5 text-slate-400" />{slots.length || legacyItems.length || basketDetailModal.item_count || 0} Slots</span>
                      {basketDetailModal.warehouse_name && (
                        <span className="text-[11px] text-slate-400 font-medium">Ships from {basketDetailModal.warehouse_name}</span>
                      )}
                    </div>
                    {basketDetailModal.description && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{basketDetailModal.description}</p>
                    )}
                  </div>

                  {/* Savings Summary (Dynamic Live Recalculation) */}
                  <div className="bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50/40 border border-violet-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs">
                    <div>
                      <div className="text-[11px] font-black text-violet-600 uppercase tracking-wider">Fixed Combo Price</div>
                      <div className="text-3xl font-black text-slate-900 mt-0.5">₹{bundlePrice}</div>
                      {liveTotalMrp > bundlePrice && (
                        <div className="text-xs text-slate-400 font-semibold mt-0.5">
                          Total MRP: <span className="line-through">₹{liveTotalMrp}</span>
                        </div>
                      )}
                    </div>
                    {liveSavings > 0 && (
                      <div className="bg-amber-400 text-amber-950 px-3.5 py-2 rounded-2xl text-center shrink-0 shadow-xs">
                        <div className="text-[10px] font-black uppercase tracking-wider">You Save</div>
                        <div className="text-lg font-black leading-tight">₹{liveSavings}</div>
                        {liveSavingsPct > 0 && <div className="text-[9px] font-extrabold opacity-80">({liveSavingsPct}% off)</div>}
                      </div>
                    )}
                  </div>

                  {/* Component Slots / Items */}
                  {basketDetailLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
                      ))}
                    </div>
                  ) : slots.length > 0 ? (
                    <div>
                      <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Included Slots ({slots.length})</span>
                        <span className="text-[11px] font-bold text-violet-600 lowercase">select your options</span>
                      </div>
                      <div className="space-y-3.5">
                        {slots.map((slot, sIdx) => {
                          const isMulti = Array.isArray(slot.options) && slot.options.length > 1
                          const selectedOptId = selectedBasketSlotOptions[slot.id] || slot.options?.find((o) => o.is_default)?.id || slot.options?.[0]?.id
                          const selectedOpt = slot.options?.find((o) => o.id === selectedOptId) || slot.options?.[0]

                          return (
                            <div key={slot.id || sIdx} className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5">
                              {/* Slot Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                    {sIdx + 1}
                                  </span>
                                  <span className="text-xs font-black text-slate-800 truncate">
                                    {slot.slot_title || selectedOpt?.product_title || `Slot ${sIdx + 1}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isMulti && (
                                    <span className="text-[10px] font-black text-violet-700 bg-violet-100/90 border border-violet-200 px-2 py-0.5 rounded-full">
                                      Choose 1 of {slot.options.length}
                                    </span>
                                  )}
                                  <span className="text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                    Qty: {slot.quantity || 1}
                                  </span>
                                </div>
                              </div>

                              {/* Multi-Option Selector */}
                              {isMulti ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                  {slot.options.map((opt) => {
                                    const isSelected = selectedOptId === opt.id
                                    const isOutOfStock = opt.in_stock === false || (opt.available_stock !== undefined && opt.available_stock <= 0)
                                    return (
                                      <div
                                        key={opt.id}
                                        onClick={() => {
                                          if (!isOutOfStock) {
                                            setSelectedBasketSlotOptions((prev) => ({ ...prev, [slot.id]: opt.id }))
                                          }
                                        }}
                                        className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-violet-50/80 border-violet-500 ring-1 ring-violet-500 shadow-xs"
                                            : isOutOfStock
                                            ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                        }`}
                                      >
                                        {/* Radio Indicator */}
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                          isSelected ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"
                                        }`}>
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>

                                        {/* Image */}
                                        <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                                          {opt.primary_image ? (
                                            <img src={opt.primary_image} alt={opt.product_title} className="w-full h-full object-cover"
                                              onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }} />
                                          ) : (
                                            <Boxes className="w-4 h-4 text-slate-300" />
                                          )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                                            {opt.product_title}
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                            {opt.product_brand && <span className="font-semibold text-slate-600">{opt.product_brand}</span>}
                                            {opt.pack_size && <span>• {opt.pack_size}</span>}
                                            {opt.mrp && <span className="text-slate-500 font-medium">• MRP ₹{opt.mrp}</span>}
                                          </div>
                                        </div>

                                        {/* Out of stock tag */}
                                        {isOutOfStock && (
                                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                            Out of Stock
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                /* Single Fixed Option (No clutter) */
                                <div className="flex items-center gap-3 bg-white rounded-xl p-2.5 border border-slate-200">
                                  <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                                    {selectedOpt?.primary_image ? (
                                      <img src={selectedOpt.primary_image} alt={selectedOpt.product_title} className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }} />
                                    ) : (
                                      <Boxes className="w-4 h-4 text-slate-300" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate">{selectedOpt?.product_title}</div>
                                    <div className="text-[11px] text-slate-400 font-medium">
                                      {[selectedOpt?.product_brand, selectedOpt?.pack_size || selectedOpt?.unit].filter(Boolean).join(" • ")}
                                      {selectedOpt?.mrp && ` • MRP ₹${selectedOpt.mrp}`}
                                    </div>
                                  </div>
                                  {selectedOpt?.in_stock === false && (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                      Out of Stock
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : legacyItems.length > 0 ? (
                    <div>
                      <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">What's Included</div>
                      <div className="space-y-2">
                        {legacyItems.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="w-11 h-11 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                              {it.primary_image ? (
                                <img src={it.primary_image} alt={it.product_title} className="w-full h-full object-cover"
                                  onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }} />
                              ) : (
                                <Boxes className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate">{it.product_title}</div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                {[it.pack_size || it.unit, it.product_sku].filter(Boolean).join(" · ") || ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-slate-900">×{it.quantity}</div>
                              {it.unit_price && (
                                <div className="text-[11px] text-slate-400">₹{it.unit_price} each</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Modal Footer CTA */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                  <div className="text-xs font-bold text-slate-500">
                    Combo Total: <span className="text-sm font-black text-slate-900">₹{bundlePrice}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBasketDetailModal(null)}
                      className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={hasOutOfStockChoice}
                      onClick={() => {
                        const slotSelections = slots.map((slot) => {
                          const optId = selectedBasketSlotOptions[slot.id]
                          const opt = slot.options?.find((o) => o.id === optId) || slot.options?.find((o) => o.is_default) || slot.options?.[0]
                          return {
                            slot_id: slot.id,
                            product_id: opt ? opt.product_id : (slot.product_id || slot.options?.[0]?.product_id),
                          }
                        })
                        const customOptions = slotSelections.length > 0 ? {
                          slot_selections: slotSelections,
                          live_mrp: liveTotalMrp,
                        } : null

                        handleAddBasketToCart(basketDetailModal, false, customOptions)
                        setBasketDetailModal(null)
                      }}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                        hasOutOfStockChoice
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                          : "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20"
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      {hasOutOfStockChoice ? "Selection Out of Stock" : `Add Bundle • ₹${bundlePrice}`}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* ── Cart Drawer (Instamart Style) ── */}

      <AnimatePresence>
        {cartDrawerOpen && (() => {
          const totalSavings = (Array.isArray(cart?.items) ? cart.items : []).reduce((acc, item) => {
            if (item.mrp && Number(item.mrp) > Number(item.unit_price_snapshot)) {
              return acc + (Number(item.mrp) - Number(item.unit_price_snapshot)) * item.quantity
            }
            return acc
          }, 0)

          return (
            <div className="fixed inset-0 z-[10000] overflow-hidden" onClick={() => setCartDrawerOpen(false)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-slate-50 h-full flex flex-col shadow-2xl overflow-hidden font-sans z-10"
              >
                {/* Drawer Header */}
                <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                        Marketplace Cart
                        {cart?.items?.length > 0 && (
                          <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {cart.items.reduce((sum, it) => sum + (it.quantity || 1), 0)} items
                          </span>
                        )}
                      </h3>
                      {cart?.seller_name && (
                        <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-400" /> Store: {cart.seller_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Delivery ETA Banner (Instamart Prominent Promise) */}
                {cart?.items?.length > 0 && (
                  <div className={`px-5 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 shadow-inner ${
                    slotTypeMode === "EXPRESS"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-800 text-white"
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {slotTypeMode === "EXPRESS" ? (
                        <Zap className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-emerald-200 shrink-0" />
                      )}
                      <span className="truncate">
                        {slotTypeMode === "EXPRESS"
                          ? (selectedSlot?.label ? `Delivery in 25-30 mins · ${selectedSlot.label}` : "Delivery in 25-30 mins")
                          : `Scheduled for ${selectedSlot?.label || (selectedDate === new Date().toISOString().split("T")[0] ? "Today" : selectedDate)}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded shrink-0">
                      {slotTypeMode === "EXPRESS" ? "Express" : "Scheduled"}
                    </span>
                  </div>
                )}

                {/* Drawer Body / Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50">
                  {(!cart?.items || cart.items.length === 0) ? (
                    <div className="text-center py-20 px-6 flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
                        <ShoppingBag className="w-9 h-9" />
                      </div>
                      <h4 className="font-black text-slate-900 text-base">Your cart is empty</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                        Explore fresh groceries, daily essentials, and bundle deals to fill your cart.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCartDrawerOpen(false)}
                        className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Multi-Warehouse Split Warning Notice */}
                      {cart?.multi_warehouse_notice && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5">
                          <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">Multi-Warehouse Delivery</div>
                            <div className="text-[11px] text-amber-800 mt-0.5">{cart.multi_warehouse_notice}</div>
                          </div>
                        </div>
                      )}

                      {/* Flattened Continuous Items List (Grouped by Warehouse or Single Panel) */}
                      {Array.isArray(cart?.warehouse_groups) && cart.warehouse_groups.length > 0 ? (
                        cart.warehouse_groups.map((group, gIdx) => (
                          <div key={group.warehouse_id || gIdx} className="space-y-2">
                            <div className="flex items-center justify-between px-1 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-emerald-600" />
                                {group.warehouse_name || "Warehouse"}
                              </span>
                              <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md font-bold">
                                1 Consolidated Delivery
                              </span>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden px-4">
                              {group.items.map((item) => (
                                <div key={item.id} className="py-3 flex items-center gap-3">
                                  {/* Thumbnail */}
                                  {item.basket_id ? (
                                    <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0 border border-violet-100">
                                      <Boxes className="w-5 h-5 text-violet-500" />
                                    </div>
                                  ) : (
                                    <img
                                      src={resolveImageUrl(item.product_image) || "/mockups/vegetables_realistic.png"}
                                      alt={item.product_title}
                                      className="w-12 h-12 object-contain bg-slate-50 rounded-xl p-1 shrink-0 border border-slate-100"
                                      onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }}
                                    />
                                  )}

                                  {/* Middle details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      {item.basket_id && (
                                        <span className="text-[9px] font-black uppercase tracking-wider text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                                          BUNDLE
                                        </span>
                                      )}
                                      <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {item.basket_title || item.product_title}
                                      </h4>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-medium truncate">
                                      {item.basket_id ? `Bundle · ₹${item.unit_price_snapshot}` : `${item.pack_size || item.unit} • ₹${item.unit_price_snapshot}`}
                                    </div>
                                    <div className="text-xs font-black text-slate-900 mt-0.5">
                                      ₹{item.line_amount}
                                    </div>
                                  </div>

                                  {/* Stepper */}
                                  <div className={`flex items-center rounded-xl overflow-hidden shrink-0 border ${
                                    item.basket_id ? "bg-violet-50 border-violet-200 text-violet-800" : "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                                  }`}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (item.quantity === 1) {
                                          removeMarketplaceCartItem(item.id).then(reloadCart)
                                        } else {
                                          updateMarketplaceCartItem(item.id, { quantity: item.quantity - 1 }).then(reloadCart)
                                        }
                                      }}
                                      className={`p-1.5 transition-colors cursor-pointer ${item.basket_id ? "hover:bg-violet-100" : "hover:bg-emerald-100"}`}
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="px-2 text-xs font-black min-w-[20px] text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateMarketplaceCartItem(item.id, { quantity: item.quantity + 1 }).then(reloadCart)
                                      }}
                                      className={`p-1.5 transition-colors cursor-pointer ${item.basket_id ? "hover:bg-violet-100" : "hover:bg-emerald-100"}`}
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden px-4">
                          {cart.items.map((item) => (
                            <div key={item.id} className="py-3 flex items-center gap-3">
                              {/* Thumbnail */}
                              {item.basket_id ? (
                                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0 border border-violet-100">
                                  <Boxes className="w-5 h-5 text-violet-500" />
                                </div>
                              ) : (
                                <img
                                  src={resolveImageUrl(item.product_image) || "/mockups/vegetables_realistic.png"}
                                  alt={item.product_title}
                                  className="w-12 h-12 object-contain bg-slate-50 rounded-xl p-1 shrink-0 border border-slate-100"
                                  onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }}
                                />
                              )}

                              {/* Middle details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {item.basket_id && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                                      BUNDLE
                                    </span>
                                  )}
                                  <h4 className="text-xs font-bold text-slate-900 truncate">
                                    {item.basket_title || item.product_title}
                                  </h4>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium truncate">
                                  {item.basket_id ? `Bundle · ₹${item.unit_price_snapshot}` : `${item.pack_size || item.unit} • ₹${item.unit_price_snapshot}`}
                                </div>
                                <div className="text-xs font-black text-slate-900 mt-0.5">
                                  ₹{item.line_amount}
                                </div>
                              </div>

                              {/* Stepper */}
                              <div className={`flex items-center rounded-xl overflow-hidden shrink-0 border ${
                                item.basket_id ? "bg-violet-50 border-violet-200 text-violet-800" : "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity === 1) {
                                      removeMarketplaceCartItem(item.id).then(reloadCart)
                                    } else {
                                      updateMarketplaceCartItem(item.id, { quantity: item.quantity - 1 }).then(reloadCart)
                                    }
                                  }}
                                  className={`p-1.5 transition-colors cursor-pointer ${item.basket_id ? "hover:bg-violet-100" : "hover:bg-emerald-100"}`}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2 text-xs font-black min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateMarketplaceCartItem(item.id, { quantity: item.quantity + 1 }).then(reloadCart)
                                  }}
                                  className={`p-1.5 transition-colors cursor-pointer ${item.basket_id ? "hover:bg-violet-100" : "hover:bg-emerald-100"}`}
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add more items strip (Instamart style) */}
                      <button
                        type="button"
                        onClick={() => setCartDrawerOpen(false)}
                        className="w-full py-2.5 px-4 bg-emerald-50/70 hover:bg-emerald-100/80 border border-dashed border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer group"
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>Missed something? <span className="font-black underline underline-offset-2">Add more items</span></span>
                      </button>

                      {/* Delivery Slot Section (Compact Expandable Row) */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setDeliveryPreferenceExpanded((prev) => !prev)}
                          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              slotTypeMode === "EXPRESS" ? "bg-amber-50 text-amber-600 border border-amber-200/60" : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            }`}>
                              {slotTypeMode === "EXPRESS" ? <Zap className="w-4 h-4 fill-amber-500 text-amber-500" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Delivery Preference
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {slotTypeMode === "EXPRESS"
                                  ? `⚡ Fast Delivery ${selectedSlot?.label ? `· ${selectedSlot.label}` : "· Instant"}`
                                  : `📅 Scheduled · ${selectedSlot?.label || "Select Slot"}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                            <span className="text-[11px] font-bold text-emerald-600">
                              {deliveryPreferenceExpanded ? "Close" : "Change"}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${deliveryPreferenceExpanded ? "rotate-180 text-slate-600" : ""}`} />
                          </div>
                        </button>

                        {deliveryPreferenceExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Select Option
                              </div>
                              {slotsLoading && (
                                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                              )}
                            </div>

                            {/* Mode Toggle: Fast Delivery vs Schedule a Slot */}
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleSwitchSlotMode("EXPRESS")}
                                className={`py-2 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  slotTypeMode === "EXPRESS"
                                    ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/60"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                <span>Fast Delivery</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSwitchSlotMode("STANDARD")}
                                className={`py-2 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  slotTypeMode === "STANDARD"
                                    ? "bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/60"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>Schedule a Slot</span>
                              </button>
                            </div>

                            {/* Fast Delivery View */}
                            {slotTypeMode === "EXPRESS" && (
                              <div className="space-y-2">
                                {selectedSlot ? (
                                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-black text-emerald-950">
                                          {selectedSlot.label}
                                        </div>
                                        <div className="text-[10px] text-emerald-700 font-medium">
                                          Earliest express dispatch for today
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md shrink-0">
                                      Express
                                    </span>
                                  </div>
                                ) : !slotsLoading ? (
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <div>
                                        <div className="font-bold text-slate-900">Standard Delivery</div>
                                        <div className="text-[10px] text-slate-500">Express slots not configured — standard dispatch will be used</div>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shrink-0">
                                      Standard
                                    </span>
                                  </div>
                                ) : (
                                  <div className="py-4 text-center text-xs text-slate-400 font-medium">
                                    Checking express availability...
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Schedule a Slot View */}
                            {slotTypeMode === "STANDARD" && (
                              <div className="space-y-3 pt-1">
                                {/* Date Strip */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                  {slotDateOptions.map((opt) => {
                                    const isDateSelected = selectedDate === opt.date
                                    return (
                                      <button
                                        key={opt.date}
                                        type="button"
                                        onClick={() => setSelectedDate(opt.date)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border cursor-pointer ${
                                          isDateSelected
                                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* Slots Grid */}
                                <div className="space-y-1.5">
                                  {slotsLoading ? (
                                    <div className="py-4 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                                      <span>Loading available slots...</span>
                                    </div>
                                  ) : availableSlots.length === 0 ? (
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div>
                                          <div className="font-bold text-slate-900">Standard Delivery</div>
                                          <div className="text-[10px] text-slate-500">Regular dispatch applied for this date</div>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shrink-0">
                                        Standard
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {availableSlots.map((slot) => {
                                        const isSelected = selectedSlot?.id === slot.id
                                        const isAvailable = slot.available !== false
                                        return (
                                          <button
                                            key={slot.id}
                                            type="button"
                                            disabled={!isAvailable}
                                            onClick={() => isAvailable && setSelectedSlot(slot)}
                                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                              !isAvailable
                                                ? "bg-slate-50 border-slate-200/60 opacity-50 cursor-not-allowed text-slate-400"
                                                : isSelected
                                                ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs cursor-pointer font-bold"
                                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
                                            }`}
                                          >
                                            <div className="min-w-0 pr-1">
                                              <div className="text-xs font-black truncate">
                                                {slot.label}
                                              </div>
                                              {slot.start_time && slot.end_time && (
                                                <div className="text-[10px] text-slate-400">
                                                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                </div>
                                              )}
                                            </div>
                                            {isSelected && (
                                              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                                            )}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Delivery Address Section */}
                      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/60 mt-0.5">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Delivery Address
                          </div>
                          <p className="text-xs text-slate-700 font-semibold leading-snug line-clamp-2 mt-0.5">
                            {deliveryAddress}
                          </p>
                        </div>
                      </div>

                      {/* Payment Method Selector (Compact Expandable Row) */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPaymentMethodExpanded((prev) => !prev)}
                          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              paymentMethod === "UPI" ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60" : "bg-amber-50 text-amber-600 border border-amber-200/60"
                            }`}>
                              {paymentMethod === "UPI" ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Payment Method
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {paymentMethod === "UPI" ? "💳 UPI · Instant pay via QR/App" : "💵 Cash on Delivery · Pay at doorstep"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                            <span className="text-[11px] font-bold text-emerald-600">
                              {paymentMethodExpanded ? "Close" : "Change"}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${paymentMethodExpanded ? "rotate-180 text-slate-600" : ""}`} />
                          </div>
                        </button>

                        {paymentMethodExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentMethod("UPI")
                                  setPaymentMethodExpanded(false)
                                }}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  paymentMethod === "UPI"
                                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="font-extrabold text-xs text-slate-900">UPI</span>
                                  </div>
                                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                    paymentMethod === "UPI" ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                                  }`}>
                                    {paymentMethod === "UPI" && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">Instant pay via QR/App</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentMethod("COD")
                                  setPaymentMethodExpanded(false)
                                }}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  paymentMethod === "COD"
                                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Banknote className="w-3.5 h-3.5 text-amber-600" />
                                    <span className="font-extrabold text-xs text-slate-900">Cash on Delivery</span>
                                  </div>
                                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                    paymentMethod === "COD" ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                                  }`}>
                                    {paymentMethod === "COD" && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">Pay cash at doorstep</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bill Summary (Expandable Details) */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              To Pay
                            </div>
                            <div className="text-base font-black text-slate-900">
                              ₹{cart.subtotal}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBillDetailsExpanded((prev) => !prev)}
                            className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 py-1.5 px-3 rounded-xl hover:bg-emerald-50 border border-emerald-200/60 transition-colors cursor-pointer"
                          >
                            <span>{billDetailsExpanded ? "Hide bill details" : "View bill details"}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${billDetailsExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {billDetailsExpanded && (
                          <div className="pt-3 mt-2 border-t border-slate-100 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600 font-medium">
                              <span>Items Subtotal</span>
                              <span className="font-bold text-slate-900">₹{cart.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 font-medium">
                              <span>Delivery Fee</span>
                              <span className="font-bold text-emerald-600">
                                {cart?.delivery_count > 1 ? `FREE (${cart.delivery_count} shipments)` : "FREE"}
                              </span>
                            </div>
                            {totalSavings > 0 && (
                              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg text-xs">
                                <span>You saved on this order</span>
                                <span>₹{Math.round(totalSavings)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {checkoutError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{checkoutError}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Drawer Footer CTA */}
                {cart?.items?.length > 0 && (
                  <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-lg">
                    <button
                      type="button"
                      disabled={checkoutLoading || (availableSlots.length > 0 && !selectedSlot)}
                      onClick={handleProceedToCheckout}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {checkoutLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>{paymentMethod === "COD" ? `Place Order (Pay on Delivery) • ₹${cart.subtotal}` : `Place Order • ₹${cart.subtotal}`}</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    {availableSlots.length > 0 && !selectedSlot && (
                      <p className="text-center text-[11px] text-slate-400 font-medium mt-2">
                        Please select an available delivery slot to proceed
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* ── Mobile Slide-in Category Drawer Modal ── */}
      <AnimatePresence>
        {categoryDrawerOpen && (
          <div className="fixed inset-0 z-[10030] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCategoryDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute left-0 top-0 bottom-0 w-36 sm:w-44 bg-white shadow-2xl flex flex-col z-10 font-sans"
              role="dialog"
              aria-modal="true"
              aria-label="Categories menu"
            >
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <h3 className="font-extrabold text-slate-900 text-xs">Categories</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Close categories menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {/* All Products Tile */}
                <CategorySidebarTile
                  isAll={true}
                  isSelected={currentCategorySlug === "all"}
                  onSelect={handleSelectCategory}
                  totalCount={totalCatalogProductsCount}
                />

                {/* Categories */}
                <div className="space-y-1.5 pt-0.5">
                  {uniqueRootCategories.map((cat) => {
                    const catKey = cat.id || cat.slug
                    const isDirectSelected = currentCategorySlug === cat.slug || String(currentCategorySlug) === String(cat.id)
                    const isAncestorOfSelected = breadcrumbs.some((b) => b.slug === cat.slug || String(b.id) === String(cat.id))
                    const isSelected = isDirectSelected || isAncestorOfSelected
                    const isExpanded = expandedCategoryIds.has(cat.id) || expandedCategoryIds.has(cat.slug)

                    return (
                      <CategorySidebarTile
                        key={catKey}
                        cat={cat}
                        isSelected={isSelected}
                        selectedSlug={currentCategorySlug}
                        isExpanded={isExpanded}
                        toggleExpand={toggleCategoryExpand}
                        onSelect={handleSelectCategory}
                      />
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Order Confirmation & Live Tracking Modal ── */}
      <AnimatePresence>
        {trackingModalOpen && activeOrder && (
          <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 font-sans"
            >
              {/* Tracking Header */}
              <div className="p-6 bg-gradient-to-b from-emerald-50 to-white border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                      activeOrder.status === "CANCELLED"
                        ? "bg-rose-100 text-rose-800"
                        : activeOrder.cancellation_pending
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {activeOrder.status === "CANCELLED"
                        ? "Order Cancelled"
                        : activeOrder.cancellation_pending
                        ? "Cancellation Pending"
                        : activeOrder.status_label || "Order Placed"}
                    </span>
                    {activeOrder.payment_status && activeOrder.payment_status !== "PAID" && (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Payment: {activeOrder.payment_status}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setTrackingModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-3">
                  <h3 className="text-xl font-black text-slate-900">
                    Order #{activeOrder.order_number}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5">
                    <span>Seller: <strong>{activeOrder.seller_name || "Seller Hub Partner"}</strong></span>
                    {activeOrder.warehouse_name && (
                      <span>Warehouse: <strong>{activeOrder.warehouse_name}</strong></span>
                    )}
                    {activeOrder.delivery_slot && (
                      <span>Slot: <strong>{activeOrder.delivery_slot}</strong></span>
                    )}
                    {activeOrder.handover_ref && (
                      <span>Courier Ref: <strong>{activeOrder.handover_ref}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="p-6 space-y-6">
                {/* Consolidated Delivery Group Info */}
                {activeOrder.delivery_group && activeOrder.delivery_group.total_orders > 1 && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs font-black text-emerald-950">
                          Consolidated Hub Delivery ({activeOrder.delivery_group.total_orders} Sellers)
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold">
                        {activeOrder.delivery_group.warehouse_name || "Warehouse"}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Items from multiple sellers in this warehouse will be picked up together and delivered in one single trip.
                    </p>

                    {/* Sibling Orders List */}
                    <div className="space-y-1.5 pt-1">
                      {activeOrder.delivery_group.orders.map((sib) => (
                        <div
                          key={sib.order_number}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                            sib.order_number === activeOrder.order_number
                              ? "bg-white border-emerald-300 shadow-sm font-bold"
                              : "bg-white/70 border-emerald-100 text-slate-700"
                          }`}
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-slate-900 font-extrabold">{sib.seller_name}</span>
                            <span className="text-[11px] text-slate-400 font-mono ml-1.5">#{sib.order_number}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-slate-900">₹{sib.total_amount}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              sib.status === "DELIVERED"
                                ? "bg-emerald-100 text-emerald-800"
                                : sib.status === "CANCELLED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {sib.status_label || sib.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Cancellation Pending Banner */}
                {activeOrder.cancellation_pending && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span>Cancellation request sent. Awaiting vendor confirmation to release stock.</span>
                  </div>
                )}

                {/* Handover Cancellation Warning */}
                {activeOrder.status === "OUT_FOR_DELIVERY" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-medium">
                    Order is out for delivery. Handed over to rider.
                  </div>
                )}

                {/* Cancelled State Details */}
                {activeOrder.status === "CANCELLED" ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs space-y-1.5">
                    <div className="font-extrabold text-sm text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      {activeOrder.cancelled_by === "SELLER" ? "Cancelled by Seller" : "Cancelled"}
                    </div>
                    <p className="text-rose-700">
                      <strong>Reason:</strong> {activeOrder.cancellation_reason || "Order cancelled and stock reservation released."}
                    </p>
                    {activeOrder.needs_refund_review && (
                      <div className="pt-1 text-[11px] font-bold text-amber-800">
                        Refund review initiated for this seller cancellation.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { key: "CONFIRMED", label: "Confirmed", desc: "Order received by seller" },
                      { key: "PACKING", label: "Seller is packing", desc: "Items are being packaged" },
                      { key: "READY_FOR_PICKUP", label: "Ready for pickup", desc: "Waiting for courier dispatch" },
                      { key: "OUT_FOR_DELIVERY", label: "On the way", desc: "Out for delivery to your doorstep" },
                      { key: "DELIVERED", label: "Delivered", desc: "Successfully delivered" },
                    ].map((step, idx) => {
                      const statusOrder = ["CONFIRMED", "PACKING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"]
                      const currentIdx = statusOrder.indexOf(activeOrder.status)
                      const isPassed = currentIdx >= 0 && currentIdx >= idx
                      const isCurrent = activeOrder.status === step.key

                      return (
                        <div key={step.key} className="flex items-start gap-3.5 relative">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            isPassed
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div>
                            <div className={`text-xs font-black ${isCurrent ? "text-emerald-700" : isPassed ? "text-slate-900" : "text-slate-400"}`}>
                              {step.label}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Audit Event History Timeline */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="font-black text-slate-400 uppercase tracking-wider text-[10px]">
                    Activity Updates
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(activeOrder.events) && activeOrder.events.length > 0 ? (
                      activeOrder.events.map((evt) => (
                        <div key={evt.id || evt.event_id} className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800">
                              {evt.mapped_status || evt.vendor_status || "Update"}
                            </span>
                            {evt.cancellation_reason && (
                              <p className="text-[11px] text-slate-500 mt-0.5">Note: {evt.cancellation_reason}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {evt.occurred_at ? new Date(evt.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">Order Placed</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting seller confirmation</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {activeOrder.created_at ? new Date(activeOrder.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ordered Items Summary */}
                {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="font-black text-slate-400 uppercase tracking-wider text-[10px]">
                      Items in this order
                    </div>
                    {activeOrder.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>{it.product_title} × {it.quantity}</span>
                        <span className="font-bold">₹{it.line_amount}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between font-black text-slate-900 text-sm">
                        <span>{activeOrder.payment_method === "COD" ? "Amount to Pay on Delivery" : "Total Paid"}</span>
                        <span>₹{activeOrder.total_amount}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                        <span>Payment Method</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          activeOrder.payment_method === "COD"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}>
                          {activeOrder.payment_method === "COD" ? "Cash on Delivery (Pending)" : "Paid via UPI"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm">
                {activeOrder.status !== "CANCELLED" && activeOrder.status !== "DELIVERED" && (
                  <button
                    type="button"
                    disabled={cancelLoading || activeOrder.status === "OUT_FOR_DELIVERY" || activeOrder.cancellation_pending}
                    onClick={handleCancelOrder}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {cancelLoading ? "Cancelling..." : activeOrder.cancellation_pending ? "Cancellation Pending" : "Cancel Order"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTrackingModalOpen(false)}
                  className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Customer Entry / OTP Modal ── */}
      {showCustomerEntryModal && (
        <CustomerEntryFlowModal
          isOpen={showCustomerEntryModal}
          onClose={() => {
            setShowCustomerEntryModal(false)
            setPendingAddToCart(null)
          }}
          onComplete={async () => {
            setShowCustomerEntryModal(false)
            await refreshMe?.()
            await reloadCart()
            if (pendingAddToCart) {
              const { product, quantityDelta, basket, isBasket, customOptions } = pendingAddToCart
              setPendingAddToCart(null)
              setTimeout(() => {
                if (isBasket && basket) {
                  handleAddBasketToCart(basket, false, customOptions)
                } else if (product) {
                  handleAddToCart(product, quantityDelta)
                }
              }, 300)
            }
          }}
        />
      )}

      {/* ── Single-Seller Conflict Resolution Modal ── */}
      <AnimatePresence>
        {sellerConflict && (
          <div id="seller-conflict-modal-backdrop" className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
            <motion.div
              id="seller-conflict-modal"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200/60">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                Replace items in cart?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Your cart currently contains items from <strong className="text-slate-900 font-bold">{sellerConflict.current_seller_name}</strong>. Adding items from <strong className="text-emerald-700 font-bold">{sellerConflict.new_seller_name}</strong> will replace your existing cart items.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-keep-current-seller"
                  onClick={() => setSellerConflict(null)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  Keep Current Seller
                </button>
                <button
                  type="button"
                  id="btn-confirm-seller-switch"
                  onClick={handleConfirmSellerSwitch}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Clear &amp; Switch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AppBannerAndFooter />
    </div>
  )
}
export default MarketplacePage
