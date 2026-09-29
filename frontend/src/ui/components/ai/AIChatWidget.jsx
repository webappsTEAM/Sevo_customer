import React, { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Minimize2,
  Maximize2,
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
  Headphones,
  UploadCloud,
  AlertCircle,
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
  const location = useLocation()
  const { user } = useAuth()
  const pathname = location.pathname.toLowerCase()

  // ── Route Gating ─────────────────────────────────────────────────────────────
  // AI Mitra is a customer-facing assistant. It is not required in the Admin Portal
  // or on the Customer Care page (/support/tickets), but must remain active in the customer portal.
  const isAdminPortalRoute = useMemo(() => {
    const adminPrefixes = [
      "/login",
      "/reset-password",
      "/organization-signup",
      "/accept-invite",
      "/support/tickets",
      "/platform",
      "/dashboard",
      "/customers",
      "/settings",
      "/reports",
      "/catalog",
      "/inventory",
      "/admin",
      "/marketing",
      "/vegetables/admin",
      "/get-started",
    ]
    return adminPrefixes.some((prefix) => pathname.startsWith(prefix))
  }, [pathname])

  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showHistoryView, setShowHistoryView] = useState(false)
  const [conversationsList, setConversationsList] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(false)

  // ── Drag & Reposition and Minimize State ───────────────────────────────────
  const [position, setPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const windowRef = useRef(null)
  const dragStartRef = useRef({ startX: 0, startY: 0, initialLeft: 0, initialTop: 0, width: 0, height: 0 })

  const handleHeaderPointerDown = (e) => {
    // Only primary button (left click) or touch
    if (e.button !== 0 && e.pointerType === "mouse") return
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("a") ||
      e.target.closest(".caltrack-ai-header-btn")
    ) {
      return
    }
    if (typeof window !== "undefined" && window.innerWidth <= 640) return
    if (!windowRef.current) return

    e.preventDefault()

    const rect = windowRef.current.getBoundingClientRect()
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
      width: rect.width,
      height: rect.height,
    }
    setIsDragging(true)

    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.startX
      const dy = moveEvent.clientY - dragStartRef.current.startY

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const winWidth = dragStartRef.current.width
      const winHeight = dragStartRef.current.height

      // Ensure window stays safely within viewport margins
      const minX = 12
      const maxX = Math.max(12, viewportWidth - winWidth - 12)
      const minY = 12
      const maxY = Math.max(12, viewportHeight - winHeight - 12)

      const targetX = Math.min(Math.max(minX, dragStartRef.current.initialLeft + dx), maxX)
      const targetY = Math.min(Math.max(minY, dragStartRef.current.initialTop + dy), maxY)

      setPosition({ x: targetX, y: targetY })
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
  }

  // Keep window in bounds on viewport resize
  useEffect(() => {
    const handleResize = () => {
      if (!position || !windowRef.current) return
      if (typeof window !== "undefined" && window.innerWidth <= 640) {
        setPosition(null)
        return
      }
      const rect = windowRef.current.getBoundingClientRect()
      const maxX = Math.max(12, window.innerWidth - rect.width - 12)
      const maxY = Math.max(12, window.innerHeight - rect.height - 12)
      setPosition((prev) => {
        if (!prev) return null
        return {
          x: Math.min(Math.max(12, prev.x), maxX),
          y: Math.min(Math.max(12, prev.y), maxY),
        }
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [position])

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
            expects: m.expects || "text",
            options: m.options || [],
            handed_off: Boolean(m.handed_off),
            previewUrl: m.previewUrl || null,
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

  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [imageError, setImageError] = useState(null)
  const fileInputRef = useRef(null)

  const isHandedOff = Boolean(messages.some((m) => m.handed_off))
  const latestAssistantMsg = [...messages].reverse().find((m) => m.sender === "assistant")
  const currentExpects = isHandedOff ? "text" : (latestAssistantMsg?.expects || "text")

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
          const isConvHandedOff = Boolean(res.data.handed_off)
          const formatted = res.data.messages.map((m, idx, arr) => ({
            id: m.id || `msg_${Date.now()}_${Math.random()}`,
            sender: m.sender,
            content: m.content,
            sources: m.sources || [],
            expects: m.expects || "text",
            options: m.options || [],
            handed_off: Boolean(m.handed_off || (isConvHandedOff && idx === arr.length - 1 && m.sender === "assistant")),
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

  // Live polling for human agent replies when chat is handed off to care desk
  useEffect(() => {
    if (!isOpen || !isHandedOff || !conversationId) return

    const interval = setInterval(() => {
      loadConversationDetails(conversationId)
    }, 3500)

    return () => clearInterval(interval)
  }, [isOpen, isHandedOff, conversationId])

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
    handleClearSelectedImage()
    loadConversationDetails(conv.id)
    setShowHistoryView(false)
  }

  useEffect(() => {
    if (isOpen && !showHistoryView) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, loading, showHistoryView])

  // Automatically close chat if user navigates to an admin portal route
  useEffect(() => {
    if (isAdminPortalRoute && isOpen) {
      setIsOpen(false)
    }
  }, [isAdminPortalRoute, isOpen])

  // Global trigger: allows any page/section/banner to open AI Mitra and optionally pass an initial prompt
  useEffect(() => {
    const handleOpenAiMitra = (e) => {
      if (isAdminPortalRoute) return
      setIsOpen(true)
      setShowHistoryView(false)
      const promptText = e?.detail?.prompt
      if (promptText) {
        setTimeout(() => {
          handleSendMessage(promptText)
        }, 100)
      }
    }
    window.addEventListener("open-ai-mitra", handleOpenAiMitra)
    return () => window.removeEventListener("open-ai-mitra", handleOpenAiMitra)
  }, [conversationId, loading, isAdminPortalRoute])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file (PNG, JPG, WebP).")
      return
    }

    const maxBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxBytes) {
      setImageError("Image size must be less than 5MB.")
      return
    }

    setImageError(null)
    setSelectedImageFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreviewUrl(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleClearSelectedImage = () => {
    setSelectedImageFile(null)
    setImagePreviewUrl(null)
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmitImage = async () => {
    if (!selectedImageFile || loading) return
    const fileToUpload = selectedImageFile
    const previewToKeep = imagePreviewUrl
    handleClearSelectedImage()

    const userMsgId = `user_${Date.now()}`
    const userCreatedAt = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        content: `📷 [Uploaded Photo: ${fileToUpload.name}]`,
        previewUrl: previewToKeep,
        created_at: userCreatedAt,
      },
    ])
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("image", fileToUpload)
      if (conversationId) {
        formData.append("conversation_id", conversationId)
      }

      const res = await apiRequest("/ai/chat/", {
        method: "POST",
        body: formData,
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
            content: res.data.message || "",
            sources: res.data.sources || [],
            expects: res.data.expects || "text",
            options: res.data.options || [],
            handed_off: Boolean(res.data.handed_off),
            created_at: res.data.created_at || new Date().toISOString(),
          },
        ])
      } else {
        const errorMsg = res?.message || res?.detail || "Photo upload failed. Please try again."
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
          content: "Unable to upload image. Please verify your connection or try again.",
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

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

        if (res.data.message) {
          setMessages((prev) => [
            ...prev,
            {
              id: `asst_${Date.now()}`,
              sender: "assistant",
              content: res.data.message,
              sources: res.data.sources || [],
              blocked: Boolean(res.data.blocked_by_guardrail),
              expects: res.data.expects || "text",
              options: res.data.options || [],
              handed_off: Boolean(res.data.handed_off),
              created_at: res.data.created_at || new Date().toISOString(),
            },
          ])
        }
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
    handleClearSelectedImage()
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
    handleClearSelectedImage()
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

  // Do not render AI Mitra in the Admin Portal or on the Customer Care page (/support/tickets).
  // AI Mitra is a customer-facing assistant for the customer portal.
  if (isAdminPortalRoute) {
    return null
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
        <div
          ref={windowRef}
          className={`caltrack-ai-window ${isDragging ? "caltrack-ai-window-dragging" : ""} ${position ? "caltrack-ai-window-repositioned" : ""} ${isMinimized ? "caltrack-ai-window-minimized" : ""}`}
          role="dialog"
          aria-modal="true"
          style={
            position && typeof window !== "undefined" && window.innerWidth > 640
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  right: "auto",
                  bottom: "auto",
                  animation: isDragging ? "none" : undefined,
                }
              : undefined
          }
        >
          {/* Header */}
          <div
            className="caltrack-ai-header"
            onPointerDown={handleHeaderPointerDown}
            onDoubleClick={() => setPosition(null)}
            title="Drag anywhere to move · Double-click to reset position"
          >
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
              {position && (
                <button
                  type="button"
                  onClick={() => setPosition(null)}
                  className="caltrack-ai-header-btn"
                  title="Reset to default position"
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="caltrack-ai-header-btn"
                title={isMinimized ? "Expand chat" : "Minimize to header"}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              {!isMinimized && (
                <>
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
                </>
              )}
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

          {!isMinimized && (
            <>
              {/* Safety & Read-Only Notice Banner */}
              <div className="caltrack-ai-notice">
                <ShieldCheck size={14} style={{ color: "#059669", flexShrink: 0 }} />
                <span>Read-only assistant · Real-time verified policies & catalog data</span>
              </div>

          {/* Connected to Support Banner */}
          {isHandedOff && (
            <div className="caltrack-ai-support-banner">
              <div className="caltrack-ai-support-banner-icon">
                <Headphones size={15} />
              </div>
              <div className="caltrack-ai-support-banner-body">
                <div className="caltrack-ai-support-banner-title">Connected to Human Support</div>
                <div className="caltrack-ai-support-banner-sub">
                  A care agent has received your details and will continue this chat with you shortly.
                </div>
              </div>
            </div>
          )}

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
                          {m.previewUrl && (
                            <div className="caltrack-ai-uploaded-preview">
                              <img src={m.previewUrl} alt="Uploaded attachment" />
                            </div>
                          )}
                          <div className="caltrack-ai-msg-text">
                            {renderFormattedText(m.content)}
                          </div>

                          {/* Choice options if provided by backend */}
                          {m.options && m.options.length > 0 && !isHandedOff && (
                            <div className="caltrack-ai-options-group">
                              {m.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  type="button"
                                  className="caltrack-ai-option-chip"
                                  onClick={() => handleSendMessage(opt.value)}
                                  disabled={loading}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}

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

                {/* Image Picker for UPLOAD_IMAGE step */}
                {currentExpects === "image" && !isHandedOff && (
                  <div className="caltrack-ai-image-upload-card">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                    {!selectedImageFile ? (
                      <div className="caltrack-ai-image-prompt">
                        <div className="caltrack-ai-image-prompt-header">
                          <UploadCloud size={18} className="caltrack-ai-image-icon" />
                          <span>Attach Photo Proof</span>
                        </div>
                        <p className="caltrack-ai-image-hint">
                          Please provide a clear photo of the item (JPG, PNG, WebP under 5MB).
                        </p>
                        {imageError && (
                          <div className="caltrack-ai-image-error">
                            <AlertCircle size={14} />
                            <span>{imageError}</span>
                          </div>
                        )}
                        <div className="caltrack-ai-image-btn-row">
                          <button
                            type="button"
                            className="caltrack-ai-select-file-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                          >
                            <UploadCloud size={14} /> Select Photo
                          </button>
                          <button
                            type="button"
                            className="caltrack-ai-skip-file-btn"
                            onClick={() => handleSendMessage("SKIP")}
                            disabled={loading}
                          >
                            Skip Photo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="caltrack-ai-image-selected-view">
                        <div className="caltrack-ai-image-thumb-wrap">
                          <img src={imagePreviewUrl} alt="Upload preview" className="caltrack-ai-preview-img" />
                        </div>
                        <div className="caltrack-ai-image-details">
                          <div className="caltrack-ai-image-filename">{selectedImageFile.name}</div>
                          <div className="caltrack-ai-image-filesize">
                            {(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                        <div className="caltrack-ai-image-actions">
                          <button
                            type="button"
                            className="caltrack-ai-submit-photo-btn"
                            onClick={handleSubmitImage}
                            disabled={loading}
                          >
                            Send Photo
                          </button>
                          <button
                            type="button"
                            className="caltrack-ai-cancel-photo-btn"
                            onClick={handleClearSelectedImage}
                            disabled={loading}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
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
                  placeholder={
                    isHandedOff
                      ? "Type a message to support..."
                      : currentExpects === "image"
                      ? "Please select or skip the photo upload above"
                      : "Ask AI Mitra about bookings, AC repair, cleaning..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading || currentExpects === "image"}
                />
                <button
                  type="submit"
                  className="caltrack-ai-send-btn"
                  disabled={loading || currentExpects === "image" || !input.trim()}
                  title={isHandedOff ? "Send message to support" : "Send message"}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  )}
    </>
  )
}
