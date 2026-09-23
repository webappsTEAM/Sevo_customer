import { useState, useEffect, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Home, SlidersHorizontal, ShoppingCart, User } from "lucide-react"
import { useAuth } from "../../../state/auth/useAuth.js"
import { routes } from "../../routes.js"

export function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const pathname = location.pathname.toLowerCase()

  // ── Route Gating ─────────────────────────────────────────────────────────────
  // Per §4.3 of the Handover Bible:
  // Hide on staff/admin routes and full-screen map tracking.
  const isExcluded = useMemo(() => {
    const adminPrefixes = [
      "/platform",
      "/customers",
      "/settings",
      "/catalog",
      "/inventory",
      "/admin",
      "/marketing",
      "/organization-signup",
      "/accept-invite",
      "/track",
      "/live-tracking",
    ]
    return adminPrefixes.some((prefix) => pathname.startsWith(prefix))
  }, [pathname])

  // ── Live Cart Badge Synchronization ──────────────────────────────────────────
  const [cartCount, setCartCount] = useState(() => {
    try {
      const saved = localStorage.getItem("calservices_customer_cart")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
        }
      }
    } catch { }
    return 0
  })

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const saved = localStorage.getItem("calservices_customer_cart")
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setCartCount(parsed.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0))
            return
          }
        }
      } catch { }
      setCartCount(0)
    }

    window.addEventListener("storage", updateCartCount)
    window.addEventListener("calservices_cart_updated", updateCartCount)
    // Check periodically for in-tab state changes that don't trigger storage event
    const interval = setInterval(updateCartCount, 1500)

    return () => {
      window.removeEventListener("storage", updateCartCount)
      window.removeEventListener("calservices_cart_updated", updateCartCount)
      clearInterval(interval)
    }
  }, [])

  if (isExcluded) return null

  // ── Active Tab Detection ─────────────────────────────────────────────────────
  const isHome = pathname === "/" || pathname === "/home"
  const isServices = pathname.startsWith("/booking/services") || pathname === "/booking" || pathname.startsWith("/trucks") || pathname.startsWith("/two-wheelers") || pathname.startsWith("/packers-and-movers")
  const isCart = pathname.startsWith("/booking/checkout")
  const isAccount = pathname === "/login" || pathname === "/profile"

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleHomeClick = () => {
    if (isHome) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      navigate(routes.landing || "/home")
    }
  }

  const handleServicesClick = () => {
    if (isHome) {
      // Trigger homepage services modal via custom event or navigate
      window.dispatchEvent(new CustomEvent("calservices_open_services_modal"))
    } else {
      navigate(routes.booking_services || "/booking/services")
    }
  }

  const handleCartClick = () => {
    // If on a page with cart drawer (like LandingPage), trigger drawer
    window.dispatchEvent(new CustomEvent("calservices_open_cart_drawer"))
    // Also navigate to checkout if there are items and not already on checkout
    if (!isHome && !isCart) {
      navigate(routes.booking_checkout || "/booking/checkout")
    }
  }

  const handleAccountClick = () => {
    if (user) {
      if (isHome) {
        window.dispatchEvent(new CustomEvent("calservices_open_account_portal"))
      } else {
        navigate("/home?openAccount=1")
      }
    } else {
      if (isHome) {
        window.dispatchEvent(new CustomEvent("calservices_open_login_modal"))
      } else {
        navigate("/home?openLogin=1")
      }
    }
  }

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sevo-surface-glass)] backdrop-blur-lg border-t border-[var(--sevo-border)] shadow-[var(--sevo-shadow-lg)] px-3 pt-1.5 transition-colors duration-200"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))",
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Home Tab */}
        <button
          type="button"
          onClick={handleHomeClick}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            isHome
              ? "text-[var(--sevo-primary)] font-black"
              : "text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)]"
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? "stroke-[2.5]" : "stroke-[2]"}`} />
          <span>Home</span>
        </button>

        {/* 2. Services Tab */}
        <button
          type="button"
          onClick={handleServicesClick}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            isServices
              ? "text-[var(--sevo-primary)] font-black"
              : "text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)]"
          }`}
        >
          <SlidersHorizontal className={`w-5 h-5 ${isServices ? "stroke-[2.5]" : "stroke-[2]"}`} />
          <span>Services</span>
        </button>

        {/* 3. Cart Tab */}
        <button
          type="button"
          onClick={handleCartClick}
          className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            isCart
              ? "text-[var(--sevo-primary)] font-black"
              : "text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)]"
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 ${isCart ? "stroke-[2.5]" : "stroke-[2]"}`} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[var(--sevo-primary)] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-200">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </button>

        {/* 4. Account / Login Tab */}
        <button
          type="button"
          onClick={handleAccountClick}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
            isAccount
              ? "text-[var(--sevo-primary)] font-black"
              : "text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)]"
          }`}
        >
          <User className={`w-5 h-5 ${isAccount ? "stroke-[2.5]" : "stroke-[2]"}`} />
          <span>{user ? "Account" : "Login"}</span>
        </button>
      </div>
    </nav>
  )
}
