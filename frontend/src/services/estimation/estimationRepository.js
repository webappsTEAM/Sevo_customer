/**
 * estimationRepository.js
 * Clean Repository abstraction for AC Inspection / Estimation.
 *
 * In Phase 1, delegates to mockEstimationAdapter.
 * In Phase 2, this will delegate to CustomerBackendAdapter (REST / WebSocket)
 * without requiring any modifications to UI components.
 */

import { customerBackendAdapter } from "./customerBackendAdapter.js";
import { mockEstimationAdapter } from "./mockEstimationAdapter.js";

class EstimationRepository {
  constructor(adapter = customerBackendAdapter) {
    this.adapter = adapter;
  }

  /**
   * Set or switch adapter dynamically (e.g. For Phase 2 or tests).
   */
  setAdapter(newAdapter) {
    this.adapter = newAdapter;
  }

  /**
   * Returns the AC Inspection service definition for cards and listings.
   */
  async getEstimationService() {
    return this.adapter.fetchEstimationService();
  }

  /**
   * Returns complete estimation details (checklist, technician checks, workflow).
   */
  async getEstimationDetails() {
    return this.adapter.fetchEstimationService();
  }

  /**
   * Creates a new estimation booking.
   * @param {Object} bookingData - Details of AC, symptom, notes, address, slot.
   */
  async createEstimationBooking(bookingData) {
    return this.adapter.createBooking(bookingData);
  }

  /**
   * Retrieves a specific estimation by its request ID.
   */
  async getEstimationBooking(requestId) {
    return this.adapter.getEstimationById(requestId);
  }

  /**
   * Retrieves all estimation bookings belonging to the customer.
   */
  async getMyEstimationBookings() {
    return this.adapter.getMyEstimations();
  }

  /**
   * Generic finder by ID.
   */
  async getBookingById(id) {
    return this.adapter.getEstimationById(id);
  }

  /**
   * Cancels an estimation selection / draft.
   */
  async cancelEstimationSelection() {
    return { success: true };
  }

  /**
   * Cancels an active estimation booking.
   */
  async cancelEstimationBooking(requestId, reason = "Cancelled by customer") {
    return this.adapter.cancelEstimation(requestId, reason);
  }

  /**
   * Synchronously cancels an active estimation booking.
   */
  cancelEstimationBookingSync(requestId, reason = "Cancelled by customer") {
    if (typeof this.adapter.cancelEstimation === "function") {
      return this.adapter.cancelEstimation(requestId, reason);
    }
    return { success: true };
  }

  /**
   * Returns the current status of an estimation.
   */
  async getEstimationStatus(requestId) {
    const booking = await this.adapter.getEstimationById(requestId);
    return booking ? booking.status : null;
  }

  /**
   * Checks whether the customer currently has an active, non-terminal estimation.
   */
  async hasActiveEstimation() {
    const active = await this.adapter.getActiveEstimation();
    return Boolean(active);
  }

  /**
   * Synchronous check for fast render of UI states.
   */
  hasActiveEstimationSync() {
    try {
      const raw = localStorage.getItem("calservice_mock_estimations") || sessionStorage.getItem("calservice_mock_estimations");
      if (!raw) return false;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return false;
      return list.some((b) => !["CANCELLED", "COMPLETED", "CLOSED"].includes((b.status || "").toUpperCase()));
    } catch (_) {
      return false;
    }
  }

  /**
   * Synchronous getter for the active estimation.
   */
  getActiveEstimationSync() {
    try {
      const raw = localStorage.getItem("calservice_mock_estimations") || sessionStorage.getItem("calservice_mock_estimations");
      if (!raw) return null;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return null;
      return list.find((b) => !["CANCELLED", "COMPLETED", "CLOSED"].includes((b.status || "").toUpperCase())) || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Synchronous getter for all estimation bookings.
   */
  getMyEstimationsSync() {
    try {
      const raw = localStorage.getItem("calservice_mock_estimations") || sessionStorage.getItem("calservice_mock_estimations");
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Returns the active estimation booking.
   */
  async getActiveEstimation() {
    return this.adapter.getActiveEstimation();
  }

  /**
   * Listen for updates to estimations.
   */
  subscribeToEstimations(callback) {
    const handler = (e) => callback(e.detail);
    window.addEventListener("calservice_estimations_updated", handler);
    return () => window.removeEventListener("calservice_estimations_updated", handler);
  }
}

export const estimationRepository = new EstimationRepository();
