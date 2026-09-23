import React from "react";
import { Gift, Tag, Sparkles } from "lucide-react";

export default function OffersPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Gift size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Offers & Banners</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage seasonal promotional banners, flash deals, and combo offers
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Sparkles size={28} />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">Seasonal Offers & Banners Module</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Configure app home screen hero banners, package combo discounts, and flash sales.
        </p>
      </div>
    </div>
  );
}
