import React, { useState, useRef } from "react"
import { UploadCloud, CheckCircle2, AlertCircle, X, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react"

const SUPABASE_CDN_BASE = "https://zqghatybqkztzgjmmlpl.supabase.co/storage/v1/object/public/admin-media/"

export default function ImageUploadField({
  value = "",
  onChange,
  section = "general",
  fallbackSrc = "/mockups/service_hvac.png",
  label,
  aspectRatio = "aspect-[16/9]",
  placeholder = "Upload or select an image..."
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const fileInputRef = useRef(null)

  // Resolve display URL
  const resolveDisplayUrl = (path) => {
    if (!path) return fallbackSrc
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("/mockups/") ||
      path.startsWith("/media/")
    ) {
      return path
    }
    if (path.startsWith("homepage/")) {
      return `/media/${path}`
    }
    return `${SUPABASE_CDN_BASE}${path.replace(/^\//, "")}`
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(file)
  }

  const uploadFile = (file) => {
    setErrorMsg("")
    setUploadProgress(0)

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Please select a JPEG, PNG, or WebP image.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File size must be under 5 MB.")
      return
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("section", section)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/settings/homepage/upload-image/")

    const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setUploadProgress(percent)
      }
    }

    xhr.onload = () => {
      setIsUploading(false)
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.success && (res.image_path || res.image_url)) {
            onChange?.(res.image_path || res.image_url)
          } else {
            setErrorMsg(res.error || "Upload failed")
          }
        } catch (err) {
          setErrorMsg("Server returned invalid response.")
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText)
          setErrorMsg(res.error || `Server error (${xhr.status})`)
        } catch (err) {
          setErrorMsg(`Upload failed with status ${xhr.status}`)
        }
      }
    }

    xhr.onerror = () => {
      setIsUploading(false)
      setErrorMsg("Network error occurred during image upload.")
    }

    xhr.send(formData)
  }

  const handleClear = () => {
    onChange?.("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const displayUrl = resolveDisplayUrl(value)

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Image Preview Box */}
      <div className={`relative ${aspectRatio} w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-xs`}>
        <img
          src={displayUrl}
          onError={(e) => { e.currentTarget.src = fallbackSrc }}
          alt="Preview"
          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
        />

        {/* Upload Overlay Button */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-lg shadow hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4 text-teal-600" /> Upload Image
          </button>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              title="Clear Image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Uploading Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            <div className="text-xs font-bold">Uploading to Supabase Storage...</div>
            <div className="w-full max-w-[160px] bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-400 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-300 font-mono">{uploadProgress}%</div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Storage Path / Image URL Input & Browse Button */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder || "Image URL or storage path (e.g. /mockups/service_hvac.png or upload)..."}
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 bg-white focus:outline-none focus:border-teal-500 shadow-2xs"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
          title="Browse & Upload Image File"
        >
          <UploadCloud className="w-3.5 h-3.5" /> Upload File
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
