import React from "react"
import { SevoButton } from "./SevoButton.jsx"

/**
 * SEVO Unified Empty State Component
 */
export function SevoEmptyState({
  icon: Icon = null,
  title = "No items found",
  description = "There are no records to display at this time.",
  actionLabel = null,
  onAction = null,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--sevo-surface-raised)] border border-[var(--sevo-border)] flex items-center justify-center text-[var(--sevo-primary)] mb-4 shadow-sm">
          <Icon className="w-8 h-8 stroke-[1.5]" />
        </div>
      )}
      <h4 className="text-base font-extrabold text-[var(--sevo-text-primary)] mb-1">
        {title}
      </h4>
      <p className="text-xs text-[var(--sevo-text-secondary)] leading-relaxed mb-5 max-w-xs">
        {description}
      </p>
      {actionLabel && onAction && (
        <SevoButton variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </SevoButton>
      )}
    </div>
  )
}
