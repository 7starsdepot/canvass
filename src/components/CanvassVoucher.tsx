import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileText, Building, User, Calendar, Phone } from 'lucide-react';
import { CanvassSlip } from '../types';

interface CanvassVoucherProps {
  slip: CanvassSlip | null;
  onClose: () => void;
}

export const CanvassVoucher: React.FC<CanvassVoucherProps> = ({ slip, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!slip) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const lines = [
      `OFFICE SUPPLIES PRICE CANVASS SHEET`,
      `Canvass No: ${slip.canvassNumber}`,
      `Date: ${new Date(slip.createdAt).toLocaleDateString()}`,
      `Canvassed By: ${slip.customerName}`,
      `Department/Company: ${slip.departmentOrCompany}`,
      slip.contactNumber ? `Contact: ${slip.contactNumber}` : '',
      `--------------------------------------------------`,
      `ITEMS QUOTED:`,
      ...slip.items.map(
        (i, idx) =>
          `${idx + 1}. ${i.genericName}${i.brand ? ' (' + i.brand + ')' : ''} - ${i.quantity} ${i.unit} @ $${i.sellingPrice.toFixed(2)} = $${(i.quantity * i.sellingPrice).toFixed(2)}`
      ),
      `--------------------------------------------------`,
      `TOTAL ESTIMATED CANVASS: $${slip.totalAmount.toFixed(2)}`,
      slip.notes ? `Remarks: ${slip.notes}` : '',
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
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm">Official Canvass Slip</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {slip.canvassNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Copy Canvass Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer"
              title="Print Canvass Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Canvass</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Canvass Paper */}
        <div id="printable-canvass-content" className="p-6 sm:p-8 bg-white text-slate-800">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Office Supplies Procurement</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">PRICE CANVASS SHEET</h1>
                <p className="text-xs text-slate-500 mt-0.5">Price Quotation & Estimation Summary</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-slate-900 text-sm mb-1.5">
                  {slip.canvassNumber}
                </div>
                <div className="text-xs text-slate-500 flex items-center sm:justify-end gap-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6">
            <div>
              <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wide">Canvassed For / By</span>
              <div className="text-slate-900 font-bold text-sm mt-0.5">{slip.customerName}</div>
              <div className="flex items-center gap-1 text-slate-600 mt-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{slip.departmentOrCompany}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] font-medium uppercase tracking-wide">Contact / Reference</span>
              <div className="flex items-center gap-1 text-slate-700 font-medium mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{slip.contactNumber || 'N/A'}</span>
              </div>
              {slip.notes && (
                <p className="text-slate-600 italic mt-1 text-[11px]">"{slip.notes}"</p>
              )}
            </div>
          </div>

          {/* Items Table (Strictly Selling Price Only) */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Generic Name</th>
                  <th className="py-2.5 px-2">Brand</th>
                  <th className="py-2.5 px-2">Description</th>
                  <th className="py-2.5 px-2">Unit</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {slip.items.map((item, index) => {
                  const lineTotal = item.quantity * item.sellingPrice;
                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900">{item.genericName}</td>
                      <td className="py-2.5 px-2 text-slate-700">{item.brand || '—'}</td>
                      <td className="py-2.5 px-2 text-slate-500 max-w-[160px] truncate" title={item.description}>
                        {item.description || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{item.unit}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        ${item.sellingPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                        ${lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td colSpan={6} className="py-3 px-2 text-right font-bold text-sm text-slate-700">
                    Grand Total Estimated:
                  </td>
                  <td colSpan={2} className="py-3 px-2 text-right font-black text-base text-blue-700 font-mono">
                    ${slip.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Sign-offs */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
              <div>
                <div className="h-12 border-b border-slate-300 mb-1 flex items-end justify-center pb-1">
                  <span className="font-semibold text-slate-800 text-[11px]">{slip.customerName}</span>
                </div>
                <span>Canvassed / Requested By</span>
              </div>
              <div>
                <div className="h-12 border-b border-slate-300 mb-1 flex items-end justify-center pb-1">
                  <span className="font-semibold text-slate-700 text-[11px]">Sales / Supplies Staff</span>
                </div>
                <span>Verified / Quoted By</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="print:hidden bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
