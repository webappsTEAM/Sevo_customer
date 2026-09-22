/**
 * addressService.js
 * API helper functions for customer saved addresses.
 */

import { apiRequest } from "./client.js"

/**
 * POST /api/auth/customer/addresses/
 * Create a new saved address for the current authenticated customer.
 */
export async function apiCreateSavedAddress(payload) {
  return apiRequest("/auth/customer/addresses/", {
    method: "POST",
    json: payload,
  })
}

/**
 * GET /api/auth/customer/addresses/
 * List all saved addresses for the current authenticated customer.
 */
export async function apiListSavedAddresses() {
  return apiRequest("/auth/customer/addresses/", {
    method: "GET",
  })
}

/**
 * PATCH /api/auth/customer/addresses/:id/
 * Update an existing saved address.
 */
export async function apiUpdateSavedAddress(id, payload) {
  return apiRequest(`/auth/customer/addresses/${id}/`, {
    method: "PATCH",
    json: payload,
  })
}

/**
 * DELETE /api/auth/customer/addresses/:id/
 * Delete a saved address.
 */
export async function apiDeleteSavedAddress(id) {
  return apiRequest(`/auth/customer/addresses/${id}/`, {
    method: "DELETE",
  })
}

/**
 * POST /api/auth/customer/addresses/:id/set-default/
 * Set a saved address as the default address.
 */
export async function apiSetDefaultSavedAddress(id) {
  return apiRequest(`/auth/customer/addresses/${id}/set-default/`, {
    method: "POST",
    json: {},
  })
}
