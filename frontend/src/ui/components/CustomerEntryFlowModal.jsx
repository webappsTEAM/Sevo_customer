/**
 * CustomerEntryFlowModal.jsx
 * Professional, Clean & Refined Customer Authentication & Onboarding Modal
 * CalServices Signature Emerald & Modern Typography Design
 */

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Phone, ArrowLeft, ShieldCheck, MapPin, User, Mail,
  CheckCircle2, AlertCircle, RefreshCcw, Search, Compass, ChevronRight, X,
  Lock, Home, Check, Sparkles
} from "lucide-react"
import {
  apiRequestCustomerOTP,
  apiVerifyCustomerOTP,
  apiCompleteCustomerProfile,
} from "../../api/authService.js"
import { useAuth } from "../../state/auth/useAuth.js"

const MODAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .cef-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 1.25rem;
    background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  }
  .cef-card-clean {
    width: 100%; max-width: 440px; background: #ffffff;
    border-radius: 28px; position: relative; overflow: hidden;
    box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.9) inset, 0 1px 3px rgba(0,0,0,0.06);
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* Top Bar */
  .cef-header-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.75rem 2rem 0.5rem;
  }
  .cef-brand-group { display: flex; align-items: center; gap: 10px; }
  .cef-brand-logo-sq {
    width: 36px; height: 36px; border-radius: 11px;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    display: flex; align-items: center; justify-content: center; color: #ffffff;
    box-shadow: 0 6px 14px rgba(5, 150, 105, 0.28);
  }
  .cef-brand-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
  .cef-brand-pill {
    font-size: 0.68rem; font-weight: 700; color: #047857; background: #ecfdf5;
    border: 1px solid #a7f3d0; padding: 2px 9px; border-radius: 20px; letter-spacing: 0.01em;
  }
  .cef-close-circle {
    width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; border: none;
    display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .cef-close-circle:hover { background: #e2e8f0; color: #0f172a; transform: scale(1.06); }

  /* Body Content */
  .cef-body-wrap { padding: 1.15rem 2rem 1.85rem; }
  .cef-title-main { font-size: 1.42rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.025em; line-height: 1.25; }
  .cef-title-sub { font-size: 0.82rem; color: #64748b; margin: 0 0 1.25rem; line-height: 1.45; font-weight: 500; }

  /* Step Progress */
  .cef-progress-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1.35rem; padding-bottom: 0.85rem; border-bottom: 1px solid #f1f5f9;
  }
  .cef-progress-dots { display: flex; align-items: center; gap: 6px; }
  .cef-dot-item { height: 4px; border-radius: 99px; background: #e2e8f0; width: 14px; transition: all 0.35s ease; }
  .cef-dot-item.active { background: #059669; width: 32px; box-shadow: 0 0 8px rgba(5, 150, 105, 0.35); }
  .cef-dot-item.done { background: #10b981; width: 14px; }
  .cef-step-count { font-size: 0.72rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.02em; }

  /* Segmented Switcher */
  .cef-segmented-tab {
    display: flex; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
    padding: 3.5px; margin-bottom: 1.25rem;
  }
  .cef-tab-button {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 12px; border-radius: 11px; font-weight: 700; font-size: 0.82rem;
    border: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s;
  }
  .cef-tab-button.active {
    background: #ffffff; color: #064e3b; font-weight: 800;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
  }

  /* Form Fields */
  .cef-label-tag {
    display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 0.45rem;
  }
  .cef-req-star { color: #059669; font-weight: 800; }
  
  .cef-input-field-group {
    position: relative; display: flex; align-items: center; background: #f8fafc;
    border: 1.5px solid #cbd5e1; border-radius: 14px; transition: all 0.2s; overflow: hidden;
    margin-bottom: 1.25rem; width: 100%; height: 50px; box-sizing: border-box;
  }
  .cef-input-field-group:hover { border-color: #94a3b8; background: #ffffff; }
  .cef-input-field-group:focus-within {
    border-color: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12); background: #ffffff;
  }
  .cef-prefix-box {
    display: flex; align-items: center; gap: 6px; padding: 0 14px;
    font-size: 0.88rem; font-weight: 800; color: #064e3b; border-right: 1.5px solid #e2e8f0;
    height: 100%; background: #f1f5f9; flex-shrink: 0;
  }
  .cef-input-core {
    flex: 1; height: 100%; padding: 0 1rem; border: none; outline: none; background: transparent;
    font-size: 0.95rem; font-weight: 700; color: #0f172a; min-width: 0; font-family: inherit;
  }
  .cef-input-core::placeholder { color: #94a3b8; font-weight: 400; }

  .cef-single-input-card { position: relative; margin-bottom: 1.25rem; width: 100%; box-sizing: border-box; }
  .cef-single-icon { position: absolute; left: 14px; top: 38px; color: #94a3b8; pointer-events: none; }
  .cef-single-field {
    width: 100%; height: 50px; padding: 0 1rem 0 2.85rem; border: 1.5px solid #cbd5e1; border-radius: 14px;
    background: #f8fafc; font-size: 0.92rem; font-weight: 600; color: #0f172a; outline: none; transition: all 0.2s;
    box-sizing: border-box; font-family: inherit;
  }
  .cef-single-field:hover { border-color: #94a3b8; background: #ffffff; }
  .cef-single-field:focus { border-color: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12); background: #ffffff; }
  .cef-single-field::placeholder { color: #94a3b8; font-weight: 400; }

  /* Avatar in Step 3 */
  .cef-avatar-center-wrap {
    display: flex; justify-content: center; margin-bottom: 1.35rem; position: relative;
  }
  .cef-avatar-circle-badge {
    width: 68px; height: 68px; border-radius: 50%;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 8px 24px -4px rgba(5, 150, 105, 0.35), 0 0 0 4px rgba(5, 150, 105, 0.12);
    display: flex; align-items: center; justify-content: center; color: #ffffff;
    font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;
  }

  /* Action Buttons */
  .cef-btn-primary-green {
    width: 100%; height: 50px; border: none; border-radius: 14px; font-size: 0.92rem; font-weight: 800; cursor: pointer;
    background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; display: flex;
    align-items: center; justify-content: center; gap: 8px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 8px 24px -4px rgba(5, 150, 105, 0.42); font-family: inherit; letter-spacing: 0.01em;
  }
  .cef-btn-primary-green:hover:not(:disabled) {
    background: linear-gradient(135deg, #047857 0%, #065f46 100%); transform: translateY(-1px);
    box-shadow: 0 12px 28px -4px rgba(5, 150, 105, 0.52);
  }
  .cef-btn-primary-green:active:not(:disabled) { transform: translateY(0); }
  .cef-btn-primary-green:disabled {
    background: #e2e8f0; color: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none;
  }

  .cef-divider-clean {
    display: flex; align-items: center; gap: 12px; margin: 1.15rem 0;
    color: #94a3b8; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .cef-divider-clean::before, .cef-divider-clean::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }

  .cef-google-sso-btn {
    width: 100%; height: 48px; border: 1.5px solid #cbd5e1; border-radius: 14px; background: #ffffff;
    font-size: 0.88rem; font-weight: 700; color: #1e293b; cursor: pointer; display: flex;
    align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; font-family: inherit;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .cef-google-sso-btn:hover:not(:disabled) {
    border-color: #059669; background: #f0fdf4; transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.08);
  }
  .cef-google-sso-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Error Banner */
  .cef-alert-box {
    display: flex; align-items: flex-start; gap: 9px; padding: 0.8rem 1rem;
    background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 14px; margin-bottom: 1.15rem;
    font-size: 0.8rem; color: #be123c; font-weight: 600; line-height: 1.4;
  }

  /* OTP */
  .cef-otp-row { display: flex; gap: 8px; justify-content: center; align-items: center; width: 100%; margin-bottom: 1.25rem; }
  .cef-otp-box {
    flex: 1; width: 0; min-width: 0; height: 54px; text-align: center; font-size: 1.4rem; font-weight: 800;
    color: #064e3b; border: 2px solid #cbd5e1; border-radius: 14px; background: #f8fafc; outline: none;
    transition: all 0.18s; caret-color: #059669; box-sizing: border-box; padding: 0; font-family: inherit;
  }
  .cef-otp-box:focus {
    border-color: #059669; background: #ffffff; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.16);
    transform: scale(1.04);
  }
  .cef-otp-box.filled { border-color: #059669; background: #ecfdf5; color: #047857; }

  /* Bottom Trust Strip */
  .cef-trust-row {
    display: flex; align-items: center; justify-content: center; gap: 14px;
    padding-top: 1rem; margin-top: 1.15rem; border-top: 1px solid #f1f5f9;
    font-size: 0.72rem; font-weight: 700; color: #64748b; flex-wrap: wrap;
  }
`

export function CustomerEntryFlowModal({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1)
  const { refreshMe, loginWithCustomerGoogle } = useAuth()
  const [channel, setChannel] = useState("PHONE") // "PHONE" | "EMAIL"
  const [mobileNumber, setMobileNumber] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [customerId, setCustomerId] = useState(null)
  const [fullName, setFullName] = useState("")
  const [secondIdentifier, setSecondIdentifier] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successToast, setSuccessToast] = useState("")
  const [attemptsRemaining, setAttemptsRemaining] = useState(null)
  const [devOtp, setDevOtp] = useState("")
  const [resendCooldown, setResendCooldown] = useState(30)

  const otpInputRefs = useRef([])
  const isVerifyingRef = useRef(false)
  const timerRef = useRef(null)

  // Reset all modal fields and return to Step 1 whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setChannel("PHONE")
      setMobileNumber("")
      setEmailInput("")
      setOtpDigits(["", "", "", "", "", ""])
      setCustomerId(null)
      setFullName("")
      setSecondIdentifier("")
      setLoading(false)
      setErrorMsg("")
      setSuccessToast("")
      setAttemptsRemaining(null)
      setDevOtp("")
      setResendCooldown(30)
    }
  }, [isOpen])

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (step === 2 && resendCooldown > 0) {
      timerRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step, resendCooldown])

  if (!isOpen) return null

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const identifier = channel === "EMAIL" ? emailInput.trim() : mobileNumber.trim()
  const isIdentifierValid = channel === "EMAIL"
    ? EMAIL_RE.test(identifier)
    : /^[6-9]\d{9}$/.test(identifier)

  // ── 2. Request OTP ────────────────────────────────────────────────────────
  const handleRequestOTP = async (isResend = false) => {
    if (!isIdentifierValid) {
      setErrorMsg(channel === "EMAIL" ? "Please enter a valid email address." : "Please enter a valid 10-digit mobile number.")
      return
    }
    setLoading(true)
    setErrorMsg("")
    setSuccessToast("")
    if (!isResend) setAttemptsRemaining(null)

    try {
      const res = await apiRequestCustomerOTP(identifier, channel)
      if (res && res.success) {
        setDevOtp(res.data?.dev_otp || "")
        setResendCooldown(30)
        if (isResend) {
          setSuccessToast("New OTP sent successfully!")
          setTimeout(() => setSuccessToast(""), 4000)
        } else {
          setOtpDigits(["", "", "", "", "", ""])
          setStep(2)
        }
      } else {
        setErrorMsg(res?.error?.message || "Failed to request OTP. Please try again.")
      }
    } catch (e) {
      setErrorMsg(e?.body?.error?.message || e?.body?.detail || e?.message || "Server error requesting OTP.")
    } finally {
      setLoading(false)
    }
  }

  // ── 3. OTP Digit Handling ────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, "")
    if (!clean) {
      const newDigits = [...otpDigits]
      newDigits[index] = ""
      setOtpDigits(newDigits)
      return
    }

    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split("")
      const newDigits = [...otpDigits]
      const startIdx = digits.length >= 6 ? 0 : index
      digits.forEach((d, i) => {
        if (startIdx + i < 6) newDigits[startIdx + i] = d
      })
      setOtpDigits(newDigits)
      const nextFocus = Math.min(startIdx + digits.length, 5)
      otpInputRefs.current[nextFocus]?.focus()
      const code = newDigits.join("")
      if (code.length === 6 && newDigits.every(d => Boolean(d))) {
        setTimeout(() => handleVerifyOTP(code), 40)
      }
      return
    }

    const singleDigit = clean.slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = singleDigit
    setOtpDigits(newDigits)

    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
    const code = newDigits.join("")
    if (code.length === 6 && newDigits.every(d => Boolean(d))) {
      setTimeout(() => handleVerifyOTP(code), 40)
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const digits = pasted.split("")
    const newDigits = ["", "", "", "", "", ""]
    digits.forEach((d, i) => { newDigits[i] = d })
    setOtpDigits(newDigits)
    if (digits.length === 6) {
      setTimeout(() => handleVerifyOTP(pasted), 40)
    } else {
      otpInputRefs.current[Math.min(digits.length, 5)]?.focus()
    }
  }

  // ── 4. Verify OTP ─────────────────────────────────────────────────────────
  const handleVerifyOTP = async (forcedOtp = null) => {
    const otpCode = (forcedOtp || otpDigits.join("")).trim()
    if (otpCode.length < 6 || isVerifyingRef.current) return

    isVerifyingRef.current = true
    setLoading(true)
    setErrorMsg("")

    try {
      const res = await apiVerifyCustomerOTP(identifier, channel, otpCode)

      if (res && res.success) {
        const { is_new_customer, customer_id, auth_token, access, user } = res.data || {}
        setCustomerId(customer_id)
        if (is_new_customer) {
          setStep(3)
        } else {
          if (typeof refreshMe === "function") await refreshMe()
          if (typeof onComplete === "function") onComplete()
          onClose()
        }
      } else {
        const errCode = res?.error?.code
        if (errCode === "MAX_ATTEMPTS_EXCEEDED") {
          setErrorMsg("Too many failed attempts. Please request a new OTP.")
          setOtpDigits(["", "", "", "", "", ""])
          setStep(1)
        } else {
          if (res?.error?.attempts_remaining !== undefined) setAttemptsRemaining(res.error.attempts_remaining)
          setErrorMsg(res?.error?.message || res?.error || "Invalid OTP code. Please check and re-enter.")
          otpInputRefs.current[0]?.focus()
        }
      }
    } catch (e) {
      const serverMsg = e?.body?.error?.message || e?.body?.error || e?.body?.detail || e?.message || "Verification error."
      setErrorMsg(serverMsg)
    } finally {
      setLoading(false)
      isVerifyingRef.current = false
    }
  }

  // ── 5. Profile Completion (Step 3) ────────────────────────────────────────
  // secondIdentifier (email when phone was used, or vice versa) is OPTIONAL.
  // The backend apiCompleteCustomerProfile accepts an empty profileArgs object.
  const secondChannel = channel === "EMAIL" ? "PHONE" : "EMAIL"
  const secondIdentifierTrimmed = secondIdentifier.trim()
  const isSecondIdentifierValid = !secondIdentifierTrimmed || (
    secondChannel === "EMAIL"
      ? EMAIL_RE.test(secondIdentifierTrimmed)
      : /^[6-9]\d{9}$/.test(secondIdentifierTrimmed)
  )

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) { setErrorMsg("Full Name is required."); return }
    if (secondIdentifierTrimmed && !isSecondIdentifierValid) {
      setErrorMsg(secondChannel === "EMAIL" ? "Please enter a valid email address." : "Please enter a valid 10-digit mobile number.")
      return
    }
    setLoading(true)
    setErrorMsg("")

    try {
      // Build optional profile args — only include second identifier if provided
      const profileArgs = {}
      if (secondIdentifierTrimmed) {
        if (secondChannel === "EMAIL") profileArgs.email = secondIdentifierTrimmed
        else profileArgs.phone = secondIdentifierTrimmed
      }
      const res = await apiCompleteCustomerProfile(customerId, fullName.trim(), profileArgs)
      if (res && res.success) {
        // Profile complete — refresh session and close modal immediately.
        // Location/address is handled by the booking flow, NOT here.
        if (typeof refreshMe === "function") await refreshMe()
        if (typeof onComplete === "function") onComplete()
        onClose()
      } else {
        setErrorMsg(res?.error?.message || "Failed to complete profile.")
      }
    } catch (e) {
      setErrorMsg(e?.body?.error?.message || e?.message || "Error completing profile.")
    } finally {
      setLoading(false)
    }
  }

  const STEP_TITLES = {
    1: { title: "Welcome Back", sub: channel === "EMAIL" ? "Enter your email address to receive an instant verification code" : "Enter your mobile number to receive an instant verification code" },
    2: { title: "Verify OTP", sub: channel === "EMAIL" ? `6-digit verification code sent to ${emailInput}` : `6-digit verification code sent to +91 ${mobileNumber}` },
    3: { title: "Create Profile", sub: "Just your name — we'll handle the rest" },
  }

  const initials = fullName.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || null

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="cef-overlay" onClick={onClose}>
        <motion.div
          className="cef-card-clean"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top Brand Header */}
          <div className="cef-header-top">
            <div className="cef-brand-group">
              <div className="cef-brand-logo-sq">
                <Home size={19} strokeWidth={2.2} />
              </div>
              <span className="cef-brand-title">Sevo</span>
              <span className="cef-brand-pill">Customer Access</span>
            </div>
            <button className="cef-close-circle" onClick={onClose} aria-label="Close modal">
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          <div className="cef-body-wrap">
            {/* Title & Subtitle */}
            <h2 className="cef-title-main">{STEP_TITLES[step]?.title}</h2>
            <p className="cef-title-sub">{STEP_TITLES[step]?.sub}</p>

            {/* Step Progress Tracker */}
            <div className="cef-progress-row">
              <div className="cef-progress-dots">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className={`cef-dot-item ${step === s ? "active" : step > s ? "done" : ""}`}
                  />
                ))}
              </div>
              <span className="cef-step-count">Step {step} of {step === 3 ? "3" : "3"}</span>
            </div>

            {/* Error & Success Messages */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  className="cef-alert-box"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
              {successToast && (
                <motion.div
                  className="cef-alert-box"
                  style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#15803d" }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{successToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 1: Phone / Email Login */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                <div className="cef-segmented-tab">
                  <button
                    type="button"
                    className={`cef-tab-button ${channel === "PHONE" ? "active" : ""}`}
                    onClick={() => { setChannel("PHONE"); setErrorMsg("") }}
                  >
                    <Phone size={14} style={{ color: channel === "PHONE" ? "#059669" : "#64748b" }} />
                    Phone Number
                  </button>
                  <button
                    type="button"
                    className={`cef-tab-button ${channel === "EMAIL" ? "active" : ""}`}
                    onClick={() => { setChannel("EMAIL"); setErrorMsg("") }}
                  >
                    <Mail size={14} style={{ color: channel === "EMAIL" ? "#059669" : "#64748b" }} />
                    Email Address
                  </button>
                </div>

                {channel === "PHONE" ? (
                  <>
                    <label className="cef-label-tag">
                      <span>Mobile Number</span>
                      <span className="cef-req-star">*</span>
                    </label>
                    <div className="cef-input-field-group">
                      <div className="cef-prefix-box">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        className="cef-input-core"
                        maxLength={10}
                        value={mobileNumber}
                        onChange={e => {
                          setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                          if (errorMsg) setErrorMsg("")
                        }}
                        onKeyDown={e => { if (e.key === "Enter" && isIdentifierValid) handleRequestOTP() }}
                        placeholder="10-digit mobile number"
                        autoFocus
                      />
                      {mobileNumber.length === 10 && (
                        <CheckCircle2 size={18} style={{ marginRight: 14, color: "#10b981", flexShrink: 0 }} />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="cef-single-input-card">
                    <label className="cef-label-tag">
                      <span>Email Address</span>
                      <span className="cef-req-star">*</span>
                    </label>
                    <Mail size={16} className="cef-single-icon" />
                    <input
                      type="email"
                      className="cef-single-field"
                      value={emailInput}
                      onChange={e => {
                        setEmailInput(e.target.value)
                        if (errorMsg) setErrorMsg("")
                      }}
                      onKeyDown={e => { if (e.key === "Enter" && isIdentifierValid) handleRequestOTP() }}
                      placeholder="e.g. ramesh@example.com"
                      autoFocus
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="cef-btn-primary-green"
                  disabled={loading || !isIdentifierValid}
                  onClick={() => handleRequestOTP()}
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Get OTP Code</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                <div className="cef-trust-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ShieldCheck size={13} style={{ color: "#059669" }} /> Verified Pros
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Lock size={13} style={{ color: "#059669" }} /> 256-Bit SSL
                  </span>
                  <span>⭐ 4.8 / 5 Rating</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                <button
                  type="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer", marginBottom: "1.1rem", padding: 0, fontFamily: "inherit" }}
                  onClick={() => {
                    setStep(1)
                    setErrorMsg("")
                    setOtpDigits(["", "", "", "", "", ""])
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>{channel === "EMAIL" ? `Change Email (${emailInput})` : `Change Number (+91 ${mobileNumber})`}</span>
                </button>

                {attemptsRemaining !== null && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "0.6rem 0.9rem", marginBottom: "0.9rem", fontSize: "0.78rem", fontWeight: 700, color: "#c2410c", textAlign: "center" }}>
                    ⚠️ {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                  </div>
                )}

                {devOtp && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "0.6rem 0.9rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.8rem", fontWeight: 700, color: "#166534" }}>
                    <span>🔑 Dev OTP: <strong style={{ letterSpacing: "0.12em", fontSize: "0.92rem", color: "#047857" }}>{devOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = String(devOtp).trim().slice(0, 6).split("")
                        setOtpDigits(digits)
                        setTimeout(() => handleVerifyOTP(devOtp), 60)
                      }}
                      style={{ background: "#059669", color: "white", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: "0.74rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <label className="cef-label-tag">
                  <span>Enter 6-Digit OTP Code</span>
                  <span className="cef-req-star">*</span>
                </label>
                <div className="cef-otp-row" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpInputRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      className={`cef-otp-box ${digit ? "filled" : ""}`}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => e.target.select()}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", fontSize: "0.8rem" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Didn't receive code?</span>
                  {resendCooldown > 0 ? (
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      style={{ background: "none", border: "none", fontSize: "0.8rem", fontWeight: 800, color: "#059669", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                      disabled={loading}
                      onClick={() => handleRequestOTP(true)}
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="cef-btn-primary-green"
                  disabled={loading || otpDigits.some(d => !d)}
                  onClick={() => handleVerifyOTP()}
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Verify &amp; Continue</span>
                      <Check size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 3: Complete Profile */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                <div className="cef-avatar-center-wrap">
                  <div className="cef-avatar-circle-badge">
                    {initials ? initials : <User size={28} strokeWidth={2.2} />}
                  </div>
                </div>

                <div className="cef-single-input-card">
                  <label className="cef-label-tag">
                    <span>Full Name</span>
                    <span className="cef-req-star">*</span>
                  </label>
                  <User size={16} className="cef-single-icon" />
                  <input
                    type="text"
                    className="cef-single-field"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value)
                      if (errorMsg) setErrorMsg("")
                    }}
                    placeholder="e.g. Ramesh Sharma"
                    autoFocus
                  />
                </div>

                <div className="cef-single-input-card">
                  <label className="cef-label-tag">
                    <span>{secondChannel === "EMAIL" ? "Email Address" : "Mobile Number"}</span>
                    <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600, marginLeft: 4 }}>Optional</span>
                  </label>
                  {secondChannel === "EMAIL" ? (
                    <Mail size={16} className="cef-single-icon" />
                  ) : (
                    <Phone size={16} className="cef-single-icon" />
                  )}
                  <input
                    type={secondChannel === "EMAIL" ? "email" : "tel"}
                    className="cef-single-field"
                    maxLength={secondChannel === "EMAIL" ? undefined : 10}
                    value={secondIdentifier}
                    onChange={e => {
                      const val = secondChannel === "EMAIL"
                        ? e.target.value
                        : e.target.value.replace(/\D/g, "").slice(0, 10)
                      setSecondIdentifier(val)
                      if (errorMsg) setErrorMsg("")
                    }}
                    placeholder={secondChannel === "EMAIL" ? "e.g. ramesh@example.com (optional)" : "10-digit mobile (optional)"}
                  />
                </div>

                <button
                  type="button"
                  className="cef-btn-primary-green"
                  disabled={loading || !fullName.trim() || !isSecondIdentifierValid}
                  onClick={handleCompleteProfile}
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <Check size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    </>
  )
}
