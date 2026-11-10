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
  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>([]);

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
        setAdminLogs(mappedSbLogs);
        return mappedSbLogs;
      }
    } catch (err) {
      console.warn('Supabase activity logs fetch notice:', err);
    }
    return [];
  };

  /**
   * Single-query lookup for `registered_emails` (used during initial registration check or fallback).
   */
  const fetchAuthoritativeEmailRecord = async (
    emailInput: string
  ): Promise<RegisteredEmailRecord | null> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || isFabricatedLegacyRecord({ email: cleanEmail })) return null;

    // 1. If user is authenticated, query registered_emails table
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user && isSupabaseConfigured) {
      try {
        const { data: sbRow, error: sbError } = await supabase
          .from('registered_emails')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!sbError && sbRow && !isFabricatedLegacyRecord(sbRow)) {
          const normalized = toAppRegisteredEmailRecord(sbRow);
          if (normalized.status === 'revoked' || normalized.status === 'disabled') {
            return null;
          }
          return normalized;
        }
      } catch (e) {
        console.warn('Supabase registered_emails lookup notice:', e);
      }
    }

    // 2. For unauthenticated activation checks, call secure server-side eligibility endpoint
    try {
      // First attempt Supabase Edge Function: check-activation-eligibility
      let edgeRes: any = null;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.functions.invoke('check-activation-eligibility', {
            body: { email: cleanEmail },
          });
          if (!error && data) {
            edgeRes = data;
          }
        } catch {}
      }

      // Fallback to local server proxy endpoint /api/auth/check-activation-eligibility
      if (!edgeRes) {
        const res = await fetch('/api/auth/check-activation-eligibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (res.ok) {
          edgeRes = await res.json();
        }
      }

      if (edgeRes) {
        if (!edgeRes.eligible) {
          if (edgeRes.code === 'unregistered_email') {
            throw new Error('Email ini belum didaftarkan oleh Administrator KKN.');
          }
          if (edgeRes.code === 'delivery_failed') {
            throw new Error('Undangan belum dapat dikirim. Silakan hubungi Administrator KKN.');
          }
          if (edgeRes.code === 'existing_auth_account') {
            throw new Error('Akun untuk email ini sudah aktif. Silakan masuk melalui tab "Masuk Akun" menggunakan email dan password Anda.');
          }
          if (edgeRes.code === 'account_disabled') {
            throw new Error('Akun ini telah dinonaktifkan oleh Administrator KKN.');
          }
          throw new Error(edgeRes.message || edgeRes.error || 'Email tidak memenuhi syarat aktivasi.');
        }

        if (edgeRes.data) {
          const d = edgeRes.data;
          const rec: RegisteredEmailRecord = {
            id: `reg-${d.member_id || sanitizeEmailId(cleanEmail)}`,
            email: d.email || cleanEmail,
            name: d.name || 'Anggota KKN',
            position: d.position || 'Anggota',
            division: d.division || 'Divisi Acara',
            role: d.role || 'member',
            systemRole: d.role === 'super_admin' ? 'super_admin' : d.role === 'admin' ? 'admin' : d.role === 'dpl' ? 'dpl' : 'user',
            memberId: d.member_id,
            status: 'pending_activation',
            registeredBy: 'Administrator KKN',
            registeredAt: new Date().toISOString(),
          };
          return rec;
        }
      }
    } catch (checkErr: any) {
      if (
        checkErr?.message?.includes('belum didaftarkan') ||
        checkErr?.message?.includes('belum dapat dikirim') ||
        checkErr?.message?.includes('sudah aktif') ||
        checkErr?.message?.includes('dinonaktifkan')
      ) {
        throw checkErr;
      }
    }

    return null;
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
    if (!uid || !cleanEmail) return null;

    // 1. Return immediately from memory cache if already resolved for this authenticated UID
    if (!forceRefresh && memoryProfileCache.has(uid)) {
      return memoryProfileCache.get(uid)!;
    }

    // 2. Deduplicate concurrent calls (e.g., signInWithPassword + onAuthStateChange firing together)
    if (!forceRefresh && inflightProfileRequests.has(uid)) {
      return inflightProfileRequests.get(uid)!;
    }

    const loadPromise = (async (): Promise<UserProfile | null> => {
      try {
        let authRow: Record<string, any> | null = null;

        // Execute a single optimized query to Supabase `registered_emails` (which holds profile, membership, and role)
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('registered_emails')
            .select(
              'id, email, name, position, division, role, system_role, member_id, status, activated_at'
            )
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (!error && data) {
            authRow = data;
          } else {
            // Fallback single query to `profiles` if `registered_emails` row wasn't returned
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .or(`id.eq.${uid},email.ilike.${cleanEmail}`)
              .maybeSingle();
            if (profileData) {
              authRow = profileData;
            }
          }
        }

        const regRecord =
          authRow && !isFabricatedLegacyRecord(authRow)
            ? toAppRegisteredEmailRecord(authRow)
            : null;

        if (regRecord?.status === 'revoked' || regRecord?.status === 'disabled') {
          return null;
        }

        const nowIso = new Date().toISOString();

        // Preserve role separation: Super Admin abhyy333@gmail.com (Abdul Habir Al Majdi - Divisi Acara 1 + super_admin)
        if (cleanEmail === SUPER_ADMIN_EMAIL) {
          const targetMember = INITIAL_MEMBERS.find((m) => m.id === 'm-4');
          const superAdminProfile: UserProfile = {
            uid,
            email: SUPER_ADMIN_EMAIL,
            displayName: regRecord?.name || 'Abdul Habir Al Majdi',
            role: 'member',
            systemRole: 'super_admin',
            position: regRecord?.position || 'Divisi Acara 1',
            division: regRecord?.division || 'Divisi Acara',
            invitationToken: 'KKN104-ACARA1-M4',
            memberId: regRecord?.memberId || 'm-4',
            accountStatus: 'active',
            acceptedAt:
              regRecord?.activatedAt || targetMember?.acceptedAt || nowIso,
            emailVerified: true,
          };
          saveCachedProfile(uid, superAdminProfile);
          return superAdminProfile;
        }

        // Preserve role separation: DPL ellymaelani@gmail.com (Lalu Muhammad Aby Dujana, M.Si. - Dosen Pembimbing Lapangan + dpl)
        if (cleanEmail === 'ellymaelani@gmail.com') {
          const dplProfile: UserProfile = {
            uid,
            email: 'ellymaelani@gmail.com',
            displayName: regRecord?.name || 'Lalu Muhammad Aby Dujana, M.Si.',
            role: 'dpl',
            systemRole: 'dpl',
            position: regRecord?.position || 'Dosen Pembimbing Lapangan',
            division: 'DPL / Supervisi',
            memberId: regRecord?.memberId || 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
            accountStatus: 'active',
            acceptedAt: regRecord?.activatedAt || nowIso,
            emailVerified: true,
          };
          saveCachedProfile(uid, dplProfile);
          return dplProfile;
        }

        // Reject if authenticated user is not authorized in database
        if (!regRecord) {
          return null;
        }

        const memberId =
          regRecord.memberId ||
          INITIAL_MEMBERS.find(
            (m) =>
              (regRecord.name &&
                m.name.toLowerCase() === regRecord.name.toLowerCase()) ||
              (regRecord.position &&
                (m.position || m.role).toLowerCase() ===
                  regRecord.position.toLowerCase())
          )?.id;

        const targetMember = memberId
          ? INITIAL_MEMBERS.find((m) => m.id === memberId)
          : undefined;

        const resolvedRole: UserRole =
          regRecord.role || (targetMember?.isLeader ? 'ketua' : 'member');

        const resolvedSystemRole: SystemRole =
          regRecord.systemRole ||
          (resolvedRole === 'ketua' || resolvedRole === 'admin'
            ? 'admin'
            : 'user');

        const resolvedProfile: UserProfile = {
          uid,
          email: cleanEmail,
          displayName:
            regRecord.name || targetMember?.name || cleanEmail.split('@')[0],
          role: resolvedRole,
          systemRole: resolvedSystemRole,
          position:
            regRecord.position ||
            targetMember?.position ||
            targetMember?.role ||
            'Anggota KKN',
          division: regRecord.division || targetMember?.division || 'Umum',
          invitationToken: targetMember?.invitationToken,
          memberId: memberId || targetMember?.id,
          accountStatus: 'active',
          acceptedAt: regRecord.activatedAt || nowIso,
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

  /**
   * Used ONLY during initial account activation to link the newly activated user ID
   * without creating duplicate member records.
   */
  const linkAccountOnInitialActivation = async (
    sbUser: SupabaseUser,
    resolvedProfile: UserProfile,
    regRecord: RegisteredEmailRecord | null
  ) => {
    const cleanEmail = resolvedProfile.email.toLowerCase();
    const uid = sbUser.id;
    const acceptedAt = resolvedProfile.acceptedAt || new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('registered_emails')
          .update({
            status: 'activated',
            activated_uid: uid,
            activated_at: acceptedAt,
          })
          .ilike('email', cleanEmail);
      } catch {
        // Handled by trigger or RLS
      }
    }

    const updatedRecord: RegisteredEmailRecord = {
      id: regRecord?.id || sanitizeEmailId(cleanEmail),
      email: cleanEmail,
      name: resolvedProfile.displayName,
      position: resolvedProfile.position || 'Anggota KKN',
      division: resolvedProfile.division || 'Umum',
      role: resolvedProfile.role,
      systemRole: resolvedProfile.systemRole || 'user',
      memberId: resolvedProfile.memberId,
      status: 'activated',
      registeredBy: regRecord?.registeredBy || 'System Admin',
      registeredAt: regRecord?.registeredAt || acceptedAt,
      activatedUid: uid,
      activatedAt: acceptedAt,
    };

    setRegisteredEmails((prev) => {
      const next = prev.some((r) => r.email.toLowerCase() === cleanEmail)
        ? prev.map((r) =>
            r.email.toLowerCase() === cleanEmail ? updatedRecord : r
          )
        : [updatedRecord, ...prev];
      return next;
    });
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

      // 3. Fast path: Hydrate immediately from cached profile for this authenticated UID so UI never blocks
      const cachedProfile = getCachedProfile(sbUser.id, sbUser.email);
      if (cachedProfile) {
        setProfile(cachedProfile);
        setUser(mapSupabaseUserToAppUser(sbUser, cachedProfile.displayName));
        setLoading(false);
      }

      // 4. Resolve / verify authorization in a single deduplicated query
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

    // WAJIB: Check email eligibility via check-member-email-registration Edge Function (with fallback to server proxy)
    let eligibilityRes: any = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('check-member-email-registration', {
          body: { email: cleanEmail },
        });
        if (!error && data) {
          eligibilityRes = data;
        }
      } catch {}
    }

    if (!eligibilityRes) {
      try {
        const res = await fetch('/api/auth/check-member-email-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (res.ok) {
          eligibilityRes = await res.json();
        }
      } catch {}
    }

    if (eligibilityRes && !eligibilityRes.eligible) {
      const code = eligibilityRes.code;
      if (code === 'not_registered' || code === 'unregistered_email') {
        throw new Error('Email belum didaftarkan oleh Administrator KKN.');
      }
      if (code === 'already_active' || code === 'existing_auth_account') {
        throw new Error('Akun untuk email ini sudah aktif. Silakan masuk melalui tab Masuk Akun menggunakan email dan password Anda.');
      }
      if (code === 'confirmation_pending') {
        throw new Error('Konfirmasi email masih tertunda. Silakan cek kotak masuk email Anda atau kirim ulang tautan verifikasi.');
      }
      if (code === 'account_reconciliation_required') {
        throw new Error('Rekonsiliasi akun diperlukan. Silakan hubungi Administrator KKN.');
      }
      throw new Error(eligibilityRes.error || eligibilityRes.message || 'Email tidak memenuhi syarat aktivasi.');
    }

    const record = await fetchAuthoritativeEmailRecord(cleanEmail);
    if (!record || record.status === 'revoked') {
      throw new Error('Email belum didaftarkan oleh Administrator KKN.');
    }

    if (
      record.status === 'activated' &&
      record.activatedUid &&
      cleanEmail !== SUPER_ADMIN_EMAIL
    ) {
      throw new Error(
        'Akun untuk email ini sudah aktif. Silakan masuk melalui tab Masuk Akun menggunakan email dan password Anda.'
      );
    }

    if (!isSupabaseConfigured) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur pada environment project.'
      );
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: cleanEmail,
        password: pass,
        options: {
          emailRedirectTo: `${window.location.origin}/workspace`,
        },
      }
    );

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (
        msg.includes('already registered') ||
        msg.includes('user already exists')
      ) {
        throw new Error(
          'Akun dengan email ini sudah terdaftar di Supabase Auth. Silakan langsung masuk melalui tab Masuk Akun.'
        );
      }
      if (msg.includes('password')) {
        throw new Error('Password minimal harus terdiri dari 8 karakter.');
      }
      if (msg.includes('rate limit') || msg.includes('security purposes')) {
        throw new Error(
          'Terlalu banyak permintaan pengiriman email. Silakan tunggu beberapa saat atau cek kotak masuk email Anda.'
        );
      }
      throw new Error(
        signUpError.message || 'Gagal melakukan registrasi akun.'
      );
    }

    const sbUser = signUpData.user;
    if (!sbUser) {
      throw new Error('Gagal membuat akun pengguna di Supabase.');
    }

    if (Array.isArray(sbUser.identities) && sbUser.identities.length === 0) {
      throw new Error(
        'Akun dengan email ini sudah terdaftar dan aktif. Silakan masuk melalui tab Masuk Akun.'
      );
    }

    const isEmailVerified = Boolean(sbUser.email_confirmed_at);
    const acceptedAt = new Date().toISOString();

    const previewProfile: UserProfile = {
      uid: sbUser.id,
      email: cleanEmail,
      displayName: record.name,
      role: cleanEmail === SUPER_ADMIN_EMAIL ? 'member' : record.role || 'member',
      systemRole:
        cleanEmail === SUPER_ADMIN_EMAIL
          ? 'super_admin'
          : record.systemRole || 'user',
      position: record.position,
      division: record.division,
      memberId: record.memberId,
      accountStatus: isEmailVerified ? 'active' : 'pending',
      acceptedAt,
      emailVerified: isEmailVerified,
    };

    // Require email verification ONLY during initial account activation
    if (!isEmailVerified) {
      if (signUpData.session) {
        isManualSignOutRef.current = true;
        await supabase.auth.signOut();
      }
      setSession(null);
      setUser(null);
      setProfile(null);

      return {
        needsEmailVerification: true,
        email: cleanEmail,
        profile: previewProfile,
      };
    }

    const resolvedProfile =
      (await resolveDatabaseProfileForUser(sbUser, true)) || previewProfile;
    await linkAccountOnInitialActivation(sbUser, resolvedProfile, record);

    if (signUpData.session) {
      hadActiveSessionRef.current = true;
      setSession(signUpData.session);
      setProfile(resolvedProfile);
      setUser(mapSupabaseUserToAppUser(sbUser, resolvedProfile.displayName));
    }

    return {
      needsEmailVerification: false,
      email: cleanEmail,
      profile: resolvedProfile,
    };
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
      | Omit<
          RegisteredEmailRecord,
          'id' | 'status' | 'registeredAt' | 'registeredBy'
        >,
    emailArg?: string,
    positionArg?: string,
    divisionArg?: string,
    memberIdArg?: string
  ): Promise<RegisteredEmailRecord> => {
    const inputObj =
      typeof nameOrRecord === 'string'
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
    const newRecord: RegisteredEmailRecord = {
      id: sanitizeEmailId(cleanEmail),
      email: cleanEmail,
      name: inputObj.name,
      position: inputObj.position,
      division: inputObj.division,
      role: inputObj.role || 'member',
      systemRole: inputObj.systemRole || 'user',
      memberId: inputObj.memberId,
      status: 'pending_activation',
      registeredBy: user?.email || SUPER_ADMIN_EMAIL,
      registeredAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('registered_emails').upsert(
          {
            email: cleanEmail,
            name: newRecord.name,
            position: newRecord.position,
            division: newRecord.division,
            role: newRecord.role,
            system_role: newRecord.systemRole,
            member_id: newRecord.memberId || null,
            status: 'pending',
            registered_by: newRecord.registeredBy,
            registered_at: newRecord.registeredAt,
          },
          { onConflict: 'email' }
        );
      } catch (e) {
        console.warn('Supabase registered_emails upsert warning:', e);
      }
    }

    const updated = [
      newRecord,
      ...registeredEmails.filter((r) => r.email.toLowerCase() !== cleanEmail),
    ];
    setRegisteredEmails(updated);

    try {
      await fetch('/api/admin/register-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRecord,
          adminEmail: user?.email || SUPER_ADMIN_EMAIL,
          adminName: profile?.displayName || 'Abdul Habir Al Majdi',
        }),
      });
    } catch {
      // Fallback
    }

    return newRecord;
  };

  const updateRegisteredEmail = async (
    emailInput: string,
    updates: Partial<RegisteredEmailRecord>
  ) => {
    const cleanOldEmail = emailInput.trim().toLowerCase();
    const cleanNewEmail = updates.email
      ? updates.email.trim().toLowerCase()
      : cleanOldEmail;

    if (
      cleanOldEmail === SUPER_ADMIN_EMAIL &&
      (updates.status === 'disabled' ||
        updates.status === 'revoked' ||
        (updates.systemRole && updates.systemRole !== 'super_admin'))
    ) {
      throw new Error(
        'Akun Super Admin utama (abhyy333@gmail.com) tidak dapat dinonaktifkan atau diturunkan hak aksesnya.'
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

        if (updates.memberId || cleanNewEmail !== cleanOldEmail) {
          await supabase
            .from('member_access')
            .upsert(
              {
                email: cleanNewEmail,
                member_id: updates.memberId || null,
                role: updates.role || 'member',
                system_role: updates.systemRole || 'user',
                is_active:
                  updates.status !== 'disabled' && updates.status !== 'revoked',
                status: updates.status || 'pending_activation',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'email' }
            );
        }
      } catch (e) {
        console.warn('Supabase updateRegisteredEmail warning:', e);
      }
    }

    try {
      await fetch('/api/admin/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user?.email || SUPER_ADMIN_EMAIL,
          oldEmail: cleanOldEmail,
          updates: { ...updates, email: cleanNewEmail },
        }),
      });
    } catch {
      // Fallback
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
      `Memperbarui data registrasi email/akses untuk ${cleanNewEmail}`
    );
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
        'Proteksi Keamanan: Akun Super Admin utama atau akun yang sedang login tidak dapat dihapus.'
      );
    }

    const activeSuperAdmins = registeredEmails.filter(
      (r) => r.systemRole === 'super_admin'
    );
    if (
      targetRec?.systemRole === 'super_admin' &&
      activeSuperAdmins.length <= 1
    ) {
      throw new Error(
        'Proteksi Keamanan: Tidak dapat menghapus satu-satunya Super Admin yang tersisa.'
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
              reason: 'Penghapusan email oleh Super Admin',
            },
          }
        );
        if (error) {
          let detail = error.message;
          try {
            const errBody = await (error as any).context?.json();
            if (errBody?.error) detail = errBody.error;
          } catch {}
          throw new Error(detail);
        }
        if (!data?.success) {
          throw new Error(data?.error || 'Pencabutan email gagal');
        }
      } catch (e: any) {
        console.warn('Supabase deleteMemberAccount notice:', e);
        throw e;
      }
    }

    try {
      await fetch('/api/admin/account-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          adminEmail: user?.email || SUPER_ADMIN_EMAIL,
          email: targetEmail,
          uid: targetUid,
          memberId: targetMemberId,
        }),
      });
    } catch {
      // Non-fatal
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
