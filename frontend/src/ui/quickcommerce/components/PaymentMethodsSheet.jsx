import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';

export const PAYMENT_OPTIONS = [
  {
    id: 'upi',
    title: 'UPI (GPay, PhonePe, Paytm)',
    description: 'Instant verification • Instant refund support',
    icon: Smartphone,
    popular: true,
  },
  {
    id: 'cards',
    title: 'Credit / Debit Card',
    description: 'Visa, Mastercard, RuPay, Amex',
    icon: CreditCard,
  },
  {
    id: 'netbanking',
    title: 'Net Banking',
    description: 'All major Indian banks supported',
    icon: Building2,
  },
  {
    id: 'cod',
    title: 'Cash on Delivery',
    description: 'Pay with Cash/UPI to partner upon arrival',
    icon: Banknote,
  },
];

export function PaymentMethodsSheet({ isOpen, onClose, selectedMethod = 'upi', onSelect }) {
  const [current, setCurrent] = useState(selectedMethod);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#FFFFFF] rounded-t-3xl p-6 shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-[#DDE4E0] rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DDE4E0]">
          <div>
            <h3 className="text-base font-bold text-[#17212B]">Payment Method</h3>
            <p className="text-xs text-[#667280]">100% Encrypted & PCI-DSS Secure</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#667280] hover:text-[#17212B] rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {PAYMENT_OPTIONS.map((opt) => {
            const isSelected = current === opt.id;
            const Icon = opt.icon;

            return (
              <div
                key={opt.id}
                onClick={() => setCurrent(opt.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-[#008F6B] bg-[#E8F5EF]/40 shadow-sm'
                    : 'border-[#DDE4E0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-[#008F6B] text-white' : 'bg-slate-100 text-[#667280]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#17212B]">{opt.title}</span>
                      {opt.popular && (
                        <span className="text-[10px] font-extrabold bg-[#008F6B] text-white px-2 py-0.5 rounded-full">
                          FASTEST
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#667280] mt-0.5">{opt.description}</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-[#008F6B] bg-[#008F6B]' : 'border-[#DDE4E0]'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              if (onSelect) onSelect(current);
              onClose();
            }}
            className="w-full py-3.5 bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>Continue</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-[#667280] hover:text-[#17212B]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
