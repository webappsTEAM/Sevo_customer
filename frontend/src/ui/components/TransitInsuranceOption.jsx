import React, { useEffect, useState } from "react"
import { fetchInsuranceTerms } from "../../api/gtPaymentService.js"

/**
 * Optional transit insurance for goods transport. The premium shown comes from the server
 * (/logistics/insurance-terms/), the same figure that is billed. Insurance is only sold with
 * online / wallet payment, so with cash it is switched off and explained.
 *
 * value: null | { declaredValue: number, premium: string, cap: string }
 */
export function TransitInsuranceOption({ value, onChange, payMethod }) {
  const [enabled, setEnabled] = useState(false)
  const [declared, setDeclared] = useState("")
  const [terms, setTerms] = useState(null)
  const prepaid = payMethod && payMethod !== "cod"
  const [offered, setOffered] = useState(true)

  // Admin can stop offering insurance (GTInsurancePolicy); hide the option when it does.
  useEffect(() => {
    let live = true
    fetchInsuranceTerms(1000).then((r) => { if (live && r && r.offered === false) setOffered(false) }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    const amount = Number(declared)
    if (!enabled || !prepaid || !(amount > 0)) { setTerms(null); onChange(null); return }
    let live = true
    const t = setTimeout(async () => {
      const r = await fetchInsuranceTerms(amount)
      if (!live) return
      setTerms(r)
      onChange(r ? { declaredValue: amount, premium: r.premium, cap: r.liability_cap } : null)
    }, 350)
    return () => { live = false; clearTimeout(t) }
  }, [enabled, declared, prepaid]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!offered) return null

  return (
    <div className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-xs">
      <label className="flex items-center gap-2 font-extrabold text-slate-800 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Add transit insurance for your goods
      </label>
      {!enabled && (
        <p className="mt-1 text-slate-500">Without insurance your goods are not insured; our liability for loss or damage is limited as set out in the Terms of Service.</p>
      )}
      {enabled && !prepaid && (
        <p className="mt-1 text-amber-700">Insurance is available with online or wallet payment. Choose one above to add it.</p>
      )}
      {enabled && prepaid && (
        <div className="mt-2">
          <input type="number" min="1" inputMode="decimal" value={declared} onChange={(e) => setDeclared(e.target.value)}
            placeholder="Declared value of goods (₹)" className="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          {terms && (
            <p className="mt-1 text-slate-600">
              Premium ₹{Number(terms.premium).toLocaleString("en-IN")} ({terms.rate_percent}% of declared value),
              covers up to ₹{Number(terms.liability_cap).toLocaleString("en-IN")}. Added to your fare.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default TransitInsuranceOption
