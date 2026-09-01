import React, { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Headset, RefreshCw, Search, Filter, Plus, X, Lock, Send, IndianRupee,
  PhoneCall, FileText, Activity, Check, Clock, User, Calendar, AlertCircle,
  CornerDownRight, Paperclip, ChevronRight, AlertTriangle, CheckCircle2,
  Users, BarChart3, HelpCircle, Shield, ArrowUpRight
} from "lucide-react"

import { apiRequest } from "../../api/client.js"
import {
  fetchTickets, fetchTicketDetail, createTicket, assignTicket,
  changeTicketStatus, escalateTicket, addTicketMessage, uploadTicketAttachment,
  requestTicketRefund, approveTicketRefund, rejectTicketRefund,
  sendRefundToFinance, completeRefund, logTicketCommunication,
  fetchCareAgents, fetchCareAnalytics,
  fetchTicketContext, requestReschedule, confirmReschedule, requestCancellation,
  approveCancellation, searchCustomers, fetchCustomer360,
  fetchCustomerCommunicationHistory, fetchMessageTemplates, createMessageTemplate
} from "../../api/customerCareService.js"

import { Card, Button, Input, Select, TextArea, Pill, formatDateTime } from "../components/kit.jsx"

/* ─── Toast Notification Component ─────────────────────────────────────── */
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])

  const icons = {
    success: <CheckCircle2 size={15} />,
    error: <X size={15} />,
    warn: <AlertTriangle size={15} />,
    info: <AlertCircle size={15} />
  }

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
      <span className={type === "error" ? "text-rose-400" : type === "warn" ? "text-amber-400" : "text-emerald-400"}>
        {icons[type] || icons.info}
      </span>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 text-slate-400 hover:text-white">
        <X size={13} />
      </button>
    </div>
  )
}

/* ─── Map Dictionaries for UI badging ───────────────────────────────────── */
const CATEGORY_MAP = {
  booking_issue: { label: "Booking Issue", emoji: "📅", color: "bg-blue-50 text-blue-700 border-blue-150 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  service_quality: { label: "Service Quality", emoji: "⭐", color: "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  technician_issue: { label: "Technician Issue", emoji: "🔧", color: "bg-purple-50 text-purple-700 border-purple-150 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  payment_issue: { label: "Payment Issue", emoji: "💳", color: "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  refund: { label: "Refund", emoji: "💵", color: "bg-teal-50 text-teal-700 border-teal-150 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800" },
  cancellation: { label: "Cancellation", emoji: "❌", color: "bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  reschedule: { label: "Reschedule", emoji: "⏰", color: "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  pricing_issue: { label: "Pricing Issue", emoji: "🏷️", color: "bg-orange-50 text-orange-700 border-orange-150 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
  missing_damaged: { label: "Missing / Damaged Item", emoji: "📦", color: "bg-amber-100 text-amber-900 border-amber-250 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-750" },
  safety_issue: { label: "Safety Issue", emoji: "🛡️", color: "bg-red-50 text-red-700 border-red-150 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" },
  other: { label: "Other", emoji: "❓", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  general: { label: "General Support", emoji: "📌", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  billing: { label: "Billing & Payments", emoji: "💳", color: "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  technical: { label: "Technical Issue", emoji: "⚙️", color: "bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  scheduling: { label: "Scheduling & Dispatch", emoji: "⏰", color: "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  feedback: { label: "Customer Feedback", emoji: "💬", color: "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" }
}

const PRIORITY_MAP = {
  low: { label: "Low", color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  medium: { label: "Medium", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800" },
  high: { label: "High", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800" },
  critical: { label: "Critical", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800 animate-pulse" }
}

const STATUS_MAP = {
  new: { label: "New", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800" },
  assigned: { label: "Assigned", color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800" },
  waiting_on_customer: { label: "Waiting on Customer", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800" },
  waiting_on_internal: { label: "Waiting on Internal", color: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800" },
  escalated: { label: "Escalated", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-black" },
  resolved: { label: "Resolved", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800 font-black" },
  reopened: { label: "Reopened", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 font-bold" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" }
}

const REFUND_STATUS_MAP = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  submitted: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  approved_full: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  approved_partial: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  rejected: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
  sent_to_finance: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400",
  completed: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400"
}

const CATEGORY_PRIORITY_MAP = {
  booking_issue: "medium",
  service_quality: "medium",
  technician_issue: "high",
  payment_issue: "medium",
  refund: "high",
  cancellation: "medium",
  reschedule: "medium",
  pricing_issue: "low",
  missing_damaged: "high",
  safety_issue: "critical",
  other: "low",
  general: "low",
  billing: "medium",
  technical: "critical",
  scheduling: "high",
  feedback: "low"
}

export default function CustomerCarePage() {
  const [tickets, setTickets] = useState([])
  const [agents, setAgents] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  // Navigation tabs: tickets | refund_approvals | analytics
  const [activeTab, setActiveTab] = useState("tickets")

  // Ticket filters & search
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterAgent, setFilterAgent] = useState("")
  const [filterSlaBreached, setFilterSlaBreached] = useState(false)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState("messages") // messages | refund | communication | audit

  // Form states for creating a ticket
  const [newCategory, setNewCategory] = useState("general")
  const [newPriority, setNewPriority] = useState("medium")
  const [newChannel, setNewChannel] = useState("call")
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newBookingId, setNewBookingId] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Form states inside ticket detail
  const [chatMessage, setChatMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [reassignAgent, setReassignAgent] = useState("")
  const [escalateReason, setEscalateReason] = useState("")
  const [escalateToTier, setEscalateToTier] = useState("senior_care")

  // Form states for manual communication logs
  const [commChannel, setCommChannel] = useState("call")
  const [commDirection, setCommDirection] = useState("outbound")
  const [commSummary, setCommSummary] = useState("")
  const [commDuration, setCommDuration] = useState("")

  // Form states for refund bridging actions
  const [refundType, setRefundType] = useState("FULL")
  const [refundRequestedAmount, setRefundRequestedAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [refundNotes, setRefundNotes] = useState("")

  const [refundIsFull, setRefundIsFull] = useState(true)
  const [refundApprovedAmount, setRefundApprovedAmount] = useState("")
  const [refundApprovalNote, setRefundApprovalNote] = useState("")
  const [refundRejectNote, setRefundRejectNote] = useState("")

  // Message templates state
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState("")

  // Autocomplete customer search state
  const [searchResults, setSearchResults] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Ticket Context State
  const [ticketContext, setTicketContext] = useState(null)
  const [contextLoading, setContextLoading] = useState(false)

  // Reschedule Form States
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState("09:00 - 11:00")
  const [rescheduleReason, setRescheduleReason] = useState("")
  const [rescheduleNotes, setRescheduleNotes] = useState("")

  // Cancellation Form States
  const [cancelReason, setCancelReason] = useState("Customer changed mind")
  const [cancelReasonNote, setCancelReasonNote] = useState("")
  const [cancelRetentionOffered, setCancelRetentionOffered] = useState(false)
  const [cancelRetentionOutcome, setCancelRetentionOutcome] = useState("")

  // Customer 360 view state
  const [is360Open, setIs360Open] = useState(false)
  const [customer360Data, setCustomer360Data] = useState(null)
  const [loading360, setLoading360] = useState(false)

  const showToast = (message, type = "success") => {
    let cleanMessage = message;
    if (message && typeof message === "object") {
      // Handle Django DRF API client errors
      if (message.body) {
        const body = message.body;
        if (typeof body === "string") {
          cleanMessage = body;
        } else if (body.detail) {
          cleanMessage = Array.isArray(body.detail) ? body.detail[0] : body.detail;
        } else if (body.non_field_errors) {
          cleanMessage = Array.isArray(body.non_field_errors) ? body.non_field_errors[0] : body.non_field_errors;
        } else {
          const firstKey = Object.keys(body)[0];
          if (firstKey) {
            const val = body[firstKey];
            cleanMessage = Array.isArray(val) ? val[0] : val;
          }
        }
      } else if (message.detail) {
        cleanMessage = message.detail;
      } else if (message.message) {
        cleanMessage = message.message;
      } else {
        cleanMessage = JSON.stringify(message);
      }
    }
    
    // Fallback if the parsed message is still an object or has ErrorDetail string format
    if (typeof cleanMessage === "string" && cleanMessage.includes("ErrorDetail")) {
      // Regex clean up: ErrorDetail(string="...", code="...") -> "..."
      const match = cleanMessage.match(/string=["'](.*?)["']/);
      if (match && match[1]) {
        cleanMessage = match[1];
      }
    }

    setToast({ message: String(cleanMessage), type });
  };

  const canApproveRefund = useMemo(() => {
    if (!currentUser) return false
    if (["admin", "manager"].includes(currentUser.role)) return true
    if (["admin", "ops_manager", "senior_care"].includes(currentUser.careRole)) return true
    return false
  }, [currentUser])

  // Initialize and load data
  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    try {
      const meRes = await apiRequest("/auth/me/")
      if (meRes) setCurrentUser(meRes)

      await Promise.all([
        loadTickets(),
        loadAgents(),
        loadAnalytics(),
        loadTemplates()
      ])
    } catch (err) {
      setError("Failed to fetch initial customer care details.")
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const res = await fetchMessageTemplates()
      if (res?.success) {
        setTemplates(res.data)
      }
    } catch (err) {}
  }

  const fetchContextData = async () => {
    if (!selectedTicket) return
    setContextLoading(true)
    try {
      const res = await fetchTicketContext(selectedTicket.id)
      if (res?.success) {
        setTicketContext(res.data)
      }
    } catch (err) {
      console.error("Error fetching context:", err)
    } finally {
      setContextLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTicket?.id) {
      fetchContextData()
    } else {
      setTicketContext(null)
    }
  }, [selectedTicket?.id])

  const handleCustomerNameChange = async (val) => {
    setNewCustomerName(val)
    if (val.trim().length >= 2) {
      try {
        const res = await searchCustomers(val)
        if (res?.success) {
          setSearchResults(res.data)
          setShowSuggestions(true)
        }
      } catch (err) {}
    } else {
      setSearchResults([])
      setShowSuggestions(false)
    }
  }

  const selectCustomer = (cust) => {
    setNewCustomerName(cust.name)
    setNewPhone(cust.phone)
    setNewEmail(cust.email)
    setSearchResults([])
    setShowSuggestions(false)
  }

  const openCustomer360 = async (customerId) => {
    if (!customerId) return
    setLoading360(true)
    setIs360Open(true)
    try {
      const res = await fetchCustomer360(customerId)
      if (res?.success) {
        setCustomer360Data(res.data)
      }
    } catch (err) {
      showToast("Failed to load Customer 360 details", "error")
    } finally {
      setLoading360(false)
    }
  }

  const handleCreateReschedule = async (e) => {
    e.preventDefault()
    if (!rescheduleDate) {
      showToast("Date is required", "warn")
      return
    }
    setActionLoading(true)
    try {
      const res = await requestReschedule(selectedTicket.id, {
        new_date: rescheduleDate,
        new_time_slot: rescheduleTimeSlot,
        reason: rescheduleReason,
        notes: rescheduleNotes
      })
      if (res?.success) {
        showToast("Reschedule request submitted!", "success")
        setRescheduleReason("")
        setRescheduleNotes("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Failed to submit reschedule", "error")
      }
    } catch (err) {
      showToast(err?.body?.detail || err?.body?.message || "Error requesting reschedule", "error")
    } finally {
      setActionLoading(false)
    }

  }

  const handleConfirmReschedule = async (rescheduleId, approved) => {
    setActionLoading(true)
    try {
      const res = await confirmReschedule(selectedTicket.id, {
        reschedule_id: rescheduleId,
        approved,
        notes: rescheduleNotes || "Processed by Care Agent"
      })
      if (res?.success) {
        showToast(`Reschedule request ${approved ? "approved" : "rejected"}`, "success")
        setRescheduleNotes("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Failed to confirm reschedule", "error")
      }
    } catch (err) {
      showToast("Error processing reschedule decision", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateCancellation = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await requestCancellation(selectedTicket.id, {
        reason: cancelReason,
        reason_note: cancelReasonNote,
        retention_offered: cancelRetentionOffered,
        retention_outcome: cancelRetentionOutcome
      })
      if (res?.success) {
        showToast("Cancellation request submitted!", "success")
        setCancelReasonNote("")
        setCancelRetentionOutcome("")
        setCancelRetentionOffered(false)
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Failed to request cancellation", "error")
      }
    } catch (err) {
      showToast("Error requesting cancellation", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmCancellation = async (approved) => {
    setActionLoading(true)
    try {
      const res = await approveCancellation(selectedTicket.id, {
        is_approved: approved
      })
      if (res?.success) {
        showToast(`Cancellation request ${approved ? "approved" : "rejected"}`, "success")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Failed to approve cancellation", "error")
      }
    } catch (err) {
      showToast("Error processing cancellation decision", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const loadTickets = async () => {
    try {
      const filters = {}
      if (filterCategory) filters.category = filterCategory
      if (filterPriority) filters.priority = filterPriority
      if (filterStatus) filters.status = filterStatus
      if (filterAgent) filters.assigned_agent = filterAgent
      if (searchQuery) filters.search = searchQuery
      if (filterSlaBreached) filters.sla_breached = true
      // Cache-bust so the GET dedup cache never returns a stale promise
      filters._ts = Date.now()

      const res = await fetchTickets(filters)
      console.log("[CustomerCare] fetchTickets raw response:", res)
      if (res?.success) {
        setTickets(res.data)
      } else if (Array.isArray(res)) {
        // fallback: bare array response
        setTickets(res)
      } else if (res?.results) {
        // fallback: paginated DRF response
        setTickets(res.results)
      }
    } catch (err) {
      console.error("[CustomerCare] fetchTickets error:", err)
      showToast("Error retrieving tickets.", "error")
    }
  }

  const loadAgents = async () => {
    try {
      const res = await fetchCareAgents()
      if (res?.success) {
        setAgents(res.data)
      }
    } catch (err) {}
  }

  const loadAnalytics = async () => {
    try {
      const res = await fetchCareAnalytics()
      if (res?.success) {
        setAnalytics(res.data)
      }
    } catch (err) {}
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload tickets whenever filters change
  useEffect(() => {
    loadTickets()
  }, [filterCategory, filterPriority, filterStatus, filterAgent, filterSlaBreached])

  // Search keyword trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadTickets()
  }

  const handleCategoryChange = (catVal) => {
    setNewCategory(catVal)
    const mappedPriority = CATEGORY_PRIORITY_MAP[catVal] || "medium"
    setNewPriority(mappedPriority)
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = {
        category: newCategory,
        priority: newPriority,
        channel: newChannel,
        customer_name: newCustomerName,
        phone: newPhone,
        email: newEmail
      }
      if (newBookingId) {
        payload.booking = newBookingId
      }
      const res = await createTicket(payload)
      if (res?.success) {
        showToast("Ticket created successfully!", "success")
        setIsCreateOpen(false)
        resetCreateForm()
        // Immediately add the new ticket to the list so it shows without waiting for refetch
        if (res.data) {
          setTickets(prev => [res.data, ...prev])
        }
        // Also reload in background to stay in sync with server
        await loadTickets()
        await loadAnalytics()
      } else {
        showToast(res?.message || "Creation failed", "error")
      }
    } catch (err) {
      showToast("Error creating support ticket", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const resetCreateForm = () => {
    setNewCategory("general")
    setNewPriority("medium")
    setNewChannel("call")
    setNewCustomerName("")
    setNewPhone("")
    setNewEmail("")
    setNewBookingId("")
  }

  const openTicketDetail = async (ticketId, tab = "messages") => {
    setDetailLoading(true)
    setDetailTab(tab)
    try {
      const res = await fetchTicketDetail(ticketId)
      if (res?.success) {
        setSelectedTicket(res.data)
        setReassignAgent(res.data.assigned_agent || "")
      } else {
        showToast(res?.message || "Failed to load ticket", "error")
      }
    } catch (err) {
      showToast(err?.body?.detail || err?.body?.message || "Error loading ticket detail", "error")
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshTicketDetail = async () => {
    if (selectedTicket) {
      await openTicketDetail(selectedTicket.id, detailTab)
      await loadTickets()
      await loadAnalytics()
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!reassignAgent) return
    setActionLoading(true)
    try {
      const res = await assignTicket(selectedTicket.id, reassignAgent)
      if (res?.success) {
        showToast("Ticket assigned successfully", "success")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Assignment failed", "error")
      }
    } catch (err) {
      showToast("Error assigning ticket", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeStatus = async (statusVal, noteText = "") => {
    setActionLoading(true)
    try {
      const res = await changeTicketStatus(selectedTicket.id, statusVal, noteText)
      if (res?.success) {
        showToast(`Status changed to: ${statusVal.replace("_", " ")}`, "success")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Status change failed", "error")
      }
    } catch (err) {
      showToast("Error changing status", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleEscalate = async (e) => {
    e.preventDefault()
    if (!escalateReason) return
    setActionLoading(true)
    try {
      const res = await escalateTicket(selectedTicket.id, escalateToTier, escalateReason)
      if (res?.success) {
        showToast(`Ticket escalated to ${escalateToTier}`, "success")
        setEscalateReason("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Escalation failed", "error")
      }
    } catch (err) {
      showToast("Error escalating ticket", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return
    setActionLoading(true)
    try {
      const res = await addTicketMessage(selectedTicket.id, chatMessage, isInternalNote)
      if (res?.success) {
        setChatMessage("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Sending failed", "error")
      }
    } catch (err) {
      showToast("Error sending message", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setActionLoading(true)
    try {
      const res = await uploadTicketAttachment(selectedTicket.id, file)
      if (res?.success) {
        showToast("Attachment uploaded!", "success")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Upload failed", "error")
      }
    } catch (err) {
      showToast("Error uploading file", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogCommunication = async (e) => {
    e.preventDefault()
    if (!commSummary.trim()) return
    setActionLoading(true)
    try {
      const payload = {
        channel: commChannel,
        direction: commDirection,
        summary: commSummary,
        duration_seconds: commDuration ? parseInt(commDuration) : null
      }
      const res = await logTicketCommunication(selectedTicket.id, payload)
      if (res?.success) {
        showToast("Communication logged successfully", "success")
        setCommSummary("")
        setCommDuration("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Failed to log", "error")
      }
    } catch (err) {
      showToast("Error logging communication", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestRefund = async (e) => {
    e.preventDefault()
    if (!refundRequestedAmount) return
    setActionLoading(true)
    try {
      const payload = {
        refund_type: refundType,
        requested_amount: parseFloat(refundRequestedAmount),
        reason: refundReason,
        additional_notes: refundNotes
      }
      const res = await requestTicketRefund(selectedTicket.id, payload)
      if (res?.success) {
        showToast("Refund requested and linked!", "success")
        setRefundRequestedAmount("")
        setRefundReason("")
        setRefundNotes("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Refund request failed", "error")
      }
    } catch (err) {
      showToast(err?.body?.detail || err?.body?.message || "Error initiating refund", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveRefund = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = {
        is_full: refundIsFull,
        approved_amount: refundIsFull ? null : parseFloat(refundApprovedAmount),
        internal_note: refundApprovalNote
      }
      const res = await approveTicketRefund(selectedTicket.id, payload)
      if (res?.success) {
        showToast("Refund approved successfully!", "success")
        setRefundApprovalNote("")
        setRefundApprovedAmount("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Approval failed", "error")
      }
    } catch (err) {
      showToast(err?.body?.detail || "Error approving refund request", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectRefund = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await rejectTicketRefund(selectedTicket.id, { internal_note: refundRejectNote })
      if (res?.success) {
        showToast("Refund request rejected", "success")
        setRefundRejectNote("")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Rejection failed", "error")
      }
    } catch (err) {
      showToast("Error rejecting refund", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendRefundToFinance = async () => {
    setActionLoading(true)
    try {
      const res = await sendRefundToFinance(selectedTicket.id)
      if (res?.success) {
        showToast("Refund submitted to finance", "success")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Submission failed", "error")
      }
    } catch (err) {
      showToast("Error sending to finance", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteRefund = async () => {
    setActionLoading(true)
    try {
      const res = await completeRefund(selectedTicket.id)
      if (res?.success) {
        showToast("Refund status marked completed!", "success")
        await refreshTicketDetail()
      } else {
        showToast(res?.message || "Completion failed", "error")
      }
    } catch (err) {
      showToast("Error completing refund", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Derived filter logic for Refund Approvals tab (tickets having linked refund request)
  const refundTickets = useMemo(() => {
    return tickets.filter(t => t.linked_refund_request !== null)
  }, [tickets])

  const pendingRefundCount = useMemo(() => {
    return refundTickets.filter(t => ["pending", "submitted"].includes(t.linked_refund_request_status?.toLowerCase())).length
  }, [refundTickets])

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen">
      {toast && createPortal(
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />,
        document.body
      )}

      {/* Header Banner - Matches Customer Side Hero Style */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-indigo-900/40">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e] inline-block" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">
            Support Agents Active 24/7
          </span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
              Customer Care Center
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Resolve customer queries, track service requests SLA, manage ticket escalations and approve refunds.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
            >
              <Plus size={15} />
              <span>Log Ticket</span>
            </button>
            <button
              onClick={loadInitialData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation tabs - Modern segmented pill style */}
      <div className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${
            activeTab === "tickets"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Customer Care
        </button>
        <button
          onClick={() => setActiveTab("refund_approvals")}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === "refund_approvals"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Refund Approvals</span>
          {pendingRefundCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-black leading-none text-white bg-sky-500 rounded-full animate-pulse">
              {pendingRefundCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${
            activeTab === "analytics"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Analytics & SLA
        </button>
      </div>

      {/* Tab: Tickets Queue */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div 
              onClick={() => {
                setFilterStatus(filterStatus === "open_all" ? "" : "open_all");
                setFilterPriority("");
                setFilterAgent("");
                setFilterSlaBreached(false);
              }}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all ${
                filterStatus === "open_all"
                  ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20" 
                  : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Open Tickets</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                {analytics?.open_tickets_count ?? (analytics ? (analytics.total_tickets - (analytics.status_counts?.resolved || 0) - (analytics.status_counts?.closed || 0)) : 0)}
              </h2>
            </div>

            <div 
              onClick={() => {
                setFilterPriority(filterPriority === "high_all" ? "" : "high_all");
                setFilterStatus("");
                setFilterAgent("");
                setFilterSlaBreached(false);
              }}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-rose-400 hover:shadow-md transition-all ${
                filterPriority === "high_all"
                  ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20" 
                  : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">High Priority</span>
              </div>
              <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
                {analytics?.high_priority_count ?? (analytics ? ((analytics.priority_counts?.high || 0) + (analytics.priority_counts?.critical || 0)) : 0)}
              </h2>
            </div>

            <div 
              onClick={() => {
                setFilterAgent(filterAgent === "unassigned" ? "" : "unassigned");
                setFilterStatus("");
                setFilterPriority("");
                setFilterSlaBreached(false);
              }}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all ${
                filterAgent === "unassigned"
                  ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20" 
                  : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Unassigned</span>
              </div>
              <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
                {analytics?.unassigned_count ?? 0}
              </h2>
            </div>

            <div 
              onClick={() => {
                setFilterStatus(filterStatus === "waiting_on_customer" ? "" : "waiting_on_customer");
                setFilterPriority("");
                setFilterAgent("");
                setFilterSlaBreached(false);
              }}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-purple-400 hover:shadow-md transition-all ${
                filterStatus === "waiting_on_customer"
                  ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/20" 
                  : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Waiting Customer</span>
              </div>
              <h2 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1.5">
                {analytics?.waiting_customer_count ?? (analytics?.status_counts?.waiting_on_customer || 0)}
              </h2>
            </div>

            <div 
              onClick={() => {
                setFilterStatus(filterStatus === "waiting_on_internal" ? "" : "waiting_on_internal");
                setFilterPriority("");
                setFilterAgent("");
                setFilterSlaBreached(false);
              }}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all ${
                filterStatus === "waiting_on_internal"
                  ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/20" 
                  : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Waiting Internal</span>
              </div>
              <h2 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1.5">
                {analytics?.waiting_internal_count ?? (analytics?.status_counts?.waiting_on_internal || 0)}
              </h2>
            </div>

            <div 
              onClick={() => {
                setFilterStatus(filterStatus === "resolved_today" ? "" : "resolved_today");
                setFilterPriority("");
                setFilterAgent("");
                setFilterSlaBreached(false);
              }}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all ${
                filterStatus === "resolved_today"
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20" 
                  : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Resolved Today</span>
                </div>
                {analytics?.resolved_all_count > 0 && (
                  <span className="text-[9px] font-bold text-slate-400">Total: {analytics.resolved_all_count}</span>
                )}
              </div>
              <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
                {analytics?.resolved_today_count || 0}
              </h2>
            </div>

            <div 
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Avg Resolve Time</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                {analytics?.avg_resolution_hours ? (analytics.avg_resolution_hours < 2 ? Math.round(analytics.avg_resolution_hours * 60) + "m" : analytics.avg_resolution_hours + "h") : "0m"}
              </h2>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search ticket, customer info..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setTimeout(loadTickets, 0) }} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1 text-slate-400 text-xs font-bold mr-1">
                <Filter size={14} /> Filters:
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>

              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="open_all">All Open Tickets ({analytics?.open_tickets_count || 0})</option>
                <option value="new">New ({analytics?.status_counts?.new || 0})</option>
                <option value="assigned">Assigned ({analytics?.status_counts?.assigned || 0})</option>
                <option value="in_progress">In Progress ({analytics?.status_counts?.in_progress || 0})</option>
                <option value="waiting_on_customer">Waiting on Customer ({analytics?.status_counts?.waiting_on_customer || 0})</option>
                <option value="waiting_on_internal">Waiting on Internal ({analytics?.status_counts?.waiting_on_internal || 0})</option>
                <option value="escalated">Escalated ({analytics?.status_counts?.escalated || 0})</option>
                <option value="resolved_today">Resolved Today ({analytics?.resolved_today_count || 0})</option>
                <option value="resolved">Resolved Total ({analytics?.resolved_all_count || 0})</option>
                <option value="reopened">Reopened ({analytics?.status_counts?.reopened || 0})</option>
                <option value="closed">Closed ({analytics?.status_counts?.closed || 0})</option>
              </select>

              <select
                value={filterAgent}
                onChange={e => setFilterAgent(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Agents</option>
                <option value="unassigned">Unassigned ({analytics?.unassigned_count || 0})</option>
                {agents.map(a => (
                  <option key={a.id} value={a.user}>{a.user_username} ({a.care_role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table display */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={16} /> Loading support tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Headset className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={42} />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">No support tickets found</h3>
                <p className="text-xs text-slate-400 mt-1">Try tweaking your search or filter dropdowns.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Ticket Number</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Customer Info</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Category</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Priority</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Created At</th>
                      <th className="py-3.5 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {tickets.map(t => {
                      const catInfo = CATEGORY_MAP[t.category] || CATEGORY_MAP.other
                      const prioInfo = PRIORITY_MAP[t.priority] || { label: t.priority, color: "" }
                      const statInfo = STATUS_MAP[t.status] || { label: t.status, color: "" }
                      
                      const isSlabreached = t.sla_due_at && new Date(t.sla_due_at) < new Date() && !["resolved", "closed"].includes(t.status)

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          onClick={() => openTicketDetail(t.id, "messages")}
                        >
                          <td className="py-4 px-4">
                            <span className="font-bold text-xs font-mono text-slate-900 dark:text-white block">{t.ticket_number}</span>
                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">Logged via {t.channel}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{t.customer_name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{t.phone || t.email || "—"}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-[11px] font-bold ${catInfo.color}`}>
                              <span>{catInfo.emoji}</span>
                              <span>{catInfo.label}</span>
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${prioInfo.color}`}>
                              {prioInfo.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${statInfo.color}`}>
                              {statInfo.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                            {t.assigned_agent_username || <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                          </td>
                          <td className="py-4 px-4">
                            {isSlabreached ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-black rounded-full uppercase">
                                <AlertCircle size={10} /> SLA Breached
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 text-xs flex items-center justify-end gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>Open Chat</span>
                              <ChevronRight size={14} />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Refund Approvals */}
      {activeTab === "refund_approvals" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase text-slate-500 tracking-wider">Refund Approval Queue</h2>
            <p className="text-xs text-slate-400 mt-1">
              List of all support tickets with active refund requests linked from the service requests app.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {refundTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <IndianRupee className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={42} />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">No active refund approvals found</h3>
                <p className="text-xs text-slate-400 mt-1">There are currently no tickets requiring financial refund approvals.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Ticket</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Customer</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Booking ID</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Refund Code</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Amount</th>
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Refund Status</th>
                      <th className="py-3.5 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {refundTickets.map(t => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                        onClick={() => openTicketDetail(t.id, "refund")}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-xs font-mono text-slate-900 dark:text-white block">{t.ticket_number}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {t.customer_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {t.booking_request_id || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          {t.linked_refund_request_refund_id || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-extrabold text-slate-900 dark:text-white">
                          ₹{t.linked_refund_request_amount || "0.00"}
                        </td>
                        <td className="py-3.5 px-4">
                          {(() => {
                            const rStatus = (t.linked_refund_request_status || "PENDING").toLowerCase();
                            const badgeColor = REFUND_STATUS_MAP[rStatus] || "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400";
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeColor}`}>
                                {t.linked_refund_request_status || "PENDING"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors shadow-sm ml-auto">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card title="Average Resolution SLA">
              <div className="flex items-center gap-3">
                <Clock className="text-indigo-500" size={32} />
                <div>
                  <h3 className="text-2xl font-black">{analytics?.avg_resolution_hours || "0.0"} hours</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Average ticket close time</p>
                </div>
              </div>
            </Card>

            <Card title="Total Financial Refunds">
              <div className="flex items-center gap-3">
                <IndianRupee className="text-emerald-500" size={32} />
                <div>
                  <h3 className="text-2xl font-black">₹{analytics?.total_refund_amount || "0.00"}</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Disbursed via bridge</p>
                </div>
              </div>
            </Card>

            <Card title="Escalations Closed">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="text-rose-500" size={32} />
                <div>
                  <h3 className="text-2xl font-black">
                    {analytics?.resolved_escalations || 0} / {analytics?.escalation_count || 0}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Resolved tier escalations</p>
                </div>
              </div>
            </Card>

            <Card title="SLA Compliant Rate">
              <div className="flex items-center gap-3">
                <Activity className="text-sky-500" size={32} />
                <div>
                  <h3 className="text-2xl font-black">
                    {analytics?.total_tickets 
                      ? Math.round(((analytics.total_tickets - (analytics.sla_breached_count || 0)) / analytics.total_tickets) * 100)
                      : 100}%
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">SLA due target compliance</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Tickets Status Breakdown">
              <div className="space-y-4">
                {analytics?.status_counts && Object.entries(analytics.status_counts).map(([statusName, count]) => {
                  const percent = Math.round((count / analytics.total_tickets) * 100)
                  return (
                    <div key={statusName} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span className="capitalize">{statusName.replace("_", " ")}</span>
                        <span>{count} tickets ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card title="Support Tickets Category Breakdown">
              <div className="space-y-4">
                {analytics?.category_counts && Object.entries(analytics.category_counts).map(([catName, count]) => {
                  const percent = Math.round((count / analytics.total_tickets) * 100)
                  const catInfo = CATEGORY_MAP[catName] || CATEGORY_MAP.other
                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>{catInfo.emoji} {catInfo.label}</span>
                        <span>{count} tickets ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Log Ticket Modal */}
      {createPortal(
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCreateOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
            >
              {/* Premium Accent Line */}
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
              
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/40 dark:bg-slate-950/10">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center">
                  Log Support Ticket
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Category"
                    value={newCategory}
                    onChange={e => handleCategoryChange(e.target.value)}
                    options={Object.entries(CATEGORY_MAP).map(([key, info]) => ({
                      value: key,
                      label: info.label
                    }))}
                  />
                  <Select
                    label="Priority"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                      { value: "critical", label: "Critical" }
                    ]}
                  />
                </div>

                <Select
                  label="Intake Channel"
                  value={newChannel}
                  onChange={e => setNewChannel(e.target.value)}
                  options={[
                    { value: "call", label: "Phone Call" },
                    { value: "email", label: "Email Inbox" },
                    { value: "chat", label: "Live Chat Session" },
                    { value: "portal", label: "Customer Portal" },
                    { value: "other", label: "Other" }
                  ]}
                />

                <div className="relative">
                  <Input
                    label="Customer Name"
                    placeholder="Enter customer name (type 2+ chars to search)..."
                    value={newCustomerName}
                    onChange={e => handleCustomerNameChange(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowSuggestions(true) }}
                    required
                  />
                  {showSuggestions && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {searchResults.map(cust => (
                        <div
                          key={cust.id}
                          onClick={() => selectCustomer(cust)}
                          className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{cust.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{cust.email}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">{cust.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="e.g. +91 9988776655"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="john@doe.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold -mt-3 ml-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  At least one contact method (phone or email) is required.
                </p>

                <Input
                  label="Service Request Booking ID (Optional)"
                  placeholder="Enter request identifier e.g. 15"
                  value={newBookingId}
                  onChange={e => setNewBookingId(e.target.value)}
                  hint="Type numerical ID of existing service request if applicable."
                />

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-250 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
                  >
                    {actionLoading ? "Saving..." : "Create Ticket"}
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Ticket detail drawer modal */}
      {createPortal(
        <AnimatePresence>
          {selectedTicket && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-full max-w-7xl h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                    <Headset size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedTicket.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${STATUS_MAP[selectedTicket.status]?.color || "bg-slate-100 text-slate-700"}`}>
                        {selectedTicket.status?.replace("_", " ")}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Logged: {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={refreshTicketDetail} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all shadow-sm">
                    <RefreshCw size={14} className={actionLoading || detailLoading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all shadow-sm">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Drawer Body - Split Layout */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
                {/* Left Side: Metadata column */}
                <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 p-5 space-y-5 overflow-y-auto lg:overflow-y-auto text-xs bg-slate-50/40 dark:bg-slate-950/20">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block mb-2">Customer Profile</span>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-500/20">
                          {selectedTicket.customer_name?.charAt(0)?.toUpperCase() || "C"}
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-extrabold text-slate-900 dark:text-white block truncate">{selectedTicket.customer_name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block">Registered Customer</span>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1 text-[11px]">
                        {selectedTicket.phone && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">📞</span>
                            <span className="font-semibold font-mono">{selectedTicket.phone}</span>
                          </div>
                        )}
                        {selectedTicket.email && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">✉️</span>
                            <span className="font-semibold truncate">{selectedTicket.email}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => openCustomer360(selectedTicket.customer)}
                        disabled={!selectedTicket.customer}
                        className="mt-2 w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Users size={13} />
                        <span>View Customer 360</span>
                      </button>
                    </div>
                  </div>

                   <div>
                    <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block mb-2">Related Links</span>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl space-y-2 shadow-sm font-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-sans font-medium">Booking ID:</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                          {selectedTicket.booking_request_id ? `#${selectedTicket.booking_request_id}` : "None"}
                        </span>
                      </div>
                      
                      {!selectedTicket.booking && (
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 mt-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Link Booking</span>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="Enter Booking ID (e.g. 15)"
                              id="link-booking-id-input"
                              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const bId = document.getElementById("link-booking-id-input")?.value;
                                if (!bId) {
                                  showToast("Please enter a valid booking ID", "error");
                                  return;
                                }
                                setActionLoading(true);
                                try {
                                  const res = await apiRequest(`/customer-care/tickets/${selectedTicket.id}/`, {
                                    method: "PATCH",
                                    json: { booking: parseInt(bId) }
                                  });
                                  if (res?.id || res?.success) {
                                    showToast("Booking linked successfully!", "success");
                                    await refreshTicketDetail();
                                  } else {
                                    showToast("Failed to link booking request.", "error");
                                  }
                                } catch (err) {
                                  showToast("Error linking booking request. Make sure ID exists.", "error");
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all shadow-sm"
                            >
                              Link
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedTicket.linked_refund_request_refund_id && (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 font-sans font-medium">Refund ID:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {selectedTicket.linked_refund_request_refund_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>


                  {/* Quick State transitions */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block mb-2">Update Status</span>
                    <div className="flex flex-col gap-2">
                      {selectedTicket.status === "new" && (
                        <button
                          onClick={() => handleChangeStatus("assigned")}
                          className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300 font-bold rounded-xl text-xs transition-all shadow-xs"
                        >
                          Mark Assigned
                        </button>
                      )}
                      {["assigned", "reopened", "waiting_on_customer", "waiting_on_internal", "escalated"].includes(selectedTicket.status) && (
                        <button
                          onClick={() => handleChangeStatus("in_progress")}
                          className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300 font-bold rounded-xl text-xs transition-all shadow-xs"
                        >
                          Start In Progress
                        </button>
                      )}
                      {selectedTicket.status === "in_progress" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleChangeStatus("waiting_on_customer")}
                            className="py-2.5 px-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900 dark:text-purple-300 font-bold rounded-xl text-xs transition-all shadow-xs"
                          >
                            Wait Cust
                          </button>
                          <button
                            onClick={() => handleChangeStatus("waiting_on_internal")}
                            className="py-2.5 px-2 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900 dark:text-cyan-300 font-bold rounded-xl text-xs transition-all shadow-xs"
                          >
                            Wait Int
                          </button>
                        </div>
                      )}
                      {["in_progress", "escalated"].includes(selectedTicket.status) && (
                        <button
                          onClick={() => {
                            const resText = prompt("Enter resolution notes:")
                            if (resText) handleChangeStatus("resolved", resText)
                          }}
                          className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 font-bold rounded-xl text-xs transition-all shadow-xs"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {selectedTicket.status === "resolved" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleChangeStatus("closed")}
                            className="py-2 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
                          >
                            Close
                          </button>
                          <button
                            onClick={() => handleChangeStatus("reopened")}
                            className="py-2 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300 font-bold rounded-xl text-xs transition-all"
                          >
                            Reopen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assign Agent form */}
                  {currentUser?.role !== "employee" && (
                    <form onSubmit={handleAssign} className="border-t border-slate-150 dark:border-slate-800/80 pt-4 space-y-2">
                      <Select
                        label="Assign Agent"
                        value={reassignAgent}
                        onChange={e => setReassignAgent(e.target.value)}
                        options={[
                          { value: "", label: "Select Agent" },
                          ...agents.map(a => ({ value: a.user, label: `${a.user_username} (${a.care_role})` }))
                        ]}
                      />
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                      >
                        Reassign Agent
                      </button>
                    </form>
                  )}

                  {/* Escalation block */}
                  <form onSubmit={handleEscalate} className="border-t border-slate-150 dark:border-slate-800/80 pt-4 space-y-2">
                    <Select
                      label="Escalate Queue"
                      value={escalateToTier}
                      onChange={e => setEscalateToTier(e.target.value)}
                      options={[
                        { value: "senior_care", label: "Senior Care" },
                        { value: "ops_manager", label: "Ops Manager" },
                        { value: "admin", label: "Admin Support" }
                      ]}
                    />
                    <Input
                      placeholder="Reason for escalation"
                      value={escalateReason}
                      onChange={e => setEscalateReason(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                    >
                      Escalate Ticket
                    </button>
                  </form>
                </div>
                {/* Right panel: Subtabs + Content */}
                <div className="flex-1 flex flex-col overflow-visible lg:overflow-hidden min-h-[480px] lg:min-h-0">
                  {/* Internal Subtabs */}
                  <div className="flex border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/10 overflow-x-auto whitespace-nowrap px-2">
                    <button
                      onClick={() => setDetailTab("messages")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "messages" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Messages
                    </button>
                    <button
                      onClick={() => setDetailTab("booking_context")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "booking_context" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Booking Context
                    </button>
                    <button
                      onClick={() => setDetailTab("reschedule")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "reschedule" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setDetailTab("cancellation")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "cancellation" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Cancel Booking
                    </button>
                    <button
                      onClick={() => setDetailTab("refund")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "refund" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Refund Bridge
                    </button>
                    <button
                      onClick={() => setDetailTab("communication")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "communication" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Call Log
                    </button>
                    <button
                      onClick={() => setDetailTab("audit")}
                      className={`py-3 px-3.5 border-b-2 transition-all ${detailTab === "audit" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 font-black" : "border-transparent text-slate-500 font-bold"}`}
                    >
                      Audit Log
                    </button>

                  </div>

                  {/* Subtab content blocks */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {detailTab === "messages" && (
                      <div className="h-full flex flex-col justify-between">
                        {/* Messages Thread list */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                          {selectedTicket.messages && selectedTicket.messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-8">
                              <HelpCircle className="mb-2 text-slate-300 dark:text-slate-700" size={32} />
                              No messages logged yet. Use the composer below.
                            </div>
                          ) : (
                            (() => {
                              let lastDateStr = null;
                              return selectedTicket.messages?.map(msg => {
                                const msgDate = new Date(msg.created_at)
                                const dateStr = msgDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                                let showDivider = false
                                if (dateStr !== lastDateStr) {
                                  showDivider = true
                                  lastDateStr = dateStr
                                }
                                return (
                                  <React.Fragment key={msg.id}>
                                    {showDivider && (
                                      <div className="w-full flex justify-center my-3 select-none">
                                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-800">
                                          {dateStr}
                                        </span>
                                      </div>
                                    )}
                                    <div
                                      className={`flex flex-col max-w-[85%] ${
                                        msg.sender_persona === "customer"
                                          ? "mr-auto items-start"
                                          : "ml-auto items-end"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 mb-1 px-1">
                                        <span>{msg.sender_username}</span>
                                        <span>•</span>
                                        <span>{msg.sender_persona === "employee" ? "Support Agent" : msg.sender_persona}</span>
                                      </div>
                                      <div
                                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                                          msg.is_internal_note
                                            ? "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-200 rounded-tl-sm shadow-xs"
                                            : msg.sender_persona === "customer"
                                            ? "bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-850 dark:text-slate-100 rounded-tl-sm shadow-xs"
                                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-md shadow-indigo-500/20"
                                        }`}
                                      >
                                        {msg.is_internal_note && (
                                          <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 mb-1 border-b border-amber-200 dark:border-amber-900/60 pb-0.5">
                                            <Lock size={10} /> Internal Note
                                          </div>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                      </div>
                                      <span className="text-[9px] font-semibold text-slate-400 mt-1 px-1">
                                        {msgDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </React.Fragment>
                                )
                              })
                            })()
                          )}
                        </div>

                        {/* Compose form */}
                        <form onSubmit={handleSendMessage} className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 space-y-2.5">
                          <div className="flex items-center justify-between text-xs px-1">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600 dark:text-slate-400 select-none">
                              <input
                                type="checkbox"
                                checked={isInternalNote}
                                onChange={e => setIsInternalNote(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Lock size={12} className={isInternalNote ? "text-amber-500" : "text-slate-400"} />
                              <span>Internal Note</span>
                            </label>
                            
                            <div className="flex gap-3 items-center">
                              {templates.length > 0 && (
                                <select
                                  value={selectedTemplate}
                                  onChange={e => {
                                    const body = e.target.value
                                    setSelectedTemplate(body)
                                    if (body) {
                                      setChatMessage(prev => (prev ? prev + "\n" + body : body))
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none"
                                >
                                  <option value="">Insert Canned Reply</option>
                                  {templates.map(t => (
                                    <option key={t.id} value={t.body}>{t.name}</option>
                                  ))}
                                </select>
                              )}

                              <label className="flex items-center gap-1 cursor-pointer text-indigo-600 dark:text-indigo-400 hover:underline">
                                <Paperclip size={12} />
                                <span className="font-bold">Attach File</span>
                                <input type="file" className="hidden" onChange={handleUploadAttachment} />
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={isInternalNote ? "Type internal agent note (locked)..." : "Reply to customer..."}
                              value={chatMessage}
                              onChange={e => setChatMessage(e.target.value)}
                              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                            />
                            <button
                              type="submit"
                              disabled={actionLoading || !chatMessage.trim()}
                              className="p-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 flex items-center justify-center shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {detailTab === "booking_context" && (
                      <div className="space-y-6">
                        {contextLoading ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <RefreshCw size={24} className="animate-spin mb-2" />
                            Loading booking context...
                          </div>
                        ) : !ticketContext?.booking ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                            <HelpCircle size={32} className="mb-2 text-slate-350" />
                            No booking is linked to this ticket.
                            <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                              Use the "Link Booking" input in the left panel to associate a legacy service request.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs leading-relaxed">
                            {/* Col 1: Customer & Booking Core Info */}
                            <div className="space-y-4 lg:col-span-2">
                              {/* Customer section */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                                <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                                  Customer Profile
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Full Name</span>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-205">{ticketContext.customer?.name || selectedTicket.customer_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Phone Number</span>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-205">{ticketContext.customer?.phone || selectedTicket.phone || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Email Address</span>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-205 truncate block">{ticketContext.customer?.email || selectedTicket.email || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Service Address</span>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-205 block mt-0.5">{ticketContext.booking.address || "-"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Booking section */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                                <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                                  Booking Details
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Booking ID</span>
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-[10px] block mt-0.5">{ticketContext.booking.request_id}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Service Category</span>
                                    <span className="font-extrabold block mt-0.5 capitalize">{ticketContext.booking.service_category}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Issue / Title</span>
                                    <span className="font-extrabold block mt-0.5">{ticketContext.booking.issue_title}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Preferred Date / Time</span>
                                    <span className="font-extrabold block mt-0.5">{ticketContext.booking.preferred_date} @ {ticketContext.booking.preferred_time || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Order Amount</span>
                                    <span className="font-extrabold block mt-0.5">₹{ticketContext.booking.final_amount || ticketContext.booking.total_amount}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Payment / Booking Status</span>
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                      <span className="font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {ticketContext.booking.payment_status}
                                      </span>
                                      <span className="font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase bg-indigo-55 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                        {ticketContext.booking.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {ticketContext.booking.description && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850 mt-1">
                                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Description / Complaint</span>
                                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{ticketContext.booking.description}</p>
                                  </div>
                                )}
                                {ticketContext.booking.technician && (
                                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-850 mt-1 bg-slate-50/50 dark:bg-slate-950/10 p-2.5 rounded-xl space-y-1.5">
                                    <span className="text-slate-400 block font-bold text-[9px] uppercase">Assigned Technician</span>
                                    <span className="font-extrabold block text-slate-850 dark:text-slate-150">
                                      {ticketContext.booking.technician.name} (📞 {ticketContext.booking.technician.phone || "No phone"})
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Service Packages Section */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                                <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                                  Service Inclusions & Exclusions
                                </h4>
                                {ticketContext.booking.cart_data && ticketContext.booking.cart_data.length > 0 ? (
                                  <div className="space-y-4">
                                    {ticketContext.booking.cart_data.map((item, idx) => (
                                      <div key={idx} className="space-y-2 border-b border-slate-100 dark:border-slate-850 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-center">
                                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{item.name || item.title || "Package Selection"}</span>
                                          {item.price && <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono">₹{item.price}</span>}
                                        </div>
                                        {item.description && <p className="text-[11px] text-slate-400 leading-normal">{item.description}</p>}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                          {item.includes && item.includes.length > 0 && (
                                            <div>
                                              <span className="text-emerald-600 dark:text-emerald-450 font-bold text-[9px] uppercase tracking-wider block mb-1">✔️ Includes</span>
                                              <ul className="list-disc pl-3 text-[10px] text-slate-500 space-y-0.5">
                                                {item.includes.map((inc, i) => <li key={i}>{typeof inc === 'string' ? inc : (inc?.text || '')}</li>)}
                                              </ul>
                                            </div>
                                          )}
                                          {item.excludes && item.excludes.length > 0 && (
                                            <div>
                                              <span className="text-rose-600 dark:text-rose-450 font-bold text-[9px] uppercase tracking-wider block mb-1">❌ Excludes</span>
                                              <ul className="list-disc pl-3 text-[10px] text-slate-500 space-y-0.5">
                                                {item.excludes.map((exc, i) => <li key={i}>{typeof exc === 'string' ? exc : (exc?.text || '')}</li>)}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                        {item.warranty && (
                                          <div className="text-[10px] bg-sky-500/5 border border-sky-500/10 p-1.5 rounded-lg text-sky-600 dark:text-sky-400 font-bold inline-block">
                                            🛡️ Warranty: {item.warranty}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-400 italic text-[11px]">No package-level details in cart_data.</p>
                                )}
                              </div>
                            </div>

                            {/* Col 2: Job Lifecycle Timeline */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                              <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
                                Job Lifecycle Timeline
                              </h4>
                              {ticketContext.timeline && ticketContext.timeline.length > 0 ? (
                                <div className="relative pl-4 border-l-2 border-indigo-100 dark:border-indigo-950 space-y-5 ml-1">
                                  {ticketContext.timeline.map((evt, i) => (
                                    <div key={i} className="relative text-xs">
                                      <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900" />
                                      <span className="font-extrabold text-slate-850 dark:text-slate-150 block">{evt.label}</span>
                                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(evt.timestamp).toLocaleString("en-IN")}</span>
                                    </div>
                                  ))}
                                  {selectedTicket.linked_complaint_id && (
                                    <div className="relative text-xs">
                                      <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                                      <span className="font-extrabold text-rose-600 dark:text-rose-400 block">Complaint Raised</span>
                                      <span className="text-[10px] text-slate-400 font-semibold">Associated from portal</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-[11px]">No timeline entries recorded.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {detailTab === "reschedule" && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                          <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Current Schedule Context</h4>
                          {ticketContext?.booking ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400">Scheduled Date:</span>
                                <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                  {ticketContext.booking.preferred_date}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Time Slot:</span>
                                <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                  {ticketContext.booking.preferred_time || "—"}
                                </span>
                              </div>
                              {ticketContext.booking.technician && (
                                <div className="col-span-2">
                                  <span className="text-slate-400">Assigned Tech:</span>
                                  <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                    {ticketContext.booking.technician.name} ({ticketContext.booking.technician.phone || "No phone"})
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Loading booking details...</p>
                          )}
                        </div>

                        {selectedTicket.linked_reschedule_request ? (
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                            <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Active Reschedule Request</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div>
                                <span className="text-slate-400">Status:</span>
                                <span className="font-black block uppercase text-amber-600 dark:text-amber-400 text-[10px] mt-0.5">
                                  {selectedTicket.linked_reschedule_request.status || "PENDING"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Requested Date & Slot:</span>
                                <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                  {selectedTicket.linked_reschedule_request.new_date} ({selectedTicket.linked_reschedule_request.new_time_slot})
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400">Reason:</span>
                                <span className="font-semibold block text-slate-700 dark:text-slate-300 mt-0.5">
                                  {selectedTicket.linked_reschedule_request.reason}
                                </span>
                              </div>
                            </div>

                            {["pending", "pending_admin_review", "admin_review"].includes(selectedTicket.linked_reschedule_request.status?.toLowerCase()) && (
                              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Process Reschedule</span>
                                <Input
                                  placeholder="Provide optional review notes..."
                                  value={rescheduleNotes}
                                  onChange={e => setRescheduleNotes(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2.5">
                                  <button
                                    onClick={() => handleConfirmReschedule(selectedTicket.linked_reschedule_request.id, false)}
                                    disabled={actionLoading}
                                    className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleConfirmReschedule(selectedTicket.linked_reschedule_request.id, true)}
                                    disabled={actionLoading}
                                    className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                                  >
                                    Approve & Sync
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={handleCreateReschedule} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Calendar size={14} className="text-indigo-500" />
                              Submit Reschedule Request
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                              Submitting this form checks technician availability. Requests &ge; 24h prior with free slots are automatically approved.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">New Date</label>
                                <input
                                  type="date"
                                  value={rescheduleDate}
                                  onChange={e => setRescheduleDate(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  required
                                />
                              </div>
                              <Select
                                label="New Time Slot"
                                value={rescheduleTimeSlot}
                                onChange={e => setRescheduleTimeSlot(e.target.value)}
                                options={[
                                  { value: "09:00 - 11:00", label: "09:00 AM - 11:00 AM" },
                                  { value: "11:00 - 13:00", label: "11:00 AM - 01:00 PM" },
                                  { value: "13:00 - 15:00", label: "01:00 PM - 03:00 PM" },
                                  { value: "15:00 - 17:00", label: "03:00 PM - 05:00 PM" },
                                  { value: "17:00 - 19:00", label: "05:00 PM - 07:00 PM" }
                                ]}
                              />
                            </div>

                            <Input
                              label="Reschedule Reason"
                              placeholder="e.g. Customer not at home, requested delay..."
                              value={rescheduleReason}
                              onChange={e => setRescheduleReason(e.target.value)}
                              required
                            />

                            <TextArea
                              label="Additional Notes / Review Log"
                              placeholder="Review comments..."
                              value={rescheduleNotes}
                              onChange={e => setRescheduleNotes(e.target.value)}
                            />

                            <button
                              type="submit"
                              disabled={actionLoading || !selectedTicket.booking}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                            >
                              {!selectedTicket.booking ? "Needs Booking Linkage" : "Request Reschedule"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {detailTab === "cancellation" && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                          <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Payment & Booking Details</h4>
                          {ticketContext?.booking ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400">Total Price:</span>
                                <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                  ₹{ticketContext.booking.final_amount || ticketContext.booking.total_amount}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Payment Status:</span>
                                <span className="font-black block uppercase text-indigo-600 dark:text-indigo-400 text-[10px] mt-0.5">
                                  {ticketContext.booking.payment_status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Loading booking details...</p>
                          )}
                        </div>

                        {selectedTicket.cancellation_requests && selectedTicket.cancellation_requests.length > 0 ? (
                          (() => {
                            const creq = selectedTicket.cancellation_requests[0]
                            return (
                              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Active Cancellation Request</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div>
                                    <span className="text-slate-400">Status:</span>
                                    <span className="font-black block uppercase text-rose-600 dark:text-rose-450 text-[10px] mt-0.5">
                                      {creq.status || "PENDING"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Reason:</span>
                                    <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                      {creq.reason}
                                    </span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-slate-400">Reason Note:</span>
                                    <span className="font-semibold block text-slate-600 dark:text-slate-400 mt-0.5">
                                      {creq.reason_note || "No note provided."}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Retention Offered:</span>
                                    <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                      {creq.retention_offered ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  {creq.retention_outcome && (
                                    <div>
                                      <span className="text-slate-400">Retention Outcome:</span>
                                      <span className="font-extrabold block text-slate-800 dark:text-slate-200 mt-0.5">
                                        {creq.retention_outcome}
                                      </span>
                                    </div>
                                  )}
                                  {creq.refund_request_refund_id && (
                                    <div className="col-span-2 border-t border-slate-105 dark:border-slate-800 pt-2 mt-1">
                                      <span className="text-slate-400">Linked Refund:</span>
                                      <span className="font-bold block text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                                        {creq.refund_request_refund_id} (Full Refund Drafted)
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {creq.status?.toLowerCase() === "pending" && (
                                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex gap-2">
                                    <button
                                      onClick={() => handleConfirmCancellation(false)}
                                      disabled={actionLoading}
                                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                                    >
                                      Reject Request
                                    </button>
                                    <button
                                      onClick={() => handleConfirmCancellation(true)}
                                      disabled={actionLoading}
                                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                                    >
                                      Approve (Cancel Booking)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })()
                        ) : (
                          <form onSubmit={handleCreateCancellation} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <AlertTriangle size={14} className="text-rose-500" />
                              Submit Booking Cancellation
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                              Creates a CancellationRequest ticket. If paid, it automatically drafts a linked RefundRequest request for finance.
                            </p>

                            <Select
                              label="Cancellation Reason"
                              value={cancelReason}
                              onChange={e => setCancelReason(e.target.value)}
                              options={[
                                { value: "Customer changed mind", label: "Customer changed mind" },
                                { value: "Price too high", label: "Price too high" },
                                { value: "Technician delay", label: "Technician delay" },
                                { value: "Booked by mistake", label: "Booked by mistake" },
                                { value: "Other", label: "Other" }
                              ]}
                            />

                            <TextArea
                              label="Reason Notes"
                              placeholder="Detail why customer wants to cancel..."
                              value={cancelReasonNote}
                              onChange={e => setCancelReasonNote(e.target.value)}
                              required
                            />

                            <div className="border-t border-slate-200 dark:border-slate-805 pt-3 space-y-3">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Customer Retention Audit</span>
                              
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={cancelRetentionOffered}
                                  onChange={e => setCancelRetentionOffered(e.target.checked)}
                                  className="rounded text-indigo-600"
                                />
                                <span>Did you offer retention discounts/options?</span>
                              </label>

                              {cancelRetentionOffered && (
                                <Input
                                  label="Retention Outcome Note"
                                  placeholder="e.g. Customer declined discount, insisted on full refund..."
                                  value={cancelRetentionOutcome}
                                  onChange={e => setCancelRetentionOutcome(e.target.value)}
                                />
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={actionLoading || !selectedTicket.booking}
                              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                            >
                              {!selectedTicket.booking ? "Needs Booking Linkage" : "Initiate Cancellation Process"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {detailTab === "refund" && (
                      <div className="space-y-4">
                        {!selectedTicket.linked_refund_request ? (
                          // Request Refund Form
                          <form onSubmit={handleRequestRefund} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <IndianRupee size={14} className="text-emerald-500" />
                              Initiate Refund Bridge
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                              Directly calls the legacy service requests refund creation service. Gated by customer + booking linkages.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                              <Select
                                label="Refund Type"
                                value={refundType}
                                onChange={e => setRefundType(e.target.value)}
                                options={[
                                  { value: "FULL", label: "Full Refund" },
                                  { value: "PARTIAL", label: "Partial Refund" },
                                  { value: "CUSTOM", label: "Custom Refund" }
                                ]}
                              />
                              <Input
                                label="Requested Amount (₹)"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={refundRequestedAmount}
                                onChange={e => setRefundRequestedAmount(e.target.value)}
                                required
                              />
                            </div>

                            <Input
                              label="Reason for Refund"
                              placeholder="Describe why the refund is being initiated"
                              value={refundReason}
                              onChange={e => setRefundReason(e.target.value)}
                              required
                            />

                            <TextArea
                              label="Additional Notes"
                              placeholder="Internal review comments..."
                              value={refundNotes}
                              onChange={e => setRefundNotes(e.target.value)}
                            />

                            <button
                              type="submit"
                              disabled={actionLoading || !selectedTicket.booking}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                            >
                              {!selectedTicket.booking ? "Needs Booking Linkage" : "Submit Refund Request"}
                            </button>
                          </form>
                        ) : (
                          // Refund details & actions
                          <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                              <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Linked Refund Record</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-400">Refund Code:</span>
                                  <span className="font-extrabold block font-mono text-[10px] mt-0.5 text-slate-800 dark:text-slate-200">
                                    {selectedTicket.linked_refund_request_refund_id}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Current Status:</span>
                                  {(() => {
                                    const rStatus = (selectedTicket.linked_refund_request_status || "PENDING").toLowerCase();
                                    const statusColor = rStatus === "rejected" ? "text-rose-600 dark:text-rose-450"
                                                      : rStatus === "approved" ? "text-emerald-600 dark:text-emerald-400"
                                                      : rStatus === "pending" || rStatus === "submitted" ? "text-amber-650 dark:text-amber-400"
                                                      : "text-indigo-600 dark:text-indigo-400";
                                    return (
                                      <span className={`font-black block uppercase text-[10px] mt-0.5 ${statusColor}`}>
                                        {selectedTicket.linked_refund_request_status}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <span className="text-slate-400">Refund Amount:</span>
                                  <span className="font-extrabold block mt-0.5 text-slate-800 dark:text-slate-200">
                                    ₹{selectedTicket.linked_refund_request_amount}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Refund State Actions */}
                            {canApproveRefund ? (
                              <>
                                {["pending", "submitted"].includes(selectedTicket.linked_refund_request_status?.toLowerCase()) && (
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* Approve block */}
                                    <form onSubmit={handleApproveRefund} className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                                      <h5 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Approve Refund Request</h5>
                                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold my-1 text-slate-700 dark:text-slate-300">
                                        <input
                                          type="checkbox"
                                          checked={refundIsFull}
                                          onChange={e => setRefundIsFull(e.target.checked)}
                                          className="rounded text-emerald-600"
                                        />
                                        <span>Is Full Amount Refund</span>
                                      </label>

                                      {!refundIsFull && (
                                        <Input
                                          label="Approved Amount (₹)"
                                          type="number"
                                          step="0.01"
                                          value={refundApprovedAmount}
                                          onChange={e => setRefundApprovedAmount(e.target.value)}
                                          required
                                        />
                                      )}

                                      <Input
                                        placeholder="Internal notes..."
                                        value={refundApprovalNote}
                                        onChange={e => setRefundApprovalNote(e.target.value)}
                                      />

                                      <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                                      >
                                        Approve Payout
                                      </button>
                                    </form>

                                    {/* Reject block */}
                                    <form onSubmit={handleRejectRefund} className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-3">
                                      <h5 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">Reject Refund Request</h5>
                                      <Input
                                        placeholder="Reason for rejection"
                                        value={refundRejectNote}
                                        onChange={e => setRefundRejectNote(e.target.value)}
                                        required
                                      />
                                      <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                                      >
                                        Reject Request
                                      </button>
                                    </form>
                                  </div>
                                )}

                                {["approved", "approved_full", "approved_partial"].includes(selectedTicket.linked_refund_request_status?.toLowerCase()) && (
                                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
                                    <h5 className="text-[10px] font-black uppercase text-slate-400">Next financial step</h5>
                                    <p className="text-xs">Refund request approved. Submit payout logs to the Finance department queue.</p>
                                    <button
                                      onClick={handleSendRefundToFinance}
                                      disabled={actionLoading}
                                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                                    >
                                      Submit to Finance Queue
                                    </button>
                                  </div>
                                )}

                                {selectedTicket.linked_refund_request_status?.toLowerCase() === "sent_to_finance" && (
                                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
                                    <h5 className="text-[10px] font-black uppercase text-slate-400">Mark Completed</h5>
                                    <p className="text-xs">Mark the payout disbursed and set the refund state transaction to Completed.</p>
                                    <button
                                      onClick={handleCompleteRefund}
                                      disabled={actionLoading}
                                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                                    >
                                      Disbursed (Complete Refund)
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-1.5">
                                <h5 className="font-black uppercase text-amber-600 dark:text-amber-400 text-[10px] tracking-wider">Approval Authority Required</h5>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                                  You do not have permission to approve, reject, or process refund payouts. Please use the left panel to escalate this ticket to a Senior Care Agent or Administrator if action is required.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {detailTab === "communication" && (
                      <div className="space-y-4">
                        {/* Log communication form */}
                        <form onSubmit={handleLogCommunication} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <PhoneCall size={14} className="text-indigo-500" />
                            Log Customer Interaction (Manual)
                          </h4>

                          <div className="grid grid-cols-2 gap-4">
                            <Select
                              label="Channel"
                              value={commChannel}
                              onChange={e => setCommChannel(e.target.value)}
                              options={[
                                { value: "call", label: "Phone Call" },
                                { value: "sms", label: "SMS Text" },
                                { value: "whatsapp", label: "WhatsApp Chat" },
                                { value: "email", label: "Email" },
                                { value: "in_person", label: "In Person Meet" }
                              ]}
                            />
                            <Select
                              label="Direction"
                              value={commDirection}
                              onChange={e => setCommDirection(e.target.value)}
                              options={[
                                { value: "outbound", label: "Outbound (Logged by Agent)" },
                                { value: "inbound", label: "Inbound (From Customer)" }
                              ]}
                            />
                          </div>

                          <Input
                            label="Duration (seconds)"
                            type="number"
                            placeholder="Optional duration in seconds"
                            value={commDuration}
                            onChange={e => setCommDuration(e.target.value)}
                          />

                          <TextArea
                            label="Interaction Summary"
                            placeholder="Provide brief details on what was discussed or decided..."
                            value={commSummary}
                            onChange={e => setCommSummary(e.target.value)}
                            required
                          />

                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                          >
                            Log Interaction
                          </button>
                        </form>

                        {/* Historical Communication logs list */}
                        <div className="space-y-3.5">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Interaction History</h4>
                          {selectedTicket.communication_logs && selectedTicket.communication_logs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No manual calls or interaction logs recorded.</p>
                          ) : (
                            selectedTicket.communication_logs?.map(log => (
                              <div key={log.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl shadow-sm text-xs space-y-1.5">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                                  <span className="text-indigo-600 dark:text-indigo-400">
                                    {log.direction} {log.channel}
                                  </span>
                                  <span>{new Date(log.occurred_at).toLocaleString()}</span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 font-medium">{log.summary}</p>
                                <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-850">
                                  <span>Logged by: {log.logged_by_username}</span>
                                  {log.duration_seconds && <span>Duration: {log.duration_seconds}s</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {detailTab === "audit" && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Immutable Ticket Audit Trail</h4>
                        <div className="border-l-2 border-indigo-100 dark:border-indigo-900/60 pl-4 space-y-4">
                          {selectedTicket.activities?.map(act => (
                            <div key={act.id} className="relative text-xs">
                              {/* Audit Dot */}
                              <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-indigo-500" />
                              
                              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-0.5">
                                <span>{act.activity_type}</span>
                                <span>{new Date(act.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-300 font-semibold">{act.description}</p>
                              {act.from_status && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold mt-1">
                                  <span>Status transition:</span>
                                  <span className="capitalize line-through">{act.from_status}</span>
                                  <ChevronRight size={10} />
                                  <span className="capitalize font-bold text-slate-700 dark:text-slate-300">{act.to_status}</span>
                                </div>
                              )}
                              <span className="text-[9px] text-slate-400 block mt-1">By: {act.actor_username || "System Auto"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Customer 360 Modal */}
      {createPortal(
        <AnimatePresence>
          {is360Open && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIs360Open(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
              >
                {/* Premium Header Line */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
                
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/40 dark:bg-slate-950/10">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users size={16} className="text-emerald-500" />
                    Customer 360 Profile Overview
                  </h3>
                  <button onClick={() => setIs360Open(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all">
                    <X size={16} />
                  </button>
                </div>

                {loading360 ? (
                  <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin" size={16} /> Loading Customer 360 Profile...
                  </div>
                ) : customer360Data ? (
                  <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                    {/* Warning for frequent complainants */}
                    {customer360Data.metrics?.is_frequent_complainant && (
                      <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold animate-pulse">
                        <AlertTriangle size={15} />
                        <span>Warning: This customer is marked as a Frequent Complainant. Handle interactions with care.</span>
                      </div>
                    )}

                    {/* Customer Profile Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Name</span>
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">{customer360Data.profile?.name}</h4>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Email</span>
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-white truncate">{customer360Data.profile?.email}</h4>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Phone</span>
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">{customer360Data.profile?.phone || "—"}</h4>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Customer Since</span>
                        <h4 className="font-extrabold text-sm text-slate-855 dark:text-white">
                          {customer360Data.profile?.created_at ? new Date(customer360Data.profile.created_at).toLocaleDateString() : "—"}
                        </h4>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Bookings</span>
                        <span className="text-lg font-black block mt-0.5 text-slate-900 dark:text-white">{customer360Data.metrics?.total_bookings || 0}</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Open Tickets</span>
                        <span className="text-lg font-black block mt-0.5 text-slate-900 dark:text-white">{customer360Data.metrics?.open_tickets || 0}</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Refunds Disbursed</span>
                        <span className="text-lg font-black block mt-0.5 text-emerald-600 dark:text-emerald-450">₹{customer360Data.metrics?.total_refunds_paid || "0.00"}</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Complaints</span>
                        <span className="text-lg font-black block mt-0.5 text-slate-900 dark:text-white">{customer360Data.metrics?.total_complaints || 0}</span>
                      </div>
                    </div>

                    {/* Recent Bookings & Tickets Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bookings */}
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recent Service Bookings</h4>
                        {customer360Data.recent_bookings?.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No bookings found.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {customer360Data.recent_bookings?.map(b => (
                              <div key={b.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-xs flex justify-between items-center shadow-sm">
                                <div>
                                  <span className="font-extrabold text-[10px] text-indigo-600 dark:text-indigo-400 block font-mono">{b.request_id}</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5 capitalize">{b.service_category}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold block text-slate-850 dark:text-white">₹{b.total_amount}</span>
                                  <span className="text-[9px] font-bold block text-slate-400 mt-0.5 capitalize">{b.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tickets */}
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Care Tickets History</h4>
                        {customer360Data.recent_tickets?.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No tickets found.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {customer360Data.recent_tickets?.map(t => (
                              <div key={t.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-xs flex justify-between items-center shadow-sm">
                                <div>
                                  <span className="font-extrabold text-[10px] text-slate-850 dark:text-white block font-mono">{t.ticket_number}</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5 capitalize">{t.category}</span>
                                </div>
                                <div className="text-right font-bold">
                                  <span className="text-[10px] block text-indigo-600 dark:text-indigo-400 capitalize">{t.status}</span>
                                  <span className="text-[9px] block text-slate-400 mt-0.5 uppercase tracking-wide">{t.priority} priority</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">Failed to load customer profile details.</div>
                )}

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setIs360Open(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                  >
                    Close Profile
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
