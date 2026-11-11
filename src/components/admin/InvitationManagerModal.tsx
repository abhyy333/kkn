import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface InvitationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitationManagerModal: React.FC<InvitationManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4A6B53]" />
            <h2 className="font-serif text-base font-semibold text-stone-900">
              Manajemen Akun Terpusat
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-stone-400 hover:text-stone-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-stone-600 leading-relaxed">
          Pembuatan akun anggota baru dan reset password sementara dikelola
          secara eksklusif oleh <strong>Super Admin</strong> melalui menu{' '}
          <strong>Admin Console → Account Management</strong>.
        </p>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
