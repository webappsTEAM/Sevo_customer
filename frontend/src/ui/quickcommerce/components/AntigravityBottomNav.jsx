import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Search, ShoppingCart, User } from 'lucide-react';
import { useQuickCart } from '../../../state/QuickCartContext.jsx';

export function AntigravityBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { billDetails, badgeBounced } = useQuickCart();

  const navItems = [
    { label: 'Home', path: '/qc', icon: Home },
    { label: 'Categories', path: '/qc/categories', icon: LayoutGrid },
    { label: 'Search', path: '/qc/search', icon: Search },
    { label: 'Cart', path: '/qc/cart', icon: ShoppingCart, badge: billDetails.itemCount },
    { label: 'Profile', path: '/qc/profile', icon: User },
  ];

  const handleNav = (path) => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    navigate(path);
  };

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#DDE4E0] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] max-w-md mx-auto"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.path)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95 focus:outline-none ${
                isActive ? 'text-[#008F6B] font-semibold' : 'text-[#667280] font-normal hover:text-[#17212B]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {item.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 bg-[#008F6B] text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center ring-2 ring-white shadow-sm transition-transform duration-300 ${
                      badgeBounced ? 'scale-125 animate-bounce' : 'scale-100'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#008F6B] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
