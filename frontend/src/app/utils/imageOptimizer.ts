export const optimizeCloudinaryUrl = (url: string) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // If the URL already has transformations, we don't want to mess it up
  if (url.includes('/image/upload/')) {
    // Add q_auto and f_auto for performance
    return url.replace('/image/upload/', '/image/upload/q_auto,f_auto/');
  }
  
  return url;
};
