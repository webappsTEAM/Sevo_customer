import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowRight, Check, History, Info, Lock, Pencil,
  RefreshCw, Search, ShieldCheck, Truck,
} from "lucide-react"
import { Button, Input, Modal, Select, TextArea, formatDateTime } from "../../components/kit.jsx"
import { ToastBanner, useToast } from "./useToast.jsx"
import {
  fetchAdminTierHistory,
  fetchAdminTiers,
  updateAdminTier,
} from "../../../api/logisticsAdminService.js"

/**
 * Goods & Transport rate card.
 *
 * There are deliberately NO rate values anywhere in this file. Every number
 * on the screen is read from the server's ServiceTier rows, so the seeded
 * launch rate card stays the single source of the defaults and an edit made
 * here is immediately what the screen shows. Hard-coding a rate in the admin
 * UI would mean the screen and the fare engine could disagree, which is the
 * one failure mode a pricing screen must not have.
 *
 * This page also computes nothing. quote_logistics_fare() on the server is
 * the single fare authority; this edits the rows that authority reads.
 */

const PRICING_FIELDS = [
  {
    key: "base_fare", label: "Base fare", short: "Base fare", unit: "₹",
    kind: "money", nullable: true,
    hint: "Fixed component of every fare on this tier. Falls back to the starting price when left blank.",
  },
  {
    key: "per_km_rate", label: "Per km rate", short: "Per km", unit: "₹ / km",
    kind: "money", nullable: true,
    hint: "Charged for each kilometre beyond the free km. Leave blank to keep this tier on flat pricing.",
  },
  {
    key: "free_km", label: "Free km", short: "Free km", unit: "km",
    kind: "money", nullable: false,
    hint: "Distance already covered by the base fare, before the per-km rate starts applying.",
  },
  {
    key: "minimum_fare", label: "Minimum fare", short: "Min fare", unit: "₹",
    kind: "money", nullable: true,
    hint: "Floor applied after everything else. Blank means this tier has no floor.",
  },
  {
    key: "loading_unloading_charge", label: "Loading / unloading", short: "Load / unload", unit: "₹",
    kind: "money", nullable: false,
    hint: "Added once per trip.",
  },
  {
    key: "additional_stop_charge", label: "Additional stop", short: "Extra stop", unit: "₹ / stop",
    kind: "money", nullable: false,
    hint: "Charged per stop beyond the standard two (one pickup, one drop).",
  },
  {
    key: "surge_multiplier", label: "Surge multiplier", short: "Surge", unit: "x",
    kind: "money", nullable: false,
    hint: "Multiplies the whole computed fare. A fixed per-tier value between 0.01 and 5.00 — not a live demand engine.",
  },
  {
    key: "starting_price", label: "Starting price", short: "Starting price", unit: "₹",
    kind: "money", nullable: false,
    hint: "The “from” price customers see on the booking card. Display only — a distance-priced trip is charged by the formula above.",
  },
]

const DESCRIPTIVE_FIELDS = [
  { key: "name", label: "Tier name", kind: "text" },
  { key: "capacity_label", label: "Capacity label", kind: "text", hint: "Shown on the booking card, e.g. the payload this vehicle carries." },
  { key: "dimensions_label", label: "Dimensions label", kind: "text" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "order", label: "Display order", kind: "int", hint: "Lower numbers appear first on the booking page." },
  {
    key: "is_active", label: "Bookable", kind: "bool",
    hint: "Turning this off hides the tier from new bookings. Jobs already booked on it are unaffected.",
  },
]

const ALL_FIELDS = [...PRICING_FIELDS, ...DESCRIPTIVE_FIELDS]
const PRICING_KEYS = new Set(PRICING_FIELDS.map((f) => f.key))

function num(value) {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

function formatValue(field, value) {
  if (field.kind === "bool") return value ? "Yes" : "No"
  if (value === null || value === undefined || value === "") return "Not set"
  if (field.kind === "money" || field.kind === "int") {
    const n = Number(value)
    if (Number.isNaN(n)) return String(value)
    if (field.kind === "int") return String(n)
    const body = n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (field.unit === "x") return `${body}x`
    if (field.unit === "km") return `${body} km`
    if (field.unit === "₹ / km") return `₹${body} / km`
    if (field.unit === "₹ / stop") return `₹${body} / stop`
    return `₹${body}`
  }
  return String(value)
}

function formFromTier(tier) {
  const form = {}
  for (const field of ALL_FIELDS) {
    const value = tier[field.key]
    form[field.key] = field.kind === "bool"
      ? Boolean(value)
      : (value === null || value === undefined ? "" : String(value))
  }
  return form
}

/**
 * Which fields the form would actually change.
 *
 * Mirrors changed_fields() in logistics/pricing_admin.py: money fields are
 * compared numerically, so re-opening a form that renders 22.00 as "22" and
 * saving it is correctly seen as no change and writes no audit rows. This
 * comparison has to be at least as sensitive as the server's — a difference
 * this misses is a field the page never sends, which would look to the
 * operator like a silent failure to save.
 */
function diffFields(tier, form) {
  const out = []
  for (const field of ALL_FIELDS) {
    if (!(field.key in form)) continue
    const before = tier[field.key]
    const after = form[field.key]
    if (field.kind === "money" || field.kind === "int") {
      if (num(before) === num(after)) continue
    } else if (field.kind === "bool") {
      if (Boolean(before) === Boolean(after)) continue
    } else if (String(before ?? "") === String(after ?? "")) {
      continue
    }
    out.push({ field, before, after })
  }
  return out
}

/** Only the changed fields go on the wire — the server writes one audit row per field it receives. */
function toPayload(diff) {
  const payload = {}
  for (const { field, after } of diff) {
    if (field.kind === "bool") payload[field.key] = Boolean(after)
    else if (field.kind === "int") payload[field.key] = after === "" ? 0 : Number(after)
    else if (field.kind === "money") payload[field.key] = after === "" ? null : String(after)
    else payload[field.key] = after ?? ""
  }
  return payload
}

const PRICE_LOCK_FALLBACK =
  "Rate changes apply to NEW quotes and bookings only. Jobs already booked keep the price they were quoted at, including any that are still in progress."

function FieldError({ messages }) {
  if (!messages || !messages.length) return null
  return (
    <div className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
      {messages.join(" ")}
    </div>
  )
}

function ModePill({ distancePriced }) {
  return distancePriced ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
      Distance
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      Flat
    </span>
  )
}

export function GTPricingPage() {
  const [tiers, setTiers] = useState([])
  const [meta, setMeta] = useState(null)
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [city, setCity] = useState("")
  const [category, setCategory] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [reason, setReason] = useState("")
  const [stage, setStage] = useState("edit")
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const [historyTier, setHistoryTier] = useState(null)
  const [historyRows, setHistoryRows] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")

  const [toast, showToast] = useToast()

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    const res = await fetchAdminTiers({ city, category, is_active: activeFilter, search })
    if (res.ok) {
      setTiers(res.tiers)
      if (res.meta) setMeta(res.meta)
      if (res.notice) setNotice(res.notice)
    } else {
      setTiers([])
      setLoadError(res.error.message)
    }
    setLoading(false)
  }, [city, category, activeFilter, search])

  useEffect(() => { load() }, [load])

  const canModifyPrice = Boolean(meta?.can_modify_price)
  const canEdit = Boolean(meta?.can_edit)
  const priceLock = notice || PRICE_LOCK_FALLBACK

  // If the server ever grows a pricing field this screen does not render,
  // say so rather than quietly presenting a partial rate card as complete.
  const unrenderedFields = useMemo(() => {
    if (!Array.isArray(meta?.pricing_fields)) return []
    return meta.pricing_fields.filter((key) => !PRICING_KEYS.has(key))
  }, [meta])

  const cityOptions = useMemo(() => ([
    { value: "", label: "All cities" },
    ...(meta?.cities || []).filter(Boolean).map((c) => ({ value: c, label: c })),
  ]), [meta])

  const categoryOptions = useMemo(() => ([
    { value: "", label: "All categories" },
    ...(meta?.categories || []).map((c) => ({ value: c.value, label: c.label })),
  ]), [meta])

  const pendingDiff = useMemo(
    () => (editing ? diffFields(editing, form) : []),
    [editing, form],
  )
  const pricingDiff = useMemo(() => pendingDiff.filter((d) => PRICING_KEYS.has(d.field.key)), [pendingDiff])
  const descriptiveDiff = useMemo(() => pendingDiff.filter((d) => !PRICING_KEYS.has(d.field.key)), [pendingDiff])

  // Setting or clearing per_km_rate is not one rate among eight: it moves the
  // whole tier between the flat starting price and the distance formula, and
  // silently makes the other six rates live or inert. Called out on its own.
  const modeChange = useMemo(() => {
    const row = pendingDiff.find((d) => d.field.key === "per_km_rate")
    if (!row) return null
    const before = num(row.before)
    const after = num(row.after)
    if (before === null && after !== null) return "to_distance"
    if (before !== null && after === null) return "to_flat"
    return null
  }, [pendingDiff])

  const closeEditor = () => {
    setEditing(null)
    setForm({})
    setReason("")
    setStage("edit")
    setFieldErrors({})
    setFormError(null)
  }

  const openEditor = (tier) => {
    setEditing(tier)
    setForm(formFromTier(tier))
    setReason("")
    setStage("edit")
    setFieldErrors({})
    setFormError(null)
  }

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  /**
   * Client-side checks are a courtesy, not the authority: they catch a blank
   * required rate and a non-number before a round trip. Ranges (per-field
   * minimums, the surge ceiling) are left to the model validators so there is
   * exactly one place that decides what a legal rate is.
   */
  const review = () => {
    const errors = {}
    for (const field of PRICING_FIELDS) {
      const raw = form[field.key]
      if (raw === "" || raw === null || raw === undefined) {
        if (!field.nullable) {
          errors[field.key] = ["This rate is required. Enter 0 if this tier should not charge it."]
        }
        continue
      }
      if (Number.isNaN(Number(raw))) errors[field.key] = ["Enter a number."]
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setFormError({ message: "Some values need fixing before these changes can be reviewed." })
      return
    }
    if (!pendingDiff.length) {
      setFormError({ message: "Nothing has changed yet." })
      return
    }
    if (pricingDiff.length && !reason.trim()) {
      setFieldErrors({ reason: ["A reason is required when changing rates."] })
      setFormError({ message: "A reason is required when changing rates. It is stored alongside the old and new values." })
      return
    }
    setFieldErrors({})
    setFormError(null)
    setStage("confirm")
  }

  const adoptServerVersion = (current) => {
    setEditing(current)
    setForm(formFromTier(current))
    setTiers((rows) => rows.map((row) => (row.id === current.id ? current : row)))
    setFieldErrors({})
    setFormError(null)
    setStage("edit")
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const res = await updateAdminTier(editing.id, toPayload(pendingDiff), {
      reason: reason.trim(),
      expectedUpdatedAt: editing.updated_at,
    })
    setSaving(false)

    if (res.ok) {
      const label = editing.name
      const count = res.changed.length
      closeEditor()
      showToast(
        count
          ? `${label}: ${count} field${count === 1 ? "" : "s"} updated. Applies to new quotes only.`
          : "No changes to save.",
      )
      load()
      return
    }

    const err = res.error
    setStage("edit")
    setFormError(err)
    const next = {}
    if (err.errors && typeof err.errors === "object") {
      for (const [key, value] of Object.entries(err.errors)) {
        next[key] = Array.isArray(value) ? value.map(String) : [String(value)]
      }
    }
    if (Array.isArray(err.fields)) {
      for (const key of err.fields) {
        if (next[key]) continue
        next[key] = [err.code === "PRICING_FORBIDDEN"
          ? "Your role is not allowed to change this rate."
          : "This field needs a value."]
      }
    }
    if (err.code === "REASON_REQUIRED") next.reason = [err.message]
    setFieldErrors(next)
  }

  const openHistory = async (tier) => {
    setHistoryTier(tier)
    setHistoryRows([])
    setHistoryError("")
    setHistoryLoading(true)
    const res = await fetchAdminTierHistory(tier.id)
    if (res.ok) setHistoryRows(res.rows)
    else setHistoryError(res.error.message)
    setHistoryLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <ToastBanner toast={toast} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Goods &amp; Transport Rate Card
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              The live rates the fare engine reads for every Goods &amp; Transport quote.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={[
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold",
            canModifyPrice
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
          ].join(" ")}>
            {canModifyPrice ? <ShieldCheck size={13} /> : <Lock size={13} />}
            {canModifyPrice ? "You can change rates" : canEdit ? "View rates · edit details only" : "View only"}
          </span>
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/25 bg-indigo-50/60 dark:bg-indigo-500/10 px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
        <p className="text-[13px] font-medium text-indigo-900 dark:text-indigo-200">{priceLock}</p>
      </div>

      {unrenderedFields.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
            The server reports pricing fields this screen does not show yet: {unrenderedFields.join(", ")}.
            They are unchanged by anything you do here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select label="City" options={cityOptions} value={city} onChange={(e) => setCity(e.target.value)} />
        <Select label="Vehicle category" options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select
          label="Status"
          options={[
            { value: "", label: "Active and inactive" },
            { value: "true", label: "Active only" },
            { value: "false", label: "Inactive only" },
          ]}
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        />
        <Input
          label="Search"
          icon={<Search size={16} />}
          placeholder="Tier name or slug"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loadError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
          <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">{loadError}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1180px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Tier</th>
                <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Pricing</th>
                {PRICING_FIELDS.map((field) => (
                  <th
                    key={field.key}
                    title={field.hint}
                    className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right whitespace-nowrap"
                  >
                    {field.short}
                  </th>
                ))}
                <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr><td colSpan={PRICING_FIELDS.length + 4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">Loading rate card…</td></tr>
              )}
              {!loading && tiers.length === 0 && !loadError && (
                <tr><td colSpan={PRICING_FIELDS.length + 4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">No tiers match these filters.</td></tr>
              )}
              {!loading && tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-slate-900 dark:text-white">{tier.name}</div>
                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                      {tier.slug} · {tier.city} · {tier.category_display}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top"><ModePill distancePriced={tier.is_distance_priced} /></td>
                  {PRICING_FIELDS.map((field) => (
                    <td
                      key={field.key}
                      className={[
                        "px-3 py-3 text-right align-top tabular-nums whitespace-nowrap",
                        tier[field.key] === null || tier[field.key] === undefined
                          ? "text-slate-300 dark:text-slate-600"
                          : "text-slate-700 dark:text-slate-200 font-semibold",
                      ].join(" ")}
                    >
                      {tier[field.key] === null || tier[field.key] === undefined ? "—" : formatValue(field, tier[field.key])}
                    </td>
                  ))}
                  <td className="px-3 py-3 align-top">
                    <span className={[
                      "inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold",
                      tier.is_active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    ].join(" ")}>
                      {tier.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openHistory(tier)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <History size={13} /> History
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(tier)}
                        disabled={!canModifyPrice && !canEdit}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil size={13} /> {canModifyPrice ? "Edit rates" : canEdit ? "Edit details" : "View"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={stage === "confirm" ? "Confirm rate change" : `Edit ${editing.name}`}
          onClose={saving ? () => {} : closeEditor}
          maxWidth="max-w-3xl"
        >
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-4 py-3 mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Affected tier</div>
            <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{editing.name}</div>
            <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {editing.category_display} · {editing.city} · <span className="font-mono">{editing.slug}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
              Last changed {editing.updated_at ? formatDateTime(editing.updated_at) : "—"}
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 mb-5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
              <div className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">
                {formError.message}
                {formError.code === "TIER_CHANGED_ELSEWHERE" && formError.current && (
                  <div className="mt-2">
                    <Button variant="danger" onClick={() => adoptServerVersion(formError.current)}>
                      Load the current values
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {stage === "edit" && (
            <div className="space-y-6">
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rates</h4>
                  {!canModifyPrice && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      <Lock size={12} /> Your role cannot change rates
                    </span>
                  )}
                </div>
                {!editing.is_distance_priced && (
                  <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-3">
                    This tier is on flat pricing: only the starting price is charged. Setting a per-km rate switches
                    it to the distance formula and makes the other rates take effect.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PRICING_FIELDS.map((field) => (
                    <div key={field.key}>
                      <Input
                        label={`${field.label} (${field.unit})`}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={form[field.key] ?? ""}
                        placeholder={field.nullable ? "Not set" : "0.00"}
                        disabled={!canModifyPrice || saving}
                        hint={field.hint}
                        onChange={(e) => setField(field.key, e.target.value)}
                      />
                      <FieldError messages={fieldErrors[field.key]} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Details</h4>
                  {!canEdit && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      <Lock size={12} /> Your role cannot change details
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DESCRIPTIVE_FIELDS.map((field) => (
                    <div key={field.key} className={field.kind === "textarea" ? "sm:col-span-2" : ""}>
                      {field.kind === "textarea" ? (
                        <TextArea
                          label={field.label}
                          value={form[field.key] ?? ""}
                          disabled={!canEdit || saving}
                          hint={field.hint}
                          onChange={(e) => setField(field.key, e.target.value)}
                        />
                      ) : field.kind === "bool" ? (
                        <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                            checked={Boolean(form[field.key])}
                            disabled={!canEdit || saving}
                            onChange={(e) => setField(field.key, e.target.checked)}
                          />
                          <span>
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{field.label}</span>
                            {field.hint && <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{field.hint}</span>}
                          </span>
                        </label>
                      ) : (
                        <Input
                          label={field.label}
                          type={field.kind === "int" ? "number" : "text"}
                          step={field.kind === "int" ? "1" : undefined}
                          value={form[field.key] ?? ""}
                          disabled={!canEdit || saving}
                          hint={field.hint}
                          onChange={(e) => setField(field.key, e.target.value)}
                        />
                      )}
                      <FieldError messages={fieldErrors[field.key]} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <TextArea
                  label="Reason for this change"
                  value={reason}
                  disabled={saving}
                  placeholder="e.g. Diesel price revision approved for September"
                  hint="Required whenever a rate changes. Stored in the pricing history with the old and new values."
                  onChange={(e) => setReason(e.target.value)}
                />
                <FieldError messages={fieldErrors.reason} />
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {pendingDiff.length === 0
                    ? "No changes yet"
                    : `${pendingDiff.length} change${pendingDiff.length === 1 ? "" : "s"} ready to review`}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={closeEditor} disabled={saving}>Cancel</Button>
                  <Button onClick={review} disabled={saving || pendingDiff.length === 0}>
                    Review changes <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {stage === "confirm" && (
            <div className="space-y-5">
              {modeChange && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">
                    {modeChange === "to_distance"
                      ? "This switches the tier from flat pricing to the distance formula. The base fare, free km, loading and stop charges start applying to new quotes."
                      : "This switches the tier back to flat pricing. New quotes will be charged the starting price, and the distance rates below stop applying."}
                  </p>
                </div>
              )}

              {pricingDiff.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Rate changes ({pricingDiff.length})
                  </h4>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rate</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Current</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">New</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pricingDiff.map(({ field, before, after }) => (
                          <tr key={field.key}>
                            <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{field.label}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400 line-through">
                              {formatValue(field, before)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-extrabold text-slate-900 dark:text-white">
                              {formatValue(field, after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {descriptiveDiff.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Detail changes ({descriptiveDiff.length})
                  </h4>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {descriptiveDiff.map(({ field, before, after }) => (
                      <div key={field.key} className="px-4 py-2.5 text-sm">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{field.label}</div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                          <span className="line-through">{formatValue(field, before) || "—"}</span>
                          <ArrowRight size={12} className="inline mx-2" />
                          <span className="font-bold text-slate-900 dark:text-white">{formatValue(field, after) || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {reason.trim() && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Reason recorded</h4>
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3">
                    {reason.trim()}
                  </p>
                </section>
              )}

              <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/25 bg-indigo-50/60 dark:bg-indigo-500/10 px-4 py-3">
                <Info size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                <div className="text-[13px] font-medium text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold">These rates apply to new quotes and bookings only.</span>{" "}
                  {priceLock}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setStage("edit")} disabled={saving}>Back</Button>
                <Button onClick={save} disabled={saving}>
                  <Check size={14} className="mr-1.5" />
                  {saving ? "Saving…" : "Confirm and save"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {historyTier && (
        <Modal
          title={`Pricing history — ${historyTier.name}`}
          onClose={() => setHistoryTier(null)}
          maxWidth="max-w-3xl"
        >
          {historyLoading && <div className="py-10 text-center text-slate-500 dark:text-slate-400">Loading history…</div>}
          {!historyLoading && historyError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
              <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">{historyError}</p>
            </div>
          )}
          {!historyLoading && !historyError && historyRows.length === 0 && (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400">
              No recorded changes for this tier yet.
            </div>
          )}
          {!historyLoading && historyRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {historyRows.map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{row.field_name}</span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {row.changed_by_name} · {formatDateTime(row.created_at)}
                    </span>
                  </div>
                  <div className="text-[13px] mt-1 text-slate-600 dark:text-slate-300 tabular-nums break-words">
                    <span className="line-through text-slate-400 dark:text-slate-500">{row.old_value || "—"}</span>
                    <ArrowRight size={12} className="inline mx-2" />
                    <span className="font-bold text-slate-900 dark:text-white">{row.new_value || "—"}</span>
                  </div>
                  {row.reason && (
                    <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1">{row.reason}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

export default GTPricingPage
