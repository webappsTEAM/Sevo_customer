import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Pencil, Trash2, Search, RefreshCw, AlertTriangle, Check, ShieldAlert } from "lucide-react"
import { Button, Modal } from "../../../components/kit.jsx"
import {
  fetchAdminGoodsItems,
  createAdminGoodsItem,
  updateAdminGoodsItem,
  deleteAdminGoodsItem,
  fetchAdminGoodsCategories,
} from "../../../../api/logisticsAdminService.js"

const EMPTY_ITEM_FORM = {
  name: "",
  slug: "",
  category: "",
  subcategory: "",
  unit: "piece",
  default_weight_kg: "5.00",
  default_cft: "3.00",
  is_fragile: false,
  is_two_wheeler_compatible: true,
  special_handling_charge: "0.00",
  order: 0,
  is_prohibited: false,
  is_active: true,
}

export function GTItemsTab({ showToast }) {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState("")
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState(EMPTY_ITEM_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reason, setReason] = useState("")

  const loadCategories = useCallback(async () => {
    const res = await fetchAdminGoodsCategories()
    if (res.ok) {
      setCategories(res.categories)
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    const res = await fetchAdminGoodsItems({
      category: selectedCat,
      search,
      is_active: activeFilter,
    })
    if (res.ok) {
      setItems(res.items)
    } else {
      showToast(res.error?.message || "Failed to load goods items", "error")
    }
    setLoading(false)
  }, [selectedCat, search, activeFilter, showToast])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Extract all existing unique subcategories for autocompletion
  const existingSubcategories = useMemo(() => {
    const set = new Set()
    items.forEach((it) => {
      if (it.subcategory) set.add(it.subcategory.trim())
    })
    return Array.from(set).sort()
  }, [items])

  const openCreateModal = () => {
    setEditingItem("new")
    setFormData({
      ...EMPTY_ITEM_FORM,
      category: selectedCat || (categories[0]?.id ? String(categories[0].id) : ""),
      order: items.length * 10,
    })
    setFormError("")
    setReason("")
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      slug: item.slug || "",
      category: item.category?.id ? String(item.category.id) : String(item.category_id || ""),
      subcategory: item.subcategory || "",
      unit: item.unit || "piece",
      default_weight_kg: String(item.default_weight_kg || "5.00"),
      default_cft: String(item.default_cft || "3.00"),
      is_fragile: item.is_fragile ?? false,
      is_two_wheeler_compatible: item.is_two_wheeler_compatible ?? true,
      special_handling_charge: String(item.special_handling_charge || "0.00"),
      order: item.order || 0,
      is_prohibited: item.is_prohibited ?? false,
      is_active: item.is_active ?? true,
    })
    setFormError("")
    setReason("")
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError("Item name is required.")
      return
    }
    if (!formData.category) {
      setFormError("Category is required.")
      return
    }
    const wt = parseFloat(formData.default_weight_kg)
    if (isNaN(wt) || wt <= 0) {
      setFormError("Weight must be a positive number.")
      return
    }
    const cft = parseFloat(formData.default_cft)
    if (isNaN(cft) || cft <= 0) {
      setFormError("Volume in CFT must be a positive number.")
      return
    }

    setSaving(true)
    setFormError("")

    if (editingItem === "new") {
      const res = await createAdminGoodsItem({ ...formData, reason })
      if (res.ok) {
        showToast("Goods item created successfully")
        setEditingItem(null)
        loadItems()
      } else {
        setFormError(res.error?.message || "Failed to create item")
      }
    } else {
      const res = await updateAdminGoodsItem(editingItem.id, formData, reason)
      if (res.ok) {
        showToast("Goods item updated successfully")
        setEditingItem(null)
        loadItems()
      } else {
        setFormError(res.error?.message || "Failed to update item")
      }
    }
    setSaving(false)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    const res = await deleteAdminGoodsItem(item.id, "Deactivated from Admin GT Hub")
    if (res.ok) {
      showToast("Item deactivated successfully")
      loadItems()
    } else {
      showToast(res.error?.message || "Failed to deactivate item", "error")
    }
  }

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search item, subcategory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <Button variant="ghost" onClick={loadItems} disabled={loading} className="py-2">
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Button onClick={openCreateModal} className="py-2">
          <Plus size={15} className="mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Helper Callout */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200">
        <span className="font-bold">Dynamic Subcategories &amp; Fitment:</span> The{" "}
        <span className="font-bold">Subcategory</span> field (e.g. &ldquo;Bed&rdquo;, &ldquo;Chair&rdquo;, &ldquo;Cabinet &amp; Storage&rdquo;, &ldquo;Table&rdquo;)
        organizes items into nested expandable accordions in the customer Packers &amp; Movers inventory selector.
        Weight and CFT volume dictate automated vehicle fitment (Tata Ace, 8ft Pickup, etc.).
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3.5">Item Name</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Subcategory</th>
                <th className="px-4 py-3.5 text-right">Weight (kg)</th>
                <th className="px-4 py-3.5 text-right">Vol (CFT)</th>
                <th className="px-4 py-3.5 text-center">Badges</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    Loading cargo &amp; inventory items…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No goods items found matching filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.unit || "piece"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.category?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                      {item.subcategory ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                          {item.subcategory}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">General</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {parseFloat(item.default_weight_kg || 0).toFixed(1)} kg
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {parseFloat(item.default_cft || 0).toFixed(1)} CFT
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {item.is_fragile && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold">
                            Fragile
                          </span>
                        )}
                        {item.is_two_wheeler_compatible && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 text-[10px] font-bold">
                            2W
                          </span>
                        )}
                        {parseFloat(item.special_handling_charge || 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-bold">
                            +₹{item.special_handling_charge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Item"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                          title="Deactivate Item"
                        >
                          <Trash2 size={15} />
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

      {/* Add / Edit Item Modal */}
      {editingItem && (
        <Modal
          title={editingItem === "new" ? "Add Goods / Inventory Item" : `Edit Item — ${editingItem.name}`}
          onClose={() => setEditingItem(null)}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Item Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. King Size Bed, Office Chair"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Subcategory (Accordion Group)
                </label>
                <input
                  type="text"
                  list="subcategories-list"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="e.g. Bed, Chair, Cabinet & Storage"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
                <datalist id="subcategories-list">
                  {existingSubcategories.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Items with the same subcategory are grouped into accordions in P&amp;M inventory.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. piece, box, set"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.default_weight_kg}
                  onChange={(e) => setFormData({ ...formData, default_weight_kg: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Volume (CFT) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.default_cft}
                  onChange={(e) => setFormData({ ...formData, default_cft: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Special Handling (₹)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.special_handling_charge}
                  onChange={(e) => setFormData({ ...formData, special_handling_charge: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 py-2 border-y border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_fragile}
                  onChange={(e) => setFormData({ ...formData, is_fragile: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Fragile Item
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_two_wheeler_compatible}
                  onChange={(e) => setFormData({ ...formData, is_two_wheeler_compatible: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Two-Wheeler Compatible
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Active
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-600 dark:text-rose-400">
                <input
                  type="checkbox"
                  checked={formData.is_prohibited}
                  onChange={(e) => setFormData({ ...formData, is_prohibited: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                Prohibited
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Reason for Change (Audit Trail)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Updated subcategory to 'Bed' for king bed item"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingItem(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingItem === "new" ? "Create Item" : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
