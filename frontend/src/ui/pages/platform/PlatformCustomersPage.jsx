import React, { useState, useEffect } from "react"
import { Users, Search, UserCheck, ShieldAlert, GitMerge, AlertTriangle, Check, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { apiRequest } from "../../../api/client.js"

export default function PlatformCustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Merge modal states
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [sourceId, setSourceId] = useState("")
  const [targetId, setTargetId] = useState("")
  const [mergeReason, setMergeReason] = useState("")
  const [mergePreview, setMergePreview] = useState(null)
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState(null)
  const [mergeSuccess, setMergeSuccess] = useState(null)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: "20"
      })
      if (search) params.append("search", search)
      const res = await apiRequest(`/customers/list/?${params.toString()}`)
      setCustomers(res.data?.results || [])
      setTotalPages(res.data?.num_pages || 1)
    } catch (err) {
      console.error("Error fetching customers:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [page])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchCustomers()
  }

  const handleFetchMergePreview = async () => {
    if (!sourceId || !targetId) return
    setMergeError(null)
    setMergePreview(null)
    try {
      const res = await apiRequest("/platform/customers/merge-preview/", {
        method: "POST",
        body: JSON.stringify({
          source_customer_id: sourceId,
          target_customer_id: targetId,
        }),
        headers: { "Content-Type": "application/json" }
      })
      setMergePreview(res)
    } catch (err) {
      setMergeError(err?.message || "Failed to preview customer merge.")
    }
  }

  const handleExecuteMerge = async () => {
    if (!sourceId || !targetId || !mergeReason) {
      alert("Please provide source customer, target customer, and a merge reason.")
      return
    }
    const confirm = window.confirm(
      `CRITICAL ACTION: Merge customer #${sourceId} into #${targetId}? This will reassign all bookings, addresses, and tickets.`
    )
    if (!confirm) return

    setMerging(true)
    setMergeError(null)
    try {
      const res = await apiRequest("/platform/customers/merge/", {
        method: "POST",
        body: JSON.stringify({
          source_customer_id: sourceId,
          target_customer_id: targetId,
          reason: mergeReason,
        }),
        headers: { "Content-Type": "application/json" }
      })
      setMergeSuccess(res.message)
      setMergePreview(null)
      fetchCustomers()
    } catch (err) {
      setMergeError(err?.message || "Failed to execute merge.")
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Customer 360 & Account Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Global customer directory, account status overrides, risk flags, and audited account merging.
          </p>
        </div>

        <button
          onClick={() => {
            setShowMergeModal(true)
            setMergePreview(null)
            setMergeSuccess(null)
            setMergeError(null)
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-sm transition-all"
        >
          <GitMerge className="w-4 h-4" />
          Merge Duplicate Accounts
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, email, or customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4 text-center">Bookings</th>
                <th className="px-4 py-4 text-right">Total Spent</th>
                <th className="px-4 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id || c.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-400 font-mono">ID: {c.customer_id || c.user_id}</div>
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <div className="text-slate-700 font-medium">{c.phone || "—"}</div>
                    <div className="text-slate-500">{c.email || "—"}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {c.total_bookings} total
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-slate-900">
                    ₹{(c.total_spent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {c.last_booking_at ? new Date(c.last_booking_at).toLocaleDateString() : "No bookings"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/customers/${c.user_id || c.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                    >
                      Customer 360 <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-indigo-600" /> Merge Customer Accounts
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {mergeSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
                  <div className="font-semibold">Merge Completed!</div>
                  <p className="text-xs text-emerald-700 mt-1">{mergeSuccess}</p>
                </div>
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Source Customer ID (To Deactivate)</label>
                    <input
                      type="text"
                      placeholder="e.g. 102"
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Target Customer ID (Primary)</label>
                    <input
                      type="text"
                      placeholder="e.g. 88"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Merge Reason (Mandatory for Audit)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Duplicate account created with alternate email"
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFetchMergePreview}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Preview Affected Records
                </button>

                {mergePreview && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="font-semibold text-slate-900">Merge Impact Preview:</div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-lg font-bold text-indigo-600">
                          {mergePreview.affected_records?.bookings || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Bookings</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-lg font-bold text-indigo-600">
                          {mergePreview.affected_records?.addresses || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Addresses</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-lg font-bold text-indigo-600">
                          {mergePreview.affected_records?.support_tickets || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Tickets</div>
                      </div>
                    </div>
                  </div>
                )}

                {mergeError && <div className="text-xs text-rose-600 font-medium">{mergeError}</div>}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowMergeModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={merging || !mergePreview}
                    onClick={handleExecuteMerge}
                    className="px-5 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-sm"
                  >
                    {merging ? "Merging..." : "Confirm & Execute Merge"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
