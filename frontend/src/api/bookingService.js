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

export async function cancelBooking(identifier, reason = "Customer requested cancellation", optionsOrToken = "", optionalPhone = "") {
  const payload = { reason }
  let token = ""
  let phone = ""

  if (typeof optionsOrToken === "string") {
    token = optionsOrToken
    phone = optionalPhone
  } else if (optionsOrToken && typeof optionsOrToken === "object") {
    token = optionsOrToken.token || ""
    phone = optionsOrToken.phone || ""
  }

  if (!token) {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      token = urlParams.get("token") || sessionStorage.getItem("active_tracking_token") || localStorage.getItem("calservice_customer_token") || ""
    } catch (_) {}
  }
  if (!phone) {
    try {
      const savedObj = JSON.parse(sessionStorage.getItem("calservice_last_booking") || "{}")
      phone = savedObj?.phone || localStorage.getItem("caltrack_customer_phone") || ""
    } catch (_) {}
  }

  if (token) {
    payload.token = token
    payload.tracking_token = token
  }
  if (phone) {
    payload.phone = phone
  }

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ""
  return apiRequest(`/booking/${identifier}/cancel/${tokenQuery}`, { method: "POST", json: payload })
}

export async function getBookingStatus(identifier, token = "") {
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ""
  return apiRequest(`/booking/${identifier}/live-location/${tokenQuery}`)
}

