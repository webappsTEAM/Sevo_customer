import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Heart, Share2, Star, ShieldCheck, CheckCircle2, RotateCcw, Plus, Minus, Zap, Truck } from 'lucide-react';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { QUICK_PRODUCTS } from '../catalogData.js';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';
import { computeDynamicETA } from '../../../utils/dynamicETA.js';

export function ProductDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, addItem, updateQuantity, selectedAddress } = useQuickCart();

  const product =
    location.state?.product ||
    QUICK_PRODUCTS.find((p) => p.id === id) ||
    QUICK_PRODUCTS[2]; // Fallback to Air Filter Element

  const [wishlisted, setWishlisted] = useState(false);
  const [activeThumb, setActiveThumb] = useState(0);
  const [localQty, setLocalQty] = useState(1);

  const cartItem = items.find((i) => i.id === product.id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;

  const eta = computeDynamicETA({
    userLat: selectedAddress?.lat,
    userLng: selectedAddress?.lng,
  });

  const discountPercent =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  const handleAddToCart = () => {
    addItem(product, localQty);
    navigate('/qc/cart');
  };

  const galleryImages = [
    product.assetId || 'prod-air-filter-element',
    'cat-filters',
    'prod-kaeser-filter',
  ];

  return (
    <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B] pb-24">
      {/* ── Top Action Header ────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWishlisted(!wishlisted)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B] hover:text-rose-500 transition-colors"
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.title, url: window.location.href });
              } else {
                alert('Product link copied to clipboard!');
              }
            }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Gallery Showcase (matching image1.png Screen 8) ──────────────── */}
      <div className="px-6 py-4 bg-[#F8F7F1] flex flex-col items-center border-b border-[#DDE4E0]">
        <div className="w-64 h-64 rounded-2xl bg-white p-4 shadow-sm flex items-center justify-center mb-4">
          <ApprovedImage
            assetId={galleryImages[activeThumb]}
            src={product.image}
            alt={product.title}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Thumbnail Selector */}
        <div className="flex items-center gap-3">
          {galleryImages.map((assetKey, idx) => (
            <button
              key={idx}
              onClick={() => setActiveThumb(idx)}
              className={`w-14 h-14 rounded-xl bg-white p-1 border-2 transition-all ${
                idx === activeThumb ? 'border-[#008F6B] shadow-sm' : 'border-[#DDE4E0] opacity-75'
              }`}
            >
              <ApprovedImage
                assetId={assetKey}
                alt={`Thumb ${idx}`}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Content ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#667280]">
              SKU: <span className="font-mono text-[#17212B]">{product.sku}</span>
            </span>
            <span className="text-[11px] font-bold text-[#008F6B] bg-[#E8F5EF] px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008F6B]" />
              In Stock
            </span>
          </div>

          <h1 className="text-lg font-extrabold text-[#17212B] mt-1.5 leading-snug">
            {product.title}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md text-xs font-extrabold text-amber-700">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{product.rating}</span>
            </div>
            <span className="text-xs text-[#667280]">({product.reviewsCount} reviews)</span>
          </div>
        </div>

        {/* Price Section */}
        <div className="flex items-baseline gap-2.5 pb-3 border-b border-slate-100">
          <span className="text-2xl font-black text-[#17212B]">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          {product.mrp && product.mrp > product.price && (
            <>
              <span className="text-sm text-[#667280] line-through">
                ₹{Number(product.mrp).toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-extrabold text-[#008F6B] bg-[#E8F5EF] px-2 py-0.5 rounded">
                {discountPercent}% off
              </span>
            </>
          )}
        </div>

        {/* Dynamic Delivery Promise Banner */}
        <div className="p-3 bg-[#E8F5EF] border border-[#008F6B]/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#008F6B] text-white flex items-center justify-center">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#008F6B]">
                {eta.detailedPromise}
              </div>
              <div className="text-[11px] text-[#667280]">
                To {selectedAddress?.area || 'Anna Nagar'} • Live GPS Rider Dispatch
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider mb-1.5">
            Overview
          </h3>
          <p className="text-xs text-[#667280] leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Trust Signals (matching image1.png Screen 8) */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="p-2.5 rounded-xl bg-[#F8F7F1] border border-[#DDE4E0] text-center flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-[#008F6B] mb-1" />
            <span className="text-[10px] font-bold text-[#17212B] leading-tight">Genuine Product</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F8F7F1] border border-[#DDE4E0] text-center flex flex-col items-center">
            <CheckCircle2 className="w-5 h-5 text-[#008F6B] mb-1" />
            <span className="text-[10px] font-bold text-[#17212B] leading-tight">1 Year Warranty</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F8F7F1] border border-[#DDE4E0] text-center flex flex-col items-center">
            <RotateCcw className="w-5 h-5 text-[#008F6B] mb-1" />
            <span className="text-[10px] font-bold text-[#17212B] leading-tight">Easy Returns</span>
          </div>
        </div>

        {/* Features list */}
        {product.features && (
          <div>
            <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider mb-2">
              Specifications
            </h3>
            <ul className="space-y-1.5">
              {product.features.map((feat, i) => (
                <li key={i} className="text-xs text-[#667280] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#008F6B]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Action Bar (matching image1.png Screen 8) ─────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#DDE4E0] p-4 max-w-md mx-auto shadow-lg flex items-center gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        {/* Quantity Stepper */}
        <div className="flex items-center bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl px-2 py-1">
          <button
            onClick={() => setLocalQty(Math.max(1, localQty - 1))}
            className="w-7 h-7 flex items-center justify-center text-[#17212B] hover:bg-slate-200 rounded-lg active:scale-90 transition-transform"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-xs font-extrabold text-[#17212B]">
            {localQty}
          </span>
          <button
            onClick={() => setLocalQty(localQty + 1)}
            className="w-7 h-7 flex items-center justify-center text-[#17212B] hover:bg-slate-200 rounded-lg active:scale-90 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="flex-1 bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
        >
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
}
