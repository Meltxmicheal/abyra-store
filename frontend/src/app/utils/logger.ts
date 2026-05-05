/**
 * ABYRA — Activity & Error Logging Utility
 *
 * All logging functions are fire-and-forget (async, non-blocking).
 * They NEVER throw — the app flow is never interrupted by a logging failure.
 *
 * Usage:
 *   import { logActivity, logAuth, logError, logApiCall, logAdmin } from './logger';
 *   logActivity(userId, 'add_to_cart', { product_id: '...' });
 */

import { supabase } from './supabase';

type LogMeta = Record<string, unknown>;

// ----------------------------------------------------------------
// User Activity Log
// e.g., login, signup, add_to_cart, place_order, view_product
// ----------------------------------------------------------------
export function logActivity(
  userId: string | null,
  action: string,
  metadata: LogMeta = {}
): void {
  queueMicrotask(async () => {
    try {
      await supabase.from('user_activity_logs').insert({
        user_id: userId,
        action,
        metadata,
      });
    } catch {
      // Fail silently — never block UI
    }
  });
}

// ----------------------------------------------------------------
// Auth Event Log
// e.g., login success/fail, signup, logout, reset_password, otp_sent
// ----------------------------------------------------------------
export function logAuth(
  email: string | null | undefined,
  action: string,
  status: 'success' | 'failed' | 'blocked',
  metadata: LogMeta = {}
): void {
  queueMicrotask(async () => {
    try {
      const ua = navigator?.userAgent ?? '';
      await supabase.from('auth_logs').insert({
        email,
        action,
        status,
        user_agent: ua,
        metadata,
      });
    } catch {
      // Fail silently
    }
  });
}

// ----------------------------------------------------------------
// Error Log
// e.g., uncaught exceptions, API errors
// ----------------------------------------------------------------
export function logError(
  message: string,
  source: 'frontend' | 'backend' | 'database' = 'frontend',
  userId: string | null = null,
  stack?: string,
  metadata: LogMeta = {}
): void {
  queueMicrotask(async () => {
    try {
      await supabase.from('error_logs').insert({
        user_id: userId,
        error_message: message,
        stack_trace: stack ?? null,
        source,
        metadata,
      });
    } catch {
      // Fail silently
    }
  });
}

// ----------------------------------------------------------------
// Admin Action Log
// e.g., add_product, delete_product, update_order_status
// ----------------------------------------------------------------
export function logAdmin(
  adminId: string,
  action: string,
  metadata: LogMeta = {}
): void {
  queueMicrotask(async () => {
    try {
      await supabase.from('admin_logs').insert({
        admin_id: adminId,
        action,
        metadata,
      });
    } catch {
      // Fail silently
    }
  });
}

// ----------------------------------------------------------------
// API Performance Log (backend usage)
// Call this from Express middleware or route handlers
// ----------------------------------------------------------------
export function logApiCall(
  endpoint: string,
  method: string,
  status: number,
  responseTimeMs: number,
  userId?: string | null,
  metadata: LogMeta = {}
): void {
  queueMicrotask(async () => {
    try {
      await supabase.from('api_logs').insert({
        endpoint,
        method,
        status,
        response_time: responseTimeMs,
        user_id: userId ?? null,
        metadata,
      });
    } catch {
      // Fail silently
    }
  });
}

// ----------------------------------------------------------------
// Helper: Timed API call wrapper
// Usage:
//   const result = await timedApiCall('/login', 'POST', userId, async () => {
//     return await fetch('/api/login', ...);
//   });
// ----------------------------------------------------------------
export async function timedApiCall<T>(
  endpoint: string,
  method: string,
  userId: string | null,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  let status = 200;
  try {
    const result = await fn();
    return result;
  } catch (err: unknown) {
    status = 500;
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logError(msg, 'frontend', userId, stack, { endpoint });
    throw err;
  } finally {
    logApiCall(endpoint, method, status, Date.now() - start, userId);
  }
}
