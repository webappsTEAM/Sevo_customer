import React, { useEffect, useState } from "react"
import {
  Plus, Edit2, Trash2, Search, ChefHat, Sparkles,
  Flame, Clock, Check, X, Users, ArrowRight, Eye
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Card, Button, Input, TextArea, Select, Modal, Pill } from "../../components/kit.jsx"
import { Table } from "../../components/Table.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const EMPTY_RECIPE = {
  name: "",
  slug: "",
  package: "",
  image: "",
  short_description: "",
  prep_time_minutes: 10,
  cook_time_minutes: 15,
  total_time_minutes: 25,
  difficulty: "Easy",
  servings: 2,
  calories: 120,
  protein: "3g",
  carbohydrates: "15g",
  fat: "2g",
  fiber: "4g",
  health_benefits: [],
  health_tips: [],
  instructions: [],
  tags: ["Quick Recipes", "Easy Recipes"],
  is_active: true,
  is_popular: false,
  sort_order: 10,
  ingredients: []
}

export function AdminRecipesPage() {
  const [recipes, setRecipes] = useState([])
  const [vegetablePackages, setVegetablePackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, showToast] = useToast()

  // Load recipes and vegetable packages
  const load = async () => {
    setLoading(true)
    try {
      const [recRes, pkgRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/recipes/"),
        apiRequest("/catalog/services/?service_slug=vegetables&status=ACTIVE")
      ])
      if (recRes && recRes.success) setRecipes(recRes.data || [])
      if (pkgRes && pkgRes.success) setVegetablePackages(pkgRes.data || [])
    } catch (err) {
      if (err?.status !== 401) {
        showToast("Failed to load recipes data", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Manage ingredient list in edit modal
  const handleAddIngredient = (isCatalog = true) => {
    const newIng = {
      package: isCatalog && vegetablePackages.length > 0 ? vegetablePackages[0].id : null,
      name: isCatalog && vegetablePackages.length > 0 ? vegetablePackages[0].name : "",
      quantity: 1,
      unit: isCatalog ? "piece" : "tsp",
      notes: "",
      is_catalog_vegetable: isCatalog,
      sort_order: (editing.ingredients || []).length
    }
    setEditing(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), newIng]
    }))
  }

  const handleRemoveIngredient = (index) => {
    setEditing(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateIngredient = (index, field, val) => {
    setEditing(prev => {
      const updated = [...(prev.ingredients || [])]
      updated[index] = { ...updated[index], [field]: val }
      if (field === "package") {
        const pkg = vegetablePackages.find(p => String(p.id) === String(val))
        if (pkg) {
          updated[index].name = pkg.name
          updated[index].is_catalog_vegetable = true
        }
      }
      return { ...prev, ingredients: updated }
    })
  }

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...editing,
        package: Number(editing.package) || (vegetablePackages[0]?.id || 1),
        prep_time_minutes: Number(editing.prep_time_minutes) || 10,
        cook_time_minutes: Number(editing.cook_time_minutes) || 15,
        total_time_minutes: (Number(editing.prep_time_minutes) || 10) + (Number(editing.cook_time_minutes) || 15),
        servings: Number(editing.servings) || 2,
        calories: Number(editing.calories) || 120,
        health_benefits: Array.isArray(editing.health_benefits)
          ? editing.health_benefits
          : typeof editing.health_benefits === "string"
          ? editing.health_benefits.split("\n").filter(Boolean)
          : [],
        health_tips: Array.isArray(editing.health_tips)
          ? editing.health_tips
          : typeof editing.health_tips === "string"
          ? editing.health_tips.split("\n").filter(Boolean)
          : [],
        instructions: Array.isArray(editing.instructions)
          ? editing.instructions
          : typeof editing.instructions === "string"
          ? editing.instructions.split("\n").filter(Boolean)
          : [],
        tags: Array.isArray(editing.tags)
          ? editing.tags
          : typeof editing.tags === "string"
          ? editing.tags.split(",").map(t => t.trim()).filter(Boolean)
          : ["Quick Recipes", "Easy Recipes"],
      }

      let res
      if (editing.id) {
        res = await apiRequest(`/settings/catalog/v2/recipes/${editing.id}/`, { method: "PUT", json: payload })
      } else {
        res = await apiRequest("/settings/catalog/v2/recipes/", { method: "POST", json: payload })
      }

      if (res.success) {
        showToast(editing.id ? "Recipe updated successfully" : "Recipe created successfully")
        setEditing(null)
        load()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed. Please check form values.", "error")
    }
  }

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Delete recipe "${recipe.name}"? This action cannot be undone.`)) return
    try {
      const res = await apiRequest(`/settings/catalog/v2/recipes/${recipe.id}/`, { method: "DELETE" })
      if (res.success) {
        showToast("Recipe deleted")
        load()
      } else {
        showToast(res.message || "Delete failed", "error")
      }
    } catch {
      showToast("Delete failed", "error")
    }
  }

  const filteredRecipes = recipes.filter(r =>
    !searchQuery ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.package_name && r.package_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto space-y-6">
      <ToastBanner toast={toast} />

      <Card
        title="Vegetable Recipes (Smart Cooking & What Can I Make?)"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>
            <Button onClick={() => setEditing({ ...EMPTY_RECIPE, package: vegetablePackages[0]?.id || "" })}>
              <Plus size={14} className="mr-1" /> Add Recipe
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-500">Loading recipes…</div>
        ) : (
          <Table
            emptyMessage="No recipes found."
            columns={[
              {
                key: "recipe",
                label: "Recipe",
                render: r => (
                  <div className="flex items-center gap-3">
                    <img
                      src={r.image || "/mockups/vegetables_realistic.png"}
                      alt={r.name}
                      className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{r.name}</div>
                      <div className="text-[10.5px] text-slate-400 font-mono">{r.slug}</div>
                    </div>
                  </div>
                )
              },
              {
                key: "vegetable",
                label: "Primary Vegetable",
                render: r => (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {r.package_name || "Vegetable"}
                  </span>
                )
              },
              {
                key: "stats",
                label: "Time & Nutrition",
                render: r => (
                  <div className="text-xs text-slate-600">
                    <div>⏱ {r.total_time_minutes || 20} mins • {r.difficulty}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">🔥 {r.calories} kcal • {r.ingredients?.length || 0} ingredients</div>
                  </div>
                )
              },
              {
                key: "status",
                label: "Status",
                render: r => (
                  <div className="flex items-center gap-1.5">
                    <Pill tone={r.is_active ? "good" : "bad"}>{r.is_active ? "Active" : "Inactive"}</Pill>
                    {r.is_popular && <Pill tone="warn">Popular</Pill>}
                  </div>
                )
              }
            ]}
            rows={filteredRecipes}
            actions={recipe => (
              <>
                <Button variant="ghost" onClick={() => setEditing(recipe)}><Edit2 size={14} /></Button>
                <Button variant="ghost" onClick={() => handleDelete(recipe)}><Trash2 size={14} className="text-rose-500" /></Button>
              </>
            )}
          />
        )}
      </Card>

      {/* ── Add / Edit Recipe Modal ── */}
      {editing && (
        <Modal
          title={editing.id ? `Edit Recipe: ${editing.name}` : "Create Farm Vegetable Recipe"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Recipe Title *"
                value={editing.name || ""}
                onChange={e => {
                  const val = e.target.value
                  setEditing(prev => ({
                    ...prev,
                    name: val,
                    slug: prev.id ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                  }))
                }}
                required
              />
              <Input
                label="Slug *"
                value={editing.slug || ""}
                onChange={e => setEditing(prev => ({ ...prev, slug: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Vegetable (Calservices Catalog) *</label>
                <select
                  value={editing.package || ""}
                  onChange={e => setEditing(prev => ({ ...prev, package: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {vegetablePackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} (₹{Math.round(Number(pkg.price || pkg.base_price))})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Image URL"
                value={editing.image || ""}
                onChange={e => setEditing(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <TextArea
              label="Short Summary"
              rows={2}
              value={editing.short_description || ""}
              onChange={e => setEditing(prev => ({ ...prev, short_description: e.target.value }))}
              placeholder="Fresh homestyle salad prepared with diced cucumber, carrot and lemon juice."
            />

            {/* Timings & Servings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <Input
                label="Prep Mins"
                type="number"
                value={editing.prep_time_minutes || 10}
                onChange={e => setEditing(prev => ({ ...prev, prep_time_minutes: e.target.value }))}
              />
              <Input
                label="Cook Mins"
                type="number"
                value={editing.cook_time_minutes || 15}
                onChange={e => setEditing(prev => ({ ...prev, cook_time_minutes: e.target.value }))}
              />
              <Input
                label="Servings"
                type="number"
                value={editing.servings || 2}
                onChange={e => setEditing(prev => ({ ...prev, servings: e.target.value }))}
              />
              <Input
                label="Calories (kcal)"
                type="number"
                value={editing.calories || 120}
                onChange={e => setEditing(prev => ({ ...prev, calories: e.target.value }))}
              />
            </div>

            {/* Nutrition Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Protein"
                value={editing.protein || "3g"}
                onChange={e => setEditing(prev => ({ ...prev, protein: e.target.value }))}
              />
              <Input
                label="Carbohydrates"
                value={editing.carbohydrates || "15g"}
                onChange={e => setEditing(prev => ({ ...prev, carbohydrates: e.target.value }))}
              />
              <Input
                label="Dietary Fiber"
                value={editing.fiber || "4g"}
                onChange={e => setEditing(prev => ({ ...prev, fiber: e.target.value }))}
              />
              <Input
                label="Fat"
                value={editing.fat || "2g"}
                onChange={e => setEditing(prev => ({ ...prev, fat: e.target.value }))}
              />
            </div>

            {/* ── Ingredients Management (Separated into Catalog Veg vs Non-Catalog Pantry) ── */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Recipe Ingredients
                  </h4>
                  <p className="text-[10.5px] text-slate-500">
                    Catalog vegetables will be purchasable &amp; added to cart. Non-catalog ingredients are text-only instructions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddIngredient(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    + Catalog Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddIngredient(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    + Pantry Item
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {(editing.ingredients || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No ingredients added yet.</p>
                ) : (
                  editing.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        ing.is_catalog_vegetable || ing.package ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                      }`}>
                        {ing.is_catalog_vegetable || ing.package ? "VEG" : "PANTRY"}
                      </span>

                      {ing.is_catalog_vegetable || ing.package ? (
                        <select
                          value={ing.package || ""}
                          onChange={e => handleUpdateIngredient(idx, "package", e.target.value)}
                          className="flex-1 text-xs rounded-lg border border-slate-300 p-1.5 bg-white"
                        >
                          {vegetablePackages.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={ing.name || ""}
                          onChange={e => handleUpdateIngredient(idx, "name", e.target.value)}
                          placeholder="Pantry Item (e.g. Salt, Cumin, Oil)"
                          className="flex-1 text-xs rounded-lg border border-slate-300 p-1.5 bg-white"
                        />
                      )}

                      <input
                        type="number"
                        step="0.1"
                        value={ing.quantity || 1}
                        onChange={e => handleUpdateIngredient(idx, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="w-14 text-xs rounded-lg border border-slate-300 p-1.5 bg-white text-center"
                      />

                      <input
                        type="text"
                        value={ing.unit || "piece"}
                        onChange={e => handleUpdateIngredient(idx, "unit", e.target.value)}
                        placeholder="Unit"
                        className="w-16 text-xs rounded-lg border border-slate-300 p-1.5 bg-white"
                      />

                      <input
                        type="text"
                        value={ing.notes || ""}
                        onChange={e => handleUpdateIngredient(idx, "notes", e.target.value)}
                        placeholder="Notes (e.g. Diced)"
                        className="w-24 text-xs rounded-lg border border-slate-300 p-1.5 bg-white"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cooking Instructions (Lines) */}
            <TextArea
              label="Cooking Instructions (1 Step per line)"
              rows={4}
              value={Array.isArray(editing.instructions) ? editing.instructions.join("\n") : (editing.instructions || "")}
              onChange={e => setEditing(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="1. Wash the vegetables thoroughly.&#10;2. Dice cucumber and tomatoes.&#10;3. Toss with lemon juice and serve."
            />

            {/* Health Benefits (Lines) */}
            <TextArea
              label="Health Benefits (1 Point per line)"
              rows={3}
              value={Array.isArray(editing.health_benefits) ? editing.health_benefits.join("\n") : (editing.health_benefits || "")}
              onChange={e => setEditing(prev => ({ ...prev, health_benefits: e.target.value }))}
              placeholder="Rich in electrolytes and hydration.&#10;High in natural dietary fiber."
            />

            {/* Health Tips (Lines) */}
            <TextArea
              label="Cooking & Freshness Tips (1 Tip per line)"
              rows={3}
              value={Array.isArray(editing.health_tips) ? editing.health_tips.join("\n") : (editing.health_tips || "")}
              onChange={e => setEditing(prev => ({ ...prev, health_tips: e.target.value }))}
              placeholder="Wash thoroughly in cold running water.&#10;Keep cucumber skin intact for fiber."
            />

            {/* Active / Popular Toggles */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editing.is_active)}
                  onChange={e => setEditing(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Active &amp; Visible to Customers</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editing.is_popular)}
                  onChange={e => setEditing(prev => ({ ...prev, is_popular: e.target.checked }))}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Highlight as Popular Recipe</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">
                {editing.id ? "Save Changes" : "Create Recipe"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
