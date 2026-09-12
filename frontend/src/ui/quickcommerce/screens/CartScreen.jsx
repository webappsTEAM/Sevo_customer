import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Tag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { EmptyStateView } from '../components/EmptyStateView.jsx';
import { AddressSelectionSheet } from '../components/AddressSelectionSheet.jsx';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';

export function CartScreen() {
  const navigate = useNavigate();
  const {
    items,
    selectedAddress,
    billDetails,
    updateQuantity,
    removeItem,
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
  } = useQuickCart();

  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponDrawerOpen, setCouponDrawerOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B]">
        <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-extrabold text-[#17212B]">My Cart</h2>
        </header>

        <EmptyStateView
          title="Your Cart is Empty"
          subtitle="Explore industrial compressors, filters, valves, or daily essentials."
          actionText="Start Shopping"
          onAction={() => navigate('/qc')}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-[#F8F7F1] min-h-screen text-[#17212B] pb-28">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-extrabold text-[#17212B]">
            My Cart ({billDetails.itemCount})
          </h2>
        </div>
      </header>

      {/* ── Deliver To Banner (matching image1.png Screen 9) ─────────────── */}
      <div className="px-4 py-2.5 bg-white border-b border-[#DDE4E0] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs truncate max-w-[75%]">
          <MapPin className="w-4 h-4 text-[#008F6B] shrink-0" />
          <div className="truncate">
            <span className="text-[#667280]">Deliver to: </span>
            <span className="font-bold text-[#17212B]">
              {selectedAddress?.area}, {selectedAddress?.city} - {selectedAddress?.pincode}
            </span>
          </div>
        </div>

        <button
          onClick={() => setAddressSheetOpen(true)}
          className="text-xs font-bold text-[#008F6B] hover:underline shrink-0"
        >
          Change
        </button>
      </div>

      {/* ── Cart Items List (matching image1.png Screen 9) ───────────────── */}
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-3 divide-y divide-slate-100 shadow-xs">
          {items.map((item) => (
            <div key={item.id} className="py-3 first:pt-1 last:pb-1 flex items-center gap-3">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl bg-[#F8F7F1] p-1.5 shrink-0 flex items-center justify-center border border-slate-100">
                <ApprovedImage
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Title & Price */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#17212B] truncate">{item.title}</h4>
                <div className="text-sm font-extrabold text-[#17212B] mt-1">
                  ₹{Number(item.price).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Stepper with Delete */}
              <div className="flex items-center bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl overflow-hidden text-xs font-bold">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-7 h-7 flex items-center justify-center text-[#17212B] hover:bg-slate-200"
                >
                  {item.quantity === 1 ? (
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="w-7 text-center font-extrabold text-xs">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center text-[#17212B] hover:bg-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Apply Coupon Card */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-3.5 shadow-xs">
          {appliedCoupon ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#008F6B]" />
                <div>
                  <span className="text-xs font-bold text-[#008F6B]">{appliedCoupon.code} applied</span>
                  <p className="text-[10px] text-[#667280]">{appliedCoupon.label}</p>
                </div>
              </div>
              <button
                onClick={removeCoupon}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div
                onClick={() => setCouponDrawerOpen(!couponDrawerOpen)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#008F6B]" />
                  <span className="text-xs font-bold text-[#17212B]">Apply Coupon</span>
                </div>
                <span className="text-xs font-bold text-[#008F6B]">&gt;</span>
              </div>

              {couponDrawerOpen && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Try FAST50 or ANTIGRAVITY10"
                    className="flex-1 px-3 py-2 bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl text-xs font-semibold uppercase focus:outline-none focus:border-[#008F6B]"
                  />
                  <button
                    onClick={() => {
                      if (applyCoupon(couponInput)) {
                        setCouponInput('');
                        setCouponDrawerOpen(false);
                      }
                    }}
                    className="px-4 py-2 bg-[#008F6B] text-white text-xs font-bold rounded-xl"
                  >
                    Apply
                  </button>
                </div>
              )}
              {couponError && <p className="text-[11px] text-rose-500 mt-1.5">{couponError}</p>}
            </div>
          )}
        </div>

        {/* Bill Details (Authoritative breakdown) */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-4 space-y-2.5 shadow-xs">
          <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider mb-1">
            Bill Details
          </h3>

          <div className="flex items-center justify-between text-xs text-[#667280]">
            <span>Item Total</span>
            <span className="font-bold text-[#17212B]">
              ₹{billDetails.itemTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#667280]">
            <span>Delivery Fee</span>
            {billDetails.deliveryFee === 0 ? (
              <span className="font-bold text-[#008F6B] uppercase">FREE</span>
            ) : (
              <span className="font-bold text-[#17212B]">₹{billDetails.deliveryFee}</span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[#667280]">
            <span>Platform Fee</span>
            <span className="font-bold text-[#17212B]">₹{billDetails.platformFee}</span>
          </div>

          {billDetails.couponDiscount > 0 && (
            <div className="flex items-center justify-between text-xs text-[#008F6B] font-semibold">
              <span>Coupon Discount</span>
              <span>-₹{billDetails.couponDiscount}</span>
            </div>
          )}

          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-sm font-extrabold text-[#17212B]">
            <span>To Pay</span>
            <span>₹{billDetails.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Checkout Bar (matching image1.png Screen 9) ────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#DDE4E0] p-4 max-w-md mx-auto shadow-lg flex items-center justify-between gap-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div>
          <span className="text-[10px] text-[#667280] uppercase font-bold block">Grand Total</span>
          <span className="text-lg font-black text-[#17212B]">
            ₹{billDetails.total.toLocaleString('en-IN')}
          </span>
        </div>

        <button
          onClick={() => navigate('/qc/checkout')}
          className="flex-1 bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Address Selection Sheet */}
      <AddressSelectionSheet
        isOpen={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
      />
    </div>
  );
}
