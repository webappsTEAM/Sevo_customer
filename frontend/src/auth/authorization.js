/**
 * Centralized Frontend Authorization Service for sevo.
 *
 * Principles:
 * 1. isSuperAdmin(user) grants universal unrestricted access across all modules.
 * 2. Normal users are evaluated strictly via user.permissions[module].includes(action).
 * 3. NO companyPermissions or tenant context fallbacks.
 */

export function isSuperAdmin(user) {
  if (!user) return false
  const role = String(user.role || "").toLowerCase()
  if (role === "super_admin" || role === "superadmin") {
    return true
  }
  if (user.is_super_admin === true || user.isSuperAdmin === true) {
    return true
  }
  // Only evaluate is_superuser if role is not explicitly set to a standard administrative/staff role
  if (user.is_superuser && !["admin", "manager", "support", "catalog", "finance", "customer", "employee"].includes(role)) {
    return true
  }
  return false
}

export function hasModule(user, moduleName) {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  const permissions = user.permissions || {}
  const actions = permissions[moduleName] || []
  return actions.length > 0
}

export function can(user, moduleName, action) {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  const permissions = user.permissions || {}
  const moduleActions = permissions[moduleName] || []
  return moduleActions.includes(action)
}
