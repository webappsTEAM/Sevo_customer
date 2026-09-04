/**
 * AuthProvider.jsx
 * Central authentication state for the application.
 *
 * Tokens are httpOnly cookies — this file never sees them.
 * Auth state is derived solely from the /auth/me/ endpoint:
 *   - If it returns a user   → authenticated
 *   - If it returns null/401 → not authenticated, redirect to /login
 */
// Last-resort ceiling on session restoration. Must stay comfortably longer
// than apiFetchMe()'s own 15s timeout, otherwise a slow-but-successful restore
// is mistaken for "not logged in" and the route guards bounce to login.
const AUTH_BOOTSTRAP_TIMEOUT_MS = 20000

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  apiFetchMe,
  apiLogin,
  apiVerify2FA,
  apiLogout,
  apiRegister,
  apiGoogleLogin,
  apiCustomerGoogleLogin,
} from "../../api/authService.js"
import { clearLegacyLocationStorage, clearAllCustomerLocationState } from "../../utils/customerLocationStorage.js"
import { AuthContext } from "./AuthContext.js"

export function AuthProvider({ children }) {
  const formatUser = (data) => {
    if (!data?.username) return null
    return {
      id:        data.id         ?? null,
      customer_id: data.customer_id ?? data.customer_code ?? "",
      customerId: data.customer_id ?? data.customer_code ?? "",
      username:  data.username,
      email:     data.email      ?? "",
      firstName: data.first_name ?? "",
      lastName:  data.last_name  ?? "",
      fullName:  `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username,
      full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username,
      role:      data.role,
      is_staff:  data.is_staff ?? false,
      is_superuser: data.is_superuser ?? false,
      is_super_admin: Boolean(data.is_super_admin || data.is_superuser || data.role === "super_admin" || data.role === "superadmin"),
      isSuperAdmin: Boolean(data.is_super_admin || data.is_superuser || data.role === "super_admin" || data.role === "superadmin"),
      permissions: data.permissions ?? {},
      companyId: data.company,
      bio:       data.bio        ?? "",
      phone:     data.phone      ?? data.mobile_number ?? "",
      timezone:  data.timezone   ?? "Asia/Kolkata",
      language:  data.language   ?? "en",
      avatar_url:data.avatar_url ?? null,
      two_fa_enabled: data.two_fa_enabled ?? false,
      isCareAgent: data.is_care_agent ?? false,
      careRole: data.care_role ?? null,
      companyCountry: data.company_country ?? data.companyCountry ?? "IN",
      company_country: data.company_country ?? data.companyCountry ?? "IN",
      companyRegion: data.company_region ?? data.company_country ?? data.companyCountry ?? "IN",
      primaryCountry: data.primaryCountry ?? data.company_country ?? data.companyCountry ?? "IN",
      companyCurrency: data.company_currency ?? ((data.company_country || data.companyCountry || "IN") === "IN" ? "INR" : "USD"),
      companyCurrencySymbol: data.company_currency_symbol ?? ((data.company_country || data.companyCountry || "IN") === "IN" ? "₹" : "$"),
    }
  }

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("caltrack_user")
      if (raw) {
        const parsed = JSON.parse(raw)
        return formatUser(parsed)
      }
    } catch (_) {}
    return null
  })
  const [isReady, setIsReady] = useState(false)

  // ── Rehydrate user state from /auth/me/ ───────────────────────────────────
  const refreshMe = useCallback(async () => {
    let me;
    try {
      me = await apiFetchMe()
    } catch (e) {
      if (e?.name !== "AbortError" && !e?.message?.includes("aborted")) {
        console.error("apiFetchMe exception:", e)
      }
    }

    const u = formatUser(me)
    if (u) {
      setUser(u)
      try {
        localStorage.setItem("caltrack_user", JSON.stringify(me))
        if (me?.phone || me?.mobile_number) {
          localStorage.setItem("caltrack_customer_phone", me.phone || me.mobile_number)
        }
      } catch (_) {}
      if (me?.company_name) {
        localStorage.setItem("quicktims.orgName", me.company_name)
        window.dispatchEvent(new CustomEvent("quicktims:orgName"))
      }
      return u
    } else {
      try {
        const hasToken = localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access")
        if (!hasToken) {
          localStorage.removeItem("caltrack_user")
          setUser(null)
        }
      } catch (_) {}
      return null
    }
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (identifier, password) => {
      const res = await apiLogin(identifier, password)
      if (res?.requires_2fa) return { requires2FA: true }
      if (res?.access) {
        try {
          localStorage.setItem("caltrack_access_token", res.access)
          localStorage.setItem("qt_access", res.access)
        } catch (_) {}
      }
      if (res?.user) {
        const u = formatUser(res.user)
        if (u) {
          setUser(u)
          try {
            localStorage.setItem("caltrack_user", JSON.stringify(res.user))
          } catch (_) {}
          if (res.user.company_name) {
            localStorage.setItem("quicktims.orgName", res.user.company_name)
            window.dispatchEvent(new CustomEvent("quicktims:orgName"))
          }
          return u
        }
      }
      const meUser = await refreshMe()
      if (meUser) return meUser
      return null
    },
    [refreshMe]
  )

  // ── 2FA Verification ──────────────────────────────────────────────────────
  const verify2FA = useCallback(
    async (code) => {
      await apiVerify2FA(code)
      return await refreshMe()
    },
    [refreshMe]
  )

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (payload) => {
      await apiRegister(payload)
      return await refreshMe()
    },
    [refreshMe]
  )

  // ── Google OAuth (Staff) ──────────────────────────────────────────────────
  const loginWithGoogle = useCallback(
    async (googleAccessToken) => {
      const res = await apiGoogleLogin(googleAccessToken)
      if (res?.access) {
        try {
          localStorage.setItem("caltrack_access_token", res.access)
          localStorage.setItem("qt_access", res.access)
        } catch (_) {}
      }
      if (res?.user) {
        const u = formatUser(res.user)
        if (u) {
          setUser(u)
          try {
            localStorage.setItem("caltrack_user", JSON.stringify(res.user))
          } catch (_) {}
          if (res.user.company_name) {
            localStorage.setItem("quicktims.orgName", res.user.company_name)
            window.dispatchEvent(new CustomEvent("quicktims:orgName"))
          }
          return u
        }
      }
      return await refreshMe()
    },
    [refreshMe]
  )

  // ── Customer Google OAuth ─────────────────────────────────────────────────
  const loginWithCustomerGoogle = useCallback(
    async (googleAccessToken) => {
      const res = await apiCustomerGoogleLogin(googleAccessToken)
      if (res?.access) {
        try {
          localStorage.setItem("caltrack_access_token", res.access)
          localStorage.setItem("qt_access", res.access)
        } catch (_) {}
      }
      if (res?.user) {
        const u = formatUser(res.user)
        if (u) {
          setUser(u)
          try {
            localStorage.setItem("caltrack_user", JSON.stringify(res.user))
          } catch (_) {}
          return u
        }
      }
      return await refreshMe()
    },
    [refreshMe]
  )

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch (_) {}
    clearLegacyLocationStorage()
    localStorage.removeItem("quicktims.orgName")
    localStorage.removeItem("caltrack_activation_dossier")
    localStorage.removeItem("caltrack_access_token")
    localStorage.removeItem("qt_access")
    localStorage.removeItem("caltrack_user")
    localStorage.removeItem("caltrack_customer_phone")
    setUser(null)
    window.dispatchEvent(new CustomEvent("calservice_auth_changed", { detail: { user: null } }))
    window.dispatchEvent(new Event("calservice_address_changed"))
  }, [])

  // ── Track previous user ID for customer-switch detection ──────────────────
  const prevUserIdRef = useRef(user?.id || null)
  useEffect(() => {
    const currentId = user?.id || null
    if (prevUserIdRef.current !== currentId) {
      clearLegacyLocationStorage()
      prevUserIdRef.current = currentId
      window.dispatchEvent(new CustomEvent("calservice_auth_changed", { detail: { user } }))
      window.dispatchEvent(new Event("calservice_address_changed"))
    }
  }, [user?.id, user])

  // ── Bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    // A hard 4s timer used to force isReady=true even while the profile fetch
    // was still in flight. On a slow first paint (cold DB, slow network, or the
    // two serial calls this bootstrap makes) that flipped the app to
    // "ready, but no user", and the route guards then redirected to login --
    // which is why a plain browser refresh logged people out while their tokens
    // were valid the whole time. The safety net stays, so the app can never
    // hang forever, but it now outlasts the request's own timeout instead of
    // racing it, and a late-resolving bootstrap no longer loses the race.
    // apiFetchMe() is deliberately allowed up to 15s here for a cold database,
    // so a 4s ceiling guaranteed a false logout exactly when the backend was
    // slowest.
    let settled = false
    const fallbackTimer = setTimeout(() => {
      if (!settled) setIsReady(true)
    }, AUTH_BOOTSTRAP_TIMEOUT_MS)

    refreshMe()
      .catch((e) => console.error("refreshMe error:", e))
      .finally(() => {
        settled = true
        clearTimeout(fallbackTimer)
        setIsReady(true)
      })

    return () => clearTimeout(fallbackTimer)
  }, [refreshMe])

  // ── Real-time customer login event listener ───────────────────────────────
  useEffect(() => {
    const handleCustomerLogin = (e) => {
      const payload = e?.detail
      if (payload?.user) {
        const u = formatUser(payload.user)
        if (u) {
          setUser(u)
          try {
            localStorage.setItem("caltrack_user", JSON.stringify(payload.user))
          } catch (_) {}
        }
      }
      refreshMe().catch(() => {})
    }
    window.addEventListener("calservices:customer_login", handleCustomerLogin)
    return () => window.removeEventListener("calservices:customer_login", handleCustomerLogin)
  }, [refreshMe])

  // ── Session expiry event ──────────────────────────────────────────────────
  useEffect(() => {
    const handle = async () => {
      try {
        await apiLogout()
      } catch (_) {}
      clearLegacyLocationStorage()
      localStorage.removeItem("quicktims.orgName")
      localStorage.removeItem("caltrack_activation_dossier")
      localStorage.removeItem("caltrack_access_token")
      localStorage.removeItem("qt_access")
      localStorage.removeItem("caltrack_user")
      localStorage.removeItem("caltrack_customer_phone")
      setUser(null)
      window.dispatchEvent(new CustomEvent("calservice_auth_changed", { detail: { user: null } }))
      window.dispatchEvent(new Event("calservice_address_changed"))
    }
    window.addEventListener("quicktims:session-expired", handle)
    return () => window.removeEventListener("quicktims:session-expired", handle)
  }, [])

  // ── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({ isReady, user, login, verify2FA, register, loginWithGoogle, loginWithCustomerGoogle, logout, refreshMe }),
    [isReady, user, login, verify2FA, register, loginWithGoogle, loginWithCustomerGoogle, logout, refreshMe]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
