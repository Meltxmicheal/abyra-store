import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { productService, categoryService, orderService, reviewService, adminService } from '../utils/db';
import { supabase } from '../utils/supabase';
import type { Product, Order } from '../utils/types';
import { Package, Users, Settings, MessageSquare, LayoutDashboard, TrendingUp, DollarSign, Edit2, Trash2, Plus, Download, Star, Reply, Eye, Calendar, X, RotateCcw, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Profile } from './Profile';
import { ProductFormModal } from '../components/ProductFormModal';
import { toast } from 'sonner';
import { CustomDropdown } from '../components/CustomDropdown';
import { ConfirmModal } from '../components/ConfirmModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { CategoryManager } from '../components/CategoryManager';
import { LoadingAnimation } from '../components/LoadingAnimation';

export const Admin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ productId: string, reviewId: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const { setGlobalLoading } = useAuthContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isToday, setIsToday] = useState(false);
  const [revenueData, setRevenueData] = useState<{ totalRevenue: number; productRevenue: any[] }>({ totalRevenue: 0, productRevenue: [] });
  const [isRevenueDetailOpen, setIsRevenueDetailOpen] = useState(false);

  const [stats, setStats] = useState({
    totalRevenue: 0, activeOrders: 0, totalOrders: 0, averageOrderValue: 0, totalProducts: 0, totalUsers: 0, totalCategories: 0,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user?.isAdmin) {
      console.log('[Admin] Not authorized, redirecting to home');
      navigate('/');
      return;
    }
    
    let isMounted = true;
    refreshData(true, isMounted);
    
    return () => { 
      isMounted = false;
      setGlobalLoading(false);
    };
  }, [user, isAuthenticated, isLoading, navigate, setGlobalLoading, selectedMonth, selectedYear, isToday]);

  const refreshData = async (isFirst = false, isMounted: boolean = true) => {
    if (isFirst) setGlobalLoading(true);
    try {
      const day = isToday ? new Date().getDate() : undefined;
      const [allProducts, allOrders, allReviews, metrics, usersRes, allCategories, revSummary] = await Promise.all([
        productService.getAll(),
        orderService.getAllOrders(),
        reviewService.getAll(),
        orderService.getMetrics(),
        supabase.from("users").select("id").eq("role", "user"),
        categoryService.getAll(),
        orderService.getRevenueSummary(selectedMonth, selectedYear, day),
      ]);
      if (isMounted) {
        setProducts(allProducts);
        setOrders(allOrders);
        setReviews(allReviews);
        setRevenueData(revSummary);
        setStats({
          totalRevenue: revSummary.totalRevenue, // Show selected month revenue in cards
          activeOrders: metrics.activeOrders,
          totalOrders: metrics.totalOrders,
          averageOrderValue: metrics.averageOrderValue,
          totalProducts: allProducts.length,
          totalUsers: usersRes.data?.length || 0,
          totalCategories: allCategories.length,
        });
      }
    } catch (err) {
      console.error('[Admin] Refresh error:', err);
      toast.error('Failed to sync administrative data');
    } finally {
      if (isMounted) setGlobalLoading(false);
    }
  };

  if (isLoading) return null;
  if (!user?.isAdmin) return null;

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!isDeletingProduct) return;
    setIsDeletingLoading(true);
    try {
      await productService.delete(isDeletingProduct);
      await refreshData();
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setIsDeletingLoading(false);
      setIsDeletingProduct(null);
    }
  };

  const handleExportCSV = async (type: 'orders' | 'revenue_month' | 'revenue_products') => {
    const day = isToday ? new Date().getDate() : undefined;
    const csvContent = await orderService.exportToCSV(type, { month: selectedMonth, year: selectedYear, month_only: !isToday });
    // Note: I'll update exportToCSV in db.ts to handle day if needed, but for now I'll just keep it as is.
    // Actually the user wants month-wise and product-wise.
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = type === 'orders' ? 'orders' : type === 'revenue_month' ? `revenue_by_month_${selectedYear}` : `product_revenue_${selectedMonth + 1}_${selectedYear}`;
    a.download = `${fileName}.csv`;
    a.click();
    toast.success(`Exported ${type.replace('_', ' ')} report`);
  };

  const handleReplySubmit = async () => {
    if (!replyingTo || !replyText) return;
    const success = await reviewService.saveAdminReply(replyingTo.reviewId, replyText);
    if (success) {
      toast.success('Reply sent successfully');
      setReplyingTo(null);
      setReplyText('');
      await refreshData();
    } else {
      toast.error('Failed to send reply');
    }
  };

  const statusOptions = [
    { id: 'placed', name: 'Order Placed' },
    { id: 'in_production', name: 'In Production' },
    { id: 'ready', name: 'Ready' },
    { id: 'shipped', name: 'Shipped' },
    { id: 'delivered', name: 'Delivered' },
    { id: 'cancelled', name: 'Cancelled' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-purple-600 text-white pt-12 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">Control Center</h1>
              <p className="text-purple-100 font-medium opacity-90">ABYRA Premium Administration</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
              className="bg-white text-purple-600 px-6 py-3 rounded-2xl font-black hover:shadow-xl transition flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Quick Add Product</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        {/* Month Selector */}
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-xl">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Revenue Period</h3>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setIsToday(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!isToday ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsToday(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isToday ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Today
              </button>
            </div>
            
            <button 
              onClick={() => {
                setIsToday(false);
                setSelectedMonth(new Date().getMonth());
                setSelectedYear(new Date().getFullYear());
                refreshData(true);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 text-[10px] font-black text-gray-400 hover:text-purple-600 uppercase tracking-widest transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
          
          {!isToday ? (
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 md:w-40 bg-gray-50 border-2 border-transparent focus:border-purple-600 rounded-xl px-4 py-2 font-bold text-gray-900 outline-none transition"
              >
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="md:w-32 bg-gray-50 border-2 border-transparent focus:border-purple-600 rounded-xl px-4 py-2 font-bold text-gray-900 outline-none transition"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
              <span className="text-xs font-black text-purple-600 uppercase tracking-widest">
                Viewing Live Stats for {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </span>
            </div>
          )}
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <StatCard 
            title={isToday ? "Today's Revenue" : "Period Revenue"} 
            value={`₹${stats.totalRevenue.toLocaleString()}`} 
            icon={<DollarSign className="w-6 h-6" />} 
            color="text-green-600" 
            trend="Click for breakdown"
            onClick={() => setIsRevenueDetailOpen(true)}
          />
          <StatCard title="Active Orders" value={stats.activeOrders.toString()} icon={<Package className="w-6 h-6" />} color="text-purple-600" trend={`${stats.totalOrders} total orders`} />
          <StatCard title="Avg. Order Value" value={`₹${Math.round(stats.averageOrderValue).toLocaleString()}`} icon={<TrendingUp className="w-6 h-6" />} color="text-blue-600" trend="Stable" />
          <StatCard title="Total Products" value={stats.totalProducts.toString()} icon={<Settings className="w-6 h-6" />} color="text-orange-600" trend={`${stats.totalUsers} customers`} />
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-2 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="orders" className="px-4 sm:px-6 py-2.5 rounded-xl font-bold whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Orders</TabsTrigger>
            <TabsTrigger value="products" className="px-4 sm:px-6 py-2.5 rounded-xl font-bold whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Inventory</TabsTrigger>
            <TabsTrigger value="categories" className="px-4 sm:px-6 py-2.5 rounded-xl font-bold whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Collections</TabsTrigger>
            <TabsTrigger value="reviews" className="px-4 sm:px-6 py-2.5 rounded-xl font-bold whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Reviews & Replies</TabsTrigger>
            <TabsTrigger value="sales" className="px-4 sm:px-6 py-2.5 rounded-xl font-bold whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Analytics</TabsTrigger>
            <TabsTrigger value="profile" className="px-4 sm:px-6 py-2.5 rounded-xl font-bold whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Order Management</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Track and manage customer fulfillments</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleExportCSV('orders')} className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition">
                  <Download className="w-4 h-4" />
                  <span>Orders CSV</span>
                </button>
                <button onClick={() => handleExportCSV('revenue_month')} className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition">
                  <Download className="w-4 h-4" />
                  <span>Monthly Revenue</span>
                </button>
                <button onClick={() => handleExportCSV('revenue_products')} className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition">
                  <Download className="w-4 h-4" />
                  <span>Product Sales</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-[800px]">
                <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-4">Customer Name</th>
                    <th className="px-8 py-4">Product</th>
                    <th className="px-8 py-4">Amount</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center font-bold text-purple-600 text-xs">
                              #{order.id.slice(-4)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{order.address.name}</p>
                              <p className="text-xs text-gray-500">{order.address.city}, {order.address.pincode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="max-w-[200px] space-y-2">
                            {order.items.map(item => (
                              <div key={item.productId} className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                  <img 
                                    src={item.product.images[0] || '/placeholder-product.png'} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {item.product.name || 'Product unavailable'}
                                  </p>
                                  {item.variant?.name ? (
                                    <p className="text-[10px] font-medium text-gray-500 truncate">
                                      {item.variant.name}
                                    </p>
                                  ) : null}
                                  <p className="text-[10px] font-medium text-gray-400">
                                    Qty: {item.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-black text-gray-900">₹{order.totalAmount.toLocaleString()}</p>
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${
                            order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600 border-green-200' :
                            order.paymentStatus === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-orange-50 text-orange-600 border-orange-200'
                          }`}>
                            {order.paymentStatus} / {order.paymentMethod}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block ${
                            order.status === 'placed' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'in_production' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'ready' ? 'bg-cyan-100 text-cyan-700' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                            order.status === 'delivered' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {order.status === 'in_production' ? 'In Production' : order.status === 'placed' ? 'Placed' : order.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center space-x-2 px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 rounded-xl transition"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Manage</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No orders found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Inventory Management</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {products.length} Products
                </p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-6 p-6 border border-gray-50 rounded-3xl hover:bg-gray-50/50 hover:shadow-xl transition-all group">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md">
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                    {product.discountEnabled && <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg">OFF</div>}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 text-lg">{product.name}</h3>
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">{product.category}</p>
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-black text-gray-900">₹{(product.discountEnabled ? product.discountPrice : product.basePrice)?.toLocaleString()}</span>
                      <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-black rounded-full uppercase tracking-widest">{product.variants.length} Variants</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleEditProduct(product)} className="p-3 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => setIsDeletingProduct(product.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="focus:outline-none">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="reviews" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900">Reviews & Replies</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Moderate customer feedback and engagement</p>
            </div>
            <div className="p-8 space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="p-6 border border-gray-50 rounded-3xl hover:bg-gray-50/50 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center font-black">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{review.userName}</p>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">{review.productName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 font-medium mb-4">{review.comment}</p>
                  
                  {review.adminReply ? (
                    <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 flex items-center">
                        <Reply className="w-3 h-3 mr-1" /> Your Reply
                      </p>
                      <p className="text-purple-900 font-medium">{review.adminReply}</p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      {replyingTo?.reviewId === review.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium focus:ring-2 focus:ring-purple-600 transition-all text-sm outline-none"
                            placeholder="Write your professional reply..."
                            rows={3}
                          />
                          <div className="flex space-x-2">
                            <button onClick={handleReplySubmit} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-purple-700 transition">Post Reply</button>
                            <button onClick={() => setReplyingTo(null)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setReplyingTo({ productId: review.productId, reviewId: review.id })}
                          className="text-sm font-black text-purple-600 uppercase tracking-widest hover:text-purple-700 flex items-center"
                        >
                          <Reply className="w-4 h-4 mr-1" /> Reply to Customer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="py-20 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sales" className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">Performance Analytics</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Real-time revenue and sales velocity</p>
            </div>
            <div className="h-64 flex items-end justify-between gap-4 px-4">
              {[65, 45, 75, 55, 90, 70, 85].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full bg-purple-100 rounded-t-xl group-hover:bg-purple-600 transition-all duration-500 relative" style={{ height: `${height}%` }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">₹{Math.round(height * 1000).toLocaleString()}</div>
                  </div>
                  <span className="text-xs font-bold text-gray-400">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="focus:outline-none space-y-8">
            <Profile />
            
            <div className="bg-white rounded-[3rem] p-8 shadow-sm border-2 border-red-50 transition-all">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-red-50 rounded-2xl">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Danger Zone</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">System reset & Data Purge</p>
                </div>
              </div>
              
              <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-red-900 text-sm">Reset Revenue & Orders</h4>
                    <p className="text-xs text-red-600 font-medium mt-1">This will permanently delete ALL orders and revenue data. Users and products will not be affected.</p>
                  </div>
                  <button 
                    onClick={() => setIsResetModalOpen(true)}
                    className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition shadow-xl shadow-red-200"
                  >
                    Purge All Orders
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={async () => {
          setIsResetLoading(true);
          const success = await adminService.dangerouslyResetOrders();
          setIsResetLoading(false);
          if (success) {
            toast.success("Order data purged successfully.");
            setIsResetModalOpen(false);
            window.location.reload();
          } else {
            toast.error("Failed to reset data.");
          }
        }}
        isLoading={isResetLoading}
        title="CRITICAL ACTION"
        message="Are you sure you want to delete ALL order history? This cannot be undone."
        confirmText="Yes, Delete All"
        cancelText="No, Keep Data"
        cancelColor="green"
        type="danger"
      />

      <ProductFormModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} product={editingProduct} onSuccess={refreshData} />
      
      <ConfirmModal
        isOpen={!!isDeletingProduct}
        onClose={() => setIsDeletingProduct(null)}
        onConfirm={confirmDeleteProduct}
        isLoading={isDeletingLoading}
        title="Delete Product?"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete Product"
      />

      <OrderDetailModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={refreshData}
      />

      <RevenueDetailModal
        isOpen={isRevenueDetailOpen}
        onClose={() => setIsRevenueDetailOpen(false)}
        data={revenueData}
        month={selectedMonth}
        year={selectedYear}
        isToday={isToday}
      />
    </div>
  );
};

const RevenueDetailModal = ({ isOpen, onClose, data, month, year, isToday }: { isOpen: boolean; onClose: () => void; data: any; month: number; year: number; isToday: boolean }) => {
  if (!isOpen) return null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 bg-purple-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black">Revenue Breakdown</h2>
            <p className="text-purple-100 font-bold uppercase tracking-widest text-xs mt-1">
              {isToday ? `Today (${new Date().toLocaleDateString()})` : `${months[month]} ${year}`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => window.location.reload()} 
              className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition flex items-center space-x-2"
              title="Refresh revenue view"
            >
              <RotateCw className="w-4 h-4 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Refresh View</span>
            </button>
            <button onClick={onClose} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1">
          <div className="bg-gray-50 rounded-3xl p-6 mb-8 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                {isToday ? "Today's Total" : "Total Period Revenue"}
              </p>
              <p className="text-4xl font-black text-gray-900">₹{data.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>

          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Product-wise Performance</h3>
          <div className="space-y-4">
            {data.productRevenue.length > 0 ? (
              data.productRevenue.map((item: any) => (
                <div key={item.productId} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center font-black text-purple-600 text-xs">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {item.productId.slice(-8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">₹{item.revenue.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">
                      {((item.revenue / data.totalRevenue) * 100).toFixed(1)}% share
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No sales recorded for this period</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Generated by ABYRA Intelligence</p>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend, onClick }: { title: string; value: string; icon: any; color: string; trend: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center justify-between mb-6">
      <div className={`p-4 rounded-2xl bg-gray-50 group-hover:bg-opacity-80 transition-colors ${color}`}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Live</span>
    </div>
    <p className="text-gray-500 font-bold text-sm mb-1">{title}</p>
    <p className="text-3xl font-black text-gray-900 mb-4">{value}</p>
    <div className="flex items-center space-x-1 text-xs font-bold text-gray-400">
      {trend.includes('breakdown') ? <Eye className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
      <span>{trend}</span>
    </div>
  </div>
);
