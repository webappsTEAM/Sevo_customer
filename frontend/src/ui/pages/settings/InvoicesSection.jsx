import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { apiRequest } from "../../../api/client.js"
import { Card } from "../../components/kit.jsx"
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  Eye
} from "lucide-react"
import { useAuth } from "../../../state/auth/useAuth.js"
import { InvoicePreview } from "./InvoicePreview.jsx"

const STATUS_CONFIG = {
  paid: { 
    label: "Paid", 
    color: "bg-emerald-50 text-emerald-600 border-emerald-100", 
    icon: <CheckCircle2 size={12} className="mr-1" />,
    pill: "bg-emerald-500"
  },
  pending: { 
    label: "Pending", 
    color: "bg-amber-50 text-amber-600 border-amber-100", 
    icon: <Clock size={12} className="mr-1" />,
    pill: "bg-amber-500"
  },
  overdue: { 
    label: "Overdue", 
    color: "bg-rose-50 text-rose-600 border-rose-100", 
    icon: <AlertCircle size={12} className="mr-1" />,
    pill: "bg-rose-500"
  }
}

export default function InvoicesSection() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState(null)
  
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [activeTheme, setActiveTheme] = useState('modern')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const invRes = await apiRequest("/settings/invoices/")
      if (invRes?.data) {
        setInvoices(invRes.data)
      }
    } catch {
      setError("Failed to load billing invoices.")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank')
    } else {
      setSelectedInvoice(invoice)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Retrieving your billing history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeUp">

      {/* ── Top Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-500" size={24} />
          <div>
            <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Billing & Invoices</h1>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Manage customer service invoices, tax receipts, and payment statements</p>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      <Card title={<span className="font-black text-slate-800 dark:text-white">Billing History</span>}>
        {invoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-slate-800">
              <FileText className="text-slate-300" size={24} />
            </div>
            <h3 className="text-slate-900 dark:text-white font-black text-lg mb-1">No invoices found</h3>
            <p className="text-slate-500 text-sm max-w-[280px] mx-auto">You haven't been billed for any service bookings yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice & Service</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Billing Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Original Work</th>
                  <th className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Additional Work</th>
                  <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Total Bill</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {invoices.map((invoice) => {
                  const statusKey = invoice.status?.toLowerCase() || "pending"
                  const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending
                  const origAmount = invoice.breakdown?.original_amount || invoice.amount
                  const extraAmount = invoice.breakdown?.additional_amount || 0

                  return (
                    <motion.tr 
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-all group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                            INV
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-white">
                              {invoice.invoice_number || `INV-${invoice.id}`}
                            </div>
                            <div className="text-xs text-slate-400 font-bold">
                              {invoice.service_name || "General Service Booking"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
                          {invoice.billing_date}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">₹{origAmount}</div>
                        <div className="text-[9px] font-bold text-slate-400">Base Scope</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{extraAmount}</div>
                        <div className="text-[9px] font-bold text-indigo-400">Approved Extension</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{invoice.amount}</div>
                        <div className="text-[10px] font-bold text-slate-400">{invoice.payment_method || "COD"}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${config.pill}`} />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleDownload(invoice)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Invoice Preview Modal ── */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoicePreview 
            invoice={selectedInvoice}
            company={{ company_name: user?.companyName || 'Sevo' }}
            themeKey={activeTheme}
            setTheme={setActiveTheme}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
