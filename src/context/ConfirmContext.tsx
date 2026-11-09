import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';

export type ConfirmWarningLevel = 'ordinary' | 'warning' | 'irreversible';

export interface ConfirmOptions {
  title: string;
  description: string;
  targetName?: string;
  consequences?: string | string[];
  confirmLabel?: string;
  cancelLabel?: string;
  level?: ConfirmWarningLevel;
  requireTypedConfirmation?: string; // e.g. 'HAPUS' for permanent deletions
  requireTypeConfirmation?: string; // alias supported across modules
  onConfirm?: () => Promise<void> | void;
  successTitle?: string;
  successMessage?: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export type NotifyPayload = {
  type: NotificationItem['type'];
  title: string;
  message: string;
};

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmAction: (options: ConfirmOptions) => void;
  notify: (
    typeOrPayload: NotificationItem['type'] | NotifyPayload,
    title?: string,
    message?: string
  ) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeConfirm, setActiveConfirm] = useState<ConfirmOptions | null>(null);
  const [pendingResolver, setPendingResolver] = useState<((val: boolean) => void) | null>(null);
  const [typedText, setTypedText] = useState('');
  const [ackChecked, setAckChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const notify = useCallback(
    (
      typeOrPayload: NotificationItem['type'] | NotifyPayload,
      title?: string,
      message?: string
    ) => {
      const resolvedType =
        typeof typeOrPayload === 'object' ? typeOrPayload.type : typeOrPayload;
      const resolvedTitle =
        typeof typeOrPayload === 'object' ? typeOrPayload.title : title || '';
      const resolvedMessage =
        typeof typeOrPayload === 'object' ? typeOrPayload.message : message || '';

      setNotifications((prev) => {
        // Prevent duplicate notification if identical title & message was pushed recently
        const isDuplicate = prev.some(
          (n) =>
            n.title === resolvedTitle &&
            n.message === resolvedMessage &&
            n.type === resolvedType
        );
        if (isDuplicate) return prev;

        const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setTimeout(() => {
          setNotifications((p) => p.filter((n) => n.id !== id));
        }, 4800);

        return [
          { id, type: resolvedType, title: resolvedTitle, message: resolvedMessage },
          ...prev.slice(0, 3),
        ];
      });
    },
    []
  );

  const confirmAction = useCallback((options: ConfirmOptions) => {
    setTypedText('');
    setAckChecked(false);
    setIsProcessing(false);
    setPendingResolver(null);
    setActiveConfirm({
      level: 'warning',
      confirmLabel: 'Konfirmasi',
      cancelLabel: 'Batal',
      ...options,
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setTypedText('');
      setAckChecked(false);
      setIsProcessing(false);
      setPendingResolver(() => resolve);
      setActiveConfirm({
        level: 'warning',
        confirmLabel: 'Konfirmasi',
        cancelLabel: 'Batal',
        ...options,
      });
    });
  }, []);

  const handleClose = () => {
    if (isProcessing) return;
    if (pendingResolver) {
      pendingResolver(false);
      setPendingResolver(null);
    }
    setActiveConfirm(null);
    setTypedText('');
    setAckChecked(false);
  };

  const handleExecute = async () => {
    if (!activeConfirm || isProcessing) return;

    const isIrreversible = activeConfirm.level === 'irreversible';
    const requiredWord =
      activeConfirm.requireTypedConfirmation ||
      activeConfirm.requireTypeConfirmation ||
      (isIrreversible ? 'HAPUS' : undefined);

    if (requiredWord && typedText.trim().toUpperCase() !== requiredWord.toUpperCase()) {
      return;
    }
    if (isIrreversible && !ackChecked) {
      return;
    }

    setIsProcessing(true);
    try {
      if (activeConfirm.onConfirm) {
        await activeConfirm.onConfirm();
        const doneTitle = activeConfirm.successTitle || 'Tindakan Berhasil';
        const doneMsg =
          activeConfirm.successMessage ||
          `Perubahan pada "${activeConfirm.targetName}" telah berhasil disimpan.`;
        notify('success', doneTitle, doneMsg);
      }
      if (pendingResolver) {
        pendingResolver(true);
        setPendingResolver(null);
      }
      setActiveConfirm(null);
    } catch (err: any) {
      if (pendingResolver) {
        pendingResolver(false);
        setPendingResolver(null);
      }
      notify(
        'error',
        'Tindakan Gagal Diproses',
        err?.message ||
          `Gagal memproses perubahan pada "${activeConfirm.targetName}". Silakan periksa koneksi atau izin akses Anda.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isIrreversible = activeConfirm?.level === 'irreversible';
  const requiredWord =
    activeConfirm?.requireTypedConfirmation ||
    activeConfirm?.requireTypeConfirmation ||
    (isIrreversible ? 'HAPUS' : undefined);
  const canSubmit =
    !isProcessing &&
    (!requiredWord || typedText.trim().toUpperCase() === requiredWord.toUpperCase()) &&
    (!isIrreversible || ackChecked);

  return (
    <ConfirmContext.Provider value={{ confirm, confirmAction, notify }}>
      {children}

      {/* Centralized Toast Notifications */}
      {notifications.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
          role="region"
          aria-label="Notifikasi Sistem"
        >
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start gap-3 text-xs transition-all duration-150 ${
                n.type === 'success'
                  ? 'bg-[#1E3224] text-emerald-50 border-emerald-700/80'
                  : n.type === 'error'
                  ? 'bg-red-950 text-red-50 border-red-700/80'
                  : n.type === 'warning'
                  ? 'bg-amber-950 text-amber-50 border-amber-700/80'
                  : 'bg-stone-900 text-stone-100 border-stone-700'
              }`}
            >
              {n.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : n.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : n.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{n.title}</div>
                <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{n.message}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNotifications((prev) => prev.filter((item) => item.id !== n.id))
                }
                className="opacity-70 hover:opacity-100 p-0.5"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Centralized Confirmation Modal */}
      {activeConfirm && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  activeConfirm.level === 'irreversible'
                    ? 'bg-red-100 text-red-700'
                    : activeConfirm.level === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-[#EBF1ED] text-[#284230]'
                }`}
              >
                {activeConfirm.level === 'irreversible' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : activeConfirm.level === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-stone-500">
                    {activeConfirm.level === 'irreversible'
                      ? 'Tindakan Permanen & Tidak Dapat Dibatalkan'
                      : activeConfirm.level === 'warning'
                      ? 'Konfirmasi Perubahan Sensitif'
                      : 'Konfirmasi Tindakan'}
                  </span>
                </div>
                <h3
                  id="confirm-dialog-title"
                  className="font-serif font-bold text-base text-stone-900 leading-snug"
                >
                  {activeConfirm.title}
                </h3>
              </div>
            </div>

            {/* Target Record / Member Name */}
            <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] text-xs space-y-1">
              <span className="text-[10px] text-stone-400 block">
                Sasaran Rekaman / Anggota:
              </span>
              <div className="font-semibold text-stone-900 break-words">
                {activeConfirm.targetName || activeConfirm.title}
              </div>
            </div>

            {/* Explanation & Consequences */}
            <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
              <p>{activeConfirm.description}</p>
              {activeConfirm.consequences && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] ${
                    activeConfirm.level === 'irreversible'
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <strong>Konsekuensi:</strong>{' '}
                  {Array.isArray(activeConfirm.consequences) ? (
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {activeConfirm.consequences.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    activeConfirm.consequences
                  )}
                </div>
              )}
            </div>

            {/* Additional Confirmation for Permanent Deletion */}
            {isIrreversible && (
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-stone-50 border border-stone-200 cursor-pointer text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  disabled={isProcessing}
                  className="mt-0.5 rounded border-stone-300 text-red-600 focus:ring-red-600"
                />
                <span className="text-[11px] leading-snug">
                  Saya memahami bahwa penghapusan permanen ini tidak dapat dipulihkan kembali.
                </span>
              </label>
            )}

            {requiredWord && (
              <div className="p-3 rounded-lg bg-red-50/60 border border-red-200 space-y-1.5">
                <label className="block text-[11px] font-medium text-red-900">
                  Ketik <strong className="font-mono">{requiredWord}</strong> untuk melanjutkan:
                </label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  disabled={isProcessing}
                  placeholder={requiredWord}
                  className="w-full px-3 py-1.5 rounded border border-red-300 text-xs font-mono bg-white focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {activeConfirm.cancelLabel || 'Batal'}
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleExecute}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 ${
                  activeConfirm.level === 'irreversible'
                    ? 'bg-red-600 hover:bg-red-700'
                    : activeConfirm.level === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#284230] hover:bg-[#1E3224]'
                }`}
              >
                {isProcessing
                  ? 'Memproses...'
                  : activeConfirm.confirmLabel || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}
