import React, { useState, useRef } from "react"
import { UploadCloud, CheckCircle2, AlertCircle, X, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react"
import { resolveImageUrl, uploadImageFile } from "../../utils/imageUrl.js"

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
  const [compressionInfo, setCompressionInfo] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg("")
    setUploadProgress(0)
    setCompressionInfo(null)
    setIsUploading(true)

    try {
      const res = await uploadImageFile(file, {
        assetType: section || "homepage",
        onProgress: (percent) => setUploadProgress(percent),
        endpoint: "/api/settings/homepage/upload-image/",
      })

      if (res.url || res.path) {
        onChange?.(res.url || res.path)
        if (res.compression_ratio !== undefined && res.file_size !== undefined) {
          const kb = Math.round(res.file_size / 1024)
          setCompressionInfo(`WebP · ${res.compression_ratio}% compressed (${kb} KB)`)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Upload failed")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleClear = () => {
    onChange?.("")
    setCompressionInfo(null)
    setErrorMsg("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const displayUrl = resolveImageUrl(value, fallbackSrc)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        {compressionInfo && (
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600" />
            {compressionInfo}
          </span>
        )}
      </div>

      {/* Image Preview Box */}
      <div className={`relative ${aspectRatio} w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-xs`}>
        <img
          src={displayUrl}
          onError={(e) => { e.currentTarget.src = fallbackSrc }}
          alt="Preview"
          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Upload Overlay Button */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-lg shadow hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-teal-600" /> Upload Image
          </button>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
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
            <div className="text-xs font-bold">Uploading &amp; Compressing to WebP...</div>
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
        accept="image/jpeg,image/png,image/webp,image/gif"
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
