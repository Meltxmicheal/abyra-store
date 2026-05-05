import { useNavigate } from 'react-router';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useAuthContext } from '../components/Providers';
import { useCartContext } from '../components/Providers';
import { useEffect } from 'react';

export const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthContext();
  const { cart, updateQuantity, removeFromCart, getTotal } = useCartContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[Cart] Not authenticated, redirecting to login');
      navigate('/login', { state: { from: '/cart' } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some beautiful handmade items to your cart!</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const total = getTotal();
  const shipping = total > 1000 ? 0 : 50;
  const grandTotal = total + shipping;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="bg-white rounded-lg p-6 shadow-sm"
              >
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{item.variant.name}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      {item.variant.attributes && Object.entries(item.variant.attributes).map(([key, value]) => (
                        <p key={key}>
                          {key}: {value}
                        </p>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Production time: {item.product.productionTime} days
                    </p>
                  </div>

                  {/* Quantity & Price */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="font-semibold text-gray-900">
                      ₹{(item.variant.price ?? (item.product.discountEnabled ? item.product.discountPrice : item.product.basePrice) ?? 0) * item.quantity}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                {shipping === 0 && (
                  <p className="text-xs text-green-600">
                    🎉 You've qualified for free shipping!
                  </p>
                )}
                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Add ₹{1000 - total} more for free shipping
                  </p>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold text-gray-900 text-lg">
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition mb-3"
              >
                Proceed to Checkout
              </button>

              <button
                onClick={() => navigate('/products')}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};