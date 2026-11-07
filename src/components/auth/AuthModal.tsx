import React, { useState, useEffect } from 'react';
import { useAuth, InvitationItem } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  KeyRound,
  User,
  ShieldCheck,
  Globe,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSwitchToPublic?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSwitchToPublic,
}) => {
  const { signInWithEmail, signInWithGoogle, signUpWithInvitation, activateWithGoogle, lookupInvitationToken } = useAuth();
  const [tab, setTab] = useState<'signin' | 'invitation'>('signin');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Invitation Registration State
  const [inviteToken, setInviteToken] = useState('');
  const [tokenPreview, setTokenPreview] = useState<InvitationItem | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');

  // Debounced token verification
  useEffect(() => {
    const clean = inviteToken.trim().toUpperCase();
    if (!clean || clean.length < 5) {
      setTokenPreview(null);
      return;
    }

    let isMounted = true;
    setIsVerifyingToken(true);
    lookupInvitationToken(clean)
      .then((res) => {
        if (isMounted) {
          setTokenPreview(res);
          if (res) {
            if (res.name) setInviteDisplayName(res.name);
            if (res.email) setInviteEmail(res.email);
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsVerifyingToken(false);
      });

    return () => {
      isMounted = false;
    };
  }, [inviteToken]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmail(email, password);
      if (onClose) onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setErrorMsg('Email atau password tidak sesuai. Jika belum memiliki akun, silakan hubungi Kormades/Admin untuk mendapatkan kode undangan.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.');
      } else {
        setErrorMsg(err.message || 'Gagal masuk. Periksa koneksi internet Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Gagal masuk dengan Google: ' + (err.message || ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await signUpWithInvitation(
        inviteToken,
        inviteEmail,
        invitePassword,
        inviteDisplayName
      );
      setSuccessMsg('Akun berhasil diaktifkan! Anda dialihkan ke Workspace...');
      setTimeout(() => {
        if (onClose) onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengaktifkan akun dengan kode undangan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleActivation = async () => {
    if (!inviteToken.trim()) {
      setErrorMsg('Masukkan kode undangan terlebih dahulu.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await activateWithGoogle(inviteToken);
      setSuccessMsg('Akun Google Anda berhasil ditautkan dan diaktifkan!');
      setTimeout(() => {
        if (onClose) onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Gagal aktivasi dengan Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-2xl max-w-md w-full overflow-hidden text-xs relative">
        {/* Header */}
        <div className="p-6 bg-[#FAF9F5] border-b border-[#E8E6DF] text-center space-y-2 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 transition-colors"
              aria-label="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-[#4A6B53] text-white flex items-center justify-center mx-auto text-lg font-serif font-semibold shadow-xs">
            K
          </div>
          <h2 className="font-serif text-lg font-semibold text-stone-900 tracking-tight">
            KKN SPACE — KKN Pringgasela Selatan
          </h2>
          <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
            Akses workspace internal terbatas untuk mahasiswa tim KKN dan Dosen Pembimbing Lapangan (DPL).
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 bg-stone-50/70 p-1 gap-1">
          <button
            onClick={() => {
              setTab('signin');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors ${
              tab === 'signin'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Masuk Akun
          </button>
          <button
            onClick={() => {
              setTab('invitation');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 rounded-md font-medium text-center transition-colors ${
              tab === 'invitation'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Aktivasi Undangan
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A6B53] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'signin' ? (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Email Terdaftar</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@mail.ugm.ac.id"
                    className="w-full pl-8 pr-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs disabled:opacity-50"
              >
                <span>{isLoading ? 'Memproses...' : 'Masuk ke Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-2 text-[10px] text-stone-400 uppercase tracking-wider absolute">
                  atau
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-white border border-[#D5D2C8] text-stone-700 font-medium hover:bg-stone-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </button>
            </form>
          ) : (
            /* Invitation Activation Form */
            <form onSubmit={handleInvitationSignUp} className="space-y-3.5">
              <div className="p-2.5 rounded bg-[#FAF9F5] border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                <span>
                  Pendaftaran akun baru wajib menggunakan <strong>Kode Undangan</strong> yang diterbitkan oleh Kormades/Admin Unit.
                </span>
              </div>

              {/* Token Input with Live Lookup */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-stone-700">Kode Undangan (Token)</label>
                  {isVerifyingToken && (
                    <span className="text-[10px] text-stone-400 animate-pulse">Memverifikasi...</span>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Contoh: KKN-PRG-JOSUA-01"
                    className="w-full pl-8 pr-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53] font-mono uppercase font-medium"
                  />
                </div>
              </div>

              {/* Verified Token Preview Card */}
              {tokenPreview && (
                <div className="p-3 rounded-lg bg-[#EBF1ED] border border-[#CCDCD0] space-y-1.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#284230]">
                      <Sparkles className="w-3.5 h-3.5 text-[#4A6B53]" />
                      <span>Undangan Terverifikasi</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#284230] font-medium border border-[#CCDCD0] uppercase">
                      {tokenPreview.role === 'admin' ? 'Admin / BPH' : tokenPreview.role === 'dpl' ? 'DPL (Read-Only)' : 'Anggota'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-stone-500 block text-[10px]">Nama Terdaftar:</span>
                      <span className="font-semibold text-stone-900">{tokenPreview.name}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">Divisi:</span>
                      <span className="font-medium text-stone-800">{tokenPreview.division}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Choice: Google Activation vs Manual Email/Password */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleActivation}
                  disabled={isLoading || !tokenPreview}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-white border border-[#CCDCD0] text-stone-800 font-medium hover:bg-[#FAF9F5] transition-colors shadow-2xs disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Aktivasi Cepat dengan Akun Google</span>
                </button>

                <div className="relative py-1 flex items-center justify-center">
                  <div className="border-t border-stone-200 w-full" />
                  <span className="bg-white px-2 text-[10px] text-stone-400 uppercase tracking-wider absolute">
                    atau aktivasi via email & sandi
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Email Pribadi / Kampus</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email.anda@ugm.ac.id"
                      className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-medium text-stone-700">Nama Tampilan</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={inviteDisplayName}
                        onChange={(e) => setInviteDisplayName(e.target.value)}
                        placeholder="Nama panggilan"
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-stone-700">Buat Password Baru</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        placeholder="Min. 6 digit"
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !inviteToken.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs disabled:opacity-50 mt-1"
                >
                  <span>{isLoading ? 'Memvalidasi...' : 'Aktivasi Akun & Masuk'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Public Portal Escape Hatch */}
          {onSwitchToPublic && (
            <div className="pt-3 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={onSwitchToPublic}
                className="text-stone-500 hover:text-stone-800 text-[11px] inline-flex items-center gap-1 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#4A6B53]" />
                <span>Lihat Informasi Publik Desa Pringgasela Selatan (Tanpa Login) →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

