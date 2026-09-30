import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Boxes,
  PhilippinePeso,
  TrendingUp,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  XCircle,
  RotateCcw,
  Star,
  AlertCircle,
  Check,
  X,
  Percent,
  SlidersHorizontal,
  ChevronDown,
  Mail,
  FileText,
  Calendar,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplyItem, CanvassSlip, CanvassItem } from '../types';
import { ItemFormModal } from './ItemFormModal';
import { ExcelUploadModal } from './ExcelUploadModal';
import { OutOfStockEmailModal } from './OutOfStockEmailModal';
import { OrderListDashboard } from './OrderListDashboard';
import { DEPOT_EMAIL, OutOfStockEmailPayload, OutOfStockItemDetail } from '../utils/outOfStockEmail';
import { formatPeso } from '../utils/currency';
import { exportLatestInventoryToExcel, exportLatestInventoryToCSV } from '../utils/exportInventory';

interface AdminViewProps {
  onViewVoucher?: (slip: CanvassSlip) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onViewVoucher }) => {
  const {
    supplies,
    addSupplyItem,
    updateSupplyItem,
    updatePrices,
    deleteSupplyItem,
    deleteMultipleSupplies,
    adjustStock,
    importExcelSupplies,
    clearAllSupplies,
    adminUsername,
    savedCanvasses,
    deleteCanvassSlip,
    lastRecordedTime,
    isCentralSyncActive,
  } = useInventory();

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<SupplyItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Quick Price Edit States (Inline Editing in Table)
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [tempBuyingPrice, setTempBuyingPrice] = useState<string>('');
  const [tempSellingPrice, setTempSellingPrice] = useState<string>('');

  // Dedicated Price Adjustment Modal state
  const [priceModalItem, setPriceModalItem] = useState<SupplyItem | null>(null);
  const [modalBuyingPrice, setModalBuyingPrice] = useState<number>(0);
  const [modalSellingPrice, setModalSellingPrice] = useState<number>(0);

  // Out of Stock Email Notification Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalPayload, setEmailModalPayload] = useState<OutOfStockEmailPayload | null>(null);

  // Tab & Order Search/Filter states
  const [adminTab, setAdminTab] = useState<'inventory' | 'orders'>('inventory');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'out_of_stock'>('all');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Orders with out of stock items calculation
  const analyzedOrders = useMemo(() => {
    return savedCanvasses.map(slip => {
      const outOfStockItems = slip.items
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
        slip,
        outOfStockItems,
        hasOutOfStock: outOfStockItems.length > 0,
      };
    });
  }, [savedCanvasses, supplies]);

  const ordersNeedingStock = useMemo(() => {
    return analyzedOrders.filter(o => o.hasOutOfStock);
  }, [analyzedOrders]);

  const filteredOrders = useMemo(() => {
    return analyzedOrders.filter(o => {
      if (ordersFilter === 'out_of_stock' && !o.hasOutOfStock) return false;
      if (!orderSearchQuery.trim()) return true;
      const q = orderSearchQuery.toLowerCase().trim();
      return (
        o.slip.canvassNumber.toLowerCase().includes(q) ||
        o.slip.customerName.toLowerCase().includes(q) ||
        o.slip.departmentOrCompany.toLowerCase().includes(q) ||
        o.slip.items.some(
          it =>
            it.genericName.toLowerCase().includes(q) ||
            (it.brand && it.brand.toLowerCase().includes(q))
        )
      );
    });
  }, [analyzedOrders, ordersFilter, orderSearchQuery]);

  const handleEmailSingleOrder = (slip: CanvassSlip, outOfStockItems: OutOfStockItemDetail[]) => {
    setEmailModalPayload({
      toEmail: DEPOT_EMAIL,
      orderNumber: slip.canvassNumber,
      customerName: slip.customerName,
      departmentOrCompany: slip.departmentOrCompany,
      notes: slip.notes,
      items: outOfStockItems,
      source: 'customer_order',
    });
    setIsEmailModalOpen(true);
  };

  const handleEmailAllOutOfStockOrders = () => {
    if (ordersNeedingStock.length === 0) {
      showToast('No customer orders currently have out-of-stock items.');
      return;
    }

    const payloadOrders = ordersNeedingStock.map(o => ({
      orderNumber: o.slip.canvassNumber,
      customerName: o.slip.customerName,
      departmentOrCompany: o.slip.departmentOrCompany,
      notes: o.slip.notes,
      createdAt: o.slip.createdAt,
      items: o.outOfStockItems,
    }));

    const allItems = payloadOrders.flatMap(o => o.items);

    setEmailModalPayload({
      toEmail: DEPOT_EMAIL,
      items: allItems,
      orders: payloadOrders,
      source: 'multiple_orders',
    });
    setIsEmailModalOpen(true);
  };

  const handleOpenZeroStockEmail = () => {
    const zeroStockItems = supplies
      .filter(s => s.stock <= 0)
      .map(s => ({
        genericName: s.genericName,
        brand: s.brand,
        sku: s.sku,
        unit: s.unit,
        quantity: 1,
        sellingPrice: s.sellingPrice,
        currentStock: s.stock,
      }));

    if (zeroStockItems.length === 0) {
      showToast('All supplies are currently in stock! No zero-stock items.');
      return;
    }

    setEmailModalPayload({
      toEmail: DEPOT_EMAIL,
      items: zeroStockItems,
      source: 'admin_inventory',
    });
    setIsEmailModalOpen(true);
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

  // Compute available unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    supplies.forEach(s => {
      if (s.brand && s.brand.trim()) {
        set.add(s.brand.trim());
      }
    });
    return Array.from(set).sort();
  }, [supplies]);

  // Inventory Metrics
  const totalItemCount = supplies.length;
  const totalStockUnits = supplies.reduce((sum, item) => sum + item.stock, 0);
  const totalCostValuation = supplies.reduce((sum, item) => sum + item.stock * item.buyingPrice, 0);
  const totalSellingValuation = supplies.reduce((sum, item) => sum + item.stock * item.sellingPrice, 0);
  const potentialGrossProfit = totalSellingValuation - totalCostValuation;
  const overallMarginPercent =
    totalSellingValuation > 0 ? (potentialGrossProfit / totalSellingValuation) * 100 : 0;
  const zeroStockOverallCount = supplies.filter(item => item.stock <= 0).length;
  const lowStockCount = supplies.filter(item => item.stock > 0 && item.stock <= (item.minStockLevel || 10)).length;

  // Filtered Supplies
  const filteredSupplies = useMemo(() => {
    return supplies.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.genericName && item.genericName.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.unit && item.unit.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesBrand = selectedBrand === 'All' || item.brand === selectedBrand;
      const matchesLowStock = !showLowStockOnly || item.stock <= (item.minStockLevel || 10);

      return matchesSearch && matchesCategory && matchesBrand && matchesLowStock;
    });
  }, [supplies, searchQuery, selectedCategory, selectedBrand, showLowStockOnly]);

  // Partition inventory: In-stock first, zero stock at the lowest part
  const inStockSupplies = useMemo(() => {
    return filteredSupplies.filter(item => item.stock > 0);
  }, [filteredSupplies]);

  const zeroStockSupplies = useMemo(() => {
    return filteredSupplies.filter(item => item.stock <= 0);
  }, [filteredSupplies]);

  // --- Inline Price Editing Handlers ---
  const handleStartInlineEdit = (item: SupplyItem) => {
    setEditingPriceItemId(item.id);
    setTempBuyingPrice(item.buyingPrice.toString());
    setTempSellingPrice(item.sellingPrice.toString());
  };

  const handleCancelInlineEdit = () => {
    setEditingPriceItemId(null);
    setTempBuyingPrice('');
    setTempSellingPrice('');
  };

  const handleSaveInlineEdit = (item: SupplyItem) => {
    const parsedBuying = parseFloat(tempBuyingPrice);
    const parsedSelling = parseFloat(tempSellingPrice);

    if (isNaN(parsedBuying) || parsedBuying < 0) {
      showToast('Error: Buying price must be a valid non-negative number.');
      return;
    }
    if (isNaN(parsedSelling) || parsedSelling < 0) {
      showToast('Error: Selling price must be a valid non-negative number.');
      return;
    }

    updatePrices(item.id, parsedBuying, parsedSelling);
    setEditingPriceItemId(null);
    showToast(
      `Updated "${item.genericName}": Cost ₱${parsedBuying.toFixed(2)} • Selling ₱${parsedSelling.toFixed(2)}`
    );
  };

  // --- Dedicated Price Modal Handlers ---
  const handleOpenPriceModal = (item: SupplyItem) => {
    setPriceModalItem(item);
    setModalBuyingPrice(item.buyingPrice);
    setModalSellingPrice(item.sellingPrice);
  };

  const handleSavePriceModal = () => {
    if (!priceModalItem) return;
    if (modalBuyingPrice < 0 || modalSellingPrice < 0) {
      showToast('Prices cannot be negative.');
      return;
    }
    updatePrices(priceModalItem.id, modalBuyingPrice, modalSellingPrice);
    showToast(
      `Saved prices for "${priceModalItem.genericName}": Cost ₱${modalBuyingPrice.toFixed(2)}, Selling ₱${modalSellingPrice.toFixed(2)}`
    );
    setPriceModalItem(null);
  };

  const applyMarkupPreset = (pct: number) => {
    const markupMultiplier = 1 + pct / 100;
    const computedSelling = Math.round(modalBuyingPrice * markupMultiplier * 100) / 100;
    setModalSellingPrice(computedSelling);
  };

  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: SupplyItem) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleAddUnlistedToCatalog = (unlistedItem: CanvassItem) => {
    const tempItem: SupplyItem = {
      id: '',
      sku: unlistedItem.sku && !unlistedItem.sku.startsWith('UNL-') ? unlistedItem.sku : '',
      genericName: unlistedItem.genericName,
      brand: unlistedItem.brand || '',
      name: unlistedItem.name || (unlistedItem.brand ? `${unlistedItem.brand} ${unlistedItem.genericName}` : unlistedItem.genericName),
      description: unlistedItem.description || unlistedItem.customerNotes || '',
      unit: unlistedItem.unit || 'pc',
      stock: 0,
      sellingPrice: unlistedItem.sellingPrice || 0,
      buyingPrice: 0,
      updatedAt: new Date().toISOString(),
    };
    setItemToEdit(tempItem);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (itemData: Omit<SupplyItem, 'id' | 'updatedAt'>, id?: string) => {
    if (id) {
      updateSupplyItem({ ...itemData, id, updatedAt: new Date().toISOString() });
      showToast(`Updated "${itemData.genericName}" and catalog details.`);
    } else {
      addSupplyItem(itemData);
      showToast(`Added new supply "${itemData.genericName}".`);
    }
  };

  const handleDeleteItem = (item: SupplyItem) => {
    if (window.confirm(`Delete "${item.brand ? item.brand + ' ' : ''}${item.genericName}" from inventory?`)) {
      deleteSupplyItem(item.id);
      showToast(`Deleted item "${item.genericName}".`);
    }
  };

  const handleExcelImport = (
    items: Omit<SupplyItem, 'id' | 'updatedAt'>[],
    mode: 'append' | 'replace'
  ) => {
    const count = importExcelSupplies(items, mode);
    showToast(
      mode === 'replace'
        ? `Replaced inventory with ${count} items from Excel.`
        : `Added ${count} items from Excel to inventory.`
    );
  };

  // Export Latest Recorded Inventory Data (Reflects current system data at time of export)
  const handleExportLatestData = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (supplies.length === 0) {
      showToast('No inventory data available to export.');
      return;
    }
    if (format === 'csv') {
      exportLatestInventoryToCSV(supplies);
      showToast(`Exported latest recorded inventory (${supplies.length} items) to CSV.`);
    } else {
      exportLatestInventoryToExcel(supplies);
      showToast(`Exported latest recorded inventory (${supplies.length} items) to Excel (.xlsx).`);
    }
  };

  // Multiple Selection & Batch Deletion Handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected =
    filteredSupplies.length > 0 &&
    filteredSupplies.every(item => selectedItemIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered items
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredSupplies.forEach(item => next.delete(item.id));
        return next;
      });
    } else {
      // Select all filtered items
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        filteredSupplies.forEach(item => next.add(item.id));
        return next;
      });
    }
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedItemIds.size;
    if (count === 0) return;
    if (
      window.confirm(
        `Are you sure you want to delete ${count} selected inventory item${
          count > 1 ? 's' : ''
        }? This will permanently remove them from the central database and cannot be undone.`
      )
    ) {
      deleteMultipleSupplies(Array.from(selectedItemIds));
      setSelectedItemIds(new Set());
      showToast(`Successfully deleted ${count} inventory item${count > 1 ? 's' : ''}.`);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all inventory items? This cannot be undone.')) {
      clearAllSupplies();
      setSelectedItemIds(new Set());
      showToast('Inventory cleared.');
    }
  };

  // Render individual row with direct inline price editing capabilities
  const renderSupplyRow = (item: SupplyItem, isZeroStock: boolean) => {
    const isEditingThisRow = editingPriceItemId === item.id;
    const isLowStock = !isZeroStock && item.stock <= (item.minStockLevel || 10);
    const isSelected = selectedItemIds.has(item.id);

    // Live preview margin calculations if editing inline
    const activeBuying = isEditingThisRow ? (parseFloat(tempBuyingPrice) || 0) : item.buyingPrice;
    const activeSelling = isEditingThisRow ? (parseFloat(tempSellingPrice) || 0) : item.sellingPrice;
    const unitProfit = activeSelling - activeBuying;
    const marginPct = activeSelling > 0 ? (unitProfit / activeSelling) * 100 : 0;

    return (
      <tr
        key={item.id}
        className={`transition-colors group ${
          isSelected
            ? 'bg-blue-100/60 ring-1 ring-blue-300'
            : isEditingThisRow
            ? 'bg-blue-50/80 ring-2 ring-blue-500/50'
            : isZeroStock
            ? 'bg-red-50/30 hover:bg-red-50/60'
            : 'hover:bg-slate-50/80'
        }`}
      >
        {/* Checkbox for Multiple Selection */}
        <td className="py-3 px-3 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelectItem(item.id)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            title={`Select ${item.genericName}`}
          />
        </td>

        {/* SKU */}
        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
          {item.sku}
        </td>

        {/* Generic Name */}
        <td className="py-3 px-3 font-bold text-slate-900 max-w-[180px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>{item.genericName || item.name}</span>
            {item.category && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100 font-normal">
                {item.category}
              </span>
            )}
          </div>
        </td>

        {/* Brand */}
        <td className="py-3 px-3 text-slate-700">
          {item.brand ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200 inline-block text-[11px]">
              <span className="text-slate-400 font-normal mr-1">Brand:</span>
              {item.brand}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>

        {/* Description */}
        <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate" title={item.description}>
          {item.description || '—'}
        </td>

        {/* Unit */}
        <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
          {item.unit}
        </td>

        {/* No. of Stock with Quick Controls */}
        <td className="py-3 px-3 text-center whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <button
              onClick={() => adjustStock(item.id, -1)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              title="Decrease stock"
            >
              -
            </button>
            <span
              className={`font-black px-1 min-w-[28px] text-center ${
                isZeroStock
                  ? 'text-red-600'
                  : isLowStock
                  ? 'text-amber-600'
                  : 'text-slate-800'
              }`}
            >
              {item.stock}
            </span>
            <button
              onClick={() => adjustStock(item.id, 1)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
              title="Increase stock"
            >
              +
            </button>
          </div>
          {isZeroStock && (
            <span className="block text-[10px] text-red-600 font-bold mt-0.5">
              0 Stock
            </span>
          )}
          {isLowStock && (
            <span className="block text-[10px] text-amber-600 font-bold mt-0.5">
              Low Stock
            </span>
          )}
        </td>

        {/* Buying Price (Cost) - INLINE EDITABLE */}
        <td className="py-3 px-3 text-right bg-red-50/30 whitespace-nowrap">
          {isEditingThisRow ? (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs font-bold text-red-600">₱</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tempBuyingPrice}
                onChange={e => setTempBuyingPrice(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveInlineEdit(item);
                  if (e.key === 'Escape') handleCancelInlineEdit();
                }}
                className="w-20 px-2 py-1 bg-white border-2 border-red-400 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                placeholder="0.00"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => handleStartInlineEdit(item)}
              className="font-mono font-medium text-slate-800 hover:text-red-600 transition-colors inline-flex items-center gap-1 group/btn cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-100/50"
              title="Click to edit buying price"
            >
              <span>{formatPeso(item.buyingPrice)}</span>
              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity" />
            </button>
          )}
        </td>

        {/* Selling Price (Retail) - INLINE EDITABLE */}
        <td className="py-3 px-3 text-right bg-blue-50/40 whitespace-nowrap">
          {isEditingThisRow ? (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs font-bold text-blue-600">₱</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tempSellingPrice}
                onChange={e => setTempSellingPrice(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveInlineEdit(item);
                  if (e.key === 'Escape') handleCancelInlineEdit();
                }}
                className="w-20 px-2 py-1 bg-white border-2 border-blue-500 rounded-lg text-xs font-mono font-bold text-blue-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                placeholder="0.00"
              />
            </div>
          ) : (
            <button
              onClick={() => handleStartInlineEdit(item)}
              className="font-mono font-bold text-blue-950 hover:text-blue-600 transition-colors inline-flex items-center gap-1 group/btn cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-100/60"
              title="Click to edit selling price"
            >
              <span>{formatPeso(item.sellingPrice)}</span>
              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </button>
          )}
        </td>

        {/* Margin Preview */}
        <td className="py-3 px-3 text-right whitespace-nowrap">
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              unitProfit >= 0
                ? marginPct >= 20
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-800'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {marginPct.toFixed(1)}%
          </span>
          <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
            {unitProfit >= 0 ? '+' : ''}{formatPeso(unitProfit)}
          </span>
        </td>

        {/* Actions Column */}
        <td className="py-3 px-3 text-right whitespace-nowrap">
          {isEditingThisRow ? (
            /* Inline Save / Cancel Controls */
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => handleSaveInlineEdit(item)}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer border border-red-500/50"
                title="Save Price Changes (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancelInlineEdit}
                className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                title="Cancel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Standard Action Buttons */
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleStartInlineEdit(item)}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/70 transition-colors cursor-pointer"
                title="Quick Edit Buying & Selling Prices"
              >
                <PhilippinePeso className="w-3.5 h-3.5" />
              </button>
              <button
                id={`edit-item-${item.sku}`}
                onClick={() => handleOpenEditModal(item)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
                title="Edit item information & specifications"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                id={`delete-item-${item.sku}`}
                onClick={() => handleDeleteItem(item)}
                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer border border-red-200/70"
                title="Delete item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl border border-red-500 shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Admin Title & Key Metrics Cards (Executive Blue & Red Theme) */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0B1528] to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-blue-900/60 shadow-xl space-y-6 relative overflow-hidden">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold font-mono">
                ADMIN ACCESS GRANTED
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <Star className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                {adminUsername ? `Signed in as ${adminUsername}` : 'Administrator Mode'}
              </span>
              {isCentralSyncActive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  --
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Inventory & Pricing Control Console
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs sm:text-sm text-blue-200/70 max-w-2xl">
                Click any price in the table to edit Selling and Buying rates directly, adjust stock, or upload Excel spreadsheets.</p>
              {supplies.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/30">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  <span>{supplies.length} items synced from central database</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto relative z-10">
            <button
              id="admin-upload-excel-btn"
              onClick={() => setIsExcelModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-blue-500/50"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Excel File</span>
            </button>

            {/* Export Latest Recorded Data */}
            <div className="relative inline-flex rounded-xl shadow-xs">
              <button
                id="admin-export-data-btn"
                onClick={() => handleExportLatestData('xlsx')}
                className="px-4 py-2 rounded-l-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer border-y border-l border-emerald-500"
                title="Export latest recorded inventory data to Excel (.xlsx)"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
              <button
                onClick={() => handleExportLatestData('csv')}
                className="px-2.5 py-2 rounded-r-xl bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-xs font-semibold flex items-center transition-all cursor-pointer border-y border-r border-emerald-500"
                title="Export as CSV"
              >
                CSV
              </button>
            </div>

            <button
              id="admin-new-item-btn"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-red-500/50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>

            {ordersNeedingStock.length > 0 && (
              <button
                onClick={handleEmailAllOutOfStockOrders}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-red-400/60"
                title={`Send email notification to ${DEPOT_EMAIL} for ${ordersNeedingStock.length} out-of-stock customer orders`}
              >
                <Mail className="w-4 h-4" />
                <span>Email Depot ({ordersNeedingStock.length} Out-of-Stock Orders)</span>
              </button>
            )}

            {zeroStockOverallCount > 0 && (
              <button
                onClick={handleOpenZeroStockEmail}
                className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-red-500/60"
                title={`Send out-of-stock requisition email to ${DEPOT_EMAIL}`}
              >
                <Mail className="w-4 h-4" />
                <span>Email Depot ({zeroStockOverallCount} Zero-Stock Supplies)</span>
              </button>
            )}

            {supplies.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-300 border border-slate-700 text-xs transition-colors cursor-pointer"
                title="Clear all inventory data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Financial & Valuation Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 relative z-10">
          <div className="bg-slate-900/90 p-4 rounded-xl border-t-2 border-t-blue-500 border-x border-b border-blue-950">
            <div className="flex items-center justify-between text-blue-300 text-xs mb-1 font-semibold">
              <span>Catalog Records</span>
              <Boxes className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{totalItemCount}</div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
              <span>{totalStockUnits} stock units</span>
              {zeroStockOverallCount > 0 && (
                <span className="text-red-400 font-bold bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800">
                  {zeroStockOverallCount} zero stock
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border-t-2 border-t-red-500 border-x border-b border-red-950">
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1 font-semibold">
              <span>Purchasing Cost (Buying Price)</span>
              <PhilippinePeso className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-300">{formatPeso(totalCostValuation)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Capital invested in stock</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border-t-2 border-t-blue-400 border-x border-b border-blue-950">
            <div className="flex items-center justify-between text-blue-300 text-xs mb-1 font-semibold">
              <span>Selling Valuation (Retail)</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-300">{formatPeso(totalSellingValuation)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Canvass price market value</div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border-t-2 border-t-red-600 border-x border-b border-red-950">
            <div className="flex items-center justify-between text-red-300 text-xs mb-1 font-semibold">
              <span>Potential Gross Margin</span>
              <ArrowUpRight className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400">
              {formatPeso(potentialGrossProfit)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              +{overallMarginPercent.toFixed(1)}% estimated store margin
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar: Inventory & Pricing vs Customer Orders & Canvasses */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminTab('inventory')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Supplies Inventory & Pricing ({supplies.length})</span>
          </button>

          <button
            id="admin-tab-orders"
            onClick={() => setAdminTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === 'orders'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order List Dashboard ({savedCanvasses.length})</span>
            {ordersNeedingStock.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                {ordersNeedingStock.length} Warning
              </span>
            )}
          </button>
        </div>

        {adminTab === 'orders' && ordersNeedingStock.length > 0 && (
          <button
            onClick={handleEmailAllOutOfStockOrders}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-red-500/50"
            title={`Send batch email to ${DEPOT_EMAIL} for ${ordersNeedingStock.length} out-of-stock orders`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Depot ({ordersNeedingStock.length} Orders with 0 Stock)</span>
          </button>
        )}
      </div>

      {adminTab === 'orders' ? (
        <OrderListDashboard onViewVoucher={onViewVoucher || (() => {})} isEmbeddedInAdmin={true} />
      ) : (
        /* Main Inventory Content Area */
        <div className="space-y-4">
          {/* Search & Enhanced Filter Deck */}
        <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="admin-inventory-search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search supplies by Generic Name, Brand, Description, Unit, or SKU..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
                  aria-label="Filter by category"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {/* Brand Filter */}
              {brands.length > 0 && (
                <select
                  value={selectedBrand}
                  onChange={e => setSelectedBrand(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
                  aria-label="Filter by brand"
                >
                  <option value="All">All Brands</option>
                  {brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}

              {/* Low Stock Toggle */}
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={e => setShowLowStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                />
                <span className="flex items-center gap-1 text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>Low/0 Stock ({lowStockCount + zeroStockOverallCount})</span>
                </span>
              </label>
            </div>
          </div>

          {/* Quick Help Tip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                PRO-TIP
              </span>
              <span>Click on any <strong>Buying Price</strong> or <strong>Selling Price</strong> in the table to edit immediately inline.</span>
            </div>

            {(searchQuery || selectedCategory !== 'All' || selectedBrand !== 'All' || showLowStockOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedBrand('All');
                  setShowLowStockOnly(false);
                }}
                className="text-red-600 hover:text-red-700 font-semibold underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar for Multiple Deletion */}
        {selectedItemIds.size > 0 && (
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
                {selectedItemIds.size}
              </span>
              <div>
                <div className="font-bold text-sm text-white">
                  {selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} selected
                </div>
                <span className="text-xs text-slate-400">
                  Select multiple items to batch delete from the central inventory database
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleDeselectAll}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-red-500/50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedItemIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Supplies Table */}
        {supplies.length === 0 ? (
          <div className="p-12 text-center bg-white/95 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-3 border border-blue-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Inventory Data Recorded Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              You can upload an Excel spreadsheet using the fields: <strong className="text-slate-700">Generic Name, Brand, Description, Unit, No. of Stock, selling price, Buying price</strong>, or add items manually.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel File</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supply Manually</span>
              </button>
            </div>
          </div>
        ) : filteredSupplies.length === 0 ? (
          <div className="p-10 text-center bg-white/95 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-sm font-semibold text-slate-700">No items match your search or filter criteria</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedBrand('All');
                setShowLowStockOnly(false);
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        title={isAllFilteredSelected ? 'Deselect all items' : 'Select all items'}
                      />
                    </th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Generic Name</th>
                    <th className="py-3 px-3">Brand</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3 text-center">No. of Stock</th>
                    <th className="py-3 px-3 text-right bg-red-50/70 text-red-950 border-l border-red-100">
                      <div className="flex items-center justify-end gap-1">
                        <span>Buying Price (Cost)</span>
                        <Edit2 className="w-3 h-3 text-red-500" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right bg-blue-50/70 text-blue-950 border-l border-blue-100">
                      <div className="flex items-center justify-end gap-1">
                        <span>Selling Price</span>
                        <Edit2 className="w-3 h-3 text-blue-500" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Margin (%)</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Top Part: In-Stock Supplies (stock > 0) */}
                  {inStockSupplies.map(item => renderSupplyRow(item, false))}

                  {/* Lowest Part Demarcation: Zero Stock Supplies (stock <= 0) */}
                  {zeroStockSupplies.length > 0 && (
                    <>
                      <tr className="bg-gradient-to-r from-red-100 via-rose-50 to-red-100 border-y-2 border-red-300">
                        <td colSpan={11} className="py-2.5 px-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-red-950 font-extrabold text-xs">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span>OUT OF STOCK INVENTORY (0 STOCK) — LOWEST SECTION</span>
                              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black shadow-2xs">
                                {zeroStockSupplies.length} items
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-red-800 hidden md:inline">
                                Positioned at lowest part of inventory
                              </span>
                              <button
                                onClick={handleOpenZeroStockEmail}
                                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                title={`Email all zero-stock supplies to ${DEPOT_EMAIL}`}
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email Requisition to {DEPOT_EMAIL}</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {zeroStockSupplies.map(item => renderSupplyRow(item, true))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Showing <strong>{filteredSupplies.length}</strong> of <strong>{supplies.length}</strong> items
                ({inStockSupplies.length} in stock • {zeroStockSupplies.length} zero stock at lowest section)
              </span>
              <span className="text-[11px] text-slate-400">
                All price edits & adjustments save instantly to database
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Item Form Modal (Full Item Editor) */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
      />

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImport={handleExcelImport}
      />

      {/* Out of Stock Email Notification Modal */}
      <OutOfStockEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        payload={emailModalPayload}
      />
    </div>
  );
};
