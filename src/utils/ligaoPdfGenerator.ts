import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SupplyItem } from '../types';

export function createLigaoStocksPdf(supplies: SupplyItem[]): jsPDF {
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
  doc.text('LIGAO BRANCH STOCKS INVENTORY REPORT • OFFICIAL AUDIT', 14, 18);

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
  doc.text(`${itemsWithLigao} in-stock (${itemsZeroLigao} zero)`, 82, 41);

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
  const tableData = supplies.map((item, idx) => {
    const ligaoStock = item.stockLigao !== undefined ? item.stockLigao : 0;
    const gbtnStock = item.stockGbtn !== undefined ? item.stockGbtn : item.stock || 0;
    const totalStock = ligaoStock + gbtnStock;
    const ligaoVal = ligaoStock * (item.sellingPrice || 0);

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
    head: [[
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
    ]],
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
    columnStyles: {
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
export function downloadLigaoStocksPdf(supplies: SupplyItem[]) {
  const doc = createLigaoStocksPdf(supplies);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  doc.save(`7Stars_Stocks_In_Ligao_${dateStr}.pdf`);
}

/**
 * Generates Blob URL for in-app viewing or iframe PDF viewer
 */
export function getLigaoStocksPdfBlobUrl(supplies: SupplyItem[]): string {
  const doc = createLigaoStocksPdf(supplies);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
