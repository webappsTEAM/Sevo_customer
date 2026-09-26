import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wrench,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Tag,
  Calendar,
  Clock,
  AlertTriangle,
  Eye,
  X,
  Check,
  FileText,
  Camera,
  CreditCard,
  Banknote,
} from "lucide-react";

import { routes } from "../routes.js";
import { apiRequest } from "../../api/client.js";
import { EstimationTimeline } from "../components/estimation/EstimationTimeline.jsx";

const REJECT_REASONS = [
  { value: "PRICE_TOO_HIGH", label: "Price is too high" },
  { value: "WILL_DO_LATER", label: "I'll get it done later" },
  { value: "FOUND_ALTERNATIVE", label: "Found another provider" },
  { value: "OTHER", label: "Other" },
];

/**
 * ACInspectionStatusPage.jsx
 *
 * Implements the authoritative AC Inspection → Estimation → Vendor Review →
 * Customer Approval/Rejection → Repair Authorization workflow.
 *
 * Enforces strict business flow:
 * - Customer cannot decide on draft or unapproved quotes.
 * - Customer can only approve/reject when status = SENT / ADMIN_APPROVED.
 * - Quotation displays full AC details, findings, diagnosis, recommended repair, notes, photos.
 * - Rejection guarantees ₹0 repair charge (only inspection fee applies) and NO repair job.
 * - Approval authorizes repair under the same booking and notifies technician.
 */
export function ACInspectionStatusPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [estimation, setEstimation] = useState(null);
  const [quotationData, setQuotationData] = useState(null);
  const [rateCardSnapshot, setRateCardSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Modals & Panels
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("PRICE_TOO_HIGH");
  const [rejectNote, setRejectNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH_ON_SERVICE"); // "CASH_ON_SERVICE" | "ONLINE"
  const [selectedPhoto, setSelectedPhoto] = useState(null); // Lightbox preview

  const [decisionMade, setDecisionMade] = useState(null); // "APPROVED" | "REJECTED"
  const [showRateCard, setShowRateCard] = useState(false);
  const [selectedRateCategory, setSelectedRateCategory] = useState("ALL");

  const load = useCallback(async () => {
    setError("");
    try {
      const [bookingResp, estimationResp, quotationResp, rateCardResp] = await Promise.all([
        apiRequest(`/booking/${encodeURIComponent(id)}/`),
        apiRequest(`/booking/${encodeURIComponent(id)}/estimation/`).catch(() => null),
        apiRequest(`/booking/${encodeURIComponent(id)}/quotation/`).catch(() => null),
        apiRequest(`/booking/${encodeURIComponent(id)}/inspection-rate-card/`).catch(() => null),
      ]);

      if (bookingResp?.success) setBooking(bookingResp.data);
      if (estimationResp?.success) setEstimation(estimationResp.data);
      if (quotationResp?.success) setQuotationData(quotationResp.data);

      if (rateCardResp?.success) {
        setRateCardSnapshot(rateCardResp.data);
      } else if (bookingResp?.data?.customer_inspection) {
        setRateCardSnapshot(bookingResp.data.customer_inspection);
      }

      if (!bookingResp?.success) {
        setError(bookingResp?.message || "Could not load this booking.");
      }
    } catch (err) {
      console.error("[ACInspectionStatusPage] load failed:", err);
      setError(err?.body?.message || "Could not load this booking. Please check the link and try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Authoritative quotation resolution
  const quotation = quotationData || estimation?.active_quotation || null;
  const inspectionReport = quotationData?.inspection_report || estimation?.inspection || null;
  const acDetails = quotationData?.ac_details || {
    ac_brand: estimation?.ac_brand || "",
    ac_type: estimation?.ac_type || "",
    ac_capacity: estimation?.ac_capacity || "",
    ac_quantity: estimation?.ac_quantity || 1,
    customer_symptom: estimation?.customer_symptom || "",
    customer_notes: estimation?.customer_notes || "",
  };

  const isApproved =
    quotation?.status === "APPROVED" ||
    quotation?.status === "CUSTOMER_APPROVED" ||
    booking?.status === "customer_approved" ||
    estimation?.status === "REPAIR_AUTHORIZED" ||
    quotationData?.repair_authorized ||
    decisionMade === "APPROVED";

  const isRejected =
    quotation?.status === "REJECTED" ||
    quotation?.status === "CUSTOMER_REJECTED" ||
    booking?.status === "customer_rejected" ||
    booking?.status === "estimation_closed" ||
    estimation?.status === "CUSTOMER_REJECTED" ||
    estimation?.status === "ESTIMATION_CLOSED" ||
    decisionMade === "REJECTED";

  // Strict status gating: Customer can ONLY decide when Vendor Admin has approved & sent
  const canDecide =
    quotation &&
    !isApproved &&
    !isRejected &&
    (quotation.status === "SENT" ||
      quotation.status === "ADMIN_APPROVED" ||
      quotation.status === "SENT_TO_CUSTOMER");

  const isUnderVendorReview =
    quotation &&
    !isApproved &&
    !isRejected &&
    (quotation.status === "SUBMITTED_FOR_REVIEW" || quotation.status === "DRAFT");

  const diagnosticFeeAmount =
    quotationData?.pricing_summary?.inspection_fee ||
    rateCardSnapshot?.diagnostic_fee ||
    estimation?.fee?.amount ||
    199;

  const isDiagnosticFeePaid =
    quotationData?.inspection_fee?.is_paid ||
    booking?.payment_status === "paid" ||
    booking?.payment_status === "collected" ||
    estimation?.fee?.status === "PAID" ||
    estimation?.fee?.status === "COLLECTED";

  async function handleApprove() {
    setActionLoading(true);
    setActionError("");
    try {
      const resp = await apiRequest(`/booking/${encodeURIComponent(id)}/quotation/approve/`, {
        method: "POST",
        json: {
          quotation_id: quotation.id,
          payment_mode: paymentMode,
          authorize_repair: true,
        },
      });
      if (resp?.success) {
        setDecisionMade("APPROVED");
        setShowApproveModal(false);
        await load();
      } else {
        setActionError(resp?.message || "Could not approve the quotation.");
      }
    } catch (err) {
      setActionError(err?.body?.message || "Could not approve the quotation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    setActionLoading(true);
    setActionError("");
    try {
      const resp = await apiRequest(`/booking/${encodeURIComponent(id)}/quotation/reject/`, {
        method: "POST",
        json: {
          quotation_id: quotation.id,
          reason_code: rejectReason,
          reason_note: rejectNote,
        },
      });
      if (resp?.success) {
        setDecisionMade("REJECTED");
        setShowRejectModal(false);
        await load();
      } else {
        setActionError(resp?.message || "Could not reject the quotation.");
      }
    } catch (err) {
      setActionError(err?.body?.message || "Could not reject the quotation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <Loader2 size={18} className="animate-spin text-emerald-600" />
          Loading your inspection report &amp; quotation...
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-6 text-center space-y-4 shadow-sm">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h2 className="text-base font-black text-slate-900">Booking Error</h2>
          <p className="text-xs font-semibold text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => navigate(routes.landing)}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const technicianName = inspectionReport?.technician_name || null;
  const currentStatus = estimation?.status || booking?.status || "REQUESTED";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Navigation & Header */}
        <div>
          <button
            type="button"
            onClick={() => navigate(routes.landing)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
                <Wrench size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    AC Inspection &amp; Estimate
                  </h1>
                  <span className="text-xs font-bold text-slate-400">
                    #{booking?.request_id || id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                  {booking?.address || "Address confirmed on booking"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={load}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer shrink-0"
              title="Refresh status"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Global Lifecycle Timeline */}
        <EstimationTimeline currentStatus={currentStatus} technicianName={technicianName} />

        {/* Banner: Under Vendor Admin Review */}
        {isUnderVendorReview && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={18} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Estimate Under Vendor Review
                </span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                  Pending Verification
                </span>
              </div>
              <p className="text-xs text-amber-900/90 font-medium leading-relaxed">
                The technician has inspected your AC and submitted an estimation to the service manager.
                Our quality and rate-compliance team is currently reviewing the quotation. Once approved,
                you will be able to review the detailed breakdown and decide.
              </p>
            </div>
          </div>
        )}

        {/* Decision Banner: Customer Approved */}
        {isApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Quotation Approved · Repair Authorized
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                  REPAIR_AUTHORIZED
                </span>
              </div>
              <p className="text-xs text-emerald-900/90 font-medium leading-relaxed">
                You have approved the repair estimate. The technician is authorized to proceed with the
                recommended repairs, genuine replacement parts, and final testing.
              </p>
              <div className="pt-1 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                <Check size={13} /> Diagnostic fee of ₹{diagnosticFeeAmount} credited against repair.
              </div>
            </div>
          </div>
        )}

        {/* Decision Banner: Customer Rejected */}
        {isRejected && (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <XCircle size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Quotation Rejected · Inspection Only Closed
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-800 font-black px-2 py-0.5 rounded-full">
                  NO_REPAIR_AUTHORIZED
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                You declined the repair estimate. No repair work will proceed, and no repair job has been
                authorized. The inspection process is now closed.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
                <span>
                  Inspection Fee: <strong className="text-slate-900">₹{diagnosticFeeAmount}</strong>
                  {isDiagnosticFeePaid ? " (Collected)" : " (Payable)"}
                </span>
                <span>
                  Repair Charge: <strong className="text-emerald-700">₹0.00</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AC Inspection Report Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider mb-1">
                <FileText size={12} />
                Inspection Report
              </div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                AC Diagnostic &amp; Inspection Findings
              </h2>
            </div>
            {technicianName && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Inspected By
                </span>
                <span className="text-xs font-black text-slate-800">{technicianName}</span>
              </div>
            )}
          </div>

          {/* AC Details Grid */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
              AC Unit Details
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Brand</span>
                <span className="text-xs font-black text-slate-800">
                  {acDetails.ac_brand || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Type</span>
                <span className="text-xs font-black text-slate-800">
                  {acDetails.ac_type || "Split AC"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Capacity</span>
                <span className="text-xs font-black text-slate-800">
                  {acDetails.ac_capacity || "1.5 Ton"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Quantity</span>
                <span className="text-xs font-black text-slate-800">
                  {acDetails.ac_quantity || 1} Unit(s)
                </span>
              </div>
            </div>

            {acDetails.customer_symptom && (
              <div className="mt-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Reported Issue / Symptom:
                </span>
                <p className="text-slate-700 font-medium">{acDetails.customer_symptom}</p>
              </div>
            )}
          </div>

          {/* Technician Diagnosis & Recommended Repair */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Technician Diagnosis &amp; Recommended Action
            </span>
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-2">
              <div className="text-xs font-black text-slate-900 leading-snug">
                {inspectionReport?.diagnosis ||
                  estimation?.customer_symptom ||
                  "Comprehensive multi-point inspection and diagnostics completed."}
              </div>
              {inspectionReport?.notes && (
                <p className="text-xs text-slate-600 font-medium italic border-t border-emerald-100/60 pt-2">
                  &ldquo;{inspectionReport.notes}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Detailed Inspection Findings List */}
          {inspectionReport?.findings && inspectionReport.findings.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Specific Findings ({inspectionReport.findings.length})
              </span>
              <div className="space-y-2">
                {inspectionReport.findings.map((f, idx) => {
                  const severityColors = {
                    CRITICAL: "bg-rose-50 text-rose-700 border-rose-200",
                    HIGH: "bg-orange-50 text-orange-700 border-orange-200",
                    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
                    LOW: "bg-blue-50 text-blue-700 border-blue-200",
                  };
                  const color = severityColors[f.severity] || severityColors.MEDIUM;

                  return (
                    <div
                      key={f.id || idx}
                      className="border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {f.title || f.finding_type || "Component Issue"}
                          </span>
                          {f.finding_type && (
                            <span className="text-[10px] text-slate-400 font-bold">
                              • {f.finding_type}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${color}`}
                        >
                          {f.severity || "MEDIUM"}
                        </span>
                      </div>

                      {f.description && (
                        <p className="text-xs text-slate-600 font-medium">{f.description}</p>
                      )}

                      {f.recommended_action && (
                        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/60 px-2.5 py-1 rounded-lg">
                          Recommended Action: {f.recommended_action}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Evidence / Photos */}
          {inspectionReport?.photos && inspectionReport.photos.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Camera size={13} /> Visual Evidence &amp; Photos ({inspectionReport.photos.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {inspectionReport.photos.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    onClick={() => setSelectedPhoto(p)}
                    className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer aspect-4/3 flex flex-col justify-end"
                  >
                    <img
                      src={p.photo}
                      alt={p.caption || `Inspection evidence ${idx + 1}`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative p-2 z-10 text-[10px] font-bold text-white line-clamp-1 bg-black/40 backdrop-blur-xs">
                      {p.caption || "Inspection photo"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Authoritative Quotation Card */}
        {quotation && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5">
                  Official Estimation
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Quotation {quotation.quote_ref}
                </h3>
                {quotation.valid_until && (
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <Calendar size={12} /> Valid until {quotation.valid_until}
                  </p>
                )}
              </div>

              <span
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full self-start sm:self-auto border ${
                  isApproved
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : isRejected
                    ? "text-slate-700 bg-slate-100 border-slate-300"
                    : canDecide
                    ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}
              >
                {isApproved
                  ? "CUSTOMER_APPROVED"
                  : isRejected
                  ? "CUSTOMER_REJECTED"
                  : quotation.status === "ADMIN_APPROVED" || quotation.status === "SENT"
                  ? "AWAITING YOUR APPROVAL"
                  : quotation.status}
              </span>
            </div>

            {/* Line Items Table (Read-Only: Customer cannot modify pricing) */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Repair Scope &amp; Parts Breakdown
              </span>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                {(quotation.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="font-black text-slate-900">
                        {item.item_name_snapshot || item.service_name}
                      </div>
                      {item.category_name_snapshot && (
                        <span className="inline-block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {item.category_name_snapshot}
                        </span>
                      )}
                      {item.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                      )}
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Qty: {item.quantity} {item.unit || "unit"} × ₹
                        {item.unit_price_snapshot || item.unit_price}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 text-sm">
                        ₹{item.line_total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Parts &amp; Labor)</span>
                <span className="font-bold text-slate-800">₹{quotation.subtotal}</span>
              </div>

              {Number(quotation.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Applicable Taxes / GST</span>
                  <span className="font-bold text-slate-800">₹{quotation.tax_amount}</span>
                </div>
              )}

              {Number(quotation.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-bold">-₹{quotation.discount_amount}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-2">
                <div>
                  <span>Diagnostic / Inspection Fee</span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    {isDiagnosticFeePaid
                      ? "Paid at booking · Credited towards repair"
                      : "Due with service"}
                  </span>
                </div>
                <span className="font-bold text-emerald-700">
                  ₹{diagnosticFeeAmount} {isDiagnosticFeePaid && "(Credited)"}
                </span>
              </div>

              <div className="flex justify-between items-center text-base sm:text-lg font-black text-slate-900 pt-3 border-t border-slate-200">
                <div>
                  <span>Final Payable Amount</span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    Includes all parts, labor, and diagnostic adjustment
                  </span>
                </div>
                <span className="text-emerald-600 text-xl font-black">
                  ₹{quotation.total_amount}
                </span>
              </div>
            </div>

            {quotation.notes && (
              <div className="text-[11px] text-slate-500 italic bg-slate-50 border border-slate-100 rounded-xl p-3">
                <strong>Technician Note:</strong> {quotation.notes}
              </div>
            )}

            {actionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Action Buttons: Only accessible when Vendor Admin has approved */}
            {canDecide && (
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowRejectModal(true)}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <XCircle size={15} /> Reject Estimate
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowApproveModal(true)}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-xs"
                >
                  <CheckCircle2 size={16} /> Approve &amp; Continue · ₹{quotation.total_amount}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Rate Card Snapshot (Section 11 requirement) */}
        {rateCardSnapshot && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <button
              type="button"
              onClick={() => setShowRateCard((prev) => !prev)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Tag size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    Master Spare Parts &amp; Repair Rate Card
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Immutable booking snapshot ({rateCardSnapshot.total_snapshot_items || rateCardSnapshot.categories?.reduce((s, c) => s + (c.items?.length || 0), 0) || 0} catalog rates)
                  </span>
                </div>
              </div>
              {showRateCard ? (
                <ChevronUp size={16} className="text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-500" />
              )}
            </button>

            {showRateCard && rateCardSnapshot.categories && (
              <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100">
                <div className="py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedRateCategory("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      selectedRateCategory === "ALL"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All
                  </button>
                  {rateCardSnapshot.categories.map((c) => (
                    <button
                      key={c.category_name}
                      type="button"
                      onClick={() => setSelectedRateCategory(c.category_name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                        selectedRateCategory === c.category_name
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {c.category_name}
                    </button>
                  ))}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {rateCardSnapshot.categories
                    .filter((c) => selectedRateCategory === "ALL" || c.category_name === selectedRateCategory)
                    .map((cat) =>
                      cat.items?.map((it) => (
                        <div
                          key={it.id || it.name}
                          className="py-2 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{it.name}</div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {cat.category_name} • {it.unit || "unit"}
                            </span>
                          </div>
                          <span className="font-black text-slate-900">
                            {it.price || `₹${it.numeric_price}`}
                          </span>
                        </div>
                      ))
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── APPROVAL & AUTHORIZATION MODAL ── */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Authorize AC Repair</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Confirm work &amp; choose payment mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Price Breakdown Snapshot */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Quoted Repair Total</span>
                <span className="font-bold text-slate-800">₹{quotation.total_amount}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Diagnostic Fee Credited</span>
                <span className="font-bold">-₹{diagnosticFeeAmount} (Waived)</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                <span>Net Payable for Repair</span>
                <span className="text-emerald-600">₹{quotation.total_amount}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Select Authorization &amp; Payment Mode
              </span>

              <label
                onClick={() => setPaymentMode("CASH_ON_SERVICE")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === "CASH_ON_SERVICE"
                    ? "border-emerald-600 bg-emerald-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "CASH_ON_SERVICE"}
                  onChange={() => setPaymentMode("CASH_ON_SERVICE")}
                  className="mt-1 text-emerald-600"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                    <Banknote size={14} className="text-emerald-600" /> Pay on Service Completion (Cash / UPI)
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Authorize the technician to start repair now. Pay only after work is completed and verified.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setPaymentMode("ONLINE")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === "ONLINE"
                    ? "border-emerald-600 bg-emerald-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "ONLINE"}
                  onChange={() => setPaymentMode("ONLINE")}
                  className="mt-1 text-emerald-600"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                    <CreditCard size={14} className="text-emerald-600" /> Pay Online (UPI / Card / NetBanking)
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Pre-authorize payment securely online to confirm technician repair.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApprove}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer disabled:bg-slate-300 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Authorize &amp; Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Decline Repair Estimate</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Inspection closes with ₹0 repair charge</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-black text-amber-800">
                <AlertTriangle size={15} /> Transparent Fee Policy
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                Declining this quotation means <strong>NO repair work will proceed</strong>.
              </p>
              <div className="border-t border-amber-200/80 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Diagnostic Fee:</span>
                  <strong className="text-slate-900">₹{diagnosticFeeAmount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Repair Work Charge:</span>
                  <strong className="text-emerald-700">₹0.00</strong>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Reason for Rejection
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400"
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Additional Feedback (Optional)
              </label>
              <textarea
                rows={2}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Let us know why you are declining this estimate..."
                className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none bg-white font-medium focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer disabled:bg-slate-300 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO LIGHTBOX PREVIEW MODAL ── */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative border border-white/10">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
            <div className="max-h-[75vh] flex items-center justify-center bg-black/40">
              <img
                src={selectedPhoto.photo}
                alt={selectedPhoto.caption || "Inspection detail"}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>
            {selectedPhoto.caption && (
              <div className="p-4 bg-slate-900 text-xs font-bold text-slate-200 border-t border-white/10">
                {selectedPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ACInspectionStatusPage;
