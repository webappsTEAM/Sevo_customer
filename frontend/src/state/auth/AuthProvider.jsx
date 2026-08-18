/**
 * AuthProvider.jsx
 * Central authentication state for the application.
 *
 * Tokens are httpOnly cookies — this file never sees them.
 * Auth state is derived solely from the /auth/me/ endpoint:
 *   - If it returns a user   → authenticated
 *   - If it returns null/401 → not authenticated, redirect to /login
 */
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  apiLogin,
  apiVerify2FA,
  apiFetchMe,
  apiRegister,
  apiGoogleLogin,
  apiCustomerGoogleLogin,
  apiLogout,
} from "../../api/authService.js"
import { AuthContext } from "./AuthContext.js"

export function AuthProvider({ children }) {
  const [isReady, setIsReady] = useState(false)
  const [user, setUser]       = useState(null)

  const formatUser = (data) => {
    if (!data?.username || !data?.role) return null
    return {
      username:  data.username,
      email:     data.email      ?? "",
      firstName: data.first_name ?? "",
      lastName:  data.last_name  ?? "",
      role:      data.role,
      companyId: data.company,
      companyPermissions: data.company_permissions ?? null,
      bio:       data.bio        ?? "",
      phone:     data.phone      ?? "",
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

  // ── Rehydrate user state from /auth/me/ ───────────────────────────────────
  const refreshMe = useCallback(async () => {
    let me;
    try {
      me = await apiFetchMe()
    } catch (e) {
      console.error("apiFetchMe exception:", e)
    }

    const u = formatUser(me)
    if (u) {
      setUser(u)
      if (me?.company_name) {
        localStorage.setItem("quicktims.orgName", me.company_name)
        window.dispatchEvent(new CustomEvent("quicktims:orgName"))
      }
      return u
    } else {
      if (me) {
        console.warn("apiFetchMe returned incomplete user object:", me)
      }
      setUser(null)
      return null
    }
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (identifier, password) => {
      const res = await apiLogin(identifier, password)
      if (res?.requires_2fa) return { requires2FA: true }
      const meUser = await refreshMe()
      if (meUser) return meUser
      if (res?.user) {
        const u = formatUser(res.user)
        if (u) {
          setUser(u)
          if (res.user.company_name) {
            localStorage.setItem("quicktims.orgName", res.user.company_name)
            window.dispatchEvent(new CustomEvent("quicktims:orgName"))
          }
          return u
        }
      }
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
      await apiGoogleLogin(googleAccessToken)
      return await refreshMe()
    },
    [refreshMe]
  )

  // ── Customer Google OAuth ─────────────────────────────────────────────────
  const loginWithCustomerGoogle = useCallback(
    async (googleAccessToken) => {
      await apiCustomerGoogleLogin(googleAccessToken)
      return await refreshMe()
    },
    [refreshMe]
  )

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiLogout()
    localStorage.removeItem("quicktims.orgName")
    localStorage.removeItem("caltrack_activation_dossier")
    setUser(null)
  }, [])

  // ── Bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsReady(true)
    }, 6000)

    refreshMe()
      .catch((e) => console.error("refreshMe error:", e))
      .finally(() => {
        clearTimeout(fallbackTimer)
        setIsReady(true)
      })

    return () => clearTimeout(fallbackTimer)
  }, [refreshMe])

  // ── Session expiry event ──────────────────────────────────────────────────
  useEffect(() => {
    const handle = async () => {
      await apiLogout()
      localStorage.removeItem("quicktims.orgName")
      localStorage.removeItem("caltrack_activation_dossier")
      setUser(null)
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
