import React, { useState, useRef } from "react"
import { UploadCloud, CheckCircle2, AlertCircle, X, Loader2, Sparkles, Image as ImageIcon } from "lucide-react"
import { resolveImageUrl, uploadImageFile } from "../../utils/imageUrl.js"

export default function ImageUploader({
  value = "",
  onChange,
  assetType = "packages",
  label = "Package Image",
  description = "Upload a custom image or paste an image URL. Automatically compressed to WebP.",
  fallbackSrc = "/mockups/ants_control.jpg",
  aspectRatio = "aspect-[16/9]",
  compact = false,
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
      const result = await uploadImageFile(file, {
        assetType,
        onProgress: (percent) => setUploadProgress(percent),
      })

      if (result.url) {
        onChange?.(result.url)
        if (result.compression_ratio !== undefined && result.file_size !== undefined) {
          const kb = Math.round(result.file_size / 1024)
          setCompressionInfo(`WebP · ${result.compression_ratio}% compressed (${kb} KB)`)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to upload image")
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const displayUrl = resolveImageUrl(value, fallbackSrc)

  if (compact) {
    return (
      <div className="space-y-2">
        {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
        <div className="flex items-center gap-3">
          {value ? (
            <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 group">
              <img
                src={displayUrl}
                alt="Preview"
                onError={(e) => { e.currentTarget.src = fallbackSrc }}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 shrink-0 text-slate-400 text-[10px] font-bold">
              No Image
            </div>
          )}

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Uploading {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Image</span>
                  </>
                )}
              </button>

              {compressionInfo && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {compressionInfo}
                </span>
              )}
            </div>

            <input
              type="text"
              placeholder="Or paste image URL (e.g. https://...)"
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono text-slate-700 focus:border-indigo-400 outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-slate-800">{label}</span>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {compressionInfo && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            {compressionInfo}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {value ? (
          <div className={`relative ${aspectRatio} w-24 sm:w-28 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 group shadow-xs`}>
            <img
              src={displayUrl}
              alt="Preview"
              onError={(e) => { e.currentTarget.src = fallbackSrc }}
              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
              title="Remove image"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className={`w-24 sm:w-28 ${aspectRatio} rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 shrink-0 text-slate-400 text-[10px] font-bold gap-1`}>
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <span>No Image</span>
          </div>
        )}

        <div className="flex-1 w-full space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Supabase ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Choose Image File</span>
                </>
              )}
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-500">Or Image URL / Storage Path</label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/... or storage path"
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
