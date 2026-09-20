import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  Building,
  Building2,
  User,
  Calendar,
  Hash,
  Download,
  ExternalLink,
  Info,
} from 'lucide-react';
import { CanvassSlip } from '../types';
import { formatPeso } from '../utils/currency';
import {
  executePrintCanvass,
  downloadPrintableCanvassHtml,
  generateCanvassPrintHtml,
} from '../utils/printCanvass';

interface CanvassVoucherProps {
  slip: CanvassSlip | null;
  onClose: () => void;
}

export const CanvassVoucher: React.FC<CanvassVoucherProps> = ({ slip, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  if (!slip) return null;

  const companyName = slip.companyName || '7 Stars School and Office Supplies Depot';

  // Consolidate all lines into strictly unique items (summing quantities if duplicate items exist)
  const uniqueItems = useMemo(() => {
    const map = new Map<string, typeof slip.items[0]>();
    for (const item of slip.items) {
      const key =
        item.itemId ||
        `${item.genericName.toLowerCase().trim()}::${(item.brand || '').toLowerCase().trim()}::${item.unit.toLowerCase().trim()}::${item.sellingPrice}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        map.set(key, {
          ...existing,
          quantity: existing.quantity + item.quantity,
        });
      } else {
        map.set(key, { ...item });
      }
    }
    return Array.from(map.values());
  }, [slip.items]);

  const totalCalculatedAmount = useMemo(() => {
    return uniqueItems.reduce((acc, it) => acc + it.quantity * it.sellingPrice, 0);
  }, [uniqueItems]);

  const totalUnits = useMemo(() => {
    return uniqueItems.reduce((acc, it) => acc + it.quantity, 0);
  }, [uniqueItems]);

  const handlePrint = () => {
    setPrintNotice('Launching print dialog...');
    const result = executePrintCanvass(
      slip,
      uniqueItems,
      totalUnits,
      totalCalculatedAmount,
      companyName
    );

    if (!result.success) {
      handleDownload();
      setPrintNotice('Preview sandbox restricted print dialog. Downloaded print-ready file instead!');
    } else {
      setTimeout(() => {
        setPrintNotice(
          'If the print dialog didn\'t open in your browser preview, click "Download Sheet" to print without restrictions.'
        );
      }, 2200);
    }
  };

  const handleDownload = () => {
    downloadPrintableCanvassHtml(
      slip,
      uniqueItems,
      totalUnits,
      totalCalculatedAmount,
      companyName
    );
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleOpenNewTab = () => {
    const html = generateCanvassPrintHtml(
      slip,
      uniqueItems,
      totalUnits,
      totalCalculatedAmount,
      companyName
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      handleDownload();
      setPrintNotice('New tab was blocked by browser. Downloaded printable file directly!');
    }
  };

  const handleCopy = () => {
    const lines = [
      `7 STARS SCHOOL AND OFFICE SUPPLIES DEPOT`,
      `PRICE CANVASS QUOTATION SHEET`,
      `Canvass Control No: ${slip.canvassNumber}`,
      `Unique Items Count: ${uniqueItems.length} items (${totalUnits} total units)`,
      `Date: ${new Date(slip.createdAt).toLocaleDateString()}`,
      `Company / Depot: ${companyName}`,
      `Canvassed By: ${slip.customerName}`,
      `Department / Client: ${slip.departmentOrCompany}`,
      `--------------------------------------------------`,
      `UNIQUE ITEMS QUOTED:`,
      ...uniqueItems.map(
        (i, idx) =>
          `${idx + 1}. [${i.sku || 'ITEM'}] ${i.genericName}${i.brand ? ' (' + i.brand + ')' : ''} - ${i.quantity} ${i.unit} @ ${formatPeso(i.sellingPrice)} = ${formatPeso(i.quantity * i.sellingPrice)}`
      ),
      `--------------------------------------------------`,
      `TOTAL ESTIMATED CANVASS: ${formatPeso(totalCalculatedAmount)}`,
      slip.notes ? `Remarks / Purpose: ${slip.notes}` : '',
    ];

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="canvass-voucher-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="canvass-voucher-modal"
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:max-w-none print:w-full print:m-0 print:border-none print:shadow-none"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden bg-slate-900 px-4 sm:px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">Official Canvass Slip</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {slip.canvassNumber}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {uniqueItems.length} unique item{uniqueItems.length === 1 ? '' : 's'} • {totalUnits} total unit{totalUnits === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Copy Summary to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Open print sheet in new browser window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              title="Download print-ready official HTML canvass file"
            >
              {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloaded ? 'Downloaded!' : 'Download Sheet'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              title="Print unique canvass sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice banner if print dialog feedback is present */}
        {printNotice && (
          <div className="print:hidden bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{printNotice}</span>
            </div>
            <button
              onClick={() => setPrintNotice(null)}
              className="text-blue-500 hover:text-blue-800 text-[11px] font-semibold cursor-pointer underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Printable Official Canvass Paper (Isolated & Fitted for single-page print) */}
        <div id="printable-canvass-content" className="p-6 sm:p-8 print:p-0 print:m-0 bg-white text-slate-800">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 print:pb-2.5 print:mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-700 print:text-black">
                    {companyName}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 print:text-lg">
                  PRICE CANVASS SHEET
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 print:text-[10px]">
                  Official School & Office Supplies Price Quotation
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-slate-900 text-sm print:text-xs print:px-2 print:py-0.5 mb-1">
                  {slip.canvassNumber}
                </div>
                <div className="text-xs print:text-[10px] text-slate-500 flex items-center sm:justify-end gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
                    {new Date(slip.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 print:p-2.5 rounded-xl print:rounded-lg bg-slate-50 print:bg-white border border-slate-200 print:border-slate-300 text-xs print:text-[10.5px] mb-4 print:mb-3">
            <div>
              <span className="text-slate-500 block text-[10px] print:text-[9px] font-medium uppercase tracking-wide">
                Issuing Company / Depot
              </span>
              <div className="text-slate-900 font-bold text-xs sm:text-sm print:text-xs mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 print:hidden shrink-0" />
                <span>{companyName}</span>
              </div>
              <div className="text-[10.5px] print:text-[9.5px] text-slate-500 mt-0.5">
                Official School & Office Supplies Depot
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] print:text-[9px] font-medium uppercase tracking-wide">
                Canvassed For / Inquirer
              </span>
              <div className="text-slate-900 font-bold text-xs sm:text-sm print:text-xs mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500 print:hidden shrink-0" />
                <span>{slip.customerName}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-400 print:hidden shrink-0" />
                <span>{slip.departmentOrCompany}</span>
              </div>
              {slip.notes && (
                <p className="text-slate-600 italic mt-0.5 text-[10.5px] print:text-[9.5px]">
                  "{slip.notes}"
                </p>
              )}
            </div>
          </div>

          {/* Items Table (Consolidated Unique Data, Selling Price Only) */}
          <div className="overflow-x-auto mb-4 print:mb-3">
            <table className="w-full text-left text-xs print:text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-700 font-bold uppercase tracking-wider print:text-[9px]">
                  <th className="py-2 px-1.5 print:py-1">#</th>
                  <th className="py-2 px-1.5 print:py-1">SKU / Code</th>
                  <th className="py-2 px-1.5 print:py-1">Generic Name</th>
                  <th className="py-2 px-1.5 print:py-1">Brand</th>
                  <th className="py-2 px-1.5 print:py-1">Specification</th>
                  <th className="py-2 px-1.5 print:py-1">Unit</th>
                  <th className="py-2 px-1.5 print:py-1 text-center">Qty</th>
                  <th className="py-2 px-1.5 print:py-1 text-right">Unit Price</th>
                  <th className="py-2 px-1.5 print:py-1 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {uniqueItems.map((item, index) => {
                  const lineTotal = item.quantity * item.sellingPrice;
                  return (
                    <tr key={item.itemId || index} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                      <td className="py-2 px-1.5 print:py-1 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2 px-1.5 print:py-1 font-mono text-slate-500">{item.sku || `ITEM-${index + 1}`}</td>
                      <td className="py-2 px-1.5 print:py-1 font-bold text-slate-900">{item.genericName}</td>
                      <td className="py-2 px-1.5 print:py-1 text-slate-700">{item.brand || '—'}</td>
                      <td className="py-2 px-1.5 print:py-1 text-slate-500 max-w-[140px] truncate print:max-w-none print:whitespace-normal">
                        {item.description || '—'}
                      </td>
                      <td className="py-2 px-1.5 print:py-1 text-slate-600">{item.unit}</td>
                      <td className="py-2 px-1.5 print:py-1 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2 px-1.5 print:py-1 text-right font-mono text-slate-700">
                        {formatPeso(item.sellingPrice)}
                      </td>
                      <td className="py-2 px-1.5 print:py-1 text-right font-mono font-bold text-slate-900">
                        {formatPeso(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold">
                  <td colSpan={6} className="py-2.5 px-1.5 print:py-1.5 text-right text-xs print:text-[10px] text-slate-700">
                    Grand Total Estimated ({uniqueItems.length} unique items, {totalUnits} total units):
                  </td>
                  <td className="py-2.5 px-1.5 print:py-1.5 text-center text-xs print:text-[10px] text-slate-800 font-mono">
                    {totalUnits}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-1.5 print:py-1.5 text-right font-black text-sm sm:text-base print:text-xs text-blue-700 print:text-black font-mono">
                    {formatPeso(totalCalculatedAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Unique Data Verification Footer Badge */}
          <div className="flex items-center justify-between text-[10px] print:text-[8.5px] text-slate-500 border-t border-dashed border-slate-300 pt-2 mb-4 print:mb-3">
            <span className="flex items-center gap-1 font-mono">
              <Hash className="w-3 h-3 text-slate-400 print:hidden" />
              Unique Ref: {slip.canvassNumber} • Timestamp: {slip.createdAt}
            </span>
            <span>7 Stars School and Office Supplies Depot • All prices VAT inclusive</span>
          </div>

          {/* Sign-offs (Avoid page break) */}
          <div className="pt-4 print:pt-3 border-t border-slate-200 print:border-slate-400 print-avoid-break">
            <div className="grid grid-cols-2 gap-8 text-center text-xs print:text-[10px] text-slate-500">
              <div>
                <div className="h-10 print:h-8 border-b border-slate-300 mb-1 flex items-end justify-center pb-1">
                  <span className="font-semibold text-slate-800 text-[11px] print:text-[10px]">{slip.customerName}</span>
                </div>
                <span>Canvassed / Requested By</span>
              </div>
              <div>
                <div className="h-10 print:h-8 border-b border-slate-300 mb-1 flex items-end justify-center pb-1">
                  <span className="font-semibold text-slate-800 text-[11px] print:text-[10px]">{companyName}</span>
                </div>
                <span>Official Quotation / Depot Staff</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="print:hidden bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">
              {uniqueItems.length} unique item row{uniqueItems.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Ready to print or save as PDF document
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleOpenNewTab}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Open print sheet in new browser window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Open in New Tab</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Download HTML canvass file for 100% reliable printing"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloaded ? 'Downloaded!' : 'Download Sheet'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Direct print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Canvass</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
