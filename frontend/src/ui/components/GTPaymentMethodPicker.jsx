import React, { useEffect, useState } from "react"
import { fetchPaymentConfig, fetchWalletBalance } from "../../api/gtPaymentService.js"

/**
 * Cash / Pay online / SEVO wallet, for Goods Transport and Packers & Movers.
 * Options come from the server (/payment/config/) and the customer's real wallet balance; the
 * parent only stores the chosen value ("cod" | "online" | "wallet").
 */
export function GTPaymentMethodPicker({ value, onChange, total }) {
  const [cfg, setCfg] = useState({ online_available: false })
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    let live = true
    fetchPaymentConfig().then((c) => live && setCfg(c))
    fetchWalletBalance().then((b) => live && setWallet(b))
    return () => { live = false }
  }, [])

  const walletEnough = wallet != null && total != null && Number(total) > 0 && wallet >= Number(total)
  const options = [
    { id: "cod", label: "Cash on delivery", hint: "Pay the driver at the end of the trip", enabled: true },
    { id: "online", label: "Pay online", hint: "UPI, cards, netbanking", enabled: !!cfg.online_available },
    ...(wallet != null && wallet > 0
      ? [{ id: "wallet", label: `SEVO wallet (₹${wallet.toLocaleString("en-IN")})`,
           hint: walletEnough ? "Pay the full fare from your wallet" : "Balance is lower than the fare", enabled: walletEnough }]
      : []),
  ].filter((o) => o.enabled || o.id === "wallet")

  useEffect(() => {
    if (!options.some((o) => o.id === value && o.enabled)) onChange("cod")
  }, [cfg.online_available, wallet, total]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-4" role="radiogroup" aria-label="Payment method">
      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Payment method</p>
      <div className="grid gap-2">
        {options.map((o) => (
          <label key={o.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs cursor-pointer ${value === o.id ? "border-slate-900 bg-slate-50" : "border-slate-200"} ${o.enabled ? "" : "opacity-50 cursor-not-allowed"}`}>
            <input type="radio" name="gt-pay-method" checked={value === o.id} disabled={!o.enabled}
              onChange={() => onChange(o.id)} />
            <span>
              <span className="block font-extrabold text-slate-800">{o.label}</span>
              <span className="block text-slate-500">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default GTPaymentMethodPicker
