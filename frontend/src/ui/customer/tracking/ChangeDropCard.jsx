// GT en-route destination change (Porter parity).
// The customer types a new drop address; the server geocodes it, routes it
// and re-prices the distance difference at the booking's locked rate.
// The client never sends an amount -- it only shows the server's preview.
import React, { useState } from "react"
import { apiRequest } from "../../../api/client.js"

const btn = { padding: "8px 14px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }

export function ChangeDropCard({ bookingId, onChanged }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (!bookingId) return null
  const errMsg = (e) => e?.data?.error?.message || e?.data?.message || e?.message || "Something went wrong."

  const doPreview = async () => {
    if (!address.trim()) return
    setBusy(true); setError(""); setPreview(null)
    try {
      const res = await apiRequest(`/booking/${bookingId}/change-drop/?drop_address=${encodeURIComponent(address.trim())}`, { method: "GET" })
      setPreview(res?.data || null)
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }

  const doConfirm = async () => {
    setBusy(true); setError("")
    try {
      const res = await apiRequest(`/booking/${bookingId}/change-drop/`, { method: "POST", json: { drop_address: address.trim() } })
      setOpen(false); setPreview(null); setAddress("")
      onChanged && onChanged(res?.data)
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...btn, marginTop: 10, background: "#eff6ff", color: "#1d4ed8" }}>
        Change drop location
      </button>
    )
  }

  return (
    <div style={{ marginTop: 10, padding: 12, border: "1px solid #bfdbfe", borderRadius: 10, background: "#f8fafc" }}>
      <label htmlFor="gt-new-drop" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>New drop address</label>
      <input
        id="gt-new-drop" value={address} onChange={(e) => { setAddress(e.target.value); setPreview(null) }}
        placeholder="Full address incl. area and city"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
      />
      {preview && (
        <div style={{ marginTop: 10, fontSize: "0.8rem", color: "#0f172a", lineHeight: 1.6 }}>
          Route: {preview.old_distance_km} km → <strong>{preview.new_distance_km} km</strong><br />
          Fare: ₹{preview.old_payable} → <strong>₹{preview.new_payable}</strong>
          {preview.minimum_fare_applied ? " (minimum fare)" : ""}
          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
            Priced at your booked rate of ₹{preview.rate_applied}/km. The final fare is confirmed against the actual distance at drop.
          </div>
        </div>
      )}
      {error && <div role="alert" style={{ marginTop: 8, color: "#b91c1c", fontSize: "0.78rem" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {!preview
          ? <button type="button" disabled={busy || !address.trim()} onClick={doPreview} style={{ ...btn, background: "#2563eb", color: "#fff", opacity: busy ? 0.6 : 1 }}>{busy ? "Checking…" : "Check new fare"}</button>
          : <button type="button" disabled={busy} onClick={doConfirm} style={{ ...btn, background: "#16a34a", color: "#fff", opacity: busy ? 0.6 : 1 }}>{busy ? "Updating…" : "Confirm & update driver"}</button>}
        <button type="button" onClick={() => { setOpen(false); setPreview(null); setError("") }} style={{ ...btn, background: "#e2e8f0", color: "#334155" }}>Cancel</button>
      </div>
    </div>
  )
}

export default ChangeDropCard
