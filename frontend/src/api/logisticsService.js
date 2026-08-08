/**
 * logisticsService.js
 * Catalog reads for Goods Transport (truck, two-wheeler) + Packers & Movers.
 * Backed by the new `logistics` Django app — see backend/logistics/views.py.
 * Public endpoints, no auth required (pre-login booking pages).
 */
import { apiRequest, unwrapResults } from "./client.js"

export async function fetchServiceTiers(category, city, weightClass) {
  const params = { category, city }
  if (weightClass) params.weight_class = weightClass
  const qs = new URLSearchParams(params).toString()
  const res = await apiRequest(`/logistics/tiers/?${qs}`)
  return unwrapResults(res)
}

export async function fetchLanes(category, city) {
  const qs = new URLSearchParams({ category, city }).toString()
  const res = await apiRequest(`/logistics/lanes/?${qs}`)
  return unwrapResults(res)
}

export async function fetchServiceAreas(city) {
  const qs = new URLSearchParams({ city }).toString()
  const res = await apiRequest(`/logistics/areas/?${qs}`)
  return unwrapResults(res)
}
