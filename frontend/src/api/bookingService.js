/**
 * bookingService.js
 * Public booking creation — POST /api/booking/ (service_requests.BookingCreateView).
 * No auth required. Used by the Goods Transport / Packers & Movers pages and
 * any other public booking form.
 */
import { apiRequest } from "./client.js"

export async function createBooking(payload, idempotencyKey = null) {
  const headers = {}
  const bodyData = { ...payload }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey
    if (!bodyData.idempotency_key) {
      bodyData.idempotency_key = idempotencyKey
    }
  }
  return apiRequest("/booking/", { method: "POST", json: bodyData, headers })
}

export async function cancelBooking(identifier, reason = "Customer requested cancellation", token = "", phone = "") {
  const body = { reason }
  if (token) body.token = token
  if (phone) body.phone = phone
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ""
  return apiRequest(`/booking/${identifier}/cancel/${tokenQuery}`, { method: "POST", json: body })
}

export async function getBookingStatus(identifier, token = "") {
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ""
  return apiRequest(`/booking/${identifier}/live-location/${tokenQuery}`)
}

