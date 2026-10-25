import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SupplyItem } from '../types';
import { formatPeso } from './currency';

export function createLigaoStocksPdf(supplies: SupplyItem[], ligaoOnly: boolean = true): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsToInclude = ligaoOnly
    ? supplies.filter(it => (it.stockLigao !== undefined ? it.stockLigao : 0) > 0)
    : supplies;

  const totalLigaoUnits = supplies.reduce((s, it) => s + (it.stockLigao !== undefined ? it.stockLigao : 0), 0);
  const totalGbtnUnits = supplies.reduce((s, it) => s + (it.stockGbtn !== undefined ? it.stockGbtn : it.stock || 0), 0);
  const itemsWithLigao = supplies.filter(it => (it.stockLigao !== undefined ? it.stockLigao : 0) > 0).length;
  const itemsZeroLigao = supplies.filter(it => (it.stockLigao !== undefined ? it.stockLigao : 0) === 0).length;
  const totalSellingVal = supplies.reduce((s, it) => s + (it.stockLigao !== undefined ? it.stockLigao : 0) * (it.sellingPrice || 0), 0);
  const totalCostVal = supplies.reduce((s, it) => s + (it.stockLigao !== undefined ? it.stockLigao : 0) * (it.buyingPrice || 0), 0);

  // Header banner: 7 Stars Navy
  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, 297, 24, 'F');

  // Title in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('7 STARS SCHOOL & OFFICE SUPPLIES DEPOT', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  const subtitle = ligaoOnly
    ? `LIGAO BRANCH STOCKS INVENTORY REPORT • STOCKS IN LIGAO ONLY (${itemsToInclude.length} ITEMS)`
    : `LIGAO BRANCH STOCKS INVENTORY REPORT • ALL SUPPLIES (${supplies.length} ITEMS)`;
  doc.text(subtitle, 14, 18);

  // Right side date/time
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Report Date: ${dateStr} ${timeStr}`, 283, 11, { align: 'right' });
  doc.text('Branch: Ligao City, Albay', 283, 18, { align: 'right' });

  // Summary Metrics Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 28, 269, 16, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 28, 269, 16, 2, 2, 'S');

  // Column 1: Total Ligao Units
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL STOCKS IN LIGAO:', 18, 35);
  doc.setFontSize(11);
  doc.setTextColor(3, 105, 161);
  doc.text(`${totalLigaoUnits.toLocaleString()} units`, 18, 41);

  // Column 2: In-Stock Items
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ITEMS IN BRANCH:', 82, 35);
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text(ligaoOnly ? `${itemsWithLigao} active items recorded` : `${itemsWithLigao} in-stock (${itemsZeroLigao} zero)`, 82, 41);

  // Column 3: Selling Valuation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RETAIL VALUATION:', 150, 35);
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text(`PHP ${totalSellingVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 41);

  // Column 4: Purchasing Cost
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CAPITAL COST (BUYING):', 220, 35);
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text(`PHP ${totalCostVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 220, 41);

  // Prepare table data
  const head = ligaoOnly
    ? [[
        '#',
        'SKU',
        'Item Generic Name',
        'Brand',
        'Category',
        'Unit',
        'Stock IN Ligao',
        'Selling Price',
        'Ligao Value (PHP)',
      ]]
    : [[
        '#',
        'SKU',
        'Item Generic Name',
        'Brand',
        'Category',
        'Unit',
        'Stock IN Ligao',
        'IN GBTN',
        'Combined Total',
        'Selling Price',
        'Ligao Value (PHP)',
      ]];

  const tableData = itemsToInclude.map((item, idx) => {
    const ligaoStock = item.stockLigao !== undefined ? item.stockLigao : 0;
    const gbtnStock = item.stockGbtn !== undefined ? item.stockGbtn : item.stock || 0;
    const totalStock = ligaoStock + gbtnStock;
    const ligaoVal = ligaoStock * (item.sellingPrice || 0);

    if (ligaoOnly) {
      return [
        idx + 1,
        item.sku || `SUP-${idx + 1}`,
        item.genericName || item.name || '',
        item.brand || 'Generic',
        item.category || (item.isSned ? 'SNED Materials' : 'Supplies'),
        item.unit || 'pc',
        ligaoStock,
        `PHP ${(item.sellingPrice || 0).toFixed(2)}`,
        `PHP ${ligaoVal.toFixed(2)}`,
      ];
    }

    return [
      idx + 1,
      item.sku || `SUP-${idx + 1}`,
      item.genericName || item.name || '',
      item.brand || 'Generic',
      item.category || (item.isSned ? 'SNED Materials' : 'Supplies'),
      item.unit || 'pc',
      ligaoStock,
      gbtnStock,
      totalStock,
      `PHP ${(item.sellingPrice || 0).toFixed(2)}`,
      `PHP ${ligaoVal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 48,
    head,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [12, 74, 110],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
      textColor: [15, 23, 42],
    },
    columnStyles: ligaoOnly
      ? {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 'auto', fontStyle: 'bold' },
          3: { cellWidth: 28 },
          4: { cellWidth: 32 },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 32, halign: 'center', fontStyle: 'bold', textColor: [3, 105, 161] },
          7: { cellWidth: 28, halign: 'right' },
          8: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 9, halign: 'center' },
          1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 'auto', fontStyle: 'bold' },
          3: { cellWidth: 22 },
          4: { cellWidth: 26 },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [3, 105, 161] },
          7: { cellWidth: 18, halign: 'center' },
          8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          9: { cellWidth: 22, halign: 'right' },
          10: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `7 Stars Depot • Ligao Branch Stocks Report • Page ${data.pageNumber} of ${pageCount}`,
        14,
        204
      );
      doc.text(
        'CONFIDENTIAL • 7 STARS SCHOOL & OFFICE SUPPLIES DEPOT',
        283,
        204,
        { align: 'right' }
      );
    },
  });

  return doc;
}

/**
 * Downloads the Ligao Stocks PDF file directly to user device
 */
export function downloadLigaoStocksPdf(supplies: SupplyItem[], ligaoOnly: boolean = true) {
  const doc = createLigaoStocksPdf(supplies, ligaoOnly);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const tag = ligaoOnly ? 'Ligao_Only' : 'Ligao_All';
  doc.save(`7Stars_Stocks_In_${tag}_${dateStr}.pdf`);
}

/**
 * Generates Blob URL for in-app viewing or iframe PDF viewer
 */
export function getLigaoStocksPdfBlobUrl(supplies: SupplyItem[], ligaoOnly: boolean = true): string {
  const doc = createLigaoStocksPdf(supplies, ligaoOnly);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds an official, full-fidelity Landscape A4 HTML document for printing
 * or "Save as PDF", matching the exact structure and metrics of the PDF report.
 */
export function generateLigaoPrintHtml(supplies: SupplyItem[], ligaoOnly: boolean = true): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsToInclude = ligaoOnly
    ? supplies.filter(it => (it.stockLigao !== undefined ? it.stockLigao : 0) > 0)
    : supplies;

  const totalLigaoUnits = supplies.reduce((s, it) => s + (it.stockLigao !== undefined ? it.stockLigao : 0), 0);
  const totalGbtnUnits = supplies.reduce((s, it) => s + (it.stockGbtn !== undefined ? it.stockGbtn : it.stock || 0), 0);
  const totalCombinedUnits = totalLigaoUnits + totalGbtnUnits;
  const itemsWithLigao = supplies.filter(it => (it.stockLigao !== undefined ? it.stockLigao : 0) > 0).length;
  const itemsZeroLigao = supplies.filter(it => (it.stockLigao !== undefined ? it.stockLigao : 0) === 0).length;
  const totalSellingVal = supplies.reduce((s, it) => s + (it.stockLigao !== undefined ? it.stockLigao : 0) * (it.sellingPrice || 0), 0);
  const totalCostVal = supplies.reduce((s, it) => s + (it.stockLigao !== undefined ? it.stockLigao : 0) * (it.buyingPrice || 0), 0);

  const ligaoShare = totalCombinedUnits > 0 ? ((totalLigaoUnits / totalCombinedUnits) * 100).toFixed(1) : '0';

  const tableRowsHtml = itemsToInclude
    .map((item, idx) => {
      const ligaoStock = item.stockLigao !== undefined ? item.stockLigao : 0;
      const gbtnStock = item.stockGbtn !== undefined ? item.stockGbtn : item.stock || 0;
      const combined = ligaoStock + gbtnStock;
      const ligaoVal = ligaoStock * (item.sellingPrice || 0);
      const isZero = ligaoStock === 0;

      return `
        <tr style="${isZero ? 'background-color: #fef2f2; color: #64748b;' : 'background-color: #ffffff;'}">
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 7.5pt; color: #64748b;">${idx + 1}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; font-size: 7.5pt; color: #0f172a; white-space: nowrap;">${escapeHtml(item.sku || `SUP-${idx + 1}`)}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 8pt; color: #0f172a;">${escapeHtml(item.genericName || item.name)}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-size: 7.5pt; color: #334155;">${escapeHtml(item.brand || '—')}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-size: 7.5pt; color: #475569;">${escapeHtml(item.category || (item.isSned ? 'SNED' : 'Supplies'))}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 7.5pt; color: #475569;">${escapeHtml(item.unit || 'pc')}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 900; font-size: 8.5pt; background-color: #e0f2fe; color: #0369a1;">${ligaoStock}</td>
          ${!ligaoOnly ? `<td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 8pt; color: #475569;">${gbtnStock}</td><td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700; font-size: 8pt; color: #0f172a;">${combined}</td>` : ''}
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">${formatPeso(item.sellingPrice)}</td>
          <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: 700; font-size: 8pt; color: #0369a1;">${formatPeso(ligaoVal)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>7 Stars Depot - Stocks in Ligao Official Inventory Report</title>
  <style>
    @page {
      size: landscape A4;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.3;
    }
    .print-container {
      width: 100%;
      padding: 10px 14px;
    }
    .header-bar {
      background: #0a2540 !important;
      color: #ffffff !important;
      padding: 10px 16px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 3px solid #0284c7;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #ffffff;
      margin: 0 0 2px 0;
    }
    .report-subtitle {
      font-size: 8.5pt;
      font-weight: 700;
      color: #bae6fd;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin: 0;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #e2e8f0;
      line-height: 1.4;
    }
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .metric-card {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .metric-label {
      font-size: 7pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .metric-val {
      font-size: 12pt;
      font-weight: 900;
      font-family: monospace;
      color: #0369a1;
    }
    .metric-sub {
      font-size: 7pt;
      color: #64748b;
      margin-top: 1px;
    }
    table.inventory-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      page-break-inside: auto;
    }
    table.inventory-table thead {
      display: table-header-group;
    }
    table.inventory-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.inventory-table th {
      background: #0c4a6e !important;
      color: #ffffff !important;
      font-weight: 700;
      padding: 6px 6px;
      border: 1px solid #075985;
      text-align: left;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.inventory-table td {
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      font-size: 7.5pt;
      vertical-align: middle;
      color: #0f172a;
    }
    .signatures-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-box {
      border-top: 1.5px solid #64748b;
      padding-top: 4px;
      text-align: center;
      font-size: 7.5pt;
      color: #475569;
    }
    .audit-footer {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
    }
    @media print {
      @page {
        size: landscape;
        margin: 8mm 10mm;
      }
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .print-container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="header-bar">
      <div>
        <div class="company-title">7 STARS SCHOOL & OFFICE SUPPLIES DEPOT</div>
        <div class="report-subtitle">Official Stocks in Ligao Branch Inventory Report</div>
      </div>
      <div class="header-meta">
        <div><strong>Date:</strong> ${dateStr} ${timeStr}</div>
        <div><strong>Location:</strong> Ligao City Branch, Albay</div>
        <div><strong>Status:</strong> Official Audit Copy</div>
      </div>
    </div>

    <div class="metrics-bar">
      <div class="metric-card" style="border-left: 3px solid #0284c7;">
        <div class="metric-label">Total Stocks in Ligao</div>
        <div class="metric-val">${totalLigaoUnits.toLocaleString()} units</div>
        <div class="metric-sub">${ligaoShare}% of total depot stock</div>
      </div>
      <div class="metric-card" style="border-left: 3px solid #16a34a;">
        <div class="metric-label">Active Items in Branch</div>
        <div class="metric-val" style="color: #15803d;">${itemsWithLigao} items</div>
        <div class="metric-sub">${itemsZeroLigao} items currently at 0 stock</div>
      </div>
      <div class="metric-card" style="border-left: 3px solid #2563eb;">
        <div class="metric-label">Retail Selling Valuation</div>
        <div class="metric-val" style="color: #1d4ed8;">${formatPeso(totalSellingVal)}</div>
        <div class="metric-sub">Branch selling price value</div>
      </div>
      <div class="metric-card" style="border-left: 3px solid #d97706;">
        <div class="metric-label">Purchasing Cost (Capital)</div>
        <div class="metric-val" style="color: #b45309;">${formatPeso(totalCostVal)}</div>
        <div class="metric-sub">Cost invested in branch stock</div>
      </div>
    </div>

    <table class="inventory-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th style="width: 75px;">SKU</th>
          <th>Generic Name / Item</th>
          <th style="width: 85px;">Brand</th>
          <th style="width: 85px;">Category</th>
          <th style="width: 40px; text-align: center;">Unit</th>
          <th style="width: 85px; text-align: center; background-color: #0369a1 !important;">Stock IN Ligao</th>
          <th style="width: 65px; text-align: center;">IN GBTN</th>
          <th style="width: 75px; text-align: center;">Total Stock</th>
          <th style="width: 80px; text-align: right;">Selling Price</th>
          <th style="width: 90px; text-align: right;">Ligao Value</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div class="signatures-block">
      <div class="sig-box">
        <strong>Prepared By:</strong><br>
        Depot Inventory Admin / Encoder
      </div>
      <div class="sig-box">
        <strong>Verified By:</strong><br>
        Ligao Branch Custodian / Receiving Officer
      </div>
      <div class="sig-box">
        <strong>Approved By:</strong><br>
        General Management / Depot Head
      </div>
    </div>

    <div class="audit-footer">
      <div>CONFIDENTIAL • 7 STARS SCHOOL & OFFICE SUPPLIES DEPOT</div>
      <div>Official Ligao Branch Audit Document • Generated ${dateStr}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Executes direct printing of the Ligao stocks report.
 * Uses an off-screen iframe (1200x850px) with styled Landscape A4 HTML, which gives
 * Chromium/WebKit the layout geometry needed to render all boxes, avoiding blank printouts.
 */
export function executePrintLigaoStocks(supplies: SupplyItem[], ligaoOnly: boolean = true): { success: boolean; error?: string } {
  const html = generateLigaoPrintHtml(supplies, ligaoOnly);

  // Strategy 1: Off-screen iframe print with real dimensions
  try {
    const existing = document.getElementById('ligao-temp-print-frame');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'ligao-temp-print-frame';
    // CRITICAL FIX: The iframe MUST have positive desktop dimensions (e.g. 1200x850px)
    // and opacity 1 so Chromium computes all layout boxes. We move it off-screen via left: -10000px.
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1200px';
    iframe.style.height = '850px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'visible';
    iframe.style.opacity = '1';
    document.body.appendChild(iframe);

    let hasTriggered = false;
    const triggerPrint = () => {
      if (hasTriggered) return;
      hasTriggered = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e: any) {
        console.warn('Iframe print failed, falling back to window.print():', e);
        try {
          window.print();
        } catch (winErr: any) {
          console.warn('Window print failed:', winErr);
        }
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    };

    // Listen for iframe load
    iframe.onload = () => {
      setTimeout(triggerPrint, 350);
    };

    // Write content via doc or srcdoc
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      iframe.srcdoc = html;
    }

    // Safety fallback timer if onload doesn't fire
    setTimeout(() => {
      if (!hasTriggered) {
        triggerPrint();
      }
    }, 850);

    return { success: true };
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

