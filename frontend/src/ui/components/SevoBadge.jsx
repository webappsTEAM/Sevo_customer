import React from "react"

/**
 * SEVO Status & Category Badge Component
 * Variants: "success" | "warning" | "error" | "info" | "neutral"
 * Appearance: "light" (subtle bg + strong text) | "solid" (solid bg + white text)
 */
export function SevoBadge({
  children,
  variant = "success",
  appearance = "light",
  icon: Icon = null,
  size = "sm",
  className = "",
  ...props
}) {
  const sizeStyles = {
    xs: "px-2 py-0.5 text-[10px] gap-1",
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-sm gap-2",
  }[size] || "px-2.5 py-1 text-xs gap-1.5"

  const variantStyles = {
    success: appearance === "solid"
      ? "bg-[var(--sevo-success)] text-white"
      : "bg-[var(--sevo-success-bg)] text-[var(--sevo-success)] border border-[var(--sevo-success-border)]",
    warning: appearance === "solid"
      ? "bg-[var(--sevo-warning)] text-white"
      : "bg-[var(--sevo-warning-bg)] text-[var(--sevo-warning)] border border-[var(--sevo-warning-border)]",
    error: appearance === "solid"
      ? "bg-[var(--sevo-error)] text-white"
      : "bg-[var(--sevo-error-bg)] text-[var(--sevo-error)] border border-[var(--sevo-error-border)]",
    info: appearance === "solid"
      ? "bg-[var(--sevo-info)] text-white"
      : "bg-[var(--sevo-info-bg)] text-[var(--sevo-info)] border border-[var(--sevo-info-border)]",
    neutral: appearance === "solid"
      ? "bg-[var(--sevo-text-secondary)] text-white"
      : "bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] border border-[var(--sevo-border)]",
  }[variant] || ""

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full select-none leading-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  )
}
