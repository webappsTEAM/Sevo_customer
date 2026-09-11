import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useLocation } from "react-router-dom"

import { EditModeContext } from "./EditModeContext.js"
import { useCanEditCustomerUI } from "../../ui/components/SuperAdminEditControls.jsx"

const STORAGE_KEY = "sevo_admin_edit_mode"

/**
 * Wraps the whole app (see main.jsx) so "Edit Mode" is one shared switch a
 * Super Admin can flip from any customer-facing page and have it apply
 * everywhere, instead of the old pattern where LandingPage.jsx and each of
 * BookingPage.jsx's four separate sections tracked their own independent
 * on/off state -- turning edit mode on for the homepage never affected the
 * checkout page, and vice versa.
 *
 * Persists the on/off choice in sessionStorage (survives navigation and a
 * refresh within the same tab, clears when the tab closes) purely as a
 * convenience -- it is re-validated against canEdit on every render, so it
 * can never grant edit access to anyone who isn't currently a Super Admin.
 *
 * `canEdit` also honors the same "preview link" allowance LandingPage.jsx
 * already had (?preview=true or ?edit=true/1/superAdminEdit=1 in the URL) --
 * this is exactly how the admin panel's "Edit Preview" tool
 * (HomePageCustomizerPage.jsx) opens any page inside its iframe with edit
 * controls already visible, and also lets a Super Admin share a preview
 * link with someone else to just *see* the edit affordances (every save
 * call is still independently re-checked server-side via
 * RequireModuleAccess, so a non-admin opening such a link can never
 * actually persist a change). Generalizing that one page's rule into this
 * shared provider is what lets EVERY page recognize the same preview link,
 * instead of only the homepage understanding it.
 */
export function EditModeProvider({ children }) {
  const isSuperAdminUser = useCanEditCustomerUI()
  const location = useLocation()

  const isPreviewParam = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return (
      params.get("preview") === "true" ||
      params.get("edit") === "true" ||
      params.get("edit") === "1" ||
      params.get("superAdminEdit") === "1"
    )
  }, [location.search])

  const canEdit = isSuperAdminUser || isPreviewParam

  const [rawEnabled, setRawEnabled] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      return false
    }
  })

  // If the signed-in user stops being a Super Admin (logout, role change,
  // switching accounts in the same tab) AND there's no preview-link
  // allowance active, edit mode must not silently stay "on" in memory even
  // though nothing renders its controls anymore.
  useEffect(() => {
    if (!canEdit && rawEnabled) setRawEnabled(false)
  }, [canEdit, rawEnabled])

  // A preview link (e.g. from the admin panel's Edit Preview iframe) turns
  // edit mode on immediately, same as LandingPage.jsx always did for its
  // own ?edit=true param -- generalized here so it works no matter which
  // page the iframe is currently pointed at.
  useEffect(() => {
    if (isPreviewParam) setRawEnabled(true)
    // Only ever auto-*enable* from the URL; never auto-disable, so
    // navigating within the preview iframe to a URL without the param
    // (e.g. a relative link the page itself generates) doesn't kick the
    // admin back out of edit mode mid-session.
  }, [isPreviewParam])

  const setEditMode = useCallback((next) => {
    if (!canEdit) return
    setRawEnabled(Boolean(next))
    try {
      sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      /* private browsing / storage disabled -- edit mode still works for
         this render, it just won't survive a refresh */
    }
  }, [canEdit])

  const toggleEditMode = useCallback(() => {
    setEditMode(!rawEnabled)
  }, [rawEnabled, setEditMode])

  const [notice, setNotice] = useState(null)
  const noticeTimerRef = useRef(null)

  const showNotice = useCallback((text, type = "success") => {
    setNotice({ text, type })
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2500)
  }, [])

  useEffect(() => () => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
  }, [])

  const value = useMemo(() => ({
    canEdit,
    isEditMode: canEdit && rawEnabled,
    setEditMode,
    toggleEditMode,
    notice,
    showNotice,
  }), [canEdit, rawEnabled, setEditMode, toggleEditMode, notice, showNotice])

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}
