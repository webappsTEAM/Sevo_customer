import React, { useState, useEffect } from 'react'
import { KeyRound, Copy, Check, Clock, ShieldCheck, AlertCircle } from 'lucide-react'

/**
 * CashPaymentOtpCard
 * Prominent floating/sticky verification card displayed to customers
 * when a technician records cash collection (Advance or Final Balance).
 */
export default function CashPaymentOtpCard({
  otp,
  amount,
  milestoneType = 'ADVANCE',
  expiresAt,
  onCopied,
}) {
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(15 * 60) // default 15 minutes in seconds
      return
    }
    const calcTime = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
    }
    calcTime()
    const timer = setInterval(calcTime, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const formatCountdown = (secs) => {
    if (secs === null || secs <= 0) return '00:00'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleCopy = () => {
    if (!otp) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(otp))
    }
    setCopied(true)
    if (typeof onCopied === 'function') onCopied()
    setTimeout(() => setCopied(false), 2000)
  }

  if (!otp) return null

  const isAdvance = String(milestoneType).toUpperCase().includes('ADVANCE')

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        color: 'white',
        borderRadius: 16,
        padding: '1.25rem 1.5rem',
        boxShadow: '0 12px 30px -4px rgba(6, 95, 70, 0.4), 0 4px 12px rgba(0,0,0,0.1)',
        border: '1.5px solid #34d399',
        margin: '1rem 0 1.25rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(52, 211, 153, 0.12)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#34d399',
              color: '#064e3b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <KeyRound size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a7f3d0' }}>
              💰 {isAdvance ? '50% Advance Cash Payment Recorded' : 'Final Balance Cash Payment Recorded'}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'white' }}>
              Amount: ₹{Number(amount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {timeLeft !== null && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(52, 211, 153, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#d1fae5',
            }}
          >
            <Clock size={14} className="animate-pulse" />
            <span>Valid for: {formatCountdown(timeLeft)}</span>
          </div>
        )}
      </div>

      <p style={{ margin: '0 0 14px 0', fontSize: '0.86rem', color: '#ecfdf5', lineHeight: 1.45, opacity: 0.95 }}>
        Technician reported cash collection of <strong>₹{Number(amount || 0).toLocaleString('en-IN')}</strong>. Please verify the amount and share this 6-digit confirmation code with your technician to verify payment and begin/complete work:
      </p>

      {/* OTP Display Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.96)',
          borderRadius: 12,
          padding: '10px 16px',
          border: '2px solid #a7f3d0',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} color="#059669" />
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '1.6rem',
              fontWeight: 900,
              color: '#064e3b',
              letterSpacing: 6,
              userSelect: 'all',
            }}
          >
            {otp}
          </div>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: copied ? '#059669' : '#047857',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transition: 'background 0.2s',
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>
    </div>
  )
}
