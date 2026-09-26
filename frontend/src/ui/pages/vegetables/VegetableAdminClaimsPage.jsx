import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText, Plus, Search, Filter, RefreshCw, AlertCircle, CheckCircle2,
  Clock, X, Check, Eye, DollarSign, Package, AlertTriangle, ArrowRight,
  ShieldAlert, ShieldCheck, Scale, History, User, Sparkles, Sprout
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"

const REASON_MAP = {
  WAREHOUSE_SPOILAGE: { label: "Warehouse Spoilage / Rot", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  TRANSIT_DAMAGE: { label: "Transit / Delivery Damage", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  QC_FAILURE: { label: "QC Inspection Failure", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  EXPIRED: { label: "Shelf Life Expired", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  INVENTORY_DISCREPANCY: { label: "Stock Discrepancy", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  OTHER: { label: "Other", color: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
}

const STATUS_BADGES = {
  OPEN: { label: "Open", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  APPROVED: { label: "Approved / Written Off", bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: ShieldCheck },
  RESOLVED: { label: "Resolved", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", bg: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: X },
}

export default function VegetableAdminClaimsPage() {
  const [claims, setClaims] = useState([])
  const [vegetables, setVegetables] = useState([])
  const [statusCounts, setStatusCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  // Filters
  const [activeTab, setActiveTab] = useState("ALL")
  const [search, setSearch] = useState("")
  const [reasonFilter, setReasonFilter] = useState("ALL")

  // Modals / Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Create Form State
  const [createForm, setCreateForm] = useState({
    vegetable_id: "",
    reason: "WAREHOUSE_SPOILAGE",
    quantity: "",
    unit: "kg",
    estimated_loss_amount: "",
    notes: "",
  })
  const [submittingCreate, setSubmittingCreate] = useState(false)

  const showToast = (msg, type = "success") => {
    setToast({ msg, type, id: Date.now() })
  }

  const loadClaims = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeTab !== "ALL") params.append("status", activeTab)
      if (reasonFilter !== "ALL") params.append("reason", reasonFilter)
      if (search.trim()) params.append("search", search.trim())

      const res = await apiRequest(`/inventory/vegetables/claims/?${params.toString()}`)
      if (res?.success) {
        setClaims(res.data || [])
        setStatusCounts(res.status_counts || {})
      } else {
        setError(res?.message || "Failed to load claims.")
      }
    } catch (err) {
      setError("Network or server error while loading claims.")
    } finally {
      setLoading(false)
    }
  }

  const loadVegetables = async () => {
    try {
      const res = await apiRequest("/inventory/vegetable-stock/")
      if (res?.success && Array.isArray(res.data)) {
        setVegetables(res.data)
      }
    } catch (err) {}
  }

  useEffect(() => {
    loadClaims()
  }, [activeTab, reasonFilter])

  useEffect(() => {
    loadVegetables()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadClaims()
  }

  const openClaimDetail = async (claim) => {
    setDrawerLoading(true)
    setSelectedClaim(claim)
    try {
      const res = await apiRequest(`/inventory/vegetables/claims/${claim.id}/`)
      if (res?.success && res.data) {
        setSelectedClaim(res.data)
      }
    } catch (err) {}
    finally {
      setDrawerLoading(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.vegetable_id || !createForm.quantity) {
      showToast("Please select a vegetable and specify quantity.", "error")
      return
    }

    setSubmittingCreate(true)
    try {
      const payload = {
        vegetable_id: parseInt(createForm.vegetable_id, 10),
        reason: createForm.reason,
        quantity: parseFloat(createForm.quantity),
        unit: createForm.unit,
        estimated_loss_amount: parseFloat(createForm.estimated_loss_amount) || 0,
        notes: createForm.notes.trim(),
      }

      const res = await apiRequest("/inventory/vegetables/claims/", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (res?.success) {
        showToast(res.message || "Claim created successfully.")
        setIsCreateModalOpen(false)
        setCreateForm({
          vegetable_id: "",
          reason: "WAREHOUSE_SPOILAGE",
          quantity: "",
          unit: "kg",
          estimated_loss_amount: "",
          notes: "",
        })
        loadClaims()
      } else {
        showToast(res?.message || "Failed to create claim.", "error")
      }
    } catch (err) {
      showToast("Error creating claim.", "error")
    } finally {
      setSubmittingCreate(false)
    }
  }

  const handleAction = async (actionType, notes = "") => {
    if (!selectedClaim) return
    setActionLoading(true)
    try {
      const res = await apiRequest(`/inventory/vegetables/claims/${selectedClaim.id}/action/`, {
        method: "POST",
        body: JSON.stringify({ action: actionType, notes }),
      })

      if (res?.success) {
        showToast(res.message || `Claim ${actionType.toLowerCase()}d successfully.`)
        setSelectedClaim(null)
        loadClaims()
      } else {
        showToast(res?.message || "Action failed.", "error")
      }
    } catch (err) {
      showToast("Error processing action.", "error")
    } finally {
      setActionLoading(false)
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
            <ShieldAlert className="text-emerald-500" size={26} />
            Vegetable Claims & Write-offs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Log internal stock losses from spoilage, QC rejections, and transit damage with automatic stock movement ledger write-offs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadClaims}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-500" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20"
          >
            <Plus size={15} />
            New Inventory Claim
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Claims</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{statusCounts.ALL || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Open / Pending</span>
          <p className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-1">{statusCounts.OPEN || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Approved & Deducted</span>
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
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          {[
            { id: "ALL", label: "All Claims", count: statusCounts.ALL },
            { id: "OPEN", label: "Open", count: statusCounts.OPEN },
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

        <div className="flex items-center gap-2">
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Loss Reasons</option>
            <option value="WAREHOUSE_SPOILAGE">Warehouse Spoilage</option>
            <option value="TRANSIT_DAMAGE">Transit Damage</option>
            <option value="QC_FAILURE">QC Failure</option>
            <option value="EXPIRED">Shelf Life Expired</option>
            <option value="INVENTORY_DISCREPANCY">Discrepancy</option>
            <option value="OTHER">Other</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search claim #, vegetable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </form>
        </div>
      </div>

      {/* Main Claims Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="animate-spin text-emerald-500" size={28} />
            <span className="text-xs font-medium">Loading claims records...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 text-xs font-medium space-y-2">
            <AlertCircle size={30} className="mx-auto" />
            <p>{error}</p>
            <button onClick={loadClaims} className="text-emerald-500 underline font-semibold mt-2">Try Again</button>
          </div>
        ) : claims.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-medium space-y-2">
            <ShieldAlert size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No claims found</p>
            <p className="text-slate-400">There are no inventory claims matching your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Claim ID</th>
                  <th className="py-3.5 px-4">Vegetable Product</th>
                  <th className="py-3.5 px-4">Quantity Loss</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Loss Value</th>
                  <th className="py-3.5 px-4">Stock Ledger</th>
                  <th className="py-3.5 px-4">Logged By</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claims.map((claim) => {
                  const reasonCfg = REASON_MAP[claim.reason] || REASON_MAP.OTHER
                  const statusCfg = STATUS_BADGES[claim.status] || STATUS_BADGES.OPEN
                  const StatusIcon = statusCfg.icon

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {claim.claim_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {claim.vegetable_image ? (
                            <img
                              src={claim.vegetable_image}
                              alt={claim.vegetable_name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0">
                              <Sprout size={14} />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{claim.vegetable_name}</div>
                            {claim.vegetable_sku && <div className="text-[10px] font-mono text-slate-400">{claim.vegetable_sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">
                        -{claim.quantity_display}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${reasonCfg.color}`}>
                          {claim.reason_label || reasonCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bg}`}>
                          <StatusIcon size={12} />
                          {claim.status_label || statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {parseFloat(claim.estimated_loss_amount) > 0 ? `₹${parseFloat(claim.estimated_loss_amount).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {claim.stock_movement ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <History size={11} /> Movement #{claim.stock_movement}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending Write-off</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        <div>{claim.created_by_name || "Admin"}</div>
                        <div className="text-[10px] text-slate-400">
                          {claim.created_at ? new Date(claim.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openClaimDetail(claim)}
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

      {/* New Claim Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="text-emerald-500" size={18} />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">New Inventory Loss Claim</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Vegetable Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Select Vegetable Product *</label>
                  <select
                    value={createForm.vegetable_id}
                    onChange={(e) => setCreateForm({ ...createForm, vegetable_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Vegetable --</option>
                    {vegetables.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.sku || "No SKU"}) - Current: {v.today_available_display || "0g"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Loss Reason *</label>
                  <select
                    value={createForm.reason}
                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="WAREHOUSE_SPOILAGE">Warehouse Spoilage / Rot</option>
                    <option value="TRANSIT_DAMAGE">Transit / Delivery Damage</option>
                    <option value="QC_FAILURE">QC Inspection Failure</option>
                    <option value="EXPIRED">Shelf Life Expired</option>
                    <option value="INVENTORY_DISCREPANCY">Stock Discrepancy / Missing</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Quantity & Unit */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Loss Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2.5"
                      value={createForm.quantity}
                      onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Unit</label>
                    <select
                      value={createForm.unit}
                      onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                    </select>
                  </div>
                </div>

                {/* Est Loss Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Estimated Financial Loss (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={createForm.estimated_loss_amount}
                      onChange={(e) => setCreateForm({ ...createForm, estimated_loss_amount: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Evidence / Explanation Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Details about damage batch, supplier shipment, or spoilage cause..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-3 flex gap-2 justify-end border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md flex items-center gap-2"
                  >
                    {submittingCreate && <RefreshCw size={13} className="animate-spin" />}
                    Create Claim Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Claim Detail & Resolution Drawer */}
      <AnimatePresence>
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      Claim #{selectedClaim.claim_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(STATUS_BADGES[selectedClaim.status] || STATUS_BADGES.OPEN).bg}`}>
                      {selectedClaim.status_label || selectedClaim.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedClaim.vegetable_name}</p>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
                {drawerLoading ? (
                  <div className="py-12 flex justify-center text-slate-400">
                    <RefreshCw className="animate-spin text-emerald-500" size={24} />
                  </div>
                ) : (
                  <>
                    {/* Vegetable Info Card */}
                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      {selectedClaim.vegetable_image ? (
                        <img
                          src={selectedClaim.vegetable_image}
                          alt={selectedClaim.vegetable_name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <Sprout size={20} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedClaim.vegetable_name}</h4>
                        <div className="text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>SKU: {selectedClaim.vegetable_sku || "—"}</span>
                          <span>•</span>
                          <span>Stock: {selectedClaim.current_stock_display || "0g"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Claim Details */}
                    <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Loss Reason:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{selectedClaim.reason_label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Written Off Quantity:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">-{selectedClaim.quantity_display}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Estimated Loss Amount:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {parseFloat(selectedClaim.estimated_loss_amount) > 0 ? `₹${parseFloat(selectedClaim.estimated_loss_amount).toFixed(2)}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Logged By:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{selectedClaim.created_by_name || "Admin"}</span>
                      </div>
                      {selectedClaim.approved_by_name && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Approved By:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{selectedClaim.approved_by_name}</span>
                        </div>
                      )}
                      {selectedClaim.notes && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 font-medium block mb-1">Notes / Explanation:</span>
                          <p className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                            {selectedClaim.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Linked Stock Movement Card if Approved */}
                    {selectedClaim.stock_movement_detail && (
                      <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                        <h5 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <History size={14} /> Audited Stock Movement #{selectedClaim.stock_movement_detail.id}
                        </h5>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1">
                          <p>• Type: <span className="font-mono font-bold">CLAIM_WRITEOFF</span></p>
                          <p>• Delta: <span className="font-mono font-bold text-rose-600">{selectedClaim.stock_movement_detail.delta_grams}g</span></p>
                          <p>• Balance After: <span className="font-mono font-bold">{selectedClaim.stock_movement_detail.balance_after_grams}g</span></p>
                        </div>
                      </div>
                    )}

                    {/* Actions if OPEN */}
                    {selectedClaim.status === "OPEN" && (
                      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-slate-900 dark:text-white">Resolve Claim</h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => handleAction("APPROVE")}
                            disabled={actionLoading}
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheck size={14} />
                            Approve & Deduct
                          </button>
                          <button
                            onClick={() => handleAction("REJECT")}
                            disabled={actionLoading}
                            className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                          >
                            <X size={14} />
                            Reject Claim
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">
                          * Approving automatically writes off {selectedClaim.quantity_display} from live stock and records an auditable stock movement.
                        </p>
                      </div>
                    )}

                    {selectedClaim.status === "APPROVED" && (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => handleAction("RESOLVE")}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          Close / Mark as Resolved
                        </button>
                      </div>
                    )}
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
