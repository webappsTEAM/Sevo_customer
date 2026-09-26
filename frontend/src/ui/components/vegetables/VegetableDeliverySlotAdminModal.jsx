import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock, Calendar, Check, X, Plus, Trash2, Save,
  AlertCircle, ShieldCheck, Sun, Moon, Sparkles, RefreshCw, CalendarOff,
  IndianRupee, Tag, Sliders
} from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../../api/client.js"
import { QUICK_COMMERCE_PRICING } from "../../../utils/quickCommercePricing.js"

const WEEKDAYS = [
  { num: 0, name: "Sunday", short: "Sun" },
  { num: 1, name: "Monday", short: "Mon" },
  { num: 2, name: "Tuesday", short: "Tue" },
  { num: 3, name: "Wednesday", short: "Wed" },
  { num: 4, name: "Thursday", short: "Thu" },
  { num: 5, name: "Friday", short: "Fri" },
  { num: 6, name: "Saturday", short: "Sat" },
]

export default function VegetableDeliverySlotAdminModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("template") // "template" | "overrides" | "slots" | "pricing"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState("")

  // Data from backend
  const [slotDefinitions, setSlotDefinitions] = useState([])
  const [weekdayTemplate, setWeekdayTemplate] = useState([])
  const [dateOverrides, setDateOverrides] = useState([])

  // Pricing config state
  const [pricingConfig, setPricingConfig] = useState({
    free_delivery_threshold: 200,
    small_cart_fee_threshold: 100,
    small_cart_fee_amount: 5,
    low_tier_delivery_fee: 15,
    mid_tier_delivery_fee: 10,
    handling_fee_amount: 2,
    tip_preset_amounts: [20, 30, 50],
  })
  const [tipPresetInput, setTipPresetInput] = useState("20, 30, 50")

  // Local editable template matrix state: mapping `${weekday}-${slot_config_id}` -> { is_enabled, cutoff_time_override, capacity }
  const [matrixState, setMatrixState] = useState({})

  // Form state for adding Date Override
  const [newOverrideDate, setNewOverrideDate] = useState("")
  const [newOverrideSlotId, setNewOverrideSlotId] = useState("")
  const [newOverrideReason, setNewOverrideReason] = useState("")
  const [newOverrideIsClosed, setNewOverrideIsClosed] = useState(true)
  const [newOverrideCutoff, setNewOverrideCutoff] = useState("")

  // Form state for creating new Slot definition
  const [showAddSlotForm, setShowAddSlotForm] = useState(false)
  const [newSlotName, setNewSlotName] = useState("")
  const [newSlotLabel, setNewSlotLabel] = useState("")
  const [newSlotStartTime, setNewSlotStartTime] = useState("06:30")
  const [newSlotEndTime, setNewSlotEndTime] = useState("09:30")
  const [newSlotCutoff, setNewSlotCutoff] = useState("06:00")
  const [newSlotSameDay, setNewSlotSameDay] = useState(false)

  const fetchSlotAdminData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)
      setError(null)
      const [slotRes, pricingRes] = await Promise.all([
        apiRequest("/vegetable-orders/admin/slots/"),
        apiRequest("/vegetable-orders/admin/pricing-config/"),
      ])

      if (slotRes && slotRes.success) {
        setSlotDefinitions(slotRes.slots || [])
        setWeekdayTemplate(slotRes.weekday_template || [])
        setDateOverrides(slotRes.date_overrides || [])

        // Build matrix map
        const initialMap = {}
        if (Array.isArray(slotRes.weekday_template)) {
          slotRes.weekday_template.forEach((w) => {
            if (Array.isArray(w.slots)) {
              w.slots.forEach((s) => {
                const key = `${w.weekday}-${s.slot_config_id}`
                initialMap[key] = {
                  is_enabled: s.is_enabled !== false,
                  cutoff_time_override: s.cutoff_time_override || "",
                  capacity: s.capacity || "",
                }
              })
            }
          })
        }
        setMatrixState(initialMap)
      }

      if (pricingRes && pricingRes.success && pricingRes.data) {
        setPricingConfig(pricingRes.data)
        const presets = Array.isArray(pricingRes.data.tip_preset_amounts) ? pricingRes.data.tip_preset_amounts : [20, 30, 50]
        setTipPresetInput(presets.join(", "))
        QUICK_COMMERCE_PRICING.updateConfig(pricingRes.data)
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load delivery slot & pricing configuration."))
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const handleSavePricingConfig = async (e) => {
    e?.preventDefault()
    try {
      setSaving(true)
      setError(null)

      const parsedTips = tipPresetInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 0)

      const payload = {
        free_delivery_threshold: Number(pricingConfig.free_delivery_threshold) || 200,
        small_cart_fee_threshold: Number(pricingConfig.small_cart_fee_threshold) || 100,
        small_cart_fee_amount: Number(pricingConfig.small_cart_fee_amount) || 5,
        low_tier_delivery_fee: Number(pricingConfig.low_tier_delivery_fee) || 15,
        mid_tier_delivery_fee: Number(pricingConfig.mid_tier_delivery_fee) || 10,
        handling_fee_amount: Number(pricingConfig.handling_fee_amount) || 2,
        tip_preset_amounts: parsedTips.length > 0 ? parsedTips : [20, 30, 50],
      }

      const res = await apiRequest("/vegetable-orders/admin/pricing-config/", {
        method: "POST",
        json: payload,
      })

      if (res && res.success) {
        setSuccessMsg("Cart pricing rules and fee tiers saved successfully.")
        setPricingConfig(res.data)
        QUICK_COMMERCE_PRICING.updateConfig(res.data)
        setTimeout(() => setSuccessMsg(""), 4000)
      } else {
        setError(res?.message || "Failed to update pricing configuration.")
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to update pricing configuration."))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSlotAdminData(true)
    }
  }, [isOpen])

  const handleCellToggle = (weekday, slotId) => {
    const key = `${weekday}-${slotId}`
    setMatrixState((prev) => {
      const current = prev[key] || { is_enabled: true, cutoff_time_override: "", capacity: "" }
      return {
        ...prev,
        [key]: {
          ...current,
          is_enabled: !current.is_enabled,
        },
      }
    })
  }

  const handleCellCutoffChange = (weekday, slotId, val) => {
    const key = `${weekday}-${slotId}`
    setMatrixState((prev) => {
      const current = prev[key] || { is_enabled: true, cutoff_time_override: "", capacity: "" }
      return {
        ...prev,
        [key]: {
          ...current,
          cutoff_time_override: val,
        },
      }
    })
  }

  const handleSaveWeekdayTemplate = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMsg("")

      const payload = []
      WEEKDAYS.forEach((w) => {
        slotDefinitions.forEach((s) => {
          const key = `${w.num}-${s.id}`
          const cell = matrixState[key] || { is_enabled: true, cutoff_time_override: "", capacity: "" }
          payload.push({
            weekday: w.num,
            slot_config_id: s.id,
            is_enabled: cell.is_enabled !== false,
            cutoff_time_override: cell.cutoff_time_override || null,
            capacity: cell.capacity ? parseInt(cell.capacity, 10) : null,
          })
        })
      })

      const res = await apiRequest("/vegetable-orders/admin/slots/", {
        method: "POST",
        json: {
          action: "save_weekday_template",
          template: payload,
        },
      })

      if (res && res.success) {
        setSuccessMsg("Weekly delivery schedule template saved successfully!")
        setTimeout(() => setSuccessMsg(""), 4000)

        if (Array.isArray(res.weekday_template)) {
          setWeekdayTemplate(res.weekday_template)
          const updatedMap = {}
          res.weekday_template.forEach((w) => {
            if (Array.isArray(w.slots)) {
              w.slots.forEach((s) => {
                const key = `${w.weekday}-${s.slot_config_id}`
                updatedMap[key] = {
                  is_enabled: s.is_enabled !== false,
                  cutoff_time_override: s.cutoff_time_override || "",
                  capacity: s.capacity || "",
                }
              })
            }
          })
          setMatrixState(updatedMap)
        } else {
          await fetchSlotAdminData(false)
        }
      } else {
        setError(res?.message || "Failed to save weekly template.")
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to save weekly template."))
    } finally {
      setSaving(false)
    }
  }

  const handleAddDateOverride = async (e) => {
    e?.preventDefault()
    if (!newOverrideDate) {
      setError("Please select a date for the override.")
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await apiRequest("/vegetable-orders/admin/slots/", {
        method: "POST",
        json: {
          action: "add_date_override",
          date: newOverrideDate,
          slot_config_id: newOverrideSlotId ? parseInt(newOverrideSlotId, 10) : null,
          is_closed: newOverrideIsClosed,
          reason: newOverrideReason.trim(),
          cutoff_time_override: newOverrideCutoff || null,
        },
      })

      if (res && res.success) {
        setSuccessMsg("Date override added successfully!")
        setNewOverrideDate("")
        setNewOverrideSlotId("")
        setNewOverrideReason("")
        setNewOverrideCutoff("")
        setTimeout(() => setSuccessMsg(""), 4000)
        fetchSlotAdminData()
      } else {
        setError(res?.message || "Failed to add date override.")
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to add date override."))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDateOverride = async (overrideId) => {
    if (!window.confirm("Remove this date override?")) return
    try {
      setSaving(true)
      const res = await apiRequest("/vegetable-orders/admin/slots/", {
        method: "POST",
        json: {
          action: "delete_date_override",
          id: overrideId,
        },
      })
      if (res && res.success) {
        setSuccessMsg("Date override deleted.")
        setTimeout(() => setSuccessMsg(""), 3000)
        fetchSlotAdminData()
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to delete override."))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSlotDefinition = async (e) => {
    e?.preventDefault()
    if (!newSlotName.trim() || !newSlotLabel.trim()) {
      setError("Slot name and time label are required.")
      return
    }

    try {
      setSaving(true)
      setError(null)
      const res = await apiRequest("/vegetable-orders/admin/slots/", {
        method: "POST",
        json: {
          action: "save_slot",
          name: newSlotName.trim(),
          slot_label: newSlotLabel.trim(),
          start_time: newSlotStartTime,
          end_time: newSlotEndTime,
          cutoff_time: newSlotCutoff,
          is_same_day_available: newSlotSameDay,
          is_active: true,
          sort_order: slotDefinitions.length + 1,
        },
      })

      if (res && res.success) {
        setSuccessMsg(`Delivery slot window '${newSlotName}' created!`)
        setShowAddSlotForm(false)
        setNewSlotName("")
        setNewSlotLabel("")
        setTimeout(() => setSuccessMsg(""), 4000)
        fetchSlotAdminData()
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to create slot window."))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlotDefinition = async (slotId, slotName) => {
    if (!window.confirm(`Delete slot window '${slotName}'? This will remove it from all weekday templates.`)) return
    try {
      setSaving(true)
      const res = await apiRequest("/vegetable-orders/admin/slots/", {
        method: "POST",
        json: {
          action: "delete_slot",
          id: slotId,
        },
      })
      if (res && res.success) {
        setSuccessMsg(`Slot '${slotName}' deleted.`)
        setTimeout(() => setSuccessMsg(""), 3000)
        fetchSlotAdminData()
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to delete slot."))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Delivery Schedule & Slot Matrix
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
                Configure full-week weekday templates, time windows, and one-off holiday overrides.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab("template")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "template"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>7-Day Weekday Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overrides")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "overrides"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <CalendarOff className="w-4 h-4" />
            <span>Date Closures & Overrides ({dateOverrides.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "slots"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Slot Windows ({slotDefinitions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "pricing"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Cart &amp; Fee Pricing</span>
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Loading delivery schedules...</p>
            </div>
          ) : activeTab === "template" ? (
            /* TAB 1: 7-DAY WEEKDAY MATRIX */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Weekly Schedule Matrix (Sunday – Saturday)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Toggle enabled slots and set optional cutoff time overrides per weekday.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveWeekdayTemplate}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Template"}</span>
                </button>
              </div>

              {/* 7-Row Weekday Grid */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-3xs bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5 font-black text-slate-700 dark:text-slate-300 w-36">Weekday</th>
                        {slotDefinitions.map((slot) => (
                          <th key={slot.id} className="p-3.5 font-black text-slate-700 dark:text-slate-300">
                            <div>{slot.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{slot.slot_label}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {WEEKDAYS.map((w) => (
                        <tr key={w.num} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[11px] font-black">
                              {w.short}
                            </span>
                            <span>{w.name}</span>
                          </td>
                          {slotDefinitions.map((slot) => {
                            const key = `${w.num}-${slot.id}`
                            const cell = matrixState[key] || { is_enabled: true, cutoff_time_override: "", capacity: "" }
                            const isEnabled = cell.is_enabled !== false
                            return (
                              <td key={slot.id} className="p-3.5">
                                <div className="space-y-2">
                                  {/* Toggle Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleCellToggle(w.num, slot.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isEnabled
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs"
                                        : "bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                                    }`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${isEnabled ? "bg-emerald-600" : "bg-slate-400"}`} />
                                    <span>{isEnabled ? "Enabled" : "Disabled"}</span>
                                  </button>

                                  {/* Optional Cutoff Override */}
                                  {isEnabled && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                      <span>Cutoff:</span>
                                      <input
                                        type="time"
                                        value={cell.cutoff_time_override || ""}
                                        onChange={(e) => handleCellCutoffChange(w.num, slot.id, e.target.value)}
                                        placeholder="Default"
                                        className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-emerald-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "overrides" ? (
            /* TAB 2: DATE OVERRIDES & CLOSURES */
            <div className="space-y-6">
              {/* Add Date Override Form */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Add One-Off Date Exception / Closure
                  </h4>
                </div>
                <form onSubmit={handleAddDateOverride} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Target Date *</label>
                    <input
                      type="date"
                      required
                      value={newOverrideDate}
                      onChange={(e) => setNewOverrideDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Scope</label>
                    <select
                      value={newOverrideSlotId}
                      onChange={(e) => setNewOverrideSlotId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    >
                      <option value="">Whole Day (All Slots)</option>
                      {slotDefinitions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.slot_label})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Reason / Festival Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Festival Holiday / Rain"
                      value={newOverrideReason}
                      onChange={(e) => setNewOverrideReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving || !newOverrideDate}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer transition-all"
                  >
                    {saving ? "Adding..." : "Add Override"}
                  </button>
                </form>
              </div>

              {/* Existing Overrides Table */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white mb-3">
                  Upcoming Date Exceptions ({dateOverrides.length})
                </h4>
                {dateOverrides.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No active date exceptions. The system is operating fully on the standard 7-day template.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-3xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3.5 font-black text-slate-700 dark:text-slate-300">Date</th>
                          <th className="p-3.5 font-black text-slate-700 dark:text-slate-300">Target Slot</th>
                          <th className="p-3.5 font-black text-slate-700 dark:text-slate-300">Status</th>
                          <th className="p-3.5 font-black text-slate-700 dark:text-slate-300">Reason</th>
                          <th className="p-3.5 font-black text-slate-700 dark:text-slate-300 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dateOverrides.map((ov) => (
                          <tr key={ov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">{ov.date}</td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">{ov.slot_name}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                ov.is_closed ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {ov.is_closed ? "Closed" : "Open"}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500">{ov.reason || "—"}</td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteDateOverride(ov.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "slots" ? (
            /* TAB 3: SLOT WINDOW DEFINITIONS */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Slot Window Definitions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Master list of delivery windows offered across Hosur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSlotForm(!showAddSlotForm)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddSlotForm ? "Close Form" : "Add New Window"}</span>
                </button>
              </div>

              {/* Create Slot Form */}
              {showAddSlotForm && (
                <form onSubmit={handleCreateSlotDefinition} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Create New Slot Window</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Afternoon Delivery"
                        value={newSlotName}
                        onChange={(e) => setNewSlotName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Time Label *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1:00 PM – 3:00 PM"
                        value={newSlotLabel}
                        onChange={(e) => setNewSlotLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Default Cutoff Time</label>
                      <input
                        type="time"
                        value={newSlotCutoff}
                        onChange={(e) => setNewSlotCutoff(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSlotSameDay}
                        onChange={(e) => setNewSlotSameDay(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Allow Same-Day Booking for this window</span>
                    </label>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
                    >
                      Save Window
                    </button>
                  </div>
                </form>
              )}

              {/* Slot Definitions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {slotDefinitions.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-3xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{slot.name}</h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {slot.code || `ID: ${slot.id}`}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{slot.slot_label}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Cutoff: {slot.cutoff_time || "12:00"} • {slot.is_same_day_available ? "Same-day enabled" : "Next-day only"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlotDefinition(slot.id, slot.name)}
                      className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* TAB 4: CART PRICING, FEE TIERS & TIPS */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Cart Pricing, Delivery Fee Tiers &amp; Tips
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure free delivery threshold, small cart fees, convenience charges, and tip presets across cart &amp; checkout.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePricingConfig}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Pricing Rules"}</span>
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Free Delivery Threshold */}
                <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Free Delivery Threshold (₹)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Cart item subtotal at or above which delivery charge is ₹0 (FREE).
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfig.free_delivery_threshold}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, free_delivery_threshold: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      placeholder="200"
                    />
                  </div>
                </div>

                {/* Small Cart Threshold Boundary */}
                <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Small Cart Fee Threshold (₹)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Cart item subtotal below which the small cart fee and low-tier delivery fee apply.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfig.small_cart_fee_threshold}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, small_cart_fee_threshold: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* Small Cart Fee Amount */}
                <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Small Cart Fee Amount (₹)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Fee applied when order subtotal is below the small cart threshold.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfig.small_cart_fee_amount}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, small_cart_fee_amount: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      placeholder="5"
                    />
                  </div>
                </div>

                {/* Handling Fee Amount */}
                <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Handling &amp; Packaging Fee (₹)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Fixed convenience and packaging charge per order.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfig.handling_fee_amount}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, handling_fee_amount: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      placeholder="2"
                    />
                  </div>
                </div>

                {/* Low Tier Delivery Fee */}
                <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Low-Tier Delivery Fee (₹) (Subtotal &lt; ₹{pricingConfig.small_cart_fee_threshold || 100})
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Delivery charge for very small carts below small cart threshold.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfig.low_tier_delivery_fee}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, low_tier_delivery_fee: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      placeholder="15"
                    />
                  </div>
                </div>

                {/* Mid Tier Delivery Fee */}
                <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Mid-Tier Delivery Fee (₹) (₹{pricingConfig.small_cart_fee_threshold || 100} – ₹{(pricingConfig.free_delivery_threshold || 200) - 1})
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Standard delivery charge before reaching free delivery threshold.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfig.mid_tier_delivery_fee}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, mid_tier_delivery_fee: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>

              {/* Tip Preset Options */}
              <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Rider Tip Preset Amounts (INR, comma-separated)
                </label>
                <p className="text-[11px] text-slate-400">
                  Enter preset tip values offered as quick-select chips to customers (e.g. "20, 30, 50").
                </p>
                <input
                  type="text"
                  value={tipPresetInput}
                  onChange={(e) => setTipPresetInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="20, 30, 50"
                />
              </div>

              {/* Live Tier Breakdown Simulation Preview */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    Live Tier Billing Simulation
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">
                      Subtotal &lt; ₹{pricingConfig.small_cart_fee_threshold || 100}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Delivery: <strong className="text-slate-900 dark:text-white">₹{pricingConfig.low_tier_delivery_fee || 15}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Small Cart: <strong className="text-slate-900 dark:text-white">₹{pricingConfig.small_cart_fee_amount || 5}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Handling: <strong className="text-slate-900 dark:text-white">₹{pricingConfig.handling_fee_amount || 2}</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">
                      Subtotal ₹{pricingConfig.small_cart_fee_threshold || 100} – ₹{(pricingConfig.free_delivery_threshold || 200) - 1}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Delivery: <strong className="text-slate-900 dark:text-white">₹{pricingConfig.mid_tier_delivery_fee || 10}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Small Cart: <strong className="text-emerald-600">₹0 (FREE)</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Handling: <strong className="text-slate-900 dark:text-white">₹{pricingConfig.handling_fee_amount || 2}</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">
                      Subtotal &ge; ₹{pricingConfig.free_delivery_threshold || 200}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-bold">
                      Delivery: FREE (₹0)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Small Cart: <strong className="text-emerald-600">₹0 (FREE)</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Handling: <strong className="text-slate-900 dark:text-white">₹{pricingConfig.handling_fee_amount || 2}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  )
}
