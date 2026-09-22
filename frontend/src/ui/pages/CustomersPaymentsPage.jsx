import React, { useEffect, useState, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { fetchCustomerPayments } from "../../store/customerAnalyticsSlice.js"
import {
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  UserCheck,
  Building2,
  FileText,
  SlidersHorizontal,
  Table as TableIcon,
  Columns3,
  Calendar,
  Phone,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"

export function CustomersPaymentsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { summary = {}, owes = [], technicianHolds = [], settled = [], loading } = useSelector(
    (state) => state.customerAnalytics.payments
  )

  const [activeTab, setActiveTab] = useState("all") // "all" | "settled" | "owes" | "holds"
  const [viewMode, setViewMode] = useState("table") // "table" | "kanban"
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    dispatch(fetchCustomerPayments())
  }, [dispatch])

  // Combine and normalize all transaction records for the unified ledger view
  const allRecords = useMemo(() => {
    const combined = []

    settled.forEach((item) => {
      combined.push({
        ...item,
        type: "settled",
        typeLabel: "Settled / Paid",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        amountColor: "text-emerald-600 dark:text-emerald-400",
        date: item.created_at,
      })
    })

    owes.forEach((item) => {
      combined.push({
        ...item,
        type: "owes",
        typeLabel: "Outstanding (Owes)",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        amountColor: "text-rose-600 dark:text-rose-400",
        date: item.created_at,
      })
    })

    technicianHolds.forEach((item) => {
      combined.push({
        ...item,
        type: "holds",
        typeLabel: "Cash with Tech",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        amountColor: "text-amber-600 dark:text-amber-400",
        date: item.collected_at || item.created_at,
      })
    })

    // Sort newest first
    return combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [settled, owes, technicianHolds])

  // Filtered records based on active tab and search query
  const filteredRecords = useMemo(() => {
    let list = allRecords

    if (activeTab !== "all") {
      list = list.filter((r) => r.type === activeTab)
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter(
        (r) =>
          r.booking_id?.toLowerCase().includes(q) ||
          r.customer_name?.toLowerCase().includes(q) ||
          r.phone?.includes(q) ||
          r.service_title?.toLowerCase().includes(q) ||
          r.transaction_id?.toLowerCase().includes(q) ||
          r.technician_name?.toLowerCase().includes(q)
      )
    }

    return list
  }, [allRecords, activeTab, searchTerm])

  const settledTotal = summary.total_settled_amount || settled.reduce((sum, i) => sum + (i.amount || 0), 0)
  const outstandingTotal = summary.total_outstanding_amount || owes.reduce((sum, i) => sum + (i.amount || 0), 0)
  const holdsTotal = summary.total_technician_holds || technicianHolds.reduce((sum, i) => sum + (i.amount || 0), 0)

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen font-sans">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Financial Collections & Payment Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time reconciliation of settled customer payments, pending receivables, and technician cash collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"
              }`}
            >
              <TableIcon size={14} />
              <span>Ledger</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"
              }`}
            >
              <Columns3 size={14} />
              <span>Kanban</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => dispatch(fetchCustomerPayments())}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Refresh payment data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: SETTLED REVENUE */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {summary.settled_count || settled.length} Paid
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Settled Revenue
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              ₹{settledTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Successfully collected & reconciled</p>
          </div>
        </div>

        {/* CARD 2: OUTSTANDING RECEIVABLES */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle size={20} />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {summary.outstanding_count || owes.length} Pending
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Customer Outstanding
            </p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              ₹{outstandingTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Pending payment on completed jobs</p>
          </div>
        </div>

        {/* CARD 3: TECHNICIAN CASH HOLDINGS */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Banknote size={20} />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {summary.technician_holds_count || technicianHolds.length} Handed
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cash In Transit
            </p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              ₹{holdsTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Cash collected by technicians</p>
          </div>
        </div>

        {/* CARD 4: TOTAL VOLUME */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CreditCard size={20} />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Active
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Transactions
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {allRecords.length}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Across all payment channels</p>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH CONTROLS ── */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: "all", label: "All Transactions", count: allRecords.length },
            { id: "settled", label: "Settled / Paid", count: settled.length },
            { id: "owes", label: "Customer Outstanding", count: owes.length },
            { id: "holds", label: "Cash with Technicians", count: technicianHolds.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by customer, phone, booking ID, TXN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── MAIN CONTENT VIEW ── */}
      {viewMode === "table" ? (
        /* ── TABLE / LEDGER VIEW ── */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Service Details</th>
                  <th className="px-6 py-4">Status & Category</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-400 font-bold italic animate-pulse">
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-400 font-semibold">
                      No payment records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => (
                    <tr
                      key={item.id ? `rec-${item.id}` : `row-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => navigate("/customers/bookings")}
                    >
                      {/* Booking ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          <span>{item.booking_id}</span>
                          <ArrowUpRight size={12} className="opacity-60" />
                        </div>
                        {item.transaction_id && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">
                            TXN: {item.transaction_id}
                          </div>
                        )}
                      </td>

                      {/* Customer Details */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{item.customer_name}</span>
                        </div>
                        {item.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Phone size={10} />
                            <span>{item.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Service Details */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[220px]">
                          {item.service_title}
                        </div>
                        {item.technician_name && (
                          <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
                            Tech: {item.technician_name}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${item.badgeColor}`}
                        >
                          {item.typeLabel}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase">
                          {item.payment_method || "COD"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-right">
                        <span className={`font-black text-sm ${item.amountColor}`}>
                          ₹{item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-slate-500 text-[11px] font-semibold whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── KANBAN COLUMNS VIEW ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: OWES */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Customer Outstanding
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[10px] font-black">
                {owes.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {owes.length > 0 ? (
                owes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 space-y-2 shadow-xs hover:border-rose-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{item.customer_name}</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                        ₹{item.amount?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                      {item.service_title}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-900">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{item.booking_id}</span>
                      <span>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "—"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 italic text-xs py-8">No outstanding collections.</div>
              )}
            </div>
          </div>

          {/* COLUMN 2: TECHNICIAN HOLDS CASH */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Technician Cash Holdings
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 text-[10px] font-black">
                {technicianHolds.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {technicianHolds.length > 0 ? (
                technicianHolds.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 space-y-2 shadow-xs hover:border-amber-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{item.customer_name}</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        ₹{item.amount?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      Tech: {item.technician_name}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-900">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{item.booking_id}</span>
                      <span>{item.collected_at ? new Date(item.collected_at).toLocaleDateString("en-IN") : "—"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 italic text-xs py-8">No technician cash in transit.</div>
              )}
            </div>
          </div>

          {/* COLUMN 3: SETTLED */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Settled & Reconciled
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-[10px] font-black">
                {settled.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {settled.length > 0 ? (
                settled.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 space-y-2 shadow-xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{item.customer_name}</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ₹{item.amount?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                      {item.service_title}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-900">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{item.booking_id}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-bold">
                        {item.payment_method}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 italic text-xs py-8">No settled transactions.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
