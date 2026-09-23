import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { apiRequest } from "../../api/client.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { routes } from "../routes.js"
import { SevoLogo, sevoLogo } from "../components/sevoLogo.jsx"
import { Loader2, Lock, ArrowRight, User, Check, Mail, X } from "lucide-react"
import { setTokens } from "../../state/auth/tokens.js"

/* ─── Shared Card Config (from LoginPage) ─── */
const CW = 200
const CH = 130
const CARDS = [
  { id: 1, src: "/mockups/sevo_dashboard_mockup_1778231495839.png", x: -250, y: -150, z: 80, r: -6, title: "Executive Dashboard" },
  { id: 2, src: "/mockups/sevo_scheduling_mockup_1778231584856.png", x: -80, y: -160, z: 50, r: 4, title: "Smart Scheduling" },
  { id: 3, src: "/mockups/sevo_live_map_mockup_1778231560076.png", x: 80, y: -145, z: 70, r: -3, title: "Live Tracking Map" },
  { id: 4, src: "/mockups/sevo_mobile_app_mockup_1778231517495.png", x: 250, y: -155, z: 40, r: 8, title: "Mobile Field App" },
  { id: 5, src: "/mockups/sevo_analytics_mockup_1778231608789.png", x: -220, y: 0, z: 60, r: 5, title: "Workforce Analytics" },
  { id: 6, src: "/mockups/sevo_payroll_mockup_1778231538875.png", x: -60, y: 10, z: 90, r: -4, title: "Payroll Processing" },
]

function HoloCard({ card, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute",
        width: CW, height: CH,
        left: `calc(50% - ${CW / 2}px)`,
        top: `calc(50% - ${CH / 2}px)`,
        x: card.x, y: card.y, zIndex: card.z + 300, rotate: card.r,
      }}
    >
      <div className="w-full h-full rounded-2xl overflow-hidden bg-white/90 border border-white/50 shadow-xl">
        <img src={card.src} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
      </div>
    </motion.div>
  )
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const org = searchParams.get("org")
  const navigate = useNavigate()
  const { refreshMe, loginWithGoogle } = useAuth()

  const [inviteData, setInviteData] = useState(null)
  const [formData, setFormData] = useState({ first_name: "", last_name: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ONBOARDING_DISMISSED_KEY = "sevo.onboarding.dismissed"
  const adminRoute = () =>
    localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true" ? routes.dashboard : routes.get_started

  useEffect(() => {
    if (token) {
      apiRequest(`/auth/accept-invite/?token=${token}&org=${org || ""}`)
        .then(res => {
          setInviteData(res)
          if (res.email) {
            setFormData(p => ({ ...p, email: res.email })) // Optionally use email
          }
        })
        .catch(err => setError(err?.body?.detail || "Invalid or expired invite link."))
    }
  }, [token, org])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest("/auth/accept-invite/", {
        method: "POST",
        json: { ...formData, token, org }
      })

      setTokens({ access: res.access, refresh: res.refresh })
      const u = await refreshMe()
      const role = u?.role
      const isAdmin = role === "admin" || role === "manager"
      navigate(isAdmin ? adminRoute() : routes.dashboard)
    } catch (err) {
      setError(err?.body?.detail || err?.body?.message || "Failed to join team.")
      setLoading(false)
    }
  }

  if (!token) return <div className="p-20 text-center">Invalid invitation link.</div>

  return (
    <div className="flex min-h-screen bg-white font-sans overflow-hidden">

      {/* ═══════════════════ LEFT PANEL ═══════════════════ */}
      <div className="hidden lg:flex flex-col w-[60%] bg-[#FDFDFF] relative border-r border-[#F1F5F9] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #fbbf24 100%)" }} />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute top-8 left-8 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <SevoLogo size="md" showTagline={false} />
          </div>
        </motion.div>

        <div className="relative flex-1" style={{ perspective: "2500px", transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0">
            {CARDS.map((card, i) => <HoloCard key={card.id} card={card} index={i} />)}
          </div>
        </div>
      </div>

      {/* ═══════════════════ RIGHT PANEL ═══════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-[440px]">

          <div className="text-center mb-8">
            <h1 className="text-[32px] font-black text-[#0F172A] leading-tight tracking-tight">Join Your Team</h1>
            <p className="text-[#64748B] font-medium mt-3">Setup your account to access your company workspace</p>
          </div>

          {inviteData?.region && (
            <div style={{
              padding: "16px 20px", borderRadius: 14, border: "1.5px solid var(--stroke2)",
              background: "var(--surface)", marginBottom: 24
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 10
              }}>
                Company Operating Region
              </div>
              <div style={{ fontSize: 24, marginBottom: 6 }}>
                {inviteData.region === "UK" ? "🇬🇧" : inviteData.region === "IN" ? "🇮🇳" : "🇺🇸"}
                {inviteData.region === "UK" ? " United Kingdom" : inviteData.region === "IN" ? " India" : " United States"}
                {inviteData.default_state && ` · ${inviteData.default_state}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                You will join this workspace with access to all company bookings, service catalog, and operational data.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <input
                className="w-full px-6 py-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-[15px] font-medium focus:bg-white focus:border-indigo-500 transition-all outline-none"
                placeholder="First Name"
                value={formData.first_name}
                onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                required
              />
              <input
                className="w-full px-6 py-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-[15px] font-medium focus:bg-white focus:border-indigo-500 transition-all outline-none"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
              <input
                className="w-full pl-14 pr-5 py-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-[15px] font-medium focus:bg-white focus:border-indigo-500 transition-all outline-none"
                type="password"
                placeholder="Set Password"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white text-[13px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Join Workspace <ArrowRight size={18} /></>}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
