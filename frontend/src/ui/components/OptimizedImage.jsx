import React, { useState } from "react"
import { resolveImageUrl } from "../../utils/imageUrl.js"

/**
 * OptimizedImage.jsx
 * Production-ready reusable image component.
 * 
 * Features:
 * - Deterministic, direct Supabase CDN URL resolution (no Django proxying)
 * - Native lazy loading for below-the-fold content (`loading="lazy"`, `decoding="async"`)
 * - Explicit eager loading for critical hero/banner images (`priority={true}`)
 * - Aspect ratio and layout shift (CLS) prevention
 * - Seamless fallback handling on network error
 */
export default function OptimizedImage({
  src,
  alt = "",
  fallback = "/mockups/ants_control.jpg",
  className = "",
  style = {},
  width,
  height,
  aspectRatio,
  priority = false,
  onClick,
  ...rest
}) {
  const [hasError, setHasError] = useState(false)
  const resolvedSrc = hasError ? fallback : resolveImageUrl(src, fallback)

  const combinedStyle = {
    ...style,
    ...(aspectRatio ? { aspectRatio } : {}),
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => {
        if (!hasError) {
          setHasError(true)
        }
      }}
      onClick={onClick}
      className={className}
      style={combinedStyle}
      {...rest}
    />
  )
}
