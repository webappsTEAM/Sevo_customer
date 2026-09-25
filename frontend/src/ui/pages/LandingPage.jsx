import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom"
import {
  Home, PaintRoller,
  SprayCan, Building2, AirVent, Hammer,
  ShieldCheck, BadgeCheck, Clock, Award, Headphones,
  Star, Search, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  Smartphone, Phone, Mail, X, ArrowRight,
  ClipboardList, CalendarDays, UserCheck, DoorOpen, Wallet, User, SlidersHorizontal, ShoppingCart,
  Sparkles, Apple, ShoppingBag, Carrot, HeartPulse, CheckCircle2, Plus, Minus, Check, Repeat2, AlertCircle,
  Users, Wrench, ThumbsUp, Bell, IndianRupee, Bug, Utensils, Pencil, LayoutGrid, Gift, Quote, Trash2,
  FileText, CreditCard, MoreHorizontal, Truck, Wind, Zap, Copy, RotateCcw, RefreshCw
} from "lucide-react"
import { routes } from "../routes.js"
import { HeroServiceVisualization } from "../components/HeroServiceVisualization.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx"
import { AllServicesDrawer } from "../components/AllServicesDrawer.jsx"
import { BkStyles, CustomerAccountModal, CartDrawerModal } from "./BookingPage.jsx"
import { ModernServiceCatalogView } from "../components/ModernServiceCatalogView.jsx"
import { estimationRepository } from "../../services/estimation/estimationRepository.js"
import { SelectServiceAddressDrawer } from "../components/AddressPicker/index.js"
import { VegCartDrawerModal } from "../components/VegCartDrawerModal.jsx"
import { VegetableRecipeModal } from "../components/vegetables/VegetableRecipeModal.jsx"
import { getVegetableTimingInfo } from "../../utils/vegetableSchedule.js"
import { resolveImageUrl } from "../../utils/imageUrl.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { usePendingIntent } from "../../hooks/usePendingIntent.js"
import { ThemeToggle } from "../shell/ThemeToggle.jsx"
import { apiUpdateCustomerLastLocation, apiFetchCustomerBookings } from "../../api/authService.js"
import { apiRequest } from "../../api/client.js"
import { fetchLogisticsCities } from "../../api/logisticsService.js"
import { getAddress } from "../../api/geocoding.js"
import { motion, AnimatePresence } from "framer-motion"
import {
  getCustomerLocation,
  setCustomerLocation,
  getCustomerSelectedAddress,
  setCustomerSelectedAddress,
  clearCustomerLocation,
  clearLegacyLocationStorage
} from "../../utils/customerLocationStorage.js"
import { getHomePageConfig, fetchPublishedHomePageConfig, resolveDisplayImageUrl, publishHomePageConfig, DEFAULT_HOME_PAGE_CONFIG, getCategorySafeImage, getOfferSafeImage, STORAGE_KEY, mergeWithDefaultConfig } from "../../config/homePageConfig.js"
import { isSuperAdmin } from "../../auth/authorization.js"
import { EditableImage, ImageEditModal } from "../components/SuperAdminEditControls.jsx"
import { useEditMode } from "../../state/editMode/useEditMode.js"


// Icon-name -> component lookup for the admin-editable Trust Guarantees
// row (homeConfig.trustBadges) -- covers every icon name used by either
// the shipped defaults or the "Why Choose Us" admin tab's presets.
const TRUST_BADGE_ICON_MAP = { ShieldCheck, FileText, CreditCard, Clock, Headphones, BadgeCheck, Award }
const TRUST_BADGE_COLORS = [
  "bg-emerald-50 text-[#0B8F7A] dark:bg-emerald-950/40",
  "bg-teal-50 text-teal-600 dark:bg-teal-950/40",
  "bg-sky-50 text-sky-600 dark:bg-sky-950/40",
  "bg-blue-50 text-blue-600 dark:bg-blue-950/40",
  "bg-emerald-50 text-[#0B8F7A] dark:bg-emerald-950/40"
]

// Helper to exclude quick-commerce grocery / produce from home service discovery
const isGroceryCatalogCategory = (cat) => {
  if (!cat) return false
  const slug = String(cat.slug || cat.serviceCategoryId || "").toLowerCase()
  const name = String(cat.name || cat.label || "").toLowerCase()
  const icon = String(cat.icon || "").toLowerCase()
  return (
    slug.includes("vegetable") ||
    slug.includes("grocery") ||
    slug.includes("groceries") ||
    slug.includes("fruit") ||
    slug.includes("produce") ||
    slug === "farm_fresh" ||
    name.includes("vegetable") ||
    name.includes("grocery") ||
    name.includes("groceries") ||
    name.includes("fruit") ||
    icon === "carrot"
  )
}

// Fallback icon resolver for dynamic categories
function resolveCategoryFallbackIcon(cat) {
  const s = `${cat?.slug || ""} ${cat?.name || ""} ${cat?.label || ""}`.toLowerCase()
  if (s.includes("transport") || s.includes("goods") || s.includes("truck") || s.includes("packer") || s.includes("mover") || s.includes("vehicle")) return Truck
  if (s.includes("ac") || s.includes("appliance") || s.includes("air") || s.includes("hvac") || s.includes("refrigerat") || s.includes("cool")) return AirVent
  if (s.includes("clean") || s.includes("pest") || s.includes("sofa") || s.includes("wash") || s.includes("sanitize")) return Sparkles
  if (s.includes("paint")) return PaintRoller
  if (s.includes("mason") || s.includes("civil") || s.includes("construct")) return Hammer
  if (s.includes("plumb") || s.includes("elec")) return Wrench
  return Wrench
}

// Social media SVG icons
function FacebookMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}
function InstagramMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function WhatsAppMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zM17.84 16.3c-.24.67-1.2 1.24-1.74 1.28-.48.04-1.1.06-3.56-.95-3.14-1.29-5.17-4.48-5.32-4.69-.16-.21-1.27-1.69-1.27-3.23 0-1.54.8-2.3 1.09-2.61.28-.31.62-.39.83-.39.21 0 .42 0 .6.01.19.01.44-.07.69.53.25.62.86 2.1.94 2.25.08.16.14.34.03.55-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.16.16-.33.33-.14.65.19.32.84 1.38 1.8 2.23 1.24 1.1 2.28 1.44 2.6 1.6.32.16.51.14.7-.08.19-.22.81-.94 1.02-1.27.21-.32.43-.27.72-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.14.08.79-.16 1.46z" />
    </svg>
  )
}
function YoutubeMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.5 6.5s-.22-1.56-.9-2.25c-.86-.9-1.82-.9-2.26-.96C16.2 3 12 3 12 3h-.01s-4.2 0-7.34.29c-.44.06-1.4.06-2.26.96C1.72 4.94 1.5 6.5 1.5 6.5S1.2 8.35 1.2 10.2v1.6c0 1.85.3 3.7.3 3.7s.22 1.56.89 2.25c.86.9 1.98.87 2.48.97C6.6 18.9 12 19 12 19s4.2-.01 7.34-.3c.44-.05 1.4-.05 2.26-.96.68-.69.9-2.25.9-2.25s.3-1.85.3-3.7v-1.6c0-1.85-.3-3.7-.3-3.7ZM9.75 13.9V8.5l5.25 2.71-5.25 2.7Z" />
    </svg>
  )
}
function TwitterMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 3H22l-7.2 8.23L23 21h-6.6l-5.17-6.42L5.3 21H2.2l7.7-8.8L2 3h6.75l4.67 5.86L18.9 3Zm-1.16 16.2h1.72L7.35 4.7H5.5l12.24 14.5Z" />
    </svg>
  )
}
function LinkedInMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  )
}

function VisaBadge() {
  return (
    <div className="h-7 px-2.5 bg-white rounded-md border border-slate-200 flex items-center justify-center shadow-2xs">
      <span className="text-[11px] font-black italic tracking-wider text-[#1A1F71]">VISA</span>
    </div>
  )
}

function MastercardBadge() {
  return (
    <div className="h-7 px-2 bg-white rounded-md border border-slate-200 flex items-center justify-center gap-0.5 shadow-2xs">
      <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-90 -mr-1" />
      <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] opacity-90" />
    </div>
  )
}

function UpiBadge() {
  return (
    <div className="h-7 px-2.5 bg-white rounded-md border border-slate-200 flex items-center justify-center shadow-2xs">
      <span className="text-[10px] font-black text-[#097939] flex items-center gap-0.5">
        <span className="text-[#ED7524]">UPI</span>
      </span>
    </div>
  )
}

function PaytmBadge() {
  return (
    <div className="h-7 px-2 bg-white rounded-md border border-slate-200 flex items-center justify-center shadow-2xs">
      <span className="text-[10px] font-black tracking-tight text-[#002E6E]">Pay<span className="text-[#00BAF2]">tm</span></span>
    </div>
  )
}

function GooglePlayBtn() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl border border-slate-800 transition-all shadow-sm cursor-pointer hover:scale-[1.02]">
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.609 1.814L13.793 12 3.61 22.186a2.37 2.37 0 0 1-.61-.83V2.643c.174-.325.385-.61.61-.829zm11.233 11.233l2.298 2.298-11.75 6.643 9.452-8.941zm0-2.094L5.39 2.012l11.75 6.643-2.298 2.298zm1.093 1.047l3.693 2.088c.848.48.848 1.258 0 1.737l-3.693 2.088-2.148-2.148 2.148-2.148z" />
      </svg>
      <div className="text-left">
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">Get it on</div>
        <div className="text-xs font-black leading-tight mt-0.5">Google Play</div>
      </div>
    </div>
  )
}

function AppStoreBtn() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl border border-slate-800 transition-all shadow-sm cursor-pointer hover:scale-[1.02]">
      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.09 1.74-.95 2.77.99.08 2.03-.52 2.68-1.27z" />
      </svg>
      <div className="text-left">
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">Download on the</div>
        <div className="text-xs font-black leading-tight mt-0.5">App Store</div>
      </div>
    </div>
  )
}


/* ── Custom High-Fidelity Transport Illustrations ── */
function TruckGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="58" cy="74" rx="44" ry="4.5" fill="#d1fae5" opacity="0.8" />
      {/* Yellow Cargo Container (clean closed solid box with 3D bevel) */}
      <rect x="18" y="24" width="48" height="38" rx="4" fill="#f59e0b" />
      <path d="M18 28C18 25.8 19.8 24 22 24H62C64.2 24 66 25.8 66 28V32H18V28Z" fill="#fbbf24" />
      {/* Cargo container vertical panel lines */}
      <line x1="34" y1="26" x2="34" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="50" y1="26" x2="50" y2="60" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Blue Driver Cabin */}
      <path d="M64 34H78C82 34 85 36.5 86.5 40.5L91 50C92 52.5 92 55 92 57.5V62H64V34Z" fill="#2563eb" />
      {/* Windshield */}
      <path d="M69 38H77C79 38 80.8 39.5 81.6 41.5L84.5 48.5H69V38Z" fill="#93c5fd" />
      <path d="M71 40L76 40L73.5 46L70 46Z" fill="#ffffff" opacity="0.7" />
      {/* Front Headlight */}
      <circle cx="89" cy="56" r="2.5" fill="#fef08a" />
      {/* Bumper */}
      <rect x="88" y="59" width="6" height="3.5" rx="1.5" fill="#64748b" />
      {/* Side door handle */}
      <rect x="70" y="52" width="4" height="1.5" rx="0.5" fill="#1e40af" />
      {/* Wheels */}
      <circle cx="32" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="32" cy="64" r="5" fill="#94a3b8" />
      <circle cx="32" cy="64" r="2" fill="#ffffff" />
      <circle cx="76" cy="64" r="9.5" fill="#1e293b" />
      <circle cx="76" cy="64" r="5" fill="#94a3b8" />
      <circle cx="76" cy="64" r="2" fill="#ffffff" />
    </svg>
  )
}

function TwoWheelerGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      {/* Yellow delivery box on rear rack */}
      <rect x="22" y="28" width="22" height="20" rx="3" fill="#f59e0b" />
      <rect x="20" y="26" width="26" height="5" rx="2" fill="#fbbf24" />
      <rect x="30" y="34" width="6" height="8" rx="1" fill="#d97706" />
      {/* Blue Scooter/Motorcycle Chassis */}
      <path d="M36 48L50 48L60 60H40L36 48Z" fill="#1d4ed8" />
      <path d="M46 40L54 40L58 52L48 52Z" fill="#2563eb" />
      {/* Seat */}
      <path d="M32 46C32 43 36 42 42 42C48 42 52 45 52 47L32 47Z" fill="#1e293b" />
      {/* Handlebars & Fork */}
      <path d="M58 38L66 62" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 32C56 32 60 34 64 34L68 34" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
      {/* Front Headlamp with yellow ring */}
      <circle cx="66" cy="40" r="7" fill="#3b82f6" />
      <circle cx="66" cy="40" r="5" fill="#fef08a" />
      <circle cx="66" cy="40" r="2.5" fill="#ffffff" opacity="0.9" />
      {/* Rear Wheel */}
      <circle cx="30" cy="66" r="13" fill="#1e293b" />
      <circle cx="30" cy="66" r="7" fill="#94a3b8" />
      <circle cx="30" cy="66" r="2.5" fill="#ffffff" />
      {/* Front Wheel */}
      <circle cx="66" cy="66" r="13" fill="#1e293b" />
      <circle cx="66" cy="66" r="7" fill="#94a3b8" />
      <circle cx="66" cy="66" r="2.5" fill="#ffffff" />
    </svg>
  )
}

function PackersMoversGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 110 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="55" cy="74" rx="46" ry="4.5" fill="#d1fae5" opacity="0.8" />
      {/* Standing Floor Lamp on Left */}
      <path d="M26 22L34 34H18L26 22Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="26" y1="34" x2="26" y2="70" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="26" cy="70" rx="6" ry="2" fill="#64748b" />
      {/* Light glow */}
      <path d="M20 34L12 56H34L28 34Z" fill="#fef08a" opacity="0.25" />
      {/* Cardboard Box / Nightstand */}
      <rect x="22" y="48" width="18" height="20" rx="2" fill="#d97706" />
      <path d="M22 48L26 44H40L38 48H22Z" fill="#f59e0b" />
      <rect x="28" y="48" width="5" height="20" fill="#b45309" opacity="0.6" />
      {/* Royal Blue Sofa on Right */}
      <rect x="40" y="34" width="54" height="26" rx="6" fill="#1e40af" />
      <rect x="38" y="50" width="58" height="18" rx="5" fill="#2563eb" />
      <rect x="36" y="44" width="11" height="24" rx="4" fill="#3b82f6" />
      <rect x="87" y="44" width="11" height="24" rx="4" fill="#1d4ed8" />
      {/* Sofa legs */}
      <line x1="42" y1="68" x2="40" y2="74" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="90" y1="68" x2="92" y2="74" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function ElectricianGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="25" y="20" width="50" height="52" rx="6" fill="#1e293b" />
      <rect x="28" y="23" width="44" height="46" rx="4" fill="#334155" />
      <rect x="33" y="28" width="10" height="18" rx="2" fill="#e2e8f0" />
      <rect x="36" y="30" width="4" height="8" rx="1" fill="#ef4444" />
      <rect x="45" y="28" width="10" height="18" rx="2" fill="#e2e8f0" />
      <rect x="48" y="34" width="4" height="8" rx="1" fill="#10b981" />
      <rect x="57" y="28" width="10" height="18" rx="2" fill="#e2e8f0" />
      <rect x="60" y="30" width="4" height="8" rx="1" fill="#ef4444" />
      <path d="M38 46V62C38 65 42 67 46 67H60" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 46V58C50 62 54 64 58 64H65" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      <path d="M62 46V54C62 58 65 60 70 60" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="72" cy="28" r="11" fill="#f59e0b" />
      <path d="M73 20L67 29H72L71 36L77 27H72L73 20Z" fill="#ffffff" />
    </svg>
  )
}

function FullHouseCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="houseRoof" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="houseWall" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="20" y="40" width="60" height="38" rx="6" fill="url(#houseWall)" />
      <path d="M14 40L50 12L86 40H14Z" fill="url(#houseRoof)" />
      <rect x="68" y="18" width="8" height="15" rx="1" fill="#d97706" />
      <path d="M66 18H78" stroke="#b45309" strokeWidth="1.5" />
      <rect x="42" y="52" width="16" height="26" rx="2" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="46" cy="65" r="1.75" fill="#f59e0b" />
      <rect x="28" y="48" width="10" height="10" rx="1.5" fill="#93c5fd" />
      <line x1="33" y1="48" x2="33" y2="58" stroke="#1d4ed8" strokeWidth="1" />
      <line x1="28" y1="53" x2="38" y2="53" stroke="#1d4ed8" strokeWidth="1" />
      <rect x="62" y="48" width="10" height="10" rx="1.5" fill="#93c5fd" />
      <line x1="67" y1="48" x2="67" y2="58" stroke="#1d4ed8" strokeWidth="1" />
      <line x1="62" y1="53" x2="72" y2="53" stroke="#1d4ed8" strokeWidth="1" />
      <path d="M12 24L14 27L17 24L14 21L12 24Z" fill="#fbbf24" />
      <path d="M84 20L85.5 22.5L88 20L85.5 17.5L84 20Z" fill="#fbbf24" />
    </svg>
  )
}

function PlumberGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <path d="M22 36H55C62 36 67 41 67 48V72" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 36H55C62 36 67 41 67 48V72" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="42" y="28" width="10" height="16" rx="2" fill="#d97706" />
      <circle cx="47" cy="22" r="8" fill="#f59e0b" />
      <circle cx="47" cy="22" r="4" fill="#b45309" />
      <rect x="62" y="58" width="10" height="6" rx="1" fill="#64748b" />
      <path d="M67 74C67 74 72 80 72 83C72 85.8 69.8 88 67 88C64.2 88 62 85.8 62 83C62 80 67 74 67 74Z" fill="#3b82f6" />
      <path d="M52 64C52 64 55 68 55 70C55 71.7 53.7 73 52 73C50.3 73 49 71.7 49 70C49 68 52 64 52 64Z" fill="#60a5fa" />
    </svg>
  )
}

function KitchenCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="22" y="56" width="56" height="20" rx="3" fill="#334155" />
      <rect x="20" y="52" width="60" height="4" rx="1.5" fill="#475569" />
      <path d="M36 52C36 46 40 44 40 52" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="34" width="24" height="18" rx="2" fill="#ef4444" />
      <rect x="26" y="32" width="28" height="3" rx="1" fill="#475569" />
      <rect x="36" y="28" width="8" height="4" rx="1" fill="#475569" />
      <path d="M28 40H24V44H28" fill="#475569" />
      <path d="M52 40H56V44H52" fill="#475569" />
      <rect x="58" y="38" width="10" height="14" rx="1.5" fill="#2563eb" />
      <path d="M63 38V32L59 35" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M72 26L74 29L77 26L74 23L72 26Z" fill="#fbbf24" />
    </svg>
  )
}

function CarpentryGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="56" width="64" height="16" rx="4" fill="#d97706" />
      <rect x="18" y="56" width="64" height="4" rx="2" fill="#f59e0b" />
      <line x1="26" y1="64" x2="52" y2="64" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="64" x2="74" y2="64" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 28L42 50H26L22 28Z" fill="#94a3b8" />
      <path d="M20 22C18 22 16 24 16 26V32C16 34 18 36 20 36H24L22 22H20Z" fill="#ef4444" />
      <path d="M55 42L76 21L82 27L61 48L55 42Z" fill="#d97706" />
      <rect x="54" y="38" width="16" height="10" rx="2" fill="#475569" transform="rotate(-45 54 38)" />
    </svg>
  )
}

function BedroomCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="18" y="24" width="64" height="44" rx="4" fill="#d97706" />
      <rect x="20" y="26" width="60" height="12" rx="2" fill="#b45309" />
      <rect x="24" y="44" width="52" height="24" rx="2.5" fill="#e2e8f0" />
      <rect x="22" y="52" width="56" height="16" rx="2" fill="#2563eb" />
      <path d="M46 44H74V68H46V44Z" fill="#fbbf24" />
      <rect x="28" y="35" width="18" height="10" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="54" y="35" width="18" height="10" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="26" y1="68" x2="26" y2="76" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
      <line x1="74" y1="68" x2="74" y2="76" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function AcGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="24" width="64" height="28" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="22" y="28" width="56" height="4" rx="2" fill="#94a3b8" />
      <circle cx="74" cy="42" r="2.5" fill="#10b981" />
      <rect x="24" y="44" width="16" height="2" fill="#cbd5e1" />
      <rect x="22" y="46" width="56" height="3" fill="#e2e8f0" />
      <path d="M30 56C30 56 35 64 35 70" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <path d="M50 56C50 56 55 65 55 72" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <path d="M70 56C70 56 75 64 75 70" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="80" cy="24" r="8" fill="#38bdf8" />
      <path d="M80 19V29M75 24H85M76.5 20.5L83.5 27.5M83.5 20.5L76.5 27.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const AirConditionerGraphic = AcGraphic

function SofaCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sofaBody" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="sofaCush" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="18" y="38" width="64" height="28" rx="6" fill="url(#sofaBody)" />
      <rect x="16" y="50" width="68" height="18" rx="4" fill="url(#sofaCush)" />
      <rect x="14" y="44" width="11" height="22" rx="3" fill="#3b82f6" />
      <rect x="75" y="44" width="11" height="22" rx="3" fill="#1d4ed8" />
      <line x1="20" y1="68" x2="17" y2="76" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="68" x2="83" y2="76" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 24C52 24 64 34 50 44" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M45 40L49 50L39 45L45 40Z" fill="#fbbf24" />
      <path d="M28 26L30 29L33 26L30 23L28 26Z" fill="#fbbf24" />
      <path d="M72 26L73.5 28.5L75.5 26L73.5 23.5L72 26Z" fill="#fbbf24" />
    </svg>
  )
}

function FridgeGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="28" y="16" width="44" height="58" rx="6" fill="#3b82f6" />
      <rect x="30" y="18" width="40" height="22" rx="4" fill="#60a5fa" />
      <rect x="30" y="43" width="40" height="29" rx="4" fill="#2563eb" />
      <rect x="34" y="32" width="3" height="6" rx="1.5" fill="#ffffff" />
      <rect x="34" y="47" width="3" height="12" rx="1.5" fill="#ffffff" />
      <rect x="52" y="48" width="12" height="12" rx="2" fill="#1e40af" />
      <rect x="56" y="50" width="4" height="4" rx="1" fill="#93c5fd" />
    </svg>
  )
}

function BathroomCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <circle cx="34" cy="30" r="14" fill="#93c5fd" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M26 24L38 36" stroke="#ffffff" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <rect x="20" y="50" width="28" height="24" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="18" y="46" width="32" height="4" rx="1" fill="#cbd5e1" />
      <path d="M34 46V40H38" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 42H78V54C78 60 72 66 65 66C58 66 56 60 56 54V42Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="58" y="26" width="16" height="16" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="70" cy="30" r="1.5" fill="#94a3b8" />
      <ellipse cx="67" cy="42" rx="10" ry="3.5" fill="#2563eb" />
      <path d="M60 66L62 76H72L74 66H60Z" fill="#cbd5e1" />
      <circle cx="16" cy="42" r="3" fill="#e0f2fe" opacity="0.8" />
      <circle cx="48" cy="42" r="2" fill="#e0f2fe" opacity="0.8" />
      <circle cx="82" cy="34" r="3.5" fill="#e0f2fe" opacity="0.8" />
    </svg>
  )
}

function WashingMachineGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="25" y="18" width="50" height="56" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="28" y="22" width="44" height="10" rx="2" fill="#e2e8f0" />
      <circle cx="34" cy="27" r="3" fill="#64748b" />
      <circle cx="42" cy="27" r="1.5" fill="#10b981" />
      <circle cx="47" cy="27" r="1.5" fill="#3b82f6" />
      <rect x="56" y="25" width="12" height="4" rx="1" fill="#334155" />
      <circle cx="50" cy="50" r="17" fill="#475569" />
      <circle cx="50" cy="50" r="13" fill="#38bdf8" />
      <circle cx="50" cy="50" r="9" fill="#0284c7" />
      <path d="M44 48C46 44 54 44 56 50C54 54 46 54 44 48Z" fill="#ffffff" opacity="0.6" />
    </svg>
  )
}

function WeeklyCleaningGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <rect x="22" y="16" width="56" height="56" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="22" y="16" width="56" height="14" rx="3" fill="#2563eb" />
      <circle cx="32" cy="16" r="2" fill="#475569" />
      <circle cx="42" cy="16" r="2" fill="#475569" />
      <circle cx="52" cy="16" r="2" fill="#475569" />
      <circle cx="68" cy="16" r="2" fill="#475569" />
      <line x1="38" y1="38" x2="68" y2="38" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="48" x2="68" y2="48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="58" x2="68" y2="58" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 38L32 41L36 35" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 48L32 51L36 45" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 58L32 61L36 55" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="56" r="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <path d="M70 51V56H74" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function TvGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="15" y="20" width="70" height="46" rx="4" fill="#1e293b" />
      <rect x="18" y="23" width="64" height="40" rx="2" fill="#0f172a" />
      <path d="M18 45L36 32L54 44L72 28L82 35V63H18V45Z" fill="#3b82f6" opacity="0.8" />
      <path d="M18 50L32 40L48 52L64 38L82 48V63H18V50Z" fill="#60a5fa" opacity="0.9" />
      <circle cx="70" cy="30" r="5" fill="#fef08a" opacity="0.9" />
      <path d="M40 66L36 76H64L60 66H40Z" fill="#475569" />
      <rect x="30" y="76" width="40" height="4" rx="2" fill="#334155" />
      <circle cx="50" cy="64.5" r="1.5" fill="#10b981" />
    </svg>
  )
}

function CockroachControlGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      <defs>
        <linearGradient id="cockroachBody" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>
      <g transform="translate(0, -4)">
        <path d="M47 28C43 20 38 18 32 18" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <path d="M53 28C57 20 62 18 68 18" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 40L28 35M40 48L25 48M40 56L28 62" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <path d="M60 40L72 35M60 48L75 48M60 56L72 62" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="30" r="5" fill="#451a03" />
        <ellipse cx="50" cy="48" rx="10" ry="16" fill="url(#cockroachBody)" stroke="#451a03" strokeWidth="1" />
        <line x1="50" y1="38" x2="50" y2="64" stroke="#451a03" strokeWidth="1.5" />
      </g>
      <circle cx="50" cy="44" r="26" stroke="#ef4444" strokeWidth="6.5" />
      <line x1="32" y1="26" x2="68" y2="62" stroke="#ef4444" strokeWidth="6.5" />
    </svg>
  )
}

function MicrowaveGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="18" y="24" width="64" height="48" rx="6" fill="#334155" />
      <rect x="21" y="27" width="40" height="42" rx="4" fill="#1e293b" />
      <rect x="24" y="30" width="34" height="36" rx="3" fill="#475569" />
      <rect x="26" y="32" width="30" height="32" rx="2" fill="#0f172a" opacity="0.8" />
      <circle cx="41" cy="48" r="8" fill="#f59e0b" opacity="0.4" />
      <rect x="55" y="34" width="3" height="28" rx="1.5" fill="#cbd5e1" />
      <rect x="63" y="27" width="16" height="42" rx="3" fill="#1e293b" />
      <rect x="65" y="30" width="12" height="7" rx="1.5" fill="#0284c7" />
      <text x="71" y="35.5" fontSize="4.5" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="monospace">1:30</text>
      <circle cx="68" cy="42" r="2" fill="#94a3b8" />
      <circle cx="74" cy="42" r="2" fill="#94a3b8" />
      <circle cx="68" cy="48" r="2" fill="#94a3b8" />
      <circle cx="74" cy="48" r="2" fill="#94a3b8" />
      <rect x="66" y="54" width="10" height="10" rx="2" fill="#10b981" />
    </svg>
  )
}

function TermiteControlGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />
      {/* Circular border brush effect (clean vector circular line) */}
      <circle cx="50" cy="46" r="32" stroke="#475569" strokeWidth="2.5" strokeDasharray="6 3 2 3" opacity="0.8" />

      {/* Termite Bug matching 1st image */}
      <g transform="translate(0, 2)">
        {/* Antennae */}
        <path d="M42 22C38 18 31 16 26 18" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 1.5" />
        <path d="M58 22C62 18 69 16 74 18" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 1.5" />
        {/* Mandibles / Pincers */}
        <path d="M45 23C42 26 42 32 46 32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        <path d="M55 23C58 26 58 32 54 32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        {/* Legs */}
        <path d="M40 44L28 42M40 52L26 54M42 62L28 68" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        <path d="M60 44L72 42M60 52L74 54M58 62L72 68" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
        {/* Head (Big, reddish-orange) */}
        <ellipse cx="50" cy="34" rx="11" ry="9" fill="#ea580c" stroke="#9a3412" strokeWidth="1" />
        {/* Thorax */}
        <ellipse cx="50" cy="45" rx="7" ry="5" fill="#eab308" />
        {/* Abdomen (Creamy segmented body) */}
        <ellipse cx="50" cy="60" rx="10" ry="14" fill="#fef08a" stroke="#eab308" strokeWidth="1" />
        {/* Segmentation lines */}
        <path d="M42 52H58" stroke="#eab308" strokeWidth="1" />
        <path d="M40 57H60" stroke="#eab308" strokeWidth="1" />
        <path d="M41 62H59" stroke="#eab308" strokeWidth="1" />
        <path d="M43 67H57" stroke="#eab308" strokeWidth="1" />
      </g>
    </svg>
  )
}

function AntBedBugControlGraphic({ className = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="84" rx="42" ry="5.5" fill="#cbd5e1" opacity="0.7" />

      {/* Ant Trail on the left (tiny black ants crawling diagonally) */}
      <g stroke="#1e293b" strokeWidth="1" fill="#1e293b">
        {/* Ant 1 */}
        <g transform="translate(18, 22) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
        {/* Ant 2 */}
        <g transform="translate(12, 36) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
        {/* Ant 3 */}
        <g transform="translate(16, 52) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
        {/* Ant 4 */}
        <g transform="translate(24, 66) scale(0.6)">
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1" />
          <circle cx="16" cy="10" r="2" />
          <path d="M10 10L7 8M10 10L7 12M13 10L13 7M13 10L13 13M16 10L19 8M16 10L19 12" stroke="#1e293b" strokeWidth="0.75" />
        </g>
      </g>

      {/* Bedbug on the right (Brownish-red segmented oval body) */}
      <g transform="translate(12, 0)">
        {/* Antennae */}
        <path d="M52 30C54 26 58 24 62 24" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M58 30C60 26 64 24 68 24" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" />
        {/* Legs */}
        <path d="M46 44L36 40M46 50L34 50M48 56L36 60" stroke="#7f1d1d" strokeWidth="2.0" strokeLinecap="round" />
        <path d="M64 44L74 40M64 50L76 50M62 56L74 60" stroke="#7f1d1d" strokeWidth="2.0" strokeLinecap="round" />
        {/* Head */}
        <polygon points="51,33 59,33 55,27" fill="#7f1d1d" />
        {/* Thorax */}
        <path d="M46 34H64L60 41H50L46 34Z" fill="#7f1d1d" />
        {/* Abdomen */}
        <circle cx="55" cy="51" r="11" fill="#a16207" stroke="#7f1d1d" strokeWidth="1.25" />
        {/* Abdomen Segments */}
        <path d="M46 47H64" stroke="#7f1d1d" strokeWidth="1.25" />
        <path d="M45 52H65" stroke="#7f1d1d" strokeWidth="1.25" />
        <path d="M47 57H63" stroke="#7f1d1d" strokeWidth="1.25" />
      </g>
    </svg>
  )
}

function ForYouGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <rect x="22" y="20" width="56" height="54" rx="14" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="2" />
      <circle cx="50" cy="46" r="18" fill="#059669" />
      <path d="M50 36L53.5 43.5L61.5 44.5L55.5 50L57 58L50 54L43 58L44.5 50L38.5 44.5L46.5 43.5L50 36Z" fill="#fef08a" />
      <circle cx="70" cy="24" r="6" fill="#f59e0b" />
      <path d="M70 20V28M66 24H74" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28" cy="30" r="4" fill="#3b82f6" opacity="0.8" />
      <path d="M28 27V33M25 30H31" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function FoodHealthGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="80" rx="36" ry="4.5" fill="#d1fae5" opacity="0.8" />
      <ellipse cx="50" cy="52" rx="30" ry="12" fill="#10b981" />
      <path d="M20 52C20 68 32 74 50 74C68 74 80 68 80 52H20Z" fill="#059669" />
      <ellipse cx="50" cy="52" rx="27" ry="9" fill="#34d399" />
      <circle cx="40" cy="40" r="11" fill="#ef4444" />
      <path d="M40 29C40 25 43 23 44 21" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="46" cy="25" rx="3.5" ry="2" fill="#22c55e" transform="rotate(-30 46 25)" />
      <path d="M52 46L68 28C69 27 71 27 72 29C73 30 73 32 71 34L57 50Z" fill="#ea580c" />
      <path d="M70 28L78 20M71 30L81 25M68 27L74 18" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <rect x="56" y="32" width="12" height="20" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="59" y="28" width="6" height="4" rx="1" fill="#3b82f6" />
      <circle cx="74" cy="62" r="9" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
      <path d="M74 57V67M69 62H79" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function GroceriesGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="38" ry="5" fill="#d1fae5" opacity="0.8" />
      <path d="M26 34L22 74H78L74 34H26Z" fill="#d97706" />
      <path d="M26 34L30 30L34 34L38 30L42 34L46 30L50 34L54 30L58 34L62 30L66 34L70 30L74 34H26Z" fill="#b45309" />
      <rect x="28" y="14" width="10" height="26" rx="5" fill="#f59e0b" transform="rotate(-15 28 14)" />
      <line x1="28" y1="20" x2="34" y2="22" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="26" x2="32" y2="28" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="42" y="18" width="16" height="24" rx="2" fill="#3b82f6" />
      <polygon points="42,18 50,12 58,18" fill="#60a5fa" />
      <rect x="46" y="24" width="8" height="10" rx="1" fill="#ffffff" />
      <text x="50" y="31" fontSize="4.5" fontWeight="bold" fill="#3b82f6" textAnchor="middle">MILK</text>
      <rect x="62" y="20" width="12" height="20" rx="3" fill="#10b981" />
      <rect x="65" y="15" width="6" height="5" rx="1" fill="#d97706" />
      <circle cx="50" cy="54" r="11" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M46 54L49 57L55 51" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VegetablesGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="38" ry="5" fill="#d1fae5" opacity="0.8" />
      <circle cx="34" cy="38" r="8" fill="#15803d" />
      <circle cx="28" cy="44" r="8" fill="#16a34a" />
      <circle cx="40" cy="44" r="8" fill="#22c55e" />
      <circle cx="34" cy="46" r="8" fill="#15803d" />
      <path d="M30 52C30 52 32 66 34 68C36 70 38 66 38 52H30Z" fill="#86efac" stroke="#16a34a" strokeWidth="1" />
      <circle cx="52" cy="56" r="14" fill="#dc2626" />
      <ellipse cx="48" cy="52" rx="3" ry="5" fill="#f87171" opacity="0.6" transform="rotate(-30 48 52)" />
      <path d="M52 42V38" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 42L52 44L56 42L54 40L50 40L48 42Z" fill="#16a34a" />
      <path d="M62 68L78 36C80 33 84 34 85 36C86 38 85 41 82 43L68 72C66 74 62 72 62 68Z" fill="#ea580c" />
      <line x1="68" y1="58" x2="74" y2="55" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="72" y1="48" x2="78" y2="45" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 34L90 20M82 36L92 26M78 32L86 18" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="64" cy="62" rx="7" ry="10" fill="#7e22ce" transform="rotate(-20 64 62)" />
      <path d="M67 52C67 48 70 46 72 45" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── High-Fidelity Studio Product Photography Mapping ───────────────────
function getFoodItemPhoto(name = "", isGrocery = false) {
  const n = name.toLowerCase()

  if (isGrocery) {
    if (n.includes("combo") || n.includes("dals & grains")) {
      return "/mockups/groceries_realistic.png"
    }
    if (n.includes("staples") || n.includes("kitchen staples")) {
      return "/mockups/category_food_health.png"
    }
    if (n.includes("atta") || n.includes("wheat") || n.includes("flour")) {
      return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("rice") || n.includes("basmati")) {
      return "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("dal") || n.includes("pulses") || n.includes("moong") || n.includes("toor")) {
      return "https://images.unsplash.com/photo-1585996746973-45f8fdf1ca23?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("oil") || n.includes("ghee")) {
      return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("milk") || n.includes("dairy")) {
      return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("butter")) {
      return "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("bread")) {
      return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80"
    }
    if (n.includes("egg")) {
      return "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&auto=format&fit=crop&q=80"
    }
  }

  // 100% Accurate Verified Photographic Matches for Tamil & English Vegetable Names
  if (n.includes("basket") || n.includes("essential")) return "/mockups/vegetables_realistic.png"
  if (n.includes("tomato") || n.includes("thakkali") || n.includes("tamatar") || n.includes("cherry")) return "/mockups/veg_tomato.png"

  // Spring Onion MUST precede general onion
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

function HomeCombinedGraphic({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="38" ry="5" fill="#d1fae5" opacity="0.8" />
      <rect x="22" y="32" width="56" height="42" rx="8" fill="#f0fdf4" stroke="#059669" strokeWidth="2" />
      <path d="M16 34L50 12L84 34H16Z" fill="#059669" />
      <rect x="42" y="48" width="16" height="26" rx="3" fill="#047857" />
      <circle cx="46" cy="61" r="1.5" fill="#fef08a" />
      <circle cx="28" cy="46" r="9" fill="#ffffff" stroke="#059669" strokeWidth="1.5" />
      <path d="M25 43L31 49M31 43L25 49" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="46" r="9" fill="#ffffff" stroke="#059669" strokeWidth="1.5" />
      <rect x="67" y="44" width="7" height="5" fill="#2563eb" />
      <circle cx="69" cy="50" r="1.5" fill="#1e293b" />
      <circle cx="75" cy="50" r="1.5" fill="#1e293b" />
    </svg>
  )
}

// MAIN_CATEGORIES removed — category tiles are sourced from live /api/catalog/categories/

// VEGETABLE_VARIANTS_MAP removed — variant pricing is sourced from the DB Package model.
// getVegetableOptions: returns null (no hardcoded variants); real package variants come from the API.
const getVegetableOptions = (_name) => null

const getProducePriority = (name = "") => {
  const lower = name.toLowerCase()
  if (lower.includes("spring onion") || lower.includes("sambhar onion")) return 80
  if (lower.includes("sweet potato") || lower.includes("baby potato")) return 80

  if (lower.includes("tomato") && !lower.includes("organic")) return 1
  if (lower.includes("onion") && !lower.includes("organic")) return 2
  if (lower.includes("garlic") && !lower.includes("peeled")) return 3
  if (lower.includes("ginger") && !lower.includes("organic")) return 4
  if (lower.includes("potato") && !lower.includes("organic") && !lower.includes("ooty")) return 5
  if (lower.includes("green chilli") || lower.includes("pachai milagaai")) return 6
  if (lower.includes("curry leaves") || lower.includes("karuveppilai") || lower.includes("karuvepillai")) return 7
  if (lower.includes("coriander") || lower.includes("kothamalli")) return 8
  if (lower.includes("lady finger") || lower.includes("vendaikkai") || lower.includes("vendakkai")) return 9
  if (lower.includes("lemon") || lower.includes("elumichai")) return 10
  if (lower.includes("spinach") || lower.includes("palak")) return 11
  if (lower.includes("carrot")) return 12
  if (lower.includes("cucumber")) return 13

  return 50
}

// VEGETABLE_ITEMS — starts as empty; populated by /api/catalog/services/?service_slug=vegetables
// VEGETABLE_ITEMS: empty default — populated dynamically from /api/catalog/services/?service_slug=vegetables
const VEGETABLE_ITEMS = []

// GROCERY_ITEMS: empty default — populated dynamically from /api/catalog/services/?service_slug=groceries
const GROCERY_ITEMS = []

const FOOD_HEALTH_SUB = [
  {
    id: "groceries",
    name: "Groceries",
    tagline: "Daily Essentials, Staples & Packaged Goods",
    graphic: GroceriesGraphic,
    photo: "/mockups/groceries_realistic.png",
    badge: "Coming Soon",
    items: GROCERY_ITEMS,
  },
  {
    id: "vegetables",
    name: "Vegetables",
    tagline: "Farm-Fresh & 100% Organic Green Vegetables",
    graphic: VegetablesGraphic,
    photo: "/mockups/vegetables_realistic.png",
    badge: "8-min Farm Express",
    items: VEGETABLE_ITEMS,
  },
]

// CATEGORIES, HOME_SERVICES_SUB, PEST_CONTROL_SUB removed — all sourced from live /api/catalog/categories/

const TRUST_STRIP = [
  { icon: ShieldCheck, title: "Verified & Background Checked", body: "Skilled professionals you can trust." },
  { icon: BadgeCheck, title: "Transparent & Fair Pricing", body: "No hidden charges, what you see is what you pay." },
  { icon: Clock, title: "On-time Service", body: "We value your time as much as you do." },
  { icon: Award, title: "Service Warranty", body: "We stand by the quality of our work." },
  { icon: Headphones, title: "24/7 Customer Support", body: "We're here whenever you need us." },
]

const OFFERS = [
  { tag: "UPTO", big: "20% OFF", sub: "on Home Cleaning", bg: "bg-emerald-50" },
  { tag: "FLAT", big: "15% OFF", sub: "on Painting", bg: "bg-teal-50" },
  { tag: "UPTO", big: "₹500 OFF", sub: "on AC Service", bg: "bg-lime-50" },
]

const STEPS = [
  { icon: ClipboardList, title: "Choose Service", body: "Select the service you need" },
  { icon: CalendarDays, title: "Pick Date & Time", body: "Choose a convenient slot" },
  { icon: UserCheck, title: "We Assign Expert", body: "We'll assign the best professional" },
  { icon: DoorOpen, title: "Service at Your Door", body: "Expert arrives & gets the job done" },
  { icon: Wallet, title: "Pay & Rate", body: "Make payment & share your feedback" },
]

// STATS removed — fabricated numbers replaced by SEVO trust guarantees in homePageConfig
// PROFESSIONALS removed — fabricated fake profiles ("Sarah J.", "Elite Plumbing", etc.)

const TESTIMONIALS = [
  { name: "Kavya R.", initials: "KR", text: "Booked cleaning service and the professional was punctual and did a fantastic job!" },
  { name: "Arvind S.", initials: "AS", text: "Very professional electrician. Fixed the issue quickly and the pricing was fair." },
  { name: "Priya M.", initials: "PM", text: "Great experience with the painting service. Highly recommend Sevo!" },
]

function Logo({ onClick }) {
  const navigate = useNavigate()
  return (
    <div
      className="flex items-center gap-2 select-none cursor-pointer shrink-0 group"
      onClick={onClick || (() => navigate(routes.landing))}
    >
      <img
        src="/assets/sevo_emblem_transparent.png"
        alt="SEVO Emblem"
        className="h-9 w-auto shrink-0 object-contain group-hover:scale-105 transition-transform"
        style={{ height: '36px', width: 'auto' }}
      />
      <img
        src="/assets/sevo_text_logo.png"
        alt="SEVO"
        className="shrink-0 object-contain"
        style={{ height: '18px', width: 'auto', maxHeight: '18px' }}
      />
    </div>
  )
}

// ── Location dropdown (Operating Cities Selector - Dynamic) ────────────
function LocationDropdown({ className = "", activeCity, onCityChange }) {
  const [cities, setCities] = useState([])
  const [selectedCity, setSelectedCity] = useState(() => {
    return activeCity || localStorage.getItem("calservice_user_city") || "Hosur"
  })

  useEffect(() => {
    let isMounted = true
    fetchLogisticsCities({ launchedOnly: true })
      .then(res => {
        if (!isMounted) return
        const cityList = Array.isArray(res) ? res : (res?.results || res?.data || [])
        const launched = cityList.filter(c => c && c.is_active !== false && c.is_launched !== false)
        if (launched && launched.length > 0) {
          setCities(launched.map(c => typeof c === "string" ? { name: c } : c))
        }
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (activeCity) setSelectedCity(activeCity)
  }, [activeCity])

  const handleChange = (e) => {
    const newCity = e.target.value
    setSelectedCity(newCity)
    localStorage.setItem("calservice_user_city", newCity)
    if (typeof onCityChange === 'function') {
      onCityChange(newCity)
    }
    window.dispatchEvent(new CustomEvent("calservices:city_changed", { detail: newCity }))
  }

  const displayCities = cities.length > 0 ? cities : [{ name: "Hosur", state: "Tamil Nadu", isHub: true }]

  return (
    <div className={`relative flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-full pl-3 pr-2 py-1.5 hover:border-slate-300 ${className}`}>
      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
      <select
        value={selectedCity}
        onChange={handleChange}
        className="bg-transparent outline-none appearance-none pr-4 cursor-pointer font-bold text-slate-800"
      >
        {displayCities.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-slate-400" />
    </div>
  )
}

// ── All platform searchable services & individual packages for instant search ──
// Primary search items are derived dynamically from live /api/catalog/services/ (liveCatalogSearchItems).
// Only special-flow entries (Goods & Transport, Farm Vegetables, Groceries) that do not map to a standard DB service are kept here.
const ALL_SEARCHABLE_SERVICES = [
  // ── Goods & Transport (Hosur) ──
  {
    id: "log-truck",
    title: "Mini Truck Hire (Tata Ace, Pickup 8ft)",
    category: "Goods & Transport",
    action: "navigate",
    url: "/trucks/hosur",
    price: "View Pricing",
    badge: "Live GPS",
    tags: ["truck", "mini truck", "tata ace", "pickup", "transport", "goods", "tempo", "chota hathi", "lorry", "delivery", "hosur"]
  },
  {
    id: "log-courier",
    title: "2-Wheeler Parcel & Bike Courier",
    category: "Goods & Transport",
    action: "navigate",
    url: "/two-wheelers/hosur",
    price: "View Pricing",
    badge: "Under 60 Mins",
    tags: ["bike", "two wheeler", "courier", "parcel", "documents", "package delivery", "instant delivery", "rider", "hosur"]
  },
  {
    id: "log-packers",
    title: "Packers & Movers (House & Office Shifting)",
    category: "Goods & Transport",
    action: "navigate",
    url: "/packers-and-movers/hosur",
    price: "Instant Quote",
    badge: "Verified Drivers",
    tags: ["packers and movers", "packers", "movers", "house shifting", "office relocation", "luggage", "furniture shifting", "hosur"]
  },

  // ── Fresh Farm & Groceries ──
  {
    id: "fresh-vegetables",
    title: "Farm Fresh Vegetables Express",
    category: "Food & Health",
    action: "food_health",
    subId: "vegetables",
    price: "Farm Rates",
    badge: "8-min Delivery",
    tags: ["vegetables", "veggies", "tomato", "potato", "onion", "greens", "organic", "fresh produce", "farm", "veg"]
  },
  {
    id: "daily-groceries",
    title: "Daily Essentials & Groceries",
    category: "Food & Health",
    action: "food_health",
    subId: "groceries",
    price: "Market Price",
    badge: "Coming Soon",
    tags: ["groceries", "milk", "bread", "eggs", "rice", "dal", "oil", "spices", "kitchen staples", "grocery"]
  }
]

/**
 * Small inline "click pencil to edit" control for Customer Web Edit Mode —
 * same interaction pattern already shipped on the Grocery/Product cards
 * (VegetableProductCard's EditableField), reused here for Homepage text so
 * Super Admin edits content directly on the real customer page instead of
 * a separate builder screen. Renders as plain text when `active` is false,
 * so every normal customer sees exactly the original markup.
 */
function HomeEditableText({ active, value, onSave, placeholder = "", className = "" }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || "")

  useEffect(() => { setDraft(value || "") }, [value])

  if (!active) {
    return <span className={className}>{value || placeholder}</span>
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-white/95 rounded-lg px-1.5 py-1 shadow-md border border-indigo-300" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setEditing(false); if (draft !== value) onSave(draft) }
            if (e.key === "Escape") { setDraft(value || ""); setEditing(false) }
          }}
          className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-900 min-w-[140px]"
        />
        <button
          type="button"
          onClick={() => { setEditing(false); if (draft !== value) onSave(draft) }}
          className="text-emerald-600 hover:text-emerald-800"
          aria-label="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setDraft(value || ""); setEditing(false) }}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 group/homeedit cursor-pointer rounded px-1 -mx-1 ring-1 ring-transparent hover:ring-indigo-300 hover:bg-indigo-50/60 align-middle ${className}`}
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <span>{value || placeholder}</span>
      <Pencil className="w-3 h-3 text-indigo-500 opacity-0 group-hover/homeedit:opacity-100 shrink-0" />
    </span>
  )
}


function resolveCategoryEta(cat) {
  const name = String(cat?.name || cat?.label || "").toLowerCase()
  const slug = String(cat?.slug || "").toLowerCase()
  if (name.includes("ac") || slug.includes("ac") || name.includes("appliance")) return "In 30 mins"
  if (name.includes("clean") || slug.includes("clean") || name.includes("pest")) return "In 45 mins"
  if (name.includes("electric") || name.includes("plumb") || name.includes("carpenter")) return "Instant"
  if (name.includes("paint") || slug.includes("paint")) return "Free Quote"
  if (name.includes("mason") || name.includes("civil")) return "Free Estimate"
  if (name.includes("transport") || name.includes("goods") || slug.includes("goods")) return "Hyperlocal"
  if (name.includes("vegetable") || name.includes("grocer")) return "Same Day"
  return null
}

function SevoServiceCard({ service, onBook, onExplore, inCartQty = 0, onUpdateQty }) {
  const price = service.price || service.base_price || 0
  const duration = service.duration || ""
  const image = service.image || service.service_image || "/assets/hero_illustration.jpg"
  const rating = service.rating ? parseFloat(service.rating).toFixed(1) : null
  const reviewsCount = service.reviews_count ? Number(service.reviews_count) : (Array.isArray(service.reviews) ? service.reviews.length : 0)

  return (
    <div
      onClick={() => onExplore?.(service)}
      className="shrink-0 w-[240px] sm:w-[260px] snap-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
    >
      {/* Image with subtle aspect ratio and badges */}
      <div className="relative h-32 sm:h-36 bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <img
          src={image}
          alt={service.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/assets/hero_illustration.jpg"
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {service.popular && (
          <span className="absolute top-2.5 left-2.5 bg-[#0B8F7A] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase">
            Popular
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Authentic Star Rating & Duration Row */}
          {(rating || duration) && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {rating && (
                <>
                  <div className="flex items-center gap-0.5 text-amber-500 font-extrabold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{rating}</span>
                  </div>
                  {reviewsCount > 0 && (
                    <span className="text-slate-400 text-[10px]">({reviewsCount})</span>
                  )}
                  {duration && <span className="text-slate-300 dark:text-slate-600">•</span>}
                </>
              )}
              {duration && (
                <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 text-[10px]">
                  <Clock className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[100px]">{duration}</span>
                </div>
              )}
            </div>
          )}

          {/* Service Title */}
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 line-clamp-2 leading-snug group-hover:text-[#0B8F7A] transition-colors" title={service.name}>
            {service.name}
          </h3>

          {/* Service Category */}
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 mt-0.5 truncate">
            {service.service_name || service.category_name || service.categoryName || "Doorstep Service"}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 pt-2">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              ₹{Number(price).toLocaleString("en-IN")}
            </span>
            {service.offer_price && Number(service.offer_price) < Number(price) && (
              <span className="text-xs text-slate-400 line-through">
                ₹{Number(service.offer_price).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Benchmark Add / Quantity Controls */}
        {inCartQty > 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full mt-2.5 py-1.5 px-3 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between font-black text-xs shadow-2xs"
          >
            <button
              type="button"
              onClick={() => onUpdateQty?.(service.id, -1)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 font-black cursor-pointer transition-colors"
              title="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-emerald-900 dark:text-emerald-200 font-extrabold text-sm">{inCartQty}</span>
            <button
              type="button"
              onClick={() => onUpdateQty?.(service.id, 1)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 font-black cursor-pointer transition-colors"
              title="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onBook(service)
            }}
            className="w-full mt-2.5 py-2 px-3 rounded-xl border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white font-black text-xs transition-all shadow-2xs active:scale-98 cursor-pointer text-center flex items-center justify-center gap-1"
          >
            <span>+ Add</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Rotating Animated Query Hints (Benchmark Search Experience) ──
const DEFAULT_ROTATING_HINTS = [
  "Search for 'AC Service & Repair'",
  "Search for 'Bathroom Cleaning'",
  "Search for 'Full Home Deep Cleaning'",
  "Search for 'Electrician & Switch Repair'",
  "Search for 'Plumber & Tap Leak Repair'",
  "Search for 'Mini Truck (Tata Ace)'",
  "Search for 'Packers & Movers'",
  "Search for 'Farm-Fresh Vegetables & Groceries'",
]

export function LandingPage() {
  const { user, refreshMe } = useAuth()
  const { save: savePendingIntent, restore: restorePendingIntent } = usePendingIntent()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [packagesData, setPackagesData] = useState(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [customerBookings, setCustomerBookings] = useState([])
  const [copiedOtp, setCopiedOtp] = useState(false)
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem("calservice_user_city") || "Hosur"
  })

  useEffect(() => {
    const handleCityChange = (e) => {
      if (e?.detail) {
        setSelectedCity(e.detail)
      } else {
        const stored = localStorage.getItem("calservice_user_city")
        if (stored) setSelectedCity(stored)
      }
    }
    window.addEventListener("calservices:city_changed", handleCityChange)
    window.addEventListener("calservice_address_changed", handleCityChange)
    return () => {
      window.removeEventListener("calservices:city_changed", handleCityChange)
      window.removeEventListener("calservice_address_changed", handleCityChange)
    }
  }, [])
  const [modalCart, setModalCart] = useState(() => {
    const stateCart = location.state?.cart;
    if (stateCart && stateCart.length > 0) {
      return stateCart.filter(c => c.categoryName !== "Painting" && c.categoryName !== "Mason" && c.id && String(c.id).includes("paint") === false && String(c.id).includes("mason") === false);
    }
    try {
      const saved = localStorage.getItem("calservices_customer_cart") || sessionStorage.getItem("calservices_customer_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => c.categoryName !== "Painting" && c.categoryName !== "Mason" && c.id && String(c.id).includes("paint") === false && String(c.id).includes("mason") === false);
        }
      }
    } catch (e) {
      console.error("Failed to parse saved cart in LandingPage:", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("calservices_customer_cart", JSON.stringify(modalCart));
      window.dispatchEvent(new CustomEvent("calservices_cart_updated"));
    } catch (e) {
      console.error("Failed to save modalCart to localStorage:", e);
    }
  }, [modalCart]);

  const [showCartDrawer, setShowCartDrawer] = useState(false);

  const handleCopyOtp = useCallback((otp) => {
    if (!otp) return
    try {
      navigator.clipboard.writeText(String(otp))
      setCopiedOtp(true)
      setTimeout(() => setCopiedOtp(false), 2500)
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (user) {
      apiFetchCustomerBookings()
        .then(res => {
          if (res?.data && Array.isArray(res.data)) {
            setCustomerBookings(res.data)
            const activeBookingsCount = res.data.filter(b => {
              const st = String(b.status || "").toLowerCase()
              return ['pending', 'new_request', 'assigned', 'accepted', 'in_progress', 'on_the_way', 'arrived', 'started', 'dispatched'].includes(st)
            }).length
            setNotificationCount(activeBookingsCount)
          }
        })
        .catch(() => { })
    } else {
      setNotificationCount(0)
      setCustomerBookings([])
    }
  }, [user])

  const activeCustomerBooking = useMemo(() => {
    if (!customerBookings || !customerBookings.length) return null
    return customerBookings.find(b => {
      const st = String(b.status || "").toLowerCase()
      return ['pending', 'new_request', 'assigned', 'accepted', 'in_progress', 'on_the_way', 'arrived', 'started', 'dispatched'].includes(st)
    }) || null
  }, [customerBookings])

  const recentCompletedBookings = useMemo(() => {
    if (!customerBookings || !customerBookings.length) return []
    return customerBookings
      .filter(b => {
        const st = String(b.status || "").toLowerCase()
        return ['completed', 'closed', 'verified', 'feedback_pending', 'feedback_received'].includes(st)
      })
      .slice(0, 3)
  }, [customerBookings])

  const handleOneClickRebook = useCallback((b) => {
    let items = []
    if (typeof b.cart_data === "string") {
      try { items = JSON.parse(b.cart_data) } catch (e) { }
    } else if (Array.isArray(b.cart_data)) {
      items = b.cart_data
    }
    if (!items || items.length === 0) {
      items = [{
        id: b.package_id || b.service_id || b.id,
        name: (b.issue_title || b.service_category_display || "Service Booking").replace(/•“/g, " - ").replace(/•”/g, " - "),
        price: Number(b.total_amount || b.base_amount || 499),
        quantity: 1,
        category: b.service_category,
      }]
    }
    setModalCart(items)
    try {
      localStorage.setItem("calservices_customer_cart", JSON.stringify(items))
      if (b.service_category) {
        localStorage.setItem("calservices_customer_category", JSON.stringify({ id: b.service_category, name: b.service_category_display || b.service_category }))
      }
      if (b.address && user?.id) {
        setCustomerSelectedAddress(user.id, b.address)
      }
      window.dispatchEvent(new CustomEvent("calservices_cart_updated"))
    } catch (e) { }
    navigate(routes.booking_checkout, { state: { cart: items, category: b.service_category } })
  }, [navigate, user])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef(null)
  const [homeConfig, setHomeConfig] = useState(() => getHomePageConfig())
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [isAllServicesOpen, setIsAllServicesOpen] = useState(false)

  // Listen for global mobile bottom nav events & query params
  useEffect(() => {
    const onOpenServices = () => setIsAllServicesOpen(true)
    const onOpenCart = () => setShowCartDrawer(true)
    const onOpenAccount = () => {
      if (user) {
        setActiveAccountTab("My Profile")
        setShowAccountPortal(true)
      } else {
        goToLogin()
      }
    }
    const onOpenLogin = () => goToLogin()

    window.addEventListener("calservices_open_services_modal", onOpenServices)
    window.addEventListener("calservices_open_cart_drawer", onOpenCart)
    window.addEventListener("calservices_open_account_portal", onOpenAccount)
    window.addEventListener("calservices_open_login_modal", onOpenLogin)

    if (searchParams.get("openAccount") === "1") {
      if (user) {
        setActiveAccountTab("My Profile")
        setShowAccountPortal(true)
      } else {
        goToLogin()
      }
    }
    if (searchParams.get("openLogin") === "1") {
      goToLogin()
    }
    if (searchParams.get("openServices") === "1") {
      setIsAllServicesOpen(true)
    }

    return () => {
      window.removeEventListener("calservices_open_services_modal", onOpenServices)
      window.removeEventListener("calservices_open_cart_drawer", onOpenCart)
      window.removeEventListener("calservices_open_account_portal", onOpenAccount)
      window.removeEventListener("calservices_open_login_modal", onOpenLogin)
    }
  }, [user, searchParams])


  // ── "Recommended for You" -- real catalog packages, not hardcoded ───────
  // Pulls from the same public, AllowAny catalog endpoint the booking flow
  // itself is driven by (service_requests.views.CatalogServiceListView ->
  // GET /api/catalog/services/?status=ACTIVE), so the name/price/duration
  // and — critically — the image shown here are always whatever Ops has
  // actually configured in Settings > Catalog, never a local/mock asset.
  const [allActiveCatalogServices, setAllActiveCatalogServices] = useState([])
  const [recommendedPackages, setRecommendedPackages] = useState([])
  const [recommendedLoading, setRecommendedLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiRequest("/catalog/services/?status=ACTIVE")
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          setAllActiveCatalogServices(res.data)
          const sorted = [...res.data].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
          setRecommendedPackages(sorted.slice(0, 8))
        }
      } catch {
        /* fail gracefully */
      } finally {
        if (!cancelled) setRecommendedLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Dynamic Rotating Query Hints & Trending Searches Derived from Live SEVO Catalog ──
  const dynamicSearchHints = useMemo(() => {
    if (!allActiveCatalogServices || allActiveCatalogServices.length === 0) {
      return DEFAULT_ROTATING_HINTS
    }
    const sample = allActiveCatalogServices.filter(s => s.popular).slice(0, 6)
    const hints = sample.map(s => `Search for '${s.name}'`)
    hints.push("Search for 'Mini Truck (Tata Ace)'")
    hints.push("Search for 'Packers & Movers'")
    hints.push("Search for 'Farm-Fresh Vegetables & Groceries'")
    return hints.length > 0 ? hints : DEFAULT_ROTATING_HINTS
  }, [allActiveCatalogServices])

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % dynamicSearchHints.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [dynamicSearchHints.length])

  const dynamicTrendingSearches = useMemo(() => {
    const list = []
    if (allActiveCatalogServices && allActiveCatalogServices.length > 0) {
      const populars = allActiveCatalogServices.filter(s => s.popular)
      populars.slice(0, 5).forEach(s => {
        list.push({
          label: s.name,
          catSlug: s.category_slug,
          subtab: s.service_slug || s.slug,
        })
      })
    }
    // High-intent logistics & grocery staples
    list.push({ label: "Mini truck", route: routes.truck_booking_hosur })
    list.push({ label: "Packers & movers", route: routes.packers_movers_booking_hosur })
    list.push({ label: "Farm fresh veggies", route: routes.vegetables })
    if (list.length < 6) {
      return [
        { label: "Bathroom cleaning", catSlug: "home_pest_control", subtab: "bathroom-cleaning" },
        { label: "AC not cooling", catSlug: "ac_appliance", subtab: "ac-repair" },
        { label: "Electrician", catSlug: "electrician_plumbing_carpentry", subtab: "electrician" },
        { label: "Plumber", catSlug: "electrician_plumbing_carpentry", subtab: "plumber" },
        { label: "Mini truck", route: routes.truck_booking_hosur },
        { label: "Packers & movers", route: routes.packers_movers_booking_hosur },
        { label: "Farm fresh veggies", route: routes.vegetables },
      ]
    }
    return list
  }, [allActiveCatalogServices])

  // ── Curated Showcase Collections Derived from Real SEVO Catalog ──
  const mostBookedServices = useMemo(() => {
    if (!allActiveCatalogServices.length) return []
    const highIntent = [
      "2 bathrooms deep cleaning",
      "ac less / no cooling",
      "tap / mixer",
      "switch / socket",
      "2-wheeler instant",
      "ceiling fan",
      "civil core cutting",
      "termite"
    ]
    const matched = []
    highIntent.forEach(q => {
      const found = allActiveCatalogServices.find(s => s.name?.toLowerCase().includes(q) && !matched.some(m => m.id === s.id))
      if (found) matched.push(found)
    })
    if (matched.length < 8) {
      allActiveCatalogServices.forEach(s => {
        if (s.popular && !matched.some(m => m.id === s.id) && matched.length < 8) {
          matched.push(s)
        }
      })
    }
    return matched
  }, [allActiveCatalogServices])

  const applianceServices = useMemo(() => {
    return allActiveCatalogServices.filter(s =>
      s.category === 15 || s.category_slug === "ac_appliance" || (s.category_name && s.category_name.toLowerCase().includes("appliance"))
    ).slice(0, 8)
  }, [allActiveCatalogServices])

  const homeRepairServices = useMemo(() => {
    return allActiveCatalogServices.filter(s =>
      s.category === 39 || s.category_slug === "electrician_plumbing_carpentry" || (s.category_name && s.category_name.toLowerCase().includes("electrician"))
    ).slice(0, 8)
  }, [allActiveCatalogServices])

  const goodsTransportServices = useMemo(() => {
    return allActiveCatalogServices.filter(s =>
      s.category === 12 || s.category_slug === "goods_transports" || (s.category_name && s.category_name.toLowerCase().includes("goods"))
    ).slice(0, 6)
  }, [allActiveCatalogServices])

  const cleaningServices = useMemo(() => {
    return allActiveCatalogServices.filter(s =>
      s.category === 16 || s.category_slug === "home_pest_control" || (s.category_name && s.category_name.toLowerCase().includes("cleaning"))
    ).slice(0, 8)
  }, [allActiveCatalogServices])

  const handleTrendingClick = useCallback((t) => {
    if (t.route) {
      navigate(t.route)
      return
    }
    const params = new URLSearchParams()
    if (t.catSlug) params.set("category", t.catSlug)
    if (t.subtab) {
      params.set("service", t.subtab)
      params.set("subtab", t.subtab)
    }
    navigate(`${routes.booking_services}?${params.toString()}`)
  }, [navigate])

  const handleExploreService = useCallback((service) => {
    const catSlug = service.category_slug || service.categorySlug || service.catId || "ac_appliance"
    const subSlug = service.service_slug || service.serviceSlug || service.slug || ""

    if (catSlug === "goods_transports" || catSlug === "goods_transport" || String(service.category) === "12") {
      const sName = (service.name || "").toLowerCase()
      if (sName.includes("instant") || sName.includes("courier") || sName.includes("2-wheeler")) {
        navigate(routes.two_wheeler_booking_hosur)
        return
      }
      if (sName.includes("truck") || sName.includes("3 wheeler") || sName.includes("1.7 ton")) {
        navigate(routes.truck_booking_hosur)
        return
      }
      if (sName.includes("shifting") || sName.includes("bhk") || sName.includes("packer") || sName.includes("mover")) {
        navigate(routes.packers_movers_booking_hosur)
        return
      }
    }

    const params = new URLSearchParams()
    params.set("category", catSlug)
    if (subSlug) {
      params.set("service", subSlug)
      params.set("subtab", subSlug)
    }
    navigate(`${routes.booking_services}?${params.toString()}`)
  }, [navigate])

  const handleServiceCardBook = useCallback((service) => {
    const catSlug = service.category_slug || service.categorySlug || service.catId || "ac_appliance"
    const subSlug = service.service_slug || service.serviceSlug || service.slug || ""

    if (catSlug === "goods_transports" || catSlug === "goods_transport" || String(service.category) === "12") {
      handleExploreService(service)
      return
    }

    const cartItem = {
      id: service.id,
      name: service.name,
      price: Number(service.price || service.base_price || 0),
      duration: service.duration || "",
      category: service.category || service.category_id || catSlug,
      category_slug: catSlug,
      categoryName: service.category_name || "Doorstep Service",
      service_name: service.service_name || service.name,
      service_slug: subSlug,
      quantity: 1,
    }

    setModalCart(prev => {
      const existing = (prev || []).find(item => item.id === service.id)
      if (existing) {
        return prev.map(item => item.id === service.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item)
      }
      return [...(prev || []), cartItem]
    })
    setShowCartDrawer(true)
  }, [handleExploreService])

  const handleUpdateCardQty = useCallback((serviceId, delta) => {
    setModalCart(prev => {
      if (!prev) return []
      return prev.map(item => {
        if (item.id === serviceId) {
          const newQty = (item.quantity || 1) + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean)
    })
  }, [])


  // ── Super Admin Customer Web Edit Mode (Homepage) ──────────────────────
  // Reuses the SAME homepage config model/API this page already reads from
  // (config/homePageConfig.js -> GET/PUT /api/settings/homepage/, backed by
  // settings_hub.models.HomePageConfig and gated server-side by
  // RequireModuleAccess("cms","edit_sections")). No new model, no new API,
  // no second Customer Web -- this just lets Super Admin edit the SAME
  // Now sourced from the shared EditModeProvider (see main.jsx) instead of
  // a homepage-only local useState -- same variable names on purpose, so
  // every other line below that already reads homeEditMode/setHomeEditMode
  // keeps working unchanged, but the value is now shared with every other
  // page (turning it on here also turns it on in BookingPage.jsx, and
  // vice versa) and the ?preview=true / ?edit=true allowance now works
  // from any page, not just this one.
  const { canEdit: canEnterHomeEditMode, isEditMode: homeEditMode, setEditMode: setHomeEditMode } = useEditMode()
  const [savingHomeField, setSavingHomeField] = useState(false)
  const [heroImageModalOpen, setHeroImageModalOpen] = useState(false)
  const [offerImageModalIdx, setOfferImageModalIdx] = useState(null)

  const saveHomeConfigField = useCallback(async (path, value) => {
    // path is a dot-path into homeConfig, e.g. "hero.badge" or
    // "categories.0.title". Applies the edit locally first (instant visual
    // feedback, same as the Grocery/Product Edit Mode pattern already
    // shipped), then persists via the existing publish API.
    setHomeConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split(".")
      let node = next
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        if (node[k] === undefined || node[k] === null) node[k] = {}
        node = node[k]
      }
      node[keys[keys.length - 1]] = value

      setSavingHomeField(true)
      publishHomePageConfig(next)
        .catch(() => { })
        .finally(() => setSavingHomeField(false))

      // Also notify parent if in preview iframe
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "HOMEPAGE_CONFIG_CHANGED", config: next }, "*")
      }

      return next
    })
  }, [])

  // ── Hero Banner Carousel ────────────────────────────────────────────────
  // This is the actual "advertisement" -- a pure image per slide (like a
  // real ad banner an admin designs and uploads), NOT text composited by
  // code. The headline/subtitle/CTA to the left of it are the page's
  // functional header and stay static -- see the plain homeConfig.hero.*
  // reads in the JSX below, unrelated to slide rotation. Slide #1 is always
  // the base hero.heroImage; extra slides come from hero.slides (admin-
  // added via "+ Add Slide"), falling back to a few ready-made service
  // photos already shipped in /assets so a fresh install still shows a
  // real rotating banner instead of an empty box.
  const heroSlides = useMemo(() => {
    const base = {
      heroImage: homeConfig.hero?.heroImage || "/assets/hero_illustration.jpg",
      priceBadge: homeConfig.hero?.priceBadge || "",
      link: homeConfig.hero?.link || "",
    }
    const defaultExtra = [
      { heroImage: "/assets/hero_pro_cleaning_rect.jpg", priceBadge: "₹999", link: "?category=cleaning" },
      { heroImage: "/assets/hero_pro_appliance_rect.jpg", priceBadge: "₹399", link: "?category=appliance_repair" },
      { heroImage: "/assets/hero_pro_plumbing_rect.jpg", priceBadge: "₹299", link: "?category=plumbing" },
    ]
    const extra = Array.isArray(homeConfig.hero?.slides) && homeConfig.hero.slides.length > 0 ? homeConfig.hero.slides : defaultExtra
    return [base, ...extra]
  }, [homeConfig.hero])

  const [activeHeroSlide, setActiveHeroSlide] = useState(0)

  // Touch swipe support for hero banner
  const heroTouchStartRef = useRef(null)
  const handleHeroTouchStart = (e) => {
    if (e.targetTouches && e.targetTouches.length > 0) {
      heroTouchStartRef.current = e.targetTouches[0].clientX
    }
  }
  const handleHeroTouchEnd = (e) => {
    if (!heroTouchStartRef.current) return
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touchEnd = e.changedTouches[0].clientX
      const diff = heroTouchStartRef.current - touchEnd
      if (diff > 40) {
        setActiveHeroSlide((p) => (p + 1) % heroSlides.length)
      } else if (diff < -40) {
        setActiveHeroSlide((p) => (p - 1 + heroSlides.length) % heroSlides.length)
      }
    }
    heroTouchStartRef.current = null
  }

  // Touch swipe support for reviews on mobile
  const reviewTouchStartRef = useRef(null)
  const handleReviewTouchStart = (e) => {
    if (e.targetTouches && e.targetTouches.length > 0) {
      reviewTouchStartRef.current = e.targetTouches[0].clientX
    }
  }
  const handleReviewTouchEnd = (e) => {
    if (!reviewTouchStartRef.current) return
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touchEnd = e.changedTouches[0].clientX
      const diff = reviewTouchStartRef.current - touchEnd
      const reviewsList = homeConfig.testimonials?.reviews?.length ? homeConfig.testimonials.reviews : DEFAULT_HOME_PAGE_CONFIG.testimonials.reviews
      const len = reviewsList.length || 3
      if (diff > 40) {
        setTestimonialIdx((p) => (p + 1) % len)
      } else if (diff < -40) {
        setTestimonialIdx((p) => (p - 1 + len) % len)
      }
    }
    reviewTouchStartRef.current = null
  }

  useEffect(() => {
    if (activeHeroSlide >= heroSlides.length) setActiveHeroSlide(0)
  }, [heroSlides.length, activeHeroSlide])

  useEffect(() => {
    if (heroSlides.length <= 1 || homeEditMode) return
    const t = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4500)
    return () => clearInterval(t)
  }, [heroSlides.length, homeEditMode])

  const activeHeroSlideData = heroSlides[activeHeroSlide] || heroSlides[0] || {}

  // Reads/writes route to the base hero.* fields for slide #1 (preserving
  // existing edit behavior exactly), or hero.slides.<n-1>.<field> for any
  // additional slide -- same generic dot-path setter, no new save logic.
  const saveActiveHeroField = useCallback((field, value) => {
    if (activeHeroSlide === 0) {
      saveHomeConfigField(`hero.${field}`, value)
    } else {
      saveHomeConfigField(`hero.slides.${activeHeroSlide - 1}.${field}`, value)
    }
  }, [activeHeroSlide, saveHomeConfigField])

  const addHeroSlide = useCallback(() => {
    const next = [...(Array.isArray(homeConfig.hero?.slides) ? homeConfig.hero.slides : []), {
      heroImage: homeConfig.hero?.heroImage || "/assets/hero_illustration.jpg",
      priceBadge: "",
      link: "",
    }]
    saveHomeConfigField("hero.slides", next)
    setActiveHeroSlide(next.length) // jump to the newly added slide
  }, [homeConfig.hero, saveHomeConfigField])

  const removeActiveHeroSlide = useCallback(() => {
    if (activeHeroSlide === 0) return // base slide can't be removed, only edited
    const next = (homeConfig.hero?.slides || []).filter((_, i) => i !== activeHeroSlide - 1)
    saveHomeConfigField("hero.slides", next)
    setActiveHeroSlide(0)
  }, [activeHeroSlide, homeConfig.hero, saveHomeConfigField])

  // ── Promotional Offers row (Flash Sale / Festival / Refer & Earn style) ──
  // Config already existed (homeConfig.offers) and was editable in the
  // Homepage Builder admin screen, but was never actually rendered on the
  // live page -- wiring that up here, plus add/remove controls in place.
  const addOfferItem = useCallback(() => {
    const items = Array.isArray(homeConfig.offers?.items) ? homeConfig.offers.items : []
    const next = [...items, {
      id: `off-${Date.now()}`,
      image: "",
      title: "New Offer",
      link: "",
      enabled: true,
    }]
    saveHomeConfigField("offers.items", next)
  }, [homeConfig.offers, saveHomeConfigField])

  const removeOfferItem = useCallback((idx) => {
    const items = Array.isArray(homeConfig.offers?.items) ? homeConfig.offers.items : []
    saveHomeConfigField("offers.items", items.filter((_, i) => i !== idx))
  }, [homeConfig.offers, saveHomeConfigField])

  // ── "What do you need help with?" quick-category icon grid ──────────────
  // Same story as offers: config already existed (homeConfig.categories,
  // editable in the Homepage Builder), but this section was 100% hardcoded
  // and never actually read it. Wiring it up here, plus add/remove/edit
  // controls in place -- a fixed "More" tile (opens the All Services
  // drawer) is always appended after the configured ones.
  const [categoryImageModalIdx, setCategoryImageModalIdx] = useState(null)
  const homeCategories = Array.isArray(homeConfig.categories) && homeConfig.categories.length > 0
    ? homeConfig.categories
    : DEFAULT_HOME_PAGE_CONFIG.categories
  const addCategoryTile = useCallback(() => {
    const next = [...homeCategories, {
      id: `cat-${Date.now()}`,
      name: "New Category",
      image: "",
      link: "",
      enabled: true,
    }]
    saveHomeConfigField("categories", next)
  }, [homeCategories, saveHomeConfigField])
  const removeCategoryTile = useCallback((idx) => {
    saveHomeConfigField("categories", homeCategories.filter((_, i) => i !== idx))
  }, [homeCategories, saveHomeConfigField])

  // ── Customer Reviews / Testimonials row ──────────────────────────────────
  // Same story as offers: fully built + editable in the Homepage Builder,
  // never rendered. Wiring it up here.
  const addTestimonial = useCallback(() => {
    const reviews = Array.isArray(homeConfig.testimonials?.reviews) ? homeConfig.testimonials.reviews : []
    const next = [...reviews, {
      id: `rev-${Date.now()}`,
      initials: "NC",
      name: "New Customer",
      rating: 5,
      text: "Share what this customer said...",
      badgeColor: "bg-teal-500",
    }]
    saveHomeConfigField("testimonials.reviews", next)
  }, [homeConfig.testimonials, saveHomeConfigField])

  const removeTestimonial = useCallback((idx) => {
    const reviews = Array.isArray(homeConfig.testimonials?.reviews) ? homeConfig.testimonials.reviews : []
    saveHomeConfigField("testimonials.reviews", reviews.filter((_, i) => i !== idx))
  }, [homeConfig.testimonials, saveHomeConfigField])

  // ── Recommended For You row ──────────────────────────────────────────────
  // Pulled live from the catalog admin (public packages + categories, same
  // endpoints BookingPage.jsx and AllServicesDrawer already use) -- popular
  // packages first, so adding/marking a package "Popular" in the catalog
  // admin surfaces it here automatically.
  const CACHED_REC_ITEMS_KEY = 'calservices_recommended_items_cache';
  const [recommendedItems, setRecommendedItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHED_REC_ITEMS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  // Live catalog categories (Service Catalog admin > Categories) -- the
  // source of truth for the "5 Core Specialized Pillars" combined modal
  // below, so whatever the admin adds/removes/renames or uploads an image
  // for in Categories shows up here automatically, with no separate
  // homepage config to keep in sync.
  const [catalogCategories, setCatalogCategories] = useState([])
  // Live search index items dynamically populated from backend packages
  const [liveCatalogSearchItems, setLiveCatalogSearchItems] = useState([])
  // Tracks whether the real /catalog/public/categories/ fetch below has
  // settled. While it's still in flight, the "Home & Repair Services"
  // pillar grid shows a loading skeleton instead of the hardcoded CATEGORIES
  // fallback.
  const [catalogCategoriesLoading, setCatalogCategoriesLoading] = useState(true)
  useEffect(() => {
    Promise.all([
      apiRequest("/settings/catalog/public/packages/").catch(() => ({ success: false, data: [] })),
      apiRequest("/settings/catalog/public/categories/").catch(() => ({ success: false, data: [] })),
    ]).then(async ([pkgRes, catRes]) => {
      const pkgs = pkgRes?.success && Array.isArray(pkgRes.data) ? pkgRes.data : []
      let cats = catRes?.success && Array.isArray(catRes.data) ? catRes.data : []
      if (cats.length === 0) {
        try {
          const fallbackRes = await apiRequest("/catalog/categories/")
          if (fallbackRes?.success && Array.isArray(fallbackRes.data)) {
            cats = fallbackRes.data
          }
        } catch (_) {}
      }
      const catBySlug = {}
      cats.forEach((c) => { catBySlug[c.slug] = c })
      const sorted = [...pkgs].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
      const mapped = sorted.slice(0, 10).map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image || p.service_image,
        price: p.base_price,
        offerPrice: p.offer_price,
        duration: p.duration,
        categorySlug: p.category_slug,
        categoryRating: catBySlug[p.category_slug]?.rating,
        categoryJobs: catBySlug[p.category_slug]?.jobs_count_str,
        serviceName: p.service_name,
      }));
      setRecommendedItems(mapped);
      try {
        localStorage.setItem(CACHED_REC_ITEMS_KEY, JSON.stringify(mapped));
      } catch (_) {}

      // Build live search index directly from real active DB packages
      const searchItems = pkgs
        .filter((p) => p && p.name)
        .map((p) => {
          const cat = catBySlug[p.category_slug]
          const catName = cat?.name || p.service_name || "Services"
          return {
            id: String(p.id),
            slug: p.slug,
            title: p.name,
            name: p.name,
            category: catName,
            categoryId: p.category_slug,
            subTab: p.service_slug || null,
            sub_service_key: p.sub_service_key || null,
            price: p.offer_price ? `₹${Math.round(Number(p.offer_price))}` : (p.base_price ? `₹${Math.round(Number(p.base_price))}` : "Affordable"),
            badge: p.popular ? "Popular" : (p.tag || null),
            image: p.image || p.service_image || "",
            tags: [
              p.name,
              p.service_name,
              p.category_slug,
              p.duration,
              ...(Array.isArray(p.includes) ? p.includes.map(inc => typeof inc === "object" ? inc?.text || inc?.name || "" : String(inc || "")) : [])
            ].filter(Boolean)
          }
        })
      setLiveCatalogSearchItems(searchItems)

      const validServiceCats = [...cats]
        .filter((c) => c.is_active !== false && !isGroceryCatalogCategory(c))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((c) => ({
          ...c,
          id: c.id,
          name: c.name,
          label: c.name,
          slug: c.slug,
          serviceCategoryId: c.slug,
          photo: c.image,
          image: c.image,
          icon: c.icon,
        }))
      setCatalogCategories(validServiceCats)
      setCatalogCategoriesLoading(false)
    }).catch((err) => {
      console.error("Failed to load recommended items:", err)
      setCatalogCategoriesLoading(false)
    })
  }, [])

  // Live Service Categories Grid with CMS overlay & Grocery/Veggie preservation
  const displayCategories = useMemo(() => {
    const baseCats = Array.isArray(catalogCategories) && catalogCategories.length > 0 ? catalogCategories : []
    const cmsList = Array.isArray(homeConfig.categories) && homeConfig.categories.length > 0
      ? homeConfig.categories
      : (DEFAULT_HOME_PAGE_CONFIG.categories || [])

    const merged = baseCats.map((cat) => {
      const catSlug = String(cat.slug || cat.serviceCategoryId || cat.id || "").toLowerCase()
      const catName = String(cat.name || cat.label || "").toLowerCase()

      const cmsMatch = cmsList.find((c) => {
        if (!c) return false
        const cSlug = String(c.slug || c.id || "").toLowerCase()
        const cName = String(c.name || "").toLowerCase()
        const cLink = String(c.link || "").toLowerCase()
        return (
          cSlug === catSlug ||
          cName === catName ||
          cLink.includes(`category=${catSlug}`) ||
          (catSlug === "home_pest_control" && (cSlug.includes("clean") || cName.includes("clean"))) ||
          (catSlug === "ac_appliance" && (cSlug.includes("ac") || cName.includes("ac"))) ||
          (catSlug === "goods_transports" && (cSlug.includes("transport") || cSlug.includes("goods") || cName.includes("goods") || cName.includes("transport"))) ||
          (catSlug === "paintings" && (cSlug.includes("paint") || cName.includes("paint"))) ||
          (catSlug === "mason" && (cSlug.includes("mason") || cName.includes("mason")))
        )
      })

      const finalImage = cat.image || cat.photo || cmsMatch?.image || ""
      const finalLink = cmsMatch?.link || `?category=${encodeURIComponent(cat.slug || cat.id)}`
      const displayName = cat.name || cat.label || cmsMatch?.name || "Service"

      return {
        id: cat.id || cat.slug,
        slug: cat.slug || cat.serviceCategoryId || cat.id,
        name: displayName,
        image: finalImage,
        link: finalLink,
        icon: cat.icon,
        rawCat: cat,
      }
    })

    const groceryTile = cmsList.find((c) => {
      if (!c) return false
      const nameLower = String(c.name || "").toLowerCase()
      const linkLower = String(c.link || "").toLowerCase()
      return linkLower.includes("vegetable") || nameLower.includes("veggie") || nameLower.includes("grocer")
    })

    const finalTiles = [...merged]

    if (groceryTile) {
      finalTiles.push({
        id: groceryTile.id || "cat-groceries",
        slug: "vegetables",
        name: groceryTile.name || "Groceries & Veggies",
        image: groceryTile.image || "/assets/cat_food_health.jpg",
        link: groceryTile.link || "/vegetables",
        icon: "Carrot",
        isGrocery: true,
      })
    } else {
      finalTiles.push({
        id: "cat-groceries-default",
        slug: "vegetables",
        name: "Groceries & Veggies",
        image: "/assets/cat_food_health.jpg",
        link: "/vegetables",
        icon: "Carrot",
        isGrocery: true,
      })
    }

    return finalTiles
  }, [catalogCategories, homeConfig.categories])

  useEffect(() => {
    fetchPublishedHomePageConfig().then((cfg) => {
      if (cfg) setHomeConfig(cfg)
    })

    const handleHomepageUpdate = (e) => {
      if (e?.detail) setHomeConfig(e.detail)
    }
    window.addEventListener("calservices:homepage_updated", handleHomepageUpdate)

    const handleStorageChange = (e) => {
      if ((e.key === STORAGE_KEY || e.key === "calservices_homepage_config_v1" || e.key === "calservices_home_page_config") && e.newValue) {
        try {
          setHomeConfig(mergeWithDefaultConfig(JSON.parse(e.newValue)))
        } catch { }
      }
    }
    window.addEventListener("storage", handleStorageChange)

    const handleWindowMessage = (e) => {
      if (e.data?.type === "TOGGLE_EDIT_MODE") {
        setHomeEditMode(Boolean(e.data.enabled))
      } else if (e.data?.type === "HOMEPAGE_CONFIG_UPDATE" && e.data?.config) {
        setHomeConfig(e.data.config)
      } else if (e.data?.type === "NAVIGATE_PREVIEW_SCREEN") {
        const screen = e.data.screen
        if (screen === "pillars") {
          setIsAllServicesOpen(true)
        } else if (screen === "homepest" || screen === "subcategories") {
          navigate("?category=home_pest_control")
        } else if (screen === "kitchen") {
          navigate("?category=kitchen_cleaning")
        } else if (screen === "home") {
          navigate("/home?preview=true")
        }
      }
    }
    window.addEventListener("message", handleWindowMessage)

    return () => {
      window.removeEventListener("calservices:homepage_updated", handleHomepageUpdate)
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("message", handleWindowMessage)
    }
  }, [navigate])

  // Robust multi-token and fuzzy matching across all services + backend packages
  const filteredSearchResults = useMemo(() => {
    const rawQ = query.trim()
    if (!rawQ) {
      const topPicks = [
        "elec-fan-1",      // Ceiling Fan Installation (Electrical)
        "clean-1bhk",      // 1 BHK Full House Deep Cleaning (Cleaning)
        "hvac-fj-split",   // Foam & Power Jet AC Service — Split (AC)
        "plumb-tap-1",     // Tap Repair / Replacement (Plumbing)
        "log-truck",       // Mini Truck Hire (Logistics & Transport)
        "pest-cock",       // Cockroach Control Gel Treatment (Pest Control)
        "paint-full",      // Full House Painting Consultation (Painting)
        "fresh-vegetables",// Farm Fresh Vegetables Express (Produce)
      ]
      const curated = topPicks
        .map(id => ALL_SEARCHABLE_SERVICES.find(s => s.id === id))
        .filter(Boolean)
      return curated.length > 0 ? curated : ALL_SEARCHABLE_SERVICES.slice(0, 8)
    }

    // Clean and tokenize query (split by spaces, punctuation, dashes, ampersands)
    const normalize = (str) => {
      if (str == null) return ""
      if (typeof str === "object") {
        if (typeof str.name === "string") return normalize(str.name)
        if (typeof str.title === "string") return normalize(str.title)
        if (typeof str.text === "string") return normalize(str.text)
        return ""
      }
      return String(str)
        .toLowerCase()
        .replace(/[—\-_&/,.()|:]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    }

    const cleanQ = normalize(rawQ)
    const tokens = cleanQ.split(" ").filter(t => t.length > 0 && !["in", "and", "or", "the", "for", "a", "an", "of", "to", "with"].includes(t))
    const searchTokens = tokens.length > 0 ? tokens : [cleanQ]

    // Match helper for any candidate item
    const scoreItem = (item) => {
      if (!item) return 0
      const titleNorm = normalize(item.title || item.name)
      const catNorm = normalize(item.category)
      const subNorm = normalize(item.subTab || item.subCategory)
      const tagsNorm = (Array.isArray(item.tags) ? item.tags : [])
        .map(t => normalize(t))
        .filter(Boolean)
        .join(" ")
      const allText = `${titleNorm} ${catNorm} ${subNorm} ${tagsNorm}`

      // Exact or direct substring match on full query
      if (titleNorm === cleanQ) return 100
      if (titleNorm.includes(cleanQ)) return 80
      if (allText.includes(cleanQ)) return 60

      // Token matching score
      let matchCount = 0
      let titleMatchCount = 0
      for (const token of searchTokens) {
        if (titleNorm.includes(token)) {
          titleMatchCount++
          matchCount++
        } else if (allText.includes(token)) {
          matchCount++
        }
      }

      if (matchCount === searchTokens.length) {
        return 40 + (titleMatchCount * 10)
      } else if (matchCount > 0) {
        return matchCount * 10
      }
      return 0
    }

    // Combine dynamic backend packages with live search index and static catalog fallback
    const liveItems = Array.isArray(liveCatalogSearchItems) ? liveCatalogSearchItems : []
    const dynamicCatalogItems = []
    const seenIds = new Set()
    const seenTitles = new Set()

    liveItems.forEach((item) => {
      if (item.id) seenIds.add(String(item.id))
      if (item.slug) seenIds.add(item.slug)
      if (item.title) seenTitles.add(normalize(item.title))
    })

    if (packagesData && typeof packagesData === "object") {
      Object.entries(packagesData).forEach(([catId, pkgs]) => {
        if (Array.isArray(pkgs)) {
          pkgs.forEach(pkg => {
            if (pkg && pkg.name) {
              const catObj = catalogCategories.find(c => String(c.id) === String(catId) || c.slug === catId || c.serviceCategoryId === catId) || BOOKING_CATEGORIES.find(c => c.id === catId || c.slug === catId)
              const pkgId = pkg.slug || pkg.id
              if (!seenIds.has(String(pkgId)) && !seenTitles.has(normalize(pkg.name))) {
                dynamicCatalogItems.push({
                  id: pkgId,
                  title: pkg.name,
                  category: catObj?.name || "Services",
                  categoryId: catId,
                  subTab: pkg.subCategory || null,
                  price: pkg.price ? `₹${pkg.price}` : (pkg.base_price ? `₹${Math.round(Number(pkg.base_price))}` : "Affordable"),
                  badge: pkg.popular ? "Popular" : pkg.tag || null,
                  tags: [
                    pkg.name,
                    pkg.duration,
                    ...(Array.isArray(pkg.includes) ? pkg.includes.map(inc => typeof inc === "object" ? inc?.name || "" : String(inc || "")) : [])
                  ]
                })
                if (pkg.id) seenIds.add(String(pkg.id))
                if (pkg.slug) seenIds.add(pkg.slug)
                seenTitles.add(normalize(pkg.name))
              }
            }
          })
        }
      })
    }

    const nonDuplicateStatic = ALL_SEARCHABLE_SERVICES.filter(s => {
      if (seenIds.has(String(s.id))) return false
      if (seenTitles.has(normalize(s.title))) return false
      return true
    })

    const pool = [...liveItems, ...dynamicCatalogItems, ...nonDuplicateStatic]

    return pool
      .map(item => ({ item, score: scoreItem(item) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item)
      .slice(0, 10)
  }, [query, packagesData, liveCatalogSearchItems, catalogCategories])

  // Category match for broad search intent (e.g., "cleaning", "ac", "transport", "paint", "mason", "groceries")
  const matchedCategoryResults = useMemo(() => {
    const rawQ = query.trim().toLowerCase()
    if (!rawQ) return []

    const cleanQ = rawQ.replace(/[—\-_&/,.()|:]+/g, " ").replace(/\s+/g, " ").trim()
    const tokens = cleanQ.split(" ").filter(t => t.length > 0 && !["in", "and", "or", "the", "for", "a", "an", "of", "to", "with"].includes(t))
    const searchTokens = tokens.length > 0 ? tokens : [cleanQ]

    const candidates = [
      ...(Array.isArray(displayCategories) ? displayCategories : []),
      ...(Array.isArray(catalogCategories) ? catalogCategories : []),
      { id: "ac_appliance", name: "AC & Appliance Repair", slug: "ac_appliance", keywords: "ac air conditioner hvac fridge refrigerator washing machine microwave repair service" },
      { id: "home_pest_control", name: "Cleaning & Pest Control", slug: "home_pest_control", keywords: "cleaning deep clean bathroom kitchen sofa termite pest cockroach sanitize" },
      { id: "paintings", name: "Painting Services", slug: "paintings", keywords: "painting painter repaint interior exterior waterproof texture wall" },
      { id: "mason", name: "Masonry & Construction", slug: "mason", keywords: "mason masonry tiles flooring plaster brick civil repair construction" },
      { id: "goods_transports", name: "Goods & Transport", slug: "goods_transports", keywords: "truck mini truck tata ace 2 wheeler packers movers shifting courier transport logistics" },
      { id: "vegetables_groceries", name: "Fresh Produce & Groceries", slug: "vegetables_groceries", keywords: "vegetable veggies farm fresh grocery tomato onion potato fruits produce" },
    ]

    const results = []
    const seenSlugs = new Set()

    candidates.forEach(cat => {
      const slug = cat.slug || cat.id || cat.serviceCategoryId
      if (!slug || seenSlugs.has(slug)) return

      const nameNorm = (cat.name || cat.label || "").toLowerCase()
      const descNorm = (cat.description || "").toLowerCase()
      const kwNorm = (cat.keywords || "").toLowerCase()
      const combined = `${nameNorm} ${slug} ${descNorm} ${kwNorm}`

      let score = 0
      if (nameNorm === cleanQ || slug === cleanQ) score += 100
      else if (nameNorm.startsWith(cleanQ)) score += 80
      else if (nameNorm.includes(cleanQ)) score += 60
      else if (slug.includes(cleanQ)) score += 40

      searchTokens.forEach(tok => {
        if (nameNorm.includes(tok)) score += 25
        else if (combined.includes(tok)) score += 10
      })

      if (score > 0) {
        seenSlugs.add(slug)
        results.push({
          id: slug,
          slug: slug,
          name: cat.name || cat.label || slug,
          image: cat.image || cat.photo || "",
          score: score,
        })
      }
    })

    return results.sort((a, b) => b.score - a.score).slice(0, 2)
  }, [query, displayCategories, catalogCategories])

  const handleCategorySearchSelect = (cat) => {
    setIsSearchOpen(false)
    if (!cat) return
    const slug = cat.slug || cat.id
    if (slug === "vegetables_groceries" || slug === "vegetables" || slug === "groceries" || cat.name?.toLowerCase().includes("vegetable")) {
      navigate(routes.vegetables)
      return
    }
    navigate(`?category=${encodeURIComponent(slug)}`)
  }

  // Handle outside clicks to close search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  // Execute search item action
  const handleExecuteSearch = (item) => {
    setIsSearchOpen(false)
    if (!item) return

    if (item.action === "navigate" && item.url) {
      let targetUrl = item.url
      const safeCity = selectedCity || localStorage.getItem("calservice_user_city") || "Hosur"
      if (safeCity && targetUrl.includes("/hosur")) {
        const citySlug = safeCity.toLowerCase().replace(/\s+/g, "-")
        targetUrl = targetUrl.replace("/hosur", `/${citySlug}`)
      }
      navigate(targetUrl)
      return
    }

    if (item.action === "food_health" || item.action === "vegetables" || item.categoryId === "vegetables" || item.id === "fresh-vegetables" || item.title?.toLowerCase().includes("vegetable") || item.title?.toLowerCase().includes("grocer")) {
      navigate(routes.vegetables)
      return
    }

    if (item.categoryId) {
      let url = `?category=${encodeURIComponent(item.categoryId)}`
      if (item.subTab) {
        url += `&subtab=${encodeURIComponent(item.subTab)}&subTab=${encodeURIComponent(item.subTab)}`
      }
      if (item.sub_service_key) {
        url += `&group=${encodeURIComponent(item.sub_service_key)}`
      }
      navigate(url)
      return
    }

    if (item.action === "home_pest") {
      navigate("?category=home_pest_control")
    } else if (item.action === "ac_modal") {
      navigate("?category=ac_appliance")
    } else if (item.action === "elec_modal") {
      navigate("?category=electrician_plumbing_carpentry")
    } else {
      navigate("?category=home_pest_control")
    }
  }

  // Fallback or Enter key submission
  const goToBooking = () => {
    if (filteredSearchResults && filteredSearchResults.length > 0) {
      handleExecuteSearch(filteredSearchResults[0])
    } else if (query.trim()) {
      navigate(`/booking?search=${encodeURIComponent(query.trim())}`)
    } else {
      navigate("?category=cleaning")
    }
  }

  // Shared click-through for any admin-set banner/offer/category link (hero
  // slides, promotional offer cards, category tiles). A plain path/query
  // like "?category=cleaning" is always in-app. A full "https://" URL is
  // only opened in a new tab when it points at a DIFFERENT site -- if the
  // admin pastes a full link back to this same site (copied from the
  // address bar, or including the domain out of habit), it navigates in
  // place instead of leaving the app in a fresh tab. No link set at all
  // just falls back to the normal booking flow.
  const goToBannerLink = (link) => {
    if (!link) { goToBooking(); return }
    const trimmed = String(link).trim()
    if (
      trimmed === "/vegetables" ||
      trimmed === "/vegetables/" ||
      trimmed === "?category=vegetables" ||
      trimmed === "?category=vegetables_groceries"
    ) {
      navigate(routes.vegetables)
      return
    }
    if (
      trimmed === "/logistics" ||
      trimmed === "/logistics/" ||
      trimmed === "/goods" ||
      trimmed === "/transport" ||
      trimmed === "/goods-and-transport" ||
      trimmed === "/goods-and-transports" ||
      trimmed === "?openModal=goods" ||
      trimmed === "?openModal=transport" ||
      trimmed === "?openModal=logistics" ||
      trimmed === "?category=goods_transports" ||
      trimmed === "?category=goods_transport" ||
      trimmed.startsWith("?category=goods_transports") ||
      trimmed.startsWith("?category=goods_transport")
    ) {
      setIsGoodsModalOpen(true)
      return
    }
    let targetLink = trimmed
    if (targetLink.includes("openModal=ac")) targetLink = "?category=ac_appliance"
    else if (targetLink.includes("openModal=homepest") || targetLink.includes("openModal=subcategories")) targetLink = "?category=home_pest_control"
    else if (targetLink.includes("openModal=pillars")) targetLink = "?category=home_pest_control"

    if (/^https?:\/\//i.test(targetLink)) {
      try {
        const url = new URL(targetLink)
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search + url.hash)
          return
        }
      } catch {
        // Malformed URL -- fall through and let the browser handle it.
      }
      window.open(targetLink, "_blank", "noopener,noreferrer")
    } else {
      navigate(targetLink)
    }
  }

  const [isGoodsModalOpen, setIsGoodsModalOpen] = useState(
    () => location.state?.openGoodsModal ||
          searchParams.get("openModal") === "goods" ||
          searchParams.get("openModal") === "transport" ||
          searchParams.get("openModal") === "logistics" ||
          false
  )
  const [showTransportEstimatePicker, setShowTransportEstimatePicker] = useState(false)
  const [goodsModalServices, setGoodsModalServices] = useState([])
  const [goodsModalServicesLoading, setGoodsModalServicesLoading] = useState(true)
  useEffect(() => {
    if (!isGoodsModalOpen) return
    setGoodsModalServicesLoading(true)
    const hints = ["goods & transport", "goods and transport", "transport"]
    const match = catalogCategories.find((c) => hints.some((h) => (c.label || c.name || "").toLowerCase().includes(h)) || c.slug === "goods_transports" || c.slug === "goods_transport")
    const slug = match?.serviceCategoryId || match?.slug || "goods_transports"
    if (!slug) { setGoodsModalServices([]); setGoodsModalServicesLoading(false); return }
    apiRequest(`/catalog/sub-services/?category_slug=${encodeURIComponent(slug)}`)
      .then((res) => {
        setGoodsModalServices(res?.success && Array.isArray(res.data) ? res.data.filter((s) => s.is_active !== false) : [])
        setGoodsModalServicesLoading(false)
      })
      .catch((err) => {
        console.warn("Catalog sub-services unavailable for Goods & Transport modal:", err?.message || err)
        setGoodsModalServices([])
        setGoodsModalServicesLoading(false)
      })
  }, [isGoodsModalOpen, catalogCategories])

  // Admin-editable display overrides for the 3 fixed Goods & Transport
  // tiles (Mini Truck / 2-Wheeler / Packers & Movers). Those 3 keep routing
  // to their dedicated, purpose-built Hosur booking pages no matter what --
  // only their NAME and IMAGE become admin-driven here, matched by keyword
  // against whatever Service the admin adds under the Goods & Transport
  // category via the normal Catalog > Services admin screen. This is
  // deliberately display-only: these Service rows should carry no Packages,
  // since real pricing/booking for these 3 stays in the separate
  // `logistics` app (see seed_customer_facing_services.py's note on why
  // Goods & Transport was excluded from the generic catalog pricing path).
  // Any OTHER sub-service the admin adds beyond these 3 keywords still
  // appends as a brand-new tile through the existing logic below.
  const goodsTileOverrides = useMemo(() => {
    const find = (keywords) => goodsModalServices.find((s) => {
      const n = (s.name || "").toLowerCase()
      const sl = (s.slug || "").toLowerCase()
      return keywords.some((k) => n.includes(k) || sl.includes(k))
    })
    return {
      truck: find(["truck"]),
      two_wheeler: find(["wheeler"]),
      packers_movers: find(["packers", "movers"]),
    }
  }, [goodsModalServices])

  const [isFoodHealthModalOpen, setIsFoodHealthModalOpen] = useState(false)

  useEffect(() => {
    const modalParam = searchParams.get("openModal")
    if (modalParam) {
      if (modalParam === "pillars") {
        setIsAllServicesOpen(true)
      } else if (modalParam === "homepest" || modalParam === "subcategories") {
        navigate("?category=pest_control", { replace: true })
      } else if (modalParam === "ac") {
        navigate("?category=hvac", { replace: true })
      } else if (modalParam === "goods" || modalParam === "transport" || modalParam === "logistics") {
        setIsGoodsModalOpen(true)
      }
    }
  }, [searchParams, navigate])
  const [foodHealthSub, setFoodHealthSub] = useState(FOOD_HEALTH_SUB)
  const [selectedFoodSubModuleId, setSelectedFoodSubModuleId] = useState(
    () => location.state?.openFoodSubModuleId || (location.state?.openVegetablesModal ? "vegetables" : null)
  )
  const selectedFoodSubModule = useMemo(() => {
    return foodHealthSub.find((sub) => sub.id === selectedFoodSubModuleId) || null
  }, [foodHealthSub, selectedFoodSubModuleId])
  const [foodCart, setFoodCart] = useState(() => {
    if (location.state?.foodCart !== undefined) {
      return location.state.foodCart
    }
    try {
      const saved = localStorage.getItem("calservice_veg_food_cart")
      if (saved) return JSON.parse(saved)
    } catch { }
    return {}
  })
  const [foodOrderPlaced, setFoodOrderPlaced] = useState(false)
  const [variantModalItem, setVariantModalItem] = useState(null)

  // Persist vegetable cart state so items remain visible when closing/reopening
  useEffect(() => {
    try {
      localStorage.setItem("calservice_veg_food_cart", JSON.stringify(foodCart || {}))
    } catch { }
  }, [foodCart])

  useEffect(() => {
    if (location.state?.openVegetablesModal || location.state?.openFoodSubModuleId === "vegetables") {
      navigate(routes.vegetables, { replace: true })
      return
    }
    if (location.state?.openFoodSubModuleId || location.state?.openFoodHealthModal) {
      setIsFoodHealthModalOpen(true)
      setSelectedFoodSubModuleId(location.state?.openFoodSubModuleId || "groceries")
      if (location.state?.foodCart !== undefined) {
        setFoodCart(location.state.foodCart)
        try {
          localStorage.setItem("calservice_veg_food_cart", JSON.stringify(location.state.foodCart || {}))
        } catch { }
      }
      // Clear the temporary state from router history so future navigations don't accidentally re-trigger it
      navigate(".", { replace: true, state: {} })
    }
  }, [location.state, navigate])
  const [vegCategoryFilter, setVegCategoryFilter] = useState("All")
  const [vegSearchQuery, setVegSearchQuery] = useState("")
  const [vegApiItems, setVegApiItems] = useState(VEGETABLE_ITEMS)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [showVegCartDrawer, setShowVegCartDrawer] = useState(false)
  const [selectedRecipeVegetable, setSelectedRecipeVegetable] = useState(null)
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const vegTiming = getVegetableTimingInfo()
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [activeAccountTab, setActiveAccountTab] = useState("My Profile")
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false)
  const [activeLocationLabel, setActiveLocationLabel] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [zoneCheckResult, setZoneCheckResult] = useState(null)
  const [serviceAlertMessage, setServiceAlertMessage] = useState("")
  const [activeNav, setActiveNav] = useState("home")

  // Customer-scoped location synchronization
  useEffect(() => {
    let isMounted = true

    const syncLocationForCustomer = async () => {
      if (!user?.id) {
        // Guest user: reset customer location state
        setActiveLocationLabel(null)
        setZoneCheckResult(null)
        return
      }

      setIsLoadingLocation(true)
      try {
        // 1. Read customer-scoped selected address first
        const currentSelected = getCustomerSelectedAddress(user.id)
        const scopedLoc = getCustomerLocation(user.id)
        if (scopedLoc && isMounted) {
          setActiveLocationLabel(scopedLoc)
        }

        // 2. Query backend for this customer's saved addresses
        const res = await apiRequest("/auth/customer/addresses/")
        const addresses = res?.data || (Array.isArray(res) ? res : [])
        if (!isMounted) return

        if (Array.isArray(addresses) && addresses.length > 0) {
          // Find matching address for current selection, or fall back to default, or first
          let activeAddr = null
          if (currentSelected?.id) {
            activeAddr = addresses.find((a) => Number(a.id) === Number(currentSelected.id))
          }
          if (!activeAddr) {
            activeAddr = addresses.find((a) => a.is_default) || addresses[0]
          }

          const label = activeAddr.formatted_address || activeAddr.address_line1 || activeAddr.locality || ""
          if (label && isMounted) {
            setActiveLocationLabel(label)
            setCustomerSelectedAddress(user.id, activeAddr)
            setCustomerLocation(user.id, label)
            if (activeAddr.latitude && activeAddr.longitude) {
              verifyServiceZone(Number(activeAddr.latitude), Number(activeAddr.longitude), label)
            }
          }
        } else if (scopedLoc && isMounted) {
          setActiveLocationLabel(scopedLoc)
        } else {
          // No saved addresses for this customer: check customer profile last known location
          const lastLoc = user?.last_known_location || user?.lastKnownLocation
          const lastLocStr = typeof lastLoc === "string" ? lastLoc : (lastLoc?.label || "")
          if (lastLocStr && isMounted) {
            setActiveLocationLabel(lastLocStr)
            setCustomerLocation(user.id, lastLocStr)
          } else if (isMounted) {
            setActiveLocationLabel(null)
          }
        }
      } catch (err) {
        console.warn("Failed to sync customer location from backend:", err)
      } finally {
        if (isMounted) setIsLoadingLocation(false)
      }
    }

    syncLocationForCustomer()

    const handleAuthOrAddressChange = () => {
      syncLocationForCustomer()
    }

    window.addEventListener("calservice_auth_changed", handleAuthOrAddressChange)
    window.addEventListener("calservice_address_changed", handleAuthOrAddressChange)

    return () => {
      isMounted = false
      window.removeEventListener("calservice_auth_changed", handleAuthOrAddressChange)
      window.removeEventListener("calservice_address_changed", handleAuthOrAddressChange)
    }
  }, [user?.id])

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ["about-us", "professionals", "why-choose-us", "categories", "home"]
      const scrollPosition = window.scrollY + 180
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const top = el.offsetTop
          if (scrollPosition >= top) {
            setActiveNav(id)
            return
          }
        }
      }
      setActiveNav("home")
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (e, sectionId) => {
    e.preventDefault()
    setActiveNav(sectionId)
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Verify service zone for customer coordinates
  const verifyServiceZone = async (lat, lng, label) => {
    if (lat == null || lng == null) return
    try {
      const zoneRes = await apiRequest("/settings/service-zones/check/", {
        method: "POST",
        json: { lat, lng }
      })
      setZoneCheckResult(zoneRes)
    } catch (e) {
      // Fail open if endpoint is down
      const openRes = { in_zone: true, open_access: true, zone: null, available_services: [] }
      setZoneCheckResult(openRes)
    }
  }

  // Check if a service is enabled in customer's current zone
  // Check if a service is enabled in customer's current zone
  const isServiceAvailableInZone = useCallback((serviceNameOrSlug) => {
    if (!zoneCheckResult) return true
    if (zoneCheckResult.open_access) return true
    if (zoneCheckResult.in_zone === false) return false

    const allowed = zoneCheckResult.available_services
    if (!allowed || !Array.isArray(allowed) || allowed.length === 0) return true

    const slug = (serviceNameOrSlug || "")
      .toLowerCase()
      .trim()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-")
      .replace(/&/g, "and")

    const SLUG_MAPPINGS = {
      // Home Cleaning & Pest Control
      "home-services-and-pest-control": [
        "full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning",
        "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning"
      ],
      "home-services-&-pest-control": [
        "full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning",
        "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning"
      ],
      "home-cleaning-and-pest-control": [
        "full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning",
        "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning"
      ],
      "home-cleaning": ["full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "full-home-deep-clean", "cleaning"],
      "pest-control": ["cockroach-control", "termite-control", "ants-bed-bugs-control"],
      "kitchen-cleaning": ["kitchen-cleaning", "kitchen"],
      "sofa-cleaning": ["sofa-cleaning", "sofa"],
      "bathroom-cleaning": ["bathroom-cleaning", "bathroom"],
      "full-house-cleaning": ["full-house-cleaning", "full-home-deep-clean", "cleaning", "occupied-apartment"],
      "full-house-deep-cleaning": ["full-house-cleaning", "full-home-deep-clean"],
      "cockroach-and-termite-control": ["cockroach-control", "termite-control"],
      "cockroach-control": ["cockroach-control"],
      "termite-control": ["termite-control"],
      "ants-and-bed-bugs-control": ["ants-bed-bugs-control"],
      "ants-bed-bugs-control": ["ants-bed-bugs-control"],

      // Electrician, Plumbing & Carpentry
      "electrician-plumbing-and-carpentry": ["electrician", "plumbing", "carpentry"],
      "electrician-plumbing-&-carpentry": ["electrician", "plumbing", "carpentry"],
      "plumbing": ["plumbing"],
      "plumber": ["plumbing"],
      "plumber-services": ["plumbing"],
      "electrician": ["electrician"],
      "electrician-services": ["electrician"],
      "electrical": ["electrician"],
      "carpentry": ["carpentry"],
      "carpenter": ["carpentry"],
      "carpenter-services": ["carpentry"],
      "express-electrician-and-plumber": ["electrician", "plumbing"],

      // AC & Appliance
      "ac-and-appliance": ["ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave"],
      "ac-and-appliance-repair": ["ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave"],
      "ac-&-appliance": ["ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave"],
      "air-conditioner": ["ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation"],
      "ac": ["ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation"],
      "ac-master-service": ["ac-service-cleaning", "ac-repair"],
      "ac-service-and-cleaning": ["ac-service-cleaning", "ac-repair"],
      "ac-repair-and-service": ["ac-service-cleaning", "ac-repair"],
      "refrigerator": ["refrigerator"],
      "refrigerator-repair": ["refrigerator"],
      "refrigerator-service-and-repair": ["refrigerator"],
      // The admin's real AC & Appliance catalog now has each appliance as
      // its own flat Service (e.g. "Fridge", "AC Repair & Diagnostics"),
      // which slugify to names this zone-availability list was never built
      // around ("fridge" shares no characters with "refrigerator", so the
      // substring/token matching below silently blocks it). Map each real
      // service slug (both with and without "and", since slugify strips
      // "&" without a word substitute) back to the legacy service slug the
      // zone's available_services list actually contains.
      "fridge": ["refrigerator"],
      "ac-repair-diagnostics": ["ac-repair"],
      "ac-repair-and-diagnostics": ["ac-repair"],
      "ac-gas-refrigerant": ["ac-gas-refill"],
      "ac-gas-and-refrigerant": ["ac-gas-refill"],
      "ac-installation-uninstallation": ["ac-installation"],
      "ac-installation-and-uninstallation": ["ac-installation"],
      "ac-service-cleaning": ["ac-service-cleaning"],
      "microwave-oven-repair": ["microwave"],
      "washing-machine": ["washing-machine"],
      "washing-machine-repair": ["washing-machine"],
      "washing-machine-jet-service": ["washing-machine"],
      "water-purifier": ["ac-service-cleaning", "refrigerator", "washing-machine", "microwave"],
      "water-purifier-repair": ["ac-service-cleaning", "refrigerator", "washing-machine", "microwave"],
      "water-purifier-(ro)": ["ac-service-cleaning", "refrigerator", "washing-machine", "microwave"],
      "tv-and-display": ["tv-display"],
      "tv-display": ["tv-display"],
      "tv-and-home-theatre": ["tv-display"],
      "tv-service-and-repair": ["tv-display"],
      "microwave-oven": ["microwave"],
      "microwave": ["microwave"],
      "microwave-repair": ["microwave"],

      // Paintings
      "paintings": ["interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor"],
      "painting": ["interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor"],
      "interior-painting": ["interior-painting"],
      "exterior-painting": ["exterior-painting"],
      "waterproofing": ["waterproofing"],
      "wood-and-metal": ["wood-metal"],
      "texture-decor": ["texture-decor"],
      "interior-wall-painting": ["interior-painting"],

      // Mason
      "mason": ["brick-block-work", "plastering-wall-repair", "wall-partition-construction", "wall-breaking-demolition", "home-construction", "full-house-construction"],
      "masonry": ["brick-block-work", "plastering-wall-repair", "wall-partition-construction", "wall-breaking-demolition", "home-construction", "full-house-construction"],
      "home-construction": ["home-construction"],
      "full-house-construction": ["full-house-construction"],
      "brick-and-block-work": ["brick-block-work"],
      "plastering-and-wall-repair": ["plastering-wall-repair"],
      "wall-and-partition-construction": ["wall-partition-construction"],
      "wall-breaking-and-demolition": ["wall-breaking-demolition"],

      // Goods & Transport
      "goods-and-transports": ["truck", "two-wheeler", "packers-movers"],
      "goods-and-transport": ["truck", "two-wheeler", "packers-movers"],
      "goods-&-transports": ["truck", "two-wheeler", "packers-movers"],
      "goods": ["truck", "two-wheeler", "packers-movers"],
      "transport": ["truck", "two-wheeler", "packers-movers"],
      "house-shifting": ["packers-movers", "truck"],
      "single-item-transport": ["two-wheeler", "truck"],
      "truck": ["truck"],
      "mini-truck-transport": ["truck"],
      "mini-truck-(hosur)": ["truck"],
      "goods-transport-truck": ["truck"],
      "two-wheeler": ["two-wheeler"],
      "instant-bike-courier": ["two-wheeler"],
      "goods-transport-bike": ["two-wheeler"],
      "2-wheeler-(hosur)": ["two-wheeler"],
      "packers-and-movers": ["packers-movers"],
      "packers-movers": ["packers-movers"],
      "goods-transport-packers": ["packers-movers"],
      "packers-and-movers-(hosur)": ["packers-movers"],
      "vegetables": ["vegetables", "farm-fresh-vegetable"],
      "vegetable": ["vegetables", "farm-fresh-vegetable"],
      "vegetables-quick-delivery": ["vegetables", "farm-fresh-vegetable"],
      "fresh-vegetables": ["vegetables", "farm-fresh-vegetable"],
      "farm-fresh-vegetable": ["vegetables", "farm-fresh-vegetable"],
      "farm-fresh-vegetables": ["vegetables", "farm-fresh-vegetable"],
      "groceries": ["groceries"],
    }

    const targetList = SLUG_MAPPINGS[slug] || [slug]
    const directMatch = targetList.some(target =>
      allowed.some(allowedSlug => {
        const aNorm = allowedSlug.toLowerCase().replace(/_/g, "-")
        return aNorm === target || aNorm.includes(target) || target.includes(aNorm)
      })
    )
    if (directMatch) return true

    // Safe token matching with minimum token length 4 (prevents 'ac' matching inside 'packers')
    const rTokens = slug.split("-").filter(t => t.length >= 4)
    return allowed.some(allowedSlug => {
      const aTokens = allowedSlug.toLowerCase().replace(/_/g, "-").split("-").filter(t => t.length >= 4)
      return rTokens.some(rt => aTokens.includes(rt))
    })
  }, [zoneCheckResult])

  const showUnavailableServiceAlert = (serviceName) => {
    const zoneName = zoneCheckResult?.zone?.name || "your area"
    setServiceAlertMessage(`⚠️ ${serviceName} is currently not available in ${zoneName}. Please choose another service or update your location.`)
    setTimeout(() => setServiceAlertMessage(""), 5000)
  }

  useEffect(() => {
    async function loadCatalog() {
      try {
        const svcRes = await apiRequest("/catalog/services/")
        if (svcRes.success) {
          const pkgs = {}
          svcRes.data.forEach(s => {
            const cid = s.category.toString()
            if (!pkgs[cid]) pkgs[cid] = []
            pkgs[cid].push({
              ...s,
              id: s.id.toString(),
              category: s.category.toString(),
              price: parseFloat(s.price),
              priceStr: "₹" + s.price,
              duration: s.duration || "1 hr",
              payment_policy: s.payment_policy,
              image: s.image || "",
              includes: Array.isArray(s.includes) && s.includes.length > 0 ? s.includes : ["Standard inclusions"],
              excludes: Array.isArray(s.excludes) ? s.excludes : [],
              popular: !!s.popular,
              tag: s.tag || ""
            })
          })
          setPackagesData(pkgs)
        }
      } catch (err) {
        // Catalog load failed — packagesData stays null; ModernServiceCatalogView handles its own fetch
      }
    }
    loadCatalog()
  }, [])

  useEffect(() => {
    // Only detect live GPS for guest users who do not have an active location set yet
    if (user?.id || activeLocationLabel) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          try {
            const display = await getAddress(lat, lng)
            if (display && !activeLocationLabel) {
              setActiveLocationLabel(display)
            }
            await verifyServiceZone(lat, lng, display)
          } catch (e) { }
        },
        () => {
          // Graceful fallback for location denial/timeout
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      )
    }
  }, [user?.id, activeLocationLabel])

  // Helper to dynamically categorize vegetable items based on their names
  const getVegetableCategory = (pkgName) => {
    const lowerName = pkgName.toLowerCase()
    if (
      lowerName.includes("coriander") ||
      lowerName.includes("curry leaves") ||
      lowerName.includes("karuvepillai") ||
      lowerName.includes("mint") ||
      lowerName.includes("pudina") ||
      lowerName.includes("pudhina") ||
      lowerName.includes("lettuce") ||
      lowerName.includes("rosemary") ||
      lowerName.includes("drumstick") ||
      lowerName.includes("spinach") ||
      lowerName.includes("keerai") ||
      lowerName.includes("palak") ||
      lowerName.includes("amaranthus") ||
      lowerName.includes("methi") ||
      lowerName.includes("fenugreek") ||
      lowerName.includes("neem") ||
      lowerName.includes("veppilai") ||
      lowerName.includes("basil") ||
      lowerName.includes("sprouts") ||
      lowerName.includes("moringa") ||
      lowerName.includes("spring onion")
    ) {
      return "Herbs & Leafy"
    }
    if (
      lowerName.includes("ginger") ||
      lowerName.includes("inji") ||
      lowerName.includes("garlic") ||
      lowerName.includes("poondu") ||
      lowerName.includes("turmeric") ||
      lowerName.includes("manjal") ||
      lowerName.includes("green chilli") ||
      lowerName.includes("pachai milaga")
    ) {
      return "Herbs & Seasoning"
    }
    if (
      lowerName.includes("bitter gourd") ||
      lowerName.includes("pavakkai") ||
      lowerName.includes("bottle gourd") ||
      lowerName.includes("surakkai") ||
      lowerName.includes("suraikkai") ||
      lowerName.includes("ridge gourd") ||
      lowerName.includes("peerangai") ||
      lowerName.includes("snake gourd") ||
      lowerName.includes("pudalangai") ||
      lowerName.includes("ash gourd") ||
      lowerName.includes("pusanikkai") ||
      lowerName.includes("pointed gourd") ||
      lowerName.includes("ivy gourd") ||
      lowerName.includes("kovakkai") ||
      lowerName.includes("radish") ||
      lowerName.includes("mullangi") ||
      lowerName.includes("beetroot") ||
      lowerName.includes("sweet potato") ||
      lowerName.includes("chakkara") ||
      lowerName.includes("sakkaraivalli") ||
      lowerName.includes("colocasia") ||
      lowerName.includes("seppankizhangu") ||
      lowerName.includes("zucchini") ||
      lowerName.includes("chow chow") ||
      lowerName.includes("knol khol") ||
      lowerName.includes("nookal") ||
      lowerName.includes("banana stem") ||
      lowerName.includes("vazhai") ||
      lowerName.includes("vazhakkai")
    ) {
      return "Gourds & Roots"
    }
    if (
      lowerName.includes("organic") ||
      lowerName.includes("brinjal") ||
      lowerName.includes("kathirikkai") ||
      lowerName.includes("kathirikai") ||
      lowerName.includes("chilli") ||
      lowerName.includes("capsicum") ||
      lowerName.includes("milagai") ||
      lowerName.includes("milagaai") ||
      lowerName.includes("bell pepper") ||
      lowerName.includes("beans") ||
      lowerName.includes("avarakkai") ||
      lowerName.includes("kothavarangai") ||
      lowerName.includes("karamani") ||
      lowerName.includes("cauliflower") ||
      lowerName.includes("pookosu") ||
      lowerName.includes("cabbage") ||
      lowerName.includes("muttaikose") ||
      lowerName.includes("muttakose") ||
      lowerName.includes("broccoli") ||
      lowerName.includes("mushroom") ||
      lowerName.includes("kaalan") ||
      lowerName.includes("pumpkin") ||
      lowerName.includes("disco") ||
      lowerName.includes("peas") ||
      lowerName.includes("pattani") ||
      lowerName.includes("amla") ||
      lowerName.includes("nellika") ||
      lowerName.includes("papaya") ||
      lowerName.includes("sweet corn") ||
      lowerName.includes("baby corn") ||
      lowerName.includes("cholam")
    ) {
      return "Organic & Exotic"
    }
    return "Daily Essentials"
  }

  // Fetch live sub-services (Groceries, Vegetables) under vegetables_groceries category
  useEffect(() => {
    apiRequest("/catalog/sub-services/?category_slug=vegetables_groceries")
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const apiServices = res.data.map((svc) => ({
            id: svc.slug, // e.g. "vegetables", "groceries"
            db_id: svc.id,
            name: svc.name,
            desc: svc.description,
            tagline: svc.description,
            badge: svc.slug === "groceries" ? "Coming Soon" : "8-min Farm Express",
            image: svc.image || (svc.slug === "groceries" ? "/mockups/groceries_realistic.png" : "/mockups/vegetables_realistic.png"),
            items: svc.slug === "groceries" ? GROCERY_ITEMS : VEGETABLE_ITEMS,
          }))

          // Fetch active vegetable packages
          apiRequest("/catalog/services/?service_slug=vegetables&status=ACTIVE")
            .then((pkgRes) => {
              if (pkgRes.success && Array.isArray(pkgRes.data) && pkgRes.data.length > 0) {
                const apiVegs = pkgRes.data.map((pkg) => {
                  const price = Math.round(Number(pkg.price || pkg.base_price) || 0)
                  const mrp = pkg.offer_price ? Math.round(Number(pkg.offer_price) || 0) : null
                  const discount = pkg.tag || (mrp && mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : "")
                  const opts = getVegetableOptions(pkg.name)
                  return {
                    id: pkg.id,
                    name: pkg.name,
                    unit: pkg.duration || "1 unit",
                    price: price,
                    mrp: mrp,
                    discount: discount,
                    delivery: "8 MINS",
                    category: getVegetableCategory(pkg.name),
                    image: pkg.image || null,
                    options: opts || undefined,
                  }
                })
                setVegApiItems(apiVegs)
                setFoodHealthSub(
                  apiServices.map((sub) =>
                    sub.id === "vegetables" ? { ...sub, items: apiVegs } : sub
                  )
                )
              } else {
                setFoodHealthSub(
                  apiServices.map((sub) =>
                    sub.id === "vegetables" ? { ...sub, items: VEGETABLE_ITEMS } : sub
                  )
                )
              }
            })
            .catch(() => {
              setFoodHealthSub(
                apiServices.map((sub) =>
                  sub.id === "vegetables" ? { ...sub, items: VEGETABLE_ITEMS } : sub
                )
              )
            })
        }
      })
      .catch((err) => {
        console.error("Failed to load sub-services:", err)
      })
  }, [])

  useEffect(() => {
    if (location.state?.openHomePestModal) {
      navigate("?category=pest_control", { replace: true, state: {} })
    } else if (location.state?.openAcModal) {
      navigate("?category=hvac", { replace: true, state: {} })
    } else if (location.state?.openElecModal) {
      navigate("?category=electrical", { replace: true, state: {} })
    } else if (location.state?.openGoodsModal) {
      setIsGoodsModalOpen(true)
      navigate(".", { replace: true, state: {} })
    } else if (location.state?.openAccountTab) {
      // HS-A-03: deep-linkable customer account area. Routes like /account/bookings
      // redirect here with state={{ openAccountTab: "My Bookings" }} so a customer
      // can be sent a real, bookmarkable/shareable URL that lands them on a specific
      // account tab instead of only being reachable via the header account button.
      setActiveAccountTab(location.state.openAccountTab)
      setShowAccountPortal(true)
      navigate(".", { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const handleCloseCategory = () => {
    setModalCart(prev => prev.filter(c => c.id && String(c.id).includes("mason") === false && String(c.id).includes("paint") === false));
    setIsGoodsModalOpen(false)
    setShowTransportEstimatePicker(false)
    setIsFoodHealthModalOpen(false)
    navigate("/home", { replace: true, state: {} })
  }

  const resolveCartArg = (cartArg) => {
    return Array.isArray(cartArg) ? cartArg : (Array.isArray(modalCart) ? modalCart : [])
  }

  const cleanConsultationItems = (cartArray) => {
    const list = resolveCartArg(cartArray);
    return list.filter(c => c && typeof c === "object" && c.categoryName !== "Painting" && c.categoryName !== "Mason" && c.id && typeof c.id === "string" && String(c.id).includes("paint") === false && String(c.id).includes("mason") === false);
  };

  const goToLogin = () => setShowCustomerEntryModal(true)
  const goToCategoryServices = (serviceCategoryId, subTabName) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    let url = serviceCategoryId ? `${routes.booking_services}?category=${serviceCategoryId}` : routes.booking_services;
    if (subTabName) {
      const encoded = encodeURIComponent(subTabName);
      url += `&subtab=${encoded}&subTab=${encoded}`;
    }
    navigate(url);
  };

  // Category clicked on this page opens the existing package/services
  // popup right here, instead of navigating to the old BookingPage UI.
  const activeCategoryId = searchParams.get("category")
  const activeSubTabParam = searchParams.get("subtab")
  const activeCategory = activeCategoryId
    ? (catalogCategories.find(c =>
      c.slug === activeCategoryId ||
      String(c.id) === String(activeCategoryId) ||
      c.serviceCategoryId === activeCategoryId ||
      c.slug?.toLowerCase() === activeCategoryId.toLowerCase()
    ) || BOOKING_CATEGORIES.find(c =>
      c.id === activeCategoryId ||
      c.slug === activeCategoryId ||
      c.id === `${activeCategoryId}_cleaning`
    ) || { id: activeCategoryId, slug: activeCategoryId, name: activeCategoryId.replace(/_/g, " ") })
    : null

  // Always reset scroll to top when category changes
  useEffect(() => {
    if (activeCategoryId) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [activeCategoryId]);

  // "Farm-Fresh Vegetables & Groceries" is a quick-commerce grocery module,
  // not an on-demand service booking category -- it has its own dedicated
  // page (VegetableFullScreenPage at /vegetables) with real cart/checkout.
  // If it's ever reached via the generic ?category=... booking route (e.g.
  // an admin-added catalog category, an old link, or browser back/forward),
  // redirect to the real page instead of falling through to the booking
  // modal's appliance-repair tab logic, which has no matching branch for it.
  useEffect(() => {
    if (!activeCategoryId) return
    const idLower = activeCategoryId.toLowerCase()
    const nameLower = (activeCategory?.name || "").toLowerCase()
    const isVegetablesCategory =
      idLower.includes("vegetable") || idLower.includes("grocery") || idLower.includes("groceries") ||
      nameLower.includes("vegetable") || nameLower.includes("grocery") || nameLower.includes("groceries")
    if (isVegetablesCategory) {
      navigate(routes.vegetables, { replace: true })
      return
    }

    // Goods & Transport is a dedicated logistics module with its own specialized
    // booking flows (Two-Wheeler, Mini Truck, Packers & Movers) rather than a generic
    // home service catalog package list. If reached via ?category=goods_transports
    // (e.g. from All Services drawer or a direct link), route to the appropriate GT flow
    // rather than falling through to generic appliance/cleaning services.
    const isGtCategory =
      idLower.includes("goods") || idLower.includes("transport") || idLower.includes("logistics") || idLower === "gt" ||
      nameLower.includes("goods") || nameLower.includes("transport") || nameLower.includes("logistics")
    if (isGtCategory) {
      const sub = (activeSubTabParam || "").toLowerCase()
      if (sub.includes("two-wheeler") || sub.includes("2-wheeler") || sub.includes("bike")) {
        navigate(routes.two_wheeler_booking_hosur)
      } else if (sub.includes("mini-truck") || sub.includes("truck")) {
        navigate(routes.truck_booking_hosur)
      } else if (sub.includes("packer") || sub.includes("mover")) {
        navigate(routes.packers_movers_booking_hosur)
      } else {
        setIsGoodsModalOpen(true)
        navigate("/home", { replace: true, state: {} })
      }
    }
  }, [activeCategoryId, activeSubTabParam, activeCategory, navigate])

  // Hot reload services catalog when category choice becomes active
  useEffect(() => {
    if (activeCategory) {
      apiRequest("/catalog/services/")
        .then(svcRes => {
          if (svcRes && svcRes.success) {
            const pkgs = {}
            svcRes.data.forEach(s => {
              const cid = s.category.toString()
              if (!pkgs[cid]) pkgs[cid] = []
              pkgs[cid].push({
                ...s,
                id: s.id.toString(),
                category: s.category.toString(),
                price: parseFloat(s.price),
                priceStr: "₹" + s.price,
                duration: s.duration || "1 hr",
                payment_policy: s.payment_policy,
                image: s.image || "",
                includes: Array.isArray(s.includes) && s.includes.length > 0 ? s.includes : ["Standard inclusions"],
                excludes: Array.isArray(s.excludes) ? s.excludes : [],
                popular: !!s.popular,
                tag: s.tag || ""
              })
            })
            setPackagesData(pkgs)
          }
        })
        .catch(err => console.error("Failed to hot-reload services:", err));
    }
  }, [activeCategory]);

  // Close popup on Escape key and prevent background scroll when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsGoodsModalOpen(false)
        setIsElecModalOpen(false)
        setIsAcModalOpen(false)
        setIsHomePestModalOpen(false)
        setIsForYouModalOpen(false)
        setIsFoodHealthModalOpen(false)
        setIsHomeServicesCombinedModalOpen(false)
      }
    }
    if (isGoodsModalOpen || isFoodHealthModalOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isGoodsModalOpen, isFoodHealthModalOpen])

  const SEARCH_ROTATING_SERVICES = useMemo(() => [
    "AC Repair & Servicing",
    "Kitchen Deep Cleaning",
    "Sofa Shampooing",
    "Bathroom Sanitization",
    "Plumbing Leak Repair",
    "Fan & Electrical Service",
    "Pest Control Treatment",
    "Washing Machine Repair"
  ], []);

  const [searchRotateIdx, setSearchRotateIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchRotateIdx((prev) => (prev + 1) % SEARCH_ROTATING_SERVICES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [SEARCH_ROTATING_SERVICES.length]);

  // Build a flat searchable catalog from the live packagesData (real DB packages already
  // loaded above). This ensures the in-catalog search box reflects the current admin
  // catalog with real names, prices, and category associations -- not stale hardcoded values.
  const allServicesCatalog = useMemo(() => {
    if (packagesData && Object.keys(packagesData).length > 0) {
      const items = []
      Object.entries(packagesData).forEach(([catId, pkgs]) => {
        const cat = catalogCategories.find(c => String(c.id) === String(catId) || c.serviceCategoryId === catId)
        const catName = cat?.name || cat?.label || catId
        const catSlug = cat?.slug || cat?.serviceCategoryId || catId
        pkgs.forEach(pkg => {
          items.push({
            id: pkg.id,
            name: pkg.name || "",
            price: pkg.price || 0,
            categoryName: catName,
            image: pkg.image || "",
            catId: catSlug,
          })
        })
      })
      return items
    }
    // Fallback while packagesData loads
    return [
      { id: "kc-1", name: "Kitchen Cleaning", price: 999, categoryName: "Home Cleaning", image: "/mockups/kitchen_basic_cleaning_card.png", catId: "cleaning" },
      { id: "bc-1", name: "Bathroom Deep Cleaning", price: 499, categoryName: "Home Cleaning", image: "/mockups/bathroom_cleaning.png", catId: "cleaning" },
      { id: "ac-1", name: "AC Service & Cleaning", price: 599, categoryName: "AC & Appliance", image: "", catId: "hvac" },
      { id: "pc-1", name: "Pest Control", price: 699, categoryName: "Pest Control", image: "/mockups/pest_control_header.jpg", catId: "pest_control" },
    ]
  }, [packagesData, catalogCategories]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allServicesCatalog.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.categoryName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allServicesCatalog]);

  if (activeCategoryId) {
    const displayLocationText = activeLocationLabel ||
      (typeof user?.last_known_location === "string" ? user?.last_known_location : user?.last_known_location?.label) ||
      (typeof user?.lastKnownLocation === "string" ? user?.lastKnownLocation : user?.lastKnownLocation?.label) ||
      user?.address || "Select Location";

    return (
      <>
        <div className="min-h-screen bg-[#F7FAF9] text-slate-800 flex flex-col" style={{ animation: "fadeUp 0.4s ease both" }}>
          {/* Urban Style Header for Service Choosing View */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-2xs">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

              {/* Logo & Urban Location Selector Pill */}
              <div className="flex items-center gap-3 sm:gap-6">
                <Logo />

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                {/* Location Selector Pill */}
                <button
                  type="button"
                  onClick={() => setShowLocationPickerModal(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-white text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs max-w-[200px] sm:max-w-[280px] truncate"
                  title="Select Location"
                >
                  <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="truncate">{displayLocationText}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
                </button>
              </div>

              {/* Urban Style Service Search Box (Matching exact screenshot structure & animated rotating text) */}
              <div className="relative max-w-[340px] w-full hidden sm:block">
                <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-emerald-500 rounded-xl px-3.5 py-2 shadow-2xs transition-all">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none" />

                  <div className="relative flex-1 flex items-center min-w-0">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none z-10"
                    />
                    {!query && (
                      <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden select-none">
                        <span className="text-xs font-medium text-slate-400 mr-1 shrink-0">Search for</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={searchRotateIdx}
                            initial={{ opacity: 0, y: 7 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -7 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="text-xs font-bold text-slate-500 truncate"
                          >
                            '{SEARCH_ROTATING_SERVICES[searchRotateIdx]}'...
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1.5 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Live Search Results Dropdown (Visible one-by-one with image, category, and price) */}
                <AnimatePresence>
                  {query.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-80 overflow-y-auto z-50 p-2 space-y-1"
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map((svc) => (
                          <div
                            key={svc.id}
                            onClick={() => {
                              setQuery("");
                              if (activeCategoryId !== svc.catId) {
                                navigate(`/booking/services?category=${svc.catId}`);
                              }
                            }}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {svc.image && (
                                <img src={svc.image} alt={svc.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-slate-800 truncate group-hover:text-emerald-700">{svc.name}</div>
                                <div className="text-[10px] font-bold text-emerald-600">{svc.categoryName}</div>
                              </div>
                            </div>
                            <div className="text-xs font-black text-slate-900 shrink-0 ml-2">
                              ₹{svc.price}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs font-bold text-slate-400">
                          No services matching "{query}"
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* My Bookings Button */}
              <button
                type="button"
                id="category-my-bookings-btn"
                onClick={() => {
                  setActiveAccountTab("My Bookings");
                  setShowAccountPortal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-600 bg-white text-slate-700 hover:text-emerald-700 font-bold text-xs shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                <span>My Bookings</span>
              </button>

            </div>
          </header>

          {/* Full Page View Wrapper */}
          <main className="flex-1 w-full">
            {activeCategory && (
              <ModernServiceCatalogView
                category={activeCategory}
                cart={modalCart}
                setCart={setModalCart}
                packagesData={packagesData}
                displayLocationText={displayLocationText}
                onOpenAddressPicker={() => setShowLocationPickerModal(true)}
                onClose={handleCloseCategory}
                onCheckout={(customCart) => {
                  const finalCart = resolveCartArg(customCart);
                  setModalCart(finalCart);
                  navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                }}
              />
            )}
          </main>
        </div>
        <BkStyles />

        {showLocationPickerModal && (
          <SelectServiceAddressDrawer
            isOpen={showLocationPickerModal}
            onClose={() => setShowLocationPickerModal(false)}
            currentAddress={activeLocationLabel}
            onSelectAddress={async (locObj) => {
              setShowLocationPickerModal(false)
              if (locObj) {
                const labelStr = typeof locObj === "string" ? locObj : (locObj?.formatted_address || locObj?.locality || locObj?.city || "")
                setActiveLocationLabel(labelStr)
                const detectedCity = locObj?.city || (locObj?.locality ? locObj.locality : null) || (typeof labelStr === "string" ? labelStr.split(",")[0]?.trim() : "")
                if (detectedCity) {
                  setSelectedCity(detectedCity)
                  localStorage.setItem("calservice_user_city", detectedCity)
                }
                if (user?.id) {
                  setCustomerLocation(user.id, labelStr)
                  setCustomerSelectedAddress(user.id, locObj)
                }
                if (locObj.latitude && locObj.longitude) {
                  const coords = { lat: Number(locObj.latitude), lng: Number(locObj.longitude) }
                  await verifyServiceZone(coords.lat, coords.lng, labelStr)
                }
                if (user) {
                  try {
                    await apiUpdateCustomerLastLocation({
                      label: labelStr,
                      latitude: locObj.latitude,
                      longitude: locObj.longitude,
                      detected_at: new Date().toISOString()
                    })
                  } catch (e) { }
                  if (typeof refreshMe === "function") refreshMe()
                }
              }
            }}
          />
        )}

        <AnimatePresence>
          {showAccountPortal && (
            <CustomerAccountModal
              activeTab={activeAccountTab}
              onChangeTab={setActiveAccountTab}
              onClose={() => setShowAccountPortal(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--sevo-bg)] text-[var(--sevo-text-primary)] antialiased font-sans transition-colors duration-200 pb-24 lg:pb-0" style={{ animation: "fadeUp 0.4s ease both" }}>
        {/* ── 1. Top Announcement Bar ─────────────────────────── */}
        {/* <div className="bg-[#F8FAF9] dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-xs py-2 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-[#0B8F7A] text-white font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider shrink-0">
                SUMMER OFFER
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold truncate text-[11px] sm:text-xs">
                Up to 40% OFF on AC Service &amp; Cleaning Services
              </span>
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    setActiveAccountTab("Wallet & Offers")
                    setShowAccountPortal(true)
                  } else {
                    navigate(routes.offers || "/marketing/offers")
                  }
                }}
                className="text-[#0B8F7A] hover:text-[#087362] font-black text-[11px] sm:text-xs shrink-0 flex items-center gap-0.5 hover:underline cursor-pointer ml-1"
              >
                <span>View Offers</span>
                <span>→</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("why-choose-us")
                  if (el) el.scrollIntoView({ behavior: "smooth" })
                }}
                className="flex items-center gap-1 hover:text-[#0B8F7A] transition-colors cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#0B8F7A]" />
                <span>Download App</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <Link
                to={routes.contact_us || "/contact"}
                className="hover:text-[#0B8F7A] transition-colors cursor-pointer"
              >
                Partner with Us
              </Link>
            </div>
          </div>
        </div> */}

        {/* ── 2. Main Brand Header ─────────────────────────── */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-6">
            {/* Left: Official SEVO Brand Logo & Location Pill */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-2 select-none cursor-pointer group shrink-0" onClick={() => navigate(routes.landing)}>
                <img
                  src="/assets/sevo_emblem_transparent.png"
                  alt="SEVO Emblem"
                  className="h-8.5 sm:h-9 w-auto shrink-0 object-contain group-hover:scale-105 transition-transform"
                  style={{ height: '34px', width: 'auto' }}
                />
                <img
                  src="/assets/sevo_text_logo.png"
                  alt="SEVO"
                  className="shrink-0 object-contain dark:hidden hidden sm:block"
                  style={{ height: '18px', width: 'auto', maxHeight: '18px' }}
                />
                <img
                  src="/assets/sevo_text_logo_white.png"
                  alt="SEVO"
                  className="shrink-0 object-contain hidden dark:sm:block"
                  style={{ height: '18px', width: 'auto', maxHeight: '18px' }}
                />
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

              {/* Location Selector Pill with Auto-detected Badge */}
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowLocationPickerModal(true)}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#0B8F7A] text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs min-w-0 max-w-[120px] min-[360px]:max-w-[150px] min-[400px]:max-w-[180px] sm:max-w-[220px] truncate"
                  title="Change Location"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0B8F7A]" />
                  <span className="truncate">
                    {(() => {
                      if (isLoadingLocation) return "Loading..."
                      if (activeLocationLabel) return activeLocationLabel
                      const locObj = user?.last_known_location || user?.lastKnownLocation
                      if (locObj) {
                        if (typeof locObj === "string" && locObj.trim()) return locObj
                        if (locObj.label) return locObj.label
                      }
                      if (user?.address) return user.address
                      return "Bengaluru, 560001"
                    })()}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
                </button>
                {Boolean(activeLocationLabel) && (
                  <span className="hidden md:inline-flex items-center bg-emerald-50 dark:bg-emerald-950/40 text-[#0B8F7A] dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800 shrink-0">
                    Auto-detected
                  </span>
                )}
              </div>
            </div>

            {/* Center: Search Bar with Live Suggestions and Popular Chips */}
            <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-lg lg:max-w-xl relative">
              <form
                onSubmit={(e) => { e.preventDefault(); goToBooking() }}
                className={`flex items-center bg-slate-50 dark:bg-slate-800/80 rounded-full border px-3 py-1.5 transition-all ${
                  isSearchOpen
                    ? "border-[#0B8F7A] ring-2 ring-[#0B8F7A]/20 bg-white dark:bg-slate-800"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (!isSearchOpen) setIsSearchOpen(true)
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={dynamicSearchHints[placeholderIndex % dynamicSearchHints.length]}
                  className="flex-1 bg-transparent text-xs sm:text-sm font-medium outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full mr-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Search"
                  className="w-7 h-7 rounded-full bg-[#0B8F7A] hover:bg-[#087362] text-white flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Popular Search Keywords */}
              {/* <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 pt-1 px-3">
                <span className="font-bold text-slate-500 dark:text-slate-400">Popular:</span>
                {[
                  { name: "AC Service", action: () => navigate("?category=hvac&subtab=AC%20Service%20%26%20Cleaning") },
                  { name: "Cleaning", action: () => navigate("?category=cleaning") },
                  { name: "Plumbing", action: () => navigate("?category=plumbing&subtab=Tap%20%26%20Mixer") },
                  { name: "Salon", action: () => setIsHomeServicesCombinedModalOpen(true) },
                  { name: "Pest Control", action: () => setIsHomePestModalOpen(true) },
                ].map((chip) => (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={chip.action}
                    className="hover:text-[#0B8F7A] hover:underline transition-colors cursor-pointer"
                  >
                    {chip.name}
                  </button>
                ))}
              </div> */}

              {/* Live Search Suggestion Overlay */}
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-700 max-h-[380px] overflow-y-auto"
                  >
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <span>{query.trim() ? `Matching Services (${filteredSearchResults.length})` : "Popular Services"}</span>
                      <span className="text-[10px] text-[#0B8F7A] font-semibold lowercase">Instant Booking</span>
                    </div>
                    {matchedCategoryResults.length > 0 && query.trim() && (
                      <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40">
                        <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1.5">
                          <LayoutGrid className="w-3 h-3" />
                          <span>Matching Category</span>
                        </div>
                        <div className="space-y-1">
                          {matchedCategoryResults.map((cat) => (
                            <button
                              key={`cat-${cat.slug}`}
                              type="button"
                              onClick={() => handleCategorySearchSelect(cat)}
                              className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 border border-emerald-200/70 dark:border-emerald-800/50 transition-colors text-left group cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                                    {cat.name}
                                  </div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                    Explore all services in {cat.name}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                                View Category <ArrowRight className="w-3 h-3" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {filteredSearchResults.length > 0 ? (
                      <div className="p-1.5 space-y-1">
                        {filteredSearchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleExecuteSearch(item)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0B8F7A] flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0B8F7A] truncate">
                                  {item.title}
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                  {item.category} • {item.price}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-[#0B8F7A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No matches found.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Account & Action Badges */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* User Account / Profile */}
              <button
                type="button"
                id="landing-user-profile-btn"
                onClick={() => {
                  if (!user) {
                    goToLogin()
                  } else {
                    setActiveAccountTab(estimationRepository.hasActiveEstimationSync() ? "My Bookings" : "My Profile")
                    setShowAccountPortal(true)
                  }
                }}
                className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left shrink-0"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-[10px] text-slate-500 font-medium">
                    {user ? `Hi, ${user?.first_name || user?.full_name?.split(" ")[0] || "there"}` : "Welcome"}
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-0.5">
                    {user ? "My Account" : "Sign In"} <ChevronDown className="w-3 h-3 text-slate-400" />
                  </span>
                </div>
              </button>

              {/* Notification Bell with red badge */}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    setActiveAccountTab("My Bookings")
                    setShowAccountPortal(true)
                  } else {
                    goToLogin()
                  }
                }}
                className="relative p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white font-black text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Cart Drawer with red badge */}
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                className="relative p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Cart"
              >
                <ShoppingCart className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                {modalCart && modalCart.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white font-black text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                    {modalCart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <ThemeToggle className="shrink-0 hidden sm:inline-flex" />
            </div>
          </div>
        </header>

        {/* ── Mobile Search Bar (Direct Search Access for Mobile Users) ── */}
        <div className="md:hidden bg-white dark:bg-slate-900 px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 relative z-30">
          <div className="relative">
            <form
              onSubmit={(e) => { e.preventDefault(); goToBooking() }}
              className={`flex items-center bg-slate-50 dark:bg-slate-800/90 rounded-full border px-3 py-2 transition-all ${
                isSearchOpen
                  ? "border-[#0B8F7A] ring-2 ring-[#0B8F7A]/20 bg-white dark:bg-slate-800"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (!isSearchOpen) setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={dynamicSearchHints[placeholderIndex % dynamicSearchHints.length]}
                className="flex-1 bg-transparent text-xs font-medium outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full mr-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Mobile Live Suggestions Dropdown */}
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-700 max-h-[340px] overflow-y-auto"
                >
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <span>{query.trim() ? `Services (${filteredSearchResults.length})` : "Popular Services"}</span>
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="text-[#0B8F7A] text-[11px] font-bold lowercase hover:underline cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {matchedCategoryResults.length > 0 && query.trim() && (
                    <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40">
                      <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1.5">
                        <LayoutGrid className="w-3 h-3" />
                        <span>Matching Category</span>
                      </div>
                      <div className="space-y-1">
                        {matchedCategoryResults.map((cat) => (
                          <button
                            key={`mob-cat-${cat.slug}`}
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false)
                              handleCategorySearchSelect(cat)
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/70 dark:border-emerald-800/50 transition-colors text-left group cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <LayoutGrid className="w-3 h-3" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {cat.name}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                  Explore all {cat.name} services
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                              Explore <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {filteredSearchResults.length > 0 ? (
                    <div className="p-1.5 space-y-1">
                      {filteredSearchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false)
                            handleExecuteSearch(item)
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0B8F7A] flex items-center justify-center shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.title}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                {item.category} • {item.price}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#0B8F7A] shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matches found.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>


        <AllServicesDrawer
          isOpen={isAllServicesOpen}
          onClose={() => setIsAllServicesOpen(false)}
          navigate={navigate}
          user={user}
          categories={catalogCategories}
        />

        {/* ── Service Area Availability Banner ─────────────────────────────── */}
        {zoneCheckResult && zoneCheckResult.in_zone === false && (
          <div className="max-w-7xl mx-auto px-6 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 font-bold text-xl">
                  🚫
                </div>
                <div>
                  <div className="font-black text-xs sm:text-sm text-red-900">
                    Doorstep Service is Currently Unavailable in Your Area
                  </div>
                  <div className="text-[11px] sm:text-xs text-red-700 mt-0.5 leading-snug">
                    We don't serve <strong className="text-red-900">{activeLocationLabel || "your selected location"}</strong> yet. Please select an address within our service areas to book.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationPickerModal(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shrink-0 cursor-pointer shadow-md transition-all active:scale-95"
              >
                Change Location
              </button>
            </div>
          </div>
        )}

        {/* ── Super Admin Customer Web Edit Mode toggle ── */}
        {canEnterHomeEditMode && (
          <div className={`sticky top-0 z-40 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-bold ${homeEditMode ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Super Admin viewing the live Customer Homepage{homeEditMode ? " — Edit Mode ON" : ""}
              {savingHomeField && <span className="opacity-80">(saving…)</span>}
            </span>
            <button
              type="button"
              onClick={() => setHomeEditMode(!homeEditMode)}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer ${homeEditMode ? "bg-white text-indigo-700" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}
            >
              <Pencil className="w-3 h-3" />
              {homeEditMode ? "Exit Edit Mode" : "Enable Edit Mode"}
            </button>
          </div>
        )}

        {/* ── Active Ongoing Booking Status Card (Fulfillment Visibility & Start OTP) ── */}
        {user && activeCustomerBooking && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-1">
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl border border-emerald-500/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-start sm:items-center gap-3.5 z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Wrench className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {activeCustomerBooking.status_display || activeCustomerBooking.status?.replace(/_/g, ' ')?.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      #{activeCustomerBooking.request_id}
                    </span>
                    {activeCustomerBooking.technician_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        Professional assigned
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {(activeCustomerBooking.service_category_display || activeCustomerBooking.issue_title || "Service Booking").replace(/•“/g, ' - ').replace(/•”/g, ' - ')}
                  </h3>
                  <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                      {activeCustomerBooking.preferred_date || "Today"} {activeCustomerBooking.preferred_time ? `(${activeCustomerBooking.preferred_time})` : ""}
                    </span>
                    {activeCustomerBooking.technician_name && (
                      <span className="flex items-center gap-1 text-slate-200">
                        <span>•</span>
                        <strong className="text-white">{activeCustomerBooking.technician_name}</strong>
                        {activeCustomerBooking.technician_rating ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-300 font-black text-[11px] bg-amber-400/15 px-1.5 py-0.2 rounded">
                            ★ {activeCustomerBooking.technician_rating}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-300 font-bold text-[10px] bg-emerald-400/15 px-1.5 py-0.2 rounded">
                            Verified Pro
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: Doorstep Start OTP Box */}
              {activeCustomerBooking.start_otp && (
                <div className="z-10 bg-black/40 backdrop-blur-md border border-emerald-400/30 rounded-xl px-4 py-2.5 flex items-center justify-between md:justify-center gap-3">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                      Doorstep Start OTP
                    </div>
                    <div className="text-lg font-black tracking-widest text-white font-mono">
                      {activeCustomerBooking.start_otp}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyOtp(activeCustomerBooking.start_otp)}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer"
                    title="Copy OTP"
                  >
                    {copiedOtp ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Right: Actions */}
              <div className="flex items-center gap-2.5 z-10 shrink-0">
                {Boolean(activeCustomerBooking.is_accepted || ['accepted', 'on_the_way', 'arrived', 'in_progress', 'started', 'dispatched'].includes(String(activeCustomerBooking.status).toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeCustomerBooking.tracking_token) {
                        navigate(`/live-tracking?booking_id=${activeCustomerBooking.id}&token=${activeCustomerBooking.tracking_token}`)
                      } else {
                        navigate(`${routes.booking_checkout}?track=${activeCustomerBooking.request_id}`)
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Track Live</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAccountTab("My Bookings")
                    setShowAccountPortal(true)
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Your Recent Services — Book Again (CRM Lifecycle Retention) ── */}
        {user && recentCompletedBookings.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
            <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>⚡ Book Again</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      Recent Services
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    One-click reorder with your saved address and past service preferences
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAccountTab("My Bookings")
                    setShowAccountPortal(true)
                  }}
                  className="text-xs font-bold text-[#0B8F7A] dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>All Past Bookings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentCompletedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {(b.service_category_display || b.issue_title || "Service Booking").replace(/•“/g, ' - ').replace(/•”/g, ' - ')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3 text-slate-400" />
                        <span>Completed {b.preferred_date || (b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : "")}</span>
                      </div>
                      <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-1">
                        ₹{Number(b.total_amount || b.base_amount || 0).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOneClickRebook(b)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#0B8F7A] hover:from-emerald-700 hover:to-[#087362] text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Book Again</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Marketplace Value Proposition & Heading (Urban Benchmark) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="text-left space-y-2.5">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Home services at your doorstep
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl">
              Certified professionals, upfront transparent pricing & 100% satisfaction guarantee
  
            </p>

            {/* Benchmark Trust Indicators */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Quality Verified & Guaranteed</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upfront Transparent Pricing</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Local Experts</span>
              </div>
            </div>

            {/* ── Trending Searches Intent Bar (Urban Benchmark Pattern) ── */}
            <div className="pt-2">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#0B8F7A]" />
                  Trending:
                </span>
                {dynamicTrendingSearches.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTrendingClick(t)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-[#0B8F7A] text-slate-700 dark:text-slate-200 hover:text-[#0B8F7A] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 1. Primary Service Discovery: Live Service Categories Grid ────── */}
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2 sm:pt-4 sm:pb-3 scroll-mt-24">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Explore All Categories
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Select a category for upfront transparent pricing and certified doorstep delivery
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {homeEditMode && (
                <Link
                  to={routes.catalog_categories}
                  className="text-xs font-bold text-[#0B8F7A] hover:underline cursor-pointer flex items-center gap-1 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800"
                  title="Manage categories, images and services in the Admin Catalog"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Manage in Catalog</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsAllServicesOpen(true)}
                className="text-xs sm:text-sm font-bold text-[#0B8F7A] hover:text-[#087362] flex items-center gap-1 transition-colors cursor-pointer group shrink-0"
              >
                <span className="hidden sm:inline">View All Services</span>
                <span className="sm:hidden">View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {catalogCategoriesLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs animate-pulse min-h-[96px] sm:min-h-[112px]"
                >
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 mb-2 sm:mb-2.5" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
              ))}
            </div>
          ) : displayCategories.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Services are currently being updated</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please check back soon or browse all services below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4.5">
              {displayCategories.map((cat) => {
                const FallbackIcon = resolveCategoryFallbackIcon(cat.rawCat || cat)
                const catImage = cat.image || cat.photo
                const imageUrl = catImage ? resolveImageUrl(catImage) : null
                const catSlug = cat.slug || cat.serviceCategoryId || cat.id
                const eta = resolveCategoryEta(cat)
                return (
                  <button
                    key={cat.id || cat.slug}
                    type="button"
                    onClick={() => {
                      const isGt = catSlug === "goods_transports" || catSlug === "goods_transport" || cat.slug === "goods_transports" || cat.slug === "goods_transport" || cat.id === "goods_transports" || String(cat.id) === "12" || cat.id === "cat-11" || (cat.name && cat.name.toLowerCase().includes("goods") && cat.name.toLowerCase().includes("transport"))
                      if (isGt) {
                        setIsGoodsModalOpen(true)
                      } else if (cat.isGrocery || cat.link === "/vegetables" || catSlug === "vegetables_groceries") {
                        navigate(routes.vegetables)
                      } else if (cat.link) {
                        goToBannerLink(cat.link)
                      } else {
                        navigate(`${routes.booking_services}?category=${encodeURIComponent(catSlug)}`)
                      }
                    }}
                    className="group flex flex-col items-center text-center p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-[#0B8F7A] dark:hover:border-[#0B8F7A] shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[104px] sm:min-h-[120px] justify-between"
                  >
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform overflow-hidden relative shrink-0 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={cat.name || "Service"}
                          loading="lazy"
                          className="w-full h-full object-contain p-1 drop-shadow-2xs rounded-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                            const nextEl = e.currentTarget.nextElementSibling
                            if (nextEl) nextEl.style.display = "flex"
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full rounded-2xl bg-teal-50 text-[#0B8F7A] dark:bg-teal-950/40 dark:text-teal-400 ${imageUrl ? "hidden" : "flex"} items-center justify-center`}>
                        <FallbackIcon className="w-5 h-5 sm:w-7 sm:h-7 stroke-[1.8]" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 w-full">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0B8F7A] dark:group-hover:text-teal-400 transition-colors leading-tight line-clamp-2">
                        {cat.name || "Service"}
                      </span>
                      {eta && (
                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/50">
                          {eta}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}

              {/* Fixed "More" / View All tile */}
              <button
                type="button"
                onClick={() => setIsAllServicesOpen(true)}
                className="group flex flex-col items-center text-center p-2.5 sm:p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-[#0B8F7A] dark:hover:border-[#0B8F7A] shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[96px] sm:min-h-[112px] justify-start"
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 group-hover:scale-105 transition-transform overflow-hidden relative shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <MoreHorizontal className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2]" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#0B8F7A] dark:group-hover:text-teal-400 transition-colors leading-tight">
                  More
                </span>
              </button>
            </div>
          )}
        </section>

        {/* ── 2. Contextual Promotional Banner Carousel ────────────────────────── */}
        <section id="home" className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-3 sm:pt-3 sm:pb-5 scroll-mt-24">
          <div
            onTouchStart={handleHeroTouchStart}
            onTouchEnd={handleHeroTouchEnd}
            className="relative rounded-2xl sm:rounded-[28px] overflow-hidden shadow-xs transition-all select-none group/heroimg"
          >
            <button
              type="button"
              onClick={() => !homeEditMode && goToBannerLink(activeHeroSlideData.link)}
              disabled={homeEditMode}
              aria-label="Open promotional banner"
              className={`block w-full ${homeEditMode ? "cursor-default" : "cursor-pointer"}`}
            >
              <img
                src={activeHeroSlideData.heroImage || "/assets/hero_illustration.jpg"}
                alt="Promotional banner"
                onError={(e) => {
                  e.currentTarget.src = "/assets/hero_illustration.jpg"
                }}
                className="w-full h-auto block sm:h-[260px] lg:h-[300px] sm:object-cover sm:object-top transition-transform duration-500 group-hover/heroimg:scale-102"
                loading="eager"
              />
            </button>

            {/* Prev/Next Circular Navigation Arrows (Desktop & Tablet only, avoiding mobile text overlap) */}
            {heroSlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveHeroSlide((p) => (p - 1 + heroSlides.length) % heroSlides.length)}
                  aria-label="Previous slide"
                  className="hidden sm:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 hover:bg-white shadow-md border border-slate-200/80 dark:border-slate-700 items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer hover:scale-105"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHeroSlide((p) => (p + 1) % heroSlides.length)}
                  aria-label="Next slide"
                  className="hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 hover:bg-white shadow-md border border-slate-200/80 dark:border-slate-700 items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer hover:scale-105"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* 4 Bottom Indicator Dots */}
            {heroSlides.length > 1 && (
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveHeroSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activeHeroSlide
                        ? "w-7 bg-white"
                        : "w-2 bg-white/60 hover:bg-white/90"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Floating Price Tag Badge */}
            {(activeHeroSlideData.priceBadge || homeEditMode) && (
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-2xl shadow-xl px-4 py-2.5 flex flex-col items-start border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Starting from
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#0B8F7A] leading-tight">
                  <HomeEditableText
                    active={homeEditMode}
                    value={activeHeroSlideData.priceBadge}
                    placeholder="₹499"
                    onSave={(v) => saveActiveHeroField("priceBadge", v)}
                  />
                </span>
              </div>
            )}

            {/* Edit-mode admin panel */}
            {homeEditMode && (
              <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs rounded-xl px-3 py-2 shadow-lg border border-slate-200/80 w-[min(90%,320px)] space-y-1.5">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                    Banner Redirect Link
                  </label>
                  <input
                    type="text"
                    value={activeHeroSlideData.link || ""}
                    onChange={(e) => saveActiveHeroField("link", e.target.value)}
                    placeholder="?category=cleaning or https://..."
                    className="w-full text-xs font-medium text-slate-800 outline-none bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={addHeroSlide}
                    className="text-[11px] font-black text-[#0B8F7A] hover:underline cursor-pointer"
                  >
                    + Add Slide
                  </button>
                  {activeHeroSlide > 0 && (
                    <button
                      type="button"
                      onClick={removeActiveHeroSlide}
                      className="text-[11px] font-black text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove This Slide
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Super Admin Edit Affiliate */}
            {homeEditMode && (
              <div
                onClick={() => setHeroImageModalOpen(true)}
                className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center p-4 gap-2 opacity-0 group-hover/heroimg:opacity-100 transition-opacity cursor-pointer z-10"
              >
                <span className="text-white text-xs font-bold flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-teal-400" /> Banner Image
                </span>
                <span className="px-3 py-1.5 bg-[#0B8F7A] text-white text-xs font-black rounded-lg">
                  Change Image
                </span>
              </div>
            )}
            <ImageEditModal
              key={`hero-banner-${activeHeroSlide}`}
              isOpen={heroImageModalOpen}
              onClose={() => setHeroImageModalOpen(false)}
              currentUrl={activeHeroSlideData.heroImage || "/assets/hero_illustration.jpg"}
              defaultFallback="/assets/hero_illustration.jpg"
              title={`Edit Banner Image${heroSlides.length > 1 ? ` (Slide ${activeHeroSlide + 1} of ${heroSlides.length})` : ""}`}
              assetType="homepage"
              onSave={(url) => saveActiveHeroField("heroImage", url)}
            />
          </div>
        </section>

        {/* ── 6. Promotional Offers Row -- each card is a single admin-
            uploaded banner image (like a real ad), no code-drawn
            discount/countdown/coupon text on top of it. Reads/writes
            homeConfig.offers.items so it's editable from both the live
            page (Customer Web Edit Mode) and the Homepage Builder preview. ── */}
        <section id="offers" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 scroll-mt-24 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#0B8F7A]" />
              <HomeEditableText
                active={homeEditMode}
                value={homeConfig.offers?.title}
                placeholder="Limited Time Offers!"
                onSave={(v) => saveHomeConfigField("offers.title", v)}
              />
            </h2>
            {homeEditMode && (
              <button
                type="button"
                onClick={addOfferItem}
                className="text-[11px] font-black text-[#0B8F7A] hover:underline cursor-pointer shrink-0"
              >
                + Add Offer Card
              </button>
            )}
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3.5 -mx-4 px-4 pb-2 md:grid md:grid-cols-3 md:gap-5 md:mx-0 md:px-0 md:pb-0">
            {(homeConfig.offers?.items || []).filter((o) => o.enabled !== false || homeEditMode).map((offer, idx) => (
              <div
                key={offer.id || idx}
                className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-md transition-all bg-slate-100 dark:bg-slate-800 group/offer shrink-0 w-[78vw] max-w-[280px] md:w-auto snap-center"
              >
                <button
                  type="button"
                  onClick={() => !homeEditMode && goToBannerLink(offer.link)}
                  disabled={homeEditMode}
                  aria-label={offer.title || "Promotional offer"}
                  className={`relative block w-full aspect-[4/3] ${homeEditMode ? "cursor-default" : "cursor-pointer"} overflow-hidden`}
                >
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt={offer.title || "Offer"}
                      className="w-full h-full object-cover group-hover/offer:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const fallback = getOfferSafeImage({ ...offer, image: "" }, idx)
                        if (fallback && e.currentTarget.src !== fallback && !e.currentTarget.dataset.failed) {
                          e.currentTarget.dataset.failed = "true"
                          e.currentTarget.src = fallback
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <Gift className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                  {/* Subtle gradient scrim & offer details */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-between p-3.5 sm:p-4 text-left">
                    {offer.badge ? (
                      <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                        {offer.badge}
                      </span>
                    ) : <div />}
                    <div>
                      <h4 className="text-white text-xs sm:text-sm font-black leading-tight drop-shadow-sm line-clamp-1">
                        {offer.title || (idx === 0 ? "Deep Home Cleaning Special" : idx === 1 ? "AC Anti-Rust Shield & Service" : "Same-Day Courier & Mini Truck")}
                      </h4>
                      <p className="text-slate-200/90 text-[10px] sm:text-[11px] font-medium mt-0.5 line-clamp-1">
                        {offer.subtitle || (idx === 0 ? "Verified pros • Eco-friendly chemicals" : idx === 1 ? "Complete gas check • 30-day warranty" : "Doorstep pickup in Hosur")}
                      </p>
                    </div>
                  </div>
                </button>

                {homeEditMode && (
                  <>
                    <div
                      onClick={() => setOfferImageModalIdx(idx)}
                      className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-3 gap-1.5 opacity-0 group-hover/offer:opacity-100 transition-opacity cursor-pointer z-10"
                    >
                      <span className="text-white text-xs font-bold flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-teal-400" /> Offer Banner Image
                      </span>
                      <span className="px-3 py-1.5 bg-[#0B8F7A] hover:bg-[#087362] text-white text-[11px] font-extrabold rounded-lg shadow-lg transition">
                        Change Image
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOfferItem(idx)}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-rose-600 cursor-pointer z-20"
                      title="Remove this offer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                        Click-Through Link
                      </label>
                      <input
                        type="text"
                        value={offer.link || ""}
                        onChange={(e) => saveHomeConfigField(`offers.items.${idx}.link`, e.target.value)}
                        placeholder="?category=cleaning or https://..."
                        className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 outline-none bg-transparent"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <ImageEditModal
            key={`offer-banner-${offerImageModalIdx}`}
            isOpen={offerImageModalIdx !== null}
            onClose={() => setOfferImageModalIdx(null)}
            currentUrl={offerImageModalIdx !== null ? (homeConfig.offers?.items?.[offerImageModalIdx]?.image || "") : ""}
            defaultFallback=""
            title="Edit Offer Banner Image"
            assetType="homepage"
            onSave={(url) => {
              if (offerImageModalIdx !== null) saveHomeConfigField(`offers.items.${offerImageModalIdx}.image`, url)
            }}
          />
        </section>




        {/* ── Marketplace Spotlight: Farm-Fresh Vegetables & Groceries ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-[#0B8F7A] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <span className="inline-block bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                Daily Morning Harvest
              </span>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
                Farm-Fresh Vegetables & Groceries
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100">
                Directly sourced from local farmers in Hosur & Bengaluru. Zero preservatives, harvested at dawn and delivered right to your doorstep.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(routes.vegetables)}
              className="px-6 py-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-2"
            >
              <span>Shop Fresh Produce</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>



        {/* ── 9. Customer Testimonials ("What Our Customers Say") ──────────────── */}
        <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {homeConfig.testimonials?.title || "What Our Customers Say"}
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="text-[10px] sm:text-xs font-extrabold text-[#0B8F7A] bg-emerald-50 dark:bg-emerald-950/50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-200/60 shrink-0">
                ★ 4.9/5 (1.2k+ Reviews)
              </span>
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTestimonialIdx((prev) => (prev - 1 + 3) % 3)}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Previous testimonial"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTestimonialIdx((prev) => (prev + 1) % 3)}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Next testimonial"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile Dedicated Review Spotlight View ── */}
          <div className="md:hidden">
            {(() => {
              const reviewsList = (homeConfig.testimonials?.reviews?.length ? homeConfig.testimonials.reviews : DEFAULT_HOME_PAGE_CONFIG.testimonials.reviews)
              const currentRev = reviewsList[testimonialIdx % reviewsList.length] || reviewsList[0]
              const initials = currentRev.initials || currentRev.avatar || (currentRev.name ? currentRev.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "SE")

              return (
                <div
                  onTouchStart={handleReviewTouchStart}
                  onTouchEnd={handleReviewTouchEnd}
                  className="relative bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/90 rounded-2xl border border-emerald-100/90 dark:border-slate-700 p-4 sm:p-5 shadow-xs transition-all select-none overflow-hidden"
                >
                  {/* Subtle quote watermark */}
                  <Quote className="absolute right-3 bottom-3 w-16 h-16 text-emerald-600/5 dark:text-emerald-400/5 -rotate-12 pointer-events-none" />

                  {/* Top: Avatar + Name + Rating */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-full ${currentRev.badgeColor || "bg-[#0B8F7A]"} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-emerald-100 dark:ring-emerald-950`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {currentRev.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified Customer
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/60 shrink-0">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <blockquote className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic pl-2.5 border-l-2 border-emerald-500/50">
                    &ldquo;{currentRev.text || currentRev.review}&rdquo;
                  </blockquote>

                  {/* Footer: Service/Location + Prev/Next Controls */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {currentRev.city || currentRev.cat || "Bengaluru Home Service"}
                    </span>

                    {/* Interactive Mobile Prev/Next Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 mr-1">
                        {reviewsList.slice(0, 3).map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            type="button"
                            onClick={() => setTestimonialIdx(dotIdx)}
                            aria-label={`View review ${dotIdx + 1}`}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              dotIdx === (testimonialIdx % reviewsList.length)
                                ? "w-5 bg-[#0B8F7A]"
                                : "w-1.5 bg-slate-300 dark:bg-slate-600"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setTestimonialIdx((prev) => (prev - 1 + reviewsList.length) % reviewsList.length)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-90 cursor-pointer"
                        aria-label="Previous review"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestimonialIdx((prev) => (prev + 1) % reviewsList.length)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-90 cursor-pointer"
                        aria-label="Next review"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── Desktop 3-Card Grid View ── */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-4 md:mx-0 md:px-0 md:pb-0">
            {(homeConfig.testimonials?.reviews?.length ? homeConfig.testimonials.reviews : DEFAULT_HOME_PAGE_CONFIG.testimonials.reviews).slice(0, 3).map((testi, idx) => {
              const avatarInitials = testi.initials || testi.avatar || (testi.name ? testi.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "SE")
              return (
                <div
                  key={testi.id || idx}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${testi.badgeColor || "bg-teal-600"} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                      {avatarInitials}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {testi.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {testi.city || testi.cat || "Verified Customer"}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, Math.max(1, testi.rating || 5)) }).map((_, si) => (
                        <Star key={si} className="w-3 h-3 fill-amber-400 text-amber-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    &ldquo;{testi.text || testi.review}&rdquo;
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 11. Comprehensive SEVO Footer (6 Columns Matching Spec) ──────────── */}
        <footer id="about-us" className="hidden md:block bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 pt-12 border-t border-slate-200 dark:border-slate-800 scroll-mt-24 pb-16 lg:pb-0 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 pb-10">
            {/* Col 1: Brand Info & Socials */}
            <div className="space-y-4 col-span-2 sm:col-span-1 lg:col-span-1">
              <div className="flex items-center gap-2 select-none shrink-0 cursor-pointer" onClick={() => navigate(routes.landing)}>
                <img
                  src="/assets/sevo_emblem_transparent.png"
                  alt="SEVO Emblem"
                  className="h-8 w-auto shrink-0 object-contain"
                  style={{ height: '32px', width: 'auto' }}
                />
                <img
                  src="/assets/sevo_text_logo.png"
                  alt="SEVO"
                  className="shrink-0 object-contain dark:hidden"
                  style={{ height: '16px', width: 'auto', maxHeight: '16px' }}
                />
                <img
                  src="/assets/sevo_text_logo_white.png"
                  alt="SEVO"
                  className="shrink-0 object-contain hidden dark:block"
                  style={{ height: '16px', width: 'auto', maxHeight: '16px' }}
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Your trusted partner for all home services. Professional, reliable and on-time.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a href="#" className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0B8F7A] text-slate-600 hover:text-white flex items-center justify-center transition-colors">
                  <FacebookMark className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0B8F7A] text-slate-600 hover:text-white flex items-center justify-center transition-colors">
                  <InstagramMark className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0B8F7A] text-slate-600 hover:text-white flex items-center justify-center transition-colors">
                  <YoutubeMark className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0B8F7A] text-slate-600 hover:text-white flex items-center justify-center transition-colors">
                  <LinkedInMark className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Col 2: Services */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                SERVICES
              </h4>
              <ul className="space-y-2 text-xs">
                <li><button type="button" onClick={() => navigate("?category=cleaning")} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Cleaning &amp; Pest Control</button></li>
                <li><button type="button" onClick={() => navigate("?category=hvac&subtab=AC%20Service%20%26%20Cleaning")} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">AC Services</button></li>
                <li><button type="button" onClick={() => navigate("?category=hvac")} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Appliance Repair</button></li>
                <li><button type="button" onClick={() => navigate("?category=plumbing&subtab=Plumber%20Services")} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Plumbing</button></li>
                <li><button type="button" onClick={() => navigate("?category=electrical&subtab=Electrician%20Services")} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Electrical</button></li>
                <li><button type="button" onClick={() => navigate("?category=carpentry&subtab=Carpenter%20Services")} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Carpentry</button></li>
                <li><button type="button" onClick={() => setIsAllServicesOpen(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer font-bold text-[#0B8F7A]">View All Services</button></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                COMPANY
              </h4>
              <ul className="space-y-2 text-xs">
                {/* <li><a href="#about-us" className="hover:text-[#0B8F7A] transition-colors">About Us</a></li> */}
                {/* <li><Link to="/help" className="hover:text-[#0B8F7A] transition-colors">Careers</Link></li> */}
                {/* <li><Link to="/help" className="hover:text-[#0B8F7A] transition-colors">Blog</Link></li> */}
                {/* <li><Link to="/help" className="hover:text-[#0B8F7A] transition-colors">Press</Link></li> */}
                <li><Link to="/contact" className="hover:text-[#0B8F7A] transition-colors">Partner with Us</Link></li>
                <li><Link to="/terms" className="hover:text-[#0B8F7A] transition-colors">Terms &amp; Conditions</Link></li>
              </ul>
            </div>

            {/* Col 4: Help */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                HELP
              </h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/help" className="hover:text-[#0B8F7A] transition-colors">Help Center</Link></li>
                <li><a href="#why-choose-us" className="hover:text-[#0B8F7A] transition-colors">How It Works</a></li>
                <li><Link to="/cancellation-refund" className="hover:text-[#0B8F7A] transition-colors">Cancellation Policy</Link></li>
                <li><Link to="/privacy" className="hover:text-[#0B8F7A] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cancellation-refund" className="hover:text-[#0B8F7A] transition-colors">Refund Policy</Link></li>
                <li><Link to="/contact" className="hover:text-[#0B8F7A] transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Col 5: Popular Cities */}
            {/* <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                POPULAR CITIES
              </h4>
              <ul className="space-y-2 text-xs">
                <li><button type="button" onClick={() => setShowLocationPickerModal(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Bengaluru</button></li>
                <li><button type="button" onClick={() => setShowLocationPickerModal(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Mumbai</button></li>
                <li><button type="button" onClick={() => setShowLocationPickerModal(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Delhi</button></li>
                <li><button type="button" onClick={() => setShowLocationPickerModal(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Pune</button></li>
                <li><button type="button" onClick={() => setShowLocationPickerModal(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Hyderabad</button></li>
                <li><button type="button" onClick={() => setShowLocationPickerModal(true)} className="hover:text-[#0B8F7A] transition-colors text-left cursor-pointer">Chennai</button></li>
              </ul>
            </div> */}

            {/* Col 6: Download App & Payment Badges */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-2.5">
                  DOWNLOAD OUR APP
                </h4>
                <div className="flex flex-col gap-2">
                  <GooglePlayBtn />
                  <AppStoreBtn />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  WE ACCEPT
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <VisaBadge />
                  <MastercardBadge />
                  <UpiBadge />
                  <PaytmBadge />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div className="border-t border-slate-200 dark:border-slate-800 text-slate-400 py-4 text-center text-xs font-medium">
            © 2024 Sevo Home Services Pvt. Ltd. All rights reserved.
          </div>
        </footer>


      </div>

      {/* ── 4. Goods & Transports Modal Popup ── */}
      {isGoodsModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transport-modal-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsGoodsModalOpen(false)
                setShowTransportEstimatePicker(false)
              }
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsGoodsModalOpen(false)
              setShowTransportEstimatePicker(false)
            }}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsGoodsModalOpen(false)
                  setShowTransportEstimatePicker(false)
                }}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div className="text-center mb-6">
                <h3
                  id="transport-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  Goods &amp; Transports
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a transport type to get an instant estimate
                </p>
              </div>

              {/* Service Alert Message (When clicking unavailable service) */}
              {serviceAlertMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span>{serviceAlertMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServiceAlertMessage("")}
                    className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Items Grid -- the 3 known transport types keep their
                  dedicated, purpose-built booking pages; any OTHER real
                  sub-service the admin adds under Goods & Transport (beyond
                  these 3) is appended here too, routed through the generic
                  booking flow so it isn't silently dropped */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                {[
                  { key: "truck", name: goodsTileOverrides.truck?.name || "Mini Truck & Logistics", slug: "truck", route: `/trucks/${(selectedCity || "hosur").toLowerCase().replace(/\s+/g, "-")}`, graphic: TruckGraphic },
                  { key: "two_wheeler", name: goodsTileOverrides.two_wheeler?.name || "2-Wheeler Courier", slug: "two-wheeler", route: `/two-wheelers/${(selectedCity || "hosur").toLowerCase().replace(/\s+/g, "-")}`, graphic: TwoWheelerGraphic },
                  { key: "packers_movers", name: goodsTileOverrides.packers_movers?.name || "Packers & Movers", slug: "packers-movers", route: `/packers-and-movers/${(selectedCity || "hosur").toLowerCase().replace(/\s+/g, "-")}`, graphic: PackersMoversGraphic },
                  ...goodsModalServices
                    .filter((s) => {
                      const n = (s.name || "").toLowerCase()
                      const sl = (s.slug || "").toLowerCase()
                      return !(n.includes("truck") || n.includes("wheeler") || n.includes("packers") || n.includes("movers") ||
                        sl.includes("truck") || sl.includes("wheeler") || sl.includes("packers") || sl.includes("movers"))
                    })
                    .map((s) => ({ key: `db-${s.id}`, name: s.name, slug: s.slug || s.name, cat: "goods_transport", subTab: s.name, image: s.image })),
                ].map((item) => {
                  const isAvailable = isServiceAvailableInZone(item.slug)
                  const Graphic = item.graphic
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (!isAvailable) {
                          showUnavailableServiceAlert(item.name)
                          return
                        }
                        setIsGoodsModalOpen(false)
                        setShowTransportEstimatePicker(false)
                        document.body.style.overflow = "unset"
                        if (item.route) navigate(item.route)
                        else goToCategoryServices(item.cat, item.subTab)
                      }}
                      className={`group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer border-2 ${isAvailable
                        ? "border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                        : "border-slate-200/60 bg-slate-50/50 opacity-60 cursor-pointer"
                        }`}
                    >
                      <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all relative overflow-hidden">
                        {Graphic ? (
                          <Graphic className={`w-full h-full ${!isAvailable ? 'grayscale-[50%]' : ''}`} />
                        ) : item.image ? (
                          <img
                            src={resolveImageUrl(item.image, item.image)}
                            alt={item.name}
                            className={`w-full h-full object-cover rounded-xl ${!isAvailable ? 'grayscale-[50%]' : ''}`}
                          />
                        ) : (
                          <Wrench className={`w-8 h-8 text-slate-400 ${!isAvailable ? 'opacity-50' : ''}`} />
                        )}
                        {!isAvailable && (
                          <span className="absolute -bottom-2 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                            Not Available
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-bold mt-2.5 transition-colors ${isAvailable ? 'text-slate-800 group-hover:text-slate-900' : 'text-slate-400'}`}>
                        {item.name}
                      </span>
                    </button>
                  )
                })}

                {/* Option 4: Get an Estimate card with interactive transport selection */}
                <div
                  className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg shadow-emerald-600/25 transition-all text-left min-h-[140px]"
                >
                  {!showTransportEstimatePicker ? (
                    <button
                      type="button"
                      onClick={() => setShowTransportEstimatePicker(true)}
                      className="w-full h-full flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-white rounded-xl text-left"
                      aria-expanded={showTransportEstimatePicker}
                      aria-label="Get an Estimate - Choose transport type"
                    >
                      <div>
                        <p className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight text-white">
                          Get an<br />Estimate
                        </p>
                        <p className="text-xs text-emerald-100 font-medium mt-2 opacity-95">
                          (takes ~2 mins)
                        </p>
                      </div>
                      <div className="pt-3 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                          Select Type
                        </span>
                        <ArrowRight className="w-5 h-5 text-white stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-white/20">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100">
                          Choose Transport
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowTransportEstimatePicker(false)
                          }}
                          className="text-white/80 hover:text-white p-0.5 cursor-pointer rounded"
                          aria-label="Back to estimate card"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsGoodsModalOpen(false)
                            setShowTransportEstimatePicker(false)
                            document.body.style.overflow = "unset"
                            navigate(routes.truck_booking_hosur)
                          }}
                          className="text-left text-xs font-bold px-2 py-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Mini Truck</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsGoodsModalOpen(false)
                            setShowTransportEstimatePicker(false)
                            document.body.style.overflow = "unset"
                            navigate(routes.two_wheeler_booking_hosur)
                          }}
                          className="text-left text-xs font-bold px-2 py-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>2-Wheeler</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsGoodsModalOpen(false)
                            setShowTransportEstimatePicker(false)
                            document.body.style.overflow = "unset"
                            navigate(routes.packers_movers_booking_hosur)
                          }}
                          className="text-left text-xs font-bold px-2 py-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Packers &amp; Movers</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}


      {/* ── 1. Food and Health Sub-Modules Modal Popup ── */}
      {isFoodHealthModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-health-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsFoodHealthModalOpen(false)
              setSelectedFoodSubModuleId(null)
              setFoodOrderPlaced(false)
            }}
          >
            <div
              className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-100 relative flex flex-col max-h-[90vh] overflow-hidden transition-all ${selectedFoodSubModule ? "max-w-5xl" : "max-w-xl"
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsFoodHealthModalOpen(false)
                  setSelectedFoodSubModuleId(null)
                  setFoodOrderPlaced(false)
                  setVegSearchQuery("")
                  setVegCategoryFilter("All")
                }}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 flex items-center justify-center transition-colors cursor-pointer z-40"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Pinned Modal Header (When viewing a sub-module detail) */}
              {selectedFoodSubModule && (
                <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-3 border-b border-slate-100 bg-white shrink-0">
                  {/* Back Link & Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pr-10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFoodSubModuleId(null)
                        setFoodOrderPlaced(false)
                        setVegSearchQuery("")
                        setVegCategoryFilter("All")
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-emerald-700 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Categories</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        {selectedFoodSubModule?.id === "vegetables" ? (
                          <span>{vegTiming.headerBadge}</span>
                        ) : (
                          <>
                            <span>⚡</span> Hosur Hub • ⏱ 8 Mins Delivery
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Title and Search Row (only for live catalogs, not Coming Soon) */}
                  {selectedFoodSubModule.id !== "groceries" && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            {selectedFoodSubModule.name}
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {selectedFoodSubModule.items.length} items
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {selectedFoodSubModule.tagline}
                          </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative min-w-[240px]">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={vegSearchQuery}
                            onChange={(e) => setVegSearchQuery(e.target.value)}
                            placeholder={`Search ${selectedFoodSubModule.name.toLowerCase()} (e.g. Onion, Tomato)...`}
                            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                          />
                          {vegSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setVegSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Filter Pills (if vegetables) */}
                      {selectedFoodSubModule.id === "vegetables" && (
                        <div className="flex items-center gap-2 overflow-x-auto pt-3 no-scrollbar">
                          {["All", "Daily Essentials", "Herbs & Leafy", "Gourds & Roots", "Organic & Exotic", "Herbs & Seasoning"].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setVegCategoryFilter(cat)}
                              className={`px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${vegCategoryFilter === cat
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Scrollable Body Container (Optimized for smooth 60fps scrolling) */}
              <div
                className="flex-1 overflow-y-auto p-5 sm:p-7 overscroll-contain"
                style={{
                  overscrollBehavior: "contain",
                  WebkitOverflowScrolling: "touch",
                  willChange: "scroll-position",
                  transform: "translateZ(0)",
                }}
              >
                {!selectedFoodSubModule ? (
                  /* Sub-Modules Main View: Groceries & Vegetables (Compact & Attractive Emerald UI) */
                  <div>
                    <div className="text-center mb-6">
                      <h3
                        id="food-health-modal-title"
                        className="text-lg sm:text-xl font-extrabold text-slate-900"
                      >
                        Food and Health
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Choose a category to view items &amp; schedule fast delivery
                      </p>
                    </div>

                    {/* 2 Compact & Attractive Sub-Module Cards */}
                    <div className="grid grid-cols-2 gap-4 items-stretch max-w-lg mx-auto">
                      {foodHealthSub.map((sub, index) => {
                        const isGroceries = sub.id === "groceries"
                        const borderHoverClass = isGroceries
                          ? "hover:border-amber-400 hover:bg-amber-50/20"
                          : "hover:border-emerald-500 hover:bg-emerald-50/30"
                        const textHoverClass = isGroceries
                          ? "group-hover:text-amber-800"
                          : "group-hover:text-emerald-700"
                        const badgeBgClass = isGroceries
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-emerald-100/80 text-emerald-800 border-emerald-200"

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              if (sub.id === "vegetables") {
                                setIsFoodHealthModalOpen(false)
                                setSelectedFoodSubModuleId(null)
                                navigate(routes.vegetables)
                                return
                              }
                              setSelectedFoodSubModuleId(sub.id)
                              setFoodOrderPlaced(false)
                              setVegSearchQuery("")
                              setVegCategoryFilter("All")
                            }}
                            className={`group flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-slate-100 hover:shadow-md bg-white relative ${borderHoverClass}`}
                          >
                            <div className="w-full aspect-square max-w-[125px] rounded-2xl bg-slate-50 group-hover:bg-white border border-slate-100/80 overflow-hidden flex items-center justify-center p-1 group-hover:scale-105 transition-all shadow-2xs relative">
                              <img
                                src={sub.image || (isGroceries ? "/mockups/groceries_realistic.png" : "/mockups/vegetables_realistic.png")}
                                alt={sub.name}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = isGroceries ? "/mockups/groceries_realistic.png" : "/mockups/vegetables_realistic.png"; }}
                                className="w-full h-full object-cover rounded-xl"
                              />
                              {isGroceries && (
                                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                                  Coming Soon
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <span className={`text-sm sm:text-base font-bold text-slate-900 ${textHoverClass} transition-colors block`}>
                                {sub.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block leading-tight">
                                {sub.desc || sub.tagline || ""}
                              </span>
                              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeBgClass}`}>
                                {isGroceries ? "⏳ " : "🌱 "}{sub.badge || ""}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* Sub-Module Detail Catalog View */
                  <div>
                    {selectedFoodSubModuleId === "groceries" ? (
                      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-amber-50/60 to-orange-50/20 border-2 border-amber-200/70 text-center my-4">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden mx-auto mb-4 border-2 border-amber-200 shadow-lg">
                          <img
                            src="/mockups/groceries_realistic.png"
                            alt="Groceries Coming Soon"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold mb-3 border border-amber-300 shadow-2xs">
                          <span>⏳</span> Coming Soon to Hosur
                        </div>
                        <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          Groceries Delivery is Coming Soon!
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                          We are currently expanding our express fulfillment network in Hosur to deliver packaged staples, daily essentials, and dairy directly to your doorstep.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFoodSubModuleId(foodHealthSub[1].id)
                              setFoodOrderPlaced(false)
                              setVegSearchQuery("")
                              setVegCategoryFilter("All")
                            }}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
                          >
                            <span>Order Fresh Vegetables</span>
                            <span>&rarr;</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFoodSubModuleId(null)
                              setFoodOrderPlaced(false)
                            }}
                            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all border border-slate-200 cursor-pointer"
                          >
                            Back to Categories
                          </button>
                        </div>
                      </div>
                    ) : foodOrderPlaced ? (
                      <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-50 to-teal-50 border-2 border-emerald-200 text-center my-6">
                        <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-600/30">
                          <Check className="w-8 h-8 stroke-[3]" />
                        </div>
                        <h5 className="text-xl font-extrabold text-emerald-950">
                          Order Confirmed Successfully!
                        </h5>
                        <p className="text-xs sm:text-sm text-emerald-800 font-medium mt-1.5 max-w-md mx-auto">
                          Your fresh {selectedFoodSubModule?.name?.toLowerCase() || ""} order has been placed. Our Hosur delivery partner is packing and dispatching your items within 8-10 minutes.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-emerald-800 text-xs font-bold border border-emerald-200">
                          <span>📍 Delivery to:</span> Hosur Central &bull; ⏱ ETA: 8-12 mins
                        </div>
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => {
                              setFoodCart({})
                              setFoodOrderPlaced(false)
                              setSelectedFoodSubModuleId(null)
                            }}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs sm:text-sm hover:bg-emerald-700 cursor-pointer shadow-md transition-all"
                          >
                            Back to Home
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Out of Zone Notice Banner for Fresh Vegetables */}
                        {selectedFoodSubModule?.id === "vegetables" && !isServiceAvailableInZone("vegetables") && (
                          <div className="mb-4 p-3.5 sm:p-4 bg-rose-50 border border-rose-200 text-rose-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0 font-black text-base">
                                🚫
                              </div>
                              <div className="text-xs">
                                <div className="font-black text-rose-900 text-xs sm:text-sm mb-0.5">
                                  Farm-Fresh Vegetables Delivery Unavailable in Your Area
                                </div>
                                <p className="font-medium text-rose-800 leading-snug">
                                  Doorstep delivery for fresh produce is only available inside marked service zones (e.g. Vassuthaa Garden, KCC Nagar).
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowLocationPickerModal(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shrink-0 cursor-pointer shadow-xs transition-all"
                            >
                              Change Address
                            </button>
                          </div>
                        )}

                        {/* Booking Notice Banner for Fresh Vegetables (After 12 PM / Outside 6 AM - 12 PM Window) */}
                        {selectedFoodSubModule?.id === "vegetables" && isServiceAvailableInZone("vegetables") && vegTiming.afterTwelveNotice && (
                          <div className="mb-4 p-3.5 sm:p-4 bg-amber-50 border border-amber-300/80 text-amber-950 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                              <Clock className="w-4 h-4 text-amber-700" />
                            </div>
                            <div className="flex-1 text-xs">
                              <div className="font-extrabold text-amber-900 text-xs sm:text-sm mb-0.5 flex items-center gap-2">
                                <span>Booking Notice (After 12:00 PM)</span>
                                <span className="text-[10px] font-black bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase">Next-Day Delivery</span>
                              </div>
                              <p className="font-semibold text-amber-900 leading-relaxed">
                                Same-day vegetable booking is open from <strong>6:00 AM to 12:00 PM</strong>. Same-day booking is not available at the moment — <strong>even if booked now, it will be delivered tomorrow between 6:00 PM and 8:00 PM</strong>.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Products Grid matching Quick Commerce Layout */}
                        {([...(selectedFoodSubModule?.items || [])])
                          .sort((a, b) => getProducePriority(a.name) - getProducePriority(b.name))
                          .filter((item) => {
                            const q = vegSearchQuery.toLowerCase()
                            const matchesSearch =
                              !vegSearchQuery ||
                              item.name.toLowerCase().includes(q) ||
                              (item.category && item.category.toLowerCase().includes(q))
                            const matchesCat =
                              vegCategoryFilter === "All" || item.category === vegCategoryFilter
                            return matchesSearch && matchesCat
                          }).length === 0 ? (
                          <div className="py-12 text-center">
                            <p className="text-sm font-bold text-slate-500">No items found matching your search.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setVegSearchQuery("")
                                setVegCategoryFilter("All")
                              }}
                              className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                            >
                              Clear filters
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5 mb-2">
                            {([...(selectedFoodSubModule.items || [])])
                              .sort((a, b) => getProducePriority(a.name) - getProducePriority(b.name))
                              .filter((item) => {
                                const q = vegSearchQuery.toLowerCase()
                                const matchesSearch =
                                  !vegSearchQuery ||
                                  item.name.toLowerCase().includes(q) ||
                                  (item.category && item.category.toLowerCase().includes(q))
                                const matchesCat =
                                  vegCategoryFilter === "All" || item.category === vegCategoryFilter
                                return matchesSearch && matchesCat
                              })
                              .map((item, idx) => {
                                const opts = item.options || getVegetableOptions(item.name)
                                const hasOptions = opts && opts.length > 0
                                const count = hasOptions
                                  ? opts.reduce((sum, opt) => sum + (foodCart[`${item.name} (${opt.unit})`] || 0), 0)
                                  : (foodCart[item.name] || 0)
                                return (
                                  <div
                                    key={idx}
                                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md flex flex-col justify-between transition-shadow duration-150 overflow-hidden"
                                    style={{
                                      contentVisibility: "auto",
                                      containIntrinsicSize: "0 230px",
                                    }}
                                  >
                                    <div
                                      onClick={() => {
                                        if (selectedFoodSubModule?.id === "vegetables") {
                                          setSelectedRecipeVegetable(item)
                                          setIsRecipeModalOpen(true)
                                        }
                                      }}
                                      className={selectedFoodSubModule?.id === "vegetables" ? "cursor-pointer" : ""}
                                    >
                                      {/* Real Studio Photographic Product Image */}
                                      <div className="relative w-full aspect-square bg-[#f5f1eb] overflow-hidden">
                                        <img
                                          src={item.image || getFoodItemPhoto(item.name, selectedFoodSubModule.id === "groceries")}
                                          alt={item.name}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                          onError={(e) => {
                                            if (e.target.src.includes("/mockups/")) {
                                              e.target.onerror = null
                                              e.target.src = "/mockups/category_food_health.png"
                                            } else {
                                              e.target.src = getFoodItemPhoto(item.name, selectedFoodSubModule?.id === "groceries")
                                            }
                                          }}
                                        />
                                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-black text-slate-700 shadow-2xs">
                                          <Clock className="w-2.5 h-2.5 text-emerald-600" />
                                          <span>
                                            {selectedFoodSubModule.id === "vegetables"
                                              ? vegTiming.cardDeliveryBadge
                                              : (item.delivery || "8 MINS")}
                                          </span>
                                        </div>
                                        {item.discount && (
                                          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                                            {item.discount}
                                          </div>
                                        )}
                                      </div>

                                      {/* Details */}
                                      <div className="p-2.5">
                                        <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight min-h-[30px]" title={item.name}>
                                          {item.name}
                                        </h5>
                                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                          {item.unit}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Price and Add CTA */}
                                    <div className="p-2.5 pt-0 flex items-center justify-between gap-1.5 mt-auto">
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                            ₹{item.price}
                                          </span>
                                        </div>
                                        {item.mrp && (
                                          <span className="text-[10px] text-slate-400 line-through">
                                            ₹{item.mrp}
                                          </span>
                                        )}
                                      </div>

                                      {hasOptions ? (
                                        count > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => setVariantModalItem({ ...item, options: opts })}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer hover:bg-emerald-700 transition-all active:scale-95"
                                          >
                                            <span>{count} in Cart</span>
                                            <ChevronDown className="w-2.5 h-2.5" />
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setVariantModalItem({ ...item, options: opts })}
                                            className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer active:scale-95 bg-white flex items-center gap-1 shadow-2xs"
                                          >
                                            <span>ADD</span>
                                            <ChevronDown className="w-2.5 h-2.5" />
                                          </button>
                                        )
                                      ) : count > 0 ? (
                                        <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 shadow-xs">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFoodCart((prev) => ({
                                                ...prev,
                                                [item.name]: Math.max(0, (prev[item.name] || 0) - 1),
                                              }))
                                            }
                                            className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                          >
                                            -
                                          </button>
                                          <span className="text-xs font-extrabold min-w-[14px] text-center px-0.5">
                                            {count}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFoodCart((prev) => ({
                                                ...prev,
                                                [item.name]: (prev[item.name] || 0) + 1,
                                              }))
                                            }
                                            className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                          >
                                            +
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFoodCart((prev) => ({
                                              ...prev,
                                              [item.name]: 1,
                                            }))
                                          }
                                          className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer active:scale-95 bg-white"
                                        >
                                          ADD
                                        </button>
                                      )}
                                    </div>

                                    {/* What Can I Make CTA */}
                                    <div className="px-2.5 pb-2.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRecipeVegetable(item)
                                          setIsRecipeModalOpen(true)
                                        }}
                                        className="w-full py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer active:scale-98"
                                      >
                                        <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span className="truncate">🍳 What Can I Make?</span>
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        )}

                        {/* Quick Pack/Weight Options Modal */}
                        {variantModalItem && (
                          <div
                            className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
                            onClick={() => setVariantModalItem(null)}
                          >
                            <div
                              className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Floating Close Button on top */}
                              <button
                                type="button"
                                onClick={() => setVariantModalItem(null)}
                                className="absolute -top-4 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-3 sm:-top-4 w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer z-10"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              {/* Modal Header */}
                              <h4 className="text-base sm:text-lg font-black text-slate-900 mb-4 pr-6">
                                {variantModalItem.name}
                              </h4>

                              {/* Options List */}
                              <div className="space-y-3">
                                {variantModalItem.options?.map((opt, oIdx) => {
                                  const cartKey = `${variantModalItem.name} (${opt.unit})`
                                  const optCount = foodCart[cartKey] || 0
                                  return (
                                    <div
                                      key={oIdx}
                                      className="bg-white rounded-2xl border border-slate-200/90 p-3 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-500 transition-all"
                                    >
                                      {/* Left: Product Thumbnail */}
                                      <div className="w-14 h-14 rounded-xl bg-[#f5f1eb] overflow-hidden shrink-0">
                                        <img
                                          src={variantModalItem.image || getFoodItemPhoto(variantModalItem.name, false)}
                                          alt={variantModalItem.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      {/* Middle: Unit & Price */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-800">
                                          {opt.unit}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-xs sm:text-sm font-black text-slate-900">
                                            ₹{opt.price}
                                          </span>
                                          {opt.mrp && (
                                            <span className="text-[10px] text-slate-400 line-through">
                                              ₹{opt.mrp}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right: Add/Quantity Control */}
                                      <div className="shrink-0">
                                        {optCount > 0 ? (
                                          <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 shadow-xs">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setFoodCart((prev) => ({
                                                  ...prev,
                                                  [cartKey]: Math.max(0, (prev[cartKey] || 0) - 1),
                                                }))
                                              }
                                              className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                            >
                                              -
                                            </button>
                                            <span className="text-xs font-extrabold min-w-[14px] text-center px-0.5">
                                              {optCount}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setFoodCart((prev) => ({
                                                  ...prev,
                                                  [cartKey]: (prev[cartKey] || 0) + 1,
                                                }))
                                              }
                                              className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1"
                                            >
                                              +
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFoodCart((prev) => ({
                                                ...prev,
                                                [cartKey]: 1,
                                              }))
                                            }
                                            className="px-4 py-1.5 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs transition-all cursor-pointer active:scale-95 bg-white"
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
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Pinned Fixed Bottom Action Bar */}
              {selectedFoodSubModule && selectedFoodSubModule.id !== "groceries" && !foodOrderPlaced && (
                <div className="px-5 sm:px-7 py-3.5 bg-white border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] rounded-b-3xl">
                  <div className="text-xs text-slate-600 font-semibold">
                    {Object.values(foodCart).reduce((a, b) => a + b, 0) > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                          {Object.values(foodCart).reduce((a, b) => a + b, 0)} items in cart
                        </span>
                        <span className="text-slate-800 font-bold">
                          Total: ₹
                          {Object.entries(foodCart).reduce((sum, [nameWithUnit, qty]) => {
                            if (qty <= 0) return sum
                            let matchedPrice = 0
                            if (selectedFoodSubModule?.items) {
                              for (const it of selectedFoodSubModule.items) {
                                if (it.options) {
                                  for (const opt of it.options) {
                                    if (`${it.name} (${opt.unit})` === nameWithUnit) {
                                      matchedPrice = opt.price
                                      break
                                    }
                                  }
                                }
                                if (matchedPrice) break
                                if (it.name === nameWithUnit) {
                                  matchedPrice = it.price
                                  break
                                }
                              }
                            }
                            return sum + matchedPrice * qty
                          }, 0)}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-800 hidden sm:inline">
                          • {vegTiming.deliverySlot}
                        </span>
                      </div>
                    ) : (
                      <span>
                        {selectedFoodSubModule.id === "vegetables"
                          ? (vegTiming.afterTwelveNotice
                            ? "⚠️ Orders placed now will be delivered Tomorrow (6:00 PM – 8:00 PM)"
                            : "🥦 Order Window: 6:00 AM – 12:00 PM • Delivery Today: 6:00 PM – 8:00 PM")
                          : "Select vegetables above for instant Hosur door delivery"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {/* Add to Cart / View Cart Button - opens Image 4 drawer */}
                    <button
                      type="button"
                      disabled={Object.values(foodCart).reduce((a, b) => a + b, 0) === 0}
                      onClick={() => setShowVegCartDrawer(true)}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all border flex items-center justify-center gap-2 ${Object.values(foodCart).reduce((a, b) => a + b, 0) > 0
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-700 cursor-pointer active:scale-98"
                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>

                    {/* Confirm & Schedule Delivery */}
                    <button
                      type="button"
                      disabled={Object.values(foodCart).reduce((a, b) => a + b, 0) === 0}
                      onClick={() => {
                        const itemsList = []
                        Object.entries(foodCart).forEach(([nameWithUnit, qty]) => {
                          if (qty <= 0) return
                          let matchedItem = null
                          let unit = "1 unit"
                          let price = 0
                          let mrp = 0
                          let baseName = nameWithUnit

                          if (selectedFoodSubModule?.items) {
                            for (const it of selectedFoodSubModule.items) {
                              if (it.options) {
                                for (const opt of it.options) {
                                  if (`${it.name} (${opt.unit})` === nameWithUnit) {
                                    matchedItem = it
                                    unit = opt.unit
                                    price = opt.price
                                    mrp = opt.mrp || Math.round(opt.price * 1.2)
                                    baseName = it.name
                                    break
                                  }
                                }
                              }
                              if (matchedItem) break
                              if (it.name === nameWithUnit) {
                                matchedItem = it
                                unit = it.unit
                                price = it.price
                                mrp = it.mrp || Math.round(it.price * 1.2)
                                baseName = it.name
                                break
                              }
                            }
                          }

                          itemsList.push({
                            id: `veg_${nameWithUnit.replace(/[^a-zA-Z0-9]/g, "_")}`,
                            name: baseName,
                            displayName: nameWithUnit,
                            unit: unit,
                            price: price || 30,
                            mrp: mrp || (price ? Math.round(price * 1.2) : 36),
                            quantity: qty,
                            image: matchedItem?.image || getFoodItemPhoto(baseName, selectedFoodSubModule?.id === "groceries"),
                            serviceType: "vegetables_quick_delivery",
                            deliveryMins: "15-25 mins",
                          })
                        })

                        if (itemsList.length === 0) return

                        if (selectedFoodSubModule?.id === "vegetables" && !isServiceAvailableInZone("vegetables")) {
                          showUnavailableServiceAlert("Farm-Fresh Vegetables")
                          return
                        }

                        document.body.style.overflow = ""
                        setIsFoodHealthModalOpen(false)
                        setSelectedFoodSubModuleId(null)
                        navigate(routes.booking_checkout, {
                          state: {
                            category: {
                              id: "vegetables_quick_delivery",
                              name: selectedFoodSubModule?.name || "Farm-Fresh Vegetables",
                              isQuickCommerce: true,
                              deliveryTime: vegTiming.deliverySlot,
                              foodSubModuleId: selectedFoodSubModule?.id || "vegetables",
                              vegTiming: vegTiming,
                            },
                            cart: itemsList.map(it => ({ ...it, deliveryTime: vegTiming.deliverySlot })),
                            isQuickCommerce: true,
                            foodCart: foodCart,
                            foodSubModuleId: selectedFoodSubModule?.id || "vegetables",
                            vegTiming: vegTiming,
                          }
                        })
                      }}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 ${Object.values(foodCart).reduce((a, b) => a + b, 0) > 0
                        ? selectedFoodSubModule.id === "vegetables" && !isServiceAvailableInZone("vegetables")
                          ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 cursor-pointer active:scale-98"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 cursor-pointer active:scale-98"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                    >
                      <span>
                        {selectedFoodSubModule.id === "vegetables"
                          ? !isServiceAvailableInZone("vegetables")
                            ? "Unavailable in Your Area"
                            : vegTiming.cartButtonText
                          : `Confirm & Schedule ${selectedFoodSubModule.name} Delivery`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Vegetable Multi-Pack Variant Selection Modal matching Image 1 & 2 ── */}
              <AnimatePresence>
                {variantModalItem && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setVariantModalItem(null)
                    }}
                  >
                    <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
                      {/* Floating Close Button matching circle with X */}
                      <button
                        type="button"
                        onClick={() => setVariantModalItem(null)}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-black cursor-pointer shadow-xl transition-transform active:scale-95"
                      >
                        <X className="w-5 h-5 stroke-[2.5]" />
                      </button>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mb-3 px-1">
                        {variantModalItem.name?.toLowerCase().includes("spinach")
                          ? "Spinach Pack"
                          : variantModalItem.name?.split("(")[0].trim() || variantModalItem.name}
                      </h3>

                      {/* Options List */}
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-0.5">
                        {variantModalItem.options?.map((opt, oIdx) => {
                          const optCartKey = `${variantModalItem.name} (${opt.unit})`
                          const optCount = foodCart[optCartKey] || 0
                          return (
                            <div
                              key={oIdx}
                              className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 flex items-center justify-between gap-3 shadow-2xs transition-all"
                            >
                              {/* Left: Thumbnail with blue discount badges */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-[#f5f1eb] shrink-0 border border-slate-100">
                                  <img
                                    src={variantModalItem.image || getFoodItemPhoto(variantModalItem.name)}
                                    alt={variantModalItem.name}
                                    className="w-full h-full object-cover"
                                  />
                                  {opt.discount && (
                                    <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs leading-none">
                                      {opt.discount.replace(" OFF", "")} OFF
                                    </span>
                                  )}
                                  {opt.badge && (
                                    <span className="absolute top-1 right-1 bg-blue-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-2xs">
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>

                                {/* Unit & Pricing */}
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                    {opt.unit}
                                  </p>
                                  <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-sm sm:text-base font-black text-slate-900">
                                      ₹{opt.price}
                                    </span>
                                    {opt.mrp && (
                                      <span className="text-xs text-slate-400 line-through">
                                        ₹{opt.mrp}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: ADD CTA or Quantity Controller */}
                              <div className="shrink-0">
                                {optCount > 0 ? (
                                  <div className="flex items-center bg-emerald-600 text-white rounded-xl px-2 py-1 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFoodCart((prev) => {
                                          const cur = prev[optCartKey] || 0
                                          if (cur <= 1) {
                                            const copy = { ...prev }
                                            delete copy[optCartKey]
                                            return copy
                                          }
                                          return { ...prev, [optCartKey]: cur - 1 }
                                        })
                                      }
                                      className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1.5"
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-extrabold min-w-[16px] text-center px-1">
                                      {optCount}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFoodCart((prev) => ({
                                          ...prev,
                                          [optCartKey]: (prev[optCartKey] || 0) + 1,
                                        }))
                                      }
                                      className="text-white hover:text-emerald-100 font-black text-xs cursor-pointer px-1.5"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFoodCart((prev) => ({
                                        ...prev,
                                        [optCartKey]: 1,
                                      }))
                                    }
                                    className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 bg-white shadow-2xs"
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
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>,
          document.body
        )}

      <CustomerEntryFlowModal
        isOpen={showCustomerEntryModal}
        onClose={() => setShowCustomerEntryModal(false)}
        onComplete={() => {
          setShowCustomerEntryModal(false)
          if (typeof refreshMe === "function") refreshMe()
          // Restore any pending booking intent (e.g. customer pressed "View Cart" while logged out)
          const intent = restorePendingIntent()
          if (intent?.type === "GO_TO_CHECKOUT" && intent.cart?.length) {
            navigate(routes.booking_checkout, {
              state: { category: intent.category, cart: intent.cart }
            })
          }
        }}
      />

      {/* Cart Summary Drawer Modal */}
      <AnimatePresence>
        {showCartDrawer && (
          <CartDrawerModal
            isOpen={showCartDrawer}
            onClose={() => setShowCartDrawer(false)}
            cart={modalCart}
            setCart={setModalCart}
            onProceedToCheckout={() => {
              setShowCartDrawer(false)
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick-Commerce Veg Cart Drawer Modal matching Image 4 */}
      <AnimatePresence>
        {showVegCartDrawer && (
          <VegCartDrawerModal
            isOpen={showVegCartDrawer}
            onClose={() => setShowVegCartDrawer(false)}
            foodCart={foodCart}
            setFoodCart={setFoodCart}
            selectedFoodSubModule={selectedFoodSubModule}
            getFoodItemPhoto={getFoodItemPhoto}
            deliveryAddress={activeLocationLabel || (typeof user?.last_known_location === "string" ? user?.last_known_location : user?.last_known_location?.label) || user?.address || "Select Location"}
            onChangeAddress={() => setShowLocationPickerModal(true)}
            isServiceAvailable={isServiceAvailableInZone("vegetables")}
          />
        )}
      </AnimatePresence>

      {/* Vegetable Recipe Modal / Drawer */}
      <VegetableRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false)
          setSelectedRecipeVegetable(null)
        }}
        selectedVegetable={selectedRecipeVegetable}
        foodCart={foodCart}
        setFoodCart={setFoodCart}
        onAddAvailableVegetables={(missingVegs) => {
          setFoodCart((prev) => {
            const copy = { ...prev }
            missingVegs.forEach((v) => {
              const name = v.package_name || v.name
              if (!copy[name]) {
                copy[name] = 1
              }
            })
            return copy
          })
        }}
        onUpdateCartQty={(name, delta) => {
          setFoodCart((prev) => {
            const cur = prev[name] || 0
            const next = Math.max(0, cur + delta)
            const copy = { ...prev }
            if (next === 0) delete copy[name]
            else copy[name] = next
            return copy
          })
        }}
      />

      <AnimatePresence>
        {showAccountPortal && (
          <CustomerAccountModal
            activeTab={activeAccountTab}
            onChangeTab={setActiveAccountTab}
            onClose={() => setShowAccountPortal(false)}
          />
        )}
      </AnimatePresence>

      {/* Urban Company Style Floating Bottom Cart Bar */}
      {modalCart && modalCart.length > 0 && !activeCategory && !isGoodsModalOpen && !isFoodHealthModalOpen && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={() => {
            // If not logged in, save GO_TO_CHECKOUT intent so cart is restored after auth
            if (!user && modalCart?.length) {
              savePendingIntent({
                type: "GO_TO_CHECKOUT",
                cart: modalCart,
                category: activeCategory,
              })
            }
            navigate(routes.booking_checkout, { state: { category: activeCategory, cart: modalCart } })
          }}
          className="fixed bottom-[calc(4.25rem+var(--safe-area-bottom)+0.35rem)] sm:bottom-6 left-0 right-0 mx-auto z-40 w-[92%] max-w-sm bg-gradient-to-r from-emerald-600 to-[#0B8F7A] text-white rounded-full px-3.5 py-2 shadow-xl shadow-emerald-950/30 border border-emerald-400/40 flex items-center justify-between gap-2 backdrop-blur-md cursor-pointer hover:shadow-2xl hover:shadow-emerald-900/40 transition-all group select-none active:scale-[0.98]"
        >
          {/* Left: Compact Cart Icon & Count + Total Price */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <ShoppingCart size={14} className="text-white" />
              <span className="absolute -top-1 -right-1 bg-white text-emerald-800 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {modalCart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-emerald-50 tracking-tight whitespace-nowrap">
                {modalCart.reduce((sum, i) => sum + i.quantity, 0)} {modalCart.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "item" : "items"}
              </span>
              <span className="text-emerald-200/70 text-xs">•</span>
              <span className="text-sm font-black tracking-tight text-white whitespace-nowrap">
                ₹{modalCart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Right: Sleek View Cart Pill Button */}
          <div className="flex items-center gap-1 bg-white/20 group-hover:bg-white/30 text-white font-black text-xs px-3 py-1.5 rounded-full transition-all shrink-0 shadow-xs">
            <span>View Cart</span>
            <ChevronRight size={13} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>
      )}

      {showLocationPickerModal && (
        <SelectServiceAddressDrawer
          isOpen={showLocationPickerModal}
          onClose={() => setShowLocationPickerModal(false)}
          currentAddress={activeLocationLabel}
          onSelectAddress={async (locObj) => {
            setShowLocationPickerModal(false)
            if (locObj) {
              const labelStr = typeof locObj === "string" ? locObj : (locObj?.formatted_address || locObj?.locality || locObj?.city || "")
              setActiveLocationLabel(labelStr)
              const detectedCity = locObj?.city || (locObj?.locality ? locObj.locality : null) || (typeof labelStr === "string" ? labelStr.split(",")[0]?.trim() : "")
              if (detectedCity) {
                setSelectedCity(detectedCity)
                localStorage.setItem("calservice_user_city", detectedCity)
              }
              if (user?.id) {
                setCustomerLocation(user.id, labelStr)
                setCustomerSelectedAddress(user.id, locObj)
              }
              if (locObj.latitude && locObj.longitude) {
                const coords = { lat: Number(locObj.latitude), lng: Number(locObj.longitude) }
                await verifyServiceZone(coords.lat, coords.lng, labelStr)
              }
              if (user) {
                try {
                  await apiUpdateCustomerLastLocation({
                    label: labelStr,
                    latitude: locObj.latitude,
                    longitude: locObj.longitude,
                    detected_at: new Date().toISOString()
                  })
                } catch (e) { }
                if (typeof refreshMe === "function") refreshMe()
              }
            }
          }}
        />
      )}
    </>
  )
}
