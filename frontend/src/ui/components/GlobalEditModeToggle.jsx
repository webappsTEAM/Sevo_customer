import { Pencil, ShieldCheck } from "lucide-react"

import { useEditMode } from "../../state/editMode/useEditMode.js"
import { SaveNoticeToast } from "./SuperAdminEditControls.jsx"

/**
 * Persistent floating "Edit Mode" switch, rendered once (see App.jsx) so it
 * follows a Super Admin across every customer-facing page instead of each
 * page needing its own toggle bar wired in separately. Renders nothing for
 * anyone who isn't a Super Admin.
 */
export function GlobalEditModeToggle() {
  const { canEdit, isEditMode, toggleEditMode, notice } = useEditMode()

  if (!canEdit) return null

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
