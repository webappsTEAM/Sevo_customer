import React from "react"
import { Loader2 } from "lucide-react"

/**
 * SEVO Standard Button Component
 * Supports Concept 3 Light (#0B8F7A / #0F5FBF) and Concept 2 Dark (#23B26D / #2E80E8)
 * Variants: "primary" | "secondary" | "outline" | "ghost" | "danger"
 * Sizes: "sm" | "md" | "lg"
 */
export function SevoButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = "left",
  fullWidth = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading

  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-150 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50"

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[36px]",
    md: "px-4 py-2 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3 text-base gap-2.5 min-h-[48px]",
  }[size] || "px-4 py-2 text-sm min-h-[44px]"

  const variantStyles = {
    primary: "bg-[var(--sevo-primary)] text-white hover:bg-[var(--sevo-primary-hover)] active:bg-[var(--sevo-primary-active)] shadow-sm hover:shadow-md border border-transparent",
    secondary: "bg-[var(--sevo-secondary)] text-white hover:bg-[var(--sevo-secondary-hover)] active:bg-[var(--sevo-secondary-active)] shadow-sm hover:shadow-md border border-transparent",
    outline: "bg-transparent text-[var(--sevo-text-primary)] border border-[var(--sevo-border)] hover:bg-[var(--sevo-surface-raised)] hover:border-[var(--sevo-border-strong)]",
    ghost: "bg-transparent text-[var(--sevo-text-secondary)] hover:bg-[var(--sevo-surface-raised)] hover:text-[var(--sevo-text-primary)] border-transparent",
    danger: "bg-[var(--sevo-error)] text-white hover:opacity-90 active:opacity-100 shadow-sm border border-transparent",
  }[variant] || ""

  const widthStyle = fullWidth ? "w-full" : ""

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === "right" && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  )
}
