import { useEffect, useState } from "react"
import { apiRequest } from "../../../api/client.js"
import { Card } from "../../components/kit.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

function StatTile({ label, value, accent = "#F59E0B" }) {
  return (
    <div className="bg-surface dark:bg-slate-900/60 rounded-2xl border border-stroke dark:border-slate-800 shadow-sm p-5">
      <div className="text-[11px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-black text-slate-900 dark:text-white" style={{ color: accent }}>{value}</div>
    </div>
  )
}

const STATUS_LABELS = { DRAFT: "Draft", ACTIVE: "Active", INACTIVE: "Inactive", ARCHIVED: "Archived" }

export function CatalogDashboardPage() {
  const [counts, setCounts] = useState(null)
  const [toast, showToast] = useToast()

  useEffect(() => {
    (async () => {
      try {
        const [catRes, svcRes, pkgRes, addonRes] = await Promise.all([
          apiRequest("/settings/catalog/v2/categories/"),
          apiRequest("/settings/catalog/v2/services/"),
          apiRequest("/settings/catalog/v2/packages/"),
          apiRequest("/settings/catalog/v2/addons/"),
        ])
        const categories = catRes.success ? catRes.data : []
        const services = svcRes.success ? svcRes.data : []
        const packages = pkgRes.success ? pkgRes.data : []
        const addons = addonRes.success ? addonRes.data : []

        const packagesByStatus = { DRAFT: 0, ACTIVE: 0, INACTIVE: 0, ARCHIVED: 0 }
        packages.forEach(p => { packagesByStatus[p.status] = (packagesByStatus[p.status] || 0) + 1 })

        setCounts({
          totalCategories: categories.length,
          activeServices: services.filter(s => s.is_active).length,
          inactiveServices: services.filter(s => !s.is_active).length,
          activePackages: packagesByStatus.ACTIVE,
          activeAddOns: addons.filter(a => a.is_active).length,
          packagesByStatus,
        })
      } catch {
        showToast("Failed to load dashboard counts", "error")
      }
    })()
  }, [])

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto space-y-6">
      <ToastBanner toast={toast} />
      <h1 className="text-xl font-black text-slate-900 dark:text-white mb-1">Service Catalog</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Composition overview. Booking-derived stats (most booked, revenue by service) land once the catalog is linked to bookings — see Phase 2 of the rollout.
      </p>

      {!counts ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatTile label="Categories" value={counts.totalCategories} accent="#4F46E5" />
            <StatTile label="Active Services" value={counts.activeServices} accent="#2563EB" />
            <StatTile label="Inactive Services" value={counts.inactiveServices} accent="#E94560" />
            <StatTile label="Active Packages" value={counts.activePackages} accent="#3B82F6" />
            <StatTile label="Active Add-ons" value={counts.activeAddOns} accent="#6366F1" />
          </div>

          <Card title="Packages by Status">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(counts.packagesByStatus).map(([status, count]) => (
                <StatTile key={status} label={STATUS_LABELS[status]} value={count} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
