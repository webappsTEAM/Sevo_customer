import React, { useState, useEffect } from "react"
import { Users, UserPlus, Shield, Mail, CheckCircle2, XCircle, Search, Key, LogOut, AlertTriangle } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

export default function PlatformUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("support")
  const [inviteFirstName, setInviteFirstName] = useState("")
  const [inviteLastName, setInviteLastName] = useState("")
  const [requireMFA, setRequireMFA] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [error, setError] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (roleFilter) params.append("role", roleFilter)
      const res = await apiRequest(`/platform/users/?${params.toString()}`)
      setUsers(res.users || [])
    } catch (err) {
      setError(err?.message || "Failed to load platform users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleSendInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    setInviteResult(null)
    try {
      const res = await apiRequest("/platform/users/invite/", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          first_name: inviteFirstName,
          last_name: inviteLastName,
          require_mfa: requireMFA,
        }),
        headers: { "Content-Type": "application/json" }
      })
      setInviteResult(res.invite)
      fetchUsers()
    } catch (err) {
      setError(err?.message || "Failed to send invitation.")
    } finally {
      setInviting(false)
    }
  }

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active
    const confirm = window.confirm(`Are you sure you want to ${nextStatus ? "activate" : "suspend"} ${user.username}?`)
    if (!confirm) return
    try {
      await apiRequest(`/platform/users/${user.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: nextStatus,
          reason: `Admin toggle status to ${nextStatus ? "active" : "suspended"}`,
        }),
        headers: { "Content-Type": "application/json" }
      })
      fetchUsers()
    } catch (err) {
      alert(err?.message || "Failed to update user status.")
    }
  }

  const handleRoleChange = async (user, newRole) => {
    if (newRole === user.role) return
    const confirm = window.confirm(`Change role for ${user.username} from ${user.role} to ${newRole}?`)
    if (!confirm) return
    try {
      await apiRequest(`/platform/users/${user.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          role: newRole,
          reason: `Role changed to ${newRole}`,
        }),
        headers: { "Content-Type": "application/json" }
      })
      fetchUsers()
    } catch (err) {
      alert(err?.message || "Failed to update role.")
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Platform Staff & Access Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage administrative staff, secure invitation links, role assignments, and MFA enforcement.
          </p>
        </div>

        <button
          onClick={() => {
            setShowInviteModal(true)
            setInviteResult(null)
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Invite Staff Member
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="support">Support</option>
          <option value="catalog">Catalog Manager</option>
          <option value="finance">Finance</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">2FA / MFA</th>
                <th className="px-4 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email || u.username}</div>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="text-xs font-semibold px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 capitalize"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="support">Support</option>
                      <option value="catalog">Catalog Manager</option>
                      <option value="finance">Finance</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {u.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        u.two_fa_enabled ? "bg-indigo-50 text-indigo-700 font-semibold" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.two_fa_enabled ? "Enforced" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        u.is_active
                          ? "text-rose-600 hover:bg-rose-50 border border-rose-200"
                          : "text-emerald-600 hover:bg-emerald-50 border border-emerald-200"
                      }`}
                    >
                      {u.is_active ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secure Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Invite Staff Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {inviteResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
                  <div className="font-semibold">Invitation Created Successfully!</div>
                  <p className="text-xs text-emerald-700 mt-1">
                    An activation link has been sent to <strong>{inviteResult.email}</strong>.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Direct Activation URL</label>
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.invite_link}
                    className="w-full text-xs p-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                  />
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">First Name</label>
                    <input
                      type="text"
                      required
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Last Name</label>
                    <input
                      type="text"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Assign Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="super_admin">Super Admin (Universal Global Access)</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="support">Support</option>
                    <option value="catalog">Catalog Manager</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="require_mfa"
                    checked={requireMFA}
                    onChange={(e) => setRequireMFA(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="require_mfa" className="text-xs text-slate-700 font-medium">
                    Require 2FA / MFA Setup upon account activation
                  </label>
                </div>

                {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                  >
                    {inviting ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
