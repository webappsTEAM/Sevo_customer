import React from "react";
import { Link } from "react-router-dom";
import { Smartphone, Phone, Mail, Clock } from "lucide-react";
import { CalTrackLogo } from "./CalTrackLogo.jsx";
import { BkStyles } from "../pages/BookingPage.jsx";

function FacebookMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}
function InstagramMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YoutubeMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.5 6.5s-.22-1.56-.9-2.25c-.86-.9-1.82-.9-2.26-.96C16.2 3 12 3 12 3h-.01s-4.2 0-7.34.29c-.44.06-1.4.06-2.26.96C1.72 4.94 1.5 6.5 1.5 6.5S1.2 8.35 1.2 10.2v1.6c0 1.85.3 3.7.3 3.7s.22 1.56.89 2.25c.86.9 1.98.87 2.48.97C6.6 18.9 12 19 12 19s4.2-.01 7.34-.3c.44-.05 1.4-.05 2.26-.96.68-.69.9-2.25.9-2.25s.3-1.85.3-3.7v-1.6c0-1.85-.3-3.7-.3-3.7ZM9.75 13.9V8.5l5.25 2.71-5.25 2.7Z" />
    </svg>
  );
}
function TwitterMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 3H22l-7.2 8.23L23 21h-6.6l-5.17-6.42L5.3 21H2.2l7.7-8.8L2 3h6.75l4.67 5.86L18.9 3Zm-1.16 16.2h1.72L7.35 4.7H5.5l12.24 14.5Z" />
    </svg>
  );
}

export function AppBannerAndFooter() {
  return (
    <>
      <BkStyles />
      <div className="w-full mt-16 transition-colors duration-200">
        {/* App Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="bg-[#F2F8F4] dark:bg-[#0B1E43] border border-[#D5EADB] dark:border-[var(--sevo-border)] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[var(--sevo-shadow-sm)] relative overflow-hidden">
            <div className="flex items-center gap-5 text-center md:text-left z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#0B8F7A] flex items-center justify-center shrink-0 text-white shadow-md">
                <Smartphone size={28} />
              </div>
              <div>
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-[#0B8F7A]">Book on the go!</span>
                <h4 className="text-xl sm:text-2xl font-black text-[#0B172A] dark:text-white">Download the Sevo App</h4>
                <p className="text-xs sm:text-sm text-[var(--sevo-text-secondary)] mt-0.5 font-medium">Faster booking, real-time tracking &amp; exclusive app offers.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 z-10">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button className="px-5 py-2.5 rounded-xl bg-[#0B8F7A] hover:bg-[#087060] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer">
                  Get it on Google Play
                </button>
                <button className="px-5 py-2.5 rounded-xl bg-white border border-[#D5EADB] text-[#0B172A] text-xs font-extrabold shadow-xs hover:bg-[#FAF7F0] transition-all cursor-pointer">
                  Download on App Store
                </button>
              </div>
              <img
                src="/assets/phone_app_mockup.jpg"
                alt="SEVO App Mockup"
                className="w-24 sm:w-28 object-contain rounded-2xl drop-shadow-md hidden sm:block select-none"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Main Links Footer */}
        <footer className="bg-[var(--sevo-surface)] border-t border-[var(--sevo-border)] mt-12 pt-12 pb-8 text-[var(--sevo-text-secondary)] transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10">
            {/* Col 1: Brand & Corporate */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalTrackLogo size={24} theme="auto" />
              </div>
              <p className="text-xs text-[var(--sevo-text-secondary)] leading-relaxed">
                Your trusted partner for doorstep home and commercial services. Quality, verified professionals, and transparent pricing.
              </p>
              <p className="text-[11px] text-[var(--sevo-text-muted)] leading-normal">
                CALDIM ENGINEERING PRIVATE LIMITED<br />
                CIN: U72900KA2026PTC123456 • GSTIN: 33AAGCC4916J1ZP
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="p-2 rounded-lg bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-primary)] transition-colors cursor-pointer"><FacebookMark style={{ width: 15, height: 15 }} /></span>
                <span className="p-2 rounded-lg bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-primary)] transition-colors cursor-pointer"><InstagramMark style={{ width: 15, height: 15 }} /></span>
                <span className="p-2 rounded-lg bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-primary)] transition-colors cursor-pointer"><YoutubeMark style={{ width: 15, height: 15 }} /></span>
                <span className="p-2 rounded-lg bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-primary)] transition-colors cursor-pointer"><TwitterMark style={{ width: 15, height: 15 }} /></span>
              </div>
            </div>

            {/* Col 2: Services */}
            <div className="space-y-3">
              <h5 className="text-sm font-extrabold text-[var(--sevo-text-primary)]">Services</h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/home" className="hover:text-[var(--sevo-primary)] transition-colors">Home Cleaning &amp; Pest Control</Link></li>
                <li><Link to="/home" className="hover:text-[var(--sevo-primary)] transition-colors">Paintings &amp; Waterproofing</Link></li>
                <li><Link to="/home" className="hover:text-[var(--sevo-primary)] transition-colors">Masonry &amp; Civil Works</Link></li>
                <li><Link to="/home" className="hover:text-[var(--sevo-primary)] transition-colors">AC &amp; Appliance Repair</Link></li>
                <li><Link to="/trucks/hosur" className="hover:text-[var(--sevo-primary)] transition-colors">Goods &amp; Transports</Link></li>
              </ul>
            </div>

            {/* Col 3: Legal & Policies */}
            <div className="space-y-3">
              <h5 className="text-sm font-extrabold text-[var(--sevo-text-primary)]">Legal &amp; Policies</h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/terms" className="hover:text-[var(--sevo-primary)] transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link to="/privacy" className="hover:text-[var(--sevo-primary)] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/service-delivery" className="hover:text-[var(--sevo-primary)] transition-colors">Service Delivery Policy</Link></li>
                <li><Link to="/cancellation-refund" className="hover:text-[var(--sevo-primary)] transition-colors">Cancellation &amp; Refund</Link></li>
                <li><Link to="/help" className="hover:text-[var(--sevo-primary)] transition-colors">Help &amp; Support</Link></li>
              </ul>
            </div>

            {/* Col 4: Contact & Help */}
            <div className="space-y-3">
              <h5 className="text-sm font-extrabold text-[var(--sevo-text-primary)]">Customer Care</h5>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-[var(--sevo-primary)] shrink-0" />
                  <span>+91 98765 43210</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-[var(--sevo-primary)] shrink-0" />
                  <a href="mailto:support@caldimengg.com" className="hover:text-[var(--sevo-primary)] transition-colors">support@caldimengg.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--sevo-primary)] shrink-0" />
                  <span>Mon – Sun (8 AM – 8 PM)</span>
                </li>
                <li className="pt-1">
                  <Link to="/contact" className="text-xs font-extrabold text-[var(--sevo-primary)] hover:underline inline-flex items-center gap-1">
                    Contact Us / Grievance →
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[var(--sevo-border)] pt-6 text-center text-xs text-[var(--sevo-text-muted)]">
            © {new Date().getFullYear()} SEVO. All Rights Reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
