import React, { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import {
  createAdminPolicy,
  deactivateAdminPolicy,
  fetchAdminPolicies,
  updateAdminPolicy,
} from "../../../../api/logisticsAdminService.js"

const SCOPES = [
  { value: "", label: "All Goods & Transport (platform-wide)" },
  { value: "goods_transport_truck", label: "Mini Truck" },
  { value: "goods_transport_two_wheeler", label: "Two Wheeler" },
  { value: "packers_movers", label: "Packers & Movers" },
]

// Field definitions drive both the form and the payload, so the tab cannot drift from the API.
const KINDS = [
  {
    kind: "cancellation",
    title: "Cancellation fee",
    blurb:
      "Deducted from the refund when a customer cancels a paid booking. With no policy (or mode = none) a cancellation is never charged.",
    fields: [
      { name: "fee_mode", label: "Fee mode", type: "select", options: [["NONE", "No fee"], ["FLAT", "Flat amount (₹)"], ["PERCENT", "Percent of booking total"]] },
      { name: "flat_fee_amount", label: "Flat fee (₹)", type: "number", showIf: (f) => f.fee_mode === "FLAT" },
      { name: "percent_fee", label: "Percent fee (%)", type: "number", showIf: (f) => f.fee_mode === "PERCENT" },
      { name: "applies_only_after_assignment", label: "Only once a driver is assigned", type: "bool", showIf: (f) => f.fee_mode !== "NONE" },
      { name: "grace_period_seconds", label: "Free grace period after assignment (seconds)", type: "number", showIf: (f) => f.fee_mode !== "NONE" },
    ],
    defaults: { fee_mode: "NONE", flat_fee_amount: "0", percent_fee: "0", applies_only_after_assignment: true, grace_period_seconds: 0 },
  },
  {
    kind: "waiting",
    title: "Waiting (detention) charge",
    blurb:
      "Charged at reconciliation for time the driver waits at a stop beyond the free minutes. Off unless enabled here.",
    fields: [
      { name: "is_enabled", label: "Charge for waiting", type: "bool" },
      { name: "free_minutes_per_stop", label: "Free minutes per stop", type: "number", showIf: (f) => f.is_enabled },
      { name: "rate_per_minute", label: "Rate per extra minute (₹)", type: "number", showIf: (f) => f.is_enabled },
      { name: "max_charge_per_booking", label: "Cap per booking (₹, blank = none)", type: "number", nullable: true, showIf: (f) => f.is_enabled },
    ],
    defaults: { is_enabled: false, free_minutes_per_stop: 0, rate_per_minute: "0", max_charge_per_booking: "" },
  },
  {
    kind: "advance",
    title: "Advance payment",
    blurb:
      "Share of the booking total collected up-front when the payment order is created; the rest is due at completion. Off unless enabled here.",
    fields: [
      { name: "is_enabled", label: "Collect an advance", type: "bool" },
      { name: "advance_percent", label: "Advance (%)", type: "number", showIf: (f) => f.is_enabled },
    ],
    defaults: { is_enabled: false, advance_percent: "0" },
  },
  {
    kind: "extra_charge",
    title: "Toll & parking pass-through",
    blurb:
      "Lets a driver add an actual toll or parking receipt during the trip. The customer pays the receipt amount with the final fare and the driver is reimbursed in full. Off unless enabled here.",
    fields: [
      { name: "is_enabled", label: "Accept toll / parking receipts", type: "bool" },
      { name: "allow_toll", label: "Allow toll", type: "bool", showIf: (f) => f.is_enabled },
      { name: "allow_parking", label: "Allow parking", type: "bool", showIf: (f) => f.is_enabled },
      { name: "max_amount_per_item", label: "Largest single receipt (₹, blank = none)", type: "number", nullable: true, showIf: (f) => f.is_enabled },
      { name: "max_total_per_booking", label: "Cap per booking (₹, blank = none)", type: "number", nullable: true, showIf: (f) => f.is_enabled },
      { name: "require_receipt_photo", label: "Driver must upload a receipt photo", type: "bool", showIf: (f) => f.is_enabled },
    ],
    defaults: { is_enabled: false, allow_toll: true, allow_parking: true, max_amount_per_item: "", max_total_per_booking: "", require_receipt_photo: false },
  },
  {
    kind: "claim",
    title: "Damage & loss claims",
    blurb:
      "Liability included with every completed booking, without paid insurance: the lower of the fare and the cap below. Insured bookings keep their own cap. Off unless enabled here.",
    fields: [
      { name: "is_enabled", label: "Cover every booking", type: "bool" },
      { name: "included_liability_cap", label: "Included liability cap (₹)", type: "number", nullable: true, showIf: (f) => f.is_enabled },
      { name: "cap_at_fare", label: "Also limit to the booking fare", type: "bool", showIf: (f) => f.is_enabled },
      { name: "claim_window_hours", label: "Claim within (hours of delivery, blank = no limit)", type: "number", nullable: true, showIf: (f) => f.is_enabled },
      { name: "require_photo", label: "Require damage photos", type: "bool", showIf: (f) => f.is_enabled },
    ],
    defaults: { is_enabled: false, included_liability_cap: "", cap_at_fare: true, claim_window_hours: "", require_photo: false },
  },
  {
    kind: "insurance",
    title: "Transit insurance (paid add-on)",
    blurb:
      "Premium and liability cap for the optional insurance sold with prepaid Mini Truck / Two Wheeler bookings. With nothing configured the built-in defaults apply.",
    scopes: [{ value: "", label: "All Goods & Transport (platform-wide)" }],
    fields: [
      { name: "is_offered", label: "Offer insurance", type: "bool" },
      { name: "premium_percent", label: "Premium (% of declared value)", type: "number" },
      { name: "max_liability", label: "Highest declared value / liability (₹)", type: "number" },
    ],
    defaults: { is_offered: true, premium_percent: "2", max_liability: "500000" },
  },
  {
    kind: "operations",
    title: "Quote validity, payment window & high-value threshold",
    blurb:
      "How long a fare quote stays valid, how long an unpaid online booking is held, and the declared value that requires a named receiver. Nothing changes for bookings already quoted.",
    scopes: [{ value: "", label: "All Goods & Transport (platform-wide)" }],
    fields: [
      { name: "gt_quote_validity_minutes", label: "Mini Truck / Two Wheeler quote valid (minutes)", type: "number" },
      { name: "pm_instant_quote_validity_minutes", label: "P&M instant quote valid (minutes)", type: "number" },
      { name: "pm_estimate_validity_hours", label: "P&M survey estimate valid (hours)", type: "number" },
      { name: "online_payment_window_minutes", label: "Hold unpaid online booking (minutes)", type: "number" },
      { name: "high_value_consignment_threshold", label: "Named receiver required from declared value (₹)", type: "number" },
      { name: "checkpoint_radius_meters", label: "Driver must be within (metres) of pickup / drop", type: "number" },
      { name: "wallet_topup_enabled", label: "Let customers add money to their wallet", type: "bool" },
      { name: "wallet_max_topup", label: "Largest single recharge (blank = no limit)", type: "number", nullable: true, showIf: (f) => f.wallet_topup_enabled },
      { name: "wallet_max_balance", label: "Wallet balance cap (blank = no cap)", type: "number", nullable: true, showIf: (f) => f.wallet_topup_enabled },
      { name: "allow_wallet_part_payment", label: "Allow wallet + online split payment", type: "bool" },
      { name: "delivery_otp_required", label: "Require the customer's delivery OTP", type: "bool" },
      { name: "delivery_otp_ttl_minutes", label: "Delivery OTP valid for (minutes)", type: "number", showIf: (f) => f.delivery_otp_required },
      { name: "max_otp_attempts", label: "Wrong OTP entries allowed", type: "number", showIf: (f) => f.delivery_otp_required },
    ],
    defaults: { gt_quote_validity_minutes: 15, pm_instant_quote_validity_minutes: 30, pm_estimate_validity_hours: 48, online_payment_window_minutes: 30, high_value_consignment_threshold: "25000", checkpoint_radius_meters: 250, delivery_otp_required: true, delivery_otp_ttl_minutes: 30, max_otp_attempts: 5, allow_wallet_part_payment: false, wallet_topup_enabled: false, wallet_max_topup: "", wallet_max_balance: "" },
  },
  {
    kind: "ptl",
    title: "Part Truck Load (PTL) pricing",
    blurb:
      "Advance-booked, per-kg part-load trips on vehicles marked PTL-eligible (4-wheeler and larger) in the vehicle rate card. Slots come from Operating slots with category \"ptl\"; a route's own PTL rate (Lanes) overrides the rate here. The customer loads and unloads. Off unless enabled here.",
    scopes: [{ value: "", label: "All Goods & Transport (platform-wide)" }],
    fields: [
      { name: "is_enabled", label: "Accept Part Truck Load bookings", type: "bool" },
      { name: "rate_per_kg", label: "Rate per kg (₹)", type: "number", showIf: (f) => f.is_enabled },
      { name: "minimum_chargeable_weight_kg", label: "Minimum chargeable weight (kg, 0 = none)", type: "number", showIf: (f) => f.is_enabled },
      { name: "minimum_fare", label: "Minimum freight charge (₹, blank = none)", type: "number", nullable: true, showIf: (f) => f.is_enabled },
      { name: "min_advance_days", label: "Book at least (days ahead)", type: "number", showIf: (f) => f.is_enabled },
      { name: "load_assist_enabled", label: "Offer paid Load Assist (driver-assisted loading — execution workflow not built yet)", type: "bool", showIf: (f) => f.is_enabled },
      { name: "load_assist_fee", label: "Load Assist fee (₹)", type: "number", showIf: (f) => f.is_enabled && f.load_assist_enabled },
    ],
    defaults: { is_enabled: false, rate_per_kg: "0", minimum_chargeable_weight_kg: "0", minimum_fare: "", min_advance_days: 1, load_assist_enabled: false, load_assist_fee: "0" },
  },
]

function toForm(kindDef, row) {
  const base = { ...kindDef.defaults }
  if (!row) return base
  for (const f of kindDef.fields) {
    const v = row[f.name]
    base[f.name] = v === null || v === undefined ? (f.nullable ? "" : base[f.name]) : v
  }
  return base
}

function ScopeEditor({ kindDef, scope, row, onSaved, showToast }) {
  const [form, setForm] = useState(() => toForm(kindDef, row))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setForm(toForm(kindDef, row))
    setError("")
  }, [kindDef, row])

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const save = async () => {
    setSaving(true)
    setError("")
    const payload = kindDef.scopes ? {} : { service_category: scope.value }
    for (const f of kindDef.fields) payload[f.name] = form[f.name]
    const res = row
      ? await updateAdminPolicy(kindDef.kind, row.id, payload)
      : await createAdminPolicy(kindDef.kind, payload)
    setSaving(false)
    if (res.ok) {
      showToast?.(`${kindDef.title} saved for ${scope.label}.`, "success")
      onSaved()
    } else {
      setError(res.error?.message || "Could not save.")
    }
  }

  const clear = async () => {
    if (!row) return
    setSaving(true)
    const res = await deactivateAdminPolicy(kindDef.kind, row.id)
    setSaving(false)
    if (res.ok) {
      showToast?.(`${kindDef.title} removed for ${scope.label}.`, "success")
      onSaved()
    } else {
      setError(res.error?.message || "Could not remove.")
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{scope.label}</div>
        <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {row ? "Configured" : "Not configured — no effect"}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {kindDef.fields.filter((f) => !f.showIf || f.showIf(form)).map((f) => (
          <label key={f.name} className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {f.label}
            {f.type === "select" && (
              <select
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                value={form[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
              >
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            {f.type === "number" && (
              <input
                type="number" min="0" step="any"
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                value={form[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
            {f.type === "bool" && (
              <input
                type="checkbox" className="h-5 w-5"
                checked={Boolean(form[f.name])}
                onChange={(e) => set(f.name, e.target.checked)}
              />
            )}
          </label>
        ))}
      </div>
      {error && <div role="alert" className="text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving..." : row ? "Save changes" : "Configure"}
        </button>
        {row && (
          <button
            type="button" onClick={clear} disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-60 cursor-pointer"
          >
            Remove (no effect)
          </button>
        )}
      </div>
    </div>
  )
}

export function GTPoliciesTab({ showToast }) {
  const [policies, setPolicies] = useState(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const res = await fetchAdminPolicies()
    if (res.ok) {
      setPolicies(res.policies)
      setError("")
    } else {
      setError(res.error?.message || "Failed to load policies")
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div role="alert" className="text-sm font-semibold text-red-600">{error}</div>
  if (!policies) return <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw size={14} className="animate-spin" /> Loading policies…</div>

  const activeRow = (kind, scopeValue) =>
    (policies[kind] || []).find((r) => r.is_active && (r.service_category || "") === scopeValue) || null

  return (
    <div className="space-y-8">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        A category row overrides the platform-wide row for that category only. Nothing here changes a booking that is
        already quoted — cancellation and waiting charges are applied when the trip is cancelled or delivered.
      </p>
      {KINDS.map((kindDef) => (
        <section key={kindDef.kind} className="space-y-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{kindDef.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{kindDef.blurb}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(kindDef.scopes || SCOPES).map((scope) => (
              <ScopeEditor
                key={`${kindDef.kind}:${scope.value}`}
                kindDef={kindDef}
                scope={scope}
                row={activeRow(kindDef.kind, scope.value)}
                onSaved={load}
                showToast={showToast}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
