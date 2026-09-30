import React from "react"

/**
 * Porter-parity P&M add-on selector: rope pulling, appliance install/uninstall, electrician,
 * carpenter, labour-only -- whatever the Admin has configured for the city. Selections are sent
 * as `pm_addons` on the booking's cart_data; the server is the only source of truth for price
 * (see service_requests/services/pm_addons.py) -- the parent's estimate from `catalog` is
 * informational display only.
 */
export function PMAddOnPicker({ catalog, selected, onChange }) {
  if (!catalog || catalog.length === 0) return null

  const qtyFor = (code) => selected.find((s) => s.code === code)?.quantity || 0

  const toggle = (svc) => {
    const has = qtyFor(svc.code) > 0
    if (has) {
      onChange(selected.filter((s) => s.code !== svc.code))
    } else {
      onChange([...selected, { code: svc.code, quantity: 1 }])
    }
  }

  const setQty = (svc, qty) => {
    const q = Math.max(1, Math.min(svc.max_quantity, Number(qty) || 1))
    onChange(selected.map((s) => (s.code === svc.code ? { ...s, quantity: q } : s)))
  }

  return (
    <div className="mt-2" data-testid="pm-addon-picker">
      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Add-on services</p>
      <div className="grid gap-2">
        {catalog.map((svc) => {
          const checked = qtyFor(svc.code) > 0
          return (
            <div key={svc.code}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${checked ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggle(svc)} />
                <span>
                  <span className="block font-extrabold text-slate-800">{svc.name}</span>
                  <span className="block text-slate-500">
                    {svc.description || (svc.is_labour_only ? "Helper travels with your vehicle" : "")}
                    {" "}
                    {svc.pricing_mode === "FLAT" ? `₹${svc.unit_price}` :
                     svc.pricing_mode === "PER_CFT" ? `₹${svc.unit_price}/CFT` : `₹${svc.unit_price} each`}
                  </span>
                </span>
              </label>
              {checked && svc.pricing_mode === "PER_UNIT" && svc.max_quantity > 1 && (
                <input type="number" min={1} max={svc.max_quantity} value={qtyFor(svc.code)}
                  onChange={(e) => setQty(svc, e.target.value)} aria-label={`${svc.name} quantity`}
                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PMAddOnPicker
