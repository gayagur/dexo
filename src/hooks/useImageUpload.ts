import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_RAW_SIZE = 10 * 1024 * 1024; // 10 MB

function compressImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Skip compression for small files or non-raster formats
    if (file.size < 1024 * 1024 || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        0.8,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export function useImageUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const uploadImage = useCallback(
    async (file: File, bucket: string): Promise<string | null> => {
      if (!user) { setError('Please sign in to upload images'); return null; }
      if (!ALLOWED_TYPES.includes(file.type)) { setError('Only JPEG, PNG, WebP and GIF are allowed'); return null; }
      if (file.size > MAX_RAW_SIZE) { setError('File must be under 10 MB'); return null; }

      setUploading(true);
      setError(null);

      try {
        const compressed = await compressImage(file);
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg';
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, compressed, { contentType: file.type });

        if (uploadError) { setError(uploadError.message); return null; }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        return urlData.publicUrl;
      } catch (e: any) {
        setError(e.message || 'Upload failed');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [user],
  );

  const uploadMultiple = useCallback(
    async (files: File[], bucket: string): Promise<string[]> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      let completed = 0;
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const url = await uploadImage(file, bucket);
          completed++;
          setProgress(Math.round((completed / files.length) * 100));
          return url;
        }),
      );

      setUploading(false);
      return results
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((url): url is string => url !== null);
    },
    [uploadImage],
  );

  return { uploading, progress, error, uploadImage, uploadMultiple, clearError };
}
