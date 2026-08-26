import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * SEVO Standard Page Header Component
 * Enforces Category 3 typography hierarchy, badge alignment, breadcrumbs and actions.
 * 
 * @param {string} title - Main page title
 * @param {string} subtitle - Description / subtitle
 * @param {React.ReactNode} icon - Optional icon node
 * @param {React.ReactNode} badge - Optional badge node (e.g. SevoBadge)
 * @param {Array<{label: string, to?: string}>} breadcrumbs - Optional breadcrumb array
 * @param {React.ReactNode} actions - Action buttons on the right side
 */
export function SevoPageHeader({
  title,
  subtitle,
  icon: Icon = null,
  badge = null,
  breadcrumbs = null,
  actions = null,
  className = "",
  children,
}) {
  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--sevo-text-muted)] mb-3 flex-wrap">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={12} className="shrink-0 opacity-50" />}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-[var(--sevo-primary)] transition-colors font-semibold"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-[var(--sevo-text-secondary)] font-bold" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          {Icon && (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--sevo-primary-light)] text-[var(--sevo-primary)] flex items-center justify-center shrink-0 shadow-xs border border-[var(--sevo-primary)]/15">
              {typeof Icon === "function" ? <Icon size={22} /> : Icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--sevo-text-primary)] tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[var(--sevo-text-secondary)] font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Optional Child Elements (e.g. Filter bar / Tabs) */}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
