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
  fetchCareAgents, fetchCareAnalytics
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
  general: { label: "General Support", emoji: "📌", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  billing: { label: "Billing & Payments", emoji: "💳", color: "bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  technical: { label: "Technical Issue", emoji: "⚙️", color: "bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  scheduling: { label: "Scheduling & Dispatch", emoji: "⏰", color: "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  feedback: { label: "Customer Feedback", emoji: "💬", color: "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  other: { label: "Other", emoji: "❓", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" }
}

const PRIORITY_MAP = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  medium: { label: "Medium", color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800" },
  high: { label: "High", color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800" },
  critical: { label: "Critical", color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800 animate-pulse" }
}

const STATUS_MAP = {
  new: { label: "New", color: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400" },
  assigned: { label: "Assigned", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" },
  waiting_on_customer: { label: "Waiting on Customer", color: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400" },
  waiting_on_internal: { label: "Waiting on Internal", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400" },
  escalated: { label: "Escalated", color: "bg-red-600/10 text-red-700 border-red-600/20 dark:text-red-400" },
  resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" },
  reopened: { label: "Reopened", color: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" },
  closed: { label: "Closed", color: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400" }
}

const REFUND_STATUS_MAP = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  submitted: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  approved_full: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  approved_partial: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-450",
  sent_to_finance: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400",
  completed: "bg-teal-500/10 text-teal-650 border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-400"
}

const CATEGORY_PRIORITY_MAP = {
  general: "low",
  billing: "medium",
  technical: "critical",
  scheduling: "high",
  feedback: "low",
  other: "low"
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

  const showToast = (message, type = "success") => setToast({ message, type })

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
      // Get current logged-in user profile
      const meRes = await apiRequest("/auth/me/")
      if (meRes) setCurrentUser(meRes)

      await Promise.all([
        loadTickets(),
        loadAgents(),
        loadAnalytics()
      ])
    } catch (err) {
      setError("Failed to fetch initial customer care details.")
    } finally {
      setLoading(false)
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
  }, [filterCategory, filterPriority, filterStatus, filterAgent])

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
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight flex items-center">
            Customer Care Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Resolve customer queries, track service requests SLA, manage ticket escalations and approve refunds.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-[0_4px_12px_rgba(79,70,229,0.25)] active:scale-95"
          >
            <Plus size={14} />
            Log Ticket
          </button>
          <button
            onClick={loadInitialData}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation tabs - Premium segmented square box style */}
      <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800/80">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
            activeTab === "tickets"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/60 dark:border-slate-700/60"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white border border-transparent"
          }`}
        >
          Customer Care
        </button>
        <button
          onClick={() => setActiveTab("refund_approvals")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-1.5 ${
            activeTab === "refund_approvals"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/60 dark:border-slate-700/60"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white border border-transparent"
          }`}
        >
          <span>Refund Approvals</span>
          {pendingRefundCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-black leading-none text-white bg-sky-500 rounded-full animate-pulse shadow-sm">
              {pendingRefundCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
            activeTab === "analytics"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/60 dark:border-slate-700/60"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white border border-transparent"
          }`}
        >
          Analytics & SLA
        </button>
      </div>

      {/* Tab: Tickets Queue */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div 
              onClick={() => setFilterStatus("")}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/5 dark:hover:bg-indigo-500/5 transition-all ${
                !filterStatus 
                  ? "border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20" 
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Tickets</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{analytics?.total_tickets || 0}</h2>
            </div>
            <div 
              onClick={() => setFilterStatus("new")}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-sky-400 hover:bg-sky-50/5 dark:hover:bg-sky-500/5 transition-all ${
                filterStatus === "new" 
                  ? "border-sky-500 dark:border-sky-500 ring-2 ring-sky-500/20" 
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <span className="text-[9px] font-black uppercase text-sky-500 tracking-wider">New & Open</span>
              <h2 className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {(analytics?.status_counts?.new || 0) + (analytics?.status_counts?.assigned || 0)}
              </h2>
            </div>
            <div 
              onClick={() => setFilterStatus("escalated")}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer hover:border-red-400 hover:bg-red-50/5 dark:hover:bg-red-500/5 transition-all ${
                filterStatus === "escalated" 
                  ? "border-red-500 dark:border-red-500 ring-2 ring-red-500/20" 
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">Escalated</span>
              <h2 className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{analytics?.status_counts?.escalated || 0}</h2>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm opacity-80">
              <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">SLA Breached</span>
              <h2 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{analytics?.sla_breached_count || 0}</h2>
            </div>
            <div 
              onClick={() => setFilterStatus("resolved")}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm col-span-2 md:col-span-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/5 dark:hover:bg-emerald-500/5 transition-all ${
                filterStatus === "resolved" 
                  ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20" 
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Resolved Today</span>
              <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{analytics?.status_counts?.resolved || 0}</h2>
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
                <option value="general">General Support</option>
                <option value="billing">Billing & Payments</option>
                <option value="technical">Technical Issue</option>
                <option value="scheduling">Scheduling & Dispatch</option>
                <option value="feedback">Customer Feedback</option>
                <option value="other">Other</option>
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
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_customer">Waiting on Customer</option>
                <option value="waiting_on_internal">Waiting on Internal</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
                <option value="reopened">Reopened</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={filterAgent}
                onChange={e => setFilterAgent(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Agents</option>
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
                      <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">SLA Due</th>
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
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                          onClick={() => openTicketDetail(t.id, "messages")}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-xs font-mono text-slate-900 dark:text-white block">{t.ticket_number}</span>
                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">Logged via {t.channel}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{t.customer_name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{t.phone || t.email || "—"}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-lg text-[11px] font-semibold ${catInfo.color}`}>
                              <span>{catInfo.emoji}</span>
                              <span>{catInfo.label}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${prioInfo.color}`}>
                              {prioInfo.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statInfo.color}`}>
                              {statInfo.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                            {t.assigned_agent_username || <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            {isSlabreached ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded-lg uppercase">
                                <AlertCircle size={10} /> SLA Breached
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-500">
                                {t.sla_due_at ? new Date(t.sla_due_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors shadow-sm ml-auto">
                              <ChevronRight className="w-4 h-4" />
                            </div>
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
                    options={[
                      { value: "general", label: "General Support" },
                      { value: "billing", label: "Billing & Charges" },
                      { value: "technical", label: "Technical Issues" },
                      { value: "scheduling", label: "Scheduling & Shift" },
                      { value: "feedback", label: "Customer Feedback" },
                      { value: "other", label: "Other" }
                    ]}
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

                <Input
                  label="Customer Name"
                  placeholder="Enter customer's name"
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                  required
                />

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
            <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-screen bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-950 dark:text-white flex items-center gap-1.5">
                    <span>{selectedTicket.ticket_number}</span>
                    <span className="text-xs text-slate-400 capitalize">({selectedTicket.status})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Logged: {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={refreshTicketDetail} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <RefreshCw size={14} className={actionLoading || detailLoading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Drawer Body - Split Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Metadata column */}
                <div className="w-1/3 border-r border-slate-150 dark:border-slate-800/80 p-4 space-y-5 overflow-y-auto text-xs bg-slate-50/30 dark:bg-slate-950/10">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block mb-1">Customer info</span>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl space-y-1.5 shadow-sm">
                      <span className="font-black text-slate-800 dark:text-slate-200 block">{selectedTicket.customer_name}</span>
                      {selectedTicket.phone && <span className="text-[10px] text-slate-500 block">📞 {selectedTicket.phone}</span>}
                      {selectedTicket.email && <span className="text-[10px] text-slate-500 block truncate">✉️ {selectedTicket.email}</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block mb-1">Related links</span>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl space-y-1.5 shadow-sm font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Booking ID:</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                          {selectedTicket.booking_request_id || "None"}
                        </span>
                      </div>
                      {selectedTicket.linked_refund_request_refund_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-sans">Refund ID:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {selectedTicket.linked_refund_request_refund_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick State transitions */}
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block mb-1">Update Status</span>
                    <div className="flex flex-col gap-1.5">
                      {selectedTicket.status === "new" && (
                        <button
                          onClick={() => handleChangeStatus("assigned")}
                          className="w-full text-left py-2 px-3 bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-300 font-black rounded-lg uppercase text-[10px] text-center"
                        >
                          Mark Assigned
                        </button>
                      )}
                      {["assigned", "reopened", "waiting_on_customer", "waiting_on_internal", "escalated"].includes(selectedTicket.status) && (
                        <button
                          onClick={() => handleChangeStatus("in_progress")}
                          className="w-full text-left py-2 px-3 bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-300 font-black rounded-lg uppercase text-[10px] text-center"
                        >
                          Start In Progress
                        </button>
                      )}
                      {selectedTicket.status === "in_progress" && (
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => handleChangeStatus("waiting_on_customer")}
                            className="py-2 px-1 bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:border-purple-900 dark:text-purple-300 font-black rounded-lg uppercase text-[9px] text-center"
                          >
                            Wait Cust
                          </button>
                          <button
                            onClick={() => handleChangeStatus("waiting_on_internal")}
                            className="py-2 px-1 bg-cyan-50 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-900 dark:text-cyan-300 font-black rounded-lg uppercase text-[9px] text-center"
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
                          className="w-full text-left py-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300 font-black rounded-lg uppercase text-[10px] text-center"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {selectedTicket.status === "resolved" && (
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => handleChangeStatus("closed")}
                            className="py-2 px-1 bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 font-black rounded-lg uppercase text-[9px] text-center"
                          >
                            Close
                          </button>
                          <button
                            onClick={() => handleChangeStatus("reopened")}
                            className="py-2 px-1 bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300 font-black rounded-lg uppercase text-[9px] text-center"
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
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all"
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
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                    >
                      Escalate Ticket
                    </button>
                  </form>
                </div>

                {/* Right Side: Tabbed timeline detail view */}
                <div className="w-2/3 flex flex-col h-full bg-white dark:bg-slate-900">
                  {/* Internal Subtabs */}
                  <div className="flex border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/10 px-4">
                    <button
                      onClick={() => setDetailTab("messages")}
                      className={`py-3.5 px-3 border-b-2 transition-all ${detailTab === "messages" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400" : "border-transparent text-slate-500"}`}
                    >
                      Messages
                    </button>
                    <button
                      onClick={() => setDetailTab("refund")}
                      className={`py-3.5 px-3 border-b-2 transition-all ${detailTab === "refund" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400" : "border-transparent text-slate-500"}`}
                    >
                      Refund Bridge
                    </button>
                    <button
                      onClick={() => setDetailTab("communication")}
                      className={`py-3.5 px-3 border-b-2 transition-all ${detailTab === "communication" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400" : "border-transparent text-slate-500"}`}
                    >
                      Call Log
                    </button>
                    <button
                      onClick={() => setDetailTab("audit")}
                      className={`py-3.5 px-3 border-b-2 transition-all ${detailTab === "audit" ? "border-indigo-600 text-indigo-600 dark:border-indigo-400" : "border-transparent text-slate-500"}`}
                    >
                      Audit
                    </button>
                  </div>

                  {/* Subtab content blocks */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {detailTab === "messages" && (
                      <div className="h-full flex flex-col justify-between">
                        {/* Messages Thread list */}
                        <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
                          {selectedTicket.messages && selectedTicket.messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-8">
                              <HelpCircle className="mb-2 text-slate-300 dark:text-slate-700" size={32} />
                              No messages logged yet. Use the composer below.
                            </div>
                          ) : (
                            selectedTicket.messages?.map(msg => (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${
                                  msg.sender_persona === "customer"
                                    ? "mr-auto items-start"
                                    : "ml-auto items-end"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 mb-0.5 px-1">
                                  <span>{msg.sender_username}</span>
                                  <span>•</span>
                                  <span>{msg.sender_persona}</span>
                                </div>
                                <div
                                  className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                                    msg.is_internal_note
                                      ? "bg-amber-50/70 border-amber-200 text-slate-800 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-300"
                                      : msg.sender_persona === "customer"
                                      ? "bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                      : "bg-indigo-600 border-indigo-700 text-white"
                                  }`}
                                >
                                  {msg.is_internal_note && (
                                    <div className="flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 mb-1 border-b border-amber-200 dark:border-amber-900/60 pb-0.5">
                                      <Lock size={8} /> Internal Note
                                    </div>
                                  )}
                                  <p>{msg.message}</p>
                                </div>
                                <span className="text-[8px] text-slate-400 mt-0.5 px-1">
                                  {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>
                            ))
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
                            
                            <label className="flex items-center gap-1 cursor-pointer text-indigo-600 dark:text-indigo-400 hover:underline">
                              <Paperclip size={12} />
                              <span className="font-bold">Attach File</span>
                              <input type="file" className="hidden" onChange={handleUploadAttachment} />
                            </label>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={isInternalNote ? "Type internal agent note (locked)..." : "Reply to customer..."}
                              value={chatMessage}
                              onChange={e => setChatMessage(e.target.value)}
                              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                            />
                            <button
                              type="submit"
                              disabled={actionLoading || !chatMessage.trim()}
                              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center shadow-md active:scale-95 transition-all"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </form>
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
    </div>
  )
}
