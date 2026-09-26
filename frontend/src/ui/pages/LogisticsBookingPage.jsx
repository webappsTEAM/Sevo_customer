import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { MapPin, Clock, ArrowLeft, Bell } from "lucide-react"
import { apiRequest } from "../../api/client.js"
import { MiniTruckBookingHosurPage } from "./MiniTruckBookingHosurPage.jsx"
import { TwoWheelerBookingHosurPage } from "./TwoWheelerBookingHosurPage.jsx"
import { PackersMoversBookingHosurPage } from "./PackersMoversBookingHosurPage.jsx"

// GT-B-06: "only 3 hardcoded Hosur-only city booking pages" -- this is the
// generic {category, city} entry point the finding asked for. It does NOT
// rewrite the three existing ~3000-line booking pages (that would be a much
// larger, riskier refactor of working booking flows). Instead:
//   - it looks up the requested city against the new City registry
//     (GET /settings/cities/, added in the paired backend commit)
//   - for a *launched* city it currently only has real content for Hosur,
//     so it renders the matching existing page component for Hosur
//   - for any other city (not launched yet, or simply unknown) it shows an
//     honest "coming soon" state instead of silently pretending the booking
//     flow works somewhere it has no real service-zone data
//
// This makes /logistics/:category/:city a real, working, data-driven route
// today, and is the natural place to swap in a fully generic booking flow
// per category+city later, once more cities have real ServiceZone data.

const CATEGORY_MAP = {
  trucks: { label: "Mini Truck & Logistics", Component: MiniTruckBookingHosurPage },
  "two-wheelers": { label: "Two-Wheeler Delivery", Component: TwoWheelerBookingHosurPage },
  "packers-and-movers": { label: "Packers & Movers", Component: PackersMoversBookingHosurPage },
}

export function LogisticsBookingPage() {
  const { category, city: citySlugParam } = useParams()
  const navigate = useNavigate()
  const citySlug = (citySlugParam || "hosur").toLowerCase()
  const categoryInfo = CATEGORY_MAP[category] || null

  const [cities, setCities] = useState(null)
  const [citiesError, setCitiesError] = useState("")

  useEffect(() => {
    let cancelled = false
    apiRequest("/settings/cities/")
      .then((res) => {
        if (cancelled) return
        setCities(Array.isArray(res?.results) ? res.results : [])
      })
      .catch(() => {
        if (!cancelled) setCitiesError("Could not load city list.")
      })
    return () => { cancelled = true }
  }, [])

  if (!categoryInfo) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Unknown service category</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>"{category}" isn't a logistics category we recognize.</p>
        <button onClick={() => navigate("/home")} style={{ padding: "10px 18px", borderRadius: 10, background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600 }}>
          Back to Home
        </button>
      </div>
    )
  }

  // Still loading the city registry — render nothing blocking, just wait briefly.
  if (cities === null && !citiesError) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0f172a", animation: "spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
      </div>
    )
  }

  const matchedCity = (cities || []).find((c) => c.slug === citySlug)
  // Fall back to treating "hosur" as launched even if the API call failed or
  // the city list is momentarily empty — this keeps the existing, working
  // Hosur booking flow available regardless of the new endpoint's health.
  const isLaunched = matchedCity ? matchedCity.is_launched : citySlug === "hosur"

  if (isLaunched && citySlug === "hosur") {
    const { Component } = categoryInfo
    return <Component />
  }

  const cityLabel = matchedCity?.name || (citySlugParam ? citySlugParam.replace(/-/g, " ") : "your city")

  return (
    <div style={{ minHeight: "70vh", maxWidth: 640, margin: "0 auto", padding: "48px 20px", textAlign: "center" }}>
      <button
        onClick={() => navigate(-1)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13, fontWeight: 600, marginBottom: 28, background: "none", border: "none", cursor: "pointer" }}
      >
        <ArrowLeft size={15} /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <MapPin size={28} color="#4f46e5" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8, textTransform: "capitalize" }}>
          {categoryInfo.label} isn't in {cityLabel} yet
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          We currently operate {categoryInfo.label.toLowerCase()} bookings in Hosur, Tamil Nadu.
          {matchedCity ? ` ${cityLabel} is on our expansion list — we'll` : " We'll"} let you know as soon as
          this service goes live in your area.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#334155", marginBottom: 24 }}>
          <Clock size={14} /> Coming soon
        </div>
        <div>
          <button
            onClick={() => navigate(`/${category}/hosur`)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 700 }}
          >
            <Bell size={15} /> Book in Hosur instead
          </button>
        </div>
        {citiesError && (
          <p style={{ color: "#ef4444", fontSize: 12, marginTop: 16 }}>{citiesError}</p>
        )}
      </motion.div>
    </div>
  )
}
