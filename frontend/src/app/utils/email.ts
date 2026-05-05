// ============================================================
// ABYRA STORE — Email Service (Proxy to Backend)
// Securely triggers automated email workflows
// ============================================================

import { BACKEND_URL } from './api';

export interface OrderEmailData {
  toEmail: string;
  toName: string;
  orderId: string;
  totalAmount: number;
}

export const emailService = {
  /**
   * Triggers Order Confirmation with Premium Template
   */
  sendOrderConfirmation: async (data: OrderEmailData): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/order-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.toEmail,
          orderId: data.orderId,
          totalAmount: data.totalAmount,
        }),
      });
      return response.ok;
    } catch (err) {
      console.error('[ABYRA] Email error:', err);
      return false;
    }
  },

  /**
   * Triggers Welcome Email with Premium Template
   */
  sendWelcomeEmail: async (toEmail: string, name: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, name }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Triggers Secure OTP Email
   */
  sendOTPEmail: async (toEmail: string, otp: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, otp }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Triggers Invoice/Receipt Email
   */
  sendReceiptEmail: async (toEmail: string, orderId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, orderId }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Triggers New Product Announcement (Admin Only)
   */
  sendNewProductAnnouncement: async (users: string[], productName: string, productDescription: string, productId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/new-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, productName, productDescription, productId }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};
