import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { QuickProductCard } from '../components/QuickProductCard.jsx';
import { QUICK_PRODUCTS } from '../catalogData.js';

export function ProductGridScreen() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('popular');

  return (
    <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B]">
      {/* ── Top Toolbar (matching image1.png Screen 7) ───────────────────── */}
      <div className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/qc/search')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDE4E0] rounded-xl text-xs font-bold text-[#17212B] hover:bg-slate-50"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#667280]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent font-bold text-[#17212B] focus:outline-none cursor-pointer"
          >
            <option value="popular">Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ── 2-Column Product Grid ───────────────────────────────────────── */}
      <div className="flex-1 p-4 grid grid-cols-2 gap-3">
        {QUICK_PRODUCTS.map((product) => (
          <QuickProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
