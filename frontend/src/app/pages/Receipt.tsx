import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { orderService } from '../utils/db';
import { useAuthContext } from '../components/Providers';
import type { Order } from '../utils/types';
import { Download, Check, FileText } from 'lucide-react';
import { LoadingAnimation } from '../components/LoadingAnimation';
import logo from '../../imports/1000182206.png';

export const Receipt = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  const { setGlobalLoading } = useAuthContext();

  useEffect(() => {
    let isMounted = true;
    if (orderId) {
      setGlobalLoading(true);
      orderService.getById(orderId).then(data => {
        if (!isMounted) return;
        setGlobalLoading(false);
        if (data) setOrder(data);
        else navigate('/');
      }).catch(() => {
        if (isMounted) setGlobalLoading(false);
        navigate('/');
      });
    }
    return () => { 
      isMounted = false;
      setGlobalLoading(false);
    };
  }, [orderId, navigate, setGlobalLoading]);

  if (!order) return null;

  const orderDate = new Date(order.orderDate);
  const deliveryDate = new Date(order.estimatedDelivery);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600">Thank you for shopping with ABYRA</p>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6" id="receipt">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-6 mb-6">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="ABYRA" className="h-16 w-16 object-contain" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ABYRA</h2>
                <p className="text-sm text-gray-600">Handcrafted with Love</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="text-lg font-semibold text-gray-900">{order.id}</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Date</p>
              <p className="font-medium text-gray-900">
                {orderDate.toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Method</p>
              <p className="font-medium text-gray-900">{order.paymentMethod}</p>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-900 mb-2">Delivery Address</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{order.address.name}</p>
              <p className="text-sm text-gray-600">{order.address.phone}</p>
              <p className="text-sm text-gray-600 mt-2">
                {order.address.addressLine1}
                {order.address.addressLine2 && `, ${order.address.addressLine2}`}
                <br />
                {order.address.city}, {order.address.state} - {order.address.pincode}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-900 mb-3">Order Items</p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div 
                  key={`${item.productId}-${item.variantId}`}
                  className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-600">{item.variant.name}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  {(() => {
                    const price = item.variant.price || (item.product.discountEnabled && item.product.discountPrice ? item.product.discountPrice : item.product.basePrice);
                    return (
                      <p className="font-medium text-gray-900">₹{(price * item.quantity).toLocaleString()}</p>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.totalAmount - (order.totalAmount > 1000 ? 0 : 50)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{order.totalAmount > 1000 ? 'FREE' : '₹50'}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg text-gray-900 border-t border-gray-200 pt-2">
              <span>Total Paid</span>
              <span>₹{order.totalAmount}</span>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="mt-6 bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-900 mb-1">Estimated Delivery</p>
            <p className="text-lg font-semibold text-purple-700">
              {deliveryDate.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Your handcrafted items are being made with love!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate(`/order-tracking/${order.id}`)}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Track Order
          </button>
          <button
            onClick={() => {
              if (order.receiptUrl) {
                window.open(order.receiptUrl, '_blank');
              } else {
                window.print();
              }
            }}
            className="flex-1 bg-white border-2 border-purple-600 text-purple-600 py-3 rounded-2xl font-black hover:bg-purple-50 transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-50"
          >
            <FileText className="w-5 h-5" />
            <span>{order.receiptUrl ? 'Download PDF Receipt' : 'Print Receipt'}</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
