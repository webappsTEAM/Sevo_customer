import React, { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchCustomerPayments } from "../../store/customerAnalyticsSlice.js"
import { Banknote, Clock, CheckCircle2, RefreshCw } from "lucide-react"

export function CustomersPaymentsPage() {
  const dispatch = useDispatch()
  const { owes, technicianHolds, settled, loading } = useSelector((state) => state.customerAnalytics.payments)

  useEffect(() => {
    dispatch(fetchCustomerPayments())
  }, [dispatch])

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen">
      
      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight font-display">Collections Worklist</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Track customer outstanding payments, technician cash holdings, and settled transactions.
          </p>
        </div>

        <button
          onClick={() => dispatch(fetchCustomerPayments())}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-500 hover:text-indigo-500"
          title="Refresh ledger"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── THREE COLUMN KANBAN WORKLIST ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: OWES */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Owes Outstanding</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] font-black">
              {owes?.length || 0}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {owes && owes.length > 0 ? (
              owes.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{item.customer_name}</span>
                    <span className="text-xs font-black text-red-500">₹{item.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>Booking: {item.booking_id}</span>
                    <span>Status: {item.status}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold">
                    Completed: {new Date(item.created_at).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 italic text-xs py-8">No outstanding collections.</div>
            )}
          </div>
        </div>

        {/* COLUMN 2: TECHNICIAN HOLDS CASH */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Technician Holds Cash</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[10px] font-black">
              {technicianHolds?.length || 0}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {technicianHolds && technicianHolds.length > 0 ? (
              technicianHolds.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{item.customer_name}</span>
                    <span className="text-xs font-black text-amber-500">₹{item.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-[10px] font-bold text-indigo-500">
                    Technician: {item.technician_name}
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>Booking: {item.booking_id}</span>
                    <span>Collected: {item.collected_at ? new Date(item.collected_at).toLocaleDateString("en-IN") : "—"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 italic text-xs py-8">No technician cash holdings.</div>
            )}
          </div>
        </div>

        {/* COLUMN 3: SETTLED */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Settled / Paid</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
              {settled?.length || 0}
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {settled && settled.length > 0 ? (
              settled.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{item.customer_name}</span>
                    <span className="text-xs font-black text-emerald-500">₹{item.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>Booking: {item.booking_id}</span>
                    <span>Method: {item.payment_method}</span>
                  </div>
                  {item.transaction_id && (
                    <div className="text-[9px] text-slate-400 font-bold truncate">
                      TXN: {item.transaction_id}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 italic text-xs py-8">No settled transactions.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
