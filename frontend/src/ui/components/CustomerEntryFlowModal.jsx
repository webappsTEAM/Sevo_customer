/**
 * CustomerEntryFlowModal.jsx
 * Full Urban-Style Customer Entry Flow:
 * Login (Mobile +91 / Email) -> OTP Verification -> Profile Setup -> Location
 */

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGoogleLogin } from "@react-oauth/google"
import {
  Phone, ArrowLeft, ShieldCheck, MapPin, Sparkles, User, Mail,
  CheckCircle2, AlertCircle, RefreshCcw, Search, Compass, ChevronRight, X,
  Lock, Home, Check
} from "lucide-react"
import {
  apiRequestCustomerOTP,
  apiVerifyCustomerOTP,
  apiCompleteCustomerProfile,
  apiUpdateCustomerLastLocation,
  apiDetectCustomerLocation,
  apiCustomerGoogleLogin
} from "../../api/authService.js"
import { verifyOtpViaWebSocket } from "../../api/websocketService.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { LocationPermissionHandler } from "./AddressPicker"

const MODAL_STYLES = `
  .cef-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
    background: rgba(15, 23, 42, 0.78); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .cef-card {
    width: 100%; max-width: 440px; background: #ffffff; border-radius: 28px;
    box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(255,255,255,0.4) inset, 0 1px 3px rgba(0,0,0,0.08);
    overflow: hidden; position: relative; box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .cef-header {
    background: linear-gradient(135deg, #090d16 0%, #151435 45%, #2a1b54 100%);
    padding: 1.85rem 1.85rem 1.4rem; position: relative; overflow: hidden; box-sizing: border-box;
  }
  .cef-header::before {
    content: ''; position: absolute; top: -60px; right: -50px; width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(129, 140, 248, 0.35) 0%, rgba(99, 102, 241, 0.08) 60%, transparent 80%);
    border-radius: 50%; pointer-events: none;
  }
  .cef-header::after {
    content: ''; position: absolute; bottom: -30px; left: -20px; width: 120px; height: 120px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%);
    border-radius: 50%; pointer-events: none;
  }
  .cef-brand { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 2; margin-bottom: 1.1rem; }
  .cef-brand-left { display: flex; align-items: center; gap: 9px; }
  .cef-brand-icon {
    width: 34px; height: 34px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22);
    border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); backdrop-filter: blur(12px);
  }
  .cef-brand-name { font-size: 0.92rem; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
  .cef-brand-badge {
    font-size: 0.68rem; font-weight: 700; color: #a5b4fc; background: rgba(99,102,241,0.2);
    border: 1px solid rgba(165,180,252,0.3); border-radius: 20px; padding: 2px 9px; letter-spacing: 0.02em;
  }
  .cef-header-title { font-size: 1.48rem; font-weight: 800; color: #ffffff; line-height: 1.25; position: relative; z-index: 2; margin: 0 0 6px; letter-spacing: -0.02em; }
  .cef-header-sub { font-size: 0.82rem; color: #cbd5e1; font-weight: 400; position: relative; z-index: 2; margin: 0; line-height: 1.4; }
  .cef-close {
    width: 32px; height: 32px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);
    border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; cursor: pointer;
    transition: all 0.2s; backdrop-filter: blur(8px);
  }
  .cef-close:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
  
  .cef-progress-bar-wrap {
    background: #f8fafc; padding: 0.85rem 1.85rem; border-bottom: 1px solid #f1f5f9;
    display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;
  }
  .cef-step-indicators { display: flex; align-items: center; gap: 7px; }
  .cef-step-pill {
    height: 5px; border-radius: 99px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background: #e2e8f0; width: 12px;
  }
  .cef-step-pill.active { background: #6366f1; width: 32px; box-shadow: 0 0 10px rgba(99,102,241,0.5); }
  .cef-step-pill.done { background: #10b981; width: 16px; }
  .cef-step-text { font-size: 0.72rem; font-weight: 700; color: #64748b; letter-spacing: 0.02em; }

  .cef-body { padding: 1.65rem 1.85rem 1.85rem; box-sizing: border-box; }
  .cef-error {
    display: flex; align-items: flex-start; gap: 10px; padding: 0.85rem 1rem;
    background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 14px; margin-bottom: 1.25rem;
    font-size: 0.8rem; color: #be123c; font-weight: 600; line-height: 1.4; box-sizing: border-box;
  }

  .cef-tabs-segmented {
    display: flex; background: #f1f5f9; padding: 4px; border-radius: 14px; margin-bottom: 1.25rem;
    position: relative; box-sizing: border-box; border: 1px solid #e2e8f0;
  }
  .cef-tab-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 12px; border-radius: 10px; font-weight: 700; font-size: 0.84rem;
    border: none; background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s;
  }
  .cef-tab-btn.active {
    background: #ffffff; color: #1e1b4b; font-weight: 800;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }

  .cef-label { display: block; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 0.45rem; }
  .cef-input-container {
    position: relative; display: flex; align-items: center; background: #ffffff;
    border: 1.5px solid #cbd5e1; border-radius: 14px; transition: all 0.2s; overflow: hidden;
    margin-bottom: 1.15rem; box-sizing: border-box; width: 100%;
  }
  .cef-input-container:hover { border-color: #94a3b8; }
  .cef-input-container:focus-within {
    border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
  }
  .cef-prefix-badge {
    display: flex; align-items: center; gap: 6px; padding: 0 14px;
    font-size: 0.88rem; font-weight: 800; color: #1e293b; border-right: 1.5px solid #e2e8f0;
    height: 50px; background: #f8fafc; flex-shrink: 0; box-sizing: border-box;
  }
  .cef-main-input {
    flex: 1; height: 50px; padding: 0 1rem; border: none; outline: none; background: transparent;
    font-size: 0.95rem; font-weight: 700; color: #0f172a; min-width: 0; box-sizing: border-box;
  }
  .cef-main-input::placeholder { color: #94a3b8; font-weight: 400; }

  .cef-standalone-input-wrap { position: relative; margin-bottom: 1.15rem; width: 100%; box-sizing: border-box; }
  .cef-standalone-icon { position: absolute; left: 14px; top: 38px; color: #94a3b8; pointer-events: none; }
  .cef-standalone-input {
    width: 100%; height: 50px; padding: 0 1rem 0 2.85rem; border: 1.5px solid #cbd5e1; border-radius: 14px;
    background: #ffffff; font-size: 0.92rem; font-weight: 600; color: #0f172a; outline: none; transition: all 0.2s;
    box-sizing: border-box;
  }
  .cef-standalone-input:hover { border-color: #94a3b8; }
  .cef-standalone-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.12); }

  .cef-btn {
    width: 100%; height: 50px; border: none; border-radius: 14px; font-size: 0.92rem; font-weight: 800; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-sizing: border-box;
  }
  .cef-btn-primary {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(99,102,241,0.38), 0 4px 10px -2px rgba(99,102,241,0.2);
  }
  .cef-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 14px 30px -5px rgba(99,102,241,0.48);
  }
  .cef-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .cef-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .cef-divider-row { display: flex; align-items: center; gap: 12px; margin: 1.15rem 0; color: #94a3b8; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .cef-divider-row::before, .cef-divider-row::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }

  .cef-google-btn-modern {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 11px; height: 48px;
    border: 1.5px solid #cbd5e1; border-radius: 14px; background: #ffffff; font-size: 0.88rem; font-weight: 700;
    color: #1e293b; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .cef-google-btn-modern:hover:not(:disabled) {
    border-color: #6366f1; background: #faf5ff; transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99,102,241,0.08);
  }
  .cef-google-btn-modern:disabled { opacity: 0.6; cursor: not-allowed; }

  .cef-tos-text { font-size: 0.72rem; color: #94a3b8; text-align: center; line-height: 1.5; margin: 1rem 0 0.85rem; }
  .cef-tos-text a { color: #6366f1; font-weight: 700; text-decoration: none; cursor: pointer; }
  .cef-tos-text a:hover { text-decoration: underline; }

  .cef-trust-footer {
    display: flex; align-items: center; justify-content: center; gap: 14px;
    padding-top: 0.85rem; border-top: 1px solid #f1f5f9; flex-wrap: wrap;
  }
  .cef-trust-pill {
    display: flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 700; color: #64748b;
  }

  .cef-back-nav {
    display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700;
    color: #6366f1; background: none; border: none; cursor: pointer; margin-bottom: 1.15rem; padding: 0;
  }
  .cef-back-nav:hover { color: #4338ca; }

  .otp-input-group { display: flex; gap: 8px; justify-content: center; align-items: center; width: 100%; margin-bottom: 1.25rem; box-sizing: border-box; }
  .otp-digit-slot {
    flex: 1; width: 0; min-width: 0; height: 54px; text-align: center; font-size: 1.35rem; font-weight: 900;
    color: #0f172a; border: 2px solid #cbd5e1; border-radius: 12px; background: #f8fafc; outline: none;
    transition: all 0.18s; caret-color: #6366f1; box-sizing: border-box; padding: 0;
  }
  .otp-digit-slot:focus {
    border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 4px rgba(99,102,241,0.18), 0 4px 12px rgba(99,102,241,0.12);
    transform: scale(1.03);
  }
  .otp-digit-slot.filled { border-color: #6366f1; background: #eef2ff; color: #4338ca; }

  .cef-resend-row {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; font-size: 0.8rem;
  }
  .cef-resend-btn {
    background: none; border: none; font-size: 0.8rem; font-weight: 800; color: #6366f1; cursor: pointer; padding: 0;
  }
  .cef-resend-btn:disabled { color: #94a3b8; cursor: not-allowed; font-weight: 600; }
  .cef-resend-btn:hover:not(:disabled) { text-decoration: underline; }

  .cef-profile-avatar {
    width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #9333ea);
    display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: 900;
    margin: 0 auto 1.15rem; box-shadow: 0 8px 24px rgba(99,102,241,0.28);
  }

  .cef-loc-option-card {
    border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 1.1rem 1.25rem; display: flex; align-items: center;
    gap: 1rem; cursor: pointer; transition: all 0.2s; background: #ffffff; margin-bottom: 0.85rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .cef-loc-option-card:hover {
    border-color: #6366f1; background: #f8fafc; box-shadow: 0 6px 20px rgba(99,102,241,0.1); transform: translateY(-1px);
  }
  .cef-loc-icon-bubble {
    width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
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
  const [manualLocationInput, setManualLocationInput] = useState("")
  const [showManualLocation, setShowManualLocation] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successToast, setSuccessToast] = useState("")
  const [attemptsRemaining, setAttemptsRemaining] = useState(null)
  const [devOtp, setDevOtp] = useState("")
  const [resendCooldown, setResendCooldown] = useState(30)
  const [showMapPicker, setShowMapPicker] = useState(false)

  const otpInputRefs = useRef([])
  const isVerifyingRef = useRef(false)
  const timerRef = useRef(null)

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

  // ── 1. Google OAuth Hook ──────────────────────────────────────────────────
  let googleLoginHandler = () => {}
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    googleLoginHandler = useGoogleLogin({
      onSuccess: async (tokenResponse) => {
        setLoading(true)
        setErrorMsg("")
        try {
          if (loginWithCustomerGoogle) {
            await loginWithCustomerGoogle(tokenResponse.access_token)
          } else {
            await apiCustomerGoogleLogin(tokenResponse.access_token)
            if (typeof refreshMe === "function") await refreshMe()
          }
          if (typeof onComplete === "function") onComplete()
          onClose()
        } catch (err) {
          setErrorMsg(err?.body?.detail || err?.message || "Google sign-in failed. Please try with OTP.")
        } finally {
          setLoading(false)
        }
      },
      onError: () => {
        setErrorMsg("Google Sign-In was cancelled or failed.")
      }
    })
  } catch (err) {
    console.warn("Google Login hook notice:", err)
  }

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

  // ── 3. OTP Digit Changes & Keyboard Navigation ────────────────────────────
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const newDigits = [...otpDigits]
      digits.forEach((d, i) => { if (index + i < 6) newDigits[index + i] = d })
      setOtpDigits(newDigits)
      const nextFocus = Math.min(index + digits.length, 5)
      otpInputRefs.current[nextFocus]?.focus()
      if (newDigits.every(d => d && d.length === 1)) {
        setTimeout(() => handleVerifyOTP(newDigits.join("")), 40)
      }
      return
    }

    const clean = value.replace(/\D/g, "")
    const newDigits = [...otpDigits]
    newDigits[index] = clean
    setOtpDigits(newDigits)

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
    if (newDigits.every(d => d && d.length === 1)) {
      setTimeout(() => handleVerifyOTP(newDigits.join("")), 40)
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
      let res = null
      try {
        // Fast WebSocket verification for phone channel
        if (channel === "PHONE") {
          res = await verifyOtpViaWebSocket(identifier, otpCode)
        } else {
          res = await apiVerifyCustomerOTP(identifier, "EMAIL", otpCode)
        }
      } catch {
        // Resilient REST fallback
        res = await apiVerifyCustomerOTP(identifier, channel, otpCode)
      }

      if (res && res.success) {
        const { is_new_customer, customer_id } = res.data || {}
        setCustomerId(customer_id)
        if (typeof refreshMe === "function") await refreshMe()
        if (is_new_customer) {
          setStep(3)
        } else {
          if (typeof onComplete === "function") onComplete()
          onClose()
        }
      } else {
        if (res?.error?.code === "MAX_ATTEMPTS_EXCEEDED") {
          setErrorMsg("Too many failed attempts. Please request a new OTP.")
          setOtpDigits(["", "", "", "", "", ""])
          setStep(1)
        } else {
          if (res?.error?.attempts_remaining !== undefined) setAttemptsRemaining(res.error.attempts_remaining)
          setErrorMsg(res?.error?.message || "Invalid OTP code. Please check and re-enter.")
          otpInputRefs.current[0]?.focus()
        }
      }
    } catch (e) {
      setErrorMsg(e?.body?.error?.message || e?.body?.detail || e?.message || "Verification error.")
    } finally {
      setLoading(false)
      isVerifyingRef.current = false
    }
  }

  // ── 5. Profile Completion (New Customers) ─────────────────────────────────
  const secondChannel = channel === "EMAIL" ? "PHONE" : "EMAIL"
  const isSecondIdentifierValid = secondChannel === "EMAIL"
    ? EMAIL_RE.test(secondIdentifier.trim())
    : /^[6-9]\d{9}$/.test(secondIdentifier.trim())

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) { setErrorMsg("Full Name is required."); return }
    if (!isSecondIdentifierValid) {
      setErrorMsg(secondChannel === "EMAIL" ? "Please enter a valid email address." : "Please enter a valid 10-digit mobile number.")
      return
    }
    setLoading(true)
    setErrorMsg("")

    try {
      const profileArgs = secondChannel === "EMAIL"
        ? { email: secondIdentifier.trim() }
        : { phone: secondIdentifier.trim() }
      const res = await apiCompleteCustomerProfile(customerId, fullName.trim(), profileArgs)
      if (res && res.success) {
        if (typeof refreshMe === "function") await refreshMe()
        setStep(4)
      } else {
        setErrorMsg(res?.error?.message || "Failed to complete profile.")
      }
    } catch (e) {
      setErrorMsg(e?.body?.error?.message || e?.message || "Error completing profile.")
    } finally {
      setLoading(false)
    }
  }

  // ── 6. Location Handler (Step 4) ──────────────────────────────────────────
  const handleSaveManualLocation = async () => {
    if (!manualLocationInput.trim()) { setErrorMsg("Please enter a location."); return }
    setLoading(true)
    try {
      await apiUpdateCustomerLastLocation({ label: manualLocationInput.trim(), manual: true, updated_at: new Date().toISOString() })
    } catch (e) {
      console.warn("Location save warning:", e)
    } finally {
      setLoading(false)
      if (typeof onComplete === "function") onComplete()
      onClose()
    }
  }

  const STEP_TITLES = {
    1: { title: "Welcome Back", sub: channel === "EMAIL" ? "Enter your email to receive an instant OTP" : "Enter your mobile number to receive an instant OTP" },
    2: { title: "Verify OTP", sub: channel === "EMAIL" ? `6-digit code sent to ${emailInput}` : `6-digit code sent to +91 ${mobileNumber}` },
    3: { title: "Create Profile", sub: "Tell us your name to personalize your account" },
    4: { title: "Service Location", sub: "Set your location to view available experts near you" },
  }

  const initials = fullName.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || null

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="cef-overlay" onClick={onClose}>
        <motion.div
          className="cef-card"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", damping: 28, stiffness: 340 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="cef-header">
            <div className="cef-brand">
              <div className="cef-brand-left">
                <div className="cef-brand-icon"><Home size={17} /></div>
                <span className="cef-brand-name">CalServices</span>
                <span className="cef-brand-badge">Customer Access</span>
              </div>
              <button className="cef-close" onClick={onClose} aria-label="Close modal">
                <X size={15} />
              </button>
            </div>
            <h2 className="cef-header-title">{STEP_TITLES[step]?.title}</h2>
            <p className="cef-header-sub">{STEP_TITLES[step]?.sub}</p>
          </div>

          {/* Progress Tracker */}
          <div className="cef-progress-bar-wrap">
            <div className="cef-step-indicators">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`cef-step-pill ${step === s ? "active" : step > s ? "done" : ""}`}
                />
              ))}
            </div>
            <span className="cef-step-text">Step {step} of 4</span>
          </div>

          {/* Modal Body */}
          <div className="cef-body">
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  className="cef-error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
              {successToast && (
                <motion.div
                  className="cef-error"
                  style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#15803d" }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{successToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 1: Phone or Email Sign-in */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                <div className="cef-tabs-segmented">
                  <button
                    type="button"
                    className={`cef-tab-btn ${channel === "PHONE" ? "active" : ""}`}
                    onClick={() => { setChannel("PHONE"); setErrorMsg("") }}
                  >
                    <Phone size={14} style={{ color: channel === "PHONE" ? "#4f46e5" : "#64748b" }} />
                    Phone Number
                  </button>
                  <button
                    type="button"
                    className={`cef-tab-btn ${channel === "EMAIL" ? "active" : ""}`}
                    onClick={() => { setChannel("EMAIL"); setErrorMsg("") }}
                  >
                    <Mail size={14} style={{ color: channel === "EMAIL" ? "#4f46e5" : "#64748b" }} />
                    Email Address
                  </button>
                </div>

                {channel === "PHONE" ? (
                  <>
                    <label className="cef-label">Mobile Number</label>
                    <div className="cef-input-container">
                      <div className="cef-prefix-badge">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        className="cef-main-input"
                        maxLength={10}
                        value={mobileNumber}
                        onChange={e => {
                          setMobileNumber(e.target.value.replace(/\D/g, ""))
                          if (errorMsg) setErrorMsg("")
                        }}
                        onKeyDown={e => { if (e.key === "Enter" && isIdentifierValid) handleRequestOTP() }}
                        placeholder="10-digit mobile number"
                        autoFocus
                      />
                      {mobileNumber.length === 10 && (
                        <CheckCircle2 size={18} style={{ marginRight: 12, color: "#10b981", flexShrink: 0 }} />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="cef-standalone-input-wrap">
                    <label className="cef-label">Email Address</label>
                    <Mail size={16} className="cef-standalone-icon" />
                    <input
                      type="email"
                      className="cef-standalone-input"
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
                  className="cef-btn cef-btn-primary"
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

                <div className="cef-divider-row">or continue with</div>

                <button
                  type="button"
                  className="cef-google-btn-modern"
                  disabled={loading}
                  onClick={() => googleLoginHandler()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <p className="cef-tos-text">
                  By continuing, you agree to CalServices' <a>Terms of Service</a> &amp; <a>Privacy Policy</a>
                </p>

                <div className="cef-trust-footer">
                  <span className="cef-trust-pill"><ShieldCheck size={13} style={{ color: "#10b981" }} /> Verified Pros</span>
                  <span className="cef-trust-pill"><Lock size={13} style={{ color: "#6366f1" }} /> 256-Bit SSL</span>
                  <span className="cef-trust-pill">⭐ 4.8 / 5 Rated</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                <button
                  type="button"
                  className="cef-back-nav"
                  onClick={() => {
                    setStep(1)
                    setErrorMsg("")
                    setOtpDigits(["", "", "", "", "", ""])
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>{channel === "EMAIL" ? `Change Email (${emailInput})` : `Change Number (+91 ${mobileNumber})`}</span>
                </button>

                {attemptsRemaining !== null && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "0.6rem 0.9rem", marginBottom: "1rem", fontSize: "0.78rem", fontWeight: 700, color: "#c2410c", textAlign: "center" }}>
                    ⚠️ {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                  </div>
                )}

                {devOtp && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "0.6rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.78rem", fontWeight: 700, color: "#166534" }}>
                    <span>🔑 Dev OTP: <strong style={{ letterSpacing: "0.12em", fontSize: "0.92rem" }}>{devOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split("")
                        setOtpDigits(digits)
                        setTimeout(() => handleVerifyOTP(devOtp), 60)
                      }}
                      style={{ background: "#166534", color: "white", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <label className="cef-label">Enter 6-Digit Verification Code</label>
                <div className="otp-input-group" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpInputRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      className={`otp-digit-slot ${digit ? "filled" : ""}`}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => e.target.select()}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <div className="cef-resend-row">
                  <span style={{ color: "#64748b" }}>Didn't receive code?</span>
                  {resendCooldown > 0 ? (
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="cef-resend-btn"
                      disabled={loading}
                      onClick={() => handleRequestOTP(true)}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="cef-btn cef-btn-primary"
                  disabled={loading || otpDigits.some(d => !d)}
                  onClick={() => handleVerifyOTP()}
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Verify &amp; Continue</span>
                      <Check size={16} />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 3: Profile Setup */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                <div className="cef-profile-avatar">
                  {initials ? initials : <User size={28} />}
                </div>
                <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#64748b", fontWeight: 600, marginBottom: "1.25rem" }}>
                  Welcome! Complete your profile to finalize booking services.
                </p>

                <div className="cef-standalone-input-wrap">
                  <label className="cef-label">Full Name *</label>
                  <User size={16} className="cef-standalone-icon" />
                  <input
                    type="text"
                    className="cef-standalone-input"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value)
                      if (errorMsg) setErrorMsg("")
                    }}
                    placeholder="e.g. Ramesh Sharma"
                    autoFocus
                  />
                </div>

                <div className="cef-standalone-input-wrap">
                  <label className="cef-label">
                    {secondChannel === "EMAIL" ? "Email Address *" : "Mobile Number *"}
                  </label>
                  {secondChannel === "EMAIL" ? (
                    <Mail size={16} className="cef-standalone-icon" />
                  ) : (
                    <Phone size={16} className="cef-standalone-icon" />
                  )}
                  <input
                    type={secondChannel === "EMAIL" ? "email" : "tel"}
                    className="cef-standalone-input"
                    value={secondIdentifier}
                    onChange={e => {
                      setSecondIdentifier(e.target.value)
                      if (errorMsg) setErrorMsg("")
                    }}
                    placeholder={secondChannel === "EMAIL" ? "e.g. ramesh@example.com" : "10-digit mobile number"}
                  />
                </div>

                <button
                  type="button"
                  className="cef-btn cef-btn-primary"
                  disabled={loading || !fullName.trim() || !isSecondIdentifierValid}
                  onClick={handleCompleteProfile}
                >
                  {loading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Continue to Location</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 4: Location */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#ede9fe,#ddd6fe)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", boxShadow: "0 8px 20px rgba(99,102,241,0.15)" }}>
                    <MapPin size={26} style={{ color: "#6366f1" }} />
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600, maxWidth: 300, margin: "0 auto" }}>
                    Select your location to discover verified professionals in your neighborhood.
                  </p>
                </div>

                {!showManualLocation ? (
                  <>
                    <div
                      className="cef-loc-option-card"
                      onClick={() => setShowMapPicker(true)}
                      id="use-current-location-card"
                    >
                      <div className="cef-loc-icon-bubble" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                        <Compass size={20} style={{ color: "#6366f1" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Use Current Location</div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>Auto-detect via GPS map</div>
                      </div>
                      <ChevronRight size={16} style={{ color: "#94a3b8" }} />
                    </div>

                    <div className="cef-loc-option-card" onClick={() => setShowManualLocation(true)}>
                      <div className="cef-loc-icon-bubble" style={{ background: "#f1f5f9" }}>
                        <Search size={20} style={{ color: "#64748b" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Enter Location Manually</div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>Type your city, area or pincode</div>
                      </div>
                      <ChevronRight size={16} style={{ color: "#94a3b8" }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof onComplete === "function") onComplete()
                        onClose()
                      }}
                      style={{ width: "100%", background: "none", border: "none", padding: "0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", cursor: "pointer", textAlign: "center", marginTop: "0.35rem" }}
                    >
                      Skip for now
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="cef-back-nav"
                      onClick={() => { setShowManualLocation(false); setErrorMsg(""); }}
                    >
                      <ArrowLeft size={14} /> Back to options
                    </button>

                    <div className="cef-standalone-input-wrap">
                      <label className="cef-label">City or Area Name</label>
                      <MapPin size={16} className="cef-standalone-icon" />
                      <input
                        type="text"
                        className="cef-standalone-input"
                        value={manualLocationInput}
                        onChange={e => {
                          setManualLocationInput(e.target.value)
                          if (errorMsg) setErrorMsg("")
                        }}
                        onKeyDown={e => { if (e.key === "Enter" && manualLocationInput.trim()) handleSaveManualLocation() }}
                        placeholder="e.g. Koramangala, Bangalore"
                        autoFocus
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        className="cef-btn"
                        style={{ flex: 1, background: "#f1f5f9", color: "#334155" }}
                        onClick={() => setShowManualLocation(false)}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="cef-btn cef-btn-primary"
                        style={{ flex: 2 }}
                        disabled={loading || !manualLocationInput.trim()}
                        onClick={handleSaveManualLocation}
                      >
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

      {/* Map Picker Modal */}
      {showMapPicker && (
        <LocationPermissionHandler
          onClose={() => setShowMapPicker(false)}
          onManualSearch={() => {
            setShowMapPicker(false)
            setShowManualLocation(true)
          }}
          onLocationConfirmed={(savedAddress) => {
            setShowMapPicker(false)
            if (typeof onComplete === "function") {
              onComplete(savedAddress)
            }
            onClose()
          }}
        />
      )}
    </>
  )
}
