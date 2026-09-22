import React, { useEffect, useState } from "react"
import { Plus, Edit2, Trash2, Search, Sparkles, ArrowRight } from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Card, Button, Input, Modal, Pill } from "../../components/kit.jsx"
import { Table } from "../../components/Table.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const EMPTY_REC = {
  source_product: "",
  recommended_product: "",
  recommendation_type: "GOES_WELL_WITH",
  priority: 10,
  display_order: 1,
  is_active: true,
}

export function AdminRecommendationsPage() {
  const [recommendations, setRecommendations] = useState([])
  const [vegetablePackages, setVegetablePackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, showToast] = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [recRes, pkgRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/recommendations/"),
        apiRequest("/catalog/services/?service_slug=vegetables&status=ACTIVE")
      ])
      if (recRes && recRes.success) setRecommendations(recRes.data || [])
      if (pkgRes && pkgRes.success) setVegetablePackages(pkgRes.data || [])
    } catch (err) {
      if (err?.status !== 401) {
        showToast("Failed to load recommendations", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...editing,
        source_product: Number(editing.source_product),
        recommended_product: Number(editing.recommended_product),
        priority: Number(editing.priority) || 10,
        display_order: Number(editing.display_order) || 1,
      }

      let res
      if (editing.id) {
        res = await apiRequest(`/settings/catalog/v2/recommendations/${editing.id}/`, { method: "PUT", json: payload })
      } else {
        res = await apiRequest("/settings/catalog/v2/recommendations/", { method: "POST", json: payload })
      }

      if (res.success) {
        showToast(editing.id ? "Recommendation updated" : "Recommendation created")
        setEditing(null)
        load()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const handleDelete = async (rec) => {
    if (!window.confirm(`Delete recommendation "${rec.source_name} -> ${rec.recommended_name}"?`)) return
    try {
      const res = await apiRequest(`/settings/catalog/v2/recommendations/${rec.id}/`, { method: "DELETE" })
      if (res.success) {
        showToast("Recommendation deleted")
        load()
      } else {
        showToast(res.message || "Delete failed", "error")
      }
    } catch {
      showToast("Delete failed", "error")
    }
  }

  const filteredRecs = recommendations.filter(r =>
    !searchQuery ||
    r.source_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.recommended_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto space-y-6">
      <ToastBanner toast={toast} />

      <Card
        title="Smart Vegetable Recommendations (Goes Well With & You May Also Like)"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search pairings..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>
            <Button onClick={() => setEditing({
              ...EMPTY_REC,
              source_product: vegetablePackages[0]?.id || "",
              recommended_product: vegetablePackages[1]?.id || ""
            })}>
              <Plus size={14} className="mr-1" /> Add Pairing
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-500">Loading recommendations…</div>
        ) : (
          <Table
            emptyMessage="No vegetable recommendations configured."
            columns={[
              {
                key: "pairing",
                label: "Vegetable Pairing",
                render: r => (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      {r.source_name}
                    </span>
                    <ArrowRight size={13} className="text-slate-400" />
                    <span className="text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      {r.recommended_name} (₹{Math.round(Number(r.recommended_price))})
                    </span>
                  </div>
                )
              },
              {
                key: "type",
                label: "Recommendation Type",
                render: r => (
                  <span className="text-xs font-semibold text-slate-600">
                    {r.recommendation_type.replace(/_/g, " ")}
                  </span>
                )
              },
              {
                key: "priority",
                label: "Priority & Order",
                render: r => (
                  <span className="text-xs text-slate-600 font-mono">
                    Priority: {r.priority} • Order: {r.display_order}
                  </span>
                )
              },
              {
                key: "status",
                label: "Status",
                render: r => <Pill tone={r.is_active ? "good" : "bad"}>{r.is_active ? "Active" : "Inactive"}</Pill>
              }
            ]}
            rows={filteredRecs}
            actions={rec => (
              <>
                <Button variant="ghost" onClick={() => setEditing(rec)}><Edit2 size={14} /></Button>
                <Button variant="ghost" onClick={() => handleDelete(rec)}><Trash2 size={14} className="text-rose-500" /></Button>
              </>
            )}
          />
        )}
      </Card>

      {/* Modal */}
      {editing && (
        <Modal
          title={editing.id ? "Edit Recommendation Pairing" : "New Vegetable Pairing"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Source Vegetable *</label>
              <select
                value={editing.source_product || ""}
                onChange={e => setEditing(prev => ({ ...prev, source_product: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                required
              >
                {vegetablePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Vegetable *</label>
              <select
                value={editing.recommended_product || ""}
                onChange={e => setEditing(prev => ({ ...prev, recommended_product: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                required
              >
                {vegetablePackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={editing.recommendation_type || "GOES_WELL_WITH"}
                  onChange={e => setEditing(prev => ({ ...prev, recommendation_type: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                >
                  <option value="GOES_WELL_WITH">Goes Well With</option>
                  <option value="RECIPE_BASED">Recipe Based</option>
                  <option value="YOU_MAY_ALSO_LIKE">You May Also Like</option>
                </select>
              </div>

              <Input
                label="Priority (Higher = First)"
                type="number"
                value={editing.priority || 10}
                onChange={e => setEditing(prev => ({ ...prev, priority: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={Boolean(editing.is_active)}
                onChange={e => setEditing(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded text-emerald-600"
              />
              <span>Active Pairing</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">
                {editing.id ? "Save Changes" : "Create Pairing"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
