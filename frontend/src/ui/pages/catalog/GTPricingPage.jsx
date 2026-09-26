import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowRight, History, Info, Lock,
  RefreshCw, Search, ShieldCheck, Truck, Layers, Package, Home, Clock,
  Navigation, HelpCircle, MapPinned
} from "lucide-react"
import { Button, Input, Modal, Select, formatDateTime } from "../../components/kit.jsx"
import { ToastBanner, useToast } from "./useToast.jsx"
import {
  fetchAdminTierHistory,
  fetchAdminTiers,
} from "../../../api/logisticsAdminService.js"
import { GTCategoriesTab } from "./gt/GTCategoriesTab.jsx"
import { GTItemsTab } from "./gt/GTItemsTab.jsx"
import { GTPackersMoversTab } from "./gt/GTPackersMoversTab.jsx"
import { GTSlotsTab } from "./gt/GTSlotsTab.jsx"
import { GTLanesTab } from "./gt/GTLanesTab.jsx"
import { GTFaqsTab } from "./gt/GTFaqsTab.jsx"
import { GTCoverageTab } from "./GTCoverageTab.jsx"
import { GTPackersMoversHelpersPanel } from "./GTPackersMoversHelpersPanel.jsx"


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
    key: "gst_rate", label: "GST included", short: "GST incl.", unit: "%",
    kind: "rate", nullable: true,
    hint: "GST already inside the fare (the fare does not change). Invoices show this component. Set on the Catalog package.",
  },
  {
    key: "starting_price", label: "Starting price", short: "Starting price", unit: "₹",
    kind: "money", nullable: false,
    hint: "The “from” price customers see on the booking card. Display only — a distance-priced trip is charged by the formula above.",
  },
]

const PRICING_KEYS = new Set(PRICING_FIELDS.map((f) => f.key))

function num(value) {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

function formatValue(field, value) {
  if (field.kind === "bool") return value ? "Yes" : "No"
  if (value === null || value === undefined || value === "") return "Not set"
  if (field.kind === "rate") {
    const r = Number(value)
    return Number.isNaN(r) || r <= 0 ? "None" : `${r.toFixed(2)}%`
  }
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

const PRICE_LOCK_FALLBACK =
  "Rate changes apply to NEW quotes and bookings only. Jobs already booked keep the price they were quoted at, including any that are still in progress."

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
  const [activeTab, setActiveTab] = useState("tiers")
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

  // Goods & Transport unification, Phase 2: this screen is now read-only for
  // everyone, regardless of role -- pricing lives on Package (Catalog >
  // Packages) and the server rejects PATCHes here outright (see
  // logistics/admin_views.py AdminServiceTierDetailView.patch).
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
              Goods &amp; Transport Management Hub
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Unified administration for vehicle tiers, cargo categories, inventory items, relocation pricing, and operating slots.
            </p>
          </div>
        </div>
        {activeTab === "tiers" && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Lock size={13} /> Reference only -- edit via Packages
            </span>
            <Button variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto hide-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("tiers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "tiers"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Truck size={15} />
          Rate Cards &amp; Tiers
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "categories"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Layers size={15} />
          Goods Categories
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "items"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Package size={15} />
          Cargo &amp; Inventory Items
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pm_config")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "pm_config"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Home size={15} />
          Packers &amp; Movers Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("slots")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "slots"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Clock size={15} />
          Operating Slots
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lanes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "lanes"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Navigation size={15} />
          Lanes &amp; Routes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("coverage")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "coverage"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <MapPinned size={15} />
          Service Coverage
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "faqs"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <HelpCircle size={15} />
          Platform FAQs
        </button>
      </div>

      {activeTab === "categories" && <GTCategoriesTab showToast={showToast} />}
      {activeTab === "items" && <GTItemsTab showToast={showToast} />}
      {activeTab === "pm_config" && (
        <>
          <GTPackersMoversTab showToast={showToast} />
          <GTPackersMoversHelpersPanel showToast={showToast} />
        </>
      )}
      {activeTab === "slots" && <GTSlotsTab showToast={showToast} />}
      {activeTab === "lanes" && <GTLanesTab showToast={showToast} />}
      {activeTab === "coverage" && <GTCoverageTab showToast={showToast} />}
      {activeTab === "faqs" && <GTFaqsTab showToast={showToast} />}

      {activeTab === "tiers" && (
        <div className="space-y-5">


      <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/25 bg-indigo-50/60 dark:bg-indigo-500/10 px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
        <p className="text-[13px] font-medium text-indigo-900 dark:text-indigo-200">
          Goods &amp; Transport pricing is now managed from <span className="font-bold">Catalog &gt; Packages</span> --
          open the Mini Truck, 2-Wheeler, or Packers &amp; Movers package you want to change and edit its
          "Goods &amp; Transport Distance Pricing" section there. The rates below update automatically from that
          screen; editing here is disabled. {priceLock}
        </p>
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
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{tier.name}</span>
                      {tier.is_dispatchable === false && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                          title={tier.dispatchability_warning || "Un-dispatchable: no compatible vendor fleet registered"}
                        >
                          <AlertTriangle size={11} className="text-amber-700" />
                          Un-dispatchable
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                      {tier.slug} · {tier.city} · {tier.category_display}
                    </div>
                    {tier.is_dispatchable === false && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                        {tier.dispatchability_warning || "Commercial fleet for this vehicle class is not currently registered by vendor partners."}
                      </p>
                    )}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
      )}
    </div>
  )
}


export default GTPricingPage
