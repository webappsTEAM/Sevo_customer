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
