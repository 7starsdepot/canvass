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
 * Exports the latest inventory data to an Excel (.xlsx) file.
 * The exported data details and column headers exactly match the format of the uploaded Excel file:
 * Generic Name, Brand, Description, Unit, No. of Stock, selling price, Buying price, SKU
 */
export function exportLatestInventoryToExcel(
  supplies: SupplyItem[],
  customFilename?: string
): void {
  if (!supplies || supplies.length === 0) {
    alert('No inventory data available to export.');
    return;
  }

  // Exact same data details as uploaded Excel file
  const rows = supplies.map(item => ({
    'Generic Name': item.genericName || '',
    'Brand': item.brand || '',
    'Description': item.description || '',
    'Unit': item.unit || 'Piece',
    'No. of Stock': Number(item.stock) || 0,
    'selling price': Number(item.sellingPrice) || 0,
    'Buying price': Number(item.buyingPrice) || 0,
    'SKU': item.sku || '',
  }));

  // Convert to worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Define column widths matching the upload template structure
  worksheet['!cols'] = [
    { wch: 30 }, // Generic Name
    { wch: 18 }, // Brand
    { wch: 45 }, // Description
    { wch: 14 }, // Unit
    { wch: 14 }, // No. of Stock
    { wch: 16 }, // selling price
    { wch: 16 }, // Buying price
    { wch: 16 }, // SKU
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Office Supplies');

  const filename = customFilename || `7Stars_Inventory_Data_${getTimestampForFilename()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports inventory in clean standard CSV format with identical upload headers
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
    'Generic Name': item.genericName || '',
    'Brand': item.brand || '',
    'Description': item.description || '',
    'Unit': item.unit || 'Piece',
    'No. of Stock': Number(item.stock) || 0,
    'selling price': Number(item.sellingPrice) || 0,
    'Buying price': Number(item.buyingPrice) || 0,
    'SKU': item.sku || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `7Stars_Inventory_Data_${getTimestampForFilename()}.csv`;
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
        'Order Status': (o.status || 'pending').toUpperCase(),
        'Item Status': it.itemStatus || 'available in store',
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
