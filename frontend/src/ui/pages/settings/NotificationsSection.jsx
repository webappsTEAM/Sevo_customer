import { useState, useEffect } from "react"
import { Bell, Mail, Smartphone, MessageSquare, Save, Loader2 } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

function Toggle({ checked, onChange }) {
  return (
    <div className={`stToggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} style={{ cursor: "pointer" }}>
      <div className="stToggleKnob" />
    </div>
  )
}

const CHANNELS = [
  { key: "email", label: "Email", icon: <Mail size={14} />, color: "#1A56DB" },
  { key: "inapp", label: "In-App", icon: <Bell size={14} />, color: "#7C3AED" },
  { key: "sms", label: "SMS", icon: <MessageSquare size={14} />, color: "#059669" },
]

const EVENT_GROUPS = [
  {
    group: "Service & Bookings",
    color: "#059669",
    events: [
      { key: "new_bookings", label: "New customer booking", desc: "Instant notification when a customer places a new service booking.", email: true, inapp: true, sms: true },
      { key: "cancellation_alerts", label: "Booking cancellation & reschedule", desc: "Alert when a booking is cancelled or rescheduled.", email: true, inapp: true, sms: true },
      { key: "completion_alerts", label: "Job completion & invoicing", desc: "Notification when a technician marks a service complete with generated invoice.", email: true, inapp: true, sms: false },
    ],
  },
  {
    group: "Customer Care & Dispatch",
    color: "#D97706",
    events: [
      { key: "complaint_alerts", label: "Customer complaints & escalations", desc: "Urgent alerts when a customer files a complaint or submits a negative rating.", email: true, inapp: true, sms: true },
      { key: "unassigned_alerts", label: "Unassigned booking warning", desc: "Alert when an upcoming booking has no technician assigned 30 mins before schedule.", email: true, inapp: true, sms: false },
    ],
  },
  {
    group: "Security & Account",
    color: "#DC2626",
    events: [
      { key: "security_alerts", label: "Security alerts", desc: "Suspicious login attempts, MFA triggers, or policy violations.", email: true, inapp: true, sms: true },
      { key: "login_alerts", label: "Login from new device", desc: "Notify when your admin account is accessed from a new device or IP.", email: true, inapp: true, sms: false },
    ],
  },
  {
    group: "Reports & Digests",
    color: "#7C3AED",
    events: [
      { key: "weekly_digest", label: "Weekly business digest", desc: "Summary of bookings, revenue, and active coverage zones each week.", email: true, inapp: false, sms: false },
      { key: "announcements", label: "System announcements", desc: "Platform maintenance notices and operational hub updates.", email: false, inapp: true, sms: false },
    ],
  },
]

export default function NotificationsSection({ showToast, SectionHeader }) {
  const [prefs, setPrefs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    apiRequest("/settings/notifications/")
      .then(res => setPrefs(res?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getPref = (channel, eventKey) => {
    const key = `${channel}_${eventKey}`
    if (prefs[key] !== undefined && prefs[key] !== null) {
      return prefs[key]
    }
    if (["new_bookings", "cancellation_alerts", "complaint_alerts", "unassigned_alerts", "completion_alerts", "security_alerts", "login_alerts"].includes(eventKey)) {
      if (channel === "email" || channel === "inapp") return true
      if (channel === "sms" && (eventKey === "new_bookings" || eventKey === "complaint_alerts")) return true
    }
    return false
  }

  const setPref = (channel, eventKey, value) => {
    const key = `${channel}_${eventKey}`
    setPrefs(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiRequest("/settings/notifications/", { method: "PATCH", json: prefs })
      showToast("Notification preferences saved.")
      setDirty(false)
    } catch (err) {
      showToast(err?.body?.message || "Failed to save.", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
      <Loader2 size={24} style={{ animation: "spin .7s linear infinite" }} />
    </div>
  )

  return (
    <div className="stPanel">
      <SectionHeader title="Notifications" subtitle="Choose how and when you receive notifications for each event type." />

      {/* Channel Header */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Bell size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Delivery channels</span>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 80px)", gap: 0, marginBottom: 8, paddingBottom: 12, borderBottom: "2px solid var(--stroke)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Notification</div>
          {CHANNELS.map(ch => (
            <div key={ch.key} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ color: ch.color }}>{ch.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{ch.label}</span>
              </div>
            </div>
          ))}
        </div>

        {EVENT_GROUPS.map(group => (
          <div key={group.group} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: group.color, marginBottom: 12, marginTop: 8 }}>
              {group.group}
            </div>
            {group.events.map(event => (
              <div key={event.key} style={{
                display: "grid", gridTemplateColumns: "1fr repeat(3, 80px)", gap: 0,
                alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--stroke)",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{event.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{event.desc}</div>
                </div>
                {CHANNELS.map(ch => (
                  <div key={ch.key} style={{ display: "flex", justifyContent: "center" }}>
                    {event[ch.key] !== false ? (
                      <Toggle
                        checked={getPref(ch.key, event.key)}
                        onChange={val => setPref(ch.key, event.key, val)}
                      />
                    ) : (
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: "var(--stroke)", position: "relative", opacity: 0.3 }}>
                        <div style={{ position: "absolute", top: 2, left: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <button className="stPrimaryBtn" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={13} />}
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </div>

      {/* SMS notice */}
      <div className="stCard" style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", border: "1px solid #bae6fd" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Smartphone size={18} style={{ color: "#0284c7", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0c4a6e", marginBottom: 4 }}>SMS Notifications</div>
            <div style={{ fontSize: 12, color: "#0369a1", lineHeight: 1.6 }}>
              SMS notifications require a verified phone number on your profile. Standard messaging rates may apply.
              Make sure your phone number is up to date in{" "}
              <button style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", padding: 0, fontWeight: 700, fontSize: 12 }}>Profile Settings</button>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
