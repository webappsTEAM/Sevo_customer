import React, { useState, useEffect } from "react"
import { apiRequest } from "../../../api/client.js"
import { Plus, Edit2, Trash2, Shield, Settings, Check, X, AlertCircle } from "lucide-react"

export function PaintingRateCardPage() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  // Form fields
  const [category, setCategory] = useState("Waterproofing")
  const [subService, setSubService] = useState("")
  const [unit, setUnit] = useState("sq.ft")
  const [baseRate, setBaseRate] = useState("")
  const [minRate, setMinRate] = useState("")
  const [classification, setClassification] = useState("both")
  const [warranty, setWarranty] = useState("")
  const [inclusions, setInclusions] = useState("")
  const [exclusions, setExclusions] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [hasSlabs, setHasSlabs] = useState(false)
  const [slabs, setSlabs] = useState([])

  const categories = [
    "Interior Painting",
    "Exterior Painting",
    "Waterproofing",
    "Wood & Metal Painting",
    "Texture & Decorative Painting"
  ]

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    setLoading(true)
    try {
      const res = await apiRequest("/admin/painting/rate-card/")
      if (res?.success) {
        setRates(res.data)
      } else {
        setError(res?.message || "Failed to load rate card items.")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to fetch rates from backend.")
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setCategory("Waterproofing")
    setSubService("")
    setUnit("sq.ft")
    setBaseRate("")
    setMinRate("")
    setClassification("both")
    setWarranty("")
    setInclusions("")
    setExclusions("")
    setIsActive(true)
    setHasSlabs(false)
    setSlabs([])
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setCategory(item.category)
    setSubService(item.sub_service)
    setUnit(item.unit)
    setBaseRate(item.base_rate)
    setMinRate(item.min_rate || "")
    setClassification(item.classification)
    setWarranty(item.warranty || "")
    setInclusions(item.inclusions || "")
    setExclusions(item.exclusions || "")
    setIsActive(item.is_active)
    setHasSlabs(item.has_slabs)
    setSlabs(item.slabs || [])
    setIsModalOpen(true)
  }

  const handleAddSlab = () => {
    setSlabs([...slabs, { slab_key: "", rate: "", unit: "" }])
  }

  const handleRemoveSlab = (index) => {
    setSlabs(slabs.filter((_, idx) => idx !== index))
  }

  const handleSlabChange = (index, field, value) => {
    const updated = slabs.map((s, idx) => {
      if (idx === index) {
        return { ...s, [field]: value }
      }
      return s
    })
    setSlabs(updated)
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rate card item?")) return
    try {
      const res = await apiRequest(`/admin/painting/rate-card/${id}/`, { method: "DELETE" })
      if (res?.success) {
        setRates(rates.filter(r => r.id !== id))
      } else {
        alert(res?.message || "Delete failed.")
      }
    } catch (err) {
      console.error(err)
      alert("Error occurred while deleting.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      category,
      sub_service: subService,
      unit,
      base_rate: parseFloat(baseRate),
      min_rate: minRate ? parseFloat(minRate) : null,
      classification,
      warranty,
      inclusions,
      exclusions,
      is_active: isActive,
      has_slabs: hasSlabs,
      slabs
    }

    try {
      let res
      if (editingItem) {
        res = await apiRequest(`/admin/painting/rate-card/${editingItem.id}/`, {
          method: "PUT",
          json: payload
        })
      } else {
        res = await apiRequest("/admin/painting/rate-card/", {
          method: "POST",
          json: payload
        })
      }

      if (res?.success) {
        setIsModalOpen(false)
        fetchRates()
      } else {
        alert(res?.message || "Save failed. Check input details.")
      }
    } catch (err) {
      console.error(err)
      alert("Error while saving rate card item.")
    }
  }

  return (
    <div className="p-8 bg-[var(--sevo-bg)] min-h-screen text-[var(--sevo-text-primary)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--sevo-text-primary)] m-0">Painting & Waterproofing Rate Card</h1>
          <p className="text-[var(--sevo-text-secondary)] mt-1">Manage service pricing packages, capacities, and custom slabs</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus size={18} /> Add Rate Item
        </button>
      </div>

      {loading && <div className="text-center text-[var(--sevo-text-muted)] py-12">Loading Rate Cards...</div>}
      {error && <div className="text-red-500 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 mb-6"><AlertCircle size={20} /> {error}</div>}

      {!loading && rates.length === 0 && (
        <div className="text-center p-16 bg-[var(--sevo-surface)] rounded-2xl border border-dashed border-[var(--sevo-border)]">
          <p className="text-[var(--sevo-text-secondary)] font-semibold">No rate card items found. Add your first item above.</p>
        </div>
      )}

      {/* Grid of categories */}
      {!loading && rates.length > 0 && (
        <div className="flex flex-col gap-8">
          {categories.map(cat => {
            const catRates = rates.filter(r => r.category === cat)
            if (catRates.length === 0) return null

            return (
              <div key={cat} className="bg-[var(--sevo-surface)] p-6 rounded-2xl shadow-sm border border-[var(--sevo-border)]">
                <h2 className="text-lg font-extrabold text-[var(--sevo-text-primary)] border-b border-[var(--sevo-border)] pb-3 mb-4">{cat}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catRates.map(item => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-xl border border-[var(--sevo-border)] flex flex-col justify-between transition-all duration-200 ${item.is_active ? 'bg-[var(--sevo-surface-raised)]' : 'bg-[var(--sevo-surface-raised)]/60 opacity-70'}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-bold text-[var(--sevo-text-primary)] m-0">{item.sub_service}</h3>
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${item.is_active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 my-1">
                          ₹{item.base_rate} <span className="text-xs text-[var(--sevo-text-muted)] font-medium">/ {item.unit}</span>
                        </p>

                        {item.min_rate && (
                          <p className="text-xs text-[var(--sevo-text-muted)] mb-2">Min Rate: ₹{item.min_rate}</p>
                        )}

                        <div className="flex gap-1.5 flex-wrap my-2">
                          <span className="text-xs bg-[var(--sevo-surface)] border border-[var(--sevo-border)] px-2 py-0.5 rounded-md text-[var(--sevo-text-secondary)] font-semibold">{item.classification.toUpperCase()}</span>
                          {item.warranty && (
                            <span className="text-xs bg-sky-500/15 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-md font-semibold">🛡️ {item.warranty}</span>
                          )}
                        </div>

                        {/* Inclusions / Exclusions preview */}
                        {item.inclusions && (
                          <div className="text-xs text-[var(--sevo-text-muted)] my-1"><strong>Inc:</strong> {item.inclusions.slice(0, 80)}...</div>
                        )}

                        {/* Slabs list */}
                        {item.has_slabs && item.slabs && item.slabs.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-dashed border-[var(--sevo-border)]">
                            <div className="text-xs font-bold text-[var(--sevo-text-secondary)] mb-1">Configured Price Slabs:</div>
                            <div className="flex flex-col gap-1">
                              {item.slabs.map(slab => (
                                <div key={slab.id} className="flex justify-between text-xs text-[var(--sevo-text-secondary)]">
                                  <span>{slab.slab_key}</span>
                                  <strong className="text-[var(--sevo-text-primary)]">₹{slab.rate} {slab.unit && `/ ${slab.unit}`}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 mt-4 border-t border-[var(--sevo-border)] pt-3">
                        <button
                          onClick={() => openEditModal(item)}
                          className="flex items-center gap-1 bg-transparent border-0 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer hover:underline"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="flex items-center gap-1 bg-transparent border-0 text-red-500 text-xs font-bold cursor-pointer hover:underline"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
          <div className="bg-[var(--sevo-surface)] border border-[var(--sevo-border)] p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-[var(--sevo-text-primary)] m-0">
                {editingItem ? "Edit Rate Card Item" : "Create Rate Card Item"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-transparent border-0 text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)] cursor-pointer"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Sub-Service Name</label>
                <input required type="text" value={subService} onChange={e => setSubService(e.target.value)} placeholder="e.g. Terrace 4-Coat Waterproofing" className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]">
                    <option value="sq.ft">sq.ft</option>
                    <option value="litre">litre</option>
                    <option value="job">job</option>
                    <option value="door">door</option>
                    <option value="gate">gate</option>
                    <option value="window">window</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Base Rate (₹)</label>
                  <input required type="number" step="0.01" value={baseRate} onChange={e => setBaseRate(e.target.value)} placeholder="e.g. 50" className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Minimum Rate (₹) (Optional)</label>
                  <input type="number" step="0.01" value={minRate} onChange={e => setMinRate(e.target.value)} placeholder="e.g. 3500" className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Classification</label>
                  <select value={classification} onChange={e => setClassification(e.target.value)} className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]">
                    <option value="both">Both Material + Labour</option>
                    <option value="material">Material Only</option>
                    <option value="labour">Labour Only</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Warranty (Optional)</label>
                <input type="text" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="e.g. 5 years warranty" className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)]" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Inclusions (Optional)</label>
                <textarea value={inclusions} onChange={e => setInclusions(e.target.value)} placeholder="Inclusions detailed notes..." rows={2} className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)] resize-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--sevo-text-secondary)]">Exclusions (Optional)</label>
                <textarea value={exclusions} onChange={e => setExclusions(e.target.value)} placeholder="Exclusions detailed notes..." rows={2} className="p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)] resize-none" />
              </div>

              <div className="flex gap-6 my-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--sevo-text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-indigo-600" />
                  Is Active Item
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--sevo-text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={hasSlabs} onChange={e => setHasSlabs(e.target.checked)} className="rounded text-indigo-600" />
                  Configure Price Slabs
                </label>
              </div>

              {/* Slabs Configuration Panel */}
              {hasSlabs && (
                <div className="p-4 rounded-xl border border-dashed border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-extrabold text-[var(--sevo-text-primary)]">Slabs Configurations</span>
                    <button type="button" onClick={handleAddSlab} className="bg-transparent border-0 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer hover:underline">
                      + Add Slab
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {slabs.map((slab, index) => (
                      <div key={index} className="flex gap-1.5 items-center">
                        <input required type="text" value={slab.slab_key} onChange={e => handleSlabChange(index, "slab_key", e.target.value)} placeholder="Key (e.g. 1 mm, Large)" className="flex-[1.5] p-1.5 text-xs rounded-lg border border-[var(--sevo-border)] bg-[var(--sevo-surface)] text-[var(--sevo-text-primary)]" />
                        <input required type="number" step="0.01" value={slab.rate} onChange={e => handleSlabChange(index, "rate", e.target.value)} placeholder="Rate (₹)" className="flex-1 p-1.5 text-xs rounded-lg border border-[var(--sevo-border)] bg-[var(--sevo-surface)] text-[var(--sevo-text-primary)]" />
                        <input type="text" value={slab.unit || ""} onChange={e => handleSlabChange(index, "unit", e.target.value)} placeholder="Unit" className="flex-1 p-1.5 text-xs rounded-lg border border-[var(--sevo-border)] bg-[var(--sevo-surface)] text-[var(--sevo-text-primary)]" />
                        <button type="button" onClick={() => handleRemoveSlab(index)} className="bg-transparent border-0 text-red-500 cursor-pointer p-1"><X size={16} /></button>
                      </div>
                    ))}
                    {slabs.length === 0 && (
                      <div className="text-xs text-[var(--sevo-text-muted)] text-center py-2">No slabs added. Add slabs for capacity/thickness pricing.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 mt-4 border-t border-[var(--sevo-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 p-2.5 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] font-bold cursor-pointer hover:bg-[var(--sevo-surface)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[1.5] p-2.5 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaintingRateCardPage
