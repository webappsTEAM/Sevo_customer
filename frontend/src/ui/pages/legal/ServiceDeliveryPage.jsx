import React from "react";
import { LegalLayout } from "./LegalLayout.jsx";
import { useLegalConfig } from "./legalConfig.js";
import { Truck, MapPin, CheckCircle2, Clock, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";

export function ServiceDeliveryPage() {
  const { config } = useLegalConfig();

  return (
    <LegalLayout
      activePage="service-delivery"
      pageTitle="Doorstep Service Delivery Policy"
      subtitle="How Sevo executes on-site doorstep home and commercial services, verified dispatch, live tracking, and OTP verification."
      versionKey="service_delivery"
    >
      <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
        {/* Intro Highlight */}
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/80 border border-teal-200 text-teal-950 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-black text-teal-900">
            <Truck size={17} className="text-teal-700 shrink-0" />
            <span>On-Site Doorstep Service Model</span>
          </div>
          <p>
            <strong>Sevo</strong> provides professional on-site doorstep services (e.g. Home Cleaning, Pest Control, Painting, Carpentry, Masonry, and City Transport). We do not ship physical parcels; all services are fulfilled directly at your designated service location by verified service professionals.
          </p>
        </div>

        {/* Section 1: Service Areas */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            1. Service Coverage &amp; Zone Validation
          </h2>
          <p>
            To guarantee punctual arrival and high service standards, delivery is organized into defined operational service zones:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Before booking, your GPS location or selected address is verified against our active service zones.</li>
            <li>Specific categories may have designated operating radii or specialized teams.</li>
            <li>If an address is outside our authorized service boundary, the system will prevent dispatch to prevent unserviceable commitments.</li>
          </ul>
        </section>

        {/* Section 2: 6-Stage Delivery Lifecycle */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            2. The 6-Stage Service Delivery Lifecycle
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Every booking progresses through strict verifiable milestones to ensure safety, punctuality, and complete visibility:
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">CONFIRMED (Booking Scheduled)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your service request and time slot are reserved in the system. A unique booking ID and initial receipt are generated.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">ASSIGNED (Workforce Routing)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  The job is broadcast to qualified service professionals in your area through the Workforce integration. Technician profile details remain masked until acceptance.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">ACCEPTED (Technician Verified)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  The service professional formally accepts the assignment. The real technician name, photo, phone contact, and rating badge are unlocked on your customer tracking screen.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">ON THE WAY (Live Tracking)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  The technician departs for your location. Live GPS position, heading, and dynamic estimated time of arrival (ETA) are visible in your customer app.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                5
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">ARRIVED &amp; OTP VERIFICATION</h4>
                <p className="text-xs text-slate-600 mt-1">
                  The professional arrives at your doorstep. To protect customer safety, work can only start after the professional verifies the 4-digit start OTP provided in your app.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                6
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">IN PROGRESS &amp; COMPLETED</h4>
                <p className="text-xs text-slate-600 mt-1">
                  The professional performs the service according to standard operating procedures. Once verified, the job is marked completed and digital invoices are issued.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Punctuality and Delays */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            3. Punctuality &amp; Operational Delay Handling
          </h2>
          <p>
            While our dispatch algorithms prioritize punctual arrivals, unforeseen road traffic, severe weather conditions, or prior job extensions can occasionally cause delays:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>You will receive proactive notifications and updated ETAs if arrival is delayed by more than 15 minutes.</li>
            <li>You may reschedule the booking free of charge if the revised timing is inconvenient.</li>
          </ul>
        </section>

        {/* Section 4: Additional Work & Extensions */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            4. Scope Expansion &amp; Digital Work Extensions
          </h2>
          <p>
            If additional repairs, materials, or square footage are required upon on-site inspection:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>The technician must raise a formal digital <strong>Work Extension Request</strong> via the system.</li>
            <li>No additional fees may be charged or collected without your explicit digital authorization.</li>
          </ul>
        </section>

        {/* Section 5: Delivery Support */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            5. Delivery Support &amp; Assistance
          </h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs sm:text-sm text-slate-700">
            <p>For live booking assistance or dispatch queries:</p>
            <p><strong>Support Email:</strong> <a href={`mailto:${config.support_email}`} className="text-emerald-700 underline font-bold">{config.support_email}</a></p>
            <p><strong>Operating Hours:</strong> {config.support_hours}</p>
            <p><strong>Corporate Entity:</strong> {config.company_legal_name}</p>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
