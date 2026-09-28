import { useState, useCallback, useMemo } from "react"

import { MultiServiceCartContext } from "./MultiServiceCartContext.js"

const STORAGE_KEY = "sevo_multi_service_bag"

/**
 * Wraps the whole app (see main.jsx / App.jsx, same pattern as
 * EditModeProvider) so a customer can add services from DIFFERENT
 * categories into ONE booking: BookingPage.jsx's own `cart` state stays
 * exactly as it is today (still per-category, still what actually renders
 * the cart drawer for the category currently open) -- this context is only
 * a small "bag" the customer can stash a finished category's cart into
 * before navigating to add another one.
 *
 * If the bag is empty at checkout time (the normal case -- a customer who
 * only ever adds one category), BookingPage.jsx's submit code takes the
 * EXACT SAME single-`service_category` path it always has. The bag only
 * changes anything once it holds 1+ saved groups, at which point submit
 * combines them with whatever's in the currently-open cart and posts to
 * `/api/booking/multi/` instead of `/api/booking/` -- see
 * BookingPage.jsx's confirmBooking().
 *
 * Persisted in sessionStorage (survives navigating between category pages
 * within the same tab/session) the same way BookingPage.jsx already
 * persists its own single-category cart to storage.
 */
export function MultiServiceCartProvider({ children }) {
  const [groups, setGroups] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const persist = useCallback((next) => {
    setGroups(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* private browsing / storage disabled -- bag still works for this
         render, it just won't survive navigation */
    }
  }, [])

  // Stash the currently-open category's cart into the bag, so the customer
  // can navigate to a different category and add more without losing what
  // they already picked. `categoryId`/`categoryName` mirror the fields
  // BookingPage.jsx's submit already sends per item (`category?.id`,
  // `category?.name`).
  const addGroup = useCallback((categoryId, categoryName, items) => {
    if (!categoryId || !Array.isArray(items) || items.length === 0) return
    persist([
      ...groups.filter((g) => g.categoryId !== categoryId),
      { categoryId, categoryName, items },
    ])
  }, [groups, persist])

  const removeGroup = useCallback((categoryId) => {
    persist(groups.filter((g) => g.categoryId !== categoryId))
  }, [groups, persist])

  const clearBag = useCallback(() => {
    persist([])
  }, [persist])

  const bagItemCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g.items?.length || 0), 0),
    [groups]
  )

  const value = useMemo(() => ({
    groups,
    addGroup,
    removeGroup,
    clearBag,
    bagItemCount,
    hasBag: groups.length > 0,
  }), [groups, addGroup, removeGroup, clearBag, bagItemCount])

  return <MultiServiceCartContext.Provider value={value}>{children}</MultiServiceCartContext.Provider>
}
