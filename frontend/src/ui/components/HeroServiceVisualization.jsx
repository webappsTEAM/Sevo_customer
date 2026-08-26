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
    reviews: "620",
    jobsDone: "1,200+",
    image: "/assets/sevo_pro_ac_v2.png",
    tagline: "AC Installation & Jet Service"
  },
  {
    id: "plumbing",
    serviceKey: "plumbing",
    name: "Ramesh M.",
    role: "Master Plumber",
    rating: "4.8",
    reviews: "540",
    jobsDone: "950+",
    image: "/assets/sevo_pro_plumbing_v2.png",
    tagline: "Leakage & Pipe Fitting Expert"
  },
  {
    id: "electrical",
    serviceKey: "electrical",
    name: "Karthik R.",
    role: "Senior Electrician",
    rating: "4.9",
    reviews: "780",
    jobsDone: "1,450+",
    image: "/assets/sevo_pro_electrical_v2.png",
    tagline: "Wiring & Circuit Diagnostics"
  },
  {
    id: "cleaning",
    serviceKey: "cleaning",
    name: "Priya S.",
    role: "Cleaning Expert",
    rating: "4.9",
    reviews: "890",
    jobsDone: "2,100+",
    image: "/assets/sevo_pro_cleaning_v2.png",
    tagline: "Deep Home & Office Cleaning"
  },
  {
    id: "appliance",
    serviceKey: "appliance",
    name: "Deepa N.",
    role: "Appliance Tech",
    rating: "4.8",
    reviews: "410",
    jobsDone: "880+",
    image: "/assets/sevo_pro_appliance_v2.png",
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
    color: "bg-[#0B8F7A] text-white",
    iconBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400",
    ariaLabel: "Book AC Service - Repair and Installation",
    action: "ac_modal",
    desktopPos: "top-[-12px] left-1/2 -translate-x-1/2",
    floatDelay: "0s"
  },
  {
    id: "plumbing",
    name: "Plumbing",
    subtitle: "Leakage & Installation",
    icon: Wrench,
    color: "bg-[#0F5FBF] text-white",
    iconBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
    ariaLabel: "Book Plumbing Service - Leakage and Installation",
    action: "plumbing_flow",
    desktopPos: "top-[40%] left-[-28px] -translate-y-1/2",
    floatDelay: "1.2s"
  },
  {
    id: "electrical",
    name: "Electrical",
    subtitle: "Wiring & Fixtures",
    icon: Zap,
    color: "bg-[#D97706] text-white",
    iconBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    ariaLabel: "Book Electrical Service - Wiring and Fixtures",
    action: "electrical_flow",
    desktopPos: "top-[38%] right-[-28px] -translate-y-1/2",
    floatDelay: "0.6s"
  },
  {
    id: "cleaning",
    name: "Cleaning",
    subtitle: "Home & Deep Cleaning",
    icon: Sparkles,
    color: "bg-[#059669] text-white",
    iconBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    ariaLabel: "Book Cleaning Service - Home and Deep Cleaning",
    action: "cleaning_flow",
    desktopPos: "bottom-[12px] right-[-16px]",
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

  // Auto-cycle through technicians
  useEffect(() => {
    if (isPaused || hoveredCard) return
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SEVO_PROFESSIONALS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [isPaused, hoveredCard])

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
      className="w-full flex flex-col items-center justify-center relative select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── DESKTOP & TABLET VIEW (md:flex) ── */}
      <div className="hidden md:flex relative w-full max-w-[520px] aspect-[1/0.95] items-center justify-center py-6">
        
        {/* Background Concept 3 Warm Organic Ring & Soft Atmospheric Ambient Aura */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Ambient Glow */}
          <div className="w-[460px] h-[460px] rounded-full bg-gradient-to-tr from-[var(--sevo-primary-light)] via-[var(--sevo-surface-raised)] to-[var(--sevo-secondary-light)] blur-3xl opacity-70"></div>

          {/* Organic Circular Leaf/Pill Frame (Concept 3 Signature) */}
          <div className="w-[390px] h-[390px] rounded-full bg-gradient-to-tr from-[var(--sevo-primary)]/20 via-[var(--sevo-secondary)]/15 to-transparent p-[3px] shadow-[var(--sevo-shadow-lg)]">
            <div className="w-full h-full rounded-full bg-[var(--sevo-surface)]/60 backdrop-blur-xs"></div>
          </div>

          {/* Rotating Soft Dashed Ring */}
          <svg className="absolute w-[430px] h-[430px] animate-[spin_60s_linear_infinite]" viewBox="0 0 430 430">
            <circle
              cx="215"
              cy="215"
              r="200"
              fill="none"
              stroke="currentColor"
              className="text-[var(--sevo-primary)] opacity-30"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
          </svg>

          {/* Floating Trust Icons */}
          <div className="absolute top-[16%] left-[12%] w-8 h-8 rounded-full bg-[var(--sevo-surface)] shadow-[var(--sevo-shadow-sm)] border border-[var(--sevo-border)] flex items-center justify-center text-[var(--sevo-primary)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="absolute top-[16%] right-[12%] w-8 h-8 rounded-full bg-[var(--sevo-surface)] shadow-[var(--sevo-shadow-sm)] border border-[var(--sevo-border)] flex items-center justify-center text-[var(--sevo-secondary)]">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Center: Dynamic Circular Technician Showcase Frame */}
        <div className="relative z-10 w-[280px] h-[280px] lg:w-[320px] lg:h-[320px] rounded-full p-2 bg-gradient-to-b from-[var(--sevo-surface)] via-[var(--sevo-surface-raised)] to-[var(--sevo-surface)] shadow-[var(--sevo-shadow-lg)] border-4 border-[var(--sevo-surface)] group">
          <div className="w-full h-full rounded-full overflow-hidden relative bg-[var(--sevo-surface-raised)] shadow-inner">
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
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none"></div>
                </div>
              )
            })}
          </div>

          {/* Floating Rating Badge Matching Reference Concept 3 (⭐ 4.8 512 Reviews) */}
          <div className="absolute -bottom-3 -right-2 z-30 bg-[var(--sevo-surface)] px-3.5 py-1.5 rounded-2xl shadow-[var(--sevo-shadow-md)] border border-[var(--sevo-border)] flex items-center gap-2">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-xs font-black text-[var(--sevo-text-primary)]">{currentPro.rating}</span>
            </div>
            <span className="text-[10px] text-[var(--sevo-text-muted)] font-semibold">({currentPro.reviews} Reviews)</span>
          </div>

          {/* Technician Name Floating Pill */}
          <div className="absolute -bottom-3 -left-2 z-30 bg-[var(--sevo-surface)] px-3 py-1 rounded-full shadow-[var(--sevo-shadow-md)] border border-[var(--sevo-border)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--sevo-primary)] animate-pulse"></span>
            <span className="text-xs font-black text-[var(--sevo-text-primary)]">{currentPro.name}</span>
            <span className="text-[10px] text-[var(--sevo-text-muted)] font-medium">• {currentPro.role}</span>
          </div>
        </div>

        {/* ── 4 Floating Service Action Cards ── */}
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
              className={`absolute z-20 ${card.desktopPos} group flex items-center gap-3 bg-[var(--sevo-surface)] rounded-2xl p-2.5 sm:p-3 pr-4 border shadow-[var(--sevo-shadow-sm)] hover:shadow-[var(--sevo-shadow-md)] transition-all duration-300 cursor-pointer active:scale-95 text-left ${
                isCardActive
                  ? `border-[var(--sevo-primary)] ring-2 ring-[var(--sevo-primary)]/20 -translate-y-1 scale-[1.03]`
                  : `border-[var(--sevo-border)] hover:border-[var(--sevo-border-strong)]`
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0 pr-1">
                <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight group-hover:text-[var(--sevo-primary)] transition-colors">
                  {card.name}
                </span>
                <span className="text-[10px] text-[var(--sevo-text-muted)] font-semibold block mt-0.5 leading-none whitespace-nowrap">
                  {card.subtitle}
                </span>
              </div>
              <div className="w-5 h-5 rounded-full bg-[var(--sevo-surface-raised)] group-hover:bg-[var(--sevo-primary)] text-[var(--sevo-text-muted)] group-hover:text-white flex items-center justify-center shrink-0 transition-colors ml-auto">
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )
        })}
      </div>

      {/* ── MOBILE VIEW (< md) ── */}
      <div className="flex md:hidden flex-col items-center w-full space-y-4 py-2">
        <div className="relative w-52 h-52 rounded-full p-2 bg-gradient-to-tr from-[var(--sevo-primary)] via-[var(--sevo-secondary)] to-[var(--sevo-surface-raised)] shadow-[var(--sevo-shadow-md)]">
          <div className="w-full h-full rounded-full overflow-hidden bg-[var(--sevo-surface)] border-2 border-[var(--sevo-surface)] relative">
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
                  />
                </div>
              )
            })}
          </div>
          {/* Mobile Rating Badge */}
          <div className="absolute -bottom-2 right-2 bg-[var(--sevo-surface)] px-2.5 py-1 rounded-full shadow-md border border-[var(--sevo-border)] flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-black text-[var(--sevo-text-primary)]">{currentPro.rating}</span>
          </div>
          {/* Mobile Name Pill */}
          <div className="absolute -bottom-2 left-2 bg-[var(--sevo-surface)] px-2.5 py-1 rounded-full shadow-md border border-[var(--sevo-border)] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[var(--sevo-primary)]" />
            <span className="text-[10px] font-black text-[var(--sevo-text-primary)]">{currentPro.name}</span>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5 pt-1">
          {SEVO_PROFESSIONALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`View technician ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeIdx ? "w-4 bg-[var(--sevo-primary)]" : "w-1.5 bg-[var(--sevo-border-strong)]"
              }`}
            />
          ))}
        </div>

        {/* 2x2 Service Cards */}
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
                className={`flex flex-col items-start p-3 bg-[var(--sevo-surface)] rounded-2xl border shadow-xs active:scale-95 text-left transition-all ${
                  isCardActive ? "border-[var(--sevo-primary)] ring-2 ring-[var(--sevo-primary)]/20" : "border-[var(--sevo-border)]"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl ${card.iconBg} flex items-center justify-center mb-2 shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-[var(--sevo-text-primary)] block leading-tight">
                  {card.name}
                </span>
                <span className="text-[9.5px] text-[var(--sevo-text-muted)] font-medium block mt-0.5 leading-snug">
                  {card.subtitle}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

