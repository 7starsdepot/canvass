import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Check,
  FileText,
  Building,
  Tag,
  Package,
  Layers,
  Calendar,
  History,
  Trash2,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplyItem, CanvassSlip } from '../types';
import { CanvassModal } from './CanvassModal';
import { CanvassVoucher } from './CanvassVoucher';

export const CustomerView: React.FC = () => {
  const {
    supplies,
    canvass,
    savedCanvasses,
    addToCanvass,
    updateCanvassQty,
    deleteCanvassSlip,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [isCanvassModalOpen, setIsCanvassModalOpen] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<CanvassSlip | null>(null);
  const [customerTab, setCustomerTab] = useState<'catalog' | 'history'>('catalog');

  // Compute available unique brands for quick filter
  const brands = useMemo(() => {
    const set = new Set<string>();
    supplies.forEach(s => {
      if (s.brand && s.brand.trim()) {
        set.add(s.brand.trim());
      }
    });
    return Array.from(set).sort();
  }, [supplies]);

  // Filtered Supplies for Customer
  const filteredSupplies = useMemo(() => {
    return supplies.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (item.genericName && item.genericName.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.unit && item.unit.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q));

      const matchesBrand = selectedBrand === 'All' || item.brand === selectedBrand;

      return matchesSearch && matchesBrand;
    });
  }, [supplies, searchQuery, selectedBrand]);

  // Current active canvass statistics
  const totalCanvassItemsCount = canvass.reduce((sum, item) => sum + item.quantity, 0);
  const totalCanvassEstimatedAmount = canvass.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0
  );

  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold tracking-wide">
              CUSTOMER PORTAL
            </span>
            <span className="text-xs text-slate-400">Office Supplies Catalog</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Office Supplies Canvass & Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Browse available office supplies, compare rates, and create your price canvass quotation sheet.
          </p>
        </div>

        {/* Canvass Action Quick Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setCustomerTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                customerTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Catalog
            </button>
            <button
              onClick={() => setCustomerTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                customerTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Canvass History ({savedCanvasses.length})</span>
            </button>
          </div>

          <button
            id="view-canvass-btn"
            onClick={() => setIsCanvassModalOpen(true)}
            className="relative px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>My Canvass</span>
            {canvass.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-blue-800 text-[11px] font-black rounded-full">
                {canvass.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {customerTab === 'history' ? (
        /* Saved Canvass History Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Previously Generated Canvass Slips</span>
            </h2>
            <span className="text-xs text-slate-500">{savedCanvasses.length} record(s)</span>
          </div>

          {savedCanvasses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Canvass Slips Recorded Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add supplies to your canvass from the catalog and click "Generate Canvass Sheet".
              </p>
              <button
                onClick={() => setCustomerTab('catalog')}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Browse Supplies Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedCanvasses.map(slip => (
                <div
                  key={slip.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold">
                      {slip.canvassNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(slip.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{slip.customerName}</h3>
                    <p className="text-xs text-slate-500">{slip.departmentOrCompany}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Items Canvassed:</span>
                      <strong className="text-slate-800">{slip.items.length} items</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Estimated Value:</span>
                      <strong className="text-blue-700 font-mono font-bold">
                        ${slip.totalAmount.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => deleteCanvassSlip(slip.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete saved canvass"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setActiveVoucher(slip)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Print Slip</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Catalog Tab */
        <div className="space-y-4">
          {/* Search and Brand Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="customer-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search supplies by Generic Name, Brand, Description, Unit, or SKU..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {brands.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-medium text-slate-500 shrink-0">Brand:</span>
                <button
                  onClick={() => setSelectedBrand('All')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    selectedBrand === 'All'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {brands.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                      selectedBrand === b
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Catalog Grid */}
          {supplies.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800">Inventory Catalog is Empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No office supplies have been added or imported into the catalog yet. Please check back later or contact your administrator.
              </p>
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-sm font-semibold text-slate-700">No items matched your search query</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBrand('All');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                Clear Search & Brand Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSupplies.map(item => {
                const isOutOfStock = item.stock <= 0;
                const canvassedItem = canvass.find(c => c.itemId === item.id);
                const quantityInCanvass = canvassedItem?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    id={`customer-item-${item.sku}`}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Top row: Brand badge & SKU */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {item.brand ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold tracking-wide">
                            {item.brand}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-[11px]">
                            Generic
                          </span>
                        )}

                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          {item.sku}
                        </span>
                      </div>

                      {/* Generic Name */}
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {item.genericName || item.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2" title={item.description}>
                        {item.description || 'Standard office supply specifications.'}
                      </p>

                      {/* Unit & Stock Status (Strictly no buying price!) */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          Unit: <strong className="text-slate-900 font-semibold">{item.unit}</strong>
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-600'
                              : item.stock <= 10
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : `${item.stock} Available`}
                        </span>
                      </div>
                    </div>

                    {/* Price & Add to Canvass Control (Selling price ONLY) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                          Selling Price
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                          ${item.sellingPrice.toFixed(2)}
                        </span>
                      </div>

                      {quantityInCanvass > 0 ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl p-1">
                          <button
                            onClick={() => updateCanvassQty(item.id, quantityInCanvass - 1)}
                            className="w-7 h-7 rounded-lg bg-white text-blue-700 flex items-center justify-center hover:bg-blue-100 font-bold"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-blue-950">
                            {quantityInCanvass}
                          </span>
                          <button
                            onClick={() => updateCanvassQty(item.id, quantityInCanvass + 1)}
                            className="w-7 h-7 rounded-lg bg-white text-blue-700 flex items-center justify-center hover:bg-blue-100 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCanvass(item, 1)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Canvass</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Bottom Floating Canvass Summary Bar when canvass has items */}
          {canvass.length > 0 && (
            <div className="sticky bottom-4 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Active Price Canvass</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 font-mono">
                      {totalCanvassItemsCount} item{totalCanvassItemsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Does not modify admin inventory • Standalone quotation estimate
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Estimated Total</span>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                    ${totalCanvassEstimatedAmount.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => setIsCanvassModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Review & Generate Canvass</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvass Details Modal */}
      <CanvassModal
        isOpen={isCanvassModalOpen}
        onClose={() => setIsCanvassModalOpen(false)}
        onSuccess={slip => {
          setActiveVoucher(slip);
        }}
      />

      {/* Printable Canvass Voucher */}
      <CanvassVoucher
        slip={activeVoucher}
        onClose={() => setActiveVoucher(null)}
      />
    </div>
  );
};
