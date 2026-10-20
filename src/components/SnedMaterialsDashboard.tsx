import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  Camera,
  Image as ImageIcon,
  Upload,
  Lock,
  Unlock,
  ShieldCheck,
  Sparkles,
  Eye,
  X,
  Tag,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Brain,
  MessageSquare,
  Hand,
  BookOpen,
  PenTool,
  HelpCircle,
  ZoomIn,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplyItem } from '../types';
import { formatPeso } from '../utils/currency';

interface SnedMaterialsDashboardProps {
  onOpenCanvass?: () => void;
  onOpenAdminAuth?: () => void;
}

const SNED_CATEGORIES = [
  'All',
  'Sensory & Tactile',
  'Speech & Communication',
  'Motor Skills & Therapy',
  'Visual Learning & Flashcards',
  'Specialized Stationery & Tools',
];

const PRESET_SNED_IMAGES = [
  {
    title: 'Sensory Liquid Tiles',
    category: 'Sensory & Tactile',
    url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Weighted Lap Pad',
    category: 'Sensory & Tactile',
    url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Visual Communication & Flashcards',
    category: 'Speech & Communication',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Voice Recording Buttons',
    category: 'Speech & Communication',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Adaptive Ergonomic Scissors',
    category: 'Motor Skills & Therapy',
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Occupational Pegboard',
    category: 'Motor Skills & Therapy',
    url: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Visual Countdown Timer',
    category: 'Visual Learning & Flashcards',
    url: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Tactile Stepping Stones',
    category: 'Sensory & Tactile',
    url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Ergonomic Writing Slope',
    category: 'Specialized Stationery & Tools',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Silicone Pencil Grips',
    category: 'Specialized Stationery & Tools',
    url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
  },
];

export const SnedMaterialsDashboard: React.FC<SnedMaterialsDashboardProps> = ({
  onOpenCanvass,
  onOpenAdminAuth,
}) => {
  const {
    supplies,
    canvass,
    addToCanvass,
    addCustomUnlistedItem,
    updateItemImage,
    addSnedSupplyItem,
    isAdmin,
    adminLogin,
  } = useInventory();

  // Search, category and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Quantities selected per item for rapid adding
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Admin In-Customer-View Picture Upload Modal State
  const [editingImageItem, setEditingImageItem] = useState<SupplyItem | null>(null);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [imageFilePreview, setImageFilePreview] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; desc: string } | null>(null);

  // Inline Quick Admin Unlock state (if not already logged in as admin)
  const [isQuickUnlockOpen, setIsQuickUnlockOpen] = useState(false);
  const [quickAdminPassword, setQuickAdminPassword] = useState('');
  const [quickUnlockError, setQuickUnlockError] = useState('');

  // Add New SNED Item Modal State
  const [isAddSnedOpen, setIsAddSnedOpen] = useState(false);
  const [newSnedGenericName, setNewSnedGenericName] = useState('');
  const [newSnedBrand, setNewSnedBrand] = useState('');
  const [newSnedCategory, setNewSnedCategory] = useState('Sensory & Tactile');
  const [newSnedUnit, setNewSnedUnit] = useState('pc');
  const [newSnedCustomerQty, setNewSnedCustomerQty] = useState('1');
  const [newSnedSellingPrice, setNewSnedSellingPrice] = useState('');
  const [newSnedBuyingPrice, setNewSnedBuyingPrice] = useState('');
  const [newSnedStock, setNewSnedStock] = useState('10');
  const [newSnedDesc, setNewSnedDesc] = useState('');
  const [newSnedImageUrl, setNewSnedImageUrl] = useState('');
  const [newSnedImagePreview, setNewSnedImagePreview] = useState<string | null>(null);
  const [isSubmittingNewSned, setIsSubmittingNewSned] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Filter SNED supplies: items flagged as isSned or categorized under SNED Materials
  const snedSupplies = useMemo(() => {
    return supplies.filter(item => {
      const isSnedItem = item.isSned === true || item.category === 'SNED Materials' || (item.sku && item.sku.startsWith('SNED-'));
      return isSnedItem;
    });
  }, [supplies]);

  // Filtered and sorted SNED supplies
  const filteredSnedSupplies = useMemo(() => {
    return snedSupplies
      .filter(item => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.genericName.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.snedCategory && item.snedCategory.toLowerCase().includes(q)) ||
          (item.sku && item.sku.toLowerCase().includes(q));

        const matchesCategory =
          selectedCategory === 'All' ||
          item.snedCategory === selectedCategory ||
          (selectedCategory === 'Sensory & Tactile' && (item.snedCategory?.includes('Sensory') || item.genericName.toLowerCase().includes('sensory'))) ||
          (selectedCategory === 'Speech & Communication' && (item.snedCategory?.includes('Speech') || item.genericName.toLowerCase().includes('communication'))) ||
          (selectedCategory === 'Motor Skills & Therapy' && (item.snedCategory?.includes('Motor') || item.genericName.toLowerCase().includes('scissors') || item.genericName.toLowerCase().includes('pegboard'))) ||
          (selectedCategory === 'Visual Learning & Flashcards' && (item.snedCategory?.includes('Visual') || item.genericName.toLowerCase().includes('flashcard') || item.genericName.toLowerCase().includes('timer'))) ||
          (selectedCategory === 'Specialized Stationery & Tools' && (item.snedCategory?.includes('Stationery') || item.genericName.toLowerCase().includes('grip') || item.genericName.toLowerCase().includes('slope')));

        const matchesStock = !inStockOnly || item.stock > 0;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'name-asc') return a.genericName.localeCompare(b.genericName);
        // Default: in-stock first, then alphabetically
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;
        return a.genericName.localeCompare(b.genericName);
      });
  }, [snedSupplies, searchQuery, selectedCategory, inStockOnly, sortBy]);

  // Quantity controls
  const getQuantity = (id: string) => itemQuantities[id] || 1;
  const setQuantity = (id: string, qty: number) => {
    setItemQuantities(prev => ({ ...prev, [id]: Math.max(1, qty) }));
  };

  const handleAddToCart = (item: SupplyItem) => {
    const qty = getQuantity(item.id);
    addToCanvass(item, qty);
    setJustAddedId(item.id);
    setTimeout(() => {
      setJustAddedId(null);
    }, 2000);
  };

  // Admin Quick Unlock Handler
  const handleQuickUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickUnlockError('');
    if (adminLogin('7stars', quickAdminPassword)) {
      setIsQuickUnlockOpen(false);
      setQuickAdminPassword('');
    } else {
      setQuickUnlockError('Invalid password. Default depot pin is pitodapat.');
    }
  };

  // Image Upload Handler for Existing Item
  const handleOpenUploadModal = (item: SupplyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingImageItem(item);
    setImageInputUrl(item.imageUrl || '');
    setImageFilePreview(item.imageUrl || null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Compress & convert to optimized base64 data URL
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 640;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setImageFilePreview(compressedDataUrl);
          setImageInputUrl('');
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = async () => {
    if (!editingImageItem) return;
    setIsSavingImage(true);
    const finalUrl = imageFilePreview || imageInputUrl.trim();
    try {
      await updateItemImage(editingImageItem.id, finalUrl);
      setEditingImageItem(null);
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setIsSavingImage(false);
    }
  };

  // Handler for New SNED File Upload
  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 640;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setNewSnedImagePreview(compressed);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateNewSned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnedGenericName.trim()) return;

    setIsSubmittingNewSned(true);
    try {
      const finalImage = newSnedImagePreview || newSnedImageUrl.trim() || 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80';

      if (!isAdmin) {
        // Customer View: Adds to active canvass sheet without ability to edit selling price, buying cost, or stock
        const customerQty = Math.max(1, parseInt(newSnedCustomerQty, 10) || 1);
        addCustomUnlistedItem({
          genericName: newSnedGenericName.trim(),
          brand: newSnedBrand.trim() || undefined,
          description: `[SNED: ${newSnedCategory}] ${newSnedDesc.trim() || 'Special needs educational therapeutic material'}`,
          unit: newSnedUnit.trim() || 'pc',
          quantity: customerQty,
          customerNotes: 'Added via SNED Materials Dashboard (To Be Quoted by Depot)',
        });
      } else {
        // Admin Portal / Admin Mode: Only admin can set selling price, buying price, and stock quantity
        const sPrice = parseFloat(newSnedSellingPrice) || 0;
        const bPrice = parseFloat(newSnedBuyingPrice) || sPrice * 0.7;
        const stock = parseInt(newSnedStock, 10) || 10;

        await addSnedSupplyItem({
          sku: `SNED-${newSnedCategory.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          genericName: newSnedGenericName.trim(),
          brand: newSnedBrand.trim(),
          name: newSnedBrand.trim() ? `${newSnedBrand.trim()} ${newSnedGenericName.trim()}` : newSnedGenericName.trim(),
          description: newSnedDesc.trim() || 'Special needs educational therapeutic material for classroom and home learning.',
          unit: newSnedUnit.trim() || 'pc',
          sellingPrice: sPrice,
          buyingPrice: bPrice,
          stock,
          category: 'SNED Materials',
          isSned: true,
          snedCategory: newSnedCategory,
          imageUrl: finalImage,
          minStockLevel: 3,
        });
      }

      // Reset form
      setNewSnedGenericName('');
      setNewSnedBrand('');
      setNewSnedCustomerQty('1');
      setNewSnedSellingPrice('');
      setNewSnedBuyingPrice('');
      setNewSnedStock('10');
      setNewSnedDesc('');
      setNewSnedImageUrl('');
      setNewSnedImagePreview(null);
      setIsAddSnedOpen(false);
    } catch (err) {
      console.error('Failed to create new SNED item:', err);
    } finally {
      setIsSubmittingNewSned(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Sensory & Tactile':
        return <Brain className="w-3.5 h-3.5 text-purple-600" />;
      case 'Speech & Communication':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'Motor Skills & Therapy':
        return <Hand className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Visual Learning & Flashcards':
        return <Eye className="w-3.5 h-3.5 text-amber-600" />;
      case 'Specialized Stationery & Tools':
        return <PenTool className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* SNED Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 sm:p-8 text-white border border-purple-900/50 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Special Needs Education (SNED) Specialized Depot</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>SNED Learning & Therapy Materials</span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
              Explore sensory integration equipment, AAC speech binders, adaptive scissors, weighted therapy tools, and specialized developmental supplies. All items can be directly added to your official price canvass quotation!
            </p>
          </div>

          {/* Quick Metrics & In-Customer-View Admin Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isAdmin ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="px-3 py-2 rounded-xl bg-purple-900/60 border border-purple-500/40 text-[11px] text-purple-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Admin Picture Upload Active</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSnedOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-purple-400/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add SNED to Catalog</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSnedOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-purple-400/30"
                  title="Add or request an unlisted SNED material for your price canvass"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add SNED to Canvass</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQuickUnlockOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-purple-200 hover:text-white text-xs font-semibold border border-purple-800/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Unlock picture upload mode for depot administrators"
                >
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Admin Mode</span>
                </button>
              </div>
            )}

            {onOpenCanvass && (
              <button
                type="button"
                onClick={onOpenCanvass}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-500/50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Active Canvass ({canvass.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/95 rounded-2xl p-4 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search SNED materials (e.g., sensory tiles, lap pad, adaptive scissors, speech buzzers)..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & In-Stock Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>

            <button
              type="button"
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                inStockOnly
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>In Stock Only</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SNED_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {getCategoryIcon(cat)}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SNED Material Cards Grid */}
      {filteredSnedSupplies.length === 0 ? (
        <div className="bg-white/95 rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No SNED Materials Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query or category filter. You can also add unlisted special items to your active price canvass sheet!
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setInStockOnly(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsAddSnedOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Add New SNED Item
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSnedSupplies.map(item => {
            const qty = getQuantity(item.id);
            const isZeroStock = item.stock <= 0;
            const isRecentlyAdded = justAddedId === item.id;
            const inCart = canvass.find(c => c.itemId === item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all flex flex-col overflow-hidden group relative"
              >
                {/* Product Picture Container with Admin Upload Button Overlay */}
                <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.genericName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-1 stroke-1" />
                      <span className="text-[11px] font-medium">No photo uploaded</span>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 backdrop-blur-xs text-[10px] font-bold text-purple-200 border border-purple-400/30">
                      {getCategoryIcon(item.snedCategory)}
                      <span>{item.snedCategory || 'SNED Material'}</span>
                    </span>
                  </div>

                  {/* Lightbox Zoom Icon */}
                  {item.imageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImage({
                          url: item.imageUrl!,
                          title: item.genericName,
                          desc: item.description,
                        })
                      }
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                      title="Enlarge photo"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Admin Picture Upload Button (Visible when logged in or hovering) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={e => handleOpenUploadModal(item, e)}
                      className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-purple-700 text-white text-[11px] font-semibold backdrop-blur-xs shadow-md border border-purple-400/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Upload or change photo for this SNED item"
                    >
                      <Camera className="w-3.5 h-3.5 text-purple-300" />
                      <span>{item.imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {/* SKU & Brand */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono font-semibold text-slate-600">{item.sku}</span>
                      {item.brand && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                          {item.brand}
                        </span>
                      )}
                    </div>

                    {/* Generic Name */}
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-purple-900 transition-colors">
                      {item.genericName}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Stock Status & Price */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Selling Price / {item.unit}
                        </span>
                        <div className="font-mono font-black text-lg text-purple-900">
                          {formatPeso(item.sellingPrice)}
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <div className="text-right">
                        {isZeroStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Special Order
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {item.stock} in stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add to Canvass Actions */}
                    <div className="flex items-center gap-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, qty - 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-slate-800">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, qty + 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Add to Canvass Button */}
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          isRecentlyAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {isRecentlyAdded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{inCart ? `Add More (${inCart.quantity} in list)` : 'Add to Canvass'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Photo Upload Modal (Triggered while staying in Customer View) */}
      {editingImageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-purple-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Upload Picture for SNED Item
                  </h3>
                  <p className="text-[11px] text-purple-200/80 truncate max-w-xs">
                    {editingImageItem.genericName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingImageItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Preview Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Picture Preview
                </label>
                <div className="relative aspect-16/9 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                  {imageFilePreview || imageInputUrl ? (
                    <img
                      src={imageFilePreview || imageInputUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 p-4">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 stroke-1" />
                      <p className="text-xs font-semibold">No image selected</p>
                      <p className="text-[11px] text-slate-400">Upload a file or choose a preset below</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload from Device */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-700">
                  1. Upload from Computer or Phone
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Choose Photo File (JPEG, PNG, WebP)</span>
                </button>
              </div>

              {/* Or Direct Image URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  2. Or Paste Image Web URL
                </label>
                <input
                  type="url"
                  value={imageInputUrl}
                  onChange={e => {
                    setImageInputUrl(e.target.value);
                    setImageFilePreview(null);
                  }}
                  placeholder="https://example.com/sned-photo.jpg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-700">
                  3. Or Pick Curated Educational Preset
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                  {PRESET_SNED_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageFilePreview(preset.url);
                        setImageInputUrl(preset.url);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <img src={preset.url} alt={preset.title} className="w-9 h-9 rounded object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate">{preset.title}</div>
                        <span className="text-[9px] text-slate-400 block truncate">{preset.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingImageItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingImage || (!imageFilePreview && !imageInputUrl.trim())}
                onClick={handleSaveImage}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer border border-purple-400/30"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingImage ? 'Saving Picture...' : 'Save Picture to Catalog'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New SNED Item Modal */}
      {isAddSnedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-purple-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {isAdmin ? 'Admin: Add New SNED Material to Catalog' : 'Add Unlisted SNED Material to Canvass'}
                  </h3>
                  <p className="text-[11px] text-purple-200/80">
                    {isAdmin
                      ? 'Configure permanent depot stock, buying price, and selling price'
                      : 'Request an unlisted specialized item to include in your price quotation'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSnedOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSned} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Generic Name *</label>
                  <input
                    type="text"
                    required
                    value={newSnedGenericName}
                    onChange={e => setNewSnedGenericName(e.target.value)}
                    placeholder="e.g., Tactile Weighted Shoulder Wrap"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Brand / Maker</label>
                  <input
                    type="text"
                    value={newSnedBrand}
                    onChange={e => setNewSnedBrand(e.target.value)}
                    placeholder="e.g., SensoryPro"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">SNED Category</label>
                  <select
                    value={newSnedCategory}
                    onChange={e => setNewSnedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden cursor-pointer"
                  >
                    {SNED_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Unit of Measure</label>
                  <input
                    type="text"
                    value={newSnedUnit}
                    onChange={e => setNewSnedUnit(e.target.value)}
                    placeholder="pc, set, pack, pair"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                  />
                </div>
              </div>

              {isAdmin ? (
                /* Admin Only: Selling Price, Buying Cost, and Stock Quantity */
                <div className="space-y-2 p-3 bg-purple-50/50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <span>Depot Pricing & Warehouse Inventory (Admin Portal Access)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Selling Price (₱) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newSnedSellingPrice}
                        onChange={e => setNewSnedSellingPrice(e.target.value)}
                        placeholder="1200"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-purple-900 focus:bg-white focus:border-purple-600 outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Buying Cost (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newSnedBuyingPrice}
                        onChange={e => setNewSnedBuyingPrice(e.target.value)}
                        placeholder="850"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-600 focus:bg-white focus:border-purple-600 outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Stock Qty</label>
                      <input
                        type="number"
                        value={newSnedStock}
                        onChange={e => setNewSnedStock(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:bg-white focus:border-purple-600 outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Customer View: Requested Canvass Quantity with Locked Pricing/Stock Notice */
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Quantity Needed for Canvass <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newSnedCustomerQty}
                      onChange={e => setNewSnedCustomerQty(e.target.value)}
                      className="w-full sm:w-48 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:border-purple-600 outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Quantity of {newSnedUnit || 'units'} to include in your price quotation
                    </span>
                  </div>

                  <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-900">
                      <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span>Depot Selling Price, Buying Cost & Stock Control</span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Customers cannot edit the selling price, buying cost, or quantity of stock. These fields can only be edited by authorized staff in the <strong>Admin Portal</strong>. This item will be added to your active canvass slip as <em>"To Be Quoted"</em> for formal pricing.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description & Therapeutic Benefits</label>
                <textarea
                  rows={2}
                  value={newSnedDesc}
                  onChange={e => setNewSnedDesc(e.target.value)}
                  placeholder="Detail sensory characteristics, therapeutic benefits, and target developmental goals..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                />
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">Item Picture</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {newSnedImagePreview || newSnedImageUrl ? (
                      <img src={newSnedImagePreview || newSnedImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400 stroke-1" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={newFileInputRef}
                      onChange={handleNewFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => newFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-600" />
                      <span>Choose Picture File</span>
                    </button>
                    <input
                      type="url"
                      value={newSnedImageUrl}
                      onChange={e => {
                        setNewSnedImageUrl(e.target.value);
                        setNewSnedImagePreview(null);
                      }}
                      placeholder="Or paste image web link..."
                      className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-slate-50 border border-slate-200 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="px-1 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddSnedOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewSned}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer border border-purple-400/30"
                >
                  {isSubmittingNewSned
                    ? 'Saving...'
                    : isAdmin
                    ? 'Save to Central Catalog'
                    : 'Add SNED Item to Canvass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Admin Unlock Modal */}
      {isQuickUnlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Administrator Authorization</h3>
                <p className="text-[11px] text-slate-500">Unlock picture uploads in Customer View</p>
              </div>
            </div>

            {quickUnlockError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickUnlockError}</span>
              </div>
            )}

            <form onSubmit={handleQuickUnlock} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  7 Stars Admin Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={quickAdminPassword}
                  onChange={e => setQuickAdminPassword(e.target.value)}
                  placeholder="Enter admin password (pitodapat)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickUnlockOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  Unlock Photo Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm cursor-pointer animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col cursor-default"
          >
            <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center">
              <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[60vh] object-contain" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 text-white space-y-1">
              <h3 className="font-bold text-base text-white">{previewImage.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{previewImage.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
