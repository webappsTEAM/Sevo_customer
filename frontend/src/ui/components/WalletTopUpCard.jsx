import React, { useState } from "react"
import { topUpWallet } from "../../api/gtPaymentService.js"

/** "Add money" box for the wallet tab. Renders nothing unless Admin enabled wallet recharge. */
export function WalletTopUpCard({ topup, onDone }) {
  const [amount, setAmount] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  if (!topup?.enabled) return null

  const submit = async () => {
    setBusy(true)
    setMsg("")
    const r = await topUpWallet(amount)
    setBusy(false)
    if (r.ok) {
      setAmount("")
      setMsg("Money added to your wallet.")
      onDone?.()
    } else if (!r.cancelled) {
      setMsg(r.message || "Could not add money.")
    }
  }

  const n = Number(amount)
  const valid = Number.isFinite(n) && n > 0 && (!topup.max_topup || n <= Number(topup.max_topup))
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4" data-testid="wallet-topup">
      <div className="text-sm font-extrabold text-slate-800 mb-2">Add money</div>
      <div className="flex gap-2">
        <input type="number" min="1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount" aria-label="Amount to add"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button type="button" onClick={submit} disabled={busy || !valid}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Adding..." : "Add"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {topup.max_topup ? `Up to ₹${Number(topup.max_topup).toLocaleString("en-IN")} at a time. ` : ""}
        {topup.max_balance ? `Wallet balance can be at most ₹${Number(topup.max_balance).toLocaleString("en-IN")}.` : ""}
      </p>
      {msg && <p role="status" className="mt-2 text-xs font-semibold text-slate-700">{msg}</p>}
    </div>
  )
}

export default WalletTopUpCard
