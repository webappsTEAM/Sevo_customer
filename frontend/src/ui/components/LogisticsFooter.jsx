import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { fetchLogisticsCities } from "../../api/logisticsService.js"
import { routes } from "../routes.js"

export function LogisticsFooter({
  currentCitySlug = "hosur",
  currentCityName = "Hosur",
  onOpenSupport = null,
}) {
  const navigate = useNavigate()
  const [serverCities, setServerCities] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchLogisticsCities()
      .then((cities) => {
        if (!cancelled && Array.isArray(cities) && cities.length > 0) {
          setServerCities(cities)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[var(--sevo-surface)] border-t border-[var(--sevo-border)] pt-12 pb-8 text-xs text-[var(--sevo-text-secondary)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Company */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">Company</h4>
            <ul className="space-y-2">
              <li>
                <span
                  onClick={() => navigate(routes.about || "/home")}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  About Us
                </span>
              </li>
              <li>
                <span
                  onClick={() => navigate(routes.about || "/home")}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Careers
                </span>
              </li>
              <li>
                <span
                  onClick={() => navigate(routes.about || "/home")}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Blog
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <span
                  onClick={() => navigate(`/trucks/${currentCitySlug}`)}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Trucks in {currentCityName}
                </span>
              </li>
              <li>
                <span
                  onClick={() => navigate(`/two-wheelers/${currentCitySlug}`)}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Two Wheelers
                </span>
              </li>
              <li>
                <span
                  onClick={() => navigate(`/packers-and-movers/${currentCitySlug}`)}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Packers &amp; Movers
                </span>
              </li>
              <li>
                <span
                  onClick={() => {
                    if (onOpenSupport) onOpenSupport()
                    else navigate("/home")
                  }}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Enterprise Logistics
                </span>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">Support</h4>
            <ul className="space-y-2">
              <li>
                <span
                  onClick={() => {
                    if (onOpenSupport) onOpenSupport()
                    else navigate(routes.contact_us || "/home")
                  }}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Contact Us
                </span>
              </li>
              <li>
                <span
                  onClick={() => {
                    if (onOpenSupport) onOpenSupport()
                    else navigate(routes.help_and_support || "/home")
                  }}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Help Center
                </span>
              </li>
              <li>
                <span
                  onClick={() => navigate(routes.privacy || routes.privacy_policy || "/privacy")}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Privacy Policy
                </span>
              </li>
              <li>
                <span
                  onClick={() => navigate(routes.terms || routes.terms_and_conditions || "/terms")}
                  className="hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>

          {/* Operating Cities */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">Operating Cities</h4>
            {serverCities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {serverCities.map((city) => {
                  const isCurrent = (city.slug || "").toLowerCase() === currentCitySlug.toLowerCase()
                  return (
                    <button
                      key={city.id || city.slug}
                      type="button"
                      onClick={() => navigate(`/trucks/${city.slug || city.name.toLowerCase()}`)}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-100 text-emerald-800 font-bold border border-emerald-300"
                          : "text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                      }`}
                    >
                      {city.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-600">
                {currentCityName}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {currentYear} Sevo Logistics Solutions Pvt. Ltd. All rights reserved.</p>
          <p>Affordable and Trusted Logistics Solutions in {currentCityName}</p>
        </div>
      </div>
    </footer>
  )
}
