import { useState, useCallback } from "react";
import { createBooking } from "../services/bookingService.js";
import { validateBookingForm } from "../utils/bookingValidation.js";

export function useBooking() {
  const [bookingData, setBookingData] = useState({
    serviceId: null,
    address: null,
    scheduledDate: null,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = useCallback((field, value) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const submitBooking = useCallback(async () => {
    const { isValid, errors } = validateBookingForm(bookingData);
    if (!isValid) {
      setError(errors);
      return { success: false, errors };
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createBooking(bookingData);
      setLoading(false);
      return { success: true, data: res };
    } catch (err) {
      setLoading(false);
      setError(err?.body?.detail || "Booking failed");
      return { success: false, error: err };
    }
  }, [bookingData]);

  return {
    bookingData,
    updateField,
    submitBooking,
    loading,
    error,
  };
}
