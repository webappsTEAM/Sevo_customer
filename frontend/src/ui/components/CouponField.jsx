import React, { useEffect, useState } from "react"
import { apiRequest, extractApiErrorMessage } from "../../api/client.js"

/**
 * Optional coupon for a Goods Transport / Packers & Movers booking.
 * The server re-validates every rule (dates, usage limits, minimum booking,
 * eligibility) at booking time; this only previews the saving. `value` is the
 * applied { code, discount } or null.
 */
export function CouponField({ serviceCategory, cartTotal, value, onChange }) {
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const total = Number(cartTotal) || 0

  // A different fare can change eligibility (minimum booking), so drop an applied coupon
  // when the total moves; the customer re-applies against the new fare.
  useEffect(() => {
    if (value && total > 0 && value.forTotal !== total) onChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  if (total <= 0) return null

  const apply = async () => {
    const c = code.trim().toUpperCase()
    if (!c) return
    setBusy(true)
    setError("")
    try {
      const res = await apiRequest("/coupons/apply/", {
        method: "POST",
        body: { code: c, cart_total: total, service_category: serviceCategory },
      })
      const d = res?.data || res
      onChange({ code: d.coupon_code || c, discount: Number(d.discountAmount) || 0, final: Number(d.final_amount) || 0, forTotal: total })
      setCode("")
    } catch (err) {
      onChange(null)
      setError(extractApiErrorMessage(err, "This coupon could not be applied."))
    } finally {
      setBusy(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-semibold">
        <span>{value.code} applied — you save ₹{value.discount.toLocaleString("en-IN")} (pay ₹{value.final.toLocaleString("en-IN")})</span>
        <button type="button" className="underline" onClick={() => onChange(null)}>Remove</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col text-left">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Coupon code <span className="normal-case font-medium text-slate-400">(optional)</span></label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); if (error) setError("") }}
          placeholder="Enter code"
          className="flex-1 px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 font-medium"
        />
        <button type="button" disabled={busy || !code.trim()} onClick={apply}
          className="px-4 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
          {busy ? "…" : "Apply"}
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500 font-semibold mt-1">⚠ {error}</p>}
    </div>
  )
}

export default CouponField
