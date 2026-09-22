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
    <div style={{ padding: "2rem", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>Painting & Waterproofing Rate Card</h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0" }}>Manage service pricing packages, capacities, and custom slabs</p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #4f46e5, #4338ca)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
            transition: "all 0.2s"
          }}
        >
          <Plus size={18} /> Add Rate Item
        </button>
      </div>

      {loading && <div style={{ textAlign: "center", color: "#64748b", padding: "3rem" }}>Loading Rate Cards...</div>}
      {error && <div style={{ color: "#ef4444", padding: "1rem", borderRadius: "12px", background: "#fef2f2", display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}><AlertCircle size={20} /> {error}</div>}

      {!loading && rates.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", background: "white", borderRadius: "16px", border: "1px dashed #e2e8f0" }}>
          <p style={{ color: "#64748b", fontWeight: 600 }}>No rate card items found. Add your first item above.</p>
        </div>
      )}

      {/* Grid of categories */}
      {!loading && rates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {categories.map(cat => {
            const catRates = rates.filter(r => r.category === cat)
            if (catRates.length === 0) return null

            return (
              <div key={cat} style={{ background: "white", padding: "1.5rem", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", border: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.75rem", marginBottom: "1rem" }}>{cat}</h2>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
                  {catRates.map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: "1.25rem",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        background: item.is_active ? "white" : "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        opacity: item.is_active ? 1 : 0.7,
                        transition: "transform 0.2s, box-shadow 0.2s"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{item.sub_service}</h3>
                          <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "6px", background: item.is_active ? "#ecfdf5" : "#f1f5f9", color: item.is_active ? "#065f46" : "#64748b", fontWeight: 700 }}>
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: "1.25rem", fontWeight: 900, color: "#4f46e5", margin: "0.25rem 0" }}>
                          ₹{item.base_rate} <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>/ {item.unit}</span>
                        </p>

                        {item.min_rate && (
                          <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0 0 0.5rem" }}>Min Rate: ₹{item.min_rate}</p>
                        )}

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "0.5rem 0" }}>
                          <span style={{ fontSize: "0.7rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", color: "#475569", fontWeight: 600 }}>{item.classification.toUpperCase()}</span>
                          {item.warranty && (
                            <span style={{ fontSize: "0.7rem", background: "#e0f2fe", padding: "2px 8px", borderRadius: "6px", color: "#0369a1", fontWeight: 600 }}>🛡️ {item.warranty}</span>
                          )}
                        </div>

                        {/* Inclusions / Exclusions preview */}
                        {item.inclusions && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b", margin: "4px 0" }}><strong>Inc:</strong> {item.inclusions.slice(0, 80)}...</div>
                        )}

                        {/* Slabs list */}
                        {item.has_slabs && item.slabs && item.slabs.length > 0 && (
                          <div style={{ margin: "10px 0 0", paddingTop: "10px", borderTop: "1px dashed #e2e8f0" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Configured Price Slabs:</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {item.slabs.map(slab => (
                                <div key={slab.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b" }}>
                                  <span>{slab.slab_key}</span>
                                  <strong style={{ color: "#0f172a" }}>₹{slab.rate} {slab.unit && `/ ${slab.unit}`}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "#4f46e5", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "2rem", borderRadius: "24px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {editingItem ? "Edit Rate Card Item" : "Create Rate Card Item"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Sub-Service Name</label>
                <input required type="text" value={subService} onChange={e => setSubService(e.target.value)} placeholder="e.g. Terrace 4-Coat Waterproofing" style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                    <option value="sq.ft">sq.ft</option>
                    <option value="litre">litre</option>
                    <option value="job">job</option>
                    <option value="door">door</option>
                    <option value="gate">gate</option>
                    <option value="window">window</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Base Rate (₹)</label>
                  <input required type="number" step="0.01" value={baseRate} onChange={e => setBaseRate(e.target.value)} placeholder="e.g. 50" style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Minimum Rate (₹) (Optional)</label>
                  <input type="number" step="0.01" value={minRate} onChange={e => setMinRate(e.target.value)} placeholder="e.g. 3500" style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Classification</label>
                  <select value={classification} onChange={e => setClassification(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                    <option value="both">Both Material + Labour</option>
                    <option value="material">Material Only</option>
                    <option value="labour">Labour Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Warranty (Optional)</label>
                <input type="text" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="e.g. 5 years warranty" style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Inclusions (Optional)</label>
                <textarea value={inclusions} onChange={e => setInclusions(e.target.value)} placeholder="Inclusions detailed notes..." rows={2} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", resize: "none" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Exclusions (Optional)</label>
                <textarea value={exclusions} onChange={e => setExclusions(e.target.value)} placeholder="Exclusions detailed notes..." rows={2} style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", resize: "none" }} />
              </div>

              <div style={{ display: "flex", gap: "1.5rem", margin: "6px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Is Active Item
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                  <input type="checkbox" checked={hasSlabs} onChange={e => setHasSlabs(e.target.checked)} />
                  Configure Price Slabs
                </label>
              </div>

              {/* Slabs Configuration Panel */}
              {hasSlabs && (
                <div style={{ padding: "1rem", borderRadius: "12px", border: "1px dashed #cbd5e1", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#334155" }}>Slabs Configurations</span>
                    <button type="button" onClick={handleAddSlab} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                      + Add Slab
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {slabs.map((slab, index) => (
                      <div key={index} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input required type="text" value={slab.slab_key} onChange={e => handleSlabChange(index, "slab_key", e.target.value)} placeholder="Key (e.g. 1 mm, Large)" style={{ flex: 1.5, padding: "6px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                        <input required type="number" step="0.01" value={slab.rate} onChange={e => handleSlabChange(index, "rate", e.target.value)} placeholder="Rate (₹)" style={{ flex: 1, padding: "6px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                        <input type="text" value={slab.unit || ""} onChange={e => handleSlabChange(index, "unit", e.target.value)} placeholder="Unit" style={{ flex: 1, padding: "6px", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                        <button type="button" onClick={() => handleRemoveSlab(index)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                    ))}
                    {slabs.length === 0 && (
                      <div style={{ fontSize: "0.7rem", color: "#64748b", textAlign: "center", padding: "8px 0" }}>No slabs added. Add slabs for capacity/thickness pricing.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1.5,
                    padding: "10px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)"
                  }}
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
