import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ResetPasswordViewProps {
  onRedirectToLogin: () => void;
  onNavigateToPublic: () => void;
}

type RecoverySessionStatus =
  | 'validating'
  | 'valid'
  | 'invalid_or_expired'
  | 'completed';

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onRedirectToLogin,
  onNavigateToPublic,
}) => {
  const {
    updateUserPassword,
    isPasswordRecoveryMode,
    clearPasswordRecoveryMode,
  } = useAuth();

  const [sessionStatus, setSessionStatus] =
    useState<RecoverySessionStatus>('validating');
  const [statusErrorMessage, setStatusErrorMessage] = useState<string>(
    'Tautan pemulihan password tidak valid, sudah digunakan, atau telah kedaluwarsa.'
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const validateRecoveryLinkAndSession = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setStatusErrorMessage(
            'Konfigurasi Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) belum diatur pada environment aplikasi.'
          );
          setSessionStatus('invalid_or_expired');
        }
        return;
      }

      const rawHash = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(rawHash);
      const searchParams = new URLSearchParams(window.location.search);

      // 1. Check for explicit error indicators from Supabase redirect (expired, invalid, or already-used link)
      const errorParam =
        hashParams.get('error') || searchParams.get('error') || '';
      const errorCode =
        hashParams.get('error_code') || searchParams.get('error_code') || '';
      const errorDesc =
        hashParams.get('error_description') ||
        searchParams.get('error_description') ||
        '';

      if (errorParam || errorCode) {
        if (!isMounted) return;
        const lowerDesc = `${errorCode} ${errorDesc}`.toLowerCase();
        if (lowerDesc.includes('expired') || lowerDesc.includes('otp_expired')) {
          setStatusErrorMessage(
            'Tautan pemulihan password telah kedaluwarsa. Silakan minta tautan pemulihan password baru melalui menu Lupa Password.'
          );
        } else {
          setStatusErrorMessage(
            'Tautan pemulihan password tidak valid atau sudah pernah digunakan. Silakan ajukan permintaan reset password baru.'
          );
        }
        setSessionStatus('invalid_or_expired');
        return;
      }

      // 2. Check if URL contains recovery tokens (PKCE code, token_hash, or implicit #access_token&type=recovery)
      const typeParam =
        hashParams.get('type') || searchParams.get('type') || '';
      const tokenHash = searchParams.get('token_hash') || '';
      const pkceCode = searchParams.get('code') || '';
      const accessToken = hashParams.get('access_token') || '';
      const refreshToken = hashParams.get('refresh_token') || '';

      try {
        // Case A: token_hash + type=recovery
        if (tokenHash && typeParam === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (!isMounted) return;
          if (error || !data.session) {
            setStatusErrorMessage(
              'Tautan pemulihan password tidak valid, sudah digunakan, atau telah kedaluwarsa.'
            );
            setSessionStatus('invalid_or_expired');
            return;
          }
          setSessionStatus('valid');
          return;
        }

        // Case B: PKCE code exchange
        if (pkceCode) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(pkceCode);
          if (!isMounted) return;
          if (error || !data.session) {
            setStatusErrorMessage(
              'Kode pemulihan password tidak valid, sudah digunakan, atau telah kedaluwarsa.'
            );
            setSessionStatus('invalid_or_expired');
            return;
          }
          setSessionStatus('valid');
          return;
        }

        // Case C: Implicit hash #access_token=...&type=recovery
        if (accessToken && typeParam === 'recovery') {
          if (refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!isMounted) return;
            if (error || !data.session) {
              setStatusErrorMessage(
                'Sesi pemulihan password tidak valid atau telah kedaluwarsa.'
              );
              setSessionStatus('invalid_or_expired');
              return;
            }
            setSessionStatus('valid');
            return;
          }
        }

        // Case D: Supabase detectSessionInUrl already processed PASSWORD_RECOVERY event
        if (isPasswordRecoveryMode && typeParam === 'recovery') {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (session && session.user) {
            setSessionStatus('valid');
            return;
          }
        }

        // Security Guard: If someone navigates directly to /reset-password without a recovery token or event,
        // do NOT allow password reset even if a regular user session is logged in!
        if (!typeParam && !tokenHash && !pkceCode && !accessToken) {
          if (isMounted) {
            setStatusErrorMessage(
              'Akses ditolak: Halaman ini hanya dapat digunakan melalui tautan pemulihan password resmi yang dikirim ke email Anda.'
            );
            setSessionStatus('invalid_or_expired');
          }
          return;
        }

        // Final check on session if type=recovery was present
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session && session.user && typeParam === 'recovery') {
          setSessionStatus('valid');
        } else {
          setStatusErrorMessage(
            'Tautan pemulihan password tidak valid, sudah digunakan, atau telah kedaluwarsa.'
          );
          setSessionStatus('invalid_or_expired');
        }
      } catch {
        if (isMounted) {
          setStatusErrorMessage(
            'Gagal memvalidasi sesi pemulihan password. Tautan mungkin sudah kedaluwarsa.'
          );
          setSessionStatus('invalid_or_expired');
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionStatus('valid');
      }
    });

    validateRecoveryLinkAndSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isPasswordRecoveryMode]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (sessionStatus !== 'valid') {
      setFormError(
        'Sesi pemulihan password tidak valid. Silakan minta tautan pemulihan baru.'
      );
      return;
    }

    if (newPassword.length < 8) {
      setFormError('Password baru minimal harus terdiri dari 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      await updateUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSessionStatus('completed');
      setSuccessNotice(
        'Password Anda berhasil diperbarui! Anda akan dialihkan ke halaman login untuk masuk menggunakan password baru.'
      );

      setTimeout(() => {
        clearPasswordRecoveryMode();
        onRedirectToLogin();
      }, 2200);
    } catch (err: any) {
      setFormError(
        err.message || 'Gagal memperbarui password. Silakan coba kembali.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex items-center justify-center p-4">
      <div className="bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#2D3748] text-white p-6">
          <div className="flex items-center gap-2 text-[#8FBC8F] text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            KKN SPACE — Pemulihan Keamanan Akun
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Atur Ulang Password Anda
          </h1>
          <p className="text-xs text-gray-300 mt-1">
            Desa Pringgasela Selatan • Sistem Autentikasi Terpusat Supabase
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {sessionStatus === 'validating' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-[#4A6B53] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800">
                  Memvalidasi Sesi Pemulihan Password...
                </p>
                <p className="text-xs text-gray-500">
                  Memeriksa keaslian token pemulihan dari Supabase Auth.
                </p>
              </div>
            </div>
          )}

          {sessionStatus === 'invalid_or_expired' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-xs">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-red-900">
                    Tautan Pemulihan Tidak Valid atau Kedaluwarsa
                  </p>
                  <p>{statusErrorMessage}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearPasswordRecoveryMode();
                    onRedirectToLogin();
                  }}
                  className="w-full py-2.5 px-4 bg-[#2D3748] hover:bg-gray-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Buka Login / Minta Tautan Reset Baru
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearPasswordRecoveryMode();
                    onNavigateToPublic();
                  }}
                  className="w-full py-2 px-4 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Portal Publik Desa
                </button>
              </div>
            </div>
          )}

          {sessionStatus === 'completed' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-gray-900">
                  Password Berhasil Diperbarui
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {successNotice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearPasswordRecoveryMode();
                  onRedirectToLogin();
                }}
                className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Masuk Sekarang
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {sessionStatus === 'valid' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="bg-[#EBF3ED] border border-[#C6DEC9] p-3 rounded-lg text-xs text-[#2F5238] leading-relaxed">
                Sesi pemulihan password terverifikasi. Silakan masukkan password
                baru Anda (minimal 8 karakter).
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password Baru (Minimal 8 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Memperbarui Password...' : 'Simpan Password Baru'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
