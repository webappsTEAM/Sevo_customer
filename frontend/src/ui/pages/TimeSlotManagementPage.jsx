import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Clock, Calendar, Check, AlertCircle, RefreshCw, Plus, Trash2,
  ChevronRight, Shield, Eye, Settings, Sun, Sunset, Moon,
  CalendarDays, CheckCircle2, XCircle, Search, ArrowRight, Layers,
  Edit2, RotateCcw, Copy, ChevronDown, ChevronUp, AlertTriangle,
  Globe, Grid, List, Sliders
} from "lucide-react"
import { apiRequest } from "../../api/client.js"

const DURATION_OPTIONS = [
  { label: "15 Minutes", value: 15 },
  { label: "30 Minutes (Standard)", value: 30 },
  { label: "45 Minutes", value: 45 },
  { label: "60 Minutes (1 Hour)", value: 60 },
  { label: "Custom", value: "custom" },
]

const WEEKDAYS = [
  { index: 0, name: "Monday", short: "Mon" },
  { index: 1, name: "Tuesday", short: "Tue" },
  { index: 2, name: "Wednesday", short: "Wed" },
  { index: 3, name: "Thursday", short: "Thu" },
  { index: 4, name: "Friday", short: "Fri" },
  { index: 5, name: "Saturday", short: "Sat" },
  { index: 6, name: "Sunday", short: "Sun" },
]

const TIME_PRESETS = [
  { label: "Standard (09:00 - 18:00)", start: "09:00", end: "18:00" },
  { label: "Extended (08:00 - 20:00)", start: "08:00", end: "20:00" },
  { label: "Morning Only (09:00 - 13:00)", start: "09:00", end: "13:00" },
  { label: "Evening Shift (14:00 - 21:00)", start: "14:00", end: "21:00" },
  { label: "Full Day (10:00 - 19:00)", start: "10:00", end: "19:00" },
]

export default function TimeSlotManagementPage() {
  // Operational Scope: "specific" (single service) or "global" (all services default template)
  const [scopeMode, setScopeMode] = useState("specific")
  const [globalConfig, setGlobalConfig] = useState(null)
  const [summaryStats, setSummaryStats] = useState({ total_services: 0, customized_count: 0, default_count: 0 })
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyTarget, setApplyTarget] = useState("unconfigured")
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [revertingService, setRevertingService] = useState(false)
  const [serviceViewFormat, setServiceViewFormat] = useState("grid") // "grid" or "compact"

  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [loadingServices, setLoadingServices] = useState(true)

  // Current service detail configuration state
  const [serviceConfig, setServiceConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [activeTab, setActiveTab] = useState("general") // general, weekly, overrides

  // Form states for general configuration
  const [isActive, setIsActive] = useState(true)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("18:00")
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [customDuration, setCustomDuration] = useState(30)
  const [capacity, setCapacity] = useState(1)

  // Weekly schedule state: map of weekday index 0..6 to schedule object
  const [weeklySchedules, setWeeklySchedules] = useState({})
  const [editingDayIndex, setEditingDayIndex] = useState(null)

  // Date overrides state
  const [dateOverrides, setDateOverrides] = useState([])
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [overrideModalMode, setOverrideModalMode] = useState("add") // "add" or "edit"
  const [editingOverrideId, setEditingOverrideId] = useState(null)
  const [overrideForm, setOverrideForm] = useState({
    date: "",
    is_closed: false,
    reason: "",
    start_time: "09:00",
    end_time: "18:00",
    slot_capacity: 1,
  })
  const [savingOverride, setSavingOverride] = useState(false)

  // Live preview state
  const [previewDate, setPreviewDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewLiveDraft, setPreviewLiveDraft] = useState(true)

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Fetch global platform-wide defaults
  const fetchGlobalDefaults = useCallback(async () => {
    try {
      const res = await apiRequest("/admin/time-slots/global-default/")
      if (res?.success && res.data) {
        setGlobalConfig(res.data)
        setSummaryStats({
          total_services: res.data.total_services || 0,
          customized_count: res.data.customized_services_count || 0,
          default_count: res.data.default_services_count || 0,
        })
        return res.data
      }
    } catch (err) {
      console.error("Failed to load global time slot defaults", err)
    }
    return null
  }, [])

  // Load all services and categories
  const fetchServicesList = useCallback(async () => {
    setLoadingServices(true)
    try {
      const res = await apiRequest("/admin/time-slots/services/")
      const list = res?.data || []
      setServices(list)
      if (res?.global_defaults) {
        setGlobalConfig(res.global_defaults)
      }
      if (res?.summary) {
        setSummaryStats(res.summary)
      }
      const cats = Array.from(new Set(list.map(s => s.category_name).filter(Boolean)))
      setCategories(cats)

      if (!selectedServiceId && list.length > 0) {
        setSelectedServiceId(String(list[0].id))
      }
    } catch (err) {
      console.error("Failed to load services list", err)
      showToast("Failed to load services list", "error")
    } finally {
      setLoadingServices(false)
    }
  }, [selectedServiceId])

  useEffect(() => {
    fetchServicesList()
    fetchGlobalDefaults()
  }, [])

  // Mode Switchers
  const handleSwitchToGlobalMode = async () => {
    setScopeMode("global")
    setActiveTab("general")
    let g = globalConfig
    if (!g) {
      g = await fetchGlobalDefaults()
    }
    if (g) {
      const defStart = g.default_start_time || "09:00"
      const defEnd = g.default_end_time || "18:00"
      const defDur = g.slot_duration_minutes || 30
      const defCap = g.slot_capacity || 1
      const defActive = g.is_active ?? true

      setIsActive(defActive)
      setStartTime(defStart)
      setEndTime(defEnd)
      setDurationMinutes(defDur)
      setCustomDuration(defDur)
      setCapacity(defCap)

      const weeklyArray = g.weekly_schedule || []
      const schedMap = {}
      WEEKDAYS.forEach(w => {
        schedMap[w.index] = {
          weekday: w.index,
          day_of_week: w.index,
          is_open: true,
          use_default_hours: true,
          start_time: defStart,
          end_time: defEnd,
          slot_capacity: defCap,
          is_customized: false,
        }
      })
      if (Array.isArray(weeklyArray)) {
        weeklyArray.forEach(item => {
          const idx = item.day_of_week ?? item.weekday
          if (idx !== undefined && schedMap[idx]) {
            schedMap[idx] = {
              weekday: idx,
              day_of_week: idx,
              is_open: item.is_open ?? true,
              use_default_hours: item.use_default_hours ?? false,
              start_time: item.start_time || defStart,
              end_time: item.end_time || defEnd,
              slot_capacity: item.slot_capacity || defCap,
              is_customized: !item.is_open || !item.use_default_hours,
            }
          }
        })
      }
      setWeeklySchedules(schedMap)
    }
  }

  const handleSwitchToSpecificMode = (serviceId) => {
    setScopeMode("specific")
    const targetId = serviceId || selectedServiceId
    if (targetId) {
      setSelectedServiceId(String(targetId))
      fetchServiceDetail(targetId)
    }
  }

  // Load configuration for selected service
  const fetchServiceDetail = useCallback(async (serviceId) => {
    if (!serviceId) return
    setLoadingConfig(true)
    try {
      const res = await apiRequest(`/admin/time-slots/${serviceId}/`)
      if (res?.success && res.data) {
        const d = res.data
        setServiceConfig(d)

        const cfg = d.config || {}
        const defStart = cfg.default_start_time || d.default_start_time || "09:00"
        const defEnd = cfg.default_end_time || d.default_end_time || "18:00"
        const defDur = cfg.slot_duration_minutes || d.slot_duration_minutes || 30
        const defCap = cfg.slot_capacity || d.slot_capacity || 1
        const defActive = cfg.is_active ?? d.is_active ?? true

        setIsActive(defActive)
        setStartTime(defStart)
        setEndTime(defEnd)
        setDurationMinutes(defDur)
        setCustomDuration(defDur)
        setCapacity(defCap)

        // Build weekly schedule dictionary
        const weeklyArray = d.weekly_schedule || d.weekly_schedules || []
        const schedMap = {}
        WEEKDAYS.forEach(w => {
          schedMap[w.index] = {
            weekday: w.index,
            day_of_week: w.index,
            is_open: true,
            use_default_hours: true,
            start_time: defStart,
            end_time: defEnd,
            slot_capacity: defCap,
            is_customized: false,
          }
        })

        if (Array.isArray(weeklyArray) && weeklyArray.length > 0) {
          weeklyArray.forEach(item => {
            const idx = item.day_of_week ?? item.weekday
            if (idx !== undefined && schedMap[idx]) {
              const isCust = Boolean(item.is_customized || !item.use_default_hours || !item.is_open)
              schedMap[idx] = {
                weekday: idx,
                day_of_week: idx,
                is_open: item.is_open ?? true,
                use_default_hours: item.use_default_hours ?? (!item.start_time && !item.end_time && item.is_open),
                start_time: item.start_time || defStart,
                end_time: item.end_time || defEnd,
                slot_capacity: item.slot_capacity || defCap,
                is_customized: isCust,
              }
            }
          })
        }
        setWeeklySchedules(schedMap)
        setDateOverrides(d.date_overrides || [])
      }
    } catch (err) {
      console.error("Failed to load service configuration", err)
      showToast("Failed to load time slot settings", "error")
    } finally {
      setLoadingConfig(false)
    }
  }, [])

  useEffect(() => {
    if (selectedServiceId && scopeMode === "specific") {
      fetchServiceDetail(selectedServiceId)
    }
  }, [selectedServiceId, scopeMode, fetchServiceDetail])

  // Fetch preview when service, date, or draft settings change
  const fetchPreview = useCallback(async () => {
    const previewSvcId = selectedServiceId || (services.length > 0 ? String(services[0].id) : null)
    if (!previewSvcId) return

    setLoadingPreview(true)
    try {
      const payload = {
        date: previewDate,
      }
      if (previewLiveDraft || scopeMode === "global") {
        payload.draft_config = {
          is_active: isActive,
          default_start_time: startTime,
          default_end_time: endTime,
          slot_duration_minutes: durationMinutes === "custom" ? Number(customDuration) : Number(durationMinutes),
          slot_capacity: Number(capacity) || 1,
        }
      }
      const res = await apiRequest(`/admin/time-slots/${previewSvcId}/preview/`, {
        method: "POST",
        json: payload,
      })
      if (res?.success && res.data) {
        setPreviewData(res.data)
      }
    } catch (err) {
      console.error("Failed to load preview", err)
    } finally {
      setLoadingPreview(false)
    }
  }, [selectedServiceId, services, previewDate, previewLiveDraft, scopeMode, isActive, startTime, endTime, durationMinutes, customDuration, capacity])

  useEffect(() => {
    fetchPreview()
  }, [fetchPreview])

  // Save Global Platform Defaults
  const handleSaveGlobal = async (applyToChoice = "save_only") => {
    const effDuration = durationMinutes === "custom" ? Number(customDuration) : Number(durationMinutes)
    if (!effDuration || effDuration < 5) {
      showToast("Slot duration must be at least 5 minutes", "error")
      return
    }

    setSavingGlobal(true)
    try {
      const schedulesArray = Object.values(weeklySchedules).map(item => ({
        day_of_week: item.day_of_week ?? item.weekday,
        weekday: item.day_of_week ?? item.weekday,
        is_open: item.is_open,
        use_default_hours: item.use_default_hours,
        start_time: item.use_default_hours ? null : item.start_time,
        end_time: item.use_default_hours ? null : item.end_time,
        slot_capacity: item.use_default_hours ? null : (Number(item.slot_capacity) || null),
      }))

      const payload = {
        default_start_time: startTime,
        default_end_time: endTime,
        slot_duration_minutes: effDuration,
        slot_capacity: Number(capacity) || 1,
        is_active: isActive,
        weekly_schedule: schedulesArray,
        apply_to: applyToChoice,
      }

      const res = await apiRequest("/admin/time-slots/global-default/", {
        method: "POST",
        json: payload,
      })

      if (res?.success) {
        showToast(res.message || "Global platform default schedule saved successfully!")
        setGlobalConfig(res.data)
        setApplyModalOpen(false)
        fetchServicesList()
        fetchGlobalDefaults()
        fetchPreview()
      } else {
        showToast(res?.message || "Failed to save global defaults", "error")
      }
    } catch (err) {
      showToast(err?.message || "Failed to save global defaults", "error")
    } finally {
      setSavingGlobal(false)
    }
  }

  // Revert a customized service back to global default
  const handleRevertServiceToDefault = async () => {
    if (!selectedServiceId) return
    const sName = selectedService?.name || "this service"
    if (!confirm(`Are you sure you want to revert "${sName}" to Global Platform Defaults? Custom hours and weekly overrides will be cleared.`)) {
      return
    }
    setRevertingService(true)
    try {
      const res = await apiRequest(`/admin/time-slots/${selectedServiceId}/revert-default/`, {
        method: "POST"
      })
      if (res?.success) {
        showToast(res.message || `Reverted ${sName} to Global Defaults!`)
        await fetchServiceDetail(selectedServiceId)
        await fetchServicesList()
        fetchPreview()
      } else {
        showToast(res?.message || "Failed to revert service", "error")
      }
    } catch (err) {
      showToast(err?.message || "Failed to revert service", "error")
    } finally {
      setRevertingService(false)
    }
  }

  // Copy global defaults into the current service's form
  const handleCopyFromGlobalDefaults = () => {
    const g = globalConfig
    if (!g) {
      showToast("Global defaults not loaded yet", "error")
      return
    }
    setStartTime(g.default_start_time || "09:00")
    setEndTime(g.default_end_time || "18:00")
    const dur = g.slot_duration_minutes || 30
    setDurationMinutes(dur)
    setCustomDuration(dur)
    setCapacity(g.slot_capacity || 1)
    setIsActive(g.is_active ?? true)
    showToast("Loaded baseline global values into form. Click Save to apply.")
  }

  // Save General Configuration for Specific Service or Global Platform Defaults
  const handleSaveGeneral = async (e) => {
    e?.preventDefault()
    if (scopeMode === "global") {
      return handleSaveGlobal("save_only")
    }
    if (!selectedServiceId) return

    const effDuration = durationMinutes === "custom" ? Number(customDuration) : Number(durationMinutes)
    if (!effDuration || effDuration < 5) {
      showToast("Slot duration must be at least 5 minutes", "error")
      return
    }

    setSavingConfig(true)
    try {
      const res = await apiRequest(`/admin/time-slots/${selectedServiceId}/config/`, {
        method: "PUT",
        json: {
          is_active: isActive,
          default_start_time: startTime,
          default_end_time: endTime,
          slot_duration_minutes: effDuration,
          slot_capacity: Number(capacity) || 1,
        }
      })
      if (res?.success) {
        showToast("Time slot configuration saved successfully!")
        fetchServicesList()
        fetchServiceDetail(selectedServiceId)
        fetchPreview()
      } else {
        showToast(res?.message || "Failed to save configuration", "error")
      }
    } catch (err) {
      showToast(err?.message || "Failed to save configuration", "error")
    } finally {
      setSavingConfig(false)
    }
  }

  // Save Weekly Schedule
  const handleSaveWeeklySchedule = async () => {
    if (!selectedServiceId) return
    setSavingSchedule(true)
    try {
      const schedulesArray = Object.values(weeklySchedules).map(item => ({
        day_of_week: item.day_of_week ?? item.weekday,
        weekday: item.day_of_week ?? item.weekday,
        is_open: item.is_open,
        use_default_hours: item.use_default_hours,
        start_time: item.use_default_hours ? null : item.start_time,
        end_time: item.use_default_hours ? null : item.end_time,
        slot_capacity: item.use_default_hours ? null : (Number(item.slot_capacity) || null),
      }))

      const res = await apiRequest(`/admin/time-slots/${selectedServiceId}/weekly-schedule/`, {
        method: "PUT",
        json: { schedules: schedulesArray }
      })
      if (res?.success) {
        showToast("Weekly schedule updated successfully!")
        setEditingDayIndex(null)
        fetchServiceDetail(selectedServiceId)
        fetchPreview()
      } else {
        showToast(res?.message || "Failed to update weekly schedule", "error")
      }
    } catch (err) {
      showToast(err?.message || "Failed to update weekly schedule", "error")
    } finally {
      setSavingSchedule(false)
    }
  }

  // Weekly Schedule Day Toggle & Customization
  const handleToggleDayOpen = (dayIdx) => {
    setWeeklySchedules(prev => {
      const cur = prev[dayIdx]
      return {
        ...prev,
        [dayIdx]: {
          ...cur,
          is_open: !cur.is_open,
          is_customized: true,
        }
      }
    })
  }

  const handleResetDayToDefault = (dayIdx) => {
    setWeeklySchedules(prev => ({
      ...prev,
      [dayIdx]: {
        ...prev[dayIdx],
        is_open: true,
        use_default_hours: true,
        start_time: startTime,
        end_time: endTime,
        slot_capacity: capacity,
        is_customized: false,
      }
    }))
    if (editingDayIndex === dayIdx) {
      setEditingDayIndex(null)
    }
    showToast(`Reset ${WEEKDAYS[dayIdx].name} to default hours.`)
  }

  const handleApplyTimeToAllWeekdays = (dayIdx) => {
    const cur = weeklySchedules[dayIdx]
    setWeeklySchedules(prev => {
      const updated = { ...prev }
      WEEKDAYS.slice(0, 5).forEach(w => {
        updated[w.index] = {
          ...updated[w.index],
          is_open: cur.is_open,
          use_default_hours: false,
          start_time: cur.start_time,
          end_time: cur.end_time,
          slot_capacity: cur.slot_capacity,
          is_customized: true,
        }
      })
      return updated
    })
    showToast(`Applied ${WEEKDAYS[dayIdx].name}'s hours to all weekdays (Mon-Fri).`)
  }

  const handleBulkAction = (action) => {
    if (action === "all_open") {
      setWeeklySchedules(prev => {
        const updated = { ...prev }
        WEEKDAYS.forEach(w => {
          updated[w.index] = { ...updated[w.index], is_open: true }
        })
        return updated
      })
      showToast("Set all 7 days to OPEN.")
    } else if (action === "weekend_closed") {
      setWeeklySchedules(prev => ({
        ...prev,
        5: { ...prev[5], is_open: false, is_customized: true },
        6: { ...prev[6], is_open: false, is_customized: true },
      }))
      showToast("Set Saturday & Sunday to CLOSED.")
    } else if (action === "copy_mon") {
      const mon = weeklySchedules[0]
      setWeeklySchedules(prev => {
        const updated = { ...prev }
        WEEKDAYS.forEach(w => {
          updated[w.index] = {
            ...updated[w.index],
            is_open: mon.is_open,
            use_default_hours: mon.use_default_hours,
            start_time: mon.start_time,
            end_time: mon.end_time,
            slot_capacity: mon.slot_capacity,
            is_customized: mon.is_customized,
          }
        })
        return updated
      })
      showToast("Copied Monday schedule to all days.")
    } else if (action === "reset_all") {
      setWeeklySchedules(prev => {
        const updated = {}
        WEEKDAYS.forEach(w => {
          updated[w.index] = {
            weekday: w.index,
            day_of_week: w.index,
            is_open: true,
            use_default_hours: true,
            start_time: startTime,
            end_time: endTime,
            slot_capacity: capacity,
            is_customized: false,
          }
        })
        return updated
      })
      setEditingDayIndex(null)
      showToast("Reset all days to default service hours.")
    }
  }

  // Date Overrides: Add / Edit / Delete Workflow
  const handleOpenAddOverride = () => {
    setOverrideModalMode("add")
    setEditingOverrideId(null)
    setOverrideForm({
      date: "",
      is_closed: false,
      reason: "",
      start_time: startTime || "09:00",
      end_time: endTime || "18:00",
      slot_capacity: capacity || 1,
    })
    setOverrideModalOpen(true)
  }

  const handleOpenEditOverride = (ov) => {
    setOverrideModalMode("edit")
    setEditingOverrideId(ov.id)
    setOverrideForm({
      date: ov.date,
      is_closed: ov.is_closed,
      reason: ov.reason || "",
      start_time: ov.start_time || startTime || "09:00",
      end_time: ov.end_time || endTime || "18:00",
      slot_capacity: ov.slot_capacity || capacity || 1,
    })
    setOverrideModalOpen(true)
  }

  const handleSaveOverride = async (e) => {
    e.preventDefault()
    if (!selectedServiceId || !overrideForm.date) {
      showToast("Please select a date", "error")
      return
    }

    setSavingOverride(true)
    try {
      let res
      if (overrideModalMode === "edit" && editingOverrideId) {
        res = await apiRequest(`/admin/time-slots/${selectedServiceId}/date-overrides/${editingOverrideId}/`, {
          method: "PUT",
          json: overrideForm
        })
      } else {
        res = await apiRequest(`/admin/time-slots/${selectedServiceId}/date-overrides/`, {
          method: "POST",
          json: overrideForm
        })
      }

      if (res?.success) {
        showToast(overrideModalMode === "edit" ? "Date override updated successfully!" : "Date override added successfully!")
        setOverrideModalOpen(false)
        fetchServiceDetail(selectedServiceId)
        fetchPreview()
      } else {
        showToast(res?.message || "Failed to save date override", "error")
      }
    } catch (err) {
      showToast(err?.message || "Failed to save date override", "error")
    } finally {
      setSavingOverride(false)
    }
  }

  const handleDeleteOverride = async (overrideId) => {
    if (!confirm("Are you sure you want to remove this date override?")) return
    try {
      const res = await apiRequest(`/admin/time-slots/${selectedServiceId}/date-overrides/${overrideId}/`, {
        method: "DELETE"
      })
      if (res?.success) {
        showToast("Date override deleted successfully!")
        fetchServiceDetail(selectedServiceId)
        fetchPreview()
      } else {
        showToast(res?.message || "Failed to delete date override", "error")
      }
    } catch (err) {
      showToast(err?.message || "Failed to delete date override", "error")
    }
  }

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategoryFilter === "all" ||
        s.category_name === selectedCategoryFilter
      return matchesSearch && matchesCategory
    })
  }, [services, searchQuery, selectedCategoryFilter])

  const selectedService = useMemo(() => {
    return services.find(s => String(s.id) === String(selectedServiceId))
  }, [services, selectedServiceId])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
          }`}
        >
          {toastMessage.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
            <Clock size={16} />
            <span>Service Catalog Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Time Slot Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure independent booking hours, slot durations, capacities, weekly schedules, and date overrides for each service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Simple, sleek Scope Switcher Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleSwitchToGlobalMode}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                scopeMode === "global"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Globe size={14} />
              <span>All Services (Default)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold ml-0.5">
                {summaryStats.default_count || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchToSpecificMode(selectedServiceId)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                scopeMode === "specific"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers size={14} />
              <span>Specific Service</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold ml-0.5">
                {services.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchServicesList()
              fetchGlobalDefaults()
              if (selectedServiceId) fetchServiceDetail(selectedServiceId)
              fetchPreview()
            }}
            title="Refresh"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loadingServices || loadingConfig ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Service Selector & Settings, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Service Picker + Configuration Tabs */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Specific Service Selector Card (Clean, organized, user-friendly format) */}
          {scopeMode === "specific" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-0.5">
                    Select Bookable Service to Customize
                  </h3>
                  <span className="text-xs text-slate-400">
                    Choose a service to configure individual hours, slot durations, or date overrides
                  </span>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setServiceViewFormat("grid")}
                      title="Grid Cards View"
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        serviceViewFormat === "grid"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Grid size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceViewFormat("compact")}
                      title="Compact List View"
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        serviceViewFormat === "compact"
                          ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Jump Dropdown & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Quick Jump Dropdown
                  </label>
                  <select
                    value={selectedServiceId || ""}
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value)
                      fetchServiceDetail(e.target.value)
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="" disabled>-- Select a service to customize --</option>
                    {categories.map((cat) => (
                      <optgroup key={cat} label={`📂 ${cat}`}>
                        {services
                          .filter((s) => s.category_name === cat)
                          .map((s) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.name} {s.is_configured ? "(Custom)" : "(Default)"} — {s.default_start_time} - {s.default_end_time}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Filter by Name / Keyword
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type to filter services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Filter Tabs with Counts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedCategoryFilter === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  All ({services.length})
                </button>
                {categories.map((c) => {
                  const count = services.filter((s) => s.category_name === c).length
                  const isSel = selectedCategoryFilter === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isSel
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {c} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Service Selection Content: Structured Card Grid or Compact List */}
              {filteredServices.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No services found matching "{searchQuery}" in category "{selectedCategoryFilter}"
                </div>
              ) : serviceViewFormat === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredServices.map((s) => {
                    const isSel = String(s.id) === String(selectedServiceId)
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedServiceId(String(s.id))
                          fetchServiceDetail(String(s.id))
                        }}
                        className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between ${
                          isSel
                            ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1" title={s.name}>
                              {s.name}
                            </span>
                            {isSel ? (
                              <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            ) : (
                              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {s.category_name || "General"}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              s.is_configured
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {s.is_configured ? "Custom" : "Default"}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span>🕒 {s.default_start_time} – {s.default_end_time}</span>
                          <span>⏱️ {s.slot_duration_minutes}m · 👥 {s.slot_capacity}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {filteredServices.map((s) => {
                    const isSel = String(s.id) === String(selectedServiceId)
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedServiceId(String(s.id))
                          fetchServiceDetail(String(s.id))
                        }}
                        className={`p-3 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                          isSel ? "bg-indigo-50/70 dark:bg-indigo-950/50 font-bold" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className="font-extrabold text-slate-900 dark:text-white">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{s.category_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            s.is_configured ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {s.is_configured ? "Custom" : "Default"}
                          </span>
                          <span className="text-slate-500">{s.default_start_time} - {s.default_end_time}</span>
                          {isSel && <Check size={14} className="text-indigo-600" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Configuration Workspace for Global Mode OR Selected Specific Service */}
          {(scopeMode === "global" || selectedService) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              {/* Workspace Status Bar */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                    {scopeMode === "global" ? <Globe size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {scopeMode === "global" ? "All Services — Platform Default Schedule" : selectedService.name}
                      </h2>
                      {scopeMode === "specific" && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {selectedService.slug}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {scopeMode === "global"
                        ? `${summaryStats.default_count || 0} of ${services.length} services inheriting defaults (${summaryStats.customized_count || 0} customized)`
                        : `Category: ${selectedService.category_name || "General"}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Service Specific Actions: Revert to Default & Copy Defaults */}
                  {scopeMode === "specific" && (
                    <>
                      {serviceConfig?.config?.is_configured && (
                        <button
                          type="button"
                          onClick={handleRevertServiceToDefault}
                          disabled={revertingService}
                          title="Clear custom overrides and revert to inheriting Global Default schedule"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        >
                          <RotateCcw size={13} className={revertingService ? "animate-spin" : ""} />
                          <span>Revert to Global Default</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCopyFromGlobalDefaults}
                        title="Copy baseline global hours and capacity into the form"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>Copy Global Settings</span>
                      </button>
                    </>
                  )}

                  {/* Global Mode Actions: Apply to Services button */}
                  {scopeMode === "global" && (
                    <button
                      type="button"
                      onClick={() => setApplyModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                    >
                      <Sliders size={13} />
                      <span>Apply to Services...</span>
                    </button>
                  )}

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                    isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {isActive ? "Bookings Enabled" : "Bookings Disabled"}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-6 text-xs font-extrabold">
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "general"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Settings size={14} />
                  <span>General Configuration</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("weekly")}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "weekly"
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <CalendarDays size={14} />
                  <span>Weekly Schedule (7 Days)</span>
                </button>

                {scopeMode === "specific" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("overrides")}
                    className={`pb-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === "overrides"
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Calendar size={14} />
                    <span>Date Overrides & Holidays ({dateOverrides.length})</span>
                  </button>
                )}
              </div>

              {/* Tab 1: General Settings */}
              {activeTab === "general" && (
                <form onSubmit={handleSaveGeneral} className="p-6 space-y-6">
                  {/* Enable / Disable switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                        Service Booking Status
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        When disabled, customers will see this service as temporarily unavailable for new bookings.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Default Start Time */}
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                        Default Window Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        First bookable start time of the day (e.g. 09:00 AM)
                      </span>
                    </div>

                    {/* Default End Time */}
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                        Default Window Boundary End Time
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        End boundary of service window (e.g. 19:00 / 07:00 PM)
                      </span>
                    </div>
                  </div>

                  {/* Slot Duration */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                      Slot Duration (Minutes)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {DURATION_OPTIONS.map((opt) => {
                        const isSel = durationMinutes === opt.value
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => setDurationMinutes(opt.value)}
                            className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                              isSel
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    {durationMinutes === "custom" && (
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number"
                          min="5"
                          max="480"
                          step="5"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          placeholder="Minutes (e.g. 20)"
                          className="w-36 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        />
                        <span className="text-xs text-slate-500">minutes per booking slot</span>
                      </div>
                    )}
                  </div>

                  {/* Slot Capacity */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      Concurrent Slot Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                      className="w-36 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Maximum simultaneous customers bookable for the same slot (default: 1)
                    </span>
                  </div>

                  {/* Informational callout regarding boundary */}
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                    <span className="font-bold">Boundary Rule: </span>
                    The configured end time is the boundary of the service window. A service configured from 09:00 AM to 07:00 PM with 30-minute duration will generate slots up to 06:30 PM. 07:00 PM will never be generated as a booking start time.
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    {scopeMode === "global" && (
                      <button
                        type="button"
                        onClick={() => setApplyModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-black transition-all cursor-pointer"
                      >
                        <Sliders size={14} />
                        <span>Apply Defaults to Services...</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={scopeMode === "global" ? savingGlobal : savingConfig}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {(scopeMode === "global" ? savingGlobal : savingConfig) ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>{scopeMode === "global" ? "Save as Global Platform Default" : "Save General Configuration"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Weekly Schedule (7 Days) with Full Edit & Reset Capabilities */}
              {activeTab === "weekly" && (
                <div className="p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        7-Day Weekly Schedule & Custom Hours
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customize operating hours or mark specific days closed. Days using default inherit ({startTime} – {endTime}).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {scopeMode === "global" && (
                        <button
                          type="button"
                          onClick={() => setApplyModalOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-black transition-all cursor-pointer"
                        >
                          <Sliders size={14} />
                          <span>Apply Defaults to Services...</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={scopeMode === "global" ? () => handleSaveGlobal("save_only") : handleSaveWeeklySchedule}
                        disabled={scopeMode === "global" ? savingGlobal : savingSchedule}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                      >
                        {(scopeMode === "global" ? savingGlobal : savingSchedule) ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        <span>{scopeMode === "global" ? "Save Global Weekly Schedule" : "Save Weekly Schedule"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Bulk Presets Bar */}
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("all_open")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer"
                    >
                      Open All 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("weekend_closed")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      Close Sat & Sun
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("copy_mon")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer"
                    >
                      Copy Mon to All Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("reset_all")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:text-slate-800 transition-all cursor-pointer"
                    >
                      Reset All to Default
                    </button>
                  </div>

                  {/* 7 Days List with Interactive Cards and Inline Editor */}
                  <div className="space-y-3">
                    {WEEKDAYS.map((w) => {
                      const item = weeklySchedules[w.index] || {
                        weekday: w.index,
                        day_of_week: w.index,
                        is_open: true,
                        use_default_hours: true,
                        start_time: startTime,
                        end_time: endTime,
                        slot_capacity: capacity,
                        is_customized: false,
                      }
                      const isEditing = editingDayIndex === w.index

                      return (
                        <div
                          key={w.index}
                          className={`rounded-2xl border transition-all ${
                            !item.is_open
                              ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-90"
                              : !item.use_default_hours
                              ? "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-xs"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Day initial pill */}
                              <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                {w.short}
                              </span>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {w.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDayOpen(w.index)}
                                    title={`Click to ${item.is_open ? 'Close' : 'Open'} ${w.name}`}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                                      item.is_open
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                                        : "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-400"
                                    }`}
                                  >
                                    {item.is_open ? "● OPEN" : "● CLOSED"}
                                  </button>
                                </div>

                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {!item.is_open ? (
                                    <span className="text-rose-600 font-semibold">Service closed on this day (No customer slots)</span>
                                  ) : item.use_default_hours ? (
                                    <span>Using Service Default ({startTime} – {endTime}) · Cap: {capacity}</span>
                                  ) : (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                                      Custom Hours: {item.start_time} – {item.end_time} · Cap: {item.slot_capacity || capacity}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Edit / Customize & Reset */}
                            <div className="flex items-center gap-2">
                              {item.is_open && (
                                <button
                                  type="button"
                                  onClick={() => setEditingDayIndex(isEditing ? null : w.index)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    isEditing
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                  }`}
                                >
                                  <Edit2 size={13} />
                                  <span>{isEditing ? "Close Editor" : "Edit Hours"}</span>
                                  {isEditing ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}

                              {item.is_open && !item.use_default_hours && (
                                <button
                                  type="button"
                                  onClick={() => handleResetDayToDefault(w.index)}
                                  title="Delete custom schedule and revert to service default"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                >
                                  <RotateCcw size={13} />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline Day Customization Panel */}
                          {isEditing && item.is_open && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 rounded-b-2xl space-y-4 animate-in fade-in">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                  Custom Operating Hours for {w.name}
                                </span>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={item.use_default_hours}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setWeeklySchedules(prev => ({
                                        ...prev,
                                        [w.index]: {
                                          ...item,
                                          use_default_hours: checked,
                                          start_time: checked ? startTime : item.start_time,
                                          end_time: checked ? endTime : item.end_time,
                                        }
                                      }))
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Use Default ({startTime} – {endTime})</span>
                                </label>
                              </div>

                              {!item.use_default_hours && (
                                <>
                                  {/* Quick Presets for this day */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {TIME_PRESETS.map((p) => (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => {
                                          setWeeklySchedules(prev => ({
                                            ...prev,
                                            [w.index]: {
                                              ...item,
                                              start_time: p.start,
                                              end_time: p.end,
                                            }
                                          }))
                                        }}
                                        className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                    <div>
                                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                                        Start Time
                                      </label>
                                      <input
                                        type="time"
                                        value={item.start_time || "09:00"}
                                        onChange={(e) => {
                                          setWeeklySchedules(prev => ({
                                            ...prev,
                                            [w.index]: {
                                              ...item,
                                              start_time: e.target.value,
                                            }
                                          }))
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                                        End Time
                                      </label>
                                      <input
                                        type="time"
                                        value={item.end_time || "18:00"}
                                        onChange={(e) => {
                                          setWeeklySchedules(prev => ({
                                            ...prev,
                                            [w.index]: {
                                              ...item,
                                              end_time: e.target.value,
                                            }
                                          }))
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                                        Capacity
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={item.slot_capacity || capacity || 1}
                                        onChange={(e) => {
                                          setWeeklySchedules(prev => ({
                                            ...prev,
                                            [w.index]: {
                                              ...item,
                                              slot_capacity: Number(e.target.value) || 1,
                                            }
                                          }))
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApplyTimeToAllWeekdays(w.index)}
                                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                                    >
                                      <Copy size={13} />
                                      <span>Apply these hours to Mon-Fri</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setEditingDayIndex(null)}
                                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      Done Editing
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    {scopeMode === "global" && (
                      <button
                        type="button"
                        onClick={() => setApplyModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-black transition-all cursor-pointer"
                      >
                        <Sliders size={14} />
                        <span>Apply Defaults to Services...</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={scopeMode === "global" ? () => handleSaveGlobal("save_only") : handleSaveWeeklySchedule}
                      disabled={scopeMode === "global" ? savingGlobal : savingSchedule}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      {(scopeMode === "global" ? savingGlobal : savingSchedule) ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>{scopeMode === "global" ? "Save Global Weekly Schedule" : "Save Weekly Schedule"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Date Overrides & Holidays with Full Add, Edit, Delete Workflow */}
              {activeTab === "overrides" && (
                <div className="p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Specific Date Overrides & Public Holidays
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Date overrides take highest priority over weekly and default schedules.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddOverride}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Date Override</span>
                    </button>
                  </div>

                  {dateOverrides.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                      <Calendar size={32} className="mx-auto text-slate-400 mb-2" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                        No specific date overrides configured
                      </span>
                      <span className="text-xs text-slate-400 block mt-1 max-w-sm mx-auto">
                        Use overrides for special festival hours, public holidays, or single-day schedule adjustments.
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenAddOverride}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add First Override</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                      {dateOverrides.map((ov) => (
                        <div key={ov.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {ov.date}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                                ov.is_closed
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              }`}>
                                {ov.is_closed ? "● CLOSED (HOLIDAY)" : `● ${ov.start_time} – ${ov.end_time}`}
                              </span>
                              {ov.slot_capacity && !ov.is_closed && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Cap: {ov.slot_capacity}
                                </span>
                              )}
                            </div>
                            {ov.reason && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                                Reason: {ov.reason}
                              </span>
                            )}
                          </div>

                          {/* Edit & Delete Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditOverride(ov)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 dark:border-indigo-900/40 dark:hover:bg-indigo-950/40 transition-all cursor-pointer"
                              title="Edit this override"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteOverride(ov.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 dark:border-rose-900/40 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                              title="Delete this override"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (4-5 cols): Live Customer Slot Preview */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs sticky top-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Live Customer Slot Preview
                </h3>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Backend Engine
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Real-time demonstration generated using the exact same backend engine that powers customer checkout.
            </p>

            {/* Date selection for preview */}
            <div className="space-y-2 mb-4">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Preview Date
              </label>
              <input
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800"
              />

              {/* Quick Scenario Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0]
                    setPreviewDate(today)
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7))
                    setPreviewDate(d.toISOString().split("T")[0])
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Next Wednesday
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + ((0 - d.getDay() + 7) % 7 || 7))
                    setPreviewDate(d.toISOString().split("T")[0])
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Next Sunday
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDate("2026-09-30")}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  2026-09-30
                </button>
              </div>
            </div>

            {/* Preview Content */}
            {loadingPreview ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                Generating preview slots...
              </div>
            ) : !previewData ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a service to preview slots
              </div>
            ) : !previewData.is_open ? (
              <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center space-y-2">
                <XCircle size={28} className="mx-auto text-rose-500" />
                <span className="text-xs font-black text-rose-800 dark:text-rose-200 block">
                  SERVICE CLOSED ON THIS DATE
                </span>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 block">
                  {previewData.reason || "No slots available for booking"}
                </span>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Open for Bookings
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Duration: {previewData.slot_duration_minutes}m
                  </span>
                </div>

                {/* Morning Slots */}
                {previewData.groups?.morning?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                      <Sun size={12} />
                      <span>Morning Slots</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {previewData.groups.morning.map((slot) => (
                        <div
                          key={slot.value}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            slot.available
                              ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                              : "bg-slate-100 dark:bg-slate-800/40 border-slate-200/50 text-slate-400 line-through text-[11px]"
                          }`}
                        >
                          <div className="text-xs">{slot.time}</div>
                          {!slot.available && slot.reason && (
                            <div className="text-[9px] text-rose-500 font-black no-underline mt-0.5">
                              {slot.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {previewData.groups?.afternoon?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-orange-600 uppercase tracking-wider">
                      <Sunset size={12} />
                      <span>Afternoon Slots</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {previewData.groups.afternoon.map((slot) => (
                        <div
                          key={slot.value}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            slot.available
                              ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                              : "bg-slate-100 dark:bg-slate-800/40 border-slate-200/50 text-slate-400 line-through text-[11px]"
                          }`}
                        >
                          <div className="text-xs">{slot.time}</div>
                          {!slot.available && slot.reason && (
                            <div className="text-[9px] text-rose-500 font-black no-underline mt-0.5">
                              {slot.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {previewData.groups?.evening?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                      <Moon size={12} />
                      <span>Evening Slots</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {previewData.groups.evening.map((slot) => (
                        <div
                          key={slot.value}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            slot.available
                              ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                              : "bg-slate-100 dark:bg-slate-800/40 border-slate-200/50 text-slate-400 line-through text-[11px]"
                          }`}
                        >
                          <div className="text-xs">{slot.time}</div>
                          {!slot.available && slot.reason && (
                            <div className="text-[9px] text-rose-500 font-black no-underline mt-0.5">
                              {slot.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Date Override Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                {overrideModalMode === "edit" ? <Edit2 size={16} className="text-indigo-600" /> : <Plus size={16} className="text-indigo-600" />}
                <span>{overrideModalMode === "edit" ? "Edit Date Override" : "Add Date Override / Holiday"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={overrideForm.date}
                  onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">
                    Mark Closed All Day (Holiday)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Completely disables booking slots on this specific date
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={overrideForm.is_closed}
                  onChange={(e) => setOverrideForm({ ...overrideForm, is_closed: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {!overrideForm.is_closed && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={overrideForm.start_time}
                        onChange={(e) => setOverrideForm({ ...overrideForm, start_time: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={overrideForm.end_time}
                        onChange={(e) => setOverrideForm({ ...overrideForm, end_time: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                      Override Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={overrideForm.slot_capacity}
                      onChange={(e) => setOverrideForm({ ...overrideForm, slot_capacity: Number(e.target.value) || 1 })}
                      className="w-32 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Festival Holiday, Emergency Maintenance, Extended Sunday Hours"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-extrabold shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  {savingOverride ? "Saving..." : (overrideModalMode === "edit" ? "Save Changes" : "Add Override")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Global Defaults to Catalog Services Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Sliders size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Apply Platform Defaults
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose how to propagate baseline hours to catalog services
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scope Selection Options */}
            <div className="space-y-3 text-xs">
              <label
                onClick={() => setApplyTarget("unconfigured")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  applyTarget === "unconfigured"
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                }`}
              >
                <input
                  type="radio"
                  name="applyTarget"
                  checked={applyTarget === "unconfigured"}
                  onChange={() => setApplyTarget("unconfigured")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      Uncustomized Services Only
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      Recommended · Safe
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Applies to all services currently inheriting global defaults ({summaryStats.default_count || 0} services).
                    Preserves custom hours for {summaryStats.customized_count || 0} individually tailored services.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setApplyTarget("all")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  applyTarget === "all"
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                }`}
              >
                <input
                  type="radio"
                  name="applyTarget"
                  checked={applyTarget === "all"}
                  onChange={() => setApplyTarget("all")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      Sync Operating Hours to ALL Services
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      Updates All
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Updates general hours ({startTime} – {endTime}), duration ({durationMinutes === "custom" ? customDuration : durationMinutes}m),
                    and capacity ({capacity}) across all {services.length} services. Retains custom weekly day off schedules.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setApplyTarget("reset_all")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  applyTarget === "reset_all"
                    ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300"
                }`}
              >
                <input
                  type="radio"
                  name="applyTarget"
                  checked={applyTarget === "reset_all"}
                  onChange={() => setApplyTarget("reset_all")}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      Full Reset Catalog to Global Defaults
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                      Clears All Custom Overrides
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Completely clears all custom overrides and weekly schedule tweaks across all services. Every service will strictly inherit these platform defaults.
                  </p>
                </div>
              </label>
            </div>

            {/* Target Summary Stats Footer */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Catalog Impact:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {applyTarget === "unconfigured"
                  ? `${summaryStats.default_count || 0} uncustomized services will receive updates`
                  : applyTarget === "all"
                  ? `All ${services.length} services will have hours updated`
                  : `All ${services.length} services reset to 100% template inheritance`}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingGlobal}
                onClick={() => handleSaveGlobal(applyTarget)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black shadow-sm transition-all cursor-pointer ${
                  applyTarget === "reset_all"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {savingGlobal ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm & Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

