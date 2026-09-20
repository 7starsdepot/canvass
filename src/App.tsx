import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Navbar } from './components/Navbar';
import { CustomerView } from './components/CustomerView';
import { AdminView } from './components/AdminView';
import { CanvassModal } from './components/CanvassModal';
import { CanvassVoucher } from './components/CanvassVoucher';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CanvassSlip } from './types';
import { Lock, Key } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAdmin } = useInventory();

  const [currentView, setCurrentView] = useState<'customer' | 'admin'>('customer');
  const [isCanvassOpen, setIsCanvassOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<CanvassSlip | null>(null);

  const handleOpenCanvass = () => setIsCanvassOpen(true);
  const handleCloseCanvass = () => setIsCanvassOpen(false);

  const handleOpenLogin = () => setIsLoginOpen(true);
  const handleCloseLogin = () => setIsLoginOpen(false);

  const handleLoginSuccess = () => {
    setCurrentView('admin');
  };

  const handleCanvassGenerated = (newSlip: CanvassSlip) => {
    setActiveVoucher(newSlip);
  };

  const handleCloseVoucher = () => {
    setActiveVoucher(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={view => {
          if (view === 'admin' && !isAdmin) {
            setIsLoginOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        onOpenCanvass={handleOpenCanvass}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'customer' ? (
          <CustomerView />
        ) : isAdmin ? (
          <AdminView />
        ) : (
          /* Locked Admin Gateway fallback if user navigates to admin without session */
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mx-auto mb-4 border border-slate-200">
              <Lock className="w-6 h-6 text-slate-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Admin Authentication Required</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Access to inventory levels, buying costs, Excel upload, and selling prices requires administrator authorization.
            </p>

            <button
              onClick={handleOpenLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Sign In to Admin Portal</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="print:hidden bg-white border-t border-slate-200 py-6 text-slate-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Office Supplies Inventory</span>
            <span>•</span>
            <span>Customer Canvass & Inventory Pricing</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Customer View: Price Canvass Quotation</span>
            <span>•</span>
            <span>Authorized Administrator Access Only</span>
          </div>
        </div>
      </footer>

      {/* Canvass Details Modal */}
      <CanvassModal
        isOpen={isCanvassOpen}
        onClose={handleCloseCanvass}
        onSuccess={handleCanvassGenerated}
      />

      {/* Printable / Downloadable Canvass Voucher */}
      <CanvassVoucher
        slip={activeVoucher}
        onClose={handleCloseVoucher}
      />

      {/* Admin Login Dialog */}
      <AdminLoginModal
        isOpen={isLoginOpen}
        onClose={handleCloseLogin}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <MainAppContent />
    </InventoryProvider>
  );
}
