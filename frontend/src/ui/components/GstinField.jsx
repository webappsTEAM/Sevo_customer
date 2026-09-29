import React from "react"

// State code (01-38, 97, 99) + PAN + entity + "Z" + check character.
const GSTIN_RE = /^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const normalizeGstin = (v) => String(v || "").replace(/\s+/g, "").toUpperCase().slice(0, 15)
export const isValidGstin = (v) => !v || GSTIN_RE.test(normalizeGstin(v))

/** Optional customer GSTIN for a GST invoice. Format-checked only; never changes the fare. */
export function GstinField({ value, onChange }) {
  const bad = !!value && !isValidGstin(value)
  return (
    <div className="flex flex-col text-left">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        GSTIN for invoice <span className="normal-case font-medium text-slate-400">(optional)</span>
      </label>
      <input
        type="text"
        maxLength={15}
        placeholder="15-character GSTIN"
        value={value}
        onChange={(e) => onChange(normalizeGstin(e.target.value))}
        className="w-full px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
        aria-invalid={bad}
      />
      {bad && <p className="text-[10px] text-red-500 font-semibold mt-1">⚠ Enter a valid 15-character GSTIN.</p>}
    </div>
  )
}

/** Optional loading / unloading help, charged only when the tier has an admin-set charge. */
export function LoadingHelpToggle({ charge, checked, onChange }) {
  const amount = Number(charge) || 0
  if (amount <= 0) return null
  return (
    <label className="flex items-start gap-2 text-left text-xs text-slate-700 font-medium cursor-pointer">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Need loading &amp; unloading help? <span className="text-slate-500">(+₹{amount.toLocaleString("en-IN")}; untick if you will load it yourself)</span>
      </span>
    </label>
  )
}

export default GstinField
