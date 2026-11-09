import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { OFFICIAL_PROJECT_ID, OFFICIAL_DPL_MEMBER_ID, DPL_SUPERVISOR } from '../../data/mockData';
import {
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  History,
  Edit3,
  Trash2,
  Plus,
  Send,
  Lock,
  UserCheck,
  Shield,
  FileText,
} from 'lucide-react';

interface DplManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

interface RegisteredEmailData {
  id?: string;
  email: string;
  name: string;
  position: string;
  division: string;
  member_id: string;
  status: string; // 'pending_activation' | 'activated' | 'disabled'
  activated_at?: string;
  registered_at?: string;
}

interface EmailHistoryItem {
  id: string;
  previous_email: string | null;
  replacement_email: string | null;
  action: 'REGISTER' | 'REPLACE' | 'REMOVE';
  performed_by: string;
  reason?: string;
  created_at: string;
}

export const DplManagementModal: React.FC<DplManagementModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const {
    user,
    isSuperAdmin,
    registerMemberEmail,
    updateRegisteredEmail,
    revokeRegisteredEmail,
    logAdminActivity,
  } = useAuth();
  const { confirm, notify } = useConfirm();

  const [registeredDpl, setRegisteredDpl] = useState<RegisteredEmailData | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'history'>('details');

  // Form States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current DPL registration and email history
  const fetchDplStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        // Fetch from registered_emails
        const { data: regData } = await supabase
          .from('registered_emails')
          .select('*')
          .eq('member_id', OFFICIAL_DPL_MEMBER_ID)
          .maybeSingle();

        if (regData) {
          setRegisteredDpl({
            id: regData.id,
            email: regData.email,
            name: regData.name || DPL_SUPERVISOR.name,
            position: regData.position || DPL_SUPERVISOR.position,
            division: regData.division || 'Supervisi',
            member_id: OFFICIAL_DPL_MEMBER_ID,
            status: regData.status || 'pending_activation',
            activated_at: regData.activated_at,
            registered_at: regData.registered_at,
          });
        } else {
          setRegisteredDpl(null);
        }

        // Fetch email history
        const { data: histData } = await supabase
          .from('member_email_history')
          .select('*')
          .eq('member_id', OFFICIAL_DPL_MEMBER_ID)
          .order('created_at', { ascending: false });

        if (Array.isArray(histData)) {
          setEmailHistory(histData as EmailHistoryItem[]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch DPL registered status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDplStatus();
      setIsRegisterMode(false);
      setIsReplaceMode(false);
      setEmailInput('');
      setReasonInput('');
      setActionError(null);
    }
  }, [isOpen, fetchDplStatus]);

  if (!isOpen) return null;

  // Handle DPL Email Registration
  const handleRegisterDplEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setActionError('Format alamat email DPL tidak valid.');
      return;
    }

    // Explicit confirmation modal
    const ok = await confirm({
      title: 'Konfirmasi Registrasi Email DPL',
      description: `Apakah Anda yakin ingin mendaftarkan email "${cleanEmail}" untuk Dosen Pembimbing Lapangan ${DPL_SUPERVISOR.name}?`,
      targetName: `${DPL_SUPERVISOR.name} (${cleanEmail})`,
      confirmLabel: 'Ya, Daftarkan Email DPL',
      cancelLabel: 'Batal',
      level: 'ordinary',
    });

    if (!ok) return;

    setIsSubmitting(true);

    try {
      let registeredSuccess = false;

      if (isSupabaseConfigured) {
        // 1. Try deployed Edge Function `admin-register-member-email`
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data, error } = await supabase.functions.invoke('admin-register-member-email', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              project_id: OFFICIAL_PROJECT_ID,
              member_id: OFFICIAL_DPL_MEMBER_ID,
              email: cleanEmail,
              confirm_member_name: DPL_SUPERVISOR.name,
              reason: reasonInput.trim() || 'Registrasi email DPL oleh Super Admin',
            },
          });

          if (!error && data && data.success === true) {
            registeredSuccess = true;
          } else if (error) {
            let errorMsg = error.message;
            try {
              const errBody = await (error as any).context?.json();
              if (errBody?.error) errorMsg = errBody.error;
            } catch {}
            if (errorMsg.includes('terdaftar') || errorMsg.includes('Forbidden') || errorMsg.includes('Unauthorized') || errorMsg.includes('tidak valid')) {
              throw new Error(errorMsg);
            }
            console.warn('Edge Function admin-register-member-email notice:', errorMsg);
          }
        } catch (edgeErr: any) {
          if (edgeErr?.message && (edgeErr.message.includes('terdaftar') || edgeErr.message.includes('Forbidden') || edgeErr.message.includes('Unauthorized') || edgeErr.message.includes('tidak valid'))) {
            throw edgeErr;
          }
          console.warn('Edge Function admin-register-member-email notice (falling back to database upsert):', edgeErr);
        }

        // 2. Direct database upsert fallback if Edge Function is not deployed or failed
        if (!registeredSuccess) {
          const { error: dbError } = await supabase.from('registered_emails').upsert(
            {
              email: cleanEmail,
              name: DPL_SUPERVISOR.name,
              position: DPL_SUPERVISOR.position,
              division: 'Supervisi',
              role: 'Dosen Pembimbing Lapangan',
              system_role: 'dpl',
              member_id: OFFICIAL_DPL_MEMBER_ID,
              status: 'pending',
              registered_by: user?.email || 'abhyy333@gmail.com',
              registered_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          );

          if (dbError) {
            // Secondary attempt on member_id conflict
            const { error: dbError2 } = await supabase.from('registered_emails').upsert(
              {
                member_id: OFFICIAL_DPL_MEMBER_ID,
                email: cleanEmail,
                name: DPL_SUPERVISOR.name,
                position: DPL_SUPERVISOR.position,
                division: 'Supervisi',
                role: 'Dosen Pembimbing Lapangan',
                system_role: 'dpl',
                status: 'pending',
                registered_by: user?.email || 'abhyy333@gmail.com',
                registered_at: new Date().toISOString(),
              },
              { onConflict: 'member_id' }
            );

            if (dbError2) {
              throw new Error(dbError.message || dbError2.message || 'Gagal menyimpan pendaftaran email DPL ke database.');
            }
          }

          // Record in audit history
          try {
            await supabase.from('member_email_history').insert({
              member_id: OFFICIAL_DPL_MEMBER_ID,
              previous_email: null,
              replacement_email: cleanEmail,
              action: 'REGISTER',
              performed_by: user?.email || 'abhyy333@gmail.com',
              reason: reasonInput.trim() || 'Registrasi email DPL oleh Super Admin',
            });
          } catch {}

          // Update members table
          try {
            await supabase
              .from('members')
              .update({
                email: cleanEmail,
                registered_email: cleanEmail,
                account_status: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', OFFICIAL_DPL_MEMBER_ID);
          } catch {}

          // Sync AuthContext local state
          try {
            await registerMemberEmail(
              DPL_SUPERVISOR.name,
              cleanEmail,
              DPL_SUPERVISOR.position,
              'Supervisi',
              OFFICIAL_DPL_MEMBER_ID
            );
          } catch {}

          registeredSuccess = true;
        }
      } else {
        try {
          await registerMemberEmail(
            DPL_SUPERVISOR.name,
            cleanEmail,
            DPL_SUPERVISOR.position,
            'Supervisi',
            OFFICIAL_DPL_MEMBER_ID
          );
        } catch {}
        registeredSuccess = true;
      }

      if (registeredSuccess) {
        if (logAdminActivity) {
          await logAdminActivity(
            'REGISTER_DPL_EMAIL',
            `${DPL_SUPERVISOR.name} (${cleanEmail})`,
            `Mendaftarkan email login DPL: ${cleanEmail}`
          );
        }

        notify({
          type: 'success',
          title: 'Registrasi Email DPL Berhasil',
          message: `Email "${cleanEmail}" telah terdaftar untuk ${DPL_SUPERVISOR.name}. Status: Menunggu Aktivasi.`,
        });

        setIsRegisterMode(false);
        setEmailInput('');
        setReasonInput('');
        await fetchDplStatus();
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      console.error('DPL email registration failed:', err);
      setActionError(err?.message || 'Gagal mendaftarkan email DPL. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle DPL Email Replacement / Change
  const handleReplaceDplEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setActionError('Format alamat email DPL baru tidak valid.');
      return;
    }

    if (registeredDpl && cleanEmail === registeredDpl.email.toLowerCase()) {
      setActionError('Email baru sama dengan email DPL yang sedang terdaftar.');
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Penggantian Email DPL',
      description: `Apakah Anda yakin ingin mengganti email DPL dari "${registeredDpl?.email}" menjadi "${cleanEmail}"? Akun DPL lama akan dicabut dan akun baru harus melakukan aktivasi ulang.`,
      targetName: `${DPL_SUPERVISOR.name} (${cleanEmail})`,
      confirmLabel: 'Ganti Email DPL',
      cancelLabel: 'Batal',
      level: 'warning',
    });

    if (!ok) return;

    setIsSubmitting(true);

    try {
      let replaceSuccess = false;
      const prevEmail = registeredDpl?.email || null;

      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data, error } = await supabase.functions.invoke('admin-reset-member-email', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              action: 'replace',
              project_id: OFFICIAL_PROJECT_ID,
              member_id: OFFICIAL_DPL_MEMBER_ID,
              new_email: cleanEmail,
              confirm_member_name: DPL_SUPERVISOR.name,
              reason: reasonInput.trim() || 'Penggantian email DPL oleh Super Admin',
            },
          });

          if (!error && data?.success) {
            replaceSuccess = true;
          } else if (error) {
            let errorMsg = error.message;
            try {
              const errBody = await (error as any).context?.json();
              if (errBody?.error) errorMsg = errBody.error;
            } catch {}
            if (errorMsg.includes('terdaftar') || errorMsg.includes('Forbidden') || errorMsg.includes('Unauthorized') || errorMsg.includes('tidak valid')) {
              throw new Error(errorMsg);
            }
            console.warn('Edge Function admin-reset-member-email notice:', errorMsg);
          }
        } catch (edgeErr: any) {
          if (edgeErr?.message && (edgeErr.message.includes('terdaftar') || edgeErr.message.includes('Forbidden') || edgeErr.message.includes('Unauthorized') || edgeErr.message.includes('tidak valid'))) {
            throw edgeErr;
          }
          console.warn('Edge Function admin-reset-member-email call notice (falling back to database replacement):', edgeErr);
        }

        if (!replaceSuccess) {
          if (prevEmail) {
            await supabase.from('registered_emails').delete().eq('email', prevEmail);
          }
          await supabase.from('registered_emails').upsert(
            {
              email: cleanEmail,
              name: DPL_SUPERVISOR.name,
              position: DPL_SUPERVISOR.position,
              division: 'Supervisi',
              role: 'Dosen Pembimbing Lapangan',
              system_role: 'dpl',
              member_id: OFFICIAL_DPL_MEMBER_ID,
              status: 'pending',
              registered_by: user?.email || 'abhyy333@gmail.com',
              registered_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          );

          try {
            await supabase.from('member_email_history').insert({
              member_id: OFFICIAL_DPL_MEMBER_ID,
              previous_email: prevEmail,
              replacement_email: cleanEmail,
              action: 'REPLACE',
              performed_by: user?.email || 'abhyy333@gmail.com',
              reason: reasonInput.trim() || 'Penggantian email DPL oleh Super Admin',
            });
          } catch {}

          try {
            await supabase
              .from('members')
              .update({
                email: cleanEmail,
                registered_email: cleanEmail,
                account_status: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', OFFICIAL_DPL_MEMBER_ID);
          } catch {}

          replaceSuccess = true;
        }
      } else {
        replaceSuccess = true;
      }

      if (replaceSuccess) {
        if (logAdminActivity) {
          await logAdminActivity(
            'REPLACE_DPL_EMAIL',
            `${DPL_SUPERVISOR.name} (${cleanEmail})`,
            `Mengganti email login DPL dari ${prevEmail || '-'} menjadi ${cleanEmail}`
          );
        }

        notify({
          type: 'success',
          title: 'Email DPL Berhasil Diganti',
          message: `Email DPL berhasil diperbarui ke "${cleanEmail}". Status akun diubah ke Menunggu Aktivasi.`,
        });

        setIsReplaceMode(false);
        setEmailInput('');
        setReasonInput('');
        await fetchDplStatus();
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memperbarui email DPL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle DPL Email Removal
  const handleRemoveDplEmail = async () => {
    setActionError(null);

    const ok = await confirm({
      title: 'Konfirmasi Hapus Email DPL',
      description: `Apakah Anda yakin ingin menghapus email login DPL "${registeredDpl?.email}"? Profil supervisor dan riwayat supervisi DPL TETAP DIPERTAHANKAN.`,
      targetName: `${DPL_SUPERVISOR.name}`,
      confirmLabel: 'Hapus Email DPL',
      cancelLabel: 'Batal',
      level: 'irreversible',
    });

    if (!ok) return;

    setIsSubmitting(true);

    try {
      let removeSuccess = false;
      const prevEmail = registeredDpl?.email || null;

      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data, error } = await supabase.functions.invoke('admin-reset-member-email', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              action: 'remove',
              project_id: OFFICIAL_PROJECT_ID,
              member_id: OFFICIAL_DPL_MEMBER_ID,
              confirm_member_name: DPL_SUPERVISOR.name,
              reason: 'Pencabutan registrasi email DPL oleh Super Admin',
            },
          });

          if (!error && data?.success) {
            removeSuccess = true;
          } else if (error) {
            let errorMsg = error.message;
            try {
              const errBody = await (error as any).context?.json();
              if (errBody?.error) errorMsg = errBody.error;
            } catch {}
            if (errorMsg.includes('Forbidden') || errorMsg.includes('Unauthorized') || errorMsg.includes('dilindungi')) {
              throw new Error(errorMsg);
            }
            console.warn('Edge Function admin-reset-member-email remove notice:', errorMsg);
          }
        } catch (edgeErr: any) {
          if (edgeErr?.message && (edgeErr.message.includes('Forbidden') || edgeErr.message.includes('Unauthorized') || edgeErr.message.includes('dilindungi'))) {
            throw edgeErr;
          }
          console.warn('Edge Function admin-reset-member-email remove notice (falling back to database deletion):', edgeErr);
        }

        if (!removeSuccess) {
          if (prevEmail) {
            await supabase.from('registered_emails').delete().eq('email', prevEmail);
          }
          await supabase.from('registered_emails').delete().eq('member_id', OFFICIAL_DPL_MEMBER_ID);

          try {
            await supabase.from('member_email_history').insert({
              member_id: OFFICIAL_DPL_MEMBER_ID,
              previous_email: prevEmail,
              replacement_email: null,
              action: 'REMOVE',
              performed_by: user?.email || 'abhyy333@gmail.com',
              reason: 'Pencabutan registrasi email DPL oleh Super Admin',
            });
          } catch {}

          try {
            await supabase
              .from('members')
              .update({
                email: null,
                registered_email: null,
                account_status: 'unregistered',
                updated_at: new Date().toISOString(),
              })
              .eq('id', OFFICIAL_DPL_MEMBER_ID);
          } catch {}

          removeSuccess = true;
        }
      } else {
        removeSuccess = true;
      }

      if (removeSuccess) {
        if (logAdminActivity) {
          await logAdminActivity(
            'REMOVE_DPL_EMAIL',
            `${DPL_SUPERVISOR.name}`,
            `Mencabut email login DPL (${prevEmail || '-'})`
          );
        }

        notify({
          type: 'success',
          title: 'Email DPL Berhasil Dihapus',
          message: 'Registrasi email DPL telah dicabut. Profil DPL dan riwayat laporan tetap dipertahankan.',
        });

        await fetchDplStatus();
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Gagal menghapus email DPL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-xl max-w-lg w-full overflow-hidden text-xs max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E6DF] bg-[#FAF9F5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#2D4734] text-white flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Panel Kelola Dosen Pembimbing Lapangan (DPL)
              </h3>
              <span className="text-[11px] text-stone-500 block">
                Supervisi Akademik · KKN Tematik Desa Pringgasela Selatan
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-medium pb-1">
            <button
              onClick={() => setActiveSubTab('details')}
              className={`px-3 py-1.5 rounded-t-md transition-colors ${
                activeSubTab === 'details'
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold border-b-2 border-[#4A6B53]'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Profil & Akses Email DPL
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-t-md transition-colors flex items-center gap-1 ${
                activeSubTab === 'history'
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold border-b-2 border-[#4A6B53]'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Email ({emailHistory.length})</span>
            </button>
          </div>

          {activeSubTab === 'details' && (
            <div className="space-y-4">
              {/* DPL Academic Credentials Card */}
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E3E0D6] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif text-base font-semibold text-stone-900">
                      {DPL_SUPERVISOR.name}
                    </h4>
                    <span className="font-mono text-[11px] text-[#4A6B53] font-medium block">
                      NIP: {DPL_SUPERVISOR.nip}
                    </span>
                    <span className="text-stone-600 text-xs block">
                      {DPL_SUPERVISOR.position} · {DPL_SUPERVISOR.faculty}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[10px] shrink-0">
                    Kategori: {DPL_SUPERVISOR.category}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 space-y-1 font-mono">
                  <div>ID Supervisor: <span className="text-stone-800">{OFFICIAL_DPL_MEMBER_ID}</span></div>
                  <div>ID Proyek KKN: <span className="text-stone-800">{OFFICIAL_PROJECT_ID}</span></div>
                </div>
              </div>

              {/* Email Registration Panel */}
              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 text-xs flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#4A6B53]" />
                    <span>Status Registrasi Email Login DPL</span>
                  </span>

                  {registeredDpl ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        registeredDpl.status === 'activated' || registeredDpl.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {registeredDpl.status === 'activated' || registeredDpl.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Akun Aktif</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Menunggu Aktivasi</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium border border-stone-200">
                      Belum Didaftarkan
                    </span>
                  )}
                </div>

                {registeredDpl ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                      <span className="text-stone-400 text-[10px] block">Alamat Email Terdaftar:</span>
                      <span className="font-mono font-bold text-stone-900 text-sm block">
                        {registeredDpl.email}
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        DPL dapat masuk ke Workspace Supervisi (/dpl) menggunakan email ini setelah menyelesaikan aktivasi password.
                      </span>
                    </div>

                    {!isReplaceMode && isSuperAdmin && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplaceMode(true);
                            setEmailInput(registeredDpl.email);
                            setActionError(null);
                          }}
                          className="px-3 py-1.5 rounded-md border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ganti Email</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleRemoveDplEmail}
                          className="px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 font-medium flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Email</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-center space-y-2">
                    <p className="text-stone-600 text-xs">
                      Alamat email login untuk DPL belum terdaftar di sistem. Daftarkan email DPL agar dosen pembimbing dapat memvalidasi laporan mahasiswa.
                    </p>
                    {!isRegisterMode && isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(true);
                          setEmailInput('');
                          setActionError(null);
                        }}
                        className="px-4 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Daftarkan Email DPL</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Form Error Message */}
                {actionError && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Registration Form Inline */}
                {(isRegisterMode || isReplaceMode) && (
                  <form
                    onSubmit={isReplaceMode ? handleReplaceDplEmail : handleRegisterDplEmail}
                    className="p-4 rounded-lg border border-[#CCDCD0] bg-[#EBF1ED]/30 space-y-3 pt-3"
                  >
                    <h5 className="font-semibold text-stone-900 text-xs">
                      {isReplaceMode ? 'Formulir Penggantian Email DPL' : 'Formulir Registrasi Email DPL Baru'}
                    </h5>

                    <div className="space-y-1">
                      <label className="font-medium text-stone-700">Alamat Email Resmi DPL *</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Contoh: dpl.dunyana@unram.ac.id"
                        className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53] font-mono text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-stone-700">Alasan Registrasi / Catatan Admin</label>
                      <input
                        type="text"
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        placeholder="Contoh: Penugasan resmi LPPM Universitas Mataram"
                        className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53] text-xs bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(false);
                          setIsReplaceMode(false);
                          setActionError(null);
                        }}
                        className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Memproses...' : isReplaceMode ? 'Simpan Email Baru' : 'Daftarkan Email'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL HISTORY */}
          {activeSubTab === 'history' && (
            <div className="space-y-3">
              <h4 className="font-serif text-sm font-semibold text-stone-900">
                Jejak Audit Riwayat Registrasi Email DPL
              </h4>

              {emailHistory.length === 0 ? (
                <div className="p-6 rounded-lg bg-stone-50 border border-stone-200 text-center text-stone-500 text-xs italic">
                  Belum ada riwayat aktivitas pendaftaran atau penggantian email DPL sebelumnya.
                </div>
              ) : (
                <div className="space-y-2">
                  {emailHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-[#E8E6DF] bg-stone-50/60 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-stone-500">
                        <span className="font-semibold text-stone-900 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-stone-200">
                          {item.action}
                        </span>
                        <span className="font-mono text-[10px]">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="text-stone-700 font-mono text-[11px] pt-1">
                        {item.previous_email && (
                          <span className="line-through text-stone-400 mr-2">
                            {item.previous_email}
                          </span>
                        )}
                        {item.replacement_email && (
                          <span className="font-bold text-[#4A6B53]">
                            → {item.replacement_email}
                          </span>
                        )}
                      </div>

                      {item.reason && (
                        <p className="text-stone-500 italic text-[11px]">
                          Catatan: "{item.reason}"
                        </p>
                      )}

                      <span className="text-[10px] text-stone-400 block pt-0.5">
                        Dilakukan oleh: {item.performed_by}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E8E6DF] bg-stone-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
};
