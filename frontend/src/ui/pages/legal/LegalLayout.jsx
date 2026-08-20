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
} from "lucide-react";
import { AppBannerAndFooter } from "../../components/AppBannerAndFooter.jsx";
import { CalTrackLogo } from "../../components/CalTrackLogo.jsx";
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 font-sans text-slate-800 antialiased">
      {/* ── Top Floating Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </button>

            <Link to="/home" className="flex items-center gap-2.5 group">
              <CalTrackLogo size={28} />
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 leading-none tracking-tight group-hover:text-emerald-700 transition-colors">
                  CalServices
                </span>
                <span className="text-[10px] font-semibold text-slate-400 leading-tight">
                  Legal &amp; Policy Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] font-extrabold text-slate-700 leading-tight">
                {config.company_legal_name}
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                GSTIN: {config.gstin}
              </span>
            </div>
            <Link
              to="/contact"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Mail size={13} />
              <span>Contact Support</span>
            </Link>
          </div>
        </div>

        {/* ── Mobile Horizontal Pill Navigation Bar ── */}
        <div className="lg:hidden border-t border-slate-100 bg-slate-50/90 overflow-x-auto no-scrollbar py-2 px-3 flex gap-2">
          {LEGAL_NAV.map((item) => {
            const isActive = location.pathname === item.path || activePage === item.id;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100"
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
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/60 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={12} /> Official Policy
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <Calendar size={12} /> Effective: {config.effective_date}
              </span>
              {versionKey && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/70 text-slate-700">
                  {currentVersion}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              {pageTitle}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                {subtitle}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Building size={13} className="text-slate-400" />
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
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-3 mb-2">
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
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-2xs font-extrabold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          className={isActive ? "text-emerald-600" : "text-slate-400"}
                        />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            isActive
                              ? "bg-emerald-200/70 text-emerald-900"
                              : "bg-slate-100 text-slate-500"
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
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
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
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm leading-relaxed prose prose-slate max-w-none">
            {children}
          </article>
        </div>
      </main>

      {/* ── Standard Footer Integration ── */}
      <AppBannerAndFooter />
    </div>
  );
}
