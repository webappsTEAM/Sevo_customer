import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Info, MapPin, Package, Truck } from "lucide-react"
import { apiRequest, extractApiErrorMessage } from "../../api/client.js"
import { fetchLogisticsSlots } from "../../api/logisticsService.js"
import { createBooking } from "../../api/bookingService.js"
import { settleBookingPayment } from "../../api/gtPaymentService.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { MapPickerScreen } from "../components/AddressPicker/MapPickerScreen.jsx"
import { GTPaymentMethodPicker } from "../components/GTPaymentMethodPicker.jsx"
import { GTPolicyNote } from "../components/GTPolicyNote.jsx"

/**
 * Light PTL (Part Truck Load) booking: advance-booked, admin slot, per-kg price.
 * Everything shown comes from the server: /api/logistics/ptl/config/ (rate card, eligible
 * vehicles, PTL routes), /api/logistics/slots/?category=ptl and /api/logistics/ptl/quote/.
 * The page never computes a price; it books the exact quote the server issued.
 */
const TRUCK = "goods_transport_truck"

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  const pad = (x) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const card = "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3"
const input = "w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
const label = "flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300"

export function PTLBookingPage() {
  const { city: cityParam } = useParams()
  const city = (cityParam || "hosur").toLowerCase()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [cfg, setCfg] = useState(null)
  const [cfgError, setCfgError] = useState("")
  const [pickup, setPickup] = useState(null)
  const [drop, setDrop] = useState(null)
  const [picker, setPicker] = useState(null)
  const [tierId, setTierId] = useState("")
  const [laneId, setLaneId] = useState("")
  const [weight, setWeight] = useState("")
  const [loadAssist, setLoadAssist] = useState(false)
  const [date, setDate] = useState("")
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState("")
  const [description, setDescription] = useState("")
  const [name, setName] = useState(user?.full_name || user?.first_name || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [payMethod, setPayMethod] = useState("cod")
  const [quote, setQuote] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(null)
  const attemptKey = useRef(null)

  useEffect(() => {
    apiRequest(`/logistics/ptl/config/?city=${encodeURIComponent(city)}`)
      .then((res) => {
        const c = res?.data || res
        setCfg(c)
        setDate(addDays(Number(c?.min_advance_days || 1)))
      })
      .catch((err) => setCfgError(extractApiErrorMessage(err, "Could not load Part Truck Load.")))
  }, [city])

  useEffect(() => {
    if (!date || !cfg?.enabled) return
    fetchLogisticsSlots({ date, category: "ptl", city }).then((res) => {
      const all = (res?.groups || []).flatMap((g) => g.slots || [])
      setSlots(all)
      setSlot((prev) => (all.some((s) => s.slot === prev && s.is_available) ? prev : ""))
    })
  }, [date, city, cfg?.enabled])

  // Any input change invalidates the quote; the customer must re-quote before booking.
  useEffect(() => { setQuote(null) }, [tierId, laneId, weight, loadAssist, pickup, drop])

  const tier = useMemo(() => (cfg?.tiers || []).find((t) => String(t.id) === String(tierId)), [cfg, tierId])

  const getQuote = async () => {
    setError("")
    if (!pickup || !drop) return setError("Choose pickup and drop locations.")
    if (!tier) return setError("Choose a vehicle.")
    if (!(Number(weight) > 0)) return setError("Enter the cargo weight in kg.")
    setBusy(true)
    try {
      const res = await apiRequest("/logistics/ptl/quote/", {
        method: "POST",
        json: {
          tier_id: tier.id, lane_id: laneId || null, declared_weight_kg: weight, load_assist: loadAssist,
          pickup_latitude: pickup.lat, pickup_longitude: pickup.lng,
          drop_latitude: drop.lat, drop_longitude: drop.lng,
        },
      })
      setQuote((res?.data || res)?.quote || null)
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not get a quote."))
    } finally {
      setBusy(false)
    }
  }

  const book = async () => {
    setError("")
    if (!quote) return setError("Get a quote first.")
    if (!slot) return setError("Choose a pickup slot.")
    if (!description.trim()) return setError("Describe what you are sending.")
    if (!name.trim() || !phone.trim()) return setError("Enter your name and phone number.")
    if (!attemptKey.current) attemptKey.current = `idem_ptl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    setBusy(true)
    try {
      const res = await createBooking({
        customer_name: name.trim(), phone: phone.trim(), email: user?.email || "",
        service_category: TRUCK, issue_title: "Part Truck Load", description: description.trim(),
        address: pickup.address, latitude: pickup.lat, longitude: pickup.lng,
        drop_address: drop.address, drop_latitude: drop.lat, drop_longitude: drop.lng,
        preferred_date: date, preferred_time: slot,
        total_amount: quote.total, payment_method: payMethod === "cod" ? "COD" : "ONLINE",
        logistics_tier: tier.id, ...(laneId ? { logistics_lane: Number(laneId) } : {}),
        logistics_booking_mode: "ptl", ptl_declared_weight_kg: weight, ptl_load_assist: loadAssist,
        cart_data: [{
          tier: tier.name, price: quote.total, quote_id: quote.quote_id, quote_hash: quote.quote_hash,
          expires_at: quote.expires_at, declared_weight_kg: weight, load_assist: loadAssist,
        }],
      }, attemptKey.current)
      const bookingId = res?.data?.request_id || res?.request_id
      if (!bookingId) throw new Error("The booking was not confirmed by the server.")
      const token = res?.data?.tracking_token || res?.tracking_token || null
      if (payMethod !== "cod") {
        const paid = await settleBookingPayment({ bookingId: res?.data?.id || res?.id, trackingToken: token, method: payMethod })
        if (!paid.ok) throw new Error(`${paid.message || "Payment was not completed."} Your booking is saved - tap Book again to retry the payment.`)
      }
      attemptKey.current = null
      setDone({ bookingId, token })
    } catch (err) {
      setError(extractApiErrorMessage(err, "Booking failed."))
    } finally {
      setBusy(false)
    }
  }

  if (cfgError) return <div className="p-6 text-sm font-semibold text-red-600" role="alert">{cfgError}</div>
  if (!cfg) return <div className="p-6 text-sm text-slate-500">Loading…</div>
  if (!cfg.enabled) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-3">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Part Truck Load</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Part Truck Load is not available right now.</p>
        <button type="button" onClick={() => navigate("/trucks")} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Book a full truck instead</button>
      </div>
    )
  }
  if (done) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-3">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Booking confirmed</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Booking {done.bookingId} for {date}, {slot}. Please keep the goods ready to load at pickup.</p>
        {done.token && (
          <button type="button" onClick={() => navigate(`/track/${done.bookingId}?token=${done.token}`)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Track booking</button>
        )}
      </div>
    )
  }

  const lanes = cfg.lanes || []
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Package size={20} /> Part Truck Load</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Send part of a truckload, booked in advance, priced per kg (₹{cfg.rate_per_kg}/kg{Number(cfg.minimum_chargeable_weight_kg) > 0 ? `, minimum ${cfg.minimum_chargeable_weight_kg} kg` : ""}).</p>
      </div>

      <div role="note" className="flex gap-2 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/40 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>{cfg.loading_notice}</span>
      </div>

      <div className={card}>
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><MapPin size={16} /> Route</div>
        {["pickup", "drop"].map((k) => {
          const v = k === "pickup" ? pickup : drop
          return (
            <button key={k} type="button" onClick={() => setPicker(k)} className={`${input} text-left`}>
              <span className="text-[11px] font-bold uppercase text-slate-400 block">{k}</span>
              {v?.address || `Choose ${k} location`}
            </button>
          )
        })}
        {lanes.length > 0 && (
          <label className={label}>
            Route rate (optional)
            <select className={input} value={laneId} onChange={(e) => setLaneId(e.target.value)}>
              <option value="">Standard rate</option>
              {lanes.map((l) => <option key={l.id} value={l.id}>{l.city} → {l.destination_label} (₹{l.ptl_rate_per_kg}/kg)</option>)}
            </select>
          </label>
        )}
      </div>

      <div className={card}>
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Truck size={16} /> Vehicle & cargo</div>
        {(cfg.tiers || []).length === 0 ? (
          <p className="text-xs text-slate-500">No vehicles are available for Part Truck Load in this city.</p>
        ) : (
          <label className={label}>
            Vehicle
            <select className={input} value={tierId} onChange={(e) => setTierId(e.target.value)}>
              <option value="">Choose a vehicle</option>
              {cfg.tiers.map((t) => <option key={t.id} value={t.id}>{t.name} (up to {Number(t.max_weight_kg)} kg)</option>)}
            </select>
          </label>
        )}
        <label className={label}>
          Cargo weight (kg){tier ? ` — up to ${Number(tier.max_weight_kg)} kg` : ""}
          <input type="number" min="1" step="any" className={input} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label className={label}>
          What are you sending?
          <textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 20 cartons of garments" />
        </label>
        {cfg.load_assist_offered && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="h-4 w-4" checked={loadAssist} onChange={(e) => setLoadAssist(e.target.checked)} />
            Add Load Assist (₹{cfg.load_assist_fee})
          </label>
        )}
      </div>

      <div className={card}>
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Pickup date & slot</div>
        <label className={label}>
          Date
          <input type="date" className={input} min={addDays(Number(cfg.min_advance_days || 1))} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {slots.length === 0 ? (
          <p className="text-xs text-slate-500">No Part Truck Load slots for this date.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((s) => (
              <button
                key={s.slot} type="button" disabled={!s.is_available} title={s.reason || ""}
                onClick={() => setSlot(s.slot)}
                className={`rounded-xl px-2 py-2 text-xs font-bold border ${slot === s.slot ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15" : "border-slate-200 dark:border-slate-700"} disabled:opacity-40`}
              >
                {s.slot}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Your name<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className={label}>Phone<input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        </div>
        {quote && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>{quote.declared_weight_kg} kg{quote.chargeable_weight_kg !== quote.declared_weight_kg ? ` (charged ${quote.chargeable_weight_kg} kg)` : ""} × ₹{quote.rate_per_kg}/kg</span><span>₹{quote.freight_charge}</span></div>
            {Number(quote.load_assist_fee) > 0 && <div className="flex justify-between"><span>Load Assist</span><span>₹{quote.load_assist_fee}</span></div>}
            <div className="flex justify-between font-extrabold"><span>Total</span><span>₹{quote.total}</span></div>
          </div>
        )}
        {quote && <GTPaymentMethodPicker value={payMethod} onChange={setPayMethod} total={Number(quote.total)} />}
        {error && <div role="alert" className="text-xs font-semibold text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={getQuote} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold disabled:opacity-60">
            {quote ? "Re-quote" : "Get price"}
          </button>
          <button type="button" onClick={book} disabled={busy || !quote} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-60">
            {busy ? "Please wait…" : "Book"}
          </button>
        </div>
      </div>

      <GTPolicyNote serviceCategory={TRUCK} />

      {picker && (
        <MapPickerScreen
          initialCoords={(picker === "pickup" ? pickup : drop) || null}
          serviceSlug={TRUCK}
          vehicleClass={tier?.vehicle_class || ""}
          onClose={() => setPicker(null)}
          onConfirm={(a) => {
            const point = {
              address: a?.formatted_address || a?.address || a?.name || "Selected location",
              lat: Number(Number(a?.latitude ?? a?.lat).toFixed(6)),
              lng: Number(Number(a?.longitude ?? a?.lng).toFixed(6)),
            }
            if (picker === "pickup") setPickup(point)
            else setDrop(point)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}

export default PTLBookingPage
