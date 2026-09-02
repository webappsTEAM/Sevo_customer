import React, { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, ChevronLeft, Search, Utensils, ChefHat,
  Sparkles, Flame, Clock, RefreshCcw, ShoppingBag
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { VegetableRecipeCard } from "./VegetableRecipeCard.jsx"
import { RecipeDetails } from "./RecipeDetails.jsx"

/**
 * VegetableRecipeModal
 * Responsive Modal / Drawer that opens when a customer clicks "🍳 What Can I Make?" on any vegetable.
 * Supports:
 * - Recipe List view filtered by tag & search
 * - Detailed Recipe view with nutrition, health tips, ingredients & "Complete Your Recipe" cart addition
 * - Seamless Back Navigation: Recipe Details -> Recipe List -> Close
 */
export function VegetableRecipeModal({
  isOpen,
  onClose,
  selectedVegetable,
  foodCart = {},
  setFoodCart,
  onAddAvailableVegetables,
  onUpdateCartQty,
}) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState("All")
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [activeRecipeDetail, setActiveRecipeDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [recommendations, setRecommendations] = useState([])

  // Load recipes for the selected vegetable
  useEffect(() => {
    if (!isOpen || !selectedVegetable) {
      setRecipes([])
      setActiveRecipe(null)
      setActiveRecipeDetail(null)
      return
    }

    setLoading(true)
    const vegId = selectedVegetable.id
    const vegName = selectedVegetable.name

    const params = new URLSearchParams()
    if (vegId) params.append("package_id", vegId)
    if (vegName) params.append("vegetable", vegName)

    apiRequest(`/catalog/vegetables/recipes/?${params.toString()}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRecipes(res.data)
        } else {
          setRecipes([])
        }
      })
      .catch((err) => {
        console.error("Failed to load vegetable recipes:", err)
        setRecipes([])
      })
      .finally(() => {
        setLoading(false)
      })

    // Load recommendations for this vegetable
    if (vegId) {
      apiRequest(`/catalog/vegetables/${vegId}/recommendations/`)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setRecommendations(res.data)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, selectedVegetable])

  // Load full detail when customer selects a recipe
  const handleSelectRecipe = async (recipe) => {
    setActiveRecipe(recipe)
    setDetailLoading(true)
    try {
      const res = await apiRequest(`/catalog/vegetables/recipes/${recipe.id || recipe.slug}/`)
      if (res.success && res.data) {
        setActiveRecipeDetail(res.data)
      } else {
        setActiveRecipeDetail(recipe)
      }
    } catch (err) {
      console.error("Failed to load recipe detail:", err)
      setActiveRecipeDetail(recipe)
    } finally {
      setDetailLoading(false)
    }
  }

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(q) ||
        (r.short_description && r.short_description.toLowerCase().includes(q))

      let matchesTag = true
      if (selectedTag === "Quick Recipes") {
        matchesTag = (r.total_time_minutes || r.prep_time_minutes || 0) <= 20
      } else if (selectedTag === "Easy Recipes") {
        matchesTag = r.difficulty === "Easy"
      } else if (selectedTag === "Low Calorie") {
        matchesTag = (r.calories || 0) <= 120
      } else if (selectedTag === "High Fiber") {
        matchesTag = r.tags && r.tags.some((t) => t.toLowerCase().includes("fiber"))
      } else if (selectedTag === "Popular") {
        matchesTag = Boolean(r.is_popular)
      }

      return matchesSearch && matchesTag
    })
  }, [recipes, searchQuery, selectedTag])

  if (!isOpen || !selectedVegetable) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="px-5 sm:px-7 py-4 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {activeRecipe ? (
              <button
                type="button"
                onClick={() => {
                  setActiveRecipe(null)
                  setActiveRecipeDetail(null)
                }}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Recipes</span>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xl shrink-0">
                🍳
              </div>
            )}

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {activeRecipe
                  ? (activeRecipeDetail?.name || activeRecipe.name)
                  : `What Can You Make With ${selectedVegetable.name}?`}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeRecipe
                  ? "Recipe Details & Vegetables Required"
                  : `Select a recipe to view required ingredients & smart cooking tips`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-7 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {activeRecipe ? (
            detailLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-600">Loading recipe details &amp; fresh produce…</p>
              </div>
            ) : (
              <RecipeDetails
                recipe={activeRecipeDetail || activeRecipe}
                foodCart={foodCart}
                onAddAvailableVegetables={onAddAvailableVegetables}
                onUpdateCartQty={onUpdateCartQty}
                recommendations={recommendations}
              />
            )
          ) : (
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search recipes for ${selectedVegetable.name} (e.g. Salad, Soup, Curry)...`}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Recipe Cards Grid */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <RefreshCcw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-600">Discovering recipes for {selectedVegetable.name}…</p>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No recipes matching your filters</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try clearing your search query or selecting a different filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedTag("All")
                    }}
                    className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredRecipes.map((recipe, idx) => (
                    <VegetableRecipeCard
                      key={idx}
                      recipe={recipe}
                      onSelectRecipe={handleSelectRecipe}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
