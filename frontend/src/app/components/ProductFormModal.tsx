import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, CheckCircle2, RefreshCw, ChevronDown, Settings, Upload, Loader2, AlertCircle } from 'lucide-react';
import { productService, categoryService } from '../utils/db';
import type { Product, Variant, Category } from '../utils/types';
import { cloudinaryService } from '../utils/cloudinary';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDropdown } from './CustomDropdown';

import { ConfirmModal } from './ConfirmModal';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: () => void;
}

interface ImageState {
  url: string;
  file?: File;
  isUploading?: boolean;
  error?: string;
}

export const ProductFormModal = ({ isOpen, onClose, product, onSuccess }: ProductFormModalProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    console.log("[ProductForm] Fetching categories for modal...");
    setIsCategoriesLoading(true);
    try {
      const cats = await categoryService.getAll();
      console.log(`[ProductForm] Categories state updated with ${cats.length} items`);
      setCategories(cats);
    } catch (err) {
      console.error("[ProductForm] Failed to fetch categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState<string>('0');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPrice, setDiscountPrice] = useState<string>('0');
  const [images, setImages] = useState<ImageState[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (product && isOpen) {
      setName(product.name);
      setDescription(product.description || '');
      setCategory(product.category);
      setBasePrice(product.basePrice.toString());
      setDiscountEnabled(product.discountEnabled || false);
      setDiscountPrice((product.discountPrice || 0).toString());
      setImages((product.images || []).map(url => ({ url })));
      setVariants(product.variants || []);
    } else if (isOpen) {
      resetForm();
    }
  }, [product, isOpen]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setBasePrice('0');
    setDiscountEnabled(false);
    setDiscountPrice('0');
    setImages([]);
    setVariants([]);
    setIsLoading(false);
  };

  const handleAddCategory = async (name: string) => {
    try {
      console.log(`[Category] Adding category: ${name}`);
      const saved = await categoryService.save(name);
      
      if (!saved) {
        toast.error('Failed to save category. You might not have permission.');
        return;
      }

      console.log("[Category] Successfully saved:", saved);
      
      const updated = await categoryService.getAll();
      console.log("[Category] All categories after update:", updated);
      
      setCategories(updated);
      setCategory(saved.name); // Use the name from DB to ensure consistency
      toast.success(`Category "${saved.name}" added successfully`);
    } catch (error) {
      console.error("[Category] Error adding category:", error);
      toast.error('Failed to add category');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!isDeletingCategory) return;
    const catToDelete = categories.find(c => c.id === isDeletingCategory);
    if (catToDelete) {
      await categoryService.delete(isDeletingCategory);
      const updated = await categoryService.getAll();
      setCategories(updated);
      if (category === catToDelete.name) {
        setCategory('');
      }
      toast.success('Category deleted successfully');
    }
    setIsDeletingCategory(null);
  };

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (file.size > 300 * 1024) {
        toast.error(`"${file.name}" is too large. Max 300KB allowed.`);
        resolve(false);
        return;
      }
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width !== img.height) {
          toast.error(`"${file.name}" must be 1:1 ratio (square).`);
          resolve(false);
          return;
        }
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(false);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: ImageState[] = [];
    for (const file of files) {
      const isValid = await validateImage(file);
      if (isValid) {
        newImages.push({
          url: URL.createObjectURL(file),
          file,
          isUploading: false
        });
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const image = images[index];
    if (image.file) {
      URL.revokeObjectURL(image.url);
    }
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    setVariants([...variants, {
      id: `v_${Date.now()}`,
      name: '',
      type: 'Size',
      price: undefined,
      image: undefined,
      deliveryDays: 3,
      attributes: {},
    }]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, updates: Partial<Variant>) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const handleVariantImageUpload = async (variantId: string, file: File) => {
    console.log(`[Variant] Starting upload: ${file.name}`);
    // Mark as uploading
    updateVariant(variantId, { image: '__uploading__' });

    try {
      const compressed = await cloudinaryService.compressImage(file);
      const result = await cloudinaryService.uploadToCloudinary(compressed);
      console.log('[Variant] Upload success:', result.url);
      updateVariant(variantId, { image: result.url });
      toast.success('Variant image uploaded!');
    } catch (error: any) {
      console.error('[Variant] Upload failed:', error);
      toast.error(`Variant image upload failed: ${error.message || 'Unknown error'}`);
      updateVariant(variantId, { image: undefined });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericBasePrice = Number(basePrice);
    const numericDiscountPrice = Number(discountPrice);

    if (!name || !category || numericBasePrice <= 0 || images.length === 0) {
      toast.error('Please fill in all required fields (Name, Category, Price, and at least 1 image)');
      return;
    }

    // Guard: don't save if a variant image is still uploading
    if (variants.some(v => v.image === '__uploading__')) {
      toast.error('Please wait for all variant images to finish uploading');
      return;
    }

    setIsLoading(true);
    console.log("[ProductForm] ===== SAVE STARTED =====");

    try {
      // Wrap the entire save in a timeout to prevent infinite loading
      const saveResult = await Promise.race([
        (async () => {
          // ── STEP 1: Upload images to Cloudinary ──
          console.log("[ProductForm] Step 1: Uploading images to Cloudinary...");
          const finalImageUrls: string[] = [];
          const updatedImages = [...images];

          for (let i = 0; i < updatedImages.length; i++) {
            const img = updatedImages[i];

            if (img.file) {
              console.log(`[ProductForm] Processing image ${i + 1}/${updatedImages.length}: ${img.file.name}`);
              setImages(prev => prev.map((curr, idx) => idx === i ? { ...curr, isUploading: true } : curr));

              const compressed = await cloudinaryService.compressImage(img.file);
              console.log(`[ProductForm] Compressed image ${i + 1}`);

              const result = await cloudinaryService.uploadToCloudinary(compressed);
              console.log(`[ProductForm] Uploaded image ${i + 1}:`, result.url);
              finalImageUrls.push(result.url);

              updatedImages[i] = { url: result.url };
            } else {
              console.log(`[ProductForm] Image ${i + 1} already uploaded:`, img.url);
              finalImageUrls.push(img.url);
            }
          }

          console.log(`[ProductForm] Step 1 complete: ${finalImageUrls.length} image URLs ready`);

          // ── STEP 2: Build product payload ──
          const productPayload = {
            id: product?.id,
            name,
            description,
            category,
            basePrice: numericBasePrice,
            discountEnabled,
            discountPrice: discountEnabled ? numericDiscountPrice : undefined,
            images: finalImageUrls,
            variants,
            productionTime: product?.productionTime || 7,
            paymentMethods: product?.paymentMethods || ['UPI', 'Card', 'COD'],
          };
          console.log("[ProductForm] Step 2: Product payload built:", JSON.stringify({
            name: productPayload.name,
            category: productPayload.category,
            basePrice: productPayload.basePrice,
            imageCount: productPayload.images.length,
            variantCount: productPayload.variants.length,
          }));

          // ── STEP 3: Save product to database ──
          console.log("[ProductForm] Step 3: Calling productService.save()...");
          const savedProduct = await productService.save(productPayload);
          console.log("[ProductForm] Step 3 result:", savedProduct ? `Success (ID: ${savedProduct.id})` : "FAILED (null)");

          return savedProduct;
        })(),
        // 60-second timeout safety net
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('PRODUCT_SAVE_TIMEOUT')), 60000)
        ),
      ]);

      // ── STEP 4: Handle result ──
      if (!saveResult) {
        console.error("[ProductForm] Step 4: Product save returned null — DB insert likely failed");
        toast.error('Failed to save product to database. Check console for details.');
        return;
      }

      // ── STEP 5: Success ──
      console.log("[ProductForm] ===== SAVE COMPLETE =====", saveResult.id);
      toast.success(product ? 'Product updated successfully!' : 'Product added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("[ProductForm] ===== SAVE FAILED =====", error?.message || error);
      if (error?.message === 'PRODUCT_SAVE_TIMEOUT') {
        toast.error('Save timed out. Product may have been partially saved. Please refresh and check.');
      } else {
        toast.error(`Failed to save product: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
      console.log("[ProductForm] Loading state cleared");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-8 overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-600 rounded-2xl text-white">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">{product ? 'Edit Product' : 'Add New Product'}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventory Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900"
                  placeholder="e.g., Lavender Dream Bouquet"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-medium text-gray-900 resize-none"
                  placeholder="Describe the product beauty and craftsmanship..."
                />
              </div>
            </div>

            <div className="space-y-6">
                <CustomDropdown
                  label="Category *"
                  options={categories}
                  value={category}
                  onChange={setCategory}
                  onAdd={handleAddCategory}
                  onDelete={(id) => setIsDeletingCategory(id)}
                  isLoading={isCategoriesLoading}
                  onRefresh={fetchCategories}
                  canAdd
                  canDelete
                  required
                />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Base Price (₹) *</label>
                  <input
                    type="text"
                    value={basePrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) setBasePrice(val);
                    }}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Production Days</label>
                  <input
                    type="number"
                    defaultValue={7}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discount Toggle */}
          <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-purple-900">Discount Pricing</h4>
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Enable promotional pricing</p>
              </div>
              <button
                type="button"
                onClick={() => setDiscountEnabled(!discountEnabled)}
                className={`w-14 h-8 rounded-full transition-all relative ${discountEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all ${discountEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            {discountEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-black text-purple-600 uppercase mb-2 tracking-widest">Discounted Price (₹)</label>
                <input
                  type="text"
                  value={discountPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*$/.test(val)) setDiscountPrice(val);
                  }}
                  className="w-full px-4 py-3.5 bg-white border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-black text-purple-900"
                  placeholder="Must be lower than base price"
                />
              </motion.div>
            )}
          </div>

          {/* Image Upload Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-gray-900 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2 text-purple-600" />
                Product Gallery
              </h4>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Only square images (1:1) • Max 300KB</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnimatePresence>
                {images.map((img, index) => (
                  <motion.div
                    key={img.url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-3xl overflow-hidden border border-gray-100 group bg-gray-50"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    
                    {img.isUploading && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-purple-600 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">
                        Main Display
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="p-3 bg-gray-50 group-hover:bg-purple-100 rounded-2xl transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-purple-600" />
                </div>
                <span className="text-[10px] font-black text-gray-400 group-hover:text-purple-600 uppercase tracking-widest">Upload Images</span>
              </button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          {/* Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-purple-600" />
                Product Variants
              </h4>
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-xs font-black text-purple-600 uppercase tracking-widest hover:text-purple-700"
              >
                + Add Variant
              </button>
            </div>
            <div className="space-y-3">
              {variants.map((v) => (
                <div key={v.id} className="p-6 border border-gray-100 rounded-3xl bg-gray-50/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex-1">
                      <CustomDropdown
                        label="Type"
                        options={[
                          { id: 'Size', name: 'Size' },
                          { id: 'Color', name: 'Color' },
                          { id: 'Custom', name: 'Custom' }
                        ]}
                        value={v.type || ''}
                        onChange={(val) => updateVariant(v.id, { type: val })}
                        searchable={false}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Name</label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl font-bold text-sm"
                        placeholder="e.g. Small / Red"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Price Override (₹)</label>
                      <input
                        type="number"
                        value={v.price || ''}
                        onChange={(e) => updateVariant(v.id, { price: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl font-bold text-sm"
                        placeholder="Leave empty for base"
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Delivery Days</label>
                        <div className="flex items-center bg-white border border-gray-100 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateVariant(v.id, { deliveryDays: Math.max(1, (v.deliveryDays || 3) - 1) })}
                            className="px-3 py-2 text-gray-500 hover:bg-gray-50 font-black text-lg leading-none"
                          >−</button>
                          <span className="flex-1 text-center font-black text-sm text-gray-900">{v.deliveryDays || 3}d</span>
                          <button
                            type="button"
                            onClick={() => updateVariant(v.id, { deliveryDays: (v.deliveryDays || 3) + 1 })}
                            className="px-3 py-2 text-gray-500 hover:bg-gray-50 font-black text-lg leading-none"
                          >+</button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Variant Image Upload */}
                  <div className="flex items-center gap-4">
                    <div
                      className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-purple-400 transition-all flex items-center justify-center group"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/jpeg,image/png,image/webp';
                        input.onchange = async (ev) => {
                          const file = (ev.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          handleVariantImageUpload(v.id, file);
                        };
                        input.click();
                      }}
                    >
                      {v.image === '__uploading__' ? (
                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                      ) : v.image ? (
                        <img src={v.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variant Image</p>
                      <p className="text-xs text-gray-400 mt-0.5">Click to upload • JPG/PNG/WebP • max 2MB</p>
                      {v.image && v.image !== '__uploading__' && (
                        <button type="button" onClick={() => updateVariant(v.id, { image: undefined })} className="text-[10px] text-red-400 font-bold mt-1">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {variants.length === 0 && (
                <p className="text-center py-8 text-gray-400 font-bold text-sm border-2 border-dashed border-gray-100 rounded-3xl">
                  No variants added. Product will use base price.
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-gray-100 flex items-center space-x-4 sticky bottom-0 bg-white">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-purple-600 text-white py-4 rounded-[1.5rem] font-black text-lg hover:bg-purple-700 disabled:opacity-50 transition-all shadow-xl shadow-purple-100 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Processing Images...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{product ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 bg-gray-100 text-gray-600 py-4 rounded-[1.5rem] font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>

      <ConfirmModal
        isOpen={!!isDeletingCategory}
        onClose={() => setIsDeletingCategory(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category?"
        message={`Are you sure you want to delete this category? This will not remove products in this category.`}
        confirmText="Delete"
      />
    </div>
  );
};

