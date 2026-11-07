# KKN SPACE — Security Specification & Invariants

## 1. Data Invariants
1. **Zero Self-Assigned Roles**: Normal users creating their profile document cannot set `role: "admin"` unless they are already an authorized administrator or pre-configured bootstrap admin.
2. **Role Immutability for Non-Admins**: When updating their profile, a user can modify display details (avatar, phone, emergency contact) but cannot modify their `role` field.
3. **Invitation Gatekeeping**: Only verified administrators can issue new invitations (`create`) or revoke invitations (`delete`).
4. **Token Consumption Atomicity**: Non-admin users can only update an invitation document to mark `status: "accepted"`, and only when authenticated.
5. **DPL Read-Only Boundary**: Users with the `dpl` role have full read access to inspect workspace documents, financials, meetings, and reports, but cannot mutate operational records or delete data.
6. **Admin Isolation**: Documents under `/admins/{userId}` are strictly readable and writable only by existing administrators.

## 2. The "Dirty Dozen" Threat Payloads
The following payloads test the resilience of our Firestore security model:
1. `ATTACK-01 (Privilege Escalation)`: Unauthenticated client attempts to create `/users/malicious_uid` with `role: "admin"`. -> Expected: PERMISSION_DENIED.
2. `ATTACK-02 (Role Modification)`: Normal member attempts to update their own profile with `role: "admin"`. -> Expected: PERMISSION_DENIED.
3. `ATTACK-03 (Admin Document Injection)`: Authenticated non-admin attempts to create a document in `/admins/{uid}`. -> Expected: PERMISSION_DENIED.
4. `ATTACK-04 (Rogue Invitation Generation)`: Authenticated non-admin attempts to insert an invitation token into `/invitations/{id}`. -> Expected: PERMISSION_DENIED.
5. `ATTACK-05 (Invitation Deletion by Non-Admin)`: Authenticated non-admin attempts to delete an invitation in `/invitations/{id}`. -> Expected: PERMISSION_DENIED.
6. `ATTACK-06 (DPL Unauthorized Write to Finance)`: Authenticated user with role `dpl` attempts to insert an expense transaction into `/transactions/tx-fake`. -> Expected: PERMISSION_DENIED.
7. `ATTACK-07 (Unauthenticated Read to Private Tasks)`: Unauthenticated visitor attempts to list `/tasks`. -> Expected: PERMISSION_DENIED.
8. `ATTACK-08 (Unauthenticated Write to Meeting Minutes)`: Unauthenticated visitor attempts to write to `/meetings/mtg-hack`. -> Expected: PERMISSION_DENIED.
9. `ATTACK-09 (ID Poisoning Attack)`: Attacker passes an invalid or malicious document ID containing path traversal characters (`../../etc`). -> Expected: PERMISSION_DENIED.
10. `ATTACK-10 (PII Profile Snooping by Strangers)`: Unauthenticated client attempts to read private user profiles in `/users/{userId}`. -> Expected: PERMISSION_DENIED.
11. `ATTACK-11 (Arbitrary Key Injection on Invitation Acceptance)`: User attempts to rewrite `invitedBy` or `role` when accepting an invitation. -> Expected: PERMISSION_DENIED.
12. `ATTACK-12 (Global Wildcard Bypass)`: Attacker attempts to write to undefined collections (`/secrets/{id}`). -> Expected: PERMISSION_DENIED via global catch-all.

## 3. Test Runner
Implemented in `src/utils/firestore.rules.test.ts` to assert all validation gates.
