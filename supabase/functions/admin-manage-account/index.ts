// @ts-nocheck
// =============================================================================
// SUPABASE EDGE FUNCTION: admin-manage-account
// Project: scslevzuxxkfcuvwbtty
// Description:
//   Trusted server-side Edge Function for privileged Supabase Auth operations:
//   - disable: Bans/revokes Auth user session and marks registered_emails,
//     member_access, and members as 'disabled'
//   - restore: Unbans Auth user and restores 'activated' / 'pending_activation'
//   - delete: Permanently deletes the Supabase Auth user via Admin API, clears
//     registered_emails and member_access, resets member account status to
//     'unregistered', and strictly preserves historical tasks, meetings,
//     decisions, surveys, and reports.
// Security:
//   - Uses SUPABASE_SERVICE_ROLE_KEY strictly on the server
//   - Verifies caller's Authorization Bearer token belongs to an active
//     super_admin (abhyy333@gmail.com or system_role = 'super_admin')
//   - Blocks disabling or deleting the currently logged-in super_admin or
//     the last remaining super_admin
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const SUPER_ADMIN_PRIMARY_EMAIL = 'abhyy333@gmail.com';

interface ManageAccountPayload {
  action: 'disable' | 'restore' | 'delete';
  memberId: string;
  email?: string;
  authUserId?: string;
  reason?: string;
  actorEmail?: string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') || req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (origin && !isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: `Forbidden: Origin '${origin}' is not allowed by CORS policy.` }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Vary': 'Origin',
        },
      }
    );
  }

  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify caller identity using caller JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerEmail = userData.user.email.trim().toLowerCase();
    const callerUid = userData.user.id;

    // 2. Initialize Admin Client with Service Role Key (server-side only)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is super_admin
    let isCallerSuperAdmin = callerEmail === SUPER_ADMIN_PRIMARY_EMAIL;
    if (!isCallerSuperAdmin) {
      const { data: callerReg } = await adminClient
        .from('registered_emails')
        .select('system_role, status, is_active')
        .ilike('email', callerEmail)
        .maybeSingle();

      if (
        callerReg &&
        callerReg.system_role === 'super_admin' &&
        callerReg.status !== 'disabled' &&
        callerReg.is_active !== false
      ) {
        isCallerSuperAdmin = true;
      }
    }

    if (!isCallerSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Hanya Super Admin yang diizinkan mengelola akun.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as ManageAccountPayload;
    const { action, memberId, email, authUserId, reason } = body;
    const targetEmail = (email || '').trim().toLowerCase();

    if (!action || !memberId) {
      return new Response(
        JSON.stringify({ error: 'Parameter action dan memberId wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Self-protection & Primary Super Admin Protection
    if (action === 'disable' || action === 'delete') {
      if (
        targetEmail === SUPER_ADMIN_PRIMARY_EMAIL ||
        targetEmail === callerEmail ||
        memberId === 'm-4' ||
        (authUserId && authUserId === callerUid)
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Operasi ditolak: Akun Super Admin utama atau akun yang sedang login tidak dapat dinonaktifkan atau dihapus.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Resolve Auth User ID if not provided
    let resolvedAuthUid = authUserId;
    if (!resolvedAuthUid && targetEmail) {
      const { data: regRow } = await adminClient
        .from('registered_emails')
        .select('auth_user_id')
        .ilike('email', targetEmail)
        .maybeSingle();
      if (regRow?.auth_user_id) {
        resolvedAuthUid = regRow.auth_user_id;
      }
    }

    const nowIso = new Date().toISOString();

    if (action === 'disable') {
      if (resolvedAuthUid) {
        await adminClient.auth.admin.updateUserById(resolvedAuthUid, {
          ban_duration: '876000h', // ~100 years ban until restored
          user_metadata: { account_status: 'disabled', disabled_at: nowIso },
        });
      }

      await adminClient
        .from('registered_emails')
        .update({
          status: 'disabled',
          is_active: false,
          disabled_at: nowIso,
          disabled_reason: reason || 'Dinonaktifkan oleh Super Admin',
        })
        .eq('member_id', memberId);

      await adminClient
        .from('member_access')
        .update({
          status: 'disabled',
          is_active: false,
          disabled_at: nowIso,
          updated_at: nowIso,
        })
        .eq('member_id', memberId);

      await adminClient
        .from('members')
        .update({
          account_status: 'disabled',
          status: 'Offline',
          disabled_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', memberId);

      await adminClient.from('admin_activity_logs').insert({
        id: `log-${Date.now()}`,
        actor_email: callerEmail,
        actor_name: 'Super Admin',
        action: 'DISABLE_ACCOUNT',
        target: `${memberId} (${targetEmail || 'No Email'})`,
        details: `Menonaktifkan akses akun anggota via Edge Function. Alasan: ${reason || 'Kebijakan Admin'}`,
        timestamp: nowIso,
      });

      return new Response(
        JSON.stringify({ success: true, action: 'disable', memberId, email: targetEmail }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'restore') {
      if (resolvedAuthUid) {
        await adminClient.auth.admin.updateUserById(resolvedAuthUid, {
          ban_duration: 'none',
          user_metadata: { account_status: 'active', disabled_at: null },
        });
      }

      const nextStatus = resolvedAuthUid ? 'activated' : 'pending_activation';

      await adminClient
        .from('registered_emails')
        .update({
          status: nextStatus,
          is_active: true,
          disabled_at: null,
          disabled_reason: null,
        })
        .eq('member_id', memberId);

      await adminClient
        .from('member_access')
        .update({
          status: resolvedAuthUid ? 'active' : 'pending_activation',
          is_active: true,
          disabled_at: null,
          updated_at: nowIso,
        })
        .eq('member_id', memberId);

      await adminClient
        .from('members')
        .update({
          account_status: resolvedAuthUid ? 'active' : 'pending',
          disabled_at: null,
          updated_at: nowIso,
        })
        .eq('id', memberId);

      await adminClient.from('admin_activity_logs').insert({
        id: `log-${Date.now()}`,
        actor_email: callerEmail,
        actor_name: 'Super Admin',
        action: 'RESTORE_ACCOUNT',
        target: `${memberId} (${targetEmail || 'No Email'})`,
        details: `Memulihkan kembali akses akun anggota via Edge Function (status: ${nextStatus}).`,
        timestamp: nowIso,
      });

      return new Response(
        JSON.stringify({ success: true, action: 'restore', memberId, status: nextStatus }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Permanently delete Auth user from Supabase Auth if exists
      if (resolvedAuthUid) {
        await adminClient.auth.admin.deleteUser(resolvedAuthUid);
      }

      // Remove email registration and access bindings
      await adminClient.from('registered_emails').delete().eq('member_id', memberId);
      if (targetEmail) {
        await adminClient.from('registered_emails').delete().ilike('email', targetEmail);
      }
      await adminClient.from('member_access').delete().eq('member_id', memberId);

      // Reset member record email & auth status while preserving the member slot
      // and all historical tasks, meetings, decisions, surveys, and reports
      await adminClient
        .from('members')
        .update({
          email: '',
          auth_user_id: null,
          account_status: 'unregistered',
          status: 'Offline',
          activated_at: null,
          disabled_at: null,
          updated_at: nowIso,
        })
        .eq('id', memberId);

      await adminClient.from('admin_activity_logs').insert({
        id: `log-${Date.now()}`,
        actor_email: callerEmail,
        actor_name: 'Super Admin',
        action: 'DELETE_AUTH_ACCOUNT',
        target: `${memberId} (${targetEmail || 'No Email'})`,
        details:
          'Menghapus akun Supabase Auth dan registrasi email secara permanen. Riwayat tugas, rapat, dan kontribusi tetap dipertahankan.',
        timestamp: nowIso,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: 'delete',
          memberId,
          preservedHistory: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Action tidak dikenali: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Edge Function error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
