/**
 * Display helpers for Goods & Transport service/vehicle cards.
 *
 * Every value a card shows must come from the field that governs it:
 *   - capacity  -> ServiceTier.max_weight_kg (the same limit cargo fitment
 *                  enforces); capacity_label is only a fallback when no limit
 *                  is configured, because it is free text that can drift.
 *   - dimensions-> ServiceTier.dimensions_label (admin: Package
 *                  "gt_dimensions_label"); never numbers baked into artwork.
 *   - badge     -> the admin's Package tag, hidden when it merely repeats the
 *                  capacity already shown on the card.
 */

const DIM_PART = /^(\d+(?:\.\d+)?)\s*(cm|mm|m|ft|in|inch|inches)?$/i

/**
 * Parse "40cm x 40cm" / "5.5ft x 4ft x 4ft" / "5 x 4 ft".
 * Returns { top, left } for the artwork's two dimension callouts (first value
 * is the width/length shown along the top, last value the height shown at the
 * left), or null when the label is empty or not a plain dimension list -- in
 * which case the artwork shows no numbers instead of guessing.
 */
export function parseDimensionLabel(label) {
  if (!label || typeof label !== "string") return null
  const parts = label.trim().split(/\s*[x×*]\s*/i)
  if (parts.length < 1 || parts.length > 3) return null
  const parsed = []
  for (const part of parts) {
    const m = DIM_PART.exec(part.trim())
    if (!m) return null
    parsed.push({ value: m[1], unit: (m[2] || "").toLowerCase() })
  }
  // "5 x 4 ft": a trailing unit applies to values that have none.
  for (let i = parsed.length - 2; i >= 0; i--) {
    if (!parsed[i].unit) parsed[i].unit = parsed[i + 1].unit
  }
  const fmt = (p) => `${p.value}${p.unit}`
  return {
    top: fmt(parsed[0]),
    left: parsed.length > 1 ? fmt(parsed[parsed.length - 1]) : "",
  }
}

/** "20 kg" from the authoritative payload limit, else the admin's label. */
export function tierCapacityText(tier) {
  const kg = Number(tier?.max_weight_kg)
  if (Number.isFinite(kg) && kg > 0) {
    return `${kg.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`
  }
  return tier?.capacity_label || ""
}

const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase()

/** Drop a highlight badge that only repeats the capacity shown on the card. */
export function tierBadgeText(badge, tier, capacityText) {
  if (!badge) return ""
  const b = norm(badge)
  if (b === norm(capacityText) || b === norm(tier?.capacity_label)) return ""
  return badge
}
