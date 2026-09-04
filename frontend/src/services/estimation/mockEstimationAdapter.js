/**
 * mockEstimationAdapter.js
 * Central mock adapter and storage for Phase 1 AC Inspection / Estimation.
 *
 * Uses localStorage/sessionStorage under the namespace 'calservice_mock_estimations'.
 * Phase 2 will replace this adapter with CustomerBackendAdapter without altering the UI or repository.
 */

import {
  ESTIMATION_FEE,
  ESTIMATION_DURATION,
  ESTIMATION_TITLE,
  ESTIMATION_SUBTITLE,
  ESTIMATION_DESCRIPTION,
  INSPECTION_CARD_INCLUDES,
  WHAT_IS_INCLUDED,
  WHAT_TECHNICIAN_CHECKS,
  HOW_ESTIMATION_WORKS_STEPS,
  WHAT_IS_NOT_INCLUDED,
} from "./estimationConfig.js";

const STORAGE_KEY = "calservice_mock_estimations";

function getStoredEstimations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[mockEstimationAdapter] Failed to parse stored estimations:", err);
    return [];
  }
}

function saveStoredEstimations(list) {
  try {
    const json = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEY, json);
    sessionStorage.setItem(STORAGE_KEY, json);
    // Dispatch custom event so listeners can react immediately
    window.dispatchEvent(new CustomEvent("calservice_estimations_updated", { detail: list }));
  } catch (err) {
    console.warn("[mockEstimationAdapter] Failed to save estimations:", err);
  }
}

export const mockEstimationAdapter = {
  /**
   * Returns the AC Inspection service metadata for card and details modal rendering.
   */
  async fetchEstimationService() {
    return {
      id: "ac-inspection",
      name: ESTIMATION_TITLE,
      subtitle: ESTIMATION_SUBTITLE,
      price: ESTIMATION_FEE,
      duration: ESTIMATION_DURATION,
      badge: "Diagnosis & Inspection",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      description: ESTIMATION_DESCRIPTION,
      includes: INSPECTION_CARD_INCLUDES,
      whatsIncluded: WHAT_IS_INCLUDED,
      whatTechnicianChecks: WHAT_TECHNICIAN_CHECKS,
      howEstimationWorks: HOW_ESTIMATION_WORKS_STEPS,
      whatIsNotIncluded: WHAT_IS_NOT_INCLUDED,
      jobType: "ESTIMATION",
    };
  },

  /**
   * Creates a new estimation booking in frontend mock storage.
   */
  async createBooking(data) {
    const list = getStoredEstimations();
    const estNum = String(list.length + 1).padStart(3, "0");
    const requestId = `LOCAL-EST-${estNum}`;

    const newBooking = {
      id: requestId,
      requestId: requestId,
      request_id: requestId,
      jobType: "ESTIMATION",
      serviceType: "AC_INSPECTION",
      serviceName: ESTIMATION_TITLE,
      issue_title: `${ESTIMATION_TITLE} (${data.acDetails?.brand || "AC"} ${data.acDetails?.type || "Split"} AC)`,
      service_category: "hvac",
      service_category_display: "AC Inspection & Estimation",
      status: "REQUESTED",
      status_display: "Estimation Requested",
      payment_status: "pending",
      payment_status_display: "Pending Inspection",
      total_amount: data.estimationFee || ESTIMATION_FEE,
      estimationFee: data.estimationFee || ESTIMATION_FEE,
      preferred_date: data.scheduledDate || data.preferred_date || "",
      preferred_time: data.scheduledTime || data.preferred_time || "",
      scheduledDate: data.scheduledDate || data.preferred_date || "",
      scheduledTime: data.scheduledTime || data.preferred_time || "",
      address: data.address || "",
      address_type: data.address_type || "Home",
      customer_name: data.customer_name || "Customer",
      phone: data.phone || "",
      acDetails: {
        type: data.acDetails?.type || "Split",
        brand: data.acDetails?.brand || "LG",
        capacity: data.acDetails?.capacity || "1.5 Ton",
        quantity: Number(data.acDetails?.quantity) || 1,
      },
      customerReportedIssue: data.customerReportedIssue || "Not cooling",
      notes: data.notes || "",
      photos: data.photos || [],
      created_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      cart: [
        {
          id: "ac-inspection",
          name: ESTIMATION_TITLE,
          price: data.estimationFee || ESTIMATION_FEE,
          quantity: Number(data.acDetails?.quantity) || 1,
          jobType: "ESTIMATION",
        },
      ],
    };

    list.unshift(newBooking);
    saveStoredEstimations(list);

    // Also update active session keys for seamless tracking view integration
    try {
      sessionStorage.setItem("calservice_active_tracking_id", requestId);
      sessionStorage.setItem("calservice_last_booking", JSON.stringify(newBooking));
    } catch (_) {}

    return {
      success: true,
      data: newBooking,
    };
  },

  /**
   * Returns the most recent active estimation booking, or null if none.
   */
  async getActiveEstimation() {
    const list = getStoredEstimations();
    const active = list.find((b) => !["CANCELLED", "COMPLETED", "CLOSED"].includes(b.status.toUpperCase()));
    return active || null;
  },

  /**
   * Returns all estimation bookings created by the customer.
   */
  async getMyEstimations() {
    return getStoredEstimations();
  },

  /**
   * Finds an estimation by its request ID or numeric ID.
   */
  async getEstimationById(id) {
    const list = getStoredEstimations();
    return (
      list.find((b) => b.id === id || b.requestId === id || b.request_id === id) || null
    );
  },

  /**
   * Cancels an active estimation.
   */
  cancelEstimation(id, reason = "Cancelled by customer") {
    const list = getStoredEstimations();
    let idx = -1;
    if (id) {
      idx = list.findIndex((b) => b.id === id || b.requestId === id || b.request_id === id);
    }
    if (idx === -1) {
      idx = list.findIndex((b) => !["CANCELLED", "COMPLETED", "CLOSED"].includes((b.status || "").toUpperCase()));
    }
    if (idx !== -1) {
      list[idx].status = "CANCELLED";
      list[idx].status_display = "Cancelled";
      list[idx].cancellation_reason = reason;
      list[idx].cancelled_at = new Date().toISOString();
      saveStoredEstimations(list);
      try {
        sessionStorage.removeItem("calservice_active_tracking_id");
        sessionStorage.removeItem("calservice_last_booking");
      } catch (_) {}
      return { success: true, data: list[idx] };
    }
    return { success: false, error: "Booking not found" };
  },
};
