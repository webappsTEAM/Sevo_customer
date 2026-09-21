import React, { useState, useRef } from "react"
import { UploadCloud, AlertCircle, X, Sparkles, Loader2, Film } from "lucide-react"
import { resolveImageUrl, uploadHomepageMediaFile } from "../../utils/imageUrl.js"

// Added 2026-09-21 per explicit request ("the banners and advertisement
// could allow admin to upload video and images... and that should be
// reflected in mobile application"). Sibling to ImageUploadField.jsx, kept
// as its own component rather than bolting a video branch onto that one:
// ImageUploadField is used all over this admin (catalog packages,
// services, add-ons, hero, categories, ...) for image-only fields, and
// every one of those callers assumes `value` is a single image path/URL.
// This field additionally tracks *which kind* of media is stored
// (`mediaType`), since the same field now has to render either an <img>
// or a <video>, and needs to tell the customer app which one it is.
//
// Scope: only wired into the Mobile App "Banners" and "Advertisement"
// tabs (HomePageCustomizerPage.jsx) — the two places that render a single
// full-bleed admin asset. Everywhere else keeps using ImageUploadField.
export default function MediaUploadField({
  value = "",
  mediaType = "image",
  onChange, // (path: string, mediaType: "image"|"video") => void
  section = "general",
  fallbackSrc = "",
  aspectRatio = "aspect-[16/9]",
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
      const res = await uploadHomepageMediaFile(file, {
        section,
        oldImagePath: value,
        onProgress: (percent) => setUploadProgress(percent),
      })

      if (res.url || res.path) {
        const canonicalUrl = res.url || resolveImageUrl(res.path)
        onChange?.(canonicalUrl, res.mediaType)
        if (res.compressionRatio !== undefined && res.fileSize !== undefined) {
          const kb = Math.round(res.fileSize / 1024)
          setCompressionInfo(`WebP · ${res.compressionRatio}% compressed (${kb} KB)`)
        } else if (res.mediaType === "video" && res.fileSize !== undefined) {
          const mb = (res.fileSize / (1024 * 1024)).toFixed(1)
          setCompressionInfo(`Video · ${mb} MB`)
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
    onChange?.("", "image")
    setCompressionInfo(null)
    setErrorMsg("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const displayUrl = resolveImageUrl(value, fallbackSrc)
  const isVideo = mediaType === "video" && !!value

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isVideo ? <Film className="w-3 h-3" /> : null}
          {isVideo ? "Video" : "Image"}
        </span>
        {compressionInfo && (
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600" />
            {compressionInfo}
          </span>
        )}
      </div>

      {/* Preview Box */}
      <div className={`relative ${aspectRatio} w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-xs`}>
        {isVideo ? (
          <video
            key={displayUrl}
            src={displayUrl}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={displayUrl}
            onError={(e) => { e.currentTarget.src = fallbackSrc }}
            alt="Preview"
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Upload Overlay Button */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-lg shadow hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-teal-600" /> Upload Image/Video
          </button>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Uploading Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            <div className="text-xs font-bold">Uploading...</div>
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

      {/* Hidden File Input — accepts both images and short videos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value, mediaType)}
          placeholder="Image/video URL or storage path, or upload a file..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 bg-white focus:outline-none focus:border-teal-500 shadow-2xs"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
          title="Browse & Upload Image or Video File"
        >
          <UploadCloud className="w-3.5 h-3.5" /> Upload File
        </button>
      </div>

      <p className="text-[10px] text-slate-400">
        Images up to 5 MB (auto-compressed) or a short video up to 25 MB (MP4, WebM or MOV).
      </p>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
