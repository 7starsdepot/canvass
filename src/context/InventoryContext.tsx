import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SupplyItem, CanvassItem, CanvassSlip } from '../types';

interface CanvassDraftInput {
  customerName: string;
  departmentOrCompany: string;
  contactNumber?: string;
  notes?: string;
}

interface InventoryContextType {
  // Inventory (Admin & Customer Catalog)
  supplies: SupplyItem[];
  addSupplyItem: (item: Omit<SupplyItem, 'id' | 'updatedAt'>) => void;
  updateSupplyItem: (item: SupplyItem) => void;
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

const SUPPLIES_STORAGE_KEY = 'office_supplies_data_v2';
const CANVASS_ITEMS_STORAGE_KEY = 'office_customer_canvass_v2';
const SAVED_CANVASSES_STORAGE_KEY = 'office_customer_canvass_slips_v2';
const ADMIN_SESSION_KEY = 'office_admin_session_v2';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Supplies State: DO NOT initialize with default data.
  // Record the data from last view via localStorage. If no prior recorded data, start with empty array.
  const [supplies, setSupplies] = useState<SupplyItem[]>(() => {
    try {
      const stored = localStorage.getItem(SUPPLIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return []; // Empty by default per user requirement: "do not initialize the data"
  });

  // 2. Canvass Items State (Customer View Only)
  // Record the data from last view
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

  // Sync supplies to localStorage to record data from view
  useEffect(() => {
    try {
      localStorage.setItem(SUPPLIES_STORAGE_KEY, JSON.stringify(supplies));
    } catch {
      // ignore
    }
  }, [supplies]);

  // Sync active canvass items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CANVASS_ITEMS_STORAGE_KEY, JSON.stringify(canvass));
    } catch {
      // ignore
    }
  }, [canvass]);

  // Sync saved canvasses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_CANVASSES_STORAGE_KEY, JSON.stringify(savedCanvasses));
    } catch {
      // ignore
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
    setSupplies(prev => [newItem, ...prev]);
  };

  const updateSupplyItem = (item: SupplyItem) => {
    const normalizedName = item.name || (item.brand ? `${item.brand} ${item.genericName}` : item.genericName);
    const updated: SupplyItem = {
      ...item,
      name: normalizedName,
      updatedAt: new Date().toISOString(),
    };

    setSupplies(prev => prev.map(s => (s.id === item.id ? updated : s)));

    // Also update any reference in active customer canvass (updating selling price or names, but NEVER buying price)
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

  const deleteSupplyItem = (id: string) => {
    setSupplies(prev => prev.filter(s => s.id !== id));
  };

  const adjustStock = (id: string, delta: number) => {
    setSupplies(prev =>
      prev.map(s => {
        if (s.id === id) {
          const newStock = Math.max(0, s.stock + delta);
          return { ...s, stock: newStock, updatedAt: new Date().toISOString() };
        }
        return s;
      })
    );
  };

  const clearAllSupplies = () => {
    setSupplies([]);
    try {
      localStorage.removeItem(SUPPLIES_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Import parsed Excel supplies
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

    if (mode === 'replace') {
      setSupplies(formattedItems);
    } else {
      setSupplies(prev => [...formattedItems, ...prev]);
    }

    return formattedItems.length;
  };

  // --- Customer Canvass Operations ---
  // (Purely for customer quotation / canvass sheet; has NOTHING to do with admin inventory!)

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
          // CRITICAL: Buying price is strictly omitted from CanvassItem
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

    const sequence = savedCanvasses.length + 1001;
    const canvassNumber = `CNV-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;

    const totalAmount = canvass.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );

    const newSlip: CanvassSlip = {
      id: 'cnv-' + Date.now(),
      canvassNumber,
      createdAt: new Date().toISOString(),
      customerName: details.customerName.trim() || 'Valued Customer / Inquirer',
      departmentOrCompany: details.departmentOrCompany.trim() || 'General Procurement',
      contactNumber: details.contactNumber?.trim() || '',
      notes: details.notes?.trim() || '',
      items: [...canvass],
      totalAmount,
    };

    setSavedCanvasses(prev => [newSlip, ...prev]);
    // Canvass does NOT deduct or touch admin inventory! It's solely a customer quotation sheet.
    return newSlip;
  };

  const deleteCanvassSlip = (id: string) => {
    setSavedCanvasses(prev => prev.filter(s => s.id !== id));
  };

  const value = useMemo(
    () => ({
      supplies,
      addSupplyItem,
      updateSupplyItem,
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
    [supplies, canvass, savedCanvasses, isAdmin, adminUsername]
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
