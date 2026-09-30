import React, { useState, useEffect } from 'react';
import { X, Save, PhilippinePeso, Package, AlertCircle, Star } from 'lucide-react';
import { SupplyItem } from '../types';
import { formatPeso } from '../utils/currency';
import { SevenStarsMark } from './Logo';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<SupplyItem, 'id' | 'updatedAt'>, id?: string) => void;
  itemToEdit?: SupplyItem | null;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const [genericName, setGenericName] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [stock, setStock] = useState(25);
  const [sellingPrice, setSellingPrice] = useState(10.00);
  const [buyingPrice, setBuyingPrice] = useState(6.50);
  const [sku, setSku] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setGenericName(itemToEdit.genericName || itemToEdit.name);
      setBrand(itemToEdit.brand || '');
      setDescription(itemToEdit.description || '');
      setUnit(itemToEdit.unit || 'Piece');
      setStock(itemToEdit.stock);
      setSellingPrice(itemToEdit.sellingPrice);
      setBuyingPrice(itemToEdit.buyingPrice);
      setSku(itemToEdit.sku);
    } else {
      setGenericName('');
      setBrand('');
      setDescription('');
      setUnit('Piece');
      setStock(20);
      setSellingPrice(10.00);
      setBuyingPrice(6.50);
      setSku('SUP-' + Math.floor(100 + Math.random() * 900));
    }
    setError(null);
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  // Margin Calculations
  const unitProfit = sellingPrice - buyingPrice;
  const marginPercent = sellingPrice > 0 ? (unitProfit / sellingPrice) * 100 : 0;
  const markupPercent = buyingPrice > 0 ? (unitProfit / buyingPrice) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!genericName.trim()) {
      setError('Please provide the Generic Name of the supply item.');
      return;
    }
    if (!unit.trim()) {
      setError('Please specify the packaging Unit (e.g., Box, Ream, Piece).');
      return;
    }
    if (stock < 0) {
      setError('No. of Stock cannot be negative.');
      return;
    }
    if (sellingPrice < 0) {
      setError('Selling price cannot be negative.');
      return;
    }
    if (buyingPrice < 0) {
      setError('Buying price cannot be negative.');
      return;
    }

    const generatedSku = sku.trim() || `SUP-${Date.now().toString().slice(-4)}`;
    const fullName = brand.trim() ? `${brand.trim()} ${genericName.trim()}` : genericName.trim();

    onSave(
      {
        sku: generatedSku.toUpperCase(),
        genericName: genericName.trim(),
        brand: brand.trim(),
        name: fullName,
        description: description.trim(),
        unit: unit.trim(),
        stock: Number(stock),
        sellingPrice: Number(sellingPrice),
        buyingPrice: Number(buyingPrice),
        minStockLevel: 10,
      },
      itemToEdit ? itemToEdit.id : undefined
    );
    onClose();
  };

  return (
    <div
      id="item-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="item-form-modal"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header (Blue & Red Theme) */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 px-6 py-4 text-white flex items-center justify-between border-b border-blue-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md border border-blue-500/50 p-1 shrink-0">
              <SevenStarsMark size={28} strokeColor="#38bdf8" strokeWidth={3.8} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs flex items-center gap-0.5">
                  <span className="text-red-500">7</span>
                  <span className="text-blue-400">Stars</span>
                  <span className="text-slate-300">Depot</span>
                </span>
                <span className="text-[10px] text-slate-400">• Inventory Editor</span>
              </div>
              <h3 className="font-bold text-sm text-white">
                {itemToEdit ? 'Edit Supply Details & Prices' : 'Add New Office Supply Item'}
              </h3>
              <p className="text-[11px] text-blue-200/70">
                Configure Generic Name, Brand, Unit, Stock, and Selling & Buying Prices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Generic Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="generic-name">
                Generic Name *
              </label>
              <input
                id="generic-name"
                type="text"
                value={genericName}
                onChange={e => setGenericName(e.target.value)}
                placeholder="e.g. Ballpen 0.5mm, Copy Paper"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="brand">
                Brand
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Pilot, PaperOne, Faber-Castell"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed specifications, color, model, packaging details..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          {/* Unit & No. of Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="unit">
                Unit *
              </label>
              <input
                id="unit"
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="e.g. Box of 12, Ream, Piece, Pack"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="stock">
                No. of Stock *
              </label>
              <input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                required
                className={`w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 ${
                  stock === 0
                    ? 'border-red-300 bg-red-50/50 text-red-700 focus:ring-red-500'
                    : 'border-slate-300 text-slate-900 focus:ring-blue-600'
                }`}
              />
              {stock === 0 && (
                <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">
                  Zero stock items are placed at the lowest part of the inventory
                </span>
              )}
            </div>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="sku">
              SKU / Item Code
            </label>
            <input
              id="sku"
              type="text"
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="e.g. BAL-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Prices Section (Blue & Red Theme) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <PhilippinePeso className="w-3.5 h-3.5 text-blue-600" />
                Pricing Configuration (Admin Only)
              </span>
              {unitProfit < 0 && (
                <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                  Negative Margin
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1" htmlFor="buying-price">
                  Buying Price (₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                  <input
                    id="buying-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={buyingPrice}
                    onChange={e => setBuyingPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Purchase cost to store</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1" htmlFor="selling-price">
                  Selling Price (₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                  <input
                    id="selling-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Customer canvass rate</span>
              </div>
            </div>

            {/* Live Margin Calculation Widget */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-slate-500 text-[10px] block font-medium">Unit Profit</span>
                <span className={`font-bold ${unitProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {formatPeso(unitProfit)}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-slate-500 text-[10px] block font-medium">Gross Margin</span>
                <span className={`font-bold ${marginPercent >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {marginPercent.toFixed(1)}%
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-slate-500 text-[10px] block font-medium">Markup</span>
                <span className={`font-bold ${markupPercent >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {markupPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-item-btn"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-red-500/50"
            >
              <Save className="w-4 h-4" />
              <span>{itemToEdit ? 'Save Changes' : 'Add Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
