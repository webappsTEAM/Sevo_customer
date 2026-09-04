/**
 * websocketService.js
 * High-performance real-time WebSocket client for CalServices.
 * Handles:
 * - Live customer tracking subscriptions (/ws/tracking/<identifier>/)
 * - Instant customer OTP verification (/ws/auth/otp/)
 * - Automatic reconnection, heartbeat ping, and resilient failover.
 */

export function getWebSocketBaseUrl() {
  // 1. Explicit environment variable override (if configured)
  if (import.meta.env.VITE_WS_BASE_URL) {
    const raw = import.meta.env.VITE_WS_BASE_URL.replace(/\/+$/, "")
    return raw.endsWith("/ws") ? raw : `${raw}/ws`
  }

  // 2. Derive from VITE_API_BASE_URL if configured as absolute URL
  if (import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.startsWith("/")) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL
    const wsProto = apiUrl.startsWith("https") ? "wss" : "ws"
    const host = apiUrl.replace(/^https?:\/\//, "").split("/")[0]
    return `${wsProto}://${host}/ws`
  }

  // 3. Connect via current window origin in production, direct to 127.0.0.1:8000 in local dev
  if (typeof window !== "undefined") {
    const isSecure = window.location.protocol === "https:"
    const hostname = window.location.hostname
    // If in local development, connect directly to Django ASGI on 127.0.0.1:8000
    if ((hostname === "localhost" || hostname === "127.0.0.1") && window.location.port !== "8000") {
      return `${isSecure ? "wss" : "ws"}://127.0.0.1:8000/ws`
    }
    const host = window.location.host
    return `${isSecure ? "wss" : "ws"}://${host}/ws`
  }

  return "ws://127.0.0.1:8000/ws"
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
      const baseUrl = getWebSocketBaseUrl()
      const url = `${baseUrl}/auth/otp/`
      ws = new WebSocket(url)

      ws.onopen = () => {
        try {
          ws.send(JSON.stringify({
            action: "verify_otp",
            phone: phone,
            otp: otp,
          }))
        } catch (e) {
          if (!hasResolved) {
            hasResolved = true
            clearTimeout(timeoutId)
            reject(e)
          }
        }
      }

      ws.onmessage = (event) => {
        if (hasResolved) return
        hasResolved = true
        clearTimeout(timeoutId)
        try {
          const data = JSON.parse(event.data)
          if (data.event === "otp_verification_success" || data.success) {
            resolve(data)
          } else {
            reject(new Error(data.error || "OTP verification failed"))
          }
        } catch (err) {
          reject(err)
        } finally {
          try { ws.close() } catch {}
        }
      }

      ws.onerror = (err) => {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timeoutId)
          reject(err)
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
 * Create an authoritative live tracking WebSocket connection.
 * @param {string|number} identifier - ServiceRequest.id or request_id (e.g. 'PL4479')
 * @param {string|null} token - Optional public tracking_token UUID
 * @param {Function} onEvent - Callback for incoming tracking payloads
 * @param {Function} onConnectionState - Callback with connection state ('connecting' | 'connected' | 'reconnecting' | 'disconnected')
 * @returns {{ send: Function, close: Function }}
 */
export function createTrackingWebSocket(identifier, token, onEvent, onConnectionState) {
  let ws = null
  let isClosedManually = false
  let reconnectTimeout = null
  let pingInterval = null
  let retryCount = 0
  // Reconnect for as long as the tracking page is open. Giving up after six
  // tries (~31s) silently downgraded the customer to slow REST polling for the
  // rest of the session, with no way back other than reloading the page.
  // retryDelays already caps the backoff, so this stays gentle on the server.
  const maxRetries = Infinity
  const retryDelays = [1000, 2000, 3000, 5000, 8000, 12000]

  function notifyState(state) {
    if (typeof onConnectionState === "function") {
      onConnectionState(state)
    }
  }

  function clearTimers() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
  }

  function connect() {
    if (isClosedManually) return

    if (retryCount >= maxRetries) {
      console.warn(`[TRACKING] Maximum WebSocket reconnect attempts (${maxRetries}) reached. Continuing with REST fallback.`)
      notifyState("disconnected")
      return
    }

    try {
      const cleanId = String(identifier || "").trim()
      const query = token ? `?token=${encodeURIComponent(token)}` : ""
      const baseUrl = getWebSocketBaseUrl()
      const url = `${baseUrl}/tracking/${encodeURIComponent(cleanId)}/${query}`

      // Safe structured logs without exposing raw tokens
      console.log(`[TRACKING] booking: ${cleanId}`)
      console.log(`[TRACKING] connecting to backend: ${baseUrl}/tracking/${encodeURIComponent(cleanId)}/`)
      console.log(`[TRACKING] WebSocket connecting (attempt ${retryCount + 1})`)

      notifyState(retryCount > 0 ? "reconnecting" : "connecting")

      ws = new WebSocket(url)

      ws.onopen = () => {
        retryCount = 0
        console.log(`[TRACKING] WebSocket opened: connected to ${cleanId}`)
        notifyState("connected")

        // Heartbeat ping every 25s
        if (pingInterval) clearInterval(pingInterval)
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ action: "ping" }))
            } catch {}
          }
        }, 25000)
      }

      ws.onmessage = (msgEvent) => {
        try {
          const payload = JSON.parse(msgEvent.data)
          const eventType = payload.event
          const data = payload.data || payload

          if (eventType && eventType !== "pong") {
            console.log(`[TRACKING] Message received: event=${eventType}`)
            if (typeof onEvent === "function") {
              onEvent(eventType, data)
            }
          }
        } catch (err) {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        // Handled cleanly via onclose
      }

      ws.onclose = (evt) => {
        clearTimers()
        console.log(`[TRACKING] WebSocket closed (code: ${evt.code})`)

        if (isClosedManually) {
          notifyState("disconnected")
          return
        }

        if (retryCount < maxRetries) {
          const delay = retryDelays[Math.min(retryCount, retryDelays.length - 1)]
          console.log(`[TRACKING] reconnect attempt: ${retryCount + 1} in ${delay}ms...`)
          notifyState("reconnecting")
          retryCount++
          if (reconnectTimeout) clearTimeout(reconnectTimeout)
          reconnectTimeout = setTimeout(connect, delay)
        } else {
          console.warn(`[TRACKING] WebSocket disconnected permanently for this session. REST polling active.`)
          notifyState("disconnected")
        }
      }
    } catch (e) {
      clearTimers()
      if (!isClosedManually && retryCount < maxRetries) {
        const delay = retryDelays[Math.min(retryCount, retryDelays.length - 1)]
        notifyState("reconnecting")
        retryCount++
        if (reconnectTimeout) clearTimeout(reconnectTimeout)
        reconnectTimeout = setTimeout(connect, delay)
      } else {
        notifyState("disconnected")
      }
    }
  }

  connect()

  return {
    send(action, payload = {}) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ action, ...payload }))
        } catch {}
      }
    },
    close() {
      isClosedManually = true
      clearTimers()
      notifyState("disconnected")
      if (ws) {
        const currentWs = ws
        ws = null
        try {
          if (currentWs.readyState === WebSocket.CONNECTING) {
            currentWs.onopen = () => {
              try { currentWs.close(1000, "Clean Unmount") } catch {}
            }
            currentWs.onerror = () => {}
            currentWs.onclose = () => {}
          } else if (currentWs.readyState === WebSocket.OPEN) {
            currentWs.close(1000, "Clean Unmount")
          }
        } catch {}
      }
    }
  }
}
