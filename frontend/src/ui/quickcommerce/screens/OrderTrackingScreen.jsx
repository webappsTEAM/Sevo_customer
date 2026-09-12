import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Phone, MessageSquare, CheckCircle2, Clock, MapPin, Navigation, Bike } from 'lucide-react';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';

export function OrderTrackingScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order;
    try {
      const saved = localStorage.getItem(`antigravity_order_${orderId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      orderId: orderId || 'AGY12345',
      items: [
        {
          id: 'prod-air-filter-element',
          title: 'Atlas Copco Air Filter Element',
          price: 2450,
          quantity: 1,
          image: '/mockups/appliance_cleaning_hero.png',
        },
      ],
      total: 2450,
      etaMinutes: 18,
    };
  });

  // Dynamic ETA countdown
  const [countdownMinutes, setCountdownMinutes] = useState(order.etaMinutes || 18);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownMinutes((prev) => (prev > 1 ? prev - 1 : 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex flex-col bg-[#F8F7F1] min-h-screen text-[#17212B] pb-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/qc')}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#17212B]">
              Order #{order.orderId}
            </h2>
            <span className="text-[11px] text-[#008F6B] font-semibold">Live GPS Tracking</span>
          </div>
        </div>
      </header>

      {/* ── Status Timeline (matching image1.png Screen 11) ─────────────── */}
      <div className="bg-white px-4 py-4 border-b border-[#DDE4E0]">
        <div className="flex items-center justify-between relative">
          {/* Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#DDE4E0] -z-0" />
          <div className="absolute top-4 left-6 w-2/3 h-0.5 bg-[#008F6B] -z-0" />

          {/* Steps */}
          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-8 h-8 rounded-full bg-[#008F6B] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
              ✓
            </div>
            <span className="text-[11px] font-bold text-[#17212B]">Confirmed</span>
            <span className="text-[10px] text-[#667280]">10:30 AM</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-8 h-8 rounded-full bg-[#008F6B] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
              ✓
            </div>
            <span className="text-[11px] font-bold text-[#17212B]">Packed</span>
            <span className="text-[10px] text-[#667280]">11:00 AM</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-8 h-8 rounded-full bg-[#008F6B] text-white flex items-center justify-center text-xs font-bold ring-4 ring-[#E8F5EF] shadow-md animate-pulse">
              <Bike className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] font-extrabold text-[#008F6B]">Out for Delivery</span>
            <span className="text-[10px] text-[#667280]">12:15 PM</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-[#667280] flex items-center justify-center text-xs font-bold ring-4 ring-white">
              4
            </div>
            <span className="text-[11px] font-medium text-[#667280]">Delivered</span>
            <span className="text-[10px] text-slate-300">--:--</span>
          </div>
        </div>
      </div>

      {/* ── Live Map Visual (matching image1.png Screen 11) ─────────────── */}
      <div className="relative w-full h-72 bg-[#E2E8F0] overflow-hidden">
        {/* Stylized vector map background */}
        <div className="absolute inset-0 bg-[#EBF4FC] opacity-90">
          <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
            {/* Grid & road lines */}
            <path d="M 50 0 Q 150 150 200 300" stroke="#CBD5E1" strokeWidth="12" fill="none" />
            <path d="M 0 100 Q 200 120 400 80" stroke="#CBD5E1" strokeWidth="14" fill="none" />
            <path d="M 0 220 Q 180 200 400 240" stroke="#CBD5E1" strokeWidth="10" fill="none" />

            {/* Active Green Delivery Route */}
            <path
              d="M 120 70 Q 180 140 280 210"
              stroke="#008F6B"
              strokeWidth="5"
              strokeDasharray="6 6"
              fill="none"
              className="animated-route-line"
            />
          </svg>
        </div>

        {/* Origin Store Pin */}
        <div className="absolute top-14 left-24 flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-md">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-extrabold bg-white px-1.5 py-0.5 rounded shadow-xs mt-1">
            Dark Store
          </span>
        </div>

        {/* Animated Rider Marker */}
        <div className="absolute top-32 left-44 flex flex-col items-center animate-bounce duration-1000">
          <div className="w-9 h-9 rounded-full bg-[#008F6B] text-white flex items-center justify-center shadow-xl ring-4 ring-white">
            <Bike className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Customer Destination Pin */}
        <div className="absolute bottom-16 right-24 flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-extrabold bg-white px-1.5 py-0.5 rounded shadow-xs mt-1">
            Your Location
          </span>
        </div>

        {/* ETA Overlay Pill */}
        <div className="absolute bottom-4 left-4 right-4 max-w-[200px] mx-auto bg-[#17212B] text-white px-4 py-2 rounded-2xl shadow-xl flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-[#008F6B]" />
          <span className="text-xs font-extrabold">Arriving in {countdownMinutes} mins</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Delivery Partner Card (matching image1.png Screen 11) ────────── */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
              <ApprovedImage
                assetId="partner-avatar"
                alt="Ramesh Partner"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17212B]">Ramesh</h4>
              <p className="text-[11px] text-[#667280]">Delivery Partner • 4.9 ★</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:9876543210"
              className="w-9 h-9 rounded-full bg-[#E8F5EF] text-[#008F6B] flex items-center justify-center hover:bg-[#008F6B] hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
            <button
              onClick={() => alert('Opening live driver chat...')}
              className="w-9 h-9 rounded-full bg-slate-100 text-[#17212B] flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Order Details Summary ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] p-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#17212B] uppercase tracking-wider mb-3">
            Order Items ({order.items?.length || 1})
          </h3>

          <div className="divide-y divide-slate-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-center font-bold text-[11px] text-[#667280] flex items-center justify-center">
                    {item.quantity}x
                  </span>
                  <span className="font-semibold text-[#17212B] truncate">{item.title}</span>
                </div>
                <span className="font-extrabold text-[#17212B]">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-[#667280]">Total Paid</span>
            <span className="text-[#17212B]">₹{Number(order.total).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
