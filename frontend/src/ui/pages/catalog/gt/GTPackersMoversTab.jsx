import React, { useState, useEffect, useCallback } from "react"
import { RefreshCw, Save, AlertTriangle, ShieldCheck, Home, Info, Check } from "lucide-react"
import { Button } from "../../../components/kit.jsx"
import { fetchAdminPMConfig, updateAdminPMConfig } from "../../../../api/logisticsAdminService.js"

export function GTPackersMoversTab({ showToast }) {
  const [city, setCity] = useState("Hosur")
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reason, setReason] = useState("")
  const [formData, setFormData] = useState({
    standard_packing_rate_cft: "5.00",
    premium_packing_rate_cft: "10.00",
    premium_fragile_addon: "50.00",
    floor_rate_no_lift_per_100cft: "150.00",
    unpacking_rate_cft: "4.00",
    gst_rate: "0.18",
    survey_cft_threshold: "400.0",
    is_active: true,
  })

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setFormError("")
    const res = await fetchAdminPMConfig(city)
    if (res.ok && res.config) {
      setConfig(res.config)
      setFormData({
        standard_packing_rate_cft: String(res.config.standard_packing_rate_cft || "5.00"),
        premium_packing_rate_cft: String(res.config.premium_packing_rate_cft || "10.00"),
        premium_fragile_addon: String(res.config.premium_fragile_addon || "50.00"),
        floor_rate_no_lift_per_100cft: String(res.config.floor_rate_no_lift_per_100cft || "150.00"),
        unpacking_rate_cft: String(res.config.unpacking_rate_cft || "4.00"),
        gst_rate: String(res.config.gst_rate || "0.18"),
        survey_cft_threshold: String(res.config.survey_cft_threshold || "400.0"),
        is_active: res.config.is_active ?? true,
      })
    } else {
      showToast(res.error?.message || `No active P&M configuration found for ${city}`, "error")
    }
    setLoading(false)
  }, [city, showToast])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError("")

    const res = await updateAdminPMConfig(formData, reason || "Updated from Admin GT Hub", city)
    if (res.ok) {
      showToast("Packers & Movers pricing settings saved successfully")
      setReason("")
      loadConfig()
    } else {
      setFormError(res.error?.message || "Failed to update P&M configuration")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Home size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Packers &amp; Movers Relocation Engine Settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live pricing multipliers and operational thresholds for house &amp; office relocation quotes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="Hosur">Hosur</option>
            <option value="Bangalore">Bangalore</option>
          </select>
          <Button variant="ghost" onClick={loadConfig} disabled={loading} className="py-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {formError && (
        <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 text-xs text-rose-700 dark:text-rose-300 font-medium">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Packing Rates Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Packing Service Rates
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Standard Packing Rate (₹ per CFT)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.standard_packing_rate_cft}
                onChange={(e) => setFormData({ ...formData, standard_packing_rate_cft: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Base packing charge per cubic foot of goods volume.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Premium Multi-layer Packing Rate (₹ per CFT)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.premium_packing_rate_cft}
                onChange={(e) => setFormData({ ...formData, premium_packing_rate_cft: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Applied when customer selects Premium Packing (bubble wrap + foam blankets).
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Fragile Item Addon (₹ per item)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.premium_fragile_addon}
                onChange={(e) => setFormData({ ...formData, premium_fragile_addon: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Extra per-item fragile protection fee on fragile items in inventory.
              </span>
            </div>
          </div>

          {/* Handling & Labor Rates Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Floors &amp; Handling Rates
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Floor Rate without Lift (₹ / floor / 100 CFT)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.floor_rate_no_lift_per_100cft}
                onChange={(e) => setFormData({ ...formData, floor_rate_no_lift_per_100cft: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Calculated on floors above Ground where service lift is absent.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Unpacking Rate (₹ per CFT)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unpacking_rate_cft}
                onChange={(e) => setFormData({ ...formData, unpacking_rate_cft: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Optional destination unpacking service rate.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                GST Rate (decimal, e.g. 0.18 = 18%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Applicable GST on Packers &amp; Movers relocation invoices.
              </span>
            </div>
          </div>
        </div>

        {/* Operational Thresholds Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Operational Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Mandatory Survey Threshold (CFT)
              </label>
              <input
                type="number"
                step="1"
                value={formData.survey_cft_threshold}
                onChange={(e) => setFormData({ ...formData, survey_cft_threshold: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Moves exceeding this volume require an in-person or video survey before final confirmation.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Reason for Change (Audit Trail)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual revision of Hosur packing labor rates"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Recorded in CatalogChangeLog alongside actor username and timestamp.
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={saving || loading}>
            <Save size={15} className="mr-1.5" />
            {saving ? "Saving Changes…" : "Save P&M Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
