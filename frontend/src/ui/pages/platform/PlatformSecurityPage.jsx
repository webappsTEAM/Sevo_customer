import React, { useState, useEffect } from "react"
import { ShieldCheck, Lock, AlertTriangle, Key, LogOut, CheckCircle2, RefreshCw } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export default function PlatformSecurityPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revokingId, setRevokingId] = useState(null)

  const fetchSecurity = async () => {
    setLoading(true)
    try {
      const res = await apiRequest("/platform/security/overview/")
      setData(res)
    } catch (err) {
      console.error("Error loading security overview:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurity()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" /> Platform Security & MFA Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            MFA enforcement status, active login activity, and privileged session management.
          </p>
        </div>

        <button
          onClick={fetchSecurity}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* MFA Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff Accounts</span>
          <div className="text-3xl font-bold text-slate-900 mt-2">{data?.staff_mfa?.total ?? "..."}</div>
          <div className="text-xs text-slate-500 mt-1">Platform administrators & agents</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">2FA / MFA Enabled</span>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{data?.staff_mfa?.enabled ?? "..."}</div>
          <div className="text-xs text-slate-500 mt-1">Protected with TOTP authentication</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MFA Compliance Rate</span>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{data?.staff_mfa?.enforcement_rate ?? 0}%</div>
          <div className="text-xs text-slate-500 mt-1">Target: 100% staff enforcement</div>
        </div>
      </div>

      {/* Recent Login History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Recent Authentication Activity</h3>
          <span className="text-xs text-slate-500">Live Login Logs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Account</th>
                <th className="px-4 py-4">Auth Method</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">IP Address</th>
                <th className="px-4 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recent_logins?.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{l.username}</td>
                  <td className="px-4 py-4 text-xs capitalize text-slate-600">{l.method?.replace("_", " ")}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        l.status === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {l.status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-mono text-slate-600">{l.ip_address || "—"}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {l.occurred_at ? new Date(l.occurred_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
