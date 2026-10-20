import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SupplyItem } from '../types';

interface AdminPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SupplyItem | null;
  onSaveImage: (itemId: string, imageUrl: string) => Promise<void>;
}

const PRESET_LIBRARY = [
  // SNED Materials Presets
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
    title: 'Visual Communication AAC Binder',
    category: 'Speech & Communication',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Voice Recording Buzzers',
    category: 'Speech & Communication',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Adaptive Loop Scissors',
    category: 'Motor Skills & Therapy',
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Occupational Pegboard',
    category: 'Motor Skills & Therapy',
    url: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Visual Time-Timer Clock',
    category: 'Visual Learning',
    url: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Tactile Stepping Stones',
    category: 'Sensory & Tactile',
    url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80',
  },
  // School & Office Supplies Presets
  {
    title: 'Copy Paper Ream (A4/Letter)',
    category: 'Paper Products',
    url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Gel Ballpoint Pens Set',
    category: 'Writing Instruments',
    url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Heavy Duty Stapler & Staples',
    category: 'Desk Accessories',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Clear File Folder Organizers',
    category: 'Filing & Storage',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
  },
];

export const AdminPhotoUploadModal: React.FC<AdminPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveImage,
}) => {
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setImageUrlInput(item.imageUrl || '');
      setFilePreview(item.imageUrl || null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

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
          setFilePreview(compressed);
          setImageUrlInput('');
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const finalUrl = filePreview || imageUrlInput.trim();
    try {
      await onSaveImage(item.id, finalUrl);
      onClose();
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSubmitting(true);
    try {
      await onSaveImage(item.id, '');
      onClose();
    } catch (err) {
      console.error('Failed to remove image:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePhoto = filePreview || imageUrlInput.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 px-6 py-4 text-white flex items-center justify-between border-b border-red-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30">
                  Admin Portal
                </span>
                <span className="text-xs font-mono text-slate-300">{item.sku}</span>
              </div>
              <h3 className="font-bold text-base text-white truncate max-w-xs sm:max-w-sm">
                Upload Picture: {item.genericName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Picture Preview */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Picture Preview
            </label>
            <div className="relative aspect-16/9 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={item.genericName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 stroke-1" />
                  <p className="text-xs font-bold">No photo attached</p>
                  <p className="text-[11px] text-slate-400">Upload a picture file or choose a preset below</p>
                </div>
              )}
            </div>
          </div>

          {/* 1. Device File Upload */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700">
              1. Upload Photo from Computer or Mobile
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
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4 text-red-600" />
              <span>Choose Photo File (JPEG, PNG, WebP)</span>
            </button>
          </div>

          {/* 2. Web URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              2. Or Paste Image Web URL
            </label>
            <input
              type="url"
              value={imageUrlInput}
              onChange={e => {
                setImageUrlInput(e.target.value);
                setFilePreview(null);
              }}
              placeholder="https://example.com/product-photo.jpg"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-hidden font-mono"
            />
          </div>

          {/* 3. Preset Library */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Or Pick Curated Depot Preset</span>
              </span>
              <span className="text-[10px] text-slate-400">Click to apply</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {PRESET_LIBRARY.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFilePreview(preset.url);
                    setImageUrlInput(preset.url);
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:border-red-500 hover:bg-red-50/50 text-left flex items-center gap-2 transition-all cursor-pointer"
                >
                  <img src={preset.url} alt={preset.title} className="w-10 h-10 rounded-md object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-800 truncate">{preset.title}</div>
                    <span className="text-[9.5px] text-slate-500 block truncate">{preset.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            {item.imageUrl && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRemovePhoto}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !activePhoto}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Picture to Inventory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
