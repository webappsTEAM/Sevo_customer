import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom"
import {
  Home, PaintRoller,
  SprayCan, Building2, AirVent, Hammer, Boxes,
  ShieldCheck, BadgeCheck, Clock, Award, Headphones,
  Star, Search, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  Smartphone, Phone, Mail, X, ArrowRight,
  ClipboardList, CalendarDays, UserCheck, DoorOpen, Wallet, User, SlidersHorizontal, ShoppingCart,
  Sparkles, Apple, ShoppingBag, Carrot, HeartPulse, CheckCircle2, Plus, Minus, Check, Repeat2, AlertCircle,
  Users, Wrench, Droplet, Zap, ThumbsUp, Bell, IndianRupee, Bug, Utensils
} from "lucide-react"
import { routes } from "../routes.js"
import { HeroServiceVisualization } from "../components/HeroServiceVisualization.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx"
import { PackageModal, CustomCleaningPackageModal, KitchenCleaningModal, PaintingPackageModal, MasonPackageModal, BkStyles, CustomerAccountModal, AddAddressSearchModal, CartDrawerModal } from "./BookingPage.jsx"
import { SelectServiceAddressDrawer } from "../components/AddressPicker/index.js"
import { VegCartDrawerModal } from "../components/VegCartDrawerModal.jsx"
import { VegetableRecipeModal } from "../components/vegetables/VegetableRecipeModal.jsx"
import { getVegetableTimingInfo } from "../../utils/vegetableSchedule.js"
import { CATEGORIES as BOOKING_CATEGORIES } from "./categoriesData.js"
import { SofaCleaningModal } from "./SofaCleaningModal.jsx"
import { BathroomCleaningModal } from "./BathroomCleaningModal.jsx"
import { CockroachControlModal } from "./CockroachControlModal.jsx"
import { AntsBedBugsControlModal } from "./AntsBedBugsControlModal.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import { usePendingIntent } from "../../hooks/usePendingIntent.js"
import { ThemeToggle } from "../shell/ThemeToggle.jsx"
import { apiUpdateCustomerLastLocation, apiFetchCustomerBookings } from "../../api/authService.js"
import { apiRequest } from "../../api/client.js"
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
import { getHomePageConfig, fetchPublishedHomePageConfig, resolveDisplayImageUrl } from "../../config/homePageConfig.js"
import acServiceImg from "../../assets/ac service.png"
import imgFoamSplit from "../../assets/Foam & Power Jet AC Service — Split.png"
import imgAntiRust from "../../assets/Anti-Rust Deep Clean AC Service.png"

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

// ── 3 Main Top-Level Category Pillars ─────────────────────────────────
const MAIN_CATEGORIES = [
  {
    id: "for_you",
    label: "For You",
    subtitle: "Recommended & personalized services tailored for your home",
    badge: "Trending",
    badgeColor: "bg-emerald-100 text-emerald-800",
    graphic: ForYouGraphic,
    bgGradient: "from-emerald-50/80 to-teal-50/40",
    accentColor: "#059669",
  },
  {
    id: "food_health",
    label: "Food and Health",
    subtitle: "Daily groceries, farm-fresh vegetables & wellness essentials",
    badge: "Groceries & Vegetables",
    badgeColor: "bg-amber-100 text-amber-900",
    graphic: FoodHealthGraphic,
    bgGradient: "from-amber-50/80 to-orange-50/40",
    accentColor: "#d97706",
  },
  {
    id: "home_services_combined",
    label: "Home, Repair & Transport Services",
    subtitle: "Cleaning, repairs, appliances, painting, masonry & logistics",
    badge: "6 Core Services",
    badgeColor: "bg-teal-100 text-teal-900",
    graphic: HomeCombinedGraphic,
    bgGradient: "from-teal-50/80 to-cyan-50/40",
    accentColor: "#0d9488",
  },
]

// ── Curated Multi-Pack & Weight Variants for Top High-Demand Vegetables ──
const VEGETABLE_VARIANTS_MAP = {
  onion: [
    { unit: "2 x 1 kg", price: 103, mrp: 121, discount: "14% OFF", badge: ".2" },
    { unit: "1 kg", price: 52, mrp: 60, discount: "13% OFF" },
  ],
  tomato: [
    { unit: "2 x 500 g", price: 27, mrp: 36, discount: "25% OFF", badge: ".2" },
    { unit: "500 g", price: 14, mrp: 18, discount: "22% OFF" },
  ],
  potato: [
    { unit: "2 x 1 kg", price: 52, mrp: 62, discount: "16% OFF", badge: ".2" },
    { unit: "1 kg", price: 27, mrp: 31, discount: "12% OFF" },
  ],
  ooty_potato: [
    { unit: "2 x 1 kg", price: 87, mrp: 114, discount: "24% OFF", badge: ".2" },
    { unit: "1 kg", price: 45, mrp: 57, discount: "21% OFF" },
  ],
  "lady finger": [
    { unit: "2 x 250 g", price: 27, mrp: 34, discount: "20% OFF", badge: ".2" },
    { unit: "250 g", price: 14, mrp: 17, discount: "17% OFF" },
  ],
  spinach: [
    { unit: "2 x 200 g", price: 39, mrp: 50, discount: "22% OFF", badge: "Pack of 2" },
    { unit: "200 g", price: 20, mrp: 25, discount: "20% OFF" },
  ],
  garlic: [
    { unit: "2 x 100 g", price: 72, mrp: 88, discount: "18% OFF", badge: ".2" },
    { unit: "100 g", price: 38, mrp: 44, discount: "13% OFF" },
  ],
}

const getVegetableOptions = (name) => {
  const lower = (name || "").toLowerCase()
  if (lower.includes("spring onion") || lower.includes("sambhar onion")) return null
  if (lower.includes("sweet potato")) return null

  if (lower.includes("onion") && !lower.includes("organic")) return VEGETABLE_VARIANTS_MAP.onion
  if (lower.includes("tomato") && !lower.includes("hybrid") && !lower.includes("organic")) return VEGETABLE_VARIANTS_MAP.tomato
  if (lower.includes("ooty potato")) return VEGETABLE_VARIANTS_MAP.ooty_potato
  if (lower.includes("potato") && !lower.includes("organic")) return VEGETABLE_VARIANTS_MAP.potato
  if (lower.includes("lady finger") || lower.includes("vendaikkai") || lower.includes("vendakkai") || lower.includes("ladies finger")) {
    if (!lower.includes("organic")) return VEGETABLE_VARIANTS_MAP["lady finger"]
  }
  if (lower.includes("spinach") || lower.includes("palak")) return VEGETABLE_VARIANTS_MAP.spinach
  if (lower.includes("garlic") && !lower.includes("peeled")) return VEGETABLE_VARIANTS_MAP.garlic
  return null
}

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

// ── Curated Vegetables & Groceries Data with Tamil Names ────────
const VEGETABLE_ITEMS = [
  // ── Top Daily Essentials (Priority Top) ──
  {
    name: "Tomato (Thakkali)",
    unit: "500 g",
    price: 14,
    mrp: 18,
    discount: "22% OFF",
    delivery: "8 MINS",
    category: "Daily Essentials",
    options: VEGETABLE_VARIANTS_MAP.tomato,
  },
  {
    name: "Onion (Vengayam)",
    unit: "1 kg",
    price: 52,
    mrp: 60,
    discount: "13% OFF",
    delivery: "8 MINS",
    category: "Daily Essentials",
    options: VEGETABLE_VARIANTS_MAP.onion,
  },
  {
    name: "Garlic (Poondu)",
    unit: "100 g",
    price: 38,
    mrp: 44,
    discount: "13% OFF",
    delivery: "8 MINS",
    category: "Herbs & Seasoning",
    options: VEGETABLE_VARIANTS_MAP.garlic,
  },
  { name: "Ginger", unit: "100 g", price: 21, mrp: 24, discount: "12% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  {
    name: "Potato (Urulaikizhangu)",
    unit: "1 kg",
    price: 27,
    mrp: 31,
    discount: "12% OFF",
    delivery: "8 MINS",
    category: "Daily Essentials",
    options: VEGETABLE_VARIANTS_MAP.potato,
  },
  { name: "Green Chilli (Pachai Milagaai)", unit: "100 g", price: 10, mrp: 11, discount: "9% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Curry Leaves (Karuvepillai)", unit: "50 g", price: 7, mrp: 9, discount: "22% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Coriander Bunch (Kothamalli)", unit: "100 g", price: 12, mrp: 15, discount: "20% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  {
    name: "Lady Finger (Vendaikkai)",
    unit: "250 g",
    price: 14,
    mrp: 17,
    discount: "17% OFF",
    delivery: "8 MINS",
    category: "Daily Essentials",
    options: VEGETABLE_VARIANTS_MAP["lady finger"],
  },
  { name: "Lemon (Elumichai Pazham)", unit: "200 g", price: 44, mrp: 53, discount: "16% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  {
    name: "Spinach (Palak Keerai)",
    unit: "200 g",
    price: 20,
    mrp: 25,
    discount: "20% OFF",
    delivery: "8 MINS",
    category: "Herbs & Leafy",
    options: VEGETABLE_VARIANTS_MAP.spinach,
  },
  { name: "Orange Carrot (Local Carrot)", unit: "500 g", price: 41, mrp: 49, discount: "18% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Green Cucumber (Vellarikai)", unit: "500 g", price: 21, mrp: 26, discount: "19% OFF", delivery: "8 MINS", category: "Daily Essentials" },

  // ── High Demand Kitchen Produce ──
  { name: "Brinjal (Vari Kathirikkai)", unit: "250 g", price: 18, mrp: 23, discount: "21% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Button Mushroom (Kaalan)", unit: "180 g", price: 65, mrp: 78, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Green Capsicum (Kudai Milagaai)", unit: "250 g", price: 17, mrp: 19, discount: "10% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Cauliflower (Pookosu)", unit: "300 g", price: 29, mrp: 37, discount: "21% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Cabbage (Muttaikose)", unit: "400 g", price: 19, mrp: 23, discount: "17% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Sweet Corn Cob (Cholam)", unit: "1 pc", price: 20, mrp: 24, discount: "18% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "French Beans (Beans)", unit: "250 g", price: 31, mrp: 36, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Bitter Gourd (Pavakkai)", unit: "500 g", price: 24, mrp: 28, discount: "14% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Bottle Gourd (Surakkai)", unit: "400 g", price: 20, mrp: 24, discount: "17% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Snake Gourd (Pudalangai)", unit: "500 g", price: 21, mrp: 24, discount: "12% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Ridge Gourd (Peerangai)", unit: "500 g", price: 21, mrp: 25, discount: "16% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Beetroot", unit: "500 g", price: 31, mrp: 37, discount: "16% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Radish (Mullangi)", unit: "500 g", price: 21, mrp: 24, discount: "12% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Mint Leaves (Pudina)", unit: "100 g", price: 12, mrp: 15, discount: "20% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Drumstick (Murungakkai)", unit: "2 pcs", price: 16, mrp: 18, discount: "11% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Drumstick Leaves (Moringa)", unit: "100 g", price: 15, mrp: 17, discount: "11% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Baby Potato (Urulaikizhangu)", unit: "500 g", price: 21, mrp: 24, discount: "12% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  {
    name: "Ooty Potato",
    unit: "1 kg",
    price: 45,
    mrp: 57,
    discount: "21% OFF",
    delivery: "8 MINS",
    category: "Daily Essentials",
    options: VEGETABLE_VARIANTS_MAP.ooty_potato,
  },
  { name: "Sambhar Onion (Vengayam)", unit: "250 g", price: 27, mrp: 31, discount: "13% OFF", delivery: "8 MINS", category: "Daily Essentials" },
  { name: "Spring Onion (Vengaya Thaal)", unit: "250 g", price: 17, mrp: 20, discount: "15% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Sweet Potato (Chakkara Valli)", unit: "450 g", price: 34, mrp: 39, discount: "12% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Peeled Garlic (Uricha Poondu)", unit: "100 g", price: 54, mrp: 65, discount: "17% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Fenugreek (Methi)", unit: "250 g", price: 25, mrp: 30, discount: "17% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Green Peas (Pachai Pattani)", unit: "250 g", price: 63, mrp: 76, discount: "17% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Green Lettuce", unit: "100 g", price: 24, mrp: 27, discount: "11% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Broccoli", unit: "200 g", price: 33, mrp: 40, discount: "17% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Ash Gourd (Sambal Pusanikkai)", unit: "1.5 kg", price: 46, mrp: 55, discount: "16% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Chow Chow", unit: "400 g", price: 29, mrp: 35, discount: "17% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Ivy Gourd (Kovakkai)", unit: "250 g", price: 9, mrp: 11, discount: "18% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Broad Beans (Avarakkai)", unit: "250 g", price: 16, mrp: 19, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Cluster Beans (Kothavarangai)", unit: "250 g", price: 14, mrp: 16, discount: "12% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Cowpea Beans (Karamani)", unit: "250 g", price: 24, mrp: 28, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Colocasia (Seppankizhangu)", unit: "250 g", price: 19, mrp: 22, discount: "14% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Raw Banana (Vazhakkai)", unit: "3 pcs", price: 42, mrp: 49, discount: "14% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Banana Stem (Vazhai Thandu)", unit: "800 g", price: 15, mrp: 18, discount: "17% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Green Zucchini", unit: "200 g", price: 30, mrp: 35, discount: "14% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Yellow Bell Pepper (Manjal Kuda Milagai)", unit: "125 g", price: 61, mrp: 70, discount: "13% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Red Bell Pepper", unit: "125 g", price: 48, mrp: 56, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Baby Corn - Packet", unit: "200 g", price: 30, mrp: 35, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Green Amaranthus Leaves", unit: "250 g", price: 18, mrp: 22, discount: "18% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Red Amaranthus Leaves", unit: "250 g", price: 19, mrp: 24, discount: "21% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Green Moong Sprouts", unit: "150 g", price: 45, mrp: 58, discount: "22% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Raw Turmeric (Manjal)", unit: "250 g", price: 67, mrp: 78, discount: "14% OFF", delivery: "8 MINS", category: "Herbs & Seasoning" },
  { name: "Amla (Nellikaai)", unit: "250 g", price: 31, mrp: 36, discount: "14% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Raw Papaya (Pappalikkai)", unit: "400 g", price: 39, mrp: 45, discount: "13% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Knol Khol (Nookal)", unit: "500 g", price: 22, mrp: 26, discount: "15% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Neem Leaves (Veppilai)", unit: "1 pack", price: 19, mrp: 22, discount: "13% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Fresh Rosemary", unit: "10 g", price: 16, mrp: 18, discount: "11% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Italian Basil Leaves", unit: "50 g", price: 35, mrp: 43, discount: "18% OFF", delivery: "8 MINS", category: "Herbs & Leafy" },
  { name: "Green Pumpkin (Pusanikkai)", unit: "400 g", price: 40, mrp: 48, discount: "17% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Pumpkin Yellow (Cut)", unit: "200 g", price: 42, mrp: 50, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Disco Pumpkin", unit: "500 g", price: 48, mrp: 58, discount: "17% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
  { name: "Pointed Gourd", unit: "250 g", price: 48, mrp: 56, discount: "14% OFF", delivery: "8 MINS", category: "Gourds & Roots" },
  { name: "Assorted Capsicum (R/Y/G)", unit: "3 pcs", price: 59, mrp: 70, discount: "16% OFF", delivery: "8 MINS", category: "Organic & Exotic" },
]

const GROCERY_ITEMS = [
  {
    name: "Essential Dals & Grains Combo",
    unit: "Standard Combo Pack",
    price: 499,
    mrp: 599,
    discount: "16% OFF",
    delivery: "15 MINS",
    category: "Flours & Grains"
  },
  {
    name: "Monthly Kitchen Staples Pack",
    unit: "Family Pack",
    price: 999,
    mrp: 1199,
    discount: "16% OFF",
    delivery: "15 MINS",
    category: "Flours & Grains"
  }
]

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
    badge: "8-min Farm Delivery",
    items: VEGETABLE_ITEMS,
  },
]

// ── For You Curated Sub-Services ───────────────────────────────────────
const FOR_YOU_SUB = [
  { name: "Full House Deep Cleaning", subtitle: "Complete home sanitization & scrub", graphic: FullHouseCleaningGraphic, categoryId: "cleaning", badge: "Most Booked" },
  { name: "AC Master Service", subtitle: "Filter cleaning, coil wash & gas check", graphic: AcGraphic, categoryId: "hvac", badge: "Summer Essential" },
  { name: "Instant Bike Courier", subtitle: "Documents & parcels delivered under 45 mins", graphic: TwoWheelerGraphic, action: "two_wheeler", badge: "Instant" },
  { name: "Express Electrician & Plumber", subtitle: "Wiring, switchboard & pipe repairs", graphic: ElectricianGraphic, categoryId: "electrical", badge: "Verified Pro" },
  { name: "Interior Wall Painting", subtitle: "Dustless sanding & premium finish", graphic: PaintRoller, categoryId: "painting", badge: "Top Rated" },
  { name: "Mini Truck Transport", subtitle: "Hassle-free goods & tempo booking", graphic: TruckGraphic, action: "truck", badge: "Hosur Special" },
]

// ── Real photos already in the project (public/mockups) ─────────────────
const CATEGORIES = [
  { label: "Home Services & Pest Control", icon: SprayCan, photo: "/mockups/service_cleaning.png", bg: "bg-indigo-50", ring: "border-indigo-100", fg: "text-indigo-600", hoverBg: "group-hover:bg-indigo-100", serviceCategoryId: "pest_control" },
  { label: "Paintings", icon: PaintRoller, photo: "/mockups/service_maintenance.png", bg: "bg-amber-50", ring: "border-amber-100", fg: "text-amber-600", hoverBg: "group-hover:bg-amber-100", serviceCategoryId: "painting" },
  { label: "Mason", icon: Building2, photo: "/mockups/service_building.png", bg: "bg-sky-50", ring: "border-sky-100", fg: "text-sky-600", hoverBg: "group-hover:bg-sky-100", serviceCategoryId: "mason" },
  { label: "AC & Appliance", icon: AirVent, photo: "/mockups/service_hvac.png", bg: "bg-rose-50", ring: "border-rose-100", fg: "text-rose-600", hoverBg: "group-hover:bg-rose-100", serviceCategoryId: "hvac" },
  { label: "Electrician, Plumbing & Carpentry", icon: Hammer, photo: "/mockups/service_electrical.png", bg: "bg-violet-50", ring: "border-violet-100", fg: "text-violet-600", hoverBg: "group-hover:bg-violet-100", serviceCategoryId: "electrical" },
]

const HOME_SERVICES_SUB = [
  { name: "Kitchen Cleaning", graphic: KitchenCleaningGraphic, categoryId: "kitchen_cleaning" },
  { name: "Sofa Cleaning", graphic: SofaCleaningGraphic, categoryId: "sofa_cleaning" },
  { name: "Bathroom Cleaning", graphic: BathroomCleaningGraphic, categoryId: "bathroom_cleaning" },
  { name: "Full House Cleaning", graphic: FullHouseCleaningGraphic, categoryId: "cleaning" },
]

const PEST_CONTROL_SUB = [
  { name: "Cockroach & Termite Control", graphic: CockroachControlGraphic, categoryId: "pest_control" },
  { name: "Ants & Bed Bugs Control", graphic: AntBedBugControlGraphic, categoryId: "pest_control" },
]

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

const STATS = [
  { value: "45K+", label: "Happy Customers" },
  { value: "1200+", label: "Verified Experts" },
  { value: "85K+", label: "Services Completed" },
  { value: "30 min", label: "Average Response" },
  { value: "4.8/5", label: "Average Rating" },
]

const PROFESSIONALS = [
  { name: "Sarah J.", role: "Licensed Electrician", rating: "4.9", jobs: "620+ jobs", photo: "/mockups/service_electrical.png" },
  { name: "Elite Plumbing", role: "Plumbing Specialist", rating: "4.8", jobs: "540+ jobs", photo: "/mockups/service_plumbing.png" },
  { name: "Advanced Climate", role: "AC & Appliance Tech", rating: "4.9", jobs: "410+ jobs", photo: "/mockups/service_hvac.png" },
  { name: "Eco Shine", role: "Home Cleaning Pro", rating: "4.7", jobs: "780+ jobs", photo: "/mockups/service_cleaning.png" },
]

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

// ── Location dropdown (Operating Cities Selector - Hosur Only) ────────────
const OPERATING_CITIES = [
  { name: "Hosur", state: "Tamil Nadu", isHub: true },
]

function LocationDropdown({ className = "", activeCity, onCityChange }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return activeCity || localStorage.getItem("calservice_user_city") || "Hosur"
  })

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

  return (
    <div className={`relative flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-full pl-3 pr-2 py-1.5 hover:border-slate-300 ${className}`}>
      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
      <select
        value={selectedCity}
        onChange={handleChange}
        className="bg-transparent outline-none appearance-none pr-4 cursor-pointer font-bold text-slate-800"
      >
        {OPERATING_CITIES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-slate-400" />
    </div>
  )
}

// ── All platform searchable services & individual packages for instant search ──
const ALL_SEARCHABLE_SERVICES = [
  // ── AC & Cooling Services ──
  {
    id: "hvac-fj-split",
    title: "Foam & Power Jet AC Service — Split",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Service & Cleaning",
    price: "₹599",
    badge: "Best Seller",
    tags: ["foam", "power jet", "jet service", "ac service", "split ac", "cooling", "air conditioner", "hvac", "ac jet wash"]
  },
  {
    id: "hvac-fj-win",
    title: "Foam & Power Jet AC Service — Window",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Service & Cleaning",
    price: "₹499",
    badge: "Window Care",
    tags: ["foam", "power jet", "window ac", "ac service", "jet cleaning", "cooling", "air conditioner"]
  },
  {
    id: "hvac-pj-split",
    title: "Power Jet AC Service — Split",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Service & Cleaning",
    price: "₹499",
    badge: "High Pressure",
    tags: ["power jet", "split ac", "ac cleaning", "jet wash", "air conditioner"]
  },
  {
    id: "hvac-pj-win",
    title: "Power Jet AC Service — Window",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Service & Cleaning",
    price: "₹399",
    tags: ["power jet", "window ac", "ac cleaning", "jet spray"]
  },
  {
    id: "hvac-ar-3",
    title: "Anti-Rust Deep Clean AC Service",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Service & Cleaning",
    price: "₹799",
    badge: "Ultimate Care",
    tags: ["anti-rust", "rust protection", "ac deep clean", "coil coating"]
  },
  {
    id: "hvac-rep-1",
    title: "AC Repair — Split/Window",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Repair",
    price: "₹599",
    badge: "Expert Fix",
    tags: ["ac repair", "ac servicing", "cooling breakdown", "split ac repair", "window ac repair"]
  },
  {
    id: "hvac-rep-2",
    title: "Less / No Cooling AC Diagnostic",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Repair",
    price: "₹499",
    badge: "Cooling Restore",
    tags: ["no cooling", "less cooling", "ac not cooling", "hot air", "compressor check"]
  },
  {
    id: "hvac-rep-4",
    title: "AC Water Leakage Repair",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Repair",
    price: "₹399",
    tags: ["water dripping", "water leakage", "drain pipe", "ac water leak"]
  },
  {
    id: "hvac-gas-1",
    title: "AC Gas Leak Fix & Refill",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Gas & Refrigerant",
    price: "₹1,799",
    badge: "Full Gas Fill",
    tags: ["gas refill", "gas charging", "gas leak", "freon", "r32", "r410a", "ac gas"]
  },
  {
    id: "hvac-inst-split",
    title: "Split AC Installation",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Installation & Uninstallation",
    price: "₹1,299",
    badge: "Popular",
    tags: ["split ac installation", "ac fitting", "ac mounting", "core drilling"]
  },
  {
    id: "hvac-uninst-1",
    title: "AC Uninstallation",
    category: "AC & Appliances",
    categoryId: "hvac",
    subTab: "AC Installation & Uninstallation",
    price: "₹699",
    tags: ["ac uninstallation", "dismount", "ac removal", "gas pump down"]
  },

  // ── Electrical & Fan Services ──
  {
    id: "elec-fan-1",
    title: "Ceiling Fan Installation",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Fan & Light",
    price: "₹199",
    badge: "Popular",
    tags: ["fan", "ceiling fan", "fan installation", "fan fitting", "hang fan", "new fan", "electrician", "electrical"]
  },
  {
    id: "elec-fan-2",
    title: "Ceiling Fan Repair / Uninstallation",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Fan & Light",
    price: "₹149",
    badge: "Quick Fix",
    tags: ["fan", "fan repair", "ceiling fan repair", "fan slow", "fan noise", "fan capacitor", "fan wobble", "electrician"]
  },
  {
    id: "elec-fan-3",
    title: "Exhaust Fan Installation",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Fan & Light",
    price: "₹199",
    badge: "Ventilation",
    tags: ["fan", "exhaust fan", "kitchen exhaust", "bathroom exhaust", "exhaust fan fitting", "electrician"]
  },
  {
    id: "elec-fan-4",
    title: "LED Light / Panel Light Installation",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Fan & Light",
    price: "₹149",
    badge: "Energy Save",
    tags: ["light", "led light", "bulb", "tube light", "spotlight", "panel light", "electrician", "lighting"]
  },
  {
    id: "elec-fan-5",
    title: "Fan Regulator Replacement",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Fan & Light",
    price: "₹149",
    badge: "Speed Control",
    tags: ["fan", "regulator", "fan regulator", "speed control", "dimmer", "fan switch", "electrician"]
  },
  {
    id: "elec-fan-6",
    title: "Light Fixture Replacement",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Fan & Light",
    price: "₹199",
    tags: ["light fixture", "bulb holder", "batten light", "electrician"]
  },
  {
    id: "elec-sw-1",
    title: "Switch / Socket Replacement",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Switches & Sockets",
    price: "₹99",
    badge: "Fast Dispatch",
    tags: ["switch", "socket", "plug", "power point", "switchboard", "electrician", "electrical socket"]
  },
  {
    id: "elec-sw-2",
    title: "Switchboard Repair & Wiring",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Switches & Sockets",
    price: "₹149",
    tags: ["switchboard", "board repair", "switch wiring", "electrician"]
  },
  {
    id: "elec-mcb-1",
    title: "MCB Replacement & Trip Fix",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "MCB & Wiring",
    price: "₹299",
    badge: "Safety",
    tags: ["mcb", "fuse", "breaker", "trip", "power trip", "short circuit", "db box", "electrician"]
  },
  {
    id: "elec-mcb-4",
    title: "Short Circuit & Burnt Wire Repair",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "MCB & Wiring",
    price: "₹499",
    badge: "Emergency",
    tags: ["short circuit", "sparking", "burnt wire", "mcb trip", "electrician"]
  },
  {
    id: "elec-inv-1",
    title: "Inverter Battery Checkup & Maintenance",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Inverter & Heavy Appliance",
    price: "₹299",
    badge: "Battery Audit",
    tags: ["inverter", "battery", "ups", "power backup", "acid water", "electrician"]
  },
  {
    id: "elec-inv-2",
    title: "Inverter Repair & PCB Fix",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Inverter & Heavy Appliance",
    price: "₹599",
    tags: ["inverter repair", "ups repair", "inverter not charging", "electrician"]
  },
  {
    id: "elec-inv-4",
    title: "Geyser Installation",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Inverter & Heavy Appliance",
    price: "₹399",
    badge: "Hot Water",
    tags: ["geyser", "water heater", "hot water geyser", "electrician", "plumber"]
  },
  {
    id: "elec-inv-5",
    title: "Geyser Repair",
    category: "Electrical & Plumbing",
    categoryId: "electrical",
    subTab: "Inverter & Heavy Appliance",
    price: "₹499",
    tags: ["geyser repair", "element change", "thermostat", "geyser not heating"]
  },

  // ── Plumbing Services ──
  {
    id: "plumb-tap-1",
    title: "Tap Repair / Replacement",
    category: "Electrical & Plumbing",
    categoryId: "plumbing",
    subTab: "Taps & Mixers",
    price: "₹149",
    badge: "Popular",
    tags: ["tap", "faucet", "water tap", "tap leak", "spout", "plumber", "plumbing"]
  },
  {
    id: "plumb-tap-2",
    title: "Wall Mixer Installation & Repair",
    category: "Electrical & Plumbing",
    categoryId: "plumbing",
    subTab: "Taps & Mixers",
    price: "₹249",
    tags: ["wall mixer", "mixer tap", "shower mixer", "plumber"]
  },
  {
    id: "plumb-pipe-1",
    title: "Water Leakage & Pipe Repair",
    category: "Electrical & Plumbing",
    categoryId: "plumbing",
    subTab: "Pipe & Drainage",
    price: "₹199",
    badge: "Leak Fix",
    tags: ["leakage", "water leak", "pipe burst", "pipe repair", "plumber", "plumbing"]
  },
  {
    id: "plumb-pipe-2",
    title: "Drainage & Washbasin Blockage Removal",
    category: "Electrical & Plumbing",
    categoryId: "plumbing",
    subTab: "Pipe & Drainage",
    price: "₹249",
    tags: ["blockage", "sink block", "drain clean", "clog", "washbasin", "plumber"]
  },
  {
    id: "plumb-toi-1",
    title: "Flush Tank Repair & Fitting",
    category: "Electrical & Plumbing",
    categoryId: "plumbing",
    subTab: "Toilet & Sanitary",
    price: "₹199",
    tags: ["flush tank", "toilet", "commode", "flush leak", "plumber"]
  },

  // ── Carpentry Services ──
  {
    id: "carp-lock-1",
    title: "Door Lock Repair & Installation",
    category: "Electrical & Plumbing",
    categoryId: "carpentry",
    subTab: "Lock & Hardware",
    price: "₹249",
    badge: "Skilled",
    tags: ["lock", "door lock", "godrej", "latch", "handle", "carpenter", "carpentry"]
  },
  {
    id: "carp-bed-1",
    title: "Bed Assembly / Dismantling",
    category: "Electrical & Plumbing",
    categoryId: "carpentry",
    subTab: "Furniture Repair",
    price: "₹399",
    tags: ["bed", "cot", "furniture assembly", "carpenter"]
  },
  {
    id: "carp-ward-1",
    title: "Wardrobe Hinge & Magnet Repair",
    category: "Electrical & Plumbing",
    categoryId: "carpentry",
    subTab: "Wardrobe & Cabinets",
    price: "₹199",
    tags: ["wardrobe", "cupboard", "hinge", "magnet", "carpenter"]
  },

  // ── Appliances (Washing Machine, Refrigerator, RO, TV, Microwave) ──
  {
    id: "wm-jet-1",
    title: "Washing Machine Jet Service",
    category: "AC & Appliances",
    categoryId: "washing_machine",
    subTab: "Washing Machine Jet Service",
    price: "₹599",
    badge: "Best Seller",
    tags: ["washing machine", "washer", "jet cleaning", "drum descaling", "appliance"]
  },
  {
    id: "wm-chk-1",
    title: "Washing Machine Diagnostic Check-up",
    category: "AC & Appliances",
    categoryId: "washing_machine",
    subTab: "Washing Machine Check-up",
    price: "₹299",
    tags: ["washing machine repair", "not spinning", "vibration", "washer noise"]
  },
  {
    id: "ref-chk-1",
    title: "Refrigerator Checkup & Repair",
    category: "AC & Appliances",
    categoryId: "refrigerator",
    subTab: "Refrigerator Repair",
    price: "₹249",
    badge: "Quick Fix",
    tags: ["fridge", "refrigerator", "freezer", "single door", "double door", "inverter fridge", "cooling"]
  },
  {
    id: "ro-svc-1",
    title: "RO Water Purifier Full Service & Filter Change",
    category: "AC & Appliances",
    categoryId: "water_purifier",
    subTab: "Water Purifier (RO)",
    price: "₹349",
    badge: "100% Pure",
    tags: ["ro", "water purifier", "kent", "aquaguard", "filter change", "tds", "membrane"]
  },
  {
    id: "tv-mount-1",
    title: "TV Wall Mounting & Installation",
    category: "AC & Appliances",
    categoryId: "tv_display",
    subTab: "TV & Display",
    price: "₹299",
    badge: "Same Day",
    tags: ["tv", "wall mount", "television", "led tv", "screen mount", "smart tv"]
  },
  {
    id: "mw-rep-1",
    title: "Microwave & Oven Repair",
    category: "AC & Appliances",
    categoryId: "microwave",
    subTab: "Microwave Oven",
    price: "₹249",
    tags: ["microwave", "oven", "not heating", "magnetron", "otg"]
  },

  // ── Home Cleaning & Pest Control ──
  {
    id: "clean-1bhk",
    title: "1 BHK Full House Deep Cleaning",
    category: "Home Cleaning",
    categoryId: "cleaning",
    subTab: "Full House Deep Cleaning",
    price: "₹1,499",
    badge: "Popular",
    tags: ["cleaning", "1 bhk", "deep clean", "house cleaning", "full home", "maid", "sanitize"]
  },
  {
    id: "clean-2bhk",
    title: "2 BHK Full House Deep Cleaning",
    category: "Home Cleaning",
    categoryId: "cleaning",
    subTab: "Full House Deep Cleaning",
    price: "₹1,999",
    badge: "Popular",
    tags: ["cleaning", "2 bhk", "deep clean", "house cleaning", "full home", "maid"]
  },
  {
    id: "clean-3bhk",
    title: "3 BHK Full House Deep Cleaning",
    category: "Home Cleaning",
    categoryId: "cleaning",
    subTab: "Full House Deep Cleaning",
    price: "₹2,599",
    tags: ["cleaning", "3 bhk", "deep clean", "house cleaning", "full home"]
  },
  {
    id: "sofa-shamp",
    title: "Sofa Deep Shampooing & Stain Removal",
    category: "Home Cleaning",
    categoryId: "sofa_cleaning",
    subTab: "Sofa & Upholstery",
    price: "₹499",
    badge: "4.8 ★",
    tags: ["sofa", "couch", "cushion", "sofa shampoo", "fabric clean", "leather clean", "cleaning"]
  },
  {
    id: "bath-deep",
    title: "Bathroom Deep Cleaning & Scale Removal",
    category: "Home Cleaning",
    categoryId: "bathroom_cleaning",
    subTab: "Bathroom Cleaning",
    price: "₹399",
    badge: "Express",
    tags: ["bathroom", "washroom", "toilet", "hard water stains", "tiles cleaning", "cleaning"]
  },
  {
    id: "kitch-deep",
    title: "Kitchen Deep Cleaning & Degreasing",
    category: "Home Cleaning",
    categoryId: "kitchen_cleaning",
    subTab: "Kitchen Cleaning",
    price: "₹899",
    badge: "Trending",
    tags: ["kitchen", "chimney", "oil stains", "tiles", "sink", "kitchen clean", "cleaning"]
  },
  {
    id: "pest-cock",
    title: "Cockroach Control Gel Treatment",
    category: "Pest Control",
    categoryId: "pest_control",
    subTab: "Cockroach & Termite Control",
    price: "₹799",
    badge: "Guaranteed",
    tags: ["cockroach", "cockroach control", "pest", "gel treatment", "pest control"]
  },
  {
    id: "pest-term",
    title: "Termite Anti-Infestation Treatment",
    category: "Pest Control",
    categoryId: "pest_control",
    subTab: "Cockroach & Termite Control",
    price: "₹1,299",
    badge: "5-Yr Warranty",
    tags: ["termite", "termite control", "wood pest", "borer", "pest control"]
  },
  {
    id: "pest-bedbug",
    title: "Bed Bugs Intensive 2-Visit Treatment",
    category: "Pest Control",
    categoryId: "pest_control",
    subTab: "Ants & Bed Bugs Control",
    price: "₹899",
    badge: "Safe Chemical",
    tags: ["bed bugs", "bedbugs", "ants", "mattress", "insect control", "pest control"]
  },

  // ── Painting & Masonry ──
  {
    id: "paint-full",
    title: "Full House Painting Consultation",
    category: "Paintings",
    categoryId: "painting",
    subTab: "Full House Painting",
    price: "Free Consultation",
    badge: "Free Estimate",
    tags: ["painting", "paint", "house painting", "interior", "exterior", "whitewash", "wall color", "asian paints"]
  },
  {
    id: "paint-waterproof",
    title: "Terrace Waterproofing & Leak Proofing",
    category: "Paintings",
    categoryId: "painting",
    subTab: "Waterproofing",
    price: "Custom Estimate",
    badge: "Leak-Proof",
    tags: ["waterproofing", "terrace", "roof leak", "seepage", "dampness", "painting"]
  },
  {
    id: "mason-tile",
    title: "Tile Replacement & Masonry Repair",
    category: "Mason",
    categoryId: "mason",
    subTab: "Masonry & Tiles",
    price: "₹349",
    tags: ["mason", "tile", "plaster", "brickwork", "cement", "civil work"]
  },

  // ── Goods & Transport (Hosur) ──
  {
    id: "log-truck",
    title: "Mini Truck Hire (Tata Ace, Pickup 8ft)",
    category: "Goods & Transport",
    action: "navigate",
    url: "/trucks/hosur",
    price: "From ₹250 (Hosur)",
    badge: "Live GPS",
    tags: ["truck", "mini truck", "tata ace", "pickup", "transport", "goods", "tempo", "chota hathi", "lorry", "delivery", "hosur"]
  },
  {
    id: "log-courier",
    title: "2-Wheeler Parcel & Bike Courier",
    category: "Goods & Transport",
    action: "navigate",
    url: "/trucks/hosur",
    price: "From ₹40 (Hosur)",
    badge: "Under 60 Mins",
    tags: ["bike", "two wheeler", "courier", "parcel", "documents", "package delivery", "instant delivery", "rider", "hosur"]
  },
  {
    id: "log-packers",
    title: "Packers & Movers (House & Office Shifting)",
    category: "Goods & Transport",
    action: "navigate",
    url: "/trucks/hosur",
    price: "From ₹2,499 (Hosur)",
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

export function LandingPage() {
  const { user, refreshMe } = useAuth()
  const { save: savePendingIntent, restore: restorePendingIntent } = usePendingIntent()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [packagesData, setPackagesData] = useState(null)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    if (user) {
      apiFetchCustomerBookings()
        .then(res => {
          if (res?.data && Array.isArray(res.data)) {
            const activeBookingsCount = res.data.filter(b =>
              b.status === "PENDING" ||
              b.status === "ASSIGNED" ||
              b.status === "ACCEPTED" ||
              b.status === "IN_PROGRESS"
            ).length
            setNotificationCount(activeBookingsCount)
          }
        })
        .catch(() => { })
    } else {
      setNotificationCount(0)
    }
  }, [user])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef(null)
  const [homeConfig, setHomeConfig] = useState(() => getHomePageConfig())
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  useEffect(() => {
    fetchPublishedHomePageConfig().then((cfg) => {
      if (cfg) setHomeConfig(cfg)
    })

    const handleHomepageUpdate = (e) => {
      if (e?.detail) setHomeConfig(e.detail)
    }
    window.addEventListener("calservices:homepage_updated", handleHomepageUpdate)
    return () => window.removeEventListener("calservices:homepage_updated", handleHomepageUpdate)
  }, [])

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

    // Combine static catalog with any dynamic backend packages
    const dynamicCatalogItems = []
    if (packagesData && typeof packagesData === "object") {
      Object.entries(packagesData).forEach(([catId, pkgs]) => {
        if (Array.isArray(pkgs)) {
          pkgs.forEach(pkg => {
            if (pkg && pkg.name) {
              const exists = ALL_SEARCHABLE_SERVICES.some(s => s.id === pkg.id || normalize(s.title) === normalize(pkg.name))
              if (!exists) {
                dynamicCatalogItems.push({
                  id: pkg.id,
                  title: pkg.name,
                  category: BOOKING_CATEGORIES.find(c => c.id === catId)?.name || "Services",
                  categoryId: catId,
                  subTab: pkg.subCategory || null,
                  price: pkg.price ? `₹${pkg.price}` : "Affordable",
                  badge: pkg.popular ? "Popular" : pkg.tag || null,
                  tags: [
                    pkg.name,
                    pkg.duration,
                    ...(Array.isArray(pkg.includes) ? pkg.includes.map(inc => typeof inc === "object" ? inc?.name || "" : String(inc || "")) : [])
                  ]
                })
              }
            }
          })
        }
      })
    }

    const pool = [...ALL_SEARCHABLE_SERVICES, ...dynamicCatalogItems]

    return pool
      .map(item => ({ item, score: scoreItem(item) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item)
      .slice(0, 10)
  }, [query, packagesData])

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
      navigate(item.url)
      return
    }

    if (item.action === "food_health") {
      if ((item.subId || "vegetables") === "vegetables") {
        navigate(routes.vegetables)
        return
      }
      setSelectedFoodSubModuleId(item.subId || "groceries")
      setIsFoodHealthModalOpen(true)
      return
    }

    // Direct modal opening via URL params with category & subtab
    if (item.categoryId) {
      let url = `?category=${item.categoryId}`
      if (item.subTab) {
        url += `&subtab=${encodeURIComponent(item.subTab)}&subTab=${encodeURIComponent(item.subTab)}`
      }
      navigate(url)
      return
    }

    if (item.action === "home_pest") {
      setIsHomePestModalOpen(true)
    } else if (item.action === "ac_modal") {
      setIsAcModalOpen(true)
    } else if (item.action === "elec_modal") {
      setIsElecModalOpen(true)
    } else {
      setIsHomeServicesCombinedModalOpen(true)
    }
  }

  // Fallback or Enter key submission
  const goToBooking = () => {
    if (filteredSearchResults && filteredSearchResults.length > 0) {
      handleExecuteSearch(filteredSearchResults[0])
    } else if (query.trim()) {
      navigate(`/booking?search=${encodeURIComponent(query.trim())}`)
    } else {
      setIsHomeServicesCombinedModalOpen(true)
    }
  }

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
    } catch (e) {
      console.error("Failed to save modalCart to localStorage:", e);
    }
  }, [modalCart]);
  const [isGoodsModalOpen, setIsGoodsModalOpen] = useState(location.state?.openGoodsModal || false)
  const [isElecModalOpen, setIsElecModalOpen] = useState(location.state?.openElecModal || false)
  const [isAcModalOpen, setIsAcModalOpen] = useState(location.state?.openAcModal || false)
  const [isHomePestModalOpen, setIsHomePestModalOpen] = useState(location.state?.openHomePestModal || false)
  const [isForYouModalOpen, setIsForYouModalOpen] = useState(false)
  const [isFoodHealthModalOpen, setIsFoodHealthModalOpen] = useState(false)
  const [isHomeServicesCombinedModalOpen, setIsHomeServicesCombinedModalOpen] = useState(false)
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
        } catch {}
      }
      // Clear the temporary state from router history so future navigations don't accidentally re-trigger it
      navigate(".", { replace: true, state: {} })
    }
  }, [location.state, navigate])
  const [vegCategoryFilter, setVegCategoryFilter] = useState("All")
  const [vegSearchQuery, setVegSearchQuery] = useState("")
  const [vegApiItems, setVegApiItems] = useState(VEGETABLE_ITEMS)
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
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
      console.log("DEBUG: [LandingPage] loadCatalog starting...");
      try {
        const svcRes = await apiRequest("/catalog/services/")
        console.log("DEBUG: [LandingPage] loadCatalog svcRes received success =", svcRes.success, svcRes);
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
          console.log("DEBUG: [LandingPage] loadCatalog pkgs mapped successfully:", pkgs);
          setPackagesData(pkgs)
        }
      } catch (err) {
        console.error("DEBUG: [LandingPage] loadCatalog failed with error:", err)
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
      setIsHomePestModalOpen(true)
      navigate(".", { replace: true, state: {} })
    } else if (location.state?.openAcModal) {
      setIsAcModalOpen(true)
      navigate(".", { replace: true, state: {} })
    } else if (location.state?.openElecModal) {
      setIsElecModalOpen(true)
      navigate(".", { replace: true, state: {} })
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
    setIsHomePestModalOpen(false)
    setIsAcModalOpen(false)
    setIsElecModalOpen(false)
    setIsGoodsModalOpen(false)
    setIsHomeServicesCombinedModalOpen(false)
    setIsForYouModalOpen(false)
    setIsFoodHealthModalOpen(false)
    const rawCatKey = (activeCategory?.id || activeCategory?.slug || activeCategoryId || "").toLowerCase()
    if (["hvac", "ac", "appliance"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openAcModal: true } })
    } else if (["electrical", "plumbing", "carpentry", "elec"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openElecModal: true } })
    } else if (["goods", "transport"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openGoodsModal: true } })
    } else if (["cleaning", "pest"].some(k => rawCatKey.includes(k))) {
      navigate("/home", { state: { openHomePestModal: true } })
    } else if (["painting", "mason"].some(k => rawCatKey.includes(k))) {
      navigate("/home")
    } else {
      navigate(".", { replace: true, state: {} })
    }
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
    ? (BOOKING_CATEGORIES.find(c =>
      c.id === activeCategoryId ||
      c.slug === activeCategoryId ||
      c.id === `${activeCategoryId}_cleaning`
    ) || { id: activeCategoryId, name: activeCategoryId.replace(/_/g, " ") })
    : null

  // Hot reload services catalog when category choice becomes active
  useEffect(() => {
    if (activeCategory) {
      const rawCatKey = (activeCategory.id || activeCategory.slug || "").toLowerCase();
      if (rawCatKey.includes("painting") || rawCatKey.includes("mason") || rawCatKey === "11" || rawCatKey === "17") {
        console.log("DEBUG: [LandingPage] Hot-reloading catalog services for category:", rawCatKey);
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
                  image: s.image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
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
    if (isGoodsModalOpen || isElecModalOpen || isAcModalOpen || isHomePestModalOpen || isForYouModalOpen || isFoodHealthModalOpen || isHomeServicesCombinedModalOpen) {
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
  }, [isGoodsModalOpen, isElecModalOpen, isAcModalOpen, isHomePestModalOpen, isForYouModalOpen, isFoodHealthModalOpen, isHomeServicesCombinedModalOpen])

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

  const allServicesCatalog = useMemo(() => [
    { id: "kc-1", name: "Occupied Kitchen Cleaning (Basic)", price: 999, categoryName: "Kitchen Cleaning", image: "/mockups/kitchen_basic_cleaning_card.png", catId: "kitchen_cleaning" },
    { id: "kc-2", name: "Occupied Kitchen Cleaning (Deep Clean)", price: 1499, categoryName: "Kitchen Cleaning", image: "/mockups/kitchen_cleaning_hero.png", catId: "kitchen_cleaning" },
    { id: "kc-3", name: "Empty Kitchen Deep Cleaning", price: 1799, categoryName: "Kitchen Cleaning", image: "/mockups/kitchen_tiles_slabs_clean.png", catId: "kitchen_cleaning" },
    { id: "sc-1", name: "Sofa Deep Cleaning & Shampooing", price: 799, categoryName: "Sofa Cleaning", image: "/mockups/sofa_cleaning.png", catId: "sofa_cleaning" },
    { id: "bc-1", name: "Bathroom Deep Cleaning & Sanitization", price: 499, categoryName: "Bathroom Cleaning", image: "/mockups/bathroom_cleaning.png", catId: "bathroom_cleaning" },
    { id: "ac-1", name: "Power Jet AC Foam Service", price: 599, categoryName: "AC & Heating", image: imgFoamSplit, catId: "hvac" },
    { id: "ac-2", name: "Anti-Rust Protective Coating", price: 249, categoryName: "AC & Heating", image: imgAntiRust, catId: "hvac" },
    { id: "ac-3", name: "AC Gas Leak Audit & Refill", price: 899, categoryName: "AC & Heating", image: acServiceImg, catId: "hvac" },
    { id: "el-1", name: "Fan Repair & Installation", price: 149, categoryName: "Electrical", image: "/mockups/hero_pro_electrical_rect.jpg", catId: "electrical" },
    { id: "pl-1", name: "Tap & Basin Leak Repair", price: 199, categoryName: "Plumbing", image: "/mockups/hero_pro_plumbing_rect.jpg", catId: "plumbing" },
    { id: "cp-1", name: "Furniture Repair & Assembly", price: 299, categoryName: "Carpentry", image: "/mockups/hero_cleaning_office.jpg", catId: "carpentry" },
    { id: "pc-1", name: "Cockroach & Ant Pest Control", price: 699, categoryName: "Pest Control", image: "/mockups/pest_control_header.jpg", catId: "pest_control" },
    { id: "app-1", name: "Automatic Washing Machine Service", price: 499, categoryName: "Appliance Repair", image: "/mockups/hero_pro_appliance_rect.jpg", catId: "appliance_repair" }
  ], []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allServicesCatalog.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.categoryName.toLowerCase().includes(q)
    );
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
                  <MapPin className="w-4 h-4 shrink-0 text-indigo-600" />
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

            </div>
          </header>

          {/* Full Page View Wrapper */}
          <main className={`flex-1 max-w-7xl w-full mx-auto px-6 ${activeCategory ? "pt-4 pb-0" : "py-10"}`}>
            {activeCategory && (
              (activeCategory.id === "kitchen_cleaning" || activeCategory.slug === "kitchen_cleaning" || String(activeCategory.id) === "kitchen_cleaning" || activeCategory.name?.toLowerCase()?.includes("kitchen")) ? (
                <KitchenCleaningModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
                />
              ) : (activeCategory.id === "sofa_cleaning" || activeCategory.slug === "sofa_cleaning" || String(activeCategory.id) === "sofa_cleaning" || activeCategory.name?.toLowerCase()?.includes("sofa")) ? (
                <SofaCleaningModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(finalCart);
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              ) : (activeCategory.id === "bathroom_cleaning" || activeCategory.slug === "bathroom_cleaning" || String(activeCategory.id) === "bathroom_cleaning" || activeCategory.name?.toLowerCase()?.includes("bathroom")) ? (
                <BathroomCleaningModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(finalCart);
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              ) : (activeCategory.id === "painting" || activeCategory.slug === "painting" || activeCategory.slug === "paintings" || String(activeCategory.id) === "17" || activeCategory.name?.toLowerCase() === "painting" || activeCategory.name?.toLowerCase() === "paintings") ? (
                <PaintingPackageModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  packagesData={packagesData}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                  onGetEstimate={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
                  }}
                />


              ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Cockroach & Termite Control" || activeSubTabParam === "Cockroach Control" || activeSubTabParam === "Termite Control") && (activeSubTabParam !== "Ants & Bed Bugs Control" && activeSubTabParam !== "Ants Control" && activeSubTabParam !== "Bedbugs Control" && activeSubTabParam !== "Ants and bed bugs control") ? (
                <CockroachControlModal
                  category={{ id: "pest_control", name: "Pest Control" }}
                  cart={modalCart}
                  setCart={setModalCart}
                  initialTab={activeSubTabParam === "Termite Control" ? "termite" : "cockroach"}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(finalCart);
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Ants & Bed Bugs Control" || activeSubTabParam === "Ants Control" || activeSubTabParam === "Bedbugs Control" || activeSubTabParam === "Ants and bed bugs control") ? (
                <AntsBedBugsControlModal
                  category={{ id: "pest_control", name: "Pest Control" }}
                  cart={modalCart}
                  setCart={setModalCart}
                  initialTab={activeSubTabParam === "Ants Control" ? "ants" : "bedbugs"}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(finalCart);
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              ) : (
                <CustomCleaningPackageModal
                  category={activeCategory}
                  cart={modalCart}
                  setCart={setModalCart}
                  packagesData={packagesData}
                  isFullPage={true}
                  onClose={handleCloseCategory}
                  onCheckout={(customCart) => {
                    const finalCart = resolveCartArg(customCart);
                    setModalCart(cleanConsultationItems(finalCart));
                    navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
                  }}
                />
              )
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
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[var(--sevo-bg)] text-[var(--sevo-text-primary)] antialiased font-sans transition-colors duration-200" style={{ animation: "fadeUp 0.4s ease both" }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-[var(--sevo-surface-glass)] backdrop-blur-md border-b border-[var(--sevo-border)] shadow-[var(--sevo-shadow-xs)] transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4 sm:gap-6">
            {/* Left: Official SEVO Brand Logo with Proportional Alignment */}
            <div className="flex items-center gap-2 select-none cursor-pointer shrink-0 group" onClick={() => navigate(routes.landing)}>
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

            {/* Center: Horizontal Navigation Links */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
              {[
                { id: "home", label: "Home" },
                { id: "categories", label: "Services" },
                { id: "why-choose-us", label: "How It Works" },
                { id: "professionals", label: "Professionals" },
                { id: "about-us", label: "About Us" },
              ].map((item) => {
                const isActive = activeNav === item.id
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                    className={`py-1 transition-all cursor-pointer ${isActive
                        ? "text-[var(--sevo-primary)] font-bold relative after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--sevo-primary)] after:rounded-full"
                        : "text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-text-primary)] font-semibold"
                      }`}
                  >
                    {item.label}
                  </a>
                )
              })}
            </nav>

            {/* Right: Location Pill, ThemeToggle, Notifications & User Profile */}
            <div className="flex items-center gap-2 sm:gap-3.5">
              {/* Location Selector Pill */}
              <button
                type="button"
                onClick={() => setShowLocationPickerModal(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[var(--sevo-border)] hover:border-[var(--sevo-primary)] bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-primary-light)] text-[var(--sevo-text-primary)] text-xs font-bold transition-all cursor-pointer shadow-xs max-w-[150px] sm:max-w-[220px] truncate"
                title="Select Location"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--sevo-primary)]" />
                <span className="truncate">
                  {(() => {
                    if (isLoadingLocation) return "Loading your location..."
                    if (activeLocationLabel) return activeLocationLabel
                    const locObj = user?.last_known_location || user?.lastKnownLocation
                    if (locObj) {
                      if (typeof locObj === "string" && locObj.trim()) return locObj
                      if (locObj.label) return locObj.label
                    }
                    if (user?.address) return user.address
                    return "Select your location"
                  })()}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--sevo-text-muted)] shrink-0 ml-auto" />
              </button>

              {/* Theme Switcher Toggle (Concept 3 Light <-> Concept 2 Dark) */}
              <ThemeToggle className="shrink-0" />

              {/* Notification Bell with red badge */}
              <button
                type="button"
                className="relative p-2 rounded-xl border border-transparent hover:border-[var(--sevo-border)] hover:bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-secondary)] hover:text-[var(--sevo-text-primary)] transition-colors cursor-pointer"
                title="Notifications"
                onClick={() => {
                  if (user) {
                    setActiveAccountTab("My Bookings")
                    setShowAccountPortal(true)
                  } else {
                    goToLogin()
                  }
                }}
              >
                <Bell className="w-4.5 h-4.5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[var(--sevo-error)] text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[var(--sevo-surface)] shadow-xs">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Cart Icon with Numeric Badge if active */}
              {modalCart && modalCart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCartDrawer(true)}
                  className="relative p-2 rounded-xl border border-[var(--sevo-border)] bg-[var(--sevo-surface-raised)] text-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-light)] transition-all cursor-pointer shrink-0"
                  title="View Cart"
                >
                  <ShoppingCart size={17} />
                  <span className="absolute -top-1 -right-1 bg-[var(--sevo-primary)] text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[var(--sevo-surface)] shadow-xs">
                    {modalCart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                </button>
              )}

              {/* User Profile Avatar with Name */}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    setActiveAccountTab("My Profile")
                    setShowAccountPortal(true)
                  } else {
                    goToLogin()
                  }
                }}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl border border-transparent hover:border-[var(--sevo-border)] hover:bg-[var(--sevo-surface-raised)] text-[var(--sevo-text-primary)] transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--sevo-primary-gradient)] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden border border-[var(--sevo-border)]">
                  {(user?.full_name || user?.fullName || user?.first_name || "Login").charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-xs text-[var(--sevo-text-primary)] max-w-[100px] truncate hidden sm:inline-block">
                  {user?.full_name || user?.fullName || user?.first_name || "Login"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--sevo-text-muted)] group-hover:text-[var(--sevo-text-primary)] transition-colors shrink-0" />
              </button>
            </div>
          </div>
        </header>

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

        {/* ── Hero Section ─────────────────────────────────────────── */}
        <section id="home" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-12 grid lg:grid-cols-12 gap-8 lg:gap-8 items-center scroll-mt-24">
          {/* Left Column: Headline, Search & Trust Badges */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-5">
            {/* Small Trust Badge (🛡️ Sevo Promise) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--sevo-success-bg)] border border-[var(--sevo-success-border)] text-[var(--sevo-primary)] text-xs font-black shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[var(--sevo-primary)] stroke-[2.2]" />
              <span>Sevo Promise</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black leading-[1.12] tracking-tight text-[var(--sevo-text-primary)]">
              Reliable Home<br />
              Services.<br />
              <span className="text-[var(--sevo-primary)]">Right on Time</span>
            </h1>

            {/* Supporting Subtitle */}
            <p className="text-[var(--sevo-text-secondary)] text-sm sm:text-base leading-relaxed max-w-lg font-medium">
              Book trusted experts for AC, Plumbing, Cleaning, Electrical & more – anytime, anywhere.
            </p>

            {/* Search / Booking Control Bar — Pill Style (matches Concept 3 reference) */}
            <div ref={searchContainerRef} className="relative w-full max-w-xl z-30">
              <form
                onSubmit={(e) => { e.preventDefault(); goToBooking() }}
                className={`flex items-center bg-white rounded-full border transition-all duration-200 px-2 py-1.5 shadow-[var(--sevo-shadow-md)] ${isSearchOpen ? "border-[var(--sevo-primary)] ring-2 ring-[var(--sevo-primary)]/20" : "border-[#E0DCD4] hover:border-[#C8C4BB]"
                  }`}
              >
                <div className="pl-3 pr-2 text-[var(--sevo-text-muted)]">
                  <Search className="w-4.5 h-4.5" />
                </div>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (!isSearchOpen) setIsSearchOpen(true)
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={homeConfig.hero?.searchPlaceholder || 'Type service or try "AC service"'}
                  className="flex-1 bg-transparent px-1 py-2 text-sm font-medium outline-none placeholder:text-[var(--sevo-text-muted)] text-[var(--sevo-text-primary)] min-w-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-1.5 text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)] rounded-full hover:bg-[var(--sevo-surface-raised)] transition-colors mr-1 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Search services"
                  className="bg-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-hover)] active:bg-[var(--sevo-primary-active)] text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {/* Live Auto-Suggest Search Results Dropdown */}
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[var(--sevo-surface)] rounded-2xl border border-[var(--sevo-border)] shadow-[var(--sevo-shadow-lg)] overflow-hidden z-50 divide-y divide-[var(--sevo-border-subtle)] max-h-[380px] overflow-y-auto"
                  >
                    <div className="p-2.5 bg-[var(--sevo-surface-raised)] flex items-center justify-between text-xs font-bold text-[var(--sevo-text-secondary)] uppercase tracking-wider">
                      <span>{query.trim() ? `Matching Services (${filteredSearchResults.length})` : "Popular & Trending Services"}</span>
                      <span className="text-[10px] text-[var(--sevo-primary)] font-semibold lowercase">Instant Booking</span>
                    </div>

                    {filteredSearchResults.length > 0 ? (
                      <div className="p-1.5 space-y-1">
                        {filteredSearchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleExecuteSearch(item)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--sevo-surface-raised)] transition-colors text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[var(--sevo-surface-raised)] group-hover:bg-[var(--sevo-primary-light)] flex items-center justify-center text-[var(--sevo-text-secondary)] group-hover:text-[var(--sevo-primary)] shrink-0 transition-colors">
                                {item.category === "Home Cleaning" && <Home className="w-4 h-4" />}
                                {item.category === "Pest Control" && <SprayCan className="w-4 h-4" />}
                                {item.category === "AC & Appliances" && <AirVent className="w-4 h-4" />}
                                {item.category === "Electrical & Plumbing" && <Hammer className="w-4 h-4" />}
                                {item.category === "Paintings" && <PaintRoller className="w-4 h-4" />}
                                {item.category === "Goods & Transport" && <Boxes className="w-4 h-4" />}
                                {item.category === "Food & Health" && <Carrot className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[var(--sevo-text-primary)] group-hover:text-[var(--sevo-primary)] truncate">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--sevo-success-bg)] text-[var(--sevo-success)] border border-[var(--sevo-success-border)] shrink-0">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[var(--sevo-text-secondary)] block truncate">
                                  {item.category} • {item.price}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center text-[var(--sevo-primary)] font-bold text-xs shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                              <span>Book</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-[var(--sevo-text-secondary)]">
                        <p className="text-sm font-semibold text-[var(--sevo-text-primary)] mb-1">No exact matches for &quot;{query}&quot;</p>
                        <p className="text-xs text-[var(--sevo-text-muted)] mb-3">Browse all available categories or try a different keyword.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false)
                            setIsHomeServicesCombinedModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--sevo-primary)] hover:bg-[var(--sevo-primary-hover)] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <span>Explore All Services</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 6 Trust Badges in a 2x3 Grid (Matching Concept 3 Handover Blueprint) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[var(--sevo-primary)] dark:bg-teal-950/50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">Verified Experts</span>
                  <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">Background Checked</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                  <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-500 stroke-[1.5]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">4.8+ Rated</span>
                  <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">By 10K+ Customers</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">On-Time Service</span>
                  <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">Punctual &amp; Reliable</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[var(--sevo-secondary)] dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">Upfront Pricing</span>
                  <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">No Hidden Charges</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">Easy Booking</span>
                  <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">In Just 2 Minutes</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                  <Headphones className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">24/7 Support</span>
                  <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">We're Here Anytime</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Concept 3 Hero Illustration */}
          <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center relative select-none">
            <img
              src="/assets/hero_illustration.jpg"
              alt="SEVO professional home services"
              className="w-full max-w-[420px] xl:max-w-[480px] object-contain drop-shadow-none"
              loading="eager"
              draggable="false"
            />
          </div>
        </section>

        {/* ── Quick User Action & Navigation Strip (4 Cards Matching Concept 3 Blueprint) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* My Bookings */}
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
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E8E3DB] hover:border-[var(--sevo-primary)] shadow-[var(--sevo-shadow-xs)] hover:shadow-[var(--sevo-shadow-sm)] hover:-translate-y-0.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E8F5F2] text-[#0B8F7A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-[var(--sevo-text-primary)] block leading-tight group-hover:text-[var(--sevo-primary)] transition-colors">
                  My Bookings
                </span>
                <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium block truncate">
                  View &amp; manage bookings
                </span>
              </div>
            </button>

            {/* Wallet & Offers */}
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
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E8E3DB] hover:border-amber-500 shadow-[var(--sevo-shadow-xs)] hover:shadow-[var(--sevo-shadow-sm)] hover:-translate-y-0.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-[var(--sevo-text-primary)] block leading-tight group-hover:text-amber-600 transition-colors">
                  Wallet &amp; Offers
                </span>
                <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium block truncate">
                  Pay, save &amp; view offers
                </span>
              </div>
            </button>

            {/* Help & Support */}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  setActiveAccountTab("Customer Care")
                  setShowAccountPortal(true)
                } else {
                  navigate(routes.contact_us || "/contact")
                }
              }}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E8E3DB] hover:border-rose-400 shadow-[var(--sevo-shadow-xs)] hover:shadow-[var(--sevo-shadow-sm)] hover:-translate-y-0.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FFE4E8] text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Headphones className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-[var(--sevo-text-primary)] block leading-tight group-hover:text-rose-600 transition-colors">
                  Help &amp; Support
                </span>
                <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium block truncate">
                  Chat with us 24/7
                </span>
              </div>
            </button>

            {/* For Business */}
            <button
              type="button"
              onClick={() => navigate(routes.contact_us || "/contact")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#E8E3DB] hover:border-purple-400 shadow-[var(--sevo-shadow-xs)] hover:shadow-[var(--sevo-shadow-sm)] hover:-translate-y-0.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-[var(--sevo-text-primary)] block leading-tight group-hover:text-purple-600 transition-colors">
                  For Business
                </span>
                <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium block truncate">
                  Manage corporate bookings
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* ── KYC Verification Progress Banner ─────────────────────── */}
        {user && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
            <button
              type="button"
              onClick={() => { setActiveAccountTab("My Profile"); setShowAccountPortal(true) }}
              className="w-full flex items-center justify-between gap-3 bg-[var(--sevo-success-bg)] border border-[var(--sevo-success-border)] rounded-2xl px-4 sm:px-5 py-2.5 cursor-pointer group hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[var(--sevo-primary)] shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--sevo-text-primary)]">
                  KYC is in progress.
                </span>
              </div>
              <div className="flex items-center gap-1 text-[var(--sevo-primary)] text-xs sm:text-sm font-extrabold shrink-0 group-hover:underline">
                <span>Verify Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* ── Browse by Category ─────────────────────────────── */}
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--sevo-text-primary)]">Browse by Category</h2>
            <button
              type="button"
              onClick={() => setIsHomeServicesCombinedModalOpen(true)}
              className="text-xs sm:text-sm font-bold text-[var(--sevo-primary)] hover:text-[var(--sevo-primary-hover)] flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span>View All Categories</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Row 1: 4 Discovery Category Cards — Matching Reference Visuals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
            {[
              {
                id: "for_you",
                title: "For You",
                subtitle: "Recommended services",
                image: "/assets/cat_for_you.jpg",
                onClick: () => setIsForYouModalOpen(true)
              },
              {
                id: "food_health",
                title: "Food & Health",
                subtitle: "Essentials & wellness",
                image: "/assets/cat_food_health.jpg",
                onClick: () => {
                  setSelectedFoodSubModuleId(null)
                  setIsFoodHealthModalOpen(true)
                }
              },
              {
                id: "home_services",
                title: "Home & Repair",
                subtitle: "Maintenance & improvements",
                image: "/assets/cat_home_repair.jpg",
                onClick: () => setIsHomeServicesCombinedModalOpen(true)
              },
              {
                id: "goods_transport",
                title: "Goods & Transport",
                subtitle: "Moving made easy",
                image: "/assets/cat_goods_transport.jpg",
                onClick: () => setIsGoodsModalOpen(true)
              }
            ].map((cat) => (
              <div
                key={cat.id}
                onClick={cat.onClick}
                className="group relative flex flex-col bg-white border border-[#E8E3DB] rounded-[24px] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:border-[var(--sevo-primary)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="h-44 sm:h-52 w-full overflow-hidden relative bg-[#F5F2EB]">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-[#0B172A] group-hover:text-[var(--sevo-primary)] transition-colors leading-tight">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-[#64748B] font-medium mt-1 leading-snug">
                      {cat.subtitle}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F4F1EA] text-[#475569] group-hover:bg-[var(--sevo-primary)] group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-200 shadow-2xs">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: 7 Compact Quick-Action Cards with Realistic 3D Icons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3.5 pt-2">
            {[
              {
                name: "AC Service",
                image: "/assets/icon_3d_ac.jpg",
                fallbackIcon: AirVent,
                color: "bg-[#E6F6F3] text-[#0B8F7A]",
                onClick: () => navigate("?category=hvac&subtab=AC%20Service%20%26%20Cleaning")
              },
              {
                name: "Plumbing",
                image: "/assets/icon_3d_plumbing.jpg",
                fallbackIcon: Droplet,
                color: "bg-[#EBF4FC] text-[#0F5FBF]",
                onClick: () => navigate("?category=plumbing&subtab=Tap%20%26%20Mixer")
              },
              {
                name: "Electrical",
                image: "/assets/icon_3d_electrical.jpg",
                fallbackIcon: Zap,
                color: "bg-[#FEF9C3] text-[#CA8A04]",
                onClick: () => navigate("?category=electrical&subtab=Switches%20%26%20Sockets")
              },
              {
                name: "Cleaning",
                image: "/assets/icon_3d_cleaning.jpg",
                fallbackIcon: Sparkles,
                color: "bg-[#FEF3C7] text-[#D97706]",
                onClick: () => navigate("?category=cleaning")
              },
              {
                name: "Painting",
                image: "/mockups/category_home_repair_3d.jpg",
                fallbackIcon: PaintRoller,
                color: "bg-[#DCFCE7] text-[#16A34A]",
                onClick: () => navigate("?category=painting")
              },
              {
                name: "Appliance Repair",
                image: "/assets/icon_3d_appliance.jpg",
                fallbackIcon: Boxes,
                color: "bg-[#ECFDF5] text-[#059669]",
                onClick: () => setIsAcModalOpen(true)
              },
              {
                name: "Pest Control",
                image: "/assets/icon_3d_pest.png",
                fallbackIcon: Bug,
                color: "bg-[#FEFCE8] text-[#84CC16]",
                onClick: () => setIsHomePestModalOpen(true)
              }
            ].map((srv, idx) => {
              const FallbackIcon = srv.fallbackIcon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={srv.onClick}
                  className="group flex flex-col items-center text-center p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E8E3DB] hover:border-[var(--sevo-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform overflow-hidden relative">
                    {srv.image ? (
                      <img
                        src={srv.image}
                        alt={srv.name}
                        loading="lazy"
                        className="w-full h-full object-contain drop-shadow-sm rounded-xl"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const nextEl = e.currentTarget.nextElementSibling;
                          if (nextEl) nextEl.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full rounded-2xl ${srv.color} ${srv.image ? 'hidden' : 'flex'} items-center justify-center`}
                    >
                      <FallbackIcon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#0B172A] group-hover:text-[var(--sevo-primary)] transition-colors leading-tight">
                    {srv.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Why Choose Sevo? & Book Services on the Go Split Section (Matching Concept 3) ── */}
        <section id="why-choose-us" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 scroll-mt-24">
          <div className="grid lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Why Choose Sevo? 6-item Grid */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E3DB] shadow-[var(--sevo-shadow-xs)] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--sevo-text-primary)] mb-6">Why Choose Sevo?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "Certified & Verified",
                      desc: "Trusted professionals",
                    },
                    {
                      icon: IndianRupee,
                      title: "Transparency",
                      desc: "Clear pricing always",
                    },
                    {
                      icon: Clock,
                      title: "On-Time Service",
                      desc: "We value your time",
                    },
                    {
                      icon: Star,
                      title: "Satisfaction",
                      desc: "100% guaranteed",
                    },
                    {
                      icon: CheckCircle2,
                      title: "Easy Booking",
                      desc: "Book in 2 minutes",
                    },
                    {
                      icon: Headphones,
                      title: "24/7 Support",
                      desc: "We're always here",
                    }
                  ].map((feat, idx) => {
                    const Icon = feat.icon
                    return (
                      <div key={idx} className="flex items-start gap-3 text-left group">
                        <div className="w-9 h-9 rounded-xl bg-[#E8F5F2] text-[#0B8F7A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-[var(--sevo-text-primary)] leading-tight">
                            {feat.title}
                          </h4>
                          <p className="text-[11px] text-[var(--sevo-text-muted)] font-medium mt-0.5 leading-snug">
                            {feat.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: Book Services on the Go! App Card */}
            <div className="lg:col-span-5 bg-[#F2F8F4] dark:bg-[#0B1E43] rounded-3xl p-6 sm:p-7 border border-[#D5EADB] dark:border-[var(--sevo-border)] shadow-[var(--sevo-shadow-xs)] flex items-center justify-between relative overflow-hidden gap-4">
              <div className="space-y-3 z-10 max-w-[240px]">
                <h3 className="text-xl sm:text-2xl font-black text-[#0B8F7A] tracking-tight leading-tight">
                  Book Services on the Go!
                </h3>
                <p className="text-xs sm:text-sm text-[var(--sevo-text-secondary)] font-medium leading-relaxed">
                  Download our app for a faster &amp; smoother experience.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <GooglePlayBtn />
                  <AppStoreBtn />
                </div>
              </div>

              {/* Phone Mockup Illustration */}
              <div className="flex shrink-0 z-10">
                <img
                  src="/assets/phone_app_mockup.jpg"
                  alt="SEVO App Mockup"
                  className="w-28 sm:w-36 object-contain rounded-2xl drop-shadow-md select-none"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Immediate Booking CTA Banner ───────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-gradient-to-r from-[var(--sevo-primary)] to-[#087060] dark:from-[#102956] dark:to-[#0B1E43] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs text-white flex items-center justify-center shrink-0 border border-white/20">
                <CalendarDays className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black">Need Immediate Service?</h3>
                <p className="text-teal-100 text-xs sm:text-sm mt-0.5 font-medium">Book now and get your problem solved quickly.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHomeServicesCombinedModalOpen(true)}
              className="px-6 py-2.5 bg-white text-[var(--sevo-primary)] hover:bg-teal-50 font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Book Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── Footer ──── */}
        <footer id="about-us" className="bg-[var(--sevo-surface)] text-[var(--sevo-text-secondary)] pt-12 border-t border-[var(--sevo-border)] mt-10 scroll-mt-24 pb-16 lg:pb-0 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10">
            {/* Col 1: Brand Info & Socials */}
            <div className="space-y-4">
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
                  className="shrink-0 object-contain"
                  style={{ height: '16px', width: 'auto', maxHeight: '16px' }}
                />
              </div>
              <p className="text-xs text-[var(--sevo-text-secondary)] leading-relaxed max-w-xs">
                SEVO is your trusted partner for all home services. We connect you with verified professionals for a hassle-free experience.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <a href="#" className="w-8 h-8 rounded-xl bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-primary)] text-[var(--sevo-text-secondary)] hover:text-white flex items-center justify-center transition-colors">
                  <FacebookMark className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-8 h-8 rounded-xl bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-primary)] text-[var(--sevo-text-secondary)] hover:text-white flex items-center justify-center transition-colors">
                  <InstagramMark className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-8 h-8 rounded-xl bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-primary)] text-[var(--sevo-text-secondary)] hover:text-white flex items-center justify-center transition-colors">
                  <WhatsAppMark className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-8 h-8 rounded-xl bg-[var(--sevo-surface-raised)] hover:bg-[var(--sevo-primary)] text-[var(--sevo-text-secondary)] hover:text-white flex items-center justify-center transition-colors">
                  <YoutubeMark className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Col 2: Our Services */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[var(--sevo-text-primary)]">Our Services</h4>
              <ul className="space-y-2 text-xs text-[var(--sevo-text-secondary)]">
                <li><button type="button" onClick={() => navigate("?category=hvac&subtab=AC%20Service%20%26%20Cleaning")} className="hover:text-[var(--sevo-primary)] transition-colors text-left cursor-pointer">AC Service</button></li>
                <li><button type="button" onClick={() => navigate("?category=plumbing&subtab=Tap%20%26%20Mixer")} className="hover:text-[var(--sevo-primary)] transition-colors text-left cursor-pointer">Plumbing</button></li>
                <li><button type="button" onClick={() => navigate("?category=electrical&subtab=Switches%20%26%20Sockets")} className="hover:text-[var(--sevo-primary)] transition-colors text-left cursor-pointer">Electrical</button></li>
                <li><button type="button" onClick={() => navigate("?category=cleaning")} className="hover:text-[var(--sevo-primary)] transition-colors text-left cursor-pointer">Cleaning</button></li>
                <li><button type="button" onClick={() => setIsAcModalOpen(true)} className="hover:text-[var(--sevo-primary)] transition-colors text-left cursor-pointer">Appliance Repair</button></li>
                <li><button type="button" onClick={() => setIsHomePestModalOpen(true)} className="hover:text-[var(--sevo-primary)] transition-colors text-left cursor-pointer">Pest Control</button></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[var(--sevo-text-primary)]">Company</h4>
              <ul className="space-y-2 text-xs text-[var(--sevo-text-secondary)]">
                <li><a href="#about-us" className="hover:text-[var(--sevo-primary)] transition-colors">About Us</a></li>
                <li><a href="#why-choose-us" className="hover:text-[var(--sevo-primary)] transition-colors">How It Works</a></li>
                <li><Link to="/help" className="hover:text-[var(--sevo-primary)] transition-colors">Careers</Link></li>
                <li><Link to="/help" className="hover:text-[var(--sevo-primary)] transition-colors">Blog</Link></li>
                <li><Link to="/terms" className="hover:text-[var(--sevo-primary)] transition-colors">Terms &amp; Conditions</Link></li>
              </ul>
            </div>

            {/* Col 4: Support */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[var(--sevo-text-primary)]">Support</h4>
              <ul className="space-y-2 text-xs text-[var(--sevo-text-secondary)]">
                <li><Link to="/help" className="hover:text-[var(--sevo-primary)] transition-colors">Help Center</Link></li>
                <li><Link to="/terms" className="hover:text-[var(--sevo-primary)] transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link to="/privacy" className="hover:text-[var(--sevo-primary)] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cancellation-refund" className="hover:text-[var(--sevo-primary)] transition-colors">Refund Policy</Link></li>
                <li><Link to="/help" className="hover:text-[var(--sevo-primary)] transition-colors">Sitemap</Link></li>
              </ul>
            </div>

            {/* Col 5: Contact Us */}
            <div id="contact-us" className="space-y-3">
              <h4 className="text-sm font-bold text-[var(--sevo-text-primary)]">Contact Us</h4>
              <ul className="space-y-2.5 text-xs text-[var(--sevo-text-secondary)]">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[var(--sevo-primary)]" />
                  <span className="font-semibold">+91 90909 90909</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[var(--sevo-primary)]" />
                  <span className="font-semibold">support@sevo.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--sevo-primary)] shrink-0 mt-0.5" />
                  <span className="font-semibold">Hosur, Tamil Nadu, India</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div className="bg-[var(--sevo-surface-raised)] border-t border-[var(--sevo-border)] text-[var(--sevo-text-muted)] py-3.5 text-center text-xs font-semibold">
            © {new Date().getFullYear()} SEVO. All Rights Reserved.
          </div>
        </footer>

        {/* ── Mobile Sticky Bottom Navigation (Touch-optimized 44px+ tap targets) ──── */}
        <nav aria-label="Mobile Bottom Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sevo-surface-glass)] backdrop-blur-lg border-t border-[var(--sevo-border)] shadow-[var(--sevo-shadow-lg)] px-3 py-1.5 flex items-center justify-around transition-colors duration-200">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" })
              setActiveNav("home")
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold transition-colors cursor-pointer ${activeNav === "home" ? "text-[var(--sevo-primary)]" : "text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)]"
              }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHomeServicesCombinedModalOpen(true)}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Services</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (modalCart && modalCart.length > 0) {
                setShowCartDrawer(true)
              } else if (user) {
                setActiveAccountTab("My Bookings")
                setShowAccountPortal(true)
              } else {
                goToLogin()
              }
            }}
            className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)] transition-colors cursor-pointer"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {modalCart && modalCart.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[var(--sevo-primary)] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {modalCart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (user) {
                setActiveAccountTab("My Profile")
                setShowAccountPortal(true)
              } else {
                goToLogin()
              }
            }}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 text-[11px] font-bold text-[var(--sevo-text-muted)] hover:text-[var(--sevo-text-primary)] transition-colors cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span>{user ? "Account" : "Login"}</span>
          </button>
        </nav>

        {/* ── 1. Home Services & Pest Control Modal Popup ── */}
        {isHomePestModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="homepest-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsHomePestModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsHomePestModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-md border border-slate-200 transition-colors z-50 cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>

                {/* Modal Title */}
                <div className="text-left mb-4">
                  <h3
                    id="homepest-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    Home Cleaning &amp; Pest Control
                  </h3>
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

                {/* Cleaning Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                    Home Cleaning
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                    {HOME_SERVICES_SUB.map((item) => {
                      const isAvailable = isServiceAvailableInZone(item.name)
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            if (!isAvailable) {
                              showUnavailableServiceAlert(item.name)
                              return
                            }
                            setIsHomePestModalOpen(false)
                            document.body.style.overflow = "unset"
                            if (item.name === "Kitchen Cleaning") {
                              navigate(`?category=kitchen_cleaning`)
                            } else if (item.name === "Sofa Cleaning") {
                              navigate(`?category=sofa_cleaning`)
                            } else if (item.name === "Bathroom Cleaning") {
                              navigate(`?category=bathroom_cleaning`)
                            } else if (item.name === "Full House Cleaning" || item.name === "Full House Deep Cleaning") {
                              navigate(`?category=cleaning&subtab=Occupied%20Apartment`)
                            } else {
                              navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                            }
                          }}
                          className={`group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center relative ${!isAvailable ? 'opacity-55' : ''}`}
                        >
                          <div className={`relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 ${isAvailable ? 'group-hover:bg-emerald-50/50 group-hover:border-emerald-200' : 'bg-slate-200/40 border-slate-200'} border border-transparent flex items-center justify-center transition-all`}>
                            <item.graphic className={`w-12 h-12 sm:w-14 sm:h-14 ${isAvailable ? 'group-hover:scale-105' : 'grayscale-[50%]'} transition-transform`} />
                            {!isAvailable ? (
                              <div className="absolute -bottom-2 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                                Not Available
                              </div>
                            ) : item.badge && (
                              <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                                {item.badge}
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] sm:text-[11px] font-semibold ${isAvailable ? 'text-slate-700 group-hover:text-emerald-700' : 'text-slate-400'} mt-2.5 leading-tight transition-colors max-w-[90px] sm:max-w-[105px] break-words`}>
                            {item.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Pest Control Section */}
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                    Pest Control
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                    {PEST_CONTROL_SUB.map((item) => {
                      const isAvailable = isServiceAvailableInZone(item.name)
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            if (!isAvailable) {
                              showUnavailableServiceAlert(item.name)
                              return
                            }
                            setIsHomePestModalOpen(false)
                            document.body.style.overflow = "unset"
                            navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                          }}
                          className={`group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center relative ${!isAvailable ? 'opacity-55' : ''}`}
                        >
                          <div className={`relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 ${isAvailable ? 'group-hover:bg-emerald-50/50 group-hover:border-emerald-200' : 'bg-slate-200/40 border-slate-200'} border border-transparent flex items-center justify-center transition-all`}>
                            <item.graphic className={`w-12 h-12 sm:w-14 sm:h-14 ${isAvailable ? 'group-hover:scale-105' : 'grayscale-[50%]'} transition-transform`} />
                            {!isAvailable ? (
                              <div className="absolute -bottom-2 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                                Not Available
                              </div>
                            ) : item.badge && (
                              <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                                {item.badge}
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] sm:text-[11px] font-semibold ${isAvailable ? 'text-slate-700 group-hover:text-emerald-700' : 'text-slate-400'} mt-2.5 leading-tight transition-colors max-w-[90px] sm:max-w-[105px] break-words`}>
                            {item.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── 2. Electrician, Plumbing & Carpentry Sub-Category Modal Popup ── */}
        {isElecModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="elec-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsElecModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsElecModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Title */}
                <div className="text-center mb-6">
                  <h3
                    id="elec-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    Electrician, Plumbing &amp; Carpentry
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose a service type to view related services
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

                {/* Items Grid for Electrician, Plumbing & Carpentry (3 options) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                  {[
                    { key: "electrician", name: "Electrician", slug: "electrician", cat: "electrical", graphic: ElectricianGraphic },
                    { key: "plumber", name: "Plumber", slug: "plumbing", cat: "plumbing", graphic: PlumberGraphic },
                    { key: "carpenter", name: "Carpenter", slug: "carpentry", cat: "carpentry", graphic: CarpentryGraphic },
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
                          setIsElecModalOpen(false)
                          document.body.style.overflow = "unset"
                          goToCategoryServices(item.cat, `${item.name} Services`)
                        }}
                        className={`group relative flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 ${isAvailable
                          ? "border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                          : "border-slate-200/60 bg-slate-50/50 opacity-60 cursor-pointer"
                          }`}
                      >
                        <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all relative">
                          <Graphic className={`w-full h-full ${!isAvailable ? 'grayscale-[50%]' : ''}`} />
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
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── 3. AC & Appliance Sub-Category Modal Popup ── */}
        {isAcModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ac-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsAcModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsAcModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Title */}
                <div className="text-center mb-6">
                  <h3
                    id="ac-modal-title"
                    className="text-lg sm:text-xl font-extrabold text-slate-900"
                  >
                    AC &amp; Appliance Repair
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose an appliance type to view related services
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

                {/* Items Grid for AC & Appliance Repair (5 options) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 items-stretch">
                  {[
                    { key: "ac", name: "Air Conditioner", slug: "air-conditioner", cat: "hvac", subTab: "AC Service & Cleaning", graphic: AcGraphic },
                    { key: "refrigerator", name: "Refrigerator", slug: "refrigerator", cat: "refrigerator", subTab: "Refrigerator Service & Repair", graphic: FridgeGraphic },
                    { key: "washing_machine", name: "Washing Machine", slug: "washing-machine", cat: "washing_machine", subTab: "Washing Machine Jet Service", graphic: WashingMachineGraphic },
                    { key: "tv", name: "TV & Display", slug: "tv-display", cat: "tv_display", subTab: "TV Service & Repair", graphic: TvGraphic },
                    { key: "microwave", name: "Microwave Oven", slug: "microwave-oven", cat: "microwave", subTab: "Microwave Repair", graphic: MicrowaveGraphic },
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
                          setIsAcModalOpen(false)
                          document.body.style.overflow = "unset"
                          goToCategoryServices(item.cat, item.subTab)
                        }}
                        className={`group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 ${isAvailable
                          ? "border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                          : "border-slate-200/60 bg-slate-50/50 opacity-60 cursor-pointer"
                          }`}
                      >
                        <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all relative">
                          <Graphic className={`w-full h-full ${!isAvailable ? 'grayscale-[50%]' : ''}`} />
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
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── 4. Goods & Transports Modal Popup ── */}
        {isGoodsModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="transport-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsGoodsModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsGoodsModalOpen(false)}
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

                {/* Items Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                  {[
                    { key: "truck", name: "Mini Truck (Hosur)", slug: "truck", route: routes.truck_booking_hosur, graphic: TruckGraphic },
                    { key: "two_wheeler", name: "2-Wheeler (Hosur)", slug: "two-wheeler", route: routes.two_wheeler_booking_hosur, graphic: TwoWheelerGraphic },
                    { key: "packers_movers", name: "Packers & Movers", slug: "packers-movers", route: routes.packers_movers_booking_hosur, graphic: PackersMoversGraphic },
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
                          document.body.style.overflow = "unset"
                          navigate(item.route)
                        }}
                        className={`group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 ${isAvailable
                          ? "border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                          : "border-slate-200/60 bg-slate-50/50 opacity-60 cursor-pointer"
                          }`}
                      >
                        <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all relative">
                          <Graphic className={`w-full h-full ${!isAvailable ? 'grayscale-[50%]' : ''}`} />
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

                  {/* Option 4: Get an Estimate card in Landing Page Emerald theme */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoodsModalOpen(false)
                      document.body.style.overflow = "unset"
                      navigate(routes.truck_booking_hosur)
                    }}
                    className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white shadow-lg shadow-emerald-600/25 transition-all text-left cursor-pointer min-h-[140px]"
                  >
                    <div>
                      <p className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight">
                        Get an<br />Estimate
                      </p>
                      <p className="text-xs text-emerald-100 font-medium mt-2 opacity-95">
                        (takes ~2 mins)
                      </p>
                    </div>
                    <div className="pt-4 flex items-center">
                      <ArrowRight className="w-6 h-6 text-white stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </button>
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
                        {/* Top Right Quick Commerce Cart Button matching Image 3 */}
                        {Object.values(foodCart).reduce((a, b) => a + b, 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowVegCartDrawer(true)}
                            className="bg-[#0B8860] hover:bg-[#097351] text-white px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 animate-in fade-in"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <div className="flex items-center gap-1.5 leading-none">
                              <span>
                                {Object.values(foodCart).reduce((a, b) => a + b, 0)} {Object.values(foodCart).reduce((a, b) => a + b, 0) === 1 ? "item" : "items"}
                              </span>
                              <span>•</span>
                              <span>
                                ₹{Object.entries(foodCart).reduce((sum, [nameWithUnit, qty]) => {
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
                                  return sum + (matchedPrice || 30) * qty
                                }, 0)}
                              </span>
                            </div>
                          </button>
                        )}
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
                          {/* Booking Notice Banner for Fresh Vegetables (After 12 PM / Outside 6 AM - 12 PM Window) */}
                          {selectedFoodSubModule?.id === "vegetables" && vegTiming.afterTwelveNotice && (
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
                                  const hasOptions = item.options && item.options.length > 0
                                  const count = hasOptions
                                    ? item.options.reduce((sum, opt) => sum + (foodCart[`${item.name} (${opt.unit})`] || 0), 0)
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
                                          <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight min-h-[30px] group-hover:text-emerald-700 transition-colors" title={item.name}>
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
                                              onClick={() => setVariantModalItem(item)}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer"
                                            >
                                              <span>{count} in Cart</span>
                                              <ChevronDown className="w-2.5 h-2.5" />
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setVariantModalItem(item)}
                                              className="px-3.5 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-extrabold text-[11px] transition-all cursor-pointer active:scale-95 bg-white flex items-center gap-1"
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
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 cursor-pointer active:scale-98"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                      >
                        <span>
                          {selectedFoodSubModule.id === "vegetables"
                            ? vegTiming.cartButtonText
                            : `Confirm & Schedule ${selectedFoodSubModule.name} Delivery`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

        {/* ── 2. For You Curated Services Modal Popup ── */}
        {isForYouModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="foryou-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsForYouModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsForYouModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-2">
                    ✦ Personalized Recommendations
                  </div>
                  <h3
                    id="foryou-modal-title"
                    className="text-xl sm:text-2xl font-extrabold text-slate-900"
                  >
                    Curated For You
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Top-rated doorstep services and instant transport tailored for fast booking in your locality.
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

                {/* Grid of 6 For You Sub Services */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FOR_YOU_SUB.map((item, idx) => {
                    const isAvailable = isServiceAvailableInZone(item.name)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) {
                            showUnavailableServiceAlert(item.name)
                            return
                          }
                          setIsForYouModalOpen(false)
                          document.body.style.overflow = "unset"
                          if (item.action === "truck") {
                            navigate(routes.truck_booking_hosur)
                          } else if (item.action === "two_wheeler") {
                            navigate(routes.two_wheeler_booking_hosur)
                          } else if (item.categoryId === "cleaning") {
                            setIsHomePestModalOpen(true)
                          } else if (item.categoryId === "hvac") {
                            setIsAcModalOpen(true)
                          } else if (item.categoryId === "electrical") {
                            setIsElecModalOpen(true)
                          } else {
                            goToCategoryServices(item.categoryId)
                          }
                        }}
                        className={`group p-4 rounded-2xl border-2 ${isAvailable ? 'border-slate-100 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30' : 'border-slate-200/60 bg-slate-50/50 opacity-60'} flex flex-col justify-between text-left transition-all hover:shadow-md cursor-pointer relative`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            {!isAvailable ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                Not Available
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {item.badge}
                              </span>
                            )}
                            <ArrowRight className={`w-3.5 h-3.5 ${isAvailable ? 'text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5' : 'text-slate-300'} transition-transform`} />
                          </div>
                          <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform">
                            <item.graphic className={`w-10 h-10 ${!isAvailable ? 'grayscale-[50%]' : ''}`} />
                          </div>
                          <h4 className={`text-sm font-extrabold transition-colors ${isAvailable ? 'text-slate-900 group-hover:text-emerald-700' : 'text-slate-400'}`}>
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── 3. Home, Repair & Transport Services Combined Modal Popup ── */}
        {isHomeServicesCombinedModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="home-combined-modal-title"
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsHomeServicesCombinedModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsHomeServicesCombinedModalOpen(false)}
                  aria-label="Close popup"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-800 flex items-center justify-center transition-colors cursor-pointer z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-extrabold uppercase tracking-wider mb-2">
                    ⚡ 5 Core Specialized Pillars
                  </div>
                  <h3
                    id="home-combined-modal-title"
                    className="text-xl sm:text-2xl font-extrabold text-slate-900"
                  >
                    Home &amp; Repair Services
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                    Select any service below to explore specific options, verified technicians, and transparent pricing.
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

                {/* 5 Combined Services Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                  {CATEGORIES.map(({ label, icon: Icon, photo, serviceCategoryId }) => {
                    const isAvailable = isServiceAvailableInZone(label)
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          if (!isAvailable) {
                            showUnavailableServiceAlert(label)
                            return
                          }
                          setIsHomeServicesCombinedModalOpen(false)
                          document.body.style.overflow = "unset"
                          if (label === "Goods & Transports") {
                            setIsGoodsModalOpen(true)
                          } else if (label.includes("Electrician") || label.includes("Plumbing") || label.includes("Carpentry")) {
                            setIsElecModalOpen(true)
                          } else if (label.includes("AC") || label.includes("Appliance")) {
                            setIsAcModalOpen(true)
                          } else if (label === "Home Services & Pest Control") {
                            setIsHomePestModalOpen(true)
                          } else {
                            goToCategoryServices(serviceCategoryId)
                          }
                        }}
                        className={`group flex flex-col bg-white rounded-2xl border-2 ${isAvailable ? 'border-slate-100 hover:border-teal-500' : 'border-slate-200/60 opacity-60'} overflow-hidden text-center hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer relative`}
                      >
                        {photo ? (
                          <div className="h-24 w-full overflow-hidden bg-slate-100 relative">
                            <img
                              src={photo}
                              alt={label}
                              className={`w-full h-full object-cover ${isAvailable ? 'group-hover:scale-105' : 'grayscale-[50%]'} transition-transform duration-300`}
                            />
                            {!isAvailable && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-rose-50/95 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                                Not Available
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-24 w-full bg-teal-50 flex items-center justify-center relative">
                            <Icon className={`w-8 h-8 ${isAvailable ? 'text-teal-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                            {!isAvailable && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-rose-50/95 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                                Not Available
                              </span>
                            )}
                          </div>
                        )}
                        <span className={`text-xs font-extrabold leading-snug p-3 transition-colors ${isAvailable ? 'text-slate-700 group-hover:text-teal-800' : 'text-slate-400'}`}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}

      </div>

      <BkStyles />
      {activeCategory && (
        (activeCategory.id === "kitchen_cleaning" || activeCategory.slug === "kitchen_cleaning" || String(activeCategory.id) === "kitchen_cleaning" || activeCategory.name?.toLowerCase()?.includes("kitchen")) ? (
          <KitchenCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "sofa_cleaning" || activeCategory.slug === "sofa_cleaning" || String(activeCategory.id) === "sofa_cleaning" || activeCategory.name?.toLowerCase()?.includes("sofa")) ? (
          <SofaCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "bathroom_cleaning" || activeCategory.slug === "bathroom_cleaning" || String(activeCategory.id) === "bathroom_cleaning" || activeCategory.name?.toLowerCase()?.includes("bathroom")) ? (
          <BathroomCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "painting" || activeCategory.slug === "painting" || activeCategory.slug === "paintings" || String(activeCategory.id) === "17" || activeCategory.name?.toLowerCase() === "painting" || activeCategory.name?.toLowerCase() === "paintings") ? (
          <PaintingPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            packagesData={packagesData}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
            onGetEstimate={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
            }}
          />
        ) : (activeCategory.id === "mason" || activeCategory.slug === "mason" || activeCategory.slug === "masons" || String(activeCategory.id) === "11" || activeCategory.name?.toLowerCase() === "mason" || activeCategory.name?.toLowerCase() === "masonry") ? (
          <MasonPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            packagesData={packagesData}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
            onGetEstimate={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
            }}
          />
        ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Cockroach & Termite Control" || activeSubTabParam === "Cockroach Control" || activeSubTabParam === "Termite Control") && (activeSubTabParam !== "Ants & Bed Bugs Control" && activeSubTabParam !== "Ants Control" && activeSubTabParam !== "Bedbugs Control" && activeSubTabParam !== "Ants and bed bugs control") ? (
          <CockroachControlModal
            category={{ id: "pest_control", name: "Pest Control" }}
            cart={modalCart}
            setCart={setModalCart}
            initialTab={activeSubTabParam === "Termite Control" ? "termite" : "cockroach"}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(finalCart);
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        ) : (activeCategory.id === "pest_control" || activeCategory.slug === "pest_control" || activeSubTabParam === "Ants & Bed Bugs Control" || activeSubTabParam === "Ants Control" || activeSubTabParam === "Bedbugs Control" || activeSubTabParam === "Ants and bed bugs control") ? (
          <AntsBedBugsControlModal
            category={{ id: "pest_control", name: "Pest Control" }}
            cart={modalCart}
            setCart={setModalCart}
            initialTab={activeSubTabParam === "Ants Control" ? "ants" : "bedbugs"}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(finalCart);
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        ) : (
          <CustomCleaningPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        )
      )}

      {/* ── Home Services & Pest Control Modal Popup (Mounted to body for true window centering & Landing Page Emerald UI) ── */}
      {isHomePestModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepest-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHomePestModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsHomePestModalOpen(false)}
                aria-label="Close popup"
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-md border border-slate-200 transition-colors z-50"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>

              {/* Modal Title */}
              <div className="text-left mb-4">
                <h3
                  id="homepest-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  Home Cleaning &amp; Pest Control
                </h3>
                {zoneCheckResult?.zone?.name && (
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                    Service area: <span className="text-emerald-700 font-extrabold">📍 {zoneCheckResult.zone.name}</span>
                  </div>
                )}
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

              {/* Cleaning Section */}
              <div className="mb-6">
                <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                  Home Cleaning
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                  {HOME_SERVICES_SUB.map((item) => {
                    const isAvailable = isServiceAvailableInZone(item.name)
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) {
                            showUnavailableServiceAlert(item.name)
                            return
                          }
                          setIsHomePestModalOpen(false)
                          document.body.style.overflow = "unset"
                          if (item.name === "Kitchen Cleaning") {
                            navigate(`?category=kitchen_cleaning`)
                          } else if (item.name === "Sofa Cleaning") {
                            navigate(`?category=sofa_cleaning`)
                          } else if (item.name === "Bathroom Cleaning") {
                            navigate(`?category=bathroom_cleaning`)
                          } else if (item.name === "Full House Cleaning" || item.name === "Full House Deep Cleaning") {
                            navigate(`?category=cleaning&subtab=Occupied%20Apartment`)
                          } else {
                            navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                          }
                        }}
                        className={`group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center relative ${!isAvailable ? 'opacity-55' : ''}`}
                      >
                        <div className={`relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 ${isAvailable ? 'group-hover:bg-emerald-50/50 group-hover:border-emerald-200' : 'bg-slate-200/40 border-slate-200'} border border-transparent flex items-center justify-center transition-all`}>
                          <item.graphic className={`w-12 h-12 sm:w-14 sm:h-14 ${isAvailable ? 'group-hover:scale-105' : 'grayscale-[50%]'} transition-transform`} />
                          {!isAvailable ? (
                            <div className="absolute -bottom-2 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                              Not Available
                            </div>
                          ) : item.badge && (
                            <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                              {item.badge}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] sm:text-[11px] font-semibold ${isAvailable ? 'text-slate-700 group-hover:text-emerald-700' : 'text-slate-400'} mt-2.5 leading-tight transition-colors max-w-[90px] sm:max-w-[105px] break-words`}>
                          {item.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Pest Control Section */}
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-3 select-none">
                  Pest Control
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-4 justify-items-center">
                  {PEST_CONTROL_SUB.map((item) => {
                    const isAvailable = isServiceAvailableInZone(item.name)
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) {
                            showUnavailableServiceAlert(item.name)
                            return
                          }
                          setIsHomePestModalOpen(false)
                          document.body.style.overflow = "unset"
                          navigate(`?category=${item.categoryId}&subtab=${encodeURIComponent(item.name)}`)
                        }}
                        className={`group flex flex-col items-center focus:outline-none cursor-pointer w-full text-center relative ${!isAvailable ? 'opacity-55' : ''}`}
                      >
                        <div className={`relative w-[84px] h-[68px] sm:w-[98px] sm:h-[78px] rounded-xl bg-slate-100/60 ${isAvailable ? 'group-hover:bg-emerald-50/50 group-hover:border-emerald-200' : 'bg-slate-200/40 border-slate-200'} border border-transparent flex items-center justify-center transition-all`}>
                          <item.graphic className={`w-12 h-12 sm:w-14 sm:h-14 ${isAvailable ? 'group-hover:scale-105' : 'grayscale-[50%]'} transition-transform`} />
                          {!isAvailable ? (
                            <div className="absolute -bottom-2 bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm scale-90 whitespace-nowrap">
                              Not Available
                            </div>
                          ) : item.badge && (
                            <div className="absolute -bottom-1.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-bold px-1 rounded shadow-sm scale-90 whitespace-nowrap">
                              {item.badge}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] sm:text-[11px] font-semibold ${isAvailable ? 'text-slate-700 group-hover:text-emerald-700' : 'text-slate-400'} mt-2.5 leading-tight transition-colors max-w-[90px] sm:max-w-[105px] break-words`}>
                          {item.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Goods & Transports Modal Popup (Mounted to body for true window centering & Landing Page Emerald UI) ── */}
      {isGoodsModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transport-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsGoodsModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsGoodsModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors"
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

              {/* Items Grid matching Image 2 with Landing Page Emerald styling */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                {/* Option 1: Truck */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.truck_booking_hosur)
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <TruckGraphic className="w-full h-full" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 mt-2 group-hover:text-emerald-700 transition-colors text-center leading-tight">
                    Mini Truck<br /><span className="text-slate-500 font-semibold text-[11px] sm:text-xs">(Hosur)</span>
                  </span>
                </button>

                {/* Option 2: Two Wheeler */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.two_wheeler_booking_hosur)
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <TwoWheelerGraphic className="w-full h-full" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 mt-2 group-hover:text-emerald-700 transition-colors text-center leading-tight">
                    2-Wheeler<br /><span className="text-slate-500 font-semibold text-[11px] sm:text-xs">(Hosur)</span>
                  </span>
                </button>

                {/* Option 3: Packers & Movers */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.packers_movers_booking_hosur)
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <PackersMoversGraphic className="w-full h-full" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 mt-2 group-hover:text-emerald-700 transition-colors text-center leading-tight">
                    Packers &amp;<br />Movers
                  </span>
                </button>

                {/* Option 4: Get an Estimate card/button in Landing Page Emerald theme */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGoodsModalOpen(false)
                    document.body.style.overflow = "unset"
                    navigate(routes.truck_booking_hosur)
                  }}
                  className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white shadow-lg shadow-emerald-600/25 transition-all text-left cursor-pointer min-h-[140px]"
                >
                  <div>
                    <p className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight">
                      Get an<br />Estimate
                    </p>
                    <p className="text-xs text-emerald-100 font-medium mt-2 opacity-95">
                      (takes ~2 mins)
                    </p>
                  </div>
                  <div className="pt-4 flex items-center">
                    <ArrowRight className="w-6 h-6 text-white stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Electrician, Plumbing & Carpentry Sub-Category Modal Popup ── */}
      {isElecModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="elec-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsElecModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsElecModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div className="text-center mb-6">
                <h3
                  id="elec-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  Electrician, Plumbing &amp; Carpentry
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a service type to view related services
                </p>
              </div>

              {/* Items Grid for Electrician, Plumbing & Carpentry (3 options) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                {/* Option 1: Electrician */}
                <button
                  type="button"
                  onClick={() => {
                    setIsElecModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("electrical")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <ElectricianGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Electrician
                  </span>
                </button>

                {/* Option 2: Plumber */}
                <button
                  type="button"
                  onClick={() => {
                    setIsElecModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("plumbing")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <PlumberGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Plumber
                  </span>
                </button>

                {/* Option 3: Carpentry */}
                <button
                  type="button"
                  onClick={() => {
                    setIsElecModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("carpentry")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <CarpentryGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Carpentry
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── AC & Appliance Sub-Category Modal Popup ── */}
      {isAcModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAcModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAcModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div className="text-center mb-6">
                <h3
                  id="ac-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900"
                >
                  AC &amp; Appliance Repair
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose an appliance type to view related services
                </p>
              </div>

              {/* Items Grid for AC & Appliance Repair (5 options) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 items-stretch">
                {/* Option 1: AC Service */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("hvac", "AC Service & Cleaning")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <AcGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Air Conditioner
                  </span>
                </button>

                {/* Option 2: Refrigerator */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("refrigerator", "Refrigerator Service & Repair")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <FridgeGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Refrigerator
                  </span>
                </button>

                {/* Option 3: Washing Machine */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("washing_machine", "Washing Machine Jet Service")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <WashingMachineGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Washing Machine
                  </span>
                </button>

                {/* Option 4: TV & Home Theatre */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("tv_display", "TV Service & Repair")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <TvGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    TV &amp; Display
                  </span>
                </button>

                {/* Option 5: Microwave Oven */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAcModalOpen(false)
                    document.body.style.overflow = "unset"
                    goToCategoryServices("microwave", "Microwave Repair")
                  }}
                  className="group flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-center focus:outline-none cursor-pointer border-2 border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md"
                >
                  <div className="w-full aspect-square max-w-[110px] rounded-2xl bg-slate-100/80 border border-slate-200/60 group-hover:bg-slate-200/80 flex items-center justify-center p-2 group-hover:scale-105 transition-all">
                    <MicrowaveGraphic className="w-full h-full" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-2.5 group-hover:text-slate-900 transition-colors">
                    Microwave Oven
                  </span>
                </button>
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

      {/* ── 2. For You Curated Services Modal Popup ── */}
      {isForYouModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="foryou-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsForYouModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsForYouModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-2">
                  ✦ Personalized Recommendations
                </div>
                <h3
                  id="foryou-modal-title"
                  className="text-xl sm:text-2xl font-extrabold text-slate-900"
                >
                  Curated For You
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Top-rated doorstep services and instant transport tailored for fast booking in your locality.
                </p>
              </div>

              {/* Grid of 6 For You Sub Services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FOR_YOU_SUB.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsForYouModalOpen(false)
                      document.body.style.overflow = "unset"
                      if (item.action === "truck") {
                        navigate(routes.truck_booking_hosur)
                      } else if (item.action === "two_wheeler") {
                        navigate(routes.two_wheeler_booking_hosur)
                      } else if (item.categoryId === "cleaning") {
                        setIsHomePestModalOpen(true)
                      } else if (item.categoryId === "hvac") {
                        setIsAcModalOpen(true)
                      } else if (item.categoryId === "electrical") {
                        setIsElecModalOpen(true)
                      } else {
                        goToCategoryServices(item.categoryId)
                      }
                    }}
                    className="group p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 flex flex-col justify-between text-left transition-all hover:shadow-md cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {item.badge}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform">
                        {typeof item.graphic === "function" && item.graphic.prototype ? (
                          <item.graphic className="w-10 h-10" />
                        ) : (
                          <item.graphic className="w-10 h-10" />
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── 3. Home, Repair & Transport Services Combined Modal Popup ── */}
      {isHomeServicesCombinedModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-combined-modal-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHomeServicesCombinedModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsHomeServicesCombinedModalOpen(false)}
                aria-label="Close popup"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-800 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-extrabold uppercase tracking-wider mb-2">
                  ⚡ 5 Core Specialized Pillars
                </div>
                <h3
                  id="home-combined-modal-title"
                  className="text-xl sm:text-2xl font-extrabold text-slate-900"
                >
                  Home &amp; Repair Services
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                  Select any service below to explore specific options, verified technicians, and transparent pricing.
                </p>
              </div>

              {/* 5 Combined Services Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {CATEGORIES.map(({ label, icon: Icon, photo, serviceCategoryId }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setIsHomeServicesCombinedModalOpen(false)
                      document.body.style.overflow = "unset"
                      if (label === "Goods & Transports") {
                        setIsGoodsModalOpen(true)
                      } else if (label.includes("Electrician") || label.includes("Plumbing") || label.includes("Carpentry")) {
                        setIsElecModalOpen(true)
                      } else if (label.includes("AC") || label.includes("Appliance")) {
                        setIsAcModalOpen(true)
                      } else if (label === "Home Services & Pest Control") {
                        setIsHomePestModalOpen(true)
                      } else {
                        goToCategoryServices(serviceCategoryId)
                      }
                    }}
                    className="group flex flex-col bg-white rounded-2xl border-2 border-slate-100 hover:border-teal-500 overflow-hidden text-center hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    {photo ? (
                      <div className="h-24 w-full overflow-hidden bg-slate-100">
                        <img
                          src={photo}
                          alt={label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-full bg-teal-50 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-teal-600" strokeWidth={1.5} />
                      </div>
                    )}
                    <span className="text-xs font-extrabold text-slate-700 leading-snug p-3 group-hover:text-teal-800 transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      <BkStyles />
      {activeCategory && (
        (activeCategory.id === "kitchen_cleaning" || activeCategory.slug === "kitchen_cleaning" || String(activeCategory.id) === "kitchen_cleaning" || activeCategory.name?.toLowerCase()?.includes("kitchen")) ? (
          <KitchenCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={() => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(null) } })}
          />
        ) : (activeCategory.id === "sofa_cleaning" || activeCategory.slug === "sofa_cleaning" || String(activeCategory.id) === "sofa_cleaning" || activeCategory.name?.toLowerCase()?.includes("sofa")) ? (
          <SofaCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "bathroom_cleaning" || activeCategory.slug === "bathroom_cleaning" || String(activeCategory.id) === "bathroom_cleaning" || activeCategory.name?.toLowerCase()?.includes("bathroom")) ? (
          <BathroomCleaningModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => navigate(routes.booking_checkout, { state: { category: activeCategory, cart: resolveCartArg(customCart) } })}
          />
        ) : (activeCategory.id === "painting" || activeCategory.slug === "painting" || activeCategory.slug === "paintings" || String(activeCategory.id) === "17" || activeCategory.name?.toLowerCase() === "painting" || activeCategory.name?.toLowerCase() === "paintings") ? (
          <PaintingPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            packagesData={packagesData}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
            onGetEstimate={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
            }}
          />
        ) : (activeCategory.id === "mason" || activeCategory.slug === "mason" || activeCategory.id === "civil" || String(activeCategory.id) === "11" || activeCategory.name?.toLowerCase()?.includes("mason") || activeCategory.name?.toLowerCase()?.includes("civil")) ? (
          <MasonPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            packagesData={packagesData}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
            onGetEstimate={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart, triggerLocPicker: true } });
            }}
          />
        ) : (
          <CustomCleaningPackageModal
            category={activeCategory}
            cart={modalCart}
            setCart={setModalCart}
            onClose={() => navigate("/home")}
            onCheckout={(customCart) => {
              const finalCart = resolveCartArg(customCart);
              setModalCart(cleanConsultationItems(finalCart));
              navigate(routes.booking_checkout, { state: { category: activeCategory, cart: finalCart } });
            }}
          />
        )
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
            deliveryAddress={activeLocationLabel || "Thozhi Hostel, Viswanathapuram, Hosur, Tamil Nadu"}
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
      {modalCart && modalCart.length > 0 && !activeCategory && !isGoodsModalOpen && !isElecModalOpen && !isAcModalOpen && !isHomePestModalOpen && !isForYouModalOpen && !isFoodHealthModalOpen && !isHomeServicesCombinedModalOpen && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9995] w-[92%] max-w-lg bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800 flex items-center justify-between gap-4 backdrop-blur-lg"
        >
          {/* Cart Item Count & Total Price */}
          <div className="flex items-center gap-3 pl-1">
            <div className="relative w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                {modalCart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300">
                {modalCart.reduce((sum, i) => sum + i.quantity, 0)} {modalCart.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "Service" : "Services"} Added
              </div>
              <div className="text-sm font-black text-white">
                ₹{modalCart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* View Cart / Proceed Action Button */}
          <button
            type="button"
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
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0 uppercase tracking-wider"
          >
            <span>View Cart</span>
            <ChevronRight size={15} strokeWidth={3} />
          </button>
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
