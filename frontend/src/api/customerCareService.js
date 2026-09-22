/**
 * customerCareService.js
 * API helper functions for Customer Care Tickets, Agents, and Analytics.
 */

import { apiRequest } from "./client.js"

export async function fetchTickets(filters = {}) {
  const query = new URLSearchParams(filters).toString()
  const path = query ? `/customer-care/tickets/?${query}` : "/customer-care/tickets/"
  return apiRequest(path, { method: "GET" })
}

export async function fetchTicketDetail(id) {
  return apiRequest(`/customer-care/tickets/${id}/`, { method: "GET" })
}

export async function createTicket(payload) {
  return apiRequest("/customer-care/tickets/", {
    method: "POST",
    json: payload,
  })
}

export async function assignTicket(id, agentId) {
  return apiRequest(`/customer-care/tickets/${id}/assign/`, {
    method: "POST",
    json: { agent_id: agentId },
  })
}

export async function changeTicketStatus(id, status, note = "") {
  return apiRequest(`/customer-care/tickets/${id}/change_status/`, {
    method: "POST",
    json: { status, note },
  })
}

export async function escalateTicket(id, escalatedToTier, reason) {
  return apiRequest(`/customer-care/tickets/${id}/escalate/`, {
    method: "POST",
    json: { escalated_to_tier: escalatedToTier, reason },
  })
}

export async function addTicketMessage(id, message, isInternalNote = false) {
  return apiRequest(`/customer-care/tickets/${id}/add_message/`, {
    method: "POST",
    json: { message, is_internal_note: isInternalNote },
  })
}

export async function uploadTicketAttachment(id, file) {
  const formData = new FormData()
  formData.append("file", file)
  return apiRequest(`/customer-care/tickets/${id}/upload_attachment/`, {
    method: "POST",
    body: formData,
  })
}

export async function requestTicketRefund(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/request_refund/`, {
    method: "POST",
    json: payload,
  })
}

export async function approveTicketRefund(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/approve_refund/`, {
    method: "POST",
    json: payload,
  })
}

export async function rejectTicketRefund(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/reject_refund/`, {
    method: "POST",
    json: payload,
  })
}

export async function sendRefundToFinance(id) {
  return apiRequest(`/customer-care/tickets/${id}/send_refund_to_finance/`, {
    method: "POST",
  })
}

export async function completeRefund(id) {
  return apiRequest(`/customer-care/tickets/${id}/complete_refund/`, {
    method: "POST",
  })
}

export async function logTicketCommunication(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/log_communication/`, {
    method: "POST",
    json: payload,
  })
}

export async function fetchCareAgents() {
  return apiRequest("/customer-care/agents/", { method: "GET" })
}

export async function createCareAgent(payload) {
  return apiRequest("/customer-care/agents/", {
    method: "POST",
    json: payload,
  })
}

export async function updateCareAgent(id, payload) {
  return apiRequest(`/customer-care/agents/${id}/`, {
    method: "PATCH",
    json: payload,
  })
}

export async function fetchCareAnalytics() {
  return apiRequest("/customer-care/analytics/", { method: "GET" })
}

export async function fetchTicketContext(id) {
  return apiRequest(`/customer-care/tickets/${id}/context/`, { method: "GET" })
}

export async function requestReschedule(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/request_reschedule/`, {
    method: "POST",
    json: payload,
  })
}

export async function confirmReschedule(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/confirm_reschedule/`, {
    method: "POST",
    json: payload,
  })
}

export async function requestCancellation(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/request_cancellation/`, {
    method: "POST",
    json: payload,
  })
}

export async function approveCancellation(id, payload) {
  return apiRequest(`/customer-care/tickets/${id}/approve_cancellation/`, {
    method: "POST",
    json: payload,
  })
}

export async function searchCustomers(q) {
  return apiRequest(`/customer-care/customers/search/?q=${encodeURIComponent(q)}`, {
    method: "GET",
  })
}

export async function fetchCustomer360(customerId) {
  return apiRequest(`/customer-care/customers/${customerId}/360/`, {
    method: "GET",
  })
}

export async function fetchCustomerCommunicationHistory(customerId) {
  return apiRequest(`/customer-care/customers/${customerId}/communication-history/`, {
    method: "GET",
  })
}

export async function fetchMessageTemplates() {
  return apiRequest("/customer-care/templates/", { method: "GET" })
}

export async function createMessageTemplate(payload) {
  return apiRequest("/customer-care/templates/", {
    method: "POST",
    json: payload,
  })
}

