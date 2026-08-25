import React, { useState, useEffect } from "react"
import {
  AirVent,
  Wrench,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  Star
} from "lucide-react"

/**
 * 5 Real SEVO Certified Professionals corresponding to the core services.
 */
const SEVO_PROFESSIONALS = [
  {
    id: "ac",
    serviceKey: "ac",
    name: "Suresh K.",
    role: "AC Specialist",
    rating: "4.9",
    jobsDone: "1,200+",
    image: "/assets/sevo_pro_ac_v2.png",
    accentColor: "from-blue-600 to-sky-500",
    badgeBg: "bg-blue-600 text-white",
    tagline: "AC Installation & Jet Service"
  },
  {
    id: "plumbing",
    serviceKey: "plumbing",
    name: "Ramesh M.",
    role: "Master Plumber",
    rating: "4.8",
    jobsDone: "950+",
    image: "/assets/sevo_pro_plumbing_v2.png",
    accentColor: "from-emerald-600 to-teal-500",
    badgeBg: "bg-emerald-600 text-white",
    tagline: "Leakage & Pipe Fitting Expert"
  },
  {
    id: "electrical",
    serviceKey: "electrical",
    name: "Karthik R.",
    role: "Senior Electrician",
    rating: "4.9",
    jobsDone: "1,450+",
    image: "/assets/sevo_pro_electrical_v2.png",
    accentColor: "from-amber-600 to-yellow-500",
    badgeBg: "bg-amber-600 text-white",
    tagline: "Wiring & Circuit Diagnostics"
  },
  {
    id: "cleaning",
    serviceKey: "cleaning",
    name: "Priya S.",
    role: "Cleaning Expert",
    rating: "4.9",
    jobsDone: "2,100+",
    image: "/assets/sevo_pro_cleaning_v2.png",
    accentColor: "from-purple-600 to-pink-500",
    badgeBg: "bg-purple-600 text-white",
    tagline: "Deep Home & Office Cleaning"
  },
  {
    id: "appliance",
    serviceKey: "appliance",
    name: "Deepa N.",
    role: "Appliance Technician",
    rating: "4.8",
    jobsDone: "880+",
    image: "/assets/sevo_pro_appliance_v2.png",
    accentColor: "from-rose-600 to-orange-500",
    badgeBg: "bg-rose-600 text-white",
    tagline: "Washing Machine & Appliance Repair"
  }
]

/**
 * 4 Floating Service Cards matching SEVO Design System.
 */
const SERVICE_CARDS = [
  {
    id: "ac",
    name: "AC Service",
    subtitle: "Repair & Installation",
    icon: AirVent,
    color: "bg-[#0057D9]",
    textColor: "text-[#0057D9]",
    borderColor: "hover:border-[#0057D9]/50",
    shadowColor: "hover:shadow-blue-500/20",
    ariaLabel: "Book AC Service - Repair and Installation",
    action: "ac_modal",
    desktopPos: "top-[-18px] left-1/2 -translate-x-1/2",
    floatDelay: "0s"
  },
  {
    id: "plumbing",
    name: "Plumbing",
    subtitle: "Leakage, Repair & Installation",
    icon: Wrench,
    color: "bg-[#16A34A]",
    textColor: "text-[#16A34A]",
    borderColor: "hover:border-[#16A34A]/50",
    shadowColor: "hover:shadow-emerald-500/20",
    ariaLabel: "Book Plumbing Service - Leakage, Repair and Installation",
    action: "plumbing_flow",
    desktopPos: "top-[42%] left-[-42px] -translate-y-1/2",
    floatDelay: "1.2s"
  },
  {
    id: "electrical",
    name: "Electrical",
    subtitle: "Wiring, Repair & Installation",
    icon: Zap,
    color: "bg-[#F59E0B]",
    textColor: "text-[#F59E0B]",
    borderColor: "hover:border-[#F59E0B]/50",
    shadowColor: "hover:shadow-amber-500/20",
    ariaLabel: "Book Electrical Service - Wiring, Repair and Installation",
    action: "electrical_flow",
    desktopPos: "top-[40%] right-[-42px] -translate-y-1/2",
    floatDelay: "0.6s"
  },
  {
    id: "cleaning",
    name: "Cleaning",
    subtitle: "Home & Office Cleaning",
    icon: Sparkles,
    color: "bg-[#8B5CF6]",
    textColor: "text-[#8B5CF6]",
    borderColor: "hover:border-[#8B5CF6]/50",
    shadowColor: "hover:shadow-purple-500/20",
    ariaLabel: "Book Cleaning Service - Home and Office Cleaning",
    action: "cleaning_flow",
    desktopPos: "bottom-[16px] right-[-24px]",
    floatDelay: "1.8s"
  }
]

export function HeroServiceVisualization({
  onSelectService,
  activeServiceId = null
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)

  // Auto-cycle through all 5 technicians one by one every 3.5 seconds
  useEffect(() => {
    if (isPaused || hoveredCard) return

    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SEVO_PROFESSIONALS.length)
    }, 3500)

    return () => clearInterval(timer)
  }, [isPaused, hoveredCard])

  // When hovering on a service card, immediately switch to that technician
  const handleCardHover = (cardId) => {
    setHoveredCard(cardId)
    const matchedIdx = SEVO_PROFESSIONALS.findIndex((p) => p.serviceKey === cardId)
    if (matchedIdx !== -1) {
      setActiveIdx(matchedIdx)
    }
  }

  const handleCardLeave = () => {
    setHoveredCard(null)
  }

  const currentPro = SEVO_PROFESSIONALS[activeIdx] || SEVO_PROFESSIONALS[0]

  return (
    <div
      className="w-full flex flex-col items-center justify-center relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── DESKTOP & TABLET: Circular Orbital Carousel (md:flex hidden) ── */}
      <div className="hidden md:flex relative w-full max-w-[560px] aspect-[1/0.96] items-center justify-center select-none py-6">
        
        {/* Background Glowing Halo & Dashed Orbit System */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Outer Ambient Atmospheric Glow */}
          <div className="w-[490px] h-[490px] rounded-full bg-gradient-to-tr from-blue-500/15 via-sky-400/10 to-emerald-400/10 blur-3xl opacity-75"></div>

          {/* Solid Curved Blue Arc */}
          <div className="w-[430px] h-[430px] rounded-full bg-gradient-to-tr from-[#0057D9] via-[#0284C7] to-transparent opacity-95 p-[6px] shadow-2xl shadow-blue-500/20">
            <div className="w-full h-full rounded-full bg-white/5 backdrop-blur-xs"></div>
          </div>

          {/* Rotating Dashed Orbit Line SVG */}
          <svg className="absolute w-[470px] h-[470px] animate-[spin_60s_linear_infinite]" viewBox="0 0 470 470">
            <circle
              cx="235"
              cy="235"
              r="220"
              fill="none"
              stroke="#16A34A"
              strokeWidth="2"
              strokeDasharray="6 8"
              opacity="0.45"
            />
          </svg>

          {/* Secondary Concentric Dashed Ring */}
          <div className="absolute w-[365px] h-[365px] rounded-full border border-blue-200/50 border-dashed animate-[spin_45s_linear_infinite_reverse] pointer-events-none"></div>

          {/* Floating Orbit Micro-Badges */}
          <div className="absolute top-[18%] left-[16%] w-9 h-9 rounded-full bg-white shadow-lg border border-blue-100 flex items-center justify-center text-[#0057D9] animate-pulse">
            <ShieldCheck className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>

          <div className="absolute top-[18%] right-[16%] w-9 h-9 rounded-full bg-white shadow-lg border border-blue-100 flex items-center justify-center text-[#0057D9] animate-pulse">
            <Users className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>

          <div className="absolute bottom-[20%] left-[18%] w-9 h-9 rounded-full bg-white shadow-lg border border-blue-100 flex items-center justify-center text-[#0057D9] animate-pulse">
            <Clock className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
        </div>

        {/* Center: Dynamic Circular Technician Showcase Frame */}
        <div className="relative z-10 w-[300px] h-[300px] lg:w-[340px] lg:h-[340px] rounded-full p-2 bg-gradient-to-b from-white via-blue-50 to-white shadow-[0_20px_50px_rgba(0,87,217,0.22)] border-4 border-white group">
          <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-100 shadow-inner">
            {/* Stack of all 5 images for instantaneous zero-latency smooth cross-fade */}
            {SEVO_PROFESSIONALS.map((pro, index) => {
              const isCurrent = index === activeIdx
              return (
                <div
                  key={pro.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isCurrent ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-95 pointer-events-none"
                  }`}
                >
                  <img
                    src={pro.image}
                    onError={(e) => { e.currentTarget.src = "/mockups/hero_technician_circular.png" }}
                    alt={`${pro.name} - SEVO ${pro.role}`}
                    className="w-full h-full object-cover object-center transition-transform duration-700"
                    loading="eager"
                    fetchPriority="high"
                  />
                  {/* Subtle inner ambient bottom gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent pointer-events-none"></div>
                </div>
              )
            })}
          </div>

          {/* Floating Technician Name & Rating Pill (Outside overflow-hidden for 100% crystal clear view) */}
          <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.14)] border border-slate-100 flex items-center gap-2.5 whitespace-nowrap">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-slate-900 tracking-tight">{currentPro.name}</span>
            <span className="text-[11px] text-slate-300">•</span>
            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {currentPro.rating}
            </span>
            <span className="text-[11px] text-slate-300">•</span>
            {/* 5 mini clickable dots */}
            <div className="flex items-center gap-1.5">
              {SEVO_PROFESSIONALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveIdx(i)
                  }}
                  aria-label={`View professional ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === activeIdx ? "w-3.5 bg-[#0057D9]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── 4 Floating Interactive Service Cards (Real React DOM Buttons) ── */}
        {SERVICE_CARDS.map((card) => {
          const Icon = card.icon
          const isCardActive = (hoveredCard === card.id) || (currentPro.serviceKey === card.id)

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectService && onSelectService(card.id, card.action)}
              onMouseEnter={() => handleCardHover(card.id)}
              onMouseLeave={handleCardLeave}
              aria-label={card.ariaLabel}
              style={{ animationDelay: card.floatDelay }}
              className={`absolute z-20 ${card.desktopPos} group flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 pr-4 border shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer active:scale-95 text-left ${
                isCardActive
                  ? `border-[#0057D9] ring-2 ring-blue-500/20 shadow-[0_20px_45px_rgba(0,87,217,0.18)] -translate-y-1 scale-[1.03]`
                  : `border-slate-100/90 ${card.borderColor} ${card.shadowColor}`
              }`}
            >
              {/* Icon Circle Badge */}
              <div className={`w-11 h-11 rounded-full ${card.color} text-white flex items-center justify-center shrink-0 shadow-md shadow-slate-900/10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>

              {/* Text Information */}
              <div className="min-w-0 pr-1">
                <span className="text-xs sm:text-sm font-black text-[#0F172A] block leading-tight group-hover:text-[#0057D9] transition-colors">
                  {card.name}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 leading-none whitespace-nowrap">
                  {card.subtitle}
                </span>
              </div>

              {/* Circular Action Arrow Button */}
              <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-[#0057D9] text-slate-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs ml-auto">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )
        })}

        {/* ── Bottom Center Pill: Expert Professionals ── */}
        <button
          type="button"
          onClick={() => onSelectService && onSelectService("why-choose-us", "scroll")}
          aria-label="Why Choose Sevo - Verified & On-Time Service"
          className="absolute bottom-[-54px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2 border border-slate-100 shadow-[0_12px_35px_rgba(0,0,0,0.08)] hover:shadow-xl hover:border-emerald-300 transition-all duration-300 cursor-pointer active:scale-95 group"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-black text-slate-900 block leading-tight">
              Expert Professionals
            </span>
            <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold leading-none mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-[#0057D9]" />
              <span>On-Time Service</span>
            </div>
          </div>
        </button>
      </div>

      {/* ── MOBILE: Responsive One-by-One View (< md) ── */}
      <div className="flex md:hidden flex-col items-center w-full space-y-4 py-2">
        {/* Mobile Technician Presentation */}
        <div className="relative w-56 h-56 rounded-full p-2 bg-gradient-to-tr from-[#0057D9] via-sky-400 to-[#16A34A] shadow-xl">
          <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white relative">
            {SEVO_PROFESSIONALS.map((pro, index) => {
              const isCurrent = index === activeIdx
              return (
                <div
                  key={pro.id}
                  className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                    isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={pro.image}
                    onError={(e) => { e.currentTarget.src = "/mockups/hero_technician_circular.png" }}
                    alt={pro.name}
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              )
            })}
          </div>
          {/* Mobile floating verification badge */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-slate-100 flex items-center gap-1.5 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0057D9]" />
            <span className="text-[10px] font-black text-slate-900">{currentPro.name} • {currentPro.role}</span>
          </div>
        </div>

        {/* Mobile 5-Dot Indicator */}
        <div className="flex items-center gap-1.5 pt-1">
          {SEVO_PROFESSIONALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`View technician ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeIdx ? "w-4 bg-[#0057D9]" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>

        {/* Mobile 2x2 Service Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
          {SERVICE_CARDS.map((card) => {
            const Icon = card.icon
            const isCardActive = currentPro.serviceKey === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectService && onSelectService(card.id, card.action)}
                aria-label={card.ariaLabel}
                className={`flex flex-col items-start p-3 bg-white rounded-2xl border shadow-xs active:scale-95 text-left transition-all ${
                  isCardActive ? "border-[#0057D9] ring-2 ring-blue-500/20" : "border-slate-200/80"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl ${card.color} text-white flex items-center justify-center mb-2 shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {card.name}
                </span>
                <span className="text-[9.5px] text-slate-500 font-medium block mt-0.5 leading-snug">
                  {card.subtitle}
                </span>
              </button>
            )
          })}
        </div>

        {/* Mobile Bottom Verified Pill */}
        <button
          type="button"
          onClick={() => onSelectService && onSelectService("why-choose-us", "scroll")}
          className="w-full py-2.5 px-4 bg-blue-50/70 border border-blue-100/80 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-[#0057D9]"
        >
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>100% Background Verified Professionals</span>
        </button>
      </div>
    </div>
  )
}
