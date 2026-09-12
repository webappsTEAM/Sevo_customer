import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { QuickProductCard } from '../components/QuickProductCard.jsx';
import { AddressSelectionSheet } from '../components/AddressSelectionSheet.jsx';
import { QUICK_CATEGORIES, QUICK_PRODUCTS } from '../catalogData.js';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';
import { computeDynamicETA } from '../../../utils/dynamicETA.js';
import { MapPin, ChevronDown, Bell, Search, Zap, ArrowRight } from 'lucide-react';

export function HomeScreen() {
  const navigate = useNavigate();
  const { selectedAddress, billDetails } = useQuickCart();
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  // Dynamic ETA computed based on active delivery address
  const eta = useMemo(() => {
    return computeDynamicETA({
      userLat: selectedAddress?.lat,
      userLng: selectedAddress?.lng,
      itemCount: billDetails.itemCount || 1,
    });
  }, [selectedAddress, billDetails.itemCount]);

  return (
    <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B]">
      {/* ── Top Location & Header Bar ────────────────────────────────────── */}
      <header className="px-4 pt-3 pb-2 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          {/* Location Trigger */}
          <button
            onClick={() => setAddressSheetOpen(true)}
            className="flex items-center gap-2 text-left focus:outline-none flex-1 max-w-[280px]"
          >
            <div className="w-8 h-8 rounded-full bg-[#E8F5EF] flex items-center justify-center shrink-0 text-[#008F6B]">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold text-[#17212B] truncate">
                  {selectedAddress?.area || 'Anna Nagar'}, {selectedAddress?.pincode || '600100'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#667280] shrink-0" />
              </div>
              <p className="text-[11px] text-[#667280] truncate leading-tight">
                {selectedAddress?.type || 'Home'} - {selectedAddress?.line1 || 'Flat 4B, Emerald'}
              </p>
            </div>
          </button>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            {/* Dynamic ETA Pill */}
            <div className="bg-[#E8F5EF] text-[#008F6B] border border-[#008F6B]/20 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Zap className="w-3 h-3 fill-[#008F6B]" />
              <span>{eta.minutes} MINS</span>
            </div>

            <button
              onClick={() => alert('All delivery partner notifications are up to date.')}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B] hover:bg-slate-200 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#008F6B] ring-2 ring-white" />
            </button>
          </div>
        </div>

        {/* Search Entry Point Bar */}
        <div className="mt-3">
          <div
            onClick={() => navigate('/qc/search')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl text-xs text-[#667280] cursor-pointer hover:border-slate-300 transition-colors"
          >
            <Search className="w-4 h-4 text-[#667280]" />
            <span className="truncate">Search for compressors, air filters, valves...</span>
          </div>
        </div>
      </header>

      {/* ── Scrollable Body ──────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-3 space-y-5">
        {/* Promotional Hero Banner */}
        <div
          onClick={() => navigate('/qc/categories')}
          className="w-full rounded-2xl overflow-hidden shadow-sm relative cursor-pointer group bg-gradient-to-r from-[#02231A] to-[#008F6B] text-white p-4 flex items-center justify-between"
        >
          <div className="z-10 max-w-[65%]">
            <span className="inline-block text-[10px] font-extrabold uppercase bg-white/20 text-white px-2 py-0.5 rounded-full mb-1.5 backdrop-blur-xs">
              Fast Dispatch
            </span>
            <h3 className="text-base font-extrabold leading-tight tracking-tight">
              Genuine Parts Faster Operations
            </h3>
            <p className="text-[11px] text-[#E8F5EF] mt-1 font-medium">
              Up to 50% off on Rentals & Spares
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-[#FFC107] text-[#17212B] text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
              <span>Shop Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-white/10 p-1 flex items-center justify-center">
            <ApprovedImage
              assetId="prod-screw-compressor"
              alt="Genuine Parts"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
        </div>

        {/* Category Grid (8 Icons matching image1.png Screen 4) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-[#17212B]">Shop by Category</h3>
            <button
              onClick={() => navigate('/qc/categories')}
              className="text-xs font-bold text-[#008F6B] hover:underline"
            >
              See All &gt;
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/qc/categories?cat=${cat.id}`)}
                className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-13 h-13 rounded-2xl bg-[#F8F7F1] border border-[#DDE4E0] p-2 flex items-center justify-center shadow-xs group-hover:border-[#008F6B] group-hover:bg-[#E8F5EF]/50 transition-all">
                  <ApprovedImage
                    assetId={cat.assetId}
                    alt={cat.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#17212B] mt-1.5 leading-tight line-clamp-1">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Best Selling Products Grid (matching image1.png) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#17212B]">Best Selling Products</h3>
              <p className="text-[11px] text-[#667280]">OEM certified & available for instant 15m delivery</p>
            </div>
            <button
              onClick={() => navigate('/qc/categories')}
              className="text-xs font-bold text-[#008F6B] hover:underline"
            >
              See All &gt;
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUICK_PRODUCTS.slice(0, 6).map((product) => (
              <QuickProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>

      {/* Address Selection Bottom Sheet */}
      <AddressSelectionSheet
        isOpen={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
      />
    </div>
  );
}
