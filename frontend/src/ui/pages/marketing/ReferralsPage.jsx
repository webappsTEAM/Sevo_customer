import React from "react";
import { Users, Share2, Award } from "lucide-react";

export default function ReferralsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Referrals & Rewards</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage customer invite programs, referral wallets, and referee rewards
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Share2 size={28} />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">Refer & Earn Program</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Configure referrer cashback rewards, referee discount codes, and track total referral conversions.
        </p>
      </div>
    </div>
  );
}
