import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  Search, ShoppingCart, Store, ChevronRight, X, ArrowLeft,
  CheckCircle2, AlertTriangle, PackageCheck, Truck, Clock,
  ShieldCheck, Sparkles, Filter, Trash2, Plus, Minus,
  RefreshCw, ChevronDown, Check, Info, AlertCircle, ShoppingBag,
  Layers, FolderTree, Tag, SlidersHorizontal, ArrowUpRight,
  ListFilter, Grid, ChevronLeft
} from "lucide-react"
import { routes } from "../routes.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { apiRequest } from "../../api/client.js"
import { getCustomerSelectedAddress, getCustomerLocation } from "../../utils/customerLocationStorage.js"
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
  fetchMarketplaceOrderDetail,
  cancelMarketplaceOrder,
  fetchMyOrders,
} from "../../services/marketplaceApi.js"
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"

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

// Category Tree Node Component for Left Rail & Mobile Drawer
function CategoryTreeItem({ node, selectedSlug, expandedIds, toggleExpand, onSelect, level = 0 }) {
  const isSelected = selectedSlug === node.slug || String(selectedSlug) === String(node.id)
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  const productCount = node.total_product_count !== undefined ? node.total_product_count : (node.product_count || 0)

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
          isSelected
            ? "bg-emerald-600 text-white shadow-sm font-bold"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
        }`}
        style={{ paddingLeft: `${Math.max(12, level * 14 + 12)}px` }}
        onClick={() => onSelect(node)}
        role="button"
        tabIndex={0}
        aria-current={isSelected ? "page" : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect(node)
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className={`p-0.5 rounded hover:bg-black/10 transition-colors ${
                isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-600"
              }`}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : level > 0 ? (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-slate-300"}`} />
          ) : (
            <ShoppingBag className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {productCount > 0 && (
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
              isSelected
                ? "bg-emerald-700/90 text-white"
                : "bg-slate-200/80 text-slate-600 group-hover:bg-slate-300"
            }`}
          >
            {productCount}
          </span>
        )}
      </div>

      {/* Nested Children Accordion */}
      {hasChildren && isExpanded && (
        <div className="relative ml-2 pl-1 border-l border-slate-200 space-y-0.5 mt-0.5">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id || child.slug}
              node={child}
              selectedSlug={selectedSlug}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
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

  // Product Catalog & Category State
  const [products, setProducts] = useState([])
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

  // Checkout & Order Tracking State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
  const [activeOrder, setActiveOrder] = useState(null)
  const [trackingModalOpen, setTrackingModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

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
        })
        return next
      })
    }
  }, [breadcrumbs])

  const toggleCategoryExpand = (id) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  // Handle Add To Cart
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
          pendingQty: quantityDelta,
        })
      } else {
        showToast(err?.body?.message || "Failed to update cart.", "error")
      }
    } finally {
      setCartLoading(false)
    }
  }

  // Handle Confirm Seller Switch
  const handleConfirmSellerSwitch = async () => {
    if (!sellerConflict) return
    const { pendingProduct, pendingQty } = sellerConflict
    setCartLoading(true)
    try {
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
    } catch (err) {
      showToast(err?.body?.message || "Failed to switch seller.", "error")
    } finally {
      setCartLoading(false)
    }
  }

  // Handle Product Card Click (Open detail)
  const handleOpenDetail = async (prod) => {
    setDetailProduct(prod)
    setDetailLoading(true)
    try {
      const res = await fetchMarketplaceProductDetail(prod.id)
      if (res?.data) {
        setDetailProduct(res.data)
      }
    } catch (err) {
      console.error("Failed to fetch product details:", err)
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle Checkout Order
  const handleProceedToCheckout = async () => {
    if (cart.items.length === 0) return
    setCheckoutError("")
    setCheckoutLoading(true)
    try {
      const res = await checkoutMarketplaceOrder({
        delivery_address: deliveryAddress,
        customer_name: user?.name || "",
        customer_phone: user?.phone || "",
        customer_email: user?.email || "",
        payment_method: "UPI",
        fulfilment_type: "DELIVERY",
      })

      if (res?.success && res?.data) {
        setActiveOrder(res.data)
        setCartDrawerOpen(false)
        setTrackingModalOpen(true)
        reloadCart()
        showToast("Order placed successfully!", "success")
      } else {
        setCheckoutError(res?.message || "Order placement failed. Please verify item stock.")
      }
    } catch (err) {
      setCheckoutError(err?.body?.message || "Failed to place order. Please try again.")
    } finally {
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
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
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
                  <span className="text-xs text-slate-400 font-medium">Verified Stores</span>
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
                  className="w-full pl-10 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all"
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
                className="w-full pl-10 pr-4 py-2 bg-slate-100 text-sm rounded-xl border border-slate-200 focus:bg-white focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Top Categories Pill Bar + Mobile Drawer Trigger */}
          <div className="border-t border-slate-100 bg-slate-50/80 overflow-x-auto no-scrollbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2">
              {/* Mobile Category Drawer Button */}
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shrink-0 shadow-xs cursor-pointer hover:bg-emerald-700 transition-colors"
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
                className={`px-3.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  currentCategorySlug === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                All
              </button>

              {/* Root Categories Horizontal Pills */}
              {categoryTree.map((cat) => {
                const isSelected = currentCategorySlug === cat.slug || breadcrumbs.some((b) => b.slug === cat.slug)
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {(cat.total_product_count || cat.product_count) > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
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
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-hidden"
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

        {/* Hero Store Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
            style={{
              background: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)",
            }}
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Left Column */}
              <div className="max-w-2xl">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    color: "#34d399",
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Quality &amp; Freshness Guarantee
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                  Direct from Certified <span style={{ color: "#34d399" }}>Seller Hub</span> Partners
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed max-w-xl">
                  Shop authentic branded groceries, dairy, staples, and packaged goods dispatched directly from verified local suppliers.
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap items-center gap-2.5 mt-5">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-100"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    Express Delivery
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-100"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Sealed &amp; Tamper-Proof
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-100"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Best Price Assured
                  </div>
                </div>
              </div>

              {/* Right Side Stats Card */}
              <div
                className="hidden sm:flex flex-col justify-center rounded-2xl p-4 sm:p-5 w-full md:w-72 shrink-0 backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-300">Marketplace Hub</span>
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.25)",
                      color: "#34d399",
                    }}
                  >
                    Live Verified
                  </span>
                </div>

                <div className="flex items-center gap-2.5 my-1">
                  <Store className="w-6 h-6 text-emerald-400" />
                  <span className="text-lg font-black text-white">
                    {availableSellers.length > 0 ? `${availableSellers.length} Local Stores` : "9 Local Stores"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 mt-2 leading-normal">
                  Dispatched straight from local vendor warehouses for quick delivery and freshness.
                </p>
              </div>
            </div>

            {/* Ambient Background decoration */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.15), transparent 70%)",
              }}
            />
          </div>
        </section>

        {/* Products Grid Section with Left Category Rail */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          <div className="flex items-start gap-6 lg:gap-8">
            {/* Desktop Left Category Rail */}
            <aside className="w-64 lg:w-72 shrink-0 hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Categories
                    </span>
                  </div>
                  {currentCategorySlug !== "all" && (
                    <button
                      onClick={() => handleSelectCategory(null)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* All Products Rail Item */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer mb-1 ${
                    currentCategorySlug === "all"
                      ? "bg-emerald-600 text-white font-bold shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 font-medium"
                  }`}
                  onClick={() => handleSelectCategory(null)}
                  role="button"
                  tabIndex={0}
                  aria-current={currentCategorySlug === "all" ? "page" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <Grid className={`w-3.5 h-3.5 ${currentCategorySlug === "all" ? "text-white" : "text-slate-500"}`} />
                    <span>All Products</span>
                  </div>
                  {totalCatalogProductsCount > 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        currentCategorySlug === "all" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {totalCatalogProductsCount}
                    </span>
                  )}
                </div>

                {/* Category Tree Items */}
                {categoriesLoading ? (
                  <div className="space-y-2 py-2 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-8 bg-slate-100 rounded-xl" />
                    ))}
                  </div>
                ) : categoriesUnavailable ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <span>Categories temporarily unavailable</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {categoryTree.map((cat) => (
                      <CategoryTreeItem
                        key={cat.id || cat.slug}
                        node={cat}
                        selectedSlug={currentCategorySlug}
                        expandedIds={expandedCategoryIds}
                        toggleExpand={toggleCategoryExpand}
                        onSelect={handleSelectCategory}
                        level={0}
                      />
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Right Products Container */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 flex-wrap bg-white/70 border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-2xs">
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
                    {loading ? "Searching inventory..." : `${products.length} product(s) found`}
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
              {!loading && products.length === 0 && (
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
              {!loading && products.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => {
                const cartItem = cart.items?.find((i) => i.seller_product_id === product.id)
                const inCartQty = cartItem ? cartItem.quantity : 0
                const price = Number(product.selling_price || 0)
                const mrp = Number(product.mrp || 0)
                const hasDiscount = mrp > price
                const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Top Image & Badge */}
                    <div
                      className="relative p-4 bg-slate-50/50 cursor-pointer overflow-hidden flex items-center justify-center min-h-[160px]"
                      onClick={() => handleOpenDetail(product)}
                    >
                      {hasDiscount && (
                        <span className="absolute top-2.5 left-2.5 z-10 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                          {discountPct}% OFF
                        </span>
                      )}

                      <img
                        src={product.primary_image || "/mockups/vegetables_realistic.png"}
                        alt={product.title}
                        className="w-full h-32 object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = "/mockups/vegetables_realistic.png"
                        }}
                      />

                      {!product.in_stock && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-lg">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Meta */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {product.brand && (
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {product.brand}
                          </div>
                        )}
                        <h4
                          onClick={() => handleOpenDetail(product)}
                          className="text-sm font-extrabold text-slate-900 line-clamp-2 hover:text-emerald-700 cursor-pointer mt-0.5 leading-snug"
                        >
                          {product.title}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 font-medium">
                          {product.pack_size || product.unit || "1 unit"}
                        </div>
                      </div>

                      {/* Store Tag */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-400 font-semibold truncate">
                        <Store className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{product.seller_name || "Seller Store"}</span>
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
                        {product.in_stock ? (
                          inCartQty === 0 ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product, 1)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 hover:border-emerald-600 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              ADD
                            </button>
                          ) : (
                            <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-xs overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleAddToCart(product, -1)}
                                className="px-2 py-1.5 hover:bg-emerald-700 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-black">{inCartQty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(product, 1)}
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

      {/* ── Single-Seller Conflict Modal ── */}
      <AnimatePresence>
        {sellerConflict && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 font-sans"
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Replace items in cart?
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Your cart currently contains items from <strong>"{sellerConflict.current_seller_name}"</strong>.
                Each order can only be placed with one seller at a time.
              </p>
              <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Adding items from <strong>"{sellerConflict.new_seller_name}"</strong> will discard your existing cart items.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSellerConflict(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Keep Current Seller
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSellerSwitch}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Clear & Switch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Product Detail Modal ── */}
      <AnimatePresence>
        {detailProduct && (
          <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col font-sans"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                  {detailProduct.brand || "Seller Hub Product"}
                </span>
                <button
                  onClick={() => setDetailProduct(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Image Gallery */}
                <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center min-h-[220px]">
                  <img
                    src={detailProduct.primary_image || (detailProduct.images && detailProduct.images[0]) || "/mockups/vegetables_realistic.png"}
                    alt={detailProduct.title}
                    className="max-h-56 object-contain"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {detailProduct.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span>Pack: <strong>{detailProduct.pack_size || detailProduct.unit}</strong></span>
                    <span>SKU: <strong className="font-mono text-xs">{detailProduct.sku}</strong></span>
                    <span>Store: <strong>{detailProduct.seller_name}</strong></span>
                  </div>
                </div>

                {/* Price & Stock */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selling Price</div>
                    <div className="text-2xl font-black text-slate-900">
                      ₹{detailProduct.selling_price}
                      {detailProduct.mrp && Number(detailProduct.mrp) > Number(detailProduct.selling_price) && (
                        <span className="text-sm font-bold text-slate-400 line-through ml-2">
                          ₹{detailProduct.mrp}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      detailProduct.in_stock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {detailProduct.in_stock ? "In Stock & Verified" : "Out of Stock"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {detailProduct.description && (
                  <div>
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Description</h5>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {detailProduct.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom CTA */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailProduct(null)}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Close
                </button>
                {detailProduct.in_stock && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(detailProduct, 1)
                      setDetailProduct(null)
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Add to Cart • ₹{detailProduct.selling_price}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {cartDrawerOpen && (
          <div className="fixed inset-0 z-[10000] overflow-hidden" onClick={() => setCartDrawerOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#F8FAFC] h-full flex flex-col shadow-2xl overflow-hidden font-sans z-10"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Marketplace Cart</h3>
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

              {/* Drawer Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {(!cart?.items || cart.items.length === 0) ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="w-7 h-7" />
                    </div>
                    <h4 className="font-black text-slate-800 text-sm">Your cart is empty</h4>
                    <p className="text-xs text-slate-500 mt-1">Add items from the store to check out</p>
                  </div>
                ) : (
                  <>
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center gap-3.5"
                      >
                        <img
                          src={item.product_image || "/mockups/vegetables_realistic.png"}
                          alt={item.product_title}
                          className="w-14 h-14 object-contain bg-slate-50 rounded-xl p-1 shrink-0"
                          onError={(e) => { e.target.src = "/mockups/vegetables_realistic.png" }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">
                            {item.product_title}
                          </h4>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {item.pack_size || item.unit} • ₹{item.unit_price_snapshot}
                          </div>
                          <div className="text-xs font-black text-slate-900 mt-1">
                            ₹{item.line_amount}
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity === 1) {
                                removeMarketplaceCartItem(item.id).then(reloadCart)
                              } else {
                                updateMarketplaceCartItem(item.id, { quantity: item.quantity - 1 }).then(reloadCart)
                              }
                            }}
                            className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-black text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateMarketplaceCartItem(item.id, { quantity: item.quantity + 1 }).then(reloadCart)
                            }}
                            className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Delivery Address Section */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Delivery Address
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-snug">
                        {deliveryAddress}
                      </p>
                    </div>

                    {/* Bill Summary */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5 text-xs">
                      <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                        Bill Summary
                      </div>
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Items Subtotal</span>
                        <span className="font-bold text-slate-900">₹{cart.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Delivery Fee</span>
                        <span className="font-bold text-emerald-600">FREE</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900">
                        <span>To Pay</span>
                        <span>₹{cart.subtotal}</span>
                      </div>
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
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {checkoutLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Place Order • ₹{cart.subtotal}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-2xl flex flex-col z-10 font-sans"
              role="dialog"
              aria-modal="true"
              aria-label="Categories menu"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Browse Categories</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Close categories menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {/* All Products Item */}
                <div
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer mb-2 ${
                    currentCategorySlug === "all"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-slate-700 hover:bg-slate-100 font-medium"
                  }`}
                  onClick={() => handleSelectCategory(null)}
                  role="button"
                  tabIndex={0}
                  aria-current={currentCategorySlug === "all" ? "page" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4" />
                    <span>All Products</span>
                  </div>
                  {totalCatalogProductsCount > 0 && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      currentCategorySlug === "all" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {totalCatalogProductsCount}
                    </span>
                  )}
                </div>

                {/* Categories */}
                {categoryTree.map((cat) => (
                  <CategoryTreeItem
                    key={cat.id || cat.slug}
                    node={cat}
                    selectedSlug={currentCategorySlug}
                    expandedIds={expandedCategoryIds}
                    toggleExpand={toggleCategoryExpand}
                    onSelect={handleSelectCategory}
                    level={0}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Order Confirmation & Live Tracking Modal ── */}
      {/* ── Order Confirmation & Live Tracking Modal ── */}
      <AnimatePresence>
        {trackingModalOpen && activeOrder && (
          <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 font-sans"
            >
              {/* Tracking Header */}
              <div className="p-6 bg-gradient-to-b from-emerald-50 to-white border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
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
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
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
                              ? "bg-emerald-600 text-white shadow-xs"
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
                    <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-slate-900 text-sm">
                      <span>Total Paid</span>
                      <span>₹{activeOrder.total_amount}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 bg-slate-50/95 backdrop-blur-xs">
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

      {/* ── Persistent Active Order Floating Tracker Pill ── */}
      <AnimatePresence>
        {!trackingModalOpen && activeOrder && !["DELIVERED", "CANCELLED"].includes(activeOrder.status) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)]"
          >
            <button
              type="button"
              onClick={() => setTrackingModalOpen(true)}
              className="w-full bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-slate-700/60 flex items-center justify-between gap-3 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="text-left truncate">
                  <div className="text-xs font-black truncate">
                    Order #{activeOrder.order_number} • <span className="text-emerald-400">{activeOrder.status_label || "Active"}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {activeOrder.seller_name || "Marketplace"} • Tap to view live tracking
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-600 group-hover:bg-emerald-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shrink-0 transition-colors shadow-sm">
                <span>Track</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </motion.div>
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
              const { product, quantityDelta } = pendingAddToCart
              setPendingAddToCart(null)
              setTimeout(() => {
                handleAddToCart(product, quantityDelta)
              }, 300)
            }
          }}
        />
      )}

      {/* ── Single-Seller Conflict Resolution Modal ── */}
      <AnimatePresence>
        {sellerConflict && (
          <div id="seller-conflict-modal-backdrop" className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
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
