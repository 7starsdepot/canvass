import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Boxes,
  DollarSign,
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
  RotateCcw
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplyItem } from '../types';
import { ItemFormModal } from './ItemFormModal';
import { ExcelUploadModal } from './ExcelUploadModal';
import { formatPeso } from '../utils/currency';

export const AdminView: React.FC = () => {
  const {
    supplies,
    addSupplyItem,
    updateSupplyItem,
    deleteSupplyItem,
    adjustStock,
    importExcelSupplies,
    clearAllSupplies,
    adminUsername,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<SupplyItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Inventory Metrics
  const totalItemCount = supplies.length;
  const totalStockUnits = supplies.reduce((sum, item) => sum + item.stock, 0);
  const totalCostValuation = supplies.reduce((sum, item) => sum + item.stock * item.buyingPrice, 0);
  const totalSellingValuation = supplies.reduce((sum, item) => sum + item.stock * item.sellingPrice, 0);
  const potentialGrossProfit = totalSellingValuation - totalCostValuation;
  const overallMarginPercent =
    totalSellingValuation > 0 ? (potentialGrossProfit / totalSellingValuation) * 100 : 0;
  const lowStockCount = supplies.filter(item => item.stock <= (item.minStockLevel || 10)).length;

  // Filtered Supplies
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

      const matchesLowStock = !showLowStockOnly || item.stock <= (item.minStockLevel || 10);

      return matchesSearch && matchesLowStock;
    });
  }, [supplies, searchQuery, showLowStockOnly]);

  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: SupplyItem) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (itemData: Omit<SupplyItem, 'id' | 'updatedAt'>, id?: string) => {
    if (id) {
      updateSupplyItem({ ...itemData, id, updatedAt: new Date().toISOString() });
      showToast(`Updated "${itemData.genericName}" and pricing.`);
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Generic Name': 'Ballpen 0.5mm',
        'Brand': 'Pilot',
        'Description': 'Black retractable gel ink pen with comfortable grip',
        'Unit': 'Box of 12',
        'No. of Stock': 50,
        'selling price': 8.50,
        'Buying price': 5.20,
      },
      {
        'Generic Name': 'Copy Paper A4 80gsm',
        'Brand': 'PaperOne',
        'Description': '500 sheets per ream, 96% high brightness for office printers',
        'Unit': 'Ream',
        'No. of Stock': 120,
        'selling price': 6.25,
        'Buying price': 4.10,
      },
      {
        'Generic Name': 'Sticky Notes 3x3',
        'Brand': 'Post-it',
        'Description': 'Classic canary yellow self-adhesive note pads, 100 sheets/pad',
        'Unit': 'Pack of 12',
        'No. of Stock': 45,
        'selling price': 7.50,
        'Buying price': 4.50,
      },
      {
        'Generic Name': 'Document Folder Letter Size',
        'Brand': 'Smead',
        'Description': 'Heavy duty 2-pocket polypropylene report folders',
        'Unit': 'Box of 25',
        'No. of Stock': 30,
        'selling price': 14.00,
        'Buying price': 9.20,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Office Supplies');

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 40 },
      { wch: 15 },
      { wch: 14 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.writeFile(workbook, 'office_supplies_inventory_template.xlsx');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all inventory items? This cannot be undone.')) {
      clearAllSupplies();
      showToast('Inventory cleared.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-700 shadow-lg text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Admin Title & Key Metrics Cards */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                ADMIN ACCESS GRANTED
              </span>
              <span className="text-xs text-slate-400">
                {adminUsername ? `Signed in as ${adminUsername}` : 'Administrator Mode'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Inventory & Pricing Control Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage stock levels, upload spreadsheets with custom pricing, and adjust buying & selling prices.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              id="admin-upload-excel-btn"
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Excel File</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download formatted Excel template"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel Template</span>
            </button>

            <button
              id="admin-new-item-btn"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>

            {supplies.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs transition-colors"
                title="Clear all inventory data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Financial & Valuation Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Catalog Records</span>
              <Boxes className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white">{totalItemCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{totalStockUnits} total stock units</div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Cost (Buying Price)</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300">{formatPeso(totalCostValuation)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Purchasing capital tied</div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Selling Valuation</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300">{formatPeso(totalSellingValuation)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Customer canvass rate value</div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Potential Margin</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400">
              {formatPeso(potentialGrossProfit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">+{overallMarginPercent.toFixed(1)}% gross margin</div>
          </div>
        </div>
      </div>

      {/* Main Inventory Content Area */}
      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="admin-inventory-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Generic Name, Brand, Description, Unit, or SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
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

          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={e => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Low Stock Only ({lowStockCount})
              </span>
            </label>
          </div>
        </div>

        {/* Supplies Table */}
        {supplies.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
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
                onClick={handleDownloadTemplate}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample Template</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supply Manually</span>
              </button>
            </div>
          </div>
        ) : filteredSupplies.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-sm font-semibold text-slate-700">No items match your search criteria</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowLowStockOnly(false);
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              Reset Search Filter
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Generic Name</th>
                    <th className="py-3 px-3">Brand</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3 text-center">No. of Stock</th>
                    <th className="py-3 px-3 text-right bg-amber-50/50">Buying Price (Cost)</th>
                    <th className="py-3 px-3 text-right bg-emerald-50/50">Selling Price</th>
                    <th className="py-3 px-3 text-right">Margin (%)</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSupplies.map(item => {
                    const isZeroStock = item.stock === 0;
                    const isLowStock = !isZeroStock && item.stock <= (item.minStockLevel || 10);
                    const unitProfit = item.sellingPrice - item.buyingPrice;
                    const marginPct =
                      item.sellingPrice > 0 ? (unitProfit / item.sellingPrice) * 100 : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* SKU */}
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {item.sku}
                        </td>

                        {/* Generic Name */}
                        <td className="py-3 px-3 font-bold text-slate-900 max-w-[180px]">
                          {item.genericName || item.name}
                        </td>

                        {/* Brand */}
                        <td className="py-3 px-3 text-slate-700">
                          {item.brand ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                              {item.brand}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-3 text-slate-500 max-w-[220px] truncate" title={item.description}>
                          {item.description || '—'}
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                          {item.unit}
                        </td>

                        {/* No. of Stock with Quick Controls */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                            <button
                              onClick={() => adjustStock(item.id, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                              title="Decrease stock"
                            >
                              -
                            </button>
                            <span
                              className={`font-bold px-1 min-w-[28px] text-center ${
                                isZeroStock
                                  ? 'text-rose-600'
                                  : isLowStock
                                  ? 'text-amber-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {item.stock}
                            </span>
                            <button
                              onClick={() => adjustStock(item.id, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                              title="Increase stock"
                            >
                              +
                            </button>
                          </div>
                          {isLowStock && (
                            <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
                              Low Stock
                            </span>
                          )}
                        </td>

                        {/* Buying Price (Cost) */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 bg-amber-50/30 whitespace-nowrap">
                          {formatPeso(item.buyingPrice)}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-emerald-50/30 whitespace-nowrap">
                          {formatPeso(item.sellingPrice)}
                        </td>

                        {/* Margin */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              unitProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {marginPct.toFixed(1)}%
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            +{formatPeso(unitProfit)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`edit-item-${item.sku}`}
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Edit item details & pricing"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-item-${item.sku}`}
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Showing {filteredSupplies.length} of {supplies.length} items</span>
              <span className="text-[11px] text-slate-400">All changes and uploads are automatically recorded from last view</span>
            </div>
          </div>
        )}
      </div>

      {/* Item Form Modal */}
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
    </div>
  );
};
