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
  ShoppingBag,
  Printer,
  X,
  Filter,
  Star,
  AlertTriangle,
  AlertCircle,
  Mail,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplyItem, CanvassSlip } from '../types';
import { formatPeso } from '../utils/currency';
import { SevenStarsMark } from './Logo';
import { OutOfStockEmailModal } from './OutOfStockEmailModal';
import { AddUnlistedItemModal } from './AddUnlistedItemModal';
import { DEPOT_EMAIL, OutOfStockEmailPayload } from '../utils/outOfStockEmail';

interface CustomerViewProps {
  onOpenCanvass?: () => void;
  onViewVoucher?: (slip: CanvassSlip) => void;
  onOpenAdmin?: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  onOpenCanvass,
  onViewVoucher,
  onOpenAdmin,
}) => {
  const {
    supplies,
    canvass,
    savedCanvasses,
    addToCanvass,
    updateCanvassQty,
    deleteCanvassSlip,
    lastRecordedTime,
    isCentralSyncActive,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customerTab, setCustomerTab] = useState<'catalog' | 'history'>('catalog');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalPayload, setEmailModalPayload] = useState<OutOfStockEmailPayload | null>(null);
  const [isAddUnlistedOpen, setIsAddUnlistedOpen] = useState(false);
  const [unlistedInitialName, setUnlistedInitialName] = useState('');

  const handleOpenAddUnlisted = (name = '') => {
    setUnlistedInitialName(name);
    setIsAddUnlistedOpen(true);
  };

  // Compute available unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    supplies.forEach(s => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [supplies]);

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
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.genericName && item.genericName.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.unit && item.unit.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q));

      const matchesBrand = selectedBrand === 'All' || item.brand === selectedBrand;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [supplies, searchQuery, selectedBrand, selectedCategory]);

  // Group supplies: In-stock items first, zero stock items at the lowest part
  const inStockSupplies = useMemo(() => {
    return filteredSupplies.filter(item => item.stock > 0);
  }, [filteredSupplies]);

  const zeroStockSupplies = useMemo(() => {
    return filteredSupplies.filter(item => item.stock <= 0);
  }, [filteredSupplies]);

  // Current active canvass statistics
  const totalCanvassItemsCount = canvass.reduce((sum, item) => sum + item.quantity, 0);
  const totalCanvassEstimatedAmount = canvass.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0
  );

  // Helper to render supply card
  const renderItemCard = (item: SupplyItem, isZeroStock: boolean) => {
    const canvassedItem = canvass.find(c => c.itemId === item.id);
    const quantityInCanvass = canvassedItem?.quantity || 0;

    return (
      <div
        key={item.id}
        id={`customer-item-${item.sku}`}
        className={`p-5 bg-white/95 rounded-2xl border transition-all flex flex-col justify-between ${
          isZeroStock
            ? 'border-red-200/90 hover:border-red-400 shadow-xs hover:shadow-red-500/10'
            : 'border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5'
        }`}
      >
        {/* Top row: Brand badge & SKU */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.brand ? (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold tracking-wide border border-slate-200">
                  <span className="text-slate-500 font-semibold mr-1">Brand:</span>
                  {item.brand}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-[11px] border border-slate-100">
                  <span className="text-slate-400 font-normal mr-1">Brand:</span>
                  Generic
                </span>
              )}

              {item.category && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-medium">
                  {item.category}
                </span>
              )}
            </div>

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

          {/* Unit & Stock Status (Strictly no buying price in customer view!) */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Unit: <strong className="text-slate-900 font-semibold">{item.unit}</strong>
            </span>

            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isZeroStock
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : item.stock <= 10
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isZeroStock ? '0 Available • Out of Stock' : `${item.stock} Available`}
            </span>
          </div>
        </div>

        {/* Price & Add to Canvass Control (Selling price ONLY) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
              Selling Price
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-900">
              {formatPeso(item.sellingPrice)}
            </span>
          </div>

          {quantityInCanvass > 0 ? (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl p-1">
              <button
                onClick={() => updateCanvassQty(item.id, quantityInCanvass - 1)}
                className="w-7 h-7 rounded-lg bg-white text-red-700 flex items-center justify-center hover:bg-red-100 font-bold transition-colors cursor-pointer"
                title="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-red-950">
                {quantityInCanvass}
              </span>
              <button
                onClick={() => updateCanvassQty(item.id, quantityInCanvass + 1)}
                className="w-7 h-7 rounded-lg bg-white text-red-700 flex items-center justify-center hover:bg-red-100 font-bold transition-colors cursor-pointer"
                title="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCanvass(item, 1)}
              className={`px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isZeroStock
                  ? 'bg-slate-700 hover:bg-slate-600'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isZeroStock ? 'Canvass Item' : 'Add to Canvass'}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Detect orders that contain out-of-stock items
  const outOfStockSlips = useMemo(() => {
    return savedCanvasses.filter(slip =>
      slip.items.some(it => {
        const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
        return sp ? sp.stock <= 0 : false;
      })
    );
  }, [savedCanvasses, supplies]);

  const handleEmailForSlip = (slip: CanvassSlip) => {
    const slipOutOfStockItems = slip.items
      .filter(it => {
        const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
        return sp ? sp.stock <= 0 : false;
      })
      .map(it => {
        const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
        return {
          genericName: it.genericName,
          brand: it.brand,
          sku: it.sku,
          unit: it.unit,
          quantity: it.quantity,
          sellingPrice: it.sellingPrice,
          currentStock: sp?.stock || 0,
        };
      });

    if (slipOutOfStockItems.length === 0) return;

    setEmailModalPayload({
      toEmail: DEPOT_EMAIL,
      orderNumber: slip.canvassNumber,
      customerName: slip.customerName,
      departmentOrCompany: slip.departmentOrCompany,
      notes: slip.notes,
      items: slipOutOfStockItems,
      source: 'customer_order',
    });
    setIsEmailModalOpen(true);
  };

  const handleEmailAllOutOfStockOrders = () => {
    const ordersWithOutOfStock = savedCanvasses
      .map(slip => {
        const items = slip.items
          .filter(it => {
            const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
            return sp ? sp.stock <= 0 : false;
          })
          .map(it => {
            const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
            return {
              genericName: it.genericName,
              brand: it.brand,
              sku: it.sku,
              unit: it.unit,
              quantity: it.quantity,
              sellingPrice: it.sellingPrice,
              currentStock: sp?.stock || 0,
            };
          });
        return {
          orderNumber: slip.canvassNumber,
          customerName: slip.customerName,
          departmentOrCompany: slip.departmentOrCompany,
          notes: slip.notes,
          createdAt: slip.createdAt,
          items,
        };
      })
      .filter(o => o.items.length > 0);

    if (ordersWithOutOfStock.length === 0) return;

    const allItems = ordersWithOutOfStock.flatMap(o => o.items);

    setEmailModalPayload({
      toEmail: DEPOT_EMAIL,
      items: allItems,
      orders: ordersWithOutOfStock,
      source: 'multiple_orders',
    });
    setIsEmailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Customer Header Banner (Blue & Red Theme) */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 text-white p-5 sm:p-6 rounded-2xl border border-blue-900/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold tracking-wide">
                CUSTOMER PORTAL
              </span>
              <span className="text-xs text-red-300 flex items-center gap-1.5 font-semibold">
                <SevenStarsMark size={18} strokeColor="#60a5fa" strokeWidth={3.8} />
                <span className="text-red-400 font-bold">7 Stars</span>
                <span className="text-slate-300">School & Office Supplies Depot</span>
              </span>
            </div>
            {onOpenAdmin && (
              <button
                id="banner-admin-portal-btn"
                onClick={onOpenAdmin}
                className="px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 border border-red-400/50 shadow-sm cursor-pointer transition-all"
                title="Switch to Admin Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </button>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Price Canvass and Inventory
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Browse available stock, request price quotes, and generate an official printable canvass voucher.
            </p>
            {supplies.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/30">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                <span>{supplies.length} items live from central catalog</span>
              </span>
            )}
            {isCentralSyncActive && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>--</span>
              </span>
            )}
          </div>
        </div>

        {/* Canvass Action Quick Button */}
        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setCustomerTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                customerTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Catalog
            </button>
            <button
              onClick={() => setCustomerTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
            id="customer-add-unlisted-btn"
            onClick={() => handleOpenAddUnlisted()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-amber-400/40"
            title="Add unlisted supply items to your price canvass quotation"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span className="hidden sm:inline">Add</span> Unlisted Item
          </button>

          <button
            id="view-canvass-btn"
            onClick={onOpenCanvass}
            className="relative px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer border border-red-500/50"
          >
            <FileText className="w-4 h-4" />
            <span>My Canvass</span>
            {canvass.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-red-800 text-[11px] font-black rounded-full">
                {canvass.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {customerTab === 'history' ? (
        /* Saved Canvass History Tab */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Previously Generated Canvass Slips & Orders</span>
              </h2>
              <span className="text-xs text-slate-500">
                {savedCanvasses.length} record(s) • {outOfStockSlips.length} order(s) have out-of-stock items
              </span>
            </div>

            {outOfStockSlips.length > 0 && (
              <button
                onClick={handleEmailAllOutOfStockOrders}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer border border-red-500/50 self-start sm:self-auto"
                title={`Send an email to ${DEPOT_EMAIL} for all orders containing out-of-stock items`}
              >
                <Mail className="w-4 h-4" />
                <span>Email All Out-of-Stock Orders to {DEPOT_EMAIL}</span>
              </button>
            )}
          </div>

          {/* Out of Stock Alert Banner across orders */}
          {outOfStockSlips.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <strong className="text-red-950 font-bold block text-sm">
                    {outOfStockSlips.length} Order{outOfStockSlips.length !== 1 ? 's' : ''} with Out-of-Stock Supplies Detected
                  </strong>
                  <span className="text-red-800 text-xs">
                    You can notify <strong>{DEPOT_EMAIL}</strong> to request warehouse stock procurement for these items.
                  </span>
                </div>
              </div>
              <button
                onClick={handleEmailAllOutOfStockOrders}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Notify Depot ({outOfStockSlips.length} orders)</span>
              </button>
            </div>
          )}

          {savedCanvasses.length === 0 ? (
            <div className="p-12 text-center bg-white/95 rounded-2xl border border-slate-200">
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
              {savedCanvasses.map(slip => {
                const slipOutOfStockItems = slip.items
                  .filter(it => {
                    const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
                    return sp ? sp.stock <= 0 : false;
                  })
                  .map(it => {
                    const sp = supplies.find(s => s.id === it.itemId || s.sku === it.sku);
                    return {
                      genericName: it.genericName,
                      brand: it.brand,
                      sku: it.sku,
                      unit: it.unit,
                      quantity: it.quantity,
                      sellingPrice: it.sellingPrice,
                      currentStock: sp?.stock || 0,
                    };
                  });
                const hasOutOfStock = slipOutOfStockItems.length > 0;

                return (
                  <div
                    key={slip.id}
                    className={`p-5 bg-white/95 rounded-2xl border shadow-xs hover:border-blue-300 transition-all space-y-3 ${
                      hasOutOfStock ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
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
                        <strong className="text-red-700 font-mono font-bold">
                          {formatPeso(slip.totalAmount)}
                        </strong>
                      </div>
                    </div>

                    {/* Out of Stock Warning & Quick Email Action inside Order Card */}
                    {hasOutOfStock && (
                      <div className="p-2.5 bg-red-50/80 rounded-xl border border-red-200 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="text-red-950 font-bold truncate">
                            {slipOutOfStockItems.length} item{slipOutOfStockItems.length !== 1 ? 's' : ''} out of stock
                          </span>
                        </div>
                        <button
                          onClick={() => handleEmailForSlip(slip)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title={`Email ${DEPOT_EMAIL} regarding out-of-stock items in ${slip.canvassNumber}`}
                        >
                          <Mail className="w-3 h-3" />
                          <span>Email Depot</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() => deleteCanvassSlip(slip.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete saved canvass"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2">
                        {hasOutOfStock && (
                          <button
                            onClick={() => handleEmailForSlip(slip)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={`Send email to ${DEPOT_EMAIL}`}
                          >
                            <Mail className="w-3.5 h-3.5 text-red-600" />
                            <span className="hidden sm:inline">Email Depot</span>
                          </button>
                        )}
                        <button
                          onClick={() => onViewVoucher && onViewVoucher(slip)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Open and print this official canvass sheet"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Canvass Sheet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Catalog Tab */
        <div className="space-y-4">
          {/* Global Search and Category / Brand Filters */}
          <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
            {/* Main Search Bar Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 sm:top-2.5 pointer-events-none" />
                <input
                  id="customer-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search supplies by item name, category, brand, SKU, description..."
                  className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Dropdown */}
              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 hidden md:inline">Category:</span>
                  <select
                    id="customer-category-select"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    aria-label="Filter by category"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer w-full sm:w-auto"
                  >
                    <option value="All">All Categories ({supplies.length})</option>
                    {categories.map(cat => {
                      const count = supplies.filter(s => s.category === cat).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Quick Add Unlisted Supply Item Button */}
              <button
                type="button"
                id="customer-search-add-unlisted-btn"
                onClick={() => handleOpenAddUnlisted(searchQuery)}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                title="Add unlisted supply not found in catalog"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Add Unlisted</span>
              </button>
            </div>

            {/* Quick Filter Badges & Search Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {/* Brand Pills */}
              {brands.length > 0 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-red-500" />
                    Brands:
                  </span>
                  <button
                    onClick={() => setSelectedBrand('All')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                      selectedBrand === 'All'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {brands.map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedBrand(b)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                        selectedBrand === b
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              ) : (
                <div />
              )}

              {/* Status and Active Filter Reset */}
              <div className="flex items-center justify-between md:justify-end gap-3 text-slate-500 shrink-0">
                <span>
                  Showing <strong className="text-slate-800 font-bold">{filteredSupplies.length}</strong> of{' '}
                  <strong className="text-slate-800">{supplies.length}</strong> items
                  {zeroStockSupplies.length > 0 && (
                    <span className="text-red-600 ml-1.5 font-medium text-[11px]">
                      ({zeroStockSupplies.length} with 0 stock at bottom)
                    </span>
                  )}
                </span>

                {(searchQuery || selectedBrand !== 'All' || selectedCategory !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedBrand('All');
                      setSelectedCategory('All');
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 underline flex items-center gap-1 cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Catalog Grid */}
          {supplies.length === 0 ? (
            <div className="p-12 text-center bg-white/95 rounded-2xl border border-slate-200 shadow-xs">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800">Inventory Catalog is Empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No office supplies have been added or imported into the catalog yet. Please check back later or contact your administrator.
              </p>
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-white/95 rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No items matched your search</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? `Can't find "${searchQuery}" in our price list? You can add it directly as an unlisted special request to your canvass quotation!`
                  : 'No office supplies matched the selected filters.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  id="customer-empty-add-unlisted-btn"
                  onClick={() => handleOpenAddUnlisted(searchQuery)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-amber-400/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add {searchQuery ? `"${searchQuery}"` : 'Unlisted Item'} to Canvass</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBrand('All');
                    setSelectedCategory('All');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Part 1: Available / In-Stock Supplies (stock > 0) */}
              {inStockSupplies.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>Available In-Stock Supplies</span>
                      <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {inStockSupplies.length} items
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inStockSupplies.map(item => renderItemCard(item, false))}
                  </div>
                </div>
              )}

              {/* Part 2: Zero Stock Supplies (stock <= 0) displayed on the lowest part */}
              {zeroStockSupplies.length > 0 && (
                <div id="zero-stock-inventory-section" className="pt-6 border-t-2 border-dashed border-red-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-200 p-3.5 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-red-950 text-sm flex items-center gap-2">
                          <span>Out of Stock Supplies (0 Stock)</span>
                          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                            {zeroStockSupplies.length} item{zeroStockSupplies.length > 1 ? 's' : ''}
                          </span>
                        </h4>
                        <p className="text-[11px] text-red-700 font-medium">
                          These supplies currently have zero inventory and are placed at the lowest part of the catalog.
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-red-800 bg-white/80 px-2.5 py-1 rounded-lg border border-red-200 self-start sm:self-auto">
                      Available for Canvass Quotation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {zeroStockSupplies.map(item => renderItemCard(item, true))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sticky Bottom Floating Canvass Summary Bar when canvass has items */}
          {canvass.length > 0 && (
            <div className="sticky bottom-4 z-40 bg-slate-950/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Active Price Canvass</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono border border-red-500/30">
                      {totalCanvassItemsCount} item{totalCanvassItemsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Official Quotation estimate • Does not alter admin inventory
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Estimated Total</span>
                  <span className="text-base sm:text-lg font-black font-mono text-red-400">
                    {formatPeso(totalCanvassEstimatedAmount)}
                  </span>
                </div>

                <button
                  onClick={onOpenCanvass}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-red-500/50"
                >
                  <FileText className="w-4 h-4" />
                  <span>Review & Generate Canvass</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Admin Access Card for Mobile/Desktop */}
      {onOpenAdmin && (
        <div className="bg-slate-900/90 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">7 Stars Depot Management</h4>
              <p className="text-[11px] text-slate-400">Authorized personnel can access pricing, inventory levels, and order fulfillment.</p>
            </div>
          </div>
          <button
            onClick={onOpenAdmin}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Open Admin Portal</span>
          </button>
        </div>
      )}

      {/* Out of Stock Email Notification Modal */}
      <OutOfStockEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        payload={emailModalPayload}
      />

      {/* Add Unlisted Supply Item Modal */}
      <AddUnlistedItemModal
        isOpen={isAddUnlistedOpen}
        onClose={() => setIsAddUnlistedOpen(false)}
        initialName={unlistedInitialName}
      />
    </div>
  );
};
