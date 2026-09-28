import React from "react"
import { motion } from "framer-motion"
import { Sprout, Clock, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { routes } from "../../routes.js"

export function VegetablePlaceholderPage({ title, description, phase = "Phase 2" }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] p-6 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
          <Sprout className="w-8 h-8 text-emerald-600 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-black uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Coming in {phase}</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h2>

          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            {description || "This dedicated vegetable management module is currently being finalized."}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(routes.inventory_vegetables)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md shadow-emerald-700/20"
          >
            Go to Vegetable Inventory
          </button>
        </div>
      </motion.div>
    </div>
  )
}
