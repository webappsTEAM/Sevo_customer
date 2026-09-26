import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Bot,
  Package,
  Truck,
  FileText,
  History,
  Plus,
  Clock,
  Trash2,
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"
import "./AIChatWidget.css"

const STORAGE_KEY_CONV_ID    = "calservices_ai_conversation_id"
const STORAGE_KEY_MESSAGES   = "calservices_ai_messages"
// Stamps WHICH user owns the cached session — prevents cross-user data leaks
const STORAGE_KEY_OWNER_ID   = "calservices_ai_owner_id"

const formatChatDate = (dateVal) => {
  if (!dateVal) return "Today"
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return "Today"

  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isToday) return "Today"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  if (isYesterday) return "Yesterday"

  const day = d.getDate()
  const month = d.toLocaleDateString("en-US", { month: "short" })
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

const getDateKey = (dateVal) => {
  if (!dateVal) return "today"
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return "today"
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const formatChatTime = (dateVal) => {
  if (!dateVal) return ""
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ""
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12
  return `${hours}:${minutes} ${ampm}`
}

const DEFAULT_WELCOME_MESSAGE = {
  id: "welcome",
  sender: "assistant",
  content: "Hi! 👋 How can I help you with your services or bookings today?",
  sources: [],
  created_at: new Date().toISOString(),
}

const STARTER_PROMPTS = [
  {
    id: "active-bookings",
    badge: "My Bookings",
    icon: Package,
    iconBg: "rgba(11, 143, 122, 0.12)",
    iconColor: "#0B8F7A",
    label: "Check my active bookings",
    subtitle: "Track live status & appointments",
    text: "Show my active bookings and orders",
  },
  {
    id: "explore-services",
    badge: "Popular Services",
    icon: Sparkles,
    iconBg: "rgba(15, 95, 191, 0.12)",
    iconColor: "#0F5FBF",
    label: "Explore AC repair & cleaning packages",
    subtitle: "Transparent pricing & included items",
    text: "What packages and pricing do you offer for AC service and cleaning?",
  },
  {
    id: "service-delivery",
    badge: "Doorstep Process",
    icon: Truck,
    iconBg: "rgba(5, 150, 105, 0.12)",
    iconColor: "#059669",
    label: "How does service delivery work?",
    subtitle: "Technician verification & safety standards",
    text: "How does service delivery and technician verification work?",
  },
  {
    id: "cancellation-refund",
    badge: "Policy",
    icon: FileText,
    iconBg: "rgba(217, 119, 6, 0.12)",
    iconColor: "#D97706",
    label: "What is the cancellation & refund policy?",
    subtitle: "Timelines, refund rules & instant fee breakdown",
    text: "What is your cancellation and refund policy?",
  },
]

export function AIChatWidget() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showHistoryView, setShowHistoryView] = useState(false)
  const [conversationsList, setConversationsList] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(false)

  // ── Privacy-safe storage helpers ──────────────────────────────────────────
  // Each session is stamped with the owner's user-id (or "guest" for anonymous).
  // On read, if the stamp doesn't match the current identity we discard the
  // stale data immediately — before it ever enters React state — so no user
  // can see another user's chat history, even on the same device/tab.
  const currentOwnerId = user?.id ? String(user.id) : "guest"

  const clearAIChatStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES)
      sessionStorage.removeItem(STORAGE_KEY_OWNER_ID)
    } catch {}
  }

  const readStoredConvId = (ownerId) => {
    try {
      const storedOwner = sessionStorage.getItem(STORAGE_KEY_OWNER_ID)
      if (storedOwner !== ownerId) {
        // Stale data from a different user — wipe immediately
        clearAIChatStorage()
        return null
      }
      return sessionStorage.getItem(STORAGE_KEY_CONV_ID) || null
    } catch {
      return null
    }
  }

  const readStoredMessages = (ownerId) => {
    try {
      const storedOwner = sessionStorage.getItem(STORAGE_KEY_OWNER_ID)
      if (storedOwner !== ownerId) {
        clearAIChatStorage()
        return null
      }
      const cached = sessionStorage.getItem(STORAGE_KEY_MESSAGES)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m) => ({
            ...m,
            created_at: m.created_at || m.timestamp || new Date().toISOString(),
          }))
        }
      }
    } catch {}
    return null
  }

  const [conversationId, setConversationId] = useState(() => readStoredConvId(currentOwnerId))

  const [messages, setMessages] = useState(
    () => readStoredMessages(currentOwnerId) ?? [DEFAULT_WELCOME_MESSAGE]
  )

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const customerDisplayName = (() => {
    if (!user) return null
    const name = (user.firstName || user.first_name || user.fullName || user.full_name || "").trim()
    if (name && !name.toLowerCase().startsWith("cust_")) {
      return name
    }
    if (user.username && user.username.startsWith("cust_")) {
      const cleaned = user.username.replace(/^cust_/, "").replace(/[0-9_]+$/, "")
      if (cleaned) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      }
    }
    return name || user.username || "there"
  })()

  // Save conversationId in sessionStorage — always stamp the owner ID alongside
  useEffect(() => {
    try {
      if (conversationId) {
        sessionStorage.setItem(STORAGE_KEY_CONV_ID, conversationId)
        sessionStorage.setItem(STORAGE_KEY_OWNER_ID, currentOwnerId)
      } else {
        sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
        // Keep OWNER_ID so the messages key can still be validated
      }
    } catch {}
  }, [conversationId, currentOwnerId])

  // Save messages in sessionStorage on every message change — stamp owner ID
  useEffect(() => {
    try {
      if (messages.length > 1 || (messages.length === 1 && messages[0].id !== "welcome")) {
        sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
        sessionStorage.setItem(STORAGE_KEY_OWNER_ID, currentOwnerId)
      }
    } catch {}
  }, [messages, currentOwnerId])

  // Function to load conversation messages from server
  const loadConversationDetails = async (convId) => {
    if (!convId) return
    try {
      const res = await apiRequest(`/ai/conversations/${convId}/`)
      if (res?.success && res?.data?.messages && Array.isArray(res.data.messages)) {
        if (res.data.messages.length > 0) {
          const formatted = res.data.messages.map((m) => ({
            id: m.id || `msg_${Date.now()}_${Math.random()}`,
            sender: m.sender,
            content: m.content,
            sources: m.sources || [],
            created_at: m.created_at || new Date().toISOString(),
          }))
          setMessages(formatted)
          setConversationId(convId)
          try {
            sessionStorage.setItem(STORAGE_KEY_CONV_ID, convId)
            sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(formatted))
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Could not sync conversation details from server:", err)
    }
  }

  // ── Privacy guard: wipe chat state whenever the signed-in identity changes.
  //    This covers same-device / same-tab account switches so User B
  //    never sees User A’s conversation in memory or sessionStorage.
  const prevUserIdRef = useRef(user?.id ?? null)
  useEffect(() => {
    const currentId = user?.id ?? null
    if (prevUserIdRef.current !== currentId) {
      prevUserIdRef.current = currentId
      // Always reset in-memory chat state on any identity change
      setConversationId(null)
      setMessages([DEFAULT_WELCOME_MESSAGE])
      try {
        sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
        sessionStorage.removeItem(STORAGE_KEY_MESSAGES)
      } catch {}

      // If a NEW user just logged in, load their own latest conversation
      if (currentId) {
        apiRequest("/ai/conversations/")
          .then((res) => {
            if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
              const latest = res.data[0]
              if (latest?.id) {
                loadConversationDetails(latest.id)
              }
            }
          })
          .catch(() => {})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Restore history on mount: if conversationId exists, sync with server;
  // if user is logged in with no active session, restore latest conversation
  useEffect(() => {
    let isMounted = true
    if (conversationId) {
      loadConversationDetails(conversationId)
    } else if (user) {
      apiRequest("/ai/conversations/")
        .then((res) => {
          if (isMounted && res?.success && Array.isArray(res?.data) && res.data.length > 0) {
            const latest = res.data[0]
            if (latest?.id) {
              setConversationId(latest.id)
              loadConversationDetails(latest.id)
            }
          }
        })
        .catch(() => {})
    }
    return () => {
      isMounted = false
    }
  // Only run on first mount (empty dep array equivalent via eslint disable)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch past conversations list
  const fetchConversationsList = async () => {
    if (!user) {
      setConversationsList([])
      return
    }
    setLoadingConversations(true)
    try {
      const res = await apiRequest("/ai/conversations/")
      if (res?.success && Array.isArray(res?.data)) {
        setConversationsList(res.data)
      }
    } catch (err) {
      console.warn("Failed to load conversations list:", err)
    } finally {
      setLoadingConversations(false)
    }
  }

  const toggleHistoryView = () => {
    if (!showHistoryView) {
      fetchConversationsList()
    }
    setShowHistoryView((prev) => !prev)
  }

  const handleSelectConversation = (conv) => {
    loadConversationDetails(conv.id)
    setShowHistoryView(false)
  }

  useEffect(() => {
    if (isOpen && !showHistoryView) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, loading, showHistoryView])

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input || "").trim()
    if (!query || loading) return

    setInput("")
    const userMsgId = `user_${Date.now()}`
    const userCreatedAt = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", content: query, created_at: userCreatedAt },
    ])
    setLoading(true)

    try {
      const payload = {
        message: query,
        conversation_id: conversationId || undefined,
      }

      const res = await apiRequest("/ai/chat/", {
        method: "POST",
        json: payload,
      })

      if (res?.success && res?.data) {
        if (res.data.conversation_id && res.data.conversation_id !== conversationId) {
          setConversationId(res.data.conversation_id)
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            sender: "assistant",
            content: res.data.message || "I couldn't process this query.",
            sources: res.data.sources || [],
            blocked: Boolean(res.data.blocked_by_guardrail),
            created_at: res.data.created_at || new Date().toISOString(),
          },
        ])
      } else {
        const errorMsg = res?.message || res?.detail || "Sorry, I encountered a connection issue. Please try again."
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            content: errorMsg,
            created_at: new Date().toISOString(),
          },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "assistant",
          content: "Unable to reach the assistant service. Please verify your connection or try again shortly.",
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    setConversationId(null)
    clearAIChatStorage()
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: "assistant",
        content: "Started a new conversation! How can I help you today?",
        sources: [],
        created_at: new Date().toISOString(),
      },
    ])
    setShowHistoryView(false)
  }

  const handleDeleteCurrentChat = async () => {
    if (conversationId) {
      try {
        await apiRequest(`/ai/conversations/${conversationId}/`, { method: "DELETE" })
      } catch (err) {
        console.warn("Failed to delete conversation on server:", err)
      }
    }
    setConversationId(null)
    clearAIChatStorage()
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: "assistant",
        content: "Chat history cleared! How can I help you today?",
        sources: [],
        created_at: new Date().toISOString(),
      },
    ])
    setConversationsList((prev) => prev.filter((c) => c.id !== conversationId))
  }

  const handleDeleteConversation = async (convId, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    if (!convId) return
    try {
      await apiRequest(`/ai/conversations/${convId}/`, { method: "DELETE" })
      setConversationsList((prev) => prev.filter((c) => c.id !== convId))
      if (convId === conversationId) {
        handleDeleteCurrentChat()
      }
    } catch (err) {
      console.warn("Failed to delete conversation:", err)
    }
  }

  const handleClearAllHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all past chat history?")) return
    try {
      await apiRequest("/ai/conversations/", { method: "DELETE" })
      setConversationsList([])
      handleDeleteCurrentChat()
    } catch (err) {
      console.warn("Failed to delete all conversations:", err)
    }
  }

  const handleReset = () => {
    handleDeleteCurrentChat()
  }

  const renderFormattedText = (rawContent) => {
    if (!rawContent) return null

    // Split paragraphs
    const paragraphs = rawContent.split("\n\n")

    return paragraphs.map((para, pIdx) => {
      // Check if paragraph is a bullet list
      const lines = para.split("\n")
      const isList = lines.every((line) => line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim() === "")

      if (isList) {
        return (
          <ul key={pIdx}>
            {lines
              .filter((l) => l.trim().length > 0)
              .map((l, lIdx) => {
                const cleanLine = l.replace(/^[•\-]\s*/, "")
                return <li key={lIdx}>{formatInlineTokens(cleanLine)}</li>
              })}
          </ul>
        )
      }

      return (
        <p key={pIdx}>
          {lines.map((l, lIdx) => (
            <React.Fragment key={lIdx}>
              {formatInlineTokens(l)}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      )
    })
  }

  const formatInlineTokens = (text) => {
    // Detect markdown links [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBoldItalics(text.substring(lastIndex, match.index)))
      }

      const label = match[1]
      const url = match[2]

      if (url.startsWith("http://") || url.startsWith("https://")) {
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="caltrack-ai-link-btn"
          >
            {label} <ExternalLink size={12} />
          </a>
        )
      } else {
        parts.push(
          <button
            key={match.index}
            type="button"
            onClick={() => {
              setIsOpen(false)
              navigate(url)
            }}
            className="caltrack-ai-link-btn"
          >
            {label} <ChevronRight size={12} />
          </button>
        )
      }

      lastIndex = linkRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(renderBoldItalics(text.substring(lastIndex)))
    }

    return parts.length ? parts : text
  }

  const renderBoldItalics = (str) => {
    // Simple bold/italic replacer
    const boldTokens = str.split(/(\*\*[^*]+\*\*)/g)
    return boldTokens.map((token, idx) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={idx}>{token.slice(2, -2)}</strong>
      }
      return token
    })
  }

  return (
    <>
      {/* Floating Trigger Button - Compact & Sleek */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="caltrack-ai-trigger"
          aria-label="Open AI Mitra Assistant"
        >
          <span className="caltrack-ai-trigger-icon">
            <img
              src="/assets/sevo_emblem_transparent.png"
              alt="SEVO"
              className="caltrack-ai-logo-img"
            />
            <span className="caltrack-ai-blink-dot" />
          </span>
          <span className="caltrack-ai-trigger-text">AI Mitra</span>
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && <div className="caltrack-ai-backdrop" onClick={() => setIsOpen(false)} />}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="caltrack-ai-window" role="dialog" aria-modal="true">
          {/* Header */}
          <div className="caltrack-ai-header">
            <div className="caltrack-ai-header-info">
              <div className="caltrack-ai-avatar">
                <img
                  src="/assets/sevo_emblem_transparent.png"
                  alt="SEVO"
                  className="caltrack-ai-header-logo-img"
                />
              </div>
              <div>
                <div className="caltrack-ai-title">AI Mitra</div>
                <div className="caltrack-ai-subtitle">
                  <span className="caltrack-ai-badge-dot" />
                  <span>{user ? `Hi, ${customerDisplayName}` : "Your Trusted Home Companion"}</span>
                </div>
              </div>
            </div>

            <div className="caltrack-ai-header-actions">
              <button
                type="button"
                onClick={toggleHistoryView}
                className={`caltrack-ai-header-btn ${showHistoryView ? "active" : ""}`}
                title="Chat history & sessions"
              >
                <History size={15} />
              </button>
              <button
                type="button"
                onClick={handleNewChat}
                className="caltrack-ai-header-btn"
                title="Start new chat"
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentChat}
                className="caltrack-ai-header-btn caltrack-ai-header-btn-danger"
                title="Delete current chat"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="caltrack-ai-header-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Safety & Read-Only Notice Banner */}
          <div className="caltrack-ai-notice">
            <ShieldCheck size={14} style={{ color: "#059669", flexShrink: 0 }} />
            <span>Read-only assistant · Real-time verified policies & catalog data</span>
          </div>

          {/* Conditional View: History Browser or Live Chat Stream */}
          {showHistoryView ? (
            <div className="caltrack-ai-history-panel">
              <div className="caltrack-ai-history-header">
                <div className="caltrack-ai-history-header-title">
                  <Clock size={15} />
                  <span>Past Conversations</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {conversationsList.length > 0 && (
                    <button
                      type="button"
                      className="caltrack-ai-history-clear-all-btn"
                      onClick={handleClearAllHistory}
                      title="Clear all saved chats"
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    className="caltrack-ai-history-new-btn"
                    onClick={handleNewChat}
                  >
                    <Plus size={13} /> New Chat
                  </button>
                </div>
              </div>

              {loadingConversations ? (
                <div className="caltrack-ai-history-loading">
                  <span className="caltrack-ai-dot" />
                  <span className="caltrack-ai-dot" />
                  <span className="caltrack-ai-dot" />
                </div>
              ) : !user ? (
                <div className="caltrack-ai-history-empty">
                  <Bot size={32} style={{ color: "#94a3b8", marginBottom: 8 }} />
                  <p className="caltrack-ai-history-empty-title">Guest Session</p>
                  <p className="caltrack-ai-history-empty-desc">
                    Your current chat is saved for this browser tab. Log in to keep your complete chat history across all your devices.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      navigate("/login")
                    }}
                    className="caltrack-ai-history-login-btn"
                  >
                    Sign In to Save History
                  </button>
                </div>
              ) : conversationsList.length === 0 ? (
                <div className="caltrack-ai-history-empty">
                  <MessageSquare size={32} style={{ color: "#94a3b8", marginBottom: 8 }} />
                  <p className="caltrack-ai-history-empty-title">No Saved Conversations</p>
                  <p className="caltrack-ai-history-empty-desc">
                    Your chats with AI Mitra will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="caltrack-ai-history-list">
                  {conversationsList.map((conv) => {
                    const isActive = conv.id === conversationId
                    const dateStr = conv.updated_at
                      ? new Date(conv.updated_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""
                    return (
                      <div
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectConversation(conv)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleSelectConversation(conv)
                        }}
                        className={`caltrack-ai-history-item ${isActive ? "active" : ""}`}
                      >
                        <div className="caltrack-ai-history-item-icon">
                          <MessageSquare size={16} />
                        </div>
                        <div className="caltrack-ai-history-item-content">
                          <div className="caltrack-ai-history-item-title">
                            {conv.title || "Home Services Chat"}
                          </div>
                          <div className="caltrack-ai-history-item-meta">
                            <span>{conv.message_count} messages</span>
                            {dateStr && <span>· {dateStr}</span>}
                            {isActive && <span className="caltrack-ai-history-active-tag">Current</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="caltrack-ai-history-delete-btn"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          title="Delete this chat"
                          aria-label="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Message Stream */}
              <div className="caltrack-ai-messages">
                {messages.map((m, idx) => {
                  const currentDateKey = getDateKey(m.created_at)
                  const prevDateKey = idx > 0 ? getDateKey(messages[idx - 1].created_at) : null
                  const showDateSeparator = idx === 0 || currentDateKey !== prevDateKey
                  const timeFormatted = formatChatTime(m.created_at)

                  return (
                    <React.Fragment key={m.id || idx}>
                      {showDateSeparator && (
                        <div className="caltrack-ai-date-separator">
                          <span className="caltrack-ai-date-text">
                            {formatChatDate(m.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`caltrack-ai-msg-row ${m.sender}`}>
                        <div className="caltrack-ai-msg-bubble">
                          <div className="caltrack-ai-msg-text">
                            {renderFormattedText(m.content)}
                          </div>

                          {timeFormatted && (
                            <div className="caltrack-ai-msg-time">
                              {timeFormatted}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}

                {/* Quick Starters if only welcome message */}
                {messages.length === 1 && (
                  <div className="caltrack-ai-starters">
                    <div className="caltrack-ai-starters-header">
                      <div className="caltrack-ai-starters-title">
                        <Sparkles size={13} className="caltrack-ai-starters-sparkle" />
                        <span>Suggested Questions</span>
                      </div>
                      <span className="caltrack-ai-starters-tag">Quick Action</span>
                    </div>
                    <div className="caltrack-ai-starters-list">
                      {STARTER_PROMPTS.map((starter) => {
                        const IconComp = starter.icon
                        return (
                          <button
                            key={starter.id}
                            type="button"
                            onClick={() => handleSendMessage(starter.text)}
                            className="caltrack-ai-starter-card"
                          >
                            <div
                              className="caltrack-ai-starter-icon-wrap"
                              style={{ background: starter.iconBg, color: starter.iconColor }}
                            >
                              <IconComp size={16} />
                            </div>
                            <div className="caltrack-ai-starter-content">
                              <div className="caltrack-ai-starter-title-row">
                                <span className="caltrack-ai-starter-label">{starter.label}</span>
                                <span className="caltrack-ai-starter-pill">{starter.badge}</span>
                              </div>
                              <span className="caltrack-ai-starter-sub">{starter.subtitle}</span>
                            </div>
                            <ChevronRight size={14} className="caltrack-ai-starter-arrow" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Typing Animation */}
                {loading && (
                  <div className="caltrack-ai-msg-row assistant">
                    <div className="caltrack-ai-msg-bubble caltrack-ai-typing">
                      <span className="caltrack-ai-dot" />
                      <span className="caltrack-ai-dot" />
                      <span className="caltrack-ai-dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form
                className="caltrack-ai-footer"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="caltrack-ai-input"
                  placeholder="Ask AI Mitra about bookings, AC repair, cleaning..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="caltrack-ai-send-btn"
                  disabled={loading || !input.trim()}
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
