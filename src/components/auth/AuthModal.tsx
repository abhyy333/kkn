import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Globe,
  X,
  Database,
  Clock,
  KeyRound,
} from 'lucide-react';
import { useAuth, UserProfile } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToPublic: () => void;
  onLoginSuccess?: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSwitchToPublic,
  onLoginSuccess,
}) => {
  const {
    user,
    profile,
    signInWithEmail,
    isSupabaseReady,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reuse existing valid session immediately without asking user to log in again
  useEffect(() => {
    if (isOpen && user && profile) {
      onLoginSuccess?.(profile);
      onClose();
    }
  }, [isOpen, user, profile]);

  if (!isOpen) return null;

  const resetMessages = () => {
    setError(null);
    if (sessionExpiredNotice) {
      clearSessionExpiredNotice();
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const resolvedProfile = await signInWithEmail(email, password);
      setPassword('');
      onLoginSuccess?.(resolvedProfile);
      onClose();
    } catch (err: any) {
      const rawMessage = String(err?.message || 'Gagal masuk ke akun.');
      setError(rawMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#2D3748] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal login"
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-[#8FBC8F] text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            KKN SPACE — Admin-Provisioned Authentication
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Masuk ke Ruang Kerja Tim
          </h2>
          <p className="text-xs text-gray-300 mt-1">
            Masuk menggunakan email resmi dan password akun KKN SPACE Anda.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {!isSupabaseReady && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2.5 text-xs">
              <Database className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="leading-relaxed">
                <p className="font-semibold text-amber-900">
                  Environment Supabase Belum Dikonfigurasi
                </p>
                <p className="mt-0.5">
                  Pastikan variabel <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
                  <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> telah diisi pada environment project.
                </p>
              </div>
            </div>
          )}

          {sessionExpiredNotice && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start gap-2.5 text-xs">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span className="leading-relaxed">{sessionExpiredNotice}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-email-input"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Email Terdaftar
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email akun resmi..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password-input"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  id="login-password-input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#2D3748] hover:bg-gray-800 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Memverifikasi Kredensial...' : 'Masuk ke Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="bg-[#F3F1EC] border border-[#E5E3DC] rounded-lg p-3.5 text-[11px] text-gray-600 space-y-1.5">
            <p className="font-semibold text-gray-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#4A6B53]" />
              Informasi Akun & Password Sementara
            </p>
            <p className="leading-relaxed">
              Pembuatan akun baru dan reset password dilakukan terpusat oleh{' '}
              <strong>Administrator KKN (Super Admin)</strong>. Gunakan password
              sementara yang diberikan secara pribadi untuk login pertama, lalu
              Anda akan diarahkan ke halaman <strong>Wajib Ganti Password</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F3F1EC] px-6 py-3.5 border-t border-[#E5E3DC] flex items-center justify-between">
          <span className="text-xs text-gray-500">Masyarakat umum / tamu?</span>
          <button
            type="button"
            onClick={onSwitchToPublic}
            className="text-xs font-semibold text-[#4A6B53] hover:underline flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" />
            Buka Portal Publik Desa
          </button>
        </div>
      </div>
    </div>
  );
};
