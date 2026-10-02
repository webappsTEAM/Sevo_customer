import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X, Plus, Trash2, Save, RotateCcw, Wrench, AlertCircle, Loader2, Check,
  Upload, Image as ImageIcon
} from "lucide-react"
import {
  saveACInspectionConfig,
  resetACDefaultsDB,
  fetchACInspectionConfig,
  DEFAULT_AC_INSPECTION_CONFIG
} from "../../../services/estimation/acInspectionData.js"
import { resolveImageUrl } from "../../../utils/imageUrl.js"
import { apiRequest } from "../../../api/client.js"

export function ACInspectionCustomizerModal({
  isOpen,
  onClose,
  currentConfig,
  onSaved,
}) {
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(currentConfig || DEFAULT_AC_INSPECTION_CONFIG)))
    }
  }, [isOpen, currentConfig])

  if (!isOpen || !draft) return null

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      setToastMessage({ type: "error", text: "Image file exceeds 15 MB limit." })
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("asset_type", "packages")

      const res = await apiRequest("/settings/catalog/upload-image/", {
        method: "POST",
        body: formData,
      })

      if (res?.success && (res.url || res.path || res.image_url)) {
        const imagePath = res.url || res.path || res.image_url
        setDraft(prev => ({ ...prev, image: imagePath }))
        setToastMessage({ type: "success", text: "Image uploaded and optimized to WebP successfully!" })
      } else {
        setToastMessage({ type: "error", text: res?.error || res?.message || "Failed to upload image." })
      }
    } catch (err) {
      console.error("Image upload error:", err)
      setToastMessage({ type: "error", text: "Error uploading image to server." })
    } finally {
      setUploadingImage(false)
      e.target.value = ""
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Clean, complete PostgreSQL payload
      const payload = {
        fee: Number(draft.fee) || 199,
        diagnostic_fee: Number(draft.fee) || 199,
        is_active: draft.is_active !== false,
        title: draft.title?.trim() || "AC Inspection & Diagnostic Visit",
        subtitle: draft.subtitle?.trim() || "",
        image: draft.image?.trim() || "",
        badges: draft.badges || [],
        includes: draft.includes || [],
        ready: draft.ready || [],
      }

      const res = await saveACInspectionConfig(payload)
      if (res?.success) {
        setToastMessage({ type: "success", text: "AC Inspection configuration saved to database successfully!" })
        if (typeof onSaved === "function") {
          onSaved({ ...draft, ...payload })
        }
        setTimeout(() => {
          setToastMessage(null)
          onClose()
        }, 1000)
      } else {
        setToastMessage({ type: "error", text: res?.error || "Failed to save configuration to database." })
      }
    } catch (err) {
      console.error(err)
      setToastMessage({ type: "error", text: "Failed to connect to server." })
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    if (window.confirm("Reset AC Inspection settings to database catalog defaults?")) {
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

  const handleIncludeChange = (idx, value) => {
    setDraft(prev => {
      const next = { ...prev }
      const inc = [...(next.includes || [])]
      inc[idx] = value
      next.includes = inc
      return next
    })
  }

  const handleAddInclude = () => {
    setDraft(prev => ({
      ...prev,
      includes: [...(prev.includes || []), "New inspection diagnostic check point"]
    }))
  }

  const handleRemoveInclude = (idx) => {
    setDraft(prev => ({
      ...prev,
      includes: (prev.includes || []).filter((_, i) => i !== idx)
    }))
  }

  const handleReadyChange = (idx, value) => {
    setDraft(prev => {
      const next = { ...prev }
      const rdy = [...(next.ready || [])]
      rdy[idx] = value
      next.ready = rdy
      return next
    })
  }

  const handleAddReady = () => {
    setDraft(prev => ({
      ...prev,
      ready: [...(prev.ready || []), "Ensure clear access and power availability"]
    }))
  }

  const handleRemoveReady = (idx) => {
    setDraft(prev => ({
      ...prev,
      ready: (prev.ready || []).filter((_, i) => i !== idx)
    }))
  }

  const handleBadgeChange = (idx, value) => {
    setDraft(prev => {
      const next = { ...prev }
      const bdg = [...(next.badges || [])]
      bdg[idx] = value
      next.badges = bdg
      return next
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
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
                Super Admin: Customize AC Inspection Details
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Configure diagnostic fee, image, storefront visibility, customer copy, and inspection checklists.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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

          {/* 1. Storefront Active / Disabled Toggle Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border border-amber-200/80 shadow-2xs">
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>Storefront Customer Status:</span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  draft.is_active !== false
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-200 text-slate-700 border border-slate-300"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${draft.is_active !== false ? "bg-emerald-600 animate-pulse" : "bg-slate-500"}`} />
                  {draft.is_active !== false ? "ENABLED / LIVE" : "DISABLED / HIDDEN"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                When enabled, the "Need Diagnosis? Book Inspection" tab and card are visible to customers on the catalog page. When disabled, they are completely hidden.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraft(prev => ({ ...prev, is_active: prev.is_active === false ? true : false }))}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                draft.is_active !== false ? "bg-emerald-600" : "bg-slate-300"
              }`}
              title={draft.is_active !== false ? "Click to disable AC Inspection on storefront" : "Click to enable AC Inspection on storefront"}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  draft.is_active !== false ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 2. Service Card Image Customization (Upload & URL) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Service Card Image</span>
              </label>
              {draft.image && (
                <button
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, image: "" }))}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview Thumbnail */}
              <div className="w-32 h-24 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                {draft.image ? (
                  <img
                    src={resolveImageUrl(draft.image)}
                    alt="Inspection Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = "/media/catalog/packages/appliance_cleaning_thumb.webp"
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                    <span className="text-[10px] font-semibold">Default Asset</span>
                  </div>
                )}
              </div>

              {/* Upload & Path Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors shrink-0">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{uploadingImage ? "Uploading..." : "Upload New Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                    />
                  </label>
                  <span className="text-xs text-slate-400">or enter image path / CDN URL below</span>
                </div>

                <input
                  type="text"
                  value={draft.image || ""}
                  onChange={(e) => setDraft(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="e.g. /media/catalog/packages/ac_inspection.webp or https://..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10.5px] text-slate-400">
                  Uploaded images are automatically optimized to WebP and saved directly in PostgreSQL database.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Fee & Card Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Inspection / Diagnostic Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
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

          {/* 4. Subtitle / Description */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Card Subtitle / Description
            </label>
            <textarea
              rows={2}
              value={draft.subtitle ?? ""}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* 5. Highlights & Badges */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Service Highlights & Badges
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(draft.badges || ["₹199 Diagnostic Fee", "Adjustable Against Repair", "Pay at Doorstep"]).map((badge, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={badge}
                  onChange={(e) => handleBadgeChange(idx, e.target.value)}
                  placeholder={`Badge ${idx + 1}`}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              ))}
            </div>
          </div>

          {/* 6. What's Included */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700">
                Inspection Checklist / What's Included
              </label>
              <button
                type="button"
                onClick={handleAddInclude}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Check Point</span>
              </button>
            </div>
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
                  <button
                    type="button"
                    onClick={() => handleRemoveInclude(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 7. What to Keep Ready */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700">
                Customer Preparation / What to Keep Ready
              </label>
              <button
                type="button"
                onClick={handleAddReady}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Preparation Point</span>
              </button>
            </div>
            <div className="space-y-2">
              {(draft.ready || []).map((rdy, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <input
                    type="text"
                    value={rdy}
                    onChange={(e) => handleReadyChange(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveReady(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 8. Rate Card Direct Reference Note */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <Wrench className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block">Rate Card & Spare Parts Notice:</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Itemized spare parts, replacement rates, and labor categories are managed directly on the main Rate Card page outside. This avoids duplicate edits and ensures database synchronization.
              </p>
            </div>
          </div>
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
