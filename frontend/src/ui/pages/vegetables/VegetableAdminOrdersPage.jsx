import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package, Search, RefreshCw, Clock, CheckCircle2,
  Truck, XCircle, AlertCircle, Eye, Phone, MapPin,
  Calendar, User, Layers, ArrowRight, ShieldAlert, Sparkles, Filter
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"

const STATUS_CONFIG = {
  PLACED: {
    label: "Placed",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dot: "bg-amber-500",
    next: [
      { status: "PACKED", label: "Mark Packed", color: "bg-blue-600 hover:bg-blue-500 text-white" },
      { status: "CANCELLED", label: "Cancel Order", color: "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200" },
    ]
  },
  PACKED: {
    label: "Packed",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    dot: "bg-blue-500",
    next: [
      { status: "OUT_FOR_DELIVERY", label: "Dispatch Delivery", color: "bg-purple-600 hover:bg-purple-500 text-white" },
      { status: "CANCELLED", label: "Cancel Order", color: "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200" },
    ]
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    dot: "bg-purple-500",
    next: [
      { status: "DELIVERED", label: "Mark Delivered", color: "bg-emerald-600 hover:bg-emerald-500 text-white" },
    ]
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dot: "bg-emerald-500",
    next: []
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    dot: "bg-rose-500",
    next: []
  },
}

export default function VegetableAdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [statusCounts, setStatusCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [transitionLoading, setTransitionLoading] = useState(false)
  const [transitionError, setTransitionError] = useState("")

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const queryParams = new URLSearchParams()
      if (statusFilter && statusFilter !== "ALL") queryParams.append("status", statusFilter)
      if (searchQuery.trim()) queryParams.append("search", searchQuery.trim())

      const res = await apiRequest(`/vegetable-orders/admin/?${queryParams.toString()}`)
      if (res?.data?.data) {
        setOrders(res.data.data)
        if (res.data.status_counts) setStatusCounts(res.data.status_counts)
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load orders."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchOrders()
  }

  const handleTransition = async (orderId, targetStatus) => {
    try {
      setTransitionLoading(true)
      setTransitionError("")
      const res = await apiRequest(`/vegetable-orders/admin/${orderId}/transition/`, {
        method: "POST",
        body: JSON.stringify({ target_status: targetStatus }),
        headers: { "Content-Type": "application/json" },
      })

      if (res?.data?.success) {
        const updated = res.data.data
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated)
        }
        // Refetch counts
        fetchOrders()
      }
    } catch (err) {
      const msg = extractApiErrorMessage(err, "Transition failed.")
      setTransitionError(msg)
    } finally {
      setTransitionLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vegetable Orders</h1>
              <p className="text-sm text-muted-foreground">
                Live customer orders, packing pipeline, dispatch management, and deliveries.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 hover:bg-muted/80 text-foreground text-sm font-medium shadow-sm transition-all self-start md:self-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Status Pipeline Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "All Orders", count: statusCounts.ALL || 0 },
          { key: "PLACED", label: "Placed", count: statusCounts.PLACED || 0, color: "text-amber-600" },
          { key: "PACKED", label: "Packed", count: statusCounts.PACKED || 0, color: "text-blue-600" },
          { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", count: statusCounts.OUT_FOR_DELIVERY || 0, color: "text-purple-600" },
          { key: "DELIVERED", label: "Delivered", count: statusCounts.DELIVERED || 0, color: "text-emerald-600" },
          { key: "CANCELLED", label: "Cancelled", count: statusCounts.CANCELLED || 0, color: "text-rose-600" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              statusFilter === tab.key
                ? "bg-card border-foreground/20 text-foreground shadow-sm font-bold"
                : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className={statusFilter === tab.key ? tab.color || "text-foreground" : ""}>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number (#VEG-...), customer name, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-sm transition-colors"
        >
          Search
        </button>
      </form>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchOrders} className="text-xs font-semibold hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 rounded-2xl bg-card border border-border/60 animate-pulse p-4" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-4">
          <div className="p-4 rounded-full bg-muted/60 w-16 h-16 mx-auto flex items-center justify-center text-muted-foreground">
            <Package size={32} />
          </div>
          <h3 className="text-lg font-semibold">No orders found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "No orders match the current filter and search criteria."
              : "No customer vegetable orders placed yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PLACED
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-card border border-border/80 hover:border-blue-500/30 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
              >
                {/* Left info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-base font-mono text-foreground">
                      #{order.order_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={13} />
                      {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <User size={13} className="text-blue-500" />
                      {order.customer?.name || "Customer"}
                    </span>
                    {order.customer?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} />
                        {order.customer.phone}
                      </span>
                    )}
                    {order.delivery_address && (
                      <span className="flex items-center gap-1 max-w-sm truncate" title={order.delivery_address}>
                        <MapPin size={13} />
                        {order.delivery_address}
                      </span>
                    )}
                  </div>

                  {/* Items Summary Pill */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-muted/60 text-[11px] font-medium text-foreground">
                        {item.name} ({item.quantity_display})
                      </span>
                    ))}
                    {(order.items?.length || 0) > 3 && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        +{order.items.length - 3} more items
                      </span>
                    )}
                  </div>
                </div>

                {/* Right totals & actions */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-foreground">
                      ₹{order.total_amount?.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {order.items_count || order.items?.length || 0} produce items
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedOrder(order); setTransitionError("") }}
                      className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>

                    {/* Next Pipeline Transitions */}
                    {cfg.next?.map((nxt) => (
                      <button
                        key={nxt.status}
                        onClick={() => handleTransition(order.id, nxt.status)}
                        disabled={transitionLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${nxt.color}`}
                      >
                        {nxt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Order Details Drawer / Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg font-mono">Order #{selectedOrder.order_number}</h3>
                    <div className="text-xs text-muted-foreground">
                      Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {transitionError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{transitionError}</span>
                  </div>
                )}

                {/* Status Bar */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Current Status</div>
                    <div className="font-bold text-base mt-0.5">{selectedOrder.status_label || selectedOrder.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(STATUS_CONFIG[selectedOrder.status]?.next || []).map((nxt) => (
                      <button
                        key={nxt.status}
                        onClick={() => handleTransition(selectedOrder.id, nxt.status)}
                        disabled={transitionLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${nxt.color}`}
                      >
                        {nxt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer & Delivery Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border/80 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer Details</div>
                    <div className="font-semibold text-sm">{selectedOrder.customer?.name || "Guest"}</div>
                    {selectedOrder.customer?.phone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone size={13} />
                        <span>{selectedOrder.customer.phone}</span>
                      </div>
                    )}
                    {selectedOrder.customer?.email && (
                      <div className="text-xs text-muted-foreground">{selectedOrder.customer.email}</div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/80 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Delivery Address</div>
                    <div className="text-xs text-foreground leading-relaxed flex items-start gap-1.5">
                      <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{selectedOrder.delivery_address || "No address provided"}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Line Items</div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border font-semibold text-muted-foreground">
                          <th className="p-3">Item</th>
                          <th className="p-3 text-center">Pack / Grams</th>
                          <th className="p-3 text-right">Price</th>
                          <th className="p-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {selectedOrder.items?.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover border border-border/80" />
                              )}
                              <span>{item.name}</span>
                            </td>
                            <td className="p-3 text-center text-muted-foreground font-mono">
                              {item.quantity_display || `${item.quantity_grams}g`}
                            </td>
                            <td className="p-3 text-right font-medium">₹{item.unit_price?.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold">₹{item.line_amount?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div className="font-semibold text-sm">Grand Total</div>
                  <div className="text-xl font-extrabold text-foreground">₹{selectedOrder.total_amount?.toFixed(2)}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-end bg-muted/20">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
