import { formatPeso } from './currency';

export interface OutOfStockItemDetail {
  genericName: string;
  brand?: string;
  sku?: string;
  unit: string;
  quantity: number;
  sellingPrice?: number;
  currentStock: number;
}

export interface OutOfStockOrderGroup {
  orderNumber: string;
  customerName: string;
  departmentOrCompany?: string;
  createdAt?: string;
  notes?: string;
  items: OutOfStockItemDetail[];
}

export interface OutOfStockEmailPayload {
  toEmail: string; // "sevenstarsdepot@yahoo.com"
  orderNumber?: string;
  customerName?: string;
  departmentOrCompany?: string;
  notes?: string;
  items: OutOfStockItemDetail[];
  orders?: OutOfStockOrderGroup[]; // For batch orders mode
  source: 'customer_order' | 'admin_inventory' | 'multiple_orders';
}

export const DEPOT_EMAIL = 'sevenstarsdepot@yahoo.com';

/**
 * Builds a clear, professional plain-text email message for depot order fulfillment
 */
export function buildOutOfStockEmailBody(payload: OutOfStockEmailPayload): string {
  const currentDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [];

  lines.push('ATTN: 7 Stars School & Office Supplies Depot');
  lines.push(`TO: ${payload.toEmail}`);
  lines.push(`DATE: ${currentDate}`);
  lines.push('--------------------------------------------------');

  if (payload.source === 'multiple_orders' && payload.orders && payload.orders.length > 0) {
    // Multiple orders batch notification
    lines.push(`SUBJECT: Out-of-Stock Notification for ${payload.orders.length} Customer Order(s)`);
    lines.push('--------------------------------------------------');
    lines.push('The following customer orders contain items that currently have ZERO STOCK');
    lines.push('in the warehouse catalog. Immediate replenishment / procurement is requested:');
    lines.push('');

    let grandTotalOutOfStockUnits = 0;
    let grandEstimatedValue = 0;

    payload.orders.forEach((ord, ordIdx) => {
      lines.push(`==================================================`);
      lines.push(`ORDER #${ordIdx + 1}: ${ord.orderNumber}`);
      lines.push(`CUSTOMER: ${ord.customerName}`);
      if (ord.departmentOrCompany) {
        lines.push(`DEPT / ORG: ${ord.departmentOrCompany}`);
      }
      if (ord.notes) {
        lines.push(`NOTES: ${ord.notes}`);
      }
      lines.push(`OUT-OF-STOCK ITEMS IN THIS ORDER (${ord.items.length} items):`);

      ord.items.forEach((item, itemIdx) => {
        grandTotalOutOfStockUnits += item.quantity;
        const lineTotal = (item.sellingPrice || 0) * item.quantity;
        grandEstimatedValue += lineTotal;
        const brandStr = item.brand ? `[Brand: ${item.brand}] ` : '';

        lines.push(`  ${itemIdx + 1}. ${brandStr}${item.genericName}`);
        if (item.sku) lines.push(`     SKU: ${item.sku}`);
        lines.push(`     Required Qty: ${item.quantity} ${item.unit}`);
        lines.push(`     Warehouse Stock: ${item.currentStock} in stock (OUT OF STOCK)`);
        if (item.sellingPrice) {
          lines.push(`     Quoted Price: ${formatPeso(item.sellingPrice)} each (Line: ${formatPeso(lineTotal)})`);
        }
      });
      lines.push('');
    });

    lines.push('==================================================');
    lines.push(`SUMMARY:`);
    lines.push(`Total Orders Affected: ${payload.orders.length}`);
    lines.push(`Total Out-of-Stock Units Requested: ${grandTotalOutOfStockUnits}`);
    if (grandEstimatedValue > 0) {
      lines.push(`Total Quoted Value of Out-of-Stock Items: ${formatPeso(grandEstimatedValue)}`);
    }
  } else if (payload.source === 'customer_order') {
    // Single customer order
    lines.push('SUBJECT: Out-of-Stock Customer Order Notification');
    lines.push('--------------------------------------------------');
    if (payload.orderNumber) {
      lines.push(`CANVASS / ORDER VOUCHER: ${payload.orderNumber}`);
      lines.push(`CUSTOMER: ${payload.customerName || 'Valued Customer'}`);
      lines.push(`ORGANIZATION / SCHOOL: ${payload.departmentOrCompany || 'N/A'}`);
      if (payload.notes) {
        lines.push(`PURPOSE / NOTES: ${payload.notes}`);
      }
      lines.push('--------------------------------------------------');
    }

    lines.push('');
    lines.push(`OUT-OF-STOCK ITEMS IN THIS ORDER (${payload.items.length} item${payload.items.length !== 1 ? 's' : ''}):`);
    lines.push('');

    let totalValue = 0;

    payload.items.forEach((item, index) => {
      const itemTotal = (item.sellingPrice || 0) * item.quantity;
      totalValue += itemTotal;
      const brandLabel = item.brand ? `[Brand: ${item.brand}] ` : '';

      lines.push(`${index + 1}. ${brandLabel}${item.genericName}`);
      if (item.sku) lines.push(`   - SKU: ${item.sku}`);
      lines.push(`   - Unit: ${item.unit}`);
      lines.push(`   - Quantity Needed: ${item.quantity} ${item.unit}`);
      lines.push(`   - Warehouse Stock Level: ${item.currentStock} in stock (OUT OF STOCK)`);
      if (item.sellingPrice !== undefined) {
        lines.push(`   - Unit Rate: ${formatPeso(item.sellingPrice)} (Line Total: ${formatPeso(itemTotal)})`);
      }
      lines.push('');
    });

    if (totalValue > 0) {
      lines.push('--------------------------------------------------');
      lines.push(`TOTAL ESTIMATED VALUE: ${formatPeso(totalValue)}`);
    }
  } else {
    // Admin zero-stock inventory requisition
    lines.push('SUBJECT: Warehouse Out-of-Stock Inventory Requisition Alert');
    lines.push('--------------------------------------------------');
    lines.push(`REQUISITION SUMMARY: ${payload.items.length} zero-stock catalog items`);
    lines.push('');
    lines.push('ITEMS REQUIRING REPLENISHMENT:');
    lines.push('');

    payload.items.forEach((item, index) => {
      const brandLabel = item.brand ? `[Brand: ${item.brand}] ` : '';
      lines.push(`${index + 1}. ${brandLabel}${item.genericName}`);
      if (item.sku) lines.push(`   - SKU: ${item.sku}`);
      lines.push(`   - Unit: ${item.unit}`);
      lines.push(`   - Current Stock: 0 in stock (OUT OF STOCK)`);
      if (item.sellingPrice) {
        lines.push(`   - Active Selling Price: ${formatPeso(item.sellingPrice)}`);
      }
      lines.push('');
    });
  }

  lines.push('--------------------------------------------------');
  lines.push('ACTION REQUIRED:');
  lines.push('These supplies currently have zero (0) stock in the 7 Stars catalog.');
  lines.push('Please initiate purchase orders, restock replenishment, or contact the customer.');
  lines.push('');
  lines.push('Dispatched via 7 Stars School & Office Supplies Depot Portal');
  lines.push(`Recipient: ${payload.toEmail}`);

  return lines.join('\n');
}

/**
 * Generate standard mailto link
 */
export function generateMailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generate direct Yahoo Mail web compose link
 */
export function generateYahooMailLink(to: string, subject: string, body: string): string {
  return `https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subj=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generate direct Gmail web compose link
 */
export function generateGmailLink(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
