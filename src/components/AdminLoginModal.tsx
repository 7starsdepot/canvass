import React, { useState } from 'react';
import { User, Key, X, AlertCircle, ShieldCheck, Eye, EyeOff, Star } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SevenStarsMark } from './Logo';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { adminLogin } = useInventory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = adminLogin(username, password);
    if (success) {
      setUsername('');
      setPassword('');
      onSuccess();
      onClose();
    } else {
      setError('Invalid username or password. Please check your credentials and try again.');
    }
  };

  return (
    <div id="admin-login-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div
        id="admin-login-modal-card"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 px-6 py-5 text-white flex items-center justify-between border-b border-blue-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md border border-blue-500/50 p-1 shrink-0">
              <SevenStarsMark size={32} strokeColor="#38bdf8" strokeWidth={3.8} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs flex items-center gap-0.5">
                  <span className="text-red-500">7</span>
                  <span className="text-blue-400">Stars</span>
                  <span className="text-slate-300">Depot</span>
                </span>
                <span className="text-[11px] text-slate-400">• Authorization</span>
              </div>
              <h3 className="text-base font-bold text-white">Administrator Access</h3>
              <p className="text-xs text-blue-200/70">Inventory & Pricing Control Portal</p>
            </div>
          </div>
          <button
            id="close-admin-login-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="admin-username-input">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="admin-username-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="admin-password-input">
                Admin Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="submit-admin-login-btn"
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-md hover:shadow-red-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer border border-red-500/50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Authorize & Enter Admin Portal</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
