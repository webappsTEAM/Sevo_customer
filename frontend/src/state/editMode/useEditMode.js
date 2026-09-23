import { useContext } from "react"

import { EditModeContext } from "./EditModeContext.js"

/**
 * Reads the shared "Super Admin Edit Mode" state -- one toggle shared by
 * every customer-facing page, instead of each page/section declaring its
 * own separate `useState` (which is what LandingPage.jsx, and four
 * different places inside BookingPage.jsx, used to do independently,
 * meaning turning edit mode on for one page/section had no effect on any
 * other page or section).
 *
 * `canEdit` -- true only for an authenticated Super Admin (same check as
 *   useCanEditCustomerUI() always was) -- gates whether the floating
 *   toggle/edit affordances render at all.
 * `isEditMode` -- true only when canEdit is also true, so a stale "on" flag
 *   left over from a Super Admin session can never leak edit controls to a
 *   regular Admin or customer signed in later on the same browser.
 * `toggleEditMode()` / `setEditMode(bool)` -- flip it; no-ops for anyone
 *   without canEdit.
 * `showNotice(text, type)` / `notice` -- the shared save-success/failure
 *   toast, rendered once globally (see GlobalEditModeToggle.jsx) instead of
 *   every page owning its own toast state.
 */
export function useEditMode() {
  const ctx = useContext(EditModeContext)
  if (!ctx) throw new Error("EditModeProvider missing -- wrap the app in <EditModeProvider> (see main.jsx)")
  return ctx
}
