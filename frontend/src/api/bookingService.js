/**
 * bookingService.js
 * Public booking creation — POST /api/booking/ (service_requests.BookingCreateView).
 * No auth required. Used by the Goods Transport / Packers & Movers pages and
 * any other public booking form.
 */
import { apiRequest } from "./client.js"

export async function createBooking(payload) {
  return apiRequest("/booking/", { method: "POST", json: payload })
}
