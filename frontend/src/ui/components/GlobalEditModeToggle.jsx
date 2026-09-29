import { useLocation } from "react-router-dom"
import { Pencil, ShieldCheck } from "lucide-react"

import { useEditMode } from "../../state/editMode/useEditMode.js"
import { SaveNoticeToast } from "./SuperAdminEditControls.jsx"

const ADMIN_ROUTE_PREFIXES = [
  "/dashboard",
  "/get-started",
  "/reports",
  "/platform",
  "/customers",
  "/catalog",
  "/settings",
  "/admin",
  "/support",
  "/marketing",
  "/inventory",
  "/vegetables/admin",
  "/login",
  "/organization-signup",
  "/accept-invite",
  "/reset-password",
  "/onboarding",
]

/**
 * Persistent floating "Edit Mode" switch, rendered once (see App.jsx) so it
 * follows an authorized Super Admin across customer-facing storefront pages
 * (e.g. /home, /vegetables, /booking, /marketplace) to allow inline content/pricing editing.
 * Hidden on internal admin management consoles where inline storefront editing does not apply.
 */
export function GlobalEditModeToggle() {
  const { canEdit, isEditMode, toggleEditMode, notice } = useEditMode()
  const location = useLocation()
  const pathname = (location.pathname || "").toLowerCase()

  const isAdminRoute = ADMIN_ROUTE_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  )

  if (!canEdit || isAdminRoute) return null

  return (
    <>
      <button
        type="button"
        onClick={toggleEditMode}
        className={`fixed bottom-[calc(4.5rem+var(--safe-area-bottom))] lg:bottom-5 right-5 z-[9990] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl font-black text-xs transition-all cursor-pointer ${
          isEditMode
            ? "bg-indigo-600 text-white ring-4 ring-indigo-300/60 hover:bg-indigo-700"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
        title={isEditMode ? "Exit Edit Mode" : "Enable Edit Mode -- edit this page directly"}
      >
        {isEditMode ? <ShieldCheck className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        <span>{isEditMode ? "Editing Live Site" : "Edit Mode"}</span>
      </button>
      <SaveNoticeToast notice={notice} />
    </>
  )
}
