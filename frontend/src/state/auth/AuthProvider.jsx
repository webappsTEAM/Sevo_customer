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
  const formatUser = (data) => {
    if (!data?.username || !data?.role) return null
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
      companyId: data.company,
      companyPermissions: data.company_permissions ?? null,
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
      console.error("apiFetchMe exception:", e)
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
      const meUser = await refreshMe()
      if (meUser) return meUser
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
    localStorage.removeItem("caltrack_access_token")
    localStorage.removeItem("qt_access")
    localStorage.removeItem("caltrack_user")
    localStorage.removeItem("caltrack_customer_phone")
    setUser(null)
  }, [])

  // ── Bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsReady(true)
    }, 4000)

    refreshMe()
      .catch((e) => console.error("refreshMe error:", e))
      .finally(() => {
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
      await apiLogout()
      localStorage.removeItem("quicktims.orgName")
      localStorage.removeItem("caltrack_activation_dossier")
      localStorage.removeItem("caltrack_access_token")
      localStorage.removeItem("qt_access")
      localStorage.removeItem("caltrack_user")
      localStorage.removeItem("caltrack_customer_phone")
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
