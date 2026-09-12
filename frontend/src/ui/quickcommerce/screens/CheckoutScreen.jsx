import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Clock, MapPin, Zap, ShieldCheck } from 'lucide-react';
import { AddressSelectionSheet } from '../components/AddressSelectionSheet.jsx';
import { PAYMENT_OPTIONS } from '../components/PaymentMethodsSheet.jsx';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';
import { computeDynamicETA } from '../../../utils/dynamicETA.js';

export function CheckoutScreen() {
  const navigate = useNavigate();
  const { items, selectedAddress, billDetails, clearCart } = useQuickCart();

  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('instant'); // 'instant' | 'evening'
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [placingOrder, setPlacingOrder] = useState(false);

  const eta = useMemo(() => {
    return computeDynamicETA({
      userLat: selectedAddress?.lat,
      userLng: selectedAddress?.lng,
      itemCount: billDetails.itemCount,
    });
  }, [selectedAddress, billDetails.itemCount]);

  const handlePlaceOrder = () => {
    setPlacingOrder(true);

    // Simulate authoritative server order creation
    setTimeout(() => {
      const orderId = `AGY${Math.floor(10000 + Math.random() * 90000)}`;
      const orderData = {
        orderId,
        items: [...items],
        total: billDetails.total,
        address: selectedAddress,
        paymentMethod,
        slot: selectedSlot === 'instant' ? `Instant ${eta.minutes} mins` : 'Today, 5 PM - 7 PM',
        createdAt: new Date().toISOString(),
        etaMinutes: eta.minutes,
      };

      try {
        localStorage.setItem(`antigravity_order_${orderId}`, JSON.stringify(orderData));
        localStorage.setItem('antigravity_latest_order_id', orderId);
      } catch {}

      clearCart();
      setPlacingOrder(false);
      navigate(`/qc/track/${orderId}`, { state: { order: orderData } });
    }, 800);
  };

  return (
    <div className="w-full flex flex-col bg-[#F8F7F1] min-h-screen text-[#17212B] pb-28">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-extrabold text-[#17212B]">Checkout</h2>
      </header>

      {/* ── Step Progress Indicator (matching image1.png Screen 10) ──────── */}
      <div className="bg-white px-6 py-4 border-b border-[#DDE4E0] flex items-center justify-between">
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-[#008F6B] text-white flex items-center justify-center text-[10px] font-bold">
            ✓
          </div>
          <span className="text-[10px] font-extrabold text-[#008F6B]">Address</span>
        </div>
        <div className="flex-1 h-0.5 bg-[#008F6B] mx-2" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-[#008F6B] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-[#E8F5EF]">
            2
          </div>
          <span className="text-[10px] font-extrabold text-[#008F6B]">Payment</span>
        </div>
        <div className="flex-1 h-0.5 bg-[#DDE4E0] mx-2" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-slate-100 text-[#667280] flex items-center justify-center text-[10px] font-bold">
            3
          </div>
          <span className="text-[10px] font-semibold text-[#667280]">Review</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Delivery Address Section ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider">
              Delivery Address
            </h3>
            <button
              onClick={() => setAddressSheetOpen(true)}
              className="text-xs font-bold text-[#008F6B] hover:underline"
            >
              Change
            </button>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F7F1] border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-[#E8F5EF] flex items-center justify-center text-[#008F6B] shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#17212B]">{selectedAddress?.type}</span>
                <span className="text-[11px] text-[#667280]">{selectedAddress?.name}</span>
              </div>
              <p className="text-xs text-[#17212B] font-medium mt-0.5 leading-snug">
                {selectedAddress?.line1}, {selectedAddress?.area}, {selectedAddress?.city} - {selectedAddress?.pincode}
              </p>
              <p className="text-[11px] text-[#667280] mt-0.5">{selectedAddress?.phone}</p>
            </div>
          </div>
        </div>

        {/* ── Delivery Slot Section (Dynamic 10-15m Promise) ─────────────── */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider mb-3">
            Delivery Slot
          </h3>

          <div className="space-y-2.5">
            {/* Instant Slot */}
            <div
              onClick={() => setSelectedSlot('instant')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedSlot === 'instant'
                  ? 'border-[#008F6B] bg-[#E8F5EF]/40'
                  : 'border-[#DDE4E0] bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedSlot === 'instant' ? 'border-[#008F6B] bg-[#008F6B]' : 'border-slate-300'
                  }`}
                >
                  {selectedSlot === 'instant' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#008F6B] flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-[#008F6B]" />
                      Instant Delivery ({eta.promiseText})
                    </span>
                    <span className="text-[10px] font-bold bg-[#008F6B] text-white px-2 py-0.5 rounded">
                      FASTEST
                    </span>
                  </div>
                  <p className="text-[11px] text-[#667280] mt-0.5">
                    Order dispatched immediately via dedicated rider
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#008F6B]">FREE</span>
            </div>

            {/* Scheduled Slot */}
            <div
              onClick={() => setSelectedSlot('evening')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedSlot === 'evening'
                  ? 'border-[#008F6B] bg-[#E8F5EF]/40'
                  : 'border-[#DDE4E0] bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedSlot === 'evening' ? 'border-[#008F6B] bg-[#008F6B]' : 'border-slate-300'
                  }`}
                >
                  {selectedSlot === 'evening' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#17212B]">Today, 5 PM - 7 PM</span>
                  <p className="text-[11px] text-[#667280] mt-0.5">Evening standard window</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#008F6B]">FREE</span>
            </div>
          </div>
        </div>

        {/* ── Payment Method Section ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider mb-3">
            Payment Method
          </h3>

          <div className="space-y-2.5">
            {PAYMENT_OPTIONS.map((opt) => {
              const isSelected = paymentMethod === opt.id;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[#008F6B] bg-[#E8F5EF]/40'
                      : 'border-[#DDE4E0] bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#008F6B] bg-[#008F6B]' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#667280]" />
                      <span className="text-xs font-bold text-[#17212B]">{opt.title}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Place Order Bar (matching image1.png Screen 10) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#DDE4E0] p-4 max-w-md mx-auto shadow-lg flex items-center justify-between gap-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div>
          <span className="text-lg font-black text-[#17212B] block">
            ₹{billDetails.total.toLocaleString('en-IN')}
          </span>
          <button
            onClick={() => navigate('/qc/cart')}
            className="text-[11px] font-bold text-[#008F6B] hover:underline"
          >
            View Details
          </button>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={placingOrder}
          className="flex-1 bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2 disabled:opacity-75"
        >
          {placingOrder ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>Place Order</span>
          )}
        </button>
      </div>

      <AddressSelectionSheet
        isOpen={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
      />
    </div>
  );
}
