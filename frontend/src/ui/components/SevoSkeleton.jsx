import React from "react"

/**
 * SEVO Shimmer Skeleton Loader Component
 * Supports Concept 3 Light (#F8F5EE shimmer) and Concept 2 Dark (#102956 shimmer)
 */
export function SevoSkeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  ...props
}) {
  const variantStyles = {
    rectangular: "rounded-xl",
    circular: "rounded-full",
    text: "rounded-md h-4 my-1",
  }[variant] || "rounded-xl"

  return (
    <div
      className={`animate-pulse bg-[var(--sevo-surface-raised)] border border-[var(--sevo-border-subtle)] ${variantStyles} ${className}`}
      style={{ width, height }}
      {...props}
    />
  )
}
