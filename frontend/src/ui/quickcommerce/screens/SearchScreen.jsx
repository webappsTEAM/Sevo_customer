import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X, SlidersHorizontal, ChevronDown, Star, Plus, Minus } from 'lucide-react';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { EmptyStateView } from '../components/EmptyStateView.jsx';
import { QUICK_PRODUCTS } from '../catalogData.js';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';

export function SearchScreen() {
  const navigate = useNavigate();
  const { items, addItem, updateQuantity } = useQuickCart();

  const [query, setQuery] = useState('air filter');
  const [debouncedQuery, setDebouncedQuery] = useState('air filter');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedRating, setSelectedRating] = useState(0);

  // Debounce input by 280ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Filter and sort items
  const results = useMemo(() => {
    let list = QUICK_PRODUCTS.filter((p) => {
      const matchText =
        p.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(debouncedQuery.toLowerCase()));

      const matchBrand = selectedBrand === 'all' || p.brand === selectedBrand;
      const matchRating = selectedRating === 0 || p.rating >= selectedRating;

      return matchText && matchBrand && matchRating;
    });

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [debouncedQuery, selectedBrand, selectedRating, sortBy]);

  return (
    <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B]">
      {/* ── Search Header ────────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#17212B] shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-[#667280] absolute left-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, spares..."
              className="w-full pl-9 pr-8 py-2 bg-[#F8F7F1] border border-[#DDE4E0] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#008F6B]"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 text-[#667280] hover:text-[#17212B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Facet Chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setSelectedBrand(selectedBrand === 'Atlas Copco' ? 'all' : 'Atlas Copco');
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-colors flex items-center gap-1.5 ${
              selectedBrand === 'Atlas Copco'
                ? 'bg-[#008F6B] text-white border-[#008F6B]'
                : 'bg-[#F8F7F1] text-[#667280] border-[#DDE4E0]'
            }`}
          >
            <span>Atlas Copco</span>
          </button>

          <button
            onClick={() => {
              setSelectedBrand(selectedBrand === 'Ingersoll Rand' ? 'all' : 'Ingersoll Rand');
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-colors flex items-center gap-1.5 ${
              selectedBrand === 'Ingersoll Rand'
                ? 'bg-[#008F6B] text-white border-[#008F6B]'
                : 'bg-[#F8F7F1] text-[#667280] border-[#DDE4E0]'
            }`}
          >
            <span>Ingersoll Rand</span>
          </button>

          <button
            onClick={() => {
              setSelectedRating(selectedRating === 4.5 ? 0 : 4.5);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-colors flex items-center gap-1 ${
              selectedRating === 4.5
                ? 'bg-[#008F6B] text-white border-[#008F6B]'
                : 'bg-[#F8F7F1] text-[#667280] border-[#DDE4E0]'
            }`}
          >
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>4.5+</span>
          </button>
        </div>

        {/* Meta count + Sort dropdown */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-[#17212B]">{results.length} Products</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#667280]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-[#17212B] focus:outline-none cursor-pointer"
            >
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </header>

      {/* ── Product List Results (matching image1.png Screen 6) ─────────── */}
      <div className="flex-1 p-4 space-y-3">
        {results.length > 0 ? (
          results.map((product) => {
            const cartItem = items.find((i) => i.id === product.id);
            const qty = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={product.id}
                onClick={() => navigate(`/qc/product/${product.id}`, { state: { product } })}
                className="p-3 rounded-2xl border border-[#DDE4E0] hover:border-slate-300 bg-white shadow-xs flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-all"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl bg-[#F8F7F1] p-1.5 shrink-0 flex items-center justify-center">
                  <ApprovedImage
                    assetId={product.assetId}
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#17212B] truncate">{product.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-extrabold text-[#17212B]">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-[10px] text-[#667280] line-through">
                        ₹{Number(product.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-700 font-semibold">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{product.rating}</span>
                    <span className="text-[#667280]">({product.reviewsCount})</span>
                  </div>
                </div>

                {/* Add / Stepper */}
                <div className="shrink-0">
                  {qty === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(product, 1);
                      }}
                      className="bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center bg-[#008F6B] text-white rounded-lg shadow-sm overflow-hidden text-xs font-bold"
                    >
                      <button
                        onClick={() => updateQuantity(product.id, qty - 1)}
                        className="px-2 py-1.5 hover:bg-[#0F6B3A]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 min-w-[20px] text-center font-extrabold">{qty}</span>
                      <button
                        onClick={() => updateQuantity(product.id, qty + 1)}
                        className="px-2 py-1.5 hover:bg-[#0F6B3A]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyStateView
            title="No products found"
            subtitle={`We couldn't find any products matching "${query}".`}
            actionText="Clear Filters"
            onAction={() => {
              setQuery('');
              setSelectedBrand('all');
              setSelectedRating(0);
            }}
          />
        )}
      </div>
    </div>
  );
}
