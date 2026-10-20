import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Sparkles, HelpCircle, Lock } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SevenStarsMark } from './Logo';

interface AddUnlistedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onSuccess?: () => void;
}

const COMMON_UNITS = [
  'pc',
  'pack',
  'box',
  'ream',
  'roll',
  'set',
  'pad',
  'bottle',
  'tube',
  'pair',
  'cartridge',
  'bundle',
];

const OFFICE_CATEGORIES = [
  'School & Office Supplies',
  'Paper Products',
  'Writing Instruments',
  'Desk Accessories',
  'Filing & Storage',
  'Art & Craft Materials',
  'General Stationery',
];

export const AddUnlistedItemModal: React.FC<AddUnlistedItemModalProps> = ({
  isOpen,
  onClose,
  initialName = '',
  onSuccess,
}) => {
  const { addCustomUnlistedItem } = useInventory();

  const [genericName, setGenericName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('School & Office Supplies');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('pc');
  const [customUnit, setCustomUnit] = useState('');
  const [isOtherUnit, setIsOtherUnit] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customerNotes, setCustomerNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGenericName(initialName || '');
      setBrand('');
      setCategory('School & Office Supplies');
      setDescription('');
      setUnit('pc');
      setCustomUnit('');
      setIsOtherUnit(false);
      setQuantity(1);
      setCustomerNotes('');
      setError(null);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = genericName.trim();
    if (!cleanName) {
      setError('Please provide the generic or product name of the supply item.');
      return;
    }

    const finalUnit = isOtherUnit ? customUnit.trim() || 'pc' : unit;

    if (quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    // Customer can add item to Canvass Quotation, but cannot edit selling price, buying cost, or stock quantity.
    // Price will be officially quoted by Depot Admin in the Admin Portal.
    addCustomUnlistedItem({
      genericName: cleanName,
      brand: brand.trim() || undefined,
      description: `[${category}] ${description.trim() || 'School and office supply requirement'}`,
      unit: finalUnit,
      quantity,
      customerNotes: customerNotes.trim()
        ? `${customerNotes.trim()} • School & Office Supply (Depot Quotation Required)`
        : 'School & Office Supply • Depot Formal Quotation Required',
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlisted-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between border-b border-blue-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md border border-blue-500/50 p-1 shrink-0">
              <SevenStarsMark size={30} strokeColor="#38bdf8" strokeWidth={3.8} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Special Order
                </span>
                <span className="text-[11px] text-blue-200/80">Canvass Quotation</span>
              </div>
              <h3 id="unlisted-modal-title" className="font-bold text-base text-white">
                Add School & Office Item to Canvass
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Need school or office supplies that aren't on our price list? Enter the details below. We'll add them to your official quotation slip so <strong>7 Stars Depot</strong> can price and source them for you.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Generic / Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={genericName}
              onChange={e => setGenericName(e.target.value)}
              placeholder="e.g. Brother TN-2380 Toner, Cork Board 2x3ft, Heavy Duty Stapler..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium transition-all"
            />
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
              >
                {OFFICE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Preferred Brand / Make <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Epson, Faber-Castell, Pilot..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Unit & Packaging */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Unit of Measurement <span className="text-red-500">*</span>
            </label>
            {!isOtherUnit ? (
              <div className="flex gap-1.5">
                <select
                  value={unit}
                  onChange={e => {
                    if (e.target.value === 'OTHER') {
                      setIsOtherUnit(true);
                    } else {
                      setUnit(e.target.value);
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                >
                  {COMMON_UNITS.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="OTHER">Other / Custom...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                  placeholder="e.g. meter, gross, ream"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsOtherUnit(false);
                    setUnit('pc');
                  }}
                  className="px-2 py-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline shrink-0"
                >
                  Presets
                </button>
              </div>
            )}
          </div>

          {/* Description / Specifics */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description / Specifications <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 50 sheets/pack, 230gsm glossy, waterproof, black ink"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
            />
          </div>

          {/* Quantity Needed & Admin-Managed Pricing Notice */}
          <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Quantity Needed for Canvass <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Number of {isOtherUnit ? customUnit || 'units' : unit} to include in your canvass quotation
              </span>
            </div>

            {/* Admin Exclusive Control Notice */}
            <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Depot Selling Price, Buying Cost & Stock Control</span>
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Customers cannot edit the selling price, buying cost, or quantity of stock. These fields are exclusively set and updated by depot staff in the <strong>Admin Portal</strong>. This item will be placed on your canvass slip as <em>"To Be Quoted"</em> for formal pricing.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-white/90 px-2 py-1 rounded border border-blue-200 text-blue-900">
                  Selling Price: <strong>₱0.00 (Pending Quote)</strong>
                </div>
                <div className="bg-white/90 px-2 py-1 rounded border border-blue-200 text-blue-900">
                  Stock: <strong>Special Order</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Request Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Customer Note / Special Request <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={e => setCustomerNotes(e.target.value)}
              placeholder="e.g. Urgent requirement for school office, need confirmation of availability..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none"
            />
          </div>

          {/* Live Preview Card */}
          {genericName && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                Voucher Appearance Preview
              </span>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 truncate">
                      {brand ? `${brand} ` : ''}{genericName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                      Special Order
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Qty: <strong>{quantity} {isOtherUnit ? customUnit || 'unit' : unit}</strong> • Price: <strong className="text-slate-800 font-mono">For Depot Quotation</strong>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                    To Be Quoted
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Canvass Quotation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUnlistedItemModal;
