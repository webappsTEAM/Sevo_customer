import React, { useEffect, useState, useMemo } from "react"
import {
  Plus, Edit2, Search, Truck, Wrench, Wind, Sparkles,
  Palette, Hammer, Carrot, Layers, Box, Tag, DollarSign,
  Clock, ShieldCheck, ChevronDown, ChevronUp, FolderOpen,
  Package as PackageIcon, Check, ArrowRight, Sparkle
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Input, TextArea, Select, Modal } from "../../components/kit.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const EMPTY_PACKAGE = {
  service: "",
  name: "",
  slug: "",
  description: "",
  base_price: "",
  duration: "",
  image: "",
  popular: false,
  tag: "",
  includes: "",
  excludes: "",
  payment_policy: "BOTH",
}

const STATUS_TONE = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  INACTIVE: "bg-amber-50 text-amber-700 border-amber-200/70",
  ARCHIVED: "bg-rose-50 text-rose-700 border-rose-200/70",
}

const NEXT_STATUSES = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["INACTIVE", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
}

const CATEGORY_THEMES = {
  goods_transports: {
    icon: Truck,
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-100/70 text-emerald-800 border-emerald-300/60",
    headerBg: "bg-gradient-to-r from-emerald-50/70 to-teal-50/50",
  },
  electrician_plumbing_carpentry: {
    icon: Wrench,
    bg: "bg-blue-50 border-blue-200 text-blue-700",
    badge: "bg-blue-100/70 text-blue-800 border-blue-300/60",
    headerBg: "bg-gradient-to-r from-blue-50/70 to-indigo-50/50",
  },
  ac_appliance: {
    icon: Wind,
    bg: "bg-cyan-50 border-cyan-200 text-cyan-700",
    badge: "bg-cyan-100/70 text-cyan-800 border-cyan-300/60",
    headerBg: "bg-gradient-to-r from-cyan-50/70 to-sky-50/50",
  },
  home_pest_control: {
    icon: Sparkles,
    bg: "bg-teal-50 border-teal-200 text-teal-700",
    badge: "bg-teal-100/70 text-teal-800 border-teal-300/60",
    headerBg: "bg-gradient-to-r from-teal-50/70 to-emerald-50/50",
  },
  paintings: {
    icon: Palette,
    bg: "bg-purple-50 border-purple-200 text-purple-700",
    badge: "bg-purple-100/70 text-purple-800 border-purple-300/60",
    headerBg: "bg-gradient-to-r from-purple-50/70 to-pink-50/50",
  },
  mason: {
    icon: Hammer,
    bg: "bg-amber-50 border-amber-200 text-amber-700",
    badge: "bg-amber-100/70 text-amber-800 border-amber-300/60",
    headerBg: "bg-gradient-to-r from-amber-50/70 to-orange-50/50",
  },
  vegetables_groceries: {
    icon: Carrot,
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-100/70 text-emerald-800 border-emerald-300/60",
    headerBg: "bg-gradient-to-r from-emerald-50/70 to-green-50/50",
  },
}

export function CatalogPackagesPage() {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(new Set(["goods_transports"]))
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [quickPriceEditing, setQuickPriceEditing] = useState(null)
  const [toast, showToast] = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [catRes, svcRes, pkgRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/categories/"),
        apiRequest("/settings/catalog/v2/services/"),
        apiRequest("/settings/catalog/v2/packages/"),
      ])
      if (catRes.success) setCategories(catRes.data)
      if (svcRes.success) setServices(svcRes.data)
      if (pkgRes.success) setPackages(pkgRes.data)
    } catch {
      showToast("Failed to load catalog data", "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleCategory = (catKey) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(catKey)) {
        next.delete(catKey)
      } else {
        next.add(catKey)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedCategoryIds(new Set(categories.map((c) => c.slug || String(c.id))))
  }

  const collapseAll = () => {
    setExpandedCategoryIds(new Set())
  }

  // Group packages by service and category
  const packagesByCategoryAndService = useMemo(() => {
    const map = {}
    const serviceMap = {}
    services.forEach((s) => {
      serviceMap[s.id] = s
    })

    packages.forEach((pkg) => {
      const svcId = pkg.service?.id || pkg.service || pkg.service_id
      const svc = serviceMap[svcId]
      const catId = svc ? svc.category || svc.category_id : null
      const cat = categories.find((c) => c.id === catId)
      const catKey = cat ? cat.slug || String(cat.id) : "other"

      if (!map[catKey]) map[catKey] = {}
      const svcName = svc ? svc.name : pkg.service_name || "General"
      if (!map[catKey][svcName]) map[catKey][svcName] = []
      map[catKey][svcName].push({ ...pkg, serviceObj: svc })
    })

    return map
  }, [packages, services, categories])

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return categories.filter((cat) => {
      const catKey = cat.slug || String(cat.id)
      if (categoryFilter && String(cat.id) !== String(categoryFilter) && cat.slug !== categoryFilter) {
        return false
      }
      if (!q) return true

      const catMatch =
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))

      const catPackagesObj = packagesByCategoryAndService[catKey] || {}
      const pkgMatch = Object.entries(catPackagesObj).some(([svcName, pkgs]) => {
        return (
          svcName.toLowerCase().includes(q) ||
          pkgs.some(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.tag && p.tag.toLowerCase().includes(q)) ||
              (p.description && p.description.toLowerCase().includes(q))
          )
        )
      })

      return catMatch || pkgMatch
    })
  }, [categories, categoryFilter, searchQuery, packagesByCategoryAndService])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...editing,
        includes:
          typeof editing.includes === "string"
            ? editing.includes.split(",").map((s) => s.trim()).filter(Boolean)
            : editing.includes,
        excludes:
          typeof editing.excludes === "string"
            ? editing.excludes.split(",").map((s) => s.trim()).filter(Boolean)
            : editing.excludes,
        offer_price: null,
      }
      const res = editing.id
        ? await apiRequest(`/settings/catalog/v2/packages/${editing.id}/`, {
            method: "PUT",
            json: payload,
          })
        : await apiRequest("/settings/catalog/v2/packages/", {
            method: "POST",
            json: payload,
          })
      if (res.success) {
        showToast(editing.id ? "Package updated successfully" : "Package created successfully")
        setEditing(null)
        loadData()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const handleQuickPriceSave = async (e) => {
    e.preventDefault()
    if (!quickPriceEditing) return
    try {
      const payload = {
        base_price: quickPriceEditing.base_price,
        offer_price: null,
      }
      const res = await apiRequest(`/settings/catalog/v2/packages/${quickPriceEditing.id}/`, {
        method: "PUT",
        json: payload,
      })
      if (res.success) {
        showToast(`Price updated for ${quickPriceEditing.name} to ₹${quickPriceEditing.base_price}`)
        setQuickPriceEditing(null)
        loadData()
      } else {
        showToast(res.message || "Price update failed", "error")
      }
    } catch {
      showToast("Price update failed", "error")
    }
  }

  const openEdit = (pkg) => {
    setEditing({
      ...pkg,
      includes: Array.isArray(pkg.includes) ? pkg.includes.join(", ") : "",
      excludes: Array.isArray(pkg.excludes) ? pkg.excludes.join(", ") : "",
    })
  }

  const handleTransition = async (pkg, newStatus) => {
    const reason = window.prompt(`Reason for moving "${pkg.name}" to ${newStatus}? (optional)`) || ""
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${pkg.id}/transition/`, {
        method: "POST",
        json: { status: newStatus, reason },
      })
      if (res.success) {
        showToast(`Package status updated to ${newStatus}`)
        loadData()
      } else {
        showToast(res.message || "Transition failed", "error")
      }
    } catch {
      showToast("Transition failed", "error")
    }
  }

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ]

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }} className="p-4 sm:p-6 max-w-5xl mx-auto font-sans text-slate-800">
      <ToastBanner toast={toast} />

      {/* ── Top Header Banner Card ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 mb-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200/80 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> 6 Core Specialized Pillars + Vegetables
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Service Packages &amp; Pricing
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
              Directly customize service prices and vehicle fares across Goods &amp; Transports and all pillars.
            </p>
          </div>

          {/* Add Package Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setEditing({
                  ...EMPTY_PACKAGE,
                  service: services[0]?.id ?? "",
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Add Package</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search packages, vehicles, or fares..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="w-52 shrink-0 hidden sm:block">
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
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Categories Accordion List ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading catalog packages &amp; fares…</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No categories or packages found</h3>
          <p className="text-xs text-slate-400 mt-0.5">Try refining your search query or category filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const catKey = cat.slug || String(cat.id)
            const isExpanded = expandedCategoryIds.has(catKey)
            const catPackagesObj = packagesByCategoryAndService[catKey] || {}
            const totalPackagesCount = Object.values(catPackagesObj).reduce(
              (acc, list) => acc + list.length,
              0
            )

            const theme = CATEGORY_THEMES[cat.slug] || {
              icon: Layers,
              bg: "bg-slate-50 border-slate-200 text-slate-700",
              badge: "bg-slate-100 text-slate-700 border-slate-200/60",
              headerBg: "bg-slate-50/50",
            }
            const IconComponent = theme.icon

            return (
              <div
                key={cat.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "shadow-md border-slate-300 ring-1 ring-slate-200/80"
                    : "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {/* ── Main Category Header Row ── */}
                <div
                  onClick={() => toggleCategory(catKey)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left Icon & Pillar Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${theme.bg} shadow-xs`}
                    >
                      <IconComponent className="w-5 h-5" strokeWidth={2} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                          {cat.name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                          {totalPackagesCount} {totalPackagesCount === 1 ? "Package" : "Packages"}
                        </span>
                        {cat.is_active && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Pillar
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 truncate max-w-xl">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Down Arrow */}
                  <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...EMPTY_PACKAGE,
                          service: services.find((s) => s.category === cat.id)?.id || "",
                        })
                      }
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Package</span>
                    </button>

                    {/* Down Arrow Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(catKey)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isExpanded
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Sub-Services & Packages Expandable Panel ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-[#FAFCFB] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                    {totalPackagesCount === 0 ? (
                      <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                        <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No packages configured for {cat.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Add packages to offer customizable pricing to customers.</p>
                      </div>
                    ) : (
                      Object.entries(catPackagesObj).map(([svcName, pkgList]) => (
                        <div
                          key={svcName}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
                        >
                          {/* Service Sub-Header */}
                          <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {svcName}
                              </span>
                              <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                {pkgList.length} {pkgList.length === 1 ? "option" : "options"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const svcObj = pkgList[0]?.serviceObj || services.find((s) => s.name === svcName)
                                setEditing({
                                  ...EMPTY_PACKAGE,
                                  service: svcObj ? String(svcObj.id) : "",
                                })
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Option
                            </button>
                          </div>

                          {/* Clean Single Price Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm border-collapse">
                              <thead>
                                <tr className="bg-white text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                  <th className="py-3 px-4 sm:px-5">Package / Vehicle</th>
                                  <th className="py-3 px-4">Starting Fare / Price</th>
                                  <th className="py-3 px-4">Status</th>
                                  <th className="py-3 px-4 sm:px-5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {pkgList.map((pkg) => (
                                  <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors group">
                                    {/* Package / Vehicle Name & Tag */}
                                    <td className="py-3.5 px-4 sm:px-5">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                            {pkg.name}
                                          </span>
                                          {pkg.tag && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              {pkg.tag}
                                            </span>
                                          )}
                                        </div>
                                        {pkg.description && (
                                          <p className="text-xs text-slate-400 font-normal truncate max-w-xs sm:max-w-md mt-0.5">
                                            {pkg.description}
                                          </p>
                                        )}
                                      </div>
                                    </td>

                                    {/* Single Price Column */}
                                    <td className="py-3.5 px-4">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xs">
                                        ₹{Number(pkg.base_price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                      </span>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3.5 px-4">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                          STATUS_TONE[pkg.status] || "bg-slate-100 text-slate-600 border-slate-200"
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            pkg.status === "ACTIVE"
                                              ? "bg-emerald-500"
                                              : pkg.status === "DRAFT"
                                              ? "bg-slate-400"
                                              : "bg-amber-500"
                                          }`}
                                        />
                                        {pkg.status}
                                      </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3.5 px-4 sm:px-5 text-right">
                                      <div className="inline-flex items-center gap-2">
                                        {/* Direct Customise Price Button */}
                                        <button
                                          type="button"
                                          onClick={() => setQuickPriceEditing(pkg)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-bold border border-emerald-200/80 shadow-xs transition-all cursor-pointer"
                                        >
                                          <DollarSign className="w-3.5 h-3.5" />
                                          <span>Edit Price</span>
                                        </button>

                                        {/* Status Transitions */}
                                        {(NEXT_STATUSES[pkg.status] || []).map((next) => (
                                          <button
                                            key={next}
                                            type="button"
                                            onClick={() => handleTransition(pkg, next)}
                                            className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                          >
                                            → {next}
                                          </button>
                                        ))}

                                        {/* Full Edit Modal */}
                                        <button
                                          type="button"
                                          onClick={() => openEdit(pkg)}
                                          title="Edit Package Details"
                                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Customise Price Modal ── */}
      {quickPriceEditing && (
        <Modal
          title={`Customise Fare: ${quickPriceEditing.name}`}
          onClose={() => setQuickPriceEditing(null)}
        >
          <form onSubmit={handleQuickPriceSave} className="flex flex-col gap-4 font-sans text-left">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1.5">
                <span className="font-semibold text-slate-600">Service Category:</span>
                <span className="font-bold text-slate-900">{quickPriceEditing.service_name}</span>
              </div>
              <p className="text-xs text-emerald-800/80 font-normal">
                Updating the price here immediately updates the live customer booking page and logistics fleet fares.
              </p>
            </div>

            <div>
              <Input
                label="Starting Price / Fare (₹)"
                type="number"
                required
                placeholder="e.g. 300"
                value={quickPriceEditing.base_price}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, base_price: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickPriceEditing(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                Save Price
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Full Edit / New Package Modal ── */}
      {editing && (
        <Modal
          title={editing.id ? `Edit Package: ${editing.name}` : "Create New Package"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4 font-sans text-left">
            <Select
              label="Parent Service"
              required
              options={services.map((s) => ({
                value: String(s.id),
                label: `${s.category_name ? s.category_name + " / " : ""}${s.name}`,
              }))}
              value={String(editing.service?.id || editing.service || "")}
              onChange={(e) => setEditing({ ...editing, service: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Package Name"
                required
                placeholder="e.g. Pickup 8ft, Instant Courier, 1 BHK Shifting"
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
                placeholder="e.g. pickup-8ft, instant-courier"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </div>

            <TextArea
              label="Short Description"
              placeholder="Detailed description of this vehicle or package offering..."
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Price / Starting Fare (₹)"
                type="number"
                required
                placeholder="e.g. 300"
                value={editing.base_price}
                onChange={(e) => setEditing({ ...editing, base_price: e.target.value })}
              />
              <Input
                label="Duration / ETA (e.g. 20 mins, 1 hr)"
                value={editing.duration || ""}
                onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
              />
            </div>

            <Input
              label="Tag Badge (e.g. Heavy (above 750kg), Best Seller)"
              value={editing.tag || ""}
              onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
            />

            <Input
              label="Includes (comma-separated features)"
              placeholder="e.g. Closed container, Verified driver, GPS tracking"
              value={editing.includes}
              onChange={(e) => setEditing({ ...editing, includes: e.target.value })}
            />

            <Input
              label="Excludes (comma-separated)"
              placeholder="e.g. Heavy toll extra, Helper unassisted"
              value={editing.excludes}
              onChange={(e) => setEditing({ ...editing, excludes: e.target.value })}
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editing.popular}
                  onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Featured / Popular in Customer Booking</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                {editing.id ? "Save Changes" : "Create Package"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
