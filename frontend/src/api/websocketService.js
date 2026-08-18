/**
 * websocketService.js
 * High-performance real-time WebSocket client for CalServices.
 * Handles:
 * - Live customer tracking subscriptions (/ws/tracking/<identifier>/)
 * - Instant customer OTP verification (/ws/auth/otp/)
 * - Automatic reconnection, heartbeat ping, and resilient failover.
 */

export function getWebSocketBaseUrl() {
  const isSecure = window.location.protocol === "https:"
  const host = window.location.host
  // In development Vite proxy handles /ws or direct ws://127.0.0.1:8000/ws
  return `${isSecure ? "wss" : "ws"}://${host}/ws`
}

/**
 * Perform instant real-time OTP verification over WebSocket with timeout fallback.
 * @param {string} phone 
 * @param {string} otp 
 * @returns {Promise<Object>}
 */
export function verifyOtpViaWebSocket(phone, otp) {
  return new Promise((resolve, reject) => {
    let ws = null
    let hasResolved = false
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true
        if (ws) {
          try { ws.close() } catch {}
        }
        // Timeout -> reject so caller can seamlessly fallback to HTTP
        reject(new Error("WS_TIMEOUT"))
      }
    }, 3500)

    try {
      const wsUrl = `${getWebSocketBaseUrl()}/auth/otp/`
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: "verify_otp",
          phone: phone,
          otp: otp,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.event === "otp_verification_success") {
            if (!hasResolved) {
              hasResolved = true
              clearTimeout(timeoutId)
              try { ws.close() } catch {}
              resolve({ success: true, data: payload.data })
            }
          } else if (payload.event === "otp_verification_failed") {
            if (!hasResolved) {
              hasResolved = true
              clearTimeout(timeoutId)
              try { ws.close() } catch {}
              resolve({
                success: false,
                error: {
                  message: payload.error || "Invalid OTP",
                  code: payload.code,
                  attempts_remaining: payload.attempts_remaining,
                }
              })
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timeoutId)
          reject(new Error("WS_ERROR"))
        }
      }

      ws.onclose = () => {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timeoutId)
          reject(new Error("WS_CLOSED"))
        }
      }
    } catch (err) {
      if (!hasResolved) {
        hasResolved = true
        clearTimeout(timeoutId)
        reject(err)
      }
    }
  })
}

/**
 * Creates a managed real-time live tracking connection for a customer booking.
 * @param {string} identifier - request_id (e.g. SR-0299), ID, or tracking_token UUID
 * @param {string|null} token - secure tracking token
 * @param {Function} onEvent - callback(eventName, data)
 * @param {Function} onStatusChange - callback(isConnected)
 * @returns {Object} - { close(), send(action, data) }
 */
export function createTrackingWebSocket(identifier, token, onEvent, onStatusChange) {
  let ws = null
  let isClosedManually = false
  let reconnectTimeout = null
  let pingInterval = null
  let retryCount = 0

  function connect() {
    if (isClosedManually) return

    try {
      const query = token ? `?token=${encodeURIComponent(token)}` : ""
      const url = `${getWebSocketBaseUrl()}/tracking/${encodeURIComponent(identifier)}/${query}`
      ws = new WebSocket(url)

      ws.onopen = () => {
        retryCount = 0
        if (typeof onStatusChange === "function") onStatusChange(true)

        // Keepalive ping every 25 seconds
        if (pingInterval) clearInterval(pingInterval)
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }))
          }
        }, 25000)
      }

      ws.onmessage = (msgEvent) => {
        try {
          const payload = JSON.parse(msgEvent.data)
          const eventType = payload.event
          const data = payload.data || payload

          if (eventType && eventType !== "pong") {
            if (typeof onEvent === "function") {
              onEvent(eventType, data)
            }
          }
        } catch (err) {
          console.warn("[Tracking WS] Parse error:", err)
        }
      }

      ws.onerror = (err) => {
        console.warn("[Tracking WS] Error:", err)
        if (typeof onStatusChange === "function") onStatusChange(false)
      }

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval)
        if (typeof onStatusChange === "function") onStatusChange(false)

        if (!isClosedManually) {
          // Exponential backoff reconnect: 1s, 2s, 4s, max 8s
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 8000)
          retryCount++
          reconnectTimeout = setTimeout(connect, delay)
        }
      }
    } catch (e) {
      if (!isClosedManually) {
        reconnectTimeout = setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return {
    send(action, payload = {}) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action, ...payload }))
      }
    },
    close() {
      isClosedManually = true
      if (pingInterval) clearInterval(pingInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (ws) {
        try { ws.close() } catch {}
      }
    }
  }
}
