import React, { useState, useEffect } from "react"
import { Activity, Shield, Filter, RefreshCw, AlertCircle, Info } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (moduleFilter) params.append("module", moduleFilter)
      if (severityFilter) params.append("severity", severityFilter)
      const res = await apiRequest(`/platform/audit/?${params.toString()}`)
      setLogs(res.audit_logs || [])
    } catch (err) {
      console.error("Error fetching audit logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [moduleFilter, severityFilter])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" /> Platform-Wide Audit Trail
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Immutable log of all administrative actions, role modifications, customer state overrides, and RBAC changes.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All Modules</option>
          <option value="users">Users & Staff</option>
          <option value="customers">Customers</option>
          <option value="bookings">Bookings</option>
          <option value="rbac">RBAC Matrix</option>
          <option value="security">Security</option>
          <option value="settings">Settings Hub</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All Severities</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Severity</th>
                <th className="px-4 py-4">Actor</th>
                <th className="px-4 py-4">Action</th>
                <th className="px-4 py-4">Module</th>
                <th className="px-6 py-4">Reason / Notes</th>
                <th className="px-4 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        log.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : log.severity === "WARN"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {log.actor}
                    {log.actor_role && <span className="text-xs text-slate-400 font-normal ml-1">({log.actor_role})</span>}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs font-bold text-slate-700">{log.action}</td>
                  <td className="px-4 py-4 text-xs font-semibold text-indigo-600 capitalize">{log.module}</td>
                  <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">{log.reason || "—"}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-mono">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                    No audit records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
