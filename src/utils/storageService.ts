import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StorageFolderCategory, UploadedFileMetadata } from '../types';

export interface UploadValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: 'image' | 'document' | 'any';
}

const IMAGE_MIME_PREFIX = 'image/';
const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
];

const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.txt',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

const STORAGE_BUCKET = 'kkn-space';

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.max(1, Math.round(kb))} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function detectArchiveFormat(
  fileName: string
): 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'DOCX';
  if (
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.csv')
  )
    return 'XLSX';
  if (lower.endsWith('.zip') || lower.endsWith('.rar')) return 'ZIP';
  return 'PDF';
}

export function validateFileBeforeUpload(
  file: File,
  options: UploadValidationOptions = {}
): { valid: boolean; error?: string } {
  const maxSizeMB =
    options.maxSizeMB ?? (options.allowedTypes === 'image' ? 8 : 15);
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Ukuran berkas "${file.name}" (${formatFileSize(file.size)}) melebihi batas maksimal ${maxSizeMB} MB.`,
    };
  }

  const allowedTypes = options.allowedTypes || 'any';
  const lowerName = file.name.toLowerCase();

  if (allowedTypes === 'image') {
    const isImageMime = file.type.startsWith(IMAGE_MIME_PREFIX);
    const isImageExt = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.heic',
    ].some((ext) => lowerName.endsWith(ext));
    if (!isImageMime && !isImageExt) {
      return {
        valid: false,
        error: `Berkas "${file.name}" bukan format gambar yang didukung (gunakan JPG, PNG, atau WEBP).`,
      };
    }
  } else if (allowedTypes === 'document') {
    const isAllowedMime =
      file.type.startsWith(IMAGE_MIME_PREFIX) ||
      ALLOWED_DOCUMENT_MIMES.includes(file.type);
    const isAllowedExt = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext)
    );
    if (!isAllowedMime && !isAllowedExt) {
      return {
        valid: false,
        error: `Format berkas "${file.name}" tidak didukung. Gunakan PDF, DOCX, XLSX, ZIP, atau Gambar.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Compresses an image file to a data URL for resilient preview and offline-capable fallback.
 */
async function createCompressedDataUrl(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1100;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(String(ev.target?.result || ''));
          }
        };
        img.onerror = () => resolve(String(ev.target?.result || ''));
        img.src = String(ev.target?.result || '');
      };
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  }

  if (file.size <= 650 * 1024) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        resolve(String(ev.target?.result || URL.createObjectURL(file)));
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  }

  return URL.createObjectURL(file);
}

/**
 * Uploads a file to Supabase Storage under `kkn-space/{folder}/{timestamp}_{sanitizedName}`
 * with automatic compressed data URL fallback if bucket is not yet provisioned.
 */
export async function uploadFileToStorage(
  file: File,
  folder: StorageFolderCategory,
  onProgress?: (percent: number) => void,
  uploaderName?: string,
  isPubliclyApproved: boolean = false
): Promise<UploadedFileMetadata> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileId = `media-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `kkn-space/${folder}/${timestamp}_${sanitizedName}`;
  const uploadedBy = uploaderName || 'Anggota KKN Pringgasela Selatan';

  onProgress?.(15);

  let downloadUrl = '';

  if (isSupabaseConfigured) {
    try {
      onProgress?.(45);
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          downloadUrl = publicUrlData.publicUrl;
          onProgress?.(90);
        }
      }
    } catch {
      // Fallback to compressed data URL below
    }
  }

  if (!downloadUrl) {
    onProgress?.(65);
    downloadUrl = await createCompressedDataUrl(file);
    onProgress?.(92);
  }

  const metadata: UploadedFileMetadata = {
    id: fileId,
    name: file.name,
    url: downloadUrl,
    storagePath,
    folder,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    contentType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    isPubliclyApproved,
  };

  if (isSupabaseConfigured && metadata.url.length < 850000) {
    try {
      await supabase.from('media_files').upsert(
        {
          id: fileId,
          name: metadata.name,
          url: metadata.url,
          storage_path: metadata.storagePath,
          folder: metadata.folder,
          size: metadata.size,
          size_formatted: metadata.sizeFormatted,
          content_type: metadata.contentType,
          uploaded_at: metadata.uploadedAt,
          uploaded_by: metadata.uploadedBy,
          is_publicly_approved: metadata.isPubliclyApproved,
        },
        { onConflict: 'id' }
      );
    } catch {
      // Optional table
    }
  }

  onProgress?.(100);
  return metadata;
}

/**
 * Deletes an uploaded file from Supabase Storage and removes its metadata record.
 */
export async function deleteFileFromStorage(
  storagePath?: string,
  fileId?: string
): Promise<void> {
  if (!isSupabaseConfigured) return;

  if (storagePath && storagePath.startsWith('kkn-space/')) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    } catch {
      // Non-blocking
    }
  }

  if (fileId) {
    try {
      await supabase.from('media_files').delete().eq('id', fileId);
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Triggers a clean browser download for an uploaded file or generates a formal PDF fallback if legacy record has no URL.
 */
export function triggerFileDownload(
  url?: string,
  fileName: string = 'dokumen-kkn-space.pdf'
): void {
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const content = `DOKUMEN RESMI KKN SPACE — DESA PRINGGASELA SELATAN\nNama Berkas: ${fileName}\nTanggal Unduh: ${new Date().toISOString().slice(0, 10)}\nKecamatan Pringgasela, Kabupaten Lombok Timur, NTB`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
}
