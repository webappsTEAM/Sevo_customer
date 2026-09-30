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

function completePaytmMock(order) {
  // The confirmation is intentionally labelled as a development mock.  The
  // browser still cannot mark a booking paid: it submits the server-issued
  // order, transaction id and HMAC back to /payment/verify/.
  if (!window.confirm(`Paytm MOCK payment\n\nPay ₹${order.amount} to SEVO?\n\nNo real money will be charged.`)) {
    return Promise.resolve({ ok: false, cancelled: true, message: "Mock payment was cancelled." })
  }
  return verify(order.booking_id, order.tracking_token, {
    order_id: order.order_id,
    payment_id: order.transaction_id,
    signature: order.signature,
  }).then(() => ({ ok: true }))
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
      // allow_partial only takes effect when Admin enabled the wallet + online split; otherwise the
      // server still requires the wallet to cover the whole amount.
      const w = await apiRequest("/payment/wallet-pay/", { method: "POST", body: { booking_id: bookingId, allow_partial: true } })
      if (!(w?.data || w)?.partial) return { ok: true }
      // wallet spent; fall through and pay only the remainder online
    }

    const res = await apiRequest("/payment/initiate/", {
      method: "POST",
      body: { booking_id: bookingId, token: trackingToken || undefined },
    })
    const order = res?.data || res
    if (order.provider === "paytm_mock") {
      return await completePaytmMock({ ...order, booking_id: bookingId, tracking_token: trackingToken })
    }
    if (order.provider === "paytm") {
      // Live Paytm credentials are not configured in this repository yet.
      // The backend returns the gateway-issued token only after it creates a
      // transaction; a missing CheckoutJS runtime must fail closed.
      return { ok: false, message: "Paytm Checkout is awaiting merchant-account configuration." }
    }
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

/**
 * Add money to the SEVO wallet. Amount limits are Admin values checked by the server; the client
 * only shows them. @returns {Promise<{ok: boolean, message?: string, cancelled?: boolean}>}
 */
export async function topUpWallet(amount) {
  try {
    const res = await apiRequest("/wallet/topup/", { method: "POST", body: { amount: String(amount) } })
    const order = res?.data || res
    const confirm = (extra) => apiRequest("/wallet/topup/verify/", { method: "POST", body: { order_id: order.order_id, ...extra } })
    if (order.sandbox) {
      await confirm({})
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
        description: "Add money to wallet",
        handler: async (r) => {
          try {
            await confirm({ payment_id: r.razorpay_payment_id, signature: r.razorpay_signature })
            resolve({ ok: true })
          } catch (err) {
            resolve({ ok: false, message: extractApiErrorMessage(err, "We could not confirm your payment.") })
          }
        },
        modal: { ondismiss: () => resolve({ ok: false, cancelled: true, message: "Payment was not completed." }) },
      })
      rzp.on?.("payment.failed", (r) => resolve({ ok: false, message: r?.error?.description || "Payment failed. Please try again." }))
      rzp.open()
    })
  } catch (err) {
    return { ok: false, message: extractApiErrorMessage(err, "Could not add money. Please try again.") }
  }
}
