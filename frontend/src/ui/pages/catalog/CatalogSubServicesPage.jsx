import React, { useEffect, useState, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Plus, Trash2, ChevronDown, ChevronUp, Search, Layers, Box,
  Sparkles, FolderOpen, Check, X, ArrowUpRight
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"
import { Select } from "../../components/kit.jsx"
import ImageUploader from "../../components/ImageUploader.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"
import { routes } from "../../routes.js"

// Sub-Services are an OPTIONAL deeper layer inside a Service (e.g. Service
// "Full House Cleaning" -> Sub-Services "Occupied Apartment" / "Unoccupied
// Apartment"). Not every Service needs them. This page is the dedicated,
// first-class place to manage that layer, reusing the same
// Service.customization.subtabs / subtab_banners JSON storage that already
// existed (previously only editable buried inside the Service edit modal).

export function CatalogSubServicesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "")
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(new Set())
  const [draft, setDraft] = useState(null) // working copy while editing one service's sub-services
  const [saving, setSaving] = useState(false)
  const [toast, showToast] = useToast()

  const loadAll = async () => {
    setLoading(true)
    try {
      const [catRes, svcRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/categories/"),
        apiRequest("/settings/catalog/v2/services/")
      ])
      if (catRes.success) setCategories(catRes.data)
      if (svcRes.success) setServices(svcRes.data)
    } catch {
      showToast("Failed to load services", "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (categoryFilter) {
      setExpandedCategoryIds((prev) => new Set([...prev, Number(categoryFilter) || categoryFilter]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter])

  const servicesByCategory = useMemo(() => {
    const map = {}
    services.forEach((s) => {
      const catId = s.category || s.category_id
      if (!map[catId]) map[catId] = []
      map[catId].push(s)
    })
    return map
  }, [services])

  const filteredCategories = useMemo(() => {
    let list = categories
    if (categoryFilter) {
      list = list.filter((c) => String(c.id) === String(categoryFilter))
    }
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => {
      if ((c.name || "").toLowerCase().includes(q)) return true
      return (servicesByCategory[c.id] || []).some((s) => (s.name || "").toLowerCase().includes(q))
    })
  }, [categories, servicesByCategory, searchQuery, categoryFilter])

  const toggleCategory = (catId) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const expandAll = () => setExpandedCategoryIds(new Set(categories.map((c) => c.id)))
  const collapseAll = () => setExpandedCategoryIds(new Set())

  const subtabCount = (svc) => (svc.customization?.subtabs || []).length

  const openService = (svc) => {
    const tabs = (svc.customization?.subtabs || []).map((t, idx) => ({
      id: t.id || `sub_${idx}_${Date.now().toString(36)}`,
      label: t.label || "",
      enabled: t.enabled !== false
    }))
    setDraft({
      service: svc,
      subtabs: tabs,
      banners: { ...(svc.customization?.subtab_banners || {}) }
    })
  }

  const closeDraft = () => setDraft(null)

  const addSubtab = () => {
    setDraft((d) => ({
      ...d,
      subtabs: [
        ...d.subtabs,
        { id: `sub_${Date.now().toString(36)}`, label: "New Sub-Service", enabled: true }
      ]
    }))
  }

  const updateSubtabLabel = (idx, label) => {
    setDraft((d) => {
      const tabs = [...d.subtabs]
      tabs[idx] = { ...tabs[idx], label }
      return { ...d, subtabs: tabs }
    })
  }

  const toggleSubtabEnabled = (idx) => {
    setDraft((d) => {
      const tabs = [...d.subtabs]
      tabs[idx] = { ...tabs[idx], enabled: tabs[idx].enabled === false ? true : false }
      return { ...d, subtabs: tabs }
    })
  }

  const removeSubtab = (idx) => {
    setDraft((d) => {
      const removed = d.subtabs[idx]
      const tabs = d.subtabs.filter((_, i) => i !== idx)
      const banners = { ...d.banners }
      if (removed) delete banners[removed.id]
      return { ...d, subtabs: tabs, banners }
    })
  }

  const setBannerUrl = (subtabId, url) => {
    setDraft((d) => {
      const banners = { ...d.banners }
      if (url) banners[subtabId] = url
      else delete banners[subtabId]
      return { ...d, banners }
    })
  }

  const saveDraft = async () => {
    if (!draft) return
    if (draft.subtabs.some((t) => !t.label.trim())) {
      showToast("Every sub-service needs a name", "error")
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...draft.service,
        customization: {
          ...(draft.service.customization || {}),
          subtabs: draft.subtabs,
          subtab_banners: draft.banners
        }
      }
      const res = await apiRequest(`/settings/catalog/v2/services/${draft.service.id}/`, {
        method: "PUT",
        json: payload
      })
      if (res.success) {
        showToast("Sub-services updated")
        closeDraft()
        loadAll()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch (err) {
      showToast(extractApiErrorMessage(err, "Save failed"), "error")
    }
    setSaving(false)
  }

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name }))
  ]

  const goToPackages = (svc, subtabId) => {
    const params = new URLSearchParams()
    if (svc?.slug) params.set("service", svc.slug)
    if (subtabId) params.set("sub_service", subtabId)
    navigate(`${routes.catalog_packages}?${params.toString()}`)
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto font-sans text-slate-800 space-y-5">
      <ToastBanner toast={toast} />

      {/* ── Top Header Bar ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-indigo-700 text-[11px] font-medium mb-1.5 border border-indigo-200/60">
              <Layers className="w-3 h-3 text-indigo-600" /> Optional Deeper Layer Inside Each Service
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Sub-Services
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Some services need a finer split (e.g. "Full House Cleaning" → "Occupied Apartment" / "Unoccupied Apartment"). Not every service needs this — leave it empty if a service sells its packages directly.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search categories or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div className="w-44 shrink-0 hidden sm:block">
              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button type="button" onClick={expandAll} className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={collapseAll} className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Categories Accordion List ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Loading services…</p>
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

            return (
              <div
                key={cat.id}
                className={`bg-white rounded-xl border transition-all overflow-hidden ${
                  isExpanded ? "shadow-sm border-slate-300 ring-1 ring-slate-200/60" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  onClick={() => toggleCategory(cat.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3.5 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-slate-50 border-slate-100 text-slate-600 shadow-xs">
                      <FolderOpen className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight truncate">
                          {cat.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/50">
                          {catServices.length} {catServices.length === 1 ? "Service" : "Services"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      isExpanded ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-3.5 sm:p-4 space-y-2.5 animate-in fade-in duration-150">
                    {catServices.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200 p-4">
                        <Box className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-medium text-slate-600">No services in {cat.name} yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Add services first on the Services page, then come back here to split any of them into sub-services.</p>
                      </div>
                    ) : (
                      catServices.map((svc) => {
                        const count = subtabCount(svc)
                        return (
                          <div key={svc.id} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
                            <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50/80 text-indigo-700 flex items-center justify-center shrink-0 font-semibold text-xs border border-indigo-100/60">
                                  {svc.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">{svc.name}</span>
                                    {count > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                        <Layers className="w-3 h-3" /> {count} Sub-{count === 1 ? "Service" : "Services"}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/50">
                                        No sub-services
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => openService(svc)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 text-xs font-medium transition-colors cursor-pointer border border-slate-200"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>{count > 0 ? "Manage Sub-Services" : "Add Sub-Services"}</span>
                              </button>
                            </div>

                            {count > 0 && (
                              <div className="border-t border-slate-100 bg-slate-50/40 px-3.5 py-2.5 flex flex-wrap gap-1.5">
                                {(svc.customization?.subtabs || []).map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => goToPackages(svc, t.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                                    title="View / add packages under this sub-service"
                                  >
                                    {t.label}
                                    {t.enabled === false && <span className="text-slate-400">(hidden)</span>}
                                    <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                ))}
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

      {/* ── Manage Sub-Services Panel (slide-over) ── */}
      {draft && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={closeDraft} />
          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wide">Sub-Services for</p>
                <h2 className="text-base font-semibold text-slate-900">{draft.service.name}</h2>
              </div>
              <button type="button" onClick={closeDraft} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {draft.subtabs.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Layers className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-600">No sub-services yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">This service can keep selling packages directly — only add sub-services if customers need to pick a variant first.</p>
                </div>
              )}

              {draft.subtabs.map((subtab, idx) => {
                const currentVal = draft.banners[subtab.id] || ""
                return (
                  <div key={subtab.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="flex items-center gap-2.5 justify-start">
                      <input
                        type="checkbox"
                        checked={subtab.enabled !== false}
                        onChange={() => toggleSubtabEnabled(idx)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                        title="Visible to customers"
                      />
                      <input
                        type="text"
                        value={subtab.label}
                        onChange={(e) => updateSubtabLabel(idx, e.target.value)}
                        placeholder="Sub-service name"
                        className="flex-1 px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubtab(idx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                        title="Remove sub-service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ImageUploader
                      compact={true}
                      label="Banner Image"
                      assetType="banners"
                      value={currentVal}
                      onChange={(url) => setBannerUrl(subtab.id, url)}
                    />
                    <button
                      type="button"
                      onClick={() => goToPackages(draft.service, subtab.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Manage packages under this sub-service <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addSubtab}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50/50 text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Sub-Service
              </button>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button type="button" onClick={closeDraft} className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? "Saving…" : "Save Sub-Services"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CatalogSubServicesPage
