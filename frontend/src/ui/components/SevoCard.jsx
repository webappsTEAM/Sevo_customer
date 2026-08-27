import React from "react"

/**
 * SEVO Standard Card Component
 * Supports Concept 3 Light (#FFFFFF / #F8F5EE) and Concept 2 Dark (#0B1E43 / #102956)
 * Variants: "default" | "raised" | "subtle" | "interactive" | "glass"
 */
export function SevoCard({
  children,
  variant = "default",
  padding = "md",
  radius = "lg",
  className = "",
  onClick,
  ...props
}) {
  const isInteractive = variant === "interactive" || !!onClick

  const baseStyles = "transition-all duration-200 border text-[var(--sevo-text-primary)]"

  const variantStyles = {
    default: "bg-[var(--sevo-surface)] border-[var(--sevo-border)] shadow-[var(--sevo-shadow-xs)]",
    raised: "bg-[var(--sevo-surface-raised)] border-[var(--sevo-border)] shadow-[var(--sevo-shadow-sm)]",
    subtle: "bg-[var(--sevo-surface-subtle)] border-transparent",
    interactive: "bg-[var(--sevo-surface)] border-[var(--sevo-border)] shadow-[var(--sevo-shadow-xs)] hover:border-[var(--sevo-primary)] hover:shadow-[var(--sevo-shadow-md)] hover:-translate-y-0.5 cursor-pointer",
    glass: "bg-[var(--sevo-surface-glass)] backdrop-blur-md border-[var(--sevo-border)] shadow-[var(--sevo-shadow-sm)]",
  }[variant] || "bg-[var(--sevo-surface)] border-[var(--sevo-border)] shadow-[var(--sevo-shadow-xs)]"

  const paddingStyles = {
    none: "p-0",
    sm: "p-3 sm:p-3.5",
    md: "p-4 sm:p-5",
    lg: "p-6 sm:p-7",
  }[padding] || "p-4 sm:p-5"

  const radiusStyles = {
    sm: "rounded-[var(--sevo-radius-sm)]",
    md: "rounded-[var(--sevo-radius-md)]",
    lg: "rounded-[var(--sevo-radius-lg)]",
    xl: "rounded-[var(--sevo-radius-xl)]",
  }[radius] || "rounded-[var(--sevo-radius-lg)]"

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${paddingStyles} ${radiusStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
