import React, { useState, useEffect } from "react"
import { Shield, Users, Calendar, DollarSign, AlertTriangle, Activity, Lock, RefreshCw, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { apiRequest } from "../../../api/client.js"

export default function PlatformDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest("/platform/dashboard/summary/")
      setData(res)
    } catch (err) {
      setError(err?.message || "Failed to load platform dashboard metrics.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" /> Global Platform Control
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Command Center</h1>
          <p className="text-slate-400 text-sm mt-1">
            Unified global oversight across all CalTrack modules, staff permissions, and security.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Platform Users</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{data?.users?.total ?? "..."}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-medium text-slate-700">{data?.users?.active_staff ?? 0}</span> staff members ·{" "}
              <span className="font-medium text-slate-700">{data?.users?.customers ?? 0}</span> customers
            </div>
          </div>
          <Link to="/platform/users" className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-3 border-t border-slate-100">
            Manage Staff Directory <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Bookings</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{data?.bookings?.total ?? "..."}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="text-amber-600 font-medium">{data?.bookings?.pending ?? 0} pending</span> ·{" "}
              <span className="text-emerald-600 font-medium">{data?.bookings?.completed ?? 0} completed</span>
            </div>
          </div>
          <Link to="/bookings" className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-3 border-t border-slate-100">
            View Live Bookings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">
              ₹{(data?.finance?.total_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Verified paid orders platform-wide</div>
          </div>
          <Link to="/customers/payments" className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-3 border-t border-slate-100">
            Payment Ledgers <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Security & Audit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security & Alerts</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{data?.security?.security_alerts ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">
              <span className="text-slate-700 font-medium">{data?.security?.failed_logins_today ?? 0}</span> failed logins today
            </div>
          </div>
          <Link to="/platform/security" className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-3 border-t border-slate-100">
            Security Overview <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/platform/rbac"
          className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            RBAC Permission Matrix
          </h3>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Configure granular CRUD and domain action switches across all 35 CalTrack modules for each staff role.
          </p>
        </Link>

        <Link
          to="/platform/customers"
          className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            Customer 360 & Safe Merge
          </h3>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Manage orthogonal customer account statuses, VIP tiers, risk blacklist, and execute audited customer merges.
          </p>
        </Link>

        <Link
          to="/platform/audit"
          className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
            Platform Audit Trail
          </h3>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Live chronological timeline of all privileged Super Admin actions, role elevations, and state modifications.
          </p>
        </Link>
      </div>
    </div>
  )
}
