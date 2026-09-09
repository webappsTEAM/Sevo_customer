/**
 * client.js
 * Central API fetch wrapper.
 *
 * Tokens are stored as httpOnly cookies — JavaScript never touches them.
 * Every request uses credentials: "include" so the browser sends them
 * automatically.  On a 401 the client attempts a silent token refresh
 * (POST /auth/refresh/ — server rotates the access cookie).  If that
 * also fails the user is signed out via the session-expired event.
 */

import { apiRefreshToken } from "./authService.js"

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  import.meta.env.PROD
    ? `${window.location.origin}/Caltrack/api`
    : `/api`
)


// Track offline state so the banner can be shown once
let _offline = false
export function isOffline() { return _offline }

// Deduplicate concurrent GET requests
const _pendingRequests = new Map()

async function safeJson(res) {
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) }
  catch { return text }
}

/** Ask the server to rotate the access cookie using the refresh cookie. */
async function _silentRefresh() {
  return await apiRefreshToken()
}

export async function apiRequest(path, init = {}, attemptRefresh = true) {
  const method = (init.method || "GET").toUpperCase()
  const cacheKey = method === "GET" ? path + JSON.stringify(init.params || "") : null

  if (cacheKey && _pendingRequests.has(cacheKey)) {
    return _pendingRequests.get(cacheKey)
  }

  const requestPromise = (async () => {
    try {
      return await _executeRequest(path, init, attemptRefresh)
    } finally {
      if (cacheKey) _pendingRequests.delete(cacheKey)
    }
  })()

  if (cacheKey) _pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

async function _executeRequest(path, init = {}, attemptRefresh = true) {
  const method = (init.method || "GET").toUpperCase()
  const headers = new Headers(init.headers ?? {})
  let body = init.body

  // Attach stored access token if present and not already specified
  try {
    const token = localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access")
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  } catch (_) {}

  if (init.json !== undefined) {
    body = JSON.stringify(init.json)
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
  } else if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
    body = JSON.stringify(body)
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
  } else if (body instanceof FormData) {
    headers.delete("Content-Type")
  } else if (["POST", "PUT", "PATCH"].includes(method) && !headers.has("Content-Type") && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers.set("Content-Type", "application/json")
  }

  let cleanPath = path
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4)
  }

  try {
    const res = await fetch(`${API_BASE_URL}${cleanPath}`, {
      ...init,
      credentials: "include",               // always send auth cookies
      cache: "no-store",                    // prevent aggressive browser caching
      headers,
      body,
    })

    // 401 — try a silent token refresh then replay the original request once (only if a session existed)
    if (res.status === 401 && attemptRefresh) {
      const hasStoredToken = (() => {
        try {
          return !!(localStorage.getItem("caltrack_access_token") || localStorage.getItem("qt_access") || localStorage.getItem("caltrack_user"))
        } catch (_) {
          return false
        }
      })()

      if (hasStoredToken) {
        const refreshed = await _silentRefresh()
        if (refreshed) {
          return _executeRequest(path, init, false)   // replay, no second refresh
        }
        window.dispatchEvent(new CustomEvent("quicktims:session-expired"))
      }
      throw { status: 401, body: { detail: "Session expired or unauthorized." } }
    }

    if (!res.ok) {
      throw { status: res.status, body: await safeJson(res) }
    }

    _offline = false
    return safeJson(res)

  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err
    _offline = true
    throw err
  }
}

export function unwrapResults(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data
    if (Array.isArray(value.results)) return value.results
  }
  return []
}

/**
 * Pulls a human-readable message out of whatever apiRequest() throws.
 *
 * Views built with `_validation_error_response()` nest the message under
 * `errors.detail` (or `errors.<field>`), which is the shape most catch
 * blocks in this app were written to expect. But plenty of real failures
 * never go through that helper: DRF's own permission/auth/not-found/500
 * handling returns `{"detail": "..."}` at the TOP level, and a raw network
 * or CORS failure has no `body` at all. Catch blocks that only checked
 * `err.body.errors.detail` silently dropped all of those into a bare
 * "Delete failed" / "Save failed" with no clue what actually happened --
 * exactly the case where a 403, a stale/already-deleted row (404), or an
 * unhandled server exception (500) needs to be visible, not hidden.
 *
 * Always checks the nested `errors` shape FIRST (it's the more specific,
 * intentionally-raised message), then falls back to the standard
 * `{"detail": ...}` / `{"message": ...}` / `{"error": ...}` envelopes DRF
 * and Django use everywhere else, and finally to the HTTP status code so
 * the toast is never just a dead end.
 */
export function extractApiErrorMessage(err, fallback = "Request failed") {
  const body = err?.body
  const flatten = (val) => {
    if (val === null || val === undefined) return ""
    if (Array.isArray(val)) return val.map(flatten).filter(Boolean).join(" ")
    if (typeof val === "object") {
      return Object.entries(val)
        .map(([k, v]) => (k === "detail" || k === "non_field_errors" ? flatten(v) : `${k}: ${flatten(v)}`))
        .filter(Boolean)
        .join(" ")
    }
    return String(val)
  }

  if (body && typeof body === "object") {
    const fromErrors = body.errors !== undefined ? flatten(body.errors) : ""
    if (fromErrors) return fromErrors
    const fromDetail = flatten(body.detail)
    if (fromDetail) return fromDetail
    if (body.message) return flatten(body.message)
    if (body.error) return flatten(body.error)
  } else if (typeof body === "string" && body.trim()) {
    return body.trim()
  }

  if (err?.status) return `${fallback} (HTTP ${err.status})`
  return fallback
}
