import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Shield,
  Truck,
  RotateCcw,
  Mail,
  HelpCircle,
  ChevronLeft,
  ArrowLeft,
  Calendar,
  Building,
  CheckCircle2,
  ExternalLink,
  Home,
} from "lucide-react";
import { AppBannerAndFooter } from "../../components/AppBannerAndFooter.jsx";
import { useLegalConfig } from "./legalConfig.js";

const LEGAL_NAV = [
  {
    id: "terms",
    path: "/terms",
    title: "Terms & Conditions",
    shortTitle: "Terms",
    icon: FileText,
    badge: "Binding",
  },
  {
    id: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy",
    icon: Shield,
    badge: "GDPR / DPDP",
  },
  {
    id: "service-delivery",
    path: "/service-delivery",
    title: "Service Delivery Policy",
    shortTitle: "Delivery",
    icon: Truck,
    badge: "On-Site / Doorstep",
  },
  {
    id: "cancellation-refund",
    path: "/cancellation-refund",
    title: "Cancellation & Refund",
    shortTitle: "Refunds",
    icon: RotateCcw,
    badge: "Protected",
  },
  {
    id: "contact",
    path: "/contact",
    title: "Contact Us",
    shortTitle: "Contact",
    icon: Mail,
  },
  {
    id: "help",
    path: "/help",
    title: "Help & Support",
    shortTitle: "Help",
    icon: HelpCircle,
  },
];

export function LegalLayout({ children, activePage, pageTitle, subtitle, versionKey }) {
  const { config } = useLegalConfig();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const currentVersion = versionKey && config.versions?.[versionKey] ? config.versions[versionKey] : "v2026.1";

  return (
    <div className="min-h-screen bg-[var(--sevo-bg)] flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 font-sans text-[var(--sevo-text-primary)] antialiased">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-40 bg-[var(--sevo-surface)]/95 backdrop-blur-md border-b border-[var(--sevo-border)] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-6 shrink-0 min-w-0">
            <Link to="/home" className="flex items-center gap-2 select-none cursor-pointer group">
              <img
                src="/assets/sevo_emblem_transparent.png"
                alt="SEVO Emblem"
                className="h-8 sm:h-9 w-auto shrink-0 object-contain group-hover:scale-105 transition-transform"
                style={{ height: '32px', width: 'auto' }}
              />
              <div className="flex flex-col min-w-0">
                <img
                  src="/assets/sevo_text_logo.png"
                  alt="SEVO"
                  className="shrink-0 object-contain"
                  style={{ height: '16px', width: 'auto', maxHeight: '16px' }}
                />
                <span className="text-[9px] sm:text-[10px] font-bold text-[var(--sevo-text-muted)] leading-tight mt-0.5 whitespace-nowrap">
                  Legal &amp; Policy Portal
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-[var(--sevo-text-secondary)]">
            <Link to="/home" className="hover:text-[var(--sevo-primary)] transition-colors">Home</Link>
            <Link to="/home#categories" className="hover:text-[var(--sevo-primary)] transition-colors">Services</Link>
            <Link to="/privacy" className="text-[var(--sevo-primary)] font-extrabold">Privacy &amp; Terms</Link>
            <Link to="/contact" className="hover:text-[var(--sevo-primary)] transition-colors">Contact Us</Link>
            <Link to="/help" className="hover:text-[var(--sevo-primary)] transition-colors">Help &amp; Support</Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-primary-light)] text-[var(--sevo-text-primary)] hover:text-[var(--sevo-primary)] font-bold text-xs border border-[var(--sevo-border)] hover:border-[var(--sevo-primary)]/30 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </button>

            <Link
              to="/contact"
              className="px-3 sm:px-4 py-2 rounded-xl bg-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-hover)] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 sm:gap-1.5 active:scale-95"
            >
              <Mail size={13} />
              <span className="hidden sm:inline">Contact Support</span>
              <span className="sm:hidden">Support</span>
            </Link>
          </div>
        </div>

        {/* ── Mobile Horizontal Pill Navigation Bar ── */}
        <div className="lg:hidden border-t border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)]/95 overflow-x-auto no-scrollbar py-2 px-3 flex gap-2">
          {LEGAL_NAV.map((item) => {
            const isActive = location.pathname === item.path || activePage === item.id;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-[var(--sevo-primary)] text-white shadow-xs"
                    : "bg-[var(--sevo-surface)] text-[var(--sevo-text-secondary)] border border-[var(--sevo-border)] hover:border-[var(--sevo-border-strong)] hover:bg-[var(--sevo-surface-raised)]"
                }`}
              >
                <Icon size={13} />
                <span>{item.shortTitle}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <section className="bg-gradient-to-b from-[var(--sevo-surface)] to-[var(--sevo-surface-raised)]/50 border-b border-[var(--sevo-border)] py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-[var(--sevo-primary-light)] text-[var(--sevo-primary)] border border-[var(--sevo-primary)]/20">
                <CheckCircle2 size={12} /> Official Policy
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[var(--sevo-surface)] text-[var(--sevo-text-secondary)] border border-[var(--sevo-border)]">
                <Calendar size={12} /> Effective: {config.effective_date}
              </span>
              {versionKey && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--sevo-surface-subtle)] text-[var(--sevo-text-primary)]">
                  {currentVersion}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[var(--sevo-text-primary)] tracking-tight leading-tight mb-2">
              {pageTitle}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-[var(--sevo-text-secondary)] font-medium leading-relaxed">
                {subtitle}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--sevo-border)] flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[var(--sevo-text-muted)] font-medium">
              <span className="flex items-center gap-1">
                <Building size={13} className="text-[var(--sevo-text-muted)]" />
                <span>Published by <strong>{config.company_legal_name}</strong></span>
              </span>
              <span>•</span>
              <span>CIN: <strong className="font-mono">{config.cin}</strong></span>
              <span>•</span>
              <span>Jurisdiction: <strong>{config.jurisdiction}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Container with Sticky Sidebar ── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Desktop Left Sticky Navigation Sidebar ── */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-[var(--sevo-surface)] rounded-3xl p-5 border border-[var(--sevo-border)] shadow-xs">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--sevo-text-muted)] px-3 mb-2">
                Legal &amp; Compliance Hub
              </h3>
              <nav className="space-y-1">
                {LEGAL_NAV.map((item) => {
                  const isActive = location.pathname === item.path || activePage === item.id;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? "bg-[var(--sevo-primary-light)] text-[var(--sevo-primary)] border border-[var(--sevo-primary)]/20 shadow-xs font-extrabold"
                          : "text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-text-primary)] hover:bg-[var(--sevo-surface-raised)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          className={isActive ? "text-[var(--sevo-primary)]" : "text-[var(--sevo-text-muted)]"}
                        />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            isActive
                              ? "bg-[var(--sevo-primary)]/20 text-[var(--sevo-primary)]"
                              : "bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-muted)]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Corporate Details Sidebar Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Building size={14} />
                <span>Corporate Registration</span>
              </div>
              <p className="text-xs font-bold text-slate-100 leading-snug">
                {config.company_legal_name}
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {config.registered_address}
              </p>
              <div className="pt-2 border-t border-slate-700/80 space-y-1 text-[11px] text-slate-400 font-mono">
                <div>CIN: <span className="text-slate-200">{config.cin}</span></div>
                <div>GSTIN: <span className="text-slate-200">{config.gstin}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                <a
                  href={`mailto:${config.support_email}`}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Mail size={12} />
                  <span>{config.support_email}</span>
                </a>
              </div>
            </div>
          </aside>

          {/* ── Policy Body Content ── */}
          <article className="lg:col-span-8 bg-[var(--sevo-surface)] rounded-3xl p-6 sm:p-10 border border-[var(--sevo-border)] shadow-xs leading-relaxed max-w-none">
            {children}
          </article>
        </div>
      </main>

      {/* ── Standard Footer Integration ── */}
      <AppBannerAndFooter />
    </div>
  );
}
