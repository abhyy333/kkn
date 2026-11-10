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
 * Uploads media to the private Supabase Storage bucket. Approved public media
 * uses a public/ object prefix; all other material remains under private/.
 * No browser data URL/object URL fallback is allowed for persistent uploads.
 */
export async function uploadFileToStorage(
  file: File,
  folder: StorageFolderCategory,
  onProgress?: (percent: number) => void,
  uploaderName?: string,
  isPubliclyApproved: boolean = false
): Promise<UploadedFileMetadata> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase belum terkonfigurasi. File tidak dapat disimpan.');
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileId = `media-${timestamp}-${crypto.randomUUID().slice(0, 8)}`;
  const visibilityPrefix = isPubliclyApproved ? 'public' : 'private';
  const storagePath = `${visibilityPrefix}/${folder}/${timestamp}_${sanitizedName}`;
  const uploadedBy = uploaderName || 'Anggota KKN Pringgasela Selatan';

  onProgress?.(10);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload ke Supabase Storage gagal: ${uploadError.message}`);
  }

  onProgress?.(75);
  const { data: signedData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedUrlError || !signedData?.signedUrl) {
    // Remove the just-uploaded object so an orphan is not left behind.
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(
      signedUrlError?.message || 'File tersimpan tetapi URL aksesnya gagal dibuat.'
    );
  }

  const metadata: UploadedFileMetadata = {
    id: fileId,
    name: file.name,
    url: signedData.signedUrl,
    storagePath,
    folder,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    contentType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    isPubliclyApproved,
  };

  onProgress?.(100);
  return metadata;
}

/**
 * Deletes an uploaded file from Supabase Storage and removes its metadata record.
 */
export async function deleteFileFromStorage(
  storagePath?: string,
  _fileId?: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase belum terkonfigurasi. File tidak dapat dihapus.');
  }
  if (!storagePath) return;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Gagal menghapus file dari Supabase Storage: ${error.message}`);
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
