import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { SupplyItem, CanvassItem, CanvassSlip } from '../types';
import initialSuppliesData from '../data/initialSupplies.json';

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
  lastRecordedTime: string | null;
  addSupplyItem: (item: Omit<SupplyItem, 'id' | 'updatedAt'>) => void;
  updateSupplyItem: (item: SupplyItem) => void;
  updatePrices: (id: string, buyingPrice: number, sellingPrice: number) => void;
  deleteSupplyItem: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  importExcelSupplies: (items: Omit<SupplyItem, 'id' | 'updatedAt'>[], mode: 'append' | 'replace') => number;
  clearAllSupplies: () => void;

  // Canvass (Customer View Only - Has nothing to do with admin inventory)
  canvass: CanvassItem[];
  savedCanvasses: CanvassSlip[];
  addToCanvass: (supply: SupplyItem, quantity?: number) => void;
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
 * Robust initial supplies loader that inspects all previous storage keys,
 * and falls back to bundled recorded master price list (522 items)
 * so that when the app opens on a phone or new device, data is NEVER empty or reset.
 */
function loadInitialSupplies(): SupplyItem[] {
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

  // Pre-loaded recorded supplies from uploaded master price list:
  // When opened on a phone, new browser profile, or mobile device without prior localStorage,
  // this guarantees the uploaded 522 items are instantly displayed and NEVER empty!
  if (Array.isArray(initialSuppliesData) && initialSuppliesData.length > 0) {
    return initialSuppliesData as SupplyItem[];
  }

  return [];
}

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Supplies State: Read synchronously from all recorded storage keys or bundled master data
  const [supplies, setSupplies] = useState<SupplyItem[]>(() => loadInitialSupplies());
  const [isPriceListLoaded, setIsPriceListLoaded] = useState<boolean>(true);
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

  // Flag to prevent empty initial renders from accidentally overwriting persistent storage
  const isInitializedRef = useRef<boolean>(false);

  // 2. Canvass Items State (Customer View Only)
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

  // 3. Saved Canvasses History (Customer View Only)
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

  /**
   * Universal persistence helper:
   * Writes the recorded price list to:
   * 1. Primary localStorage key (office_supplies_data_v2)
   * 2. Permanent backup localStorage keys (7stars_recorded_supplies_price_list, office_supplies_data)
   * 3. Server persistent API (/api/supplies)
   * 4. Timestamp metadata
   */
  const persistSupplies = (itemsToPersist: SupplyItem[], updateTimestamp = true) => {
    if (!itemsToPersist || !Array.isArray(itemsToPersist)) return;

    const recordedAt = new Date().toISOString();
    if (updateTimestamp && itemsToPersist.length > 0) {
      setLastRecordedTime(recordedAt);
      try {
        localStorage.setItem(LAST_RECORDED_KEY, recordedAt);
      } catch {
        // ignore
      }
    }

    // Save to all localStorage keys for maximum resilience
    try {
      localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(itemsToPersist));
      localStorage.setItem(SUPPLIES_BACKUP_KEY, JSON.stringify(itemsToPersist));
      localStorage.setItem('office_supplies_data', JSON.stringify(itemsToPersist));
    } catch (err) {
      console.warn('localStorage save warning:', err);
    }

    // Persist to server backend API
    try {
      fetch('/api/supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToPersist),
      }).catch(err => {
        console.warn('Notice saving supplies to backend:', err);
      });
    } catch {
      // ignore
    }
  };

  /**
   * On Initial Mount:
   * Check the backend persistent API (/api/supplies) to ensure that if the app is opened
   * on a new device, a fresh tab, or after browser cache clear, the previous recorded
   * information remains fully available.
   */
  useEffect(() => {
    let isCancelled = false;

    async function syncWithPersistentBackend() {
      try {
        if (!localStorage.getItem(SUPPLIES_STORAGE_KEY) && supplies.length > 0) {
          localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(supplies));
          localStorage.setItem(SUPPLIES_BACKUP_KEY, JSON.stringify(supplies));
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch('/api/supplies');
        if (res.ok) {
          const serverItems = await res.json();
          if (!isCancelled && Array.isArray(serverItems) && serverItems.length > 0) {
            setSupplies(prev => {
              // If local state was empty, or server has recorded data, display it immediately
              if (prev.length === 0) {
                return serverItems;
              }
              return prev;
            });
            // Update local storage backup with server data
            try {
              localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(serverItems));
              localStorage.setItem(SUPPLIES_BACKUP_KEY, JSON.stringify(serverItems));
            } catch {
              // ignore
            }
          } else if (supplies.length > 0) {
            // If local storage has recorded data but server doesn't yet, sync local to server
            persistSupplies(supplies, false);
          }
        }
      } catch {
        // Fallback to static public file if API route had an issue
        try {
          const staticRes = await fetch('/recorded_price_list.json');
          if (staticRes.ok) {
            const data = await staticRes.json();
            if (!isCancelled && Array.isArray(data) && data.length > 0) {
              setSupplies(prev => (prev.length === 0 ? data : prev));
            }
          }
        } catch {
          // ignore
        }
      } finally {
        if (!isCancelled) {
          isInitializedRef.current = true;
          setIsPriceListLoaded(true);
        }
      }

      // Also sync saved orders from backend if available
      try {
        const ordersRes = await fetch('/api/orders');
        if (ordersRes.ok) {
          const serverOrders = await ordersRes.json();
          if (!isCancelled && Array.isArray(serverOrders) && serverOrders.length > 0) {
            setSavedCanvasses(prev => (prev.length === 0 ? serverOrders : prev));
          }
        }
      } catch {
        // ignore
      }
    }

    syncWithPersistentBackend();

    return () => {
      isCancelled = true;
    };
  }, []);

  /**
   * Listen for storage events across browser tabs/windows
   * so edits in one window immediately reflect in all open windows
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SUPPLIES_STORAGE_KEY || e.key === SUPPLIES_BACKUP_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSupplies(parsed);
            }
          } catch {
            // ignore
          }
        }
      }
      if (e.key === SAVED_CANVASSES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setSavedCanvasses(parsed);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync active canvass items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CANVASS_ITEMS_STORAGE_KEY, JSON.stringify(canvass));
    } catch {
      // ignore
    }
  }, [canvass]);

  // Sync saved canvasses to localStorage and backend
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_CANVASSES_STORAGE_KEY, JSON.stringify(savedCanvasses));
    } catch {
      // ignore
    }

    if (savedCanvasses.length > 0) {
      try {
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedCanvasses),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [savedCanvasses]);

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

  // --- Admin Inventory Operations ---

  const addSupplyItem = (item: Omit<SupplyItem, 'id' | 'updatedAt'>) => {
    const newItem: SupplyItem = {
      ...item,
      id: 'sup-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: item.name || (item.brand ? `${item.brand} ${item.genericName}` : item.genericName),
      updatedAt: new Date().toISOString(),
    };
    const nextSupplies = [newItem, ...supplies];
    setSupplies(nextSupplies);
    persistSupplies(nextSupplies);
  };

  const updateSupplyItem = (item: SupplyItem) => {
    const normalizedName = item.name || (item.brand ? `${item.brand} ${item.genericName}` : item.genericName);
    const updated: SupplyItem = {
      ...item,
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    };

    const nextSupplies = supplies.map(s => (s.id === item.id ? updated : s));
    setSupplies(nextSupplies);
    persistSupplies(nextSupplies);

    // Also update any reference in active customer canvass
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
  };

  const updatePrices = (id: string, buyingPrice: number, sellingPrice: number) => {
    const safeBuying = Math.max(0, Number(buyingPrice) || 0);
    const safeSelling = Math.max(0, Number(sellingPrice) || 0);

    const nextSupplies = supplies.map(s => {
      if (s.id === id) {
        return {
          ...s,
          buyingPrice: safeBuying,
          sellingPrice: safeSelling,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setSupplies(nextSupplies);
    persistSupplies(nextSupplies);

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
  };

  const deleteSupplyItem = (id: string) => {
    const nextSupplies = supplies.filter(s => s.id !== id);
    setSupplies(nextSupplies);
    persistSupplies(nextSupplies);
  };

  const adjustStock = (id: string, delta: number) => {
    const nextSupplies = supplies.map(s => {
      if (s.id === id) {
        const newStock = Math.max(0, s.stock + delta);
        return { ...s, stock: newStock, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    setSupplies(nextSupplies);
    persistSupplies(nextSupplies);
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

    try {
      fetch('/api/supplies', { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }
  };

  // Import parsed Excel supplies: saves permanently to state, localStorage, and server backend
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

    const nextSupplies = mode === 'replace' ? formattedItems : [...formattedItems, ...supplies];
    setSupplies(nextSupplies);
    persistSupplies(nextSupplies, true);

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
    };

    setSavedCanvasses(prev => [newSlip, ...prev]);
    return newSlip;
  };

  const deleteCanvassSlip = (id: string) => {
    setSavedCanvasses(prev => prev.filter(s => s.id !== id));
  };

  const value = useMemo(
    () => ({
      supplies,
      isPriceListLoaded,
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
    [supplies, isPriceListLoaded, lastRecordedTime, canvass, savedCanvasses, isAdmin, adminUsername]
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
