import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hgayhvaskddmcetltkca.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnYXlodmFza2RkbWNldGx0a2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODg3OTMsImV4cCI6MjA5MzM2NDc5M30.dF74ituz1nuNxbUlfbOqUQR49wZmxUJ1cNvLhlJJYWo';

console.log('[ABYRA] Supabase client created with hardcoded URL:', supabaseUrl);



// Custom storage that falls back to memory if localStorage is blocked
const memoryStorage: { [key: string]: string } = {};
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // localStorage is blocked (e.g. by Tracking Prevention)
    }
    return memoryStorage[key] || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // localStorage is blocked
    }
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      // localStorage is blocked
    }
    delete memoryStorage[key];
  }
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: customStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // CRITICAL: Disable navigator locking to prevent NavigatorLockAcquireTimeoutError
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => await fn()
    },
    global: {
      fetch: (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        // Only log non-static asset fetches to keep console clean
        if (!url.includes('.png') && !url.includes('.jpg') && !url.includes('.svg')) {
          console.log(`[SUPABASE FETCH] ${url}`);
        }
        return fetch(...args);
      }
    }
  }
);

// Database types
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          role: 'user' | 'admin';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          discount_price: number | null;
          discount_enabled: boolean;
          category_id: string | null;
          images: string[];
          variants: Json;
          production_time: number;
          payment_methods: string[];
          rating: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      categories: {
        Row: { id: string; name: string; image: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      cart: {
        Row: { id: string; user_id: string; items: Json; updated_at: string };
        Insert: { user_id: string; items: Json };
        Update: { items: Json };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          total_amount: number;
          payment_method: string;
          payment_status: 'pending' | 'paid' | 'failed' | 'cod';
          order_status: 'placed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
          address: Json;
          estimated_delivery: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          price: number;
          product_snapshot: Json;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>;
        Update: never;
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          rating: number;
          comment: string;
          admin_reply: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          pincode: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['addresses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['addresses']['Insert']>;
      };
      support_requests: {
        Row: {
          id: string;
          order_id: string;
          user_id: string;
          user_name: string;
          user_email: string;
          issue_type: string;
          message: string;
          status: 'pending' | 'resolved';
          image_proof: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['support_requests']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['support_requests']['Insert']>;
      };
    };
  };
}
