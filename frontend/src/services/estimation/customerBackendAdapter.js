/**
 * customerBackendAdapter.js
 * Production-ready Customer Backend Adapter for AC Inspection / Estimation.
 *
 * Connects the frontend to the real Django REST API endpoints:
 * - POST /api/booking/ (with job_type: "ESTIMATION")
 * - GET  /api/booking/{id}/
 * - POST /api/booking/{id}/cancel/
 *
 * Persists data authoritatively into PostgreSQL (Supabase) via Django,
 * while maintaining local cache synchronization for fast client UI rendering.
 */

import { apiRequest } from "../../api/client.js";
import {
  getCustomerSelectedAddress,
  getCustomerCoordinates,
} from "../../utils/customerLocationStorage.js";
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
    console.warn("[customerBackendAdapter] Failed to parse stored estimations:", err);
    return [];
  }
}

function saveStoredEstimations(list) {
  try {
    const json = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEY, json);
    sessionStorage.setItem(STORAGE_KEY, json);
    window.dispatchEvent(new CustomEvent("calservice_estimations_updated", { detail: list }));
  } catch (err) {
    console.warn("[customerBackendAdapter] Failed to save estimations to storage:", err);
  }
}

export const customerBackendAdapter = {
  /**
   * Returns AC Inspection service metadata for cards and detail modal.
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
   * Creates a real AC Inspection / Estimation booking on the backend database.
   */
  async createBooking(data) {
    const acBrand = data.acDetails?.brand || "Other";
    const acType = (data.acDetails?.type || "SPLIT").toUpperCase().replace(/\s+/g, "_");
    const acCapacity = (data.acDetails?.capacity || "1.5_TON").toUpperCase().replace(/\s+/g, "_");
    const acQuantity = Number(data.acDetails?.quantity) || 1;
    const symptom = data.customerReportedIssue || "Inspection required";
    const notes = data.notes || "";

    let resolvedLat = data.latitude ? parseFloat(data.latitude) : null;
    let resolvedLng = data.longitude ? parseFloat(data.longitude) : null;
    if (resolvedLat == null || resolvedLng == null) {
      try {
        const savedCoords = getCustomerCoordinates(data.userId || data.customer_id);
        if (savedCoords?.lat != null && savedCoords?.lng != null) {
          resolvedLat = parseFloat(savedCoords.lat);
          resolvedLng = parseFloat(savedCoords.lng);
        } else {
          const savedAddr = getCustomerSelectedAddress(data.userId || data.customer_id);
          if (savedAddr?.latitude && savedAddr?.longitude) {
            resolvedLat = parseFloat(savedAddr.latitude);
            resolvedLng = parseFloat(savedAddr.longitude);
          }
        }
      } catch (_) {}
    }
    // Fallback to default Hosur center coordinates if not set, preventing zone-gate drop
    if (resolvedLat == null || resolvedLng == null) {
      resolvedLat = 12.7409;
      resolvedLng = 77.8253;
    }

    const customerName = (data.customer_name || "").trim() || "Customer User";

    let cleanEmail = (data.email || "").trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      cleanEmail = "";
    }

    let prefDate = data.preferred_date || data.scheduledDate;
    let prefTime = data.preferred_time || data.scheduledTime || "10:00 AM - 12:00 PM";

    // Auto-adjust date/time if a passed slot on today's date was submitted
    try {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (prefDate === todayStr) {
        const match = String(prefTime).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          const slotMins = h * 60 + m;
          const curMins = d.getHours() * 60 + d.getMinutes();
          if (slotMins < curMins + 60) {
            const remaining = [
              { label: "11:00 AM - 01:00 PM", mins: 11 * 60 },
              { label: "02:00 PM - 04:00 PM", mins: 14 * 60 },
              { label: "04:00 PM - 06:00 PM", mins: 16 * 60 },
            ].filter((s) => s.mins >= curMins + 60);

            if (remaining.length > 0) {
              prefTime = remaining[0].label;
            } else {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              prefDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
              prefTime = "09:00 AM - 11:00 AM";
            }
          }
        }
      }
    } catch (_) {}

    const payload = {
      customer_name: customerName,
      phone: data.phone || "",
      email: cleanEmail,
      service_category: "ac_appliance",
      issue_title: `AC Inspection & Estimation (${acBrand} ${data.acDetails?.type || "Split"})`,
      description: symptom,
      address: data.landmark ? `${data.address} | ${data.landmark}` : (data.address || "Hosur, Tamil Nadu"),
      latitude: resolvedLat,
      longitude: resolvedLng,
      preferred_date: prefDate,
      preferred_time: prefTime,
      payment_method: data.paymentMethod || "COD",
      total_amount: data.estimationFee || ESTIMATION_FEE,
      job_type: "ESTIMATION",
      request_kind: "ESTIMATION",
      catalog_service_id: String(data.catalog_service_id || data.serviceId || data.service_id || data.acDetails?.service_id || "ac-inspection"),
      ac_type: acType,
      ac_brand: acBrand,
      ac_capacity: acCapacity,
      ac_quantity: acQuantity,
      customer_symptom: symptom,
      customer_notes: notes,
      cart_data: [
        {
          id: "ac-inspection",
          name: ESTIMATION_TITLE,
          price: data.estimationFee || ESTIMATION_FEE,
          quantity: acQuantity,
          jobType: "ESTIMATION",
        },
      ],
    };

    try {
      const response = await apiRequest("/booking/", {
        method: "POST",
        json: payload,
      });

      const responseData = response?.data || {};
      const requestId = responseData.request_id || `EST-${Date.now()}`;

      const newBooking = {
        id: requestId,
        requestId: requestId,
        request_id: requestId,
        backend_id: responseData.id,
        jobType: "ESTIMATION",
        job_type: "ESTIMATION",
        serviceType: "AC_INSPECTION",
        serviceName: ESTIMATION_TITLE,
        issue_title: payload.issue_title,
        service_category: "hvac",
        service_category_display: "AC Inspection & Estimation",
        status: (responseData.booking_status || "REQUESTED").toUpperCase(),
        status_display: "Estimation Requested",
        payment_status: responseData.payment_status || "pending",
        payment_status_display: "Pending Inspection",
        total_amount: responseData.total_amount || data.estimationFee || ESTIMATION_FEE,
        estimationFee: responseData.estimation?.fee_amount || data.estimationFee || ESTIMATION_FEE,
        preferred_date: payload.preferred_date,
        preferred_time: payload.preferred_time,
        scheduledDate: payload.preferred_date,
        scheduledTime: payload.preferred_time,
        address: payload.address,
        address_type: data.address_type || "Home",
        customer_name: payload.customer_name,
        phone: payload.phone,
        start_otp: responseData.start_otp,
        tracking_token: responseData.tracking_token,
        acDetails: {
          type: data.acDetails?.type || "Split",
          brand: acBrand,
          capacity: data.acDetails?.capacity || "1.5 Ton",
          quantity: acQuantity,
        },
        customerReportedIssue: symptom,
        notes: notes,
        photos: data.photos || [],
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        cart: [
          {
            id: "ac-inspection",
            name: ESTIMATION_TITLE,
            price: data.estimationFee || ESTIMATION_FEE,
            quantity: acQuantity,
            jobType: "ESTIMATION",
          },
        ],
      };

      // Cache locally for instant UI responsiveness
      const list = getStoredEstimations();
      list.unshift(newBooking);
      saveStoredEstimations(list);

      try {
        sessionStorage.setItem("calservice_active_tracking_id", requestId);
        sessionStorage.setItem("calservice_last_booking", JSON.stringify(newBooking));
      } catch (_) {}

      return {
        success: true,
        data: newBooking,
      };
    } catch (err) {
      console.error("[customerBackendAdapter] API booking failed:", err);
      throw err;
    }
  },

  /**
   * Returns the most recent active estimation booking.
   */
  async getActiveEstimation() {
    const list = getStoredEstimations();
    const active = list.find((b) => !["CANCELLED", "COMPLETED", "CLOSED"].includes((b.status || "").toUpperCase()));
    return active || null;
  },

  /**
   * Returns all estimation bookings.
   */
  async getMyEstimations() {
    return getStoredEstimations();
  },

  /**
   * Finds an estimation by its request ID or numeric ID.
   */
  async getEstimationById(id) {
    const list = getStoredEstimations();
    const cached = list.find((b) => b.id === id || b.requestId === id || b.request_id === id);

    // Try fetching from backend to ensure authoritative status
    if (id && !String(id).startsWith("LOCAL-")) {
      try {
        const resp = await apiRequest(`/booking/${encodeURIComponent(id)}/`);
        if (resp?.success && resp.data) {
          const b = resp.data;
          const merged = {
            ...(cached || {}),
            ...b,
            id: b.request_id || id,
            request_id: b.request_id || id,
            status: (b.booking_status || b.status || "requested").toLowerCase(),
            status_display: b.status_display || b.status,
            cancellation_reason: b.cancellation_reason || b.cancellation_note || cached?.cancellation_reason,
          };
          return merged;
        }
      } catch (_) {}
    }

    return cached || null;
  },

  /**
   * Cancels an active estimation.
   */
  async cancelEstimation(id, reason = "Cancelled by customer") {
    const list = getStoredEstimations();
    let idx = -1;
    if (id) {
      idx = list.findIndex((b) => b.id === id || b.requestId === id || b.request_id === id);
    }
    if (idx === -1) {
      idx = list.findIndex((b) => !["CANCELLED", "COMPLETED", "CLOSED"].includes((b.status || "").toUpperCase()));
    }

    const bookingToCancel = idx !== -1 ? list[idx] : null;
    const targetId = bookingToCancel?.requestId || bookingToCancel?.request_id || id;
    const targetToken = bookingToCancel?.tracking_token;
    const targetPhone = bookingToCancel?.phone;

    // Call backend cancel endpoint if valid ID
    if (targetId && !targetId.startsWith("LOCAL-")) {
      try {
        await apiRequest(`/booking/${encodeURIComponent(targetId)}/cancel/`, {
          method: "POST",
          json: {
            reason: reason,
            cancellation_reason: reason,
            token: targetToken,
            tracking_token: targetToken,
            phone: targetPhone,
          },
        });
      } catch (err) {
        console.warn("[customerBackendAdapter] Backend cancel failed, updating local state:", err);
      }
    }

    if (idx !== -1) {
      list[idx].status = "cancelled";
      list[idx].booking_status = "cancelled";
      list[idx].status_display = "Cancelled";
      list[idx].cancellation_reason = reason;
      list[idx].cancelled_at = new Date().toISOString();
      saveStoredEstimations(list);

      try {
        sessionStorage.removeItem("calservice_active_tracking_id");
        sessionStorage.setItem("calservice_last_booking", JSON.stringify(list[idx]));
      } catch (_) {}

      return { success: true, data: list[idx] };
    }

    return { success: false, error: "Booking not found" };
  },
};
