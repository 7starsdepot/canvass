import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CanvassSlip, OrderStatus, SupplyItem } from '../types';
import { formatPeso } from '../utils/currency';
import { exportOrdersToExcel } from '../utils/exportInventory';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  FileText,
  Printer,
  Trash2,
  Download,
  Boxes,
  Calendar,
  User,
  Building,
  Phone,
  ShieldAlert,
  Sparkles,
  ArrowUpDown,
  History,
  Check,
  XCircle,
  Tag,
  PhilippinePeso,
} from 'lucide-react';

interface OrderListDashboardProps {
  onViewVoucher: (slip: CanvassSlip) => void;
  onBackToCustomer?: () => void;
  onOpenAdmin?: () => void;
  isEmbeddedInAdmin?: boolean;
}

export const OrderListDashboard: React.FC<OrderListDashboardProps> = ({
  onViewVoucher,
  onBackToCustomer,
  onOpenAdmin,
  isEmbeddedInAdmin = false,
}) => {
  const {
    savedCanvasses,
    supplies,
    deleteCanvassSlip,
    confirmOrderAndDeductStock,
    cancelOrderAndRestoreStock,
    updateOrderStatus,
    isAdmin,
  } = useInventory();

  // Phase navigation state: null = list phase; slip = detailed phase
  const [selectedOrder, setSelectedOrder] = useState<CanvassSlip | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [stockWarningFilter, setStockWarningFilter] = useState<'all' | 'warning' | 'ok'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'customer'>('date_desc');

  // Confirmation / processing state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Helper map: id/sku to current supply item
  const suppliesMap = useMemo(() => {
    const map = new Map<string, SupplyItem>();
    supplies.forEach(s => {
      map.set(s.id, s);
      if (s.sku) map.set(s.sku, s);
    });
    return map;
  }, [supplies]);

  // Analyze each order for stock availability against latest live inventory
  const ordersWithAnalytics = useMemo(() => {
    return savedCanvasses.map(order => {
      const itemsAnalysis = order.items.map(it => {
        if (it.isCustomUnlisted) {
          return {
            ...it,
            matchedSupply: null,
            currentStock: 0,
            hasSufficientStock: true, // Unlisted handled separately
            isUnlisted: true,
          };
        }

        const matched = supplies.find(
          s => s.id === it.itemId || (s.sku && it.sku && s.sku === it.sku) || s.name.toLowerCase() === it.name.toLowerCase()
        );

        const currentStock = matched ? matched.stock : 0;
        const hasSufficientStock = currentStock >= it.quantity;

        return {
          ...it,
          matchedSupply: matched || null,
          currentStock,
          hasSufficientStock,
          isUnlisted: false,
        };
      });

      const insufficientItems = itemsAnalysis.filter(
        it => !it.isUnlisted && !it.hasSufficientStock
      );
      const hasInsufficientStock = insufficientItems.length > 0;

      return {
        order,
        itemsAnalysis,
        insufficientItems,
        hasInsufficientStock,
      };
    });
  }, [savedCanvasses, supplies]);

  // Filtered and sorted orders list
  const filteredOrders = useMemo(() => {
    return ordersWithAnalytics
      .filter(({ order, hasInsufficientStock }) => {
        // Status filter
        const currentStatus = order.status || 'pending';
        if (statusFilter !== 'all' && currentStatus !== statusFilter) {
          return false;
        }

        // Stock Warning filter
        if (stockWarningFilter === 'warning' && !hasInsufficientStock) return false;
        if (stockWarningFilter === 'ok' && hasInsufficientStock) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            order.canvassNumber.toLowerCase().includes(q) ||
            order.customerName.toLowerCase().includes(q) ||
            order.departmentOrCompany.toLowerCase().includes(q) ||
            (order.notes && order.notes.toLowerCase().includes(q)) ||
            (order.contactNumber && order.contactNumber.includes(q)) ||
            order.items.some(
              it =>
                it.name.toLowerCase().includes(q) ||
                it.genericName.toLowerCase().includes(q) ||
                (it.brand && it.brand.toLowerCase().includes(q))
            );
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.order.totalAmount - a.order.totalAmount;
        }
        if (sortBy === 'amount_asc') {
          return a.order.totalAmount - b.order.totalAmount;
        }
        if (sortBy === 'customer') {
          return a.order.customerName.localeCompare(b.order.customerName);
        }
        return 0;
      });
  }, [ordersWithAnalytics, statusFilter, stockWarningFilter, searchQuery, sortBy]);

  // Overall metric stats
  const metrics = useMemo(() => {
    const totalCount = savedCanvasses.length;
    const confirmedCount = savedCanvasses.filter(o => o.status === 'confirmed' || o.stockDeducted).length;
    const pendingCount = savedCanvasses.filter(o => !o.status || o.status === 'pending').length;
    const totalRevenue = savedCanvasses.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const ordersWithStockWarnings = ordersWithAnalytics.filter(o => o.hasInsufficientStock).length;

    return {
      totalCount,
      confirmedCount,
      pendingCount,
      totalRevenue,
      ordersWithStockWarnings,
    };
  }, [savedCanvasses, ordersWithAnalytics]);

  // Handle confirming an order & deducting inventory
  const handleConfirmAndDeduct = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProcessingId(orderId);
    try {
      const res = await confirmOrderAndDeductStock(orderId);
      if (res.success) {
        showToast(res.message, res.warnings ? 'warning' : 'success');
        // Refresh selectedOrder if currently in detailed phase
        if (selectedOrder && selectedOrder.id === orderId) {
          const fresh = savedCanvasses.find(o => o.id === orderId);
          if (fresh) setSelectedOrder({ ...fresh, status: 'confirmed', stockDeducted: true });
        }
      } else {
        showToast(res.message, 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Error confirming order', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle cancelling an order & restoring inventory
  const handleCancelAndRestock = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Cancel this order and restore deducted items back to inventory stock?')) {
      return;
    }
    setProcessingId(orderId);
    try {
      const res = await cancelOrderAndRestoreStock(orderId);
      showToast(res.message, 'success');
      if (selectedOrder && selectedOrder.id === orderId) {
        const fresh = savedCanvasses.find(o => o.id === orderId);
        if (fresh) setSelectedOrder({ ...fresh, status: 'cancelled', stockDeducted: false });
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling order', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle deleting order
  const handleDeleteOrder = (orderId: string, canvassNumber: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Delete Order #${canvassNumber}? This cannot be undone.`)) {
      deleteCanvassSlip(orderId);
      showToast(`Order #${canvassNumber} deleted.`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
    }
  };

  // Active selected order analytics for Detailed Phase
  const activeOrderDetails = useMemo(() => {
    if (!selectedOrder) return null;
    const liveOrder = savedCanvasses.find(o => o.id === selectedOrder.id) || selectedOrder;

    const items = liveOrder.items.map(it => {
      const matched = supplies.find(
        s => s.id === it.itemId || (s.sku && it.sku && s.sku === it.sku) || s.name.toLowerCase() === it.name.toLowerCase()
      );
      const availableStock = matched ? matched.stock : 0;
      const buyingPrice = matched ? matched.buyingPrice : (it.buyingPrice || 0);
      const isSufficient = it.isCustomUnlisted ? true : availableStock >= it.quantity;

      return {
        ...it,
        matched,
        availableStock,
        buyingPrice,
        isSufficient,
        totalSelling: it.sellingPrice * it.quantity,
        totalCost: buyingPrice * it.quantity,
      };
    });

    const insufficientItems = items.filter(it => !it.isCustomUnlisted && !it.isSufficient);

    return {
      order: liveOrder,
      items,
      insufficientItems,
      hasInsufficient: insufficientItems.length > 0,
    };
  }, [selectedOrder, savedCanvasses, supplies]);

  // =========================================================================
  // DETAILED PHASE (Opened when clicking an order row or "View Details")
  // =========================================================================
  if (selectedOrder && activeOrderDetails) {
    const { order, items, insufficientItems, hasInsufficient } = activeOrderDetails;
    const isConfirmed = order.status === 'confirmed';
    const isFulfilled = order.status === 'fulfilled';
    const isCancelled = order.status === 'cancelled';
    const isPending = !order.status || order.status === 'pending';

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Toast */}
        {toastMessage && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900/95 text-amber-100 border-amber-500'
                : 'bg-red-900/95 text-red-100 border-red-500'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Detailed Phase Navigation Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Order List</span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black font-mono tracking-tight text-white">
                    {order.canvassNumber}
                  </h1>
                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isFulfilled
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : isCancelled
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {order.status || 'Pending Confirmation'}
                  </span>
                  {order.stockDeducted && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Stock Deducted
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ordered on {new Date(order.createdAt).toLocaleString()} • {order.customerName} ({order.departmentOrCompany})
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPending && (
                <button
                  disabled={processingId === order.id}
                  onClick={() => handleConfirmAndDeduct(order.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer border border-emerald-400/40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Order & Deduct Inventory</span>
                </button>
              )}

              {isConfirmed && (
                <>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'fulfilled')}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Mark Fulfilled</span>
                  </button>
                  <button
                    onClick={() => handleCancelAndRestock(order.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/50 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel & Restock</span>
                  </button>
                </>
              )}

              <button
                onClick={() => onViewVoucher(order)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Print Quotation Slip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Warning / Notification Banners */}
        {hasInsufficient && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-200 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block font-bold text-sm">
                Warning: Insufficient Inventory Stock for {insufficientItems.length} Item(s)
              </strong>
              <p className="text-amber-200/90 mt-1">
                The ordered quantity exceeds the depot's currently available inventory for the following item(s):
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 font-mono text-xs text-amber-300">
                {insufficientItems.map(it => (
                  <li key={it.itemId}>
                    <strong>{it.name}</strong>: Available Stock: {it.availableStock} {it.unit}, Ordered: {it.quantity} {it.unit} (Deficit: {it.quantity - it.availableStock} {it.unit})
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-300/80 mt-1.5 italic">
                Confirming this order will deduct available units and reduce inventory stock level to 0 for these items.
              </p>
            </div>
          </div>
        )}

        {order.stockDeducted && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <strong className="text-emerald-300 block font-bold">
                Automatic Inventory Deduction Verified
              </strong>
              <p className="text-emerald-200/80 text-xs mt-0.5">
                Quantities for this order were automatically deducted from the central database on{' '}
                {order.stockDeductedAt ? new Date(order.stockDeductedAt).toLocaleString() : 'confirmation'}.
                Duplicate deduction is prevented.
              </p>
            </div>
          </div>
        )}

        {/* Order Meta & Customer Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/95 rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Customer Information
            </span>
            <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Building className="w-3 h-3 text-slate-400" />
              {order.departmentOrCompany}
            </div>
            {order.contactNumber && (
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {order.contactNumber}
              </div>
            )}
          </div>

          <div className="bg-white/95 rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Order Date & Timeline
            </span>
            <div className="text-xs text-slate-800">
              <span className="text-slate-400 block text-[10px]">Ordered Date:</span>
              <span className="font-bold font-mono">{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            {order.confirmedAt && (
              <div className="text-xs text-slate-800 mt-2">
                <span className="text-slate-400 block text-[10px]">Confirmed & Deducted At:</span>
                <span className="font-semibold text-emerald-700 font-mono">{new Date(order.confirmedAt).toLocaleString()}</span>
              </div>
            )}
            {order.notes && (
              <div className="mt-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-600">
                <span className="font-bold text-slate-700">Notes:</span> {order.notes}
              </div>
            )}
          </div>

          <div className="bg-white/95 rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <PhilippinePeso className="w-3.5 h-3.5 text-red-600" />
              Financial & Items Summary
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Total Order Amount:</span>
              <span className="font-mono font-black text-lg text-red-700">{formatPeso(order.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
              <span>Total Items / SKUs:</span>
              <span className="font-bold">{order.items.length} line item(s)</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
              <span>Total Units Ordered:</span>
              <span className="font-bold">{order.items.reduce((s, it) => s + it.quantity, 0)} units</span>
            </div>
          </div>
        </div>

        {/* Detailed Items Table with ALL Inventory Fields + Qty Stock Available + Price */}
        <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>Detailed Itemized Inventory Breakdown</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays all inventory fields, live depot stock availability, and selling/buying rates.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-mono">
              {items.length} Items in Order
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Generic Name & Brand</th>
                  <th className="py-3 px-3">Specifications / Description</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-900 border-x border-blue-200">
                    Qty Stock Available
                  </th>
                  <th className="py-3 px-3 text-center bg-amber-50/50 text-amber-900">
                    Ordered Qty
                  </th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  {isAdmin && <th className="py-3 px-3 text-right text-slate-500">Buying Cost</th>}
                  <th className="py-3 px-3 text-right">Total (Selling)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const isZeroStock = !it.isCustomUnlisted && it.availableStock <= 0;
                  const isInsufficient = !it.isCustomUnlisted && it.availableStock < it.quantity;

                  return (
                    <tr
                      key={it.itemId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isInsufficient ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-700">
                        {it.sku || 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{it.genericName}</div>
                        {it.brand && (
                          <span className="text-[10px] text-blue-600 font-medium">Brand: {it.brand}</span>
                        )}
                        {it.isCustomUnlisted && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-300">
                            Unlisted Request
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={it.description}>
                        {it.description || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{it.unit}</td>
                      {/* Qty Stock Available Column */}
                      <td className="py-3 px-3 text-center font-mono font-bold bg-blue-50/30 border-x border-blue-100">
                        {it.isCustomUnlisted ? (
                          <span className="text-amber-700 text-[10px] font-semibold">Special Order</span>
                        ) : isZeroStock ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                            0 in stock
                          </span>
                        ) : isInsufficient ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200" title="Ordered quantity exceeds available stock">
                            {it.availableStock} {it.unit} (Low)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            {it.availableStock} {it.unit}
                          </span>
                        )}
                      </td>
                      {/* Ordered Quantity */}
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-sm text-slate-900 bg-amber-50/20">
                        {it.quantity}
                      </td>
                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {it.sellingPrice > 0 ? formatPeso(it.sellingPrice) : 'To Be Quoted'}
                      </td>
                      {/* Buying Price (Admin only) */}
                      {isAdmin && (
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {it.buyingPrice > 0 ? formatPeso(it.buyingPrice) : '—'}
                        </td>
                      )}
                      {/* Item Total */}
                      <td className="py-3 px-3 text-right font-mono font-black text-red-700">
                        {it.sellingPrice > 0 ? formatPeso(it.totalSelling) : 'TBD'}
                      </td>
                      {/* Status / Deduction */}
                      <td className="py-3 px-3 text-center">
                        {order.stockDeducted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            Deducted
                          </span>
                        ) : isInsufficient ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            Insufficient
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td colSpan={5} className="py-3 px-3 text-slate-700">
                    Grand Total ({items.length} items)
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-blue-900 bg-blue-50/50 border-x border-blue-200">
                    —
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-slate-900 bg-amber-50/50">
                    {items.reduce((s, it) => s + it.quantity, 0)} units
                  </td>
                  <td colSpan={isAdmin ? 2 : 1} className="py-3 px-3 text-right text-slate-500 text-[11px]">
                    Total Amount:
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-base text-red-700">
                    {formatPeso(order.totalAmount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Inventory Deduction Audit Trail / History Log */}
        {order.deductionLogs && order.deductionLogs.length > 0 && (
          <div className="bg-white/95 rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Inventory Deduction Audit Trail & Verification Log</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-center">Previous Stock</th>
                    <th className="py-2.5 px-3 text-center text-red-600">Deducted Qty</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">New Available Stock</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.deductionLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{log.itemName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.sku || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                        {log.previousStock}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600">
                        -{log.quantityDeducted}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {log.newStock}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN ORDER LIST TABLE DASHBOARD PHASE
  // =========================================================================
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500'
              : toastMessage.type === 'warning'
              ? 'bg-amber-900/95 text-amber-100 border-amber-500'
              : 'bg-red-900/95 text-red-100 border-red-500'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toastMessage.type === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/40">
                DEPOT ORDER MANAGEMENT
              </span>
              <span className="text-xs text-slate-400">Real-Time Inventory Synchronization</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-red-400" />
              <span>Order List Dashboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/70 mt-1 max-w-2xl">
              Track customer orders, review stock availability, confirm purchases with automatic inventory deduction, and inspect itemized breakdown slips.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportOrdersToExcel(savedCanvasses, '7Stars_Order_List_Dashboard.xlsx')}
              disabled={savedCanvasses.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Orders (Excel)</span>
            </button>
            {onOpenAdmin && !isEmbeddedInAdmin && (
              <button
                onClick={onOpenAdmin}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Inventory Control</span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
            <span className="text-lg sm:text-xl font-mono font-black text-white">{metrics.totalCount}</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Confirmed / Deducted</span>
            <span className="text-lg sm:text-xl font-mono font-black text-emerald-400">{metrics.confirmedCount}</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Action</span>
            <span className="text-lg sm:text-xl font-mono font-black text-amber-400">{metrics.pendingCount}</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Order Valuation</span>
            <span className="text-lg sm:text-xl font-mono font-black text-blue-300">{formatPeso(metrics.totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/95 rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by customer, order #, company, or items..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({savedCanvasses.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'pending' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending ({metrics.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'confirmed' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Confirmed ({metrics.confirmedCount})
            </button>
          </div>

          {/* Stock Warning Filter */}
          <select
            value={stockWarningFilter}
            onChange={e => setStockWarningFilter(e.target.value as any)}
            className="py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="all">All Stock Statuses</option>
            <option value="warning">Has Stock Warnings Only</option>
            <option value="ok">Fully Available Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Total Amount: High to Low</option>
            <option value="amount_asc">Total Amount: Low to High</option>
            <option value="customer">Customer Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Orders Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {savedCanvasses.length === 0
                ? 'No customer orders have been placed yet. Submit a canvass or order from the Customer View.'
                : 'No orders match your active filter or search criteria.'}
            </p>
            {savedCanvasses.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setStockWarningFilter('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer & Department</th>
                  <th className="py-3.5 px-4">Ordered Date</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-center">Order Status</th>
                  <th className="py-3.5 px-4 text-center">Stock Health</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(({ order, hasInsufficientStock, insufficientItems }) => {
                  const isConfirmed = order.status === 'confirmed';
                  const isPending = !order.status || order.status === 'pending';
                  const isFulfilled = order.status === 'fulfilled';
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Order # */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-blue-700 group-hover:underline">
                            {order.canvassNumber}
                          </span>
                          {order.items.some(it => it.isCustomUnlisted) && (
                            <span title="Contains unlisted items">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {order.departmentOrCompany}
                        </div>
                      </td>

                      {/* Ordered Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Items Preview */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-bold text-slate-800">{order.items.length} line item(s)</span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {order.items.map(it => it.genericName).slice(0, 2).join(', ')}
                          {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-red-700 text-sm">
                        {formatPeso(order.totalAmount)}
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isFulfilled
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {isConfirmed && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                          {order.status || 'Pending'}
                        </span>
                        {order.stockDeducted && (
                          <span className="block text-[9.5px] text-emerald-600 font-semibold mt-0.5">
                            Deducted
                          </span>
                        )}
                      </td>

                      {/* Stock Health */}
                      <td className="py-3.5 px-4 text-center">
                        {hasInsufficientStock ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold border border-red-200"
                            title={`${insufficientItems.length} item(s) exceed current depot stock`}
                          >
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            {insufficientItems.length} Deficit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                            title="Open Detailed View Phase"
                          >
                            Details →
                          </button>

                          {isPending && (
                            <button
                              disabled={processingId === order.id}
                              onClick={e => handleConfirmAndDeduct(order.id, e)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Confirm Order & Deduct Inventory"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          )}

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onViewVoucher(order);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Print Voucher / Quotation Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={e => handleDeleteOrder(order.id, order.canvassNumber, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
