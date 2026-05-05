// ============================================================
// ABYRA STORE — Razorpay Payment Integration (Full-Stack Flow)
// ============================================================

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
import { BACKEND_URL } from './api';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface PaymentOptions {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  error?: string;
}

export const razorpayService = {
  /**
   * 1. Create a Razorpay Order on the backend
   */
  createOrder: async (amount: number, receipt: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, receipt }),
      });
      return await response.json();
    } catch (err) {
      console.error('Create Order Error:', err);
      return null;
    }
  },

  /**
   * 2. Verify payment on the backend
   */
  verifyPayment: async (data: { 
    razorpay_order_id: string; 
    razorpay_payment_id: string; 
    razorpay_signature: string;
    order_id: string;
    email: string;
    amount: number;
  }) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (err) {
      console.error('Verify Payment Error:', err);
      return { success: false };
    }
  },

  /**
   * Opens the Razorpay payment modal with full-stack verification.
   */
  openPaymentModal: async (options: PaymentOptions): Promise<PaymentResult> => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) return { success: false, error: 'Payment gateway failed to load.' };

    // 1. Create backend order
    const backendOrder = await razorpayService.createOrder(options.amount, options.orderId);
    if (!backendOrder || !backendOrder.id) {
      return { success: false, error: 'Failed to initialize secure payment session.' };
    }

    return new Promise<PaymentResult>(resolve => {
      const rzpOptions = {
        key: RAZORPAY_KEY_ID,
        amount: backendOrder.amount,
        currency: backendOrder.currency,
        name: 'ABYRA Store',
        description: options.description || `Order ${options.orderId}`,
        image: 'https://placehold.co/200x200/7c3aed/ffffff?text=ABYRA',
        order_id: backendOrder.id, // Use order ID from backend
        prefill: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone,
        },
        theme: { color: '#7c3aed' },
        handler: async (response: any) => {
          try {
            // 2. Verify payment on backend
            const verification = await razorpayService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: options.orderId,
              email: options.customerEmail,
              amount: options.amount
            });

            if (verification.success) {
              resolve({
                success: true,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              });
            } else {
              resolve({ success: false, error: 'Payment verification failed.' });
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            resolve({ success: false, error: 'Payment verification error.' });
          }
        },
        modal: {
          ondismiss: () => resolve({ success: false, error: 'Payment cancelled' }),
        },
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.open();
    });
  },
};
