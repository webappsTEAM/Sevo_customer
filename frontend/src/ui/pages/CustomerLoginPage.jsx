/**
 * CustomerLoginPage.jsx
 * Professional, split-layout Customer Login & Registration Page for CalServices.
 * Inspired by modern e-commerce / service portal login standards.
 */

import React, { useState, useEffect, useRef } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useGoogleLogin } from "@react-oauth/google"
import {
  Phone, Mail, Lock, ShieldCheck, Star, CheckCircle2, AlertCircle,
  RefreshCcw, ArrowLeft, ChevronRight, User, Sparkles, Check, MapPin,
  Compass, Eye, EyeOff, Home, ShoppingCart, Clock, Award, HelpCircle
} from "lucide-react"
import { useAuth } from "../../state/auth/useAuth.js"
import {
  apiRequestCustomerOTP,
  apiVerifyCustomerOTP,
  apiCompleteCustomerProfile,
  apiCustomerGoogleLogin,
  apiLogin,
  extractAuthError
} from "../../api/authService.js"
import { verifyOtpViaWebSocket } from "../../api/websocketService.js"
import { routes } from "../routes.js"

export function CustomerLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, refreshMe, loginWithCustomerGoogle, login } = useAuth()

  // Mode: "otp" | "password" | "register"
  const [authMode, setAuthMode] = useState("otp")
  const [channel, setChannel] = useState("PHONE") // "PHONE" | "EMAIL"
  const [step, setStep] = useState(1) // 1: identify, 2: verify OTP, 3: profile setup

  // Form Fields
  const [mobileNumber, setMobileNumber] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [fullName, setFullName] = useState("")
  const [secondIdentifier, setSecondIdentifier] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // OTP State
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [devOtp, setDevOtp] = useState("")
  const [resendCooldown, setResendCooldown] = useState(30)
  const [attemptsRemaining, setAttemptsRemaining] = useState(null)
  const [customerId, setCustomerId] = useState(null)

  // UI State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successToast, setSuccessToast] = useState("")
  const otpInputRefs = useRef([])
  const timerRef = useRef(null)
  const isVerifyingRef = useRef(false)

  // If already logged in, redirect to landing or destination
  useEffect(() => {
    if (user) {
      const from = location.state?.from || routes.landing
      navigate(from, { replace: true })
    }
  }, [user, navigate, location])

  // Resend Countdown
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
          navigate(routes.landing, { replace: true })
        } catch (err) {
          setErrorMsg(err?.body?.detail || err?.message || "Google sign-in failed. Please try with OTP.")
        } finally {
          setLoading(false)
        }
      },
      onError: () => {
        setErrorMsg("Google Sign-In was cancelled.")
      }
    })
  } catch (err) {
    console.warn("Google OAuth init error:", err)
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

  // ── 3. OTP Digit Handling ─────────────────────────────────────────────────
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
        if (channel === "PHONE") {
          res = await verifyOtpViaWebSocket(identifier, otpCode)
        } else {
          res = await apiVerifyCustomerOTP(identifier, "EMAIL", otpCode)
        }
      } catch {
        res = await apiVerifyCustomerOTP(identifier, channel, otpCode)
      }

      if (res && res.success) {
        const { is_new_customer, customer_id } = res.data || {}
        setCustomerId(customer_id)
        if (typeof refreshMe === "function") await refreshMe()
        if (is_new_customer) {
          setStep(3)
        } else {
          navigate(routes.landing, { replace: true })
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
        navigate(routes.landing, { replace: true })
      } else {
        setErrorMsg(res?.error?.message || "Failed to complete profile.")
      }
    } catch (e) {
      setErrorMsg(e?.body?.error?.message || e?.message || "Error completing profile.")
    } finally {
      setLoading(false)
    }
  }

  // ── 6. Password Login Fallback ────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!identifier || !passwordInput) {
      setErrorMsg("Please enter both email/username and password.")
      return
    }
    setLoading(true)
    setErrorMsg("")
    try {
      const u = await login(identifier, passwordInput)
      if (u) {
        navigate(routes.landing, { replace: true })
      } else {
        setErrorMsg("Invalid credentials. Please verify your password or use OTP.")
      }
    } catch (err) {
      setErrorMsg(extractAuthError(err, "Login failed. Please check your credentials."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-900 flex flex-col justify-between font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link to={routes.landing} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Home size={20} />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight block leading-none">CalServices</span>
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mt-0.5">Professional Home Care</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link to={routes.landing} className="hover:text-teal-600 transition-colors">Home</Link>
            <Link to={`${routes.landing}#services`} className="hover:text-teal-600 transition-colors">Services</Link>
            <Link to={`${routes.landing}#how-it-works`} className="hover:text-teal-600 transition-colors">How It Works</Link>
            <Link to={`${routes.landing}#professionals`} className="hover:text-teal-600 transition-colors">Professionals</Link>
            <Link to={`${routes.landing}#about`} className="hover:text-teal-600 transition-colors">About Us</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to={routes.landing}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Split Login Container ───────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 my-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] border border-slate-200/90 overflow-hidden grid md:grid-cols-12 min-h-[580px]"
        >
          {/* ── LEFT SIDE: Brand Showcase & Illustration ── */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />
            
            {/* Brand Accent */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-teal-300 text-xs font-bold mb-6">
                <Sparkles size={13} />
                <span>Verified Doorstep Service</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-4 tracking-tight">
                Your Trusted Partner for Quality Home Care.
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
                Book trained professionals for cleaning, repairs, painting, pest control, and logistics in just a few taps.
              </p>
            </div>

            {/* Feature Highlights Card */}
            <div className="my-8 relative z-10 space-y-3.5">
              <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">100% Background-Verified Pros</h4>
                  <p className="text-[11px] text-slate-400">Skilled, trained, and insured experts</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instant OTP &amp; Fast Booking</h4>
                  <p className="text-[11px] text-slate-400">Schedule at your convenient time slot</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                  <Star size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">4.8+ Customer Rating</h4>
                  <p className="text-[11px] text-slate-400">Loved by over 1 Million+ homes</p>
                </div>
              </div>
            </div>

            {/* Trust Footer Tag */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>© 2026 CalServices Inc.</span>
              <span className="flex items-center gap-1 text-teal-400 font-bold">
                <CheckCircle2 size={13} /> 256-Bit SSL Encrypted
              </span>
            </div>
          </div>

          {/* ── RIGHT SIDE: Clean Professional Login Form ── */}
          <div className="md:col-span-7 p-8 sm:p-12 md:p-14 flex flex-col justify-center bg-white relative">
            
            {/* Header Text */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                {step === 1 && "Welcome Back. Please Log In To Your Account."}
                {step === 2 && "Enter Verification Code."}
                {step === 3 && "Almost There! Complete Your Profile."}
              </h1>
              <p className="text-sm text-slate-500 font-normal">
                {step === 1 && "Access your bookings, track active service pros, and manage addresses."}
                {step === 2 && (channel === "EMAIL" ? `Enter the 6-digit OTP code sent to ${emailInput}` : `Enter the 6-digit OTP code sent to +91 ${mobileNumber}`)}
                {step === 3 && "Personalize your account details to finalize your registration."}
              </p>
            </div>

            {/* Error & Success Toasts */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5"
                >
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
              {successToast && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2.5"
                >
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── STEP 1: Phone / Email Input ── */}
            {step === 1 && (
              <div>
                {/* Method Switcher Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("otp"); setChannel("PHONE"); setErrorMsg("") }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === "otp" && channel === "PHONE"
                        ? "bg-white text-slate-900 shadow-sm font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Phone size={14} className={channel === "PHONE" ? "text-teal-600" : "text-slate-400"} />
                    <span>Mobile (Instant OTP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode("otp"); setChannel("EMAIL"); setErrorMsg("") }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === "otp" && channel === "EMAIL"
                        ? "bg-white text-slate-900 shadow-sm font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Mail size={14} className={channel === "EMAIL" ? "text-teal-600" : "text-slate-400"} />
                    <span>Email Address</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode("password"); setErrorMsg("") }}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === "password"
                        ? "bg-white text-slate-900 shadow-sm font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Lock size={14} className={authMode === "password" ? "text-teal-600" : "text-slate-400"} />
                    <span>Password</span>
                  </button>
                </div>

                {/* Form Fields according to selected tab */}
                {authMode === "otp" ? (
                  <div>
                    {channel === "PHONE" ? (
                      <div className="mb-5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          Mobile Number
                        </label>
                        <div className="flex items-center bg-white border-2 border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl overflow-hidden transition-all h-13 px-1">
                          <div className="flex items-center gap-2 px-3.5 bg-slate-50 border-r border-slate-200 text-slate-800 font-bold text-sm h-full">
                            <span>🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={mobileNumber}
                            onChange={e => {
                              setMobileNumber(e.target.value.replace(/\D/g, ""))
                              if (errorMsg) setErrorMsg("")
                            }}
                            onKeyDown={e => { if (e.key === "Enter" && isIdentifierValid) handleRequestOTP() }}
                            placeholder="Enter 10-digit mobile number"
                            className="flex-1 px-4 py-2 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                            autoFocus
                          />
                          {mobileNumber.length === 10 && (
                            <CheckCircle2 size={18} className="text-emerald-500 mr-3 shrink-0" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          Email Address
                        </label>
                        <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl overflow-hidden transition-all h-13">
                          <Mail size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
                          <input
                            type="email"
                            value={emailInput}
                            onChange={e => {
                              setEmailInput(e.target.value)
                              if (errorMsg) setErrorMsg("")
                            }}
                            onKeyDown={e => { if (e.key === "Enter" && isIdentifierValid) handleRequestOTP() }}
                            placeholder="e.g. ramesh@example.com"
                            className="w-full pl-12 pr-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 h-full"
                            autoFocus
                          />
                        </div>
                      </div>
                    )}

                    {/* Submit OTP Button */}
                    <button
                      type="button"
                      disabled={loading || !isIdentifierValid}
                      onClick={() => handleRequestOTP()}
                      className="w-full h-13 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCcw size={18} className="animate-spin" />
                      ) : (
                        <>
                          <span>Get Instant OTP</span>
                          <ChevronRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Email or Mobile Number
                      </label>
                      <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl overflow-hidden transition-all h-12">
                        <User size={17} className="absolute left-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={identifier}
                          onChange={e => {
                            if (channel === "EMAIL") setEmailInput(e.target.value)
                            else setMobileNumber(e.target.value)
                            if (errorMsg) setErrorMsg("")
                          }}
                          placeholder="Your registered email or phone"
                          className="w-full pl-12 pr-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 h-full"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Password
                        </label>
                        <Link to={routes.reset_password} className="text-xs font-bold text-teal-600 hover:text-teal-700">
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl overflow-hidden transition-all h-12">
                        <Lock size={17} className="absolute left-4 text-slate-400 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordInput}
                          onChange={e => {
                            setPasswordInput(e.target.value)
                            if (errorMsg) setErrorMsg("")
                          }}
                          placeholder="Enter your account password"
                          className="w-full pl-12 pr-12 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 h-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 border-slate-300"
                        />
                        <span>Remember me on this device</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !identifier || !passwordInput}
                      className="w-full h-13 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCcw size={18} className="animate-spin" />
                      ) : (
                        <span>Log In</span>
                      )}
                    </button>
                  </form>
                )}

                {/* Divider */}
                <div className="relative flex items-center my-6">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">or continue with</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => googleLoginHandler()}
                  className="w-full h-12 rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}

            {/* ── STEP 2: Verify OTP ── */}
            {step === 2 && (
              <div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setErrorMsg(""); setOtpDigits(["","","","","",""]) }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 mb-5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>{channel === "EMAIL" ? `Change Email (${emailInput})` : `Change Number (+91 ${mobileNumber})`}</span>
                </button>

                {devOtp && (
                  <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>🔑 Dev Test OTP: <strong className="tracking-widest text-sm">{devOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split("")
                        setOtpDigits(digits)
                        setTimeout(() => handleVerifyOTP(devOtp), 60)
                      }}
                      className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-800 transition-colors"
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <div className="mb-6" onPaste={handleOtpPaste}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex gap-2.5 sm:gap-3 justify-center">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => otpInputRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onFocus={e => e.target.select()}
                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-black rounded-2xl border-2 transition-all outline-none ${
                          digit
                            ? "border-teal-600 bg-teal-50/50 text-teal-900"
                            : "border-slate-200 bg-slate-50 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-slate-900"
                        }`}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mb-6">
                  <span className="text-slate-500 font-medium">Didn't receive code?</span>
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400 font-bold">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestOTP(true)}
                      className="font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loading || otpDigits.some(d => !d)}
                  onClick={() => handleVerifyOTP()}
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <RefreshCcw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>Verify &amp; Continue</span>
                      <Check size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── STEP 3: Profile Setup (New Customers) ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl overflow-hidden transition-all h-13">
                    <User size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => {
                        setFullName(e.target.value)
                        if (errorMsg) setErrorMsg("")
                      }}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full pl-12 pr-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 h-full"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    {secondChannel === "EMAIL" ? "Email Address *" : "Mobile Number *"}
                  </label>
                  <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl overflow-hidden transition-all h-13">
                    {secondChannel === "EMAIL" ? (
                      <Mail size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
                    ) : (
                      <Phone size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
                    )}
                    <input
                      type={secondChannel === "EMAIL" ? "email" : "tel"}
                      value={secondIdentifier}
                      onChange={e => {
                        setSecondIdentifier(e.target.value)
                        if (errorMsg) setErrorMsg("")
                      }}
                      placeholder={secondChannel === "EMAIL" ? "e.g. ramesh@example.com" : "10-digit mobile number"}
                      className="w-full pl-12 pr-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 h-full"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading || !fullName.trim() || !isSecondIdentifierValid}
                  onClick={handleCompleteProfile}
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <RefreshCcw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>Complete Account Setup</span>
                      <Check size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Bottom Policy Info */}
            <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
              By proceeding, you agree to CalServices'{" "}
              <a href="#" className="font-semibold text-teal-600 hover:underline">Terms of Service</a> &amp;{" "}
              <a href="#" className="font-semibold text-teal-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="w-full bg-white border-t border-slate-200/80 pt-10 pb-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div>
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Customer Care</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link to={`${routes.landing}#services`} className="hover:text-teal-600">Browse Services</Link></li>
              <li><Link to={routes.landing} className="hover:text-teal-600">Track Bookings</Link></li>
              <li><Link to={routes.landing} className="hover:text-teal-600">Help &amp; FAQs</Link></li>
              <li><Link to={routes.landing} className="hover:text-teal-600">Cancellation &amp; Refund</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Top Services</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link to={`${routes.landing}#services`} className="hover:text-teal-600">Home Cleaning</Link></li>
              <li><Link to={`${routes.landing}#services`} className="hover:text-teal-600">AC Repair &amp; Service</Link></li>
              <li><Link to={`${routes.landing}#services`} className="hover:text-teal-600">Electrical &amp; Plumbing</Link></li>
              <li><Link to={`${routes.landing}#services`} className="hover:text-teal-600">House Painting</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link to={`${routes.landing}#about`} className="hover:text-teal-600">About CalServices</Link></li>
              <li><Link to={`${routes.landing}#professionals`} className="hover:text-teal-600">Join as a Professional</Link></li>
              <li><Link to={routes.landing} className="hover:text-teal-600">Careers</Link></li>
              <li><Link to={routes.login} className="hover:text-teal-600">Staff / Partner Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Security &amp; Trust</h4>
            <p className="text-slate-500 leading-relaxed mb-3">
              CalServices verifies every professional with strict background checks and insurance backing.
            </p>
            <div className="flex items-center gap-2 text-teal-700 font-bold">
              <ShieldCheck size={16} />
              <span>Verified Home Experts</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <span>© 2026 CalServices Inc. All rights reserved.</span>
          <div className="flex items-center gap-6 font-semibold text-slate-500">
            <a href="#" className="hover:text-slate-900">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900">Terms of Service</a>
            <a href="#" className="hover:text-slate-900">Security</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
