/**
 * dailyEssentialsCartSync.js
 *
 * Syncs the Daily Essentials quick-commerce cart to the real backend
 * (carts app: /api/carts/daily_essentials/...) — see
 * DAILY_ESSENTIALS_FRONTEND_IMPLEMENTATION_PLAN.md, Phase 1.
 *
 * The existing UI (VegetableFullScreenPage, VegCartDrawerModal, and
 * friends) keeps its local `foodCart` shape — { "Name (unit)": quantity }
 * — since that shape is deeply threaded through a lot of existing render
 * logic (pricing, saver-pack multipliers, etc.) and rewriting all of that
 * is out of scope here. This module is the sync layer underneath it:
 * every local mutation also gets mirrored to the backend Cart, keyed by
 * `package_id` (not by name), which is what CartItem actually keys on.
 *
 * Multiple foodCart keys can resolve to the same package_id (e.g. a "2 x
 * 500g" saver-pack key is the same Package as the plain "500g" key, just a
 * quantity multiplier) — the backend only cares about the total quantity
 * per package, so callers should pass the *total* quantity for that
 * package across all of its foodCart keys, not a per-key delta.
 *
 * This is a plain module-level cache, not React state — components call
 * these functions directly from their existing mutation handlers and
 * don't need to re-render off of it (the local foodCart state they
 * already have is still what drives the UI).
 */
import { apiRequest } from "../api/client.js"

// packageId -> CartItem id, populated by fetchDailyEssentialsCart()
let cartItemIdByPackage = {}
let hydratePromise = null

/**
 * GET the customer's active daily_essentials cart and return its items.
 * Also (re)builds the packageId -> CartItem id map used by
 * syncPackageQuantity() below.
 */
export async function fetchDailyEssentialsCart() {
  const res = await apiRequest("/carts/daily_essentials/")
  const items = (res && res.success && res.data && Array.isArray(res.data.items)) ? res.data.items : []
  cartItemIdByPackage = {}
  items.forEach((it) => {
    if (it && it.package != null) cartItemIdByPackage[it.package] = it.id
  })
  return items
}

/**
 * Call once before the first mutation in a component's lifecycle so
 * cartItemIdByPackage is populated before any PATCH/DELETE needs it.
 * Safe to call repeatedly -- only fetches once per page load.
 */
export function ensureDailyEssentialsCartHydrated() {
  if (!hydratePromise) {
    hydratePromise = fetchDailyEssentialsCart().catch((err) => {
      // Don't cache a rejected promise -- a transient failure shouldn't
      // permanently block sync for the rest of the session.
      hydratePromise = null
      throw err
    })
  }
  return hydratePromise
}

/**
 * Set the total backend quantity for one package. Resolves to POST (new
 * CartItem), PATCH (existing), or DELETE (quantity <= 0) as appropriate.
 * Returns { ok: true } or { ok: false, error, message } -- callers decide
 * how to surface a failure (toast, rollback, etc.); this never throws.
 */
export async function syncPackageQuantity(packageId, nextQuantity, { customization } = {}) {
  if (packageId == null) return { ok: false, message: "No package id to sync." }
  try {
    await ensureDailyEssentialsCartHydrated()
  } catch (err) {
    // Hydration failing shouldn't block every future write forever --
    // proceed treating this package as "unknown to the server yet".
  }

  const existingItemId = cartItemIdByPackage[packageId]
  try {
    if (nextQuantity <= 0) {
      if (existingItemId) {
        await apiRequest(`/carts/daily_essentials/items/${existingItemId}/`, { method: "DELETE" })
        delete cartItemIdByPackage[packageId]
      }
      return { ok: true }
    }

    if (existingItemId) {
      const res = await apiRequest(`/carts/daily_essentials/items/${existingItemId}/`, {
        method: "PATCH",
        json: { quantity: nextQuantity, ...(customization ? { customization } : {}) },
      })
      if (!res || res.success === false) {
        return { ok: false, message: res?.message || "Couldn't update your cart." }
      }
      return { ok: true }
    }

    const res = await apiRequest("/carts/daily_essentials/items/", {
      method: "POST",
      json: { package_id: packageId, quantity: nextQuantity, ...(customization ? { customization } : {}) },
    })
    if (!res || res.success === false) {
      return { ok: false, message: res?.message || "Couldn't add that to your cart." }
    }
    if (res.data && res.data.id != null) {
      cartItemIdByPackage[packageId] = res.data.id
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err, message: err?.body?.message || "Couldn't reach the server. Your cart may be out of sync." }
  }
}

/** Clear the cached CartItem-id map (e.g. after checkout empties the cart, or on logout). */
export function resetDailyEssentialsCartCache() {
  cartItemIdByPackage = {}
  hydratePromise = null
}
