import React from 'react';
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ResetPasswordViewProps {
  onRedirectToLogin: () => void;
  onNavigateToPublic: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onRedirectToLogin,
  onNavigateToPublic,
}) => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex items-center justify-center p-4">
      <div className="bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#2D3748] text-white p-6">
          <div className="flex items-center gap-2 text-[#8FBC8F] text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            KKN SPACE — Admin-Provisioned Authentication
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Manajemen Password Terpusat
          </h1>
          <p className="text-xs text-gray-300 mt-1">
            Desa Pringgasela Selatan • Sistem Keamanan Terpusat Supabase
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-[#F3F1EC] border border-[#E5E3DC] rounded-xl p-4 space-y-3 text-xs leading-relaxed text-gray-700">
            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#4A6B53]" />
              Pemulihan Password Dikelola oleh Super Admin
            </p>
            <p>
              Sesuai arsitektur keamanan KKN SPACE, seluruh pembuatan akun baru dan reset password dikelola secara terpusat oleh <strong>Super Admin</strong> melalui menu <strong>Admin Console → Account Management</strong>.
            </p>
            <p>
              Jika Anda memerlukan password baru atau reset akun, silakan hubungi Administrator KKN untuk mendapatkan password sementara yang baru.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                onRedirectToLogin();
              }}
              className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Masuk ke Akun dengan Password Baru</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNavigateToPublic}
              className="w-full py-2 px-4 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Portal Publik Desa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
