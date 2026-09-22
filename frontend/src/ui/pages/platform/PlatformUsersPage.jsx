import React, { useState, useEffect } from "react"
import { Users, UserPlus, Shield, Mail, CheckCircle2, XCircle, Search, Key, LogOut, AlertTriangle, SlidersHorizontal, X as XIcon } from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"

// Modules where offering fine-grained overrides doesn't make sense —
// mirrors accounts.permissions' own reasoning (rbac/settings are inherently
// Super-Admin-level, not something to hand out module-by-module here).
const PERMISSION_UI_EXCLUDED_MODULES = new Set(["rbac"])

// The backend's Global RBAC has ONE "catalog" module covering every
// sellable item — groceries, products, and services all live on the same
// Package model (see service_requests/models.py). There is no separate
// "Groceries" vs "Products" module in the actual system, so rather than
// inventing a second, disconnected permission model, this label just makes
// that scope explicit wherever "catalog" appears in the permission UI.
const MODULE_DISPLAY_LABELS = {
  catalog: "Catalog (Groceries, Products & Services)",
}
function moduleLabel(mod) {
  return MODULE_DISPLAY_LABELS[mod] || mod.replace(/_/g, " ")
}

// Only Super Admin and Admin are offered as assignable roles going forward
// (access is now controlled via per-user Custom Permissions instead of
// fixed roles like Manager/Support/Catalog Manager/Finance). These labels
// exist only so that any EXISTING account still holding one of the retired
// roles keeps displaying correctly instead of showing a blank/invalid
// option in the role dropdown — they are not offered as choices anywhere.
const LEGACY_ROLE_LABELS = {
  manager: "Manager (legacy)",
  support: "Support (legacy)",
  catalog: "Catalog Manager (legacy)",
  finance: "Finance (legacy)",
}

/** Union of every action any role can perform on a module, per the live
 * Global RBAC matrix — this is "every action that exists for this module"
 * without hardcoding a second list of action names anywhere. */
function buildActionsByModule(matrix) {
  const out = {}
  for (const [mod, roleMap] of Object.entries(matrix || {})) {
    const set = new Set()
    for (const actions of Object.values(roleMap || {})) {
      (actions || []).forEach((a) => set.add(a))
    }
    out[mod] = Array.from(set).sort()
  }
  return out
}

/**
 * Module x Action permission checkbox grid — reused for both the "Invite
 * Staff Member" form and the "Manage Permissions" modal for an existing
 * user, since they save through the same shape: {module: [actions]}.
 */
function PermissionMatrix({ modules, actionsByModule, value, onChange }) {
  const toggleAction = (mod, action) => {
    const current = new Set(value[mod] || [])
    if (current.has(action)) current.delete(action)
    else current.add(action)
    const next = { ...value }
    if (current.size > 0) next[mod] = Array.from(current)
    else delete next[mod]
    onChange(next)
  }

  const selectAll = (mod) => {
    onChange({ ...value, [mod]: [...(actionsByModule[mod] || [])] })
  }
  const clearAll = (mod) => {
    const next = { ...value }
    delete next[mod]
    onChange(next)
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-3 bg-slate-50/60">
      {modules.filter((m) => !PERMISSION_UI_EXCLUDED_MODULES.has(m) && (actionsByModule[m] || []).length > 0).map((mod) => {
        const actions = actionsByModule[mod] || []
        const selected = new Set(value[mod] || [])
        return (
          <div key={mod} className="bg-white border border-slate-200 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 capitalize">{moduleLabel(mod)}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => selectAll(mod)} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">
                  Select All
                </button>
                <button type="button" onClick={() => clearAll(mod)} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {actions.map((action) => (
                <label key={action} className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(action)}
                    onChange={() => toggleAction(mod, action)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  {action.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PlatformUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("admin")
  const [inviteFirstName, setInviteFirstName] = useState("")
  const [inviteLastName, setInviteLastName] = useState("")
  const [requireMFA, setRequireMFA] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [error, setError] = useState(null)

  // Module x Action permission customization — Super Admin only (see
  // backend platform_control.views.PlatformUserInviteView/DetailView).
  // This IS the primary access-control mechanism for every non-Super-Admin
  // account: "Admin Type" below just picks the account's base type, and
  // the module/action grid here is what actually determines what the
  // account can see and do — always shown, not tucked behind a toggle.
  const [modules, setModules] = useState([])
  const [actionsByModule, setActionsByModule] = useState({})
  const [invitePermissions, setInvitePermissions] = useState({})
  const [permUser, setPermUser] = useState(null) // the row currently being edited, or null
  const [permSelections, setPermSelections] = useState({})
  const [permSaving, setPermSaving] = useState(false)
  const [permError, setPermError] = useState(null)

  const isSuperAdminHere = Boolean(
    currentUser?.is_superuser || currentUser?.is_super_admin || currentUser?.role === "super_admin" || currentUser?.isSuperAdmin
  )

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

  const fetchRbacMatrix = async () => {
    try {
      const res = await apiRequest("/platform/rbac/matrix/")
      setModules(res.modules || [])
      setActionsByModule(buildActionsByModule(res.matrix || {}))
    } catch (err) {
      // Non-fatal: the invite/edit flows still work with plain role
      // selection, just without the permission customization panel.
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  useEffect(() => {
    if (isSuperAdminHere) fetchRbacMatrix()
  }, [isSuperAdminHere])

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
      const payload = {
        email: inviteEmail,
        role: inviteRole,
        first_name: inviteFirstName,
        last_name: inviteLastName,
        require_mfa: requireMFA,
      }
      if (inviteRole !== "super_admin" && Object.keys(invitePermissions).length > 0) {
        payload.permissions = invitePermissions
      }
      const res = await apiRequest("/platform/users/invite/", {
        method: "POST",
        body: JSON.stringify(payload),
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

  const openPermissionsModal = (user) => {
    setPermUser(user)
    setPermSelections(user.custom_permissions || {})
    setPermError(null)
  }

  const closePermissionsModal = () => {
    setPermUser(null)
    setPermSelections({})
    setPermError(null)
  }

  const handleSavePermissions = async () => {
    if (!permUser) return
    setPermSaving(true)
    setPermError(null)
    try {
      await apiRequest(`/platform/users/${permUser.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          permissions: permSelections,
          reason: `Module permissions customized for ${permUser.username}`,
        }),
        headers: { "Content-Type": "application/json" }
      })
      closePermissionsModal()
      fetchUsers()
    } catch (err) {
      setPermError(err?.message || "Failed to update permissions.")
    } finally {
      setPermSaving(false)
    }
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    setInvitePermissions({})
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Admin Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Invite Admins and control exactly which modules and actions each one can access. Only Super
            Admin can create accounts or change permissions here.
          </p>
        </div>

        <button
          onClick={() => {
            setShowInviteModal(true)
            setInviteResult(null)
            setInviteRole("admin")
            setInvitePermissions({})
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Invite Admin
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
                      {!["super_admin", "admin"].includes(u.role) && (
                        <option value={u.role}>
                          {LEGACY_ROLE_LABELS[u.role] || u.role}
                        </option>
                      )}
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
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdminHere && u.role !== "super_admin" && u.id !== currentUser?.id && (
                        <button
                          onClick={() => openPermissionsModal(u)}
                          title="Edit this Admin's module permissions"
                          className="text-xs font-medium px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 inline-flex items-center gap-1"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Edit Permissions
                        </button>
                      )}
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
                    </div>
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
              <h3 className="text-lg font-bold text-slate-900">Invite Admin</h3>
              <button onClick={closeInviteModal} className="text-slate-400 hover:text-slate-600">
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
                  onClick={closeInviteModal}
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
                  <label className="text-xs font-semibold text-slate-700">Admin Type / Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin (full, unrestricted access)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {inviteRole === "super_admin"
                      ? "Super Admin always gets full, unrestricted access to every module — the permissions below don't apply."
                      : "This only sets the account's base type. What this Admin can actually see and do is entirely determined by the permissions you set below."}
                  </p>
                </div>

                {inviteRole !== "super_admin" && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                        Customize Access
                      </span>
                      {Object.keys(invitePermissions).length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                          {Object.keys(invitePermissions).length} module{Object.keys(invitePermissions).length === 1 ? "" : "s"} configured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Tick exactly what this Admin should be able to view, create, edit, or delete, module by
                      module. A module left fully unchecked means no access — the Admin won't see it in their
                      dashboard, and the backend will reject any request they make to it.
                    </p>
                    {modules.length > 0 ? (
                      <PermissionMatrix
                        modules={modules}
                        actionsByModule={actionsByModule}
                        value={invitePermissions}
                        onChange={setInvitePermissions}
                      />
                    ) : (
                      <p className="text-[11px] text-amber-600">Loading available modules…</p>
                    )}
                  </div>
                )}

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
                    onClick={closeInviteModal}
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

      {/* Manage Permissions Modal (existing user) */}
      {permUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  Edit Permissions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {permUser.full_name || permUser.username} &middot; role:{" "}
                  <span className="capitalize font-medium">{permUser.role}</span>
                </p>
              </div>
              <button onClick={closePermissionsModal} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Leave a module unchecked to use this user's default role access. Checking (or clearing) actions
              here overrides that module's default for this user only — including granting "No Access" by
              leaving every action in a module unchecked after removing it from the default.
            </p>

            <PermissionMatrix
              modules={modules}
              actionsByModule={actionsByModule}
              value={permSelections}
              onChange={setPermSelections}
            />

            {permError && <div className="text-xs text-rose-600 font-medium">{permError}</div>}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closePermissionsModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permSaving}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
              >
                {permSaving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
