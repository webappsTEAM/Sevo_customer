/**
 * CustomerEntryFlowModal.jsx
 * Full Urban-Style Customer Entry Flow:
 * Login (Mobile +91) -> OTP -> Profile Setup -> Location
 */

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Phone, ArrowLeft, ShieldCheck, MapPin, Sparkles, User, Mail,
  CheckCircle2, AlertCircle, RefreshCcw, Search, Compass, ChevronRight, X,
  Lock, Home
} from "lucide-react"
import {
  apiRequestCustomerMobileOTP,
  apiVerifyCustomerMobileOTP,
  apiCompleteCustomerProfile,
  apiUpdateCustomerLastLocation,
  apiDetectCustomerLocation
} from "../../api/authService.js"
import { useAuth } from "../../state/auth/useAuth.js"

const MODAL_STYLES = `
  .cef-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
    background: rgba(2, 6, 23, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  .cef-card {
    width: 100%; max-width: 420px; background: #ffffff; border-radius: 28px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.12);
    overflow: hidden; position: relative; box-sizing: border-box;
  }
  .cef-header {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
    padding: 1.75rem 1.75rem 1.25rem; position: relative; overflow: hidden; box-sizing: border-box;
  }
  .cef-header::before {
    content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px;
    background: radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%); border-radius: 50%;
  }
  .cef-brand { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1; margin-bottom: 1rem; }
  .cef-brand-icon {
    width: 36px; height: 36px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; backdrop-filter: blur(8px);
  }
  .cef-brand-name { font-size: 0.9rem; font-weight: 800; color: rgba(255,255,255,0.95); letter-spacing: -0.01em; }
  .cef-header-title { font-size: 1.45rem; font-weight: 900; color: #ffffff; line-height: 1.2; position: relative; z-index: 1; margin: 0 0 4px; }
  .cef-header-sub { font-size: 0.78rem; color: rgba(196,181,253,0.85); font-weight: 500; position: relative; z-index: 1; margin: 0; }
  .cef-close {
    position: absolute; top: 1rem; right: 1rem; z-index: 10; width: 32px; height: 32px;
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; transition: background 0.2s;
  }
  .cef-close:hover { background: rgba(255,255,255,0.25); }
  .cef-steps {
    display: flex; align-items: center; gap: 6px; padding: 0.85rem 1.75rem;
    border-bottom: 1px solid #f1f5f9; background: #fafafa; box-sizing: border-box;
  }
  .cef-step-dot { height: 4px; border-radius: 99px; transition: all 0.4s; background: #e2e8f0; }
  .cef-step-dot.active { background: #6366f1; width: 24px !important; }
  .cef-step-dot.done { background: #10b981; }
  .cef-body { padding: 1.5rem 1.75rem 1.75rem; box-sizing: border-box; }
  .cef-error {
    display: flex; align-items: flex-start; gap: 10px; padding: 0.85rem 1rem;
    background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; margin-bottom: 1.25rem;
    font-size: 0.78rem; color: #be123c; font-weight: 600; line-height: 1.4; box-sizing: border-box;
  }
  .cef-label { display: block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 0.5rem; }
  .cef-input-wrap {
    position: relative; display: flex; align-items: center; background: #f8fafc;
    border: 1.5px solid #e2e8f0; border-radius: 14px; transition: all 0.2s; overflow: hidden; margin-bottom: 1rem; box-sizing: border-box; width: 100%;
  }
  .cef-input-wrap:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); background: #ffffff; }
  .cef-prefix {
    display: flex; align-items: center; gap: 6px; padding: 0 12px 0 14px;
    font-size: 0.82rem; font-weight: 800; color: #334155; border-right: 1.5px solid #e2e8f0;
    white-space: nowrap; height: 50px; background: #f1f5f9; flex-shrink: 0; box-sizing: border-box;
  }
  .cef-input { flex: 1; height: 50px; padding: 0 1rem; border: none; outline: none; background: transparent; font-size: 0.95rem; font-weight: 700; color: #0f172a; min-width: 0; box-sizing: border-box; }
  .cef-input::placeholder { color: #94a3b8; font-weight: 500; }
  .cef-input-plain {
    width: 100%; height: 50px; padding: 0 1rem 0 2.75rem; border: 1.5px solid #e2e8f0; border-radius: 14px;
    background: #f8fafc; font-size: 0.9rem; font-weight: 700; color: #0f172a; outline: none; transition: all 0.2s;
    box-sizing: border-box;
  }
  .cef-input-plain:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); background: #ffffff; }
  .cef-field-wrap { position: relative; margin-bottom: 1rem; width: 100%; box-sizing: border-box; }
  .cef-field-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .cef-btn {
    width: 100%; height: 50px; border: none; border-radius: 14px; font-size: 0.9rem; font-weight: 900; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; letter-spacing: 0.01em; box-sizing: border-box;
  }
  .cef-btn-primary { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
  .cef-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(99,102,241,0.4); }
  .cef-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .cef-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
  .cef-btn-secondary { background: #f8fafc; color: #334155; border: 1.5px solid #e2e8f0; }
  .cef-btn-secondary:hover { background: #f1f5f9; border-color: #cbd5e1; }
  .cef-back-btn {
    display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 800;
    color: #6366f1; background: none; border: none; cursor: pointer; margin-bottom: 1.25rem; padding: 0; transition: color 0.2s;
  }
  .cef-back-btn:hover { color: #4f46e5; }
  .otp-grid { display: flex; gap: 8px; justify-content: center; align-items: center; width: 100%; margin-bottom: 1.25rem; box-sizing: border-box; }
  .otp-box {
    flex: 1; width: 0; min-width: 0; height: 52px; text-align: center; font-size: 1.25rem; font-weight: 900; color: #1e1b4b;
    border: 2px solid #e2e8f0; border-radius: 12px; background: #f8fafc; outline: none;
    transition: all 0.18s; caret-color: #6366f1; box-sizing: border-box; padding: 0;
  }
  .otp-box:focus { border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 3px rgba(99,102,241,0.18), 0 4px 12px rgba(99,102,241,0.12); transform: scale(1.04); }
  .otp-box.filled { border-color: #6366f1; background: #ede9fe; color: #4f46e5; }
  .cef-divider { display: flex; align-items: center; gap: 12px; margin: 1rem 0; color: #94a3b8; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .cef-divider::before, .cef-divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
  .cef-google-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0.85rem;
    border: 1.5px solid #e2e8f0; border-radius: 14px; background: white; font-size: 0.85rem; font-weight: 700;
    color: #334155; cursor: pointer; transition: all 0.2s; margin-bottom: 0.75rem;
  }
  .cef-google-btn:hover { border-color: #6366f1; background: #faf5ff; }
  .cef-tos { font-size: 0.7rem; color: #94a3b8; text-align: center; line-height: 1.6; margin-top: 0.75rem; }
  .cef-tos a { color: #6366f1; font-weight: 700; cursor: pointer; }
  .cef-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.6rem; font-weight: 900; margin: 0 auto 1rem; box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
  .cef-location-card { border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 1.1rem 1.25rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 0.75rem; }
  .cef-location-card:hover { border-color: #6366f1; background: #faf5ff; box-shadow: 0 4px 16px rgba(99,102,241,0.1); transform: translateY(-1px); }
  .cef-location-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cef-trust-strip { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 0.75rem 0 0; flex-wrap: wrap; }
  .cef-trust-item { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; font-weight: 700; color: #64748b; }
`

export function CustomerEntryFlowModal({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1)
  const { refreshMe } = useAuth()
  const [mobileNumber, setMobileNumber] = useState("")
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [customerId, setCustomerId] = useState(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [manualLocationInput, setManualLocationInput] = useState("")
  const [showManualLocation, setShowManualLocation] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [attemptsRemaining, setAttemptsRemaining] = useState(null)
  const [resendTimer, setResendTimer] = useState(0)
  const [devOtp, setDevOtp] = useState("")
  const [detectedLocationData, setDetectedLocationData] = useState(null)
  const otpInputRefs = useRef([])

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev > 0 ? prev - 1 : 0), 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  if (!isOpen) return null

  const handleRequestOTP = async (overrideMobile = null) => {
    const targetMobile = overrideMobile || mobileNumber.trim()
    if (!/^[6-9]\d{9}$/.test(targetMobile)) { setErrorMsg("Please enter a valid 10-digit Indian mobile number."); return }
    setLoading(true); setErrorMsg(""); setAttemptsRemaining(null)
    try {
      const res = await apiRequestCustomerMobileOTP(targetMobile)
      if (res.success) {
        setResendTimer(res.data?.resend_after_seconds || 60)
        setDevOtp(res.data?.dev_otp || "")
        setOtpDigits(["", "", "", "", "", ""])
        setStep(2)
      } else {
        const msg = res.error?.message || "Failed to request OTP."
        if (res.error?.code === "RATE_LIMITED" && res.error?.resend_after_seconds) setResendTimer(res.error.resend_after_seconds)
        setErrorMsg(msg)
      }
    } catch (e) { setErrorMsg(e?.body?.error?.message || e?.body?.detail || e?.message || "Server error.") }
    finally { setLoading(false) }
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const newDigits = [...otpDigits]
      digits.forEach((d, i) => { if (index + i < 6) newDigits[index + i] = d })
      setOtpDigits(newDigits)
      const nextFocus = Math.min(index + digits.length, 5)
      otpInputRefs.current[nextFocus]?.focus()
      if (newDigits.every(d => d) && digits.length >= (6 - index)) setTimeout(() => handleVerifyOTP(newDigits.join("")), 80)
      return
    }
    const clean = value.replace(/\D/g, "")
    const newDigits = [...otpDigits]; newDigits[index] = clean; setOtpDigits(newDigits)
    if (clean && index < 5) otpInputRefs.current[index + 1]?.focus()
    if (newDigits.every(d => d) && clean) setTimeout(() => handleVerifyOTP(newDigits.join("")), 80)
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) otpInputRefs.current[index - 1]?.focus()
  }

  const handleVerifyOTP = async (forcedOtp = null) => {
    const otpCode = forcedOtp || otpDigits.join("")
    if (otpCode.length < 6) return
    setLoading(true); setErrorMsg("")
    try {
      const res = await apiVerifyCustomerMobileOTP(mobileNumber, otpCode)
      if (res.success) {
        const { is_new_customer, customer_id } = res.data || {}
        setCustomerId(customer_id)
        if (typeof refreshMe === "function") await refreshMe()
        if (is_new_customer) { setStep(3) } else { if (typeof onComplete === "function") onComplete(); onClose() }
      } else {
        if (res.error?.code === "MAX_ATTEMPTS_EXCEEDED") {
          setErrorMsg("Too many failed attempts. Please request a new OTP.")
          setOtpDigits(["", "", "", "", "", ""]); setStep(1)
        } else {
          if (res.error?.attempts_remaining !== undefined) setAttemptsRemaining(res.error.attempts_remaining)
          setErrorMsg(res.error?.message || "Invalid OTP.")
        }
      }
    } catch (e) { setErrorMsg(e?.body?.error?.message || e?.body?.detail || e?.message || "Verification error.") }
    finally { setLoading(false) }
  }

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) { setErrorMsg("Full Name is required."); return }
    setLoading(true); setErrorMsg("")
    try {
      const res = await apiCompleteCustomerProfile(customerId, fullName.trim(), email.trim() || null)
      if (res.success) { if (typeof refreshMe === "function") await refreshMe(); setStep(4) }
      else setErrorMsg(res.error?.message || "Failed to complete profile.")
    } catch (e) { setErrorMsg(e?.body?.error?.message || e?.message || "Error completing profile.") }
    finally { setLoading(false) }
  }


  const handleAllowLocation = () => {
    if (geoLoading) return
    if (!navigator.geolocation) {
      setErrorMsg("Unable to detect your location. Please try again.")
      setShowManualLocation(true)
      return
    }
    setGeoLoading(true)
    setErrorMsg("")

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const acc = pos.coords.accuracy

          const res = await apiDetectCustomerLocation(lat, lng, acc)
          if (res && res.success && res.data) {
            const locData = res.data
            setDetectedLocationData(locData)

            const labelStr = [locData.area, locData.city, locData.state].filter(Boolean).join(", ")
            await apiUpdateCustomerLastLocation({
              latitude: lat,
              longitude: lng,
              label: labelStr || locData.formatted_address || "Current Location",
              detected_at: new Date().toISOString()
            })

            if (typeof onComplete === "function") onComplete(locData)
            onClose()
          } else {
            setErrorMsg(res?.error || "Unable to fetch your location. Please try again.")
            setShowManualLocation(true)
          }
        } catch (e) {
          setErrorMsg("Unable to fetch your location. Please try again.")
          setShowManualLocation(true)
        } finally {
          setGeoLoading(false)
        }
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === 1) {
          setErrorMsg("Location permission denied. Please allow location access or search manually.")
        } else if (err.code === 2) {
          setErrorMsg("Unable to detect your location. Please try again.")
        } else if (err.code === 3) {
          setErrorMsg("Location request timed out. Please try again.")
        } else {
          setErrorMsg("Unable to detect your location. Please try again.")
        }
        setShowManualLocation(true)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleSaveManualLocation = async () => {
    if (!manualLocationInput.trim()) { setErrorMsg("Please enter a location."); return }
    setLoading(true)
    try { await apiUpdateCustomerLastLocation({ label: manualLocationInput.trim(), manual: true, updated_at: new Date().toISOString() }) } catch (e) { console.warn(e) }
    finally { setLoading(false); if (typeof onComplete === "function") onComplete(); onClose() }
  }

  const STEP_TITLES = {
    1: { title: "Welcome Back", sub: "Enter your mobile to receive an OTP" },
    2: { title: "Verify OTP", sub: `Code sent to +91 ${mobileNumber}` },
    3: { title: "Your Profile", sub: "Tell us your name to personalize" },
    4: { title: "Your Location", sub: "Help us find pros near you" },
  }

  const initials = fullName.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || null

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="cef-overlay" onClick={onClose}>
        <motion.div
          className="cef-card"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="cef-header">
            <div className="cef-brand">
              <div className="cef-brand-icon"><Home size={18} /></div>
              <span className="cef-brand-name">CalServices</span>
            </div>
            <h2 className="cef-header-title">{STEP_TITLES[step]?.title}</h2>
            <p className="cef-header-sub">{STEP_TITLES[step]?.sub}</p>
            <button className="cef-close" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Step dots */}
          <div className="cef-steps">
            {[1,2,3,4].map(s => (
              <div key={s} className={`cef-step-dot ${step === s ? "active" : step > s ? "done" : ""}`} style={{ width: step === s ? 24 : 8 }} />
            ))}
            <span style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8" }}>Step {step} of 4</span>
          </div>

          {/* Body */}
          <div className="cef-body">
            <AnimatePresence>
              {errorMsg && (
                <motion.div className="cef-error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 1 — Mobile */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <label className="cef-label">Mobile Number</label>
                <div className="cef-input-wrap">
                  <div className="cef-prefix"><span>🇮🇳</span><span>+91</span></div>
                  <input type="tel" className="cef-input" maxLength={10} value={mobileNumber}
                    onChange={e => { setMobileNumber(e.target.value.replace(/\D/g,"")); if(errorMsg) setErrorMsg("") }}
                    placeholder="10-digit mobile number" autoFocus />
                  {mobileNumber.length === 10 && <CheckCircle2 size={18} style={{ marginRight: 12, color: "#10b981", flexShrink: 0 }} />}
                </div>
                <button className="cef-btn cef-btn-primary" disabled={loading || !/^[6-9]\d{9}$/.test(mobileNumber)} onClick={() => handleRequestOTP()} style={{ marginBottom: "1rem" }}>
                  {loading ? <RefreshCcw size={16} className="animate-spin" /> : <><span>Continue</span><ChevronRight size={16} /></>}
                </button>
                <div className="cef-divider">or continue with</div>
                <button className="cef-google-btn" onClick={() => alert("Google Login coming soon.")}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  Continue with Google
                </button>
                <p className="cef-tos">By continuing, you agree to CalServices' <a>Terms of Service</a> &amp; <a>Privacy Policy</a></p>
                <div className="cef-trust-strip">
                  <span className="cef-trust-item"><ShieldCheck size={13} style={{ color: "#10b981" }} /> Verified Pros</span>
                  <span className="cef-trust-item"><Lock size={13} style={{ color: "#6366f1" }} /> 100% Secure</span>
                  <span className="cef-trust-item">⭐ 4.8 Rated</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — OTP */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <button className="cef-back-btn" onClick={() => { setStep(1); setErrorMsg(""); setOtpDigits(["","","","","",""]); }}>
                  <ArrowLeft size={14} /> Change Number (+91 {mobileNumber})
                </button>
                {attemptsRemaining !== null && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "0.65rem 1rem", marginBottom: "1rem", fontSize: "0.78rem", fontWeight: 700, color: "#c2410c", textAlign: "center" }}>
                    ⚠️ {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                  </div>
                )}
                {devOtp && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "0.6rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.78rem", fontWeight: 700, color: "#166534" }}>
                    <span>🔑 Dev OTP: <strong style={{ letterSpacing: "0.1em", fontSize: "0.88rem" }}>{devOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split("")
                        setOtpDigits(digits)
                        setTimeout(() => handleVerifyOTP(devOtp), 80)
                      }}
                      style={{ background: "#166534", color: "white", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      Auto-fill
                    </button>
                  </div>
                )}
                <label className="cef-label">Enter 6-digit code</label>
                <div className="otp-grid">
                  {otpDigits.map((digit, i) => (
                    <input key={i} ref={el => otpInputRefs.current[i] = el} type="text" inputMode="numeric" maxLength={6}
                      value={digit} className={`otp-box ${digit ? "filled" : ""}`}
                      onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => e.target.select()} autoFocus={i === 0} />
                  ))}
                </div>
                <button className="cef-btn cef-btn-primary" disabled={loading || otpDigits.some(d => !d)} onClick={() => handleVerifyOTP()} style={{ marginBottom: "1rem" }}>
                  {loading ? <RefreshCcw size={16} className="animate-spin" /> : <><span>Verify &amp; Continue</span><ChevronRight size={16} /></>}
                </button>
                <div style={{ textAlign: "center" }}>
                  {resendTimer > 0
                    ? <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>Resend code in <strong style={{ color: "#6366f1" }}>{resendTimer}s</strong></span>
                    : <button onClick={() => handleRequestOTP()} style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6366f1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Didn't receive code? Resend OTP</button>
                  }
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Profile */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="cef-avatar">{initials ? initials : <User size={28} />}</div>
                <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#64748b", fontWeight: 600, marginBottom: "1.25rem" }}>Almost there! Tell us your name.</p>
                <div className="cef-field-wrap">
                  <label className="cef-label">Full Name *</label>
                  <User size={16} />
                  <input type="text" className="cef-input-plain" value={fullName}
                    onChange={e => { setFullName(e.target.value); if(errorMsg) setErrorMsg("") }} placeholder="e.g. Ramesh Sharma" autoFocus />
                </div>
                <div className="cef-field-wrap">
                  <label className="cef-label">Email Address <span style={{ color: "#94a3b8", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(Optional)</span></label>
                  <Mail size={16} />
                  <input type="email" className="cef-input-plain" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. ramesh@example.com" />
                </div>
                <button className="cef-btn cef-btn-primary" disabled={loading || !fullName.trim()} onClick={handleCompleteProfile}>
                  {loading ? <RefreshCcw size={16} className="animate-spin" /> : <><span>Continue to Location</span><ChevronRight size={16} /></>}
                </button>
              </motion.div>
            )}

            {/* STEP 4 — Location */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#ede9fe,#ddd6fe)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", boxShadow: "0 8px 24px rgba(99,102,241,0.15)" }}>
                    <MapPin size={28} style={{ color: "#6366f1" }} />
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, maxWidth: 280, margin: "0 auto" }}>
                    We use your location to show available professionals near you.
                  </p>
                </div>
                {!showManualLocation ? (
                  <>
                    <div className="cef-location-card" onClick={!geoLoading ? handleAllowLocation : undefined} style={{ cursor: geoLoading ? "wait" : "pointer" }}>
                      <div className="cef-location-icon" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                        {geoLoading ? <RefreshCcw size={20} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} /> : <Compass size={20} style={{ color: "#6366f1" }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{geoLoading ? "Detecting Location..." : "Allow Location Access"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Automatically detect your current location</div>
                      </div>
                      <ChevronRight size={16} style={{ color: "#94a3b8" }} />
                    </div>
                    <div className="cef-location-card" onClick={() => setShowManualLocation(true)}>
                      <div className="cef-location-icon" style={{ background: "#f1f5f9" }}>
                        <Search size={20} style={{ color: "#64748b" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Enter Location Manually</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Type your city, area or pincode</div>
                      </div>
                      <ChevronRight size={16} style={{ color: "#94a3b8" }} />
                    </div>
                    <button onClick={() => { if(typeof onComplete === "function") onComplete(); onClose(); }}
                      style={{ width: "100%", background: "none", border: "none", padding: "0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", cursor: "pointer", textAlign: "center", marginTop: "0.25rem" }}>
                      Skip for now
                    </button>
                  </>
                ) : (
                  <>
                    <button className="cef-back-btn" onClick={() => { setShowManualLocation(false); setErrorMsg(""); }}><ArrowLeft size={14} /> Back to options</button>
                    <div className="cef-field-wrap">
                      <label className="cef-label">City or Area Name</label>
                      <MapPin size={16} />
                      <input type="text" className="cef-input-plain" value={manualLocationInput}
                        onChange={e => { setManualLocationInput(e.target.value); if(errorMsg) setErrorMsg("") }}
                        placeholder="e.g. Koramangala, Bangalore" autoFocus />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="cef-btn cef-btn-secondary" style={{ flex: 1 }} onClick={() => setShowManualLocation(false)}>Back</button>
                      <button className="cef-btn cef-btn-primary" style={{ flex: 2 }} disabled={loading || !manualLocationInput.trim()} onClick={handleSaveManualLocation}>
                        {loading ? <RefreshCcw size={16} className="animate-spin" /> : "Save Location"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
