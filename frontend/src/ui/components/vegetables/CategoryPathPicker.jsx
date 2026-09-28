import React, { useState, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FolderOpen,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sprout,
  Check,
  Search,
  CornerDownRight,
  Layers,
} from "lucide-react"

/**
 * CategoryPathPicker
 *
 * A Meesho-style cascading multi-column category selector.
 * - Horizontal dynamic columns for each hierarchy level (Level 1 → Level 2 → Level N)
 * - Dynamic column generation based on live category hierarchy
 * - Live breadcrumb path trail with selection confirmation status
 * - Strict leaf gating when requireLeaf={true}
 * - Support for "None (Top-Level)" selection when allowNone={true}
 */
export default function CategoryPathPicker({
  categories = [],
  value = "",
  onChange,
  requireLeaf = true,
  allowNone = false,
  noneLabel = "None (Top-Level Category)",
  label = "Select Category",
  helperText,
  error,
}) {
  // Array of selected category objects representing the active drill-down path:
  // [col0Cat, col1Cat, col2Cat, ...]
  const [selectedPath, setSelectedPath] = useState([])
  const [columnSearch, setColumnSearch] = useState({})
  const scrollContainerRef = useRef(null)

  // Quick lookup maps
  const categoriesById = useMemo(() => {
    const map = new Map()
    categories.forEach((cat) => {
      map.set(String(cat.id), cat)
    })
    return map
  }, [categories])

  // Get direct children of any parent category (or root if parentId is null)
  const getChildren = (parentId) => {
    return categories.filter((c) => {
      const pId = typeof c.parent === "object" ? c.parent?.id : c.parent
      if (parentId === null || parentId === undefined || parentId === "") {
        return !pId
      }
      return String(pId) === String(parentId)
    })
  }

  // Check if a category has no children
  const isLeaf = (cat) => {
    if (!cat) return false
    const children = getChildren(cat.id)
    return children.length === 0 && cat.is_leaf !== false
  }

  // Reconstruct path when controlled `value` changes or initial mount
  useEffect(() => {
    if (value === "none" || value === null || value === "") {
      if (allowNone && value === "none") {
        setSelectedPath([{ id: "none", name: noneLabel, isNone: true }])
      } else if (!value) {
        // If value cleared
        if (selectedPath.length > 0 && selectedPath[0]?.id === "none") {
          setSelectedPath([])
        }
      }
      return
    }

    const currentCat = categoriesById.get(String(value))
    if (!currentCat) return

    // Build ancestor chain from currentCat up to root
    const path = []
    let curr = currentCat
    const visited = new Set()

    while (curr && !visited.has(String(curr.id))) {
      visited.add(String(curr.id))
      path.unshift(curr)
      const pId = typeof curr.parent === "object" ? curr.parent?.id : curr.parent
      if (!pId) break
      curr = categoriesById.get(String(pId))
    }

    setSelectedPath(path)
  }, [value, categoriesById, allowNone, noneLabel])

  // Auto-scroll to right when new column is added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: "smooth",
      })
    }
  }, [selectedPath.length])

  // Compute all visible columns
  // Column 0: Root categories
  // Column 1: Children of selectedPath[0]
  // Column k: Children of selectedPath[k-1]
  const columns = useMemo(() => {
    const cols = []

    // Column 0: Roots
    const rootCats = getChildren(null)
    cols.push({
      depth: 0,
      parent: null,
      items: rootCats,
      selectedItem: selectedPath[0] || null,
    })

    // If "None" was picked in allowNone mode, no child columns
    if (selectedPath[0]?.id === "none") {
      return cols
    }

    // Subsequent columns based on selectedPath
    for (let i = 0; i < selectedPath.length; i++) {
      const selectedInCol = selectedPath[i]
      if (!selectedInCol || selectedInCol.id === "none") break

      const children = getChildren(selectedInCol.id)
      if (children.length > 0) {
        cols.push({
          depth: i + 1,
          parent: selectedInCol,
          items: children,
          selectedItem: selectedPath[i + 1] || null,
        })
      }
    }

    return cols
  }, [categories, selectedPath])

  // Handle clicking an item in a column at depth `colIndex`
  const handleItemClick = (colIndex, item) => {
    if (item.isNone) {
      setSelectedPath([item])
      if (onChange) {
        onChange("", null, [item])
      }
      return
    }

    // New path up to this depth
    const newPath = [...selectedPath.slice(0, colIndex), item]
    setSelectedPath(newPath)

    const itemChildren = getChildren(item.id)
    const itemIsLeaf = itemChildren.length === 0 && item.is_leaf !== false

    if (requireLeaf) {
      if (itemIsLeaf) {
        // Confirmed leaf selection
        if (onChange) {
          onChange(item.id, item, newPath)
        }
      } else {
        // Clicked a branch; drill down, but selection value is pending until leaf
        if (onChange) {
          onChange("", null, newPath)
        }
      }
    } else {
      // In non-leaf mode (e.g. parent picker), selecting any category is valid
      if (onChange) {
        onChange(item.id, item, newPath)
      }
    }
  }

  // Active confirmed leaf category (if any)
  const currentSelection = useMemo(() => {
    if (selectedPath.length === 0) return null
    const lastItem = selectedPath[selectedPath.length - 1]
    if (lastItem?.isNone) {
      return { isNone: true, name: noneLabel }
    }
    if (requireLeaf) {
      return isLeaf(lastItem) ? lastItem : null
    }
    return lastItem
  }, [selectedPath, requireLeaf, noneLabel, categories])

  const isConfirmed = Boolean(currentSelection)

  return (
    <div className="space-y-3">
      {/* Label and Live Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {label && (
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 block">
              <FolderOpen size={14} className="text-primary" />
              <span>{label}</span>
            </label>
          )}
          {helperText && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{helperText}</p>
          )}
        </div>

        {/* Status Pill */}
        {selectedPath.length > 0 && (
          <div>
            {currentSelection?.isNone ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 inline-flex items-center gap-1">
                <Check size={12} /> Top-Level Department Selected
              </span>
            ) : isConfirmed ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 shadow-2xs">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Confirmed Leaf: <strong>{currentSelection.name}</strong></span>
              </span>
            ) : requireLeaf ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                <Layers size={12} className="text-amber-600 dark:text-amber-400" />
                <span>Select a subcategory in the next column</span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Live Breadcrumb Trail */}
      <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
          <CornerDownRight size={12} className="text-primary" />
          <span>Path:</span>
        </span>

        {selectedPath.length === 0 ? (
          <span className="text-muted-foreground italic text-xs">
            No category selected. Choose a top-level category below to begin drill-down.
          </span>
        ) : (
          selectedPath.map((item, idx) => {
            const isLast = idx === selectedPath.length - 1
            const isLeafNode = !item.isNone && isLeaf(item)

            return (
              <React.Fragment key={item.id || idx}>
                {idx > 0 && <ChevronRight size={13} className="text-muted-foreground shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    const nextPath = selectedPath.slice(0, idx + 1)
                    setSelectedPath(nextPath)
                    if (!requireLeaf || isLeafNode) {
                      if (onChange) onChange(item.id === "none" ? "" : item.id, item, nextPath)
                    } else {
                      if (onChange) onChange("", null, nextPath)
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLast && isConfirmed
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : isLast
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-background hover:bg-muted text-foreground border border-border"
                  }`}
                >
                  {isLeafNode ? <Sprout size={12} /> : <FolderOpen size={12} />}
                  <span>{item.name}</span>
                </button>
              </React.Fragment>
            )
          })
        )}
      </div>

      {/* Horizontal Cascading Multi-Column Selector */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {columns.map((col, colIndex) => {
          const searchTerm = (columnSearch[colIndex] || "").toLowerCase()
          const filteredItems = col.items.filter((item) =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.slug || "").toLowerCase().includes(searchTerm)
          )

          return (
            <motion.div
              key={colIndex}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="w-56 sm:w-64 shrink-0 rounded-2xl bg-card border border-border flex flex-col shadow-xs overflow-hidden"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Column Header */}
              <div className="p-2.5 bg-muted/50 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-black inline-flex items-center justify-center">
                      {colIndex + 1}
                    </span>
                    <span>
                      {colIndex === 0
                        ? "Department / Top-Level"
                        : `Subcategory (L${colIndex + 1})`}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {filteredItems.length}
                  </span>
                </div>

                {/* Column Search Box */}
                {col.items.length > 5 && (
                  <div className="relative">
                    <Search size={12} className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={columnSearch[colIndex] || ""}
                      onChange={(e) =>
                        setColumnSearch({ ...columnSearch, [colIndex]: e.target.value })
                      }
                      placeholder={`Filter L${colIndex + 1}...`}
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Column Category List */}
              <div className="p-1.5 flex-1 max-h-60 overflow-y-auto space-y-1 divide-y-0">
                {/* None Option for Root selection in parent picker mode */}
                {colIndex === 0 && allowNone && (
                  <button
                    type="button"
                    onClick={() =>
                      handleItemClick(0, {
                        id: "none",
                        name: noneLabel,
                        isNone: true,
                      })
                    }
                    className={`w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      selectedPath[0]?.id === "none"
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="italic">{noneLabel}</span>
                    {selectedPath[0]?.id === "none" && <Check size={14} />}
                  </button>
                )}

                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    No matching categories
                  </div>
                ) : (
                  filteredItems.map((cat) => {
                    const isSelected = selectedPath[colIndex]?.id === cat.id
                    const catHasChildren = getChildren(cat.id).length > 0
                    const catIsLeaf = !catHasChildren && cat.is_leaf !== false

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleItemClick(colIndex, cat)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? catIsLeaf && requireLeaf
                              ? "bg-emerald-600 text-white font-bold shadow-2xs"
                              : "bg-primary text-primary-foreground font-bold shadow-2xs"
                            : "hover:bg-muted/70 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {catIsLeaf ? (
                            <Sprout
                              size={14}
                              className={
                                isSelected
                                  ? "text-white"
                                  : "text-emerald-500 shrink-0"
                              }
                            />
                          ) : (
                            <FolderOpen
                              size={14}
                              className={
                                isSelected ? "text-white" : "text-primary shrink-0"
                              }
                            />
                          )}
                          <span className="truncate">{cat.name}</span>
                        </div>

                        {/* Right indicator: Chevron for subcategories, Check or Leaf tag for leaf */}
                        <div className="shrink-0 flex items-center gap-1">
                          {catHasChildren ? (
                            <div className="flex items-center gap-0.5 text-[10px] opacity-80">
                              <span>{getChildren(cat.id).length}</span>
                              <ChevronRight size={13} />
                            </div>
                          ) : (
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              Leaf
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-xs font-bold text-rose-500 flex items-center gap-1.5 mt-1">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
