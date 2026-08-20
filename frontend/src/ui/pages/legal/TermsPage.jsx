import React from "react";
import { LegalLayout } from "./LegalLayout.jsx";
import { useLegalConfig } from "./legalConfig.js";
import { ShieldCheck, AlertCircle, CheckCircle, Clock, MapPin, KeyRound, CreditCard } from "lucide-react";

export function TermsPage() {
  const { config } = useLegalConfig();

  return (
    <LegalLayout
      activePage="terms"
      pageTitle="Terms and Conditions of Service"
      subtitle="Comprehensive legal agreement governing the access and use of CalServices customer applications, service bookings, on-site execution, and payments."
      versionKey="terms"
    >
      <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
        {/* Important Notice Callout */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-black text-amber-950">
            <AlertCircle size={17} className="text-amber-600 shrink-0" />
            <span>Important Customer Agreement</span>
          </div>
          <p>
            Please read these Terms and Conditions carefully before creating an account or placing a booking on <strong>CalServices</strong>. By accessing our platform, submitting a service request, or completing payment, you agree to be bound by these Terms entered into with <strong>{config.company_legal_name}</strong>.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            1. Introduction &amp; Corporate Identity
          </h2>
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern the use of the <strong>CalServices</strong> website, mobile applications, customer portal, and associated technology platforms (collectively, the &quot;Platform&quot;), owned and operated by <strong>{config.company_legal_name}</strong>, a company incorporated under the Companies Act, having its registered office at {config.registered_address} (CIN: {config.cin}, GSTIN: {config.gstin}).
          </p>
          <p>
            Throughout these Terms, the words &quot;we&quot;, &quot;us&quot;, &quot;our&quot;, and &quot;CalServices&quot; refer to {config.company_legal_name}, and &quot;you&quot;, &quot;user&quot;, or &quot;customer&quot; refer to any individual or entity browsing the Platform or booking home and commercial services.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            2. Eligibility &amp; Customer Account
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>You must be at least 18 years of age and legally competent to enter into binding contracts under applicable law to use the Platform.</li>
            <li>You agree to provide accurate, current, and complete information during registration and booking, including your valid mobile phone number, name, and exact delivery address.</li>
            <li>You are responsible for maintaining the confidentiality of any one-time passwords (OTP), authentication tokens, and account credentials.</li>
            <li>You agree not to impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            3. Service Areas &amp; Location Verification
          </h2>
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600">
            <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <p>
              CalServices operates via verified geographical service zones (&quot;Service Areas&quot;). Service availability, package pricing, and specific trade offerings are dynamically determined based on your selected address and GPS coordinates.
            </p>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Bookings can only be confirmed for addresses falling within an active, authorized CalServices Service Area.</li>
            <li>Specific service categories (e.g. Painting, Pest Control, Cleaning, Logistics) may be enabled or disabled per service zone based on operational capacity.</li>
            <li>If an address is outside operational service coverage, the Platform will notify you and prevent booking submission for that location.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            4. Service Booking &amp; Dispatch Process
          </h2>
          <p>
            When you place a booking on CalServices, the booking undergoes the following structured operational lifecycle:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black uppercase text-emerald-700 block mb-1">1. CONFIRMED</span>
              <p className="text-xs text-slate-600">Booking received and schedule reserved in your service area. Initial order confirmation issued.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black uppercase text-blue-700 block mb-1">2. ASSIGNED</span>
              <p className="text-xs text-slate-600">Dispatch request routed through the Workforce management integration. Technician identity remains pending until confirmation.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black uppercase text-indigo-700 block mb-1">3. ACCEPTED</span>
              <p className="text-xs text-slate-600">Service professional formally accepts the job. Real technician name, authorized photo, and rating are revealed to the customer.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black uppercase text-teal-700 block mb-1">4. ON THE WAY</span>
              <p className="text-xs text-slate-600">Technician begins travel. Real-time GPS location and dynamic ETA are transmitted to customer live tracking.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black uppercase text-amber-700 block mb-1">5. ARRIVED &amp; OTP</span>
              <p className="text-xs text-slate-600">Professional reaches your location. 4-digit start OTP must be verified before any work commences.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black uppercase text-emerald-800 block mb-1">6. IN PROGRESS &amp; COMPLETED</span>
              <p className="text-xs text-slate-600">Execution of scheduled package items and customer sign-off upon completion.</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic mt-2">
            * Note: Service professionals are dispatched through our integrated Workforce and Partner network. Assignment of a job does not guarantee immediate acceptance; technician profiles are disclosed upon formal workforce acceptance.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            5. OTP Verification &amp; On-Site Execution
          </h2>
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-950">
            <KeyRound size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Start OTP Verification Security:</strong>
              <p className="mt-0.5">
                Every doorstep service requires a secure 4-digit One-Time Password (OTP) displayed on your active booking screen. You must only share this OTP with the verified service professional after they have physically arrived at your premises. Sharing this OTP authorizes the commencement of work.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            6. Additional Work &amp; Customer Approval
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>The scope of work is strictly defined by the packages and add-ons selected in your confirmed booking.</li>
            <li>If inspection on-site reveals additional requirements, material costs, or scope expansion, the service professional will create a digital <strong>Work Extension Request</strong>.</li>
            <li>No additional work shall be performed or charged without your prior explicit digital or recorded approval through the CalServices customer portal.</li>
            <li>Supplementary charges must be settled through official CalServices payment methods (Online / Official COD invoice).</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            7. Pricing, Invoicing &amp; Payment Responsibilities
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>All prices displayed are in Indian Rupees (INR ₹) and are inclusive of applicable taxes unless stated otherwise.</li>
            <li><strong>Online Payments:</strong> Processed securely via authorized payment gateways. CalServices does not store your credit/debit card numbers, CVV, or UPI PINs.</li>
            <li><strong>Cash on Delivery (COD):</strong> Where available for selected categories, payment must be handed over upon completion of the service.</li>
            <li><strong>Invoices:</strong> Digital GST-compliant invoices are automatically generated and made available in your customer account upon service completion.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            8. Limitation of Liability &amp; Disclaimers
          </h2>
          <p>
            To the maximum extent permitted by applicable law:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>CalServices provides the platform on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind.</li>
            <li>While we perform background verification and skill screening on service partners, {config.company_legal_name} shall not be liable for indirect, incidental, punitive, or consequential damages resulting from doorstep service execution beyond the invoice value of the affected booking.</li>
            <li>We are not responsible for delays or service failure caused by Force Majeure events, extreme weather, traffic gridlocks, or civil unrest.</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            9. Governing Law &amp; Dispute Resolution
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the <strong>{config.governing_law}</strong>. Any legal dispute, claim, or controversy arising out of or relating to these Terms or the breach thereof shall be subject to the exclusive jurisdiction of the competent courts in <strong>{config.jurisdiction}</strong>.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2">
            10. Contact &amp; Grievance Redressal
          </h2>
          <p>
            For any queries, complaints, or legal notices, you may contact our Grievance Officer:
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs sm:text-sm text-slate-700">
            <p><strong>Corporate Entity:</strong> {config.company_legal_name}</p>
            <p><strong>Address:</strong> {config.registered_address}</p>
            <p><strong>Email:</strong> <a href={`mailto:${config.support_email}`} className="text-emerald-700 underline font-bold">{config.support_email}</a></p>
            <p><strong>Support Hours:</strong> {config.support_hours}</p>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
