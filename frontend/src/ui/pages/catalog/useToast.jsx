import { useCallback, useState } from "react"

// Tiny local toast — no shared toast system exists outside individual
// Settings sections (which receive one via props), so the 6 Service Catalog
// pages share this instead of duplicating the same banner markup six times.
export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 3200)
  }, [])

  return [toast, showToast]
}

export function ToastBanner({ toast }) {
  if (!toast) return null
  const tone = toast.type === "error"
    ? "bg-rose-600 text-white"
    : "bg-emerald-600 text-white"
  return (
    <div className={`fixed top-5 right-5 z-[10050] px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${tone}`}>
      {toast.message}
    </div>
  )
}
