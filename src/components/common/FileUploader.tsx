import React, { useState, useRef } from 'react';
import { StorageFolderCategory, UploadedFileMetadata } from '../../types';
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  validateFileBeforeUpload,
} from '../../utils/storageService';
import {
  Upload,
  Camera,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Paperclip,
  Download,
} from 'lucide-react';

interface FileUploaderProps {
  folder: StorageFolderCategory;
  accept?: 'image' | 'document' | 'any';
  multiple?: boolean;
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
  uploaderName?: string;
  isPubliclyApproved?: boolean;
  value?: UploadedFileMetadata[];
  files?: UploadedFileMetadata[];
  onChange?: (files: UploadedFileMetadata[]) => void;
  // Convenience single-file callbacks
  singleUrl?: string;
  singleFileName?: string;
  singleStoragePath?: string;
  onSingleUpload?: (file: UploadedFileMetadata | null) => void;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  folder,
  accept = 'any',
  multiple = false,
  maxSizeMB,
  label,
  helperText,
  uploaderName,
  isPubliclyApproved = false,
  value,
  files: filesProp,
  onChange,
  singleUrl,
  singleFileName,
  singleStoragePath,
  onSingleUpload,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Normalize current files list from `value`, `files`, or `singleUrl`
  const files: UploadedFileMetadata[] = React.useMemo(() => {
    const activeList = value || filesProp;
    if (activeList && activeList.length > 0) return activeList;
    if (singleUrl) {
      const isImg =
        accept === 'image' ||
        singleUrl.startsWith('data:image') ||
        /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(singleUrl) ||
        singleUrl.includes('images.unsplash.com') ||
        singleUrl.includes('dicebear.com');
      return [
        {
          id: 'single-current',
          name: singleFileName || (isImg ? 'Foto Terunggah.jpg' : 'Dokumen Lampiran'),
          url: singleUrl,
          storagePath: singleStoragePath || '',
          folder,
          size: 0,
          sizeFormatted: '',
          contentType: isImg ? 'image/jpeg' : 'application/pdf',
          uploadedAt: '',
          uploadedBy: uploaderName || '',
        },
      ];
    }
    return [];
  }, [value, singleUrl, singleFileName, singleStoragePath, accept, folder, uploaderName]);

  const acceptAttr =
    accept === 'image'
      ? 'image/jpeg,image/png,image/webp,image/gif'
      : accept === 'document'
      ? '.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv,image/*'
      : '*/*';

  const effectiveMaxMB = maxSizeMB ?? (accept === 'image' ? 8 : 15);

  const handleFilesSelected = async (selectedFileList: FileList | null) => {
    if (!selectedFileList || selectedFileList.length === 0) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const fileArray = multiple ? Array.from(selectedFileList) : [selectedFileList[0]];

    // Validate all selected files first
    for (const f of fileArray) {
      const validation = validateFileBeforeUpload(f, {
        maxSizeMB: effectiveMaxMB,
        allowedTypes: accept,
      });
      if (!validation.valid) {
        setErrorMsg(validation.error || 'Berkas tidak valid.');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      const uploadedItems: UploadedFileMetadata[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const meta = await uploadFileToStorage(
          file,
          folder,
          (pct) => {
            const overall = Math.round(((i * 100 + pct) / fileArray.length));
            setUploadProgress(overall);
          },
          uploaderName,
          isPubliclyApproved
        );
        uploadedItems.push(meta);
      }

      if (multiple) {
        const nextList = [...files.filter((f) => f.id !== 'single-current'), ...uploadedItems];
        onChange?.(nextList);
      } else {
        const first = uploadedItems[0];
        // If replacing an existing file in Supabase Storage, clean up old storage object
        if (files[0]?.storagePath && files[0].storagePath !== first.storagePath) {
          await deleteFileFromStorage(files[0].storagePath, files[0].id);
        }
        onChange?.([first]);
        onSingleUpload?.(first);
      }

      setSuccessMsg(
        uploadedItems.length > 1
          ? `${uploadedItems.length} berkas berhasil diunggah ke Supabase Storage.`
          : `Berkas "${uploadedItems[0].name}" berhasil diunggah.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengunggah berkas. Silakan coba lagi.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemoveFile = async (index: number) => {
    const target = files[index];
    if (!target) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (target.storagePath) {
      await deleteFileFromStorage(target.storagePath, target.id);
    }

    if (multiple) {
      const next = files.filter((_, idx) => idx !== index);
      onChange?.(next);
    } else {
      onChange?.([]);
      onSingleUpload?.(null);
    }
  };

  const isImageFile = (item: UploadedFileMetadata) => {
    return (
      item.contentType.startsWith('image/') ||
      item.url.startsWith('data:image') ||
      /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.name) ||
      /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.url) ||
      item.url.includes('images.unsplash.com') ||
      item.url.includes('dicebear.com')
    );
  };

  return (
    <div className="space-y-2 text-xs">
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-medium text-stone-700">{label}</label>
          <span className="text-[10px] text-stone-400">
            Maks. {effectiveMaxMB} MB •{' '}
            {accept === 'image'
              ? 'JPG, PNG, WEBP'
              : 'PDF, DOCX, XLSX, Gambar'}
          </span>
        </div>
      )}

      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttr}
        multiple={multiple}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Hidden Mobile Camera Capture Input (for image/field documentation) */}
      {accept !== 'document' && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />
      )}

      {/* Drag and Drop Zone (shown when no file is uploaded or when multiple=true) */}
      {(files.length === 0 || multiple) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed transition-all cursor-pointer ${
            compact ? 'p-3' : 'p-4'
          } ${
            isDragging
              ? 'border-[#4A6B53] bg-[#EBF1ED]/70'
              : 'border-[#D5D2C8] bg-[#FAF9F5] hover:border-[#4A6B53] hover:bg-[#F3F1EC]'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-9 h-9 rounded-lg bg-[#EBF1ED] text-[#284230] flex items-center justify-center shrink-0 border border-[#CCDCD0]">
                {accept === 'image' ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="font-medium text-stone-800 text-xs">
                  {isUploading
                    ? 'Mengunggah berkas ke Supabase Storage...'
                    : 'Klik untuk memilih berkas atau tarik & lepas (Drag & Drop) ke sini'}
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {helperText ||
                    (accept === 'image'
                      ? 'Mendukung pemilihan dari galeri ponsel, kamera lapangan, atau komputer.'
                      : 'Unggah dokumen PDF, Word, Excel, atau foto bukti langsung dari perangkat.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#D5D2C8] text-stone-700 font-medium hover:bg-stone-50 text-[11px] shadow-2xs"
              >
                <Paperclip className="w-3 h-3 text-[#4A6B53]" />
                <span>Pilih File</span>
              </button>

              {accept !== 'document' && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] font-medium hover:bg-[#dce8df] text-[11px]"
                  title="Ambil Foto Langsung dari Kamera Ponsel"
                >
                  <Camera className="w-3 h-3" />
                  <span className="hidden sm:inline">Kamera</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-medium text-[#284230]">
                <span>Mengunggah ke folder kkn-space/{folder}...</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4A6B53] transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Error or Upload Success Banner */}
      {errorMsg && (
        <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Uploaded File Previews & Controls (Preview, Replace, Delete) */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {files.map((item, idx) => {
            const isImg = isImageFile(item);

            return (
              <div
                key={`${item.id}-${idx}`}
                className="p-2.5 rounded-lg bg-white border border-[#E8E6DF] flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isImg ? (
                    <div className="w-14 h-12 rounded-md overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                      <img
                        src={item.url || undefined}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-[#EBF1ED] text-[#284230] flex items-center justify-center shrink-0 border border-[#CCDCD0]">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate text-xs">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                      {item.sizeFormatted && <span>{item.sizeFormatted}</span>}
                      {item.storagePath && (
                        <span className="font-mono text-stone-400 truncate max-w-[180px]">
                          {item.storagePath}
                        </span>
                      )}
                      <span className="text-emerald-700 font-medium">✓ Siap disimpan</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={item.url}
                    download={item.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50"
                    title="Lihat / Unduh Berkas"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {!multiple && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#D5D2C8] text-stone-700 hover:bg-stone-50 text-[11px] font-medium"
                      title="Ganti dengan berkas baru"
                    >
                      <RefreshCw className="w-3 h-3 text-[#4A6B53]" />
                      <span>Ganti</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-medium"
                    title="Hapus berkas ini"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
