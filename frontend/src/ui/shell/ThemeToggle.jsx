import { useEffect, useMemo, useState } from "react"
import { Sun, Moon } from "lucide-react"

const STORAGE_KEY = "quicktims.theme"

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light") return stored
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
    document.body.style.backgroundColor = "#06122B"
  } else {
    document.documentElement.classList.remove("dark")
    document.body.style.backgroundColor = "#FFFDF8"
  }
  window.dispatchEvent(new CustomEvent("quicktims:theme", { detail: theme }))
}

export function ThemeToggle({ className = "" }) {
  const initial = useMemo(getInitialTheme, [])
  const [theme, setTheme] = useState(initial)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    function sync() {
      const t = document.documentElement.dataset.theme
      if (t === "dark" || t === "light") setTheme(t)
      else setTheme(getInitialTheme())
    }
    function onStorage(e) {
      if (e?.key === STORAGE_KEY) sync()
    }
    function onThemeEvent() {
      sync()
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener("quicktims:theme", onThemeEvent)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("quicktims:theme", onThemeEvent)
    }
  }, [])

  const isDark = theme === "dark"

  return (
    <button
      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--sevo-surface-raised)] border border-[var(--sevo-border)] text-[var(--sevo-text-primary)] hover:border-[var(--sevo-primary)] hover:text-[var(--sevo-primary)] active:scale-95 transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-[var(--sevo-focus)] ${className}`}
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={isDark ? "Switch to Concept 3 Light Mode" : "Switch to Concept 2 Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      type="button"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[#F4C95D] transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-[#0F5FBF] transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
    </button>
  )
}
