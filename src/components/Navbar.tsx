import React from 'react';
import { Package, ShieldCheck, FileText, User, LogOut, CheckCircle2, Store, Star } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

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
  const { canvass, isAdmin, adminUsername, adminLogout } = useInventory();
  const totalCanvassCount = canvass.reduce((sum, item) => sum + item.quantity, 0);

  const handleAdminClick = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      onOpenLogin();
    }
  };

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-blue-900/60 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-md border-2 border-red-500 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-base sm:text-lg tracking-tight text-white whitespace-nowrap flex items-center gap-1">
                  <span className="text-red-500 font-extrabold flex items-center gap-0.5">
                    7 Stars School and Office Supplies Depot <Star className="w-3.5 h-3.5 fill-red-500 text-red-500 inline" />
                  </span>
                  <span className="hidden xs:inline">Supplies</span>
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 hidden sm:block">
                Catalog Canvass
              </p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              id="nav-customer-view-btn"
              onClick={() => setCurrentView('customer')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
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
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all relative ${
                currentView === 'admin'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-red-300" />
              <span>Admin Portal</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Authenticated" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Locked
                </span>
              )}
            </button>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {currentView === 'customer' ? (
              /* Canvass Button (Vibrant Red) */
              <button
                id="open-canvass-btn"
                onClick={onOpenCanvass}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-red-600/30 transition-all cursor-pointer border border-red-500/50"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Canvass</span>
                {totalCanvassCount > 0 ? (
                  <span className="bg-white text-red-700 text-xs font-black px-2 py-0.5 rounded-full shadow-xs">
                    {totalCanvassCount}
                  </span>
                ) : (
                  <span className="text-xs text-red-200">(0)</span>
                )}
              </button>
            ) : (
              /* Admin Status & Logout */
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:border-red-800 border border-slate-700 text-slate-300 hover:text-red-200 text-xs font-medium transition-colors cursor-pointer"
                      title="Logout from Admin"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Exit Admin</span>
                    </button>
                  </div>
                ) : (
                  <button
                    id="admin-login-header-btn"
                    onClick={onOpenLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
