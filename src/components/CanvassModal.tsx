import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  FileCheck,
  Building,
  Building2,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { CanvassSlip } from '../types';
import { formatPeso } from '../utils/currency';

interface CanvassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slip: CanvassSlip) => void;
}

export const CanvassModal: React.FC<CanvassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { canvass, updateCanvassQty, removeFromCanvass, clearCanvass, generateCanvassSlip } =
    useInventory();

  const [companyName, setCompanyName] = useState('7 Stars School and Office Supplies Depot');
  const [customerName, setCustomerName] = useState('');
  const [departmentOrCompany, setDepartmentOrCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Selling Price total only (Buying price is strictly omitted from customer view)
  const grandTotal = canvass.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (canvass.length === 0) {
      setError('Please add at least one item to your canvass list.');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your name or the canvasser name.');
      return;
    }

    const newSlip = generateCanvassSlip({
      companyName,
      customerName,
      departmentOrCompany: departmentOrCompany || 'General Department',
      notes,
    });

    if (newSlip) {
      onSuccess(newSlip);
      onClose();
    }
  };

  return (
    <div
      id="canvass-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="canvass-modal"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                7 Stars School and Office Supplies Depot
              </span>
              <h3 className="text-base font-bold text-white">Price Canvass Sheet</h3>
              <p className="text-xs text-slate-400">
                {canvass.length} item{canvass.length !== 1 ? 's' : ''} in your active canvass quotation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Canvass Items Table / List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Canvassed Items ({canvass.length})
              </label>
              {canvass.length > 0 && (
                <button
                  type="button"
                  onClick={clearCanvass}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {canvass.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Your Canvass is Empty</p>
                <p className="text-xs text-slate-400 mt-1">
                  Browse the office supplies catalog and click "Add to Canvass" on the items you want quoted.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {canvass.map(item => {
                  const lineTotal = item.sellingPrice * item.quantity;

                  return (
                    <div
                      key={item.itemId}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {item.genericName}
                          </span>
                          {item.brand && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {item.brand}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400">
                            {item.sku}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                          <span>Unit: <strong className="text-slate-700">{item.unit}</strong></span>
                          <span>Price: <strong className="text-slate-800 font-mono">{formatPeso(item.sellingPrice)}</strong></span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.description}</p>
                        )}
                      </div>

                      {/* Quantity Stepper & Price Line Total (No buying price) */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateCanvassQty(item.itemId, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCanvassQty(item.itemId, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {formatPeso(lineTotal)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCanvass(item.itemId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canvass.length > 0 && (
              <div className="mt-3 flex justify-end">
                <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-right">
                  <span className="text-xs text-slate-500 mr-2">Estimated Canvass Total:</span>
                  <span className="font-mono font-black text-base text-blue-700">
                    {formatPeso(grandTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Canvass Information Details */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Canvass Details & Quotation Info
            </span>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="canvass-company-name">
                Company Name (Supplier / Depot)
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-blue-600 absolute left-3 top-2.5" />
                <input
                  id="canvass-company-name"
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="7 Stars School and Office Supplies Depot"
                  className="w-full pl-9 pr-3 py-2 border border-blue-200 bg-blue-50/50 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Official company depot issuing this canvass voucher</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="canvass-cust-name">
                  Canvassed By / Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="canvass-cust-name"
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g., Jennifer Cruz"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="canvass-company">
                  Department / School / Client Organization
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="canvass-company"
                    type="text"
                    value={departmentOrCompany}
                    onChange={e => setDepartmentOrCompany(e.target.value)}
                    placeholder="e.g., San Juan Elementary / Accounting"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="canvass-notes">
                Notes / Purpose
              </label>
              <input
                id="canvass-notes"
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Supplies estimation for Q3 / School term"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={canvass.length === 0}
              id="generate-canvass-btn"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Generate Canvass Sheet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
