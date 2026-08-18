import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams, useNavigate } from "react-router-dom"
import { fetchCustomerDetail, fetchCustomerTimeline } from "../../store/customerAnalyticsSlice.js"
import { ChevronLeft, User, Phone, Mail, Calendar, Key, AlertTriangle, ArrowUpRight, History } from "lucide-react"

export function CustomerDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState("overview")
  const cacheData = useSelector((state) => state.customerAnalytics.detailCache[id])

  const formatTitle = (str) => {
    if (!str) return "";
    return str.toLowerCase().split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  useEffect(() => {
    dispatch(fetchCustomerDetail(id))
    dispatch(fetchCustomerTimeline(id))
  }, [dispatch, id])

  if (!cacheData) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm font-semibold">
        Loading customer data...
      </div>
    )
  }

  const { profile, addresses, rollups, recent_bookings, payment_ledger, login_history, support_tickets, complaints, feedback, timeline } = cacheData

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen">
      
      {/* ── BACK BUTTON & BREADCRUMB ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/customers/list")}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-indigo-500 shadow-sm"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold text-slate-400">Customer Directory / Details</span>
      </div>

      {/* ── HEADER CARD (360 PROFILE) ── */}
      <div className="p-6 bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col md:flex-row justify-between gap-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-black shadow-sm">
            {profile?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{profile?.name}</h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="text-slate-400">📞</span> {profile?.phone || "—"}</span>
              <span className="flex items-center gap-1.5"><span className="text-slate-400">📧</span> {profile?.email || "—"}</span>
              <span className="flex items-center gap-1.5"><span className="text-slate-400">📅</span> Joined: {new Date(profile?.joined_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:flex md:items-center gap-8 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-8">
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lifetime Value</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-450 leading-none">₹{rollups?.total_spent?.toLocaleString("en-IN")}</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Outstanding Amount</div>
            <div className={`text-2xl font-black leading-none ${rollups?.outstanding_amount > 0 ? "text-amber-500" : "text-slate-850 dark:text-white"}`}>
              ₹{rollups?.outstanding_amount?.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 scrollbar-none">
        {["overview", "bookings", "timeline", "payments", "logins", "support"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-155 hover:bg-slate-50 dark:hover:bg-slate-900/30 rounded-t-xl ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5 dark:bg-indigo-950/10"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rollups Metrics */}
            <div className="md:col-span-1 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Engagement Rollup</h3>
              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bookings</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{rollups?.total_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed bookings</span>
                  <span className="font-extrabold text-emerald-500">{rollups?.completed_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cancelled bookings</span>
                  <span className="font-extrabold text-red-500">{rollups?.cancelled_bookings}</span>
                </div>
              </div>
            </div>

            {/* Saved Addresses */}
            <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Saved Locations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses && addresses.length > 0 ? (
                  addresses.map((a) => (
                    <div key={a.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{a.label}</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {a.address_line1}, {a.address_line2 && `${a.address_line2}, `}{a.city}, {a.state} - {a.pincode}
                      </div>
                      {a.phone_number && (
                        <div className="text-[10px] text-slate-400 font-semibold">📞 {a.phone_number}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-slate-400 italic text-xs py-4 font-semibold">No saved addresses on this account.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BOOKINGS */}
        {activeTab === "bookings" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Booking ID</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent_bookings && recent_bookings.length > 0 ? (
                  recent_bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                      <td className="px-6 py-4 text-xs font-extrabold text-slate-900 dark:text-white">{b.request_id}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{formatTitle(b.service_category)}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-200">₹{b.total_amount.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-xs font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                          b.status === "completed" ? "bg-emerald-100 text-emerald-600" :
                          b.status === "cancelled" ? "bg-red-100 text-red-500" : "bg-blue-100 text-blue-600"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 italic text-xs font-semibold">No bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: TIMELINE (CHRONOLOGICAL MERGED FEED) */}
        {activeTab === "timeline" && (
          <div className="max-w-2xl p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Unified Activity Log</h3>
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 pl-6 space-y-6">
              {timeline && timeline.length > 0 ? (
                timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">
                      <History size={10} />
                    </span>
                    <div className="text-[10px] font-extrabold text-slate-400">
                      {new Date(item.timestamp).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {item.details}
                    </div>
                    {item.reason_code && (
                      <div className="mt-1.5 p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400">
                        Reason: {item.reason_code} {item.reason_note && `(${item.reason_note})`}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-slate-400 italic text-xs py-4 font-semibold">No history events logged yet.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Booking ID</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Transaction Ref.</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Paid Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payment_ledger && payment_ledger.length > 0 ? (
                  payment_ledger.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                      <td className="px-6 py-4 text-xs font-extrabold text-slate-900 dark:text-white">{p.booking_id}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{p.payment_method}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-200">₹{p.total_amount.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{p.transaction_id || "—"}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {p.payment_collected_at ? new Date(p.payment_collected_at).toLocaleString("en-IN") : "Pending Collection"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 italic text-xs font-semibold">No payment history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: LOGINS */}
        {activeTab === "logins" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Browser Agent</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {login_history && login_history.length > 0 ? (
                  login_history.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                      <td className="px-6 py-4 text-xs font-extrabold text-indigo-500">{l.method?.toUpperCase()}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{l.ip_address || "—"}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-400 truncate max-w-xs" title={l.user_agent}>{l.user_agent || "—"}</td>
                      <td className="px-6 py-4 text-xs font-bold">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          l.status === "success" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(l.occurred_at).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 italic text-xs font-semibold">No login history recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: SUPPORT */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tickets */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Recent Tickets</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {support_tickets && support_tickets.length > 0 ? (
                  support_tickets.map((t) => (
                    <div key={t.id} className="py-3 flex justify-between items-center text-xs font-bold">
                      <div>
                        <div className="text-slate-800 dark:text-slate-200">#{t.ticket_number} - {t.category}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{new Date(t.created_at).toLocaleDateString("en-IN")}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600">{t.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-xs py-4 font-semibold text-center">No care tickets.</div>
                )}
              </div>
            </div>

            {/* Complaints */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Recent Complaints</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {complaints && complaints.length > 0 ? (
                  complaints.map((c) => (
                    <div key={c.id} className="py-3 flex justify-between items-center text-xs font-bold">
                      <div>
                        <div className="text-slate-800 dark:text-slate-200">{formatTitle(c.issue_type)}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{new Date(c.created_at).toLocaleDateString("en-IN")}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-500">{c.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-xs py-4 font-semibold text-center">No complaints filed.</div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  )
}
