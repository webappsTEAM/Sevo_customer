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
      <div
        style={{
          position: "relative",
          left: "50%",
          right: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          width: "100vw",
          marginTop: "4rem"
        }}
      >
        {/* App Banner */}
        <div className="uc-paint-container" style={{ padding: "2rem 1.5rem 0" }}>
          <div className="uc-paint-app-banner">
            <div className="uc-paint-app-banner-left">
              <div className="uc-paint-app-banner-icon">
                <Smartphone size={24} style={{ color: "#ffffff" }} />
              </div>
              <div className="uc-paint-app-banner-text">
                <span className="uc-paint-app-banner-tag">Book on the go!</span>
                <h4 className="uc-paint-app-banner-title">Download the Sevo App</h4>
                <p className="uc-paint-app-banner-desc">Faster booking, real-time tracking &amp; exclusive app offers.</p>
              </div>
            </div>
            <div className="uc-paint-app-banner-right">
              <button className="uc-paint-store-btn">Get it on Google Play</button>
              <button className="uc-paint-store-btn" style={{ marginLeft: "1rem" }}>Download on App Store</button>
            </div>
          </div>
        </div>

        {/* Main Links Footer */}
        <div className="uc-paint-main-footer" style={{ backgroundColor: "#0B1225" }}>
          <div className="uc-paint-container uc-paint-main-footer-inner" style={{ padding: "0 1.5rem" }}>
            {/* Col 1: Brand & Corporate */}
            <div className="uc-paint-footer-col">
              <div className="uc-paint-footer-logo-row">
                <CalTrackLogo size={24} theme="dark" />
              </div>
              <p className="uc-paint-footer-brand-desc">
                Your trusted partner for doorstep home and commercial services. Quality, verified professionals, and transparent pricing.
              </p>
              <p style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.5rem", lineHeight: 1.4 }}>
                CALDIM ENGINEERING PRIVATE LIMITED<br />
                CIN: U72900KA2026PTC123456 • GSTIN: 33AAGCC4916J1ZP
              </p>
              <div className="uc-paint-footer-socials">
                <span className="uc-paint-social-icon"><FacebookMark style={{ width: 16, height: 16 }} /></span>
                <span className="uc-paint-social-icon"><InstagramMark style={{ width: 16, height: 16 }} /></span>
                <span className="uc-paint-social-icon"><YoutubeMark style={{ width: 16, height: 16 }} /></span>
                <span className="uc-paint-social-icon"><TwitterMark style={{ width: 16, height: 16 }} /></span>
              </div>
            </div>

            {/* Col 2: Services */}
            <div className="uc-paint-footer-col">
              <h5 className="uc-paint-footer-col-title">Services</h5>
              <ul className="uc-paint-footer-links">
                <li><Link to="/home" style={{ color: "inherit", textDecoration: "none" }}>Home Cleaning &amp; Pest Control</Link></li>
                <li><Link to="/home" style={{ color: "inherit", textDecoration: "none" }}>Paintings &amp; Waterproofing</Link></li>
                <li><Link to="/home" style={{ color: "inherit", textDecoration: "none" }}>Masonry &amp; Civil Works</Link></li>
                <li><Link to="/home" style={{ color: "inherit", textDecoration: "none" }}>AC &amp; Appliance Repair</Link></li>
                <li><Link to="/trucks/hosur" style={{ color: "inherit", textDecoration: "none" }}>Goods &amp; Transports</Link></li>
              </ul>
            </div>

            {/* Col 3: Legal & Policies */}
            <div className="uc-paint-footer-col">
              <h5 className="uc-paint-footer-col-title">Legal &amp; Policies</h5>
              <ul className="uc-paint-footer-links">
                <li><Link to="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms &amp; Conditions</Link></li>
                <li><Link to="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy Policy</Link></li>
                <li><Link to="/service-delivery" style={{ color: "inherit", textDecoration: "none" }}>Service Delivery Policy</Link></li>
                <li><Link to="/cancellation-refund" style={{ color: "inherit", textDecoration: "none" }}>Cancellation &amp; Refund</Link></li>
                <li><Link to="/help" style={{ color: "inherit", textDecoration: "none" }}>Help &amp; Support</Link></li>
              </ul>
            </div>

            {/* Col 4: Contact & Help */}
            <div className="uc-paint-footer-col">
              <h5 className="uc-paint-footer-col-title">Customer Care</h5>
              <ul className="uc-paint-footer-contact">
                <li>
                  <Phone size={14} />
                  <span>+91 98765 43210</span>
                </li>
                <li>
                  <Mail size={14} />
                  <a href="mailto:support@caldimengg.com" style={{ color: "inherit", textDecoration: "none" }}>support@caldimengg.com</a>
                </li>
                <li>
                  <Clock size={14} />
                  <span>Mon – Sun (8 AM – 8 PM)</span>
                </li>
                <li style={{ marginTop: "0.5rem" }}>
                  <Link to="/contact" style={{ color: "#34d399", fontWeight: 700, textDecoration: "none" }}>
                    Contact Us / Grievance →
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
