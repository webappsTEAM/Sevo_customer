/**
 * QuickCartContext.jsx
 * antigravity Quick-Commerce Reactive Cart State & Authoritative Validation
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const QuickCartContext = createContext(null);

const STORAGE_KEY = 'antigravity_qc_cart_v1';
const SAVED_ADDRESS_KEY = 'antigravity_qc_selected_address';

export const DEFAULT_DELIVERY_ADDRESS = {
  id: 'addr-home',
  type: 'Home',
  name: 'Vignesh G',
  phone: '+91 98765 43210',
  line1: 'Flat 4B, Emerald Residency',
  area: 'Anna Nagar',
  city: 'Chennai',
  pincode: '600100',
  lat: 13.0850,
  lng: 80.2101,
  isServiceable: true,
};

export const INITIAL_SAVED_ADDRESSES = [
  DEFAULT_DELIVERY_ADDRESS,
  {
    id: 'addr-office',
    type: 'Office',
    name: 'Vignesh G',
    phone: '+91 94441 22334',
    line1: 'Tower B, Tech Park',
    area: 'T. Nagar',
    city: 'Chennai',
    pincode: '600017',
    lat: 13.0418,
    lng: 80.2341,
    isServiceable: true,
  },
  {
    id: 'addr-work',
    type: 'Work',
    name: 'Vignesh G',
    phone: '+91 98844 55667',
    line1: 'Plot 12, Industrial Estate',
    area: 'Guindy',
    city: 'Chennai',
    pincode: '600032',
    lat: 13.0067,
    lng: 80.2024,
    isServiceable: true,
  },
];

export function QuickCartProvider({ children }) {
  // ── Cart Items State ────────────────────────────────────────────────────────
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('[QuickCart] Failed to load saved cart', e);
    }
    // Default initial items matching reference mockup Screen 9
    return [
      {
        id: 'prod-air-filter-element',
        title: 'Atlas Copco Air Filter Element',
        price: 2450,
        mrp: 3200,
        quantity: 1,
        image: '/mockups/appliance_cleaning_hero.png',
        sku: 'AC-10254',
      },
      {
        id: 'prod-lubricant-oil',
        title: 'Lubricant Oil (5L)',
        price: 3200,
        mrp: 4100,
        quantity: 1,
        image: '/mockups/sandwich_griller.png',
        sku: 'LB-SYN5L-06',
      },
      {
        id: 'prod-pressure-gauge',
        title: 'Pressure Gauge 0-16 bar',
        price: 850,
        mrp: 1200,
        quantity: 1,
        image: '/mockups/service_electrical.png',
        sku: 'GA-16B-05',
      },
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[QuickCart] Failed to persist cart', e);
    }
  }, [items]);

  // ── Delivery Address State ──────────────────────────────────────────────────
  const [selectedAddress, setSelectedAddress] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_ADDRESS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_DELIVERY_ADDRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(selectedAddress));
    } catch {}
  }, [selectedAddress]);

  // ── Badge & Micro-interaction Animations ────────────────────────────────────
  const [badgeBounced, setBadgeBounced] = useState(false);
  const [undoState, setUndoState] = useState(null); // { item, index, timer }

  const triggerBadgeBounce = useCallback(() => {
    setBadgeBounced(true);
    setTimeout(() => setBadgeBounced(false), 600);
  }, []);

  // ── Coupons & Promotions ────────────────────────────────────────────────────
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // ── Cart Operations ─────────────────────────────────────────────────────────
  const addItem = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: product.id,
            title: product.title || product.name,
            price: Number(product.price || product.offer_price || 0),
            mrp: Number(product.mrp || product.base_price || product.price || 0),
            quantity: qty,
            image: product.image || '/mockups/appliance_cleaning_hero.png',
            sku: product.sku || 'SKU-GEN-01',
          },
        ];
      }
    });
    triggerBadgeBounce();
  }, [triggerBadgeBounce]);

  const updateQuantity = useCallback((productId, qty) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: qty } : item))
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => {
      const targetIndex = prev.findIndex((item) => item.id === productId);
      if (targetIndex === -1) return prev;
      const targetItem = prev[targetIndex];

      // Schedule Undo for 4 seconds
      if (undoState?.timer) clearTimeout(undoState.timer);
      const timer = setTimeout(() => {
        setUndoState(null);
      }, 4000);

      setUndoState({
        item: targetItem,
        index: targetIndex,
        timer,
      });

      return prev.filter((item) => item.id !== productId);
    });
  }, [undoState]);

  const restoreLastDeleted = useCallback(() => {
    if (!undoState) return;
    clearTimeout(undoState.timer);
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(undoState.index, 0, undoState.item);
      return copy;
    });
    setUndoState(null);
  }, [undoState]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // ── Financial Breakdown (Server Authoritative Formula) ──────────────────────
  const billDetails = useMemo(() => {
    const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const mrpTotal = items.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0);
    const savings = Math.max(0, mrpTotal - itemTotal);

    // Free delivery above ₹499
    const deliveryFee = itemTotal > 499 || itemTotal === 0 ? 0 : 40;
    const platformFee = itemTotal > 0 ? 15 : 0;

    let couponDiscount = 0;
    if (appliedCoupon && itemTotal > 0) {
      if (appliedCoupon.type === 'percentage') {
        couponDiscount = Math.round((itemTotal * appliedCoupon.value) / 100);
      } else {
        couponDiscount = appliedCoupon.value;
      }
    }

    const total = Math.max(0, itemTotal + deliveryFee + platformFee - couponDiscount);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      itemCount,
      itemTotal,
      mrpTotal,
      savings,
      deliveryFee,
      platformFee,
      couponDiscount,
      total,
    };
  }, [items, appliedCoupon]);

  // ── Coupon Verification ─────────────────────────────────────────────────────
  const applyCoupon = useCallback((code) => {
    setCouponError('');
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.');
      return false;
    }
    if (cleanCode === 'FAST50') {
      setAppliedCoupon({ code: 'FAST50', value: 50, type: 'flat', label: 'Flat ₹50 OFF' });
      return true;
    }
    if (cleanCode === 'SEVO10' || cleanCode === 'ANTIGRAVITY10') {
      setAppliedCoupon({ code: 'SEVO10', value: 10, type: 'percentage', label: '10% OFF' });
      return true;
    }
    setCouponError('Invalid or expired coupon code.');
    return false;
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError('');
  }, []);

  const value = {
    items,
    selectedAddress,
    setSelectedAddress,
    badgeBounced,
    undoState,
    appliedCoupon,
    couponError,
    billDetails,
    addItem,
    updateQuantity,
    removeItem,
    restoreLastDeleted,
    clearCart,
    applyCoupon,
    removeCoupon,
  };

  return <QuickCartContext.Provider value={value}>{children}</QuickCartContext.Provider>;
}

export function useQuickCart() {
  const context = useContext(QuickCartContext);
  if (!context) {
    throw new Error('useQuickCart must be used within a QuickCartProvider');
  }
  return context;
}
