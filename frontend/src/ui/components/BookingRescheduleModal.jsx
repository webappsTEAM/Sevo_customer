import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, X, Check, AlertCircle, RefreshCw, Sparkles, ShieldCheck } from "lucide-react"
import { apiRequest } from "../../api/client.js"

const PRESET_REASONS = [
  { id: "partner_wait", label: "Partner search taking too long" },
  { id: "schedule_change", label: "Change in schedule / plans" },
  { id: "prefer_slot", label: "Prefer a different date or time slot" },
  { id: "not_available", label: "I will not be available at current time" },
  { id: "other", label: "Other reason" },
]

const TIME_SLOTS = [
  { id: "07:00 AM - 08:00 AM", label: "07:00 AM – 08:00 AM", period: "Early Morning" },
  { id: "09:00 AM - 10:00 AM", label: "09:00 AM – 10:00 AM", period: "Morning" },
  { id: "11:00 AM - 12:00 PM", label: "11:00 AM – 12:00 PM", period: "Late Morning" },
  { id: "01:00 PM - 02:00 PM", label: "01:00 PM – 02:00 PM", period: "Afternoon" },
  { id: "04:00 PM - 05:00 PM", label: "04:00 PM – 05:00 PM", period: "Evening" },
  { id: "06:00 PM - 07:00 PM", label: "06:00 PM – 07:00 PM", period: "Night" },
]

export function BookingRescheduleModal({
  bookingId,
  currentDate = "",
  currentTimeSlot = "",
  onClose,
  onRescheduled,
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to tomorrow
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  })
  const [selectedSlot, setSelectedSlot] = useState(currentTimeSlot || "09:00 AM - 10:00 AM")
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0].id)
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Generate next 7 days for quick date selection
  const upcomingDays = useMemo(() => {
    const days = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" })
      const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      days.push({ dateStr, dayName, formatted })
    }
    return days
  }, [])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!selectedDate) {
      setErrorMsg("Please select a new date.")
      return
    }
    if (!selectedSlot) {
      setErrorMsg("Please select a time slot.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")

    const payload = {
      booking_id: bookingId,
      new_date: selectedDate,
      new_time_slot: selectedSlot,
      reason: selectedReason,
      additional_notes: additionalNotes.trim(),
    }

    try {
      let res
      try {
        res = await apiRequest("/customer/reschedules/create/", { method: "POST", json: payload })
      } catch (err1) {
        res = await apiRequest("/booking/reschedule/", { method: "POST", json: payload })
      }

      if (res?.success || res?.status === "success" || res?.data) {
        setSuccessMsg("Booking rescheduled successfully!")
        
        // Update local saved booking cache if present
        try {
          const raw = sessionStorage.getItem("calservice_last_booking")
          if (raw) {
            const parsed = JSON.parse(raw)
            parsed.preferred_date = selectedDate
            parsed.preferred_time = selectedSlot
            parsed.status = "rescheduled"
            sessionStorage.setItem("calservice_last_booking", JSON.stringify(parsed))
          }
        } catch (_) {}

        setTimeout(() => {
          if (typeof onRescheduled === "function") {
            onRescheduled({
              new_date: selectedDate,
              new_time_slot: selectedSlot,
              reason: selectedReason,
              notes: additionalNotes,
            })
          }
          if (typeof onClose === "function") onClose()
        }, 1200)
      } else {
        setErrorMsg(res?.error?.message || res?.message || "Failed to reschedule booking. Please try again.")
      }
    } catch (err) {
      const msg = err?.body?.error?.message || err?.body?.message || err?.message || "Error submitting reschedule."
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col p-6 md:p-8"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer transition-colors z-20"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <RefreshCw className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">Reschedule Booking</h3>
            <p className="text-xs text-slate-500 font-medium">
              Booking #{bookingId || "—"} • Pick a new date and convenient time slot
            </p>
          </div>
        </div>

        {/* Current Schedule Summary */}
        {(currentDate || currentTimeSlot) && (
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Current Schedule</span>
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {currentDate || "Not scheduled"} {currentTimeSlot ? `• ${currentTimeSlot}` : ""}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
              Rescheduling
            </span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Date Chips */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Select New Date
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 mb-2.5">
              {upcomingDays.slice(0, 4).map((d) => {
                const isSelected = selectedDate === d.dateStr
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black"
                        : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wide opacity-90">{d.dayName}</div>
                    <div className="text-xs font-bold mt-0.5">{d.formatted}</div>
                  </button>
                )
              })}
            </div>
            {/* Custom Date Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Or pick a specific date:</span>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Time Slot Selection */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
              Select Time Slot
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-medium"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold">{slot.label}</div>
                      <div className="text-[10px] text-slate-500">{slot.period}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reason for Rescheduling */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
              Reason for Rescheduling
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {PRESET_REASONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Please arrange for evening after 5 PM"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Free Reschedule Policy Note */}
          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>100% Free Reschedule:</strong> You can reschedule your booking anytime without cancellation charges.</span>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Keep Current Time
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Reschedule
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
export default BookingRescheduleModal
