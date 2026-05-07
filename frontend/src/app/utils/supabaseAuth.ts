// ============================================================
// ABYRA STORE — Supabase Authentication Service
// Replaces the localStorage-based auth.ts
// ============================================================
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { API_URL } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  isAdmin: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
}

// Map Supabase DB row → our app User type
function mapDbUser(dbUser: any, supabaseUser?: SupabaseUser | null): User {
  return {
    id: dbUser.id,
    email: dbUser.email || supabaseUser?.email || '',
    name: dbUser.name || '',
    phoneNumber: dbUser.phone || '',
    gender: (dbUser.gender as User['gender']) || 'prefer_not_to_say',
    isAdmin: dbUser.role === 'admin',
    isVerified: supabaseUser?.email_confirmed_at != null || dbUser.role === 'admin',
    twoFactorEnabled: dbUser.two_factor_enabled || false,
  };
}

export const supabaseAuthService = {
  // -------------------------------------------------------
  // Sign Up
  // -------------------------------------------------------
  signUp: async (
    email: string,
    password: string,
    name: string,
    phoneNumber: string,
    gender: User['gender']
  ): Promise<{ success: boolean; user?: User; error?: string; needsVerification?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name, phone: phoneNumber, gender, role: 'user' },
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed. Please try again.' };
      }

      // Fire-and-forget: Send branded verification email via Resend.
      fetch(`${API_URL}/api/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name }),
      }).catch(() => {});

      // Trigger Welcome Email (Async/Fire-and-forget)
      fetch(`${API_URL}/api/email/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.trim().toLowerCase(), name }),
      }).catch(() => {});

      return {
        success: true,
        needsVerification: !data.user.email_confirmed_at,
        user: mapDbUser({ id: data.user.id, email, name, phone: phoneNumber, gender, role: 'user' }, data.user),
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  },

  // -------------------------------------------------------
  // Sign In
  // -------------------------------------------------------
  signIn: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  },

  // -------------------------------------------------------
  // Sign Out
  // -------------------------------------------------------
  signOut: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Force clear local storage just in case
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase')) localStorage.removeItem(key);
        });
      }
    }
  },

  // -------------------------------------------------------
  // Get current session user
  // -------------------------------------------------------
  getCurrentUser: async (): Promise<User | null> => {
    try {
      // Use a promise race for getSession to prevent infinite hang
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 5000))
      ]).catch(() => ({ data: { session: null } }));

      const session = sessionResult.data?.session;
      if (!session?.user) return null;

      const profileResult = await supabase.from('users').select('*').eq('id', session.user.id).single();

      if (profileResult.error) {
        const fallbackProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
          phone: session.user.user_metadata?.phone || '',
          gender: session.user.user_metadata?.gender || 'prefer_not_to_say',
          role: 'user',
        };
        return mapDbUser(fallbackProfile, session.user);
      }

      return mapDbUser(profileResult.data, session.user);
    } catch (err: any) {
      return null;
    }
  },

  // -------------------------------------------------------
  // Update Profile
  // -------------------------------------------------------
  updateProfile: async (
    userId: string,
    updates: { name?: string; phone?: string; gender?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          phone: updates.phone,
          gender: updates.gender,
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) return { success: false, error: error.message };

      const { data: { session } } = await supabase.auth.getSession();
      return { success: true, user: mapDbUser(data, session?.user) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error updating profile' };
    }
  },

  // -------------------------------------------------------
  // Forgot Password
  // -------------------------------------------------------
  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_URL}/api/email/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) return { success: false, message: data.error || 'Failed to send reset link' };

      return { success: true, message: 'Password reset link sent to your email' };
    } catch (err: any) {
      return { success: false, message: 'An error occurred. Please try again later.' };
    }
  },

  // -------------------------------------------------------
  // Change Password
  // -------------------------------------------------------
  changePassword: async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // -------------------------------------------------------
  // Resend Verification Email
  // -------------------------------------------------------
  resendVerification: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      void supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/verify-email` },
      });

      const response = await fetch(`${API_URL}/api/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, message: errData.error || 'Failed to send verification email' };
      }

      return { success: true, message: 'Verification email sent via Resend' };
    } catch (err: any) {
      return { success: false, message: err.message || 'An error occurred' };
    }
  },

  // -------------------------------------------------------
  // Get all users (admin only)
  // -------------------------------------------------------
  getAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map(u => mapDbUser(u));
    } catch {
      return [];
    }
  },

  // -------------------------------------------------------
  // Auth state change listener
  // -------------------------------------------------------
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      callback(profile ? mapDbUser(profile, session.user) : null);
    });
  },
};

export { supabaseAuthService as authService };
