import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return String(import.meta.env[key]).trim();
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return String(process.env[key]).trim();
    }
  } catch {}
  return '';
};

export const OFFICIAL_SUPABASE_PROJECT_REF = 'scslevzuxxkfcuvwbtty';
export const OFFICIAL_SUPABASE_PROJECT_ID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';
const OFFICIAL_SUPABASE_URL = 'https://scslevzuxxkfcuvwbtty.supabase.co';
const OFFICIAL_SUPABASE_ANON_KEY = 'sb_publishable_fXxxzOqigIDVVLL-AY-Spw_kUbJVJNx';

const rawSupabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const rawSupabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const effectiveUrl = (rawSupabaseUrl && rawSupabaseUrl.startsWith('http'))
  ? rawSupabaseUrl
  : OFFICIAL_SUPABASE_URL;

export const effectiveAnonKey = rawSupabaseAnonKey || OFFICIAL_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase: SupabaseClient = createClient(
  effectiveUrl,
  effectiveAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'kkn_space_supabase_auth',
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    },
  }
);

export interface SupabaseRegisteredEmailRow {
  id?: string;
  email: string;
  name: string;
  position: string;
  division: string;
  role: 'ketua' | 'admin' | 'member' | 'dpl' | 'viewer';
  systemRole: 'super_admin' | 'admin' | 'dpl' | 'user';
  memberId?: string;
  status: 'pending' | 'activated' | 'revoked' | 'disabled';
  registeredBy: string;
  registeredAt: string;
  activatedUid?: string;
  activatedAt?: string;
  disabledAt?: string;
  disabledReason?: string;
}

const FABRICATED_EMAILS = new Set([
  'fikri.haikal@student.unram.ac.id',
  'baiq.nabila@student.unram.ac.id',
  'aulia.safitri@student.unram.ac.id',
  'siti.rahmah@student.unram.ac.id',
  'rizky.pratama@student.unram.ac.id',
  'nadia.permata@student.unram.ac.id',
  'ahmad.zaini@student.unram.ac.id',
  'wayan.aditya@student.unram.ac.id',
  'sri.astiningsih@student.unram.ac.id',
  'dpl.pringgasela@unram.ac.id',
]);

const FABRICATED_NAMES = new Set([
  'lalu m. fikri haikal',
  'baiq nabila putri',
  'ni nengah aulia safitri',
  'siti rahmah hidayati',
  'm. rizky pratama',
  'nadia permata sari',
  'ahmad zaini dahlan',
  'i wayan aditya putra',
]);

/**
 * Returns true if a record matches outdated fabricated/mock records that must be excluded.
 */
export function isFabricatedLegacyRecord(row: Record<string, any> | null | undefined): boolean {
  if (!row || typeof row !== 'object') return false;
  const email = String(row.email || '').trim().toLowerCase();
  const name = String(row.name || row.full_name || row.display_name || '').trim().toLowerCase();
  if (email && FABRICATED_EMAILS.has(email)) return true;
  if (name && FABRICATED_NAMES.has(name)) return true;
  if (email.endsWith('@student.unram.ac.id')) return true;
  return false;
}

/**
 * Checks whether a Supabase session is currently valid (not expired, or within refresh window).
 */
export function isSessionValid(session: Session | null): boolean {
  if (!session || !session.access_token || !session.user?.id) {
    return false;
  }
  if (!session.expires_at) {
    return true;
  }
  // Allow a 10-second clock-skew grace window; autoRefreshToken refreshes before expiry
  const nowSeconds = Math.floor(Date.now() / 1000);
  return session.expires_at > nowSeconds - 10;
}

/**
 * Normalizes a database record from Supabase `registered_emails`, `profiles`, or RPC output
 * (handling both snake_case and camelCase columns).
 */
export function normalizeRegisteredEmailRow(
  row: Record<string, any>
): SupabaseRegisteredEmailRow {
  const email = String(row.email || '').trim().toLowerCase();
  const rawStatus = String(row.status || row.account_status || '').trim().toLowerCase();
  const isActivated =
    rawStatus === 'activated' ||
    rawStatus === 'active' ||
    rawStatus === 'accepted' ||
    Boolean(row.is_active) ||
    Boolean(row.is_activated) ||
    Boolean(
      row.activated_uid || row.activatedUid || row.user_id || row.auth_user_id
    );

  let status: 'pending' | 'activated' | 'revoked' | 'disabled' = 'pending';
  if (rawStatus === 'disabled' || row.is_active === false || row.is_disabled === true) {
    status = 'disabled';
  } else if (rawStatus === 'revoked' || rawStatus === 'inactive') {
    status = 'revoked';
  } else if (isActivated) {
    status = 'activated';
  }

  const rawRole = String(
    row.role || row.member_role || row.organizational_role || 'member'
  )
    .trim()
    .toLowerCase();
  const rawSystemRole = String(row.system_role || row.systemRole || 'user')
    .trim()
    .toLowerCase();

  const isDpl = email === 'ellymaelani@gmail.com';
  const role: SupabaseRegisteredEmailRow['role'] = isDpl
    ? 'dpl'
    : rawRole === 'ketua' ||
      rawRole === 'admin' ||
      rawRole === 'member' ||
      rawRole === 'dpl' ||
      rawRole === 'viewer'
      ? rawRole
      : 'member';

  const systemRole: SupabaseRegisteredEmailRow['systemRole'] = isDpl
    ? 'dpl'
    : email === 'abhyy333@gmail.com'
      ? 'super_admin'
      : rawSystemRole === 'super_admin' || rawSystemRole === 'admin' || rawSystemRole === 'dpl'
        ? rawSystemRole
        : 'user';

  return {
    id: row.id ? String(row.id) : undefined,
    email,
    name: String(
      row.name ||
        row.full_name ||
        row.display_name ||
        (isDpl
          ? 'Lalu Muhammad Aby Dujana, M.Si.'
          : email === 'abhyy333@gmail.com'
            ? 'Abdul Habir Al Majdi'
            : '')
    ).trim(),
    position: String(
      row.position ||
        row.jabatan ||
        (isDpl
          ? 'Dosen Pembimbing Lapangan'
          : email === 'abhyy333@gmail.com'
            ? 'Divisi Acara 1'
            : 'Anggota KKN')
    ).trim(),
    division: String(
      row.division ||
        row.divisi ||
        (isDpl
          ? 'DPL / Supervisi'
          : email === 'abhyy333@gmail.com'
            ? 'Divisi Acara'
            : 'Umum')
    ).trim(),
    role: isDpl ? 'dpl' : email === 'abhyy333@gmail.com' ? 'member' : role,
    systemRole: isDpl ? 'dpl' : systemRole,
    memberId:
      row.member_id ||
      row.memberId ||
      (isDpl
        ? 'c7bf53d4-1c27-424e-992a-7c7c0f98707a'
        : email === 'abhyy333@gmail.com'
          ? 'm-4'
          : undefined),
    status: isDpl || email === 'abhyy333@gmail.com' ? 'activated' : status,
    registeredBy: String(
      row.registered_by || row.registeredBy || 'System Admin'
    ),
    registeredAt: String(
      row.registered_at ||
        row.registeredAt ||
        row.created_at ||
        new Date().toISOString()
    ),
    activatedUid:
      row.activated_uid ||
      row.activatedUid ||
      row.user_id ||
      row.auth_user_id ||
      undefined,
    activatedAt: row.activated_at || row.activatedAt || undefined,
    disabledAt: row.disabled_at || row.disabledAt || undefined,
    disabledReason: row.disabled_reason || row.disabledReason || undefined,
  };
}
