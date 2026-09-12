import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Bell, Filter } from 'lucide-react';
import { QuickProductCard } from '../components/QuickProductCard.jsx';
import { QUICK_PRODUCTS, QUICK_CATEGORIES } from '../catalogData.js';

const SUB_FILTERS = ['All', 'Screw', 'Piston', 'Portable', 'Accessories'];

export function CategoryListingScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat') || 'compressors';

  const [activeSubFilter, setActiveSubFilter] = useState('All');

  const currentCategory =
    QUICK_CATEGORIES.find((c) => c.id === catParam) || QUICK_CATEGORIES[0];

  const filteredProducts = useMemo(() => {
    let list = QUICK_PRODUCTS;
    if (catParam !== 'all') {
      list = list.filter((p) => p.category === catParam || catParam === 'compressors');
    }
    if (activeSubFilter !== 'All') {
      list = list.filter((p) =>
        p.title.toLowerCase().includes(activeSubFilter.toLowerCase())
      );
    }
    return list;
  }, [catParam, activeSubFilter]);

  return (
    <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#17212B] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#17212B]">
              {currentCategory.name}
            </h2>
            <span className="text-[11px] text-[#667280]">
              {filteredProducts.length} items available
            </span>
          </div>
        </div>

        <button
          onClick={() => alert('Notifications')}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
        >
          <Bell className="w-4 h-4" />
        </button>
      </header>

      {/* ── Subcategory Horizontal Pills (matching image1.png Screen 5) ─── */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {SUB_FILTERS.map((pill) => {
          const isSelected = activeSubFilter === pill;
          return (
            <button
              key={pill}
              onClick={() => setActiveSubFilter(pill)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                isSelected
                  ? 'bg-[#008F6B] text-white shadow-xs'
                  : 'bg-[#F8F7F1] text-[#667280] border border-[#DDE4E0] hover:text-[#17212B]'
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* ── 2-Column Product Grid ───────────────────────────────────────── */}
      <div className="flex-1 p-4">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <QuickProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[#667280]">
            <p className="text-sm font-semibold">No items found for this subcategory</p>
            <button
              onClick={() => setActiveSubFilter('All')}
              className="mt-3 text-xs font-bold text-[#008F6B] underline"
            >
              Reset to All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
