import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  Image as ImageIcon,
  Lock,
  Sparkles,
  Eye,
  X,
  Brain,
  MessageSquare,
  Hand,
  PenTool,
  HelpCircle,
  ZoomIn,
  ShieldAlert,
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

export const SnedMaterialsDashboard: React.FC<SnedMaterialsDashboardProps> = ({
  onOpenCanvass,
}) => {
  const {
    supplies,
    canvass,
    addToCanvass,
    addCustomUnlistedItem,
  } = useInventory();

  // Search, category and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Quantities selected per item for rapid adding
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Lightbox Preview Modal State (View only, no picture upload in customer view)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; desc: string } | null>(null);

  // Add New SNED Item to Canvass Modal State (Customer view: cannot edit price, cost, stock, or upload pictures)
  const [isAddSnedOpen, setIsAddSnedOpen] = useState(false);
  const [newSnedGenericName, setNewSnedGenericName] = useState('');
  const [newSnedBrand, setNewSnedBrand] = useState('');
  const [newSnedCategory, setNewSnedCategory] = useState('Sensory & Tactile');
  const [newSnedUnit, setNewSnedUnit] = useState('pc');
  const [newSnedCustomerQty, setNewSnedCustomerQty] = useState('1');
  const [newSnedDesc, setNewSnedDesc] = useState('');
  const [newSnedNotes, setNewSnedNotes] = useState('');
  const [isSubmittingNewSned, setIsSubmittingNewSned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter SNED supplies: items flagged as isSned or categorized under SNED Materials
  const snedSupplies = useMemo(() => {
    return supplies.filter(item => {
      const isSnedItem = item.isSned === true || item.category === 'SNED Materials' || (item.sku && item.sku.startsWith('SNED-'));
      return isSnedItem;
    });
  }, [supplies]);

  // Helper to combine stock from GBTN and Ligao locations into one total stock quantity
  const getCombinedStock = (item: SupplyItem): number => {
    if (item.stockGbtn !== undefined || item.stockLigao !== undefined) {
      return (item.stockGbtn ?? 0) + (item.stockLigao ?? 0);
    }
    return item.stock ?? 0;
  };

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

        const totalStock = getCombinedStock(item);
        const matchesStock = !inStockOnly || totalStock > 0;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'name-asc') return a.genericName.localeCompare(b.genericName);
        // Default: in-stock first, then alphabetically
        const aStock = getCombinedStock(a);
        const bStock = getCombinedStock(b);
        if (aStock > 0 && bStock <= 0) return -1;
        if (aStock <= 0 && bStock > 0) return 1;
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

  const handleCreateNewSned = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = newSnedGenericName.trim();
    if (!cleanName) {
      setFormError('Please enter the name of the SNED material.');
      return;
    }

    const qty = Math.max(1, parseInt(newSnedCustomerQty, 10) || 1);

    setIsSubmittingNewSned(true);
    try {
      // Customer view: adds to active canvass sheet with customer requested quantity.
      // Selling price, buying cost, and stock quantity CANNOT be edited by customer and are quoted by admin.
      addCustomUnlistedItem({
        genericName: cleanName,
        brand: newSnedBrand.trim() || undefined,
        description: `[SNED: ${newSnedCategory}] ${newSnedDesc.trim() || 'Special needs educational therapeutic material'}`,
        unit: newSnedUnit.trim() || 'pc',
        quantity: qty,
        customerNotes: newSnedNotes.trim()
          ? `${newSnedNotes.trim()} (Special Needs Education Material • Depot Quotation Required)`
          : 'Special Needs Education Material • Depot Formal Quotation Required',
      });

      // Reset form
      setNewSnedGenericName('');
      setNewSnedBrand('');
      setNewSnedCustomerQty('1');
      setNewSnedDesc('');
      setNewSnedNotes('');
      setIsAddSnedOpen(false);
    } catch (err) {
      console.error('Failed to add SNED material:', err);
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
              Explore sensory integration equipment, AAC speech binders, adaptive loop scissors, weighted therapy tools, and specialized developmental supplies. All items can be directly added to your official price canvass quotation!
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              id="sned-add-material-btn"
              onClick={() => setIsAddSnedOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-purple-400/30"
              title="Add or request an unlisted SNED material for your price canvass quotation"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add SNED Material to Canvass</span>
            </button>

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

          {/* Quick Add Unlisted SNED button in search bar */}
          <button
            type="button"
            onClick={() => {
              setNewSnedGenericName(searchQuery);
              setIsAddSnedOpen(true);
            }}
            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
            title="Add unlisted SNED material not found in list"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>+ Add SNED Material</span>
          </button>

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
            Can't find the specific sensory or therapeutic item you need? Click below to request and add it to your official price canvass quotation!
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
            <button
              onClick={() => {
                setNewSnedGenericName(searchQuery);
                setIsAddSnedOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add SNED Material to Canvass</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSnedSupplies.map(item => {
            const qty = getQuantity(item.id);
            const totalStock = getCombinedStock(item);
            const isZeroStock = totalStock <= 0;
            const isRecentlyAdded = justAddedId === item.id;
            const inCart = canvass.find(c => c.itemId === item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all flex flex-col overflow-hidden group relative"
              >
                {/* Product Picture Container (Customers can view and enlarge pictures, no upload in customer view) */}
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
                      <span className="text-[11px] font-medium">Educational material</span>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 backdrop-blur-xs text-[10px] font-bold text-purple-200 border border-purple-400/30">
                      {getCategoryIcon(item.snedCategory)}
                      <span>{item.snedCategory || 'SNED Material'}</span>
                    </span>
                  </div>

                  {/* Lightbox Zoom Icon for Customers to View/Enlarge Photo */}
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

                  {/* Stock Status & Price (Selling Price only; buying cost is strictly hidden from customers) */}
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
                            {totalStock} in stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add to Canvass Actions */}
                    <div className="flex items-center gap-2">
                      {/* Quantity Stepper for Canvass */}
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
                            <span>{inCart ? `Add More (${inCart.quantity})` : 'Add to Canvass'}</span>
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

      {/* Add New SNED Item Modal for Customer View */}
      {isAddSnedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-purple-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Add SNED Material to Canvass
                  </h3>
                  <p className="text-[11px] text-purple-200/80">
                    Request an unlisted specialized sensory or educational item for official quotation
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
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Material Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Generic / Item Name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSnedGenericName}
                    onChange={e => setNewSnedGenericName(e.target.value)}
                    placeholder="e.g., Tactile Weighted Shoulder Wrap, Talker Buttons"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-hidden font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Brand / Maker (Optional)</label>
                  <input
                    type="text"
                    value={newSnedBrand}
                    onChange={e => setNewSnedBrand(e.target.value)}
                    placeholder="e.g., SensoryPro, PlaySense, Abilitations"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-purple-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">SNED Category</label>
                  <select
                    value={newSnedCategory}
                    onChange={e => setNewSnedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden cursor-pointer font-medium"
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
                    placeholder="pc, set, pack, pair, roll"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Customer View: Requested Canvass Quantity with Locked Pricing/Stock Notice */}
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

                {/* Explicit Admin-Authority Notice: Pricing, Cost, and Stock are locked for customers */}
                <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-purple-950">
                    <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span>Depot Pricing, Buying Cost & Stock Control</span>
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Customers cannot edit the selling price, buying cost, or quantity of stock. These fields are exclusively set and updated by depot staff in the <strong>Admin Portal</strong>. This item will be placed on your canvass slip as <em>"To Be Quoted"</em> for formal pricing.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-white/80 px-2 py-1 rounded border border-purple-200 text-purple-900">
                      Selling Price: <strong>₱0.00 (Pending Quote)</strong>
                    </div>
                    <div className="bg-white/80 px-2 py-1 rounded border border-purple-200 text-purple-900">
                      Stock: <strong>Special Order</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description & Therapeutic Benefits */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description & Therapeutic Benefits</label>
                <textarea
                  rows={2}
                  value={newSnedDesc}
                  onChange={e => setNewSnedDesc(e.target.value)}
                  placeholder="Detail sensory characteristics, target developmental goals, dimensions, or age group..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                />
              </div>

              {/* Customer Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Customer Note / Special Requirements (Optional)</label>
                <input
                  type="text"
                  value={newSnedNotes}
                  onChange={e => setNewSnedNotes(e.target.value)}
                  placeholder="e.g., Needed for occupational therapy class, urgent canvass quotation..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-purple-600 outline-hidden"
                />
              </div>

              <div className="px-1 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddSnedOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewSned}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer border border-purple-400/30 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmittingNewSned ? 'Adding to Canvass...' : 'Add SNED Item to Canvass'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Preview Modal for Customers */}
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

export default SnedMaterialsDashboard;
