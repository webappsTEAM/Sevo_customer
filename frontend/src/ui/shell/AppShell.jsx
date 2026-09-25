import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"


import { useAuth } from "../../state/auth/useAuth.js"
import { routes } from "../routes.js"
import { ThemeToggle } from "./ThemeToggle.jsx"
import ThemeSwitch from "@/components/ui/theme-switch"
import { CommandPalette } from "./CommandPalette.jsx"
import { NotificationCenter } from "./NotificationCenter.jsx"
import { CalTrackLogo } from "../components/CalTrackLogo.jsx"
import { apiRequest, unwrapResults } from "../../api/client.js"
import { NotificationService } from "../../utils/notifications.js"
import { useWebSocket } from "../../hooks/useWebSocket.js"
import { useDispatch } from "react-redux"
import { addSosAlert, addGeofenceBreach } from "../../store/liveLocationSlice.js"
import { fetchTrialStatus, fetchTrialNotifications } from "../../store/trialSlice.js"
import { TrialBanner } from "../components/TrialBanner.jsx"
import { TrialExpiredModal } from "../components/TrialExpiredModal.jsx"
import { isSuperAdmin, hasModule } from "../../auth/authorization.js"

import {
  Home, Clock, CheckSquare, CalendarDays, Banknote, CalendarRange,
  Users, BarChart3, MapPin, Settings, Search, LogOut, Headset,
  ChevronLeft, ChevronRight, Rocket, ShieldAlert, Globe, Package, Award,
  FolderOpen, GraduationCap, Bell, FileText, CheckCircle, XCircle, Car, X,
  Wrench, MessageSquare, UserCheck, Activity, ArrowUpRight, Repeat2, User,
  Shield, Palette, CreditCard, Building2, ShieldCheck, Ticket, Gift, Truck, Sprout, Layers,
  Smartphone, Megaphone, LayoutGrid
} from "lucide-react"

const SUPER_ADMIN_NAV_ITEMS = [
  {
    label: "Platform Command",
    to: "/platform/dashboard",
    icon: <ShieldCheck size={20} />,
    color: "#6366F1",
    children: [
      { label: "Dashboard", to: "/platform/dashboard", icon: <Home size={16} />, color: "#6366F1" },
      { label: "Staff & Access", to: "/platform/users", icon: <Users size={16} />, color: "#4F46E5" },
      { label: "RBAC Matrix", to: "/platform/rbac", icon: <Shield size={16} />, color: "#8B5CF6" },
      { label: "Customer 360", to: "/platform/customers", icon: <UserCheck size={16} />, color: "#0EA5E9" },
      { label: "Security & MFA", to: "/platform/security", icon: <ShieldAlert size={16} />, color: "#10B981" },
      { label: "Platform Audit", to: "/platform/audit", icon: <Activity size={16} />, color: "#F59E0B" },
    ]
  },
]

const ADMIN_NAV_ITEMS = [
  { label: "Get Started", to: routes.get_started, icon: <Rocket size={20} />, color: "#0EA5E9" },
  {
    label: "Dashboard",
    to: routes.dashboard,
    icon: <Home size={20} />,
    color: "#10B981",
  },
  {
    label: "Customers & Bookings",
    to: "/customers/dashboard",
    icon: <MessageSquare size={20} />,
    color: "#6366F1",
    children: [
      { label: "Dashboard", to: "/customers/dashboard", icon: <BarChart3 size={16} />, color: "#6366F1" },
      { label: "Customers", to: "/customers/list", icon: <Users size={16} />, color: "#4F46E5" },
      { label: "Bookings", to: "/customers/bookings", icon: <CalendarDays size={16} />, color: "#38BDF8" },
      { label: "Reschedule Requests", to: "/customers/reschedules", icon: <Repeat2 size={16} />, color: "#F59E0B" },
      { label: "Refund Requests", to: "/customers/refunds", icon: <Banknote size={16} />, color: "#10B981" },
      { label: "Payments", to: "/customers/payments", icon: <Banknote size={16} />, color: "#10B981" },
      { label: "Merge Queue", to: "/customers/merges", icon: <UserCheck size={16} />, color: "#8B5CF6" },
      { label: "Complaints", to: "/customers/complaints", icon: <ShieldAlert size={16} />, color: "#EF4444" },
      { label: "Customer Reviews", to: "/customers/reviews", icon: <Award size={16} />, color: "#F59E0B" },
    ]
  },
  {
    label: "Service Catalog",
    to: routes.catalog_dashboard,
    icon: <Package size={20} />,
    color: "#3B82F6",
    children: [
      { label: "Dashboard", to: routes.catalog_dashboard, icon: <Home size={16} />, color: "#3B82F6" },
      { label: "Categories", to: routes.catalog_categories, icon: <FolderOpen size={16} />, color: "#3B82F6" },
      { label: "Services", to: routes.catalog_services, icon: <Wrench size={16} />, color: "#3B82F6" },
      { label: "Packages", to: routes.catalog_packages, icon: <Package size={16} />, color: "#3B82F6" },
      { label: "Add-ons", to: routes.catalog_addons, icon: <CheckSquare size={16} />, color: "#3B82F6" },
      { label: "Change Log", to: routes.catalog_change_log, icon: <FileText size={16} />, color: "#3B82F6" },
      { label: "Vendor Approvals", to: routes.catalog_vendor_approvals, icon: <UserCheck size={16} />, color: "#3B82F6" },
      { label: "Painting Rate Card", to: routes.catalog_painting_rates, icon: <Palette size={16} />, color: "#3B82F6" },
      { label: "Goods & Transport Rates", to: routes.catalog_gt_pricing, icon: <Truck size={16} />, color: "#3B82F6", module: "pricing" },
    ]
  },
  {
    label: "Marketing",
    to: routes.marketing_coupons,
    icon: <Ticket size={20} />,
    color: "#8B5CF6",
    children: [
      { label: "Coupons", to: routes.marketing_coupons, icon: <Ticket size={16} />, color: "#8B5CF6" },
      { label: "Offers", to: routes.marketing_offers, icon: <Gift size={16} />, color: "#F59E0B" },
      { label: "Referrals", to: routes.marketing_referrals, icon: <Users size={16} />, color: "#10B981" },
    ]
  },
  {
    label: "Home Page Builder",
    to: routes.homepage_customizer,
    icon: <Globe size={20} />,
    color: "#F59E0B",
    children: [
      { label: "Hero Banner", to: `${routes.homepage_customizer}?tab=hero`, icon: <Globe size={16} />, color: "#F59E0B" },
      { label: "Browse Categories", to: `${routes.homepage_customizer}?tab=categories`, icon: <FolderOpen size={16} />, color: "#3B82F6" },
      { label: "Vendor Hire Banner", to: `${routes.homepage_customizer}?tab=vendorBanner`, icon: <Users size={16} />, color: "#0D9488" },
      { label: "Promotional Offers", to: `${routes.homepage_customizer}?tab=offers`, icon: <Gift size={16} />, color: "#EC4899" },
      { label: "Why Choose Us", to: `${routes.homepage_customizer}?tab=trust`, icon: <ShieldCheck size={16} />, color: "#10B981" },
      { label: "How It Works", to: `${routes.homepage_customizer}?tab=workflow`, icon: <Repeat2 size={16} />, color: "#8B5CF6" },
      { label: "Live Stats Bar", to: `${routes.homepage_customizer}?tab=stats`, icon: <BarChart3 size={16} />, color: "#0EA5E9" },
      { label: "Featured Pros", to: `${routes.homepage_customizer}?tab=experts`, icon: <Users size={16} />, color: "#D946EF" },
      { label: "Testimonials", to: `${routes.homepage_customizer}?tab=testimonials`, icon: <Award size={16} />, color: "#F59E0B" },
      { label: "Footer & Contacts", to: `${routes.homepage_customizer}?tab=footer`, icon: <FileText size={16} />, color: "#64748B" },
    ]
  },
  // Added 2026-09-17 per explicit request ("add a side section 'Mobile'
  // ... give the access to upload the banners, advertisement, top cards
  // [Groceries, Services] images"). Deliberately its own top-level nav
  // group rather than nested under "Home Page Builder" above, since these
  // three uploads are specifically for the mobile app (mobile-*
  // sections/storage folders — see settings_hub/views_homepage.py) and
  // never shown on the website.
  {
    label: "Mobile App",
    to: `${routes.homepage_customizer}?tab=mobileBanners`,
    icon: <Smartphone size={20} />,
    color: "#0EA5E9",
    children: [
      { label: "App Banners", to: `${routes.homepage_customizer}?tab=mobileBanners`, icon: <Globe size={16} />, color: "#0EA5E9" },
      { label: "Advertisement", to: `${routes.homepage_customizer}?tab=mobileAds`, icon: <Megaphone size={16} />, color: "#F97316" },
      { label: "Top Cards (Groceries/Services)", to: `${routes.homepage_customizer}?tab=mobileTopCards`, icon: <LayoutGrid size={16} />, color: "#10B981" },
    ]
  },
  {
    label: "Vegetable Inventory",
    to: routes.inventory_vegetables,
    icon: <Sprout size={20} />,
    color: "#10B981",
    children: [
      { label: "Home", to: routes.vegetable_admin_home, icon: <Home size={16} />, color: "#10B981" },
      { label: "Orders", to: routes.vegetable_admin_orders, icon: <Package size={16} />, color: "#3B82F6" },
      { label: "Returns", to: routes.vegetable_admin_returns, icon: <Repeat2 size={16} />, color: "#F59E0B" },
      { label: "Claims", to: routes.vegetable_admin_claims, icon: <ShieldAlert size={16} />, color: "#EF4444" },
      { label: "Inventory", to: routes.inventory_vegetables, icon: <Layers size={16} />, color: "#10B981" },
      { label: "Catalog Uploads", to: routes.vegetable_admin_catalog_uploads, icon: <FolderOpen size={16} />, color: "#8B5CF6" },
      { label: "Categories Approval", to: routes.vegetable_admin_categories_approval, icon: <ShieldCheck size={16} />, color: "#F59E0B" },
      { label: "Categories", to: routes.vegetable_admin_categories, icon: <FolderOpen size={16} />, color: "#06B6D4" },
      { label: "Coupons", to: routes.marketing_coupons, icon: <Ticket size={16} />, color: "#EC4899" },
    ]
  },
  { label: "Reports & Analytics", to: routes.reports, icon: <BarChart3 size={20} />, color: "#10B981" },
  { label: "Customer Care", to: "/support/tickets", icon: <Headset size={20} />, color: "#0EA5E9" },
  {
    label: "Settings",
    to: "/settings",
    icon: <Settings size={20} />,
    color: "#64748B",
    children: [
      { label: "Stock Catalog", to: routes.inventory, icon: <Package size={16} />, color: "#8B5CF6" },
      { label: "My Profile", to: "/settings?section=profile", icon: <User size={16} />, color: "#3B82F6" },
      { label: "Security", to: "/settings?section=security", icon: <Shield size={16} />, color: "#10B981" },
      { label: "Appearance", to: "/settings?section=appearance", icon: <Palette size={16} />, color: "#8B5CF6" },
    ]
  },
]

const THEME_STORAGE_KEY = "quicktims.theme"

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  window.dispatchEvent(new CustomEvent("quicktims:theme", { detail: theme }))
}

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === "dark" || stored === "light") return stored
  const ds = document.documentElement.dataset.theme
  if (ds === "dark" || ds === "light") return ds
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function initials(username) {
  const s = String(username || "").trim()
  if (!s) return "U"
  const parts = s.split(/\s+/).filter(Boolean)
  const first = (parts[0] || "").slice(0, 1)
  const second = (parts.length > 1 ? parts[1] : parts[0] || "").slice(1, 2)
  return (first + second).toUpperCase()
}

function displayName(username) {
  const s = String(username || "").trim()
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function hasModuleAccess(user, item) {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (!item.module) return true
  return hasModule(user, item.module)
}

function playCriticalAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
    osc.type = "square"
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.warn("Audio alert failed", e)
  }
}

function playStatusBeep(isOnline) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(isOnline ? 660 : 440, ctx.currentTime)
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch (e) {
    console.warn("Status beep failed", e)
  }
}

function matchesRoute(currentPathname, routeTo) {
  if (!routeTo || !currentPathname) return false
  const basePath = routeTo.split("?")[0].split("#")[0]
  if (basePath === "/") {
    return currentPathname === "/"
  }
  return currentPathname === basePath || currentPathname.startsWith(basePath + "/")
}

function isItemActive(item, currentPathname) {
  if (!item) return false
  if (item.to === "/customers/dashboard" && (currentPathname === "/customers" || currentPathname.startsWith("/customers/"))) {
    return true
  }
  if (matchesRoute(currentPathname, item.to)) return true
  if (item.children && Array.isArray(item.children)) {
    return item.children.some(child => matchesRoute(currentPathname, child.to))
  }
  return false
}

function isChildActive(child, location, siblingRoutes = []) {
  const currentFullUrl = location.pathname + location.search
  if (child.to.includes("?")) {
    return currentFullUrl === child.to || currentFullUrl.startsWith(child.to + "&")
  }
  
  if (location.pathname === child.to) return true

  const isSiblingMoreSpecific = siblingRoutes.some(sib => {
    if (sib === child.to) return false
    const sibBase = sib.split("?")[0].split("#")[0]
    const childBase = child.to.split("?")[0].split("#")[0]
    return matchesRoute(location.pathname, sibBase) &&
      sibBase.startsWith(childBase) &&
      sibBase.length > childBase.length
  })

  if (isSiblingMoreSpecific) return false

  return matchesRoute(location.pathname, child.to)
}

function SidebarTooltip({ tooltip }) {
  if (!tooltip) return null
  return (
    <div
      className="fixed z-[999999] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl border border-white/10 dark:border-black/10 pointer-events-none transition-all animate-in fade-in zoom-in duration-200"
      style={{ top: tooltip.y, left: tooltip.x + 12, transform: "translateY(-50%)" }}
    >
      {tooltip.label}
    </div>
  )
}

function SubmenuFlyout({ flyout, onMouseEnter, onMouseLeave, user, onClose }) {
  if (!flyout) return null
  const isBottom = flyout.bottom !== null
  const isAdmin = user?.role === "admin" || user?.role === "manager"
  return (
    <div
      className="fixed z-[999998] bg-transparent pl-5 pointer-events-auto"
      style={{
        top: isBottom ? "auto" : flyout.y,
        bottom: isBottom ? flyout.bottom : "auto",
        left: flyout.x - 12
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2 rounded-2xl min-w-[220px] shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 backdrop-blur-xl animate-in slide-in-from-left-2 duration-200">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1">
          {flyout.label}
        </div>
        {flyout.children
          .filter(child => (!child.adminOnly || isAdmin) && hasModuleAccess(user, child))
          .map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${isActive ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
              onClick={onClose}
            >
              <span className="mr-3 opacity-70">{child.icon}</span>
              {child.label}
            </NavLink>
          ))}
      </div>
    </div>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [offline, setOffline] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [profileOpen])
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [localTime, setLocalTime] = useState(new Date())
  const [orgName, setOrgName] = useState(() => localStorage.getItem("quicktims.orgName") || "")
  const [settingsExpanded, setSettingsExpanded] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [flyout, setFlyout] = useState(null)
  const [drillDownParent, setDrillDownParent] = useState(null)
  const flyoutTimerRef = useRef(null)

  const isAdmin = user?.role === "admin" || user?.role === "manager"

  const isSuper = isSuperAdmin(user)

  const items = useMemo(() => {
    if (!user) return []
    const isAdminUser = user.role === "admin" || user.role === "manager" || isSuper
    
    if (isSuper) {
      return [
        ...SUPER_ADMIN_NAV_ITEMS,
        ...ADMIN_NAV_ITEMS.filter((item) => item.label !== "Get Started")
      ]
    }

    if (user.isCareAgent && !isAdminUser) {
      return [
        {
          label: "Customers & Bookings",
          to: "/customers/dashboard",
          icon: <MessageSquare size={20} />,
          color: "#6366F1",
          children: [
            { label: "Dashboard", to: "/customers/dashboard", icon: <BarChart3 size={16} />, color: "#6366F1" },
            { label: "Customers", to: "/customers/list", icon: <Users size={16} />, color: "#4F46E5" },
            { label: "Complaints", to: "/customers/complaints", icon: <ShieldAlert size={16} />, color: "#EF4444" },
            { label: "Payments", to: "/customers/payments", icon: <Banknote size={16} />, color: "#10B981" },
          ]
        },
        { label: "Customer Care", to: "/support/tickets", icon: <Headset size={20} />, color: "#0EA5E9" },
      ]
    }

    return ADMIN_NAV_ITEMS.filter(item => hasModuleAccess(user, item))
  }, [user, isSuper])

  useEffect(() => {
    localStorage.setItem("caltrack.sidebarCollapsed", sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    if (user) {
      dispatch(fetchTrialStatus())
      dispatch(fetchTrialNotifications())
    }
  }, [user, dispatch])

  useEffect(() => {
    if (drillDownParent && isItemActive(drillDownParent, location.pathname)) {
      return
    }

    const parent = items.find(item => {
      if (!item.children) return false
      return isItemActive(item, location.pathname)
    })
    if (parent) {
      setDrillDownParent(parent)
    } else {
      setDrillDownParent(null)
    }
  }, [location.pathname, items, drillDownParent])

  const showTooltip = (label, e) => {
    if (!sidebarCollapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ label, x: rect.right, y: rect.top + rect.height / 2 })
  }
  const hideTooltip = () => setTooltip(null)

  const showFlyout = (item, e) => {
    if (!sidebarCollapsed || !item.children) return
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const isBottomHalf = rect.top > window.innerHeight / 2

    setFlyout({
      label: item.label,
      children: item.children,
      x: rect.right,
      y: isBottomHalf ? null : rect.top,
      bottom: isBottomHalf ? window.innerHeight - rect.bottom : null,
    })
  }

  const hideFlyout = () => {
    flyoutTimerRef.current = setTimeout(() => {
      setFlyout(null)
    }, 800)
  }

  const cancelHideFlyout = () => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current)
  }

  useEffect(() => {
    // Use native browser events instead of polling — fires instantly on network change,
    // zero CPU overhead when network is stable
    const handleOnline  = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener("online",  handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online",  handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setLocalTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleSessionExpired() {
      logout()
      navigate("/login", { replace: true })
    }
    window.addEventListener("quicktims:session-expired", handleSessionExpired)
    return () => window.removeEventListener("quicktims:session-expired", handleSessionExpired)
  }, [logout, navigate])

  useEffect(() => {
    function syncOrg() {
      const name = localStorage.getItem("quicktims.orgName") || ""
      setOrgName(name)
    }
    window.addEventListener("storage", syncOrg)
    window.addEventListener("quicktims:orgName", syncOrg)
    return () => {
      window.removeEventListener("storage", syncOrg)
      window.removeEventListener("quicktims:orgName", syncOrg)
    }
  }, [])

  useEffect(() => {
    if (location.pathname.startsWith("/settings")) {
      setSettingsExpanded(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!user) return
    NotificationService.requestPermission()
  }, [user])

  useEffect(() => {
    setWorkspaceMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!workspaceMenuOpen) return
    function onKeyDown(e) { if (e.key === "Escape") setWorkspaceMenuOpen(false) }
    function onPointerDown(e) {
      if (!e.target.closest(".workspaceMenuWrap")) setWorkspaceMenuOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [workspaceMenuOpen])





  if (!user) return null

  const email = user.email

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[var(--sevo-bg)] text-[var(--sevo-text-primary)] font-body">
      <TrialExpiredModal />
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />

      {/* ── Topbar ───────────────────────────── */}
      <header className="flex items-center justify-between h-[var(--header-height)] px-8 bg-[var(--sevo-surface)]/90 backdrop-blur-xl border-b border-[var(--sevo-border)] z-50 shrink-0 shadow-xs">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3.5">
            <CalTrackLogo size="sm" className="hover:scale-105 transition-transform" />
            <div className="h-6 w-px bg-[var(--sevo-border)] hidden sm:block" />
            <div className="flex flex-col">
              <span className="font-bold text-[var(--sevo-text-primary)] text-xs tracking-tight truncate max-w-[200px]" title={orgName && orgName !== "Sevo" ? orgName : "Operations Hub"}>
                {orgName && orgName !== "Sevo" ? orgName : "Operations Hub"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold text-[var(--sevo-primary)] uppercase tracking-wider leading-none">Admin Portal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-center justify-center px-4 py-1.5 bg-[var(--sevo-surface-raised)] border border-[var(--sevo-border)] rounded-2xl select-none shadow-xs min-w-[125px] hover:border-[var(--sevo-primary)]/30 transition-colors duration-300">
            <span className="text-xs font-extrabold font-mono tracking-tight text-[var(--sevo-text-primary)] tabular-nums leading-none">
              {localTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </span>
            <span className="text-[8px] font-black tracking-widest text-[var(--sevo-text-muted)] uppercase leading-none mt-1.5 opacity-85">
              Local Time
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <ThemeSwitch />
          </div>

          <div className="h-8 w-px bg-[var(--sevo-border)]"></div>

          <div className="relative profileMenuWrap" ref={profileMenuRef}>
            <button
              className="flex items-center gap-3 p-1 rounded-2xl hover:bg-[var(--sevo-surface-raised)] transition-all duration-300 group"
              type="button"
              onClick={() => setProfileOpen(v => !v)}
            >
              <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--sevo-primary)] text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url.includes("demo.localhost") ? `${window.location.origin}${user.avatar_url.substring(user.avatar_url.indexOf('/media/'))}` : user.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  initials(user.username)
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[var(--sevo-surface)] rounded-full shadow-xs"></div>
              </div>
              {!sidebarCollapsed && (
                <div className="hidden lg:flex flex-col text-left mr-2">
                  <span className="text-sm font-bold leading-none">{displayName(user.username)}</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-md"
                    style={
                      user?.role === "manager"
                        ? { color: "#0ea5e9", background: "#e0f2fe" }
                        : user?.role === "support" || user?.isCareAgent
                        ? { color: "#10b981", background: "#d1fae5" }
                        : user?.role === "customer"
                        ? { color: "#f59e0b", background: "#fef3c7" }
                        : { color: "#4f46e5", background: "#ede9fe" }
                    }
                  >
                    {user?.role === "admin"
                      ? "Administrator"
                      : user?.role === "manager"
                      ? "Manager"
                      : user?.role === "support" || user?.isCareAgent
                      ? "Support"
                      : user?.role === "customer"
                      ? "Customer"
                      : user?.role || "Staff"}
                  </span>
                </div>
              )}
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-[99998]" onClick={() => setProfileOpen(false)} />
                <div className="absolute top-full right-0 mt-3 w-80 bg-[var(--sevo-surface)] rounded-2xl shadow-2xl border border-[var(--sevo-border)] z-[99999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-6 bg-[var(--sevo-surface-raised)]/80 backdrop-blur-xl border-b border-[var(--sevo-border)]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--sevo-primary)] text-white text-xl font-bold shadow-md">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          initials(user.username)
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--sevo-text-primary)] text-lg">{displayName(user.username)}</div>
                        <div className="text-xs text-[var(--sevo-text-secondary)] truncate max-w-[180px] font-medium">{email}</div>
                        <span
                          className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={
                            user?.role === "manager"
                              ? { color: "#0ea5e9", background: "#e0f2fe", border: "1px solid #bae6fd" }
                              : user?.role === "support" || user?.isCareAgent
                              ? { color: "#10b981", background: "#d1fae5", border: "1px solid #a7f3d0" }
                              : user?.role === "customer"
                              ? { color: "#f59e0b", background: "#fef3c7", border: "1px solid #fde68a" }
                              : { color: "#4f46e5", background: "#ede9fe", border: "1px solid #c4b5fd" }
                          }
                        >
                          {user?.role === "admin"
                            ? "Administrator"
                            : user?.role === "manager"
                            ? "Manager"
                            : user?.role === "support" || user?.isCareAgent
                            ? "Support"
                            : user?.role === "customer"
                            ? "Customer"
                            : user?.title || user?.role || "Staff"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <button
                      type="button"
                      className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-300 group cursor-pointer"
                      onClick={async () => {
                        setProfileOpen(false);
                        await logout();
                        navigate("/login", { replace: true });
                      }}
                    >
                      <LogOut size={18} className="mr-3 group-hover:-translate-x-1 transition-transform" /> Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Main Primary Sidebar ─────────────────────────────── */}
        <aside
          className="flex flex-col bg-[var(--sevo-surface)] border-r border-[var(--sevo-border)] z-50 w-[100px] shrink-0"
        >
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col items-center gap-4 scrollbar-hide">
            {items.map((item) => {
              const active = isItemActive(item, location.pathname) || drillDownParent?.label === item.label;
              const color = item.color || "#0B8F7A";
              const hasChildren = !!item.children;

              return (
                <div key={item.label} className="relative group">
                  <button
                    onClick={() => {
                      if (hasChildren) setDrillDownParent(item);
                      navigate(item.to);
                    }}
                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all duration-300 relative gap-1.5 cursor-pointer ${active ? 'shadow-xs bg-[var(--sevo-surface-raised)] border border-[var(--sevo-border)]' : 'text-[var(--sevo-text-secondary)] hover:bg-[var(--sevo-surface-raised)]/60'}`}
                    style={{
                      color: active ? color : undefined
                    }}
                  >
                    <motion.span
                      animate={active ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className={`transition-all duration-300 ${active ? '' : 'group-hover:scale-110'}`}
                    >
                      {item.icon}
                    </motion.span>
                    <span
                      className={`text-[9px] font-black text-center px-1 leading-tight uppercase tracking-tighter transition-all ${active ? 'text-[var(--sevo-text-primary)] opacity-100 font-extrabold' : 'text-[var(--sevo-text-secondary)] group-hover:text-[var(--sevo-text-primary)] group-hover:opacity-100'}`}
                    >
                      {item.label}
                    </span>

                    {/* Active accent bar */}
                    {active && (
                      <div
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Secondary Sub-Sidebar Panel ─────────────────────────────── */}
        <AnimatePresence mode="wait">
          {drillDownParent && (
            <motion.aside
              initial={{ x: -260, opacity: 0, width: 0 }}
              animate={{ x: 0, opacity: 1, width: 260 }}
              exit={{ x: -260, opacity: 0, width: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col bg-[var(--sevo-surface-raised)]/95 backdrop-blur-xl border-r border-[var(--sevo-border)] z-40 overflow-hidden shrink-0"
            >
              <div className="p-4 flex flex-col gap-1 h-full">
                <div className="mb-4 px-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sevo-text-primary)] mb-1">
                    {drillDownParent.label === "Employees" ? "Employee Management" : drillDownParent.label}
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-1">
                  {drillDownParent.children
                    .filter(child => (!child.adminOnly || isAdmin) && hasModuleAccess(user, child))
                    .map((child) => {
                      const childSiblings = drillDownParent.children.map(c => c.to)
                      const active = isChildActive(child, location, childSiblings)
                      const color = child.color || drillDownParent.color || "#0B8F7A";
                      return (
                        <NavLink
                          key={child.label}
                          to={child.to}
                          className={`flex flex-row items-center justify-start w-full px-4 py-3 rounded-xl transition-all duration-200 relative group gap-3.5 cursor-pointer ${active ? 'bg-[var(--sevo-surface)] shadow-xs border border-[var(--sevo-border)]' : 'text-[var(--sevo-text-secondary)] hover:bg-[var(--sevo-surface)]/60'}`}
                        >
                          <span className={`shrink-0 transition-all duration-200 ${active ? 'scale-110' : 'opacity-60 group-hover:opacity-100 group-hover:scale-105'}`} style={{ color }}>
                            {child.icon}
                          </span>
                          <span className={`text-xs font-bold text-left tracking-tight transition-colors ${active ? 'text-[var(--sevo-text-primary)]' : 'text-[var(--sevo-text-secondary)] group-hover:text-[var(--sevo-text-primary)]'}`}>
                            {child.label}
                          </span>
                          {active && (
                            <motion.div
                              layoutId="active-indicator-sub"
                              className="absolute right-2 w-1.5 h-4 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          )}
                        </NavLink>
                      );
                    })}
                </div>

                <button
                  onClick={() => setDrillDownParent(null)}
                  className="mt-auto w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)] transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} /> Close
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[var(--sevo-bg)] relative scroll-smooth">
          <div className="relative z-10 w-full min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      <SubmenuFlyout
        flyout={flyout}
        onMouseEnter={cancelHideFlyout}
        onMouseLeave={hideFlyout}
        user={user}
        onClose={() => setFlyout(null)}
      />
    </div>
  )
}
