import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  FolderOpen, Plus, Search, Edit3, Trash2, CheckCircle2,
  XCircle, Layers, Sprout, ArrowUpDown, RefreshCw, AlertCircle,
  ExternalLink, Sparkles, Image as ImageIcon, ShieldCheck,
  ChevronDown, ChevronRight, CornerDownRight, Subtitles
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"
import { routes } from "../../routes.js"
import ImageUploader from "../../components/ImageUploader.jsx"

export default function VegetableAdminCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // all, active, inactive

  // Tree Expand/Collapse State
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteModalCategory, setDeleteModalCategory] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  // Form State
  const [formData, setFormData] = useState({
    parent: null,
    name: "",
    slug: "",
    description: "",
    image: "",
    sort_order: 1,
    is_active: true,
  })

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiRequest("/inventory/vegetable-categories/?status=APPROVED")
      const list = res?.data?.data || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      setCategories(list)

      // Default expand all top-level categories that have subcategories
      const topLevelsWithSubs = list.filter(c => !c.parent && ((c.subcategories_count || 0) > 0 || (c.subcategories && c.subcategories.length > 0)))
      setExpandedIds(new Set(topLevelsWithSubs.map(c => c.id)))
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load categories."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const toggleExpand = (catId) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const handleOpenCreate = (parentId = null) => {
    setEditingCategory(null)
    setFormData({
      parent: parentId,
      name: "",
      slug: "",
      description: "",
      image: "",
      sort_order: (categories.length || 0) + 1,
      is_active: true,
    })
    setFormError("")
    setModalOpen(true)
  }

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat)
    setFormData({
      parent: cat.parent || null,
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      image: cat.image || "",
      sort_order: cat.sort_order || 1,
      is_active: cat.is_active !== false,
    })
    setFormError("")
    setModalOpen(true)
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError("Category name is required.")
      return
    }

    try {
      setFormSubmitting(true)
      setFormError("")
      const payload = {
        ...formData,
        parent: formData.parent ? parseInt(formData.parent) : null,
      }

      if (editingCategory) {
        // Update
        const res = await apiRequest(`/inventory/vegetable-categories/${editingCategory.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        })
        await fetchCategories()
      } else {
        // Create (direct admin creation is auto-approved)
        const res = await apiRequest("/inventory/vegetable-categories/", {
          method: "POST",
          body: JSON.stringify({ ...payload, status: "APPROVED" }),
          headers: { "Content-Type": "application/json" },
        })
        await fetchCategories()
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(extractApiErrorMessage(err, "Failed to save category."))
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteModalCategory) return
    try {
      setFormSubmitting(true)
      await apiRequest(`/inventory/vegetable-categories/${deleteModalCategory.id}/`, {
        method: "DELETE",
      })
      await fetchCategories()
      setDeleteModalCategory(null)
    } catch (err) {
      alert(extractApiErrorMessage(err, "Failed to delete category."))
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleActive = async (cat) => {
    try {
      const nextActive = !cat.is_active
      await apiRequest(`/inventory/vegetable-categories/${cat.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextActive }),
        headers: { "Content-Type": "application/json" },
      })
      await fetchCategories()
    } catch (err) {
      alert(extractApiErrorMessage(err, "Failed to toggle status."))
    }
  }

  // Build childrenByParent map for recursive tree
  const childrenByParent = categories.reduce((acc, c) => {
    const pId = typeof c.parent === "object" ? c.parent?.id : c.parent
    if (pId) {
      if (!acc[pId]) acc[pId] = []
      acc[pId].push(c)
    }
    return acc
  }, {})

  // Top-level categories
  const topLevelCategories = categories.filter(c => !c.parent)

  // Helper to find all descendant IDs of a category
  const getDescendantIds = (catId) => {
    const desc = new Set()
    const stack = [catId]
    while (stack.length > 0) {
      const curr = stack.pop()
      const kids = childrenByParent[curr] || []
      for (const k of kids) {
        if (!desc.has(k.id)) {
          desc.add(k.id)
          stack.push(k.id)
        }
      }
    }
    return desc
  }

  // Filter matching logic: category matches if itself or any descendant matches search/status
  const isMatch = (cat) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query ||
      (cat.name || "").toLowerCase().includes(query) ||
      (cat.slug || "").toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && cat.is_active) ||
      (statusFilter === "inactive" && !cat.is_active)

    if (matchesSearch && matchesStatus) return true

    const kids = childrenByParent[cat.id] || []
    return kids.some(k => isMatch(k))
  }

  // Filter top-level categories
  const filteredTopLevelCategories = topLevelCategories.filter(cat => isMatch(cat))

  // Calculate totals
  const totalTopLevel = topLevelCategories.length
  const totalSubcategories = categories.filter(c => c.parent).length
  const totalVegs = categories.reduce((sum, c) => sum + (c.direct_vegetables_count || c.vegetables_count || 0), 0)

  // Options for the Parent selector dropdown in modal (exclude self and descendants)
  const descendantIds = editingCategory ? getDescendantIds(editingCategory.id) : new Set()
  const eligibleParentOptions = categories.filter(c => {
    if (editingCategory) {
      if (c.id === editingCategory.id) return false
      if (descendantIds.has(c.id)) return false
    }
    return true
  }).sort((a, b) => (a.full_path || a.name).localeCompare(b.full_path || b.name))

  // Recursive Category Row Renderer
  const renderCategoryRow = (cat, depth = 0) => {
    if (!isMatch(cat)) return null

    const children = childrenByParent[cat.id] || []
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(cat.id)

    return (
      <React.Fragment key={cat.id}>
        <tr className={`hover:bg-muted/30 transition-colors ${depth === 0 ? "bg-card/60" : "bg-muted/10 border-t border-border/40"}`}>
          {/* Expand / Collapse Chevron */}
          <td className="py-3.5 px-3 text-center">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(cat.id)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <div className="w-4 h-4 mx-auto text-muted-foreground/30 flex items-center justify-center font-mono text-[10px]">
                •
              </div>
            )}
          </td>

          {/* Category Name & Indentation */}
          <td className="py-3.5 px-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
              {depth > 0 && (
                <div className="text-teal-600/60 dark:text-teal-400/60 shrink-0">
                  <CornerDownRight size={15} />
                </div>
              )}

              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className={`${depth === 0 ? "w-9 h-9 rounded-xl" : "w-7 h-7 rounded-lg"} object-cover bg-muted border border-border/80 shrink-0`}
                />
              ) : (
                <div className={`${depth === 0 ? "w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-sm" : "w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs"} flex items-center justify-center font-bold shrink-0`}>
                  {cat.name.charAt(0)}
                </div>
              )}

              <div>
                <div className="font-bold text-foreground text-sm flex items-center gap-2 flex-wrap">
                  <span>{cat.name}</span>
                  {hasChildren ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                      {children.length} {children.length === 1 ? "subcategory" : "subcategories"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                      Leaf Category
                    </span>
                  )}
                  {depth > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      Level {depth + 1}
                    </span>
                  )}
                </div>
                {cat.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                    {cat.description}
                  </p>
                )}
              </div>
            </div>
          </td>

          {/* Slug */}
          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
            {cat.slug}
          </td>

          {/* Subcategories Count */}
          <td className="py-3.5 px-4">
            {hasChildren ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-500/20">
                <Layers size={13} />
                <span>{children.length} subs</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </td>

          {/* Direct Produce Count */}
          <td className="py-3.5 px-4">
            <Link
              to={routes.inventory_vegetables}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <Sprout size={13} />
              <span>{cat.direct_vegetables_count || cat.vegetables_count || 0} direct produce</span>
            </Link>
          </td>

          {/* Status Toggle */}
          <td className="py-3.5 px-4">
            <button
              onClick={() => handleToggleActive(cat)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                cat.is_active
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
              title="Click to toggle active status"
            >
              {cat.is_active ? (
                <>
                  <CheckCircle2 size={12} /> Active
                </>
              ) : (
                <>
                  <XCircle size={12} /> Inactive
                </>
              )}
            </button>
          </td>

          {/* Actions (+ Subcategory on EVERY row at any depth) */}
          <td className="py-3.5 px-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleOpenCreate(cat.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 text-xs font-bold border border-teal-500/20 transition-all cursor-pointer"
                title="Add subcategory under this category"
              >
                <Plus size={13} />
                <span>Subcategory</span>
              </button>

              <button
                onClick={() => handleOpenEdit(cat)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                title="Edit category"
              >
                <Edit3 size={15} />
              </button>

              <button
                onClick={() => setDeleteModalCategory(cat)}
                className="p-2 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Delete category"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </td>
        </tr>

        {/* Recursive rendering of direct children */}
        {hasChildren && isExpanded && children.map(child => renderCategoryRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <FolderOpen size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vegetable Categories</h1>
              <p className="text-sm text-muted-foreground">
                Manage top-level departments, subcategories, display hierarchy, and leaf product assignments.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={routes.vegetable_admin_categories_approval}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/20 transition-all cursor-pointer shadow-2xs"
          >
            <ShieldCheck size={16} />
            <span>Approval Queue</span>
          </Link>

          <button
            onClick={fetchCategories}
            className="p-2.5 rounded-xl border border-border/80 hover:bg-muted/80 text-foreground transition-all cursor-pointer"
            title="Refresh categories"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => handleOpenCreate(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-xs transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Top-Level Category</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top-Level Categories
          </div>
          <div className="text-2xl font-black text-foreground mt-1">
            {totalTopLevel}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Subcategories
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {totalSubcategories}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Active Online
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {categories.filter(c => c.is_active).length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Total Produce Items
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {totalVegs}
          </div>
        </div>
      </div>

      {/* Categories Tree Table Card */}
      <div className="rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories & subcategories..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-teal-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
            {["all", "active", "inactive"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "all" ? "All" : st === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading category hierarchy...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">
            <AlertCircle className="mx-auto mb-2" size={24} />
            <p className="font-semibold">{error}</p>
          </div>
        ) : filteredTopLevelCategories.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FolderOpen className="mx-auto mb-3 opacity-40" size={40} />
            <p className="font-bold text-base text-foreground">No categories found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Start by creating a top-level category manually or approve incoming vendor requests in the Approval Queue.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => handleOpenCreate(null)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                + Add First Category
              </button>
              <Link
                to={routes.vegetable_admin_categories_approval}
                className="px-4 py-2 rounded-xl border border-border text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer"
              >
                Check Approval Queue
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                  <th className="py-3.5 px-4">Category / Subcategory Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Subcategories</th>
                  <th className="py-3.5 px-4">Direct Produce</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTopLevelCategories.map((cat) => renderCategoryRow(cat, 0))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative z-10 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <FolderOpen size={20} />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {editingCategory
                      ? (editingCategory.parent ? "Edit Subcategory" : "Edit Category")
                      : (formData.parent ? "Create New Subcategory" : "Create New Category")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveCategory} className="space-y-4 text-xs font-semibold">
                {/* Parent Category Selector */}
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1">
                    Parent Category Hierarchy
                  </label>
                  <select
                    value={formData.parent || ""}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-teal-500 text-sm font-normal shadow-2xs cursor-pointer"
                  >
                    <option value="">None (Top-Level Category)</option>
                    {eligibleParentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        Under: {p.full_path || p.name} ({p.slug})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Categories with parent = None are Top-Level. Select any category as parent to nest under it at any depth.
                  </p>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1">
                    {formData.parent ? "Subcategory Name *" : "Category Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.parent ? "e.g. Tubers" : "e.g. Root Vegetables"}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-teal-500 text-sm font-normal shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1">Slug (URL identifier)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Leave blank to auto-generate"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-teal-500 text-sm font-mono font-normal shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the produce in this category..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-teal-500 text-sm font-normal shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1">Sort Order #</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-teal-500 text-xs font-normal shadow-2xs"
                  />
                </div>

                <div>
                  <ImageUploader
                    label="Category Image"
                    description="Upload a custom category image or paste an image URL."
                    value={formData.image}
                    assetType="catalog"
                    fallbackSrc="/mockups/vegetables_realistic.png"
                    aspectRatio="aspect-square"
                    onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="catActive"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="catActive" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                    Active & visible in customer catalog
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {formSubmitting ? "Saving..." : editingCategory ? "Save Changes" : (formData.parent ? "Create Subcategory" : "Create Category")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteModalCategory && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteModalCategory(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative z-10 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-600">
                <Trash2 size={24} />
                <h3 className="text-lg font-bold">
                  Delete {deleteModalCategory.parent ? "Subcategory" : "Category"}?
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to delete <strong>'{deleteModalCategory.name}'</strong>?
                {!deleteModalCategory.parent && subcategoriesByParent[deleteModalCategory.id]?.length > 0 && (
                  <span className="text-rose-600 block mt-1 font-semibold">
                    Warning: This will also delete all {subcategoriesByParent[deleteModalCategory.id].length} subcategories under it.
                  </span>
                )}
                <span className="block mt-1">
                  Any produce currently assigned will become uncategorized.
                </span>
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalCategory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={handleDeleteCategory}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                >
                  {formSubmitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
