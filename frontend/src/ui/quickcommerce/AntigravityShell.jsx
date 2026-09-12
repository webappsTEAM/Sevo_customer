import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { QuickCartProvider, useQuickCart } from '../../state/QuickCartContext.jsx';
import { AntigravityBottomNav } from './components/AntigravityBottomNav.jsx';
import { WifiOff, RotateCcw } from 'lucide-react';

function UndoToastBanner() {
  const { undoState, restoreLastDeleted } = useQuickCart();
  if (!undoState) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto bg-[#17212B] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-fade-in border border-slate-700/50">
      <div className="text-xs">
        <span className="font-semibold text-slate-200">Removed</span>{' '}
        <span className="text-slate-400 truncate max-w-[170px] inline-block align-bottom">
          {undoState.item.title}
        </span>
      </div>
      <button
        onClick={restoreLastDeleted}
        className="flex items-center gap-1.5 bg-[#008F6B] hover:bg-[#0F6B3A] text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Undo
      </button>
    </div>
  );
}

function ShellLayout() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Screens that should hide the bottom nav (e.g. splash, onboarding, checkout, tracking)
  const hideBottomNavRoutes = ['/qc/splash', '/qc/onboarding', '/qc/checkout', '/qc/track'];
  const shouldHideBottomNav = hideBottomNavRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen bg-[#F8F7F1] text-[#17212B] flex flex-col font-sans antialiased selection:bg-[#E8F5EF] selection:text-[#008F6B]">
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Showing cached draft state.</span>
        </div>
      )}

      {/* Main Container constrained to Mobile viewport (max-w-md / 448px) */}
      <main className={`flex-1 w-full max-w-md mx-auto relative bg-[#FFFFFF] shadow-sm flex flex-col ${shouldHideBottomNav ? 'pb-4' : 'pb-20'}`}>
        <Outlet />
      </main>

      {/* Undo Toast */}
      <UndoToastBanner />

      {/* Persistent Bottom Nav */}
      {!shouldHideBottomNav && <AntigravityBottomNav />}
    </div>
  );
}

export function AntigravityShell() {
  return (
    <QuickCartProvider>
      <ShellLayout />
    </QuickCartProvider>
  );
}
