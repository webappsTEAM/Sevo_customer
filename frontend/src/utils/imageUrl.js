/**
 * imageUrl.js
 * Centralized, production-grade image URL resolution and upload helper.
 * 
 * Guarantees:
 * - Safe resolution of Supabase CDN public URLs, local mockups, /media/, and third-party URLs.
 * - Zero corruption of already-valid absolute URLs.
 * - Reusable, authenticated file upload client with progress tracking and metadata return.
 */

export const SUPABASE_STORAGE_BASE = "https://zqghatybqkztzgjmmlpl.supabase.co/storage/v1/object/public/admin-media/"

/**
 * Resolves any storage path, relative mockup path, or absolute URL to a canonical display URL.
 * 
 * @param {string|null|undefined} path - The raw path or URL stored in database/state.
 * @param {string} [fallback=""] - Default fallback image path.
 * @returns {string} Fully qualified displayable image URL.
 */
export function resolveImageUrl(path, fallback = "") {
  if (!path || typeof path !== "string") {
    return fallback || ""
  }

  const trimmed = path.trim()
  if (!trimmed) {
    return fallback || ""
  }

  // 1. Already fully qualified URL or data URI
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    // NOTE: this used to blank out (return fallback for) any URL on our
    // OWN configured Supabase Storage domain (zqghatybqkztzgjmmlpl.supabase.co)
    // -- i.e. it treated every real, successfully-uploaded image as if it
    // were broken. Since backend/.env's SUPABASE_URL points at exactly
    // this project's bucket, that meant any image actually uploaded
    // through the real upload pipeline (ImageUploadView -> Supabase
    // Storage) would silently render as the fallback/broken-image
    // placeholder everywhere this helper is used, even though the upload
    // itself succeeded. Removed -- a Supabase-hosted URL is resolved the
    // same as any other fully-qualified URL.
    return trimmed;
  }

  // 2. Vite dev server / bundled assets / mockups / media
  if (
    trimmed.startsWith("/src/") ||
    trimmed.startsWith("src/") ||
    trimmed.startsWith("/@fs/") ||
    trimmed.startsWith("@fs/") ||
    trimmed.startsWith("/@id/") ||
    trimmed.startsWith("/assets/") ||
    trimmed.startsWith("assets/") ||
    trimmed.startsWith("/mockups/") ||
    trimmed.startsWith("mockups/") ||
    trimmed.startsWith("/media/") ||
    trimmed.startsWith("media/") ||
    trimmed.startsWith("/")
  ) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  }

  // 3. Clean storage path (e.g. "catalog/packages/uuid.webp" or "homepage/hero/uuid.webp")
  const cleanPath = trimmed.replace(/^\/+/, "")
  return `${SUPABASE_STORAGE_BASE}${cleanPath}`
}

/**
 * Uploads an image file to the unified backend compression and storage pipeline.
 * 
 * @param {File} file - Browser File object from input.
 * @param {Object} [options]
 * @param {string} [options.assetType="packages"] - Asset category (packages, services, addons, banners, homepage, general).
 * @param {string} [options.oldImagePath=""] - Optional existing image path to replace/delete.
 * @param {function} [options.onProgress] - Optional progress callback (percent: number) => void.
 * @param {string} [options.endpoint="/api/settings/catalog/upload-image/"] - Upload endpoint.
 * @returns {Promise<Object>} Metadata containing { success, url, path, dimensions, original_size, file_size, compression_ratio }
 */
export function uploadImageFile(file, options = {}) {
  const {
    assetType = "packages",
    oldImagePath = "",
    onProgress = null,
    endpoint = "/api/settings/catalog/upload-image/",
  } = options

  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided for upload."))
    }

    // Client-side quick check
    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error("Image file size exceeds the 15 MB maximum limit."))
    }

    const formData = new FormData()
    formData.append("image", file)
    formData.append("asset_type", assetType)
    if (oldImagePath) {
      formData.append("old_image_path", oldImagePath)
    }

    const xhr = new XMLHttpRequest()
    xhr.open("POST", endpoint)
    xhr.withCredentials = true

    const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress(percent)
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.success && (res.url || res.path)) {
            resolve({
              success: true,
              url: res.url || resolveImageUrl(res.path),
              path: res.path || "",
              format: res.format || "webp",
              width: res.width,
              height: res.height,
              dimensions: res.dimensions || `${res.width}x${res.height}`,
              original_dimensions: res.original_dimensions,
              output_dimensions: res.output_dimensions,
              quality_used: res.quality_used,
              has_alpha: res.has_alpha,
              original_size: res.original_size,
              file_size: res.file_size,
              compression_ratio: res.compression_ratio,
              old_deleted: res.old_deleted,
            })
          } else {
            const err = new Error(res.message || res.error || "Upload failed.")
            if (res.error_code) err.code = res.error_code
            reject(err)
          }
        } catch {
          reject(new Error("Invalid server response."))
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText)
          const err = new Error(res.message || res.error || `Upload failed with HTTP ${xhr.status}`)
          if (res.error_code) err.code = res.error_code
          reject(err)
        } catch {
          reject(new Error(`Server returned error HTTP ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => {
      reject(new Error("Network connection error occurred during image upload."))
    }

    xhr.send(formData)
  })
}

/**
 * Uploads an image OR short video file to the Home Page CMS's media
 * pipeline (settings_hub/views_homepage.py: HomePageImageUploadAPIView).
 *
 * Added 2026-09-21 per explicit request ("the banners and advertisement
 * could allow admin to upload video and images... and that should be
 * reflected in mobile application"). Kept as its own function rather than
 * extending [uploadImageFile] above: that one is shared by every other
 * upload surface in this admin (catalog packages/services/addons/etc, via
 * a DIFFERENT backend endpoint that expects a different form field name
 * and only ever handles images) — changing its shape risked a regression
 * everywhere else it's used. This one is scoped to the Home Page CMS's own
 * upload endpoint, sends the "section" field name that endpoint actually
 * reads (views_homepage.py's `request.data.get("section", ...)` — the
 * shared helper above sends "asset_type", which that endpoint has never
 * read), and accepts a real video size ceiling instead of assuming every
 * file is a photo.
 *
 * @param {File} file
 * @param {Object} [options]
 * @param {string} [options.section="general"] - homepage CMS section, e.g. "mobile-banners".
 * @param {string} [options.oldImagePath=""] - existing storage path to replace/delete.
 * @param {function} [options.onProgress]
 * @returns {Promise<Object>} { success, url, path, mediaType: "image"|"video", fileSize, oldDeleted, compressionRatio? }
 */
export function uploadHomepageMediaFile(file, options = {}) {
  const {
    section = "general",
    oldImagePath = "",
    onProgress = null,
  } = options

  const isVideo = (file?.type || "").toLowerCase().startsWith("video/")
  const maxBytes = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024

  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided for upload."))
    }
    if (file.size > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024))
      return reject(new Error(`${isVideo ? "Video" : "Image"} file size exceeds the ${limitMb} MB maximum.`))
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("section", section)
    if (oldImagePath) {
      formData.append("old_image_path", oldImagePath)
    }

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/settings/homepage/upload-image/")
    xhr.withCredentials = true

    const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.success && (res.url || res.path)) {
            resolve({
              success: true,
              url: res.url || resolveImageUrl(res.path),
              path: res.path || "",
              mediaType: res.media_type === "video" ? "video" : "image",
              fileSize: res.file_size,
              compressionRatio: res.compression_ratio,
              oldDeleted: res.old_deleted,
            })
          } else {
            const err = new Error(res.message || res.error || "Upload failed.")
            if (res.error_code) err.code = res.error_code
            reject(err)
          }
        } catch {
          reject(new Error("Invalid server response."))
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText)
          reject(new Error(res.message || res.error || `Upload failed with HTTP ${xhr.status}`))
        } catch {
          reject(new Error(`Server returned error HTTP ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => {
      reject(new Error("Network connection error occurred during upload."))
    }

    xhr.send(formData)
  })
}
