import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Pencil, Check, X as XIcon, ShieldCheck, ImageIcon, Loader2, UploadCloud, Sparkles, Link as LinkIcon, RotateCcw } from "lucide-react"
import { apiRequest } from "../../api/client.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { isSuperAdmin } from "../../auth/authorization.js"
import { resolveImageUrl } from "../../utils/imageUrl.js"

/**
 * Shared Super Admin "Customer Web Edit Mode" building blocks.
 *
 * This exists so every customer-facing surface (Groceries/Products,
 * Homepage, and each Service modal) uses the SAME editing pattern, the
 * SAME image-upload pipeline, and the SAME authorization check, instead of
 * each file re-inventing (and potentially getting wrong) its own version.
 *
 * Nothing here creates a new backend endpoint, model, or permission
 * system: EditableImage uploads through the existing
 * POST /settings/catalog/upload-image/ pipeline (utils/image_optimizer.py
 * + Supabase storage) and callers PUT the returned URL to whatever field
 * their existing save endpoint expects (catalog Package, homepage config,
 * etc.) -- this file only supplies the UI.
 *
 * Authorization is enforced in two places, same as everywhere else in this
 * app: canEditCustomerUI()/isSuperAdmin() hide the controls on the
 * frontend, and the actual save call always goes through the existing
 * backend endpoint, which independently re-checks permission
 * (RequireModuleAccess) server-side -- a normal Admin who somehow rendered
 * this UI still cannot make the save succeed.
 */

/** True only for an authenticated Super Admin -- the sole gate for every
 * control in this file. Matches the frontend/backend isSuperAdmin() checks
 * used everywhere else (auth/authorization.js, accounts/permissions.py). */
export function useCanEditCustomerUI() {
  const { user } = useAuth()
  return isSuperAdmin(user)
}

/** Sticky "Enable Edit Mode" toggle bar. Renders nothing unless `visible`
 * (pass useCanEditCustomerUI()) is true, so a normal customer or Admin
 * never sees it. */
export function EditModeToggleBar({ visible, active, onToggle, label = "Super Admin viewing the live Customer App", busy = false }) {
  if (!visible) return null
  return (
    <div className={`sticky top-0 z-40 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-bold ${active ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}>
      <span className="flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        {label}{active ? " — Edit Mode ON" : ""}
        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className={`px-3 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer ${active ? "bg-white text-indigo-700" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}
      >
        <Pencil className="w-3 h-3" />
        {active ? "Exit Edit Mode" : "Enable Edit Mode"}
      </button>
    </div>
  )
}

/** Small transient toast for save success/failure. */
export function SaveNoticeToast({ notice }) {
  if (!notice) return null
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg ${notice.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
      {notice.text}
    </div>
  )
}

/** Inline "click pencil to edit" text/number/textarea control. Renders
 * plain content when `active` is false, so normal customers see exactly
 * the original markup. */
export function EditableText({ active, value, onSave, type = "text", prefix = "", multiline = false, placeholder = "", className = "", inputClassName = "" }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  if (!active) {
    return <span className={className}>{prefix}{value ?? placeholder}</span>
  }

  const commit = () => {
    setEditing(false)
    const next = type === "number" ? Number(draft) : draft
    if (next !== value && !(type === "number" && Number.isNaN(next))) onSave(next)
  }

  if (editing) {
    const Field = multiline ? "textarea" : "input"
    return (
      <span className="inline-flex items-start gap-1.5 bg-white/95 rounded-lg px-1.5 py-1 shadow-md border border-indigo-300" onClick={(e) => e.stopPropagation()}>
        {prefix}
        <Field
          autoFocus
          type={multiline ? undefined : type}
          rows={multiline ? 3 : undefined}
          value={draft ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !multiline) commit()
            if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false) }
          }}
          className={`border border-slate-200 rounded px-2 py-1 text-sm text-slate-900 min-w-[160px] ${inputClassName}`}
        />
        <button type="button" onClick={commit} className="text-emerald-600 hover:text-emerald-800 shrink-0" aria-label="Save">
          <Check className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => { setDraft(value ?? ""); setEditing(false) }} className="text-slate-400 hover:text-slate-600 shrink-0" aria-label="Cancel">
          <XIcon className="w-4 h-4" />
        </button>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 group/edit cursor-pointer rounded px-1 -mx-1 ring-1 ring-transparent hover:ring-indigo-300 hover:bg-indigo-50/60 ${className}`}
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <span>{prefix}{value || placeholder}</span>
      <Pencil className="w-3 h-3 text-indigo-500 opacity-0 group-hover/edit:opacity-100 shrink-0" />
    </span>
  )
}

export const CURATED_IMAGE_PRESETS = [
  { id: "concept3", label: "★ 3D Isometric Characters (Default)", url: "/assets/hero_illustration.jpg", category: "hero" },
  { id: "repair", label: "🔧 Home & Repair Showcase", url: "/assets/sevo_photo_home_repair.jpg", category: "hero" },
  { id: "cleaning_pro", label: "✨ Cleaning Pro Service", url: "/mockups/service_cleaning.png", category: "service" },
  { id: "maintenance_pro", label: "🎨 Painting & Maintenance", url: "/mockups/service_maintenance.png", category: "service" },
  { id: "mason_pro", label: "🧱 Masonry & Construction", url: "/mockups/service_building.png", category: "service" },
  { id: "hvac_pro", label: "❄️ AC & Appliance Technician", url: "/mockups/service_hvac.png", category: "service" },
  { id: "electrical_pro", label: "⚡ Electrical & Wiring Tech", url: "/mockups/service_electrical.png", category: "service" },
  { id: "kitchen_banner", label: "🍳 Kitchen Packages Hero Banner", url: "/mockups/kitchen_cleaning_hero.png", category: "banner" },
  { id: "kitchen_basic", label: "🍽️ Kitchen Sink & Counter", url: "/mockups/kitchen_basic_cleaning.png", category: "banner" },
  { id: "kitchen_top", label: "✨ Clean Kitchen Modern Top", url: "/mockups/kitchen_top_new.png", category: "banner" },
  { id: "groceries", label: "🥗 Food & Farm-Fresh Produce", url: "/assets/sevo_photo_food_health.jpg", category: "hero" },
  { id: "transport", label: "🚚 Logistics & Goods Mini Truck", url: "/assets/sevo_photo_goods_transport.jpg", category: "hero" },
]

/**
 * Super Admin Image Edit Modal (Direct Upload + Presets + Custom URL + Reset)
 */
export function ImageEditModal({ isOpen, onClose, currentUrl, onSave, title = "Edit Image", defaultFallback = "/assets/hero_illustration.jpg", assetType = "homepage" }) {
  const [activeTab, setActiveTab] = useState("upload") // "upload", "presets", "url"
  const [draftUrl, setDraftUrl] = useState(currentUrl || "")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadSuccess, setUploadSuccess] = useState("")
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    setUploadError("")
    setUploadSuccess("")

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("asset_type", assetType)

      const endpoint = assetType === "packages" || assetType === "services"
        ? "/settings/catalog/upload-image/"
        : "/api/settings/homepage/upload-image/"

      const res = await apiRequest(endpoint, { method: "POST", body: formData })
      if (res?.success && (res.url || res.image_url)) {
        const url = res.url || res.image_url
        setDraftUrl(url)
        setUploadSuccess("Image uploaded successfully!")
      } else {
        setUploadError(res?.error || res?.message || "Upload failed.")
      }
    } catch (err) {
      setUploadError(err?.body?.message || err?.body?.error || "Upload failed — please check network or file size.")
    } finally {
      setUploading(false)
    }
  }

  const handleCommit = () => {
    if (draftUrl && draftUrl.trim()) {
      onSave(draftUrl.trim())
    }
    onClose()
  }

  const handleReset = () => {
    setDraftUrl(defaultFallback)
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "upload"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Direct Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "presets"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "url"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Image URL
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Image Preview
            </span>
            <div className="w-full h-44 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
              <img
                src={draftUrl || defaultFallback}
                alt="Preview"
                onError={(e) => {
                  if (e.currentTarget.src !== defaultFallback) {
                    e.currentTarget.src = defaultFallback
                  }
                }}
                className="w-full h-full object-contain p-2"
              />
              <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                {draftUrl ? "Custom Image" : "Default"}
              </div>
            </div>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === "upload" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/40 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    {uploading ? "Uploading Image..." : "Click or Drag to Upload File"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Supports JPG, PNG, WebP up to 5MB. Auto-optimized for web.
                  </span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {uploadSuccess && (
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-1.5 font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> {uploadSuccess}
                </div>
              )}
              {uploadError && (
                <div className="p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Presets Library */}
          {activeTab === "presets" && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 block">
                Select any verified high-res artwork or photo from the platform library:
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {CURATED_IMAGE_PRESETS.map((p) => {
                  const isSelected = draftUrl === p.url
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDraftUrl(p.url)}
                      className={`p-2 rounded-xl text-left border transition flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 ring-1 ring-teal-500"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src={p.url}
                          alt={p.label}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = defaultFallback }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] text-slate-900 block truncate">{p.label}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{p.url}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Direct URL */}
          {activeTab === "url" && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Image URL or Path
              </label>
              <input
                type="text"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="e.g. /assets/hero_illustration.jpg or https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                You can specify any local `/assets/...` or `/mockups/...` path or a secure `https://` CDN URL.
              </span>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Apply & Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Enhanced EditableImage with click-to-edit modal, preset selection, direct upload, and error fallback.
 */
export function EditableImage({
  active,
  value,
  onSave,
  assetType = "packages",
  alt = "",
  className = "",
  imgClassName = "",
  defaultFallback = "/mockups/service_cleaning.png",
  title = "Edit Image"
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const displaySrc = resolveImageUrl(value, defaultFallback)

  const handleImageError = (e) => {
    if (e.currentTarget.src !== defaultFallback && !e.currentTarget.src.endsWith(defaultFallback)) {
      e.currentTarget.src = defaultFallback
    }
  }

  if (!active) {
    return (
      <img
        src={displaySrc}
        alt={alt}
        onError={handleImageError}
        className={imgClassName}
      />
    )
  }

  return (
    <div
      className={`relative group/editimg cursor-pointer ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        setModalOpen(true)
      }}
      title="Click to change or upload new image"
    >
      <img
        src={displaySrc}
        alt={alt}
        onError={handleImageError}
        className={`${imgClassName} transition duration-200 group-hover/editimg:ring-2 group-hover/editimg:ring-teal-500`}
      />
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/editimg:opacity-100 transition-opacity rounded-[inherit] flex items-center justify-center p-1">
        <span className="bg-white/95 text-slate-900 font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 pointer-events-none">
          <Pencil className="w-3 h-3 text-teal-600" /> Change Image
        </span>
      </div>

      <ImageEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentUrl={value || defaultFallback}
        defaultFallback={defaultFallback}
        title={title}
        assetType={assetType}
        onSave={(newUrl) => onSave(newUrl)}
      />
    </div>
  )
}
