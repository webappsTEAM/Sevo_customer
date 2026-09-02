import { useEffect, useState } from "react"
import { apiRequest } from "../../../api/client.js"
import { useToast, ToastBanner } from "./useToast.jsx"
import {
  LayoutGrid,
  Package,
  Puzzle,
  CheckCircle2,
  XCircle,
  ArchiveX,
  FileEdit,
  Boxes,
  Tag,
  Activity,
  ArrowUpRight,
  FolderOpen,
  Wrench,
  CheckSquare,
  FileText,
  ChevronRight,
  ShieldCheck,
  Zap,
  ChefHat,
  Sparkles,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { routes } from "../../../ui/routes.js"

// ── Premium KPI Card ───────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color }) {
  return (
    <div
      className="relative flex items-center gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(11,24,47,0.03)] hover:shadow-[0_8px_24px_rgba(11,24,47,0.07)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
    >
      {/* Accent left border stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
      
      {/* Icon container with translucent background */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ background: `${color}10`, border: `1px solid ${color}25` }}
      >
        <Icon className="w-5.5 h-5.5" style={{ color }} />
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
          {label}
        </div>
        <div className="text-3xl font-extrabold tabular-nums leading-none text-slate-900">
          {value ?? "—"}
        </div>
        {sub && (
          <div className="text-[10px] text-slate-400 mt-1.5 font-semibold leading-none flex items-center gap-1">
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Premium Status Row ──────────────────────────────────────────────────────
function StatusRow({ label, value, total, color, icon: Icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
        style={{ background: `${color}10`, border: `1px solid ${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">{value}</span>
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-md"
              style={{ background: `${color}15`, color }}
            >
              {pct}%
            </span>
          </div>
        </div>
        <div className="h-2 bg-slate-100/80 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── SVG Donut Chart ────────────────────────────────────────────────────────
function DonutRing({ segments, size = 110, thickness = 14 }) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  let offset = 0
  const arcs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0
    const dash = Math.max(0, pct * circ - 2)
    const arc = { ...seg, dash, offset }
    offset += pct * circ
    return arc
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg] drop-shadow-sm">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F8FAFC" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

// ── Premium Health Row ─────────────────────────────────────────────────────
function HealthRow({ label, value, ok, pct, color }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
            ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-slate-700 truncate">{label}</span>
      </div>
      
      <div className="flex items-center gap-4 shrink-0 ml-4">
        {pct !== undefined && (
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: ok ? "linear-gradient(90deg, #34d399, #10b981)" : "linear-gradient(90deg, #fbbf24, #f59e0b)",
              }}
            />
          </div>
        )}
        
        <span
          className={`text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider text-right w-44 truncate ${
            ok
              ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
              : "bg-amber-50/50 border-amber-100 text-amber-700"
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

// ── Premium Quick Nav Card ─────────────────────────────────────────────────
function QuickNav({ label, sub, icon: Icon, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 p-4.5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-slate-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 w-full group relative overflow-hidden"
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ background: `${color}10`, border: `1px solid ${color}20` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black text-slate-800 uppercase tracking-wider">{label}</div>
        <div className="text-[10px] text-slate-400 font-semibold mt-1">{sub}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
    </button>
  )
}

const STATUS_CONFIG = [
  { key: "DRAFT",    label: "Draft",    color: "#F59E0B", icon: FileEdit },
  { key: "ACTIVE",   label: "Active",   color: "#10B981", icon: CheckCircle2 },
  { key: "INACTIVE", label: "Inactive", color: "#6366F1", icon: XCircle },
  { key: "ARCHIVED", label: "Archived", color: "#94A3B8", icon: ArchiveX },
]

// ── Main Dashboard ─────────────────────────────────────────────────────────
export function CatalogDashboardPage() {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, showToast] = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        const [catRes, svcRes, pkgRes, addonRes] = await Promise.all([
          apiRequest("/settings/catalog/v2/categories/"),
          apiRequest("/settings/catalog/v2/services/"),
          apiRequest("/settings/catalog/v2/packages/"),
          apiRequest("/settings/catalog/v2/addons/"),
        ])
        const categories = catRes?.success ? catRes.data : []
        const services   = svcRes?.success  ? svcRes.data  : []
        const packages   = pkgRes?.success  ? pkgRes.data  : []
        const addons     = addonRes?.success ? addonRes.data : []

        const packagesByStatus = { DRAFT: 0, ACTIVE: 0, INACTIVE: 0, ARCHIVED: 0 }
        packages.forEach(p => { packagesByStatus[p.status] = (packagesByStatus[p.status] || 0) + 1 })

        setCounts({
          totalCategories:  categories.length,
          activeServices:   services.filter(s => s.is_active).length,
          inactiveServices: services.filter(s => !s.is_active).length,
          totalServices:    services.length,
          activePackages:   packagesByStatus.ACTIVE,
          totalPackages:    packages.length,
          activeAddOns:     addons.filter(a => a.is_active).length,
          totalAddOns:      addons.length,
          packagesByStatus,
        })
      } catch {
        showToast("Failed to load dashboard stats", "error")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const totalPkgs = counts?.totalPackages || 0
  const svcPct = counts && counts.totalServices > 0
    ? Math.round((counts.activeServices / counts.totalServices) * 100) : 0
  const pkgPct = counts && counts.totalPackages > 0
    ? Math.round((counts.activePackages / counts.totalPackages) * 100) : 0

  const donutSegments = STATUS_CONFIG.map(cfg => ({
    color: cfg.color,
    value: counts?.packagesByStatus[cfg.key] ?? 0,
  }))

  return (
    <div style={{ animation: "fadeUp 0.35s ease both" }} className="w-full p-6 space-y-6 bg-slate-50/40">
      <ToastBanner toast={toast} />

      {/* ── Premium Topbar Title ── */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">Service Catalog</h1>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Composition overview — categories, services, packages &amp; add-ons</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-black">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Catalog
        </div>
      </div>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-slate-200/60 shadow-sm animate-pulse" />
          ))}
        </div>
      )}

      {!loading && counts && (
        <>
          {/* ── KPI Strip (Pure White Enterprise Theme) ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard label="Categories"       value={counts.totalCategories}  sub="Service pillars"          icon={LayoutGrid}   color="#4F46E5" />
            <KPICard label="Active Services"  value={counts.activeServices}   sub={`of ${counts.totalServices} total`} icon={CheckCircle2} color="#10B981" />
            <KPICard label="Inactive Services" value={counts.inactiveServices} sub="Hidden from customers"   icon={XCircle}      color="#F43F5E" />
            <KPICard label="Active Packages"  value={counts.activePackages}   sub={`of ${counts.totalPackages} total`} icon={Package}      color="#2563EB" />
            <KPICard label="Active Add-ons"   value={counts.activeAddOns}     sub={`of ${counts.totalAddOns} total`}  icon={Puzzle}       color="#7C3AED" />
          </div>

          {/* ── Main Details Grid (Rows with borders, shadows, clean indicators) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Packages by Status */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,24,47,0.03)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/20">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Packages by Status</span>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-500 uppercase tracking-wider">{totalPkgs} total</span>
              </div>
              <div className="flex items-center gap-8 p-6">
                {/* Donut Chart & Legend */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="relative">
                    <DonutRing segments={donutSegments} size={110} thickness={13} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-850 leading-none">{totalPkgs}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">pkgs</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    {STATUS_CONFIG.map(cfg => (
                      <div key={cfg.key} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                        <span className="text-[9px] font-bold text-slate-500">{cfg.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Visual Progress Bars */}
                <div className="flex-1 min-w-0">
                  {STATUS_CONFIG.map(cfg => (
                    <StatusRow
                      key={cfg.key}
                      label={cfg.label}
                      value={counts.packagesByStatus[cfg.key] ?? 0}
                      total={totalPkgs}
                      color={cfg.color}
                      icon={cfg.icon}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Catalog Health */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,24,47,0.03)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/20">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Catalog Health Status</span>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-500 uppercase tracking-wider">At a glance</span>
              </div>
              <div className="p-6 space-y-1">
                <HealthRow label="Service Coverage" value={`${counts.totalCategories} categories configured`} ok={counts.totalCategories > 0} pct={Math.min(100, counts.totalCategories * 14)} />
                <HealthRow label="Active Services"  value={counts.totalServices > 0 ? `${svcPct}% of services live` : "No services yet"} ok={counts.activeServices > 0} pct={svcPct} />
                <HealthRow label="Active Packages"  value={counts.totalPackages > 0 ? `${counts.activePackages} of ${counts.totalPackages} live` : "No packages yet"} ok={counts.activePackages > 0} pct={pkgPct} />
                <HealthRow label="Add-ons Status"   value={counts.totalAddOns > 0 ? `${counts.activeAddOns} of ${counts.totalAddOns} active` : "No add-ons configured"} ok={counts.activeAddOns > 0} pct={counts.totalAddOns > 0 ? Math.round((counts.activeAddOns / counts.totalAddOns) * 100) : 0} />
                
                {/* Premium Banner Note */}
                <div className="pt-3">
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/50 to-blue-50/30 border border-indigo-100 flex items-start gap-3">
                    <Tag className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-[10.5px] text-indigo-700 font-bold leading-relaxed">
                      Revenue &amp; booking stats will appear here once the catalog is linked to bookings — <span className="underline decoration-indigo-400/50 font-black">Phase 2 Integration</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Navigation ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,24,47,0.03)] overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/20">
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Quick Navigation</span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-500 uppercase tracking-wider ml-auto">Manage components</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5 p-5">
              <QuickNav label="Categories"  sub={`${counts.totalCategories} configured`}    icon={FolderOpen}   color="#4F46E5" onClick={() => navigate(routes.catalog_categories)} />
              <QuickNav label="Services"    sub={`${counts.totalServices} total`}            icon={Wrench}       color="#10B981" onClick={() => navigate(routes.catalog_services)} />
              <QuickNav label="Packages"    sub={`${counts.totalPackages} total`}            icon={Package}      color="#2563EB" onClick={() => navigate(routes.catalog_packages)} />
              <QuickNav label="Add-ons"     sub={`${counts.totalAddOns} configured`}        icon={CheckSquare}  color="#7C3AED" onClick={() => navigate(routes.catalog_addons)} />
              <QuickNav label="Veg Recipes" sub="What can I make?"                          icon={ChefHat}      color="#059669" onClick={() => navigate(routes.catalog_recipes)} />
              <QuickNav label="Smart Recs"  sub="Goes well with"                            icon={Sparkles}     color="#D97706" onClick={() => navigate(routes.catalog_recommendations)} />
              <QuickNav label="Change Log"  sub="View audit trail"                          icon={FileText}     color="#64748B" onClick={() => navigate(routes.catalog_change_log)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
