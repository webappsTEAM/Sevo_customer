/**
 * logisticsAdminService.js
 * Administrator reads and writes for the Goods & Transport rate card.
 *
 * Deliberately separate from logisticsService.js, whose own header says
 * "Public endpoints, no auth required (pre-login booking pages)". Everything
 * here requires an authenticated administrator holding `pricing:view`, and
 * the per-km rate card these return is not public — the customer-facing
 * tier endpoint exposes only `starting_price` and must stay that way.
 *
 * Nothing in this module computes a fare. quote_logistics_fare() on the
 * server remains the single calculation authority; this only edits the rows
 * that authority reads.
 */
import { apiRequest } from "./client.js"

const BASE = "/logistics/admin/tiers/"

/**
 * client.js throws `{ status, body }` on any non-2xx. Flatten that into the
 * one shape the pricing screen handles, so the page never has to know how
 * the transport reports failure.
 */
function asError(err) {
  const body = (err && typeof err === "object" && err.body) || {}
  const status = (err && err.status) || 0
  return {
    status,
    code: body.error_code || (status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "REQUEST_FAILED"),
    message:
      body.message ||
      body.detail ||
      (status === 403
        ? "Your role does not allow this change."
        : "The request could not be completed. Please try again."),
    // VALIDATION_ERROR -> { field: ["msg", ...] }
    errors: body.errors || null,
    // PRICING_FORBIDDEN / REASON_REQUIRED -> ["per_km_rate", ...]
    fields: body.fields || null,
    // TIER_CHANGED_ELSEWHERE -> the row as it now stands on the server
    current: body.current || null,
  }
}

/** GET the rate card. `filters` keys: city, category, is_active, search. */
export async function fetchAdminTiers(filters = {}) {
  const params = new URLSearchParams()
  if (filters.city) params.set("city", filters.city)
  if (filters.category) params.set("category", filters.category)
  if (filters.is_active) params.set("is_active", filters.is_active)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()
  try {
    const res = await apiRequest(`${BASE}${qs ? `?${qs}` : ""}`)
    return {
      ok: true,
      tiers: Array.isArray(res?.data) ? res.data : [],
      meta: res?.meta || null,
      notice: res?.price_lock_notice || "",
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/**
 * PATCH one tier.
 *
 * `changes` must carry ONLY the fields that actually changed — the server
 * writes one audit row per field it receives as different, and sending a
 * whole form back would be indistinguishable from an operator having
 * retyped every rate.
 *
 * `expectedUpdatedAt` is the `updated_at` the row carried when it was
 * loaded. The server refuses the write with TIER_CHANGED_ELSEWHERE if the
 * row moved in between, rather than silently overwriting a colleague.
 */
export async function updateAdminTier(id, changes, { reason = "", expectedUpdatedAt = null } = {}) {
  const payload = { ...changes }
  if (reason) payload.reason = reason
  if (expectedUpdatedAt) payload.expected_updated_at = expectedUpdatedAt
  try {
    const res = await apiRequest(`${BASE}${id}/`, { method: "PATCH", json: payload })
    return {
      ok: true,
      tier: res?.data || null,
      changed: Array.isArray(res?.changed) ? res.changed : [],
      message: res?.message || "",
      notice: res?.price_lock_notice || "",
    }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}

/** GET the audit trail for one tier (CatalogChangeLog rows, newest first). */
export async function fetchAdminTierHistory(id) {
  try {
    const res = await apiRequest(`${BASE}${id}/history/`)
    return { ok: true, rows: Array.isArray(res?.data) ? res.data : [] }
  } catch (err) {
    return { ok: false, error: asError(err) }
  }
}
