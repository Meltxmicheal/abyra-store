import imageCompression from 'browser-image-compression';

// Cloudinary — configuration from environment variables
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dze1d3uen';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'abyra_unsigned';

export interface UploadResult {
  url: string;
  public_id: string;
}

export const cloudinaryService = {
  /**
   * Compresses an image file in the browser before upload.
   */
  compressImage: async (file: File, onProgress?: (p: number) => void): Promise<File> => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      onProgress: (p: number) => onProgress?.(p),
      initialQuality: 0.85,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`[Cloudinary] Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
      return compressedFile;
    } catch (error) {
      console.error('[Cloudinary] Compression failed, using original:', error);
      return file;
    }
  },

  /**
   * Uploads a file directly to Cloudinary using an unsigned upload preset.
   * No backend/signature required — safe for product images.
   */
  uploadToCloudinary: async (file: File): Promise<UploadResult> => {
    console.log(`[Cloudinary] Starting upload: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'abyra_products');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Cloudinary] Upload failed:', response.status, errorData);
        throw new Error(errorData?.error?.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('[Cloudinary] Upload success:', data.secure_url);

      // Apply transformations: square crop + auto quality/format
      const transformedUrl = data.secure_url.replace(
        '/upload/',
        '/upload/w_800,h_800,c_fill,q_auto,f_auto/'
      );

      return {
        url: transformedUrl,
        public_id: data.public_id,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('[Cloudinary] Upload error:', error);
      if (error.name === 'AbortError') {
        throw new Error('Image upload timed out. Please check your internet connection and try again.');
      }
      throw error;
    }
  },
};
