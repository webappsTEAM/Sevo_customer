import React from "react"
import { ArrowRight } from "lucide-react"

/**
 * VegetableRecipeCard
 * Displays individual recipe summary card inside the "What Can You Make With This?" popup/drawer.
 */
export function VegetableRecipeCard({ recipe, onSelectRecipe }) {
  return (
    <div
      onClick={() => onSelectRecipe && onSelectRecipe(recipe)}
      className="group rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer text-left"
    >
      <div>
        {/* Recipe Thumbnail */}
        <div className="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden">
          <img
            src={recipe.image || "/mockups/vegetables_realistic.png"}
            alt={recipe.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = "/mockups/vegetables_realistic.png"
            }}
          />
        </div>

        {/* Recipe Info */}
        <div className="p-3.5">
          <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
            {recipe.name}
          </h4>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {recipe.short_description || "Delicious homestyle recipe prepared with fresh farm vegetables."}
          </p>
        </div>
      </div>

      {/* View Recipe Button */}
      <div className="p-3.5 pt-0 mt-auto">
        <div className="w-full py-2 px-3 rounded-xl bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 text-xs font-black flex items-center justify-between transition-all">
          <span>View Recipe</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  )
}
