import React, { useEffect, useState, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router-dom"
import { fetchCustomers, updateFilters } from "../../store/customerAnalyticsSlice.js"
import { Search, Download, Users, User, ArrowUpDown, ChevronLeft, ChevronRight, Printer } from "lucide-react"

export function CustomersListPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useSelector((state) => state.customerAnalytics.filters)
  const { results, count, currentPage, numPages, loading, error } = useSelector(
    (state) => state.customerAnalytics.list
  )

  const [searchTerm, setSearchTerm] = useState(filters.q)
  const searchTimeoutRef = useRef(null)

  // Sync URL search params with Redux filters on mount
  useEffect(() => {
    const q = searchParams.get("q") || ""
    const period = searchParams.get("period") || "month"
    const churn_risk = searchParams.get("churn_risk") || ""
    const is_repeat = searchParams.get("is_repeat") || ""
    const sort = searchParams.get("sort") || "-last_booking_at"
    const page = parseInt(searchParams.get("page") || "1", 10)

    dispatch(updateFilters({ q, period, churn_risk, is_repeat, sort, page }))
  }, [searchParams, dispatch])

  // Sync Redux filters to query when they change
  useEffect(() => {
    dispatch(fetchCustomers(filters))
  }, [dispatch, filters])

  const updateUrlParams = (newFilters) => {
    const nextParams = new URLSearchParams(searchParams)
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        nextParams.set(key, val)
      } else {
        nextParams.delete(key)
      }
    })
    setSearchParams(nextParams)
  }

  // Handle debounced search input
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      updateUrlParams({ q: val, page: 1 })
    }, 300)
  }

  const handleFilterChange = (key, value) => {
    updateUrlParams({ [key]: value, page: 1 })
  }

  const handleSortChange = (sortField) => {
    const newSort = filters.sort === sortField ? `-${sortField}` : sortField
    updateUrlParams({ sort: newSort, page: 1 })
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      updateUrlParams({ page: newPage })
    }
  }

  const handleExportCSV = () => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v) query.append(k, v)
    })
    query.append("export_format", "csv")
    window.open(`/api/customers/export/?${query.toString()}`, "_blank")
  }

  const handleExportPDF = () => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v) query.append(k, v)
    })
    query.append("export_format", "pdf")
    window.open(`/api/customers/export/?${query.toString()}`, "_blank")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="printable-content p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 15mm 10mm 15mm 10mm;
          }
          
          /* Hide sidebars, menus, controls, and other non-printable components */
          aside, nav, header, .no-print, button {
            display: none !important;
          }

          /* Reset all parent structures to make layout block-based and full-width */
          html, body, #root, #root > div, main, .printable-content {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          body {
            color: #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Format clean, bordered table styles */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 20px !important;
            font-size: 11px !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 10px !important;
            text-align: left !important;
            color: #000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight font-display">Customer Directory</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Search, filter, and inspect registered customer lifetime history and spending.
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <Download size={14} />
            <span>PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── STICKY FILTER BAR ── */}
      <div className="sticky top-0 z-10 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-4 items-center no-print">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Repeat customer filter */}
          <select
            value={filters.is_repeat}
            onChange={(e) => handleFilterChange("is_repeat", e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold shadow-sm"
          >
            <option value="">All Customers</option>
            <option value="true">Repeat Customers (≥2 bookings)</option>
            <option value="false">One-Time Customers</option>
          </select>

          {/* Churn Risk */}
          <select
            value={filters.churn_risk}
            onChange={(e) => handleFilterChange("churn_risk", e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold shadow-sm"
          >
            <option value="">All Churn Statuses</option>
          </select>
        </div>
      </div>

      {/* ── CUSTOMER TABLE ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-55/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4.5 text-xs font-black text-slate-400 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-4.5 text-xs font-black text-slate-400 uppercase tracking-wider">Contact Address</th>
                <th className="px-6 py-4.5 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortChange("bookings")}>
                  <div className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
                    <span>Bookings Count</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4.5 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortChange("value")}>
                  <div className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
                    <span>Lifetime Value</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4.5 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortChange("last_booking_at")}>
                  <div className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
                    <span>Last Booking Date</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4.5 text-xs font-black text-slate-400 uppercase tracking-wider">Last Login Session</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 text-xs font-bold italic animate-pulse">Loading customer directory...</td>
                </tr>
              ) : results.length > 0 ? (
                results.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 cursor-pointer transition-all duration-150"
                  >
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-sm text-sm">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors">{c.name}</div>
                          {c.total_bookings >= 2 && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[9px] font-black uppercase tracking-wider">
                              Repeat Customer
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">📧</span>
                        <span>{c.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-slate-400">📞</span>
                        <span>{c.phone || "—"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4.5">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">{c.total_bookings} bookings</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                        {c.completed_bookings} completed <span className="mx-0.5">•</span> {c.cancelled_bookings} cancelled
                      </div>
                    </td>

                    <td className="px-6 py-4.5">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">₹{c.total_spent.toLocaleString("en-IN")}</div>
                      {c.outstanding_amount > 0 && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-450 text-[9px] font-black uppercase tracking-wider">
                          ₹{c.outstanding_amount.toLocaleString("en-IN")} unpaid
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {c.last_booking_at
                        ? new Date(c.last_booking_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>

                    <td className="px-6 py-4.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {c.last_login_at
                        ? new Date(c.last_login_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 italic text-xs font-semibold">No customers matched your filter selection.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {numPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 no-print">
            <div className="text-xs font-bold text-slate-500">
              Showing page {currentPage} of {numPages} ({count} total records)
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-50 text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === numPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-50 text-slate-600 dark:text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
