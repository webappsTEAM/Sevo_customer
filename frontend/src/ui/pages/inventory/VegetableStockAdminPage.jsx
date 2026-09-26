import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  fetchVegetableStock,
  restockVegetable,
  adjustVegetableStock,
  setDefaultDailyStock,
  fetchVegetableStockHistory,
  updateVegetableDetails,
} from "../../../store/inventorySlice.js"
import {
  Sprout, RefreshCw, PlusCircle, Edit3, Settings,
  History, CheckCircle2, AlertCircle, HelpCircle,
  X, Calendar, ArrowUpRight, ArrowDownRight, Search,
  Download, FileSpreadsheet, FileText, Tag, Percent,
  Scale, Layers, Save, SlidersHorizontal, ImageIcon
} from "lucide-react"
import ImageUploader from "../../components/ImageUploader.jsx"

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
  const [editDetailsModalItem, setEditDetailsModalItem] = useState(null)

  // Edit details form state
  const [editForm, setEditForm] = useState({
    image: "",
    price: "",
    offer_price: "",
    offer_percentage: "",
    vegetable_gram: "",
    opening_stock_quantity: "",
    opening_stock_unit: "kg",
    current_stock_quantity: "",
    current_stock_unit: "kg",
    restock_level_quantity: "",
    restock_level_unit: "kg",
    reorder_level_quantity: "",
    reorder_level_unit: "kg",
  })

  // Form states for simple modals
  const [actionQty, setActionQty] = useState("")
  const [actionUnit, setActionUnit] = useState("kg")
  const [actionReason, setActionReason] = useState("")
  const [applyNow, setApplyNow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState("")
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = "success") => {
    const id = Date.now()
    setToast({ msg, type, id })
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr))
    }, 4000)
  }

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

  // Open Edit Details Modal
  const handleOpenEditDetails = (item) => {
    setEditDetailsModalItem(item)
    setActionError("")

    const isCount = item.unit_basis === "COUNT"
    const defaultUnit = item.unit || (isCount ? "pcs" : "kg")

    // Parse values in kg or raw count units for ease of editing
    const currQty = item.today_available_grams != null
      ? (isCount ? item.today_available_grams.toString() : (item.today_available_grams / 1000).toString())
      : ""
    const opQty = item.opening_stock_grams != null
      ? (isCount ? item.opening_stock_grams.toString() : (item.opening_stock_grams / 1000).toString())
      : ""
    const rstkQty = item.restock_level_grams
      ? (isCount ? item.restock_level_grams.toString() : (item.restock_level_grams / 1000).toString())
      : ""
    const reorderQty = item.reorder_level_grams
      ? (isCount ? item.reorder_level_grams.toString() : (item.reorder_level_grams / 1000).toString())
      : ""

    const mrpVal = item.mrp ? Math.round(Number(item.mrp)).toString() : ""
    const priceVal = item.price ? Math.round(Number(item.price)).toString() : ""

    setEditForm({
      image: item.image || "",
      mrp: mrpVal,
      price: priceVal,
      offer_percentage: item.offer_percentage || "0",
      vegetable_gram: item.vegetable_gram || (isCount ? `1 ${defaultUnit}` : "500 g"),
      opening_stock_quantity: opQty,
      opening_stock_unit: defaultUnit,
      current_stock_quantity: currQty,
      current_stock_unit: defaultUnit,
      restock_level_quantity: rstkQty,
      restock_level_unit: defaultUnit,
      reorder_level_quantity: reorderQty,
      reorder_level_unit: defaultUnit,
    })
  }

  const handleMrpChange = (newMrp) => {
    setEditForm(prev => {
      const mrpNum = parseFloat(newMrp) || 0
      const priceNum = parseFloat(prev.price) || 0
      let pct = 0
      if (mrpNum > 0 && priceNum > 0 && mrpNum > priceNum) {
        pct = Math.round(((mrpNum - priceNum) / mrpNum) * 100)
      }
      return {
        ...prev,
        mrp: newMrp,
        offer_percentage: pct.toString(),
      }
    })
  }

  const handlePriceChange = (newPrice) => {
    setEditForm(prev => {
      const priceNum = parseFloat(newPrice) || 0
      const mrpNum = parseFloat(prev.mrp) || 0
      let pct = 0
      if (mrpNum > 0 && priceNum > 0 && mrpNum > priceNum) {
        pct = Math.round(((mrpNum - priceNum) / mrpNum) * 100)
      }
      return {
        ...prev,
        price: newPrice,
        offer_percentage: pct.toString(),
      }
    })
  }

  const handleSubmitEditDetails = async (e) => {
    e.preventDefault()
    if (!editDetailsModalItem) return
    setSubmitting(true)
    setActionError("")

    try {
      const payload = {
        image: (editForm.image || "").trim(),
        price: parseFloat(editForm.price) || 0,
        mrp: editForm.mrp !== "" ? parseFloat(editForm.mrp) : null,
        offer_percentage: parseFloat(editForm.offer_percentage) || 0,
        vegetable_gram: editForm.vegetable_gram.trim() || (editDetailsModalItem.unit_basis === "COUNT" ? "1 pc" : "500 g"),
        unit_basis: editDetailsModalItem.unit_basis || "WEIGHT",
        opening_stock_quantity: editForm.opening_stock_quantity !== "" ? parseFloat(editForm.opening_stock_quantity) : null,
        opening_stock_unit: editForm.opening_stock_unit,
        current_stock_quantity: editForm.current_stock_quantity !== "" ? parseFloat(editForm.current_stock_quantity) : null,
        current_stock_unit: editForm.current_stock_unit,
        restock_level_quantity: editForm.restock_level_quantity !== "" ? parseFloat(editForm.restock_level_quantity) : null,
        restock_level_unit: editForm.restock_level_unit,
        reorder_level_quantity: editForm.reorder_level_quantity !== "" ? parseFloat(editForm.reorder_level_quantity) : null,
        reorder_level_unit: editForm.reorder_level_unit,
      }

      const itemName = editDetailsModalItem.name
      await dispatch(updateVegetableDetails({
        productId: editDetailsModalItem.product_id,
        data: payload
      })).unwrap()

      setEditDetailsModalItem(null)
      showToast(`Stock and details for "${itemName}" updated successfully.`, "success")
      dispatch(fetchVegetableStock())
    } catch (err) {
      const msg = typeof err === "string" ? err : (err?.message || (err?.body ? (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) : "Failed to update vegetable details."))
      setActionError(msg)
      showToast(msg, "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handlers
  const handleOpenRestock = (item) => {
    setRestockModalItem(item)
    setActionQty("")
    setActionUnit(item.unit || (item.unit_basis === "COUNT" ? "pcs" : "kg"))
    setActionError("")
  }

  const handleOpenAdjust = (item) => {
    setAdjustModalItem(item)
    const isCount = item.unit_basis === "COUNT"
    const qty = item.today_available_grams != null
      ? (isCount ? item.today_available_grams.toString() : (item.today_available_grams / 1000).toString())
      : ""
    setActionQty(qty)
    setActionUnit(item.unit || (isCount ? "pcs" : "kg"))
    setActionReason("")
    setActionError("")
  }

  const handleOpenSetDefault = (item) => {
    setDefaultModalItem(item)
    const isCount = item.unit_basis === "COUNT"
    const qty = item.default_daily_grams != null
      ? (isCount ? item.default_daily_grams.toString() : (item.default_daily_grams / 1000).toString())
      : ""
    setActionQty(qty)
    setActionUnit(item.unit || (isCount ? "pcs" : "kg"))
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
              ` : `
                <div style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">
                  No intraday movements recorded on this date.
                </div>
              `}
            </div>
          `).join("")}
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  // Form Submissions
  const handleSubmitRestock = async (e) => {
    e.preventDefault()
    if (!restockModalItem) return
    setSubmitting(true)
    setActionError("")

    try {
      await dispatch(restockVegetable({
        productId: restockModalItem.product_id,
        quantity: parseFloat(actionQty),
        unit: actionUnit,
      })).unwrap()

      const itemName = restockModalItem.name
      setRestockModalItem(null)
      showToast(`Restocked ${actionQty} ${actionUnit} for "${itemName}".`, "success")
      dispatch(fetchVegetableStock())
    } catch (err) {
      const msg = err || "Failed to restock item."
      setActionError(msg)
      showToast(msg, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAdjust = async (e) => {
    e.preventDefault()
    if (!adjustModalItem) return
    if (!actionReason.trim()) {
      setActionError("A reason is required for manual stock adjustment.")
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

      const itemName = adjustModalItem.name
      setAdjustModalItem(null)
      showToast(`Adjusted stock to ${actionQty} ${actionUnit} for "${itemName}".`, "success")
      dispatch(fetchVegetableStock())
    } catch (err) {
      const msg = err || "Failed to adjust stock."
      setActionError(msg)
      showToast(msg, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitSetDefault = async (e) => {
    e.preventDefault()
    if (!defaultModalItem) return
    setSubmitting(true)
    setActionError("")

    try {
      await dispatch(setDefaultDailyStock({
        productId: defaultModalItem.product_id,
        quantity: actionQty !== "" ? parseFloat(actionQty) : null,
        unit: actionUnit,
        applyNow: applyNow,
      })).unwrap()

      const itemName = defaultModalItem.name
      setDefaultModalItem(null)
      showToast(`Default daily stock updated for "${itemName}".`, "success")
      dispatch(fetchVegetableStock())
    } catch (err) {
      const msg = err || "Failed to set default daily stock."
      setActionError(msg)
      showToast(msg, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const renderStateBadge = (state) => {
    switch (state) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            In Stock
          </span>
        )
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Out of Stock
          </span>
        )
      case "not_tracked":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5" />
            Not Tracked
          </span>
        )
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sprout className="w-6 h-6 text-emerald-600" />
            Vegetables Inventory & Pricing Matrix
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage live stock, opening balance, restock levels, pack weights, MRP pricing, and discount offers in real-time.
          </p>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer shrink-0 ${filterState === st
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Comprehensive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-3.5">Vegetable</th>
                <th className="py-3 px-3">Gram / Pack</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Offer (%)</th>
                <th className="py-3 px-3">Opening Stock</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-3">Reorder Level</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredVegetables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No vegetables found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredVegetables.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Vegetable Name & Slug */}
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                            VEG
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900 line-clamp-1">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono line-clamp-1">{item.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Vegetable Gram / Pack Size */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        <Scale className="w-3 h-3 text-slate-400" />
                        {item.vegetable_gram || "500 g"}
                      </span>
                    </td>

                    {/* 3. Price (Selling Price & Strikethrough MRP) */}
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          ₹{Math.round(Number(item.price || 0))}
                        </span>
                        {item.mrp && Number(item.mrp) > Number(item.price) && (
                          <span className="text-[10px] text-slate-400 line-through font-semibold ml-1.5">
                            ₹{Math.round(Number(item.mrp))}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Offer (%) */}
                    <td className="py-3 px-3">
                      {item.offer_percentage > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
                          <Percent className="w-3 h-3 text-amber-600" />
                          {item.offer_percentage}% OFF
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs">None</span>
                      )}
                    </td>

                    {/* 5. Opening Stock */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-700 text-xs">
                        {item.opening_stock_display || "—"}
                      </span>
                    </td>

                    {/* 6. Current Stock */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className="font-black text-slate-900 text-xs sm:text-sm block">
                          {item.today_available_display}
                        </span>
                        {renderStateBadge(item.state)}
                      </div>
                    </td>

                    {/* 7. Reorder Level */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-rose-700 text-xs">
                        {item.reorder_level_display || "—"}
                      </span>
                    </td>

                    {/* 10. Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Edit Full Details */}
                        <button
                          onClick={() => handleOpenEditDetails(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                          title="Edit Details & Pricing"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          Edit
                        </button>

                        {/* Restock */}
                        <button
                          onClick={() => handleOpenRestock(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition-colors cursor-pointer"
                          title="Quick Restock"
                        >
                          <PlusCircle className="w-3 h-3" />
                          Restock
                        </button>

                        {/* History */}
                        <button
                          onClick={() => handleOpenHistory(item)}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="View History Audit"
                        >
                          <History className="w-3.5 h-3.5" />
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

      {/* Edit Details & Pricing Modal */}
      {editDetailsModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                Edit Details: {editDetailsModalItem.name}
              </h3>
              <button
                onClick={() => setEditDetailsModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitEditDetails} className="overflow-y-auto space-y-4 pr-1">
              {/* Produce Image Uploader */}
              <ImageUploader
                label="Produce Image"
                description="Upload custom produce image or paste an image URL. Automatically converted to WebP."
                value={editForm.image}
                assetType="packages"
                fallbackSrc="/mockups/vegetables_realistic.png"
                aspectRatio="aspect-square"
                onChange={(url) => setEditForm(prev => ({ ...prev, image: url }))}
              />

              {/* Product Pricing & Pack Weight */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" /> Pricing & Unit Weight
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editForm.mrp}
                      onChange={(e) => handleMrpChange(e.target.value)}
                      placeholder="e.g. 55"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={editForm.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="e.g. 46"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Offer Discount (%)</label>
                    <div className="flex items-center h-[34px] px-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                      <span className="text-xs font-black text-amber-800">
                        {editForm.offer_percentage > 0 ? `${editForm.offer_percentage}% OFF` : "None"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Vegetable Gram (Pack)</label>
                    <input
                      type="text"
                      value={editForm.vegetable_gram}
                      onChange={(e) => setEditForm(prev => ({ ...prev, vegetable_gram: e.target.value }))}
                      placeholder="e.g. 500 g or 1 kg"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Capacities */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" /> Stock Configuration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Stock */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Stock</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={editForm.current_stock_quantity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, current_stock_quantity: e.target.value }))}
                        placeholder="Live Stock"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <select
                        value={editForm.current_stock_unit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, current_stock_unit: e.target.value }))}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      >
                        {editDetailsModalItem?.unit_basis === "COUNT" ? (
                          <>
                            <option value="pcs">pcs</option>
                            <option value="bunch">bunch</option>
                            <option value="packet">packet</option>
                            <option value="dozen">dozen</option>
                          </>
                        ) : (
                          <>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Reorder Level (Low stock threshold) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Reorder Level (Alert)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={editForm.reorder_level_quantity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reorder_level_quantity: e.target.value }))}
                        placeholder="Threshold"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <select
                        value={editForm.reorder_level_unit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reorder_level_unit: e.target.value }))}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                      >
                        {editDetailsModalItem?.unit_basis === "COUNT" ? (
                          <>
                            <option value="pcs">pcs</option>
                            <option value="bunch">bunch</option>
                            <option value="packet">packet</option>
                            <option value="dozen">dozen</option>
                          </>
                        ) : (
                          <>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditDetailsModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className="text-xs font-bold text-slate-700">
                  Quantity to Add ({actionUnit})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={restockModalItem.unit_basis === "COUNT" ? "1" : "any"}
                    min={restockModalItem.unit_basis === "COUNT" ? "1" : "0.001"}
                    required
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    placeholder={restockModalItem.unit_basis === "COUNT" ? "e.g. 10" : "e.g. 10.5"}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                  <select
                    value={actionUnit}
                    onChange={(e) => setActionUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {restockModalItem.unit_basis === "COUNT" ? (
                      <>
                        <option value="pcs">pcs</option>
                        <option value="bunch">bunch</option>
                        <option value="packet">packet</option>
                        <option value="dozen">dozen</option>
                      </>
                    ) : (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </>
                    )}
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
                <label className="text-xs font-bold text-slate-700">
                  New Live Quantity ({actionUnit})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={adjustModalItem.unit_basis === "COUNT" ? "1" : "any"}
                    min="0"
                    required
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    placeholder={adjustModalItem.unit_basis === "COUNT" ? "e.g. 15" : "e.g. 15.5"}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <select
                    value={actionUnit}
                    onChange={(e) => setActionUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {adjustModalItem.unit_basis === "COUNT" ? (
                      <>
                        <option value="pcs">pcs</option>
                        <option value="bunch">bunch</option>
                        <option value="packet">packet</option>
                        <option value="dozen">dozen</option>
                      </>
                    ) : (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </>
                    )}
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
              Configure the default baseline capacity. Leave blank to clear baseline.
            </p>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitSetDefault} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Default Daily Quantity ({actionUnit})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={defaultModalItem.unit_basis === "COUNT" ? "1" : "any"}
                    min="0"
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    placeholder={defaultModalItem.unit_basis === "COUNT" ? "e.g. 20 (leave blank to clear)" : "e.g. 20.5 (leave blank to clear)"}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <select
                    value={actionUnit}
                    onChange={(e) => setActionUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {defaultModalItem.unit_basis === "COUNT" ? (
                      <>
                        <option value="pcs">pcs</option>
                        <option value="bunch">bunch</option>
                        <option value="packet">packet</option>
                        <option value="dozen">dozen</option>
                      </>
                    ) : (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </>
                    )}
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
                    Immediately updates today's live stock to this baseline value.
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
                                  m.type === 'RESTOCK' || m.type === 'RESTOCKED_ON_RETURN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  m.type === 'RESTOCKED_ON_CANCELLATION' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                                  m.type === 'SOLD' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  m.type === 'RETURN_REPLACEMENT' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                  m.type === 'CLAIM_WRITEOFF' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  m.type === 'RETURN_WRITEOFF' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                  'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {m.type_display || m.type}
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

      {/* Toast Notification */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        {toast && (
          <div
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
