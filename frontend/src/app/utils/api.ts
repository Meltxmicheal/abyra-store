// ============================================================
// ABYRA STORE — Central API Configuration
// Single source of truth for backend URL across all utilities
// ============================================================

/**
 * In production (Vercel), VITE_BACKEND_URL must be set as an
 * environment variable in the Vercel dashboard. If it is missing
 * in production, we throw immediately to surface the misconfiguration
 * rather than silently hitting localhost (which would fail anyway).
 *
 * In local development, it falls back to localhost:5000.
 */
function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL;

  if (!url) {
    // In production builds, VITE_BACKEND_URL must be set
    if (import.meta.env.PROD) {
      throw new Error(
        '[ABYRA] VITE_BACKEND_URL is not set. ' +
        'Add it to Vercel → Project → Settings → Environment Variables.'
      );
    }
    // Local dev fallback
    return 'http://localhost:5000';
  }

  // Strip trailing slash to keep URL construction consistent
  return url.replace(/\/$/, '');
}

export const BACKEND_URL = getBackendUrl();
