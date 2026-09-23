/**
 * usePendingIntent.js
 *
 * Reusable hook for saving and restoring customer booking intent
 * across the authentication lifecycle.
 *
 * Stored in sessionStorage so intent survives navigation/page refresh
 * during OTP verification but is cleared when the tab is closed.
 *
 * Intent shape (example):
 * {
 *   type: "CONFIRM_BOOKING",   // Intent type identifier
 *   returnPath: "/booking/checkout",
 *   cart: [...],
 *   step: 2,
 *   category: {...},
 *   selDate: "2024-09-05",
 *   selTime: "10:00 AM",
 *   formData: { customer_name, phone, email, address, ... },
 *   paymentMethod: "cash",
 * }
 *
 * OR for landing page:
 * {
 *   type: "GO_TO_CHECKOUT",
 *   cart: [...],
 *   category: {...},
 * }
 */

const PENDING_INTENT_KEY = "cal_pending_intent"

export function usePendingIntent() {
  /**
   * Save customer intent before triggering authentication.
   * @param {Object} intent - The intent object to persist.
   */
  const save = (intent) => {
    try {
      sessionStorage.setItem(PENDING_INTENT_KEY, JSON.stringify(intent))
    } catch (_) {
      // sessionStorage unavailable — silently fail; intent just won't be restored
    }
  }

  /**
   * Restore and consume the saved intent.
   * The intent is removed from storage once read to prevent stale reuse.
   * @returns {Object|null} The saved intent, or null if none exists.
   */
  const restore = () => {
    try {
      const raw = sessionStorage.getItem(PENDING_INTENT_KEY)
      if (raw) {
        sessionStorage.removeItem(PENDING_INTENT_KEY)
        return JSON.parse(raw)
      }
    } catch (_) {
      // Malformed data or storage error — clear and return null
      try { sessionStorage.removeItem(PENDING_INTENT_KEY) } catch (_) {}
    }
    return null
  }

  /**
   * Peek at the intent without consuming it.
   * Useful for checking intent type before restoration.
   * @returns {Object|null} The saved intent, or null if none exists.
   */
  const peek = () => {
    try {
      const raw = sessionStorage.getItem(PENDING_INTENT_KEY)
      if (raw) return JSON.parse(raw)
    } catch (_) {}
    return null
  }

  /**
   * Explicitly clear the pending intent without restoring.
   * Call this if the customer cancels out of the booking flow.
   */
  const clear = () => {
    try {
      sessionStorage.removeItem(PENDING_INTENT_KEY)
    } catch (_) {}
  }

  return { save, restore, peek, clear }
}
