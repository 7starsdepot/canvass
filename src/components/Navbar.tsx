import React from 'react';
import { Package, ShieldCheck, FileText, User, LogOut, CheckCircle2, Store } from 'lucide-react';
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
    <header id="app-header" className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-semibold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                  7 Stars School and Office Supplies Depot
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Inventory & Canvass Quotation Manager
              </p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            <button
              id="nav-customer-view-btn"
              onClick={() => setCurrentView('customer')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentView === 'customer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Customer View</span>
            </button>

            <button
              id="nav-admin-view-btn"
              onClick={handleAdminClick}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${
                currentView === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
              {isAdmin ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Authenticated" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  Locked
                </span>
              )}
            </button>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {currentView === 'customer' ? (
              /* Canvass Button */
              <button
                id="open-canvass-btn"
                onClick={onOpenCanvass}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Canvass</span>
                {totalCanvassCount > 0 ? (
                  <span className="bg-white text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalCanvassCount}
                  </span>
                ) : (
                  <span className="text-xs text-blue-200">(0)</span>
                )}
              </button>
            ) : (
              /* Admin Status & Logout */
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{adminUsername}</span>
                    </div>
                    <button
                      id="admin-logout-btn"
                      onClick={() => {
                        adminLogout();
                        setCurrentView('customer');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
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
