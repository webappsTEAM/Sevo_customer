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

// "Areas We Serve" is derived server-side from real coverage for this
// city + service category (truck | two_wheeler | packers_movers).
export async function fetchServiceAreas(city, category) {
  const params = {}
  if (city && city !== "undefined") params.city = city
  if (category && category !== "undefined") params.category = category
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
  serviceCategory, tierId, pickup, drop, stopCount, waypoints, cargoItems, goodsCategoryId, goodsCategorySlug, declaredWeightKg,
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
        ...(Array.isArray(waypoints) && waypoints.length > 0 ? { waypoints } : {}),
        ...(Array.isArray(cargoItems) && cargoItems.length > 0 ? { cargo_items: cargoItems } : {}),
        ...(goodsCategoryId ? { goods_category_id: goodsCategoryId } : {}),
        ...(goodsCategorySlug ? { goods_category: goodsCategorySlug } : {}),
        ...(declaredWeightKg != null ? { declared_weight_kg: declaredWeightKg } : {}),
      },
    })
    const data = res?.data || res
    if (!data || data.total == null) {
      return { error: true, errorCode: "NO_QUOTE" }
    }
    return {
      total: data.total,
      quoteId: data.quote_id || data.breakdown?.quote_id || null,
      quoteHash: data.quote_hash || data.breakdown?.quote_hash || null,
      createdAt: data.created_at || data.breakdown?.created_at || null,
      expiresAt: data.expires_at || data.breakdown?.expires_at || null,
      currency: data.currency || "INR",
      pricingMode: data.pricing_mode,
      isAuthoritative: Boolean(data.is_authoritative),
      isEstimate: Boolean(data.is_estimate),
      distanceSource: data.distance_source || data.breakdown?.distance_source,
      estimateNotice: data.estimate_notice || data.breakdown?.estimate_notice,
      cargoSummary: data.cargo_summary || data.breakdown?.cargo_summary || null,
      specialHandling: data.special_handling || data.breakdown?.special_handling || "0.00",
      breakdown: data.breakdown || null,
      tierId: data.tier_id,
      tierName: data.tier_name,
    }
  } catch (err) {
    const payload = err?.data || err?.body || {}
    return {
      error: true,
      errorCode: payload.error_code || "QUOTE_FAILED",
      message: payload.message || err?.message || "",
      recommendedVehicle: payload.recommended_vehicle || null,
      suitableVehicles: payload.suitable_vehicles || [],
      cargoSummary: payload.cargo_summary || null,
      validationErrors: payload.validation_errors || [],
    }
  }
}

/**
 * Fetch database-backed P&M inventory categories and items.
 */
export async function fetchPackersMoversInventory() {
  const res = await apiRequest("/logistics/packers-movers/inventory/")
  return res?.data || res
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
  city = "Hosur",
  serviceTierId = null,
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
        city,
        selected_tier_id: serviceTierId,
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

/**
 * P1-11: Fetch authoritative booking slot availability evaluated server-side.
 */
export async function fetchLogisticsSlots({ date, category = "goods_transport_truck", city = "" } = {}) {
  const params = {}
  if (date) params.date = date
  if (category) params.category = category
  if (city) params.city = city
  const qs = new URLSearchParams(params).toString()
  try {
    const res = await apiRequest(`/logistics/slots/${qs ? `?${qs}` : ""}`)
    return res?.data || res
  } catch (err) {
    return {
      error: true,
      message: err?.data?.error || err?.message || "Failed to fetch slot availability",
    }
  }
}

/**
 * Fetch dynamic list of cities configured in system settings.
 * Pass { launchedOnly: true } to restrict to launched operating cities.
 */
export async function fetchLogisticsCities({ launchedOnly = false } = {}) {
  try {
    const url = launchedOnly ? "/settings/cities/?launched=true" : "/settings/cities/"
    const res = await apiRequest(url)
    return unwrapResults(res)
  } catch (err) {
    console.warn("Could not load cities:", err)
    return []
  }
}

/**
 * Fetch dynamic FAQs for Goods Transport & Packers/Movers.
 * Filterable by category ("truck", "two_wheeler", "packers_movers") and city.
 */
export async function fetchGTFaqs({ category = "", city = "" } = {}) {
  const params = {}
  if (category) params.category = category
  if (city) params.city = city
  const qs = new URLSearchParams(params).toString()
  try {
    const res = await apiRequest(`/logistics/faqs/${qs ? `?${qs}` : ""}`)
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  } catch (err) {
    console.warn("Failed to fetch GT FAQs:", err)
    return []
  }
}



/**
 * Service Coverage: is this pickup -> drop trip inside ACTIVE admin-configured
 * coverage for the category? Calls the route mode of the public geofence
 * check (settings_hub ServiceZone). Resolves to
 *   { inCoverage: true }  or
 *   { inCoverage: false, failedPoint: "pickup"|"drop", errorCode, message }
 * Network failures resolve to inCoverage: true -- the booking and quote
 * endpoints enforce coverage server-side regardless.
 */
export async function checkRouteCoverage({ serviceCategory, pickup, drop, vehicleClass, stops }) {
  if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) return { inCoverage: true, skipped: true }
  try {
    const res = await apiRequest("/settings/service-zones/check/", {
      method: "POST",
      body: {
        lat: pickup.lat,
        lng: pickup.lng,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        service_slug: serviceCategory,
        // Intermediate stops must be inside coverage too (same rule as pickup/drop).
        ...(Array.isArray(stops) && stops.length > 0 ? { stops: stops.map((p) => ({ lat: p.lat, lng: p.lng })) } : {}),
        ...(vehicleClass ? { vehicle_class: vehicleClass } : {}),
      },
    })
    const data = res?.data || res || {}
    if (data.in_zone === false) {
      return {
        inCoverage: false,
        failedPoint: data.failed_point || "",
        failedStopIndex: data.failed_stop_index ?? null,
        errorCode: data.error_code || "",
        message: data.message || "This trip is outside our service area.",
      }
    }
    return { inCoverage: true }
  } catch {
    return { inCoverage: true, skipped: true }
  }
}
