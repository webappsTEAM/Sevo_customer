/**
 * frontend/src/components/logistics/LogisticsKit.jsx
 *
 * Shared UI for the three Goods Transport / Packers & Movers booking pages
 * (MiniTruckBookingHosurPage, TwoWheelerBookingHosurPage,
 * PackersMoversBookingHosurPage). Extracted because those three pages
 * duplicated this markup near-verbatim (tier cards, lane tables, areas
 * list, OTP modal) with three separate copies to maintain.
 *
 * CLAUDE.md rules followed here: inline styles + CSS variables only (no
 * Tailwind), named exports only, reuses the existing .btn/.btnPrimary/
 * .btnGhost/.field/.input classes already defined in ui/styles.css rather
 * than reinventing button/input chrome.
 */
import { MapPin, Package } from "lucide-react"

const rupee = (value) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

/**
 * Today's date as YYYY-MM-DD in the browser's LOCAL time, not UTC.
 * `new Date().toISOString()` is UTC and can land on the previous day for
 * users east of UTC (e.g. IST) late at night — which the backend's
 * `preferred_date >= today` check would then reject as "in the past".
 */
export function todayDateString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// ─── Tier / package card ────────────────────────────────────────────────────

export function TierCard({ tier, selected = false, onSelect, diagram = null }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${selected ? "var(--good)" : "var(--stroke)"}`,
        borderRadius: "var(--radius-lg)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: selected ? "var(--shadow)" : "var(--shadow-sm)",
      }}
    >
      {diagram && <div style={{ display: "flex", justifyContent: "center" }}>{diagram}</div>}

      {tier.capacity_label && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 13 }}>
          <Package size={14} />
          <span>{tier.capacity_label}</span>
        </div>
      )}

      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)" }}>{tier.name}</div>

      {tier.description && (
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{tier.description}</div>
      )}

      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        Starting from <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{rupee(tier.starting_price)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--good)", textDecoration: "underline" }}
        >
          Know More
        </a>
        <button type="button" className="btn btnPrimary" onClick={() => onSelect?.(tier)}>
          {selected ? "Selected" : "Select & Book"}
        </button>
      </div>
    </div>
  )
}

// ─── Popular routes / lanes ─────────────────────────────────────────────────

export function LaneList({ lanes, onSelect }) {
  if (!lanes?.length) return null
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
        background: "var(--surface)",
        border: "1px solid var(--stroke)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
      }}
    >
      {lanes.map((lane) => (
        <div
          key={lane.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingBottom: 16,
            borderBottom: "1px solid var(--stroke)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--fg)", fontSize: 15 }}>
              to {lane.destination_label}
              {lane.distance_km ? (
                <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 13 }}> ({Number(lane.distance_km)} km)</span>
              ) : null}
            </span>
            {lane.eta_label && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--good)" }}>{lane.eta_label}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              fare from <strong style={{ color: "var(--fg)" }}>{rupee(lane.fare)}</strong>
            </span>
            <button
              type="button"
              className="btnGhost btn"
              style={{ padding: "4px 10px", fontSize: 13 }}
              onClick={() => onSelect?.(lane)}
            >
              Select →
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Areas served ────────────────────────────────────────────────────────────

export function AreasServedChips({ areas }) {
  if (!areas?.length) return null
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {areas.map((area) => (
        <span
          key={area.id}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid var(--stroke2)",
            fontSize: 13,
            color: "var(--fg2)",
            background: "var(--surface)",
          }}
        >
          <MapPin size={12} style={{ color: "var(--muted)" }} />
          {area.name}
        </span>
      ))}
    </div>
  )
}

// NOTE: an OtpLoginModal export used to live here — built to de-duplicate
// the inline "Sign In to Complete Booking" phone-OTP modal that was
// copy-pasted across the three Hosur pages, but never actually wired in
// (they kept their own inline copies). Removed as part of unifying customer
// login onto CustomerEntryFlowModal, which those pages now use directly.
