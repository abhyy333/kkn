import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFirstLoginPassword,
  parseAccountSecurityStatus,
  parseProvisionedAccountResponse,
  resolveRoleFromMemberAccess,
  resolveMemberDatabaseUuid,
} from './authSecurity';

test('validateFirstLoginPassword enforces min 12 chars, uppercase, lowercase, digit, and confirm match', () => {
  // Too short
  const shortRes = validateFirstLoginPassword('Abc12345', 'Abc12345');
  assert.equal(shortRes.valid, false);
  assert.equal(shortRes.minLengthMet, false);

  // Missing uppercase
  const noUpper = validateFirstLoginPassword('abcdefghijk123', 'abcdefghijk123');
  assert.equal(noUpper.valid, false);
  assert.equal(noUpper.hasUppercase, false);

  // Missing lowercase
  const noLower = validateFirstLoginPassword('ABCDEFGHIJK123', 'ABCDEFGHIJK123');
  assert.equal(noLower.valid, false);
  assert.equal(noLower.hasLowercase, false);

  // Missing digit
  const noDigit = validateFirstLoginPassword('AbcdefghijklMn', 'AbcdefghijklMn');
  assert.equal(noDigit.valid, false);
  assert.equal(noDigit.hasNumber, false);

  // Mismatched confirmation
  const mismatch = validateFirstLoginPassword('KknSpace2026Valid', 'KknSpace2026Other');
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.passwordsMatch, false);

  // Valid 12+ character password with upper, lower, digit
  const validRes = validateFirstLoginPassword('KknSpace2026Valid', 'KknSpace2026Valid');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.errorMessage, null);
});

test('parseAccountSecurityStatus detects requires_password_change and role from member_access', () => {
  const status1 = parseAccountSecurityStatus({
    requires_password_change: true,
    expires_at: '2099-12-31T23:59:59.000Z',
    member_access: {
      role: 'member',
      system_role: 'member',
      member_id: '76b1ad85-cc45-499e-af8b-699000a7707f',
      status: 'active',
    },
  });
  assert.equal(status1.requiresPasswordChange, true);
  assert.equal(status1.mustChangePassword, true);
  assert.equal(status1.isTemporaryPasswordExpired, false);
  assert.equal(status1.role, 'member');
  assert.equal(status1.memberId, '76b1ad85-cc45-499e-af8b-699000a7707f');

  // Expired temporary password check
  const expiredStatus = parseAccountSecurityStatus({
    must_change_password: true,
    temporary_password_expires_at: '2020-01-01T00:00:00.000Z',
    role: 'dpl',
  });
  assert.equal(expiredStatus.requiresPasswordChange, true);
  assert.equal(expiredStatus.isTemporaryPasswordExpired, true);
  assert.equal(expiredStatus.role, 'dpl');
  assert.equal(expiredStatus.systemRole, 'dpl');
});

test('parseProvisionedAccountResponse extracts one-time temporary_password and metadata', () => {
  const parsed = parseProvisionedAccountResponse(
    {
      success: true,
      temporary_password: 'Tmp#98234KknUser',
      expires_at: '2026-11-12T06:00:00Z',
      role: 'member',
      email: 'josua@example.com',
      member_name: 'Josua Ujung',
    },
    {
      actionType: 'provision',
      memberId: '76b1ad85-cc45-499e-af8b-699000a7707f',
      memberName: 'Josua Ujung',
      email: 'josua@example.com',
    }
  );
  assert.equal(parsed.success, true);
  assert.equal(parsed.modalData?.temporaryPassword, 'Tmp#98234KknUser');
  assert.equal(parsed.modalData?.memberName, 'Josua Ujung');
  assert.equal(parsed.modalData?.email, 'josua@example.com');
  assert.equal(parsed.modalData?.role, 'member');
  assert.equal(parsed.modalData?.expiresAt, '2026-11-12T06:00:00Z');
});

test('resolveRoleFromMemberAccess maps roles accurately without hardcoded emails', () => {
  assert.deepEqual(resolveRoleFromMemberAccess('member', 'super_admin'), {
    role: 'member',
    systemRole: 'super_admin',
  });
  assert.deepEqual(resolveRoleFromMemberAccess('dpl', 'dpl'), {
    role: 'dpl',
    systemRole: 'dpl',
  });
  assert.deepEqual(resolveRoleFromMemberAccess('ketua', 'admin'), {
    role: 'ketua',
    systemRole: 'admin',
  });
});

test('resolveMemberDatabaseUuid resolves UUID from id, databaseId, or name', () => {
  assert.equal(
    resolveMemberDatabaseUuid({ id: 'm-1', name: 'Josua Ujung' }),
    '76b1ad85-cc45-499e-af8b-699000a7707f'
  );
  assert.equal(
    resolveMemberDatabaseUuid({ id: 'm-4', name: 'Abdul Habir Al Majdi' }),
    'f2127232-091d-4da3-83e1-564774f868ee'
  );
  assert.equal(
    resolveMemberDatabaseUuid({
      databaseId: 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
      name: 'Lalu Muhammad Aby Dujana, M.Si.',
    }),
    'c7bf53d4-1c27-424e-992a-7c7c0f98707a'
  );
});
