import React from 'react';
import { X, Plus, MapPin, CheckCircle2 } from 'lucide-react';
import { useQuickCart, INITIAL_SAVED_ADDRESSES } from '../../../state/QuickCartContext.jsx';

export function AddressSelectionSheet({ isOpen, onClose }) {
  const { selectedAddress, setSelectedAddress } = useQuickCart();

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
            <h3 className="text-base font-bold text-[#17212B]">Select Delivery Address</h3>
            <p className="text-xs text-[#667280]">Choose address for instant 10–15m delivery</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#667280] hover:text-[#17212B] rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Addresses List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {INITIAL_SAVED_ADDRESSES.map((addr) => {
            const isSelected = selectedAddress?.id === addr.id;
            return (
              <div
                key={addr.id}
                onClick={() => {
                  setSelectedAddress(addr);
                  onClose();
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'border-[#008F6B] bg-[#E8F5EF]/40 shadow-sm'
                    : 'border-[#DDE4E0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-[#008F6B] bg-[#008F6B]' : 'border-[#667280]'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#17212B] bg-slate-100 px-2 py-0.5 rounded">
                      {addr.type}
                    </span>
                    <span className="text-xs font-medium text-[#17212B]">{addr.name}</span>
                  </div>
                  <p className="text-xs text-[#17212B] font-medium mt-1 leading-snug">
                    {addr.line1}, {addr.area}, {addr.city} - {addr.pincode}
                  </p>
                  <p className="text-[11px] text-[#667280] mt-0.5">{addr.phone}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Address CTA */}
        <button
          onClick={() => {
            alert('Opening GPS Map Location Picker...');
            onClose();
          }}
          className="w-full mt-2 py-3 px-4 border border-[#008F6B] text-[#008F6B] hover:bg-[#E8F5EF] font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Address</span>
        </button>
      </div>
    </div>
  );
}
