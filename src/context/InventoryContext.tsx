import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { SupplyItem, CanvassItem, CanvassSlip, CustomUnlistedInput } from '../types';
import initialSuppliesData from '../data/initialSupplies.json';
import {
  subscribeToCentralSupplies,
  subscribeToCentralCanvasses,
  saveCentralSupply,
  updateCentralPrices,
  adjustCentralStock,
  deleteCentralSupply,
  batchSaveCentralSupplies,
  clearAllCentralSupplies,
  saveCentralCanvass,
  deleteCentralCanvass,
  seedInitialCentralDataIfEmpty,
} from '../services/firestoreService';

interface CanvassDraftInput {
  customerName: string;
  departmentOrCompany: string;
  companyName?: string;
  contactNumber?: string;
  notes?: string;
}

interface InventoryContextType {
  // Inventory (Admin & Customer Catalog)
  supplies: SupplyItem[];
  isPriceListLoaded: boolean;
  isCentralSyncActive: boolean;
  lastRecordedTime: string | null;
  addSupplyItem: (item: Omit<SupplyItem, 'id' | 'updatedAt'>) => void;
  updateSupplyItem: (item: SupplyItem) => void;
  updatePrices: (id: string, buyingPrice: number, sellingPrice: number) => void;
  deleteSupplyItem: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  importExcelSupplies: (items: Omit<SupplyItem, 'id' | 'updatedAt'>[], mode: 'append' | 'replace') => number;
  clearAllSupplies: () => void;

  // Canvass (Customer View Only - Shared & Saved in Central DB)
  canvass: CanvassItem[];
  savedCanvasses: CanvassSlip[];
  addToCanvass: (supply: SupplyItem, quantity?: number) => void;
  addCustomUnlistedItem: (custom: CustomUnlistedInput) => void;
  updateCanvassQty: (itemId: string, quantity: number) => void;
  removeFromCanvass: (itemId: string) => void;
  clearCanvass: () => void;
  generateCanvassSlip: (details: CanvassDraftInput) => CanvassSlip | null;
  deleteCanvassSlip: (id: string) => void;

  // Admin Authentication
  isAdmin: boolean;
  adminUsername: string | null;
  adminLogin: (username: string, pass: string) => boolean;
  adminLogout: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const SUPPLIES_STORAGE_KEY = 'office_supplies_data_v2';
export const SUPPLIES_BACKUP_KEY = '7stars_recorded_supplies_price_list';
const LAST_RECORDED_KEY = '7stars_supplies_last_recorded_at';
const CANVASS_ITEMS_STORAGE_KEY = 'office_customer_canvass_v2';
const SAVED_CANVASSES_STORAGE_KEY = 'office_customer_canvass_slips_v2';
const ADMIN_SESSION_KEY = 'office_admin_session_v2';

const ALL_POSSIBLE_SUPPLY_KEYS = [
  SUPPLIES_STORAGE_KEY,
  SUPPLIES_BACKUP_KEY,
  'office_supplies_data',
  'office_supplies_master_recorded',
  'office_supplies',
  'office_customer_supplies',
  'supplies',
];

/**
 * Robust initial supplies fallback loader that inspects localStorage
 * and falls back to bundled master price list while Firestore finishes its initial snapshot.
 */
function loadFallbackSupplies(): SupplyItem[] {
  try {
    for (const key of ALL_POSSIBLE_SUPPLY_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as any).items) &&
          (parsed as any).items.length > 0
        ) {
          return (parsed as any).items;
        }
      }
    }
  } catch (err) {
    console.warn('Notice loading initial supplies from localStorage:', err);
  }

  if (Array.isArray(initialSuppliesData) && initialSuppliesData.length > 0) {
    return initialSuppliesData as SupplyItem[];
  }

  return [];
}

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Supplies State: Centralized Firestore catalog with instant local fallback
  const [supplies, setSupplies] = useState<SupplyItem[]>(() => loadFallbackSupplies());
  const [isPriceListLoaded, setIsPriceListLoaded] = useState<boolean>(false);
  const [isCentralSyncActive, setIsCentralSyncActive] = useState<boolean>(false);
  const [lastRecordedTime, setLastRecordedTime] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem(LAST_RECORDED_KEY) ||
        (initialSuppliesData.length > 0 ? (initialSuppliesData[0] as any).updatedAt : null)
      );
    } catch {
      return null;
    }
  });

  // 2. Canvass Items State (Active cart in session)
  const [canvass, setCanvass] = useState<CanvassItem[]>(() => {
    try {
      const stored = localStorage.getItem(CANVASS_ITEMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // 3. Saved Canvasses History (Centralized in Firestore)
  const [savedCanvasses, setSavedCanvasses] = useState<CanvassSlip[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_CANVASSES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // 4. Admin Auth State (username: 7stars, pass: pitodapat)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === '7stars';
    } catch {
      return false;
    }
  });

  const [adminUsername, setAdminUsername] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) || null;
    } catch {
      return null;
    }
  });

  // Cache helper to keep local storage updated in background
  const cacheLocally = (items: SupplyItem[]) => {
    try {
      localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(SUPPLIES_BACKUP_KEY, JSON.stringify(items));
      const now = new Date().toISOString();
      setLastRecordedTime(now);
      localStorage.setItem(LAST_RECORDED_KEY, now);
    } catch {
      // ignore storage quota issues
    }
  };

  /**
   * CENTRALIZED REAL-TIME FIRESTORE SYNCHRONIZATION
   * Subscribes to live changes on the centralized Firestore 'supplies' collection.
   * Any change made on any device immediately syncs to all users without manual refresh.
   */
  useEffect(() => {
    let isMounted = true;

    // First, verify and seed initial catalog if the central database is empty
    const defaultCatalog = loadFallbackSupplies();
    seedInitialCentralDataIfEmpty(defaultCatalog).catch(err => {
      console.warn('Central catalog seeding check notice:', err);
    });

    // Subscribe to live updates from the central database
    const unsubscribeSupplies = subscribeToCentralSupplies(
      centralSupplies => {
        if (!isMounted) return;

        if (centralSupplies.length > 0) {
          setSupplies(centralSupplies);
          cacheLocally(centralSupplies);
        } else if (defaultCatalog.length > 0) {
          // If Firestore is still being seeded, seed now
          seedInitialCentralDataIfEmpty(defaultCatalog);
        }

        setIsPriceListLoaded(true);
        setIsCentralSyncActive(true);
      },
      error => {
        console.warn('Central database real-time sync notification:', error);
        // Even if offline, indicate fallback list is ready
        setIsPriceListLoaded(true);
      }
    );

    // Subscribe to live canvass quotations
    const unsubscribeCanvasses = subscribeToCentralCanvasses(
      centralSlips => {
        if (!isMounted) return;
        setSavedCanvasses(centralSlips);
        try {
          localStorage.setItem(SAVED_CANVASSES_STORAGE_KEY, JSON.stringify(centralSlips));
        } catch {
          // ignore
        }
      },
      error => {
        console.warn('Central canvass quotation listener notice:', error);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeSupplies();
      unsubscribeCanvasses();
    };
  }, []);

  // Sync active canvass draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CANVASS_ITEMS_STORAGE_KEY, JSON.stringify(canvass));
    } catch {
      // ignore
    }
  }, [canvass]);

  // Admin Auth Handlers
  const adminLogin = (username: string, pass: string): boolean => {
    if (username.trim() === '7stars' && pass.trim() === 'pitodapat') {
      setIsAdmin(true);
      setAdminUsername('7stars');
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, '7stars');
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    setAdminUsername(null);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  // --- Central Database Operations (Syncs to Cloud Immediately) ---

  const addSupplyItem = (item: Omit<SupplyItem, 'id' | 'updatedAt'>) => {
    const newItem: SupplyItem = {
      ...item,
      id: 'sup-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: item.name || (item.brand ? `${item.brand} ${item.genericName}` : item.genericName),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local update
    setSupplies(prev => [newItem, ...prev]);

    // Save to central Firestore database immediately
    saveCentralSupply(newItem).catch(err => {
      console.error('Failed to save new supply item to central database:', err);
    });
  };

  const updateSupplyItem = (item: SupplyItem) => {
    const normalizedName = item.name || (item.brand ? `${item.brand} ${item.genericName}` : item.genericName);
    const updated: SupplyItem = {
      ...item,
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local update
    setSupplies(prev => prev.map(s => (s.id === item.id ? updated : s)));

    // Update active canvass items selling price or generic name if present
    setCanvass(prev =>
      prev.map(c =>
        c.itemId === item.id
          ? {
              ...c,
              genericName: updated.genericName,
              brand: updated.brand,
              name: updated.name,
              description: updated.description,
              unit: updated.unit,
              sellingPrice: updated.sellingPrice,
            }
          : c
      )
    );

    // Save to central Firestore database immediately
    saveCentralSupply(updated).catch(err => {
      console.error('Failed to update supply in central database:', err);
    });
  };

  const updatePrices = (id: string, buyingPrice: number, sellingPrice: number) => {
    const safeBuying = Math.max(0, Number(buyingPrice) || 0);
    const safeSelling = Math.max(0, Number(sellingPrice) || 0);

    // Optimistic local update
    setSupplies(prev =>
      prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            buyingPrice: safeBuying,
            sellingPrice: safeSelling,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );

    // Update active canvass items selling price if currently canvassed
    setCanvass(prev =>
      prev.map(c =>
        c.itemId === id
          ? {
              ...c,
              sellingPrice: safeSelling,
            }
          : c
      )
    );

    // Save to central Firestore database immediately
    updateCentralPrices(id, safeBuying, safeSelling).catch(err => {
      console.error('Failed to update prices in central database:', err);
    });
  };

  const adjustStock = (id: string, delta: number) => {
    const target = supplies.find(s => s.id === id);
    const currentStock = target ? target.stock : 0;
    const newStock = Math.max(0, currentStock + delta);

    // Optimistic local update
    setSupplies(prev =>
      prev.map(s => {
        if (s.id === id) {
          return { ...s, stock: newStock, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );

    // Save to central Firestore database immediately
    adjustCentralStock(id, delta, currentStock).catch(err => {
      console.error('Failed to adjust stock in central database:', err);
    });
  };

  const deleteSupplyItem = (id: string) => {
    // Optimistic local update
    setSupplies(prev => prev.filter(s => s.id !== id));

    // Delete from central Firestore database immediately
    deleteCentralSupply(id).catch(err => {
      console.error('Failed to delete supply item from central database:', err);
    });
  };

  const clearAllSupplies = () => {
    setSupplies([]);
    setLastRecordedTime(null);
    try {
      localStorage.removeItem(SUPPLIES_STORAGE_KEY);
      localStorage.removeItem(SUPPLIES_BACKUP_KEY);
      localStorage.removeItem(LAST_RECORDED_KEY);
    } catch {
      // ignore
    }

    clearAllCentralSupplies().catch(err => {
      console.error('Failed to clear supplies in central database:', err);
    });
  };

  // Import parsed Excel supplies: writes immediately to centralized database in chunks
  const importExcelSupplies = (
    items: Omit<SupplyItem, 'id' | 'updatedAt'>[],
    mode: 'append' | 'replace'
  ): number => {
    const timestamp = Date.now();
    const formattedItems: SupplyItem[] = items.map((it, idx) => ({
      ...it,
      id: `sup-${timestamp}-${idx}`,
      name: it.name || (it.brand ? `${it.brand} ${it.genericName}` : it.genericName),
      updatedAt: new Date().toISOString(),
    }));

    // Optimistic update
    const nextSupplies = mode === 'replace' ? formattedItems : [...formattedItems, ...supplies];
    setSupplies(nextSupplies);

    // Save to central Firestore database immediately
    batchSaveCentralSupplies(formattedItems, mode).catch(err => {
      console.error('Failed to batch save supplies to central database:', err);
    });

    return formattedItems.length;
  };

  // --- Customer Canvass Operations ---

  const addToCanvass = (supply: SupplyItem, quantity = 1) => {
    setCanvass(prev => {
      const existing = prev.find(item => item.itemId === supply.id);
      if (existing) {
        return prev.map(item =>
          item.itemId === supply.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          itemId: supply.id,
          sku: supply.sku,
          genericName: supply.genericName,
          brand: supply.brand,
          name: supply.name || (supply.brand ? `${supply.brand} ${supply.genericName}` : supply.genericName),
          description: supply.description,
          unit: supply.unit,
          quantity: Math.max(1, quantity),
          sellingPrice: supply.sellingPrice,
        },
      ];
    });
  };

  const addCustomUnlistedItem = (custom: CustomUnlistedInput) => {
    const cleanGenericName = custom.genericName.trim();
    if (!cleanGenericName) return;

    const brand = custom.brand?.trim() || '';
    const unit = custom.unit?.trim() || 'pc';
    const quantity = Math.max(1, custom.quantity || 1);
    const sellingPrice =
      typeof custom.estimatedPrice === 'number' && custom.estimatedPrice > 0 ? custom.estimatedPrice : 0;
    const description = custom.description?.trim() || '';
    const customerNotes = custom.customerNotes?.trim() || '';

    // Generate readable SKU for unlisted custom request
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const sku = `UNL-${randomCode}`;
    const id = `unlisted-${Date.now()}-${randomCode}`;

    const displayName = brand ? `${brand} ${cleanGenericName}` : cleanGenericName;

    setCanvass(prev => {
      // Check if this unlisted item was already added by matching name, brand, unit
      const existingIdx = prev.findIndex(
        it =>
          it.isCustomUnlisted &&
          it.genericName.toLowerCase().trim() === cleanGenericName.toLowerCase() &&
          (it.brand || '').toLowerCase().trim() === brand.toLowerCase() &&
          it.unit.toLowerCase().trim() === unit.toLowerCase()
      );

      if (existingIdx >= 0) {
        return prev.map((it, idx) =>
          idx === existingIdx
            ? {
                ...it,
                quantity: it.quantity + quantity,
                sellingPrice: sellingPrice > 0 ? sellingPrice : it.sellingPrice,
                description: description || it.description,
                customerNotes: customerNotes || it.customerNotes,
              }
            : it
        );
      }

      const newItem: CanvassItem = {
        itemId: id,
        sku,
        genericName: cleanGenericName,
        brand,
        name: displayName,
        description,
        unit,
        quantity,
        sellingPrice,
        isCustomUnlisted: true,
        estimatedPrice: sellingPrice > 0 ? sellingPrice : undefined,
        customerNotes,
      };

      return [...prev, newItem];
    });
  };

  const updateCanvassQty = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCanvass(itemId);
      return;
    }
    setCanvass(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCanvass = (itemId: string) => {
    setCanvass(prev => prev.filter(item => item.itemId !== itemId));
  };

  const clearCanvass = () => {
    setCanvass([]);
  };

  const generateCanvassSlip = (details: CanvassDraftInput): CanvassSlip | null => {
    if (canvass.length === 0) return null;

    // Consolidate into strictly unique items (summing quantities of identical items)
    const uniqueMap = new Map<string, CanvassItem>();
    canvass.forEach(item => {
      const key =
        item.itemId ||
        `${item.genericName.toLowerCase().trim()}::${(item.brand || '').toLowerCase().trim()}::${item.unit.toLowerCase().trim()}::${item.sellingPrice}`;
      if (uniqueMap.has(key)) {
        const existing = uniqueMap.get(key)!;
        uniqueMap.set(key, {
          ...existing,
          quantity: existing.quantity + item.quantity,
        });
      } else {
        uniqueMap.set(key, { ...item });
      }
    });
    const uniqueItemsList = Array.from(uniqueMap.values());

    const sequence = savedCanvasses.length + 1001;
    const canvassNumber = `CNV-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;

    const totalAmount = uniqueItemsList.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );

    const hasUnlistedItems = uniqueItemsList.some(item => item.isCustomUnlisted);

    const newSlip: CanvassSlip = {
      id: 'cnv-' + Date.now(),
      canvassNumber,
      createdAt: new Date().toISOString(),
      companyName: details.companyName?.trim() || '7 Stars School and Office Supplies Depot',
      customerName: details.customerName.trim() || 'Valued Customer / Inquirer',
      departmentOrCompany: details.departmentOrCompany.trim() || 'General Procurement',
      contactNumber: details.contactNumber?.trim() || '',
      notes: details.notes?.trim() || '',
      items: uniqueItemsList,
      totalAmount,
      hasUnlistedItems,
    };

    // Optimistic local update
    setSavedCanvasses(prev => [newSlip, ...prev]);

    // Save to central Firestore database immediately
    saveCentralCanvass(newSlip).catch(err => {
      console.error('Failed to save canvass quotation to central database:', err);
    });

    return newSlip;
  };

  const deleteCanvassSlip = (id: string) => {
    setSavedCanvasses(prev => prev.filter(s => s.id !== id));
    deleteCentralCanvass(id).catch(err => {
      console.error('Failed to delete canvass quotation from central database:', err);
    });
  };

  const value = useMemo(
    () => ({
      supplies,
      isPriceListLoaded,
      isCentralSyncActive,
      lastRecordedTime,
      addSupplyItem,
      updateSupplyItem,
      updatePrices,
      deleteSupplyItem,
      adjustStock,
      importExcelSupplies,
      clearAllSupplies,
      canvass,
      savedCanvasses,
      addToCanvass,
      addCustomUnlistedItem,
      updateCanvassQty,
      removeFromCanvass,
      clearCanvass,
      generateCanvassSlip,
      deleteCanvassSlip,
      isAdmin,
      adminUsername,
      adminLogin,
      adminLogout,
    }),
    [supplies, isPriceListLoaded, isCentralSyncActive, lastRecordedTime, canvass, savedCanvasses, isAdmin, adminUsername]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
