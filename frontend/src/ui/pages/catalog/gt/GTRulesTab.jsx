/**
 * GTRulesTab.jsx -- "Rules, Add-ons & Cities" tab of the Goods & Transport hub.
 *
 * Four business lists that had no screen in this Admin (Django /admin/ only, or nothing):
 *   - Prohibited goods      (what customers may not book; matched against the cargo description)
 *   - P&M add-on services   (optional priced extras on a Packers & Movers booking)
 *   - P&M surcharges        (peak-day / out-of-hours surcharges on a move)
 *   - Cities                (which cities are shown and which are launched for booking)
 *
 * Field definitions drive the form and the payload, like GTPoliciesTab. The server validates
 * every row with the model's own rules; "Deactivate" keeps the row for audit.
 */
import React, { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import {
  GT_ADMIN_LISTS,
  deactivateAdminListRow,
  fetchAdminListRows,
  saveAdminListRow,
} from "../../../../api/logisticsAdminService.js"

const WEEKDAY_HINT = "Monday=0 … Sunday=6, comma-separated (e.g. 5,6 for weekends)"

const LISTS = [
  {
    key: "prohibited",
    title: "Prohibited goods",
    blurb: "Cargo customers cannot book. Each keyword or phrase (one per line) is matched as a whole word against the cargo description.",
    summary: (r) => `${r.keyword_count ?? (r.keywords || "").split("\n").filter(Boolean).length} keyword(s)${r.applies_to_packers_movers ? "" : " · allowed on Packers & Movers"}`,
    name: (r) => r.label,
    defaults: { label: "", keywords: "", message: "", applies_to_packers_movers: true, is_active: true },
    fields: [
      { name: "label", label: "Name", type: "text", required: true },
      { name: "keywords", label: "Keywords (one per line)", type: "textarea", required: true },
      { name: "message", label: "Message shown to the customer (optional)", type: "text" },
      { name: "applies_to_packers_movers", label: "Also blocks Packers & Movers inventories", type: "bool" },
      { name: "is_active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "addons",
    title: "Packers & Movers add-on services",
    blurb: "Optional extras a customer can add to a move (e.g. appliance installation, extra helper). Priced on the server when the move is quoted.",
    summary: (r) => `₹${r.unit_price} ${r.pricing_mode === "FLAT" ? "flat" : r.pricing_mode === "PER_CFT" ? "per CFT" : `per unit (max ${r.max_quantity})`}${r.city ? ` · ${r.city}` : " · all cities"}${r.is_labour_only ? " · labour only" : ""}`,
    name: (r) => r.name,
    defaults: { code: "", name: "", description: "", city: "", pricing_mode: "FLAT", unit_price: "0", max_quantity: 1, is_labour_only: false, is_active: true },
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "code", label: "Code (fixed once created; blank = from name)", type: "text", createOnly: true },
      { name: "description", label: "Description", type: "text" },
      { name: "pricing_mode", label: "Pricing", type: "select", options: [["FLAT", "Flat fee"], ["PER_UNIT", "Per unit"], ["PER_CFT", "Per CFT of the move"]] },
      { name: "unit_price", label: "Price (₹)", type: "number" },
      { name: "max_quantity", label: "Max quantity (per-unit only)", type: "number", showIf: (f) => f.pricing_mode === "PER_UNIT" },
      { name: "city", label: "City (blank = every city)", type: "text" },
      { name: "is_labour_only", label: "Labour / helper only", type: "bool" },
      { name: "is_active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "surcharges",
    title: "Packers & Movers surcharges",
    blurb: "Extra charge for moves on peak days or outside normal hours. A move that matches no active rule is priced as usual. GST applies on top.",
    summary: (r) => `${r.percent > 0 ? `${r.percent}%` : ""}${r.percent > 0 && r.flat_amount > 0 ? " + " : ""}${r.flat_amount > 0 ? `₹${r.flat_amount}` : ""} · ${r.rule_type.replaceAll("_", " ").toLowerCase()}${r.city ? ` · ${r.city}` : ""}`,
    name: (r) => r.name,
    defaults: { name: "", rule_type: "WEEKDAY", city: "", weekdays: "", day_from: "", day_to: "", on_date: "", window_start: "", window_end: "", percent: "0", flat_amount: "0", is_active: true },
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "rule_type", label: "Applies to", type: "select", options: [["WEEKDAY", "Days of the week"], ["DAY_OF_MONTH", "Days of the month (peak period)"], ["DATE", "A specific date"], ["OUTSIDE_HOURS", "Outside normal service hours"]] },
      { name: "weekdays", label: `Weekdays (${WEEKDAY_HINT})`, type: "text", showIf: (f) => f.rule_type === "WEEKDAY" },
      { name: "day_from", label: "From day of month", type: "number", showIf: (f) => f.rule_type === "DAY_OF_MONTH" },
      { name: "day_to", label: "To day of month (may wrap, e.g. 28 to 3)", type: "number", showIf: (f) => f.rule_type === "DAY_OF_MONTH" },
      { name: "on_date", label: "Date", type: "date", showIf: (f) => f.rule_type === "DATE" },
      { name: "window_start", label: "Normal hours start", type: "time", showIf: (f) => f.rule_type === "OUTSIDE_HOURS" },
      { name: "window_end", label: "Normal hours end", type: "time", showIf: (f) => f.rule_type === "OUTSIDE_HOURS" },
      { name: "percent", label: "Surcharge % of move fare", type: "number" },
      { name: "flat_amount", label: "Flat surcharge (₹)", type: "number" },
      { name: "city", label: "City (blank = every city)", type: "text" },
      { name: "is_active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "cities",
    title: "Cities",
    blurb: "Launched cities accept bookings wherever an active Service Coverage zone serves them; a shown but not launched city appears as “coming soon”.",
    summary: (r) => `${r.is_launched ? "Launched" : "Coming soon"}${r.state ? ` · ${r.state}` : ""}`,
    name: (r) => r.name,
    defaults: { name: "", slug: "", state: "", is_launched: false, is_active: true, display_order: 0 },
    fields: [
      { name: "name", label: "City name", type: "text", required: true },
      { name: "slug", label: "Slug (used in booking links, e.g. hosur)", type: "text", required: true },
      { name: "state", label: "State", type: "text" },
      { name: "display_order", label: "Display order", type: "number" },
      { name: "is_launched", label: "Launched (accepts bookings)", type: "bool" },
      { name: "is_active", label: "Shown to customers", type: "bool" },
    ],
  },
]

const inputCls = "rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"

function toPayload(def, form, isNew) {
  const out = {}
  for (const f of def.fields) {
    if (f.createOnly && !isNew) continue
    if (f.showIf && !f.showIf(form)) continue
    let v = form[f.name]
    if ((f.type === "number" || f.type === "date" || f.type === "time") && v === "") v = null
    if (f.createOnly && v === "") continue
    out[f.name] = v
  }
  return out
}

function RowEditor({ def, row, onDone, showToast }) {
  const isNew = !row
  const [form, setForm] = useState(() => {
    const base = { ...def.defaults }
    if (row) for (const f of def.fields) base[f.name] = row[f.name] ?? base[f.name] ?? ""
    return base
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = (n, v) => setForm((p) => ({ ...p, [n]: v }))

  const save = async () => {
    const missing = def.fields.find((f) => f.required && !String(form[f.name] ?? "").trim())
    if (missing) { setError(`${missing.label} is required.`); return }
    setSaving(true); setError("")
    const res = await saveAdminListRow(GT_ADMIN_LISTS[def.key], row?.id, toPayload(def, form, isNew))
    setSaving(false)
    if (res.ok) { showToast?.(`${def.title}: saved.`, "success"); onDone(true) }
    else setError(res.error?.message || "Could not save.")
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3 bg-indigo-50/40 dark:bg-slate-900">
      <div className="grid gap-3 sm:grid-cols-2">
        {def.fields.filter((f) => (!f.showIf || f.showIf(form)) && !(f.createOnly && !isNew)).map((f) => (
          <label key={f.name} className={`flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
            {f.label}
            {f.type === "text" && <input className={inputCls} value={form[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />}
            {f.type === "textarea" && <textarea rows={4} className={inputCls} value={form[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />}
            {f.type === "number" && <input type="number" min="0" step="any" className={inputCls} value={form[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />}
            {f.type === "date" && <input type="date" className={inputCls} value={form[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />}
            {f.type === "time" && <input type="time" className={inputCls} value={(form[f.name] ?? "").slice(0, 5)} onChange={(e) => set(f.name, e.target.value)} />}
            {f.type === "select" && (
              <select className={inputCls} value={form[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            {f.type === "bool" && <input type="checkbox" className="h-5 w-5" checked={Boolean(form[f.name])} onChange={(e) => set(f.name, e.target.checked)} />}
          </label>
        ))}
      </div>
      {error && <div role="alert" className="text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white disabled:opacity-60 cursor-pointer">
          {saving ? "Saving..." : isNew ? "Add" : "Save changes"}
        </button>
        <button type="button" onClick={() => onDone(false)} className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  )
}

function ListSection({ def, showToast }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(null) // "new" | row id | null

  const load = useCallback(async () => {
    const res = await fetchAdminListRows(GT_ADMIN_LISTS[def.key])
    if (res.ok) { setRows(res.rows); setError("") } else setError(res.error?.message || "Failed to load.")
  }, [def.key])
  useEffect(() => { load() }, [load])

  const deactivate = async (row) => {
    const res = await deactivateAdminListRow(GT_ADMIN_LISTS[def.key], row.id)
    if (res.ok) { showToast?.(`${def.name(row)} deactivated.`, "success"); load() }
    else showToast?.(res.error?.message || "Could not deactivate.", "error")
  }
  const done = (changed) => { setEditing(null); if (changed) load() }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{def.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{def.blurb}</p>
        </div>
        {editing !== "new" && (
          <button type="button" onClick={() => setEditing("new")} className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white cursor-pointer shrink-0">
            + Add
          </button>
        )}
      </div>
      {editing === "new" && <RowEditor def={def} onDone={done} showToast={showToast} />}
      {error && <div role="alert" className="text-xs font-semibold text-red-600">{error}</div>}
      {!rows && !error && <div className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw size={12} className="animate-spin" /> Loading…</div>}
      {rows && rows.length === 0 && <div className="text-xs text-slate-500">Nothing configured yet.</div>}
      <div className="grid gap-2">
        {(rows || []).map((row) => editing === row.id ? (
          <RowEditor key={row.id} def={def} row={row} onDone={done} showToast={showToast} />
        ) : (
          <div key={row.id} className={`rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${row.is_active ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">
                {def.name(row)}
                {!row.is_active && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 break-words">{def.summary(row)}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => setEditing(row.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">Edit</button>
              {row.is_active && (
                <button type="button" onClick={() => deactivate(row)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-red-600 cursor-pointer">Deactivate</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function GTRulesTab({ showToast }) {
  return (
    <div className="space-y-8">
      {LISTS.map((def) => <ListSection key={def.key} def={def} showToast={showToast} />)}
    </div>
  )
}

export default GTRulesTab
