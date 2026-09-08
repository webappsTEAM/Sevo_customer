import React, { useState } from "react"
import {
  Clock, Flame, Users, ChefHat, Heart, ShieldCheck,
  CheckCircle2, Plus, ShoppingCart, Sparkles, AlertCircle,
  HelpCircle, ChevronRight, Check
} from "lucide-react"
import { VegetableRecommendationSection } from "./VegetableRecommendationSection.jsx"
import { getVegetableProducePhoto } from "../../../utils/vegetablePhotoMap.js"

function getProducePhotoFallback(name) {
  const n = (name || "").toLowerCase()
  if (n.includes("basket") || n.includes("essential")) return "/mockups/vegetables_realistic.png"
  if (n.includes("tomato") || n.includes("thakkali") || n.includes("tamatar") || n.includes("cherry")) return "/mockups/veg_tomato.png"
  
  if (n.includes("spring onion") || n.includes("vengaya thaal")) return "/mockups/veg/spring_onion.jpg"
  if (n.includes("onion") || n.includes("vengayam") || n.includes("pyaz")) return "/mockups/veg/onion.jpg"

  if (n.includes("peeled garlic") || n.includes("uricha poondu")) return "/mockups/veg/peeled_garlic.jpg"
  if (n.includes("garlic") || n.includes("poondu") || n.includes("lehsun")) return "/mockups/veg/garlic.jpg"

  if (n.includes("ginger") || n.includes("inji") || n.includes("adrak")) return "/mockups/veg_ginger.png"

  if (n.includes("sweet potato") || n.includes("sakkaraivalli") || n.includes("chakkara") || n.includes("shakarkand")) return "/mockups/veg/sweet_potato.jpg"
  if (n.includes("potato") || n.includes("urulaikilangu") || n.includes("urulaikizhangu") || n.includes("aloo")) return "/mockups/veg/potato.jpg"

  if (n.includes("red bell pepper") || n.includes("sigappu")) return "/mockups/veg/red_bell_pepper.jpg"
  if (n.includes("yellow bell pepper") || n.includes("manjal kuda")) return "/mockups/veg/yellow_bell_pepper.jpg"
  if (n.includes("capsicum") || n.includes("kuda milagai") || n.includes("kudai milagaai") || n.includes("shimla")) return "/mockups/veg_capsicum_green.png"
  if (n.includes("chilli") || n.includes("milagai") || n.includes("milagaai") || n.includes("mirch")) return "/mockups/veg/green_chilli.jpg"

  if (n.includes("curry") || n.includes("karuveppilai") || n.includes("karuvepillai") || n.includes("kadi patta")) return "/mockups/veg_curry_leaves.png"
  if (n.includes("coriander") || n.includes("kothamalli") || n.includes("dhaniya")) return "/mockups/veg_coriander.png"
  if (n.includes("lady finger") || n.includes("vendakkai") || n.includes("vendaikkai") || n.includes("bhindi") || n.includes("okra")) return "/mockups/veg_bhindi.png"
  if (n.includes("lemon") || n.includes("elumichai") || n.includes("nimbu")) return "/mockups/veg_lemon.png"

  if (n.includes("spinach") || n.includes("palak") || n.includes("keerai") || n.includes("amaranthus")) return "/mockups/veg/spinach.jpg"
  if (n.includes("carrot")) return "/mockups/veg/carrot.jpg"
  if (n.includes("cucumber") || n.includes("vellarikkai") || n.includes("vellarikai") || n.includes("kheera")) return "/mockups/veg/cucumber.jpg"
  if (n.includes("mushroom") || n.includes("kaalan")) return "/mockups/veg_mushroom.png"
  if (n.includes("brinjal") || n.includes("kathirikai") || n.includes("kathirikkai") || n.includes("baingan")) return "/mockups/veg_brinjal.png"
  if (n.includes("cauliflower") || n.includes("pookosu")) return "/mockups/veg/cauliflower.jpg"
  if (n.includes("cabbage") || n.includes("muttaikose")) return "/mockups/veg/cabbage.jpg"
  if (n.includes("baby corn")) return "/mockups/veg/baby_corn.jpg"
  if (n.includes("corn") || n.includes("cholam") || n.includes("solam")) return "/mockups/veg/corn.jpg"
  if (n.includes("broad beans") || n.includes("avarakkai") || n.includes("sem fali")) return "/mockups/veg_broad_beans.png"
  if (n.includes("cluster beans") || n.includes("kothavarangai") || n.includes("guar")) return "/mockups/veg_cluster_beans.png"
  if (n.includes("french beans") || n.includes("beans")) return "/mockups/veg_french_beans.png"
  if (n.includes("bitter gourd") || n.includes("pavakkai") || n.includes("karela")) return "/mockups/veg_bitter_gourd.png"
  if (n.includes("bottle gourd") || n.includes("surakkai") || n.includes("lauki")) return "/mockups/veg_lauki.png"
  if (n.includes("snake gourd") || n.includes("pudalangai")) return "/mockups/veg_snake_gourd.png"
  if (n.includes("ridge gourd") || n.includes("peerangai") || n.includes("peerkangai")) return "/mockups/veg/ridge_gourd.jpg"
  if (n.includes("beetroot")) return "/mockups/veg/beetroot.jpg"
  if (n.includes("radish") || n.includes("mullangi")) return "/mockups/veg/radish.jpg"
  if (n.includes("mint") || n.includes("pudina")) return "/mockups/veg/mint.jpg"
  if (n.includes("drumstick leaves") || n.includes("moringa") || n.includes("murungai keerai")) return "/mockups/veg_moringa_leaves.png"
  if (n.includes("drumstick") || n.includes("murungakkai")) return "/mockups/veg_drumstick.png"
  if (n.includes("fenugreek") || n.includes("methi") || n.includes("vendhaya keerai")) return "/mockups/veg_methi.png"
  if (n.includes("peas") || n.includes("pattani")) return "/mockups/veg/peas.jpg"
  if (n.includes("lettuce")) return "/mockups/veg/lettuce.jpg"
  if (n.includes("sprouts")) return "/mockups/veg/sprouts.jpg"
  if (n.includes("broccoli")) return "/mockups/veg/broccoli.jpg"
  if (n.includes("ash gourd") || n.includes("sambal pusanikkai") || n.includes("winter melon") || n.includes("petha")) return "/mockups/veg_ash_gourd.png"
  if (n.includes("pumpkin") || n.includes("parangikkai")) return "/mockups/veg/pumpkin.jpg"
  if (n.includes("chow chow") || n.includes("chayote")) return "/mockups/veg_chow_chow.png"
  if (n.includes("ivy gourd") || n.includes("kovakkai") || n.includes("tindora") || n.includes("dondakaya")) return "/mockups/veg_ivy_gourd.png"
  if (n.includes("colocasia") || n.includes("seppankizhangu") || n.includes("arvi")) return "/mockups/veg/arvi.jpg"
  if (n.includes("turmeric") || n.includes("manjal")) return "/mockups/veg/turmeric.jpg"
  if (n.includes("amla") || n.includes("nellikai") || n.includes("nellikaai")) return "/mockups/veg/amla.jpg"
  if (n.includes("zucchini")) return "/mockups/veg/zucchini.jpg"
  if (n.includes("papaya") || n.includes("pappalikkai")) return "/mockups/veg/raw_papaya.jpg"
  if (n.includes("banana") || n.includes("vazhai") || n.includes("vazhakkai") || n.includes("thandu")) return "/mockups/veg_lauki.png"
  if (n.includes("rosemary") || n.includes("basil") || n.includes("neem") || n.includes("veppilai")) return "/mockups/veg/rosemary.png"

  return "/mockups/vegetables_realistic.png"
}

/**
 * RecipeDetails
 * Detailed Recipe Modal View showing:
 * - Recipe Hero & Metadata (prep time, cook time, difficulty, calories, servings)
 * - Nutrition Facts breakdown (Protein, Carbs, Fat, Fiber)
 * - Informational Health Benefits & Practical Health Tips
 * - Numbered Cooking Instructions
 * - Separated Ingredients: Calservices Catalog Vegetables vs Non-purchasable Pantry Items
 * - 'Complete Your Recipe' 1-click cart addition for missing catalog vegetables
 * - Smart 'Goes Well With' vegetable recommendations below
 */
export function RecipeDetails({
  recipe,
  foodCart = {},
  onAddAvailableVegetables,
  onUpdateCartQty,
  recommendations = [],
  fallbackPhoto = "/mockups/vegetables_realistic.png",
}) {
  const [addedSuccess, setAddedSuccess] = useState(false)

  if (!recipe) return null

  // Separate ingredients into Calservices catalog vegetables vs pantry seasonings
  const allIngredients = recipe.ingredients || []
  const catalogVegetables = allIngredients.filter(
    (ing) => ing.is_catalog_vegetable || Boolean(ing.package) || Boolean(ing.package_name)
  )
  const pantryIngredients = allIngredients.filter(
    (ing) => !ing.is_catalog_vegetable && !ing.package && !ing.package_name
  )

  // Identify which catalog vegetables are already in cart vs missing
  const missingVegetables = catalogVegetables.filter((ing) => {
    const name = ing.package_name || ing.name
    return !(foodCart[name] > 0)
  })

  const alreadyInCartVegetables = catalogVegetables.filter((ing) => {
    const name = ing.package_name || ing.name
    return foodCart[name] > 0
  })

  const handleAddMissing = () => {
    if (onAddAvailableVegetables) {
      onAddAvailableVegetables(missingVegetables)
      setAddedSuccess(true)
      setTimeout(() => setAddedSuccess(false), 3000)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      {/* ── Top Split: Recipe Info & Metadata (Left) + Compact Recipe Image (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Header Title & Badges & Quick Metadata Strip */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{recipe.package_name || "Farm Produce Recipe"}</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  • Homestyle Dish
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {recipe.name}
              </h2>

              {recipe.short_description && (
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                  {recipe.short_description}
                </p>
              )}
            </div>

            {/* Quick Metadata Strip */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prep</div>
                <div className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">
                  {recipe.prep_time_minutes || 10}m
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cook</div>
                <div className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">
                  {recipe.cook_time_minutes || 15}m
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Servings</div>
                <div className="text-xs sm:text-sm font-black text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{recipe.servings || 2}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Compact Recipe Image Showcase */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="w-full h-full min-h-[200px] aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-md relative group">
            <img
              src={recipe.image || fallbackPhoto}
              alt={recipe.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = fallbackPhoto
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                Fresh Cooked Dish
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step-by-Step Cooking Instructions (Full Width) ── */}
      {recipe.instructions && recipe.instructions.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
          <h4 className="text-sm sm:text-base font-black text-slate-900 mb-4 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-emerald-600" />
            <span>Step-by-Step Cooking Instructions</span>
          </h4>
          <div className="space-y-3.5">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {typeof step === "string" ? step.replace(/^\d+\.\s*/, "") : step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Nutritional Value (Per Serving) ── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3.5 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Nutritional Value (Per Serving)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Calories</div>
            <div className="text-sm font-black text-slate-800 mt-0.5">{recipe.calories || 120} kcal</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Protein</div>
            <div className="text-sm font-black text-emerald-700 mt-0.5">{recipe.protein || "3g"}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Carbs</div>
            <div className="text-sm font-black text-blue-700 mt-0.5">{recipe.carbohydrates || "15g"}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Dietary Fiber</div>
            <div className="text-sm font-black text-teal-700 mt-0.5">{recipe.fiber || "4g"}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Fat</div>
            <div className="text-sm font-black text-slate-700 mt-0.5">{recipe.fat || "2g"}</div>
          </div>
        </div>
      </div>

      {/* ── Health Benefits & Freshness Tips ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nutritional Benefits */}
        {recipe.health_benefits && recipe.health_benefits.length > 0 && (
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 mb-3 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-emerald-600" />
              <span>Nutritional Benefits</span>
            </h4>
            <ul className="space-y-2.5">
              {recipe.health_benefits.map((point, i) => (
                <li key={i} className="text-xs sm:text-sm text-emerald-950 font-medium flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Freshness & Cooking Tips */}
        {recipe.health_tips && recipe.health_tips.length > 0 && (
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Freshness &amp; Cooking Tips</span>
            </h4>
            <ul className="space-y-2.5">
              {recipe.health_tips.map((tip, i) => (
                <li key={i} className="text-xs sm:text-sm text-amber-950 font-medium flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Complete Your Recipe (Ingredients Required) ── */}
      {catalogVegetables.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border-2 border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xs">
          {/* Section Title */}
          <div className="flex items-center gap-2 mb-3.5">
            <span className="p-1 rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShoppingCart className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-sm sm:text-base font-black text-emerald-950">
              Complete Your Recipe (Ingredients Required)
            </h3>
          </div>

          {/* Vegetables Grid matching Store Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {catalogVegetables.map((ing, idx) => {
              const name = ing.package_name || ing.name
              const cartCount = foodCart[name] || 0
              const price = ing.package_price ? Math.round(Number(ing.package_price)) : 30
              const mrp = ing.package_offer_price ? Math.round(Number(ing.package_offer_price)) : (price > 20 ? price + 8 : null)
              const unit = ing.package_unit || (ing.quantity && ing.unit ? `${ing.quantity} ${ing.unit}` : "500 g")
              const image = getVegetableProducePhoto(name) || ing.package_image || fallbackPhoto

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md flex flex-col justify-between transition-all duration-150 overflow-hidden text-left"
                >
                  <div>
                    {/* Produce Photographic Image */}
                    <div className="relative w-full aspect-square bg-[#f5f1eb] overflow-hidden">
                      <img
                        src={image}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = fallbackPhoto
                        }}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9.5px] font-black text-slate-700 shadow-2xs">
                        <Clock className="w-2.5 h-2.5 text-emerald-600" />
                        <span>8 MINS</span>
                      </div>
                    </div>

                    {/* Product Name & Weight */}
                    <div className="p-3 pb-1">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug min-h-[34px]" title={name}>
                        {name}
                      </h5>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        {unit}
                      </p>
                    </div>
                  </div>

                  {/* Price & Quantity Add/Decrement Controls */}
                  <div className="p-3 pt-0 flex items-center justify-between gap-1.5 mt-auto">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-black text-slate-900">
                          ₹{price}
                        </span>
                      </div>
                      {mrp && mrp > price && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ₹{mrp}
                        </span>
                      )}
                    </div>

                    {cartCount > 0 ? (
                      <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty && onUpdateCartQty(name, -1)}
                          className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1.5 active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="text-xs font-extrabold min-w-[16px] text-center px-0.5">
                          {cartCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty && onUpdateCartQty(name, 1)}
                          className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1.5 active:scale-90"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUpdateCartQty && onUpdateCartQty(name, 1)}
                        className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-black text-[11px] transition-all cursor-pointer active:scale-95 bg-white shadow-xs"
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
