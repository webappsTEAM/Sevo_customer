import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { Star, Plus, Minus, Heart } from 'lucide-react';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';

export function QuickProductCard({ product }) {
  const navigate = useNavigate();
  const { items, addItem, updateQuantity } = useQuickCart();
  const [wishlisted, setWishlisted] = useState(false);

  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem ? cartItem.quantity : 0;

  const handleCardClick = () => {
    navigate(`/qc/product/${product.id}`, { state: { product } });
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    setWishlisted(!wishlisted);
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    updateQuantity(product.id, qty + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    updateQuantity(product.id, qty - 1);
  };

  const discountPercent =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  return (
    <div
      onClick={handleCardClick}
      className="bg-[#FFFFFF] rounded-2xl border border-[#DDE4E0] hover:border-slate-300 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.99] relative group"
    >
      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm border border-slate-100 flex items-center justify-center text-[#667280] hover:text-rose-500 shadow-sm transition-colors"
      >
        <Heart
          className={`w-3.5 h-3.5 transition-colors ${
            wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Discount Badge */}
      {discountPercent && (
        <span className="absolute top-2.5 left-2.5 z-10 bg-[#E8F5EF] text-[#008F6B] text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
          {discountPercent}% OFF
        </span>
      )}

      {/* Product Image */}
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-[#F8F7F1] mb-2.5 flex items-center justify-center p-2">
        <ApprovedImage
          assetId={product.assetId}
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Product Information */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-bold text-[#17212B] line-clamp-2 leading-snug min-h-[32px]">
            {product.title}
          </h4>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded text-[10px] font-extrabold text-amber-700">
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              <span>{product.rating || '4.5'}</span>
            </div>
            {product.reviewsCount && (
              <span className="text-[10px] text-[#667280]">({product.reviewsCount})</span>
            )}
          </div>
        </div>

        {/* Pricing & Add Stepper */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
          <div>
            <div className="text-sm font-extrabold text-[#17212B]">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </div>
            {product.mrp && product.mrp > product.price && (
              <div className="text-[10px] text-[#667280] line-through">
                ₹{Number(product.mrp).toLocaleString('en-IN')}
              </div>
            )}
          </div>

          {/* Add / Stepper Interaction */}
          <div>
            {qty === 0 ? (
              <button
                onClick={handleAdd}
                className="bg-[#008F6B] hover:bg-[#0F6B3A] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : (
              <div className="flex items-center bg-[#008F6B] text-white rounded-lg shadow-sm overflow-hidden text-xs font-bold">
                <button
                  onClick={handleDecrement}
                  className="px-2 py-1.5 hover:bg-[#0F6B3A] active:scale-90 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-2 min-w-[20px] text-center font-extrabold">{qty}</span>
                <button
                  onClick={handleIncrement}
                  className="px-2 py-1.5 hover:bg-[#0F6B3A] active:scale-90 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
