import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Star,
  CheckCircle2,
  FileText,
  Building,
  User,
  ShoppingBag
} from 'lucide-react';
import { SevenStarsMark } from './Logo';
import {
  DEPOT_EMAIL,
  OutOfStockEmailPayload,
  buildOutOfStockEmailBody,
  generateMailtoLink,
  generateYahooMailLink,
  generateGmailLink
} from '../utils/outOfStockEmail';
import { formatPeso } from '../utils/currency';

interface OutOfStockEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: OutOfStockEmailPayload | null;
}

export const OutOfStockEmailModal: React.FC<OutOfStockEmailModalProps> = ({
  isOpen,
  onClose,
  payload,
}) => {
  const [copied, setCopied] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  if (!isOpen || !payload) return null;

  let emailSubject = `[7 Stars Depot Alert] Out of Stock Notification`;
  if (payload.source === 'customer_order' && payload.orderNumber) {
    emailSubject = `[7 Stars Depot Alert] Out of Stock Order Notification - Order #${payload.orderNumber}`;
  } else if (payload.source === 'multiple_orders' && payload.orders) {
    emailSubject = `[7 Stars Depot Alert] Out of Stock Notification - ${payload.orders.length} Orders Requiring Restock`;
  } else if (payload.source === 'admin_inventory') {
    emailSubject = `[7 Stars Depot Alert] Out of Stock Warehouse Requisition (${payload.items.length} items)`;
  }

  const emailBody = buildOutOfStockEmailBody(payload);
  const mailtoUrl = generateMailtoLink(DEPOT_EMAIL, emailSubject, emailBody);
  const yahooUrl = generateYahooMailLink(DEPOT_EMAIL, emailSubject, emailBody);
  const gmailUrl = generateGmailLink(DEPOT_EMAIL, emailSubject, emailBody);

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setDispatchStatus('Email text and details copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMarkDispatched = () => {
    setDispatchStatus(`Successfully flagged as sent to ${DEPOT_EMAIL}.`);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div
      id="out-of-stock-email-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="out-of-stock-email-modal"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh] animate-fade-in"
      >
        {/* Header (Blue & Red Depot Theme) */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-blue-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md border border-blue-500/50 p-1 shrink-0">
              <SevenStarsMark size={28} strokeColor="#38bdf8" strokeWidth={3.8} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-xs flex items-center gap-0.5">
                  <span className="text-red-500">7</span>
                  <span className="text-blue-400">Stars</span>
                  <span className="text-slate-300">Depot</span>
                </span>
                <span className="text-[11px] text-blue-200/80">• Out-of-Stock Order Dispatcher</span>
              </div>
              <h3 className="font-bold text-base text-white">
                Send Email to {DEPOT_EMAIL}
              </h3>
              <p className="text-xs text-slate-300">
                Notify depot management for orders containing zero-stock supplies
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

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Dispatch Status Feedback */}
          {dispatchStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-900 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{dispatchStatus}</span>
            </div>
          )}

          {/* Recipient & Subject Summary Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">Depot Email Recipient:</span>
              <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-mono font-bold text-xs border border-red-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-600" />
                {DEPOT_EMAIL}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">Email Subject:</span>
              <span className="text-slate-900 font-semibold truncate sm:max-w-md">{emailSubject}</span>
            </div>

            {payload.orderNumber && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-slate-600">
                <span>Canvass / Order Number:</span>
                <span className="font-mono font-bold text-blue-700">{payload.orderNumber}</span>
              </div>
            )}

            {payload.customerName && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-slate-600">
                <span>Customer & Department:</span>
                <span className="font-semibold text-slate-800">
                  {payload.customerName} {payload.departmentOrCompany ? `(${payload.departmentOrCompany})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Batch Orders Breakdown (if multiple orders mode) */}
          {payload.source === 'multiple_orders' && payload.orders && payload.orders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Orders with Out-of-Stock Items ({payload.orders.length})</span>
                </span>
                <span className="text-[11px] text-slate-500">Destination: {DEPOT_EMAIL}</span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {payload.orders.map((ord, ordIdx) => (
                  <div key={ordIdx} className="p-3 bg-red-50/30 rounded-xl border border-red-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {ord.orderNumber}
                      </span>
                      <span className="font-bold text-slate-800">{ord.customerName}</span>
                    </div>
                    <div className="divide-y divide-red-100">
                      {ord.items.map((it, itIdx) => (
                        <div key={itIdx} className="py-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 truncate">
                            {it.brand ? `[${it.brand}] ` : ''}{it.genericName}
                          </span>
                          <span className="font-bold text-red-700 ml-2 shrink-0">
                            {it.quantity} {it.unit} (0 Stock)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Out of Stock Items (for single order or inventory) */}
          {payload.source !== 'multiple_orders' && payload.items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Out of Stock Items in Order ({payload.items.length})</span>
                </span>
                <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Current Stock: 0 Available
                </span>
              </div>

              <div className="border border-red-200 rounded-xl divide-y divide-red-100 bg-red-50/20 max-h-48 overflow-y-auto">
                {payload.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">
                          {item.genericName}
                        </span>
                        {item.brand && (
                          <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            Brand: {item.brand}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>SKU: {item.sku || 'N/A'}</span>
                        <span>•</span>
                        <span>Unit: {item.unit}</span>
                        <span>•</span>
                        <span className="text-red-600 font-bold">0 in warehouse</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-bold">
                        Qty: {item.quantity} {item.unit}
                      </span>
                      {item.sellingPrice !== undefined && (
                        <div className="text-[11px] font-mono font-bold text-slate-700 mt-0.5">
                          {formatPeso(item.sellingPrice * item.quantity)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Body Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Generated Email Notification Body</span>
              <button
                onClick={handleCopy}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Message'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={emailBody}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 leading-relaxed resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Yahoo Mail Compose Link */}
            <a
              href={yahooUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={`Compose directly in Yahoo Mail to ${DEPOT_EMAIL}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Yahoo Mail</span>
            </a>

            {/* Direct Gmail Compose Link */}
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={`Compose directly in Gmail to ${DEPOT_EMAIL}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Gmail Web</span>
            </a>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Send via Default Mail App (mailto) */}
            <a
              href={mailtoUrl}
              onClick={() => setDispatchStatus(`Opening mail client addressed to ${DEPOT_EMAIL}...`)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer border border-red-500/50"
            >
              <Send className="w-4 h-4" />
              <span>Send to {DEPOT_EMAIL}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
