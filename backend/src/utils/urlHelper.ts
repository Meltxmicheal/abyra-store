/**
 * ABYRA STORE — URL Configuration Helper
 * Ensures production URLs are always valid even if env vars are missing.
 */

export const getFrontendUrl = (): string => {
  const url = process.env.FRONTEND_URL || process.env.APP_URL;
  
  if (!url || url === 'undefined' || /localhost:\d+/.test(url)) {
    // Production fallback
    return 'https://abyra-store.meltazi.me';
  }
  
  // Ensure no trailing slash for consistency
  return url.replace(/\/$/, '');
};

export const getBackendUrl = (): string => {
  const url = process.env.API_URL || process.env.BACKEND_URL;
  
  if (!url || url === 'undefined' || /localhost:\d+/.test(url)) {
    // Production fallback for backend
    return process.env.NODE_ENV === 'production' 
      ? 'https://api.meltazi.me' 
      : `http://localhost:${process.env.PORT || 5000}`;
  }
  
  return url.replace(/\/$/, '');
};
