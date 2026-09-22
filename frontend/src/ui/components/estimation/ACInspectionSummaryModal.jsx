import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";

/**
 * ACInspectionSummaryModal.jsx
 *
 * Dedicated confirmation modal presented to the customer upon clicking "Confirm Booking".
 * Summarizes the AC Inspection specifications, customer-reported issue, scheduled slot,
 * service address, fee breakdown, and what to expect next.
 *
 * Provides two prominent actions:
 * 1. [ Cancel ] - closes modal to edit any details on the form.
 * 2. [ Confirm Booking ] - confirms the inspection request, saves to repository, and starts live tracking.
 */
export function ACInspectionSummaryModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  errorMsg = "",
  estimationAcDetails = {},
  estimationSymptom = "Not cooling",
  estimationNotes = "",
  photoPreview = null,
  formData = {},
  selectedDate = "",
  selectedTime = "",
  fee = 199,
  payMethod = "cash",
}) {
  if (!isOpen) return null;

  const brand = estimationAcDetails?.brand || "LG";
  const type = estimationAcDetails?.type || "Split";
  const capacity = estimationAcDetails?.capacity || "1.5 Ton";
  const quantity = Math.max(1, Number(estimationAcDetails?.quantity) || 1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                <Wrench size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    AC Inspection Summary
                  </h3>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    Estimation
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Review your inspection details before technician assignment
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-summary-modal"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-6 space-y-4 overflow-y-auto text-left text-xs">
            {/* 1. Appliance & Issue Box */}
            <div className="bg-indigo-50/40 border border-indigo-100/90 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {brand} {type} AC
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-2 mt-0.5">
                    <span>Capacity: <strong className="text-slate-800">{capacity}</strong></span>
                    <span>•</span>
                    <span>Quantity: <strong className="text-slate-800">{quantity} Unit{quantity > 1 ? "s" : ""}</strong></span>
                  </div>
                </div>
                {photoPreview && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-200 shrink-0">
                    <img src={photoPreview} alt="AC Issue" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-indigo-100/70 flex items-center gap-1.5 text-indigo-950 font-bold text-[11.5px]">
                <span className="text-indigo-600">Reported Symptom:</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-900 font-extrabold shadow-2xs">
                  {estimationSymptom || "Not cooling"}
                </span>
              </div>

              {estimationNotes && (
                <div className="text-[11px] text-slate-600 pt-1 flex items-start gap-1">
                  <FileText size={13} className="shrink-0 text-slate-400 mt-0.5" />
                  <span className="italic">"{estimationNotes}"</span>
                </div>
              )}
            </div>

            {/* 2. Schedule & Service Location */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                Service Schedule &amp; Location
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-slate-800">
                  <Calendar size={15} className="text-indigo-600 shrink-0" />
                  <span className="font-bold">Date:</span>
                  <span>{selectedDate || "Tomorrow"}</span>
                  <span className="text-slate-300">•</span>
                  <Clock size={15} className="text-indigo-600 shrink-0" />
                  <span className="font-bold">Slot:</span>
                  <span>{selectedTime || "10:00 AM"}</span>
                </div>

                <div className="flex items-start gap-2.5 text-slate-700">
                  <MapPin size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">
                      {formData.flat_house_no ? `${formData.flat_house_no}, ` : ""}
                      {formData.landmark ? `${formData.landmark}` : ""}
                    </span>
                    <span className="text-[11px] text-slate-600 leading-tight block">
                      {formData.address || "Hosur, Tamil Nadu"}
                    </span>
                  </div>
                </div>

                {formData.phone && (
                  <div className="flex items-center gap-2.5 text-slate-700 pt-0.5">
                    <Phone size={15} className="text-indigo-600 shrink-0" />
                    <span className="font-bold">Contact:</span>
                    <span className="font-semibold">+91 {formData.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Transparent Fee Breakdown */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Inspection &amp; Diagnosis Fee</span>
                <span className="font-bold text-slate-900">₹{fee}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Taxes &amp; Convenience Fee</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
              <div className="border-t border-slate-200/70 pt-2 flex justify-between items-baseline">
                <div>
                  <div className="text-xs font-black text-slate-900">Total Amount to Pay</div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Pay via Cash or UPI after technician inspection
                  </div>
                </div>
                <div className="text-lg font-black text-emerald-700">₹{fee}</div>
              </div>
            </div>

            {/* 4. What Happens Next Reassurance */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 space-y-1.5 text-emerald-950">
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-900">
                <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
                <span>Transparent 3-Step Process</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                1. Technician arrives &amp; diagnoses cooling, gas, and circuits.<br />
                2. You receive an itemized quotation before any repair work starts.<br />
                3. Repair is completed only after your explicit approval.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mx-4 mb-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 shrink-0">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer Actions with [ Cancel ] and [ Confirm Booking ] */}
          <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="btn-cancel-summary-modal"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs transition-all cursor-pointer shadow-2xs text-center disabled:opacity-50"
            >
              Cancel / Edit Details
            </button>

            <button
              type="button"
              id="btn-confirm-booking-from-modal"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1.3 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/25 text-center flex items-center justify-center gap-2 active:scale-[0.99] disabled:bg-slate-300"
            >
              {isSubmitting ? (
                <span>Confirming...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm Booking · ₹{fee}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
