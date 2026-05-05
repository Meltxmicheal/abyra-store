import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { orderService, reviewService } from '../utils/db';
import type { Order } from '../utils/types';
import { Package, ChevronRight, MessageSquare, X, CheckCircle, FileText } from 'lucide-react';
import { SupportModal } from '../components/SupportModal';
import { CancelOrderModal } from '../components/CancelOrderModal';
import { ReviewModal } from '../components/ReviewModal';
import { LoadingAnimation } from '../components/LoadingAnimation';

const statusColors = {
  placed: 'bg-blue-100 text-blue-700',
  in_production: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-cyan-100 text-cyan-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels = {
  placed: 'Order Placed',
  in_production: 'In Production',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusIcons = {
  placed: '⏳',
  in_production: '🔨',
  ready: '✨',
  shipped: '📦',
  delivered: '🎉',
  cancelled: '❌',
};

export const Orders = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [supportOrder, setSupportOrder] = useState<string | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{
    orderId: string;
    productId: string;
    productName: string;
  } | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const { setGlobalLoading } = useAuthContext();

  const handleCancelSuccess = async () => {
    if (!user) return;
    const updatedOrders = await orderService.getUserOrders(user.id);
    setOrders(updatedOrders);
  };



  const fetchReviewedProducts = async (isMounted: boolean) => {
    if (!user) return;
    const reviews = await reviewService.getAll(); // Filtered by RLS to current user's reviews
    if (isMounted) {
      const ids = new Set(reviews.filter((r: any) => r.userId === user.id).map((r: any) => r.productId));
      setReviewedProductIds(ids);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      console.log('[Orders] Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    let isMounted = true;
    const loadAllData = async () => {
      setGlobalLoading(true);
      try {
        const data = await orderService.getUserOrders(user.id);
        if (isMounted) {
          const sorted = [...data].sort((a, b) => {
            const statusOrder = {
              delivered: 1, shipped: 2, ready: 2, in_production: 2, placed: 3, cancelled: 4
            };
            const orderA = statusOrder[a.status as keyof typeof statusOrder] || 5;
            const orderB = statusOrder[b.status as keyof typeof statusOrder] || 5;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
          });
          setOrders(sorted);
          await fetchReviewedProducts(isMounted);
        }
      } finally {
        if (isMounted) setGlobalLoading(false);
      }
    };

    loadAllData();

    const subscription = orderService.subscribeToUserOrders(user.id, () => {
      loadAllData();
    });

    return () => {
      isMounted = false;
      setGlobalLoading(false);
      subscription.unsubscribe();
    };
  }, [user, isAuthenticated, isLoading, navigate, setGlobalLoading]);

  if (isLoading) return null;

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-600 mb-6">Start shopping and your orders will appear here</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
            {orders.length} Orders
          </div>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group"
            >
              <div 
                className="p-8 cursor-pointer"
                onClick={() => navigate(`/order-tracking/${order.id}`)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-purple-600">
                      #{order.id.slice(-4)}
                    </div>
                    <div>
                      <p className="font-black text-gray-900">Order ID: {order.id}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(order.orderDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${statusColors[order.status as keyof typeof statusColors]}`}>
                      {statusIcons[order.status as keyof typeof statusIcons]} {statusLabels[order.status as keyof typeof statusLabels]}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover shadow-sm"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{item.product.name}</p>
                          <p className="text-xs font-medium text-gray-500">{item.variant.name}</p>
                          <p className="text-xs font-bold text-gray-400 mt-1">Qty: {item.quantity}</p>
                        </div>
                        {order.status === 'delivered' && !reviewedProductIds.has(item.productId) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewData({
                                orderId: order.id,
                                productId: item.productId,
                                productName: item.product.name
                              });
                            }}
                            className="bg-purple-50 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition flex items-center gap-2"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Review Item</span>
                          </button>
                        )}
                        {order.status === 'delivered' && reviewedProductIds.has(item.productId) && (
                          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.status === 'cancelled' && order.cancelReason && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-1">Cancellation Reason</p>
                    <p className="text-sm text-red-900">{order.cancelReason}</p>
                  </div>
                )}
              </div>

              <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSupportOrder(order.id);
                    }}
                    className="flex items-center space-x-2 text-xs font-black text-purple-600 uppercase tracking-widest hover:text-purple-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Help</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/order-tracking/${order.id}`);
                    }}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition"
                  >
                    <span>Track Order</span>
                  </button>

                  {order.receiptUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(order.receiptUrl, '_blank');
                      }}
                      className="flex items-center space-x-2 text-xs font-black text-green-600 uppercase tracking-widest hover:text-green-700 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Receipt</span>
                    </button>
                  )}

                  {order.status === 'placed' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelingOrder(order.id);
                      }}
                      className="flex items-center space-x-2 text-xs font-black text-red-600 uppercase tracking-widest hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel Order</span>
                    </button>
                  ) : (
                    !['cancelled', 'delivered'].includes(order.status) && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
                        Cancellation time is over. Order is already in production.
                      </p>
                    )
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Total Amount</span>
                  <span className="font-black text-gray-900">₹{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SupportModal 
        isOpen={!!supportOrder}
        onClose={() => setSupportOrder(null)}
        orderId={supportOrder || ''}
      />

      <CancelOrderModal
        orderId={cancelingOrder || ''}
        isOpen={!!cancelingOrder}
        onClose={() => setCancelingOrder(null)}
        onSuccess={handleCancelSuccess}
      />

      <ReviewModal
        orderId={reviewData?.orderId || ''}
        userId={user?.id || ''}
        productId={reviewData?.productId || ''}
        productName={reviewData?.productName || ''}
        isOpen={!!reviewData}
        onClose={() => setReviewData(null)}
        onSuccess={() => {
          setReviewData(null);
          fetchReviewedProducts();
        }}
      />
    </div>
  );
};