import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Home, Package, BarChart3, Settings, CalendarDays, Ticket, Globe, Headset, FolderOpen, CreditCard } from "lucide-react"
import { routes } from "../routes.js"
import { motion, AnimatePresence } from "framer-motion"

const ACTIONS = [
  { id: "dashboard", label: "Dashboard", shortcut: ["G", "D"], icon: <Home size={18} />, to: routes.dashboard, color: "text-emerald-500" },
  { id: "bookings", label: "Customer Bookings", shortcut: ["G", "B"], icon: <CalendarDays size={18} />, to: routes.admin_service_requests, color: "text-blue-500" },
  { id: "catalog", label: "Service Catalog", shortcut: ["G", "C"], icon: <FolderOpen size={18} />, to: routes.catalog_dashboard, color: "text-indigo-500" },
  { id: "coupons", label: "Marketing Coupons", shortcut: ["G", "M"], icon: <Ticket size={18} />, to: routes.marketing_coupons, color: "text-purple-500" },
  { id: "homepage", label: "Home Page Customizer", shortcut: ["G", "H"], icon: <Globe size={18} />, to: routes.homepage_customizer, color: "text-amber-500" },
  { id: "inventory", label: "Warehouse Inventory", shortcut: ["G", "I"], icon: <Package size={18} />, to: routes.inventory, color: "text-teal-500" },
  { id: "reports", label: "Business Analytics & Reports", shortcut: ["G", "R"], icon: <BarChart3 size={18} />, to: routes.reports, color: "text-yellow-500" },
  { id: "support", label: "Customer Care", shortcut: ["G", "S"], icon: <Headset size={18} />, to: "/support/tickets", color: "text-sky-500" },
  { id: "billing", label: "Billing & Invoices", shortcut: ["G", "B"], icon: <CreditCard size={18} />, to: routes.settings_billing, color: "text-rose-500" },
  { id: "settings", label: "Settings", shortcut: ["G", ","], icon: <Settings size={18} />, to: routes.settings, color: "text-slate-500" },
]

export function CommandPalette({ open, setOpen }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setOpen])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const filtered = ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleExecute = (a) => {
    if (!a) return
    navigate(a.to)
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % filtered.length)
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
    }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault()
      handleExecute(filtered[selectedIndex])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Area */}
            <div className="relative flex items-center px-8 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800">
              <Search size={22} className="text-slate-400 dark:text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search actions, pages, or settings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none py-7 px-5 text-lg font-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 tracking-tight"
              />
            </div>

            {/* Results List */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  No matching actions found.
                </div>
              ) : (
                filtered.map((action, idx) => (
                  <button
                    key={action.id}
                    onClick={() => handleExecute(action)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                      idx === selectedIndex
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={action.color}>{action.icon}</span>
                      <span className="font-semibold text-sm">{action.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {action.shortcut.map((key) => (
                        <kbd
                          key={key}
                          className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
