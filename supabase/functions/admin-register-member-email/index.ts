// @ts-nocheck
// =============================================================================
// SUPABASE EDGE FUNCTION: admin-register-member-email (v1.3.0)
// Project: scslevzuxxkfcuvwbtty
// Description:
//   Privileged server-side Edge Function to manage member & DPL login registrations & invitations:
//   - Action 'register': Validates format & uniqueness, registers in registered_emails (pending_activation),
//     triggers Supabase Auth inviteUserByEmail, tracks delivery status (including Gmail SMTP 535),
//     preserves registered_emails row if SMTP fails, and records audit logs.
//   - Action 'resend_invitation': Retries sending invitation to existing registered email
//     without creating duplicate rows, updates delivery status, records audit logs.
// Security:
//   - Strict CORS origin allowlist (Vercel production, KKN preview URLs, localhost, AI Studio)
//   - OPTIONS returns HTTP 200 without requiring Bearer token
//   - POST requires valid session and verified Super Admin role
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const SUPER_ADMIN_PRIMARY_EMAIL = 'abhyy333@gmail.com';
const OFFICIAL_DPL_MEMBER_ID = 'c7bf53d4-1c27-424e-992a-7c7c0f98707a';

interface RegisterEmailPayload {
  project_id?: string;
  member_id: string;
  email?: string;
  confirm_member_name?: string;
  reason?: string;
  action?: 'register' | 'resend_invitation';
}

function parseSmtpError(rawMsg: string): { code: string; message: string } {
  const lower = rawMsg.toLowerCase();
  if (lower.includes('535') || lower.includes('username and password not accepted') || lower.includes('badcredentials') || lower.includes('authentication failed')) {
    return {
      code: 'smtp_rejected',
      message: 'SMTP Error (535 5.7.8): Username and Password not accepted. Kredensial App Password Gmail pada konfigurasi SMTP Supabase ditolak.',
    };
  }
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('over_email_send_rate_limit')) {
    return {
      code: 'rate_limit',
      message: 'Batas frekuensi pengiriman email Supabase tercapai. Silakan coba kirim ulang sesaat lagi.',
    };
  }
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return {
      code: 'already_exists',
      message: 'Akun Auth untuk email ini sudah terdaftar di Supabase Auth.',
    };
  }
  if (lower.includes('timeout') || lower.includes('connection refused') || lower.includes('network')) {
    return {
      code: 'smtp_unavailable',
      message: 'Server SMTP tidak dapat dijangkau saat ini.',
    };
  }
  return {
    code: 'general_error',
    message: rawMsg,
  };
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
        JSON.stringify({ error: 'Forbidden: Hanya Super Admin yang diizinkan mengelola registrasi atau undangan email.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse request body
    const body = (await req.json()) as RegisterEmailPayload;
    const { member_id, email, confirm_member_name, reason, action = 'register' } = body;

    if (!member_id) {
      return new Response(
        JSON.stringify({ error: 'Parameter member_id wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nowIso = new Date().toISOString();

    // -------------------------------------------------------------------------
    // ACTION: RESEND INVITATION (Retry invitation without duplicate row)
    // -------------------------------------------------------------------------
    if (action === 'resend_invitation') {
      const { data: existingReg } = await adminClient
        .from('registered_emails')
        .select('*')
        .eq('member_id', member_id)
        .maybeSingle();

      if (!existingReg || !existingReg.email) {
        return new Response(
          JSON.stringify({ error: 'Belum ada email yang terdaftar untuk anggota ini. Daftarkan email terlebih dahulu.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let deliveryStatus = 'sent';
      let deliveryError = null;

      try {
        const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
          existingReg.email,
          {
            data: {
              name: existingReg.name || existingReg.member_name,
              member_id: existingReg.member_id,
              role: existingReg.role || existingReg.system_role || 'member',
            },
          }
        );

        if (inviteErr) {
          const parsed = parseSmtpError(inviteErr.message);
          deliveryStatus = 'failed';
          deliveryError = parsed.message;
        }
      } catch (err: any) {
        const parsed = parseSmtpError(err?.message || 'SMTP delivery failed');
        deliveryStatus = 'failed';
        deliveryError = parsed.message;
      }

      // Update existing row in registered_emails (NEVER create a new row)
      await adminClient
        .from('registered_emails')
        .update({
          invitation_delivery_status: deliveryStatus,
          invitation_delivery_error: deliveryError,
          invitation_last_sent_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', existingReg.id);

      // Audit log
      try {
        await adminClient.from('admin_activity_logs').insert({
          id: `log-${Date.now()}`,
          actor_email: callerEmail,
          actor_name: 'Super Admin',
          action: 'RESEND_INVITATION',
          target: `${existingReg.name} (${existingReg.email})`,
          details: `Mengirim ulang undangan ke ${existingReg.email}. Hasil pengiriman: ${deliveryStatus === 'sent' ? 'Terkirim' : `Gagal (${deliveryError})`}`,
          timestamp: nowIso,
        });
      } catch {}

      return new Response(
        JSON.stringify({
          success: true,
          action: 'resend_invitation',
          email: existingReg.email,
          name: existingReg.name,
          invitation_delivery_status: deliveryStatus,
          invitation_delivery_error: deliveryError,
          message: deliveryStatus === 'sent'
            ? `Undangan aktivasi berhasil dikirim ulang ke ${existingReg.email}.`
            : `Undangan email belum dapat dikirim via SMTP (${deliveryError}). Email pendaftaran tetap aman tersimpan.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: REGISTER (First registration or update assignment)
    // -------------------------------------------------------------------------
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Parameter email wajib diisi.' }),
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

    // Check existing registration row for this member
    const { data: existingReg } = await adminClient
      .from('registered_emails')
      .select('*')
      .eq('member_id', member_id)
      .maybeSingle();

    const previousEmail = existingReg?.email || memberRow?.email || null;

    // 8. Attempt sending Supabase Auth invitation
    let invitationStatus = 'sent';
    let invitationError = null;

    try {
      const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: {
            name: memberName,
            member_id,
            role: isSupervisor ? 'dpl' : 'member',
          },
        }
      );

      if (inviteErr) {
        const parsed = parseSmtpError(inviteErr.message);
        invitationStatus = 'failed';
        invitationError = parsed.message;
      }
    } catch (inviteEx: any) {
      const parsed = parseSmtpError(inviteEx?.message || 'SMTP delivery failed');
      invitationStatus = 'failed';
      invitationError = parsed.message;
    }

    // 9. Store in registered_emails (CRITICAL: KEEP registration even if SMTP delivery failed)
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
      invitation_delivery_status: invitationStatus,
      invitation_delivery_error: invitationError,
      invitation_last_sent_at: nowIso,
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

    // 10. Update members table (preserve all identity, academic, and role fields)
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

    // 11. Record in member_email_history
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

    // 12. Record in admin_activity_logs
    try {
      await adminClient.from('admin_activity_logs').insert({
        id: `log-${Date.now()}`,
        actor_email: callerEmail,
        actor_name: 'Super Admin',
        action: isSupervisor ? 'REGISTER_DPL_EMAIL' : 'REGISTER_MEMBER_EMAIL',
        target: `${memberName} (${cleanEmail})`,
        details: `Registrasi email login: ${cleanEmail}. Pengiriman undangan: ${invitationStatus === 'sent' ? 'Berhasil' : `Terkendala (${invitationError})`}`,
        timestamp: nowIso,
      });
    } catch (logErr) {
      console.warn('admin_activity_logs insert notice:', logErr);
    }

    const message = invitationStatus === 'sent'
      ? (isSupervisor
          ? `Email DPL (${cleanEmail}) berhasil didaftarkan dan undangan email berhasil dikirim.`
          : `Email anggota (${cleanEmail}) berhasil didaftarkan dan undangan email berhasil dikirim.`)
      : (isSupervisor
          ? `Email DPL (${cleanEmail}) berhasil didaftarkan. Pengiriman undangan otomatis terkendala konfigurasi SMTP (${invitationError}). Email pendaftaran tetap disimpan dan dapat dikirim ulang oleh Admin.`
          : `Email anggota (${cleanEmail}) berhasil didaftarkan. Pengiriman undangan otomatis terkendala konfigurasi SMTP (${invitationError}). Email pendaftaran tetap disimpan dan dapat dikirim ulang oleh Admin.`);

    return new Response(
      JSON.stringify({
        success: true,
        member_id,
        email: cleanEmail,
        name: memberName,
        status: 'pending_activation',
        invitation_delivery_status: invitationStatus,
        invitation_delivery_error: invitationError,
        message,
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
