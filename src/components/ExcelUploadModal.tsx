import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Table,
  Layers,
  HelpCircle
} from 'lucide-react';
import { SupplyItem } from '../types';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Omit<SupplyItem, 'id' | 'updatedAt'>[], mode: 'append' | 'replace') => void;
}

interface ParsedSupplyRow {
  genericName: string;
  brand: string;
  description: string;
  unit: string;
  stock: number;
  sellingPrice: number;
  buyingPrice: number;
  sku: string;
  isValid: boolean;
  errors: string[];
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSupplyRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to flexibly find column value regardless of casing and spacing
  const extractFieldValue = (row: Record<string, unknown>, targetNames: string[]): unknown => {
    const keys = Object.keys(row);
    for (const target of targetNames) {
      const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key of keys) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedKey === normalizedTarget) {
          return row[key];
        }
      }
    }
    return undefined;
  };

  const processWorkbook = (workbook: XLSX.WorkBook, name: string) => {
    try {
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError('The uploaded workbook contains no sheets.');
        setIsProcessing(false);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) {
        setParseError('The selected spreadsheet is empty or has no data rows.');
        setIsProcessing(false);
        return;
      }

      const results: ParsedSupplyRow[] = [];

      rawData.forEach((row, idx) => {
        const errors: string[] = [];

        // Required headers matching user prompt:
        // "Generic Name", "Brand", "Description", "Unit", "No. of Stock", "selling price", "Buying price"
        const rawGeneric = extractFieldValue(row, ['Generic Name', 'GenericName', 'Generic', 'Item Name', 'Name']);
        const rawBrand = extractFieldValue(row, ['Brand', 'Brand Name', 'Manufacturer']);
        const rawDesc = extractFieldValue(row, ['Description', 'Desc', 'Specs', 'Specification']);
        const rawUnit = extractFieldValue(row, ['Unit', 'UOM', 'Packaging']);
        const rawStock = extractFieldValue(row, ['No. of Stock', 'No of Stock', 'No. of stock', 'Stock', 'Quantity', 'Qty']);
        const rawSelling = extractFieldValue(row, ['selling price', 'Selling Price', 'Selling price', 'Price', 'Retail Price']);
        const rawBuying = extractFieldValue(row, ['Buying price', 'Buying Price', 'buying price', 'Cost', 'Cost Price', 'Purchase Price']);
        const rawSku = extractFieldValue(row, ['SKU', 'Item Code', 'Code']);

        const genericName = String(rawGeneric ?? '').trim();
        const brand = String(rawBrand ?? '').trim();
        const description = String(rawDesc ?? '').trim();
        const unit = String(rawUnit ?? 'Piece').trim() || 'Piece';

        // Parse Stock
        const parsedStock = parseInt(String(rawStock ?? '0').replace(/[^0-9-]/g, ''), 10);
        const stock = isNaN(parsedStock) ? 0 : Math.max(0, parsedStock);

        // Parse Selling Price
        const cleanSellingStr = String(rawSelling ?? '0').replace(/[^0-9.-]/g, '');
        const parsedSelling = parseFloat(cleanSellingStr);
        const sellingPrice = isNaN(parsedSelling) ? 0 : Math.max(0, parsedSelling);

        // Parse Buying Price
        const cleanBuyingStr = String(rawBuying ?? '0').replace(/[^0-9.-]/g, '');
        const parsedBuying = parseFloat(cleanBuyingStr);
        const buyingPrice = isNaN(parsedBuying) ? 0 : Math.max(0, parsedBuying);

        // Generate SKU if missing
        let sku = String(rawSku ?? '').trim().toUpperCase();
        if (!sku) {
          const prefix = (genericName.substring(0, 3) || 'SUP').toUpperCase().replace(/[^A-Z]/g, 'ITM');
          sku = `${prefix}-${String(idx + 101).padStart(3, '0')}`;
        }

        // Validate
        if (!genericName) {
          errors.push('Missing Generic Name');
        }

        results.push({
          genericName,
          brand,
          description,
          unit,
          stock,
          sellingPrice,
          buyingPrice,
          sku,
          isValid: errors.length === 0,
          errors,
        });
      });

      setFileName(name);
      setParsedRows(results);
      setParseError(null);
    } catch (err) {
      setParseError('Failed to parse Excel file. Please ensure it is a valid spreadsheet.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        processWorkbook(workbook, file.name);
      } catch {
        setParseError('Could not read the spreadsheet file. Supported formats: .xlsx, .xls, .csv');
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Error loading file. Please try again.');
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setIsProcessing(true);
      setParseError(null);

      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          processWorkbook(workbook, file.name);
        } catch {
          setParseError('Could not read spreadsheet.');
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Generic Name': 'Ballpen 0.5mm',
        'Brand': 'Pilot',
        'Description': 'Black retractable gel ink pen with comfortable grip',
        'Unit': 'Box of 12',
        'No. of Stock': 50,
        'selling price': 8.50,
        'Buying price': 5.20,
      },
      {
        'Generic Name': 'Copy Paper A4 80gsm',
        'Brand': 'PaperOne',
        'Description': '500 sheets per ream, 96% high brightness for office printers',
        'Unit': 'Ream',
        'No. of Stock': 120,
        'selling price': 6.25,
        'Buying price': 4.10,
      },
      {
        'Generic Name': 'Sticky Notes 3x3',
        'Brand': 'Post-it',
        'Description': 'Classic canary yellow self-adhesive note pads, 100 sheets/pad',
        'Unit': 'Pack of 12',
        'No. of Stock': 45,
        'selling price': 7.50,
        'Buying price': 4.50,
      },
      {
        'Generic Name': 'Document Folder Letter Size',
        'Brand': 'Smead',
        'Description': 'Heavy duty 2-pocket polypropylene report folders',
        'Unit': 'Box of 25',
        'No. of Stock': 30,
        'selling price': 14.00,
        'Buying price': 9.20,
      },
      {
        'Generic Name': 'Permanent Marker Chisel Tip',
        'Brand': 'Sharpie',
        'Description': 'Quick-drying waterproof black ink marker',
        'Unit': 'Pack of 4',
        'No. of Stock': 65,
        'selling price': 4.80,
        'Buying price': 2.90,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Office Supplies');

    // Auto-size columns
    const colWidths = [
      { wch: 25 }, // Generic Name
      { wch: 15 }, // Brand
      { wch: 40 }, // Description
      { wch: 15 }, // Unit
      { wch: 14 }, // No. of Stock
      { wch: 15 }, // selling price
      { wch: 15 }, // Buying price
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'office_supplies_inventory_template.xlsx');
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setParseError('No valid items found to import.');
      return;
    }

    const itemsToImport: Omit<SupplyItem, 'id' | 'updatedAt'>[] = validRows.map(r => ({
      sku: r.sku,
      genericName: r.genericName,
      brand: r.brand,
      name: r.brand ? `${r.brand} ${r.genericName}` : r.genericName,
      description: r.description,
      unit: r.unit,
      stock: r.stock,
      sellingPrice: r.sellingPrice,
      buyingPrice: r.buyingPrice,
      category: 'General Supplies',
      minStockLevel: 10,
    }));

    onImport(itemsToImport, importMode);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div
      id="excel-upload-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="excel-upload-modal"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Upload Office Supplies Excel File</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Import inventory using Generic Name, Brand, Description, Unit, No. of Stock, selling price, and Buying price
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Instructions and Download Template Card */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-950 mb-1">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                <span>Required Excel Column Fields</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Your spreadsheet must include columns: <strong className="font-semibold text-emerald-950">Generic Name</strong>, <strong className="font-semibold text-emerald-950">Brand</strong>, <strong className="font-semibold text-emerald-950">Description</strong>, <strong className="font-semibold text-emerald-950">Unit</strong>, <strong className="font-semibold text-emerald-950">No. of Stock</strong>, <strong className="font-semibold text-emerald-950">selling price</strong>, and <strong className="font-semibold text-emerald-950">Buying price</strong>.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Error Message */}
          {parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* File Upload / Drop Area */}
          {!fileName ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop your Excel file
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </p>
              {isProcessing && (
                <p className="text-xs text-emerald-600 font-semibold mt-3 animate-pulse">
                  Parsing spreadsheet contents...
                </p>
              )}
            </div>
          ) : (
            /* File Uploaded & Preview Stage */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{fileName}</span>
                    <span className="text-[11px] text-slate-500">
                      Found {parsedRows.length} total rows ({validCount} valid for import)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Import Mode Selector */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">Import Option:</span>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-800 font-medium">
                      <strong>Append</strong> to current inventory (keep existing items)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-slate-800 font-medium">
                      <strong>Replace</strong> entire inventory (overwrite current records)
                    </span>
                  </label>
                </div>
              </div>

              {/* Parsed Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Preview Data ({parsedRows.length} Items)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Showing all parsed columns mapped to inventory
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-600 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Generic Name</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-center">No. of Stock</th>
                        <th className="py-2.5 px-3 text-right">Selling Price</th>
                        <th className="py-2.5 px-3 text-right bg-amber-50/50">Buying Price</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50/60' : 'bg-red-50/40'}>
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {row.genericName || <span className="text-red-500 italic">Empty</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{row.brand || '—'}</td>
                          <td className="py-2 px-3 text-slate-500 max-w-[180px] truncate" title={row.description}>
                            {row.description || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{row.unit}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">{row.stock}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ${row.sellingPrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700 bg-amber-50/30">
                            ${row.buyingPrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50">
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-rose-700 font-semibold px-2 py-0.5 rounded bg-rose-50" title={row.errors.join(', ')}>
                                {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={validCount === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Import {validCount} Supplies to Inventory</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
