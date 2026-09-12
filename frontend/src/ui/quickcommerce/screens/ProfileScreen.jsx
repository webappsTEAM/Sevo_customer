import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovedImage } from '../../../assets/ApprovedImage.jsx';
import { AddressSelectionSheet } from '../components/AddressSelectionSheet.jsx';
import {
  ShoppingBag,
  MapPin,
  Heart,
  Repeat,
  Wallet,
  Headphones,
  Settings,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';

export function ProfileScreen() {
  const navigate = useNavigate();
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  const profile = (() => {
    try {
      const saved = localStorage.getItem('sevo_customer_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Vignesh G',
      email: 'vignesh.g@company.com',
      phone: '+91 98765 43210',
    };
  })();

  const menuItems = [
    { label: 'My Orders', icon: ShoppingBag, action: () => navigate('/qc/orders') },
    { label: 'Addresses', icon: MapPin, action: () => setAddressSheetOpen(true) },
    { label: 'Saved Items', icon: Heart, action: () => navigate('/qc/search') },
    { label: 'Subscriptions', icon: Repeat, action: () => alert('SEVO Subscriptions active') },
    { label: 'Wallet & Offers', icon: Wallet, action: () => alert('Wallet Balance: ₹250.00') },
    { label: 'Support', icon: Headphones, action: () => alert('Connecting to 24x7 Customer Support...') },
    { label: 'Settings', icon: Settings, action: () => alert('Settings & Preferences') },
  ];

  const handleLogout = () => {
    localStorage.removeItem('sevo_customer_token');
    navigate('/qc/auth');
  };

  return (
    <div className="w-full flex flex-col bg-[#FFFFFF] min-h-screen text-[#17212B] pb-24">
      {/* ── User Header (matching image1.png Screen 12) ─────────────────── */}
      <div className="px-6 pt-6 pb-5 bg-gradient-to-b from-[#F8F7F1] to-white border-b border-slate-100 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md">
          <ApprovedImage
            assetId="user-avatar"
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-[#17212B]">{profile.name}</h2>
          <p className="text-xs text-[#667280]">{profile.email}</p>
          <span className="inline-block mt-1 text-[10px] font-bold text-[#008F6B] bg-[#E8F5EF] px-2 py-0.5 rounded-full">
            Verified Customer
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Menu List (matching image1.png Screen 12) ───────────────────── */}
        <div className="bg-white rounded-2xl border border-[#DDE4E0] divide-y divide-slate-100 shadow-xs">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                onClick={item.action}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F8F7F1] flex items-center justify-center text-[#17212B]">
                    <Icon className="w-4 h-4 text-[#008F6B]" />
                  </div>
                  <span className="text-xs font-bold text-[#17212B]">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#667280]" />
              </div>
            );
          })}
        </div>

        {/* ── Promotional Membership Card (matching image1.png Screen 12) ─── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>SEVO Plus</span>
            </div>
            <p className="text-[11px] text-amber-800 font-medium mt-0.5 max-w-[220px]">
              Save more with subscriptions and priority 10m delivery
            </p>
          </div>
          <button
            onClick={() => alert('Plus Membership benefits activated!')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Upgrade
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <AddressSelectionSheet
        isOpen={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
      />
    </div>
  );
}
