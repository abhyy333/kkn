import { SystemRole, UserRole } from '../context/AuthContext';

export const OFFICIAL_SUPABASE_PROJECT_UUID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';

/**
 * Authoritative mapping of KKN member local IDs / names to their official Supabase `members.id` UUIDs.
 */
export const MEMBER_DATABASE_UUID_MAP: Record<string, string> = {
  'm-1': '76b1ad85-cc45-499e-af8b-699000a7707f',
  'm-2': 'b55a7c59-aa05-4115-91e4-a98e1de57115',
  'm-3': 'f72a5801-6310-495f-91f9-2a9f36fd8a02',
  'm-4': 'f2127232-091d-4da3-83e1-564774f868ee',
  'm-5': '4bd302f5-cb34-4e9c-b50c-ba40f15d2138',
  'm-6': 'df362ef0-450c-40e6-9afd-6bc90391d722',
  'm-7': 'c1761b8e-7ef5-4f79-9f77-fd422bb572f4',
  'm-8': '4dbcec1e-a8e7-438e-8070-26c81650c6d4',
  'm-9': '78d752d2-5420-445f-b86c-48a63c101742',
  'm-10': '9b9cacc4-1c4d-4cc0-b71f-1b4b889974d7',
  dpl: 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
};

export const MEMBER_NAME_UUID_MAP: Record<string, string> = {
  'josua ujung': '76b1ad85-cc45-499e-af8b-699000a7707f',
  'mulia oktaviani': 'b55a7c59-aa05-4115-91e4-a98e1de57115',
  'tsaniatul amni alwan': 'f72a5801-6310-495f-91f9-2a9f36fd8a02',
  'abdul habir al majdi': 'f2127232-091d-4da3-83e1-564774f868ee',
  'asma nadiya': '4bd302f5-cb34-4e9c-b50c-ba40f15d2138',
  'muhammad agits haibatulloh': 'df362ef0-450c-40e6-9afd-6bc90391d722',
  'nurul ainun': 'c1761b8e-7ef5-4f79-9f77-fd422bb572f4',
  'zidane ath thoriq': '4dbcec1e-a8e7-438e-8070-26c81650c6d4',
  'dini aminarti': '78d752d2-5420-445f-b86c-48a63c101742',
  'putu sri astiningsih': '9b9cacc4-1c4d-4cc0-b71f-1b4b889974d7',
  'lalu muhammad aby dujana, m.si.': 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
  'lalu muhammad aby dujana': 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
};

export function isValidUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export function resolveMemberDatabaseUuid(member: {
  id?: string;
  databaseId?: string;
  dbId?: string;
  name?: string;
}): string {
  if (isValidUuid(member.databaseId)) return member.databaseId!.trim();
  if (isValidUuid(member.dbId)) return member.dbId!.trim();
  if (isValidUuid(member.id)) return member.id!.trim();

  if (member.id && MEMBER_DATABASE_UUID_MAP[member.id]) {
    return MEMBER_DATABASE_UUID_MAP[member.id];
  }

  if (member.name) {
    const cleanName = member.name.trim().toLowerCase();
    if (MEMBER_NAME_UUID_MAP[cleanName]) {
      return MEMBER_NAME_UUID_MAP[cleanName];
    }
  }

  return member.databaseId || member.dbId || member.id || '';
}

export interface PasswordValidationResult {
  valid: boolean;
  minLengthMet: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  passwordsMatch: boolean;
  errorMessage: string | null;
}

/**
 * Validates first-login password change requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - Matches confirmation password (if provided)
 */
export function validateFirstLoginPassword(
  password: string,
  confirmPassword?: string
): PasswordValidationResult {
  const minLengthMet = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch =
    confirmPassword === undefined ? true : password.length > 0 && password === confirmPassword;

  let errorMessage: string | null = null;
  if (!minLengthMet) {
    errorMessage = 'Password baru minimal harus terdiri dari 12 karakter.';
  } else if (!hasUppercase) {
    errorMessage = 'Password baru wajib mengandung minimal 1 huruf besar (A-Z).';
  } else if (!hasLowercase) {
    errorMessage = 'Password baru wajib mengandung minimal 1 huruf kecil (a-z).';
  } else if (!hasNumber) {
    errorMessage = 'Password baru wajib mengandung minimal 1 angka (0-9).';
  } else if (!passwordsMatch) {
    errorMessage = 'Konfirmasi password baru tidak cocok.';
  }

  return {
    valid: minLengthMet && hasUppercase && hasLowercase && hasNumber && passwordsMatch,
    minLengthMet,
    hasUppercase,
    hasLowercase,
    hasNumber,
    passwordsMatch,
    errorMessage,
  };
}

export interface AccountSecurityStatus {
  requiresPasswordChange: boolean;
  mustChangePassword: boolean;
  isTemporaryPasswordExpired: boolean;
  expiresAt: string | null;
  role: UserRole | null;
  systemRole: SystemRole | null;
  memberId: string | null;
  memberName: string | null;
  position: string | null;
  division: string | null;
  email: string | null;
  accountStatus: 'active' | 'pending' | 'disabled' | 'revoked';
}

export function resolveRoleFromMemberAccess(rawRole?: string | null, rawSystemRole?: string | null): {
  role: UserRole;
  systemRole: SystemRole;
} {
  const r = (rawRole || '').trim().toLowerCase();
  const sr = (rawSystemRole || rawRole || '').trim().toLowerCase();

  let systemRole: SystemRole = 'member';
  if (sr === 'super_admin') {
    systemRole = 'super_admin';
  } else if (sr === 'admin') {
    systemRole = 'admin';
  } else if (sr === 'dpl' || r === 'dpl') {
    systemRole = 'dpl';
  } else if (sr === 'viewer' || r === 'viewer') {
    systemRole = 'viewer';
  } else {
    systemRole = 'member';
  }

  let role: UserRole = 'member';
  if (r === 'dpl' || sr === 'dpl') {
    role = 'dpl';
  } else if (r === 'ketua') {
    role = 'ketua';
  } else if (r === 'admin' || sr === 'admin') {
    role = 'admin';
  } else if (r === 'viewer') {
    role = 'viewer';
  } else {
    role = 'member';
  }

  return { role, systemRole };
}

export function parseAccountSecurityStatus(raw: any): AccountSecurityStatus {
  const payload = raw?.data && typeof raw.data === 'object' ? { ...raw, ...raw.data } : raw || {};
  const security = payload?.security && typeof payload.security === 'object' ? payload.security : {};
  const member = payload?.member && typeof payload.member === 'object' ? payload.member : {};
  const access = payload?.member_access && typeof payload.member_access === 'object' ? payload.member_access : {};

  const requiresPasswordChange = Boolean(
    payload.requires_password_change === true ||
      payload.must_change_password === true ||
      payload.requiresPasswordChange === true ||
      payload.mustChangePassword === true ||
      security.requires_password_change === true ||
      security.must_change_password === true ||
      access.must_change_password === true ||
      access.requires_password_change === true
  );

  const expiresAt =
    payload.temporary_password_expires_at ||
    payload.temp_password_expires_at ||
    payload.password_expires_at ||
    payload.expires_at ||
    security.temporary_password_expires_at ||
    security.expires_at ||
    null;

  let isTemporaryPasswordExpired = Boolean(
    payload.temporary_password_expired === true ||
      payload.temp_password_expired === true ||
      payload.password_expired === true ||
      payload.is_expired === true ||
      security.temporary_password_expired === true ||
      security.is_expired === true
  );

  if (!isTemporaryPasswordExpired && requiresPasswordChange && expiresAt) {
    const expTime = new Date(expiresAt).getTime();
    if (!Number.isNaN(expTime) && expTime < Date.now()) {
      isTemporaryPasswordExpired = true;
    }
  }

  const rawRole =
    access.role ||
    payload.role ||
    payload.member_role ||
    member.role ||
    null;
  const rawSystemRole =
    access.system_role ||
    payload.system_role ||
    payload.systemRole ||
    access.role ||
    payload.role ||
    null;

  const hasRoleInfo = Boolean(rawRole || rawSystemRole);
  const resolvedRoles = hasRoleInfo
    ? resolveRoleFromMemberAccess(rawRole, rawSystemRole)
    : { role: null, systemRole: null };

  const rawStatus = String(
    access.status || payload.account_status || payload.status || member.status || 'active'
  ).toLowerCase();

  let accountStatus: 'active' | 'pending' | 'disabled' | 'revoked' = 'active';
  if (rawStatus === 'disabled' || rawStatus === 'suspended' || access.is_active === false) {
    accountStatus = 'disabled';
  } else if (rawStatus === 'revoked') {
    accountStatus = 'revoked';
  } else if (rawStatus === 'pending' || rawStatus === 'pending_activation') {
    accountStatus = 'pending';
  }

  return {
    requiresPasswordChange,
    mustChangePassword: requiresPasswordChange,
    isTemporaryPasswordExpired,
    expiresAt: expiresAt ? String(expiresAt) : null,
    role: resolvedRoles.role,
    systemRole: resolvedRoles.systemRole,
    memberId:
      payload.member_id ||
      payload.memberId ||
      member.id ||
      access.member_id ||
      null,
    memberName:
      payload.full_name ||
      payload.member_name ||
      payload.name ||
      member.full_name ||
      member.name ||
      null,
    position:
      payload.position ||
      payload.position_title ||
      member.position ||
      member.position_title ||
      null,
    division: payload.division || member.division || null,
    email: payload.email || member.email || access.email || null,
    accountStatus,
  };
}

export interface ProvisionedAccountModalData {
  actionType: 'provision' | 'reset';
  memberId: string;
  memberName: string;
  email: string;
  role: string;
  position?: string;
  division?: string;
  temporaryPassword: string;
  expiresAt: string | null;
}

export function parseProvisionedAccountResponse(
  raw: any,
  fallback: {
    actionType: 'provision' | 'reset';
    memberId: string;
    memberName: string;
    email: string;
    role?: string;
    position?: string;
    division?: string;
  }
): {
  success: boolean;
  error: string | null;
  modalData: ProvisionedAccountModalData | null;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      error: 'Respons server tidak valid.',
      modalData: null,
    };
  }

  const payload = raw.data && typeof raw.data === 'object' ? { ...raw, ...raw.data } : raw;
  const isSuccess = Boolean(payload.success === true);

  if (!isSuccess) {
    return {
      success: false,
      error: String(payload.error || payload.message || 'Operasi gagal diproses oleh server.'),
      modalData: null,
    };
  }

  const temporaryPassword = String(
    payload.temporary_password ||
      payload.temp_password ||
      payload.password ||
      payload.credentials?.temporary_password ||
      ''
  );

  if (!temporaryPassword) {
    return {
      success: false,
      error: 'Password sementara tidak ditemukan pada respons server.',
      modalData: null,
    };
  }

  const expiresAt =
    payload.expires_at ||
    payload.temporary_password_expires_at ||
    payload.temp_password_expires_at ||
    payload.valid_until ||
    payload.credentials?.expires_at ||
    null;

  const memberName = String(
    payload.member_name ||
      payload.full_name ||
      payload.name ||
      payload.member?.full_name ||
      payload.member?.name ||
      fallback.memberName
  );

  const email = String(
    payload.email || payload.member?.email || fallback.email
  )
    .trim()
    .toLowerCase();

  const role = String(
    payload.role ||
      payload.system_role ||
      payload.member?.role ||
      fallback.role ||
      'member'
  );

  return {
    success: true,
    error: null,
    modalData: {
      actionType: fallback.actionType,
      memberId: String(payload.member_id || fallback.memberId),
      memberName,
      email,
      role,
      position: payload.position || fallback.position,
      division: payload.division || fallback.division,
      temporaryPassword,
      expiresAt: expiresAt ? String(expiresAt) : null,
    },
  };
}
