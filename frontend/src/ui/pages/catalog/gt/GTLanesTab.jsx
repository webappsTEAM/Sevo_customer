import React, { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, RefreshCw, Navigation, MapPin } from "lucide-react"
import { Button, Modal } from "../../../components/kit.jsx"
import {
  fetchAdminLanes,
  createAdminLane,
  updateAdminLane,
  deleteAdminLane,
} from "../../../../api/logisticsAdminService.js"

const EMPTY_LANE_FORM = {
  category: "goods_transport_truck",
  city: "Hosur",
  destination_label: "",
  destination_latitude: "",
  destination_longitude: "",
  distance_km: "",
  eta_label: "",
  fare: "",
  currency: "INR",
  order: 0,
  is_active: true,
}

const CATEGORY_OPTIONS = [
  { value: "goods_transport_truck", label: "Truck / Mini Truck" },
  { value: "goods_transport_two_wheeler", label: "2-Wheeler Courier" },
  { value: "packers_movers", label: "Packers & Movers" },
]

export function GTLanesTab({ showToast }) {
  const [lanes, setLanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [search, setSearch] = useState("")
  const [editingLane, setEditingLane] = useState(null)
  const [formData, setFormData] = useState(EMPTY_LANE_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reason, setReason] = useState("")

  const loadLanes = useCallback(async () => {
    setLoading(true)
    const res = await fetchAdminLanes({
      category: selectedCat,
      city: selectedCity,
      is_active: activeFilter,
      search,
    })
    if (res.ok) {
      setLanes(res.lanes)
    } else {
      showToast(res.error?.message || "Failed to load lanes", "error")
    }
    setLoading(false)
  }, [selectedCat, selectedCity, activeFilter, search, showToast])

  useEffect(() => {
    loadLanes()
  }, [loadLanes])

  const openCreateModal = () => {
    setEditingLane("new")
    setFormData({
      ...EMPTY_LANE_FORM,
      category: selectedCat || "goods_transport_truck",
      city: selectedCity || "Hosur",
    })
    setFormError("")
    setReason("")
  }

  const openEditModal = (lane) => {
    setEditingLane(lane)
    setFormData({
      category: lane.category || "goods_transport_truck",
      city: lane.city || "Hosur",
      destination_label: lane.destination_label || "",
      destination_latitude: lane.destination_latitude != null ? String(lane.destination_latitude) : "",
      destination_longitude: lane.destination_longitude != null ? String(lane.destination_longitude) : "",
      distance_km: lane.distance_km != null ? String(lane.distance_km) : "",
      eta_label: lane.eta_label || "",
      fare: lane.fare != null ? String(lane.fare) : "",
      currency: lane.currency || "INR",
      order: lane.order ?? 0,
      is_active: lane.is_active !== false,
    })
    setFormError("")
    setReason("")
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!formData.destination_label.trim()) {
      setFormError("Destination label is required.")
      return
    }
    if (formData.fare === "" || isNaN(Number(formData.fare)) || Number(formData.fare) < 0) {
      setFormError("Valid non-negative fare is required.")
      return
    }

    setSaving(true)
    setFormError("")

    const payload = {
      category: formData.category,
      city: formData.city.trim(),
      destination_label: formData.destination_label.trim(),
      destination_latitude: formData.destination_latitude ? Number(formData.destination_latitude) : null,
      destination_longitude: formData.destination_longitude ? Number(formData.destination_longitude) : null,
      distance_km: formData.distance_km ? Number(formData.distance_km) : null,
      eta_label: formData.eta_label.trim(),
      fare: Number(formData.fare),
      currency: formData.currency,
      order: Number(formData.order) || 0,
      is_active: formData.is_active,
    }

    let res
    if (editingLane === "new") {
      res = await createAdminLane(payload)
    } else {
      res = await updateAdminLane(editingLane.id, payload, reason)
    }

    setSaving(false)
    if (res.ok) {
      showToast(res.message || "Lane saved successfully.", "success")
      setEditingLane(null)
      loadLanes()
    } else {
      setFormError(res.error?.message || "Failed to save lane.")
    }
  }

  const handleDelete = async (lane) => {
    if (!window.confirm(`Are you sure you want to deactivate lane "${lane.city} -> ${lane.destination_label}"?`)) return
    const res = await deleteAdminLane(lane.id, "Deactivated via Admin Hub")
    if (res.ok) {
      showToast("Lane deactivated.", "success")
      loadLanes()
    } else {
      showToast(res.error?.message || "Failed to deactivate lane.", "error")
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search destination or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Cities</option>
            <option value="hosur">Hosur</option>
            <option value="bengaluru">Bengaluru</option>
            <option value="chennai">Chennai</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLanes}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lane</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Distance & ETA</th>
                <th className="py-3 px-4">Fixed Fare</th>
                <th className="py-3 px-4">Coordinates</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading lanes and popular routes...
                  </td>
                </tr>
              ) : lanes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No operating lanes found matching your filters.
                  </td>
                </tr>
              ) : (
                lanes.map((lane) => (
                  <tr key={lane.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{lane.city}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-slate-900">{lane.destination_label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {lane.category === "goods_transport_truck" ? "Truck" : lane.category === "goods_transport_two_wheeler" ? "2-Wheeler" : "Packers & Movers"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{lane.distance_km ? `${lane.distance_km} km` : "—"}</div>
                      {lane.eta_label && <div className="text-[10px] text-slate-400">{lane.eta_label}</div>}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      ₹{Number(lane.fare || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">
                      {lane.destination_latitude && lane.destination_longitude ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <MapPin className="w-3 h-3" />
                          <span>{Number(lane.destination_latitude).toFixed(4)}, {Number(lane.destination_longitude).toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Geocoded live</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{lane.order}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lane.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {lane.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(lane)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="Edit Lane"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {lane.is_active && (
                          <button
                            onClick={() => handleDelete(lane)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editingLane && (
        <Modal
          isOpen={true}
          onClose={() => setEditingLane(null)}
          title={editingLane === "new" ? "Create Fixed-Fare Lane" : `Edit Lane #${editingLane.id}`}
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Origin City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Hosur"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Label *</label>
              <input
                type="text"
                value={formData.destination_label}
                onChange={(e) => setFormData({ ...formData, destination_label: e.target.value })}
                placeholder="e.g. Whitefield / Bengaluru Hub"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fixed Fare (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fare}
                  onChange={(e) => setFormData({ ...formData, fare: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Distance (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ETA Label</label>
                <input
                  type="text"
                  value={formData.eta_label}
                  onChange={(e) => setFormData({ ...formData, eta_label: e.target.value })}
                  placeholder="~1.5 hrs"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dest Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.destination_latitude}
                  onChange={(e) => setFormData({ ...formData, destination_latitude: e.target.value })}
                  placeholder="e.g. 12.9716"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dest Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.destination_longitude}
                  onChange={(e) => setFormData({ ...formData, destination_longitude: e.target.value })}
                  placeholder="e.g. 77.5946"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="pt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lane_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="lane_active" className="font-semibold text-slate-800">
                  Active (Displayed to Customers)
                </label>
              </div>
            </div>

            {editingLane !== "new" && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Revised highway toll adjustment"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingLane(null)}
                className="text-xs px-3 py-1.5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5"
              >
                {saving ? "Saving..." : "Save Lane"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
