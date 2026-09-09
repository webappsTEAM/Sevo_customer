import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  fetchVegetableStock,
  restockVegetable,
  adjustVegetableStock,
  setDefaultDailyStock,
  fetchVegetableStockHistory,
} from "../../../store/inventorySlice.js"
import {
  Sprout, RefreshCw, PlusCircle, Edit3, Settings,
  History, CheckCircle2, AlertCircle, HelpCircle,
  X, Calendar, ArrowUpRight, ArrowDownRight, Search,
  Download, FileSpreadsheet, FileText
} from "lucide-react"

export function VegetableStockAdminPage() {
  const dispatch = useDispatch()
  const { vegetables, historyByProduct, loading } = useSelector((state) => state.inventory)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterState, setFilterState] = useState("all") // all, in_stock, out_of_stock, not_tracked

  // Modals
  const [restockModalItem, setRestockModalItem] = useState(null)
  const [adjustModalItem, setAdjustModalItem] = useState(null)
  const [defaultModalItem, setDefaultModalItem] = useState(null)
  const [historyModalItem, setHistoryModalItem] = useState(null)

  // Form states
  const [actionQty, setActionQty] = useState("")
  const [actionUnit, setActionUnit] = useState("kg")
  const [actionReason, setActionReason] = useState("")
  const [applyNow, setApplyNow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState("")

  useEffect(() => {
    dispatch(fetchVegetableStock())

    // Auto-poll every 4 seconds so customer orders and background stock changes show live in real-time
    const interval = setInterval(() => {
      dispatch(fetchVegetableStock())
    }, 4000)

    // Also immediately refetch when admin switches back to the tab/window
    const handleFocus = () => {
      dispatch(fetchVegetableStock())
    }
    window.addEventListener("focus", handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [dispatch])

  const filteredVegetables = (vegetables || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.slug.toLowerCase().includes(searchQuery.toLowerCase())
    if (filterState === "in_stock") return matchesSearch && item.state === "in_stock"
    if (filterState === "out_of_stock") return matchesSearch && item.state === "out_of_stock"
    if (filterState === "not_tracked") return matchesSearch && item.state === "not_tracked"
    return matchesSearch
  })

  // Handlers
  const handleOpenRestock = (item) => {
    setRestockModalItem(item)
    setActionQty("")
    setActionUnit("kg")
    setActionError("")
  }

  const handleOpenAdjust = (item) => {
    setAdjustModalItem(item)
    setActionQty(item.today_available_grams ? (item.today_available_grams / 1000).toString() : "")
    setActionUnit("kg")
    setActionReason("")
    setActionError("")
  }

  const handleOpenSetDefault = (item) => {
    setDefaultModalItem(item)
    setActionQty(item.default_daily_grams ? (item.default_daily_grams / 1000).toString() : "")
    setActionUnit("kg")
    setApplyNow(false)
    setActionError("")
  }

  const [historyStartDate, setHistoryStartDate] = useState("")
  const [historyEndDate, setHistoryEndDate] = useState("")

  const handleOpenHistory = (item) => {
    setHistoryModalItem(item)
    const todayStr = new Date().toISOString().split("T")[0]
    const pastStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    setHistoryStartDate(pastStr)
    setHistoryEndDate(todayStr)
    dispatch(fetchVegetableStockHistory({ productId: item.product_id, startDate: pastStr, endDate: todayStr }))
  }

  const handleApplyCustomDateRange = (e) => {
    e?.preventDefault?.()
    if (historyModalItem && historyStartDate && historyEndDate) {
      dispatch(fetchVegetableStockHistory({
        productId: historyModalItem.product_id,
        startDate: historyStartDate,
        endDate: historyEndDate,
      }))
    }
  }

  const handleExportCSV = () => {
    if (!historyModalItem) return
    const rows = historyByProduct[historyModalItem.product_id] || []
    if (rows.length === 0) {
      alert("No data to export.")
      return
    }

    const csvRows = [
      [`"STOCK AUDIT REPORT"`],
      [`"Vegetable Name:"`, `"${historyModalItem.name}"`],
      [`"Report Period:"`, `"${historyStartDate} to ${historyEndDate}"`],
      [`"Generated On:"`, `"${new Date().toLocaleString()}"`],
      [], // blank line
      [`"--- 1. DAILY SUMMARY ---"`],
      ["Date", "Opening Stock", "Total Restocked", "Total Sold", "Closing Stock"],
    ]

    // 1. Daily Summary Table
    rows.forEach((r) => {
      csvRows.push([
        `"\t${r.date}"`,
        `"${r.opening_display}"`,
        `"${r.restocked_display || "0 g"}"`,
        `"${r.sold_display || "0 g"}"`,
        `"${r.closing_display}"`,
      ])
    })

    csvRows.push([]) // blank line
    csvRows.push([`"--- 2. DETAILED TRANSACTION AUDIT LOG ---"`])
    csvRows.push(["Date", "Time", "Action", "Quantity Change", "Balance After", "Reason / Booking Reference"])

    // 2. Transaction Audit Log Table
    let hasMovements = false
    rows.forEach((r) => {
      if (r.movements && r.movements.length > 0) {
        hasMovements = true
        r.movements.forEach((m) => {
          csvRows.push([
            `"\t${r.date}"`,
            `"${m.time}"`,
            `"${m.type_display}"`,
            `"${m.delta_display}"`,
            `"${m.balance_after_display}"`,
            `"${(m.reason || m.booking_ref || "—").replace(/"/g, '""')}"`,
          ])
        })
      }
    })

    if (!hasMovements) {
      csvRows.push([`"\t${historyStartDate}"`, '"—"', '"No Activity"', '"0 g"', '"—"', '"No transactions recorded in this period"'])
    }

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Stock_Report_${historyModalItem.name.replace(/[^a-zA-Z0-9]/g, '_')}_${historyStartDate}_to_${historyEndDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    if (!historyModalItem) return
    const rows = historyByProduct[historyModalItem.product_id] || []
    if (rows.length === 0) {
      alert("No data to export.")
      return
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Please allow popups to download/print PDF report.")
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Audit Report - ${historyModalItem.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; color: #0f172a; }
            .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .day-card { border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; overflow: hidden; page-break-inside: avoid; }
            .day-header { background: #f8fafc; padding: 10px 14px; font-size: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
            th { background: #ffffff; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; }
            .delta-pos { color: #16a34a; font-weight: bold; }
            .delta-neg { color: #dc2626; font-weight: bold; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1>Vegetable Stock Audit Report: ${historyModalItem.name}</h1>
              <div class="meta">Date Range: <b>${historyStartDate}</b> to <b>${historyEndDate}</b> | Generated at: ${new Date().toLocaleString()}</div>
            </div>
          </div>
          ${rows.map((r) => `
            <div class="day-card">
              <div class="day-header">
                <span>Date: ${r.date}</span>
                <span>Opening: ${r.opening_display} | Restocked: ${r.restocked_display || "0 g"} | Sold: ${r.sold_display || "0 g"} | Closing: ${r.closing_display}</span>
              </div>
              ${r.movements && r.movements.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Change</th>
                      <th>Balance After</th>
                      <th>Reason / Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${r.movements.map((m) => `
                      <tr>
                        <td>${m.time}</td>
                        <td><b>${m.type_display}</b></td>
                        <td class="${m.delta_grams >= 0 ? "delta-pos" : "delta-neg"}">${m.delta_display}</td>
                        <td><b>${m.balance_after_display}</b></td>
                        <td>${m.reason || m.booking_ref || "—"}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              ` : `<div style="padding: 10px; text-align: center; color: #94a3b8; font-size: 11px;">No stock movements on this date</div>`}
            </div>
          `).join("")}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleSubmitRestock = async (e) => {
    e.preventDefault()
    if (!actionQty || parseFloat(actionQty) <= 0) {
      setActionError("Please enter a valid positive quantity.")
      return
    }
    setSubmitting(true)
    setActionError("")
    try {
      const res = await dispatch(restockVegetable({
        productId: restockModalItem.product_id,
        quantity: parseFloat(actionQty),
        unit: actionUnit,
      })).unwrap()
      setRestockModalItem(null)
    } catch (err) {
      setActionError(err || "Failed to restock vegetable.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAdjust = async (e) => {
    e.preventDefault()
    if (actionQty === "" || parseFloat(actionQty) < 0) {
      setActionError("Please enter a valid quantity (0 or greater).")
      return
    }
    if (!actionReason.trim()) {
      setActionError("A reason is strictly required for stock adjustment.")
      return
    }
    setSubmitting(true)
    setActionError("")
    try {
      await dispatch(adjustVegetableStock({
        productId: adjustModalItem.product_id,
        quantity: parseFloat(actionQty),
        unit: actionUnit,
        reason: actionReason.trim(),
      })).unwrap()
      setAdjustModalItem(null)
    } catch (err) {
      setActionError(err || "Failed to adjust vegetable stock.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitSetDefault = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setActionError("")
    try {
      await dispatch(setDefaultDailyStock({
        productId: defaultModalItem.product_id,
        quantity: actionQty !== "" ? parseFloat(actionQty) : null,
        unit: actionUnit,
        applyNow: applyNow,
      })).unwrap()
      setDefaultModalItem(null)
    } catch (err) {
      setActionError(err || "Failed to update default daily stock.")
    } finally {
      setSubmitting(false)
    }
  }

  const renderStateBadge = (state) => {
    if (state === "in_stock") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          In Stock
        </span>
      )
    }
    if (state === "out_of_stock") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          Out of Stock
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        Not Tracked
      </span>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Sprout className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Vegetable Stock Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Manage daily vendor capacities, 4:00 AM auto-resets, and intra-day stock corrections.
            </p>
          </div>
        </div>

        <button
          onClick={() => dispatch(fetchVegetableStock())}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stock
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vegetable name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["all", "in_stock", "out_of_stock", "not_tracked"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer shrink-0 ${
                filterState === st
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Vegetable</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Today's Available</th>
                <th className="py-3 px-4">Default Daily Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredVegetables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                    No vegetables found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredVegetables.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            VEG
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{item.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{renderStateBadge(item.state)}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-800 text-sm">
                        {item.today_available_display}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">
                          {item.default_daily_display}
                        </span>
                        <button
                          onClick={() => handleOpenSetDefault(item)}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Configure Default Daily Stock"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRestock(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Restock
                        </button>
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Adjust
                        </button>
                        <button
                          onClick={() => handleOpenHistory(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                Restock: {restockModalItem.name}
              </h3>
              <button
                onClick={() => setRestockModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Additive restock adds directly to today's available stock.
            </p>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitRestock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Quantity to Add</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    placeholder="e.g. 10"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                  <select
                    value={actionUnit}
                    onChange={(e) => setActionUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Restocking..." : "Confirm Restock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                Correct Stock: {adjustModalItem.name}
              </h3>
              <button
                onClick={() => setAdjustModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Absolute stock set: Overwrites today's live stock to the exact value provided. A reason is strictly required.
            </p>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitAdjust} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">New Live Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    placeholder="e.g. 15"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <select
                    value={actionUnit}
                    onChange={(e) => setActionUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Adjustment</label>
                <textarea
                  required
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Physical inventory audit recount / produce spoilage"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Default Daily Stock Modal */}
      {defaultModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Default Daily Stock: {defaultModalItem.name}
              </h3>
              <button
                onClick={() => setDefaultModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Configure the default capacity that automatically resets every day at 4:00 AM IST. Leave blank to disable auto-reset.
            </p>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitSetDefault} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Default Daily Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    placeholder="e.g. 20 (leave blank to clear)"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <select
                    value={actionUnit}
                    onChange={(e) => setActionUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </div>

              {/* Apply now checkbox */}
              <div className="flex items-start gap-2.5 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                <input
                  type="checkbox"
                  id="apply_now_check"
                  checked={applyNow}
                  onChange={(e) => setApplyNow(e.target.checked)}
                  className="mt-0.5 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="apply_now_check" className="text-xs font-bold text-indigo-950 cursor-pointer">
                  Apply now to today's available stock
                  <span className="block text-[11px] font-medium text-indigo-700 mt-0.5">
                    Immediately resets today's live stock to this new default value.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDefaultModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Default"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Daily Stock History: {historyModalItem.name}
              </h3>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date Range Selector & Export Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <form onSubmit={handleApplyCustomDateRange} className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-600">From:</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-600">To:</label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Apply
                </button>
              </form>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  title="Download / Print PDF Report"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF Report
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
              {!(historyByProduct[historyModalItem.product_id]) || historyByProduct[historyModalItem.product_id].length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-slate-200">
                  No movement history available for this vegetable.
                </div>
              ) : (
                historyByProduct[historyModalItem.product_id].map((row) => (
                  <div key={row.date} className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    {/* Day Summary Header */}
                    <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {row.date}
                      </div>
                      <div className="flex items-center gap-3 font-semibold text-[11px]">
                        <span className="text-slate-600">Opening: <b className="text-slate-900 font-bold">{row.opening_display}</b></span>
                        <span className="text-emerald-700 font-bold">Restocked: {row.restocked_display || '0 g'}</span>
                        <span className="text-amber-700 font-bold">Sold: {row.sold_display || '0 g'}</span>
                        <span className="text-indigo-900 font-bold">Closing: {row.closing_display}</span>
                      </div>
                    </div>

                    {/* Intraday Movements Breakdown */}
                    {row.movements && row.movements.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                            <th className="py-1.5 px-3">Time</th>
                            <th className="py-1.5 px-3">Action</th>
                            <th className="py-1.5 px-3">Change (Delta)</th>
                            <th className="py-1.5 px-3">Balance After</th>
                            <th className="py-1.5 px-3">Reason / Ref</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {row.movements.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{m.time}</td>
                              <td className="py-2 px-3 font-bold">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  m.type === 'RESTOCK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  m.type === 'DAILY_RESET' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                  m.type === 'SOLD' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {m.type_display}
                                </span>
                              </td>
                              <td className={`py-2 px-3 font-bold ${m.delta_grams >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {m.delta_display}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-800">{m.balance_after_display}</td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">
                                {m.reason || (m.booking_ref ? `Booking: ${m.booking_ref}` : '—')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-2.5 text-center text-slate-400 text-[11px] italic bg-white">
                        No intraday stock movements recorded on this day.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryModalItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
