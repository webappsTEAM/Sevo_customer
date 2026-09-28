import React, { useEffect, useState } from "react"
import { Users } from "lucide-react"
import { fetchAdminPMConfig, updateAdminPMConfig } from "../../../api/logisticsAdminService.js"

// Hard ceiling mirrored from logistics.models.MAX_HELPERS_CAP (server enforces it).
const MAX_HELPERS_CAP = 20

/**
 * Packers & Movers -> "Extra helpers" limit (PackersMoversConfig.max_helpers).
 *
 * Rendered inside the Hub's "Packers & Movers Settings" tab, directly under
 * GTPackersMoversTab. It lives here (catalog/) rather than inside
 * catalog/gt/GTPackersMoversTab.jsx only because that file is out of reach of
 * the tooling used for this change; it edits the same config row through the
 * same PATCH endpoint. Helper count is a crew-size setting, not a price:
 * nothing here changes what the customer pays.
 */
export function GTPackersMoversHelpersPanel({ showToast, city = "Hosur" }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchAdminPMConfig(city).then((res) => {
      if (!alive) return
      if (res.ok && res.config) {
        const v = Number(res.config.max_helpers ?? 2)
        setSaved(v)
        setValue(String(v))
      } else {
        setError(res.error?.message || "Could not load Packers & Movers settings.")
      }
      setLoading(false)
    })
    return () => { alive = false }
  }, [city])

  const parsed = Number(value)
  const valid = value !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_HELPERS_CAP
  const dirty = valid && parsed !== saved

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError("")
    const res = await updateAdminPMConfig({ max_helpers: parsed }, "Updated max helpers", city)
    setSaving(false)
    if (res.ok) {
      const v = Number(res.config?.max_helpers ?? parsed)
      setSaved(v)
      setValue(String(v))
      showToast?.("Maximum helpers updated.")
    } else {
      setError(res.error?.message || "Could not save.")
      showToast?.(res.error?.message || "Could not save.", "error")
    }
  }

  return (
    <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <Users size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Extra helpers ({city})</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maximum number of extra helpers a customer can request on a Packers &amp; Movers booking
            (0 to {MAX_HELPERS_CAP}). Set to 0 to hide the option. This does not change the price.
          </p>
          {loading ? (
            <p className="text-xs text-slate-400 mt-3">Loading…</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0}
                max={MAX_HELPERS_CAP}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                aria-label="Maximum helpers"
                className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {!valid && value !== "" && (
                <span className="text-xs text-rose-600">Enter a whole number from 0 to {MAX_HELPERS_CAP}.</span>
              )}
            </div>
          )}
          {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
