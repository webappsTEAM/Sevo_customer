import { apiRequest } from "../../../api/client.js";

export async function createBooking(payload) {
  return apiRequest("/booking/", { method: "POST", json: payload });
}

export async function fetchBookingServices() {
  return apiRequest("/services/");
}

export async function calculateBookingPrice(details) {
  return apiRequest("/service-requests/calculate-price/", {
    method: "POST",
    json: details,
  });
}
