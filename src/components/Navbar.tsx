import React from 'react';
import { Package, ShieldCheck, FileText, User, LogOut, CheckCircle2, Store, Star, Lock } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SevenStarsMark } from './Logo';

interface NavbarProps {
  currentView: 'customer' | 'admin';
  setCurrentView: (view: 'customer' | 'admin') => void;
  onOpenCanvass: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenCanvass,
  onOpenLogin,
}) => {
  const { canvass, isAdmin, adminUsername, adminLogout, isCentralSyncActive } = useInventory();
  const totalCanvassCount = canvass.reduce((sum, item) => sum + item.quantity, 0);

  const handleAdminClick = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      onOpenLogin();
    }
  };

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-slate-950/98 backdrop-blur-md border-b border-blue-900/60 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Official 7-Stars Rosette Emblem */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md border border-blue-500/50 p-1 shrink-0">
              <SevenStarsMark size={32} strokeColor="#38bdf8" strokeWidth={3.8} />
            </div>

            <div className="min-w-0">
              {/* Mobile compact title */}
              <div className="sm:hidden">
                <div className="font-black text-sm tracking-tight text-white flex items-center gap-1 truncate">
                  <span className="text-blue-400 font-extrabold">7 Stars</span>
                  <span className="text-slate-100">Depot</span>
                </div>
                <p className="text-[10px] text-blue-200/70 truncate">Price Canvass and Inventory</p>
              </div>

              {/* Tablet/Desktop full title matching official logo */}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1 flex-wrap font-black text-sm sm:text-base tracking-tight leading-none">
                  <span className="text-red-500 font-extrabold">7</span>
                  <span className="text-blue-400 font-extrabold">Stars</span>
                  <span className="text-red-500 font-extrabold">School</span>
                  <span className="text-blue-400 font-extrabold">and</span>
                  <span className="text-red-500 font-extrabold">Office</span>
                  <span className="text-blue-400 font-extrabold">Supplies</span>
                  <span className="text-red-500 font-extrabold">Depot</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-[11px] text-blue-200/70">
                    Price Canvass and Inventory
                  </p>
                  <span className="text-slate-500">•</span>
                  <span className="text-[10px] italic text-blue-300/80 font-medium">
                    ---
                  </span>
                  {isCentralSyncActive && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9.5px] font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      --
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Center Navigation Switcher (Hidden on mobile, shown on md and above) */}
          <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              id="nav-customer-view-btn"
              onClick={() => setCurrentView('customer')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentView === 'customer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4 text-blue-300" />
              <span>Customer View</span>
            </button>

            <button
              id="nav-admin-view-btn"
              onClick={handleAdminClick}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-red-300" />
              <span>Admin Portal</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Admin Logged In" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </span>
              )}
            </button>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Canvass Button */}
            {currentView === 'customer' && (
              <button
                id="open-canvass-btn"
                onClick={onOpenCanvass}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-red-600/30 transition-all cursor-pointer border border-red-500/50"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Canvass</span>
                {totalCanvassCount > 0 ? (
                  <span className="bg-white text-red-700 text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.2 rounded-full shadow-xs">
                    {totalCanvassCount}
                  </span>
                ) : (
                  <span className="text-[11px] sm:text-xs text-red-200">(0)</span>
                )}
              </button>
            )}

            {/* Admin Status / Quick Login Button */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-800/80 text-blue-200 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{adminUsername}</span>
                </div>
                <button
                  id="admin-logout-btn"
                  onClick={() => {
                    adminLogout();
                    setCurrentView('customer');
                  }}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:border-red-800 border border-slate-700 text-slate-300 hover:text-red-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Logout from Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit Admin</span>
                </button>
              </div>
            ) : currentView === 'admin' ? (
              <button
                id="admin-login-header-btn"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Dedicated Mobile Navigation Segmented Control (Visible on phone/mobile screens) */}
        <div className="md:hidden pb-2.5 pt-1">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-900/95 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              id="mobile-nav-customer-btn"
              onClick={() => setCurrentView('customer')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'customer'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-blue-300" />
              <span>Customer View</span>
            </button>

            <button
              id="mobile-nav-admin-btn"
              onClick={handleAdminClick}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                currentView === 'admin'
                  ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-300" />
              <span>Admin Portal</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Logged In" />
              ) : (
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-0.5 ml-0.5">
                  <Lock className="w-2 h-2" />
                  <span>Lock</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
