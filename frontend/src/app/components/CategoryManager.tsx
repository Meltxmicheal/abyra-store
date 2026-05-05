import { useState, useEffect } from 'react';
import { categoryService } from '../utils/db';
import type { Category } from '../utils/types';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from './ConfirmModal';

export const CategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const data = await categoryService.getAll();
    setCategories(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsLoading(true);
    const saved = await categoryService.save(newCategoryName.trim());
    setIsLoading(false);

    if (saved) {
      toast.success(`Category "${saved.name}" added`);
      setNewCategoryName('');
      fetchCategories();
    } else {
      toast.error('Failed to add category');
    }
  };

  const handleDelete = async () => {
    if (!isDeletingId) return;

    const success = await categoryService.delete(isDeletingId);
    if (success) {
      toast.success('Category deleted');
      fetchCategories();
    } else {
      toast.error('Failed to delete category');
    }
    setIsDeletingId(null);
  };

  return (
    <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900">Manage Categories</h2>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Organize your store collections</p>
      </div>

      {/* Add Category Form */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-10">
        <div className="flex-1 relative group">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter new category name..."
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 outline-none font-bold text-gray-900 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !newCategoryName.trim()}
          className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-purple-100"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          <span>Add Category</span>
        </button>
      </form>

      {/* Category List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length > 0 ? (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-5 bg-gray-50 border border-gray-50 rounded-2xl group hover:border-purple-200 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Tag className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-bold text-gray-900">{cat.name}</span>
              </div>
              <button
                onClick={() => setIsDeletingId(cat.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
            <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No categories found</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!isDeletingId}
        onClose={() => setIsDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Category?"
        message="Are you sure? This will remove the category but won't delete the products assigned to it."
        confirmText="Delete"
      />
    </div>
  );
};
