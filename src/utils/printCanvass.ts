import { CanvassSlip } from '../types';
import { formatPeso } from './currency';

export function generateCanvassPrintHtml(
  slip: CanvassSlip,
  uniqueItems: CanvassSlip['items'],
  totalUnits: number,
  totalAmount: number,
  companyName: string
): string {
  const formattedDate = new Date(slip.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableRowsHtml = uniqueItems
    .map((item, idx) => {
      const lineTotal = item.quantity * item.sellingPrice;
      const isUnlisted = !!item.isCustomUnlisted;
      const skuLabel = isUnlisted
        ? `<span>${escapeHtml(item.sku || 'UNL')}</span><div style="font-size: 7.5pt; font-weight: bold; color: #b45309; text-transform: uppercase;">[Special Order]</div>`
        : escapeHtml(item.sku || `ITEM-${idx + 1}`);

      const notesHtml = item.customerNotes
        ? `<div style="font-size: 8.5pt; color: #64748b; font-style: italic; font-weight: normal; margin-top: 2px;">Note: "${escapeHtml(item.customerNotes)}"</div>`
        : '';

      const unitPriceHtml = item.sellingPrice > 0
        ? `${formatPeso(item.sellingPrice)}${isUnlisted ? ' <span style="font-size: 8pt; color: #64748b;">(Est.)</span>' : ''}`
        : '<span style="color: #b45309; font-weight: bold; font-size: 8.5pt;">For Quotation</span>';

      const totalHtml = lineTotal > 0
        ? formatPeso(lineTotal)
        : '<span style="color: #64748b; font-size: 8.5pt;">TBD</span>';

      return `
        <tr style="${isUnlisted ? 'background-color: #fffbeb;' : ''}">
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 9.5pt; color: #475569;">${skuLabel}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${escapeHtml(item.genericName)}${notesHtml}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; color: #334155;">${escapeHtml(item.brand || '—')}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 9.5pt;">${escapeHtml(item.description || '—')}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">${escapeHtml(item.unit)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-align: center; color: #0f172a;">${item.quantity}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; text-align: right; color: #334155;">${unitPriceHtml}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; text-align: right; color: #0f172a;">${totalHtml}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canvass Slip ${slip.canvassNumber} - ${escapeHtml(companyName)}</title>
  <style>
    @page {
      size: portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 20px;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.4;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-bar {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .depot-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: -0.01em;
      color: #1d4ed8;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }
    .doc-heading {
      font-size: 18pt;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 2px 0;
      letter-spacing: -0.02em;
    }
    .doc-subheading {
      font-size: 9.5pt;
      color: #64748b;
      margin: 0;
    }
    .canvass-no-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 700;
      font-size: 11pt;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .date-label {
      font-size: 9pt;
      color: #64748b;
      text-align: right;
    }
    .meta-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .meta-label {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      font-size: 10.5pt;
    }
    .meta-sub {
      color: #475569;
      font-size: 9pt;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 14px;
    }
    th {
      border-bottom: 2px solid #0f172a;
      padding: 8px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5pt;
      letter-spacing: 0.03em;
      color: #334155;
    }
    tfoot tr {
      border-top: 2px solid #0f172a;
      font-weight: 800;
    }
    tfoot td {
      padding: 9px 8px;
    }
    .grand-total {
      font-size: 13pt;
      font-family: monospace;
      font-weight: 900;
      color: #1d4ed8;
      text-align: right;
    }
    .ref-bar {
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      margin-top: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #64748b;
      font-family: monospace;
    }
    .sign-section {
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-line {
      height: 38px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 4px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 2px;
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .sign-caption {
      font-size: 8.5pt;
      color: #64748b;
    }
    .no-print-toolbar {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-weight: 700;
      font-size: 10pt;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .container {
        width: 100% !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div>
      <strong>Official Price Canvass Voucher</strong>
      <span style="opacity: 0.7; margin-left: 8px; font-size: 9pt;">${slip.canvassNumber}</span>
    </div>
    <button class="print-btn" onclick="window.print()">Print Document (Ctrl + P)</button>
  </div>

  <div class="container">
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 14px;">
        <svg viewBox="0 0 200 200" width="48" height="48" style="flex-shrink: 0;" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="100.00,158.00 91.18,136.14 67.66,134.51 85.73,119.36 80.02,96.49 100.00,109.00 119.98,96.49 114.27,119.36 132.34,134.51 108.82,136.14" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
          <polygon points="54.65,136.16 66.25,115.64 52.86,96.23 75.97,100.92 90.28,82.19 92.96,105.61 115.20,113.44 93.75,123.23 93.18,146.80 77.25,129.42" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
          <polygon points="43.45,87.09 66.73,83.36 73.55,60.80 84.30,81.78 107.87,81.30 91.23,98.00 98.97,120.26 77.95,109.60 59.16,123.85 62.81,100.55" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
          <polygon points="74.83,47.74 92.27,63.62 114.16,54.88 104.45,76.36 119.53,94.49 96.10,91.89 83.52,111.83 78.74,88.74 55.89,82.94 76.38,71.27" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
          <polygon points="125.17,47.74 123.62,71.27 144.11,82.94 121.26,88.74 116.48,111.83 103.90,91.89 80.47,94.49 95.55,76.36 85.84,54.88 107.73,63.62" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
          <polygon points="156.55,87.09 137.19,100.55 140.84,123.85 122.05,109.60 101.03,120.26 108.77,98.00 92.13,81.30 115.70,81.78 126.45,60.80 133.27,83.36" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
          <polygon points="145.35,136.16 122.75,129.42 106.82,146.80 106.25,123.23 84.80,113.44 107.04,105.61 109.72,82.19 124.03,100.92 147.14,96.23 133.75,115.64" stroke="#0047FF" stroke-width="2.5" stroke-linejoin="round" />
        </svg>
        <div>
          <div style="font-weight: 900; font-size: 11pt; letter-spacing: -0.2px;">
            <span style="color: #E31837;">7 </span>
            <span style="color: #0047FF;">Stars </span>
            <span style="color: #E31837;">School </span>
            <span style="color: #0047FF;">and </span>
            <span style="color: #E31837;">Office </span>
            <span style="color: #0047FF;">Supplies </span>
            <span style="color: #E31837;">Depot</span>
          </div>
          <h1 class="doc-heading">PRICE CANVASS SHEET</h1>
          <p class="doc-subheading">Official School & Office Supplies Price Quotation</p>
        </div>
      </div>
      <div style="text-align: right;">
        <div class="canvass-no-badge">${slip.canvassNumber}</div>
        <div class="date-label">Date: ${formattedDate}</div>
      </div>
    </div>

    <div class="meta-box">
      <div>
        <div class="meta-label">Issuing Supplier / Depot</div>
        <div class="meta-val">${escapeHtml(companyName)}</div>
        <div class="meta-sub">Official School & Office Supplies Depot</div>
      </div>
      <div>
        <div class="meta-label">Canvassed For / Inquirer</div>
        <div class="meta-val">${escapeHtml(slip.customerName)}</div>
        <div class="meta-sub">${escapeHtml(slip.departmentOrCompany)}</div>
        ${
          slip.notes
            ? `<div style="font-style: italic; color: #64748b; font-size: 8.5pt; margin-top: 4px;">"${escapeHtml(
                slip.notes
              )}"</div>`
            : ''
        }
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th style="width: 80px; text-align: left;">SKU / Code</th>
          <th style="text-align: left;">Generic Name</th>
          <th style="text-align: left;">Brand</th>
          <th style="text-align: left;">Specification</th>
          <th style="width: 50px; text-align: center;">Unit</th>
          <th style="width: 44px; text-align: center;">Qty</th>
          <th style="width: 85px; text-align: right;">Unit Price</th>
          <th style="width: 95px; text-align: right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align: right; font-size: 9.5pt; color: #334155;">
            Grand Total Estimated (${uniqueItems.length} unique items, ${totalUnits} total units):
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 10pt;">${totalUnits}</td>
          <td></td>
          <td class="grand-total">${formatPeso(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="ref-bar">
      <span>REF: ${slip.canvassNumber} • Timestamp: ${slip.createdAt}</span>
      <span>${escapeHtml(companyName)} • All prices VAT inclusive</span>
    </div>

    <div class="sign-section">
      <div>
        <div class="sign-line">${escapeHtml(slip.customerName)}</div>
        <div class="sign-caption">Canvassed / Requested By</div>
      </div>
      <div>
        <div class="sign-line">${escapeHtml(companyName)}</div>
        <div class="sign-caption">Official Quotation / Depot Staff</div>
      </div>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog when document opens
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.log('Print trigger notice:', e);
        }
      }, 250);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Downloads a self-contained, print-ready HTML file of the canvass quotation sheet.
 * Works 100% in any browser even if iframes sandbox/block window.print().
 */
export function downloadPrintableCanvassHtml(
  slip: CanvassSlip,
  uniqueItems: CanvassSlip['items'],
  totalUnits: number,
  totalAmount: number,
  companyName: string
) {
  const htmlContent = generateCanvassPrintHtml(
    slip,
    uniqueItems,
    totalUnits,
    totalAmount,
    companyName
  );

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Canvass_${slip.canvassNumber}_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Opens a print-ready window or attempts iframe printing.
 * Returns true if direct print succeeded, false if blocked (in which case fallback should download or notify).
 */
export function executePrintCanvass(
  slip: CanvassSlip,
  uniqueItems: CanvassSlip['items'],
  totalUnits: number,
  totalAmount: number,
  companyName: string
): { success: boolean; error?: string } {
  const html = generateCanvassPrintHtml(
    slip,
    uniqueItems,
    totalUnits,
    totalAmount,
    companyName
  );

  // Strategy 1: Hidden iframe print
  try {
    const iframe = document.createElement('iframe');
    iframe.id = 'temp-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        } catch (e: any) {
          console.warn('Iframe print failed:', e);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          // Fallback to window.print()
          try {
            window.print();
          } catch (winErr: any) {
            console.warn('Window print failed:', winErr);
          }
        }
      }, 300);

      return { success: true };
    }
  } catch (err: any) {
    console.warn('Strategy 1 failed:', err);
  }

  // Strategy 2: Direct window.print()
  try {
    window.print();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Print blocked by browser environment' };
  }
}
