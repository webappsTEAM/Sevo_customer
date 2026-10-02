// Light PTL: revise a Part Truck Load quote before dispatch (declared weight and/or drop).
// Same pattern as ChangeDropCard: the server previews (GET) and applies (POST) the
// revision; the client only echoes the server's signed quote, never its own amount.
// Rendered only when the tracking payload says ptl.requote_eligible (same rule the API enforces).
import React, { useState } from "react"
import { apiRequest } from "../../../api/client.js"

const btn = { padding: "8px 14px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }
const input = { width: "100%", boxSizing: "border-box", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }

export function PTLRequoteCard({ bookingId, currentWeightKg, onChanged }) {
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState(currentWeightKg || "")
  const [address, setAddress] = useState("")
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (!bookingId) return null
  const errMsg = (e) => (e?.status === 401 || e?.status === 403)
    ? "Only the signed-in customer who made this booking can revise its quote."
    : (e?.data?.error?.message || e?.data?.message || e?.message || "Something went wrong.")
  const reset = () => { setPreview(null); setError("") }
  const weightChanged = String(weight).trim() !== "" && String(weight).trim() !== String(currentWeightKg || "")
  const canPreview = (weightChanged || address.trim()) && !(Number(weight) <= 0)

  const doPreview = async () => {
    setBusy(true); reset()
    const qs = new URLSearchParams()
    if (String(weight).trim()) qs.set("declared_weight_kg", String(weight).trim())
    if (address.trim()) qs.set("drop_address", address.trim())
    try {
      const res = await apiRequest(`/booking/${bookingId}/ptl-requote/?${qs.toString()}`, { method: "GET" })
      setPreview(res?.data || null)
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }

  const doConfirm = async () => {
    if (!preview) return
    setBusy(true); setError("")
    const body = {
      declared_weight_kg: preview.declared_weight_kg,
      quote_id: preview.quote_id, quote_hash: preview.quote_hash,
      expires_at: preview.expires_at, total_amount: preview.total,
    }
    if (address.trim()) {
      body.drop_latitude = preview.drop_lat
      body.drop_longitude = preview.drop_lng
      body.drop_address = address.trim()
    }
    try {
      const res = await apiRequest(`/booking/${bookingId}/ptl-requote/`, { method: "POST", json: body })
      setOpen(false); setPreview(null); setAddress("")
      onChanged && onChanged(res?.data)
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...btn, marginTop: 10, background: "#eff6ff", color: "#1d4ed8" }}>
        Revise quote (weight / drop)
      </button>
    )
  }

  return (
    <div style={{ marginTop: 10, padding: 12, border: "1px solid #bfdbfe", borderRadius: 10, background: "#f8fafc" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>Revise Part Truck Load quote</div>
      <label htmlFor="ptl-rq-weight" style={{ display: "block", marginTop: 8, fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>Declared weight (kg)</label>
      <input id="ptl-rq-weight" type="number" min="1" inputMode="decimal" value={weight}
        onChange={(e) => { setWeight(e.target.value); reset() }} style={input} />
      <label htmlFor="ptl-rq-drop" style={{ display: "block", marginTop: 8, fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>New drop address (optional)</label>
      <input id="ptl-rq-drop" value={address} onChange={(e) => { setAddress(e.target.value); reset() }}
        placeholder="Leave blank to keep the current drop" style={input} />
      {preview && (
        <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#0f172a", lineHeight: 1.6 }}>
          Weight: <strong>{preview.declared_weight_kg} kg</strong>
          {preview.chargeable_weight_kg && preview.chargeable_weight_kg !== preview.declared_weight_kg ? ` (charged as ${preview.chargeable_weight_kg} kg)` : ""}<br />
          Fare: ₹{preview.old_payable} → <strong>₹{preview.new_payable}</strong>
          {preview.minimum_fare_applied ? " (minimum fare)" : ""}
          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
            ₹{preview.rate_per_kg}/kg. You load and unload the goods. This quote is valid for a limited time.
          </div>
        </div>
      )}
      {error && <div role="alert" style={{ marginTop: 8, color: "#b91c1c", fontSize: "0.78rem" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {!preview
          ? <button type="button" disabled={busy || !canPreview} onClick={doPreview} style={{ ...btn, background: "#2563eb", color: "#fff", opacity: busy || !canPreview ? 0.6 : 1 }}>{busy ? "Checking…" : "Check new price"}</button>
          : <button type="button" disabled={busy} onClick={doConfirm} style={{ ...btn, background: "#16a34a", color: "#fff", opacity: busy ? 0.6 : 1 }}>{busy ? "Updating…" : "Confirm new quote"}</button>}
        <button type="button" onClick={() => { setOpen(false); reset() }} style={{ ...btn, background: "#e2e8f0", color: "#334155" }}>Cancel</button>
      </div>
    </div>
  )
}

export default PTLRequoteCard
