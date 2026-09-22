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
 * Reads the authoritative booking + estimation record from the real backend
 * (GET /api/booking/{id}/ and GET /api/booking/{id}/estimation/) and renders
 * the previously-orphaned EstimationTimeline component against live status.
 * Also surfaces the quotation (once the technician's inspection produces one)
 * with real Approve / Reject actions wired to the existing, already-built
 * QuotationService endpoints.
 */
export function ACInspectionStatusPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [estimation, setEstimation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showRejectPicker, setShowRejectPicker] = useState(false);
  const [rejectReason, setRejectReason] = useState("PRICE_TOO_HIGH");
  const [rejectNote, setRejectNote] = useState("");
  const [decisionMade, setDecisionMade] = useState(null); // "APPROVED" | "REJECTED"
  const [rateCardSnapshot, setRateCardSnapshot] = useState(null);
  const [showRateCard, setShowRateCard] = useState(true);
  const [selectedRateCategory, setSelectedRateCategory] = useState("ALL");

  const load = useCallback(async () => {
    setError("");
    try {
      const [bookingResp, estimationResp, rateCardResp] = await Promise.all([
        apiRequest(`/booking/${encodeURIComponent(id)}/`),
        apiRequest(`/booking/${encodeURIComponent(id)}/estimation/`).catch(() => null),
        apiRequest(`/booking/${encodeURIComponent(id)}/inspection-rate-card/`).catch(() => null),
      ]);
      if (bookingResp?.success) setBooking(bookingResp.data);
      if (estimationResp?.success) setEstimation(estimationResp.data);
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
    // Light polling so status/quotation updates made by the technician/vendor
    // side show up without a manual refresh.
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const quotation = estimation?.active_quotation || null;
  const canDecide = quotation && quotation.status === "SENT";

  async function handleApprove() {
    setActionLoading(true);
    setActionError("");
    try {
      const resp = await apiRequest(`/booking/${encodeURIComponent(id)}/quotation/approve/`, {
        method: "POST",
        json: { quotation_id: quotation.id },
      });
      if (resp?.success) {
        setDecisionMade("APPROVED");
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
        json: { quotation_id: quotation.id, reason_code: rejectReason, reason_note: rejectNote },
      });
      if (resp?.success) {
        setDecisionMade("REJECTED");
        setShowRejectPicker(false);
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
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <Loader2 size={18} className="animate-spin text-emerald-600" />
          Loading your inspection status...
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle size={28} className="mx-auto text-rose-500" />
          <p className="text-sm font-bold text-slate-800">{error}</p>
          <button
            type="button"
            onClick={() => navigate(routes.landing)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const technicianName = estimation?.inspection?.technician_name || null;
  const currentStatus = estimation?.status || booking?.status || "REQUESTED";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigate(routes.landing)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Home
        </button>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 mb-5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Wrench size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                AC Inspection — {booking?.request_id || id}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">{booking?.address || "—"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer shrink-0"
            title="Refresh status"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <EstimationTimeline currentStatus={currentStatus} technicianName={technicianName} />

        {/* Inspection Booking & Rate Card Snapshot Card (Stored in PostgreSQL) */}
        {rateCardSnapshot && (
          <div className="mt-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-1">
                  <ShieldCheck size={12} />
                  Booking Snapshot
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {rateCardSnapshot.inspection_name || "AC Inspection & Diagnostic Visit"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Quantity: {rateCardSnapshot.quantity || 1} • Booking Status: <span className="font-bold text-slate-700">{rateCardSnapshot.status || "BOOKED"}</span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Diagnostic Fee</span>
                <span className="text-xl font-black text-emerald-600">
                  {rateCardSnapshot.diagnostic_fee_display || `₹${rateCardSnapshot.diagnostic_fee}`}
                </span>
              </div>
            </div>

            {/* Collapsible Spare Parts & Repair Rate Card Snapshot */}
            <div>
              <button
                type="button"
                onClick={() => setShowRateCard((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left transition-colors cursor-pointer border border-slate-200/70"
              >
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">
                      Spare Parts &amp; Repair Rate Card
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Stored booking snapshot ({rateCardSnapshot.total_snapshot_items || rateCardSnapshot.categories?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0} items)
                    </span>
                  </div>
                </div>
                {showRateCard ? (
                  <ChevronUp size={16} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-500 shrink-0" />
                )}
              </button>

              {showRateCard && rateCardSnapshot.categories && rateCardSnapshot.categories.length > 0 && (
                <div className="mt-3 border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                  {/* Category Pills Filter */}
                  <div className="p-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedRateCategory("ALL")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedRateCategory === "ALL"
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      All ({rateCardSnapshot.total_snapshot_items || rateCardSnapshot.categories.reduce((s, c) => s + (c.items?.length || 0), 0)})
                    </button>
                    {rateCardSnapshot.categories.map((cat) => (
                      <button
                        key={cat.category_name}
                        type="button"
                        onClick={() => setSelectedRateCategory(cat.category_name)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedRateCategory === cat.category_name
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cat.category_name} ({cat.items?.length || 0})
                      </button>
                    ))}
                  </div>

                  {/* Items List */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {rateCardSnapshot.categories
                      .filter((c) => selectedRateCategory === "ALL" || c.category_name === selectedRateCategory)
                      .map((cat) => (
                        <div key={cat.category_name} className="p-3.5 space-y-2">
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            {cat.category_name}
                          </div>
                          <div className="space-y-1.5">
                            {cat.items?.map((it) => (
                              <div
                                key={it.id || it.name}
                                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-50 text-xs"
                              >
                                <div className="pr-4">
                                  <div className="font-bold text-slate-800">{it.name}</div>
                                  {it.description && (
                                    <div className="text-[10px] text-slate-500">{it.description}</div>
                                  )}
                                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                                    {it.service_type || "SPARE_PART"} • {it.unit || "unit"}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-black text-slate-900">
                                    {it.price || `₹${it.numeric_price}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quotation card — only appears once the technician has completed the inspection and a quotation exists */}
        {quotation && (
          <div className="mt-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Quotation {quotation.quote_ref}
              </h4>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  quotation.status === "APPROVED"
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
                    : quotation.status === "REJECTED"
                    ? "text-rose-700 bg-rose-50 border border-rose-200/60"
                    : "text-indigo-700 bg-indigo-50 border border-indigo-200/60"
                }`}
              >
                {quotation.status}
              </span>
            </div>

            <div className="space-y-2">
              {(quotation.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{item.service_name}</div>
                    {item.description && <div className="text-[11px] text-slate-500">{item.description}</div>}
                    <div className="text-[10px] text-slate-400">
                      {item.quantity} {item.unit} × ₹{item.unit_price}
                    </div>
                  </div>
                  <div className="font-black text-slate-900">₹{item.line_total}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{quotation.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>₹{quotation.tax_amount}</span>
              </div>
              {Number(quotation.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-₹{quotation.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                <span className="flex items-center gap-1">
                  <IndianRupee size={13} /> Total
                </span>
                <span>₹{quotation.total_amount}</span>
              </div>
            </div>

            {quotation.notes && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-3">
                {quotation.notes}
              </p>
            )}

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {decisionMade === "APPROVED" && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>Quotation approved — your repair continues under the same booking.</span>
              </div>
            )}
            {decisionMade === "REJECTED" && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>Quotation rejected. Only the inspection fee applies.</span>
              </div>
            )}

            {canDecide && !decisionMade && (
              <>
                {!showRejectPicker ? (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowRejectPicker(true)}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleApprove}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:bg-slate-300 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve · ₹{quotation.total_amount}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none"
                    >
                      {REJECT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={2}
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Anything else you'd like us to know? (optional)"
                      className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none bg-slate-50"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowRejectPicker(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleReject}
                        className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer disabled:bg-slate-300"
                      >
                        Confirm Decline
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ACInspectionStatusPage;
