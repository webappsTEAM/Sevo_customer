import React, { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, RefreshCw, AlertTriangle, Clock } from "lucide-react"
import { Button, Modal } from "../../../components/kit.jsx"
import {
  fetchAdminSlots,
  createAdminSlot,
  updateAdminSlot,
  deleteAdminSlot,
} from "../../../../api/logisticsAdminService.js"

const EMPTY_SLOT_FORM = {
  slot_label: "",
  group: "Morning",
  category: "",
  city: "hosur",
  capacity: 10,
  order: 0,
  is_active: true,
}

export function GTSlotsTab({ showToast }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [search, setSearch] = useState("")
  const [editingSlot, setEditingSlot] = useState(null)
  const [formData, setFormData] = useState(EMPTY_SLOT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reason, setReason] = useState("")

  const loadSlots = useCallback(async () => {
    setLoading(true)
    const res = await fetchAdminSlots({
      category: selectedCat,
      city: selectedCity,
      group: selectedGroup,
      is_active: activeFilter,
      search,
    })
    if (res.ok) {
      setSlots(res.slots)
    } else {
      showToast(res.error?.message || "Failed to load operating slots", "error")
    }
    setLoading(false)
  }, [selectedCat, selectedCity, selectedGroup, activeFilter, search, showToast])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const openCreateModal = () => {
    setEditingSlot("new")
    setFormData({
      ...EMPTY_SLOT_FORM,
      category: selectedCat || "",
      city: selectedCity || "hosur",
      group: selectedGroup || "Morning",
      order: slots.length * 5,
    })
    setFormError("")
    setReason("")
  }

  const openEditModal = (slot) => {
    setEditingSlot(slot)
    setFormData({
      slot_label: slot.slot_label || "",
      group: slot.group || "Morning",
      category: slot.category || "",
      city: slot.city || "",
      capacity: slot.capacity ?? 10,
      order: slot.order || 0,
      is_active: slot.is_active ?? true,
    })
    setFormError("")
    setReason("")
  }

  const handleSave = async () => {
    if (!formData.slot_label.trim()) {
      setFormError("Slot label is required (e.g. '08:00 AM - 09:00 AM').")
      return
    }
    if (formData.capacity < 1) {
      setFormError("Capacity must be at least 1.")
      return
    }

    setSaving(true)
    setFormError("")

    if (editingSlot === "new") {
      const res = await createAdminSlot({ ...formData, reason })
      if (res.ok) {
        showToast("Operating slot created successfully")
        setEditingSlot(null)
        loadSlots()
      } else {
        setFormError(res.error?.message || "Failed to create slot")
      }
    } else {
      const res = await updateAdminSlot(editingSlot.id, formData, reason)
      if (res.ok) {
        showToast("Operating slot updated successfully")
        setEditingSlot(null)
        loadSlots()
      } else {
        setFormError(res.error?.message || "Failed to update slot")
      }
    }
    setSaving(false)
  }

  const handleDelete = async (slot) => {
    if (!window.confirm(`Are you sure you want to deactivate/toggle slot "${slot.slot_label}"?`)) return
    const res = await deleteAdminSlot(slot.id, "Deactivated from Admin GT Hub")
    if (res.ok) {
      showToast("Slot status updated successfully")
      loadSlots()
    } else {
      showToast(res.error?.message || "Failed to update slot", "error")
    }
  }

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search slot label..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="">All Services</option>
            <option value="packers_movers">Packers &amp; Movers</option>
            <option value="goods_transport_truck">Mini Truck</option>
            <option value="goods_transport_two_wheeler">2-Wheeler</option>
          </select>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="">All Time Groups</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Evening">Evening</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <Button variant="ghost" onClick={loadSlots} disabled={loading} className="py-2">
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Button onClick={openCreateModal} className="py-2">
          <Plus size={15} className="mr-1.5" />
          Add Slot
        </Button>
      </div>

      {/* Slots Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3.5">Group</th>
                <th className="px-4 py-3.5">Slot Label</th>
                <th className="px-4 py-3.5">Service Category</th>
                <th className="px-4 py-3.5">City</th>
                <th className="px-4 py-3.5 text-center">Capacity</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading operating slots…
                  </td>
                </tr>
              ) : slots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No operating slots found matching filter.
                  </td>
                </tr>
              ) : (
                slots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                        {slot.group === "Morning" ? "⛅" : slot.group === "Afternoon" ? "☀️" : "🌅"} {slot.group}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white font-mono text-xs">
                      {slot.slot_label}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                      {slot.category ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {slot.category.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">All Categories</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold">
                      {slot.city || "All Cities"}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {slot.capacity}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          slot.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {slot.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(slot)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Slot"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(slot)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                          title="Toggle Active"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Slot Modal */}
      {editingSlot && (
        <Modal
          title={editingSlot === "new" ? "Add Operating Time Slot" : `Edit Slot — ${editingSlot.slot_label}`}
          onClose={() => setEditingSlot(null)}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Slot Label *</label>
              <input
                type="text"
                value={formData.slot_label}
                onChange={(e) => setFormData({ ...formData, slot_label: e.target.value })}
                placeholder="e.g. 08:00 AM - 09:00 AM, 02:00 PM - 03:00 PM"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Time Group *</label>
                <select
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Service Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="">All Categories (General)</option>
                  <option value="packers_movers">Packers &amp; Movers</option>
                  <option value="goods_transport_truck">Mini Truck</option>
                  <option value="goods_transport_two_wheeler">2-Wheeler</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="hosur, bangalore, or blank"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Concurrent Capacity *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="py-2 border-y border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Active (Available for customer booking)
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Reason for Change (Audit Trail)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Added new morning 7AM slot for P&M in Hosur"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingSlot(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingSlot === "new" ? "Create Slot" : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
