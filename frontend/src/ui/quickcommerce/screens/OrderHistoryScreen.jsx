import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';

const MOCK_ORDER_HISTORY = [
  {
    id: 'SEVO12345',
    status: 'Delivered',
    date: '12 Jun 2026',
    total: 2450,
    itemsText: 'Atlas Copco Air Filter Element',
    assetId: 'prod-air-filter-element',
  },
  {
    id: 'SEVO12344',
    status: 'In Transit',
    date: '10 Jun 2026',
    total: 8750,
    itemsText: 'Ingersoll Rand Air Compressor Cartridges (x3)',
    assetId: 'prod-ir-air-filter',
  },
  {
    id: 'SEVO12343',
    status: 'Delivered',
    date: '8 Jun 2026',
    total: 3200,
    itemsText: 'Synthetic Lubricant Oil (5L)',
    assetId: 'prod-lubricant-oil',
  },
  {
    id: 'SEVO12342',
    status: 'Cancelled',
    date: '5 Jun 2026',
    total: 1850,
    itemsText: 'Industrial Pressure Gauge 0-16 bar',
    assetId: 'prod-pressure-gauge',
  },
];

export function OrderHistoryScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Delivered', 'In Transit', 'Cancelled'];

  const filteredOrders = MOCK_ORDER_HISTORY.filter((ord) => {
    if (activeTab === 'All') return true;
    return ord.status === activeTab;
  });

  return (
    <div className="w-full flex flex-col bg-[#F8F7F1] min-h-screen text-[#17212B] pb-20">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-3 sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-100 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#17212B]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-extrabold text-[#17212B]">My Orders</h2>
      </header>

      {/* ── Status Tabs (matching image1.png Screen 13) ─────────────────── */}
      <div className="bg-white px-4 py-2 border-b border-[#DDE4E0] flex items-center gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                isSelected
                  ? 'bg-[#008F6B] text-white shadow-xs'
                  : 'bg-[#F8F7F1] text-[#667280] border border-[#DDE4E0] hover:text-[#17212B]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Orders List ─────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {filteredOrders.map((ord) => {
          const isDelivered = ord.status === 'Delivered';
          const isInTransit = ord.status === 'In Transit';
          const isCancelled = ord.status === 'Cancelled';

          return (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-[#DDE4E0] p-4 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3.5">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-[#F8F7F1] p-1.5 shrink-0 flex items-center justify-center border border-slate-100">
                  <ApprovedImage
                    assetId={ord.assetId}
                    alt={ord.itemsText}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#17212B]">#{ord.id}</span>
                    <span className="text-sm font-extrabold text-[#17212B]">
                      ₹{ord.total.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isDelivered
                          ? 'bg-emerald-50 text-emerald-700'
                          : isInTransit
                          ? 'bg-blue-50 text-blue-700 animate-pulse'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {ord.status}
                    </span>
                    <span className="text-[11px] text-[#667280]">• {ord.date}</span>
                  </div>

                  <p className="text-xs text-[#17212B] font-medium mt-1 truncate">
                    {ord.itemsText}
                  </p>
                </div>
              </div>

              {/* Action Links */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-3 text-xs font-bold">
                {isInTransit ? (
                  <button
                    onClick={() => navigate(`/qc/track/${ord.id}`)}
                    className="px-3.5 py-1.5 bg-[#008F6B] text-white rounded-lg hover:bg-[#0F6B3A] transition-colors"
                  >
                    Track Order
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/qc/track/${ord.id}`)}
                    className="text-[#008F6B] hover:underline"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
