import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  UserCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Globe,
  X,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  MailCheck,
  Database,
  KeyRound,
  Clock,
} from 'lucide-react';
import {
  useAuth,
  RegisteredEmailRecord,
  UserProfile,
} from '../../context/AuthContext';

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
    checkRegisteredEmail,
    activateWithRegisteredEmail,
    resendVerificationEmail,
    requestPasswordReset,
    isSupabaseReady,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useAuth();

  const [tab, setTab] = useState<'signin' | 'activate'>('signin');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step-based initial account activation state
  const [verifiedRecord, setVerifiedRecord] =
    useState<RegisteredEmailRecord | null>(null);
  const [verificationSentEmail, setVerificationSentEmail] = useState<
    string | null
  >(null);
  const [resendCooldown, setResendCooldown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setSuccessMsg(null);
    if (sessionExpiredNotice) {
      clearSessionExpiredNotice();
    }
  };

  const clearPasswords = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const resolvedProfile = await signInWithEmail(email, password);
      clearPasswords();
      onLoginSuccess?.(resolvedProfile);
      onClose();
    } catch (err: any) {
      const rawMessage = String(err?.message || 'Gagal masuk dengan email.');
      setError(rawMessage.replace('EMAIL_NOT_VERIFIED:', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Masukkan alamat email terdaftar Anda.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(cleanEmail);
      setForgotPasswordSent(true);
      setSuccessMsg(
        'Email pemulihan password telah dikirim. Jika alamat email tersebut terdaftar di sistem KKN SPACE, silakan periksa kotak masuk atau folder spam Anda untuk membuka tautan reset password.'
      );
    } catch (err: any) {
      setError(
        err.message || 'Gagal memproses permintaan pemulihan password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmailStep = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const record = await checkRegisteredEmail(cleanEmail);
      if (!record) {
        setError('Email ini belum didaftarkan oleh Administrator KKN.');
        setVerifiedRecord(null);
        return;
      }

      if (
        record.status === 'activated' &&
        record.activatedUid &&
        cleanEmail !== 'abhyy333@gmail.com'
      ) {
        setError(
          'Akun untuk email ini sudah aktif. Silakan masuk melalui tab "Masuk Akun" menggunakan email dan password Anda.'
        );
        setVerifiedRecord(null);
        return;
      }

      setVerifiedRecord(record);
      setSuccessMsg(
        `Identitas terverifikasi dari undangan Admin: ${record.name} (${record.position})`
      );
    } catch (err: any) {
      setError(
        err.message || 'Email ini belum didaftarkan oleh Administrator KKN.'
      );
      setVerifiedRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!verifiedRecord) {
      setError('Email belum terdaftar. Silakan hubungi administrator.');
      return;
    }

    if (password.length < 8) {
      setError('Password minimal harus terdiri dari 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const result = await activateWithRegisteredEmail(
        verifiedRecord.email,
        password
      );
      clearPasswords();

      if (result.needsEmailVerification) {
        setVerificationSentEmail(result.email);
        setSuccessMsg(
          `Registrasi berhasil! Tautan verifikasi email telah dikirim ke ${result.email}. Silakan verifikasi email Anda terlebih dahulu sebelum masuk ke ruang kerja.`
        );
      } else {
        onLoginSuccess?.(result.profile);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengaktivasi akun anggota.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (targetEmail: string) => {
    if (!targetEmail || resendCooldown) return;
    resetMessages();
    setLoading(true);
    try {
      await resendVerificationEmail(targetEmail);
      setResendCooldown(true);
      setSuccessMsg(
        `Email verifikasi telah dikirim ulang ke ${targetEmail}. Silakan periksa kotak masuk atau folder spam Anda.`
      );
      setTimeout(() => setResendCooldown(false), 15000);
    } catch (err: any) {
      setError(
        err.message || 'Gagal mengirim ulang email verifikasi. Coba lagi nanti.'
      );
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
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-[#8FBC8F] text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            KKN SPACE — Supabase Auth & Role Verification
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {isForgotPassword
              ? 'Pemulihan Password Akun'
              : tab === 'signin'
                ? 'Masuk ke Ruang Kerja Tim'
                : 'Aktivasi Akun dari Undangan Admin'}
          </h2>
          <p className="text-xs text-gray-300 mt-1">
            {isForgotPassword
              ? 'Kami akan mengirimkan tautan pemulihan password ke alamat email terdaftar Anda.'
              : tab === 'signin'
                ? 'Masuk menggunakan email dan password akun KKN SPACE Anda.'
                : 'Halaman khusus aktivasi akun bagi anggota & DPL yang telah didaftarkan dan diundang oleh Admin.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E5E3DC] bg-[#F3F1EC]">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setIsForgotPassword(false);
              setForgotPasswordSent(false);
              setVerifiedRecord(null);
              setVerificationSentEmail(null);
              clearPasswords();
              resetMessages();
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${
              tab === 'signin'
                ? 'bg-[#FAF9F5] text-[#2D3748] border-b-2 border-[#4A6B53]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('activate');
              setIsForgotPassword(false);
              setForgotPasswordSent(false);
              clearPasswords();
              resetMessages();
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${
              tab === 'activate'
                ? 'bg-[#FAF9F5] text-[#2D3748] border-b-2 border-[#4A6B53]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Aktivasi Akun dari Undangan Admin
          </button>
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

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {tab === 'signin' && isForgotPassword ? (
            /* Forgot Password Workflow */
            <div className="space-y-4">
              {!forgotPasswordSent ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                  <div className="bg-[#F3F1EC] border border-[#E5E3DC] p-3 rounded-lg text-xs text-gray-700 leading-relaxed flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                    <span>
                      Masukkan alamat email akun Anda. Kami akan mengirimkan tautan
                      untuk mengatur ulang password ke email tersebut.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Alamat Email Terdaftar
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Contoh: nama@email.com"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading
                      ? 'Mengirim Tautan Pemulihan...'
                      : 'Kirim Email Pemulihan Password'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="bg-white border border-[#E5E3DC] rounded-xl p-4 space-y-3 text-center">
                  <div className="w-11 h-11 rounded-full bg-[#EBF3ED] text-[#2F5238] flex items-center justify-center mx-auto">
                    <MailCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900">
                      Periksa Kotak Masuk Email Anda
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Permintaan pemulihan password telah diproses. Klik tautan di
                      dalam email yang dikirimkan untuk membuka halaman pengaturan
                      password baru (<code className="font-mono text-[11px]">/reset-password</code>).
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotPasswordSent(false);
                  resetMessages();
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Masuk Akun
              </button>
            </div>
          ) : tab === 'signin' ? (
            <>
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="abhyy333@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#2D3748] hover:bg-gray-800 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Masuk...' : 'Masuk ke Workspace'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setForgotPasswordSent(false);
                      clearPasswords();
                      resetMessages();
                    }}
                    className="text-xs font-semibold text-[#4A6B53] hover:text-[#2F5238] hover:underline transition-colors"
                  >
                    Lupa password?
                  </button>
                </div>
              </form>

              <div className="bg-[#F3F1EC] border border-[#E5E3DC] rounded-lg p-3 text-[11px] text-gray-600 space-y-1">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4A6B53]" />
                  Aktivasi Akun Pertama Kali?
                </p>
                <p>
                  Jika email Anda sudah didaftarkan oleh Admin di tabel{' '}
                  <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-gray-200">
                    registered_emails
                  </code>{' '}
                  namun belum memiliki password, buka tab{' '}
                  <strong>Aktivasi Akun Anggota</strong> di atas.
                </p>
              </div>
            </>
          ) : verificationSentEmail ? (
            /* Initial Account Activation: Email Verification Pending Screen */
            <div className="bg-white border border-[#E5E3DC] rounded-xl p-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EBF3ED] text-[#2F5238] flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-gray-900">
                  Verifikasi Email Aktivasi Pertama
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Kami telah mengirimkan email verifikasi aktivasi ke{' '}
                  <span className="font-semibold text-gray-900">
                    {verificationSentEmail}
                  </span>
                  . Setelah verifikasi pertama ini selesai, Anda dapat langsung
                  masuk pada sesi berikutnya tanpa perlu verifikasi email ulang.
                </p>
              </div>

              {verifiedRecord && (
                <div className="bg-[#FAF9F5] border border-[#E5E3DC] rounded-lg p-3 text-left text-xs space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Profil Anggota Terhubung (Database)
                  </p>
                  <p className="font-semibold text-gray-800">
                    {verifiedRecord.name}
                  </p>
                  <p className="text-gray-600">
                    {verifiedRecord.position} • {verifiedRecord.division}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading || resendCooldown}
                  onClick={() => handleResendVerification(verificationSentEmail)}
                  className="w-full py-2 px-4 bg-[#F3F1EC] hover:bg-[#E5E3DC] text-gray-800 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown
                    ? 'Email Verifikasi Telah Dikirim Ulang'
                    : 'Kirim Ulang Email Verifikasi'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(verificationSentEmail);
                    setVerificationSentEmail(null);
                    setVerifiedRecord(null);
                    setTab('signin');
                    resetMessages();
                  }}
                  className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3B5642] text-white font-medium text-xs rounded-lg transition-colors"
                >
                  Sudah Verifikasi? Masuk ke Akun
                </button>
              </div>
            </div>
          ) : !verifiedRecord ? (
            /* Step 1: Validate Email against registered_emails (Initial Activation Only) */
            <form onSubmit={handleCheckEmailStep} className="space-y-3.5">
              <div className="bg-[#EBF3ED] border border-[#C6DEC9] p-3 rounded-lg text-xs text-[#2F5238] leading-relaxed">
                <strong>Verifikasi Email Undangan:</strong> Masukkan
                alamat email resmi yang telah didaftarkan oleh Administrator KKN untuk aktivasi akun.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Alamat Email Anggota / DPL (Terdaftar oleh Admin)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: nama@domain.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Memeriksa Undangan...' : 'Lanjutkan Aktivasi Akun'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Step 2: Read-Only Database Identity + Password Setup (No Ganti Email) */
            <form onSubmit={handleActivateSubmit} className="space-y-3.5">
              <div className="bg-white border border-[#C6DEC9] rounded-xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6B53] bg-[#EBF3ED] px-2 py-0.5 rounded">
                    Identitas Terdaftar (Read-Only)
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Undangan Admin
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-gray-900">
                    {verifiedRecord.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {verifiedRecord.email}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    Jabatan: {verifiedRecord.position}
                  </span>
                  <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    Divisi: {verifiedRecord.division}
                  </span>
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase">
                    Role: {verifiedRecord.role}
                  </span>
                  {verifiedRecord.systemRole === 'super_admin' && (
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      SUPER ADMIN (Mode Anggota & Admin)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Buat Password Baru (Min. 8 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#4A6B53] hover:bg-[#3d5844] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                {loading
                  ? 'Mengaktifkan Akun...'
                  : 'Daftar & Kirim Email Verifikasi'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
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
