import * as XLSX from 'xlsx';
import { SupplyItem, CanvassSlip } from '../types';

/**
 * Format a date timestamp for filenames: YYYY-MM-DD_HHmm
 */
function getTimestampForFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}${min}`;
}

/**
 * Exports the latest and most recently recorded inventory data to an Excel (.xlsx) file.
 * Contains all fields: Generic Name, Brand, Specifications, Unit, No. of Stock, Selling Price, Buying Price, etc.
 */
export function exportLatestInventoryToExcel(
  supplies: SupplyItem[],
  customFilename?: string
): void {
  if (!supplies || supplies.length === 0) {
    alert('No inventory data available to export.');
    return;
  }

  // 1. Prepare structured data for Excel
  const rows = supplies.map((item, index) => {
    const stock = Number(item.stock) || 0;
    const sellingPrice = Number(item.sellingPrice) || 0;
    const buyingPrice = Number(item.buyingPrice) || 0;
    const totalCostValuation = stock * buyingPrice;
    const totalRetailValuation = stock * sellingPrice;
    const unitMargin = sellingPrice - buyingPrice;
    const marginPercent = sellingPrice > 0 ? ((unitMargin / sellingPrice) * 100).toFixed(1) + '%' : '0%';

    let status = 'In Stock';
    if (stock <= 0) {
      status = 'Out of Stock (0)';
    } else if (stock <= (item.minStockLevel || 10)) {
      status = 'Low Stock';
    }

    return {
      'No.': index + 1,
      'SKU / Code': item.sku || `SKU-${String(index + 1).padStart(4, '0')}`,
      'Generic Name': item.genericName || '',
      'Brand': item.brand || '',
      'Description / Specification': item.description || '',
      'Unit': item.unit || 'pc',
      'No. of Stock': stock,
      'Selling Price (PHP)': sellingPrice,
      'Buying Price (PHP)': buyingPrice,
      'Category': item.category || 'General Supplies',
      'Stock Status': status,
      'Inventory Cost Value (PHP)': Number(totalCostValuation.toFixed(2)),
      'Inventory Selling Value (PHP)': Number(totalRetailValuation.toFixed(2)),
      'Unit Margin (PHP)': Number(unitMargin.toFixed(2)),
      'Margin %': marginPercent,
      'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleString() : new Date().toLocaleString(),
    };
  });

  // 2. Convert to worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 3. Define column widths for a clean presentation
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 14 }, // SKU
    { wch: 30 }, // Generic Name
    { wch: 18 }, // Brand
    { wch: 42 }, // Description
    { wch: 14 }, // Unit
    { wch: 14 }, // No. of Stock
    { wch: 20 }, // Selling Price
    { wch: 20 }, // Buying Price
    { wch: 24 }, // Category
    { wch: 18 }, // Stock Status
    { wch: 26 }, // Cost Value
    { wch: 26 }, // Selling Value
    { wch: 18 }, // Unit Margin
    { wch: 12 }, // Margin %
    { wch: 22 }, // Last Updated
  ];

  // 4. Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Latest Inventory');

  // 5. Also add an "Import Template Format" sheet for convenience
  const importCompatibleRows = supplies.map(item => ({
    'Generic Name': item.genericName,
    'Brand': item.brand,
    'Description': item.description,
    'Unit': item.unit,
    'No. of Stock': item.stock,
    'selling price': item.sellingPrice,
    'Buying price': item.buyingPrice,
  }));
  const templateSheet = XLSX.utils.json_to_sheet(importCompatibleRows);
  templateSheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 42 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Import Ready Template');

  const filename = customFilename || `7Stars_Latest_Recorded_Inventory_${getTimestampForFilename()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports inventory in clean standard CSV format
 */
export function exportLatestInventoryToCSV(
  supplies: SupplyItem[],
  customFilename?: string
): void {
  if (!supplies || supplies.length === 0) {
    alert('No inventory data available to export.');
    return;
  }

  const exportData = supplies.map(item => ({
    'Generic Name': item.genericName,
    'Brand': item.brand,
    'Description': item.description,
    'Unit': item.unit,
    'No. of Stock': item.stock,
    'Selling Price': item.sellingPrice,
    'Buying Price': item.buyingPrice,
    'Category': item.category || 'General Supplies',
    'Last Updated': item.updatedAt || new Date().toISOString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `7Stars_Inventory_${getTimestampForFilename()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all orders and customer canvasses to Excel
 */
export function exportOrdersToExcel(
  orders: CanvassSlip[],
  customFilename?: string
): void {
  if (!orders || orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const orderRows = orders.map((o, idx) => ({
    'Order No.': o.canvassNumber,
    'Customer Name': o.customerName,
    'Department / Company': o.departmentOrCompany,
    'Contact': o.contactNumber || 'N/A',
    'Ordered Date': new Date(o.createdAt).toLocaleString(),
    'Total Amount (PHP)': o.totalAmount,
    'Status': (o.status || 'pending').toUpperCase(),
    'Stock Deducted': o.stockDeducted ? 'YES' : 'NO',
    'Deduction Date': o.stockDeductedAt ? new Date(o.stockDeductedAt).toLocaleString() : 'N/A',
    'Total Items': o.items.reduce((s, it) => s + it.quantity, 0),
    'Has Unlisted Items': o.hasUnlistedItems ? 'YES' : 'NO',
    'Customer Notes': o.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(orderRows);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 25 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 30 },
  ];

  // Also include itemized breakdown sheet
  const itemRows: any[] = [];
  orders.forEach(o => {
    o.items.forEach(it => {
      itemRows.push({
        'Order No.': o.canvassNumber,
        'Ordered Date': new Date(o.createdAt).toLocaleDateString(),
        'Customer': o.customerName,
        'Item SKU': it.sku || 'N/A',
        'Generic Name': it.genericName,
        'Brand': it.brand || '',
        'Unit': it.unit,
        'Ordered Quantity': it.quantity,
        'Selling Price (PHP)': it.sellingPrice,
        'Item Total (PHP)': it.sellingPrice * it.quantity,
        'Is Unlisted': it.isCustomUnlisted ? 'YES' : 'NO',
        'Status': (o.status || 'pending').toUpperCase(),
      });
    });
  });
  const itemsSheet = XLSX.utils.json_to_sheet(itemRows);
  itemsSheet['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 26 },
    { wch: 16 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Summary');
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Ordered Items Detail');

  const filename = customFilename || `7Stars_Orders_Dashboard_${getTimestampForFilename()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
