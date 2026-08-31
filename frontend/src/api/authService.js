/**
 * authService.js
 * Centralised authentication API calls.
 *
 * Tokens are managed as httpOnly cookies by the server — this file never
 * reads, writes, or stores them.  Every call uses credentials:"include" so
 * the browser automatically attaches and receives cookies.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  import.meta.env.PROD
    ? `${window.location.origin}/Caltrack/api`
    : `/api`
)


async function fetchJSON(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const headers = new Headers(options.headers ?? {})
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  try {
    const token = localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access")
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  } catch (_) {}

  const res = await fetch(url, {
    ...options,
    credentials: "include",   // always send/receive cookies
    headers,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text || null }

  if (!res.ok) throw { status: res.status, body: data }
  return data
}

/**
 * Login — server sets qt_access + qt_refresh httpOnly cookies in response.
 * Returns { success: true } — no tokens in the body.
 * If 2FA is enabled, returns { success: true, requires_2fa: true } without cookies.
 */
export async function apiLogin(username, password) {
  const data = await fetchJSON("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password })
  })
  if (data?.access) {
    try {
      localStorage.setItem("caltrack_access_token", data.access)
      localStorage.setItem("qt_access", data.access)
      if (data.user) {
        localStorage.setItem("caltrack_user", JSON.stringify(data.user))
      }
    } catch (_) {}
  }
  return data
}

/**
 * 2FA Challenge — submit TOTP code after login returned requires_2fa: true.
 * On success the server sets auth cookies and returns { success: true }.
 */
export async function apiVerify2FA(code) {
  return fetchJSON("/auth/2fa/challenge/", {
    method: "POST",
    body: JSON.stringify({ code })
  })
}

// ── Unified customer OTP login (phone or email, one mechanism) ─────────────
// Single canonical pair — replaces the old apiRequestCustomerEmailOTP /
// apiVerifyCustomerEmailOTP / apiRequestCustomerPhoneOTP /
// apiVerifyCustomerPhoneOTP / apiRequestCustomerMobileOTP /
// apiVerifyCustomerMobileOTP functions, which called three separate,
// inconsistent backend OTP implementations.

export async function apiRequestCustomerOTP(identifier, channel) {
  return fetchJSON("/auth/customer/otp/request/", {
    method: "POST",
    body: JSON.stringify({ identifier, channel })
  })
}

export async function apiVerifyCustomerOTP(identifier, channel, otp_code) {
  const data = await fetchJSON("/auth/customer/otp/verify/", {
    method: "POST",
    body: JSON.stringify({ identifier, channel, otp_code })
  })
  if (data?.success && data?.data) {
    try {
      const token = data.data.auth_token || data.data.access
      if (token) {
        localStorage.setItem("caltrack_access_token", token)
        localStorage.setItem("qt_access", token)
      }
      if (data.data.phone) {
        localStorage.setItem("caltrack_customer_phone", data.data.phone)
      }
      if (data.data.user) {
        localStorage.setItem("caltrack_user", JSON.stringify(data.data.user))
      }
    } catch (_) {}
  }
  return data
}

export async function apiRequestCustomerPhoneOTP(phone) {
  return apiRequestCustomerOTP(phone, "phone")
}

export async function apiVerifyCustomerPhoneOTP(phone, otp_code) {
  return apiVerifyCustomerOTP(phone, "phone", otp_code)
}

export async function apiRequestCustomerMobileOTP(phone) {
  return apiRequestCustomerOTP(phone, "phone")
}

export async function apiVerifyCustomerMobileOTP(phone, otp_code) {
  return apiVerifyCustomerOTP(phone, "phone", otp_code)
}

export async function apiCompleteCustomerProfile(customer_id, full_name, { email = null, phone = null } = {}) {
  return fetchJSON("/auth/customer/profile/complete/", {
    method: "POST",
    body: JSON.stringify({ customer_id, full_name, email, phone })
  })
}

export async function apiUpdateCustomerLastLocation(location_data) {
  return fetchJSON("/auth/customer/profile/update/", {
    method: "PATCH",
    body: JSON.stringify({ last_known_location: location_data })
  })
}

export async function apiDetectCustomerLocation(latitude, longitude, accuracy = null) {
  return fetchJSON("/customer/location/detect/", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracy })
  })
}



export async function apiFetchCustomerBookings() {
  return fetchJSON("/booking/my-bookings/")
}

let _refreshInFlight = null
let _knownUnauthenticated = false

export function resetAuthSessionState(hasSession = true) {
  _knownUnauthenticated = !hasSession
  if (!hasSession) _refreshInFlight = null
}

/**
 * Fetch the current authenticated user from /auth/me/.
 * Browser sends the qt_access cookie automatically.
 * Returns user object or null (null means unauthenticated).
 * Has a 15-second timeout to handle slow DB connections after login.
 * On initial page load a 6-second fallback in AuthProvider ensures isReady=true.
 */
export async function apiFetchMe(customSignal = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const url = `${API_BASE_URL}/auth/me/`
    const headers = new Headers()
    let token = null
    try {
      token = localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access")
      if (token) headers.set("Authorization", `Bearer ${token}`)
    } catch (_) {}

    const hasStoredSession = Boolean(token || (() => {
      try { return !!localStorage.getItem("caltrack_user") } catch (_) { return false }
    })())

    // Link caller signal if provided
    let effectiveSignal = controller.signal
    if (customSignal) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
        effectiveSignal = AbortSignal.any([controller.signal, customSignal])
      } else {
        customSignal.addEventListener("abort", () => controller.abort(), { once: true })
      }
    }

    let res = await fetch(url, {
      credentials: "include",
      headers,
      signal: effectiveSignal,
    })

    // If access token is expired or forbidden (401 or 403), attempt a silent refresh ONLY if we had a prior session
    if ((res.status === 401 || res.status === 403) && hasStoredSession && !_knownUnauthenticated) {
      const refreshed = await apiRefreshToken()
      if (refreshed) {
        const retryHeaders = new Headers()
        try {
          const retryToken = localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access")
          if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`)
        } catch (_) {}

        res = await fetch(url, {
          credentials: "include",
          headers: retryHeaders,
          signal: effectiveSignal,
        })
      }
    }

    clearTimeout(timeoutId)
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text || null }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        _knownUnauthenticated = true
        try {
          localStorage.removeItem("caltrack_user")
          localStorage.removeItem("caltrack_access_token")
          localStorage.removeItem("qt_access")
        } catch (_) {}
      } else {
        console.warn("apiFetchMe failed with status:", res.status, text)
      }
      return null
    }
    if (data?.username) {
      _knownUnauthenticated = false
    }
    return data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
      return null
    }
    return null
  }
}

/**
 * Ask the server to silently rotate the access cookie using the refresh cookie.
 * Returns true on success, false if the session has fully expired.
 */
export async function apiRefreshToken() {
  if (_knownUnauthenticated) return false
  const hasStoredSession = (() => {
    try {
      return !!(localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access") || localStorage.getItem("caltrack_user"))
    } catch (_) {
      return false
    }
  })()
  if (!hasStoredSession) {
    _knownUnauthenticated = true
    return false
  }

  if (_refreshInFlight) return _refreshInFlight

  _refreshInFlight = (async () => {
    try {
      const data = await fetchJSON("/auth/refresh/", { method: "POST" })
      const ok = !!data?.success
      _knownUnauthenticated = !ok
      return ok
    } catch {
      _knownUnauthenticated = true
      return false
    } finally {
      _refreshInFlight = null
    }
  })()

  return _refreshInFlight
}

/**
 * Register a new organisation + admin user.
 * Server sets auth cookies in the response.
 * Returns { success, user }.
 */
export async function apiRegister(payload) {
  return fetchJSON("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/**
 * Register an initial admin user without an organization.
 * Server sets auth cookies in the response.
 * User is automatically routed to onboarding upon successful login.
 */
export async function apiRegisterAdmin(payload) {
  return fetchJSON("/auth/register-admin/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/**
 * Google OAuth — server exchanges the Google access token, then sets cookies.
 */
export async function apiGoogleLogin(googleAccessToken, inviteToken = null) {
  const payload = { access_token: googleAccessToken }
  if (inviteToken) {
    payload.invite_token = inviteToken
  }
  const data = await fetchJSON("/auth/google/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  if (data?.access) {
    try {
      localStorage.setItem("caltrack_access_token", data.access)
      localStorage.setItem("qt_access", data.access)
      if (data.user) {
        localStorage.setItem("caltrack_user", JSON.stringify(data.user))
      }
    } catch (_) {}
  }
  return data
}

/**
 * Customer Google OAuth — logs in or creates customer account, sets cookies.
 */
export async function apiCustomerGoogleLogin(googleAccessToken) {
  const data = await fetchJSON("/auth/customer/google/", {
    method: "POST",
    body: JSON.stringify({ access_token: googleAccessToken }),
  })
  if (data?.access) {
    try {
      localStorage.setItem("caltrack_access_token", data.access)
      localStorage.setItem("qt_access", data.access)
      if (data.user) {
        localStorage.setItem("caltrack_user", JSON.stringify(data.user))
      }
    } catch (_) {}
  }
  return data
}


/**
 * Request password reset email.
 */
export async function apiPasswordResetRequest(email) {
  return fetchJSON("/auth/password-reset/request/", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

/**
 * Confirm password reset with token.
 */
export async function apiPasswordResetConfirm(payload) {
  return fetchJSON("/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(payload), // { uid, token, new_password }
  })
}

// ── Error normalization ───────────────────────────────────────────────────────

/**
 * Logout — tells the server to clear both auth cookies.
 */
export async function apiLogout() {
  try {
    await fetchJSON("/auth/logout/", { method: "POST" })
  } catch {
    // Even if the network call fails, the client side clears user state
  }
}

// ── Error normalization ───────────────────────────────────────────────────────
export function extractAuthError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback
  const body = err?.body

  if (!body) {
    if (err instanceof TypeError) return "Cannot connect to server. Check your network."
    return fallback
  }

  if (typeof body === "string") {
    if (body.trim().startsWith("<")) return "Server error. Please try again shortly."
    return body
  }

  if (typeof body === "object") {
    if (typeof body.detail === "string") return body.detail
    const first = Object.values(body)[0]
    if (Array.isArray(first) && first.length > 0) return first[0]
    if (typeof first === "string") return first
  }

  return fallback
}

/**
 * Send OTP via backend
 */
export async function apiSendOTP(phone) {
  return fetchJSON("/auth/send-otp/", {
    method: "POST",
    body: JSON.stringify({ phone })
  })
}

/**
 * Verify OTP via backend
 */
export async function apiVerifyOTP(phone, code) {
  return fetchJSON("/auth/verify-otp/", {
    method: "POST",
    body: JSON.stringify({ phone, code })
  })
}

/**
 * Send email OTP to the currently authenticated user
 */
export async function apiSendEmailOTP() {
  return fetchJSON("/auth/send-email-otp/", {
    method: "POST"
  })
}

/**
 * Reset password using email OTP
 */
export async function apiResetPasswordWithOTP(payload) {
  return fetchJSON("/auth/password/reset-with-otp/", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}




