import { useAuth } from "./useAuth.js"

/**
 * useRole — centralized role helpers for the frontend.
 *
 * Roles that exist in CalServices:
 *   "admin"    – org owner / manager, full admin catalog & booking access
 *   "manager"  – operational management
 *   "support"  – customer care CSR
 *   "customer" – consumer / customer booking portal
 *
 * Usage:
 *   const { isAdmin, isSupport, isCustomer, role } = useRole()
 */
export function useRole() {
  const { user } = useAuth()
  const role = user?.role ?? null
  const isAdmin    = role === "admin" || role === "manager"
  const isSupport  = role === "support"
  const isCustomer = role === "customer" || (!isAdmin && !isSupport && !!user)
  return { isAdmin, isSupport, isCustomer, role }
}
