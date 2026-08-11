import { apiRequest } from "../api/client.js";

export async function createPaymentOrder(bookingId, amount) {
  return apiRequest("/service-requests/payments/create-order/", {
    method: "POST",
    json: { booking_id: bookingId, amount },
  });
}

export async function verifyPayment(paymentDetails) {
  return apiRequest("/service-requests/payments/verify/", {
    method: "POST",
    json: paymentDetails,
  });
}
