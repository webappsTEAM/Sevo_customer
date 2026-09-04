import React, { useEffect, useState, useMemo } from "react"
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp, Search,
  Truck, Wrench, Wind, Sparkles, Palette, Hammer, Carrot,
  Layers, Box, Tag, FolderOpen, Zap, Clock, Check,
  Package as PackageIcon
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Input, TextArea, Select, Modal } from "../../components/kit.jsx"
import ImageUploader from "../../components/ImageUploader.jsx"
import { resolveImageUrl } from "../../../utils/imageUrl.js"
import { useToast, ToastBanner } from "./useToast.jsx"

const SERVICE_SUBTABS = {
  "kitchen-cleaning": [
    { id: "packages", label: "Full Kitchen Packages" },
    { id: "appliance", label: "Single Appliance Cleaning" },
    { id: "cabinet_tile", label: "Cabinet & Tile Care" },
    { id: "addons", label: "Quick Extra Services" },
  ],
  "bathroom-cleaning": [
    { id: "packages", label: "Full Clean" },
    { id: "minis", label: "Quick Extra Services" },
    { id: "subscription", label: "Weekly Bathroom Cleaning Subscription" },
  ],
  "sofa-cleaning": [
    { id: "sofa", label: "Sofa Cleaning" },
    { id: "mattress", label: "Mattress Cleaning" },
    { id: "carpet", label: "Carpet Cleaning" },
    { id: "addons", label: "Quick Extra Services" },
  ],
  "full-house-cleaning": [
    { id: "full_apartment", label: "Occupied Apartment" },
    { id: "unoccupied_apartment", label: "Unoccupied Apartment" },
    { id: "full_bungalow", label: "Occupied Bungalow/duplex" },
    { id: "unoccupied_bungalow", label: "Unoccupied Bungalow/duplex" },
    { id: "partial_home", label: "Quick Extra Services / Partial Home" },
  ],
  "cleaning": [
    { id: "full_apartment", label: "Occupied Apartment" },
    { id: "unoccupied_apartment", label: "Unoccupied Apartment" },
    { id: "full_bungalow", label: "Occupied Bungalow/duplex" },
    { id: "unoccupied_bungalow", label: "Unoccupied Bungalow/duplex" },
    { id: "partial_home", label: "Quick Extra Services / Partial Home" },
  ],
  "ants-bed-bugs-control": [
    { id: "bedbugs", label: "Bedbugs Control" },
    { id: "ants", label: "Ants Control" },
  ],
  "cockroach-control": [
    { id: "cockroach", label: "Cockroach Control" },
    { id: "termite", label: "Termite Control" },
  ],
  "termite-control": [
    { id: "cockroach", label: "Cockroach Control" },
    { id: "termite", label: "Termite Control" },
  ],
}

const EMPTY_SERVICE = {
  name: "",
  slug: "",
  category: "",
  description: "",
  icon: "",
  image: "",
  is_active: true,
  sort_order: 0
}

// Minimalist theme mapping for the 6 Core Specialized Pillars + Vegetables
const CATEGORY_THEMES = {
  goods_transports: {
    icon: Truck,
    bg: "bg-blue-50/70 border-blue-100 text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200/60"
  },
  electrician_plumbing_carpentry: {
    icon: Wrench,
    bg: "bg-blue-50/70 border-blue-100 text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200/60"
  },
  ac_appliance: {
    icon: Wind,
    bg: "bg-sky-50/70 border-sky-100 text-sky-600",
    badge: "bg-sky-50 text-sky-700 border-sky-200/60"
  },
  home_pest_control: {
    icon: Sparkles,
    bg: "bg-indigo-50/70 border-indigo-100 text-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200/60"
  },
  paintings: {
    icon: Palette,
    bg: "bg-purple-50/70 border-purple-100 text-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200/60"
  },
  mason: {
    icon: Hammer,
    bg: "bg-amber-50/70 border-amber-100 text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-200/60"
  },
  vegetables_groceries: {
    icon: Carrot,
    bg: "bg-blue-50/70 border-blue-100 text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200/60"
  }
}

// All package data is loaded live from /settings/catalog/v2/packages/ — nothing hardcoded here.


export function CatalogServicesPage() {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [dbPackages, setDbPackages] = useState([])
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(new Set())
  const [expandedServiceIds, setExpandedServiceIds] = useState(new Set(["carpentry"]))
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [toast, showToast] = useToast()

  const loadCategories = async () => {
    try {
      const res = await apiRequest("/settings/catalog/v2/categories/")
      if (res.success) setCategories(res.data)
    } catch {
      /* handled */
    }
  }

  const loadServices = async () => {
    setLoading(true)
    try {
      const [svcRes, pkgRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/services/"),
        apiRequest("/settings/catalog/v2/packages/").catch(() => ({ success: false, data: [] }))
      ])
      if (svcRes.success) setServices(svcRes.data)
      if (pkgRes.success) setDbPackages(pkgRes.data)
    } catch {
      showToast("Failed to load services", "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
    loadServices()
  }, [])

  // Toggle category expansion
  const toggleCategory = (catId) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }

  // Toggle service packages drawer expansion
  const toggleServicePackages = (serviceKey) => {
    setExpandedServiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(serviceKey)) {
        next.delete(serviceKey)
      } else {
        next.add(serviceKey)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedCategoryIds(new Set(categories.map((c) => c.id)))
  }

  const collapseAll = () => {
    setExpandedCategoryIds(new Set())
  }

  // Group services by category & filter out legacy duplicate rows
  const servicesByCategory = useMemo(() => {
    const map = {}
    services.forEach((s) => {
      const catId = s.category || s.category_id
      if (!map[catId]) map[catId] = []

      // In Electrician, Plumbing & Carpentry pillar: ensure ONLY Electrician, Plumber, Carpentry are listed
      const catObj = categories.find((c) => c.id === catId)
      if (catObj && catObj.slug === "electrician_plumbing_carpentry") {
        if (["electrical", "plumbing", "carpentry-services"].includes(s.slug)) {
          return
        }
      }

      if (catObj && catObj.slug === "home_pest_control") {
        if (["general", "security"].includes(s.slug)) {
          return
        }
      }

      map[catId].push(s)
    })
    return map
  }, [services, categories])

  // Filtered categories based on search & filter
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return categories.filter((cat) => {
      if (categoryFilter && String(cat.id) !== String(categoryFilter)) return false
      if (!q) return true

      const catMatch =
        cat.name.toLowerCase().includes(q) || (cat.description && cat.description.toLowerCase().includes(q))
      const catServices = servicesByCategory[cat.id] || []
      const serviceMatch = catServices.some(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      )
      return catMatch || serviceMatch
    })
  }, [categories, categoryFilter, searchQuery, servicesByCategory])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...editing }
      const res = editing.id
        ? await apiRequest(`/settings/catalog/v2/services/${editing.id}/`, { method: "PUT", json: payload })
        : await apiRequest("/settings/catalog/v2/services/", { method: "POST", json: payload })
      if (res.success) {
        showToast(editing.id ? "Service updated successfully" : "Service created successfully")
        setEditing(null)
        loadServices()
        if (payload.category) {
          setExpandedCategoryIds((prev) => new Set([...prev, Number(payload.category)]))
        }
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const handleDelete = async (svc) => {
    if (!window.confirm(`Delete sub-service "${svc.name}"? This action will remove it from the catalog.`)) return
    try {
      const res = await apiRequest(`/settings/catalog/v2/services/${svc.id}/`, { method: "DELETE" })
      if (res.success) {
        showToast("Service deleted")
        loadServices()
      } else {
        showToast(res.message || "Delete blocked", "error")
      }
    } catch {
      showToast("Delete failed", "error")
    }
  }

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name }))
  ]

  // Always use live DB packages — no hardcoded fallbacks
  const getPackagesForService = (svc) => {
    const dbPkgs = dbPackages.filter((p) => p.service === svc.id || p.service_id === svc.id)
    return dbPkgs.map((p) => ({
      id: p.id,
      categoryName: svc.name,
      name: p.name,
      tag: p.tag || (p.popular ? "Popular" : "Standard"),
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
      price: `\u20b9${p.base_price}`,
      duration: p.duration || "1 hr",
      description: p.description,
      includes: Array.isArray(p.includes) ? p.includes : [],
      image: p.image || svc.image
    }))
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto font-sans text-slate-800 space-y-5">
      <ToastBanner toast={toast} />

      {/* ── Top Header Bar ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-indigo-700 text-[11px] font-medium mb-1.5 border border-indigo-200/60">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Enterprise Service Pillars &amp; Catalog
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Services Catalog
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Click the down arrow on any category pillar to view and customize its sub-services and packages.
            </p>
          </div>

          {/* Add Service Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setEditing({
                  ...EMPTY_SERVICE,
                  category: categoryFilter || (categories[0]?.id ?? "")
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search categories or sub-services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="w-44 shrink-0 hidden sm:block">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Categories Accordion List ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading catalog pillars &amp; services…</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-sm">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-slate-800">No categories or services found</h3>
          <p className="text-xs text-slate-400 mt-0.5">Try refining your search query or category filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCategoryIds.has(cat.id)
            const catServices = servicesByCategory[cat.id] || []
            const theme = CATEGORY_THEMES[cat.slug] || {
              icon: Layers,
              bg: "bg-slate-50 border-slate-100 text-slate-600",
              badge: "bg-slate-50 text-slate-700 border-slate-200/60"
            }
            const IconComponent = theme.icon

            return (
              <div
                key={cat.id}
                className={`bg-white rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "shadow-sm border-slate-300 ring-1 ring-slate-200/60"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* ── Main Category Header Row ── */}
                <div
                  onClick={() => toggleCategory(cat.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3.5 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left Icon & Pillar Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${theme.bg} shadow-xs`}
                    >
                      <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight truncate">
                          {cat.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/50">
                          {catServices.length} {catServices.length === 1 ? "Sub-service" : "Sub-services"}
                        </span>
                        {cat.is_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-indigo-700 border border-indigo-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Active Pillar
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-500 font-normal mt-0.5 truncate max-w-xl">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Down Arrow */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...EMPTY_SERVICE,
                          category: String(cat.id)
                        })
                      }
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Sub-Service</span>
                    </button>

                    {/* Down Arrow Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isExpanded
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Sub-Services Expandable Panel ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-3.5 sm:p-4 space-y-2.5 animate-in fade-in duration-150">
                    {catServices.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200 p-4">
                        <Box className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-medium text-slate-600">No sub-services configured for {cat.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Add sub-services to display them in the customer booking flow.</p>
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...EMPTY_SERVICE,
                              category: String(cat.id)
                            })
                          }
                          className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add First Sub-Service
                        </button>
                      </div>
                    ) : (
                      catServices.map((svc) => {
                        const packages = getPackagesForService(svc)
                        const hasPackages = packages.length > 0
                        const isServiceExpanded = expandedServiceIds.has(svc.slug) || expandedServiceIds.has(String(svc.id))

                        return (
                          <div
                            key={svc.id}
                            className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
                          >
                            {/* Sub-Service Header Row */}
                            <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                              <div
                                onClick={() => setEditing(svc)}
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-50/80 text-indigo-700 flex items-center justify-center shrink-0 font-semibold text-xs border border-indigo-100/60">
                                  {svc.name.charAt(0)}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                                      {svc.name}
                                    </span>
                                    <code className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200/50">
                                      {svc.slug}
                                    </code>
                                    {hasPackages && (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                                        {packages.length} Packages / Options
                                      </span>
                                    )}
                                  </div>
                                  {svc.description && (
                                    <p className="text-xs text-slate-400 font-normal mt-0.5 truncate max-w-xl">
                                      {svc.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Status Pill */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                    svc.is_active
                                      ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                      : "bg-slate-100 text-slate-600 border border-slate-200/60"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      svc.is_active ? "bg-blue-600" : "bg-slate-400"
                                    }`}
                                  />
                                  {svc.is_active ? "Active" : "Inactive"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setEditing(svc)}
                                  title="Edit Service"
                                  className="p-1 rounded-md hover:bg-indigo-50 text-slate-400 hover:text-indigo-700 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(svc)}
                                  title="Delete Service"
                                  className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {hasPackages && (
                                  <button
                                    type="button"
                                    onClick={() => toggleServicePackages(svc.slug)}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ml-0.5 ${
                                      isServiceExpanded
                                        ? "bg-slate-100 text-slate-800"
                                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {isServiceExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* ── Nested Packages / Offerings Grid ── */}
                            {hasPackages && isServiceExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 sm:p-4">
                                <div className="flex items-center justify-between mb-2.5">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <PackageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                    {svc.name} Packages &amp; Service Options
                                  </h4>
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    {packages.length} configured offerings
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {packages.map((pkg, idx) => (
                                    <div
                                      key={pkg.id || idx}
                                      className="bg-white rounded-lg p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors group"
                                    >
                                      <div>
                                        {/* Header: Title, Category pill & Badge */}
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                          <div>
                                            {pkg.categoryName && (
                                              <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block mb-1">
                                                {pkg.categoryName}
                                              </span>
                                            )}
                                            <h5 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                              {pkg.name}
                                            </h5>
                                          </div>

                                          {pkg.tag && (
                                            <span
                                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                                                pkg.tagColor || "bg-blue-50 text-blue-700 border-blue-200/70"
                                              }`}
                                            >
                                              {pkg.tag}
                                            </span>
                                          )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-slate-500 font-normal leading-relaxed mb-2.5">
                                          {pkg.description}
                                        </p>

                                        {/* Price & Duration */}
                                        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 mb-2.5 pb-2.5 border-b border-slate-100">
                                          <span className="text-xs font-semibold text-slate-900">
                                            {pkg.price}
                                          </span>
                                          {pkg.duration && (
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-normal">
                                              <Clock className="w-3 h-3 text-slate-400" />
                                              {pkg.duration}
                                            </span>
                                          )}
                                        </div>

                                        {/* Inclusions checklist */}
                                        {pkg.includes && pkg.includes.length > 0 && (
                                          <ul className="space-y-1 text-xs text-slate-600 font-normal">
                                            {pkg.includes.map((inc, i) => (
                                              <li key={i} className="flex items-center gap-1.5">
                                                <Check className="w-3 h-3 text-indigo-600 shrink-0 stroke-[2]" />
                                                <span className="truncate">{inc}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Edit / New Service Modal ── */}
      {editing && (
        <Modal
          title={editing.id ? `Edit Sub-Service: ${editing.name}` : "Create New Sub-Service"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-3.5 font-sans text-left">
            <Select
              label="Parent Category Pillar"
              required
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              value={String(editing.category || "")}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Sub-Service Name"
                required
                placeholder="e.g. Truck, Plumber, Carpentry, Electrician"
                value={editing.name}
                onChange={(e) => {
                  const val = e.target.value
                  const autoSlug = !editing.id
                    ? val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                    : editing.slug
                  setEditing({ ...editing, name: val, slug: autoSlug })
                }}
              />
              <Input
                label="Slug Identifier"
                required
                placeholder="e.g. truck, plumber, carpentry, electrician"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </div>
            {!SERVICE_SUBTABS[editing.slug] && (
              <>
                <TextArea
                  label="Short Description"
                  placeholder="Brief summary of this service shown in catalog & customer booking..."
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    label="Icon Name"
                    placeholder="e.g. Truck, Wrench, Wind"
                    value={editing.icon || ""}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  />
                  <Input
                    label="Display Sort Order"
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>

                {/* Service Image Section */}
                <ImageUploader
                  label="Service Image"
                  description="Upload a custom service image or paste an image URL. Automatically compressed to WebP."
                  value={editing.image || ""}
                  assetType="services"
                  aspectRatio="aspect-[16/9]"
                  onChange={(url) => setEditing({ ...editing, image: url })}
                />
              </>
            )}

            {/* Sub-tab Banner Images Customizer Section */}
            {editing.slug && SERVICE_SUBTABS[editing.slug] && (
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 my-3 text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Sub-tab Banner Images</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Customize the top banner image for each sub-tab. You can also add or rename tabs.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const tabs = [...(editing.customization?.subtabs || SERVICE_SUBTABS[editing.slug] || [])];
                      const newId = `tab_${Date.now()}`;
                      tabs.push({ id: newId, label: `New Tab (${tabs.length + 1})` });
                      setEditing({
                        ...editing,
                        customization: {
                          ...(editing.customization || {}),
                          subtabs: tabs
                        }
                      });
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white text-[11px] font-black rounded-lg border-none cursor-pointer"
                  >
                    + Add New Tab
                  </button>
                </div>
                <div className="space-y-3.5">
                  {(editing.customization?.subtabs || SERVICE_SUBTABS[editing.slug] || []).map((subtab, idx) => {
                    const currentVal = editing.customization?.subtab_banners?.[subtab.id] || "";
                    return (
                      <div key={subtab.id || idx} className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-3 justify-start">
                          <input
                            type="checkbox"
                            checked={subtab.enabled !== false}
                            onChange={(e) => {
                              const tabs = [...(editing.customization?.subtabs || SERVICE_SUBTABS[editing.slug] || [])];
                              tabs[idx] = { ...tabs[idx], enabled: e.target.checked };
                              setEditing({
                                ...editing,
                                customization: {
                                  ...(editing.customization || {}),
                                  subtabs: tabs
                                }
                              });
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={subtab.label}
                            onChange={(e) => {
                              const tabs = [...(editing.customization?.subtabs || SERVICE_SUBTABS[editing.slug] || [])];
                              tabs[idx] = { ...tabs[idx], label: e.target.value };
                              setEditing({
                                ...editing,
                                customization: {
                                  ...(editing.customization || {}),
                                  subtabs: tabs
                                }
                              });
                            }}
                            className="flex-1 px-2.5 py-1 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-slate-50 hover:bg-white focus:bg-white"
                          />
                        </div>
                        <ImageUploader
                          compact={true}
                          label="Banner Image"
                          assetType="banners"
                          value={currentVal}
                          onChange={(url) => {
                            const updatedBanners = { ...(editing.customization?.subtab_banners || {}) };
                            if (url) {
                              updatedBanners[subtab.id] = url;
                            } else {
                              delete updatedBanners[subtab.id];
                            }
                            setEditing({
                              ...editing,
                              customization: {
                                ...(editing.customization || {}),
                                subtabs: editing.customization?.subtabs || SERVICE_SUBTABS[editing.slug] || [],
                                subtab_banners: updatedBanners
                              }
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={!!editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span>Active in Customer Portal</span>
            </label>

            <div className="flex gap-2.5 justify-end mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                {editing.id ? "Save Changes" : "Create Service"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
