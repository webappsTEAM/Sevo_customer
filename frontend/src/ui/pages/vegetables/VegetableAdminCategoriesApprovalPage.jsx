import React, { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck, CheckCircle2, XCircle, AlertCircle, Clock,
  FolderOpen, Sprout, Search, RefreshCw, Layers,
  Sparkles, AlertTriangle, Eye, ChevronRight, Check, X, User
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"
import { routes } from "../../routes.js"

export default function VegetableAdminCategoriesApprovalPage() {
  const [statusFilter, setStatusFilter] = useState("ALL") // "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  const [searchQuery, setSearchQuery] = useState("")

  const [vegetableRequests, setVegetableRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Review Modal State
  const [reviewItem, setReviewItem] = useState(null)
  const [actionConfirm, setActionConfirm] = useState(null) // "APPROVE" | "REJECT" | null
  const [rejectionReason, setRejectionReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState("")
  const [actionSuccess, setActionSuccess] = useState("")

  const fetchQueue = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiRequest("/inventory/vegetables/approval-queue/?status=ALL")
      const list = res?.data?.data || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      setVegetableRequests(list)
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load approval queue."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return vegetableRequests.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const nameMatch = (item.name || "").toLowerCase().includes(q)
        const skuMatch = (item.sku || "").toLowerCase().includes(q)
        const catNameMatch = (item.category_name || item.category_parent_name || "").toLowerCase().includes(q)
        const catPathMatch = (item.category_full_path || "").toLowerCase().includes(q)
        const requesterMatch = (item.requested_by_name || "").toLowerCase().includes(q)
        const matchesSearch = nameMatch || skuMatch || catNameMatch || catPathMatch || requesterMatch
        if (!matchesSearch) return false
      }

      if (statusFilter !== "ALL" && item.status !== statusFilter) return false
      return true
    })
  }, [vegetableRequests, searchQuery, statusFilter])

  // Counts across vegetable product requests
  const totalPending = vegetableRequests.filter((v) => v.status === "PENDING").length
  const totalResubmitted = vegetableRequests.filter((v) => v.is_resubmission && v.status === "PENDING").length
  const totalApproved = vegetableRequests.filter((v) => v.status === "APPROVED").length
  const totalRejected = vegetableRequests.filter((v) => v.status === "REJECTED").length

  const handleOpenReview = (item) => {
    setReviewItem(item)
    setActionConfirm(null)
    setRejectionReason("")
    setActionError("")
    setActionSuccess("")
  }

  const handleDecisionSubmit = async (overrideAction) => {
    const targetAction = overrideAction || actionConfirm
    if (!targetAction || !reviewItem) return
    if (targetAction === "REJECT" && !rejectionReason.trim()) {
      setActionError("Rejection reason is required.")
      return
    }

    try {
      setSubmitting(true)
      setActionError("")

      const res = await apiRequest(`/inventory/vegetables/${reviewItem.id}/review/`, {
        method: "POST",
        body: JSON.stringify({
          action: targetAction,
          rejection_reason: rejectionReason.trim(),
        }),
        headers: { "Content-Type": "application/json" },
      })

      if (res?.data?.success || res?.success) {
        setActionSuccess(res?.data?.message || res?.message || "Action processed successfully.")
        await fetchQueue()
        setTimeout(() => {
          setReviewItem(null)
          setActionConfirm(null)
          setActionSuccess("")
        }, 1200)
      } else {
        throw new Error(res?.data?.message || res?.message || "Failed to submit decision.")
      }
    } catch (err) {
      setActionError(extractApiErrorMessage(err, "Failed to submit decision."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categories & Products Approval</h1>
            <p className="text-sm text-muted-foreground">
              Review, approve, or reject vendor vegetable produce requests before they reflect in Inventory or the storefront.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchQueue}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/80 hover:bg-muted/80 text-foreground font-medium text-sm shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            to={routes.vegetable_admin_categories}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-xs hover:opacity-90 transition-all cursor-pointer"
          >
            <FolderOpen size={16} />
            <span>Active Categories List</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Clock size={14} /> Pending Products
          </div>
          <div className="text-2xl font-black mt-1 text-amber-700 dark:text-amber-300">
            {totalPending}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Awaiting admin review
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Sparkles size={14} /> Resubmitted Items
          </div>
          <div className="text-2xl font-black mt-1 text-blue-700 dark:text-blue-300">
            {totalResubmitted}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Revised by vendors
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Approved Total
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-700 dark:text-emerald-300">
            {totalApproved}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Active in catalog
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <XCircle size={14} /> Rejected Total
          </div>
          <div className="text-2xl font-black mt-1 text-rose-700 dark:text-rose-300">
            {totalRejected}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Returned for revisions
          </div>
        </div>
      </div>

      {/* Main Pipeline Card */}
      <div className="rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs overflow-hidden">
        {/* Top Control Bar with Search & Status Filters */}
        <div className="border-b border-border/80 bg-muted/30 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <Sprout size={18} className="text-emerald-500" />
            <span>Product & Category Requests</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary">
              {filteredRequests.length}
            </span>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product, category, SKU..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              {[
                { id: "ALL", label: "All" },
                { id: "PENDING", label: `Pending (${totalPending})` },
                { id: "APPROVED", label: "Approved" },
                { id: "REJECTED", label: "Rejected" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading requests pipeline...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">
            <AlertCircle className="mx-auto mb-2" size={24} />
            <p className="font-semibold">{error}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Sprout className="mx-auto mb-2 opacity-40" size={36} />
            <p className="font-semibold text-base">No requests found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter !== "ALL"
                ? `There are no requests with status '${statusFilter}'.`
                : "Vendors have not submitted any product requests yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">Vegetable Product</th>
                  <th className="py-3.5 px-4">Category Hierarchy</th>
                  <th className="py-3.5 px-4">Pack & Price</th>
                  <th className="py-3.5 px-4">Requested By</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.map((item) => {
                  const isNewCategory = item.category_status === "PENDING"
                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Column 1: Vegetable Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-9 h-9 rounded-xl object-cover bg-muted border border-border/80 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-500/20 shrink-0">
                              <Sprout size={16} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground">
                                {item.name.replace(" (Produce)", "")}
                              </span>

                              {isNewCategory && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 inline-flex items-center gap-1">
                                  <Sparkles size={10} /> +New Category Bundle
                                </span>
                              )}

                              {item.is_resubmission && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Resubmitted
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              {item.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Category Hierarchy */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                            <Layers size={13} className="text-primary shrink-0" />
                            <span>
                              {item.category_full_path ||
                                (item.category_parent_name
                                  ? `${item.category_parent_name} → ${item.category_name}`
                                  : item.category_name || "Uncategorized")}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span>Category:</span>
                            <span className={isNewCategory ? "text-amber-600 font-bold" : "font-medium"}>
                              {item.category_status || "ACTIVE"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Pack & Price */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            ₹{Math.round(Number(item.price || 0))}
                            {item.mrp && Number(item.mrp) > Number(item.price) && (
                              <span className="text-[11px] text-muted-foreground line-through ml-1.5 font-normal">
                                ₹{Math.round(Number(item.mrp))}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Pack: {item.pack_size || item.unit || "500g"}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Requested By */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                          <User size={13} className="text-muted-foreground" />
                          <span>{item.requested_by_name || "Vendor"}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {item.requested_at ? new Date(item.requested_at).toLocaleDateString() : "Recent"}
                        </div>
                      </td>

                      {/* Column 5: Status */}
                      <td className="py-3.5 px-4">
                        {item.status === "PENDING" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                        {item.status === "APPROVED" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        )}
                        {item.status === "REJECTED" && (
                          <div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                              <XCircle size={12} /> Rejected
                            </span>
                            {item.rejection_reason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 max-w-xs font-medium line-clamp-2">
                                Reason: "{item.rejection_reason}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenReview(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Review</span>
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

      {/* ── Review & Decision Modal / Drawer ── */}
      <AnimatePresence>
        {reviewItem && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setReviewItem(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative z-10 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <Sprout size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Review Vegetable Request
                      </h2>
                      {reviewItem.is_resubmission && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Resubmitted
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Submitted by <strong className="text-slate-900 dark:text-slate-200">{reviewItem.requested_by_name || "Vendor"}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status Alert Banner if previously rejected */}
              {reviewItem.rejection_reason && reviewItem.status === "REJECTED" && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-200 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Currently Rejected
                  </div>
                  <p className="text-xs text-foreground font-medium">
                    "{reviewItem.rejection_reason}"
                  </p>
                </div>
              )}

              {/* Details Display */}
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/60">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Product Name:</span>
                    <p className="font-bold text-foreground text-base">
                      {reviewItem.name.replace(" (Produce)", "")}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">SKU:</span>
                    <p className="font-mono text-xs font-bold text-foreground mt-1">
                      {reviewItem.sku}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Category Hierarchy:</span>
                    <p className="font-semibold text-foreground text-xs mt-1">
                      {reviewItem.category_full_path ||
                        (reviewItem.category_parent_name
                          ? `${reviewItem.category_parent_name} → ${reviewItem.category_name}`
                          : reviewItem.category_name)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Price / MRP:</span>
                    <p className="font-bold text-foreground">
                      ₹{Math.round(Number(reviewItem.price || 0))}
                      {reviewItem.mrp && ` (MRP: ₹${Math.round(Number(reviewItem.mrp))})`}
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        • {reviewItem.pack_size || reviewItem.unit}
                      </span>
                    </p>
                  </div>
                  {reviewItem.description && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-muted-foreground font-medium">Description:</span>
                      <p className="text-xs text-foreground mt-0.5">{reviewItem.description}</p>
                    </div>
                  )}
                </div>

                {/* Notice if category was bundled and is also pending */}
                {reviewItem.category_status === "PENDING" && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                    <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">New Proposed Category: "{reviewItem.category_name}"</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Approving this product will automatically approve and activate the new category <strong>{reviewItem.category_name}</strong> in the catalog hierarchy.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Error / Success notices */}
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Rejection Form Drawer (if reject is clicked) */}
              {actionConfirm === "REJECT" && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <label className="text-xs font-bold text-rose-950 dark:text-rose-200 block">
                    Mandatory Rejection Reason:
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide specific feedback on why this request is being rejected (e.g. Duplicate item, invalid pricing, image quality issue)..."
                    className="w-full p-3 rounded-xl border border-rose-500/30 bg-background text-xs focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This reason will be visible to the vendor so they can fix and resubmit.
                  </p>
                </div>
              )}

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2.5">
                  {actionConfirm === "REJECT" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionConfirm(null)}
                        className="px-3 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer"
                      >
                        Cancel Rejection
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecisionSubmit("REJECT")}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? "Rejecting..." : "Confirm & Reject Request"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionConfirm("REJECT")}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>Reject Request</span>
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecisionSubmit("APPROVE")}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 size={15} />
                        <span>{submitting ? "Approving..." : "Approve & Activate"}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
