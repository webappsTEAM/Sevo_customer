import { useState, useEffect } from "react"
import {
  CreditCard, Zap, Crown, Star, Check, TrendingUp,
  Download, ArrowRight, Users, HardDrive, Activity, Loader2,
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    description: "For small teams getting started",
    color: "#7C8592",
    icon: <Star size={18} />,
    features: ["Up to 5 employees", "1 GB storage", "Basic time tracking", "1,000 API calls/mo", "Email support"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    description: "For growing teams with advanced needs",
    color: "#1A56DB",
    icon: <Zap size={18} />,
    popular: true,
    features: ["Up to 50 employees", "20 GB storage", "GPS + photo verification", "50,000 API calls/mo", "Payroll & scheduling", "Priority support"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 99,
    description: "For large organizations at scale",
    color: "#7C3AED",
    icon: <Crown size={18} />,
    features: ["Unlimited employees", "500 GB storage", "Advanced compliance", "Unlimited API calls", "Custom integrations", "Dedicated success manager", "SLA guarantee"],
  },
]

function UsageMeter({ label, used, limit, color = "#1A56DB", icon }) {
  const pct = limit < 0 ? 100 : limit === 0 ? 0 : Math.min((used / limit) * 100, 100)
  const isUnlimited = limit < 0
  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--stroke)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
          {icon} {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </div>
      </div>
      {!isUnlimited && (
        <div style={{ height: 6, background: "var(--stroke2)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 3,
            background: pct > 85 ? "#DC2626" : pct > 60 ? "#D97706" : color,
            transition: "width .4s ease",
          }} />
        </div>
      )}
      {isUnlimited && <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>Unlimited</div>}
    </div>
  )
}

export default function BillingSection({ showToast, SectionHeader }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [upgrading, setUpgrading] = useState(null)

  useEffect(() => {
    apiRequest("/settings/billing/subscription/")
      .then(res => setData(res?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (planKey) => {
    setUpgrading(planKey)
    try {
      await new Promise(r => setTimeout(r, 1200))
      showToast(`Upgrade to ${planKey} plan initiated. You'll be redirected to checkout.`)
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
      <Loader2 size={28} style={{ animation: "spin .7s linear infinite", marginBottom: 12 }} />
      <div style={{ fontSize: 13 }}>Loading billing info...</div>
    </div>
  )

  const currentPlan = data?.plan || "free"
  const usage = data?.usage || {}

  return (
    <div className="stPanel">
      <SectionHeader title="Billing & Subscription" subtitle="Manage your plan, payment method, and view invoices." />

      {/* Current Plan Banner */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--fg)", letterSpacing: -0.5 }}>
              {PLANS.find(p => p.key === currentPlan)?.name || "Free"}
              {currentPlan === "pro" && <span style={{ marginLeft: 10, fontSize: 12, background: "#EFF4FF", color: "#1A56DB", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>Active</span>}
            </div>
            {data?.renewal_date && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Renews {new Date(data.renewal_date).toLocaleDateString()}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {currentPlan !== "free" && (
              <button className="stGhostBtn" onClick={() => showToast("Contact support to downgrade.")}>
                Downgrade
              </button>
            )}
            {currentPlan !== "enterprise" && (
              <button className="stPrimaryBtn" onClick={() => handleUpgrade("pro")} disabled={!!upgrading}>
                <Zap size={13} /> Upgrade plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="stCard">
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 20 }}>Available Plans</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.key} style={{
              border: plan.key === currentPlan ? `2px solid ${plan.color}` : "1px solid var(--stroke2)",
              borderRadius: 14, padding: 20,
              background: plan.key === currentPlan ? `${plan.color}08` : "var(--surface2)",
              position: "relative",
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -10, right: 16, background: "#1A56DB", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em" }}>
                  POPULAR
                </div>
              )}
              {plan.key === currentPlan && (
                <div style={{ position: "absolute", top: -10, left: 16, background: plan.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>
                  CURRENT
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ color: plan.color }}>{plan.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)" }}>{plan.name}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--fg)", marginBottom: 4 }}>
                {plan.price === 0 ? "Free" : `$${plan.price}`}
                {plan.price > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>/mo</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{plan.description}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg2)" }}>
                    <Check size={12} style={{ color: plan.color, flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              {plan.key !== currentPlan && (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={!!upgrading}
                  style={{
                    marginTop: 16, width: "100%", padding: "9px 0", borderRadius: 8,
                    background: plan.color, color: "#fff", border: "none",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: upgrading === plan.key ? 0.7 : 1,
                  }}
                >
                  {upgrading === plan.key ? <Loader2 size={12} style={{ animation: "spin .7s linear infinite" }} /> : <ArrowRight size={12} />}
                  {currentPlan === "free" || PLANS.findIndex(p => p.key === plan.key) > PLANS.findIndex(p => p.key === currentPlan) ? "Upgrade" : "Downgrade"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Usage Meters */}
      <div className="stCard">
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>Usage This Month</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Your resource consumption in the current billing period.</div>
        <UsageMeter
          label="Team members"
          used={usage.employees || 0}
          limit={usage.employees_limit || 5}
          color="#1A56DB"
          icon={<Users size={13} />}
        />
        <UsageMeter
          label="Storage"
          used={`${usage.storage_gb || 0} GB`}
          limit={usage.storage_limit < 0 ? -1 : `${usage.storage_limit || 1} GB`}
          color="#7C3AED"
          icon={<HardDrive size={13} />}
        />
        <UsageMeter
          label="API calls"
          used={usage.api_calls_this_month || 0}
          limit={usage.api_calls_limit || 1000}
          color="#059669"
          icon={<Activity size={13} />}
        />
      </div>

      {/* Payment Method */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CreditCard size={15} style={{ color: "#1A56DB" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Payment Method</span>
          </div>
          <button className="stGhostBtn" style={{ fontSize: 12 }} onClick={() => showToast("Redirecting to payment portal...")}>
            <CreditCard size={12} /> {data?.payment_method ? "Update" : "Add card"}
          </button>
        </div>
        {data?.payment_method ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--bg2)", borderRadius: 8 }}>
            <CreditCard size={20} style={{ color: "var(--muted)" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>•••• •••• •••• {data.payment_method.last4}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Expires {data.payment_method.exp_month}/{data.payment_method.exp_year}</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
            No payment method on file. Add a card to upgrade your plan.
          </div>
        )}
      </div>

      {/* Invoice History */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <TrendingUp size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Invoice History</span>
        </div>
        {!data?.invoices || data.invoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
            No invoices yet. Invoices appear after each billing cycle.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--stroke)" }}>
                {["Date", "Description", "Amount", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--stroke)" }}>
                  <td style={{ padding: "10px 12px" }}>{new Date(inv.date).toLocaleDateString()}</td>
                  <td style={{ padding: "10px 12px", color: "var(--fg2)" }}>{inv.description}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700 }}>${inv.amount}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, background: inv.status === "paid" ? "#ECFDF5" : "#FEF2F2", color: inv.status === "paid" ? "#059669" : "#DC2626", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button className="stGhostBtn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => showToast("Downloading invoice...")}>
                      <Download size={11} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
