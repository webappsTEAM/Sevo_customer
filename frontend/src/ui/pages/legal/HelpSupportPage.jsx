import React, { useState } from "react";
import { LegalLayout } from "./LegalLayout.jsx";
import { useLegalConfig } from "./legalConfig.js";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Truck,
  KeyRound,
  CreditCard,
  RotateCcw,
  MessageSquare,
  Mail,
  Phone,
  FileQuestion,
} from "lucide-react";
import { Link } from "react-router-dom";

const FAQS = [
  {
    category: "Bookings & Service Areas",
    items: [
      {
        q: "How do I book a doorstep service on CalServices?",
        a: "Browse categories from the Home page (e.g. Cleaning, Pest Control, Painting, Masonry), select your specific package or add-ons, pick your preferred date and time slot, select your location address, and choose your payment method (Online or Cash on Delivery where applicable).",
      },
      {
        q: "How does CalServices check if my area is serviceable?",
        a: "CalServices utilizes geofenced operational zones. When you enter an address or enable device location, our service engine instantly verifies whether your coordinates fall within an active zone. If inside, all available services are displayed with instant booking.",
      },
      {
        q: "Why are some services unavailable in my selected area?",
        a: "Specific trade categories (such as heavy equipment masonry or specialized chemical pest control) are enabled per service zone based on operational capacity and authorized workforce availability in that hub.",
      },
    ],
  },
  {
    category: "Technician Dispatch, Live Tracking & OTP",
    items: [
      {
        q: "Why don't I see technician details immediately after booking?",
        a: "After you book, your request moves to ASSIGNED while our system broadcasts the job to qualified professionals in your area. Once a technician reviews and formally accepts the job (ACCEPTED state), their verified name, photo, phone number, and rating badge are unlocked on your tracking screen.",
      },
      {
        q: "How does live tracking work?",
        a: "When the technician starts their trip towards your premises (ON THE WAY state), their live GPS coordinates, heading, and dynamic estimated arrival time (ETA) are transmitted to your customer tracking screen.",
      },
      {
        q: "What is the Start OTP and when should I share it?",
        a: "The Start OTP is a secure 4-digit verification code visible on your active booking screen. You must only share this OTP with the technician after they have physically arrived at your doorstep. Sharing the OTP authorizes work to begin.",
      },
      {
        q: "What if the technician's GPS signal is temporarily unavailable?",
        a: "If the technician's device enters a network shadow or low-connectivity area, the tracking screen shows their last verified checkpoint and ETA. You can also contact the technician directly using the call button on your booking screen.",
      },
    ],
  },
  {
    category: "Payments, Invoices & Scope Extensions",
    items: [
      {
        q: "What payment methods are supported?",
        a: "We support secure online payments via UPI, Credit/Debit Cards, and NetBanking through certified payment gateways. Cash on Delivery (COD) is also available for eligible categories.",
      },
      {
        q: "What happens if additional work or materials are needed on-site?",
        a: "If additional scope is required, the professional will create a digital Work Extension Request. No extra work can be performed or charged without your prior approval via the CalServices app.",
      },
      {
        q: "How can I download my GST tax invoice?",
        a: "Once a booking reaches the COMPLETED state, a GST-compliant digital invoice is automatically generated and available for instant download in your Customer Account under Booking History.",
      },
    ],
  },
  {
    category: "Cancellations, Rescheduling & Refunds",
    items: [
      {
        q: "Can I cancel or reschedule my appointment?",
        a: "Yes. You can cancel or reschedule directly from your booking details screen. Cancellations made before technician departure are 100% free of charge.",
      },
      {
        q: "How long do refunds take to reflect in my bank account?",
        a: "Approved online refunds are initiated within 24–48 hours and typically reflect in your original funding account within 3–7 business days depending on your bank.",
      },
      {
        q: "How do I report a service issue or file a complaint?",
        a: "You can submit a ticket under Customer Support or contact our helpdesk at support@caldimengg.com. Our support team investigates every grievance with priority.",
      },
    ],
  },
];

export function HelpSupportPage() {
  const { config } = useLegalConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState({ "0-0": true });

  const toggleItem = (key) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFaqs = FAQS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <LegalLayout
      activePage="help"
      pageTitle="Help Center & Frequently Asked Questions"
      subtitle="Find answers to common questions about booking doorstep services, live technician tracking, OTP security, and payment options."
    >
      <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
        {/* Search Box */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search FAQs (e.g. tracking, OTP, cancellation, refund, invoice)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:border-emerald-500 focus:outline-none transition-all shadow-2xs"
          />
        </div>

        {/* Support Channels Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-slate-900 block">Email Support</span>
              <a href={`mailto:${config.support_email}`} className="text-xs text-emerald-700 hover:underline font-bold truncate block">
                {config.support_email}
              </a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <Phone size={16} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-slate-900 block">Phone Desk</span>
              <span className="text-xs text-slate-700 font-bold block">{config.support_phone}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-slate-900 block">Need Escalation?</span>
              <Link to="/contact" className="text-xs text-purple-700 hover:underline font-bold block">
                Submit Inquiry →
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Categories & Accordions */}
        <section className="space-y-6 pt-2">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileQuestion size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No matching help articles found</p>
              <p className="text-xs">Try searching for different keywords or contact our support team directly.</p>
            </div>
          ) : (
            filteredFaqs.map((cat, catIdx) => (
              <div key={cat.category} className="space-y-3">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{cat.category}</span>
                </h3>

                <div className="space-y-2.5">
                  {cat.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    const isOpen = openItems[key];
                    return (
                      <div
                        key={item.q}
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-white transition-all shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(key)}
                          className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-xs sm:text-sm text-slate-800 leading-snug">
                            {item.q}
                          </span>
                          {isOpen ? (
                            <ChevronUp size={16} className="text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-400 shrink-0" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </LegalLayout>
  );
}
