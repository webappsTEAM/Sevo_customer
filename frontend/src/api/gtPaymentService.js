/**
 * gtPaymentService.js
 * Paying for a Goods Transport / Packers & Movers booking that was created with
 * payment_method "ONLINE": Razorpay Checkout (or the server's sandbox) or the SEVO wallet.
 *
 * The server decides every amount (PaymentInitiateView / PaymentWalletPayView); nothing here
 * sends a price. Verification is server-side too (HMAC on the gateway signature).
 */
import { apiRequest, extractApiErrorMessage } from "./client.js"

export async function fetchPaymentConfig() {
  try {
    const res = await apiRequest("/payment/config/")
    return res?.data || res || { online_available: false }
  } catch {
    return { online_available: false }
  }
}

export async function fetchWalletBalance() {
  try {
    const res = await apiRequest("/wallet/")
    const bal = Number((res?.data || res)?.balance)
    return Number.isFinite(bal) ? bal : null
  } catch {
    return null                                  // guest / not logged in
  }
}

export async function fetchInsuranceTerms(declaredValue) {
  try {
    const res = await apiRequest(`/logistics/insurance-terms/?declared_value=${encodeURIComponent(declaredValue)}`)
    return (res?.data || res) || null
  } catch {
    return null
  }
}

function loadCheckoutScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No browser"))
    if (window.Razorpay) return resolve()
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Could not load the payment window."))
    document.body.appendChild(s)
  })
}

async function verify(bookingId, trackingToken, payload) {
  await apiRequest("/payment/verify/", {
    method: "POST",
    body: { booking_id: bookingId, token: trackingToken || undefined, ...payload },
  })
}

/**
 * @returns {Promise<{ok: boolean, message?: string, cancelled?: boolean}>}
 */
export async function settleBookingPayment({ bookingId, trackingToken, method, prefill = {} }) {
  try {
    if (method === "wallet") {
      await apiRequest("/payment/wallet-pay/", { method: "POST", body: { booking_id: bookingId } })
      return { ok: true }
    }

    const res = await apiRequest("/payment/initiate/", {
      method: "POST",
      body: { booking_id: bookingId, token: trackingToken || undefined },
    })
    const order = res?.data || res
    if (order.sandbox) {
      await verify(bookingId, trackingToken, { order_id: order.order_id })
      return { ok: true }
    }

    await loadCheckoutScript()
    return await new Promise((resolve) => {
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency || "INR",
        order_id: order.order_id,
        name: "SEVO",
        description: order.description || "Booking payment",
        prefill: {
          name: prefill.name || order.customer_name || "",
          email: prefill.email || order.customer_email || "",
          contact: prefill.phone || order.customer_phone || "",
        },
        handler: async (response) => {
          try {
            await verify(bookingId, trackingToken, {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
            resolve({ ok: true })
          } catch (err) {
            resolve({ ok: false, message: extractApiErrorMessage(err, "We could not confirm your payment.") })
          }
        },
        modal: { ondismiss: () => resolve({ ok: false, cancelled: true, message: "Payment was not completed." }) },
      })
      rzp.on?.("payment.failed", (r) =>
        resolve({ ok: false, message: r?.error?.description || "Payment failed. Please try again." }))
      rzp.open()
    })
  } catch (err) {
    return { ok: false, message: extractApiErrorMessage(err, "Payment could not be started. Please try again.") }
  }
}
