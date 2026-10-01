/**
 * frontend/src/services/marketplaceApi.js
 * 
 * Customer Marketplace API client for Sevo Seller Hub integration.
 * Connects exclusively through Sevo-customer backend endpoints (/api/marketplace/ and /api/orders/marketplace/).
 */
import { apiRequest } from "../api/client.js"

/**
 * Fetch published, approved, in-stock products with search, category and pagination support.
 */
export async function fetchMarketplaceProducts({ search = "", category = "", category_slug = "", category_id = "", seller_id = "", page = 1, page_size = 24 } = {}) {
  const params = new URLSearchParams()
  if (search) params.append("search", search)
  if (category_id) params.append("category_id", category_id)
  else if (category_slug && category_slug !== "all") params.append("category_slug", category_slug)
  else if (category && category !== "All" && category !== "all") params.append("category", category)
  if (seller_id && seller_id !== "All") params.append("seller_id", seller_id)
  if (page) params.append("page", page)
  if (page_size) params.append("page_size", page_size)

  const url = `/marketplace/products/?${params.toString()}`
  return await apiRequest(url, { method: "GET" })
}

/**
 * Fetch detailed product info.
 */
export async function fetchMarketplaceProductDetail(productId) {
  return await apiRequest(`/marketplace/products/${productId}/`, { method: "GET" })
}

/**
 * Fetch Seller Hub categories.
 */
export async function fetchMarketplaceCategories({ tree = true, hide_empty = true, parent_id = null, top_level = false, level = null } = {}) {
  const params = new URLSearchParams()
  if (tree !== undefined) params.append("tree", tree ? "true" : "false")
  if (hide_empty !== undefined) params.append("hide_empty", hide_empty ? "true" : "false")
  if (parent_id !== null && parent_id !== undefined) params.append("parent_id", parent_id)
  if (top_level) params.append("top_level", "true")
  if (level) params.append("level", level)

  const queryString = params.toString()
  const url = queryString ? `/marketplace/categories/?${queryString}` : "/marketplace/categories/"
  return await apiRequest(url, { method: "GET" })
}

/**
 * Fetch active customer marketplace cart.
 */
export async function fetchMarketplaceCart() {
  return await apiRequest("/carts/marketplace/", { method: "GET" })
}

/**
 * Add or update item in marketplace cart.
 * If clear_cart is true, clears any existing seller items.
 */
export async function addMarketplaceCartItem({ seller_product_id, quantity = 1, clear_cart = false, customization = {} }) {
  return await apiRequest("/carts/marketplace/items/", {
    method: "POST",
    json: {
      seller_product_id,
      quantity,
      clear_cart,
      customization,
    },
  })
}

/**
 * Update quantity or customization for an item in the marketplace cart.
 */
export async function updateMarketplaceCartItem(itemId, { quantity, customization }) {
  const payload = {}
  if (quantity !== undefined) payload.quantity = quantity
  if (customization !== undefined) payload.customization = customization

  return await apiRequest(`/carts/marketplace/items/${itemId}/`, {
    method: "PATCH",
    json: payload,
  })
}

/**
 * Delete item from marketplace cart.
 */
export async function removeMarketplaceCartItem(itemId) {
  return await apiRequest(`/carts/marketplace/items/${itemId}/`, {
    method: "DELETE",
  })
}

/**
 * Clear the entire marketplace cart.
 */
export async function clearMarketplaceCart() {
  return await apiRequest("/carts/marketplace/clear/", {
    method: "POST",
  })
}

/**
 * Validate cart pricing and stock before checkout.
 */
export async function validateMarketplaceCart(sellerId, items) {
  return await apiRequest("/marketplace/cart/validate/", {
    method: "POST",
    json: {
      seller_id: sellerId,
      items: items,
    },
  })
}

/**
 * Load Razorpay Checkout SDK dynamically if not already loaded.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener("load", () => resolve(true))
      existing.addEventListener("error", () => resolve(false))
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Initiate the configured server-side payment provider for Marketplace Checkout.
 */
export async function initiateMarketplacePayment({
  delivery_address,
  customer_name = "",
  customer_phone = "",
  customer_email = "",
  payment_method = "UPI",
  fulfilment_type = "DELIVERY",
  delivery_slot = null,
}) {
  return await apiRequest("/orders/marketplace/checkout/initiate-payment/", {
    method: "POST",
    json: {
      delivery_address,
      customer_name,
      customer_phone,
      customer_email,
      payment_method,
      fulfilment_type,
      ...(delivery_slot ? { delivery_slot } : {}),
    },
  })
}

/**
 * Verify the provider completion payload and finalize Marketplace orders.
 * The server selects and validates the provider; this function never decides
 * whether a payment is successful.
 */
export async function verifyMarketplacePayment({
  order_id,
  transaction_id,
  signature,
}) {
  return await apiRequest("/orders/marketplace/checkout/verify-payment/", {
    method: "POST",
    json: {
      order_id,
      transaction_id,
      signature,
    },
  })
}

/**
 * Place canonical marketplace order (COD or Direct fallback).
 */
export async function checkoutMarketplaceOrder({
  delivery_address,
  customer_name = "",
  customer_phone = "",
  customer_email = "",
  payment_method = "COD",
  payment_transaction_id = "",
  fulfilment_type = "DELIVERY",
  delivery_slot = null,
}) {
  return await apiRequest("/orders/marketplace/checkout/", {
    method: "POST",
    json: {
      delivery_address,
      customer_name,
      customer_phone,
      customer_email,
      payment_method,
      payment_transaction_id,
      fulfilment_type,
      ...(delivery_slot ? { delivery_slot } : {}),
    },
  })
}

/**
 * Fetch marketplace order details / live tracking.
 */
export async function fetchMarketplaceOrderDetail(orderNumber) {
  return await apiRequest(`/orders/marketplace/${orderNumber}/`, { method: "GET" })
}

/**
 * Cancel a marketplace order before delivery.
 */
export async function cancelMarketplaceOrder(orderNumber, reason = "Customer cancelled order") {
  return await apiRequest(`/orders/marketplace/${orderNumber}/cancel/`, {
    method: "POST",
    json: { cancellation_reason: reason },
  })
}

/**
 * Fetch unified customer order history (services, grocery, marketplace).
 */
export async function fetchMyOrders() {
  return await apiRequest("/orders/my/", { method: "GET" })
}

