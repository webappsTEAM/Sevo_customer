import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Sprout, Package, FolderOpen, UploadCloud, Ticket,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Truck,
  ArrowRight, RefreshCw, AlertCircle, Layers, ShoppingBag,
  ExternalLink, ChevronRight
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"
import { routes } from "../../routes.js"

export default function VegetableAdminHomePage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiRequest("/vegetable-orders/admin/dashboard/")
      if (res?.data) {
        setDashboardData(res.data)
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load dashboard metrics."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const todayStats = dashboardData?.today_stats || {}
  const lowStockAlerts = dashboardData?.low_stock_alerts || []
  const recentOrders = dashboardData?.recent_orders || []
  const categoriesSummary = dashboardData?.categories_summary || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sprout size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vegetable Admin Home</h1>
              <p className="text-sm text-muted-foreground">
                Overview of daily vegetable produce operations, order pipeline, revenue, and stock alerts.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchDashboardStats}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 hover:bg-muted/80 text-foreground text-sm font-medium shadow-sm transition-all self-start md:self-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"} />
          <span>Refresh Dashboard</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchDashboardStats} className="text-xs font-semibold hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Orders */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Today's Orders</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">{todayStats.today_orders_count || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Fresh produce orders placed today</div>
          </div>
        </div>

        {/* Today Revenue */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{(todayStats.today_revenue || 0).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Non-cancelled order gross value</div>
          </div>
        </div>

        {/* Packing & Dispatch */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Pipeline</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Truck size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-amber-600">
              {todayStats.pending_packing || 0}
            </div>
            <span className="text-xs text-muted-foreground font-medium">Pending Packing</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {todayStats.out_for_delivery || 0} out for delivery right now
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Low Stock Alerts</span>
            <div className={`p-2 rounded-xl ${lowStockAlerts.length > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div>
            <div className={`text-3xl font-extrabold ${lowStockAlerts.length > 0 ? "text-rose-600" : "text-foreground"}`}>
              {lowStockAlerts.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Items below 25% of daily quota
            </div>
          </div>
        </div>
      </div>

      {/* Module Shortcuts Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vegetable Modules Suite</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Link
            to={routes.vegetable_admin_orders}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-blue-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 w-fit mb-3 group-hover:scale-110 transition-transform">
              <Package size={20} />
            </div>
            <div>
              <div className="font-bold text-sm group-hover:text-blue-600 transition-colors">Orders</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Packing & delivery pipeline</div>
            </div>
          </Link>

          <Link
            to={routes.inventory_vegetables}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-emerald-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 w-fit mb-3 group-hover:scale-110 transition-transform">
              <Layers size={20} />
            </div>
            <div>
              <div className="font-bold text-sm group-hover:text-emerald-600 transition-colors">Inventory</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Live stock & 4 AM resets</div>
            </div>
          </Link>

          <Link
            to={routes.vegetable_admin_categories}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-purple-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 w-fit mb-3 group-hover:scale-110 transition-transform">
              <FolderOpen size={20} />
            </div>
            <div>
              <div className="font-bold text-sm group-hover:text-purple-600 transition-colors">Categories</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Produce taxonomy & order</div>
            </div>
          </Link>

          <Link
            to={routes.vegetable_admin_catalog_uploads}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-amber-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 w-fit mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud size={20} />
            </div>
            <div>
              <div className="font-bold text-sm group-hover:text-amber-600 transition-colors">Catalog Uploads</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Bulk CSV/Excel updates</div>
            </div>
          </Link>

          <Link
            to={routes.marketing_coupons}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-pink-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-600 w-fit mb-3 group-hover:scale-110 transition-transform">
              <Ticket size={20} />
            </div>
            <div>
              <div className="font-bold text-sm group-hover:text-pink-600 transition-colors">Coupons</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Discounts & promotions</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Low Stock Alerts + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl bg-card border border-border/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Low Stock Alerts</h3>
                  <div className="text-xs text-muted-foreground">Evaluated dynamically against each vegetable's daily baseline</div>
                </div>
              </div>
              <Link
                to={routes.inventory_vegetables}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1"
              >
                <span>Stock View</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {lowStockAlerts.length === 0 ? (
              <div className="p-8 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                <div className="font-semibold text-sm text-emerald-950 dark:text-emerald-200">Stock Levels Healthy</div>
                <p className="text-xs text-muted-foreground">All produce items have adequate daily stock buffer.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {lowStockAlerts.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-600">
                            <Sprout size={18} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.is_out_of_stock && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold">
                              OUT OF STOCK
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {item.current_stock_display} / {item.default_daily_display} daily ({item.percentage_left}%)
                        </div>
                      </div>
                    </div>

                    <Link
                      to={routes.inventory_vegetables}
                      className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-card text-xs font-semibold text-foreground shrink-0 shadow-sm"
                    >
                      Adjust
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Feed */}
        <div className="rounded-2xl bg-card border border-border/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Recent Orders</h3>
                  <div className="text-xs text-muted-foreground">Latest customer orders for fresh produce</div>
                </div>
              </div>
              <Link
                to={routes.vegetable_admin_orders}
                className="text-xs font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
              >
                <span>All Orders</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-8 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                <Package size={28} className="mx-auto text-muted-foreground" />
                <div className="font-semibold text-sm">No Orders Placed Yet</div>
                <p className="text-xs text-muted-foreground">Vegetable orders will show live here as customers place them.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 hover:bg-muted/70 transition-colors"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs">#{order.order_number}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {order.customer?.name || "Customer"} • {order.items_count || order.items?.length || 0} items
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-extrabold text-xs">₹{order.total_amount?.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">{order.status_label || order.status}</div>
                      </div>
                      <Link
                        to={routes.vegetable_admin_orders}
                        className="p-1.5 rounded-lg border border-border hover:bg-card text-muted-foreground"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
