import React from "react"
import { useNavigate } from "react-router-dom"
import { routes } from "../routes.js"

export function sevoLogo({ size = "md", showTagline = false, className = "", theme = "light", onClick }) {
  const navigate = useNavigate()
  const isDark = theme === "dark"

  const emblemHeight = typeof size === "number"
    ? Math.max(24, Math.round(size * 1.3))
    : size === "sm" ? 28 : size === "lg" ? 42 : 34

  const textHeight = typeof size === "number"
    ? Math.max(14, Math.round(size * 0.7))
    : size === "sm" ? 14 : size === "lg" ? 20 : 17

  const handleClick = (e) => {
    if (typeof onClick === "function") {
      onClick(e)
    } else {
      navigate(routes?.landing || "/home")
    }
  }

  return (
    <div
      className={`flex items-center gap-2 cursor-pointer font-sans select-none shrink-0 group ${className}`}
      onClick={handleClick}
      title="SEVO Home"
    >
      <img
        src="/assets/sevo_emblem_transparent.png"
        alt="SEVO Emblem"
        className="w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
        style={{ height: `${emblemHeight}px` }}
      />
      <img
        src={isDark ? "/assets/sevo_text_logo_white.png" : "/assets/sevo_text_logo.png"}
        alt="SEVO"
        className="shrink-0 object-contain"
        style={{ height: `${textHeight}px`, width: 'auto' }}
      />
    </div>
  )
}

export const SevoLogo = sevoLogo
export const CalTrackLogo = sevoLogo
export default sevoLogo
