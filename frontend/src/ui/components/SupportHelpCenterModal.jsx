import React, { useEffect } from "react"
import {
  X, Phone, Mail, MapPin, Truck, Building2,
  Package, HelpCircle, Headphones, Clock, ShieldCheck
} from "lucide-react"

export function SupportHelpCenterModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden relative"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Help Center</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Hosur Hub
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Need assistance? We're happy to help, reach out through the channels below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* 1. Customer Support */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-2.5 mb-2 text-slate-900 font-bold">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight">Customer Support</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
              For support with your bookings, live shipment tracking, and other queries:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="mailto:support@caldimengg.in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>support@caldimengg.in</span>
              </a>
              <a
                href="tel:04344290100"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>04344 290 100 / +91 98765 43210</span>
              </a>
            </div>
          </div>

          {/* 2. Drive with CalServices */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-2.5 mb-2 text-slate-900 font-bold">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight">Drive with Sevo</span>
            </div>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">Tempo &amp; Mini Truck Owners:</strong> Increase your earnings by partnering with us in Hosur &amp; SIPCOT corridors.
              </p>
              <p>
                <strong className="text-slate-900">Two-Wheeler Riders:</strong> Earn money by fulfilling on-demand local transportation and parcel orders assigned by Sevo.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="tel:9876543211"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-700 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Driver Helpline: +91 98765 43211 / 04344 290 100</span>
              </a>
            </div>
          </div>

          {/* 3. Packers and Movers */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-2.5 mb-2 text-slate-900 font-bold">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight">Packers and Movers Support</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
              For queries, inspection requests, and support regarding your house shifting or office relocation booking:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="mailto:support@caldimengg.in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-800 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>support@caldimengg.in</span>
              </a>
              <a
                href="tel:04344290101"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-800 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>04344 290 101 / +91 98765 43212</span>
              </a>
            </div>
          </div>

          {/* 4. Enterprise Services */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-2.5 mb-2 text-slate-900 font-bold">
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight">Enterprise Logistics Services</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
              If you are an enterprise, manufacturing plant, or corporate business looking for contracted goods transportation and fleet services in Hosur / SIPCOT:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="mailto:support@caldimengg.in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>support@caldimengg.in</span>
              </a>
              <a
                href="tel:04344290102"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Enterprise Desk: 04344 290 102</span>
              </a>
            </div>
          </div>

          {/* 5. Hosur Regional Hub Address */}
          <div className="bg-emerald-50/70 rounded-2xl p-4 sm:p-5 border border-emerald-200/80">
            <div className="flex items-center gap-2.5 mb-2 text-emerald-950 font-bold">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight">Hosur Regional Office (Hosur Region Only)</span>
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-slate-700 pl-9">
              <p className="font-semibold text-slate-900">
                Sevo Logistics Solutions Pvt. Ltd.
              </p>
              <p>Plot 23, 24, 25 Near RTO Checkpost, Bagalur Road, Hosur – 635 103, Tamil Nadu</p>
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  <strong>Email:</strong> support@caldimengg.in
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <strong>Hours:</strong> Mon – Sun, 8:00 AM – 9:00 PM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Dedicated On-Road Support Across Hosur</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
