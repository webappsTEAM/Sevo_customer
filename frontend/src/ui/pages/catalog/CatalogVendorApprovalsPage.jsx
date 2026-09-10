import React, { useEffect, useState, useMemo } from "react"
import {
  UserCheck, Search, Check, X, Clock, FolderOpen, ShieldCheck, Ban
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"
import { Select } from "../../components/kit.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

// Vendors on the separate Workforce app browse this app's catalog and
// submit a request to be approved to serve a given Service (their
// "skills"). This page is where staff review those requests. Approving a
// request here is the single flag the Workforce app checks (via its own
// vendor-capabilities/ endpoint) before letting that vendor accept jobs
// under the Service -- nothing else in this app reacts to the decision.
// See VendorCapabilityRequest in service_requests/models.py for the model
// and workforce_integration/views.py for the vendor-facing half of this.

const STATUS_TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "", label: "All" },
]

const STATUS_BADGE = {
  PENDING:  { label: "Pending",  className: "bg-amber-50 text-amber-700 border-amber-200/60" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60" },
  REJECTED: { label: "Rejected", className: "bg-rose-50 text-rose-700 border-rose-200/60" },
}

export function CatalogVendorApprovalsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState("PENDING")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [decidingId, setDecidingId] = useState(null)
  const [rejectDraft, setRejectDraft] = useState(null) // { id, note }
  const [toast, showToast] = useToast()

  const loadAll = async (status) => {
    setLoading(true)
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : ""
      const res = await apiRequest(`/settings/catalog/v2/vendor-capabilities/${qs}`)
      if (res.success) setRequests(res.data)
    } catch {
      showToast("Failed to load vendor requests", "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll(statusTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab])

  const categoryOptions = useMemo(() => {
    const seen = new Map()
    requests.forEach((r) => {
      if (r.category_id != null && !seen.has(r.category_id)) seen.set(r.category_id, r.category_name)
    })
    return [
      { value: "", label: "All Categories" },
      ...Array.from(seen.entries()).map(([id, name]) => ({ value: String(id), label: name })),
    ]
  }, [requests])

  const filteredRequests = useMemo(() => {
    let list = requests
    if (categoryFilter) list = list.filter((r) => String(r.category_id) === String(categoryFilter))
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        (r.vendor_name || "").toLowerCase().includes(q) ||
        (r.vendor_id || "").toLowerCase().includes(q) ||
        (r.service_name || "").toLowerCase().includes(q) ||
        (r.category_name || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [requests, categoryFilter, searchQuery])

  const decide = async (id, status, decisionNote = "") => {
    setDecidingId(id)
    try {
      const res = await apiRequest(`/settings/catalog/v2/vendor-capabilities/${id}/decide/`, {
        method: "POST",
        json: { status, decision_note: decisionNote },
      })
      if (res.success) {
        showToast(status === "APPROVED" ? "Vendor approved for this service" : "Request rejected")
        setRejectDraft(null)
        loadAll(statusTab)
      } else {
        showToast(res.message || "Update failed", "error")
      }
    } catch (err) {
      showToast(extractApiErrorMessage(err, "Update failed"), "error")
    }
    setDecidingId(null)
  }

  const pendingCount = useMemo(() => requests.filter((r) => r.status === "PENDING").length, [requests])

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto font-sans text-slate-800 space-y-5">
      <ToastBanner toast={toast} />

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-indigo-700 text-[11px] font-medium mb-1.5 border border-indigo-200/60">
              <UserCheck className="w-3 h-3 text-indigo-600" /> Vendor App Integration
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Vendor Approvals
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Vendors on the Workforce app browse this catalog and request to serve a service. Approve a request here to let that vendor start accepting jobs under it.
            </p>
          </div>
        </div>

        {/* Status tabs + Search & Filter */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value || "all"}
                type="button"
                onClick={() => setStatusTab(t.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusTab === t.value ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
                {t.value === "PENDING" && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div className="w-44 shrink-0 hidden sm:block">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading requests…</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-sm">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-slate-800">No requests here</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {statusTab === "PENDING" ? "Nothing waiting on review right now." : "Try a different status tab or clear your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRequests.map((r) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.PENDING
            const isRejecting = rejectDraft?.id === r.id
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50/80 text-indigo-700 flex items-center justify-center shrink-0 font-semibold text-xs border border-indigo-100/60">
                      {(r.vendor_name || r.vendor_id || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                          {r.vendor_name || `Vendor #${r.vendor_id}`}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badge.className}`}>
                          {r.status === "PENDING" && <Clock className="w-3 h-3" />}
                          {r.status === "APPROVED" && <ShieldCheck className="w-3 h-3" />}
                          {r.status === "REJECTED" && <Ban className="w-3 h-3" />}
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Requesting <span className="font-medium text-slate-700">{r.service_name}</span>
                        {r.category_name ? <span className="text-slate-400"> · {r.category_name}</span> : null}
                        {r.vendor_id ? <span className="text-slate-400"> · vendor id {r.vendor_id}</span> : null}
                      </p>
                      {r.note && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">"{r.note}"</p>
                      )}
                      {r.status !== "PENDING" && r.decision_note && (
                        <p className="text-[11px] text-slate-400 mt-1">Note: {r.decision_note}</p>
                      )}
                    </div>
                  </div>

                  {r.status === "PENDING" && !isRejecting && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={decidingId === r.id}
                        onClick={() => decide(r.id, "APPROVED")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === r.id}
                        onClick={() => setRejectDraft({ id: r.id, note: "" })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>

                {isRejecting && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="text"
                      autoFocus
                      value={rejectDraft.note}
                      onChange={(e) => setRejectDraft((d) => ({ ...d, note: e.target.value }))}
                      placeholder="Reason for rejection (optional, shown to admin only for now)"
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20 outline-none transition-all"
                    />
                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setRejectDraft(null)}
                        className="px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === r.id}
                        onClick={() => decide(r.id, "REJECTED", rejectDraft.note)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CatalogVendorApprovalsPage
