import React, { useState } from "react"
import { Star } from "lucide-react"
import { apiRequest } from "../../api/client.js"

const TAGS = ["Punctual", "Careful with goods", "Polite & professional", "Clear communication", "Good value"]

/**
 * Real, persisted rating for a delivered Goods & Transport / Packers & Movers trip.
 *
 * `feedback` is the `feedback` block of the customer live-location payload:
 * { token, submitted, rating }. Nothing is shown as "thank you" until the server
 * has actually accepted the rating -- an earlier version of this card only set
 * local state, so a customer could "rate" a driver and nothing was ever saved.
 */
export function TripRatingCard({ feedback, onSubmitted }) {
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  if (!feedback?.token) return null

  const alreadyRated = Boolean(feedback.submitted) || done
  const shownRating = done ? score : feedback.rating

  const toggleTag = (tag) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const submit = async () => {
    if (!score || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const text = [tags.length ? `[${tags.join(", ")}]` : "", comment.trim()].filter(Boolean).join(" ")
      const res = await apiRequest(`/feedback/${encodeURIComponent(feedback.token)}/`, {
        method: "POST",
        json: { rating: score, comment: text },
      })
      if (res?.success === false) {
        setError(res?.message || "Could not save your rating. Please try again.")
      } else {
        setDone(true)
        if (onSubmitted) onSubmitted(score)
      }
    } catch (err) {
      setError(err?.body?.message || err?.body?.detail || "Could not save your rating. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      data-testid="trip-rating-card"
      style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: "1.25rem", marginBottom: "1.25rem", textAlign: "center" }}
    >
      <h4 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 800, color: "#065f46" }}>
        {alreadyRated ? "Thank you for rating your trip" : "How was your delivery?"}
      </h4>
      <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#047857" }}>
        {alreadyRated
          ? "Your feedback helps us recognise great drivers and keep quality high."
          : "Tap a star to rate your driver"}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (alreadyRated ? shownRating || 0 : hover || score) >= star
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              disabled={alreadyRated || submitting}
              onClick={() => setScore(star)}
              onMouseEnter={() => !alreadyRated && setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{ background: "transparent", border: "none", cursor: alreadyRated ? "default" : "pointer", padding: 4 }}
            >
              <Star size={32} color={active ? "#f59e0b" : "#cbd5e1"} fill={active ? "#f59e0b" : "transparent"} />
            </button>
          )
        })}
      </div>

      {!alreadyRated && score > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 10 }}>
            {TAGS.map((tag) => {
              const selected = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: "5px 12px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                    border: selected ? "1px solid #059669" : "1px solid #cbd5e1",
                    background: selected ? "#059669" : "white", color: selected ? "white" : "#334155",
                  }}
                >
                  {selected ? "✓ " : ""}{tag}
                </button>
              )
            })}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Anything else to add? (optional)"
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, border: "1px solid #cbd5e1", padding: "8px 10px", fontSize: "0.85rem", marginBottom: 10 }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{ background: "#059669", color: "white", border: "none", borderRadius: 10, padding: "9px 22px", fontWeight: 800, cursor: submitting ? "wait" : "pointer" }}
          >
            {submitting ? "Saving..." : "Submit rating"}
          </button>
        </>
      )}

      {error && <p role="alert" style={{ margin: "10px 0 0", fontSize: "0.8rem", color: "#b91c1c" }}>{error}</p>}
    </div>
  )
}

export default TripRatingCard
