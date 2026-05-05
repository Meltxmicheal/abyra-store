import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { orderService } from '../utils/db';
import { useAuthContext } from '../components/Providers';
import type { Order } from '../utils/types';
import { Package, Hammer, CheckCircle, Truck, Home, MessageSquare, ChevronLeft, X, AlertCircle, Download } from 'lucide-react';
import { SupportModal } from '../components/SupportModal';
import { CancelOrderModal } from '../components/CancelOrderModal';

import { LoadingAnimation } from '../components/LoadingAnimation';

const statusSteps = [
  { key: 'placed', label: 'Order Placed', icon: Package },
  { key: 'in_production', label: 'In Production', icon: Hammer },
  { key: 'ready', label: 'Ready', icon: CheckCircle },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const { setGlobalLoading } = useAuthContext();

  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;

    // Initial fetch
    setGlobalLoading(true);
    orderService.getById(orderId).then(data => {
      if (!isMounted) return;
      setGlobalLoading(false);
      if (data) setOrder(data);
      else navigate('/orders');
    }).catch(() => {
      if (isMounted) setGlobalLoading(false);
      navigate('/orders');
    });

    // Real-time subscription
    const subscription = orderService.subscribeToOrder(orderId, (updatedOrder) => {
      if (isMounted) setOrder(updatedOrder);
    });

    return () => {
      isMounted = false;
      setGlobalLoading(false);
      subscription.unsubscribe();
    };
  }, [orderId, navigate, setGlobalLoading]);

  if (!order) return null;

  const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-2 text-gray-500 hover:text-purple-600 transition-colors font-bold text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
          <button
            onClick={() => setIsSupportOpen(true)}
            className="flex items-center space-x-2 bg-white text-purple-600 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all border border-purple-100"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Need Help?</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 leading-tight">Track Your Order</h1>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">Order ID:</span>
            <span className="text-purple-600 font-black text-sm">{order.id}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Steps */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10">
              <div className="relative">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.key} className="relative mb-12 last:mb-0">
                      <div className="flex items-center">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isCompleted ? 'bg-purple-600 shadow-lg shadow-purple-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                        </div>

                        {/* Content */}
                        <div className="ml-8 flex-1">
                          <h3 className={`text-lg font-black ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </h3>
                          {isCurrent && order.status !== 'delivered' && (
                            <p className="text-xs font-black text-purple-600 mt-1 uppercase tracking-widest">Currently In Progress</p>
                          )}
                          {( (isCompleted && !isCurrent) || (isCurrent && order.status === 'delivered') ) && (
                            <p className="text-xs font-bold text-green-500 mt-1 uppercase tracking-widest">Successfully Completed</p>
                          )}
                        </div>
                      </div>

                      {/* Connector Line */}
                      {index < statusSteps.length - 1 && (
                        <div className={`absolute left-7 top-14 w-0.5 h-12 -translate-x-1/2 transition-colors duration-500 ${
                          index < currentStepIndex ? 'bg-purple-600' : 'bg-gray-100'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6">Order Details</h2>
              
              <div className="space-y-6">
                {order.items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-xl object-cover shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{item.product.name}</p>
                      <p className="text-xs font-medium text-gray-500">{item.variant.name}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Date</span>
                  <span className="text-xs font-black text-gray-900">
                    {new Date(order.orderDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {order.deliveredAt ? 'Delivered On' : 'Est. Delivery'}
                  </span>
                  <span className={`text-xs font-black ${order.deliveredAt ? 'text-green-600' : 'text-purple-600'}`}>
                    {new Date(order.deliveredAt || order.estimatedDelivery).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-gray-50">
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Total Paid</span>
                  <span className="text-lg font-black text-gray-900">₹{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cancel Option */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
              {order.status === 'placed' ? (
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Need to Cancel?</h3>
                  <button
                    onClick={() => setIsCancelOpen(true)}
                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-100 flex items-center justify-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel Order</span>
                  </button>
                </div>
              ) : (
                !['cancelled', 'delivered'].includes(order.status) && (
                  <div className="flex items-start space-x-3 text-gray-400 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-widest italic leading-relaxed">
                      Cancellation time is over. Order is already in production.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Receipt Download (If available) */}
            {order.receiptUrl && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Official Receipt</h3>
                <a
                  href={order.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-purple-50 text-purple-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 transition-colors border border-purple-100 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Invoice (PDF)</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <SupportModal 
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        orderId={order.id}
      />

      <CancelOrderModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        orderId={order.id}
        onSuccess={() => {
          setIsCancelOpen(false);
          navigate('/orders');
        }}
      />
    </div>
  );
};

