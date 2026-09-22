/**
 * combinedCartCheck.js
 *
 * DAILY_ESSENTIALS_FRONTEND_IMPLEMENTATION_PLAN.md Phase 3: the backend's
 * CheckoutView deliberately refuses to infer `cart_types` from cart state --
 * it requires the frontend to explicitly say what to check out, and to ask
 * the customer when both carts have items rather than guessing. These are
 * the two cart-presence checks that decision is based on.
 *
 * Both carts are (today) localStorage-backed rather than centrally held in
 * React state shared across pages -- services under
 * "calservices_customer_cart" (see BookingPage.jsx), Daily Essentials under
 * "calservice_veg_food_cart" (see VegetableFullScreenPage.jsx /
 * LandingPage-1.jsx). Reading localStorage directly here is what lets this
 * check run from either checkout entry point without new prop plumbing.
 */

export function hasPendingServicesCart() {
  try {
    const raw = localStorage.getItem("calservices_customer_cart") || sessionStorage.getItem("calservices_customer_cart")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

export function hasPendingDailyEssentialsCart() {
  try {
    const raw = localStorage.getItem("calservice_veg_food_cart")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!parsed && typeof parsed === "object" && Object.values(parsed).some((qty) => Number(qty) > 0)
  } catch {
    return false
  }
}
