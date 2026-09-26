import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  RotateCcw, Search, Filter, RefreshCw, AlertCircle, CheckCircle2,
  Clock, X, Check, Eye, DollarSign, Package, User, Phone,
  ChevronRight, Calendar, AlertTriangle, ArrowRight, ShieldCheck, FileText, CornerDownRight
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"

const REASON_MAP = {
  DAMAGED_OR_SPOILED: { label: "Damaged / Spoiled", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  WRONG_ITEM: { label: "Wrong Item Received", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  SHORT_QUANTITY: { label: "Short Weight / Missing", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  POOR_QUALITY: { label: "Poor Quality / Stale", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  OTHER: { label: "Other", color: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
}

const STATUS_BADGES = {
  REQUESTED: { label: "Requested", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  APPROVED: { label: "Approved", bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: ShieldCheck },
  RESOLVED: { label: "Resolved", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", bg: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: X },
}

export default function VegetableAdminReturnsPage() {
  const [returns, setReturns] = useState([])
  const [statusCounts, setStatusCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  // Filters
  const [activeTab, setActiveTab] = useState("ALL")
  const [search, setSearch] = useState("")
  const [reasonFilter, setReasonFilter] = useState("ALL")

  // Selected Return for Detail / Action Drawer
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [actionStatus, setActionStatus] = useState("APPROVED")
  const [actionResolution, setActionResolution] = useState("REFUND")
  const [actionRefundAmount, setActionRefundAmount] = useState("")
  const [actionAdminNotes, setActionAdminNotes] = useState("")
  const [submittingAction, setSubmittingAction] = useState(false)

  const showToast = (msg, type = "success") => {
    setToast({ msg, type, id: Date.now() })
  }

  const loadReturns = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeTab !== "ALL") params.append("status", activeTab)
      if (reasonFilter !== "ALL") params.append("reason", reasonFilter)
      if (search.trim()) params.append("search", search.trim())

      const res = await apiRequest(`/vegetable-orders/admin/returns/?${params.toString()}`)
      if (res?.success) {
        setReturns(res.data || [])
        setStatusCounts(res.status_counts || {})
      } else {
        setError(res?.message || "Failed to load vegetable returns.")
      }
    } catch (err) {
      setError("Network or server error while loading returns.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReturns()
  }, [activeTab, reasonFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadReturns()
  }

  const openReturnDetail = async (ret) => {
    setDrawerLoading(true)
    setSelectedReturn(ret)
    setActionStatus(ret.status === "REQUESTED" ? "APPROVED" : ret.status)
    setActionResolution(ret.resolution_action && ret.resolution_action !== "NONE" ? ret.resolution_action : "REFUND")
    setActionRefundAmount(ret.refund_amount > 0 ? String(ret.refund_amount) : "")
    setActionAdminNotes("")

    try {
      const res = await apiRequest(`/vegetable-orders/admin/returns/${ret.id}/`)
      if (res?.success && res.data) {
        setSelectedReturn(res.data)
        if (res.data.refund_amount > 0) {
          setActionRefundAmount(String(res.data.refund_amount))
        } else if (res.data.item_amount) {
          setActionRefundAmount(String(res.data.item_amount))
        } else if (res.data.order_total) {
          setActionRefundAmount(String(res.data.order_total))
        }
      }
    } catch (err) {
      // Keep basic info
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault()
    if (!selectedReturn) return
    setSubmittingAction(true)

    try {
      const payload = {
        status: actionStatus,
        resolution_action: actionStatus === "REJECTED" ? "REJECTED" : actionResolution,
        refund_amount: actionResolution === "REFUND" ? (parseFloat(actionRefundAmount) || 0) : 0,
        admin_notes: actionAdminNotes.trim(),
      }

      const res = await apiRequest(`/vegetable-orders/admin/returns/${selectedReturn.id}/action/`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (res?.success) {
        showToast(res.message || "Return updated successfully.")
        setSelectedReturn(null)
        loadReturns()
      } else {
        showToast(res?.message || "Failed to update return.", "error")
      }
    } catch (err) {
      showToast("Error updating return action.", "error")
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-xs font-semibold ${
              toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="text-emerald-500" size={26} />
            Vegetable Returns & Exchanges
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review post-delivery customer dispute requests, record refund settlements, and process item replacements.
          </p>
        </div>
        <button
          onClick={loadReturns}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-500" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Returns</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{statusCounts.ALL || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Needs Review</span>
          <p className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-1">{statusCounts.REQUESTED || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Approved</span>
          <p className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-1">{statusCounts.APPROVED || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Resolved</span>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">{statusCounts.RESOLVED || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 shadow-sm">
          <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Rejected</span>
          <p className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-1">{statusCounts.REJECTED || 0}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Status Pipeline Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          {[
            { id: "ALL", label: "All Returns", count: statusCounts.ALL },
            { id: "REQUESTED", label: "Requested", count: statusCounts.REQUESTED },
            { id: "APPROVED", label: "Approved", count: statusCounts.APPROVED },
            { id: "RESOLVED", label: "Resolved", count: statusCounts.RESOLVED },
            { id: "REJECTED", label: "Rejected", count: statusCounts.REJECTED },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === tab.id ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Reason Filter */}
        <div className="flex items-center gap-2">
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Reasons</option>
            <option value="DAMAGED_OR_SPOILED">Damaged / Spoiled</option>
            <option value="WRONG_ITEM">Wrong Item</option>
            <option value="SHORT_QUANTITY">Short Weight</option>
            <option value="POOR_QUALITY">Poor Quality</option>
            <option value="OTHER">Other</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search return #, order #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </form>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="animate-spin text-emerald-500" size={28} />
            <span className="text-xs font-medium">Loading return records...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 text-xs font-medium space-y-2">
            <AlertCircle size={30} className="mx-auto" />
            <p>{error}</p>
            <button onClick={loadReturns} className="text-emerald-500 underline font-semibold mt-2">Try Again</button>
          </div>
        ) : returns.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-medium space-y-2">
            <RotateCcw size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No return requests found</p>
            <p className="text-slate-400">There are no vegetable returns matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Return ID</th>
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Item / Scope</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Resolution</th>
                  <th className="py-3.5 px-4">Requested</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {returns.map((ret) => {
                  const reasonCfg = REASON_MAP[ret.reason] || REASON_MAP.OTHER
                  const statusCfg = STATUS_BADGES[ret.status] || STATUS_BADGES.REQUESTED
                  const StatusIcon = statusCfg.icon

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {ret.return_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {ret.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{ret.customer_name || "Guest"}</div>
                        {ret.customer_phone && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {ret.customer_phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {ret.item_name || "Entire Order"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${reasonCfg.color}`}>
                          {ret.reason_label || reasonCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bg}`}>
                          <StatusIcon size={12} />
                          {ret.status_label || statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {ret.resolution_action && ret.resolution_action !== "NONE" ? (
                          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            {ret.resolution_action_label || ret.resolution_action}
                            {ret.resolution_action === "REFUND" && parseFloat(ret.refund_amount) > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                                (₹{parseFloat(ret.refund_amount).toFixed(2)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {ret.created_at ? new Date(ret.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openReturnDetail(ret)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Detail & Action Slide-Over Modal */}
      <AnimatePresence>
        {selectedReturn && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      Return #{selectedReturn.return_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(STATUS_BADGES[selectedReturn.status] || STATUS_BADGES.REQUESTED).bg}`}>
                      {selectedReturn.status_label || selectedReturn.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Order #{selectedReturn.order_number}</p>
                </div>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
                {drawerLoading ? (
                  <div className="py-12 flex justify-center text-slate-400">
                    <RefreshCw className="animate-spin text-emerald-500" size={24} />
                  </div>
                ) : (
                  <>
                    {/* Return Overview Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{selectedReturn.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Contact:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{selectedReturn.customer_phone || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Item Returned:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedReturn.item_name || "Entire Order"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dispute Reason:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedReturn.reason_label}</span>
                      </div>
                      {selectedReturn.customer_notes && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 font-medium block mb-1">Customer Explanation:</span>
                          <p className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 italic text-slate-700 dark:text-slate-300">
                            "{selectedReturn.customer_notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Order Line Items */}
                    {selectedReturn.order_items && selectedReturn.order_items.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Order Items Breakdown (Total ₹{selectedReturn.order_total || 0})
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedReturn.order_items.map((it) => (
                            <div key={it.id} className="p-2.5 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{it.package_name}</span>
                                <span className="text-slate-400 ml-2">({it.quantity_grams}g)</span>
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">₹{parseFloat(it.line_amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Action Form */}
                    <form onSubmit={handleActionSubmit} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        Admin Decision & Settlement
                      </h4>

                      {/* Status Selector */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Update Status</label>
                        <select
                          value={actionStatus}
                          onChange={(e) => setActionStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="APPROVED">Approve Return (Accept Claim)</option>
                          <option value="RESOLVED">Mark as Resolved</option>
                          <option value="REJECTED">Reject Return</option>
                        </select>
                      </div>

                      {/* Resolution Action if Approved/Resolved */}
                      {actionStatus !== "REJECTED" && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Resolution Settlement</label>
                            <select
                              value={actionResolution}
                              onChange={(e) => setActionResolution(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="REFUND">Refund Marked (Record-keeping)</option>
                              <option value="REPLACEMENT">Replacement Item Dispatched</option>
                              <option value="NONE">No Action Required</option>
                            </select>
                          </div>

                          {actionResolution === "REFUND" && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Refund Amount (₹)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={actionRefundAmount}
                                  onChange={(e) => setActionRefundAmount(e.target.value)}
                                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                * Record-keeping flag only. Mark refund issued via manual provider/cash.
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Admin Notes */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Internal Admin Notes</label>
                        <textarea
                          rows={2}
                          placeholder="Optional notes regarding resolution..."
                          value={actionAdminNotes}
                          onChange={(e) => setActionAdminNotes(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={submittingAction}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                      >
                        {submittingAction && <RefreshCw size={14} className="animate-spin" />}
                        Apply Return Decision
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
