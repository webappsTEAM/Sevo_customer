/**
 * Quick Commerce Pricing Configuration & Calculations
 * Single source of truth for Blinkit-style tiered pricing across:
 * - Cart Drawer (VegCartDrawerModal.jsx)
 * - Checkout Page (BookingPage.jsx)
 * - Admin Pricing Config Modal
 *
 * Defaults:
 * - Subtotal < ₹100:  ₹15 Delivery Fee + ₹5 Small Cart Fee + ₹2 Handling Fee
 * - ₹100 - ₹199:      ₹10 Delivery Fee + ₹0 Small Cart Fee + ₹2 Handling Fee
 * - ≥ ₹200:           FREE Delivery (₹0) + ₹0 Small Cart Fee + ₹2 Handling Fee
 * - Tip Presets:      [20, 30, 50]
 */

let _cachedConfig = {
  free_delivery_threshold: 200,
  small_cart_fee_threshold: 100,
  small_cart_fee_amount: 5,
  low_tier_delivery_fee: 15,
  mid_tier_delivery_fee: 10,
  handling_fee_amount: 2,
  tip_preset_amounts: [20, 30, 50],
  is_active: true,
}

let _isFetching = false
let _fetchPromise = null

export const QUICK_COMMERCE_PRICING = {
  get FREE_DELIVERY_THRESHOLD() {
    return Number(_cachedConfig.free_delivery_threshold) || 200
  },
  get SMALL_CART_THRESHOLD() {
    return Number(_cachedConfig.small_cart_fee_threshold) || 100
  },
  get HANDLING_FEE() {
    return Number(_cachedConfig.handling_fee_amount) || 2
  },
  get SMALL_CART_FEE() {
    return Number(_cachedConfig.small_cart_fee_amount) || 5
  },
  get LOW_TIER_DELIVERY_FEE() {
    return Number(_cachedConfig.low_tier_delivery_fee) || 15
  },
  get MID_TIER_DELIVERY_FEE() {
    return Number(_cachedConfig.mid_tier_delivery_fee) || 10
  },
  get TIP_PRESETS() {
    return Array.isArray(_cachedConfig.tip_preset_amounts) && _cachedConfig.tip_preset_amounts.length > 0
      ? _cachedConfig.tip_preset_amounts
      : [20, 30, 50]
  },
  SURGE_ACTIVE: false,
  SURGE_FEE: 0,

  updateConfig: (configData) => {
    if (configData && typeof configData === "object") {
      _cachedConfig = {
        ..._cachedConfig,
        ...configData,
      }
    }
    return _cachedConfig
  },

  getConfig: () => ({ ..._cachedConfig }),

  fetchConfig: async (apiInstance = null) => {
    if (_fetchPromise) return _fetchPromise

    _fetchPromise = (async () => {
      try {
        const fetcher = apiInstance
          ? apiInstance.get("/api/vegetable-orders/pricing-config/")
          : fetch("/api/vegetable-orders/pricing-config/").then((r) => r.json())
        const res = await fetcher
        const data = res?.data?.data || res?.data || res
        if (data && typeof data === "object" && (data.free_delivery_threshold !== undefined || data.handling_fee_amount !== undefined)) {
          QUICK_COMMERCE_PRICING.updateConfig(data)
        }
        return _cachedConfig
      } catch (err) {
        console.warn("Could not fetch remote quick commerce pricing config, using cached/defaults:", err)
        return _cachedConfig
      } finally {
        _fetchPromise = null
      }
    })()

    return _fetchPromise
  },

  getDeliveryFee: (subtotal) => {
    const val = Number(subtotal) || 0
    if (val <= 0 || val >= QUICK_COMMERCE_PRICING.FREE_DELIVERY_THRESHOLD) return 0
    if (val >= QUICK_COMMERCE_PRICING.SMALL_CART_THRESHOLD) return QUICK_COMMERCE_PRICING.MID_TIER_DELIVERY_FEE
    return QUICK_COMMERCE_PRICING.LOW_TIER_DELIVERY_FEE
  },

  getSmallCartFee: (subtotal) => {
    const val = Number(subtotal) || 0
    if (val > 0 && val < QUICK_COMMERCE_PRICING.SMALL_CART_THRESHOLD) {
      return QUICK_COMMERCE_PRICING.SMALL_CART_FEE
    }
    return 0
  },

  getHandlingFee: (subtotal) => {
    const val = Number(subtotal) || 0
    return val > 0 ? QUICK_COMMERCE_PRICING.HANDLING_FEE : 0
  },

  getSurgeFee: (subtotal, isSurgeActive = false, surgeAmount = 0) => {
    const val = Number(subtotal) || 0
    return isSurgeActive && val > 0 ? surgeAmount : 0
  },

  calculateTotals: (itemsTotal, options = {}) => {
    const {
      selectedTip = 0,
      isSurgeActive = false,
      surgeAmount = 0,
      customConfig = null,
    } = options

    if (customConfig) {
      QUICK_COMMERCE_PRICING.updateConfig(customConfig)
    }

    const subtotal = Math.max(0, Number(itemsTotal) || 0)
    const deliveryCharge = QUICK_COMMERCE_PRICING.getDeliveryFee(subtotal)
    const handlingCharge = QUICK_COMMERCE_PRICING.getHandlingFee(subtotal)
    const smallCartFee = QUICK_COMMERCE_PRICING.getSmallCartFee(subtotal)
    const surgeCharge = QUICK_COMMERCE_PRICING.getSurgeFee(subtotal, isSurgeActive, surgeAmount)
    const tipAmount = Math.max(0, Number(selectedTip) || 0)
    const grandTotal = Math.max(
      0,
      subtotal + deliveryCharge + handlingCharge + smallCartFee + surgeCharge + tipAmount
    )

    return {
      subtotal,
      deliveryCharge,
      handlingCharge,
      smallCartFee,
      surgeCharge,
      tipAmount,
      grandTotal,
    }
  },
}

