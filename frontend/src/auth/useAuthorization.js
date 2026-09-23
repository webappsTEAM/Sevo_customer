/**
 * useAuthorization Hook
 * Provides reactive access to RBAC capabilities across frontend components.
 */
import { useAuth } from "../state/auth/useAuth.js"
import { isSuperAdmin as checkSuperAdmin, hasModule as checkModule, can as checkCan } from "./authorization.js"

export function useAuthorization() {
  const { user } = useAuth()

  const isSuperAdmin = checkSuperAdmin(user)

  const can = (moduleName, action) => checkCan(user, moduleName, action)
  const hasModule = (moduleName) => checkModule(user, moduleName)

  return {
    user,
    isSuperAdmin,
    can,
    hasModule,
    canCreate:   (mod) => can(mod, "create"),
    canEdit:     (mod) => can(mod, "edit"),
    canDelete:   (mod) => can(mod, "delete"),
    canExport:   (mod) => can(mod, "export"),
    canApprove:  (mod) => can(mod, "approve"),
    canAssign:   (mod) => can(mod, "assign"),
    canOverride: (mod) => can(mod, "override"),
    canMerge:    (mod) => can(mod, "merge"),
    canSuspend:  (mod) => can(mod, "suspend"),
    canPublish:  (mod) => can(mod, "publish"),
  }
}
