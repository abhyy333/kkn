import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm, NotificationItem } from '../../context/ConfirmContext';
import {
  Member,
  WorkProgram,
  RegisteredEmailRecord,
  AdminActivityLogRecord,
  UnitConfig,
  DocumentationPhoto,
  PublicArticleRecord,
  UploadedFileMetadata,
  MeetingItem,
  DecisionLogRecord,
  TaskItem,
  VillageResearchData,
  StakeholderRecord,
  SurveyRecord,
  ReportRecord,
  ArchiveRecord,
  TransactionRecord,
  InventoryRecord,
  AnnouncementRecord,
} from '../../types';
import { DPL_SUPERVISOR } from '../../data/mockData';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { FileUploader } from '../common/FileUploader';
import {
  Shield,
  Users,
  Mail,
  Lock,
  Globe,
  Database,
  Activity,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Download,
  ShieldCheck,
  Check,
  FileText,
  Edit3,
  Ban,
  RotateCcw,
  UserX,
  X,
  Layers,
  Calendar,
  CheckSquare,
  GitPullRequest,
  MapPin,
  ClipboardList,
  Briefcase,
  DollarSign,
  Package,
  Megaphone,
  Camera,
  FolderArchive,
  GraduationCap,
  History,
  AlertTriangle,
} from 'lucide-react';

import { DplSupervisionAdminView } from './DplSupervisionAdminView';

interface AdminConsoleProps {
  initialTab?: AdminTab;
  members: Member[];
  programs: WorkProgram[];
  meetings?: MeetingItem[];
  decisions?: DecisionLogRecord[];
  tasks?: TaskItem[];
  villageResearch?: VillageResearchData;
  stakeholders?: StakeholderRecord[];
  surveys?: SurveyRecord[];
  documentation?: DocumentationPhoto[];
  reports?: ReportRecord[];
  archive?: ArchiveRecord[];
  transactions?: TransactionRecord[];
  inventory?: InventoryRecord[];
  announcements?: AnnouncementRecord[];
  publicArticles?: PublicArticleRecord[];
  unitConfig: UnitConfig;
  onUpdateUnitConfig?: (cfg: UnitConfig) => void;
  onUpdateMember: (m: Member) => Promise<void>;
  onAddProgram?: (p: WorkProgram) => Promise<void>;
  onUpdateProgram: (p: WorkProgram) => Promise<void>;
  onDeleteProgram?: (id: string) => Promise<void>;
  onAddMeeting?: (m: MeetingItem) => Promise<void>;
  onUpdateMeeting?: (m: MeetingItem) => Promise<void>;
  onDeleteMeeting?: (id: string) => Promise<void>;
  onAddDecision?: (d: DecisionLogRecord) => Promise<void>;
  onUpdateDecision?: (d: DecisionLogRecord) => Promise<void>;
  onDeleteDecision?: (id: string) => Promise<void>;
  onAddTask?: (t: TaskItem) => Promise<void>;
  onUpdateTask?: (t: TaskItem) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
  onUpdateVillageResearch?: (v: VillageResearchData) => Promise<void>;
  onAddStakeholder?: (s: StakeholderRecord) => Promise<void>;
  onUpdateStakeholder?: (s: StakeholderRecord) => Promise<void>;
  onDeleteStakeholder?: (id: string) => Promise<void>;
  onAddSurvey?: (s: SurveyRecord) => Promise<void>;
  onUpdateSurvey?: (s: SurveyRecord) => Promise<void>;
  onDeleteSurvey?: (id: string) => Promise<void>;
  onAddPhoto?: (photo: DocumentationPhoto) => Promise<void> | void;
  onUpdatePhoto?: (photo: DocumentationPhoto) => Promise<void> | void;
  onDeletePhoto?: (id: string) => Promise<void> | void;
  onAddReport?: (r: ReportRecord) => Promise<void>;
  onUpdateReport?: (r: ReportRecord) => Promise<void>;
  onDeleteReport?: (id: string) => Promise<void>;
  onAddArchive?: (a: ArchiveRecord) => Promise<void>;
  onUpdateArchive?: (a: ArchiveRecord) => Promise<void>;
  onDeleteArchive?: (id: string) => Promise<void>;
  onAddTransaction?: (tx: TransactionRecord) => Promise<void>;
  onUpdateTransaction?: (tx: TransactionRecord) => Promise<void>;
  onDeleteTransaction?: (id: string) => Promise<void>;
  onAddInventory?: (inv: InventoryRecord) => Promise<void>;
  onUpdateInventory?: (inv: InventoryRecord) => Promise<void>;
  onDeleteInventory?: (id: string) => Promise<void>;
  onAddAnnouncement?: (ann: AnnouncementRecord) => Promise<void>;
  onUpdateAnnouncement?: (ann: AnnouncementRecord) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
  onAddArticle?: (article: PublicArticleRecord) => Promise<void> | void;
  onUpdateArticle?: (article: PublicArticleRecord) => Promise<void> | void;
  onDeleteArticle?: (articleId: string) => Promise<void> | void;
  onSwitchToWorkspace: () => void;
  onSwitchToPublic: () => void;
}

type AdminTab =
  | 'overview'
  | 'users'
  | 'email-registration'
  | 'dpl-supervision'
  | 'crud-center'
  | 'public-content'
  | 'database'
  | 'activity-logs'
  | 'settings';

type CrudModuleKey =
  | 'meetings'
  | 'decisions'
  | 'tasks'
  | 'village'
  | 'stakeholders'
  | 'surveys'
  | 'programs'
  | 'documentation'
  | 'reports'
  | 'archive'
  | 'transactions'
  | 'inventory'
  | 'announcements'
  | 'articles';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  requireTypedText?: string;
  onConfirm: () => Promise<void> | void;
}

const DIVISIONS = [
  'Badan Pengurus Harian (BPH)',
  'Divisi Acara',
  'Divisi PDD',
  'Divisi Humper',
  'Divisi Konsumsi',
];

export const AdminConsoleView: React.FC<AdminConsoleProps> = ({
  initialTab,
  members,
  programs,
  meetings = [],
  decisions = [],
  tasks = [],
  villageResearch,
  stakeholders = [],
  surveys = [],
  documentation = [],
  reports = [],
  archive = [],
  transactions = [],
  inventory = [],
  announcements = [],
  publicArticles = [],
  unitConfig,
  onUpdateUnitConfig,
  onUpdateMember,
  onAddProgram,
  onUpdateProgram,
  onDeleteProgram,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateVillageResearch,
  onAddStakeholder,
  onUpdateStakeholder,
  onDeleteStakeholder,
  onAddSurvey,
  onUpdateSurvey,
  onDeleteSurvey,
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
  onAddReport,
  onUpdateReport,
  onDeleteReport,
  onAddArchive,
  onUpdateArchive,
  onDeleteArchive,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddInventory,
  onUpdateInventory,
  onDeleteInventory,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
  onSwitchToWorkspace,
  onSwitchToPublic,
}) => {
  const {
    user,
    registerMemberEmail,
    updateRegisteredEmail,
    disableMemberAccount,
    restoreMemberAccount,
    deleteMemberAccount,
    fetchRegisteredEmails,
    fetchActivityLogs,
    logAdminActivity,
  } = useAuth();

  const { confirm: globalConfirm, notify: globalNotify } = useConfirm();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [activeCrudModule, setActiveCrudModule] = useState<CrudModuleKey>('meetings');

  // Single Notification System (delegates to centralized ConfirmContext)
  const pushToast = useCallback(
    (type: NotificationItem['type'], title: string, message: string) => {
      globalNotify({ type, title, message });
    },
    [globalNotify]
  );

  // Confirmation Dialog State (delegates to centralized ConfirmContext)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmTypedInput, setConfirmTypedInput] = useState('');
  const [isConfirmExecuting, setIsConfirmExecuting] = useState(false);

  const openConfirmDialog = async (cfg: Omit<ConfirmDialogState, 'isOpen'>) => {
    const ok = await globalConfirm({
      title: cfg.title,
      description: cfg.description,
      level: cfg.requireTypedText
        ? 'irreversible'
        : cfg.variant === 'danger'
        ? 'warning'
        : 'ordinary',
      confirmLabel: cfg.confirmLabel,
      requireTypeConfirmation: cfg.requireTypedText,
    });
    if (ok) {
      try {
        await cfg.onConfirm();
      } catch (err: any) {
        pushToast('error', 'Operasi Gagal', err?.message || 'Terjadi kesalahan sistem.');
      }
    }
  };

  const executeConfirmDialog = async () => {
    if (!confirmDialog) return;
    if (
      confirmDialog.requireTypedText &&
      confirmTypedInput.trim() !== confirmDialog.requireTypedText
    ) {
      return;
    }
    setIsConfirmExecuting(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (err: any) {
      pushToast('error', 'Operasi Gagal', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsConfirmExecuting(false);
    }
  };

  // Registered Emails & Logs State
  const [registeredEmails, setRegisteredEmails] = useState<RegisteredEmailRecord[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [logs, setLogs] = useState<AdminActivityLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // DPL Supervisor State (Separate from the 10-student roster)
  const [dplRecord, setDplRecord] = useState(DPL_SUPERVISOR);
  const [isEditingDpl, setIsEditingDpl] = useState(false);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'pending' | 'unregistered' | 'disabled'>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [crudSearch, setCrudSearch] = useState('');

  // Registration Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regDivision, setRegDivision] = useState('Divisi Acara');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Member Profile & Email Edit Modal State
  const [editingMemberModal, setEditingMemberModal] = useState<Member | null>(null);
  const [editMemName, setEditMemName] = useState('');
  const [editMemRole, setEditMemRole] = useState('');
  const [editMemDivision, setEditMemDivision] = useState('');
  const [editMemEmail, setEditMemEmail] = useState('');
  const [editMemPhone, setEditMemPhone] = useState('');
  const [editMemNim, setEditMemNim] = useState('');
  const [editMemMajor, setEditMemMajor] = useState('');
  const [editMemFaculty, setEditMemFaculty] = useState('');
  const [editMemAvatar, setEditMemAvatar] = useState('');
  const [editMemResponsibilities, setEditMemResponsibilities] = useState('');
  const [isSavingMemberModal, setIsSavingMemberModal] = useState(false);

  // Admin Accounts for privilege resolution
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);

  // Email Reset State: "Hapus Email" (Remove)
  const [removeEmailTarget, setRemoveEmailTarget] = useState<(Member & { regRecord?: RegisteredEmailRecord }) | null>(null);
  const [removeConfirmName, setRemoveConfirmName] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);

  // Email Reset State: "Ganti Email" (Replace)
  const [replaceEmailTarget, setReplaceEmailTarget] = useState<(Member & { regRecord?: RegisteredEmailRecord }) | null>(null);
  const [replaceNewEmail, setReplaceNewEmail] = useState('');
  const [replaceConfirmName, setReplaceConfirmName] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  // Email Direct Registration Modal State: "Daftarkan Email"
  const [registerEmailTarget, setRegisterEmailTarget] = useState<Member | null>(null);
  const [registerTargetEmailVal, setRegisterTargetEmailVal] = useState('');
  const [isSubmittingRegisterTarget, setIsSubmittingRegisterTarget] = useState(false);

  // Dedicated Read-Only Member Email History Panel State
  const [emailHistoryTarget, setEmailHistoryTarget] = useState<Member | null>(null);
  const [memberEmailHistoryList, setMemberEmailHistoryList] = useState<any[]>([]);
  const [isLoadingEmailHistory, setIsLoadingEmailHistory] = useState(false);

  // Member Account History Modal (Legacy Logs Viewer)
  const [historyMember, setHistoryMember] = useState<Member | null>(null);

  // Edit Registered Email Modal State
  const [editingRegRecord, setEditingRegRecord] = useState<RegisteredEmailRecord | null>(null);
  const [editRegEmailVal, setEditRegEmailVal] = useState('');
  const [editRegNameVal, setEditRegNameVal] = useState('');
  const [editRegPosVal, setEditRegPosVal] = useState('');
  const [editRegDivVal, setEditRegDivVal] = useState('');

  // Generic CRUD Editor Modal State
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [crudEditMode, setCrudEditMode] = useState<'create' | 'edit'>('create');
  const [crudDraft, setCrudDraft] = useState<Record<string, any>>({});

  // UnitConfig Editor State
  const [configDraft, setConfigDraft] = useState<UnitConfig>(unitConfig);
  useEffect(() => {
    setConfigDraft(unitConfig);
  }, [unitConfig]);

  // Load Registered Emails, Activity Logs & Admin Accounts
  const loadData = async () => {
    setIsLoadingEmails(true);
    setIsLoadingLogs(true);
    try {
      const [emailList, logList] = await Promise.all([
        fetchRegisteredEmails(),
        fetchActivityLogs(),
      ]);
      setRegisteredEmails(emailList);
      setLogs(logList);

      if (isSupabaseConfigured) {
        try {
          const { data: adminData } = await supabase.from('admin_accounts').select('*');
          if (Array.isArray(adminData)) {
            setAdminAccounts(adminData);
          }
        } catch (err) {
          console.warn('admin_accounts fetch notice:', err);
        }
      }
    } catch (err) {
      console.warn('Admin console data load notice:', err);
    } finally {
      setIsLoadingEmails(false);
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reconcile each of the 10 authoritative members strictly using exact member_id
  const enrichedMembers = useMemo(() => {
    return members.map((m) => {
      // 1. Strict match on memberId ONLY (Never match by name or fallback email)
      const matchedReg = registeredEmails.find(
        (r) => String(r.memberId || (r as any).member_id || '').trim() === String(m.id).trim()
      );

      // 2. Email resolution: ONLY m-4 defaults to abhyy333@gmail.com. All others strictly come from matchedReg
      let confirmedEmail = '';
      if (m.id === 'm-4') {
        confirmedEmail = 'abhyy333@gmail.com';
      } else if (matchedReg?.email) {
        confirmedEmail = matchedReg.email.trim();
      }

      // 3. Status resolution
      let resolvedStatus: 'unregistered' | 'pending' | 'active' | 'disabled' = 'unregistered';
      if (m.id === 'm-4' || confirmedEmail.toLowerCase() === 'abhyy333@gmail.com') {
        resolvedStatus = 'active';
      } else if (matchedReg?.status === 'disabled' || m.accountStatus === 'disabled') {
        resolvedStatus = 'disabled';
      } else if (
        matchedReg?.status === 'activated' ||
        (confirmedEmail && (m.accountStatus === 'active' || m.authUid))
      ) {
        resolvedStatus = 'active';
      } else if (confirmedEmail) {
        resolvedStatus = 'pending';
      } else {
        resolvedStatus = 'unregistered';
      }

      // 4. Admin privilege resolution using exact members.auth_user_id matching admin_accounts.user_id
      // ONLY Abdul Habir Al Majdi (m-4 / abhyy333@gmail.com) displays super_admin badge
      // Asma Nadiya (m-5) must NOT receive an admin badge!
      let resolvedSystemRole: 'super_admin' | 'admin' | 'member' = 'member';
      if (m.id === 'm-4' || confirmedEmail.toLowerCase() === 'abhyy333@gmail.com') {
        resolvedSystemRole = 'super_admin';
      } else {
        const authUid = m.authUid || (m as any).auth_user_id;
        if (authUid && adminAccounts.length > 0) {
          const adminAcct = adminAccounts.find(
            (a) =>
              (a.user_id === authUid || a.auth_user_id === authUid) &&
              a.is_active !== false &&
              (a.role === 'super_admin' || a.role === 'admin')
          );
          if (adminAcct) {
            resolvedSystemRole = adminAcct.role === 'admin' ? 'admin' : 'super_admin';
          }
        }
      }

      return {
        ...m,
        email: confirmedEmail,
        registeredEmail: confirmedEmail || undefined,
        accountStatus: resolvedStatus,
        systemRole: resolvedSystemRole,
        regRecord: matchedReg,
      };
    });
  }, [members, registeredEmails, adminAccounts]);

  // Helper: Check if a member is protected from disable/delete (logged-in super_admin or last super_admin)
  const isProtectedSuperAdmin = (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    const emailLower = (m.email || '').trim().toLowerCase();
    const currentEmailLower = (user?.email || 'abhyy333@gmail.com').trim().toLowerCase();
    if (m.id === 'm-4' || emailLower === 'abhyy333@gmail.com') return true;
    if (emailLower && emailLower === currentEmailLower) return true;
    if (m.systemRole === 'super_admin') {
      const activeAdmins = enrichedMembers.filter(
        (item) => item.systemRole === 'super_admin' && item.accountStatus !== 'disabled'
      );
      if (activeAdmins.length <= 1) return true;
    }
    return false;
  };

  // ---------------------------------------------------------------------------
  // EMAIL MANAGEMENT ACTIONS (Hapus Email, Ganti Email, Daftarkan Email, Riwayat)
  // ---------------------------------------------------------------------------

  // 1. Open "Hapus Email" Modal
  const handleOpenRemoveEmail = (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    if (isProtectedSuperAdmin(m)) {
      pushToast('error', 'Aksi Ditolak', 'Akun Super Admin utama (Abdul Habir Al Majdi) dilindungi dan tidak dapat dihapus.');
      return;
    }
    setRemoveEmailTarget(m);
    setRemoveConfirmName('');
    setRemoveReason('');
  };

  // Execute "Hapus Email" (Remove)
  const handleExecuteRemoveEmail = async () => {
    if (!removeEmailTarget) return;

    // Sanity check: Ensure target actually has an assigned email
    if (!removeEmailTarget.email && !removeEmailTarget.regRecord) {
      pushToast(
        'error',
        'Peringatan',
        'Anggota ini belum memiliki email terdaftar. Tidak ada data yang dihapus.'
      );
      setRemoveEmailTarget(null);
      return;
    }

    if (removeConfirmName.trim().toLowerCase() !== removeEmailTarget.name.trim().toLowerCase()) {
      pushToast('error', 'Konfirmasi Nama Tidak Cocok', `Ketik nama lengkap "${removeEmailTarget.name}" dengan tepat untuk mengonfirmasi.`);
      return;
    }

    setIsSubmittingRemove(true);
    try {
      let edgeSuccess = false;
      let edgeErrorMsg = '';

      // Invoke Supabase Edge Function: admin-reset-member-email
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data, error } = await supabase.functions.invoke('admin-reset-member-email', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              project_id: 'scslevzuxxkfcuvwbtty',
              member_id: removeEmailTarget.id,
              action: 'remove',
              confirm_member_name: removeConfirmName.trim(),
              reason: removeReason.trim() || undefined,
            },
          });
          if (!error && (data?.success || (!data?.error && data?.action === 'remove'))) {
            edgeSuccess = true;
          } else if (error) {
            let detail = error.message;
            try {
              const errBody = await (error as any).context?.json();
              if (errBody?.error) detail = errBody.error;
            } catch {}
            edgeErrorMsg = detail;
          } else if (data?.error) {
            edgeErrorMsg = data.error;
          }
        } catch (err: any) {
          edgeErrorMsg = err?.message || 'Gagal memanggil Edge Function';
        }
      }

      // Local server API fallback if Edge Function wasn't invoked
      if (!edgeSuccess && !isSupabaseConfigured) {
        try {
          const res = await fetch('/api/admin/reset-member-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'remove',
              member_id: removeEmailTarget.id,
              confirm_member_name: removeConfirmName.trim(),
              reason: removeReason.trim() || undefined,
              actorEmail: user?.email || 'abhyy333@gmail.com',
            }),
          });
          const resData = await res.json();
          if (res.ok && resData.success) {
            edgeSuccess = true;
          } else {
            edgeErrorMsg = resData.error || 'Server error';
          }
        } catch (srvErr: any) {
          edgeErrorMsg = srvErr?.message || 'Gagal terhubung ke server';
        }
      }

      if (!edgeSuccess) {
        pushToast('error', 'Gagal Menghapus Email', edgeErrorMsg || 'Terjadi kesalahan saat menghapus email.');
        setIsSubmittingRemove(false);
        return;
      }

      // Refetch fresh database state
      await loadData();

      // Update parent state
      await onUpdateMember({
        ...removeEmailTarget,
        email: '',
        registeredEmail: undefined,
        authUid: undefined,
        accountStatus: 'pending',
        acceptedAt: undefined,
      });

      await logAdminActivity(
        'REMOVE_MEMBER_EMAIL',
        `${removeEmailTarget.name} (${removeEmailTarget.id})`,
        `Alamat email login dan akun autentikasi dihapus. Profil dipertahankan. Alasan: ${removeReason || 'Reset email'}`
      );

      setRemoveEmailTarget(null);
      setRemoveConfirmName('');
      setRemoveReason('');

      // Display EXACTLY ONE success toast
      pushToast(
        'success',
        'Email Berhasil Dihapus',
        `Alamat email untuk ${removeEmailTarget.name} telah dihapus. Profil anggota tetap dipertahankan dan status akun kembali ke Menunggu Aktivasi.`
      );
    } catch (err: any) {
      pushToast('error', 'Gagal Menghapus Email', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  // 2. Open "Ganti Email" Modal
  const handleOpenReplaceEmail = (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    if (isProtectedSuperAdmin(m)) {
      pushToast('error', 'Aksi Ditolak', 'Akun Super Admin utama (Abdul Habir Al Majdi) dilindungi dan tidak dapat direset.');
      return;
    }
    setReplaceEmailTarget(m);
    setReplaceNewEmail('');
    setReplaceConfirmName('');
    setReplaceReason('');
  };

  // Execute "Ganti Email" (Replace)
  const handleExecuteReplaceEmail = async () => {
    if (!replaceEmailTarget) return;
    const cleanNewEmail = replaceNewEmail.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@')) {
      pushToast('error', 'Format Email Tidak Valid', 'Masukkan alamat email yang valid.');
      return;
    }

    // Uniqueness validation
    const duplicate = registeredEmails.find(
      (r) =>
        r.email.trim().toLowerCase() === cleanNewEmail &&
        String(r.memberId || (r as any).member_id) !== String(replaceEmailTarget.id)
    );
    if (duplicate) {
      pushToast(
        'error',
        'Email Sudah Digunakan',
        `Alamat email "${cleanNewEmail}" sudah terdaftar untuk anggota ${duplicate.name}. Setiap anggota harus memiliki alamat email yang unik.`
      );
      return;
    }

    if (replaceConfirmName.trim().toLowerCase() !== replaceEmailTarget.name.trim().toLowerCase()) {
      pushToast('error', 'Konfirmasi Nama Tidak Cocok', `Ketik nama lengkap "${replaceEmailTarget.name}" dengan tepat untuk mengonfirmasi.`);
      return;
    }

    setIsSubmittingReplace(true);
    try {
      let edgeSuccess = false;
      let edgeErrorMsg = '';

      // Invoke Supabase Edge Function: admin-reset-member-email
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data, error } = await supabase.functions.invoke('admin-reset-member-email', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              project_id: 'scslevzuxxkfcuvwbtty',
              member_id: replaceEmailTarget.id,
              action: 'replace',
              new_email: cleanNewEmail,
              confirm_member_name: replaceConfirmName.trim(),
              reason: replaceReason.trim() || undefined,
            },
          });
          if (!error && (data?.success || (!data?.error && data?.action === 'replace'))) {
            edgeSuccess = true;
          } else if (error) {
            let detail = error.message;
            try {
              const errBody = await (error as any).context?.json();
              if (errBody?.error) detail = errBody.error;
            } catch {}
            edgeErrorMsg = detail;
          } else if (data?.error) {
            edgeErrorMsg = data.error;
          }
        } catch (err: any) {
          edgeErrorMsg = err?.message || 'Gagal memanggil Edge Function';
        }
      }

      // Local server API fallback
      if (!edgeSuccess && !isSupabaseConfigured) {
        try {
          const res = await fetch('/api/admin/reset-member-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'replace',
              member_id: replaceEmailTarget.id,
              new_email: cleanNewEmail,
              confirm_member_name: replaceConfirmName.trim(),
              reason: replaceReason.trim() || undefined,
              actorEmail: user?.email || 'abhyy333@gmail.com',
            }),
          });
          const resData = await res.json();
          if (res.ok && resData.success) {
            edgeSuccess = true;
          } else {
            edgeErrorMsg = resData.error || 'Server error';
          }
        } catch (srvErr: any) {
          edgeErrorMsg = srvErr?.message || 'Gagal terhubung ke server';
        }
      }

      if (!edgeSuccess) {
        pushToast('error', 'Gagal Mengganti Email', edgeErrorMsg || 'Proses penggantian email tidak dapat diselesaikan.');
        setIsSubmittingReplace(false);
        return;
      }

      // Refetch fresh database records
      await loadData();

      // Update parent state
      await onUpdateMember({
        ...replaceEmailTarget,
        email: cleanNewEmail,
        registeredEmail: cleanNewEmail,
        authUid: undefined,
        accountStatus: 'pending',
        acceptedAt: undefined,
      });

      await logAdminActivity(
        'REPLACE_MEMBER_EMAIL',
        `${replaceEmailTarget.name} (${cleanNewEmail})`,
        `Email login diganti dari (${replaceEmailTarget.email || 'kosong'}) ke (${cleanNewEmail}). Status: Menunggu Aktivasi.`
      );

      setReplaceEmailTarget(null);
      setReplaceNewEmail('');
      setReplaceConfirmName('');
      setReplaceReason('');

      // Display EXACTLY ONE success toast
      pushToast(
        'success',
        'Email Berhasil Diganti',
        `Email baru ${cleanNewEmail} telah didaftarkan untuk ${replaceEmailTarget.name}. Anggota harus melakukan aktivasi ulang.`
      );
    } catch (err: any) {
      pushToast('error', 'Gagal Mengganti Email', err?.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmittingReplace(false);
    }
  };

  // 3. Open Direct Email Registration for Member ("Daftarkan Email")
  const handleOpenRegisterTargetEmail = (m: Member) => {
    setRegisterEmailTarget(m);
    setRegisterTargetEmailVal('');
  };

  // Execute Direct Email Registration
  const handleExecuteRegisterTargetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmailTarget) return;
    const cleanEmail = registerTargetEmailVal.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      pushToast('error', 'Format Email Tidak Valid', 'Masukkan alamat email yang valid.');
      return;
    }

    // Uniqueness validation
    const duplicate = registeredEmails.find(
      (r) =>
        r.email.trim().toLowerCase() === cleanEmail &&
        String(r.memberId || (r as any).member_id) !== String(registerEmailTarget.id)
    );
    if (duplicate) {
      pushToast(
        'error',
        'Email Sudah Digunakan',
        `Alamat email "${cleanEmail}" sudah terdaftar untuk anggota ${duplicate.name}. Gunakan alamat email unik.`
      );
      return;
    }

    setIsSubmittingRegisterTarget(true);
    try {
      const created = await registerMemberEmail(
        registerEmailTarget.name,
        cleanEmail,
        registerEmailTarget.position || registerEmailTarget.role,
        registerEmailTarget.division,
        registerEmailTarget.id
      );

      await onUpdateMember({
        ...registerEmailTarget,
        email: cleanEmail,
        registeredEmail: cleanEmail,
        accountStatus: registerEmailTarget.id === 'm-4' ? 'active' : 'pending',
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.from('member_email_history').insert({
            member_id: registerEmailTarget.id,
            member_name: registerEmailTarget.name,
            previous_email: null,
            replacement_email: cleanEmail,
            action: 'REGISTER',
            performed_by: user?.email || 'abhyy333@gmail.com',
            reason: 'Pendaftaran email pertama kali oleh Super Admin',
            created_at: new Date().toISOString(),
          });
        } catch {}
      }

      await loadData();
      setRegisterEmailTarget(null);
      setRegisterTargetEmailVal('');
      pushToast(
        'success',
        'Email Berhasil Didaftarkan',
        `Alamat email ${cleanEmail} telah terdaftar untuk ${registerEmailTarget.name}. Status: Menunggu Aktivasi.`
      );
    } catch (err: any) {
      if (err?.message?.includes('unique') || err?.code === '23505') {
        pushToast('error', 'Email Sudah Digunakan', `Alamat email "${cleanEmail}" sudah digunakan.`);
      } else {
        pushToast('error', 'Gagal Mendaftarkan Email', err?.message || 'Terjadi kesalahan.');
      }
    } finally {
      setIsSubmittingRegisterTarget(false);
    }
  };

  // 4. Open Dedicated Read-Only History Panel ("Riwayat Email")
  const handleOpenEmailHistory = async (m: Member) => {
    setEmailHistoryTarget(m);
    setIsLoadingEmailHistory(true);
    try {
      let historyRows: any[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('member_email_history')
            .select('*')
            .eq('member_id', m.id)
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            historyRows = data;
          }
        } catch (sbErr) {
          console.warn('member_email_history fetch notice:', sbErr);
        }
      }

      if (historyRows.length === 0) {
        try {
          const res = await fetch(`/api/admin/email-history/${m.id}`);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.history)) {
              historyRows = json.history;
            }
          }
        } catch {}
      }

      // If still empty and it's m-4, provide initial bootstrap record
      if (historyRows.length === 0 && m.id === 'm-4') {
        historyRows = [
          {
            id: 'hist-boot-4',
            member_id: 'm-4',
            member_name: 'Abdul Habir Al Majdi',
            previous_email: null,
            replacement_email: 'abhyy333@gmail.com',
            action: 'REGISTER',
            performed_by: 'system@kknspace.id',
            reason: 'Bootstrap akun Super Admin resmi',
            created_at: '2026-07-19T08:30:00.000Z',
          },
        ];
      }

      setMemberEmailHistoryList(historyRows);
    } catch (err) {
      console.warn('Load email history error:', err);
    } finally {
      setIsLoadingEmailHistory(false);
    }
  };

  // Open Member Profile & Email Edit Modal
  const openEditMemberModal = (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    setEditingMemberModal(m);
    setEditMemName(m.name);
    setEditMemRole(m.role);
    setEditMemDivision(m.division);
    setEditMemEmail(m.email || '');
    setEditMemPhone(m.phone || '');
    setEditMemNim(m.nim || '');
    setEditMemMajor(m.major || '');
    setEditMemFaculty(m.faculty || 'Universitas Mataram');
    setEditMemAvatar(m.avatar || '');
    setEditMemResponsibilities((m.responsibilities || []).join('\n'));
  };

  // Save Member Profile & Email Changes
  const handleSaveMemberProfileAndEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemberModal) return;
    setIsSavingMemberModal(true);

    try {
      const cleanEmail = editMemEmail.trim().toLowerCase();
      const prevEmail = (editingMemberModal.email || '').trim().toLowerCase();

      // If administrator entered or changed the member's email, register/update in registered_emails
      let nextAccountStatus = editingMemberModal.accountStatus;
      if (cleanEmail) {
        // Enforce uniqueness
        const duplicate = registeredEmails.find(
          (r) =>
            r.email.trim().toLowerCase() === cleanEmail &&
            String(r.memberId || (r as any).member_id) !== String(editingMemberModal.id)
        );
        if (duplicate) {
          pushToast(
            'error',
            'Email Sudah Digunakan',
            `Alamat email "${cleanEmail}" sudah terdaftar untuk anggota ${duplicate.name}. Gunakan alamat email unik.`
          );
          setIsSavingMemberModal(false);
          return;
        }

        const existingReg = registeredEmails.find(
          (r) => String(r.memberId || (r as any).member_id) === String(editingMemberModal.id)
        );

        if (existingReg) {
          await updateRegisteredEmail(existingReg.id, {
            email: cleanEmail,
            name: editMemName.trim(),
            position: editMemRole.trim(),
            division: editMemDivision,
          });
          if (cleanEmail !== prevEmail && editingMemberModal.id !== 'm-4') {
            nextAccountStatus = 'pending';
          }
        } else {
          await registerMemberEmail(
            editMemName.trim(),
            cleanEmail,
            editMemRole.trim(),
            editMemDivision,
            editingMemberModal.id
          );
          nextAccountStatus = editingMemberModal.id === 'm-4' ? 'active' : 'pending';
        }
      } else if (editingMemberModal.id !== 'm-4') {
        nextAccountStatus = 'unregistered';
      }

      const updatedMember: Member = {
        ...editingMemberModal,
        name: editMemName.trim(),
        role: editMemRole.trim(),
        position: editMemRole.trim(),
        division: editMemDivision,
        email: editingMemberModal.id === 'm-4' ? 'abhyy333@gmail.com' : cleanEmail,
        registeredEmail:
          editingMemberModal.id === 'm-4' ? 'abhyy333@gmail.com' : cleanEmail || undefined,
        phone: editMemPhone.trim(),
        nim: editMemNim.trim(),
        major: editMemMajor.trim(),
        faculty: editMemFaculty.trim(),
        avatar: editMemAvatar || editingMemberModal.avatar,
        accountStatus: editingMemberModal.id === 'm-4' ? 'active' : nextAccountStatus,
        responsibilities: editMemResponsibilities
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await onUpdateMember(updatedMember);
      await logAdminActivity(
        'UPDATE_MEMBER_PROFILE',
        `${updatedMember.name} (${updatedMember.role})`,
        `Memperbarui profil & email anggota. Email: ${updatedMember.email || 'Belum Didaftarkan'}`
      );
      await loadData();
      setEditingMemberModal(null);
      pushToast(
        'success',
        'Data Anggota Diperbarui',
        `Profil dan email untuk ${updatedMember.name} berhasil disimpan ke Supabase.`
      );
    } catch (err: any) {
      pushToast('error', 'Gagal Menyimpan Profil', err?.message || 'Terjadi kesalahan.');
    } finally {
      setIsSavingMemberModal(false);
    }
  };

  // Handle Account Disable
  const handlePromptDisableAccount = (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    if (isProtectedSuperAdmin(m)) {
      pushToast(
        'error',
        'Aksi Ditolak',
        'Akun Super Admin utama atau akun yang sedang login tidak dapat dinonaktifkan.'
      );
      return;
    }

    openConfirmDialog({
      title: `Nonaktifkan Akun ${m.name}?`,
      description: `Akses login Supabase Auth untuk ${m.name} (${m.email || 'Tanpa Email'}) akan dicabut sementara dan status akun pada registered_emails, member_access, serta members akan diubah menjadi Dinonaktifkan. Seluruh riwayat tugas dan rapat tetap aman.`,
      confirmLabel: 'Ya, Nonaktifkan Akun',
      variant: 'warning',
      onConfirm: async () => {
        await disableMemberAccount(
          m.email || m.id,
          'Dinonaktifkan oleh Super Admin melalui Admin Console'
        );
        await onUpdateMember({
          ...m,
          accountStatus: 'disabled',
          disabledAt: new Date().toISOString(),
        });
        await loadData();
        pushToast(
          'warning',
          'Akun Dinonaktifkan',
          `Akses akun ${m.name} berhasil dinonaktifkan.`
        );
      },
    });
  };

  // Handle Account Restore
  const handleRestoreAccount = async (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    try {
      await restoreMemberAccount(m.email || m.id);
      const nextStatus = m.authUid ? 'active' : 'pending';
      await onUpdateMember({
        ...m,
        accountStatus: nextStatus,
        disabledAt: undefined,
      });
      await loadData();
      pushToast(
        'success',
        'Akun Dipulihkan',
        `Akun ${m.name} telah diaktifkan kembali (${nextStatus === 'active' ? 'Aktif' : 'Menunggu Aktivasi'}).`
      );
    } catch (err: any) {
      pushToast('error', 'Gagal Memulihkan Akun', err?.message || 'Terjadi kesalahan.');
    }
  };

  // Handle Permanent Auth Account Deletion
  const handlePromptDeleteAuthAccount = (m: Member & { regRecord?: RegisteredEmailRecord }) => {
    if (isProtectedSuperAdmin(m)) {
      pushToast(
        'error',
        'Aksi Ditolak',
        'Akun Super Admin utama atau Super Admin terakhir tidak dapat dihapus.'
      );
      return;
    }

    openConfirmDialog({
      title: `Hapus Permanen Akun Auth — ${m.name}`,
      description: `Tindakan ini akan menghapus akun pengguna dari Supabase Auth melalui Edge Function Admin API serta menghapus pendaftaran email (${m.email || '-'}) dari tabel registered_emails dan member_access. Profil posisi anggota di tim KKN serta seluruh riwayat tugas, rapat, survei, dan laporan tetap dipertahankan secara utuh.`,
      confirmLabel: 'Hapus Akun Auth Permanen',
      variant: 'danger',
      requireTypedText: 'HAPUS',
      onConfirm: async () => {
        await deleteMemberAccount(m.email || m.id);
        await onUpdateMember({
          ...m,
          email: '',
          registeredEmail: undefined,
          authUid: undefined,
          accountStatus: 'unregistered',
          acceptedAt: undefined,
          disabledAt: undefined,
        });
        await loadData();
        pushToast(
          'success',
          'Akun Auth Dihapus Permanen',
          `Akun login dan registrasi email ${m.name} telah dihapus. Status kembali ke "Belum Didaftarkan" & riwayat kontribusi tetap tersimpan.`
        );
      },
    });
  };

  // Handle Quick Member Selection in Email Registration Form
  const handleMemberSelectForReg = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const memId = e.target.value;
    setSelectedMemberId(memId);
    const found = enrichedMembers.find((m) => m.id === memId);
    if (found) {
      setRegName(found.name);
      setRegPosition(found.role);
      setRegDivision(found.division);
      setRegEmail(found.email || '');
    }
  };

  // Submit New or Updated Email Registration
  const handleRegisterEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReg(true);

    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        pushToast('error', 'Format Email Tidak Valid', 'Masukkan alamat email yang valid.');
        setIsSubmittingReg(false);
        return;
      }

      // Enforce uniqueness across registered_emails
      const duplicate = registeredEmails.find(
        (r) =>
          r.email.trim().toLowerCase() === cleanEmail &&
          String(r.memberId || (r as any).member_id) !== String(selectedMemberId)
      );
      if (duplicate) {
        pushToast(
          'error',
          'Email Sudah Digunakan',
          `Alamat email "${cleanEmail}" sudah terdaftar untuk anggota ${duplicate.name}. Setiap anggota harus memiliki alamat email yang unik.`
        );
        setIsSubmittingReg(false);
        return;
      }

      const created = await registerMemberEmail(
        regName.trim(),
        cleanEmail,
        regPosition.trim(),
        regDivision,
        selectedMemberId || undefined
      );

      // Strictly update the matching member by member_id
      const targetMemId = selectedMemberId || created.memberId;
      const targetMem = members.find((m) => m.id === targetMemId);
      if (targetMem) {
        await onUpdateMember({
          ...targetMem,
          email: created.email,
          registeredEmail: created.email,
          accountStatus: targetMem.id === 'm-4' ? 'active' : 'pending',
        });
      }

      if (isSupabaseConfigured && targetMemId) {
        try {
          await supabase.from('member_email_history').insert({
            member_id: targetMemId,
            member_name: regName.trim(),
            previous_email: null,
            replacement_email: cleanEmail,
            action: 'REGISTER',
            performed_by: user?.email || 'abhyy333@gmail.com',
            reason: 'Pendaftaran email melalui Tab Registrasi Email',
            created_at: new Date().toISOString(),
          });
        } catch {}
      }

      await loadData();
      pushToast(
        'success',
        'Email Berhasil Didaftarkan',
        `Email ${created.email} terdaftar resmi untuk ${created.name} (${created.position}).`
      );

      setRegName('');
      setRegEmail('');
      setRegPosition('');
      setSelectedMemberId('');
    } catch (err: any) {
      if (err?.message?.includes('unique') || err?.code === '23505') {
        pushToast('error', 'Email Sudah Digunakan', 'Alamat email sudah digunakan oleh anggota lain dalam database. Gunakan alamat email unik.');
      } else {
        pushToast('error', 'Gagal Mendaftarkan Email', err?.message || 'Terjadi kesalahan.');
      }
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Save Edited RegisteredEmailRecord from Table Modal
  const handleSaveEditedRegRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegRecord) return;
    try {
      const cleanEmail = editRegEmailVal.trim().toLowerCase();
      await updateRegisteredEmail(editingRegRecord.id, {
        email: cleanEmail,
        name: editRegNameVal.trim(),
        position: editRegPosVal.trim(),
        division: editRegDivVal,
      });

      const targetMem = members.find((m) => m.id === editingRegRecord.memberId);
      if (targetMem) {
        await onUpdateMember({
          ...targetMem,
          name: editRegNameVal.trim(),
          role: editRegPosVal.trim(),
          division: editRegDivVal,
          email: cleanEmail,
          registeredEmail: cleanEmail,
        });
      }

      await loadData();
      setEditingRegRecord(null);
      pushToast(
        'success',
        'Registrasi Email Diperbarui',
        `Data email untuk ${editRegNameVal} berhasil diperbarui.`
      );
    } catch (err: any) {
      pushToast('error', 'Gagal Memperbarui Email', err?.message || 'Terjadi kesalahan.');
    }
  };

  // Filtered Lists
  const filteredMembers = useMemo(() => {
    return enrichedMembers.filter((m) => {
      if (userStatusFilter !== 'all' && m.accountStatus !== userStatusFilter) {
        return false;
      }
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.division.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
      );
    });
  }, [enrichedMembers, userSearch, userStatusFilter]);

  const filteredRegisteredEmails = useMemo(() => {
    if (!emailSearch.trim()) return registeredEmails;
    const q = emailSearch.toLowerCase();
    return registeredEmails.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q) ||
        r.division.toLowerCase().includes(q)
    );
  }, [registeredEmails, emailSearch]);

  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return logs;
    const q = logSearch.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.adminEmail.toLowerCase().includes(q)
    );
  }, [logs, logSearch]);

  // Status summary counts
  const activeCount = enrichedMembers.filter((m) => m.accountStatus === 'active').length;
  const pendingActivationCount = enrichedMembers.filter((m) => m.accountStatus === 'pending').length;
  const unregisteredCount = enrichedMembers.filter((m) => m.accountStatus === 'unregistered').length;
  const disabledCount = enrichedMembers.filter((m) => m.accountStatus === 'disabled').length;

  // Export Full Database Snapshot
  const handleExportDatabaseSnapshot = () => {
    const dump = {
      exportedAt: new Date().toISOString(),
      supabaseProject: 'scslevzuxxkfcuvwbtty',
      exportedBy: user?.email || 'abhyy333@gmail.com',
      unitConfig,
      dplSupervisor: dplRecord,
      members: enrichedMembers,
      registeredEmails,
      meetings,
      decisions,
      tasks,
      villageResearch,
      stakeholders,
      surveys,
      programs,
      documentation,
      reports,
      archive,
      transactions,
      inventory,
      announcements,
      publicArticles,
      activityLogs: logs,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute(
      'download',
      `kkn-space-supabase-snapshot-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    logAdminActivity(
      'DB_BACKUP_EXPORT',
      'Full Supabase JSON Snapshot',
      'Mengekspor cadangan lengkap seluruh modul KKN SPACE'
    );
    pushToast('success', 'Snapshot Diekspor', 'Berkas JSON basis data lengkap berhasil diunduh.');
  };

  // ============================================================================
  // FULL CRUD CENTER HELPERS ACROSS ALL 15 MODULES
  // ============================================================================
  const openCreateCrudModal = (moduleKey: CrudModuleKey) => {
    setCrudEditMode('create');
    const today = new Date().toISOString().slice(0, 10);
    switch (moduleKey) {
      case 'meetings':
        setCrudDraft({
          id: `mtg-${Date.now()}`,
          title: '',
          date: today,
          time: '19:30 - 21:30 WITA',
          location: 'Posko KKN Desa Pringgasela Selatan',
          type: 'Internal Posko',
          status: 'upcoming',
          agendaText: '',
          notesSummary: '',
          isPrivate: false,
          documents: [],
        });
        break;
      case 'decisions':
        setCrudDraft({
          id: `dec-${Date.now()}`,
          title: '',
          date: today,
          category: 'Program Kerja',
          summary: '',
          agreedBy: 'Seluruh Anggota Tim KKN (10 Mahasiswa)',
          pic: 'Josua Ujung (Ketua)',
          deadline: today,
          implementationStatus: 'direncanakan',
        });
        break;
      case 'tasks':
        setCrudDraft({
          id: `tsk-${Date.now()}`,
          title: '',
          description: '',
          assignee: 'Abdul Habir Al Majdi',
          division: 'Divisi Acara',
          status: 'todo',
          priority: 'medium',
          dueDate: today,
          isPrivate: false,
          attachments: [],
        });
        break;
      case 'stakeholders':
        setCrudDraft({
          id: `stk-${Date.now()}`,
          name: '',
          role: '',
          dusun: 'Kantor Desa Pringgasela Selatan',
          category: 'Pemerintah Desa',
          phone: '+62 8',
          influence: 'Tinggi',
          notes: '',
        });
        break;
      case 'surveys':
        setCrudDraft({
          id: `srv-${Date.now()}`,
          title: '',
          category: 'Ekonomi & UMKM',
          objectName: '',
          dusun: 'Dusun Gubuk Lauk',
          date: today,
          surveyor: 'Abdul Habir Al Majdi',
          status: 'Terverifikasi',
          summaryFindings: '',
          existingProblemsText: '',
          potentialOpportunitiesText: '',
          isPublic: true,
          photos: [],
        });
        break;
      case 'programs':
        setCrudDraft({
          id: `prog-${Date.now()}`,
          code: `KKN-PRG-0${programs.length + 1}`,
          title: '',
          category: 'Unggulan',
          division: 'Divisi Acara',
          lead: 'Abdul Habir Al Majdi',
          status: 'in_progress',
          progressPercent: 50,
          location: 'Desa Pringgasela Selatan',
          startDate: today,
          endDate: today,
          budgetAllocated: 1500000,
          budgetUsed: 0,
          beneficiaries: 'Warga Desa Pringgasela Selatan',
          description: '',
          impactSummary: '',
          isFeaturedInPublic: true,
        });
        break;
      case 'documentation':
        setCrudDraft({
          id: `doc-${Date.now()}`,
          title: '',
          category: 'Program Kerja',
          date: today,
          location: 'Desa Pringgasela Selatan',
          photographer: 'Divisi PDD',
          imageUrl: '',
          caption: '',
          isFeaturedPublic: true,
        });
        break;
      case 'reports':
        setCrudDraft({
          id: `rep-${Date.now()}`,
          title: '',
          type: 'Mingguan',
          weekNumber: reports.length + 1,
          submittedDate: today,
          author: 'Mulia Oktaviani (Sekretaris)',
          status: 'Disetujui DPL',
          summary: '',
          achievementsText: '',
          fileUrl: '',
        });
        break;
      case 'archive':
        setCrudDraft({
          id: `arc-${Date.now()}`,
          code: `00${archive.length + 1}/KKN-PRG/VII/2026`,
          title: '',
          category: 'Surat Keluar',
          date: today,
          owner: 'Mulia Oktaviani (Sekretaris)',
          fileType: 'PDF',
          fileSize: '450 KB',
          description: '',
          fileUrl: '',
        });
        break;
      case 'transactions':
        setCrudDraft({
          id: `tx-${Date.now()}`,
          date: today,
          description: '',
          category: 'Program Kerja',
          type: 'expense',
          amount: 150000,
          Division: 'Divisi Acara',
          recordedBy: 'Tsaniatul Amni Alwan (Bendahara)',
          status: 'verified',
          receiptUrl: '',
        });
        break;
      case 'inventory':
        setCrudDraft({
          id: `inv-${Date.now()}`,
          name: '',
          category: 'Peralatan Posko',
          quantity: 1,
          unit: 'Unit',
          condition: 'Baik',
          source: 'Milik Tim',
          pic: 'Divisi PDD',
          notes: '',
        });
        break;
      case 'announcements':
        setCrudDraft({
          id: `ann-${Date.now()}`,
          title: '',
          category: 'Pengumuman Internal',
          content: '',
          authorName: 'Abdul Habir Al Majdi (Super Admin)',
          date: today,
          isPinned: false,
          isPublished: true,
        });
        break;
      case 'articles':
        setCrudDraft({
          id: `art-${Date.now()}`,
          title: '',
          category: 'Berita Kegiatan',
          summary: '',
          content: '',
          author: 'Tim KKN Pringgasela Selatan',
          date: today,
          dusun: 'Desa Pringgasela Selatan',
          coverImageUrl: '',
          isPublished: true,
        });
        break;
      default:
        break;
    }
    setIsCrudModalOpen(true);
  };

  const openEditCrudModal = (moduleKey: CrudModuleKey, item: any) => {
    setCrudEditMode('edit');
    if (moduleKey === 'meetings') {
      setCrudDraft({
        ...item,
        agendaText: (item.agenda || []).join('\n'),
      });
    } else if (moduleKey === 'surveys') {
      setCrudDraft({
        ...item,
        existingProblemsText: (item.existingProblems || []).join('\n'),
        potentialOpportunitiesText: (item.potentialOpportunities || []).join('\n'),
      });
    } else if (moduleKey === 'reports') {
      setCrudDraft({
        ...item,
        achievementsText: (item.achievements || []).join('\n'),
      });
    } else {
      setCrudDraft({ ...item });
    }
    setIsCrudModalOpen(true);
  };

  const handleSaveCrudModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCreate = crudEditMode === 'create';
    const actionType = isCreate ? 'ADMIN_CRUD_CREATE' : 'ADMIN_CRUD_UPDATE';

    try {
      switch (activeCrudModule) {
        case 'meetings': {
          const payload: MeetingItem = {
            ...(crudDraft as MeetingItem),
            agenda: String(crudDraft.agendaText || '')
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            attendeesCount: crudDraft.attendeesCount || 10,
            actionItems: crudDraft.actionItems || [],
          };
          if (isCreate) await onAddMeeting?.(payload);
          else await onUpdateMeeting?.(payload);
          await logAdminActivity(actionType, `Rapat: ${payload.title}`, `Tanggal: ${payload.date}`);
          break;
        }
        case 'decisions': {
          const payload = crudDraft as DecisionLogRecord;
          if (isCreate) await onAddDecision?.(payload);
          else await onUpdateDecision?.(payload);
          await logAdminActivity(actionType, `Keputusan: ${payload.title}`, `PIC: ${payload.pic}`);
          break;
        }
        case 'tasks': {
          const payload: TaskItem = {
            ...(crudDraft as TaskItem),
            tags: crudDraft.tags || [crudDraft.division || 'KKN'],
          };
          if (isCreate) await onAddTask?.(payload);
          else await onUpdateTask?.(payload);
          await logAdminActivity(actionType, `Tugas: ${payload.title}`, `PIC: ${payload.assignee}`);
          break;
        }
        case 'stakeholders': {
          const payload = crudDraft as StakeholderRecord;
          if (isCreate) await onAddStakeholder?.(payload);
          else await onUpdateStakeholder?.(payload);
          await logAdminActivity(
            actionType,
            `Pemangku Kepentingan: ${payload.name}`,
            `${payload.role} (${payload.dusun})`
          );
          break;
        }
        case 'surveys': {
          const payload: SurveyRecord = {
            ...(crudDraft as SurveyRecord),
            findings: String(crudDraft.summaryFindings || crudDraft.findings || ''),
            recommendations: String(crudDraft.recommendations || 'Tindak lanjut program kerja KKN'),
            location: String(crudDraft.dusun || crudDraft.location || 'Desa Pringgasela Selatan'),
            existingProblems: String(crudDraft.existingProblemsText || ''),
            potentialOpportunities: String(crudDraft.potentialOpportunitiesText || ''),
          };
          if (isCreate) await onAddSurvey?.(payload);
          else await onUpdateSurvey?.(payload);
          await logAdminActivity(actionType, `Survei: ${payload.title}`, `Dusun: ${payload.dusun}`);
          break;
        }
        case 'programs': {
          const payload: WorkProgram = {
            ...(crudDraft as WorkProgram),
            pic: String(crudDraft.lead || crudDraft.pic || 'Tim KKN'),
            objective: String(crudDraft.description || crudDraft.objective || 'Program Kerja KKN'),
            targetAudience: String(crudDraft.beneficiaries || crudDraft.targetAudience || 'Warga Desa'),
            budgetPlanned: Number(crudDraft.budgetAllocated || crudDraft.budgetPlanned || 0),
            budgetUsed: Number(crudDraft.budgetUsed || 0),
            progressPercent: Number(crudDraft.progressPercent || 0),
            outputs: crudDraft.outputs || [String(crudDraft.description || 'Output Program Kerja')],
            keyMilestones: crudDraft.keyMilestones || [
              { title: 'Persiapan & Koordinasi', completed: true },
              { title: 'Pelaksanaan Kegiatan', completed: false },
            ],
          };
          if (isCreate) await onAddProgram?.(payload);
          else await onUpdateProgram(payload);
          await logAdminActivity(actionType, `Program Kerja: ${payload.title}`, `Kode: ${payload.code}`);
          break;
        }
        case 'documentation': {
          const payload = crudDraft as DocumentationPhoto;
          if (isCreate) await onAddPhoto?.(payload);
          else await onUpdatePhoto?.(payload);
          await logAdminActivity(actionType, `Dokumentasi: ${payload.title}`, `Lokasi: ${payload.location}`);
          break;
        }
        case 'reports': {
          const payload: ReportRecord = {
            ...(crudDraft as ReportRecord),
            period: String(crudDraft.period || `Minggu ${crudDraft.weekNumber || 1}`),
            submissionDate: String(crudDraft.submittedDate || crudDraft.submissionDate || new Date().toISOString().slice(0, 10)),
            fileSize: String(crudDraft.fileSize || '1.2 MB'),
          };
          if (isCreate) await onAddReport?.(payload);
          else await onUpdateReport?.(payload);
          await logAdminActivity(actionType, `Laporan: ${payload.title}`, `Tipe: ${payload.type}`);
          break;
        }
        case 'archive': {
          const payload: ArchiveRecord = {
            ...(crudDraft as ArchiveRecord),
            referenceNumber: String(crudDraft.code || crudDraft.referenceNumber || ''),
            fileFormat: (crudDraft.fileFormat || 'PDF') as ArchiveRecord['fileFormat'],
            dateUploaded: String(crudDraft.date || crudDraft.dateUploaded || new Date().toISOString().slice(0, 10)),
            size: String(crudDraft.fileSize || crudDraft.size || '450 KB'),
          };
          if (isCreate) await onAddArchive?.(payload);
          else await onUpdateArchive?.(payload);
          await logAdminActivity(
            actionType,
            `Arsip Surat: ${payload.title}`,
            `Nomor: ${payload.referenceNumber || '-'}`
          );
          break;
        }
        case 'transactions': {
          const payload: TransactionRecord = {
            ...(crudDraft as TransactionRecord),
            amount: Number(crudDraft.amount || 0),
            recordedBy: String(crudDraft.recordedBy || 'Tsaniatul Amni Alwan (Bendahara)'),
          };
          if (isCreate) await onAddTransaction?.(payload);
          else await onUpdateTransaction?.(payload);
          await logAdminActivity(
            actionType,
            `Transaksi Kas: ${payload.description}`,
            `Nominal: Rp ${payload.amount.toLocaleString('id-ID')}`
          );
          break;
        }
        case 'inventory': {
          const payload: InventoryRecord = {
            ...(crudDraft as InventoryRecord),
            quantity: Number(crudDraft.quantity || 1),
          };
          if (isCreate) await onAddInventory?.(payload);
          else await onUpdateInventory?.(payload);
          await logAdminActivity(
            actionType,
            `Inventaris: ${payload.name}`,
            `${payload.quantity} ${payload.unit}`
          );
          break;
        }
        case 'announcements': {
          const payload = crudDraft as AnnouncementRecord;
          if (isCreate) await onAddAnnouncement?.(payload);
          else await onUpdateAnnouncement?.(payload);
          await logAdminActivity(actionType, `Pengumuman: ${payload.title}`, payload.category);
          break;
        }
        case 'articles': {
          const payload = crudDraft as PublicArticleRecord;
          if (isCreate) await onAddArticle?.(payload);
          else await onUpdateArticle?.(payload);
          await logAdminActivity(actionType, `Artikel Publik: ${payload.title}`, payload.category);
          break;
        }
        default:
          break;
      }

      await loadData();
      setIsCrudModalOpen(false);
      pushToast(
        'success',
        isCreate ? 'Data Berhasil Ditambahkan' : 'Data Berhasil Diperbarui',
        'Perubahan telah disimpan ke Supabase dan dicatat di log aktivitas.'
      );
    } catch (err: any) {
      pushToast('error', 'Gagal Menyimpan Data', err?.message || 'Terjadi kesalahan.');
    }
  };

  const handleDeleteCrudItem = (moduleKey: CrudModuleKey, id: string, label: string) => {
    openConfirmDialog({
      title: `Hapus Data: ${label}?`,
      description: `Data "${label}" akan dihapus dari modul ${moduleKey.toUpperCase()} di Supabase. Tindakan ini dicatat pada log audit sistem.`,
      confirmLabel: 'Ya, Hapus Data',
      variant: 'danger',
      onConfirm: async () => {
        switch (moduleKey) {
          case 'meetings':
            await onDeleteMeeting?.(id);
            break;
          case 'decisions':
            await onDeleteDecision?.(id);
            break;
          case 'tasks':
            await onDeleteTask?.(id);
            break;
          case 'stakeholders':
            await onDeleteStakeholder?.(id);
            break;
          case 'surveys':
            await onDeleteSurvey?.(id);
            break;
          case 'programs':
            await onDeleteProgram?.(id);
            break;
          case 'documentation':
            await onDeletePhoto?.(id);
            break;
          case 'reports':
            await onDeleteReport?.(id);
            break;
          case 'archive':
            await onDeleteArchive?.(id);
            break;
          case 'transactions':
            await onDeleteTransaction?.(id);
            break;
          case 'inventory':
            await onDeleteInventory?.(id);
            break;
          case 'announcements':
            await onDeleteAnnouncement?.(id);
            break;
          case 'articles':
            await onDeleteArticle?.(id);
            break;
        }
        await logAdminActivity('ADMIN_CRUD_DELETE', `${moduleKey}: ${label}`, `ID: ${id}`);
        await loadData();
        pushToast('warning', 'Data Dihapus', `"${label}" berhasil dihapus dari sistem.`);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">

      {/* =====================================================================
          CONFIRMATION DIALOG FOR DESTRUCTIVE ACTIONS
         ===================================================================== */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            {confirmDialog.requireTypedText && (
              <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-1.5">
                <label className="block text-[11px] font-medium text-red-900">
                  Ketik <strong className="font-mono">{confirmDialog.requireTypedText}</strong> untuk
                  mengonfirmasi tindakan permanen ini:
                </label>
                <input
                  type="text"
                  value={confirmTypedInput}
                  onChange={(e) => setConfirmTypedInput(e.target.value)}
                  placeholder={confirmDialog.requireTypedText}
                  className="w-full px-3 py-1.5 rounded border border-red-300 text-xs font-mono bg-white focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isConfirmExecuting}
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  isConfirmExecuting ||
                  Boolean(
                    confirmDialog.requireTypedText &&
                      confirmTypedInput.trim() !== confirmDialog.requireTypedText
                  )
                }
                onClick={executeConfirmDialog}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isConfirmExecuting ? 'Memproses...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MEMBER PROFILE & EMAIL EDIT MODAL
         ===================================================================== */}
      {editingMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Kelola Profil & Email Anggota
                </h3>
                <p className="text-[11px] text-stone-500">
                  ID Anggota: <span className="font-mono">{editingMemberModal.id}</span> · Sinkronisasi
                  langsung ke tabel <span className="font-mono">members</span> &{' '}
                  <span className="font-mono">registered_emails</span>
                </p>
              </div>
              <button
                onClick={() => setEditingMemberModal(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberProfileAndEmail} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Nama Lengkap Mahasiswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editMemName}
                    onChange={(e) => setEditMemName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Jabatan / Posisi Tim *
                  </label>
                  <input
                    type="text"
                    required
                    value={editMemRole}
                    onChange={(e) => setEditMemRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Divisi *
                  </label>
                  <select
                    value={editMemDivision}
                    onChange={(e) => setEditMemDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-[#4A6B53]"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Email Resmi Anggota (Kosongkan jika belum ada)
                  </label>
                  <input
                    type="email"
                    disabled={editingMemberModal.id === 'm-4'}
                    value={editMemEmail}
                    onChange={(e) => setEditMemEmail(e.target.value)}
                    placeholder="Belum Didaftarkan"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono text-[11px] focus:outline-none focus:border-[#4A6B53] disabled:bg-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    NIM
                  </label>
                  <input
                    type="text"
                    value={editMemNim}
                    onChange={(e) => setEditMemNim(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Program Studi
                  </label>
                  <input
                    type="text"
                    value={editMemMajor}
                    onChange={(e) => setEditMemMajor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    WhatsApp (+62)
                  </label>
                  <input
                    type="text"
                    value={editMemPhone}
                    onChange={(e) => setEditMemPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Tanggung Jawab Operasional (Satu per baris)
                </label>
                <textarea
                  rows={3}
                  value={editMemResponsibilities}
                  onChange={(e) => setEditMemResponsibilities(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs"
                />
              </div>

              <div>
                <FileUploader
                  label="Foto Profil Anggota (Unggah Langsung)"
                  folder="members"
                  accept="image"
                  maxSizeMB={5}
                  singleUrl={editMemAvatar}
                  onSingleUpload={(meta) => {
                    if (meta) setEditMemAvatar(meta.url);
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingMemberModal(null)}
                  className="px-3.5 py-2 rounded-lg border border-stone-200 text-stone-700 font-medium hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMemberModal}
                  className="px-4 py-2 rounded-lg bg-[#284230] text-white font-semibold hover:bg-[#1d3023] disabled:opacity-50"
                >
                  {isSavingMemberModal ? 'Menyimpan...' : 'Simpan Profil & Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ACCOUNT REGISTRATION & ACTIVITY HISTORY MODAL PER MEMBER
         ===================================================================== */}
      {historyMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Riwayat Registrasi & Aktivitas Akun
                </h3>
                <p className="text-xs text-stone-500">
                  {historyMember.name} — {historyMember.role} ({historyMember.division})
                </p>
              </div>
              <button
                onClick={() => setHistoryMember(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Email Terdaftar:</span>
                <span className="font-mono font-semibold text-stone-900">
                  {historyMember.email || 'Belum Didaftarkan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Status Aktivasi:</span>
                <span className="font-semibold text-stone-900">
                  {historyMember.accountStatus === 'active'
                    ? 'Aktif (Terverifikasi)'
                    : historyMember.accountStatus === 'disabled'
                    ? 'Dinonaktifkan'
                    : historyMember.email
                    ? 'Menunggu Aktivasi'
                    : 'Belum Didaftarkan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Supabase Auth UID:</span>
                <span className="font-mono text-[11px] text-stone-600">
                  {historyMember.authUid || 'Belum tertaut'}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Log Audit Terkait Anggota Ini
              </div>
              {logs.filter(
                (l) =>
                  l.target.toLowerCase().includes(historyMember.name.toLowerCase()) ||
                  l.target.toLowerCase().includes(historyMember.id.toLowerCase()) ||
                  (historyMember.email &&
                    l.target.toLowerCase().includes(historyMember.email.toLowerCase()))
              ).length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center italic">
                  Belum ada riwayat perubahan akun tercatat untuk anggota ini.
                </p>
              ) : (
                logs
                  .filter(
                    (l) =>
                      l.target.toLowerCase().includes(historyMember.name.toLowerCase()) ||
                      l.target.toLowerCase().includes(historyMember.id.toLowerCase()) ||
                      (historyMember.email &&
                        l.target.toLowerCase().includes(historyMember.email.toLowerCase()))
                  )
                  .map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg border border-stone-200 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-800">
                          {l.action}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(l.timestamp).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-700">{l.details}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          EDIT REGISTERED EMAIL MODAL
         ===================================================================== */}
      {editingRegRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">
                Edit Rekaman Email Terdaftar
              </h3>
              <button
                onClick={() => setEditingRegRecord(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedRegRecord} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Alamat Email Resmi *
                </label>
                <input
                  type="email"
                  required
                  disabled={editingRegRecord.email.toLowerCase() === 'abhyy333@gmail.com'}
                  value={editRegEmailVal}
                  onChange={(e) => setEditRegEmailVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Nama Anggota *
                </label>
                <input
                  type="text"
                  required
                  value={editRegNameVal}
                  onChange={(e) => setEditRegNameVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Jabatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={editRegPosVal}
                    onChange={(e) => setEditRegPosVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Divisi *
                  </label>
                  <select
                    value={editRegDivVal}
                    onChange={(e) => setEditRegDivVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingRegRecord(null)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#284230] text-white font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MANDATORY CONFIRMATION DIALOG: HAPUS EMAIL LOGIN ANGGOTA (REMOVE)
         ===================================================================== */}
      {removeEmailTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-red-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Hapus Email Login Anggota
                </h3>
              </div>
              <button
                onClick={() => setRemoveEmailTarget(null)}
                disabled={isSubmittingRemove}
                className="text-stone-400 hover:text-stone-700 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mandatory Explanation Copy */}
            <div className="p-3.5 rounded-lg bg-red-50/80 border border-red-200 text-xs text-red-900 leading-relaxed">
              <strong>Peringatan Penting:</strong> Alamat email login dan akun autentikasi anggota ini akan dihapus. Profil anggota KKN, NIM, jabatan, divisi, program studi, nomor HP, dokumentasi, tugas, dan riwayat kegiatannya tetap dipertahankan. Status akun akan kembali ke Menunggu Aktivasi.
            </div>

            {/* Affected Record Details */}
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Nama Anggota:</span>
                <span className="font-semibold text-stone-900">{removeEmailTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Jabatan & Divisi:</span>
                <span className="text-stone-700">{removeEmailTarget.role} — {removeEmailTarget.division}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Email Login yang Dihapus:</span>
                <span className="font-mono font-semibold text-red-700">{removeEmailTarget.email}</span>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Ketik nama lengkap anggota <span className="font-semibold text-stone-900 font-mono">"{removeEmailTarget.name}"</span> untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  value={removeConfirmName}
                  onChange={(e) => setRemoveConfirmName(e.target.value)}
                  placeholder={`Ketik: ${removeEmailTarget.name}`}
                  disabled={isSubmittingRemove}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Alasan Penghapusan (Opsional untuk catatan audit):
                </label>
                <input
                  type="text"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="Contoh: Kesalahan input email / penggantian identitas"
                  disabled={isSubmittingRemove}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRemoveEmailTarget(null)}
                disabled={isSubmittingRemove}
                className="px-3.5 py-2 rounded-lg border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 text-xs disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRemoveEmail}
                disabled={
                  isSubmittingRemove ||
                  removeConfirmName.trim().toLowerCase() !== removeEmailTarget.name.trim().toLowerCase()
                }
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 text-xs transition-colors"
              >
                {isSubmittingRemove ? 'Memproses Penghapusan...' : 'Konfirmasi Hapus Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MANDATORY CONFIRMATION DIALOG: GANTI EMAIL ANGGOTA (REPLACE)
         ===================================================================== */}
      {replaceEmailTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-amber-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-stone-900">
                <RotateCcw className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Ganti Email Anggota
                </h3>
              </div>
              <button
                onClick={() => setReplaceEmailTarget(null)}
                disabled={isSubmittingReplace}
                className="text-stone-400 hover:text-stone-700 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mandatory Explanation Copy */}
            <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Pemberitahuan:</strong> Email login lama dan akun autentikasinya akan dicabut. Email baru akan didaftarkan dan anggota harus melakukan aktivasi ulang.
            </div>

            {/* Affected Record Details */}
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Nama Anggota:</span>
                <span className="font-semibold text-stone-900">{replaceEmailTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Jabatan & Divisi:</span>
                <span className="text-stone-700">{replaceEmailTarget.role} — {replaceEmailTarget.division}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Email Login Sebelumnya:</span>
                <span className="font-mono text-stone-600">{replaceEmailTarget.email || 'Belum Ada'}</span>
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Alamat Email Baru *
                </label>
                <input
                  type="email"
                  required
                  value={replaceNewEmail}
                  onChange={(e) => setReplaceNewEmail(e.target.value)}
                  placeholder="Masukkan email baru anggota..."
                  disabled={isSubmittingReplace}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono text-xs focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Ketik nama lengkap anggota <span className="font-semibold text-stone-900 font-mono">"{replaceEmailTarget.name}"</span> untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  value={replaceConfirmName}
                  onChange={(e) => setReplaceConfirmName(e.target.value)}
                  placeholder={`Ketik: ${replaceEmailTarget.name}`}
                  disabled={isSubmittingReplace}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Alasan Penggantian (Opsional untuk catatan audit):
                </label>
                <input
                  type="text"
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder="Contoh: Pembaruan email aktif anggota"
                  disabled={isSubmittingReplace}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none focus:border-[#4A6B53]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReplaceEmailTarget(null)}
                disabled={isSubmittingReplace}
                className="px-3.5 py-2 rounded-lg border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 text-xs disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReplaceEmail}
                disabled={
                  isSubmittingReplace ||
                  !replaceNewEmail.trim() ||
                  replaceConfirmName.trim().toLowerCase() !== replaceEmailTarget.name.trim().toLowerCase()
                }
                className="px-4 py-2 rounded-lg bg-[#4A6B53] text-white font-semibold hover:bg-[#3d5944] disabled:opacity-50 text-xs transition-colors"
              >
                {isSubmittingReplace ? 'Menyimpan & Mengganti...' : 'Simpan & Ganti Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIRECT REGISTER EMAIL MODAL PER MEMBER
         ===================================================================== */}
      {registerEmailTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#4A6B53]" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Daftarkan Email Anggota
                </h3>
              </div>
              <button
                onClick={() => setRegisterEmailTarget(null)}
                disabled={isSubmittingRegisterTarget}
                className="text-stone-400 hover:text-stone-700 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Anggota:</span>
                <span className="font-semibold text-stone-900">{registerEmailTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Jabatan & Divisi:</span>
                <span className="text-stone-700">{registerEmailTarget.role} — {registerEmailTarget.division}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">NIM:</span>
                <span className="font-mono text-stone-700">{registerEmailTarget.nim || '-'}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteRegisterTargetEmail} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Alamat Email Resmi *
                </label>
                <input
                  type="email"
                  required
                  value={registerTargetEmailVal}
                  onChange={(e) => setRegisterTargetEmailVal(e.target.value)}
                  placeholder="Masukkan alamat email asli anggota..."
                  disabled={isSubmittingRegisterTarget}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono text-xs focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRegisterEmailTarget(null)}
                  disabled={isSubmittingRegisterTarget}
                  className="px-3.5 py-2 rounded-lg border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRegisterTarget || !registerTargetEmailVal.trim()}
                  className="px-4 py-2 rounded-lg bg-[#4A6B53] text-white font-semibold hover:bg-[#3d5944] disabled:opacity-50 text-xs"
                >
                  {isSubmittingRegisterTarget ? 'Mendaftarkan...' : 'Daftarkan Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DEDICATED READ-ONLY MEMBER EMAIL HISTORY PANEL
         ===================================================================== */}
      {emailHistoryTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#4A6B53]" />
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Riwayat Email & Autentikasi
                  </h3>
                  <p className="text-xs text-stone-500">
                    {emailHistoryTarget.name} — {emailHistoryTarget.role} ({emailHistoryTarget.division})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailHistoryTarget(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Overview */}
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shrink-0">
              <div>
                <span className="text-stone-500 block text-[10px]">Email Terdaftar</span>
                <span className="font-mono font-semibold text-stone-900 text-xs">
                  {emailHistoryTarget.email || 'Belum Didaftarkan'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Status Akun</span>
                <span className="font-semibold text-stone-900 text-xs">
                  {emailHistoryTarget.accountStatus === 'active'
                    ? 'Aktif'
                    : emailHistoryTarget.accountStatus === 'disabled'
                    ? 'Nonaktif'
                    : emailHistoryTarget.email
                    ? 'Menunggu Aktivasi'
                    : 'Belum Didaftarkan'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Auth UID</span>
                <span className="font-mono text-stone-600 text-[11px] truncate block">
                  {emailHistoryTarget.authUid || 'Belum Tertaut'}
                </span>
              </div>
            </div>

            {/* History Records List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Catatan Audit member_email_history ({memberEmailHistoryList.length})
              </div>

              {isLoadingEmailHistory ? (
                <div className="py-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#4A6B53]" />
                  <span>Memuat catatan riwayat email...</span>
                </div>
              ) : memberEmailHistoryList.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500 italic bg-stone-50 rounded-lg border border-dashed border-stone-200">
                  Belum ada catatan riwayat perubahan email untuk anggota ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberEmailHistoryList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-lg border border-stone-200 bg-white text-xs space-y-2 hover:border-stone-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              item.action === 'REMOVE'
                                ? 'bg-red-100 text-red-800'
                                : item.action === 'REPLACE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.action === 'REMOVE'
                              ? 'HAPUS EMAIL'
                              : item.action === 'REPLACE'
                              ? 'GANTI EMAIL'
                              : 'DAFTAR EMAIL'}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            oleh <span className="font-medium text-stone-700">{item.performed_by || 'Super Admin'}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          {item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-[#FAF9F5] p-2 rounded border border-stone-100 font-mono">
                        <div>
                          <span className="text-stone-400 block text-[9px] font-sans">Email Sebelumnya:</span>
                          <span className="text-stone-700">{item.previous_email || '—'}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[9px] font-sans">Email Pengganti:</span>
                          <span className="text-stone-900 font-semibold">{item.replacement_email || '— (Dihapus)'}</span>
                        </div>
                      </div>

                      {item.reason && (
                        <p className="text-[11px] text-stone-600 italic">
                          <span className="font-medium not-italic text-stone-700">Alasan:</span> {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100 shrink-0">
              <button
                type="button"
                onClick={() => setEmailHistoryTarget(null)}
                className="px-4 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          GENERIC MODULE CRUD MODAL (CREATE / EDIT)
         ===================================================================== */}
      {isCrudModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-[#E8E6DF] max-w-xl w-full p-6 shadow-xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {crudEditMode === 'create' ? 'Tambah Data Baru' : 'Edit Data'} — Modul{' '}
                  {activeCrudModule.toUpperCase()}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Hak akses penuh Super Admin · Tersinkronisasi langsung dengan Supabase
                </p>
              </div>
              <button
                onClick={() => setIsCrudModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCrudModal} className="space-y-3 text-xs">
              {/* MEETINGS FORM */}
              {activeCrudModule === 'meetings' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Judul Rapat *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tanggal *</label>
                      <input
                        type="date"
                        required
                        value={crudDraft.date || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Waktu *</label>
                      <input
                        type="text"
                        required
                        value={crudDraft.time || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, time: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Lokasi *</label>
                      <input
                        type="text"
                        required
                        value={crudDraft.location || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, location: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Status</label>
                      <select
                        value={crudDraft.status || 'upcoming'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="upcoming">Akan Datang</option>
                        <option value="completed">Selesai</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Agenda Pembahasan (Satu per baris)
                    </label>
                    <textarea
                      rows={3}
                      value={crudDraft.agendaText || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, agendaText: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Ringkasan Notulensi (Minutes)
                    </label>
                    <textarea
                      rows={3}
                      value={crudDraft.notesSummary || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, notesSummary: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* DECISIONS FORM */}
              {activeCrudModule === 'decisions' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Judul Keputusan *
                    </label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tanggal</label>
                      <input
                        type="date"
                        value={crudDraft.date || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kategori</label>
                      <select
                        value={crudDraft.category || 'Program Kerja'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Program Kerja">Program Kerja</option>
                        <option value="Anggaran">Anggaran</option>
                        <option value="Koordinasi Desa">Koordinasi Desa</option>
                        <option value="Internal Posko">Internal Posko</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Status</label>
                      <select
                        value={crudDraft.implementationStatus || 'direncanakan'}
                        onChange={(e) =>
                          setCrudDraft({ ...crudDraft, implementationStatus: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="direncanakan">Direncanakan</option>
                        <option value="berjalan">Berjalan</option>
                        <option value="selesai">Selesai</option>
                        <option value="ditunda">Ditunda</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">
                        Penanggung Jawab (PIC)
                      </label>
                      <input
                        type="text"
                        value={crudDraft.pic || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, pic: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tenggat</label>
                      <input
                        type="date"
                        value={crudDraft.deadline || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, deadline: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Ringkasan Keputusan *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={crudDraft.summary || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, summary: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* TASKS FORM */}
              {activeCrudModule === 'tasks' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Judul Tugas *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Assignee *</label>
                      <select
                        value={crudDraft.assignee || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, assignee: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        {enrichedMembers.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Divisi</label>
                      <select
                        value={crudDraft.division || 'Divisi Acara'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, division: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        {DIVISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Status</label>
                      <select
                        value={crudDraft.status || 'todo'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="todo">Belum Mulai</option>
                        <option value="in_progress">Sedang Dikerjakan</option>
                        <option value="review">Tinjauan</option>
                        <option value="done">Selesai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Prioritas</label>
                      <select
                        value={crudDraft.priority || 'medium'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, priority: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="low">Rendah</option>
                        <option value="medium">Sedang</option>
                        <option value="high">Tinggi</option>
                        <option value="urgent">Mendesak</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tenggat</label>
                      <input
                        type="date"
                        value={crudDraft.dueDate || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, dueDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Deskripsi</label>
                    <textarea
                      rows={3}
                      value={crudDraft.description || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* STAKEHOLDERS FORM */}
              {activeCrudModule === 'stakeholders' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Nama Tokoh *</label>
                      <input
                        type="text"
                        required
                        value={crudDraft.name || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">
                        Jabatan / Peran *
                      </label>
                      <input
                        type="text"
                        required
                        value={crudDraft.role || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Wilayah/Dusun</label>
                      <input
                        type="text"
                        value={crudDraft.dusun || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, dusun: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kategori</label>
                      <select
                        value={crudDraft.category || 'Pemerintah Desa'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Pemerintah Desa">Pemerintah Desa</option>
                        <option value="Kepala Dusun">Kepala Dusun</option>
                        <option value="Tokoh Adat & Agama">Tokoh Adat & Agama</option>
                        <option value="Kader Kesehatan">Kader Kesehatan</option>
                        <option value="Mitra UMKM & Tenun">Mitra UMKM & Tenun</option>
                        <option value="Kepemudaan">Kepemudaan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kontak</label>
                      <input
                        type="text"
                        value={crudDraft.phone || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Catatan Koordinasi</label>
                    <textarea
                      rows={2}
                      value={crudDraft.notes || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* SURVEYS FORM */}
              {activeCrudModule === 'surveys' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Judul Survei *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kategori</label>
                      <select
                        value={crudDraft.category || 'Ekonomi & UMKM'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Ekonomi & UMKM">Ekonomi & UMKM</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Pertanian">Pertanian</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Budaya & Pariwisata">Budaya & Pariwisata</option>
                        <option value="Infrastruktur">Infrastruktur</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Dusun</label>
                      <input
                        type="text"
                        value={crudDraft.dusun || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, dusun: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Status</label>
                      <select
                        value={crudDraft.status || 'Terverifikasi'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Terverifikasi">Terverifikasi</option>
                        <option value="Ditindaklanjuti Program Kerja">
                          Ditindaklanjuti Program Kerja
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Ringkasan Temuan Lapangan *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={crudDraft.summaryFindings || ''}
                      onChange={(e) =>
                        setCrudDraft({ ...crudDraft, summaryFindings: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* PROGRAMS FORM */}
              {activeCrudModule === 'programs' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kode *</label>
                      <input
                        type="text"
                        required
                        value={crudDraft.code || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, code: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-medium text-stone-700 mb-1">
                        Nama Program Kerja *
                      </label>
                      <input
                        type="text"
                        required
                        value={crudDraft.title || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Divisi</label>
                      <select
                        value={crudDraft.division || 'Divisi Acara'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, division: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        {DIVISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Progres (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={crudDraft.progressPercent ?? 0}
                        onChange={(e) =>
                          setCrudDraft({ ...crudDraft, progressPercent: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Anggaran (Rp)</label>
                      <input
                        type="number"
                        value={crudDraft.budgetAllocated ?? 0}
                        onChange={(e) =>
                          setCrudDraft({ ...crudDraft, budgetAllocated: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Deskripsi</label>
                    <textarea
                      rows={3}
                      value={crudDraft.description || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* DOCUMENTATION FORM */}
              {activeCrudModule === 'documentation' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Judul Foto *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Lokasi</label>
                      <input
                        type="text"
                        value={crudDraft.location || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, location: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tanggal</label>
                      <input
                        type="date"
                        value={crudDraft.date || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <FileUploader
                    label="Unggah Foto Dokumentasi"
                    folder="documentation"
                    accept="image"
                    maxSizeMB={8}
                    singleUrl={crudDraft.imageUrl}
                    onSingleUpload={(meta) => {
                      if (meta) setCrudDraft({ ...crudDraft, imageUrl: meta.url });
                    }}
                  />
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Caption</label>
                    <textarea
                      rows={2}
                      value={crudDraft.caption || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, caption: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* REPORTS FORM */}
              {activeCrudModule === 'reports' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Judul Laporan *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Jenis</label>
                      <select
                        value={crudDraft.type || 'Mingguan'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, type: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Mingguan">Mingguan</option>
                        <option value="Bulanan">Bulanan</option>
                        <option value="Laporan Akhir">Laporan Akhir</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Status DPL</label>
                      <select
                        value={crudDraft.status || 'Disetujui DPL'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Disetujui DPL">Disetujui DPL</option>
                        <option value="Menunggu Review">Menunggu Review</option>
                        <option value="Revisi">Revisi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tanggal</label>
                      <input
                        type="date"
                        value={crudDraft.submittedDate || ''}
                        onChange={(e) =>
                          setCrudDraft({ ...crudDraft, submittedDate: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Ringkasan</label>
                    <textarea
                      rows={3}
                      value={crudDraft.summary || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, summary: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <FileUploader
                    label="Unggah Berkas PDF Laporan"
                    folder="reports"
                    accept="document"
                    maxSizeMB={10}
                    singleUrl={crudDraft.fileUrl}
                    onSingleUpload={(meta) => {
                      if (meta) setCrudDraft({ ...crudDraft, fileUrl: meta.url });
                    }}
                  />
                </>
              )}

              {/* ARCHIVE FORM */}
              {activeCrudModule === 'archive' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Nomor Surat *</label>
                      <input
                        type="text"
                        required
                        value={crudDraft.code || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, code: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kategori</label>
                      <select
                        value={crudDraft.category || 'Surat Keluar'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Surat Masuk">Surat Masuk</option>
                        <option value="Surat Keluar">Surat Keluar</option>
                        <option value="Proposal">Proposal</option>
                        <option value="LPJ & Keuangan">LPJ & Keuangan</option>
                        <option value="SK &MoU">SK & MoU</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Perihal / Nama Dokumen *
                    </label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <FileUploader
                    label="Unggah Dokumen Arsip"
                    folder="archive"
                    accept="document"
                    maxSizeMB={10}
                    singleUrl={crudDraft.fileUrl}
                    onSingleUpload={(meta) => {
                      if (meta) setCrudDraft({ ...crudDraft, fileUrl: meta.url });
                    }}
                  />
                </>
              )}

              {/* TRANSACTIONS FORM */}
              {activeCrudModule === 'transactions' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Uraian Transaksi *
                    </label>
                    <input
                      type="text"
                      required
                      value={crudDraft.description || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tipe</label>
                      <select
                        value={crudDraft.type || 'expense'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, type: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="income">Pemasukan</option>
                        <option value="expense">Pengeluaran</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Nominal (Rp) *</label>
                      <input
                        type="number"
                        required
                        value={crudDraft.amount ?? 0}
                        onChange={(e) =>
                          setCrudDraft({ ...crudDraft, amount: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tanggal</label>
                      <input
                        type="date"
                        value={crudDraft.date || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* INVENTORY FORM */}
              {activeCrudModule === 'inventory' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Nama Barang *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.name || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Jumlah</label>
                      <input
                        type="number"
                        value={crudDraft.quantity ?? 1}
                        onChange={(e) =>
                          setCrudDraft({ ...crudDraft, quantity: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Satuan</label>
                      <input
                        type="text"
                        value={crudDraft.unit || 'Unit'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, unit: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kondisi</label>
                      <select
                        value={crudDraft.condition || 'Baik'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, condition: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Baik">Baik</option>
                        <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                        <option value="Habis Pakai">Habis Pakai</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ANNOUNCEMENTS FORM */}
              {activeCrudModule === 'announcements' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Judul Pengumuman *
                    </label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kategori</label>
                      <select
                        value={crudDraft.category || 'Pengumuman Internal'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Pengumuman Internal">Pengumuman Internal</option>
                        <option value="Agenda Desa">Agenda Desa</option>
                        <option value="Instruksi Posko">Instruksi Posko</option>
                        <option value="Informasi Publik">Informasi Publik</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Tanggal</label>
                      <input
                        type="date"
                        value={crudDraft.date || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Isi Pengumuman *</label>
                    <textarea
                      rows={3}
                      required
                      value={crudDraft.content || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                </>
              )}

              {/* ARTICLES FORM */}
              {activeCrudModule === 'articles' && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Judul Artikel *</label>
                    <input
                      type="text"
                      required
                      value={crudDraft.title || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Kategori</label>
                      <select
                        value={crudDraft.category || 'Berita Kegiatan'}
                        onChange={(e) => setCrudDraft({ ...crudDraft, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white"
                      >
                        <option value="Berita Kegiatan">Berita Kegiatan</option>
                        <option value="Kisah Pengabdian">Kisah Pengabdian</option>
                        <option value="Potensi Desa">Potensi Desa</option>
                        <option value="Edukasi Warga">Edukasi Warga</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 mb-1">Penulis</label>
                      <input
                        type="text"
                        value={crudDraft.author || ''}
                        onChange={(e) => setCrudDraft({ ...crudDraft, author: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Ringkasan *</label>
                    <textarea
                      rows={2}
                      required
                      value={crudDraft.summary || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, summary: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Konten Lengkap *</label>
                    <textarea
                      rows={4}
                      required
                      value={crudDraft.content || ''}
                      onChange={(e) => setCrudDraft({ ...crudDraft, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200"
                    />
                  </div>
                  <FileUploader
                    label="Gambar Sampul Artikel"
                    folder="articles"
                    accept="image"
                    maxSizeMB={8}
                    singleUrl={crudDraft.coverImageUrl}
                    onSingleUpload={(meta) => {
                      if (meta) setCrudDraft({ ...crudDraft, coverImageUrl: meta.url });
                    }}
                  />
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCrudModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-stone-200 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#284230] text-white font-semibold hover:bg-[#1E3224]"
                >
                  Simpan ke Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          COMPACT PAGE INTRODUCTION & MINIMAL SUB-NAVIGATION
         ===================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-stone-900 tracking-tight">
              Admin Console
            </h1>
            <p className="text-xs text-stone-500">
              Manajemen otoritatif anggota tim KKN, registrasi email, modul operasional, konten publik, dan log aktivitas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E6DF] bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmails || isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Sinkronkan</span>
            </button>
            {activeTab !== 'email-registration' && (
              <button
                onClick={() => setActiveTab('email-registration')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] hover:bg-[#3d5944] text-white text-xs font-medium transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Daftarkan Email</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#E8E6DF] text-xs">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: `Members & Accounts (${enrichedMembers.length})` },
              { id: 'email-registration', label: `Email Registration (${registeredEmails.length})` },
              { id: 'dpl-supervision', label: 'DPL & Supervisi' },
              { id: 'crud-center', label: 'Module Data' },
              { id: 'public-content', label: 'Public Content' },
              { id: 'database', label: 'Database & Security' },
              { id: 'activity-logs', label: `Activity Logs (${logs.length})` },
              { id: 'settings', label: 'Settings' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#E8ECE9] text-[#284230] font-medium'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 font-normal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          TAB 1: SYSTEM OVERVIEW
         ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[108px]"
            >
              <span className="text-xs text-stone-500">Roster Resmi KKN</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold text-stone-900 tabular-nums">10</span>
                <span className="text-[11px] text-stone-500">
                  {activeCount} aktif · {unregisteredCount} belum terdaftar
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('email-registration')}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[108px]"
            >
              <span className="text-xs text-stone-500">Email Terdaftar</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold text-stone-900 tabular-nums">
                  {registeredEmails.length}
                </span>
                <span className="text-[11px] text-stone-500">
                  {pendingActivationCount} menunggu aktivasi
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('crud-center')}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[108px]"
            >
              <span className="text-xs text-stone-500">Rapat & Tugas</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold text-stone-900 tabular-nums">
                  {meetings.length + tasks.length}
                </span>
                <span className="text-[11px] text-stone-500">
                  {meetings.length} rapat · {tasks.length} tugas
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('activity-logs')}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[108px]"
            >
              <span className="text-xs text-stone-500">Log Aktivitas</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold text-stone-900 tabular-nums">
                  {logs.length}
                </span>
                <span className="text-[11px] text-stone-500">Rekaman audit</span>
              </div>
            </button>
          </div>

          {/* Authoritative Roster Quick Summary Table */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Daftar Otoritatif Anggota Tim KKN
                </h2>
                <p className="text-xs text-stone-500">
                  Status email resmi dan aktivasi akun anggota KKN Desa Pringgasela Selatan.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('users')}
                className="px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3d5944] transition-colors self-start sm:self-auto"
              >
                Kelola Akun Anggota
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] font-medium text-stone-500">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Resmi</th>
                    <th className="py-2.5 px-3">Jabatan</th>
                    <th className="py-2.5 px-3">Divisi</th>
                    <th className="py-2.5 px-3">Email Terdaftar</th>
                    <th className="py-2.5 px-3">Status Akun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {enrichedMembers.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-stone-50/70">
                      <td className="py-2.5 px-3 font-mono text-stone-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">{m.name}</td>
                      <td className="py-2.5 px-3 text-stone-700">{m.role}</td>
                      <td className="py-2.5 px-3 text-stone-500">{m.division}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {m.email ? (
                          <span className="text-stone-800">{m.email}</span>
                        ) : (
                          <span className="text-stone-400">Belum Didaftarkan</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.accountStatus === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Aktif {m.systemRole === 'super_admin' ? '(Admin)' : ''}</span>
                          </span>
                        ) : m.accountStatus === 'disabled' ? (
                          <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            <span>Dinonaktifkan</span>
                          </span>
                        ) : m.email ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Menunggu Aktivasi</span>
                          </span>
                        ) : (
                          <span className="text-stone-400">Belum Didaftarkan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MEMBER DIRECTORY & ACCOUNT MANAGEMENT (10 MEMBERS + SEPARATE DPL)
         ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Separate DPL Supervisor Card */}
          <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-[#E8ECE9] text-[#284230] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-900">{dplRecord.name}</span>
                  <span className="text-[11px] text-stone-500">· Dosen Pembimbing Lapangan</span>
                </div>
                <p className="text-stone-500">
                  {dplRecord.title} · {dplRecord.faculty} · NIP: {dplRecord.nip}
                </p>
                <p className="text-[11px] text-stone-500 font-mono">
                  Email DPL: {dplRecord.email || 'Belum Didaftarkan'}
                </p>
              </div>
            </div>

            {isEditingDpl ? (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="email"
                  value={dplRecord.email}
                  onChange={(e) => setDplRecord({ ...dplRecord, email: e.target.value })}
                  placeholder="Email resmi DPL..."
                  className="px-2.5 py-1.5 rounded-md border border-stone-300 bg-white font-mono text-xs"
                />
                <button
                  onClick={() => {
                    setIsEditingDpl(false);
                    pushToast('success', 'Data DPL Diperbarui', 'Informasi DPL berhasil disimpan.');
                  }}
                  className="px-3 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium"
                >
                  Simpan
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingDpl(true)}
                className="px-3 py-1.5 rounded-md border border-[#E8E6DF] bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 self-start md:self-auto"
              >
                Edit Kontak DPL
              </button>
            )}
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari anggota, jabatan, divisi, atau email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#E8E6DF] bg-white text-xs focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs">
              {(
                [
                  { id: 'all', label: `Semua (${enrichedMembers.length})` },
                  { id: 'active', label: `Aktif (${activeCount})` },
                  { id: 'pending', label: `Menunggu (${pendingActivationCount})` },
                  { id: 'unregistered', label: `Belum Terdaftar (${unregisteredCount})` },
                  { id: 'disabled', label: `Nonaktif (${disabledCount})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setUserStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                    userStatusFilter === f.id
                      ? 'bg-[#E8ECE9] text-[#284230] font-medium'
                      : 'text-stone-600 hover:bg-stone-200/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 10 Authoritative Members Account Management Table */}
          <div className="rounded-lg bg-white border border-[#E8E6DF] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#E8E6DF] text-[11px] font-medium text-stone-500">
                    <th className="py-2.5 px-4">Anggota & Jabatan</th>
                    <th className="py-2.5 px-4">Divisi</th>
                    <th className="py-2.5 px-4">Email Terdaftar</th>
                    <th className="py-2.5 px-4">Status Akun</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMembers.map((m) => {
                    const isProtected = isProtectedSuperAdmin(m);
                    return (
                      <tr key={m.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.avatar}
                              alt={m.name}
                              className="w-8 h-8 rounded-full object-cover border border-stone-200"
                            />
                            <div>
                              <div className="font-medium text-stone-900 flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {m.systemRole === 'super_admin' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8ECE9] text-[#284230] font-mono font-medium">
                                    super_admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500">{m.role}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-stone-600">{m.division}</td>

                        <td className="py-3 px-4 font-mono text-[11px]">
                          {m.email ? (
                            <span className="text-stone-800 font-medium">{m.email}</span>
                          ) : (
                            <span className="text-stone-400 font-sans italic">Belum Didaftarkan</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {m.accountStatus === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>Aktif</span>
                            </span>
                          ) : m.accountStatus === 'disabled' ? (
                            <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              <span>Nonaktif</span>
                            </span>
                          ) : m.email ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Menunggu Aktivasi</span>
                            </span>
                          ) : m.accountStatus === 'pending' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Menunggu Aktivasi</span>
                              </span>
                              <div className="text-[10px] text-stone-400">Email belum didaftarkan</div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 text-stone-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                <span>Belum Didaftarkan</span>
                              </span>
                              <div className="text-[10px] text-stone-400">Email belum didaftarkan</div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Action: Daftarkan Email (if member has no email) */}
                            {!m.email && (
                              <button
                                onClick={() => handleOpenRegisterTargetEmail(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#4A6B53] hover:bg-[#3d5944] text-white font-medium text-[11px] transition-colors"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Daftarkan Email</span>
                              </button>
                            )}

                            {/* Action: Ganti Email (if member has registered email) */}
                            {m.email && (
                              isProtected ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-stone-200 text-stone-400 text-[11px] cursor-not-allowed"
                                  title="Akun Super Admin utama dilindungi dan tidak dapat direset"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Ganti Email</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleOpenReplaceEmail(m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E8E6DF] bg-white hover:bg-stone-50 text-stone-700 font-medium text-[11px] transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3 text-stone-400" />
                                  <span>Ganti Email</span>
                                </button>
                              )
                            )}

                            {/* Action: Hapus Email (if member has registered email and not protected) */}
                            {m.email && !isProtected && (
                              <button
                                onClick={() => handleOpenRemoveEmail(m)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 bg-white hover:bg-red-50 text-red-600 font-medium text-[11px] transition-colors"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                                <span>Hapus Email</span>
                              </button>
                            )}

                            {/* Action: Riwayat Email (Dedicated Read-Only History Panel) */}
                            <button
                              onClick={() => handleOpenEmailHistory(m)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E8E6DF] bg-white text-stone-600 hover:bg-stone-50 text-[11px] transition-colors"
                              title="Lihat riwayat audit email anggota"
                            >
                              <History className="w-3 h-3 text-stone-400" />
                              <span>Riwayat Email</span>
                            </button>

                            {/* Action: Edit Profil Lengkap */}
                            <button
                              onClick={() => openEditMemberModal(m)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-stone-200 text-stone-500 hover:bg-stone-50 text-[11px] transition-colors"
                              title="Edit data profil anggota"
                            >
                              <Edit3 className="w-3 h-3 text-stone-400" />
                              <span>Profil</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: EMAIL REGISTRATION TABLE (registered_emails)
         ===================================================================== */}
      {activeTab === 'email-registration' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form to Register Member Email */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4 self-start">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                Daftarkan Email Anggota
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Pilih anggota dari roster resmi KKN lalu simpan alamat email ke tabel <code className="font-mono">registered_emails</code>.
              </p>
            </div>

            <form onSubmit={handleRegisterEmailSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Pilih Anggota KKN
                </label>
                <select
                  value={selectedMemberId}
                  onChange={handleMemberSelectForReg}
                  className="w-full px-3 py-2 rounded-md border border-stone-200 bg-[#FAF9F5] text-xs focus:outline-none focus:border-[#4A6B53]"
                >
                  <option value="">-- Pilih Anggota KKN --</option>
                  {enrichedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.role} ({m.email ? m.email : 'Belum Didaftarkan'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Contoh: Josua Ujung"
                  className="w-full px-3 py-2 rounded-md border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Alamat Email Resmi *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Masukkan email asli anggota..."
                  className="w-full px-3 py-2 rounded-md border border-stone-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Jabatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    placeholder="Contoh: Ketua"
                    className="w-full px-3 py-2 rounded-md border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Divisi *
                  </label>
                  <select
                    value={regDivision}
                    onChange={(e) => setRegDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-stone-200 bg-white"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingReg}
                className="w-full py-2 px-4 rounded-md bg-[#4A6B53] hover:bg-[#3d5944] text-white font-medium transition-colors disabled:opacity-50"
              >
                {isSubmittingReg ? 'Menyimpan...' : 'Simpan Email'}
              </button>
            </form>
          </div>

          {/* Right: Authoritative registered_emails Table */}
          <div className="lg:col-span-2 p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Daftar Email Terdaftar ({filteredRegisteredEmails.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Validasi aktivasi akun Supabase Auth anggota tim KKN.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  placeholder="Cari email atau nama..."
                  className="px-3 py-1.5 rounded-md border border-stone-200 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] font-medium text-stone-500">
                    <th className="py-2.5 px-3">Email Terdaftar</th>
                    <th className="py-2.5 px-3">Nama & Jabatan</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRegisteredEmails.map((rec) => {
                    const isPrimaryAdmin = rec.email.toLowerCase() === 'abhyy333@gmail.com';
                    return (
                      <tr key={rec.id} className="hover:bg-stone-50/70">
                        <td className="py-3 px-3 font-mono text-stone-900">
                          {rec.email}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-stone-900">{rec.name}</div>
                          <div className="text-[11px] text-stone-500">
                            {rec.position} · {rec.division}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-stone-600">
                          {rec.systemRole || 'member'}
                        </td>
                        <td className="py-3 px-3">
                          {rec.status === 'activated' ? (
                            <span className="text-emerald-700 font-medium">Aktif</span>
                          ) : rec.status === 'disabled' ? (
                            <span className="text-red-700 font-medium">Dinonaktifkan</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Menunggu Aktivasi</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingRegRecord(rec);
                                setEditRegEmailVal(rec.email);
                                setEditRegNameVal(rec.name);
                                setEditRegPosVal(rec.position);
                                setEditRegDivVal(rec.division);
                              }}
                              className="p-1.5 rounded border border-[#E8E6DF] text-stone-600 hover:bg-stone-50"
                              title="Edit email/jabatan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {!isPrimaryAdmin && (
                              <button
                                onClick={() => {
                                  const matchedMem = enrichedMembers.find(
                                    (m) => m.id === rec.memberId || m.email === rec.email
                                  );
                                  if (matchedMem) {
                                    handlePromptDeleteAuthAccount(matchedMem);
                                  }
                                }}
                                className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                title="Hapus registrasi email & akun Auth"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB: DPL & SUPERVISI AKADEMIK
         ===================================================================== */}
      {activeTab === 'dpl-supervision' && (
        <DplSupervisionAdminView
          reports={reports}
          members={members}
          onRefreshData={loadData}
        />
      )}

      {/* =====================================================================
          TAB 4: FULL MODULE CRUD CENTER (ALL APPLICATION MODULES)
         ===================================================================== */}
      {activeTab === 'crud-center' && (
        <div className="space-y-5">
          {/* Module Selector Bar */}
          <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Data Modul Operasional
                </h2>
                <p className="text-xs text-stone-500">
                  Kelola rekaman data pada seluruh modul aplikasi KKN SPACE.
                </p>
              </div>
              {activeCrudModule !== 'village' && (
                <button
                  onClick={() => openCreateCrudModal(activeCrudModule)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3d5944] self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Rekaman</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {(
                [
                  { key: 'meetings', label: `Rapat (${meetings.length})` },
                  { key: 'decisions', label: `Keputusan (${decisions.length})` },
                  { key: 'tasks', label: `Tugas (${tasks.length})` },
                  { key: 'village', label: 'Profil Desa' },
                  { key: 'stakeholders', label: `Stakeholder (${stakeholders.length})` },
                  { key: 'surveys', label: `Survei (${surveys.length})` },
                  { key: 'programs', label: `Program Kerja (${programs.length})` },
                  { key: 'documentation', label: `Dokumentasi (${documentation.length})` },
                  { key: 'reports', label: `Laporan (${reports.length})` },
                  { key: 'archive', label: `Arsip (${archive.length})` },
                  { key: 'transactions', label: `Keuangan (${transactions.length})` },
                  { key: 'inventory', label: `Inventaris (${inventory.length})` },
                  { key: 'announcements', label: `Pengumuman (${announcements.length})` },
                  { key: 'articles', label: `Artikel (${publicArticles.length})` },
                ] as const
              ).map((mod) => (
                <button
                  key={mod.key}
                  onClick={() => {
                    setActiveCrudModule(mod.key);
                    setCrudSearch('');
                  }}
                  className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                    activeCrudModule === mod.key
                      ? 'bg-[#E8ECE9] text-[#284230] font-medium'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* VILLAGE PROFILE EDITOR */}
          {activeCrudModule === 'village' && villageResearch && (
            <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Profil Desa {villageResearch.villageName}, Kec. {villageResearch.district}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Data demografi, geografis, infrastruktur, dan wilayah dusun.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Total Penduduk</label>
                  <input
                    type="number"
                    value={villageResearch.totalPopulation ?? ''}
                    onChange={(e) =>
                      onUpdateVillageResearch?.({
                        ...villageResearch,
                        totalPopulation: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Kepala Keluarga</label>
                  <input
                    type="number"
                    value={villageResearch.totalHouseholds ?? ''}
                    onChange={(e) =>
                      onUpdateVillageResearch?.({
                        ...villageResearch,
                        totalHouseholds: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Luas Wilayah (Ha)</label>
                  <input
                    type="number"
                    value={villageResearch.totalAreaHectares ?? ''}
                    onChange={(e) =>
                      onUpdateVillageResearch?.({
                        ...villageResearch,
                        totalAreaHectares: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Ketinggian</label>
                  <input
                    type="text"
                    value={villageResearch.elevation || ''}
                    onChange={(e) =>
                      onUpdateVillageResearch?.({
                        ...villageResearch,
                        elevation: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-stone-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-stone-500 mb-1">
                  Gambaran Umum & Geografis Desa
                </label>
                <textarea
                  rows={3}
                  value={villageResearch.geography || ''}
                  onChange={(e) =>
                    onUpdateVillageResearch?.({
                      ...villageResearch,
                      geography: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-stone-200 text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    pushToast(
                      'success',
                      'Profil Desa Disimpan',
                      'Data profil Desa Pringgasela Selatan berhasil diperbarui.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3d5944]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {/* GENERIC TABLE LIST FOR SELECTED CRUD MODULE */}
          {activeCrudModule !== 'village' && (
            <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="relative w-full max-w-xs">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={crudSearch}
                    onChange={(e) => setCrudSearch(e.target.value)}
                    placeholder={`Cari rekaman...`}
                    className="w-full pl-8 pr-3 py-1.5 rounded-md border border-stone-200 text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-[11px] font-medium text-stone-500">
                      <th className="py-2.5 px-3">Judul / Nama</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Tanggal / PIC</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(() => {
                      const rawList: any[] =
                        activeCrudModule === 'meetings'
                          ? meetings
                          : activeCrudModule === 'decisions'
                          ? decisions
                          : activeCrudModule === 'tasks'
                          ? tasks
                          : activeCrudModule === 'stakeholders'
                          ? stakeholders
                          : activeCrudModule === 'surveys'
                          ? surveys
                          : activeCrudModule === 'programs'
                          ? programs
                          : activeCrudModule === 'documentation'
                          ? documentation
                          : activeCrudModule === 'reports'
                          ? reports
                          : activeCrudModule === 'archive'
                          ? archive
                          : activeCrudModule === 'transactions'
                          ? transactions
                          : activeCrudModule === 'inventory'
                          ? inventory
                          : activeCrudModule === 'announcements'
                          ? announcements
                          : publicArticles;

                      const q = crudSearch.toLowerCase().trim();
                      const list = q
                        ? rawList.filter((item) =>
                            JSON.stringify(item).toLowerCase().includes(q)
                          )
                        : rawList;

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-stone-400">
                              Tidak ada rekaman ditemukan pada modul ini.
                            </td>
                          </tr>
                        );
                      }

                      return list.map((item) => {
                        const title =
                          item.title || item.name || item.description || item.senderName || item.id;
                        const category =
                          item.category ||
                          item.type ||
                          item.role ||
                          item.division ||
                          item.dusun ||
                          '-';
                        const meta =
                          item.date ||
                          item.dueDate ||
                          item.submittedDate ||
                          item.lead ||
                          item.assignee ||
                          item.pic ||
                          item.phone ||
                          '-';
                        const status =
                          item.status ||
                          item.implementationStatus ||
                          item.condition ||
                          (item.isPublished !== undefined
                            ? item.isPublished
                              ? 'Publik'
                              : 'Draft'
                            : 'Aktif');

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/70">
                            <td className="py-3 px-3 font-medium text-stone-900 max-w-xs truncate">
                              {title}
                            </td>
                            <td className="py-3 px-3 text-stone-600">{category}</td>
                            <td className="py-3 px-3 text-stone-500">{meta}</td>
                            <td className="py-3 px-3 text-stone-600">{String(status)}</td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditCrudModal(activeCrudModule, item)}
                                  className="px-2.5 py-1 rounded border border-[#E8E6DF] text-stone-700 hover:bg-stone-50 text-[11px]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteCrudItem(activeCrudModule, item.id, String(title))
                                  }
                                  className="px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: PUBLIC CONTENT APPROVAL & PUBLISHING
         ===================================================================== */}
      {activeTab === 'public-content' && (
        <div className="space-y-6">
          {/* Programs Public Visibility */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-3">
            <div className="border-b border-stone-100 pb-3">
              <h2 className="text-sm font-semibold text-stone-900">
                Visibilitas Publik Program Kerja ({programs.filter((p) => p.isFeaturedInPublic).length}/
                {programs.length} Tayang)
              </h2>
              <p className="text-xs text-stone-500">
                Atur program kerja yang ditampilkan pada halaman Portal Publik.
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {programs.map((prog) => (
                <div
                  key={prog.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="font-medium text-stone-900">
                      {prog.code} — {prog.title}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {prog.division} · PIC: {prog.pic}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const updated = {
                        ...prog,
                        isFeaturedInPublic: !prog.isFeaturedInPublic,
                      };
                      await onUpdateProgram(updated);
                      pushToast(
                        'success',
                        'Visibilitas Publik Diperbarui',
                        `${prog.title}: ${updated.isFeaturedInPublic ? 'Ditampilkan di Portal Publik' : 'Disembunyikan ke Internal'}`
                      );
                    }}
                    className={`px-3 py-1 rounded-md font-medium text-[11px] border transition-colors ${
                      prog.isFeaturedInPublic
                        ? 'bg-[#E8ECE9] text-[#284230] border-[#CCDCD0]'
                        : 'bg-white text-stone-600 border-[#E8E6DF] hover:bg-stone-50'
                    }`}
                  >
                    {prog.isFeaturedInPublic ? 'Tayang Publik' : 'Internal'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Public Articles Approval */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Artikel & Berita Portal Publik ({publicArticles.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Kelola publikasi berita kegiatan dan artikel desa.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveCrudModule('articles');
                  openCreateCrudModal('articles');
                }}
                className="px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3d5944]"
              >
                + Tulis Artikel
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {publicArticles.map((art) => (
                <div
                  key={art.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="font-medium text-stone-900">{art.title}</div>
                    <div className="text-[11px] text-stone-500">
                      {art.category} · {art.date} · {art.author}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const updated = { ...art, isPublished: !art.isPublished };
                        await onUpdateArticle?.(updated);
                        pushToast(
                          'success',
                          'Status Artikel Diubah',
                          `${art.title}: ${updated.isPublished ? 'Dipublikasikan' : 'Draft'}`
                        );
                      }}
                      className={`px-3 py-1 rounded-md font-medium text-[11px] border ${
                        art.isPublished
                          ? 'bg-[#E8ECE9] text-[#284230] border-[#CCDCD0]'
                          : 'bg-white text-stone-600 border-[#E8E6DF]'
                      }`}
                    >
                      {art.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: DATABASE, RLS POLICIES & EDGE FUNCTION STATUS
         ===================================================================== */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Infrastruktur Database & Keamanan RLS
                </h2>
                <p className="text-xs text-stone-500">
                  Supabase Project: <code className="font-mono">scslevzuxxkfcuvwbtty</code>
                </p>
              </div>
              <button
                onClick={handleExportDatabaseSnapshot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3d5944]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Snapshot JSON</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-md bg-[#FAF9F5] border border-[#E8E6DF] space-y-2">
                <div className="font-medium text-stone-900 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#4A6B53]" />
                  <span>Kebijakan Row Level Security (RLS)</span>
                </div>
                <ul className="space-y-1 text-[11px] text-stone-600 list-disc list-inside">
                  <li>
                    <code className="font-mono">public.is_super_admin()</code>: Akses penuh CRUD ke seluruh tabel sistem.
                  </li>
                  <li>
                    <code className="font-mono">public.is_active_member()</code>: Akses kolaborasi workspace untuk anggota aktif.
                  </li>
                  <li>
                    <code className="font-mono">public.is_dpl()</code>: Akses baca supervisi DPL & evaluasi laporan.
                  </li>
                  <li>
                    <code className="font-mono">trg_append_only_activity_logs</code>: Memblokir UPDATE & DELETE pada log aktivitas.
                  </li>
                  <li>
                    <code className="font-mono">trg_protect_super_admin</code>: Melindungi akun Super Admin utama.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-md bg-[#FAF9F5] border border-[#E8E6DF] space-y-2">
                <div className="font-medium text-stone-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#4A6B53]" />
                  <span>Edge Function & Manajemen Auth</span>
                </div>
                <ul className="space-y-1 text-[11px] text-stone-600 list-disc list-inside">
                  <li>
                    Edge Function: <code className="font-mono">supabase/functions/admin-manage-account</code>
                  </li>
                  <li>
                    Menggunakan <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> di sisi server.
                  </li>
                  <li>
                    Mendukung aksi <code className="font-mono">disable</code>, <code className="font-mono">restore</code>, dan <code className="font-mono">delete</code>.
                  </li>
                  <li>
                    Menjaga riwayat rapat, tugas, keputusan, dan survei ketika akun Auth dihapus.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: APPEND-ONLY SYSTEM ACTIVITY LOGS
         ===================================================================== */}
      {activeTab === 'activity-logs' && (
        <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                Log Aktivitas Sistem
              </h2>
              <p className="text-xs text-stone-500">
                Rekaman jejak audit pada tabel <code className="font-mono">admin_activity_logs</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Cari aksi atau target..."
                className="px-3 py-1.5 rounded-md border border-stone-200 text-xs"
              />
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {filteredLogs.map((l) => (
              <div
                key={l.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                      {l.action}
                    </span>
                    <span className="font-medium text-stone-900">{l.target}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">{l.details}</p>
                </div>
                <div className="text-right text-[11px] text-stone-400 shrink-0 font-mono">
                  <div>{l.adminEmail}</div>
                  <div>{new Date(l.timestamp).toLocaleString('id-ID')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: SYSTEM & UNIT CONFIGURATION
         ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-sm font-semibold text-stone-900">
              Konfigurasi Identitas Unit KKN
            </h2>
            <p className="text-xs text-stone-500">
              Informasi dasar unit KKN yang ditampilkan di ruang kerja dan portal publik.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Nama Unit KKN</label>
              <input
                type="text"
                value={configDraft.unitName}
                onChange={(e) => setConfigDraft({ ...configDraft, unitName: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-stone-200"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Universitas</label>
              <input
                type="text"
                value={configDraft.university}
                onChange={(e) => setConfigDraft({ ...configDraft, university: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-stone-200"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Desa Lokasi KKN</label>
              <input
                type="text"
                value={configDraft.villageName}
                onChange={(e) => setConfigDraft({ ...configDraft, villageName: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-stone-200"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Periode Pengabdian</label>
              <input
                type="text"
                value={configDraft.period}
                onChange={(e) => setConfigDraft({ ...configDraft, period: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-stone-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-stone-700 mb-1">Alamat Posko KKN</label>
              <input
                type="text"
                value={configDraft.poskoAddress}
                onChange={(e) => setConfigDraft({ ...configDraft, poskoAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-stone-200"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                onUpdateUnitConfig?.(configDraft);
                logAdminActivity(
                  'UPDATE_SYSTEM_CONFIG',
                  configDraft.unitName,
                  'Memperbarui konfigurasi identitas unit KKN'
                );
                pushToast(
                  'success',
                  'Konfigurasi Disimpan',
                  'Pengaturan unit KKN berhasil diperbarui.'
                );
              }}
              className="px-3.5 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3d5944]"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
