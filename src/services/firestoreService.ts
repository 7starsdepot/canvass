import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  limit,
  query,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SupplyItem, CanvassSlip } from '../types';

export const SUPPLIES_COLLECTION = 'supplies';
export const CANVASS_COLLECTION = 'canvassSlips';

/**
 * Convert raw Firestore doc data into strongly typed SupplyItem
 */
export function formatFirestoreSupply(id: string, data: any): SupplyItem {
  const stockVal = Number(data.stock ?? data.quantity ?? 0);
  return {
    id,
    sku: data.sku || '',
    genericName: data.genericName || 'Untitled Item',
    brand: data.brand || '',
    name: data.name || (data.brand ? `${data.brand} ${data.genericName}` : data.genericName || 'Untitled Item'),
    description: data.description || '',
    unit: data.unit || 'pc',
    stock: stockVal,
    sellingPrice: Number(data.sellingPrice || 0),
    buyingPrice: Number(data.buyingPrice || 0),
    category: data.category || 'School & Office Supplies',
    minStockLevel: data.minStockLevel,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Format supply item for Firestore storage
 */
export function formatSupplyForStorage(item: SupplyItem) {
  const stock = Number(item.stock ?? 0);
  return {
    id: item.id,
    sku: item.sku || '',
    genericName: item.genericName.trim(),
    brand: (item.brand || '').trim(),
    name: item.name || (item.brand ? `${item.brand} ${item.genericName}` : item.genericName),
    description: (item.description || '').trim(),
    unit: item.unit.trim() || 'pc',
    stock: stock,
    quantity: stock, // stored for cross-compatibility
    sellingPrice: Math.max(0, Number(item.sellingPrice) || 0),
    buyingPrice: Math.max(0, Number(item.buyingPrice) || 0),
    category: item.category || 'School & Office Supplies',
    minStockLevel: item.minStockLevel ?? null,
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

/**
 * Real-time listener for the centralized supplies catalog.
 * Any update on any device triggers this callback instantly across all connected clients.
 */
export function subscribeToCentralSupplies(
  onData: (supplies: SupplyItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, SUPPLIES_COLLECTION);
  return onSnapshot(
    colRef,
    snapshot => {
      const items: SupplyItem[] = [];
      snapshot.forEach(docSnap => {
        items.push(formatFirestoreSupply(docSnap.id, docSnap.data()));
      });
      // Sort alphabetically by genericName, then brand
      items.sort((a, b) => a.genericName.localeCompare(b.genericName));
      onData(items);
    },
    err => {
      console.warn('Real-time supplies sync listener notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for shared canvass quotation records.
 */
export function subscribeToCentralCanvasses(
  onData: (slips: CanvassSlip[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, CANVASS_COLLECTION);
  return onSnapshot(
    colRef,
    snapshot => {
      const slips: CanvassSlip[] = [];
      snapshot.forEach(docSnap => {
        slips.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Sort newest first
      slips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(slips);
    },
    err => {
      console.warn('Real-time canvasses sync listener notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save / Create / Update a single supply in the central database immediately
 */
export async function saveCentralSupply(item: SupplyItem): Promise<void> {
  const docRef = doc(db, SUPPLIES_COLLECTION, item.id);
  const data = formatSupplyForStorage(item);
  await setDoc(docRef, data, { merge: true });
}

/**
 * Update buying and selling prices immediately in the central database
 */
export async function updateCentralPrices(
  id: string,
  buyingPrice: number,
  sellingPrice: number
): Promise<void> {
  const docRef = doc(db, SUPPLIES_COLLECTION, id);
  const updatedAt = new Date().toISOString();
  await updateDoc(docRef, {
    buyingPrice: Math.max(0, Number(buyingPrice) || 0),
    sellingPrice: Math.max(0, Number(sellingPrice) || 0),
    updatedAt,
  });
}

/**
 * Adjust stock quantity immediately in the central database
 */
export async function adjustCentralStock(id: string, delta: number, currentStock: number): Promise<void> {
  const docRef = doc(db, SUPPLIES_COLLECTION, id);
  const newStock = Math.max(0, currentStock + delta);
  const updatedAt = new Date().toISOString();
  await updateDoc(docRef, {
    stock: newStock,
    quantity: newStock,
    updatedAt,
  });
}

/**
 * Delete a supply from the central database
 */
export async function deleteCentralSupply(id: string): Promise<void> {
  const docRef = doc(db, SUPPLIES_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Batch write multiple supplies to the central database in chunks of 450 (Firestore limit is 500)
 */
export async function batchSaveCentralSupplies(
  items: SupplyItem[],
  mode: 'append' | 'replace' = 'append'
): Promise<void> {
  if (items.length === 0) return;

  // If replacing, clear existing collection first
  if (mode === 'replace') {
    const existingSnap = await getDocs(collection(db, SUPPLIES_COLLECTION));
    const deleteBatches: any[] = [];
    let currentDeleteBatch = writeBatch(db);
    let count = 0;

    for (const d of existingSnap.docs) {
      currentDeleteBatch.delete(d.ref);
      count++;
      if (count === 400) {
        deleteBatches.push(currentDeleteBatch.commit());
        currentDeleteBatch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      deleteBatches.push(currentDeleteBatch.commit());
    }
    await Promise.all(deleteBatches);
  }

  // Chunk write
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const ref = doc(db, SUPPLIES_COLLECTION, item.id);
      batch.set(ref, formatSupplyForStorage(item), { merge: true });
    }

    await batch.commit();
  }
}

/**
 * Clear all supplies from the central database
 */
export async function clearAllCentralSupplies(): Promise<void> {
  const existingSnap = await getDocs(collection(db, SUPPLIES_COLLECTION));
  let batch = writeBatch(db);
  let count = 0;
  const promises: any[] = [];

  for (const d of existingSnap.docs) {
    batch.delete(d.ref);
    count++;
    if (count === 400) {
      promises.push(batch.commit());
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    promises.push(batch.commit());
  }
  await Promise.all(promises);
}

/**
 * Save a canvass slip to the central database
 */
export async function saveCentralCanvass(slip: CanvassSlip): Promise<void> {
  const docRef = doc(db, CANVASS_COLLECTION, slip.id);
  await setDoc(docRef, slip, { merge: true });
}

/**
 * Delete a canvass slip from the central database
 */
export async function deleteCentralCanvass(id: string): Promise<void> {
  const docRef = doc(db, CANVASS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Check if the central database is empty; if so, populate it with initial recorded price list data
 */
export async function seedInitialCentralDataIfEmpty(defaultItems: SupplyItem[]): Promise<boolean> {
  try {
    const q = query(collection(db, SUPPLIES_COLLECTION), limit(1));
    const snap = await getDocs(q);
    if (snap.empty && defaultItems.length > 0) {
      console.log(`Seeding central Firestore database with ${defaultItems.length} initial recorded supplies...`);
      await batchSaveCentralSupplies(defaultItems, 'append');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Central seed check notice:', err);
    return false;
  }
}
