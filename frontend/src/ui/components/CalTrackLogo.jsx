import React from "react"
import { Home } from "lucide-react"

export function CalTrackLogo({ size = "md", showTagline = false, className = "", theme = "light" }) {
  return (
    <div
      className={`flex items-center gap-2.5 cursor-pointer font-sans select-none ${className}`}
      onClick={() => window.location.href = "/home"}
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
        <Home size={18} />
      </div>
      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        CalServices
      </span>
    </div>
  )
}
