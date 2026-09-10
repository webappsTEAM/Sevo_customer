/**
 * logisticsService.js
 * Catalog reads for Goods Transport (truck, two-wheeler) + Packers & Movers.
 * Backed by the new `logistics` Django app — see backend/logistics/views.py.
 * Public endpoints, no auth required (pre-login booking pages).
 */
import { apiRequest, unwrapResults } from "./client.js"

export async function fetchServiceTiers(category, city, weightClass) {
  const params = {}
  if (category && category !== "undefined") params.category = category
  if (city && city !== "undefined") params.city = city
  if (weightClass && weightClass !== "undefined") params.weight_class = weightClass
  const qs = new URLSearchParams(params).toString()
  const res = await apiRequest(`/logistics/tiers/${qs ? `?${qs}` : ""}`)
  return unwrapResults(res)
}

export async function fetchLanes(category, city) {
  const params = {}
  if (category && category !== "undefined") params.category = category
  if (city && city !== "undefined") params.city = city
  const qs = new URLSearchParams(params).toString()
  const res = await apiRequest(`/logistics/lanes/${qs ? `?${qs}` : ""}`)
  return unwrapResults(res)
}

export async function fetchServiceAreas(city) {
  const params = {}
  if (city && city !== "undefined") params.city = city
  const qs = new URLSearchParams(params).toString()
  const res = await apiRequest(`/logistics/areas/${qs ? `?${qs}` : ""}`)
  return unwrapResults(res)
}

export async function fetchGoodsCategories() {
  const res = await apiRequest("/logistics/goods-categories/")
  return unwrapResults(res)
}

export async function fetchGoodsItems(category) {
  const params = {}
  if (category && category !== "undefined") params.category = category
  const qs = new URLSearchParams(params).toString()
  const res = await apiRequest(`/logistics/goods-items/${qs ? `?${qs}` : ""}`)
  return unwrapResults(res)
}

export async function evaluateCargoFitment(payload) {
  const res = await apiRequest("/logistics/evaluate-cargo/", {
    method: "POST",
    body: payload,
  })
  return res?.data || res
}

/**
 * GT-B-01: ask the SERVER what this trip costs.
 *
 * The booking pages used to compute a display fare in the browser while
 * the backend computed the real one at booking time; any disagreement
 * showed up to the customer as a price that changed after they pressed
 * book. This is the authoritative quote -- the same computation, from the
 * same rates and the same server-measured distance, that the booking will
 * record.
 *
 * The caller must NOT send or derive a price. It renders what comes back.
 *
 * Resolves to { total, currency, pricing_mode, breakdown, tier_id } on
 * success, or { error, errorCode, message } when the server declines to
 * quote (missing coordinates, unknown tier, or a category that is not
 * distance-priced). Callers fall back to the tier's own starting price
 * for display only, and never treat that as an authoritative fare.
 */
export async function fetchLogisticsQuote({
  serviceCategory, tierId, pickup, drop, stopCount,
}) {
  if (!serviceCategory || !tierId || !pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
    return { error: true, errorCode: "COORDINATES_REQUIRED" }
  }
  try {
    const res = await apiRequest("/logistics/quote/", {
      method: "POST",
      body: {
        service_category: serviceCategory,
        tier_id: tierId,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        drop_latitude: drop.lat,
        drop_longitude: drop.lng,
        ...(stopCount ? { stop_count: stopCount } : {}),
      },
    })
    const data = res?.data || res
    if (!data || data.total == null) {
      return { error: true, errorCode: "NO_QUOTE" }
    }
    return {
      total: data.total,
      currency: data.currency || "INR",
      pricingMode: data.pricing_mode,
      isAuthoritative: Boolean(data.is_authoritative),
      isEstimate: Boolean(data.is_estimate),
      distanceSource: data.distance_source || data.breakdown?.distance_source,
      estimateNotice: data.estimate_notice || data.breakdown?.estimate_notice,
      breakdown: data.breakdown || null,
      tierId: data.tier_id,
    }
  } catch (err) {
    return {
      error: true,
      errorCode: err?.data?.error_code || "QUOTE_FAILED",
      message: err?.data?.message || "",
    }
  }
}

/**
 * Server-authoritative quote for Packers & Movers relocation.
 */
export async function fetchPackersMoversQuote({
  pickup,
  drop,
  inventory,
  packingTier = "standard",
  dismantlingRequired = true,
  unpackingRequired = false,
  pickupFloor = 0,
  pickupHasLift = true,
  dropFloor = 0,
  dropHasLift = true,
  relocationType = "Within City",
}) {
  if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
    return { error: true, errorCode: "COORDINATES_REQUIRED", message: "Pickup and drop coordinates are required." }
  }
  try {
    const res = await apiRequest("/logistics/packers-movers/quote/", {
      method: "POST",
      body: {
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        drop_latitude: drop.lat,
        drop_longitude: drop.lng,
        inventory,
        packing_tier: packingTier,
        dismantling_required: dismantlingRequired,
        unpacking_required: unpackingRequired,
        pickup_floor: pickupFloor,
        pickup_has_lift: pickupHasLift,
        drop_floor: dropFloor,
        drop_has_lift: dropHasLift,
        relocation_type: relocationType,
      },
    })
    const data = res?.data || res
    return data
  } catch (err) {
    return {
      error: true,
      errorCode: err?.data?.error_code || "QUOTE_FAILED",
      message: err?.data?.message || err?.message || "Failed to calculate quote.",
    }
  }
}

