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

export type OrderStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';

export interface InventoryDeductionLog {
  itemId: string;
  itemName: string;
  sku?: string;
  quantityDeducted: number;
  previousStock: number;
  newStock: number;
  timestamp: string;
}

export type OrderItemStatus =
  | 'available in store'
  | 'for purchase'
  | 'ordered online'
  | 'ordered physically'
  | 'delivered';

export interface CanvassItem {
  itemId: string;
  sku: string;
  genericName: string;
  brand: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  sellingPrice: number; // Selling price (0 if pending quotation or custom estimate)
  buyingPrice?: number; // Buying cost from inventory (for admin purchase review)
  isCustomUnlisted?: boolean; // True if customer added an unlisted item not found in catalog
  estimatedPrice?: number;    // Optional budget/target price entered by customer
  customerNotes?: string;     // Notes specific to this unlisted item
  itemStatus?: OrderItemStatus; // 'available in store' | 'for purchase' | 'ordered online' | 'ordered physically' | 'delivered'
}

export interface CustomUnlistedInput {
  genericName: string;
  brand?: string;
  description?: string;
  unit: string;
  quantity: number;
  estimatedPrice?: number;
  customerNotes?: string;
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
  hasUnlistedItems?: boolean;
  // Order status & automatic inventory deduction fields
  orderType?: 'canvass' | 'order';
  status?: OrderStatus;
  stockDeducted?: boolean;
  stockDeductedAt?: string;
  deductionLogs?: InventoryDeductionLog[];
  confirmedAt?: string;
  fulfilledAt?: string;
}
