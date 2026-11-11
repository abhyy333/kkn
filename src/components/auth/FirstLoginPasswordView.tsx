import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  LogOut,
  ShieldAlert,
  Clock,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateFirstLoginPassword } from '../../utils/authSecurity';

interface FirstLoginPasswordViewProps {
  onCompleted?: () => void;
}

export const FirstLoginPasswordView: React.FC<FirstLoginPasswordViewProps> = ({
  onCompleted,
}) => {
  const {
    user,
    profile,
    isTemporaryPasswordExpired,
    temporaryPasswordExpiresAt,
    completeFirstLoginPassword,
    signOut,
  } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiredError, setExpiredError] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validation = useMemo(
    () => validateFirstLoginPassword(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  );

  const isExpired = isTemporaryPasswordExpired || expiredError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isExpired) {
      setError(
        'Password sementara Anda telah kedaluwarsa. Silakan hubungi Administrator KKN untuk melakukan Reset Password.'
      );
      return;
    }

    if (!validation.valid) {
      setError(
        validation.errorMessage ||
          'Password baru belum memenuhi syarat keamanan (minimal 12 karakter, huruf besar, huruf kecil, dan angka).'
      );
      return;
    }

    setSubmitting(true);
    try {
      await completeFirstLoginPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(
        'Password berhasil diperbarui! Mengarahkan Anda ke Ruang Kerja KKN SPACE...'
      );
      onCompleted?.();
    } catch (err: any) {
      const msg = String(err?.message || 'Gagal memperbarui password pertama kali.');
      const lower = msg.toLowerCase();
      if (
        lower.includes('expired') ||
        lower.includes('kedaluwarsa') ||
        lower.includes('kadaluarsa')
      ) {
        setExpiredError(true);
        setError(
          'Password sementara Anda telah kedaluwarsa. Silakan hubungi Administrator KKN untuk meminta Reset Password.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex items-center justify-center p-4"
      data-testid="first-login-password-view"
    >
      <div className="bg-white border border-[#E5E3DC] rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#2D3748] text-white p-6">
          <div className="flex items-center gap-2 text-[#8FBC8F] text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            KKN SPACE — Keamanan Login Pertama
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Wajib Ganti Password
          </h1>
          <p className="text-xs text-gray-300 mt-1">
            Demi keamanan akun, Anda wajib mengganti password sementara dari Admin sebelum mengakses Workspace Anggota.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Identity Summary */}
          {profile && (
            <div className="bg-[#FAF9F5] border border-[#E5E3DC] rounded-lg p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6B53]">
                  Identitas Akun Terautentikasi
                </span>
                <span className="text-[10px] font-mono bg-[#EBF3ED] text-[#284230] px-2 py-0.5 rounded font-semibold uppercase">
                  {profile.systemRole || profile.role}
                </span>
              </div>
              <div className="font-semibold text-stone-900 text-sm">
                {profile.displayName}
              </div>
              <div className="text-stone-500 font-mono text-[11px]">
                {user?.email || profile.email}
              </div>
              {(profile.position || profile.division) && (
                <div className="text-stone-600 text-[11px]">
                  {profile.position} {profile.division ? `· ${profile.division}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Mandatory Security Notice */}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg flex items-start gap-2.5 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-semibold">Akses Workspace Dikunci Sementara</p>
              <p>
                Halaman ini tidak dapat dilewati selama status{' '}
                <code className="font-mono text-[11px]">must_change_password</code>{' '}
                masih aktif.
              </p>
              {temporaryPasswordExpiresAt && !isExpired && (
                <p className="text-[11px] text-amber-700 flex items-center gap-1 pt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    Batas waktu password sementara:{' '}
                    {new Date(temporaryPasswordExpiresAt).toLocaleString('id-ID')}
                  </span>
                </p>
              )}
            </div>
          </div>

          {isExpired ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-xs">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-red-900">
                    Password Sementara Telah Kedaluwarsa
                  </p>
                  <p>
                    Masa berlaku password sementara Anda telah berakhir. Silakan
                    hubungi <strong>Administrator KKN (Super Admin)</strong> untuk
                    meminta pembuatan password sementara baru melalui menu Reset
                    Password.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                className="w-full py-2.5 px-4 bg-[#2D3748] hover:bg-gray-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Keluar & Hubungi Admin
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="leading-relaxed">{successMsg}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="first-login-new-password"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Password Baru *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    id="first-login-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 12 karakter (Huruf Besar, Kecil & Angka)"
                    className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={
                      showNewPassword
                        ? 'Sembunyikan password baru'
                        : 'Tampilkan password baru'
                    }
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="first-login-confirm-password"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Konfirmasi Password Baru *
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    id="first-login-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? 'Sembunyikan konfirmasi password'
                        : 'Tampilkan konfirmasi password'
                    }
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Strength Checklist */}
              <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5E3DC] space-y-1.5 text-[11px]">
                <div className="font-semibold text-stone-700">
                  Syarat Keamanan Password:
                </div>
                <ul className="space-y-1">
                  <li
                    className={`flex items-center gap-1.5 ${
                      validation.minLengthMet
                        ? 'text-emerald-700 font-medium'
                        : 'text-stone-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        validation.minLengthMet ? 'text-emerald-600' : 'text-stone-300'
                      }`}
                    />
                    <span>Minimal 12 karakter ({newPassword.length}/12)</span>
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      validation.hasUppercase
                        ? 'text-emerald-700 font-medium'
                        : 'text-stone-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        validation.hasUppercase ? 'text-emerald-600' : 'text-stone-300'
                      }`}
                    />
                    <span>Mengandung huruf besar (A–Z)</span>
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      validation.hasLowercase
                        ? 'text-emerald-700 font-medium'
                        : 'text-stone-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        validation.hasLowercase ? 'text-emerald-600' : 'text-stone-300'
                      }`}
                    />
                    <span>Mengandung huruf kecil (a–z)</span>
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      validation.hasNumber
                        ? 'text-emerald-700 font-medium'
                        : 'text-stone-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        validation.hasNumber ? 'text-emerald-600' : 'text-stone-300'
                      }`}
                    />
                    <span>Mengandung angka (0–9)</span>
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      validation.passwordsMatch && confirmPassword.length > 0
                        ? 'text-emerald-700 font-medium'
                        : 'text-stone-500'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${
                        validation.passwordsMatch && confirmPassword.length > 0
                          ? 'text-emerald-600'
                          : 'text-stone-300'
                      }`}
                    />
                    <span>Konfirmasi password cocok</span>
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={submitting || !validation.valid}
                className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting
                  ? 'Menyimpan Password Baru...'
                  : 'Simpan Password & Buka Workspace'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Footer: Only Sign Out is allowed, never skip to workspace */}
        <div className="bg-[#F3F1EC] px-6 py-3.5 border-t border-[#E5E3DC] flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Ingin keluar dari sesi ini?
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-semibold text-red-700 hover:underline flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
        </div>
      </div>
    </div>
  );
};
