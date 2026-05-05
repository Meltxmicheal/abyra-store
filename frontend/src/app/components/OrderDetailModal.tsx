import { X, Package, MapPin, Phone, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { orderService } from '../utils/db';
import type { Order } from '../utils/types';
import { useState } from 'react';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

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

export const OrderDetailModal = ({
  order,
  isOpen,
  onClose,
  onStatusChange,
}: OrderDetailModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);



  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const result = await orderService.updateStatus(
        order.id,
        newStatus as any
      );
      if (result.success) {
        toast.success('Order status updated successfully');
        onStatusChange();
      } else {
        toast.error(`Update failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Critical error: ${err.message || 'Failed to connect'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between sticky top-0">
          <div>
            <h2 className="text-2xl font-black">Order Details</h2>
            <p className="text-purple-100 font-medium text-sm mt-1">{order.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-700 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Status Section */}
          <div className="p-6 bg-gray-50 rounded-2xl">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
              Current Status
            </p>
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl ${
                  statusColors[order.status]
                }`}
              >
                {statusLabels[order.status]}
              </span>
            </div>
          </div>

          {/* Cancellation Reason */}
          {order.cancelReason && (
            <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2">
                    Cancellation Reason
                  </p>
                  <p className="text-sm text-orange-900 font-medium">{order.cancelReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 rounded-2xl">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
                Customer
              </p>
              <p className="font-black text-gray-900 text-lg">{order.address.name}</p>
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                {order.address.phone}
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
                Order Date
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <p className="font-medium text-gray-900">
                  {new Date(order.orderDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="p-6 bg-gray-50 rounded-2xl">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Delivery Address
                </p>
                <p className="font-medium text-gray-900">
                  {order.address.addressLine1}
                </p>
                {order.address.addressLine2 && (
                  <p className="text-sm text-gray-600">{order.address.addressLine2}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {order.address.city}, {order.address.state} - {order.address.pincode}
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
              Order Items
            </p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex gap-4 p-4 bg-gray-50 rounded-xl"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      ×{item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-600">{item.variant.name}</p>
                    <p className="text-sm font-bold text-purple-600 mt-1">
                      ₹{(item.variant?.price || item.product.basePrice) * item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-gray-600 font-medium">Subtotal</p>
                <p className="font-bold text-gray-900">
                  ₹
                  {order.items
                    .reduce(
                      (sum, item) =>
                        sum +
                        (item.variant?.price || item.product.basePrice) *
                          item.quantity,
                      0
                    )
                    .toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-600 font-medium">Payment Method</p>
                <p className="font-bold text-gray-900 uppercase text-sm">
                  {order.paymentMethod}
                </p>
              </div>
              <div className="flex justify-between items-center bg-purple-50 -mx-3 -mb-3 px-3 py-3 rounded-b-2xl">
                <p className="text-purple-700 font-bold">Total Amount</p>
                <p className="font-black text-purple-700 text-lg">
                  ₹{order.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Order Workflow Actions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                disabled={isUpdating || order.status === 'in_production'}
                onClick={() => handleStatusChange('in_production')}
                className="bg-yellow-50 text-yellow-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-100 transition disabled:opacity-50"
              >
                Production
              </button>
              <button
                disabled={isUpdating || order.status === 'ready'}
                onClick={() => handleStatusChange('ready')}
                className="bg-cyan-50 text-cyan-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-100 transition disabled:opacity-50"
              >
                Ready
              </button>
              <button
                disabled={isUpdating || order.status === 'delivered'}
                onClick={() => handleStatusChange('delivered')}
                className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition disabled:opacity-50"
              >
                Deliver
              </button>
              <button
                disabled={isUpdating || order.status === 'cancelled'}
                onClick={() => {
                  const reason = window.prompt('Enter cancellation reason:');
                  if (reason) handleStatusChange('cancelled');
                }}
                className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            
            {isUpdating && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-purple-600 uppercase">Updating database...</span>
              </div>
            )}
            
            <p className="text-[10px] text-gray-400 font-medium mt-4 italic text-center">
              * Actions reflect immediately in customer's track order page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
