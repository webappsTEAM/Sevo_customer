import React, { useState, useMemo, useEffect } from "react";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  ShieldCheck,
  MapPin,
  Phone,
  User,
  Mail,
  Calendar,
  Clock,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { routes } from "../routes.js";
import { useAuth } from "../../state/auth/useAuth.js";
import { extractApiErrorMessage } from "../../api/client.js";
import { getCustomerSelectedAddress, getCustomerCoordinates } from "../../utils/customerLocationStorage.js";
import { estimationRepository } from "../../services/estimation/estimationRepository.js";
import {
  ESTIMATION_FEE,
  ESTIMATION_TITLE,
  ESTIMATION_SUBTITLE,
  ESTIMATION_DESCRIPTION,
} from "../../services/estimation/estimationConfig.js";
import { ACDetailsForm } from "../components/estimation/ACDetailsForm.jsx";
import { ACInspectionSummaryModal } from "../components/estimation/ACInspectionSummaryModal.jsx";

function todayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
  return d.toISOString().slice(0, 10);
}

const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
];

function parseSlotMinutes(slot) {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour * 60 + min;
}

function getAvailableSlots(dateStr) {
  const isToday = dateStr === todayDateString();
  if (!isToday) return TIME_SLOTS;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return TIME_SLOTS.filter((slot) => {
    const slotMinutes = parseSlotMinutes(slot);
    return slotMinutes >= currentMinutes + 60;
  });
}

function getDefaultBookingDateTime() {
  const todayStr = todayDateString();
  const todaySlots = getAvailableSlots(todayStr);
  if (todaySlots.length > 0) {
    return { date: todayStr, time: todaySlots[0] };
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: TIME_SLOTS[0] };
}

/**
 * ACInspectionBookingPage.jsx
 *
 * Connects the previously-orphaned AC Inspection / Estimation UI
 * (ACDetailsForm, ACInspectionSummaryModal, estimationRepository ->
 * customerBackendAdapter) into a real, reachable booking flow. Creates
 * a genuine ServiceRequest with job_type=ESTIMATION on the backend via
 * POST /api/booking/, then hands off to the status/tracking page.
 */
export function ACInspectionBookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth?.() || {};

  const [acDetails, setAcDetails] = useState({ type: "Split", brand: "LG", capacity: "1.5 Ton", quantity: 1 });
  const [customerReportedIssue, setCustomerReportedIssue] = useState("Not cooling");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [contact, setContact] = useState({
    name: user?.name || user?.username || "",
    name: user?.name || user?.full_name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState(null);

  const defaultDateTime = useMemo(() => getDefaultBookingDateTime(), []);
  const [selectedDate, setSelectedDate] = useState(defaultDateTime.date);
  const [selectedTime, setSelectedTime] = useState(defaultDateTime.time);

  const availableSlots = useMemo(() => getAvailableSlots(selectedDate), [selectedDate]);

  function handleDateChange(newDate) {
    setSelectedDate(newDate);
    const slots = getAvailableSlots(newDate);
    if (!slots.includes(selectedTime)) {
      setSelectedTime(slots[0] || TIME_SLOTS[0]);
    }
  }

  useEffect(() => {
    try {
      const savedAddr = getCustomerSelectedAddress(user?.id);
      if (savedAddr) {
        if (!address) {
          setAddress(savedAddr.formatted_address || savedAddr.address_line1 || savedAddr.address || "");
        }
        if (!landmark && savedAddr.landmark) {
          setLandmark(savedAddr.landmark);
        }
        if (savedAddr.latitude && savedAddr.longitude) {
          setCoords({ lat: parseFloat(savedAddr.latitude), lng: parseFloat(savedAddr.longitude) });
        }
      } else {
        const savedCoords = getCustomerCoordinates(user?.id);
        if (savedCoords?.lat != null && savedCoords?.lng != null) {
          setCoords({ lat: parseFloat(savedCoords.lat), lng: parseFloat(savedCoords.lng) });
        }
      }
    } catch (_) {}
  }, [user?.id]);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);

  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formData = useMemo(
    () => ({ phone: contact.phone, address, landmark, flat_house_no: "" }),
    [contact.phone, address, landmark]
  );

  const trimmedEmail = contact.email.trim();
  const isEmailValid = !trimmedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isSlotValid = availableSlots.length > 0 && availableSlots.includes(selectedTime);

  const canReview =
    contact.name.trim().length > 1 &&
    /^\d{10}$/.test(contact.phone.trim()) &&
    address.trim().length > 4 &&
    isEmailValid &&
    isSlotValid;
  const canReview =
    contact.name.trim().length > 1 &&
    /^\d{10}$/.test(contact.phone.trim()) &&
    address.trim().length > 4;

  function handlePhotoChange(file) {
    setPhotoFile(file);
    try {
      setPhotoPreview(URL.createObjectURL(file));
    } catch (_) {
      setPhotoPreview(null);
    }
  }

  async function handleConfirmBooking() {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const validEmail = isEmailValid ? trimmedEmail : "";
      const result = await estimationRepository.createEstimationBooking({
        userId: user?.id,
        customer_name: contact.name,
        phone: contact.phone,
        email: validEmail,
        address: address || "Hosur Center",
        landmark,
        latitude: coords?.lat != null ? coords.lat : 12.7409,
        longitude: coords?.lng != null ? coords.lng : 77.8253,
      const result = await estimationRepository.createEstimationBooking({
        customer_name: contact.name,
        phone: contact.phone,
        email: contact.email,
        address,
        landmark,
        preferred_date: selectedDate,
        preferred_time: selectedTime,
        paymentMethod: "COD",
        acDetails,
        customerReportedIssue,
        notes,
        photos: photoFile ? [photoFile] : [],
        estimationFee: ESTIMATION_FEE,
      });

      if (result?.success && result?.data) {
        const bookingId = result.data.requestId || result.data.request_id || result.data.id;
        setShowSummary(false);
        navigate(`/ac-inspection/status/${encodeURIComponent(bookingId)}`, { replace: true });
      } else {
        setErrorMsg("Could not create your inspection booking. Please try again.");
      }
    } catch (err) {
      console.error("[ACInspectionBookingPage] createEstimationBooking failed:", err, "Response body:", err?.body);
      const serverMsg = extractApiErrorMessage(err, "Something went wrong while booking your inspection. Please try again.");
      setErrorMsg(serverMsg);
      console.error("[ACInspectionBookingPage] createEstimationBooking failed:", err);
      const serverMsg =
        err?.body?.message || err?.body?.detail || (typeof err?.body === "string" ? err.body : null);
      setErrorMsg(serverMsg || "Something went wrong while booking your inspection. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleProceedToCommonCheckout() {
    const inspectionCartId = "serv-hvac-ac-inspection";
    const qty = Math.max(1, Number(acDetails.quantity) || 1);
    const itemDesc = `${acDetails.type} (${acDetails.brand}) • ${qty} Unit${qty > 1 ? 's' : ''}`;

    const inspectionCartItem = {
      id: inspectionCartId,
      db_id: inspectionCartId,
      name: "AC Inspection & Diagnostic",
      price: ESTIMATION_FEE || 199,
      quantity: qty,
      duration: "45 mins",
      ac_brand: acDetails.brand,
      ac_type: (acDetails.type || "").toUpperCase().includes("WINDOW") ? "WINDOW" : "SPLIT",
      ac_type_label: acDetails.type || "Split AC",
      ac_capacity: acDetails.capacity || "1.5_TON",
      ac_quantity: qty,
      customer_symptom: customerReportedIssue || notes || "AC Inspection requested",
      ac_notes: notes || "",
      ac_images: photoPreview ? [photoPreview] : [],
      primaryFile: photoFile,
      primaryPreview: photoPreview,
      description: itemDesc,
      categoryName: "AC & Appliances",
      category_id: "acappliance",
      categorySlug: "acappliance",
      jobType: "ESTIMATION",
    };

    try {
      localStorage.setItem("calservices_customer_cart", JSON.stringify([inspectionCartItem]));
      window.dispatchEvent(new CustomEvent("calservices_cart_updated"));
    } catch (_) {}

    navigate(routes.booking_checkout, {
      state: {
        category: { id: "acappliance", name: "AC & Appliances", slug: "acappliance" },
        cart: [inspectionCartItem],
        jobType: "ESTIMATION",
        address: address || undefined,
        latitude: coords?.lat || undefined,
        longitude: coords?.lng || undefined,
        landmark: landmark || undefined,
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-28 sm:py-10">
        {/* Back + Header */}
        <button
          type="button"
          onClick={() => navigate(routes.landing)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Home
        </button>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 mb-5 flex items-start gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Wrench size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{ESTIMATION_TITLE}</h1>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                {ESTIMATION_SUBTITLE}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">{ESTIMATION_DESCRIPTION}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Inspection Fee</div>
            <div className="text-lg font-black text-emerald-700">₹{ESTIMATION_FEE}</div>
          </div>
        </div>

        {/* Step 1: AC Details */}
        <ACDetailsForm
          acDetails={acDetails}
          onChangeAcDetails={setAcDetails}
          customerReportedIssue={customerReportedIssue}
          onChangeSymptom={setCustomerReportedIssue}
          notes={notes}
          onChangeNotes={setNotes}
          photoFile={photoFile}
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
        />

        {/* Quick Transition to Common Services Booking Checkout */}
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <MapPin size={16} />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-900">
                Want to book via the Common Services Workflow?
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                Use your saved addresses, interactive GPS map picker, and standard slots.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleProceedToCommonCheckout}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1 shrink-0"
          >
            <span>Continue to Checkout</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Step 2: Contact & Address */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 mt-5 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Contact &amp; Address</h4>
                <p className="text-[11px] text-slate-500 font-medium">Where should the technician visit?</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-full shrink-0">
              Step 2 of 3
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                <User size={11} className="inline -mt-0.5 mr-1" /> Full Name
              </label>
              <input
                type="text"
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                placeholder="Your name"
                className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                <Phone size={11} className="inline -mt-0.5 mr-1" /> Phone Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value.replace(/\D/g, "") }))}
                placeholder="10-digit mobile number"
                className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                <Mail size={11} className="inline -mt-0.5 mr-1" /> Email (Optional)
              </label>
              {!isEmailValid && (
                <span className="text-[10px] font-bold text-rose-600">Please enter a valid email or leave blank</span>
              )}
            </div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
              <Mail size={11} className="inline -mt-0.5 mr-1" /> Email (Optional)
            </label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              placeholder="you@example.com (optional)"
              className={`w-full h-11 bg-slate-50 border ${!isEmailValid ? "border-rose-400 focus:border-rose-500" : "border-slate-200/90 focus:border-emerald-500"} rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white transition-all`}
              placeholder="you@example.com"
              className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
              Full Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / Flat No, Street, Area, City"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near City Hospital"
              className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                <Calendar size={11} className="inline -mt-0.5 mr-1" /> Preferred Date
              </label>
              <input
                type="date"
                min={todayDateString()}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                <Clock size={11} className="inline -mt-0.5 mr-1" /> Preferred Slot
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No slots available today
                  </option>
                )}
              </select>
            </div>
          </div>
          {availableSlots.length === 0 && (
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-2 mt-2">
              All technician visit slots for today have closed. Please select tomorrow or a later date above.
            </p>
          )}
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="mt-6 flex items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
            <span>Pay only the ₹{ESTIMATION_FEE} inspection fee. No surprise charges.</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleProceedToCommonCheckout}
              className="flex-1 sm:flex-initial py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Common Checkout</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              disabled={!canReview}
              onClick={() => {
                setErrorMsg("");
                setShowSummary(true);
              }}
              className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/25"
            >
              Review Booking
            </button>
          </div>
          <button
            type="button"
            disabled={!canReview}
            onClick={() => setShowSummary(true)}
            className="shrink-0 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/25"
          >
            Review Booking
          </button>
        </div>
      </div>

      <ACInspectionSummaryModal
        isOpen={showSummary}
        onClose={() => {
          setErrorMsg("");
          setShowSummary(false);
        }}
        onConfirm={handleConfirmBooking}
        isSubmitting={isSubmitting}
        errorMsg={errorMsg}
        onClose={() => setShowSummary(false)}
        onConfirm={handleConfirmBooking}
        isSubmitting={isSubmitting}
        estimationAcDetails={acDetails}
        estimationSymptom={customerReportedIssue}
        estimationNotes={notes}
        photoPreview={photoPreview}
        formData={formData}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        fee={ESTIMATION_FEE}
        payMethod="cash"
      />

      {isSubmitting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20">
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xl flex items-center gap-3 text-xs font-bold text-slate-700">
            <Loader2 size={16} className="animate-spin text-emerald-600" />
            Booking your inspection...
          </div>
        </div>
      )}
    </div>
  );
}

export default ACInspectionBookingPage;
