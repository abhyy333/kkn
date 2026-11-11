import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  isSessionValid,
  normalizeRegisteredEmailRow,
  isFabricatedLegacyRecord,
} from '../lib/supabase';
import { INITIAL_MEMBERS, OFFICIAL_PROJECT_ID } from '../data/mockData';
import {
  RegisteredEmailRecord as TypesRegisteredEmailRecord,
  AdminActivityLogRecord,
} from '../types';
import {
  AccountSecurityStatus,
  ProvisionedAccountModalData,
  parseAccountSecurityStatus,
  parseProvisionedAccountResponse,
  resolveMemberDatabaseUuid,
  resolveRoleFromMemberAccess,
  validateFirstLoginPassword,
} from '../utils/authSecurity';

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
  mustChangePassword?: boolean;
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
  databaseMemberId?: string;
  accountStatus?: 'active' | 'pending' | 'revoked' | 'disabled';
  mustChangePassword?: boolean;
  acceptedAt?: string;
  emailVerified?: boolean;
  createdAt?: any;
}

/**
 * Compatible Auth User representation bridging Supabase Auth User with KKN SPACE components
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

interface AuthContextType {
  user: AppAuthUser | null;
  session: SupabaseSession | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  isSupabaseReady: boolean;
  mustChangePassword: boolean;
  requiresPasswordChange: boolean;
  isTemporaryPasswordExpired: boolean;
  temporaryPasswordExpiresAt: string | null;
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
  checkMyAccountSecurityStatus: () => Promise<AccountSecurityStatus | null>;
  completeFirstLoginPassword: (newPassword: string) => Promise<void>;
  provisionMemberAccount: (params: {
    memberId: string;
    email: string;
    confirmMemberName: string;
    role?: string;
    position?: string;
    division?: string;
  }) => Promise<ProvisionedAccountModalData>;
  resetMemberPassword: (params: {
    memberId: string;
    confirmMemberName: string;
    reason: string;
    email?: string;
    role?: string;
    position?: string;
    division?: string;
  }) => Promise<ProvisionedAccountModalData>;
  fetchRegisteredEmails: () => Promise<RegisteredEmailRecord[]>;
  fetchActivityLogs: () => Promise<AdminActivityLogRecord[]>;
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
  signOut: () => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  syncOwnProfileMetadata: (updates: {
    displayName?: string;
    position?: string;
    division?: string;
  }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory deduplication & session-scoped cache to prevent duplicate database queries
const inflightProfileRequests = new Map<string, Promise<UserProfile | null>>();
const memoryProfileCache = new Map<string, UserProfile>();

function sanitizeEmailId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function toAppRegisteredEmailRecord(row: Record<string, any>): RegisteredEmailRecord {
  const normalized = normalizeRegisteredEmailRow(row);
  const rawMemberId = row.member_id || row.memberId || normalized.memberId;
  const fullName = row.full_name || row.member_name || normalized.name;
  return {
    id: normalized.id || sanitizeEmailId(normalized.email),
    email: normalized.email,
    name: fullName,
    full_name: fullName,
    position: normalized.position,
    division: normalized.division,
    role: normalized.role,
    systemRole: normalized.systemRole,
    memberId: rawMemberId,
    member_id: rawMemberId,
    registeredBy: normalized.registeredBy,
    registeredAt: normalized.registeredAt,
    status:
      normalized.status === 'pending'
        ? 'pending_activation'
        : normalized.status,
    mustChangePassword: Boolean(
      row.must_change_password === true || row.requires_password_change === true
    ),
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
}

function getCachedProfile(uid: string, email?: string | null): UserProfile | null {
  if (memoryProfileCache.has(uid)) {
    return memoryProfileCache.get(uid) || null;
  }
  if (email && memoryProfileCache.has(email.toLowerCase())) {
    return memoryProfileCache.get(email.toLowerCase()) || null;
  }
  return null;
}

function clearCachedProfile() {
  memoryProfileCache.clear();
  inflightProfileRequests.clear();
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

async function extractEdgeFunctionError(error: any, fallbackMessage: string): Promise<string> {
  if (!error) return fallbackMessage;
  let detail = error.message || fallbackMessage;
  try {
    const errBody = await error.context?.json?.();
    if (errBody?.error) {
      detail = String(errBody.error);
    } else if (errBody?.message) {
      detail = String(errBody.message);
    }
  } catch {
    // Ignore context parse failure
  }
  return detail;
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
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [isTemporaryPasswordExpired, setIsTemporaryPasswordExpired] =
    useState<boolean>(false);
  const [temporaryPasswordExpiresAt, setTemporaryPasswordExpiresAt] = useState<
    string | null
  >(null);

  const [activeMode, setActiveMode] = useState<ActiveWorkspaceMode>('workspace');
  const [registeredEmails, setRegisteredEmails] = useState<RegisteredEmailRecord[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>([]);

  const hadActiveSessionRef = useRef(false);
  const isManualSignOutRef = useRef(false);

  const clearSessionExpiredNotice = () => {
    setSessionExpiredNotice(null);
  };

  const fetchRegisteredEmails = async (): Promise<RegisteredEmailRecord[]> => {
    try {
      const { data: sbRows, error: sbErr } = await supabase
        .from('registered_emails')
        .select('*');

      if (!sbErr && Array.isArray(sbRows)) {
        const finalEmails = sbRows
          .filter((row) => !isFabricatedLegacyRecord(row))
          .map((row) => toAppRegisteredEmailRecord(row))
          .filter((rec) => Boolean(rec.email));

        setRegisteredEmails(finalEmails);
        return finalEmails;
      }
    } catch (err) {
      console.warn('Supabase registered_emails fetch notice:', err);
    }
    return [];
  };

  const fetchActivityLogs = async (): Promise<AdminActivityLogRecord[]> => {
    try {
      const { data: sbLogs, error: sbLogErr } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      if (!sbLogErr && Array.isArray(sbLogs)) {
        const mappedSbLogs: AdminActivityLog[] = sbLogs.map((l: any) => ({
          id: String(l.id),
          timestamp: String(l.timestamp || l.created_at || new Date().toISOString()),
          adminEmail: String(l.admin_email || l.adminEmail || ''),
          adminName: String(l.admin_name || l.adminName || 'Super Admin'),
          actorEmail: String(l.admin_email || l.adminEmail || ''),
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
        setAdminLogs(mappedSbLogs);
        return mappedSbLogs;
      }
    } catch (err) {
      console.warn('Supabase activity logs fetch notice:', err);
    }
    return [];
  };

  /**
   * Authoritative security status check using `get-my-account-security-status` Edge Function.
   * Determines `requires_password_change` / `must_change_password`, expiration, and role from `member_access`.
   */
  const checkMyAccountSecurityStatus = async (): Promise<AccountSecurityStatus | null> => {
    if (!isSupabaseConfigured) return null;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke(
        'get-my-account-security-status',
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: {},
        }
      );

      if (error) {
        const errMsg = await extractEdgeFunctionError(error, '');
        if (
          errMsg.toLowerCase().includes('expired') ||
          errMsg.toLowerCase().includes('kedaluwarsa')
        ) {
          setMustChangePassword(true);
          setIsTemporaryPasswordExpired(true);
        }
        return null;
      }

      if (data) {
        const parsed = parseAccountSecurityStatus(data);
        setMustChangePassword(parsed.requiresPasswordChange);
        setIsTemporaryPasswordExpired(parsed.isTemporaryPasswordExpired);
        setTemporaryPasswordExpiresAt(parsed.expiresAt);
        return parsed;
      }
    } catch (err) {
      console.warn('checkMyAccountSecurityStatus notice:', err);
    }

    return null;
  };

  /**
   * Resolves authenticated user's profile, membership, and role from `member_access`, `members`,
   * `registered_emails`, and `get-my-account-security-status`.
   * Roles come strictly from `member_access` / database records (never hardcoded email strings).
   */
  const resolveDatabaseProfileForUser = async (
    sbUser: SupabaseUser,
    forceRefresh = false
  ): Promise<UserProfile | null> => {
    const uid = sbUser.id;
    const cleanEmail = (sbUser.email || '').trim().toLowerCase();
    if (!uid || !cleanEmail) return null;

    if (!forceRefresh && memoryProfileCache.has(uid)) {
      return memoryProfileCache.get(uid)!;
    }

    if (!forceRefresh && inflightProfileRequests.has(uid)) {
      return inflightProfileRequests.get(uid)!;
    }

    const loadPromise = (async (): Promise<UserProfile | null> => {
      try {
        // 1. Check authoritative security status via Edge Function `get-my-account-security-status`
        const securityStatus = await checkMyAccountSecurityStatus();

        // 2. Query `member_access`, `members`, and `registered_emails` in parallel
        let accessRow: Record<string, any> | null = null;
        let memberRow: Record<string, any> | null = null;
        let regRow: Record<string, any> | null = null;
        let adminAccRow: Record<string, any> | null = null;

        if (isSupabaseConfigured) {
          const [accessRes, memberRes, regRes, adminRes] = await Promise.all([
            supabase
              .from('member_access')
              .select('*')
              .or(`user_id.eq.${uid},email.ilike.${cleanEmail}`)
              .maybeSingle(),
            supabase
              .from('members')
              .select('*')
              .or(`auth_user_id.eq.${uid},email.ilike.${cleanEmail}`)
              .maybeSingle(),
            supabase
              .from('registered_emails')
              .select('*')
              .ilike('email', cleanEmail)
              .maybeSingle(),
            supabase
              .from('admin_accounts')
              .select('*')
              .or(`user_id.eq.${uid},email.ilike.${cleanEmail}`)
              .eq('is_active', true)
              .maybeSingle(),
          ]);

          if (!accessRes.error && accessRes.data) accessRow = accessRes.data;
          if (!memberRes.error && memberRes.data) memberRow = memberRes.data;
          if (!regRes.error && regRes.data) regRow = regRes.data;
          if (!adminRes.error && adminRes.data) adminAccRow = adminRes.data;
        }

        const regRecord =
          regRow && !isFabricatedLegacyRecord(regRow)
            ? toAppRegisteredEmailRecord(regRow)
            : null;

        if (
          securityStatus?.accountStatus === 'disabled' ||
          securityStatus?.accountStatus === 'revoked' ||
          accessRow?.status === 'disabled' ||
          accessRow?.is_active === false ||
          regRecord?.status === 'revoked' ||
          regRecord?.status === 'disabled'
        ) {
          return null;
        }

        // Determine if user has any valid database authorization
        const hasAuthorization = Boolean(
          securityStatus?.role ||
            securityStatus?.memberId ||
            accessRow ||
            memberRow ||
            regRecord
        );

        if (!hasAuthorization) {
          return null;
        }

        const isAppMetaSuperAdmin = Boolean(
          sbUser.app_metadata?.kkn_is_super_admin === true ||
          sbUser.user_metadata?.kkn_is_super_admin === true
        );
        const isAdminAccountsSuperAdmin = Boolean(adminAccRow);
        const isOfficialSuperAdminEmail = cleanEmail === 'abhyy333@gmail.com';

        const isSuperAdminDetected = Boolean(
          isAppMetaSuperAdmin ||
          isAdminAccountsSuperAdmin ||
          isOfficialSuperAdminEmail ||
          securityStatus?.systemRole === 'super_admin' ||
          accessRow?.system_role === 'super_admin'
        );

        const rawAccessRole =
          accessRow?.role ||
          securityStatus?.role ||
          regRecord?.role ||
          (memberRow?.member_category === 'supervisor' ? 'dpl' : null);
        const rawAccessSystemRole =
          accessRow?.system_role ||
          accessRow?.role ||
          securityStatus?.systemRole ||
          regRecord?.systemRole ||
          null;

        const baseResolved = resolveRoleFromMemberAccess(rawAccessRole, rawAccessSystemRole);
        const resolvedSystemRole: SystemRole = isSuperAdminDetected ? 'super_admin' : baseResolved.systemRole;
        const resolvedRole: UserRole = isOfficialSuperAdminEmail ? 'member' : baseResolved.role;

        // 4. Resolve Member Identity from `members` / `registered_emails` / securityStatus
        const dbMemberUuid =
          memberRow?.id ||
          accessRow?.member_id ||
          securityStatus?.memberId ||
          regRecord?.memberId ||
          undefined;

        const matchedLocalMember = INITIAL_MEMBERS.find(
          (m) =>
            (dbMemberUuid && (m.databaseId === dbMemberUuid || m.dbId === dbMemberUuid || m.id === dbMemberUuid)) ||
            (memberRow?.full_name &&
              m.name.toLowerCase() === String(memberRow.full_name).toLowerCase()) ||
            (regRecord?.name &&
              m.name.toLowerCase() === String(regRecord.name).toLowerCase())
        );

        const displayName =
          memberRow?.full_name ||
          memberRow?.name ||
          securityStatus?.memberName ||
          regRecord?.name ||
          matchedLocalMember?.name ||
          cleanEmail.split('@')[0];

        const position =
          memberRow?.position ||
          memberRow?.position_title ||
          securityStatus?.position ||
          regRecord?.position ||
          matchedLocalMember?.position ||
          matchedLocalMember?.role ||
          (resolvedRole === 'dpl' ? 'Dosen Pembimbing Lapangan' : 'Anggota KKN');

        const division =
          memberRow?.division ||
          securityStatus?.division ||
          regRecord?.division ||
          matchedLocalMember?.division ||
          (resolvedRole === 'dpl' ? 'DPL / Supervisi' : 'Umum');

        const requiresPwdChange = Boolean(
          securityStatus?.requiresPasswordChange ||
            accessRow?.must_change_password === true ||
            accessRow?.requires_password_change === true ||
            regRecord?.mustChangePassword === true
        );

        setMustChangePassword(requiresPwdChange);

        const nowIso = new Date().toISOString();
        const resolvedProfile: UserProfile = {
          uid,
          email: cleanEmail,
          displayName,
          role:
            resolvedRole === 'member' && matchedLocalMember?.isLeader
              ? 'ketua'
              : resolvedRole,
          systemRole: resolvedSystemRole,
          position,
          division,
          memberId: matchedLocalMember?.id || dbMemberUuid,
          databaseMemberId:
            dbMemberUuid ||
            (matchedLocalMember
              ? resolveMemberDatabaseUuid(matchedLocalMember)
              : undefined),
          accountStatus: 'active',
          mustChangePassword: requiresPwdChange,
          acceptedAt:
            regRecord?.activatedAt ||
            memberRow?.activated_at ||
            matchedLocalMember?.acceptedAt ||
            nowIso,
          emailVerified: true,
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

  // Supabase Auth Session Persistence & Token Refresh Listener
  useEffect(() => {
    let isMounted = true;

    const handleSupabaseSession = async (
      currentSession: SupabaseSession | null
    ) => {
      if (!isMounted) return;

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
        setMustChangePassword(false);
        setIsTemporaryPasswordExpired(false);
        setTemporaryPasswordExpiresAt(null);
        setLoading(false);
        return;
      }

      const validSession = currentSession!;
      const sbUser = validSession.user;
      hadActiveSessionRef.current = true;
      setSession(validSession);

      const cachedProfile = getCachedProfile(sbUser.id, sbUser.email);
      if (cachedProfile) {
        setProfile(cachedProfile);
        setMustChangePassword(Boolean(cachedProfile.mustChangePassword));
        setUser(mapSupabaseUserToAppUser(sbUser, cachedProfile.displayName));
        setLoading(false);
      }

      try {
        const resolvedProfile = await resolveDatabaseProfileForUser(sbUser);
        if (!isMounted) return;

        if (!resolvedProfile) {
          isManualSignOutRef.current = true;
          await supabase.auth.signOut();
          clearCachedProfile();
          setSession(null);
          setUser(null);
          setProfile(null);
          setMustChangePassword(false);
          setAuthError('Akun belum terdaftar atau tidak aktif. Silakan hubungi Administrator KKN.');
          setLoading(false);
          return;
        }

        setProfile(resolvedProfile);
        setMustChangePassword(Boolean(resolvedProfile.mustChangePassword));
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

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        handleSupabaseSession(initialSession);
      })
      .catch((err) => {
        console.warn('Supabase getSession warning:', err);
        if (isMounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED' && nextSession) {
        setSession(nextSession);
        return;
      }
      handleSupabaseSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * B. Login Anggota
   * 1. Calls `supabase.auth.signInWithPassword({ email, password })`
   * 2. Calls `supabase.functions.invoke('get-my-account-security-status', { body: {} })`
   * 3. Resolves role from `member_access` and sets `mustChangePassword` if `requires_password_change` is true.
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials')
      ) {
        throw new Error(
          'Email atau password tidak sesuai. Jika Anda menggunakan password sementara yang sudah kedaluwarsa, silakan hubungi Administrator KKN untuk Reset Password.'
        );
      }
      throw new Error(error.message || 'Gagal masuk ke akun.');
    }

    const sbUser = data.user;
    if (!sbUser || !data.session) {
      throw new Error('Tidak dapat memuat sesi pengguna dari Supabase.');
    }

    hadActiveSessionRef.current = true;
    setSession(data.session);

    // Force fresh profile & security status check right after signInWithPassword
    const resolvedProfile = await resolveDatabaseProfileForUser(sbUser, true);
    if (!resolvedProfile) {
      isManualSignOutRef.current = true;
      await supabase.auth.signOut();
      clearCachedProfile();
      throw new Error('Akun belum terdaftar atau telah dinonaktifkan. Silakan hubungi Administrator KKN.');
    }

    setProfile(resolvedProfile);
    setMustChangePassword(Boolean(resolvedProfile.mustChangePassword));
    setUser(mapSupabaseUserToAppUser(sbUser, resolvedProfile.displayName));
    return resolvedProfile;
  };

  /**
   * C. Ganti Password Pertama
   * Calls `complete-first-login-password`, refreshes session, reloads member profile,
   * re-checks security status, and unlocks Workspace.
   */
  const completeFirstLoginPassword = async (newPassword: string): Promise<void> => {
    setAuthError(null);

    const validation = validateFirstLoginPassword(newPassword);
    if (!validation.valid) {
      throw new Error(
        validation.errorMessage ||
          'Password baru minimal 12 karakter dan wajib mengandung huruf besar, huruf kecil, serta angka.'
      );
    }

    if (!isSupabaseConfigured) {
      throw new Error('Konfigurasi Supabase belum lengkap.');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke(
      'complete-first-login-password',
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          new_password: newPassword,
        },
      }
    );

    if (error) {
      const detail = await extractEdgeFunctionError(
        error,
        'Gagal menyimpan password baru.'
      );
      throw new Error(detail);
    }

    if (data && data.success === false) {
      throw new Error(
        String(data.error || data.message || 'Gagal memperbarui password pertama kali.')
      );
    }

    // 1. Refresh session
    const { data: refreshed } = await supabase.auth.refreshSession();
    const activeUser = refreshed?.user || sessionData?.session?.user;
    if (refreshed?.session) {
      setSession(refreshed.session);
    }

    // 2. Clear cached profile & reload member profile from Supabase
    clearCachedProfile();
    if (activeUser) {
      const updatedProfile = await resolveDatabaseProfileForUser(activeUser, true);
      if (updatedProfile) {
        const unlockedProfile: UserProfile = {
          ...updatedProfile,
          mustChangePassword: false,
        };
        setProfile(unlockedProfile);
        saveCachedProfile(activeUser.id, unlockedProfile);
        setUser(mapSupabaseUserToAppUser(activeUser, unlockedProfile.displayName));
      }
    }

    // 3. Re-check account security status
    const postCheck = await checkMyAccountSecurityStatus();
    if (!postCheck || !postCheck.requiresPasswordChange) {
      setMustChangePassword(false);
      setIsTemporaryPasswordExpired(false);
    }
  };

  /**
   * A. Admin Console — Buat Akun (`admin-provision-member-account`)
   * Returns one-time temporary password in memory only.
   */
  const provisionMemberAccount = async (params: {
    memberId: string;
    email: string;
    confirmMemberName: string;
    role?: string;
    position?: string;
    division?: string;
  }): Promise<ProvisionedAccountModalData> => {
    if (!isSupabaseConfigured) {
      throw new Error('Konfigurasi Supabase belum lengkap.');
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.confirmMemberName.trim();
    const dbMemberUuid = resolveMemberDatabaseUuid({
      databaseId: params.memberId,
      id: params.memberId,
      name: cleanName,
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke(
      'admin-provision-member-account',
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          project_id: OFFICIAL_PROJECT_ID,
          member_id: dbMemberUuid,
          email: cleanEmail,
          confirm_member_name: cleanName,
        },
      }
    );

    if (error) {
      const detail = await extractEdgeFunctionError(
        error,
        'Gagal membuat akun anggota melalui Edge Function.'
      );
      throw new Error(detail);
    }

    const parsed = parseProvisionedAccountResponse(data, {
      actionType: 'provision',
      memberId: dbMemberUuid,
      memberName: cleanName,
      email: cleanEmail,
      role: params.role,
      position: params.position,
      division: params.division,
    });

    if (!parsed.success || !parsed.modalData) {
      throw new Error(parsed.error || 'Pembuatan akun gagal.');
    }

    await fetchRegisteredEmails();
    await logAdminActivity(
      'PROVISION_MEMBER_ACCOUNT',
      `${cleanName} (${cleanEmail})`,
      `Membuat akun login anggota untuk ${cleanName} (${cleanEmail}) dengan password sementara satu kali.`
    );

    return parsed.modalData;
  };

  /**
   * D. Reset Password oleh Admin (`admin-reset-member-password`)
   * Returns one-time temporary password in memory only.
   */
  const resetMemberPassword = async (params: {
    memberId: string;
    confirmMemberName: string;
    reason: string;
    email?: string;
    role?: string;
    position?: string;
    division?: string;
  }): Promise<ProvisionedAccountModalData> => {
    if (!isSupabaseConfigured) {
      throw new Error('Konfigurasi Supabase belum lengkap.');
    }

    const cleanName = params.confirmMemberName.trim();
    const cleanReason =
      params.reason.trim() || 'Reset password sementara oleh Super Admin';
    const dbMemberUuid = resolveMemberDatabaseUuid({
      databaseId: params.memberId,
      id: params.memberId,
      name: cleanName,
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke(
      'admin-reset-member-password',
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          project_id: OFFICIAL_PROJECT_ID,
          member_id: dbMemberUuid,
          confirm_member_name: cleanName,
          reason: cleanReason,
        },
      }
    );

    if (error) {
      const detail = await extractEdgeFunctionError(
        error,
        'Gagal mereset password anggota melalui Edge Function.'
      );
      throw new Error(detail);
    }

    const parsed = parseProvisionedAccountResponse(data, {
      actionType: 'reset',
      memberId: dbMemberUuid,
      memberName: cleanName,
      email: params.email || '',
      role: params.role,
      position: params.position,
      division: params.division,
    });

    if (!parsed.success || !parsed.modalData) {
      throw new Error(parsed.error || 'Reset password gagal.');
    }

    await fetchRegisteredEmails();
    await logAdminActivity(
      'RESET_MEMBER_PASSWORD',
      `${cleanName} (${parsed.modalData.email || dbMemberUuid})`,
      `Reset password sementara dilakukan oleh Super Admin. Alasan: ${cleanReason}`
    );

    return parsed.modalData;
  };

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
      adminEmail: user?.email || profile?.email || '',
      adminName: profile?.displayName || 'Super Admin',
      actorEmail: user?.email || profile?.email || '',
      actorName: profile?.displayName || 'Super Admin',
      timestamp: new Date().toISOString(),
      details,
      status: 'success',
    };

    const nextLogs = [newLog, ...adminLogs];
    setAdminLogs(nextLogs);

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

  const updateRegisteredEmail = async (
    emailInput: string,
    updates: Partial<RegisteredEmailRecord>
  ) => {
    const cleanOldEmail = emailInput.trim().toLowerCase();
    const cleanNewEmail = updates.email
      ? updates.email.trim().toLowerCase()
      : cleanOldEmail;

    const targetRec = registeredEmails.find(
      (r) => r.email.toLowerCase() === cleanOldEmail
    );

    if (
      targetRec?.systemRole === 'super_admin' &&
      (updates.status === 'disabled' ||
        updates.status === 'revoked' ||
        (updates.systemRole && updates.systemRole !== 'super_admin'))
    ) {
      throw new Error(
        'Akun Super Admin utama tidak dapat dinonaktifkan atau diturunkan hak aksesnya.'
      );
    }

    if (isSupabaseConfigured) {
      try {
        const sbUpdates: Record<string, any> = {};
        if (cleanNewEmail !== cleanOldEmail) sbUpdates.email = cleanNewEmail;
        if (updates.name !== undefined) sbUpdates.name = updates.name;
        if (updates.position !== undefined) sbUpdates.position = updates.position;
        if (updates.division !== undefined) sbUpdates.division = updates.division;
        if (updates.role !== undefined) sbUpdates.role = updates.role;
        if (updates.systemRole !== undefined)
          sbUpdates.system_role = updates.systemRole;
        if (updates.status !== undefined) sbUpdates.status = updates.status;
        if (updates.memberId !== undefined) sbUpdates.member_id = updates.memberId;

        await supabase
          .from('registered_emails')
          .update(sbUpdates)
          .ilike('email', cleanOldEmail);
      } catch (e) {
        console.warn('Supabase updateRegisteredEmail warning:', e);
      }
    }

    const updatedList = registeredEmails.map((r) =>
      r.email.toLowerCase() === cleanOldEmail
        ? {
            ...r,
            ...updates,
            email: cleanNewEmail,
            id: sanitizeEmailId(cleanNewEmail),
          }
        : r
    );
    setRegisteredEmails(updatedList);

    await logAdminActivity(
      'UPDATE_REGISTERED_EMAIL',
      cleanNewEmail,
      `Memperbarui data akun/akses untuk ${cleanNewEmail}`
    );
  };

  const revokeRegisteredEmail = async (emailInput: string) => {
    await disableMemberAccount(emailInput, 'Dicabut oleh Super Admin');
  };

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

    if (
      targetRec?.systemRole === 'super_admin' ||
      (user?.email && targetEmail === user.email.toLowerCase()) ||
      (user?.uid && targetUid && targetUid === user.uid)
    ) {
      throw new Error(
        'Proteksi Keamanan: Tidak dapat menonaktifkan akun Super Admin utama atau akun yang sedang digunakan saat ini.'
      );
    }

    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        if (targetEmail.includes('@')) {
          await supabase
            .from('registered_emails')
            .update({
              status: 'disabled',
              disabled_at: nowIso,
              disabled_reason: reason,
            })
            .ilike('email', targetEmail);

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

    await logAdminActivity(
      'DISABLE_ACCOUNT',
      `${targetRec?.name || targetEmail} (${targetEmail})`,
      `Akun dinonaktifkan & akses Auth dicabut sementara. Alasan: ${reason}`
    );
  };

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

    await logAdminActivity(
      'RESTORE_ACCOUNT',
      `${targetRec?.name || targetEmail} (${targetEmail})`,
      `Akun dipulihkan kembali ke status ${restoredStatus === 'activated' ? 'Aktif' : 'Menunggu Login Pertama'}.`
    );
  };

  const deleteMemberAccount = async (emailOrMemberId: string) => {
    const key = emailOrMemberId.trim().toLowerCase();
    const targetRec = registeredEmails.find(
      (r) =>
        r.email.toLowerCase() === key ||
        (r.memberId && r.memberId.toLowerCase() === key)
    );

    const targetEmail = (targetRec?.email || key).toLowerCase();
    const targetUid = targetRec?.activatedUid;
    const targetMemberId = targetRec?.memberId;

    if (
      targetRec?.systemRole === 'super_admin' ||
      (user?.email && targetEmail === user.email.toLowerCase()) ||
      (user?.uid && targetUid && targetUid === user.uid)
    ) {
      throw new Error(
        'Proteksi Keamanan: Akun Super Admin utama atau akun yang sedang login tidak dapat dihapus.'
      );
    }

    if (isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const { data, error } = await supabase.functions.invoke(
          'admin-reset-member-email',
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: {
              project_id: OFFICIAL_PROJECT_ID,
              member_id: targetMemberId,
              action: 'remove',
              confirm_member_name: targetRec?.name,
              reason: 'Penghapusan akun oleh Super Admin',
            },
          }
        );
        if (error) {
          const detail = await extractEdgeFunctionError(
            error,
            'Pencabutan akun gagal'
          );
          throw new Error(detail);
        }
        if (!data?.success) {
          throw new Error(data?.error || 'Pencabutan akun gagal');
        }
      } catch (e: any) {
        console.warn('Supabase deleteMemberAccount notice:', e);
        throw e;
      }
    }

    const updatedList = registeredEmails.filter(
      (r) =>
        r.email.toLowerCase() !== targetEmail &&
        (!targetMemberId || r.memberId !== targetMemberId)
    );
    setRegisteredEmails(updatedList);

    await logAdminActivity(
      'DELETE_AUTH_ACCOUNT',
      `${targetRec?.name || targetEmail} (${targetEmail})`,
      'Akun autentikasi & registrasi email dihapus permanen melalui Admin API. Seluruh riwayat tugas, rapat, dan survei anggota tetap dipertahankan.'
    );
  };

  const signOut = async () => {
    isManualSignOutRef.current = true;
    hadActiveSessionRef.current = false;
    clearCachedProfile();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setMustChangePassword(false);
    setIsTemporaryPasswordExpired(false);
    setTemporaryPasswordExpiresAt(null);
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
      role: profile.role,
      systemRole: profile.systemRole,
      uid: profile.uid,
      email: profile.email,
      memberId: profile.memberId,
      databaseMemberId: profile.databaseMemberId,
      accountStatus: profile.accountStatus,
      mustChangePassword: profile.mustChangePassword,
    };
    setProfile(nextProfile);
    saveCachedProfile(user.uid, nextProfile);
  };

  // Role flags derived strictly from resolved profile roles and dual-mode Super Admin
  const isSuperAdmin = Boolean(
    profile?.systemRole === 'super_admin' ||
    profile?.email?.toLowerCase() === 'abhyy333@gmail.com' ||
    user?.rawSupabaseUser?.app_metadata?.kkn_is_super_admin === true ||
    user?.rawSupabaseUser?.user_metadata?.kkn_is_super_admin === true
  );
  const isAdmin =
    isSuperAdmin ||
    profile?.systemRole === 'admin' ||
    profile?.role === 'ketua' ||
    profile?.role === 'admin';
  const isMember =
    isAdmin || profile?.role === 'member' || Boolean(profile?.memberId);
  const isDpl = profile?.role === 'dpl' || profile?.systemRole === 'dpl';
  const canWrite = (isAdmin || isMember) && !mustChangePassword;

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
        mustChangePassword,
        requiresPasswordChange: mustChangePassword,
        isTemporaryPasswordExpired,
        temporaryPasswordExpiresAt,
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
        checkMyAccountSecurityStatus,
        completeFirstLoginPassword,
        provisionMemberAccount,
        resetMemberPassword,
        fetchRegisteredEmails,
        fetchActivityLogs,
        updateRegisteredEmail,
        revokeRegisteredEmail,
        disableMemberAccount,
        restoreMemberAccount,
        deleteMemberAccount,
        logAdminActivity,
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
