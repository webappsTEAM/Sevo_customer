import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Wrench, Zap, Settings, Flame, Fan, Shield, CheckCircle2,
  Plus, Search, Edit2, Trash2, Save, RotateCcw, Check,
  AlertCircle, Loader2, DollarSign, Layers, X, Database,
  FolderPlus, AlertTriangle
} from "lucide-react"
import {
  fetchACRateCategories,
  createACRateCategory,
  updateACRateCategory,
  deleteACRateCategory,
  fetchACRateItems,
  createACRateItem,
  updateACRateItem,
  deleteACRateItem,
  fetchACConfigDB,
  updateACConfigDB,
  resetACDefaultsDB,
} from "../../../services/estimation/acInspectionData.js"

const CATEGORY_ICONS = {
  installation: Wrench,
  electrical: Zap,
  minor: Settings,
  gas_refrigeration: Flame,
  fans_motors: Fan,
  other_parts: Shield,
  adjustment_basic: CheckCircle2,
}

export function ACInspectionRateCardPage() {
  // Database States
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [config, setConfig] = useState(null)

  // UI States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Filters
  const [selectedCatId, setSelectedCatId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Item Add/Edit Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemFormCategory, setItemFormCategory] = useState("")
  const [itemFormName, setItemFormName] = useState("")
  const [itemFormPrice, setItemFormPrice] = useState("")
  const [itemFormUnit, setItemFormUnit] = useState("fixed")
  const [itemFormServiceType, setItemFormServiceType] = useState("SPARE_PART")
  const [itemFormDesc, setItemFormDesc] = useState("")
  const [itemFormOrder, setItemFormOrder] = useState(0)
  const [itemFormActive, setItemFormActive] = useState(true)

  // Category Add/Edit Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [catFormName, setCatFormName] = useState("")
  const [catFormSlug, setCatFormSlug] = useState("")
  const [catFormDesc, setCatFormDesc] = useState("")
  const [catFormOrder, setCatFormOrder] = useState(0)
  const [catFormActive, setCatFormActive] = useState(true)

  // Diagnostic Fee editing
  const [diagnosticFeeInput, setDiagnosticFeeInput] = useState("199")

  const showToast = (text, type = "success") => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load all data from PostgreSQL
  const loadDatabaseData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [catsRes, itemsRes, configRes] = await Promise.all([
        fetchACRateCategories(),
        fetchACRateItems(),
        fetchACConfigDB(),
      ])

      if (catsRes?.success && Array.isArray(catsRes.data)) {
        setCategories(catsRes.data)
      } else {
        throw new Error(catsRes?.error || "Failed to load categories")
      }

      if (itemsRes?.success && Array.isArray(itemsRes.data)) {
        setItems(itemsRes.data)
      } else {
        throw new Error(itemsRes?.error || "Failed to load rate items")
      }

      if (configRes?.success && configRes.data) {
        setConfig(configRes.data)
        setDiagnosticFeeInput(String(configRes.data.diagnostic_fee || "199"))
      }
    } catch (err) {
      console.error("Database load error:", err)
      setError("Unable to load current rate card.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDatabaseData()
  }, [loadDatabaseData])

  // Diagnostic Fee Blur Save
  const handleDiagnosticFeeSave = async () => {
    const feeNum = parseFloat(diagnosticFeeInput)
    if (isNaN(feeNum) || feeNum < 0) {
      showToast("Diagnostic fee must be a valid non-negative number.", "error")
      setDiagnosticFeeInput(String(config?.diagnostic_fee || "199"))
      return
    }

    if (config && Number(config.diagnostic_fee) === feeNum) {
      return // No change
    }

    setSaving(true)
    try {
      const res = await updateACConfigDB({ diagnostic_fee: feeNum })
      if (res?.success && res.data) {
        setConfig(res.data)
        setDiagnosticFeeInput(String(res.data.diagnostic_fee))
        showToast(`Diagnostic fee updated to ₹${res.data.diagnostic_fee}!`)
      } else {
        throw new Error(res?.error || "Failed to update diagnostic fee")
      }
    } catch (err) {
      console.error("Fee update error:", err)
      showToast(err?.message || "Failed to update diagnostic fee", "error")
    } finally {
      setSaving(false)
    }
  }

  // Reset Defaults Handler
  const handleResetDefaults = async () => {
    const confirmed = window.confirm(
      "Reset all AC inspection rate items to the standard default catalog?\n\nExisting quotations will not be affected."
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const res = await resetACDefaultsDB()
      if (res?.success) {
        showToast(res.message || "Rate card restored to default catalog items!")
        await loadDatabaseData()
      } else {
        throw new Error(res?.error || "Failed to reset defaults")
      }
    } catch (err) {
      console.error("Reset defaults error:", err)
      showToast(err?.message || "Unable to reset defaults", "error")
    } finally {
      setSaving(false)
    }
  }

  // Open Add Item Modal
  const openAddItemModal = (categoryId = null) => {
    setEditingItem(null)
    const targetCat = categoryId || (selectedCatId !== "all" ? selectedCatId : categories[0]?.id)
    setItemFormCategory(targetCat || "")
    setItemFormName("")
    setItemFormPrice("")
    setItemFormUnit("fixed")
    setItemFormServiceType("SPARE_PART")
    setItemFormDesc("")
    setItemFormOrder(items.length + 1)
    setItemFormActive(true)
    setIsItemModalOpen(true)
  }

  // Open Edit Item Modal
  const openEditItemModal = (item) => {
    setEditingItem(item)
    setItemFormCategory(item.category)
    setItemFormName(item.name)
    setItemFormPrice(String(item.price))
    setItemFormUnit(item.unit || "fixed")
    setItemFormServiceType(item.service_type || "SPARE_PART")
    setItemFormDesc(item.description || "")
    setItemFormOrder(item.display_order || 0)
    setItemFormActive(item.is_active !== false)
    setIsItemModalOpen(true)
  }

  // Submit Add / Edit Item
  const handleSaveItemModal = async (e) => {
    e.preventDefault()
    if (!itemFormName.trim()) {
      showToast("Item name is required", "error")
      return
    }

    const priceNum = parseFloat(itemFormPrice)
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("Please enter a valid price (>= 0)", "error")
      return
    }

    setSaving(true)
    try {
      const payload = {
        category: itemFormCategory,
        name: itemFormName.trim(),
        price: priceNum.toFixed(2),
        unit: itemFormUnit,
        service_type: itemFormServiceType,
        description: itemFormDesc.trim(),
        display_order: Number(itemFormOrder) || 0,
        is_active: Boolean(itemFormActive),
      }

      let res
      if (editingItem) {
        res = await updateACRateItem(editingItem.id, payload)
      } else {
        res = await createACRateItem(payload)
      }

      if (res?.success) {
        showToast(
          editingItem
            ? `Updated "${itemFormName}" successfully!`
            : `Added "${itemFormName}" successfully!`
        )
        setIsItemModalOpen(false)
        await loadDatabaseData()
      } else {
        throw new Error(res?.error || "Failed to save item")
      }
    } catch (err) {
      console.error("Item save error:", err)
      showToast(err?.message || "Error saving item", "error")
    } finally {
      setSaving(false)
    }
  }

  // Delete / Deactivate Item
  const handleDeleteItem = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.name}"?\n\nIf this item has existing inspection quotes, it will be safely deactivated to protect historical records.`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const res = await deleteACRateItem(item.id)
      if (res?.success) {
        if (res.data?.deactivated) {
          showToast(`"${item.name}" is in use and was deactivated.`)
        } else {
          showToast(`Deleted "${item.name}" successfully!`)
        }
        await loadDatabaseData()
      } else {
        throw new Error(res?.error || "Failed to delete item")
      }
    } catch (err) {
      console.error("Delete error:", err)
      showToast(err?.message || "Error deleting item", "error")
    } finally {
      setSaving(false)
    }
  }

  // Open Category Add/Edit Modal
  const openAddCategoryModal = () => {
    setEditingCategory(null)
    setCatFormName("")
    setCatFormSlug("")
    setCatFormDesc("")
    setCatFormOrder(categories.length + 1)
    setCatFormActive(true)
    setIsCategoryModalOpen(true)
  }

  const openEditCategoryModal = (cat) => {
    setEditingCategory(cat)
    setCatFormName(cat.name)
    setCatFormSlug(cat.slug)
    setCatFormDesc(cat.description || "")
    setCatFormOrder(cat.display_order || 0)
    setCatFormActive(cat.is_active !== false)
    setIsCategoryModalOpen(true)
  }

  // Save Category
  const handleSaveCategoryModal = async (e) => {
    e.preventDefault()
    if (!catFormName.trim()) {
      showToast("Category name is required", "error")
      return
    }

    setSaving(true)
    try {
      const slugVal = catFormSlug.trim() || catFormName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      const payload = {
        name: catFormName.trim(),
        slug: slugVal,
        description: catFormDesc.trim(),
        display_order: Number(catFormOrder) || 0,
        is_active: Boolean(catFormActive),
      }

      let res
      if (editingCategory) {
        res = await updateACRateCategory(editingCategory.id, payload)
      } else {
        res = await createACRateCategory(payload)
      }

      if (res?.success) {
        showToast(
          editingCategory
            ? `Updated category "${catFormName}" successfully!`
            : `Created category "${catFormName}" successfully!`
        )
        setIsCategoryModalOpen(false)
        await loadDatabaseData()
      } else {
        throw new Error(res?.error || "Failed to save category")
      }
    } catch (err) {
      console.error("Category save error:", err)
      showToast(err?.message || "Error saving category", "error")
    } finally {
      setSaving(false)
    }
  }

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    const confirmed = window.confirm(
      `Delete or deactivate category "${cat.name}"?\n\nIf it contains items or historical quotation records, it will be safely deactivated.`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const res = await deleteACRateCategory(cat.id)
      if (res?.success) {
        showToast(res.message || `Category "${cat.name}" updated successfully!`)
        await loadDatabaseData()
      } else {
        throw new Error(res?.error || "Failed to delete category")
      }
    } catch (err) {
      console.error("Delete category error:", err)
      showToast(err?.message || "Error deleting category", "error")
    } finally {
      setSaving(false)
    }
  }

  // Filtered categories & items
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return categories.map((cat) => {
      if (selectedCatId !== "all" && String(cat.id) !== String(selectedCatId) && cat.slug !== selectedCatId) {
        return null
      }

      const catItems = items.filter((item) => {
        if (item.category !== cat.id) return false
        if (!q) return true
        return (
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          String(item.price).includes(q)
        )
      })

      if (q && catItems.length === 0) return null

      return {
        ...cat,
        matchedItems: catItems,
      }
    }).filter(Boolean)
  }, [categories, items, selectedCatId, searchQuery])

  // Helper formatting price
  const formatPrice = (priceVal) => {
    const num = parseFloat(priceVal)
    if (isNaN(num) || num === 0) return "Free"
    return `₹${num.toLocaleString("en-IN")}`
  }

  // Error view (Requirement 11)
  if (error && !loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-black text-slate-900">
            {error}
          </h2>
          <p className="text-xs text-slate-500 max-w-md">
            The system could not retrieve the rate card. Please check your network connection and server status.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDatabaseData}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs font-bold text-slate-500">
          Loading rate card...
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-black flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                AC Inspection &amp; Spare Parts Rate Card
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase">
                SUPER ADMIN
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Live &amp; Synchronized</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage diagnostic visit fees, service categories, and spare parts pricing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openAddCategoryModal}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={loadDatabaseData}
            disabled={saving}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Top Config Cards: Diagnostic Fee + Categories + Total Spares */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Diagnostic Fee Card (Loaded from ACInspectionConfiguration DB model) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Diagnostic Fee
            </span>
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Doorstep Visit
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">₹</span>
            <input
              type="number"
              min="0"
              step="1"
              value={diagnosticFeeInput}
              onChange={(e) => setDiagnosticFeeInput(e.target.value)}
              onBlur={handleDiagnosticFeeSave}
              className="text-2xl font-black text-slate-900 w-32 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="Click outside to save changes"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Charged upfront to book an inspection visit. Deducted from the final repair bill.
          </p>
        </div>

        {/* Categories Metric Card (Computed strictly from DB) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Rate Card Categories
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {categories.length} Categories
          </div>
          <p className="text-[11px] text-slate-400 leading-snug truncate" title={categories.map(c => c.name).join(", ")}>
            {categories.map((c) => c.name).join(", ") || "No categories configured yet"}
          </p>
        </div>

        {/* Total Listed Items Card (Computed strictly from DB) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Listed Spares &amp; Services
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {items.length} Items
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Standard prices displayed to customers and technicians during inspection.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search part name or price (e.g. PCB, Capacitor, Fan, ₹1,500)..."
              className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <button
            type="button"
            onClick={() => openAddItemModal()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rate Item</span>
          </button>
        </div>

        {/* Category Pills (Dynamic from DB) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <button
            type="button"
            onClick={() => setSelectedCatId("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCatId === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug] || Wrench
            const isSelected = String(selectedCatId) === String(cat.id) || selectedCatId === cat.slug
            const count = items.filter((i) => i.category === cat.id).length

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Categories & Items List */}
      <div className="space-y-6">
        {filteredData.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] || Wrench
          const catItems = cat.matchedItems || []

          return (
            <div key={cat.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Category Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 to-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        {cat.name}
                      </h3>
                      {!cat.is_active && (
                        <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {catItems.length} {catItems.length === 1 ? "item" : "items"} available
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCategoryModal(cat)}
                    className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit Category</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddItemModal(cat.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to {cat.name}</span>
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="divide-y divide-slate-100">
                {catItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    No items in this category. Click &ldquo;Add to {cat.name}&rdquo; above to add one.
                  </div>
                ) : (
                  catItems.map((item) => {
                    const priceFormatted = formatPrice(item.price)
                    const isFree = priceFormatted === "Free"

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors ${
                          !item.is_active ? "opacity-60 bg-slate-50/40" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                              {item.name}
                            </span>
                            {!item.is_active && (
                              <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Inactive
                              </span>
                            )}
                            {item.unit && item.unit !== "fixed" && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({item.unit})
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isFree ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black">
                              Free
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-xs font-black">
                              {priceFormatted}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit Rate Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingItem ? "Edit Rate Card Item" : "Add Rate Card Item"}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={itemFormCategory}
                  onChange={(e) => setItemFormCategory(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Item / Spare Part Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  placeholder="e.g. Inverter PCB Repair"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={itemFormUnit}
                    onChange={(e) => setItemFormUnit(e.target.value)}
                    placeholder="e.g. fixed, per piece"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={itemFormServiceType}
                    onChange={(e) => setItemFormServiceType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="SPARE_PART">Spare Part</option>
                    <option value="LABOR">Labor</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={itemFormOrder}
                    onChange={(e) => setItemFormOrder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Optional Note / Description
                </label>
                <input
                  type="text"
                  value={itemFormDesc}
                  onChange={(e) => setItemFormDesc(e.target.value)}
                  placeholder="e.g. Standard indoor & outdoor mounting"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="itemFormActive"
                  checked={itemFormActive}
                  onChange={(e) => setItemFormActive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="itemFormActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Item is Active (visible to customers &amp; technicians)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? "Save Changes" : "Add Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingCategory ? "Edit Category" : "Add Rate Category"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="e.g. Electrical Parts"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Slug (Identifier)
                </label>
                <input
                  type="text"
                  value={catFormSlug}
                  onChange={(e) => setCatFormSlug(e.target.value)}
                  placeholder="e.g. electrical_parts"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value)}
                  placeholder="Short description of this category"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={catFormOrder}
                  onChange={(e) => setCatFormOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catFormActive"
                  checked={catFormActive}
                  onChange={(e) => setCatFormActive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="catFormActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Category is Active
                </label>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(editingCategory)}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Deactivate Category
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Floating Save / Sync Bar */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-1.5 pr-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">
            Live Pricing Active
          </span>
        </div>
        <button
          type="button"
          onClick={loadDatabaseData}
          disabled={saving}
          className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{saving ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </div>
  )
}

export default ACInspectionRateCardPage
