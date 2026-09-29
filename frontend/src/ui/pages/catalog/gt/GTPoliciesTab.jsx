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
    const payload = { service_category: scope.value }
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
            {SCOPES.map((scope) => (
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
