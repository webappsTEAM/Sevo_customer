import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X, Plus, Trash2, Save, RotateCcw, Wrench, Zap, Settings,
  Flame, Fan, Shield, CheckCircle2, AlertCircle, Loader2, Check
} from "lucide-react"
import {
  saveACInspectionConfig,
  resetACDefaultsDB,
  fetchACInspectionConfig,
  DEFAULT_AC_INSPECTION_CONFIG
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

export function ACInspectionCustomizerModal({
  isOpen,
  onClose,
  currentConfig,
  onSaved,
}) {
  const [draft, setDraft] = useState(null)
  const [activeTab, setActiveTab] = useState("general")
  const [selectedCatId, setSelectedCatId] = useState("installation")
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(currentConfig || DEFAULT_AC_INSPECTION_CONFIG)))
    }
  }, [isOpen, currentConfig])

  if (!isOpen || !draft) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await saveACInspectionConfig(draft)
      if (res?.success) {
        setToastMessage({ type: "success", text: "Inspection configuration saved successfully!" })
        if (typeof onSaved === "function") {
          onSaved(draft)
        }
        setTimeout(() => {
          setToastMessage(null)
          onClose()
        }, 1200)
      } else {
        setToastMessage({ type: "error", text: res?.error || "Failed to save configuration." })
      }
    } catch (err) {
      console.error(err)
      setToastMessage({ type: "error", text: "Failed to connect to server." })
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    if (window.confirm("Reset AC Inspection settings and rate card to database catalog defaults?")) {
      setSaving(true)
      try {
        await resetACDefaultsDB()
        const refreshed = await fetchACInspectionConfig()
        if (refreshed && !refreshed.error) {
          setDraft(refreshed)
          if (typeof onSaved === "function") {
            onSaved(refreshed)
          }
          setToastMessage({ type: "success", text: "Reset to default database catalog!" })
        }
      } catch (e) {
        console.error(e)
        setToastMessage({ type: "error", text: "Failed to reset defaults in database." })
      } finally {
        setSaving(false)
      }
    }
  }

  // Rate card category mutations
  const activeCategory = draft.rateCardCategories?.find(c => c.id === selectedCatId)

  const handleItemChange = (itemIdx, field, value) => {
    setDraft(prev => {
      const next = { ...prev }
      const catIdx = next.rateCardCategories.findIndex(c => c.id === selectedCatId)
      if (catIdx !== -1) {
        const items = [...next.rateCardCategories[catIdx].items]
        items[itemIdx] = { ...items[itemIdx], [field]: value }
        next.rateCardCategories[catIdx].items = items
      }
      return next
    })
  }

  const handleAddItem = () => {
    const newItemName = prompt("Enter new item / service name:")
    if (!newItemName?.trim()) return
    const newItemPrice = prompt("Enter price (e.g. ₹450 or Free):", "₹450") || "₹450"

    setDraft(prev => {
      const next = { ...prev }
      const catIdx = next.rateCardCategories.findIndex(c => c.id === selectedCatId)
      if (catIdx !== -1) {
        const items = [...(next.rateCardCategories[catIdx].items || [])]
        items.push({
          id: `item-${Date.now()}`,
          name: newItemName.trim(),
          price: newItemPrice.trim(),
        })
        next.rateCardCategories[catIdx].items = items
      }
      return next
    })
  }

  const handleDeleteItem = (itemIdx) => {
    setDraft(prev => {
      const next = { ...prev }
      const catIdx = next.rateCardCategories.findIndex(c => c.id === selectedCatId)
      if (catIdx !== -1) {
        const items = next.rateCardCategories[catIdx].items.filter((_, i) => i !== itemIdx)
        next.rateCardCategories[catIdx].items = items
      }
      return next
    })
  }

  const handleIncludeChange = (idx, value) => {
    setDraft(prev => {
      const next = { ...prev }
      const inc = [...(next.includes || [])]
      inc[idx] = value
      next.includes = inc
      return next
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-amber-50 to-white border-b border-slate-200 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Super Admin: Customize AC Inspection &amp; Rates
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Configure diagnostic fees, descriptions, and itemized spare parts rate cards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-amber-500 text-amber-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            General Inspection Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rate_card")}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === "rate_card"
                ? "border-amber-500 text-amber-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Rate Card Items ({draft.rateCardCategories?.reduce((s, c) => s + (c.items?.length || 0), 0)} items)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {toastMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                toastMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {toastMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toastMessage.text}</span>
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Inspection / Diagnostic Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={draft.fee ?? 199}
                    onChange={(e) => setDraft({ ...draft, fee: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Customer diagnostic visit booking charge. Adjustable against accepted repairs.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Service Card Title
                  </label>
                  <input
                    type="text"
                    value={draft.title ?? ""}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Card Subtitle / Description
                </label>
                <textarea
                  rows={3}
                  value={draft.subtitle ?? ""}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Inspection Checklist / Included Bullet Points
                </label>
                <div className="space-y-2">
                  {(draft.includes || []).map((inc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <input
                        type="text"
                        value={inc}
                        onChange={(e) => handleIncludeChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "rate_card" && (
            <div className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Select Rate Card Category to Edit
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {(draft.rateCardCategories || []).map(cat => {
                    const isSelected = selectedCatId === cat.id
                    const Icon = CATEGORY_ICONS[cat.id] || Wrench

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                          {cat.items?.length || 0}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Items in active category */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-900">
                    {activeCategory?.name} ({activeCategory?.items?.length || 0} Items)
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {(activeCategory?.items || []).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        placeholder="Item name"
                        className="flex-1 px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                        placeholder="Price (e.g. ₹350 or Free)"
                        className="w-32 px-2.5 py-1 text-xs font-black text-amber-900 bg-amber-50/70 border border-amber-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
