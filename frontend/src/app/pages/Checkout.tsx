import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { useCartContext } from '../components/Providers';
import { addressService, orderService } from '../utils/db';
import { razorpayService } from '../utils/razorpay';
import { emailService } from '../utils/email';
import type { Address } from '../utils/types';
import { states, getDistrictsByState, validatePhone, validatePincode } from '../utils/stateDistrict';
import { toast } from 'sonner';
import { Plus, MapPin, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CustomDropdown } from '../components/CustomDropdown';

export const Checkout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const { cart, getTotal, clearCart } = useCartContext();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'COD'>('UPI');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const { setGlobalLoading } = useAuthContext();

  // Address form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      console.log('[Checkout] Not authenticated, redirecting to login');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    if (cart.length === 0) {
      navigate('/cart');
      return;
    }

    let isMounted = true;
    if (isAuthenticated) {
      loadAddresses(isMounted);
    }
    return () => { isMounted = false; };
  }, [isAuthenticated, cart, navigate]);

  const loadAddresses = async (isMounted: boolean = true) => {
    if (!user) return;
    const userAddresses = await addressService.getAll(user.id);
    if (isMounted) {
      setAddresses(userAddresses);
      const defaultAddr = userAddresses.find(a => a.isDefault) || userAddresses[0] || null;
      if (defaultAddr) setSelectedAddress(defaultAddr);
    }
  };

  const handleAddAddress = async () => {
    if (!formData.name || !formData.phone || !formData.addressLine1 || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!validatePincode(formData.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    if (!user) return;

    const newAddress = await addressService.add(user.id, formData);
    if (!newAddress) {
      toast.error('Failed to save address');
      return;
    }

    setAddresses(prev => [...prev, newAddress]);
    setSelectedAddress(newAddress);
    setShowAddressForm(false);
    setFormData({ name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false });
    toast.success('Address added successfully');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!user) return;

    const total = getTotal();
    const shipping = total > 1000 ? 0 : 50;
    const grandTotal = total + shipping;

    setGlobalLoading(true);

    try {
      let paymentStatus: 'pending' | 'paid' | 'cod' = 'pending';
      let razorpayPaymentId: string | undefined;

      if (paymentMethod === 'COD') {
        // COD — create order directly
        paymentStatus = 'cod';
      } else {
        // Razorpay payment
        const paymentResult = await razorpayService.openPaymentModal({
          orderId: `ABYRA-${Date.now()}`,
          amount: grandTotal,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phoneNumber,
          description: `ABYRA Store — ${cart.length} item(s)`,
        });

        console.log('[Checkout] Razorpay response:', paymentResult);

        if (!paymentResult.success) {
          console.error('[Checkout] Payment failed or cancelled:', paymentResult.error);
          toast.error(paymentResult.error || 'Payment failed');
          setGlobalLoading(false); // Explicit fallback
          return;
        }

        console.log('[Checkout] Payment successful. Razorpay ID:', paymentResult.razorpayPaymentId);
        paymentStatus = 'paid';
        razorpayPaymentId = paymentResult.razorpayPaymentId;
      }

      console.log('[Checkout] Calling orderService.create...');
      // Create order in Supabase
      const order = await orderService.create(
        user.id,
        cart,
        selectedAddress,
        grandTotal,
        paymentMethod,
        paymentStatus,
        undefined,
        razorpayPaymentId
      );

      console.log('[Checkout] Order creation result:', order);

      if (!order) {
        console.error('[Checkout] Order creation returned null!');
        toast.error('Failed to create order. Please try again.');
        setGlobalLoading(false); // Explicit fallback
        return;
      }

      console.log('[Checkout] Clearing cart and redirecting to receipt...');
      clearCart();
      toast.success('Order confirmed! 🎉');
      
      // Navigate to receipt page immediately
      navigate(`/receipt/${order.id}`);
    } catch (error) {
      console.error('[Checkout] Order error catch block:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      console.log('[Checkout] Finally block: turning off global loading.');
      setGlobalLoading(false);
    }
  };


  const total = getTotal();
  const shipping = total > 1000 ? 0 : 50;
  const grandTotal = total + shipping;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Delivery Address
                </h2>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 mb-4">No saved addresses</p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedAddress?.id === address.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress?.id === address.id}
                        onChange={() => setSelectedAddress(address)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{address.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                          <p className="text-sm text-gray-600 mt-2">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                            <br />
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                        </div>
                        {address.isDefault && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Method
              </h2>

              <div className="space-y-3">
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                  paymentMethod === 'UPI' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium">UPI / QR Code</span>
                      <p className="text-xs text-gray-500 mt-0.5">Pay via Razorpay — PhonePe, GPay, Paytm</p>
                    </div>
                  </div>
                </label>

                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                  paymentMethod === 'Card' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'Card'}
                    onChange={() => setPaymentMethod('Card')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium">Credit / Debit Card</span>
                      <p className="text-xs text-gray-500 mt-0.5">Visa, Mastercard, RuPay — via Razorpay</p>
                    </div>
                  </div>
                </label>

                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                  paymentMethod === 'COD' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <Banknote className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium">Cash on Delivery</span>
                      <p className="text-xs text-gray-500 mt-0.5">Pay when your order arrives</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.product.name} x {item.quantity}
                    </span>
                    <span className="text-gray-900">₹{(item.variant.price || item.product.basePrice) * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold text-gray-900 text-lg">
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Estimated Delivery */}
              {(() => {
                const maxDays = Math.max(...cart.map(item => item.variant?.deliveryDays ?? item.product.productionTime ?? 7));
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + maxDays);
                return (
                  <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center space-x-3">
                    <span className="text-2xl">📦</span>
                    <div>
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Estimated Delivery</p>
                      <p className="font-black text-purple-900">
                        {deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-purple-500 mt-0.5">Delivery in {maxDays} day{maxDays !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={handlePlaceOrder}
                disabled={!selectedAddress}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {paymentMethod === 'COD' ? 'Place Order' : `Pay ₹${grandTotal}`}
              </button>

              {paymentMethod !== 'COD' && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  🔒 Secured by Razorpay
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      <Dialog open={showAddressForm} onOpenChange={setShowAddressForm}>
        <DialogContent className="sm:max-w-lg bg-white rounded-[2.5rem] border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">Add New Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={10}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Address Line 1 *</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Address Line 2</label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CustomDropdown
                label="State *"
                options={states.map(s => ({ id: s, name: s }))}
                value={formData.state}
                onChange={(val) => setFormData({ ...formData, state: val, city: '' })}
                placeholder="Select State"
                required
              />
              <div className={!formData.state ? 'opacity-50 pointer-events-none' : ''}>
                <CustomDropdown
                  label="District *"
                  options={formData.state ? getDistrictsByState(formData.state).map(d => ({ id: d, name: d })) : []}
                  value={formData.city}
                  onChange={(val) => setFormData({ ...formData, city: val })}
                  placeholder="Select District"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Pincode *</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                maxLength={6}
                placeholder="6-digit pincode"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 transition-all font-bold text-gray-900 outline-none"
              />
            </div>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-5 h-5 rounded-lg border-gray-300 text-purple-600 focus:ring-purple-600 transition-all"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Set as default address</span>
            </label>
            <button
              onClick={handleAddAddress}
              className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition shadow-xl shadow-purple-100"
            >
              Add Address
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};