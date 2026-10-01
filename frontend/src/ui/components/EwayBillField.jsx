import React from "react"

/**
 * Optional e-way bill reference for a GT shipment. SEVO records/warns only --
 * it never generates an e-way bill or validates it against the GST e-way
 * bill portal. Porter's own Terms of Service places e-way-bill
 * responsibility on the consignor and does not offer generation either, so
 * this mirrors that: a place to record the number for the consignor's own
 * compliance, plus a non-blocking warning (see GTOperationsConfig.eway_bill_required_above,
 * backend-computed) shown here when the server flags one is likely required.
 */
export function EwayBillField({ value, onChange, warning }) {
  return (
    <div className="flex flex-col text-left">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        E-way bill number <span className="normal-case font-medium text-slate-400">(optional, for your own records)</span>
      </label>
      <input
        type="text"
        maxLength={24}
        placeholder="e.g. 1234 5678 9012"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-slate-800 font-medium"
      />
      {warning && (
        <p className="text-[10px] text-amber-600 font-semibold mt-1">⚠ {warning}</p>
      )}
    </div>
  )
}

export default EwayBillField
