import React, { forwardRef } from "react";

/**
 * SEVO Standard Form Input Component
 * Consistent Category 3 typography, height, borders, focus rings and validation states.
 */
export const SevoInput = forwardRef(function SevoInput({
  label,
  error,
  helperText,
  icon: Icon = null,
  rightElement = null,
  size = "md",
  className = "",
  wrapperClassName = "",
  disabled = false,
  required = false,
  id,
  ...props
}, ref) {
  const inputId = id || (label ? `sevo-input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const sizeStyles = {
    sm: "h-9 text-xs px-3",
    md: "h-11 text-sm px-3.5",
    lg: "h-12 text-base px-4",
  }[size] || "h-11 text-sm px-3.5";

  const paddingLeft = Icon ? (size === "sm" ? "pl-9" : "pl-10") : "";
  const paddingRight = rightElement ? (size === "sm" ? "pr-9" : "pr-10") : "";

  return (
    <div className={`w-full flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-bold text-[var(--sevo-text-primary)] flex items-center gap-1"
        >
          <span>{label}</span>
          {required && <span className="text-[var(--sevo-error)]">*</span>}
        </label>
      )}

      <div className="relative w-full flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-[var(--sevo-text-muted)] pointer-events-none flex items-center justify-center">
            {typeof Icon === "function" ? <Icon size={size === "sm" ? 14 : 16} /> : Icon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-xl font-medium transition-all duration-150
            bg-[var(--sevo-surface)] text-[var(--sevo-text-primary)]
            border placeholder:text-[var(--sevo-text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--sevo-primary)]/20 focus:border-[var(--sevo-primary)]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--sevo-surface-raised)]
            ${error ? "border-[var(--sevo-error)] focus:ring-[var(--sevo-error)]/20 focus:border-[var(--sevo-error)]" : "border-[var(--sevo-border)] hover:border-[var(--sevo-border-strong)]"}
            ${sizeStyles} ${paddingLeft} ${paddingRight} ${className}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <span className="text-xs font-semibold text-[var(--sevo-error)]">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-xs text-[var(--sevo-text-muted)]">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});
