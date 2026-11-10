import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  isSessionValid,
  normalizeRegisteredEmailRow,
  isFabricatedLegacyRecord,
} from '../lib/supabase';
import { INITIAL_MEMBERS } from '../data/mockData';
import {
  RegisteredEmailRecord as TypesRegisteredEmailRecord,
  AdminActivityLogRecord,
} from '../types';

export type UserRole = 'ketua' | 'admin' | 'member' | 'dpl' | 'viewer';
export type SystemRole = 'super_admin' | 'admin' | 'member' | 'dpl' | 'viewer' | 'user';
export type ActiveWorkspaceMode = 'workspace' | 'admin';

export interface InvitationItem {
  id: string;
  token: string;
  name: string;
  email?: string;
  role: UserRole;
  division: string;
  status: 'pending' | 'accepted' | 'revoked';
  memberId?: string;
  acceptedByUid?: string;
  acceptedAt?: string;
}

export interface RegisteredEmailRecord extends TypesRegisteredEmailRecord {
  role?: UserRole;
  systemRole?: SystemRole;
}

export interface AdminActivityLog extends AdminActivityLogRecord {
  actorEmail?: string;
  actorName?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  systemRole?: SystemRole;
  position?: string;
  division?: string;
  invitationToken?: string;
  memberId?: string;
  accountStatus?: 'active' | 'pending' | 'revoked';
  acceptedAt?: string;
  emailVerified?: boolean;
  createdAt?: any;
}

/**
 * Compatible Auth User representation bridging Supabase Auth User with existing KKN SPACE components
 */
export interface AppAuthUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  emailConfirmedAt?: string | null;
  rawSupabaseUser?: SupabaseUser;
}

export interface ActivationResult {
  needsEmailVerification: boolean;
  email: string;
  profile: UserProfile;
}

interface AuthContextType {
  user: AppAuthUser | null;
  session: SupabaseSession | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  isSupabaseReady: boolean;
  isPasswordRecoveryMode: boolean;
  clearPasswordRecoveryMode: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMember: boolean;
  isDpl: boolean;
  canWrite: boolean;
  activeMode: ActiveWorkspaceMode;
  setActiveMode: (mode: ActiveWorkspaceMode) => void;
  registeredEmails: RegisteredEmailRecord[];
  adminLogs: AdminActivityLog[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  checkRegisteredEmail: (email: string) => Promise<RegisteredEmailRecord | null>;
  activateWithRegisteredEmail: (
    email: string,
    pass: string
  ) => Promise<ActivationResult>;
  resendVerificationEmail: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  fetchRegisteredEmails: () => Promise<RegisteredEmailRecord[]>;
  fetchActivityLogs: () => Promise<AdminActivityLogRecord[]>;
  registerMemberEmail: (
    nameOrRecord:
      | string
      | Omit<RegisteredEmailRecord, 'id' | 'status' | 'registeredAt' | 'registeredBy'>,
    email?: string,
    position?: string,
    division?: string,
    memberId?: string
  ) => Promise<RegisteredEmailRecord>;
  updateRegisteredEmail: (
    email: string,
    updates: Partial<RegisteredEmailRecord>
  ) => Promise<void>;
  revokeRegisteredEmail: (email: string) => Promise<void>;
  disableMemberAccount: (emailOrMemberId: string, reason?: string) => Promise<void>;
  restoreMemberAccount: (emailOrMemberId: string) => Promise<void>;
  deleteMemberAccount: (emailOrMemberId: string) => Promise<void>;
  logAdminActivity: (
    action: AdminActivityLogRecord['action'] | string,
    target: string,
    details: string
  ) => Promise<void>;
  createInvitation: (
    name: string,
    email: string,
    role: UserRole,
    division: string
  ) => Promise<string>;
  fetchInvitations: () => Promise<InvitationItem[]>;
  revokeInvitation: (id: string) => Promise<void>;
  activateInvitation: (
    token: string,
    email: string,
    pass: string,
    displayName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  syncOwnProfileMetadata: (updates: {
    displayName?: string;
    position?: string;
    division?: string;
  }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = 'abhyy333@gmail.com';
const PROFILE_STORAGE_KEY = 'kkn_space_Authoritative_Profile_v3';
const REGISTERED_EMAILS_STORAGE_KEY = 'kkn_space_registered_emails_v2';
const KKN_PROJECT_ID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';
const ADMIN_LOGS_STORAGE_KEY = 'kkn_space_admin_logs_v1';

// In-memory deduplication & session-scoped cache to prevent duplicate database queries
const inflightProfileRequests = new Map<string, Promise<UserProfile | null>>();
const memoryProfileCache = new Map<string, UserProfile>();

// Authoritative Initial Registered Emails Directory
// Strictly contains ONLY confirmed super_admin abhyy333@gmail.com (Abdul Habir Al Majdi - Divisi Acara 1).
// Other members start with empty email ("Belum Didaftarkan") until registered by super_admin.
export const INITIAL_REGISTERED_EMAILS: RegisteredEmailRecord[] = [
  {
    id: 'abhyy333_gmail_com',
    email: 'abhyy333@gmail.com',
    name: 'Abdul Habir Al Majdi',
    position: 'Divisi Acara 1',
    division: 'Divisi Acara',
    role: 'member',
    systemRole: 'super_admin',
    memberId: 'm-4',
    status: 'activated',
    registeredBy: 'System Bootstrap',
    registeredAt: '2026-07-15T08:00:00.000Z',
    activatedAt: '2026-07-19T08:30:00.000Z',
  },
];

export const INITIAL_ADMIN_LOGS: AdminActivityLog[] = [
  {
    id: 'log-1',
    action: 'BOOTSTRAP_SUPER_ADMIN',
    target: 'abhyy333@gmail.com',
    adminEmail: 'system@kknspace.id',
    adminName: 'System Security',
    actorEmail: 'system@kknspace.id',
    actorName: 'System Security',
    timestamp: '2026-07-19T08:30:00.000Z',
    details:
      'Menautkan abhyy333@gmail.com ke profil Abdul Habir Al Majdi (Divisi Acara 1) dengan hak akses Super Admin.',
    status: 'success',
  },
  {
    id: 'log-2',
    action: 'SYSTEM_SETTING_CHANGED',
    target: 'Supabase Auth & registered_emails',
    adminEmail: 'abhyy333@gmail.com',
    adminName: 'Abdul Habir Al Majdi',
    actorEmail: 'abhyy333@gmail.com',
    actorName: 'Abdul Habir Al Majdi',
    timestamp: '2026-07-19T09:00:00.000Z',
    details:
      'Mengintegrasikan autentikasi ke Supabase Auth dengan validasi tabel registered_emails.',
    status: 'success',
  },
];

function sanitizeEmailId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function toAppRegisteredEmailRecord(row: Record<string, any>): RegisteredEmailRecord {
  const normalized = normalizeRegisteredEmailRow(row);
  return {
    id: normalized.id || sanitizeEmailId(normalized.email),
    email: normalized.email,
    name: normalized.name,
    position: normalized.position,
    division: normalized.division,
    role: normalized.role,
    systemRole: normalized.systemRole,
    memberId: normalized.memberId,
    registeredBy: normalized.registeredBy,
    registeredAt: normalized.registeredAt,
    status:
      normalized.status === 'pending'
        ? 'pending_activation'
        : normalized.status,
    activatedUid: normalized.activatedUid,
    activatedAt: normalized.activatedAt,
    disabledAt: normalized.disabledAt,
    disabledReason: normalized.disabledReason,
  };
}

function saveCachedProfile(uid: string, profile: UserProfile) {
  memoryProfileCache.set(uid, profile);
  if (profile.email) {
    memoryProfileCache.set(profile.email.toLowerCase(), profile);
  }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[uid] = profile;
    if (profile.email) {
      cache[profile.email.toLowerCase()] = profile;
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Could not save profile to localStorage:', e);
  }
}

function getCachedProfile(uid: string, email?: string | null): UserProfile | null {
  if (memoryProfileCache.has(uid)) {
    return memoryProfileCache.get(uid) || null;
  }
  if (email && memoryProfileCache.has(email.toLowerCase())) {
    return memoryProfileCache.get(email.toLowerCase()) || null;
  }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (cache[uid]) {
      memoryProfileCache.set(uid, cache[uid]);
      return cache[uid];
    }
    if (email && cache[email.toLowerCase()]) {
      const found = cache[email.toLowerCase()];
      memoryProfileCache.set(uid, found);
      return found;
    }
    return null;
  } catch {
    return null;
  }
}

function clearCachedProfile() {
  memoryProfileCache.clear();
  inflightProfileRequests.clear();
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}

function getLocalRegisteredEmails(): RegisteredEmailRecord[] {
  try {
    const raw = localStorage.getItem(REGISTERED_EMAILS_STORAGE_KEY);
    if (!raw) return INITIAL_REGISTERED_EMAILS;
    const parsed = JSON.parse(raw) as RegisteredEmailRecord[];
    const mergedMap = new Map<string, RegisteredEmailRecord>();
    INITIAL_REGISTERED_EMAILS.forEach((item) =>
      mergedMap.set(item.email.toLowerCase(), item)
    );
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (!item || !item.email || isFabricatedLegacyRecord(item)) return;
        mergedMap.set(item.email.toLowerCase(), toAppRegisteredEmailRecord(item));
      });
    }
    return Array.from(mergedMap.values());
  } catch {
    return INITIAL_REGISTERED_EMAILS;
  }
}

function saveLocalRegisteredEmails(list: RegisteredEmailRecord[]) {
  try {
    localStorage.setItem(REGISTERED_EMAILS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save registered emails locally:', e);
  }
}

function mapSupabaseUserToAppUser(
  sbUser: SupabaseUser,
  resolvedDisplayName?: string
): AppAuthUser {
  const isEmailVerified = Boolean(
    sbUser.email_confirmed_at ||
      (sbUser as any).confirmed_at ||
      sbUser.app_metadata?.provider !== 'email'
  );
  return {
    uid: sbUser.id,
    id: sbUser.id,
    email: sbUser.email || null,
    displayName:
      resolvedDisplayName ||
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      sbUser.email?.split('@')[0] ||
      null,
    emailVerified: isEmailVerified,
    emailConfirmedAt: sbUser.email_confirmed_at || null,
    rawSupabaseUser: sbUser,
  };
}

function detectUrlRecoveryContext(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    path === '/reset-password' ||
    hash.includes('type=recovery') ||
    search.includes('type=recovery')
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(
    null
  );
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState<boolean>(
    detectUrlRecoveryContext
  );
  const [activeMode, setActiveMode] = useState<ActiveWorkspaceMode>('workspace');
  const [registeredEmails, setRegisteredEmails] = useState<RegisteredEmailRecord[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>(() => {
    try {
      const raw = localStorage.getItem(ADMIN_LOGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_ADMIN_LOGS;
    } catch {
      return INITIAL_ADMIN_LOGS;
    }
  });

  // Track whether the user had an active session in this lifecycle to detect unexpected session expiration
  const hadActiveSessionRef = useRef(false);
  const isManualSignOutRef = useRef(false);

  const clearPasswordRecoveryMode = () => {
    setIsPasswordRecoveryMode(false);
  };

  const clearSessionExpiredNotice = () => {
    setSessionExpiredNotice(null);
  };

  const fetchRegisteredEmails = async (): Promise<RegisteredEmailRecord[]> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase belum terkonfigurasi. Data registrasi email tidak dapat dimuat.');
    }

    const [{ data: registryRows, error: registryError }, { data: memberRows, error: memberError }, { data: accessRows, error: accessError }] = await Promise.all([
      supabase
        .from('registered_emails')
        .select('id,project_id,member_id,email,system_role,is_enabled,registered_by,activated_at,created_at')
        .eq('project_id', KKN_PROJECT_ID)
        .order('created_at', { ascending: false }),
      supabase
        .from('members')
        .select('id,project_id,full_name,position_title,division,member_category,status,auth_user_id')
        .eq('project_id', KKN_PROJECT_ID),
      supabase
        .from('member_access')
        .select('member_id,user_id,role,is_active,project_id')
        .eq('project_id', KKN_PROJECT_ID),
    ]);

    if (registryError) throw new Error(`Gagal membaca registered_emails: ${registryError.message}`);
    if (memberError) throw new Error(`Gagal membaca profil anggota: ${memberError.message}`);
    if (accessError) throw new Error(`Gagal membaca akses anggota: ${accessError.message}`);

    const membersById = new Map((memberRows || []).map((m: any) => [String(m.id), m]));
    const accessByMemberId = new Map((accessRows || []).map((a: any) => [String(a.member_id), a]));

    const finalEmails: RegisteredEmailRecord[] = (registryRows || []).map((row: any) => {
      const member: any = membersById.get(String(row.member_id)) || {};
      const access: any = accessByMemberId.get(String(row.member_id)) || {};
      const isDisabled = row.is_enabled === false;
      const isActivated = !isDisabled && Boolean(row.activated_at && member.auth_user_id);
      const role: UserRole =
        member.member_category === 'supervisor' || access.role === 'dpl'
          ? 'dpl'
          : access.role === 'chair' || member.position_title === 'Ketua'
            ? 'ketua'
            : 'member';
      const systemRole: SystemRole =
        row.system_role === 'super_admin'
          ? 'super_admin'
          : row.system_role === 'admin'
            ? 'admin'
            : 'user';

      return {
        id: String(row.id),
        email: String(row.email || '').trim().toLowerCase(),
        name: String(member.full_name || 'Anggota KKN'),
        position: String(member.position_title || 'Anggota'),
        division: String(member.division || 'Umum'),
        role,
        systemRole,
        memberId: row.member_id ? String(row.member_id) : undefined,
        registeredBy: row.registered_by ? 'Administrator KKN' : 'Sistem',
        registeredAt: String(row.created_at || new Date().toISOString()),
        status: isDisabled ? 'disabled' : isActivated ? 'activated' : 'pending_activation',
        activatedUid: member.auth_user_id ? String(member.auth_user_id) : undefined,
        activatedAt: row.activated_at || undefined,
      };
    });

    setRegisteredEmails(finalEmails);
    return finalEmails;
  };

  const fetchActivityLogs = async (): Promise<AdminActivityLogRecord[]> => {
    let combined = [...adminLogs];
    if (isSupabaseConfigured) {
      try {
        const { data: sbLogs, error: sbLogErr } = await supabase
          .from('admin_activity_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(200);
        if (!sbLogErr && Array.isArray(sbLogs) && sbLogs.length > 0) {
          const mappedSbLogs: AdminActivityLog[] = sbLogs.map((l: any) => ({
            id: String(l.id),
            timestamp: String(l.timestamp || l.created_at || new Date().toISOString()),
            adminEmail: String(l.admin_email || l.adminEmail || SUPER_ADMIN_EMAIL),
            adminName: String(l.admin_name || l.adminName || 'Super Admin'),
            actorEmail: String(l.admin_email || l.adminEmail || SUPER_ADMIN_EMAIL),
            actorName: String(l.admin_name || l.adminName || 'Super Admin'),
            action: (l.action || 'SYSTEM_SETTING_CHANGED') as AdminActivityLogRecord['action'],
            target: String(l.target || '-'),
            details: String(l.details || ''),
            status: (l.status === 'warning' || l.status === 'error' ? l.status : 'success') as
              | 'success'
              | 'warning'
              | 'error',
            ip: l.ip,
          }));
          const logMap = new Map<string, AdminActivityLog>();
          [...mappedSbLogs, ...combined].forEach((item) => logMap.set(item.id, item));
          combined = Array.from(logMap.values());
        }
      } catch {
        // Optional table
      }
    }

    try {
      const logsRes = await fetch('/api/admin/activity-logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        const list = logsData.logs || [];
        if (Array.isArray(list) && list.length > 0) {
          const logMap = new Map<string, AdminActivityLog>();
          [...combined, ...list].forEach((item: any) => logMap.set(item.id, item));
          combined = Array.from(logMap.values());
        }
      }
    } catch {
      // Fallback to local logs
    }

    combined.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    setAdminLogs(combined);
    localStorage.setItem(ADMIN_LOGS_STORAGE_KEY, JSON.stringify(combined));
    return combined;
  };

  /**
   * Single-query lookup for `registered_emails` (used during initial registration check or fallback).
   */
  const fetchAuthoritativeEmailRecord = async (
    emailInput: string
  ): Promise<RegisteredEmailRecord | null> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || isFabricatedLegacyRecord({ email: cleanEmail })) return null;
    if (!isSupabaseConfigured) {
      throw new Error('Supabase belum terkonfigurasi. Aktivasi akun tidak dapat dilanjutkan.');
    }

    const { data, error } = await supabase.functions.invoke('check-member-email-registration', {
      body: { email: cleanEmail, project_id: KKN_PROJECT_ID },
    });
    if (error) {
      let detail = error.message;
      try {
        const body = await (error as any).context?.json();
        if (body?.message || body?.error) detail = body.message || body.error;
      } catch {}
      throw new Error(detail || 'Gagal memeriksa registrasi email.');
    }
    if (!data?.success) {
      throw new Error(data?.error || data?.message || 'Gagal memeriksa registrasi email.');
    }
    if (!data.eligible) {
      const status = data.status || data.code;
      if (status === 'not_registered' || status === 'unregistered_email') {
        throw new Error('Email ini belum didaftarkan oleh Administrator KKN.');
      }
      if (status === 'already_active' || status === 'existing_auth_account') {
        throw new Error('Akun untuk email ini sudah aktif. Silakan masuk melalui tab Masuk Akun.');
      }
      if (status === 'confirmation_pending') {
        throw new Error('Akun sudah dibuat tetapi email belum dikonfirmasi. Silakan kirim ulang email verifikasi atau periksa kotak masuk Anda.');
      }
      if (status === 'account_reconciliation_required') {
        throw new Error('Email ini sudah memiliki akun Auth yang belum tertaut. Administrator harus menyinkronkan akun terlebih dahulu.');
      }
      if (status === 'disabled' || status === 'account_disabled') {
        throw new Error('Akun ini telah dinonaktifkan oleh Administrator KKN.');
      }
      throw new Error(data.message || data.error || 'Email tidak memenuhi syarat aktivasi.');
    }

    const d = data.data || {};
    if (!d.member_id || !d.name || !d.position || !d.division) {
      throw new Error('Data email terdaftar belum lengkap. Hubungi Administrator KKN.');
    }
    return {
      id: String(d.registration_id || d.member_id),
      email: String(d.email || cleanEmail).trim().toLowerCase(),
      name: String(d.name),
      position: String(d.position),
      division: String(d.division),
      role: d.role === 'dpl' ? 'dpl' : d.role === 'ketua' ? 'ketua' : 'member',
      systemRole: d.system_role === 'super_admin' ? 'super_admin' : 'user',
      memberId: String(d.member_id),
      registeredBy: 'Administrator KKN',
      registeredAt: String(d.registered_at || new Date().toISOString()),
      status: 'pending_activation',
    };
  };

  /**
   * Optimized single-query profile, membership, and role loader after Supabase authentication.
   * - Deduplicates concurrent in-flight requests for the same UID.
   * - Reuses session-scoped memory cache to avoid duplicate database queries.
   * - Performs ZERO database writes during login or session restoration.
   * - Preserves role separation between KKN member, DPL, and super admin.
   */
  const resolveDatabaseProfileForUser = async (
    sbUser: SupabaseUser,
    forceRefresh = false
  ): Promise<UserProfile | null> => {
    const uid = sbUser.id;
    const cleanEmail = (sbUser.email || '').trim().toLowerCase();
    if (!uid || !cleanEmail || !isSupabaseConfigured) return null;

    if (!forceRefresh && memoryProfileCache.has(uid)) {
      return memoryProfileCache.get(uid)!;
    }
    if (!forceRefresh && inflightProfileRequests.has(uid)) {
      return inflightProfileRequests.get(uid)!;
    }

    const loadPromise = (async (): Promise<UserProfile | null> => {
      try {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id,project_id,full_name,position_title,division,member_category,status,auth_user_id')
          .eq('project_id', KKN_PROJECT_ID)
          .eq('auth_user_id', uid)
          .maybeSingle();

        if (memberError) {
          console.warn('Member profile lookup failed:', memberError.message);
          return null;
        }
        if (!member || member.auth_user_id !== uid || member.status !== 'active') {
          return null;
        }

        const { data: access, error: accessError } = await supabase
          .from('member_access')
          .select('role,is_active,user_id')
          .eq('project_id', KKN_PROJECT_ID)
          .eq('member_id', member.id)
          .eq('user_id', uid)
          .eq('is_active', true)
          .maybeSingle();

        if (accessError || !access || access.user_id !== uid) {
          if (accessError) console.warn('Member access lookup failed:', accessError.message);
          return null;
        }

        let adminRole: string | null = null;
        try {
          const { data: adminAccount } = await supabase
            .from('admin_accounts')
            .select('role,is_active')
            .eq('user_id', uid)
            .maybeSingle();
          if (adminAccount?.is_active) adminRole = adminAccount.role;
        } catch {
          // Ordinary members are not allowed to read administrator records.
        }

        const appRole: UserRole =
          member.member_category === 'supervisor' || access.role === 'dpl'
            ? 'dpl'
            : access.role === 'chair'
              ? 'ketua'
              : 'member';
        const systemRole: SystemRole =
          adminRole === 'super_admin'
            ? 'super_admin'
            : adminRole === 'admin'
              ? 'admin'
              : 'user';

        const resolvedProfile: UserProfile = {
          uid,
          email: cleanEmail,
          displayName: member.full_name,
          role: appRole,
          systemRole,
          position: member.position_title,
          division: member.division,
          memberId: String(member.id),
          accountStatus: 'active',
          acceptedAt: new Date().toISOString(),
          emailVerified: Boolean(sbUser.email_confirmed_at),
        };

        saveCachedProfile(uid, resolvedProfile);
        return resolvedProfile;
      } finally {
        inflightProfileRequests.delete(uid);
      }
    })();

    inflightProfileRequests.set(uid, loadPromise);
    return loadPromise;
  };

  /**
   * Used ONLY during initial account activation to link the newly activated user ID
   * without creating duplicate member records.
   */
  const linkAccountOnInitialActivation = async (
    sbUser: SupabaseUser
  ): Promise<UserProfile> => {
    // The private.register_kkn_auth_user trigger links Auth UID, profile and project role.
    // The client must never write authorization columns into registered_emails.
    const refreshed = await resolveDatabaseProfileForUser(sbUser, true);
    if (!refreshed) {
      throw new Error('Akun Auth berhasil dibuat, tetapi profil anggota belum tertaut. Hubungi Administrator KKN sebelum mencoba login.');
    }
    return refreshed;
  };

  // Supabase Auth Session Persistence, Instant Reuse & Token Refresh Listener
  useEffect(() => {
    let isMounted = true;

    const handleSupabaseSession = async (
      currentSession: SupabaseSession | null,
      authEvent?: string
    ) => {
      if (!isMounted) return;

      // 1. Handle PASSWORD_RECOVERY isolation
      if (
        authEvent === 'PASSWORD_RECOVERY' ||
        (typeof window !== 'undefined' &&
          (window.location.pathname === '/reset-password' ||
            window.location.hash.includes('type=recovery') ||
            window.location.search.includes('type=recovery')))
      ) {
        setSession(currentSession);
        setIsPasswordRecoveryMode(true);
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/reset-password'
        ) {
          window.history.replaceState(
            {},
            '',
            `/reset-password${window.location.search}${window.location.hash}`
          );
        }
        setLoading(false);
        return;
      }

      // 2. Handle missing or expired session
      if (!isSessionValid(currentSession)) {
        if (hadActiveSessionRef.current && !isManualSignOutRef.current) {
          setSessionExpiredNotice(
            'Sesi login Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.'
          );
        }
        hadActiveSessionRef.current = false;
        isManualSignOutRef.current = false;
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const validSession = currentSession!;
      const sbUser = validSession.user;
      hadActiveSessionRef.current = true;
      setSession(validSession);

      // Authorization is always reloaded from live members/member_access/admin_accounts rows.
      // 4. Resolve / verify authorization in a single deduplicated query
      try {
        const resolvedProfile = await resolveDatabaseProfileForUser(sbUser, true);
        if (!isMounted) return;

        if (!resolvedProfile) {
          isManualSignOutRef.current = true;
          await supabase.auth.signOut();
          clearCachedProfile();
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthError('Email belum terdaftar. Silakan hubungi administrator.');
          setLoading(false);
          return;
        }

        setProfile(resolvedProfile);
        setUser(mapSupabaseUserToAppUser(sbUser, resolvedProfile.displayName));
        setAuthError(null);
      } catch (err) {
        console.error('Error resolving user profile:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Reuse existing persisted session from Supabase Auth
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        handleSupabaseSession(initialSession, 'INITIAL_SESSION');
      })
      .catch((err) => {
        console.warn('Supabase getSession warning:', err);
        if (isMounted) setLoading(false);
      });

    // Listen for SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, PASSWORD_RECOVERY
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED' && nextSession) {
        // Keep existing profile & user state without re-querying database on token refresh
        setSession(nextSession);
        return;
      }
      handleSupabaseSession(nextSession, event);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Step 1 of Registration: Validate email against `registered_emails` table.
   * Rejects any email not registered by admin.
   */
  const checkRegisteredEmail = async (
    emailInput: string
  ): Promise<RegisteredEmailRecord | null> => {
    setAuthError(null);
    return fetchAuthoritativeEmailRecord(emailInput);
  };

  /**
   * First-time Account Activation using Supabase Auth signUp with email & password.
   * Email verification is required ONLY here during initial account activation.
   */
  const activateWithRegisteredEmail = async (
    emailInput: string,
    pass: string
  ): Promise<ActivationResult> => {
    setAuthError(null);
    const cleanEmail = emailInput.trim().toLowerCase();
    if (pass.length < 8) throw new Error('Password minimal harus terdiri dari 8 karakter.');

    const record = await fetchAuthoritativeEmailRecord(cleanEmail);
    if (!record) {
      throw new Error('Email belum didaftarkan oleh Administrator KKN.');
    }
    if (record.status === 'activated' && record.activatedUid) {
      throw new Error('Akun untuk email ini sudah aktif. Silakan masuk melalui tab Masuk Akun.');
    }
    if (!isSupabaseConfigured) {
      throw new Error('Konfigurasi Supabase belum lengkap. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          full_name: record.name,
          member_id: record.memberId,
          project_id: KKN_PROJECT_ID,
        },
        emailRedirectTo: new URL('/workspace', window.location.origin).toString(),
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered')) {
        throw new Error('Akun untuk email ini sudah dibuat. Gunakan Masuk Akun atau kirim ulang verifikasi email.');
      }
      if (msg.includes('database error saving new user') || msg.includes('email is not registered')) {
        throw new Error('Supabase menolak pembuatan akun karena data registrasi email belum tersimpan/terhubung dengan anggota. Muat ulang halaman Admin Console dan pastikan email tampil di Email Registration.');
      }
      if (msg.includes('password')) {
        throw new Error('Password minimal harus terdiri dari 8 karakter.');
      }
      if (msg.includes('rate limit') || msg.includes('security purposes')) {
        throw new Error('Terlalu banyak permintaan email verifikasi. Tunggu sebentar sebelum mencoba lagi.');
      }
      if (msg.includes('email') && (msg.includes('smtp') || msg.includes('sending'))) {
        throw new Error('Akun belum dapat diaktifkan karena layanan email Supabase gagal mengirim verifikasi. Pendaftaran tetap tercatat; periksa konfigurasi SMTP Supabase.');
      }
      throw new Error(signUpError.message || 'Gagal melakukan registrasi akun.');
    }

    const sbUser = signUpData.user;
    if (!sbUser) throw new Error('Supabase tidak mengembalikan akun pengguna.');
    if (Array.isArray(sbUser.identities) && sbUser.identities.length === 0) {
      throw new Error('Akun untuk email ini sudah dibuat. Gunakan Masuk Akun atau kirim ulang verifikasi email.');
    }

    const isEmailVerified = Boolean(sbUser.email_confirmed_at);
    const acceptedAt = new Date().toISOString();
    const previewProfile: UserProfile = {
      uid: sbUser.id,
      email: cleanEmail,
      displayName: record.name,
      role: record.role || 'member',
      systemRole: record.systemRole || 'user',
      position: record.position,
      division: record.division,
      memberId: record.memberId,
      accountStatus: isEmailVerified ? 'active' : 'pending',
      acceptedAt,
      emailVerified: isEmailVerified,
    };

    if (!isEmailVerified) {
      if (signUpData.session) {
        isManualSignOutRef.current = true;
        await supabase.auth.signOut();
      }
      setSession(null);
      setUser(null);
      setProfile(null);
      return { needsEmailVerification: true, email: cleanEmail, profile: previewProfile };
    }

    const resolvedProfile = await linkAccountOnInitialActivation(sbUser);
    if (!signUpData.session) {
      // A confirmed signup without a session must be verified via the regular login flow.
      return { needsEmailVerification: false, email: cleanEmail, profile: resolvedProfile };
    }

    hadActiveSessionRef.current = true;
    setSession(signUpData.session);
    setProfile(resolvedProfile);
    setUser(mapSupabaseUserToAppUser(sbUser, resolvedProfile.displayName));
    return { needsEmailVerification: false, email: cleanEmail, profile: resolvedProfile };
  };

  /**
   * Resends the Supabase signup confirmation email (used during initial activation if needed).
   */
  const resendVerificationEmail = async (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!isSupabaseConfigured) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'
      );
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/workspace`,
      },
    });
    if (error) {
      throw new Error(
        error.message ||
          'Gagal mengirim ulang email verifikasi. Silakan coba sesaat lagi.'
      );
    }
  };

  /**
   * Forgot Password Workflow:
   * Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
   */
  const requestPasswordReset = async (emailInput: string) => {
    setAuthError(null);
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Masukkan alamat email terlebih dahulu.');
    }

    if (!isSupabaseConfigured) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('security purposes')) {
        throw new Error(
          'Terlalu banyak permintaan pemulihan password. Silakan tunggu beberapa saat sebelum mencoba kembali.'
        );
      }
      if (
        msg.includes('invalid api key') ||
        msg.includes('fetch') ||
        msg.includes('network')
      ) {
        throw new Error(
          'Gagal menghubungi layanan autentikasi Supabase. Periksa konfigurasi jaringan atau environment.'
        );
      }
    }
  };

  /**
   * Reset Password Update via `supabase.auth.updateUser({ password: newPassword })`.
   */
  const updateUserPassword = async (newPassword: string) => {
    setAuthError(null);

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password baru minimal harus terdiri dari 8 karakter.');
    }

    if (!isSupabaseConfigured) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'
      );
    }

    const {
      data: { session: activeRecoverySession },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr || !activeRecoverySession || !activeRecoverySession.user) {
      throw new Error(
        'Tautan pemulihan password tidak valid, sudah digunakan, atau telah kedaluwarsa. Silakan ajukan reset password baru.'
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('same as the old password') ||
        msg.includes('different from the old password')
      ) {
        throw new Error(
          'Password baru harus berbeda dari password yang digunakan sebelumnya.'
        );
      }
      if (msg.includes('expired') || msg.includes('session')) {
        throw new Error(
          'Sesi pemulihan password telah berakhir. Silakan minta tautan pemulihan password baru.'
        );
      }
      throw new Error(
        error.message || 'Gagal memperbarui password. Silakan coba kembali.'
      );
    }

    isManualSignOutRef.current = true;
    await supabase.auth.signOut();
    clearCachedProfile();
    setIsPasswordRecoveryMode(false);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  /**
   * Fast Login using `supabase.auth.signInWithPassword`:
   * 1. Reuses an existing valid session if already authenticated for the same email.
   * 2. Calls `supabase.auth.signInWithPassword` directly without pre-flight email queries.
   * 3. Does not enforce redundant email verification checks on every login.
   * 4. Fetches profile, membership, and role in a single deduplicated query.
   */
  const signInWithEmail = async (
    emailInput: string,
    pass: string
  ): Promise<UserProfile> => {
    setAuthError(null);
    setSessionExpiredNotice(null);
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur.'
      );
    }

    // 1. Reuse existing valid session if already active for this user
    if (
      isSessionValid(session) &&
      user &&
      profile &&
      user.email?.toLowerCase() === cleanEmail
    ) {
      return profile;
    }

    // 2. Authenticate directly with Supabase signInWithPassword (no pre-login blocking queries)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        throw new Error(
          'Akun Anda belum menyelesaikan aktivasi awal. Silakan klik tautan verifikasi pada email aktivasi pertama Anda.'
        );
      }
      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials')
      ) {
        throw new Error(
          'Email atau password tidak sesuai. Pastikan akun Anda sudah diaktivasi dan password benar.'
        );
      }
      throw new Error(error.message || 'Gagal masuk ke akun.');
    }

    const sbUser = data.user;
    if (!sbUser || !data.session) {
      throw new Error('Tidak dapat memuat sesi pengguna dari Supabase.');
    }

    // 3. Single optimized query to load profile, membership, and role
    const resolvedProfile = await resolveDatabaseProfileForUser(sbUser);
    if (!resolvedProfile) {
      isManualSignOutRef.current = true;
      await supabase.auth.signOut();
      clearCachedProfile();
      throw new Error('Email belum terdaftar. Silakan hubungi administrator.');
    }

    hadActiveSessionRef.current = true;
    setIsPasswordRecoveryMode(false);
    setSession(data.session);
    setProfile(resolvedProfile);
    setUser(mapSupabaseUserToAppUser(sbUser, resolvedProfile.displayName));
    return resolvedProfile;
  };

  /**
   * Google OAuth sign-in via Supabase Auth
   */
  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'
      );
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/workspace`,
      },
    });
    if (error) {
      throw new Error(
        error.message || 'Gagal masuk dengan Google melalui Supabase.'
      );
    }
  };

  const logAdminActivity = async (
    action: AdminActivityLogRecord['action'] | string,
    target: string,
    details: string
  ) => {
    const newLog: AdminActivityLog = {
      id: `log-${Date.now()}`,
      action: action as AdminActivityLogRecord['action'],
      target,
      adminEmail: user?.email || SUPER_ADMIN_EMAIL,
      adminName: profile?.displayName || 'Super Admin',
      actorEmail: user?.email || SUPER_ADMIN_EMAIL,
      actorName: profile?.displayName || 'Super Admin',
      timestamp: new Date().toISOString(),
      details,
      status: 'success',
    };

    const nextLogs = [newLog, ...adminLogs];
    setAdminLogs(nextLogs);
    localStorage.setItem(ADMIN_LOGS_STORAGE_KEY, JSON.stringify(nextLogs));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('admin_activity_logs').insert({
          id: newLog.id,
          action: newLog.action,
          target: newLog.target,
          admin_email: newLog.adminEmail,
          admin_name: newLog.adminName,
          timestamp: newLog.timestamp,
          details: newLog.details,
          status: newLog.status,
        });
      } catch {
        // Optional table
      }
    }
  };

  const registerMemberEmail = async (
    nameOrRecord:
      | string
      | Omit<RegisteredEmailRecord, 'id' | 'status' | 'registeredAt' | 'registeredBy'>,
    emailArg?: string,
    positionArg?: string,
    divisionArg?: string,
    memberIdArg?: string
  ): Promise<RegisteredEmailRecord> => {
    if (!isSupabaseConfigured) throw new Error('Supabase belum terkonfigurasi.');
    if (!user?.uid || !user.email) throw new Error('Sesi Admin tidak valid. Silakan login ulang.');

    const inputObj = typeof nameOrRecord === 'string'
      ? {
          name: nameOrRecord,
          email: emailArg || '',
          position: positionArg || 'Anggota KKN',
          division: divisionArg || 'Divisi Acara',
          memberId: memberIdArg,
          role: 'member' as UserRole,
          systemRole: 'user' as SystemRole,
        }
      : nameOrRecord;

    const cleanEmail = inputObj.email.trim().toLowerCase();
    const memberId = String(inputObj.memberId || '').trim();
    if (!memberId) throw new Error('ID anggota database tidak ditemukan. Muat ulang daftar anggota sebelum mendaftarkan email.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Format alamat email tidak valid.');

    const { data, error } = await supabase.functions.invoke('admin-register-member-email', {
      body: {
        project_id: KKN_PROJECT_ID,
        member_id: memberId,
        email: cleanEmail,
        confirm_member_name: inputObj.name.trim(),
        reason: 'Pendaftaran email melalui Admin Console',
      },
    });

    if (error) {
      let detail = error.message;
      try {
        const body = await (error as any).context?.json();
        if (body?.error || body?.message) detail = body.error || body.message;
      } catch {}
      throw new Error(detail || 'Gagal menyimpan registrasi email ke Supabase.');
    }
    if (!data?.success) throw new Error(data?.error || 'Registrasi email gagal disimpan.');

    const refreshed = await fetchRegisteredEmails();
    const saved = refreshed.find((r) => r.email.toLowerCase() === cleanEmail && r.memberId === memberId);
    if (saved) return saved;

    return {
      id: String(data.registration_id || memberId),
      email: cleanEmail,
      name: String(data.name || inputObj.name),
      position: String(data.position || inputObj.position),
      division: String(data.division || inputObj.division),
      role: data.role === 'dpl' ? 'dpl' : data.role === 'ketua' ? 'ketua' : 'member',
      systemRole: 'user',
      memberId,
      registeredBy: user.email,
      registeredAt: String(data.registered_at || new Date().toISOString()),
      status: 'pending_activation',
    };
  };

  const updateRegisteredEmail = async (
    emailOrId: string,
    updates: Partial<RegisteredEmailRecord>
  ) => {
    if (!isSupabaseConfigured || !user?.uid) throw new Error('Sesi Admin tidak valid.');
    const current = registeredEmails.find(
      (item) => item.id === emailOrId || item.email.toLowerCase() === emailOrId.trim().toLowerCase()
    );
    if (!current?.memberId) throw new Error('Data email anggota tidak ditemukan di registry Supabase.');
    const newEmail = String(updates.email || current.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new Error('Format email baru tidak valid.');

    const { data, error } = await supabase.functions.invoke('admin-reset-member-email', {
      body: {
        project_id: KKN_PROJECT_ID,
        member_id: current.memberId,
        action: 'replace',
        new_email: newEmail,
        confirm_member_name: current.name,
        reason: 'Penggantian email melalui Admin Console',
      },
    });
    if (error) {
      let detail = error.message;
      try {
        const body = await (error as any).context?.json();
        if (body?.error || body?.message) detail = body.error || body.message;
      } catch {}
      throw new Error(detail || 'Gagal mengganti email anggota.');
    }
    if (!data?.success) throw new Error(data?.error || 'Penggantian email gagal.');
    await fetchRegisteredEmails();
    await logAdminActivity('UPDATE_REGISTERED_EMAIL', newEmail, `Email login ${current.name} diperbarui dan aktivasi harus diulang.`);
  };

  const revokeRegisteredEmail = async (emailInput: string) => {
    await disableMemberAccount(emailInput, 'Dicabut oleh Super Admin');
  };

  /**
   * Disable a member account across registered_emails, member_access, members, and Supabase Auth.
   * Enforces super_admin self-protection and last super_admin protection.
   */
  const disableMemberAccount = async (
    emailOrMemberId: string,
    reason = 'Dinonaktifkan oleh Super Admin'
  ) => {
    const key = emailOrMemberId.trim().toLowerCase();
    const targetRec = registeredEmails.find(
      (r) =>
        r.email.toLowerCase() === key ||
        (r.memberId && r.memberId.toLowerCase() === key)
    );

    const targetEmail = (targetRec?.email || key).toLowerCase();
    const targetUid = targetRec?.activatedUid;
    const targetMemberId = targetRec?.memberId;

    // Self-protection & last super_admin guard
    if (
      targetEmail === SUPER_ADMIN_EMAIL ||
      targetMemberId === 'm-4' ||
      (user?.email && targetEmail === user.email.toLowerCase()) ||
      (user?.uid && targetUid && targetUid === user.uid)
    ) {
      throw new Error(
        'Proteksi Keamanan: Tidak dapat menonaktifkan akun Super Admin utama atau akun yang sedang digunakan saat ini.'
      );
    }

    const activeSuperAdmins = registeredEmails.filter(
      (r) =>
        r.systemRole === 'super_admin' &&
        r.status !== 'disabled' &&
        r.status !== 'revoked'
    );
    if (
      targetRec?.systemRole === 'super_admin' &&
      activeSuperAdmins.length <= 1
    ) {
      throw new Error(
        'Proteksi Keamanan: Tidak dapat menonaktifkan satu-satunya Super Admin yang tersisa.'
      );
    }

    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        // 1. Disable registered_emails entry
        if (targetEmail.includes('@')) {
          await supabase
            .from('registered_emails')
            .update({
              status: 'disabled',
              disabled_at: nowIso,
              disabled_reason: reason,
            })
            .ilike('email', targetEmail);

          // 2. Disable member_access entry
          await supabase
            .from('member_access')
            .upsert(
              {
                email: targetEmail,
                member_id: targetMemberId || null,
                is_active: false,
                status: 'disabled',
                updated_at: nowIso,
              },
              { onConflict: 'email' }
            );
        }

        // 3. Update membership status
        if (targetMemberId) {
          await supabase
            .from('members')
            .update({
              account_status: 'disabled',
              accountStatus: 'disabled',
              status: 'leave',
              disabled_at: nowIso,
            })
            .eq('id', targetMemberId);
        }

        // 4. Invoke Supabase Edge Function to ban/revoke Auth user session server-side
        await supabase.functions
          .invoke('admin-manage-account', {
            body: {
              action: 'disable',
              email: targetEmail,
              uid: targetUid,
              memberId: targetMemberId,
              reason,
            },
          })
          .catch(() => {});
      } catch (e) {
        console.warn('Supabase disableMemberAccount notice:', e);
      }
    }

    // 5. Call trusted backend endpoint
    try {
      await fetch('/api/admin/account-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable',
          adminEmail: user?.email || SUPER_ADMIN_EMAIL,
          email: targetEmail,
          uid: targetUid,
          memberId: targetMemberId,
          reason,
        }),
      });
    } catch {
      // Non-fatal
    }

    const updatedList = registeredEmails.map((r) =>
      r.email.toLowerCase() === targetEmail ||
      (targetMemberId && r.memberId === targetMemberId)
        ? {
            ...r,
            status: 'disabled' as const,
            disabledAt: nowIso,
            disabledReason: reason,
          }
        : r
    );
    setRegisteredEmails(updatedList);
    saveLocalRegisteredEmails(updatedList);

    await logAdminActivity(
      'DISABLE_ACCOUNT',
      `${targetRec?.name || targetEmail} (${targetEmail})`,
      `Akun dinonaktifkan & akses Auth dicabut sementara. Alasan: ${reason}`
    );
  };

  /**
   * Restore a previously disabled member account across registered_emails, member_access, members, and Supabase Auth.
   */
  const restoreMemberAccount = async (emailOrMemberId: string) => {
    const key = emailOrMemberId.trim().toLowerCase();
    const targetRec = registeredEmails.find(
      (r) =>
        r.email.toLowerCase() === key ||
        (r.memberId && r.memberId.toLowerCase() === key)
    );

    const targetEmail = (targetRec?.email || key).toLowerCase();
    const targetUid = targetRec?.activatedUid;
    const targetMemberId = targetRec?.memberId;
    const restoredStatus: RegisteredEmailRecord['status'] = targetUid
      ? 'activated'
      : 'pending_activation';
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        if (targetEmail.includes('@')) {
          await supabase
            .from('registered_emails')
            .update({
              status: targetUid ? 'activated' : 'pending',
              disabled_at: null,
              disabled_reason: null,
            })
            .ilike('email', targetEmail);

          await supabase
            .from('member_access')
            .upsert(
              {
                email: targetEmail,
                member_id: targetMemberId || null,
                is_active: true,
                status: targetUid ? 'active' : 'pending_activation',
                updated_at: nowIso,
              },
              { onConflict: 'email' }
            );
        }

        if (targetMemberId) {
          await supabase
            .from('members')
            .update({
              account_status: targetUid ? 'active' : 'pending_activation',
              accountStatus: targetUid ? 'active' : 'pending_activation',
              status: 'active',
              disabled_at: null,
            })
            .eq('id', targetMemberId);
        }

        await supabase.functions
          .invoke('admin-manage-account', {
            body: {
              action: 'restore',
              email: targetEmail,
              uid: targetUid,
              memberId: targetMemberId,
            },
          })
          .catch(() => {});
      } catch (e) {
        console.warn('Supabase restoreMemberAccount notice:', e);
      }
    }

    try {
      await fetch('/api/admin/account-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          adminEmail: user?.email || SUPER_ADMIN_EMAIL,
          email: targetEmail,
          uid: targetUid,
          memberId: targetMemberId,
        }),
      });
    } catch {
      // Non-fatal
    }

    const updatedList = registeredEmails.map((r) =>
      r.email.toLowerCase() === targetEmail ||
      (targetMemberId && r.memberId === targetMemberId)
        ? {
            ...r,
            status: restoredStatus,
            disabledAt: undefined,
            disabledReason: undefined,
          }
        : r
    );
    setRegisteredEmails(updatedList);
    saveLocalRegisteredEmails(updatedList);

    await logAdminActivity(
      'RESTORE_ACCOUNT',
      `${targetRec?.name || targetEmail} (${targetEmail})`,
      `Akun dipulihkan kembali ke status ${restoredStatus === 'activated' ? 'Aktif' : 'Menunggu Aktivasi'}.`
    );
  };

  /**
   * Permanently delete a user's Auth account and remove email registration while preserving
   * the member's historical tasks, meetings, surveys, and other records.
   */
  const deleteMemberAccount = async (emailOrMemberId: string) => {
    if (!isSupabaseConfigured || !user?.uid) {
      throw new Error('Sesi Admin tidak valid. Silakan login ulang.');
    }

    const key = emailOrMemberId.trim().toLowerCase();
    const targetRec = registeredEmails.find(
      (r) => r.email.toLowerCase() === key || r.memberId === emailOrMemberId
    );
    if (!targetRec?.memberId) {
      throw new Error('Registrasi email anggota tidak ditemukan pada database.');
    }
    if (
      targetRec.email.toLowerCase() === SUPER_ADMIN_EMAIL ||
      targetRec.systemRole === 'super_admin' ||
      targetRec.activatedUid === user.uid
    ) {
      throw new Error('Akun Super Admin utama atau akun yang sedang digunakan tidak dapat dihapus.');
    }

    const { data, error } = await supabase.functions.invoke('admin-reset-member-email', {
      body: {
        project_id: KKN_PROJECT_ID,
        member_id: targetRec.memberId,
        action: 'remove',
        confirm_member_name: targetRec.name,
        reason: 'Penghapusan registrasi email melalui Admin Console',
      },
    });

    if (error) {
      let detail = error.message;
      try {
        const body = await (error as any).context?.json();
        if (body?.error || body?.message) detail = body.error || body.message;
      } catch {}
      throw new Error(detail || 'Gagal menghapus email dan akun login anggota.');
    }
    if (!data?.success) throw new Error(data?.error || 'Penghapusan email anggota gagal.');

    await fetchRegisteredEmails();
    await logAdminActivity(
      'DELETE_AUTH_ACCOUNT',
      `${targetRec.name} (${targetRec.email})`,
      'Email login dan akun Auth dihapus. Profil anggota serta riwayat kontribusi dipertahankan.'
    );
  };

  const createInvitation = async (
    name: string,
    email: string,
    role: UserRole,
    division: string
  ): Promise<string> => {
    const created = await registerMemberEmail({
      name,
      email,
      position: role === 'dpl' ? 'Dosen Pembimbing Lapangan' : 'Anggota KKN',
      division,
      role,
      systemRole: role === 'admin' || role === 'ketua' ? 'admin' : 'user',
    });
    return created.email;
  };

  const fetchInvitations = async (): Promise<InvitationItem[]> => {
    const list = await fetchRegisteredEmails();
    return list.map((r) => ({
      id: r.id,
      token: r.email,
      name: r.name,
      email: r.email,
      role: r.role || 'member',
      division: r.division,
      status:
        r.status === 'activated'
          ? 'accepted'
          : r.status === 'revoked'
            ? 'revoked'
            : 'pending',
      memberId: r.memberId,
      acceptedByUid: r.activatedUid,
      acceptedAt: r.activatedAt,
    }));
  };

  const revokeInvitation = async (idOrEmail: string) => {
    const found = registeredEmails.find(
      (r) => r.id === idOrEmail || r.email === idOrEmail
    );
    if (found) {
      await revokeRegisteredEmail(found.email);
    }
  };

  const activateInvitation = async (
    _tokenInput: string,
    email: string,
    pass: string,
    _displayName: string
  ) => {
    await activateWithRegisteredEmail(email, pass);
  };

  const signOut = async () => {
    isManualSignOutRef.current = true;
    hadActiveSessionRef.current = false;
    clearCachedProfile();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setIsPasswordRecoveryMode(false);
    setSessionExpiredNotice(null);
    setSession(null);
    setUser(null);
    setProfile(null);
    setActiveMode('workspace');
  };

  const updateUserRole = async (uid: string, role: UserRole) => {
    if (!isAdmin && !isSuperAdmin) return;
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ role }).eq('id', uid);
      } catch {
        // Non-fatal
      }
    }
    if (profile && profile.uid === uid) {
      const updated = { ...profile, role };
      setProfile(updated);
      saveCachedProfile(uid, updated);
    }
  };

  const syncOwnProfileMetadata = (updates: {
    displayName?: string;
    position?: string;
    division?: string;
  }) => {
    if (!user || !profile) return;
    const nextProfile: UserProfile = {
      ...profile,
      displayName: updates.displayName?.trim() || profile.displayName,
      position: updates.position?.trim() || profile.position,
      division: updates.division?.trim() || profile.division,
      // Explicitly preserve security-critical role & authorization fields
      role: profile.role,
      systemRole: profile.systemRole,
      uid: profile.uid,
      email: profile.email,
      memberId: profile.memberId,
      accountStatus: profile.accountStatus,
    };
    setProfile(nextProfile);
    saveCachedProfile(user.uid, nextProfile);

    if (user.email) {
      const cleanEmail = user.email.toLowerCase();
      setRegisteredEmails((prev) => {
        const next = prev.map((r) =>
          r.email.toLowerCase() === cleanEmail
            ? {
                ...r,
                name: nextProfile.displayName,
                position: nextProfile.position || r.position,
                division: nextProfile.division || r.division,
                // Never modify systemRole, role, or status here
              }
            : r
        );
        saveLocalRegisteredEmails(next);
        return next;
      });
    }
  };

  const isSuperAdmin =
    profile?.systemRole === 'super_admin' ||
    user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
  const isAdmin =
    isSuperAdmin ||
    profile?.systemRole === 'admin' ||
    profile?.role === 'ketua' ||
    profile?.role === 'admin';
  const isMember =
    isAdmin || profile?.role === 'member' || Boolean(profile?.memberId);
  const isDpl = profile?.role === 'dpl';
  const canWrite = isAdmin || isMember;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        authError,
        sessionExpiredNotice,
        clearSessionExpiredNotice,
        isSupabaseReady: isSupabaseConfigured,
        isPasswordRecoveryMode,
        clearPasswordRecoveryMode,
        isAdmin,
        isSuperAdmin,
        isMember,
        isDpl,
        canWrite,
        activeMode,
        setActiveMode,
        registeredEmails,
        adminLogs,
        signInWithGoogle,
        signInWithEmail,
        checkRegisteredEmail,
        activateWithRegisteredEmail,
        resendVerificationEmail,
        requestPasswordReset,
        updateUserPassword,
        fetchRegisteredEmails,
        fetchActivityLogs,
        registerMemberEmail,
        updateRegisteredEmail,
        revokeRegisteredEmail,
        disableMemberAccount,
        restoreMemberAccount,
        deleteMemberAccount,
        logAdminActivity,
        createInvitation,
        fetchInvitations,
        revokeInvitation,
        activateInvitation,
        signOut,
        updateUserRole,
        syncOwnProfileMetadata,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
