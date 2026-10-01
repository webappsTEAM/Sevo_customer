import { useState, useEffect } from "react"
import { DollarSign, Truck, Package, Save, Loader2, Info } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

// Added 2026-10-01 per explicit request ("The Tax fixing Platform fee
// and free delivery cost should be fix by the admin not the hard coded...
// please be give access to customer admin to fix those inside setting
// module that should be change dynamically"). These values used to be
// hardcoded directly in the customer mobile app (checkout_screen.dart,
// cart_notifier.dart) with no way to change them without a new app
// build. This panel reads/writes the same values the backend's
// PricingConfigAPIView (/api/settings/pricing/) serves publicly to the
// app — saving here takes effect in the app immediately, no release
// needed.

const FIELD_GROUPS = [
  {
    title: "Home Services",
    icon: <DollarSign size={14} />,
    color: "#1A56DB",
    fields: [
      { key: "platform_fee", label: "Platform fee", suffix: "₹", desc: "Flat fee added to every home-service booking." },
      { key: "gst_percent", label: "GST", suffix: "%", desc: "Tax percentage applied to the service subtotal." },
      { key: "min_advance_percent", label: "Minimum advance", suffix: "%", desc: "Minimum advance payment, as a percentage of the total." },
      { key: "min_advance_amount", label: "Minimum advance (floor)", suffix: "₹", desc: "Minimum advance in rupees, whichever is higher." },
    ],
  },
  {
    title: "Groceries & Vegetables",
    icon: <Truck size={14} />,
    color: "#059669",
    fields: [
      { key: "delivery_fee", label: "Delivery fee", suffix: "₹", desc: "Charged on orders below the free-delivery threshold." },
      { key: "free_delivery_threshold", label: "Free delivery threshold", suffix: "₹", desc: "Cart subtotal at or above which delivery is free." },
      { key: "handling_fee", label: "Handling & packaging fee", suffix: "₹", desc: "Flat fee charged on every grocery order." },
      { key: "small_cart_fee", label: "Small-cart fee", suffix: "₹", desc: "Extra fee charged on very small orders." },
      { key: "small_cart_threshold", label: "Small-cart threshold", suffix: "₹", desc: "Cart subtotal below which the small-cart fee applies." },
    ],
  },
]

export default function PricingSection({ showToast, SectionHeader }) {
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    apiRequest("/settings/pricing/")
      .then(res => setValues(res?.data || {}))
      .catch(() => showToast?.("Failed to load pricing settings.", "error"))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setValue = (key, raw) => {
    setValues(prev => ({ ...prev, [key]: raw }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setErrors({})
    try {
      const res = await apiRequest("/settings/pricing/", { method: "PUT", json: values })
      setValues(res?.data || values)
      showToast?.("Pricing settings saved — the app will use these values immediately.")
      setDirty(false)
    } catch (err) {
      if (err?.body?.errors) setErrors(err.body.errors)
      showToast?.(err?.body?.message || "Failed to save pricing settings.", "error")
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
      <SectionHeader
        title="Pricing"
        subtitle="Platform fee, taxes, delivery and handling charges shown in the customer app — changes here apply instantly, with no app update required."
      />

      {FIELD_GROUPS.map(group => (
        <div key={group.title} className="stCard" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ color: group.color }}>{group.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{group.title}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {group.fields.map(field => (
              <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {field.label}
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: 13, fontWeight: 700, color: "var(--muted)",
                  }}>
                    {field.suffix}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values[field.key] ?? ""}
                    onChange={e => setValue(field.key, e.target.value)}
                    className="stInput"
                    style={{ paddingLeft: 28, width: "100%" }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{field.desc}</div>
                {errors[field.key] && (
                  <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>{errors[field.key]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button className="stPrimaryBtn" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={13} />}
          {saving ? "Saving..." : "Save pricing"}
        </button>
      </div>

      <div className="stCard" style={{ marginTop: 20, background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", border: "1px solid #bae6fd" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Package size={18} style={{ color: "#0284c7", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0c4a6e", marginBottom: 4 }}>How this reaches the app</div>
            <div style={{ fontSize: 12, color: "#0369a1", lineHeight: 1.6 }}>
              The customer app fetches these values when a customer opens checkout or the grocery cart. There's no
              need to publish a new app version for a price change to take effect.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, color: "var(--muted)", fontSize: 11 }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Only Admin, Manager and Finance roles can change these values.</span>
      </div>
    </div>
  )
}
