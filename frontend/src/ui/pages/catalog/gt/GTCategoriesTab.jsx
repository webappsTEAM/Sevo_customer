import React, { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, RefreshCw, ShieldCheck, Layers, AlertTriangle } from "lucide-react"
import { Button, Input, Modal, Select, TextArea } from "../../../components/kit.jsx"
import {
  fetchAdminGoodsCategories,
  createAdminGoodsCategory,
  updateAdminGoodsCategory,
  deleteAdminGoodsCategory,
} from "../../../../api/logisticsAdminService.js"

const EMPTY_CAT_FORM = {
  name: "",
  slug: "",
  icon: "package",
  description: "",
  info_banner: "",
  allows_two_wheeler: true,
  min_vehicle_class: "any",
  order: 0,
  is_prohibited: false,
  is_active: true,
}

export function GTCategoriesTab({ showToast }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [editingCat, setEditingCat] = useState(null)
  const [formData, setFormData] = useState(EMPTY_CAT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reason, setReason] = useState("")

  const loadCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetchAdminGoodsCategories({
      search,
      is_active: activeFilter,
    })
    if (res.ok) {
      setCategories(res.categories)
    } else {
      showToast(res.error?.message || "Failed to load goods categories", "error")
    }
    setLoading(false)
  }, [search, activeFilter, showToast])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const openCreateModal = () => {
    setEditingCat("new")
    setFormData({ ...EMPTY_CAT_FORM, order: categories.length * 10 })
    setFormError("")
    setReason("")
  }

  const openEditModal = (cat) => {
    setEditingCat(cat)
    setFormData({
      name: cat.name || "",
      slug: cat.slug || "",
      icon: cat.icon || "package",
      description: cat.description || "",
      info_banner: cat.info_banner || "",
      allows_two_wheeler: cat.allows_two_wheeler ?? true,
      min_vehicle_class: cat.min_vehicle_class || "any",
      order: cat.order || 0,
      is_prohibited: cat.is_prohibited ?? false,
      is_active: cat.is_active ?? true,
    })
    setFormError("")
    setReason("")
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError("Category name is required.")
      return
    }
    setSaving(true)
    setFormError("")

    if (editingCat === "new") {
      const res = await createAdminGoodsCategory({ ...formData, reason })
      if (res.ok) {
        showToast("Goods category created successfully")
        setEditingCat(null)
        loadCategories()
      } else {
        setFormError(res.error?.message || "Failed to create category")
      }
    } else {
      const res = await updateAdminGoodsCategory(editingCat.id, formData, reason)
      if (res.ok) {
        showToast("Goods category updated successfully")
        setEditingCat(null)
        loadCategories()
      } else {
        setFormError(res.error?.message || "Failed to update category")
      }
    }
    setSaving(false)
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to deactivate the category "${cat.name}"?`)) return
    const res = await deleteAdminGoodsCategory(cat.id, "Deactivated from Admin GT Hub")
    if (res.ok) {
      showToast("Category deactivated successfully")
      loadCategories()
    } else {
      showToast(res.error?.message || "Failed to deactivate category", "error")
    }
  }

  return (
    <div className="space-y-5">
      {/* Action and Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search category name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
          <Button variant="ghost" onClick={loadCategories} disabled={loading} className="py-2">
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Button onClick={openCreateModal} className="py-2">
          <Plus size={15} className="mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Info Callout */}
      <div className="bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-200">
        <span className="font-bold">Dynamic Category &amp; Banner Customization:</span> Categories with slugs starting with{" "}
        <code className="bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded font-mono text-[11px]">pm-</code> (e.g.{" "}
        <code className="font-mono">pm-bedrooms</code>, <code className="font-mono">pm-cartons</code>) feed the Packers &amp; Movers inventory stepper.
        The <span className="font-bold">Info Banner</span> field controls the top guide banner (e.g. &ldquo;What we pack in Bedrooms&rdquo;).
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3.5">Category</th>
                <th className="px-4 py-3.5">Slug</th>
                <th className="px-4 py-3.5">Info Banner</th>
                <th className="px-4 py-3.5 text-center">2-Wheeler</th>
                <th className="px-4 py-3.5 text-center">Items</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading goods categories…
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No goods categories found matching filter.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs">
                          {cat.icon || "📦"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{cat.name}</div>
                          {cat.description && (
                            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{cat.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {cat.info_banner ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium">
                          {cat.info_banner}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Default</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          cat.allows_two_wheeler
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {cat.allows_two_wheeler ? "Yes" : "Truck only"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {cat.item_count ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          cat.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Category"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                          title="Deactivate Category"
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

      {/* Add / Edit Modal */}
      {editingCat && (
        <Modal
          title={editingCat === "new" ? "Add Goods Category" : `Edit Category — ${editingCat.name}`}
          onClose={() => setEditingCat(null)}
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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bedrooms, Electronics"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Slug (unique)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. pm-bedrooms, electronics"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Info Banner (Customer P&amp;M Step 2 banner)
              </label>
              <input
                type="text"
                value={formData.info_banner}
                onChange={(e) => setFormData({ ...formData, info_banner: e.target.value })}
                placeholder="e.g. What we pack in Bedrooms (Beds, wardrobes, mattresses...)"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Displayed in the green information box right under the category tabs in customer inventory selection.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Icon Key</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g. bed, box, kitchen, sofa"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Optional description shown in category pickers"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-4 py-2 border-y border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.allows_two_wheeler}
                  onChange={(e) => setFormData({ ...formData, allows_two_wheeler: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Allows Two-Wheeler
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Active (Visible to Customers)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-600 dark:text-rose-400">
                <input
                  type="checkbox"
                  checked={formData.is_prohibited}
                  onChange={(e) => setFormData({ ...formData, is_prohibited: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                Prohibited Category
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Reason for Change (Audit Trail)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Updated info banner for P&M bedroom items"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingCat(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingCat === "new" ? "Create Category" : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
