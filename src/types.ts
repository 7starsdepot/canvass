export interface SupplyItem {
  id: string;
  sku: string;
  genericName: string; // "Generic Name"
  brand: string;       // "Brand"
  name: string;        // Combined or primary display name
  description: string; // "Description"
  unit: string;        // "Unit"
  stock: number;       // "No. of Stock"
  sellingPrice: number;// "selling price"
  buyingPrice: number; // "Buying price" (Admin portal only)
  category?: string;
  minStockLevel?: number;
  updatedAt: string;
}

export interface CanvassItem {
  itemId: string;
  sku: string;
  genericName: string;
  brand: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  sellingPrice: number; // Selling price only (buying price strictly excluded)
}

export interface CanvassSlip {
  id: string;
  canvassNumber: string; // e.g. "CNV-2026-0001"
  createdAt: string;
  companyName?: string; // e.g. "7 Stars School and Office Supplies Depot"
  customerName: string;
  departmentOrCompany: string;
  contactNumber?: string;
  notes?: string;
  items: CanvassItem[];
  totalAmount: number;
}
