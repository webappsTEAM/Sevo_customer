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
