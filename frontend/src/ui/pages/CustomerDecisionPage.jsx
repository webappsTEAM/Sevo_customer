import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, FileText, ArrowLeft } from "lucide-react"

export function CustomerDecisionPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [extension, setExtension] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [customerNotes, setCustomerNotes] = useState("")
  const [decisionSuccess, setDecisionSuccess] = useState(null)

  useEffect(() => {
    fetchExtensionDetails()
  }, [token])

  const fetchExtensionDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/customer/work-extensions/${token}/`)
      const data = await res.json()
      // Bug found: on any failure (bad/expired token, server error) this
      // used to silently substitute a completely fabricated work-extension
      // record -- a fake customer name ("Sathish"), fake request id, fake
      // technician notes, and a fake ₹2200 approved amount -- and render it
      // as if it were a real billing decision the visitor was being asked
      // to approve. There's already a proper "Link Expired or Invalid"
      // error screen further down (gated on `error && !extension`); it was
      // just never reachable because extension was always being set to
      // this mock data instead of staying null. Use the real error path.
      if (data.success && data.data) {
        setExtension(data.data)
      } else {
        setError(data.error || "This link is invalid or has expired.")
      }
    } catch (err) {
      setError("Could not load this decision -- please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (decisionType) => {
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch(`/api/customer/work-extensions/${token}/decide/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionType,
          notes: customerNotes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setExtension(data.data)
        setDecisionSuccess(decisionType === "ACCEPT" ? "accepted" : "declined")
      } else {
        setError(data.error || data.message || "Failed to record your decision. Please try again.")
      }
    } catch (err) {
      setError(err.message || "A network error occurred while submitting your decision. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #f8fafc)", color: "var(--fg, #0f172a)", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <Clock className="animate-spin" size={36} style={{ color: "#5d5fef", marginBottom: "12px" }} />
          <p style={{ fontWeight: 500 }}>Loading Service Decision Portal...</p>
        </div>
      </div>
    )
  }

  if (error && !extension) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #f8fafc)", padding: "20px" }}>
        <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--stroke, #e2e8f0)", borderRadius: "12px", padding: "32px", maxWidth: "480px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <XCircle size={48} style={{ color: "#ef4444", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--fg, #0f172a)" }}>Link Expired or Invalid</h2>
          <p style={{ color: "var(--muted, #64748b)", fontSize: "14px", marginBottom: "24px" }}>{error}</p>
          <button onClick={() => navigate("/")} style={{ background: "#5d5fef", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  const isApprovedState = extension?.status === "admin_approved"
  const isAcceptedState = extension?.status === "customer_accepted" || extension?.status === "pending_assignment" || extension?.status === "resolved"
  const isDeclinedState = extension?.status === "customer_declined"

  return (
    <div className="min-h-screen bg-[var(--sevo-bg)] py-10 px-4 sm:px-6 font-sans text-[var(--sevo-text-primary)]">
      <div className="max-w-2xl mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <a href="/home" className="inline-flex items-center gap-2 mb-4 group cursor-pointer">
            <img
              src="/assets/sevo_emblem_transparent.png"
              alt="SEVO"
              className="h-9 w-auto shrink-0 object-contain group-hover:scale-105 transition-transform"
            />
            <img
              src="/assets/sevo_text_logo.png"
              alt="SEVO"
              className="shrink-0 object-contain"
              style={{ height: '18px', width: 'auto' }}
            />
          </a>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--sevo-primary-light)] text-[var(--sevo-primary)] border border-[var(--sevo-primary)]/20">
              <ShieldCheck size={14} /> SEVO Verified Service
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--sevo-text-primary)] tracking-tight">
            Additional Work Approval
          </h1>
          <p className="text-xs sm:text-sm text-[var(--sevo-text-secondary)] mt-1 font-medium">
            Service Request #{extension?.service_request || extension?.request_id}
          </p>
        </div>

        {/* Success Banner */}
        {decisionSuccess && (
          <div className={`p-4 sm:p-5 rounded-2xl mb-6 flex items-center gap-3.5 border ${
            decisionSuccess === "accepted"
              ? "bg-[var(--sevo-success-bg)] border-[var(--sevo-success-border)] text-[var(--sevo-success)]"
              : "bg-[var(--sevo-error-bg)] border-[var(--sevo-error-border)] text-[var(--sevo-error)]"
          }`}>
            {decisionSuccess === "accepted" ? <CheckCircle2 className="shrink-0" size={24} /> : <XCircle className="shrink-0" size={24} />}
            <div>
              <h4 className="font-extrabold text-sm sm:text-base leading-tight">
                {decisionSuccess === "accepted" ? "Scope Extension Approved!" : "Extension Declined"}
              </h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {decisionSuccess === "accepted" ? "Our technician has been notified and will proceed with the approved work." : "The technician will proceed only with the originally booked service scope."}
              </p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-[var(--sevo-surface)] border border-[var(--sevo-border)] rounded-3xl p-6 sm:p-8 shadow-md">
          {/* Status Badge */}
          <div className="flex justify-between items-center pb-5 border-b border-[var(--sevo-border)] mb-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--sevo-text-muted)]">Current Status</span>
              <div className="text-base font-extrabold text-[var(--sevo-text-primary)] mt-0.5">
                {extension?.status_display || "Pending Approval"}
              </div>
            </div>
            {isAcceptedState && <span className="bg-[var(--sevo-success-bg)] text-[var(--sevo-success)] border border-[var(--sevo-success-border)] px-3 py-1 rounded-full text-xs font-black">ACCEPTED</span>}
            {isDeclinedState && <span className="bg-[var(--sevo-error-bg)] text-[var(--sevo-error)] border border-[var(--sevo-error-border)] px-3 py-1 rounded-full text-xs font-black">DECLINED</span>}
            {isApprovedState && <span className="bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-xs font-black">ACTION REQUIRED</span>}
          </div>

          {/* Specialist Requirement Banner */}
          {extension?.requires_specialist && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3 text-blue-900 text-xs">
              <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div>
                <strong>Specialist Handoff Required:</strong> This work requires a certified specialist skill ({extension.required_skill || "Specialist Repair"}). Upon approval, a dedicated specialist technician will be assigned.
              </div>
            </div>
          )}

          {/* Items Breakdown */}
          <h3 className="text-sm font-extrabold text-[var(--sevo-text-primary)] uppercase tracking-wider mb-3">
            Proposed Material &amp; Labor Breakdown
          </h3>
          <div className="border border-[var(--sevo-border)] rounded-2xl overflow-hidden mb-6">
            <table className="w-full border-collapse text-xs sm:text-sm text-left">
              <thead>
                <tr className="bg-[var(--sevo-surface-raised)] border-b border-[var(--sevo-border)] text-[var(--sevo-text-muted)] font-bold">
                  <th className="p-3 sm:p-3.5">Item / Description</th>
                  <th className="p-3 sm:p-3.5 text-center">Qty</th>
                  <th className="p-3 sm:p-3.5">Sourcing</th>
                  <th className="p-3 sm:p-3.5 text-right">Customer Charge</th>
                </tr>
              </thead>
              <tbody>
                {/* Bug found: when extension.items was empty this used to
                    render a fully fabricated line item ("Run Capacitor 45uF
                    & AC Compressor Service", ₹2200.00) as if it were the
                    real proposed work -- on a screen whose entire purpose is
                    a real customer billing decision. A valid extension with
                    just a single approved amount and no itemized breakdown
                    is a legitimate case; show that honestly instead of
                    inventing items. Per-item billed_to_customer also no
                    longer fakes a ₹2200 fallback if it's ever missing. */}
                {(extension?.items && extension.items.length > 0) ? (
                  extension.items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--sevo-border)]/50 last:border-0">
                      <td className="p-3 sm:p-3.5 font-bold text-[var(--sevo-text-primary)]">{item.item_name}</td>
                      <td className="p-3 sm:p-3.5 text-center text-[var(--sevo-text-secondary)]">{item.quantity}</td>
                      <td className="p-3 sm:p-3.5 text-xs text-[var(--sevo-text-muted)]">Company Fulfilled</td>
                      <td className="p-3 sm:p-3.5 text-right font-black text-[var(--sevo-text-primary)]">₹{Number(item.billed_to_customer || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-[var(--sevo-border)]/50 last:border-0">
                    <td className="p-3 sm:p-3.5 text-[var(--sevo-text-muted)] italic" colSpan={4}>
                      No itemized breakdown provided -- see Additional Approved Amount below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Total Box */}
          <div className="bg-[var(--sevo-surface-raised)] border border-[var(--sevo-border)] rounded-2xl p-4 sm:p-5 mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-[var(--sevo-text-secondary)] mb-2">
              <span>Additional Approved Amount</span>
              <span className="font-bold text-[var(--sevo-text-primary)]">₹{Number(extension?.admin_approved_amount || extension?.approved_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-black text-[var(--sevo-text-primary)] pt-2.5 border-t border-[var(--sevo-border)]">
              <span>Total Supplemental Balance</span>
              <span className="text-[var(--sevo-primary)]">₹{Number(extension?.admin_approved_amount || extension?.approved_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Decision Form (Only if in admin_approved status) */}
          {isApprovedState && !decisionSuccess && (
            <div>
              <div className="mb-5">
                <label className="block text-xs font-bold text-[var(--sevo-text-primary)] mb-1.5">
                  Optional Instructions or Notes for Technician
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="e.g. Please proceed after 2 PM, or specific access instructions..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-xs sm:text-sm text-[var(--sevo-text-primary)] placeholder:text-[var(--sevo-text-muted)] focus:outline-none focus:border-[var(--sevo-primary)] resize-none"
                />
              </div>

              {error && (
                <div className="text-[var(--sevo-error)] text-xs mb-4 font-semibold">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleDecision("ACCEPT")}
                  disabled={submitting}
                  className="flex-1 bg-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-hover)] text-white font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={17} /> {submitting ? "Processing..." : "Approve Additional Scope"}
                </button>
                <button
                  onClick={() => handleDecision("DECLINE")}
                  disabled={submitting}
                  className="flex-1 bg-transparent hover:bg-red-50 text-[var(--sevo-error)] border border-[var(--sevo-error-border)] font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <XCircle size={17} /> {submitting ? "Processing..." : "Decline Extension"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
