// @ts-nocheck
// =============================================================================
// SUPABASE EDGE FUNCTION: admin-reset-member-email (v1.2.0)
// Project: scslevzuxxkfcuvwbtty
// Description:
//   Privileged server-side Edge Function to remove or replace member/DPL login emails:
//   - remove: Revokes login email, deletes connected Supabase Auth user,
//     clears email & auth_user_id on member, preserves member profile and activity,
//     resets account status to pending ('Menunggu Aktivasi'), and logs audit history.
//   - replace: Revokes previous email, deletes old Auth user, assigns new
//     unique email, sets status to pending activation, and logs audit history.
// Security:
//   - Strict CORS origin allowlist (Vercel production, KKN preview URLs, localhost, AI Studio)
//   - OPTIONS returns HTTP 200 with full CORS headers without requiring Bearer token
//   - POST requires valid session and verified Super Admin role
//   - Blocks removing or replacing the primary super_admin (abhyy333@gmail.com)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const SUPER_ADMIN_PRIMARY_EMAIL = 'abhyy333@gmail.com';

interface ResetEmailPayload {
  project_id?: string;
  member_id: string;
  action: 'remove' | 'replace';
  new_email?: string;
  confirm_member_name?: string;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') || req.headers.get('origin');

  // 1. Handle CORS Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // 2. Validate Origin for POST
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
        JSON.stringify({ error: 'Missing Authorization header. Sesi autentikasi diperlukan.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify caller session using caller JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerEmail = userData.user.email.trim().toLowerCase();
    const callerUid = userData.user.id;

    // 4. Initialize Admin Client with Service Role Key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is super_admin
    let isCallerSuperAdmin = callerEmail === SUPER_ADMIN_PRIMARY_EMAIL;
    if (!isCallerSuperAdmin) {
      const { data: adminRow } = await adminClient
        .from('admin_accounts')
        .select('role, is_active')
        .or(`auth_user_id.eq.${callerUid},user_id.eq.${callerUid},email.ilike.${callerEmail}`)
        .maybeSingle();

      if (adminRow && adminRow.is_active !== false && adminRow.role === 'super_admin') {
        isCallerSuperAdmin = true;
      }
    }

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
        JSON.stringify({ error: 'Forbidden: Hanya Super Admin yang diizinkan mengelola atau mereset email anggota.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse request body
    const body = (await req.json()) as ResetEmailPayload;
    const { member_id, action, new_email, confirm_member_name, reason } = body;

    if (!action || !member_id) {
      return new Response(
        JSON.stringify({ error: 'Parameter action dan member_id wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action !== 'remove' && action !== 'replace') {
      return new Response(
        JSON.stringify({ error: 'Action harus bernilai "remove" atau "replace".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Fetch current member details
    let memberRow = null;
    const { data: byId } = await adminClient
      .from('members')
      .select('*')
      .eq('id', member_id)
      .maybeSingle();

    if (byId) {
      memberRow = byId;
    } else if (confirm_member_name) {
      const { data: byName } = await adminClient
        .from('members')
        .select('*')
        .ilike('name', confirm_member_name.trim())
        .maybeSingle();
      if (byName) memberRow = byName;
    }

    const memberName = memberRow?.name || confirm_member_name || member_id;

    // Validate confirmation name if provided
    if (confirm_member_name && memberRow?.name && confirm_member_name.trim().toLowerCase() !== memberRow.name.trim().toLowerCase()) {
      return new Response(
        JSON.stringify({ error: `Konfirmasi nama tidak cocok. Masukkan nama lengkap "${memberRow.name}" dengan benar.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Protection check for primary super admin
    if (
      member_id === 'm-4' ||
      memberRow?.id === 'm-4' ||
      (memberRow?.email && memberRow.email.toLowerCase() === SUPER_ADMIN_PRIMARY_EMAIL) ||
      (memberRow?.auth_user_id && memberRow.auth_user_id === callerUid)
    ) {
      return new Response(
        JSON.stringify({ error: 'Akun Super Admin utama (Abdul Habir Al Majdi) dilindungi dan tidak dapat direset atau dihapus.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch existing registered_email record if any
    let regRow = null;
    const { data: regById } = await adminClient
      .from('registered_emails')
      .select('*')
      .eq('member_id', member_id)
      .maybeSingle();

    if (regById) {
      regRow = regById;
    } else if (memberRow?.id) {
      const { data: regByMemberId } = await adminClient
        .from('registered_emails')
        .select('*')
        .eq('member_id', memberRow.id)
        .maybeSingle();
      if (regByMemberId) regRow = regByMemberId;
    }

    const previousEmail = regRow?.email || memberRow?.email || null;
    let authUserId = memberRow?.auth_user_id || regRow?.auth_user_id || null;
    const targetMemberId = memberRow?.id || member_id;
    const nowIso = new Date().toISOString();

    // If authUserId not directly in database rows, search by previousEmail in Auth
    if (!authUserId && previousEmail) {
      try {
        const { data: userList } = await adminClient.auth.admin.listUsers();
        if (userList?.users) {
          const matchedUser = userList.users.find(
            (u) => u.email?.trim().toLowerCase() === previousEmail.trim().toLowerCase()
          );
          if (matchedUser) {
            authUserId = matchedUser.id;
          }
        }
      } catch (authFindErr) {
        console.warn('Auth user lookup by email notice:', authFindErr);
      }
    }

    // 7. ACTION: REMOVE (e.g. Josua Ujung)
    if (action === 'remove') {
      // a. Delete connected Supabase Auth user if exists
      if (authUserId) {
        try {
          await adminClient.auth.admin.deleteUser(authUserId);
        } catch (delErr) {
          console.warn('Auth user delete notice:', delErr);
        }
      }

      // b. Remove assignment from registered_emails
      await adminClient.from('registered_emails').delete().eq('member_id', targetMemberId);
      if (member_id !== targetMemberId) {
        await adminClient.from('registered_emails').delete().eq('member_id', member_id);
      }
      if (previousEmail) {
        await adminClient.from('registered_emails').delete().ilike('email', previousEmail);
      }

      // c. Remove from member_access
      await adminClient.from('member_access').delete().eq('member_id', targetMemberId);
      if (member_id !== targetMemberId) {
        await adminClient.from('member_access').delete().eq('member_id', member_id);
      }
      if (previousEmail) {
        await adminClient.from('member_access').delete().ilike('email', previousEmail);
      }

      // d. Update members table: clear email & auth_user_id, reset status to pending
      // STRICTLY PRESERVES: name, NIM, position, division, phone, tasks, and historical contributions
      await adminClient
        .from('members')
        .update({
          email: '',
          auth_user_id: null,
          account_status: 'pending',
          status: 'Offline',
          updated_at: nowIso,
        })
        .eq('id', targetMemberId);

      if (member_id !== targetMemberId) {
        await adminClient
          .from('members')
          .update({
            email: '',
            auth_user_id: null,
            account_status: 'pending',
            status: 'Offline',
            updated_at: nowIso,
          })
          .eq('id', member_id);
      }

      // e. Record in member_email_history
      try {
        await adminClient.from('member_email_history').insert({
          member_id: targetMemberId,
          member_name: memberName,
          previous_email: previousEmail,
          replacement_email: null,
          action: 'REMOVE',
          performed_by: callerEmail,
          reason: reason || 'Pencabutan email dan akun autentikasi oleh Super Admin',
          created_at: nowIso,
        });
      } catch (histErr) {
        console.warn('member_email_history insert notice:', histErr);
      }

      // f. Record in admin_activity_logs
      try {
        await adminClient.from('admin_activity_logs').insert({
          id: `log-${Date.now()}`,
          actor_email: callerEmail,
          actor_name: 'Super Admin',
          action: 'REMOVE_MEMBER_EMAIL',
          target: `${memberName} (${targetMemberId})`,
          details: `Email login (${previousEmail || 'kosong'}) dan akun autentikasi dihapus. Profil anggota, tugas, dan kontribusi tetap dipertahankan. Status: Menunggu Aktivasi. Alasan: ${reason || 'Reset email oleh Super Admin'}`,
          timestamp: nowIso,
        });
      } catch (logErr) {
        console.warn('admin_activity_logs insert notice:', logErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          changed: true,
          action: 'remove',
          member_id: targetMemberId,
          member_name: memberName,
          previous_email: previousEmail,
          status: 'pending',
          message: `Email login untuk ${memberName} berhasil dihapus. Profil anggota tetap dipertahankan secara utuh.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. ACTION: REPLACE
    if (action === 'replace') {
      const cleanNewEmail = (new_email || '').trim().toLowerCase();
      if (!cleanNewEmail || !cleanNewEmail.includes('@') || !cleanNewEmail.includes('.')) {
        return new Response(
          JSON.stringify({ error: 'Alamat email baru tidak valid.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check email uniqueness across registered_emails
      const { data: conflictReg } = await adminClient
        .from('registered_emails')
        .select('member_id, member_name, email')
        .ilike('email', cleanNewEmail)
        .neq('member_id', targetMemberId)
        .maybeSingle();

      if (conflictReg) {
        return new Response(
          JSON.stringify({
            error: `Alamat email "${cleanNewEmail}" sudah terdaftar untuk anggota ${conflictReg.member_name || conflictReg.member_id}. Gunakan alamat email unik.`,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Revoke old Auth User if existed
      if (authUserId) {
        try {
          await adminClient.auth.admin.deleteUser(authUserId);
        } catch (delErr) {
          console.warn('Auth user delete notice:', delErr);
        }
      }

      // Upsert registered_emails record for this member
      const isSupervisor =
        targetMemberId === 'c7bf53d4-1c27-424e-992a-7c7c0f98707a' ||
        memberRow?.member_category === 'supervisor' ||
        memberRow?.role?.toLowerCase().includes('dpl');

      const newRegData = {
        email: cleanNewEmail,
        name: memberName,
        member_name: memberName,
        position: memberRow?.position || memberRow?.role || 'Anggota',
        division: memberRow?.division || 'Divisi Acara',
        member_id: targetMemberId,
        system_role: isSupervisor ? 'dpl' : 'member',
        role: isSupervisor ? 'dpl' : 'member',
        status: 'pending_activation',
        auth_user_id: null,
        is_active: true,
        registered_by: callerEmail,
        registered_at: nowIso,
      };

      if (regRow?.id) {
        await adminClient
          .from('registered_emails')
          .update(newRegData)
          .eq('id', regRow.id);
      } else {
        await adminClient
          .from('registered_emails')
          .upsert(newRegData, { onConflict: 'email' });
      }

      // Update members table with new email and pending account_status
      await adminClient
        .from('members')
        .update({
          email: cleanNewEmail,
          auth_user_id: null,
          account_status: 'pending',
          status: 'Offline',
          updated_at: nowIso,
        })
        .eq('id', targetMemberId);

      // Record in member_email_history
      try {
        await adminClient.from('member_email_history').insert({
          member_id: targetMemberId,
          member_name: memberName,
          previous_email: previousEmail,
          replacement_email: cleanNewEmail,
          action: 'REPLACE',
          performed_by: callerEmail,
          reason: reason || 'Penggantian email anggota oleh Super Admin',
          created_at: nowIso,
        });
      } catch (histErr) {
        console.warn('member_email_history insert notice:', histErr);
      }

      // Record in admin_activity_logs
      try {
        await adminClient.from('admin_activity_logs').insert({
          id: `log-${Date.now()}`,
          actor_email: callerEmail,
          actor_name: 'Super Admin',
          action: 'REPLACE_MEMBER_EMAIL',
          target: `${memberName} (${cleanNewEmail})`,
          details: `Email login diganti dari (${previousEmail || 'kosong'}) ke (${cleanNewEmail}). Akun lama dicabut, status diubah ke Menunggu Aktivasi. Alasan: ${reason || 'Pembaruan email'}`,
          timestamp: nowIso,
        });
      } catch (logErr) {
        console.warn('admin_activity_logs insert notice:', logErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'replace',
          member_id: targetMemberId,
          member_name: memberName,
          previous_email: previousEmail,
          new_email: cleanNewEmail,
          status: 'pending',
          message: `Email anggota ${memberName} berhasil diganti ke ${cleanNewEmail}. Anggota harus melakukan aktivasi ulang.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Action tidak didukung: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Edge Function error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
