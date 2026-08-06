import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Home, PaintRoller,
  SprayCan, Building2, AirVent, Hammer, Boxes,
  ShieldCheck, BadgeCheck, Clock, Award, Headphones,
  Star, Search, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  Smartphone, Phone, Mail,
  ClipboardList, CalendarDays, UserCheck, DoorOpen, Wallet,
} from "lucide-react"
import { routes } from "../routes.js"

// lucide-react dropped brand/social icons — small inline marks instead of
// pulling in a whole extra icon package for four footer glyphs.
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

// ── Real photos already in the project (public/mockups) ─────────────────
const CATEGORIES = [
  { label: "Home Services & Pest Control", icon: SprayCan, photo: "/mockups/service_cleaning.png", bg: "bg-indigo-50", ring: "border-indigo-100", fg: "text-indigo-600", hoverBg: "group-hover:bg-indigo-100" },
  { label: "Paintings", icon: PaintRoller, photo: "/mockups/service_maintenance.png", bg: "bg-amber-50", ring: "border-amber-100", fg: "text-amber-600", hoverBg: "group-hover:bg-amber-100" },
  { label: "Mason", icon: Building2, photo: "/mockups/service_building.png", bg: "bg-sky-50", ring: "border-sky-100", fg: "text-sky-600", hoverBg: "group-hover:bg-sky-100" },
  { label: "AC & Appliance", icon: AirVent, photo: "/mockups/service_hvac.png", bg: "bg-rose-50", ring: "border-rose-100", fg: "text-rose-600", hoverBg: "group-hover:bg-rose-100" },
  { label: "Electrician, Plumbing & Carpentry", icon: Hammer, photo: "/mockups/service_electrical.png", bg: "bg-violet-50", ring: "border-violet-100", fg: "text-violet-600", hoverBg: "group-hover:bg-violet-100" },
  { label: "Goods & Transports", icon: Boxes, photo: "/mockups/service_transport.jpg", bg: "bg-teal-50", ring: "border-teal-100", fg: "text-teal-600", hoverBg: "group-hover:bg-teal-100" },
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
  { name: "Priya M.", initials: "PM", text: "Great experience with the painting service. Highly recommend CalServices!" },
]

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
        <Home className="w-5 h-5" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-extrabold tracking-tight text-slate-900">CalServices</span>
    </div>
  )
}

// ── Location dropdown (fixed city list) ───────────────────────────────────
const CITIES = ["Hosur", "Coimbatore", "Chennai"]

function LocationDropdown({ className = "" }) {
  const [city, setCity] = useState(CITIES[0])
  return (
    <div className={`relative flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-full pl-3 pr-2 py-1.5 hover:border-slate-300 ${className}`}>
      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="bg-transparent outline-none appearance-none pr-4 cursor-pointer"
      >
        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none" />
    </div>
  )
}

export function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  const goToBooking = () => navigate(routes.booking)
  const goToLogin = () => navigate(routes.login)

  return (
    <div className="min-h-screen bg-[#F7FAF9] text-slate-800" style={{ animation: "fadeUp 0.4s ease both" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Logo />

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#home" className="text-emerald-600 font-semibold">Home</a>
            <a href="#categories" className="hover:text-slate-900">Services</a>
            <a href="#how-it-works" className="hover:text-slate-900">How It Works</a>
            <a href="#professionals" className="hover:text-slate-900">Professionals</a>
            <a href="#about" className="hover:text-slate-900">About Us</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={goToBooking}
              className="btn btnPrimary bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Book Service
            </button>
            <button
              onClick={goToLogin}
              className="hidden sm:inline-flex border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate(routes.activation_journey)}
              className="hidden sm:inline-flex border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section id="home" className="max-w-7xl mx-auto px-6 pt-14 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-bold text-slate-900 mb-4">
            Reliable. Affordable. Right at Your Doorstep.
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900 mb-5">
            Professional<br />
            <span className="text-emerald-600">Services</span><br />
            Made Simple
          </h1>
          <p className="text-slate-500 text-base mb-8 max-w-md">
            Quick booking. Quality work. Guaranteed satisfaction.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); goToBooking() }}
            className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 max-w-xl"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What service do you need?"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
            <LocationDropdown className="hidden sm:flex border-0 border-l border-slate-200 rounded-none pl-3" />
            <button
              type="submit"
              aria-label="Search services"
              className="ml-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-11 h-11 flex items-center justify-center shrink-0 transition-colors"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          </form>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Pros</span>
            <span className="inline-flex items-center gap-1.5"><Star className="w-4 h-4 text-emerald-600" /> 4.8★ Rated</span>
            <span className="inline-flex items-center gap-1.5"><Award className="w-4 h-4 text-emerald-600" /> 1M+ Happy Homes</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-600" /> 30-Day Guarantee</span>
          </div>
        </div>

        {/* Real photo collage */}
        <div className="relative h-[420px] hidden sm:block">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-transparent rounded-[3rem] -z-10" />
          <img
            src="/mockups/service_hvac.png"
            alt="Technician servicing an AC unit"
            className="absolute top-0 left-0 w-[62%] h-[65%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
          <img
            src="/mockups/service_electrical.png"
            alt="Electrician at work"
            className="absolute bottom-0 left-[8%] w-[48%] h-[45%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
          <img
            src="/mockups/service_cleaning.png"
            alt="Home cleaning professional"
            className="absolute top-[8%] right-0 w-[46%] h-[52%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
          <img
            src="/mockups/service_plumbing.png"
            alt="Plumber fixing a sink"
            className="absolute bottom-[4%] right-[2%] w-[42%] h-[42%] object-cover rounded-3xl shadow-lg border-4 border-white"
          />
        </div>
      </section>

      {/* ── Browse by Category ─────────────────────────────── */}
      <section id="categories" className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Browse by Category</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(({ label, icon: Icon, photo }) => (
            <button
              key={label}
              onClick={goToBooking}
              className="group flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              {photo ? (
                <div className="h-24 w-full overflow-hidden">
                  <img
                    src={photo}
                    alt={label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-24 w-full bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 leading-snug p-3">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl grid sm:grid-cols-2 lg:grid-cols-5 gap-6 p-8">
          {TRUST_STRIP.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-start gap-2">
              <Icon className="w-6 h-6 text-emerald-600" strokeWidth={1.75} />
              <p className="text-sm font-bold text-slate-800 leading-snug">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Offers ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-[220px_1fr] gap-6 items-stretch">
        <div className="bg-emerald-50 rounded-3xl p-6 flex flex-col justify-center">
          <p className="text-lg font-extrabold text-slate-900 mb-1">Limited Time Offers!</p>
          <p className="text-xs text-slate-500 mb-4">Great deals on services you love.</p>
          <button onClick={goToBooking} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-full self-start transition-colors">
            Explore Offers
          </button>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {OFFERS.map((offer) => (
            <button
              key={offer.sub}
              onClick={goToBooking}
              className={`${offer.bg} rounded-3xl p-6 text-left hover:shadow-md transition-shadow`}
            >
              <p className="text-[11px] font-bold text-slate-500 tracking-wide">{offer.tag}</p>
              <p className="text-2xl font-extrabold text-slate-900 mb-1">{offer.big}</p>
              <p className="text-sm text-slate-600 mb-4">{offer.sub}</p>
              <span className="text-xs font-semibold text-emerald-700">Book Now &rarr;</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-8">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="flex flex-col items-center text-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-emerald-600" strokeWidth={1.75} />
                </div>
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section className="bg-emerald-800 py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-5 gap-6 text-center text-white">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs text-emerald-100">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Professionals ─────────────────────────── */}
      <section id="professionals" className="max-w-7xl mx-auto px-6 py-14">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Featured Professionals</h2>
        <p className="text-sm text-slate-500 text-center mb-10">Top-rated experts ready to help</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {PROFESSIONALS.map((p) => (
            <div key={p.name} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <img src={p.photo} alt={p.name} className="w-full h-36 object-cover" />
              <div className="p-4">
                <p className="text-sm font-bold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500 mb-2">{p.role}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <Star className="w-3.5 h-3.5 fill-current" /> {p.rating}
                  </span>
                  <span className="text-slate-400">{p.jobs}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-900 mx-auto sm:mx-0">What Our Customers Say</h2>
          <a href="#" className="hidden sm:inline text-sm font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">View all reviews &rarr;</a>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
            className="hidden sm:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="grid sm:grid-cols-3 gap-5 flex-1">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`bg-white rounded-2xl border border-slate-100 p-5 ${i === testimonialIdx ? "ring-1 ring-emerald-200" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {t.initials}
                  </span>
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" />)}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">{t.text}</p>
                <p className="text-sm font-bold text-slate-800">&mdash; {t.name}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)}
            className="hidden sm:flex w-9 h-9 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-center gap-1.5 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === testimonialIdx ? "bg-emerald-600" : "bg-slate-200"}`} />
          ))}
        </div>
      </section>

      {/* ── App download banner ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="bg-emerald-50 rounded-3xl px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Book on the go!</p>
              <p className="text-lg font-extrabold text-emerald-700">Download the CalServices App</p>
              <p className="text-xs text-slate-500">Faster booking, real-time tracking &amp; exclusive app offers.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl">Get it on Google Play</button>
            <button className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl">Download on App Store</button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer id="about" className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo />
            <p className="text-xs text-slate-500 mt-3 leading-relaxed max-w-[220px]">
              Your trusted partner for all home services. Quality you can count on.
            </p>
            <div className="flex gap-3 mt-4 text-slate-400">
              <FacebookMark className="w-4 h-4" />
              <InstagramMark className="w-4 h-4" />
              <YoutubeMark className="w-4 h-4" />
              <TwitterMark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 mb-3">Services</p>
            <ul className="space-y-2 text-xs text-slate-500">
              {CATEGORIES.slice(0, 4).map((c) => <li key={c.label}>{c.label}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 mb-3">Company</p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>About Us</li><li>Careers</li><li>Blog</li><li>Become a Partner</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 mb-3">Need Help?</p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-600" /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-600" /> support@calservices.com</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-emerald-600" /> Mon &ndash; Sun (8 AM &ndash; 8 PM)</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
