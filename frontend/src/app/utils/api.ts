// ============================================================
// ABYRA STORE — Central API Configuration
// Single source of truth for backend URL across all utilities
// ============================================================

/**
 * In production, VITE_API_URL must be set as an environment variable.
 * In local development, it falls back to localhost:5000.
 */
function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;

  if (!url) {
    if (import.meta.env.PROD) {
      throw new Error('[ABYRA] VITE_API_URL is not set.');
    }
    return 'http://localhost:5000';
  }

  return url.replace(/\/$/, '');
}

/**
 * Get the current frontend URL for redirects, sharing, etc.
 */
function getFrontendUrl(): string {
  const url = import.meta.env.VITE_FRONTEND_URL;
  
  if (!url) {
    if (import.meta.env.PROD) {
      console.warn('[ABYRA] VITE_FRONTEND_URL is not set, falling back to window.location.origin');
    }
    return window.location.origin;
  }
  
  return url.replace(/\/$/, '');
}

export const API_URL = getApiUrl();
export const FRONTEND_URL = getFrontendUrl();

// Deprecated: Use API_URL instead. Keeping for backward compatibility during refactor.
export const BACKEND_URL = API_URL;
