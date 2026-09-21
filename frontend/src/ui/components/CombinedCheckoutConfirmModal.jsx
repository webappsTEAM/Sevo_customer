import React from "react"
import { X, ShoppingBag, Wrench, AlertTriangle } from "lucide-react"

/**
 * CombinedCheckoutConfirmModal.jsx
 *
 * DAILY_ESSENTIALS_FRONTEND_IMPLEMENTATION_PLAN.md Phase 3.
 *
 * Shown whenever the customer opens checkout on one cart (services or
 * Daily Essentials) while the OTHER cart also has pending items. The
 * backend's unified CheckoutView never infers "check out both" on its own
 * -- this is the explicit confirmation moment that satisfies that rule.
 *
 * `disableBothReason`: when set (e.g. "a photo was attached to your
 * service request"), the "Check out both together" option is shown but
 * disabled with that reason -- the combined-checkout API call is JSON-only
 * and can't carry a file upload, so that case must be checked out as two
 * separate steps instead of silently dropping the attachment.
 */
export function CombinedCheckoutConfirmModal({
  isOpen,
  onClose,
  onChoose, // (choice: "this_only" | "both") => void
  thisCartLabel, // "your grocery order" | "your service booking"
  otherCartLabel, // "a service booking" | "a grocery order"
  disableBothReason,
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-emerald-700" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 -mt-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900">You also have {otherCartLabel} in progress</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Services and Daily Essentials are kept as two separate orders with their own payment and delivery — pick how you'd like to check out.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onChoose("this_only")}
            className="w-full text-left px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors cursor-pointer flex items-center gap-3"
          >
            <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800">Just check out {thisCartLabel} now</span>
          </button>

          <button
            type="button"
            disabled={!!disableBothReason}
            onClick={() => onChoose("both")}
            className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-colors flex items-center gap-3 ${
              disableBothReason
                ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
                : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer"
            }`}
          >
            <Wrench className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800">Check out both together</span>
          </button>
          {disableBothReason && (
            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>Can't combine right now — {disableBothReason}. Check out one at a time instead.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
