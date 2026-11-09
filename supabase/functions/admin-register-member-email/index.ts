// @ts-nocheck
// =============================================================================
// SUPABASE EDGE FUNCTION: admin-register-member-email (v1.2.0)
// Project: scslevzuxxkfcuvwbtty
// Description:
//   Privileged server-side Edge Function to register official member & DPL login emails:
//   - Validates email format and strictly enforces uniqueness in registered_emails
//   - Stores record in registered_emails with status: 'pending_activation'
//   - Does NOT create a Supabase Auth user prior to member activation
//   - Updates members table email & status without altering existing profile data
//   - Records audit log in member_email_history & admin_activity_logs
// Security:
//   - Strict CORS origin allowlist (Vercel production, KKN preview URLs, localhost, AI Studio)
//   - OPTIONS returns HTTP 200 with full CORS headers without requiring Bearer token
//   - POST requires valid session and verified Super Admin role
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const SUPER_ADMIN_PRIMARY_EMAIL = 'abhyy333@gmail.com';
const OFFICIAL_DPL_MEMBER_ID = 'c7bf53d4-1c27-424e-992a-7c7c0f98707a';

interface RegisterEmailPayload {
  project_id?: string;
  member_id: string;
  email: string;
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
        JSON.stringify({ error: 'Forbidden: Hanya Super Admin yang diizinkan mendaftarkan email anggota atau DPL.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse request body
    const body = (await req.json()) as RegisterEmailPayload;
    const { member_id, email, confirm_member_name, reason } = body;

    if (!member_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Parameter member_id dan email wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Format alamat email tidak valid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Enforce email uniqueness across registered_emails
    const { data: conflictReg } = await adminClient
      .from('registered_emails')
      .select('member_id, member_name, email')
      .ilike('email', cleanEmail)
      .neq('member_id', member_id)
      .maybeSingle();

    if (conflictReg) {
      return new Response(
        JSON.stringify({
          error: `Alamat email "${cleanEmail}" sudah terdaftar untuk anggota ${conflictReg.member_name || conflictReg.member_id}. Gunakan alamat email unik.`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Fetch current member details from members table
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

    const isSupervisor =
      member_id === OFFICIAL_DPL_MEMBER_ID ||
      memberRow?.member_category === 'supervisor' ||
      memberRow?.is_supervisor === true ||
      memberRow?.role?.toLowerCase().includes('dpl');

    const memberName =
      memberRow?.name ||
      confirm_member_name ||
      (isSupervisor ? 'Lalu Muhammad Aby Dujana, M.Si.' : 'Anggota KKN');

    const memberPosition =
      memberRow?.position ||
      memberRow?.role ||
      (isSupervisor ? 'Dosen Pembimbing Lapangan' : 'Anggota');

    const memberDivision =
      memberRow?.division ||
      (isSupervisor ? 'Supervisi' : 'Divisi Acara');

    const systemRole = isSupervisor ? 'dpl' : 'member';
    const nowIso = new Date().toISOString();

    // Check existing registration row for this member
    const { data: existingReg } = await adminClient
      .from('registered_emails')
      .select('*')
      .eq('member_id', member_id)
      .maybeSingle();

    const previousEmail = existingReg?.email || memberRow?.email || null;

    // 8. Store in registered_emails (pending_activation status, NO Auth user created)
    const regPayload = {
      email: cleanEmail,
      member_id,
      member_name: memberName,
      name: memberName,
      position: memberPosition,
      division: memberDivision,
      system_role: systemRole,
      role: isSupervisor ? 'dpl' : 'member',
      status: 'pending_activation',
      is_active: true,
      auth_user_id: null,
      registered_by: callerEmail,
      registered_at: nowIso,
    };

    if (existingReg?.id) {
      await adminClient
        .from('registered_emails')
        .update(regPayload)
        .eq('id', existingReg.id);
    } else {
      const { error: insertErr } = await adminClient
        .from('registered_emails')
        .insert({
          id: `reg-${member_id}`,
          ...regPayload,
        });

      if (insertErr) {
        // Fallback upsert by email
        await adminClient
          .from('registered_emails')
          .upsert(regPayload, { onConflict: 'email' });
      }
    }

    // 9. Update members table (preserve all identity, academic, and role fields)
    if (memberRow?.id) {
      await adminClient
        .from('members')
        .update({
          email: cleanEmail,
          account_status: 'pending',
          status: 'Offline',
          updated_at: nowIso,
        })
        .eq('id', memberRow.id);
    } else {
      await adminClient
        .from('members')
        .update({
          email: cleanEmail,
          account_status: 'pending',
          status: 'Offline',
          updated_at: nowIso,
        })
        .eq('id', member_id);
    }

    // 10. Record in member_email_history
    try {
      await adminClient.from('member_email_history').insert({
        member_id,
        member_name: memberName,
        previous_email: previousEmail,
        replacement_email: cleanEmail,
        action: previousEmail ? 'REPLACE' : 'REGISTER',
        performed_by: callerEmail,
        reason: reason || (isSupervisor ? 'Registrasi email DPL oleh Super Admin' : 'Pendaftaran email anggota oleh Super Admin'),
        created_at: nowIso,
      });
    } catch (histErr) {
      console.warn('member_email_history insert notice:', histErr);
    }

    // 11. Record in admin_activity_logs
    try {
      await adminClient.from('admin_activity_logs').insert({
        id: `log-${Date.now()}`,
        actor_email: callerEmail,
        actor_name: 'Super Admin',
        action: isSupervisor ? 'REGISTER_DPL_EMAIL' : 'REGISTER_MEMBER_EMAIL',
        target: `${memberName} (${cleanEmail})`,
        details: `Registrasi email login: ${cleanEmail}. Status: Menunggu Aktivasi. Alasan: ${reason || '-'}`,
        timestamp: nowIso,
      });
    } catch (logErr) {
      console.warn('admin_activity_logs insert notice:', logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        member_id,
        email: cleanEmail,
        name: memberName,
        status: 'pending_activation',
        message: isSupervisor
          ? `Email DPL (${cleanEmail}) berhasil didaftarkan. Status: Menunggu Aktivasi.`
          : `Email anggota (${cleanEmail}) berhasil didaftarkan. Status: Menunggu Aktivasi.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Edge Function error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
