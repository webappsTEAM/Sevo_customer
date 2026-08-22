import React from "react";
import { LegalLayout } from "./LegalLayout.jsx";
import { useLegalConfig } from "./legalConfig.js";
import { Shield, Lock, Eye, MapPin, Database, UserCheck, AlertTriangle } from "lucide-react";

export function PrivacyPage() {
  const { config } = useLegalConfig();

  return (
    <LegalLayout
      activePage="privacy"
      pageTitle="Privacy & Data Protection Policy"
      subtitle="How Sevo collects, uses, protects, and handles your personal information, location coordinates, and service transaction history."
      versionKey="privacy"
    >
      <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
        {/* Commitment Badge */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-black text-emerald-900">
            <Shield size={17} className="text-emerald-700 shrink-0" />
            <span>Our Privacy Commitment</span>
          </div>
          <p>
            At <strong>Sevo</strong> (operated by <strong>{config.company_legal_name}</strong>), we respect your privacy and are committed to protecting your personal data in accordance with the Digital Personal Data Protection Act (DPDPA), Information Technology Act, 2000, and global data protection standards.
          </p>
        </div>

        {/* Section 1: Information Collected */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            1. Information We Collect
          </h2>
          <p>We collect only information necessary to deliver doorstep services, facilitate bookings, and provide customer support:</p>
          <div className="space-y-2 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <strong className="text-slate-900 text-xs sm:text-sm">A. Identity &amp; Contact Details:</strong>
              <p className="text-xs text-slate-600 mt-0.5">Name, mobile phone number, email address, and authentication credentials.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <strong className="text-slate-900 text-xs sm:text-sm">B. Service Delivery Addresses &amp; Location:</strong>
              <p className="text-xs text-slate-600 mt-0.5">Saved delivery addresses, street details, landmark, and device GPS coordinates when explicitly provided via location permission or map search.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <strong className="text-slate-900 text-xs sm:text-sm">C. Booking &amp; Transaction Details:</strong>
              <p className="text-xs text-slate-600 mt-0.5">Services booked, scheduling preferences, order status, OTP records, work extension approvals, and invoices.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <strong className="text-slate-900 text-xs sm:text-sm">D. Customer Support &amp; Feedback:</strong>
              <p className="text-xs text-slate-600 mt-0.5">Support tickets, complaint history, chat transcripts, customer ratings, and service feedback.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Location Data Policy */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            2. How We Use Location Data
          </h2>
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600">
            <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p>Location data is used strictly for operational service fulfillment:</p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li><strong>Service Zone Verification:</strong> Validating that your requested address falls within an active Sevo service boundary.</li>
                <li><strong>Technician Dispatch:</strong> Routing the nearest qualified professional to your doorstep.</li>
                <li><strong>Live Tracking Display:</strong> Transmitting live travel updates during the <code>ON THE WAY</code> stage. The technician&apos;s GPS is supplied by the workforce telemetry system; customer location is never tracked continuously in the background when the app is closed.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Workforce & Partner Data Sharing */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            3. Sharing Data with Authorized Service Professionals
          </h2>
          <p>
            To perform the booked service, Sevo shares safe, limited information with the assigned technician or workforce partner:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Customer name, contact phone number, and service delivery address.</li>
            <li>Specific service details, package scope, and scheduled arrival time.</li>
            <li>We <strong>do not</strong> share your payment card details, billing history, or unrelated account information with field technicians.</li>
          </ul>
        </section>

        {/* Section 4: Payment Data Security */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            4. Payment Information &amp; Third-Party Processing
          </h2>
          <div className="flex items-start gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-950">
            <Lock size={18} className="text-blue-700 shrink-0 mt-0.5" />
            <p>
              All online payments on Sevo are processed via PCI-DSS certified payment gateways (such as Razorpay / UPI). <strong>Sevo does not store credit/debit card numbers, CVVs, or bank PINs on its servers.</strong>
            </p>
          </div>
        </section>

        {/* Section 5: Cookies and Local Storage */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            5. Cookies, Local Storage &amp; Session Tokens
          </h2>
          <p>
            Our web and mobile applications utilize browser <code>localStorage</code> and <code>sessionStorage</code> for:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Maintaining your active login session and authentication tokens.</li>
            <li>Caching your selected delivery address and active shopping cart for a smooth checkout experience.</li>
            <li>Storing temporary tracking credentials for live technician tracking.</li>
          </ul>
        </section>

        {/* Section 6: Data Retention & Customer Rights */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            6. Your Rights &amp; Data Retention
          </h2>
          <p>
            Under applicable data protection laws, you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Access &amp; Review:</strong> View all saved addresses, profile data, and past bookings in your Customer Account.</li>
            <li><strong>Correction:</strong> Update inaccurate contact or profile information at any time.</li>
            <li><strong>Account &amp; Data Deletion:</strong> Request account deletion or data erasure by writing to <a href={`mailto:${config.support_email}`} className="text-emerald-700 underline font-bold">{config.support_email}</a>. Transaction invoices will be retained as required by statutory tax and accounting regulations.</li>
          </ul>
        </section>

        {/* Section 7: Minor / Children Privacy */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            7. Children&apos;s Privacy
          </h2>
          <p>
            Sevo does not knowingly collect or solicit personal data from persons under the age of 18. If we learn that we have collected personal data from a minor without parental consent, we will promptly delete that information.
          </p>
        </section>

        {/* Section 8: Contact Privacy Officer */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            8. Privacy Officer Contact
          </h2>
          <p>
            For questions or concerns regarding this Privacy Policy or your personal data, please contact our Data Protection Officer:
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs sm:text-sm text-slate-700">
            <p><strong>Entity:</strong> {config.company_legal_name}</p>
            <p><strong>Address:</strong> {config.registered_address}</p>
            <p><strong>Email:</strong> <a href={`mailto:${config.support_email}`} className="text-emerald-700 underline font-bold">{config.support_email}</a></p>
            <p><strong>Effective Date:</strong> {config.effective_date}</p>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
