import React from "react";
import { LegalLayout } from "./LegalLayout.jsx";
import { useLegalConfig } from "./legalConfig.js";
import { RotateCcw, AlertCircle, CheckCircle2, Clock, CreditCard, ShieldCheck } from "lucide-react";

export function CancellationRefundPage() {
  const { config } = useLegalConfig();

  return (
    <LegalLayout
      activePage="cancellation-refund"
      pageTitle="Cancellation & Refund Policy"
      subtitle="Transparent policies on customer cancellations, appointment rescheduling, eligible refunds, and payment reversals."
      versionKey="cancellation_refund"
    >
      <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
        {/* Highlight Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-black text-indigo-900">
            <RotateCcw size={17} className="text-indigo-700 shrink-0" />
            <span>Fair &amp; Transparent Cancellation Rules</span>
          </div>
          <p>
            At <strong>Sevo</strong> (operated by <strong>{config.company_legal_name}</strong>), we understand that schedules change. Our cancellation and refund policy balances customer flexibility with fair compensation for dispatched service professionals.
          </p>
        </div>

        {/* Section 1: Cancellation by Lifecycle Stage */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            1. Cancellation Rules by Booking Stage
          </h2>
          <div className="space-y-3 pt-1">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <strong className="text-slate-900 text-xs sm:text-sm">A. Before Technician Acceptance (CONFIRMED / ASSIGNED):</strong>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">100% Full Refund</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                You can cancel your booking anytime before a service professional formally accepts the request without any cancellation fee. Full prepaid amounts are refunded.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <strong className="text-slate-900 text-xs sm:text-sm">B. After Acceptance / While On The Way (ACCEPTED / ON THE WAY):</strong>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">Free Cancellation / Standard Visit Fee</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                If cancelled after travel has started, a nominal visit fee may apply if the professional has already traveled towards your location. If the professional is significantly delayed (&gt;30 mins), cancellation remains 100% free.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <strong className="text-slate-900 text-xs sm:text-sm">C. After Arrival (ARRIVED / Prior to OTP):</strong>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">Inspection / Visiting Fee</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                If the professional arrives and you choose not to proceed before sharing the Start OTP, an inspection/visiting fee covers travel expenses, and any remaining balance is refunded.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <strong className="text-slate-900 text-xs sm:text-sm">D. After Work Commences (IN PROGRESS):</strong>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">Non-Cancellable / Pro-Rata</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Once the Start OTP is verified and service has begun, bookings cannot be cancelled. Any dispute regarding service quality will be investigated by Customer Support for corrective re-service or adjustment.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Rescheduling */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            2. Appointment Rescheduling
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>You can easily reschedule your booking to another available time slot directly through the customer portal or mobile app.</li>
            <li>Rescheduling is free of charge when requested before the service professional departs for your location.</li>
            <li>If a technician is unable to fulfill a confirmed slot due to an emergency, Sevo will notify you immediately and auto-reassign another top-rated professional or suggest alternate slots.</li>
          </ul>
        </section>

        {/* Section 3: Failed, Duplicate or Excess Payments */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            3. Failed &amp; Duplicate Payment Resolution
          </h2>
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600">
            <CreditCard size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p>In the event of technical payment issues:</p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li><strong>Payment Debited but Booking Failed:</strong> If your bank account or UPI was debited but the booking was not confirmed, the amount is automatically reversed by the payment gateway within 2–5 business days.</li>
                <li><strong>Duplicate Payment:</strong> If you were charged twice for the same booking ID, the duplicate amount will be refunded to the original payment source immediately upon verification.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4: Refund Mode & Timeline */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            4. Refund Mode &amp; Processing Timelines
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Original Payment Method:</strong> All eligible refunds for online transactions are credited back to the original funding source (Card / UPI / NetBanking).</li>
            <li><strong>Processing Timeline:</strong> Sevo initiates approved refunds within <strong>24 to 48 hours</strong>. Depending on your issuing bank or payment provider, credits typically reflect in your account within <strong>3 to 7 business days</strong>.</li>
            <li><strong>Cash on Delivery (COD):</strong> For COD cancellations, no advance refund is necessary as payment is collected only on completion.</li>
          </ul>
        </section>

        {/* Section 5: Dispute Redressal */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            5. Dispute &amp; Support Escalation
          </h2>
          <p>
            If you have an issue with a cancelled booking, incorrect deduction, or refund delay, please contact our support desk:
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs sm:text-sm text-slate-700">
            <p><strong>Corporate Entity:</strong> {config.company_legal_name}</p>
            <p><strong>Address:</strong> {config.registered_address}</p>
            <p><strong>Support Email:</strong> <a href={`mailto:${config.support_email}`} className="text-emerald-700 underline font-bold">{config.support_email}</a></p>
            <p><strong>Support Phone:</strong> {config.support_phone}</p>
            <p><strong>Support Hours:</strong> {config.support_hours}</p>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
