import React, { useState, useEffect } from "react"
import { Shield, Check, Save, RefreshCw, AlertCircle, Info } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export default function PlatformRBACPage() {
  const [modules, setModules] = useState([])
  const [roles, setRoles] = useState([])
  const [matrix, setMatrix] = useState({})
  const [selectedRole, setSelectedRole] = useState("manager")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const fetchMatrix = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest("/platform/rbac/matrix/")
      setModules(res.modules || [])
      setRoles(res.roles || [])
      setMatrix(res.matrix || {})
      if (res.roles && res.roles.length > 0 && !res.roles.includes(selectedRole)) {
        setSelectedRole(res.roles[0])
      }
    } catch (err) {
      setError(err?.message || "Failed to load RBAC permission matrix.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatrix()
  }, [])

  const handleToggleAction = (moduleName, action) => {
    setMatrix((prev) => {
      const next = { ...prev }
      if (!next[moduleName]) next[moduleName] = {}
      const roleActions = next[moduleName][selectedRole] ? [...next[moduleName][selectedRole]] : []

      if (roleActions.includes(action)) {
        next[moduleName][selectedRole] = roleActions.filter((a) => a !== action)
      } else {
        next[moduleName][selectedRole] = [...roleActions, action]
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await apiRequest("/platform/rbac/matrix/", {
        method: "PUT",
        body: JSON.stringify({
          matrix,
          reason: `Updated permissions for ${selectedRole}`,
        }),
        headers: { "Content-Type": "application/json" }
      })
      setMessage(res.message || "Permissions saved successfully!")
    } catch (err) {
      setError(err?.message || "Failed to save RBAC matrix.")
    } finally {
      setSaving(false)
    }
  }

  const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "export", "approve"]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" /> Centralized RBAC Permission Matrix
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Global module access toggles and domain-level CRUD permission control across all sevo modules.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm shadow-sm transition-all"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Matrix
        </button>
      </div>

      {/* Super Admin Universal Notice */}
      <div className="p-4 bg-indigo-50 border border-indigo-200/80 rounded-2xl flex items-start gap-3 text-indigo-900">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-indigo-950">Super Admin Global Authority Notice</div>
          <p className="text-indigo-700 leading-relaxed">
            Super Admins bypass the permission matrix automatically with unrestricted global access across all modules, endpoints, and records. Configure below for administrative staff roles: <strong>Admin, Manager, Support, Catalog, Finance</strong>.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600" /> {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" /> {error}
        </div>
      )}

      {/* Role Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${selectedRole === role
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
          >
            {role.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Module Name</th>
                <th className="px-4 py-4 text-center">View / Read</th>
                <th className="px-4 py-4 text-center">Create</th>
                <th className="px-4 py-4 text-center">Edit / Update</th>
                <th className="px-4 py-4 text-center">Delete</th>
                <th className="px-4 py-4 text-center">Export</th>
                <th className="px-4 py-4 text-center">Approve / Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((mod) => {
                const currentActions = matrix[mod]?.[selectedRole] || []
                return (
                  <tr key={mod} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 capitalize">
                      {mod.replace("_", " ")}
                    </td>
                    {STANDARD_ACTIONS.map((action) => {
                      const enabled = currentActions.includes(action)
                      return (
                        <td key={action} className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleAction(mod, action)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition-all ${enabled
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-slate-300 text-transparent hover:border-slate-400"
                              }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
