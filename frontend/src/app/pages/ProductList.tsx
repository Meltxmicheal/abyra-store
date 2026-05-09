import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { productService, categoryService } from '../utils/db';
import { supabase } from '../utils/supabase';
import type { Product, Category } from '../utils/types';
import { ProductCard } from '../components/ProductCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { useAuthContext } from '../components/Providers';

export const ProductList = () => {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  
  const { setGlobalLoading } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || 'All');
  const [priceRange, setPriceRange] = useState<'all' | 'under500' | '500-1000' | 'above1000'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setGlobalLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          productService.getAll(),
          categoryService.getAll()
        ]);
        if (isMounted) {
          setProducts(productsData);
          setCategories(categoriesData);
        }
      } finally {
        if (isMounted) setGlobalLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for products
    const productsChannel = supabase
      .channel('products_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (!isMounted) return;
        
        if (payload.eventType === 'INSERT') {
          // Need to fetch full product data with relations
          productService.getById(payload.new.id).then(newProduct => {
            if (newProduct && isMounted) {
              setProducts(prev => [...prev, newProduct]);
            }
          });
        } else if (payload.eventType === 'UPDATE') {
          // Need to fetch updated product data
          productService.getById(payload.new.id).then(updatedProduct => {
            if (updatedProduct && isMounted) {
              setProducts(prev => prev.map(p => p.id === payload.new.id ? updatedProduct : p));
            }
          });
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    // Real-time subscription for categories
    const categoriesChannel = supabase
      .channel('categories_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
        if (!isMounted) return;
        
        if (payload.eventType === 'INSERT') {
          setCategories(prev => [...prev, payload.new as Category]);
        } else if (payload.eventType === 'UPDATE') {
          setCategories(prev => prev.map(c => c.id === payload.new.id ? payload.new as Category : c));
        } else if (payload.eventType === 'DELETE') {
          setCategories(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      setGlobalLoading(false);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [setGlobalLoading]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      
      // Price filter (check against discount price if available)
      const currentPrice = product.discountEnabled && product.discountPrice ? product.discountPrice : product.basePrice;
      
      let matchesPrice = true;
      if (priceRange === 'under500') {
        matchesPrice = currentPrice < 500;
      } else if (priceRange === '500-1000') {
        matchesPrice = currentPrice >= 500 && currentPrice <= 1000;
      } else if (priceRange === 'above1000') {
        matchesPrice = currentPrice > 1000;
      }
      
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [products, searchQuery, selectedCategory, priceRange]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {selectedCategory === 'All' ? 'All Products' : selectedCategory}
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-700 md:hidden"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
          </button>

          {/* Filters */}
          <div className={`space-y-4 ${showFilters ? 'block' : 'hidden'} md:block`}>
            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    selectedCategory === 'All'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedCategory === category.name
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPriceRange('all')}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    priceRange === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600'
                  }`}
                >
                  All Prices
                </button>
                <button
                  onClick={() => setPriceRange('under500')}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    priceRange === 'under500'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600'
                  }`}
                >
                  Under ₹500
                </button>
                <button
                  onClick={() => setPriceRange('500-1000')}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    priceRange === '500-1000'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600'
                  }`}
                >
                  ₹500 - ₹1000
                </button>
                <button
                  onClick={() => setPriceRange('above1000')}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    priceRange === 'above1000'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600'
                  }`}
                >
                  Above ₹1000
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No products found matching your criteria</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setPriceRange('all');
              }}
              className="mt-4 text-purple-600 hover:text-purple-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
