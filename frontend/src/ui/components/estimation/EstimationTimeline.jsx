import React from "react";
import {
  ESTIMATION_STAGES,
  HOW_ESTIMATION_WORKS_STEPS,
  TECHNICIAN_FINDINGS_EXAMPLES,
  WHAT_TECHNICIAN_CHECKS,
} from "../../../services/estimation/estimationConfig.js";
import { Check, Clock, AlertCircle, Wrench, Shield, CheckCircle2, ChevronRight, FileText, ArrowRight } from "lucide-react";

/**
 * EstimationTimeline.jsx
 * Reusable component rendering the 11-step Estimation Timeline,
 * customer-facing vendor workflow explanation, and technician findings overview.
 */
export function EstimationTimeline({
  currentStatus = "REQUESTED",
  technicianName = null,
  compact = false,
}) {
  // Map status string to step index (1-indexed)
  const getActiveStepIndex = (status) => {
    const s = (status || "REQUESTED").toUpperCase();
    if (s.includes("COMPLETE") || s.includes("FINISHED")) return 11;
    if (s.includes("SERVICE")) return 10;
    if (s.includes("APPROV")) return 9;
    if (s.includes("QUOTE") || s.includes("QUOTATION")) return 8;
    if (s.includes("INSPECTION_COMPLETED")) return 7;
    if (s.includes("INSPECT") || s.includes("IN_PROGRESS")) return 6;
    if (s.includes("ARRIVED")) return 5;
    if (s.includes("WAY") || s.includes("DISPATCH")) return 4;
    if (s.includes("ASSIGN")) return 3;
    if (s.includes("CONFIRM")) return 2;
    return 1; // Default: Step 1 (Estimation Requested)
  };

  const isCancelled = (currentStatus || "").toUpperCase() === "CANCELLED";
  const activeStep = isCancelled ? 0 : getActiveStepIndex(currentStatus);

  return (
    <div className="space-y-6 text-left">
      {/* ────────────────── 11-STEP TIMELINE CARD ────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Estimation Status Timeline
            </h4>
          </div>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
            isCancelled
              ? "text-rose-700 bg-rose-50 border border-rose-200"
              : "text-indigo-700 bg-indigo-50 border border-indigo-200/60"
          }`}>
            {isCancelled ? "Cancelled" : `Stage ${activeStep} of 11`}
          </span>
        </div>

        {isCancelled && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>This estimation request was cancelled. You can book a new AC Inspection at any time from the AC Services page.</span>
          </div>
        )}

        {/* Vertical Timeline Steps */}
        <div className="space-y-3.5 relative pl-1">
          {ESTIMATION_STAGES.map((stage, idx) => {
            const isCompleted = activeStep > stage.step;
            const isCurrent = activeStep === stage.step;
            const isPending = activeStep < stage.step;

            return (
              <div key={stage.id} className="flex items-start gap-3 relative group">
                {/* Connecting Line */}
                {idx < ESTIMATION_STAGES.length - 1 && (
                  <div
                    className={`absolute left-3.5 top-6 w-0.5 h-6 transition-colors ${
                      isCompleted ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}

                {/* Node Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-xs"
                      : isCurrent
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={13} strokeWidth={3} />
                  ) : isCurrent ? (
                    <Clock size={13} />
                  ) : (
                    <span className="text-[10px]">{stage.step}</span>
                  )}
                </div>

                {/* Step Label & Sub-status */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        isCompleted
                          ? "text-slate-800"
                          : isCurrent
                          ? "text-indigo-950 font-black"
                          : "text-slate-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? "text-emerald-600"
                          : isCurrent
                          ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
                          : "text-slate-400"
                      }`}
                    >
                      {isCompleted ? "Completed" : isCurrent ? "Active" : "Upcoming"}
                    </span>
                  </div>

                  {/* Contextual notes for specific steps */}
                  {isCurrent && stage.step === 1 && (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Your AC inspection request has been placed. We are assigning a certified technician.
                    </p>
                  )}
                  {isCurrent && stage.step === 3 && (
                    <p className="text-[11px] text-indigo-700 mt-0.5 font-semibold">
                      {technicianName ? `${technicianName} is assigned to your request.` : "Technician assigned."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────── FULL CUSTOMER-FACING VENDOR FLOW ────────────────── */}
      {!compact && (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
            <span className="text-base">🔄</span>
            <span>How the Technician &amp; Quotation Workflow Operates</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <span className="font-extrabold text-indigo-950 block mb-1">Step 1: Physical Inspection</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Technician visits, inspects cooling, refrigerant pressure, airflow, electrical circuits, and identifies the root problem.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <span className="font-extrabold text-indigo-950 block mb-1">Step 2: Quotation Preparation</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Findings are documented and recommended repair services are selected. A clear quotation is sent to your device.
                </p>
              </div>
            </div>

            {/* Approval Decision Flow */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-slate-50 rounded-xl border border-emerald-100 space-y-2">
              <div className="text-xs font-black text-slate-900">Your Approval Decision:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200 text-emerald-950">
                  <span className="font-bold text-emerald-700 block mb-0.5">✓ IF YOU APPROVE:</span>
                  The same request continues seamlessly into repair with the same technician.
                </div>
                <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                  <span className="font-bold text-slate-600 block mb-0.5">✗ IF YOU DECLINE:</span>
                  Estimation is closed. Only the inspection fee (₹199) applies — zero surprise charges.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── WHAT THE TECHNICIAN MAY IDENTIFY ────────────────── */}
      {!compact && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Possible Technician Findings
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">Diagnostic Examples</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            During the inspection, the technician will identify the exact issue from these common categories:
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {TECHNICIAN_FINDINGS_EXAMPLES.map((item) => (
              <span
                key={item}
                className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-1 rounded-lg"
              >
                • {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────── FUTURE QUOTATION UI PREPARATION ────────────────── */}
      {!compact && (
        <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 text-center space-y-1.5">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <FileText size={13} />
            <span>Inspection Report &amp; Quotation Gateway</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
            Inspection report, technician photos, and quotation line items will be displayed here in Phase 2 once the inspection is completed by the expert.
          </p>
        </div>
      )}
    </div>
  );
}
