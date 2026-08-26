import React from "react";

/**
 * SEVO Standard Page Container Component
 * Enforces Category 3 responsive gutters, max-width, and vertical rhythm.
 * 
 * @param {string} maxWidth - "sm" | "md" | "lg" | "xl" | "full" (default: "xl" -> max-w-7xl)
 * @param {string} padding - "none" | "sm" | "md" | "lg" (default: "md")
 * @param {string} className - Additional Tailwind / custom classes
 */
export function SevoPageContainer({
  children,
  maxWidth = "xl",
  padding = "md",
  className = "",
  as: Component = "div",
  ...props
}) {
  const maxWidthStyles = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  }[maxWidth] || "max-w-7xl";

  const paddingStyles = {
    none: "px-0 py-0",
    sm: "px-3 sm:px-4 py-4 sm:py-6",
    md: "px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
    lg: "px-4 sm:px-8 lg:px-12 py-8 sm:py-12",
  }[padding] || "px-4 sm:px-6 lg:px-8 py-6 sm:py-8";

  return (
    <Component
      className={`w-full mx-auto ${maxWidthStyles} ${paddingStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
