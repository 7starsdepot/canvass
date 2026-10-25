import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Boxes,
  PhilippinePeso,
  TrendingUp,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Printer,
  Table as TableIcon,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { SupplyItem } from '../types';
import { formatPeso } from '../utils/currency';
import {
  createLigaoStocksPdf,
  downloadLigaoStocksPdf,
  getLigaoStocksPdfBlobUrl,
  executePrintLigaoStocks,
} from '../utils/ligaoPdfGenerator';

interface LigaoStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplies: SupplyItem[];
  onAdjustStock?: (id: string, location: 'gbtn' | 'ligao', delta: number) => void;
}

export const LigaoStockModal: React.FC<LigaoStockModalProps> = ({
  isOpen,
  onClose,
  supplies,
  onAdjustStock,
}) => {
  // Tabs: 'pdf' (default to satisfy "ligao stocks view in pdf not excel") vs 'table'
  const [activeTab, setActiveTab] = useState<'pdf' | 'table'>('pdf');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'zero_stock'>('all');
  const [sortBy, setSortBy] = useState<'stock-desc' | 'stock-asc' | 'name-asc' | 'value-desc'>('stock-desc');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Generate / refresh PDF blob URL when supplies change or modal opens
  useEffect(() => {
    if (!isOpen) return;

    let url: string | null = null;
    try {
      setIsGeneratingPdf(true);
      url = getLigaoStocksPdfBlobUrl(supplies);
      setPdfBlobUrl(url);
    } catch (err) {
      console.error('Failed to generate Ligao stocks PDF blob:', err);
    } finally {
      setIsGeneratingPdf(false);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, supplies]);

  if (!isOpen) return null;

  // Aggregate Metrics for Ligao
  const totalLigaoUnits = supplies.reduce(
    (sum, item) => sum + (item.stockLigao !== undefined ? item.stockLigao : 0),
    0
  );

  const totalGbtnUnits = supplies.reduce(
    (sum, item) => sum + (item.stockGbtn !== undefined ? item.stockGbtn : item.stock || 0),
    0
  );

  const totalCombinedUnits = totalLigaoUnits + totalGbtnUnits;

  const itemsWithLigaoStock = supplies.filter(
    item => (item.stockLigao !== undefined ? item.stockLigao : 0) > 0
  ).length;

  const itemsWithZeroLigaoStock = supplies.filter(
    item => (item.stockLigao !== undefined ? item.stockLigao : 0) === 0
  ).length;

  const totalLigaoCostValuation = supplies.reduce((sum, item) => {
    const qty = item.stockLigao !== undefined ? item.stockLigao : 0;
    return sum + qty * (item.buyingPrice || 0);
  }, 0);

  const totalLigaoSellingValuation = supplies.reduce((sum, item) => {
    const qty = item.stockLigao !== undefined ? item.stockLigao : 0;
    return sum + qty * (item.sellingPrice || 0);
  }, 0);

  const ligaoSharePct = totalCombinedUnits > 0 ? (totalLigaoUnits / totalCombinedUnits) * 100 : 0;
  const gbtnSharePct = totalCombinedUnits > 0 ? (totalGbtnUnits / totalCombinedUnits) * 100 : 0;

  // Filtered and Sorted Supplies for Ligao Table View
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return supplies
      .filter(item => {
        const ligaoStock = item.stockLigao !== undefined ? item.stockLigao : 0;
        const matchesSearch =
          !q ||
          item.genericName.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        if (stockFilter === 'in_stock') return ligaoStock > 0;
        if (stockFilter === 'zero_stock') return ligaoStock === 0;
        return true;
      })
      .sort((a, b) => {
        const aLigao = a.stockLigao !== undefined ? a.stockLigao : 0;
        const bLigao = b.stockLigao !== undefined ? b.stockLigao : 0;

        if (sortBy === 'stock-desc') return bLigao - aLigao;
        if (sortBy === 'stock-asc') return aLigao - bLigao;
        if (sortBy === 'value-desc') return bLigao * b.sellingPrice - aLigao * a.sellingPrice;
        return a.genericName.localeCompare(b.genericName);
      });
  }, [supplies, searchQuery, stockFilter, sortBy]);

  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<{
    message: string;
    type: 'info' | 'success' | 'warn';
  } | null>(null);

  const handleDownloadPdf = () => {
    downloadLigaoStocksPdf(supplies);
  };

  const handlePrintPdf = () => {
    setIsPrinting(true);
    setPrintFeedback({
      message: 'Preparing official Landscape A4 print document...',
      type: 'info',
    });

    try {
      const res = executePrintLigaoStocks(supplies);
      if (!res.success) {
        setPrintFeedback({
          message: 'Direct print was blocked by browser. Automatically downloading PDF...',
          type: 'warn',
        });
        downloadLigaoStocksPdf(supplies);
      } else {
        setPrintFeedback({
          message: 'Print dialog opened! Select your printer or "Save as PDF" (Landscape A4).',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Print execution failed:', err);
      setPrintFeedback({
        message: 'Print failed in browser. Downloading PDF directly...',
        type: 'warn',
      });
      downloadLigaoStocksPdf(supplies);
    } finally {
      setIsPrinting(false);
      setTimeout(() => {
        setPrintFeedback(null);
      }, 5000);
    }
  };

  return (
    <div
      id="stocks-in-ligao-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div
        id="stocks-in-ligao-modal"
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-sky-300 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header (Executive Ligao Sky & Navy Theme with Mode Switcher) */}
        <div className="bg-gradient-to-r from-[#071626] via-slate-900 to-[#0A2540] px-5 sm:px-6 py-3.5 text-white flex items-center justify-between border-b border-sky-500/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/40 flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-200 border border-sky-400/40 text-[10px] font-bold tracking-wider uppercase font-mono">
                  Branch Location 2
                </span>
                <span className="text-[11px] text-slate-300">• 7 Stars Depot</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-bold">
                  PDF View Mode
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Stocks in Ligao — Official Inventory PDF Report</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: PDF Document View vs Interactive Table */}
            <div className="inline-flex bg-slate-950/70 p-1 rounded-xl border border-sky-400/30 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="View formatted PDF report"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Document</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Switch to interactive table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Executive Stat Cards for Ligao */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Total Ligao Units */}
            <div className="bg-sky-50/90 p-3.5 rounded-xl border border-sky-200 shadow-2xs">
              <div className="flex items-center justify-between text-sky-900 text-xs mb-1 font-bold">
                <span>Total Stocks in Ligao</span>
                <Boxes className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-sky-950 font-mono">
                {totalLigaoUnits.toLocaleString()}
              </div>
              <div className="text-[11px] text-sky-700 mt-0.5 font-medium">
                units recorded in Ligao branch
              </div>
            </div>

            {/* In-Stock Items in Ligao */}
            <div className="bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-900 text-xs mb-1 font-bold">
                <span>Active In-Stock Items</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                {itemsWithLigaoStock}
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                out of {supplies.length} ({itemsWithZeroLigaoStock} zero in Ligao)
              </div>
            </div>

            {/* Ligao Selling Valuation (Retail) */}
            <div className="bg-blue-50/90 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
              <div className="flex items-center justify-between text-blue-900 text-xs mb-1 font-bold">
                <span>Retail Valuation</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-blue-950 font-mono">
                {formatPeso(totalLigaoSellingValuation)}
              </div>
              <div className="text-[11px] text-blue-700 mt-0.5 font-medium">
                Selling price value in branch
              </div>
            </div>

            {/* Ligao Purchasing Cost */}
            <div className="bg-amber-50/90 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-amber-900 text-xs mb-1 font-bold">
                <span>Purchasing Cost (Capital)</span>
                <PhilippinePeso className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-amber-950 font-mono">
                {formatPeso(totalLigaoCostValuation)}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
                Cost invested in branch stock
              </div>
            </div>
          </div>

          {/* TAB 1: PDF DOCUMENT PREVIEW (Primary Default) */}
          {activeTab === 'pdf' && (
            <div className="space-y-3">
              {/* PDF Action Toolbar */}
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    PDF
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Official Ligao Stock Inventory Report (Landscape A4)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Formatted ready for audit, executive review, and physical print
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-rose-400/50"
                    title="Download official PDF document (.pdf)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    disabled={isPrinting}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                    title="Print official Landscape A4 Ligao inventory report"
                  >
                    {isPrinting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    ) : (
                      <Printer className="w-3.5 h-3.5" />
                    )}
                    <span>{isPrinting ? 'Opening Print...' : 'Print PDF'}</span>
                  </button>

                  {pdfBlobUrl && (
                    <a
                      href={pdfBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                      title="Open raw PDF file in new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Full Page</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Feedback toast / banner if print triggered */}
              {printFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border animate-fade-in ${
                    printFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : printFeedback.type === 'warn'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {printFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {printFeedback.type === 'warn' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                    {printFeedback.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-600 animate-spin shrink-0" />}
                    <span>{printFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintFeedback(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Print Info helper banner */}
              <div className="px-3.5 py-2 bg-sky-50/90 rounded-xl border border-sky-200 text-[11.5px] text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded shrink-0">
                    Print Ready
                  </span>
                  <span>
                    Clicking <strong>Print PDF</strong> opens the system print dialog pre-formatted for <strong>Landscape A4</strong> (physical printer or Save as PDF).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="text-sky-700 hover:text-sky-900 underline font-bold shrink-0 text-left sm:text-right cursor-pointer"
                >
                  Download .PDF File
                </button>
              </div>

              {/* Embedded PDF Viewer Iframe */}
              <div className="relative w-full h-[58vh] sm:h-[62vh] rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-800">
                {isGeneratingPdf ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/90 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                    <span className="text-xs font-bold">Rendering Ligao Stock Report in PDF...</span>
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe
                    src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                    title="7 Stars Stocks in Ligao PDF Report"
                    className="w-full h-full border-none bg-slate-900"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <div>
                      <p className="text-sm font-bold text-white">PDF Preview Unavailable</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        You can download the PDF document directly using the button below.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadPdf}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                    >
                      Download PDF Document
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE TABLE VIEW */}
          {activeTab === 'table' && (
            <div className="space-y-3">
              {/* Search, Filter & Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Ligao items by name, brand, or SKU..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter Tabs */}
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setStockFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        stockFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({supplies.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('in_stock')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        stockFilter === 'in_stock'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      In Ligao ({itemsWithLigaoStock})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilter('zero_stock')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        stockFilter === 'zero_stock'
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      0 in Ligao ({itemsWithZeroLigaoStock})
                    </button>
                  </div>

                  {/* Sort selector */}
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="stock-desc">Highest Ligao Stock</option>
                    <option value="stock-asc">Lowest Ligao Stock</option>
                    <option value="value-desc">Highest Valuation</option>
                    <option value="name-asc">Alphabetical (Name)</option>
                  </select>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] z-10">
                      <tr>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Item Generic Name</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-center bg-sky-50/80 text-sky-950 font-black border-x border-sky-200">
                          Stock IN Ligao
                        </th>
                        <th className="py-2.5 px-3 text-center bg-amber-50/60 text-amber-950">
                          IN GBTN
                        </th>
                        <th className="py-2.5 px-3 text-center font-bold">
                          Combined Total
                        </th>
                        <th className="py-2.5 px-3 text-right">Selling Price</th>
                        <th className="py-2.5 px-3 text-right bg-sky-50/40 text-sky-950 font-bold">
                          Ligao Total Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No supplies match your search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map(item => {
                          const ligaoStock = item.stockLigao !== undefined ? item.stockLigao : 0;
                          const gbtnStock = item.stockGbtn !== undefined ? item.stockGbtn : item.stock || 0;
                          const totalStock = ligaoStock + gbtnStock;
                          const ligaoValue = ligaoStock * (item.sellingPrice || 0);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                                {item.sku}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 max-w-[200px] truncate">
                                {item.genericName || item.name}
                                {item.isSned && (
                                  <span className="ml-1.5 text-[9.5px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                                    SNED
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {item.brand || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {item.unit}
                              </td>

                              {/* Ligao Stock Column with quick adjustment */}
                              <td className="py-2 px-2 text-center bg-sky-50/30 border-x border-sky-100 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-sky-300 shadow-2xs">
                                  {onAdjustStock && (
                                    <button
                                      type="button"
                                      onClick={() => onAdjustStock(item.id, 'ligao', -1)}
                                      className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:text-sky-900 hover:bg-sky-100 font-bold text-xs cursor-pointer"
                                      title="Decrease Ligao stock"
                                    >
                                      -
                                    </button>
                                  )}
                                  <span
                                    className={`font-black px-1 min-w-[24px] text-center text-xs ${
                                      ligaoStock === 0
                                        ? 'text-red-600 font-black'
                                        : ligaoStock <= 5
                                        ? 'text-sky-700 font-bold'
                                        : 'text-slate-900 font-black'
                                    }`}
                                  >
                                    {ligaoStock}
                                  </span>
                                  {onAdjustStock && (
                                    <button
                                      type="button"
                                      onClick={() => onAdjustStock(item.id, 'ligao', 1)}
                                      className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:text-sky-900 hover:bg-sky-100 font-bold text-xs cursor-pointer"
                                      title="Increase Ligao stock"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                                {ligaoStock === 0 && (
                                  <span className="block text-[9px] text-red-600 font-bold">
                                    0 in branch
                                  </span>
                                )}
                              </td>

                              {/* GBTN Stock */}
                              <td className="py-2.5 px-3 text-center bg-amber-50/20 text-slate-700 font-semibold">
                                {gbtnStock}
                              </td>

                              {/* Combined Total */}
                              <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                                {totalStock}
                              </td>

                              {/* Selling Price */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                {formatPeso(item.sellingPrice)}
                              </td>

                              {/* Total Value in Ligao */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-950 bg-sky-50/20">
                                {formatPeso(ligaoValue)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            Total Ligao Stocks:{' '}
            <strong className="text-sky-800 font-mono font-black">{totalLigaoUnits} units</strong>
            {' • '}Active Items:{' '}
            <strong className="text-emerald-700 font-mono font-bold">{itemsWithLigaoStock}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500"
              title="Download official PDF report of Ligao branch stocks"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrintPdf}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Print official Landscape A4 Ligao stocks report"
            >
              {isPrinting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{isPrinting ? 'Opening Print...' : 'Print PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Hidden Printable Area for Direct Browser Print (Ctrl+P / window.print) */}
        <div id="stocks-in-ligao-printable-area" className="hidden print:block p-4">
          <div className="bg-[#0a2540] text-white p-3.5 rounded-lg mb-3 flex justify-between items-center border-b-2 border-sky-500">
            <div>
              <h1 className="text-sm font-black tracking-wide">7 STARS SCHOOL & OFFICE SUPPLIES DEPOT</h1>
              <p className="text-[10px] text-sky-200 font-bold tracking-wider uppercase">
                Official Stocks in Ligao Branch Inventory Report
              </p>
            </div>
            <div className="text-right text-[9px] text-slate-200">
              <p>Branch: Ligao City, Albay</p>
              <p>Audit Copy • Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3 text-[10px]">
            <div className="border border-sky-300 bg-sky-50 p-2 rounded">
              <div className="font-bold text-sky-900 uppercase text-[8px]">Total Stocks in Ligao</div>
              <div className="text-base font-black text-sky-950 font-mono">{totalLigaoUnits.toLocaleString()} units</div>
            </div>
            <div className="border border-emerald-300 bg-emerald-50 p-2 rounded">
              <div className="font-bold text-emerald-900 uppercase text-[8px]">Active Items in Branch</div>
              <div className="text-base font-black text-emerald-950 font-mono">{itemsWithLigaoStock} in-stock</div>
            </div>
            <div className="border border-blue-300 bg-blue-50 p-2 rounded">
              <div className="font-bold text-blue-900 uppercase text-[8px]">Retail Valuation</div>
              <div className="text-sm font-black text-blue-950 font-mono">{formatPeso(totalLigaoSellingValuation)}</div>
            </div>
            <div className="border border-amber-300 bg-amber-50 p-2 rounded">
              <div className="font-bold text-amber-900 uppercase text-[8px]">Purchasing Cost</div>
              <div className="text-sm font-black text-amber-950 font-mono">{formatPeso(totalLigaoCostValuation)}</div>
            </div>
          </div>

          <table className="w-full text-left text-[9px] border-collapse mb-4 border border-slate-300">
            <thead>
              <tr className="bg-[#0c4a6e] text-white font-bold uppercase text-[8.5px]">
                <th className="p-1.5 border border-slate-400 text-center w-6">#</th>
                <th className="p-1.5 border border-slate-400 w-16">SKU</th>
                <th className="p-1.5 border border-slate-400">Generic Name</th>
                <th className="p-1.5 border border-slate-400 w-20">Brand</th>
                <th className="p-1.5 border border-slate-400 w-20">Category</th>
                <th className="p-1.5 border border-slate-400 text-center w-10">Unit</th>
                <th className="p-1.5 border border-slate-400 text-center bg-sky-700 font-black w-18">Stock IN Ligao</th>
                <th className="p-1.5 border border-slate-400 text-center w-16">IN GBTN</th>
                <th className="p-1.5 border border-slate-400 text-center w-16">Combined</th>
                <th className="p-1.5 border border-slate-400 text-right w-20">Selling Price</th>
                <th className="p-1.5 border border-slate-400 text-right w-22">Ligao Value</th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((item, idx) => {
                const ligaoStock = item.stockLigao !== undefined ? item.stockLigao : 0;
                const gbtnStock = item.stockGbtn !== undefined ? item.stockGbtn : item.stock || 0;
                const totalStock = ligaoStock + gbtnStock;
                const val = ligaoStock * (item.sellingPrice || 0);
                return (
                  <tr key={item.id} className={`border-b border-slate-200 ${ligaoStock === 0 ? 'bg-slate-50 text-slate-400' : ''}`}>
                    <td className="p-1 border border-slate-300 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-1 border border-slate-300 font-mono font-bold text-slate-800">{item.sku || `SUP-${idx + 1}`}</td>
                    <td className="p-1 border border-slate-300 font-bold text-slate-900">{item.genericName || item.name}</td>
                    <td className="p-1 border border-slate-300 text-slate-700">{item.brand || '—'}</td>
                    <td className="p-1 border border-slate-300 text-slate-600">{item.category || (item.isSned ? 'SNED' : 'Supplies')}</td>
                    <td className="p-1 border border-slate-300 text-center">{item.unit || 'pc'}</td>
                    <td className="p-1 border border-slate-300 text-center font-bold font-mono bg-sky-100/70 text-sky-900">{ligaoStock}</td>
                    <td className="p-1 border border-slate-300 text-center font-mono text-slate-700">{gbtnStock}</td>
                    <td className="p-1 border border-slate-300 text-center font-mono font-bold text-slate-900">{totalStock}</td>
                    <td className="p-1 border border-slate-300 text-right font-mono">{formatPeso(item.sellingPrice)}</td>
                    <td className="p-1 border border-slate-300 text-right font-mono font-bold text-sky-900">{formatPeso(val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[8.5px] text-slate-600 border-t border-slate-300 page-avoid-break">
            <div>
              <div className="h-8 border-b border-slate-400 mb-1"></div>
              <strong>Prepared By:</strong> Depot Inventory Admin
            </div>
            <div>
              <div className="h-8 border-b border-slate-400 mb-1"></div>
              <strong>Verified By:</strong> Ligao Branch Custodian
            </div>
            <div>
              <div className="h-8 border-b border-slate-400 mb-1"></div>
              <strong>Approved By:</strong> Management Head
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
