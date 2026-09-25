import { useContext } from "react"

import { MultiServiceCartContext } from "./MultiServiceCartContext.js"

export function useMultiServiceCart() {
  const ctx = useContext(MultiServiceCartContext)
  if (!ctx) {
    // Mirrors useEditMode's defensive fallback -- a page rendered outside
    // the provider (or during a hot-reload edge case) gets a harmless no-op
    // bag instead of a hard crash.
    return {
      groups: [],
      addGroup: () => {},
      removeGroup: () => {},
      clearBag: () => {},
      bagItemCount: 0,
      hasBag: false,
    }
  }
  return ctx
}
