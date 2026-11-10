// @ts-nocheck
// Admin-only email assignment. The email registry schema intentionally contains
// only ownership/activation metadata; member identity lives in public.members.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const PROJECT_ID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';

function reply(body: Record<string, unknown>, status: number, headers: Record<string,string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);
  const cors = getCorsHeaders(origin);
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405, cors);
  if (origin && !isAllowedOrigin(origin)) return reply({ error: 'Origin not allowed' }, 403, cors);

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    if (!url || !serviceKey || !anonKey) return reply({ error: 'Server configuration missing' }, 500, cors);
    if (!authHeader?.startsWith('Bearer ')) return reply({ error: 'Authentication required' }, 401, cors);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const caller = authData?.user;
    if (authError || !caller?.id || !caller.email || !caller.email_confirmed_at) {
      return reply({ error: 'Sesi Super Admin tidak valid atau belum terverifikasi.' }, 401, cors);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: adminRole, error: adminRoleError } = await admin
      .from('admin_accounts')
      .select('role,is_active')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (adminRoleError) return reply({ error: 'Gagal memverifikasi hak administrator.' }, 500, cors);
    if (adminRole?.role !== 'super_admin' || adminRole.is_active !== true) {
      return reply({ error: 'Hanya Super Admin aktif yang dapat mendaftarkan email anggota.' }, 403, cors);
    }

    const body = await req.json();
    const projectId = body.project_id || PROJECT_ID;
    const memberId = String(body.member_id ?? '').trim();
    const email = normalizeEmail(body.email);
    const confirmName = String(body.confirm_member_name ?? '').trim();
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0,500) : null;

    if (projectId !== PROJECT_ID) return reply({ error: 'Project tidak valid.' }, 404, cors);
    if (!memberId || !email) return reply({ error: 'Anggota dan alamat email wajib diisi.' }, 400, cors);

    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id,project_id,full_name,position_title,division,member_category,status,auth_user_id')
      .eq('id', memberId)
      .eq('project_id', PROJECT_ID)
      .maybeSingle();

    if (memberError) {
      console.error('member lookup failed', memberError.code);
      return reply({ error: 'Gagal membaca data anggota. Tidak ada perubahan yang dilakukan.' }, 500, cors);
    }
    if (!member) return reply({ error: 'Profil anggota tidak ditemukan.' }, 404, cors);
    if (confirmName && confirmName.toLowerCase() !== member.full_name.trim().toLowerCase()) {
      return reply({ error: 'Konfirmasi nama anggota tidak cocok.' }, 409, cors);
    }
    if (!['student','supervisor'].includes(member.member_category)) {
      return reply({ error: 'Hanya profil mahasiswa atau DPL yang dapat diberi email login.' }, 409, cors);
    }
    if (member.auth_user_id) {
      return reply({ error: 'Profil ini sudah terhubung ke akun Auth. Gunakan proses ganti email jika memang diperlukan.' }, 409, cors);
    }

    const { data: currentAssignment, error: currentAssignmentError } = await admin
      .from('registered_emails')
      .select('id,email,is_enabled')
      .eq('project_id', PROJECT_ID)
      .eq('member_id', memberId)
      .maybeSingle();
    if (currentAssignmentError) return reply({ error: 'Gagal memeriksa email yang sudah ditetapkan.' }, 500, cors);
    if (currentAssignment?.is_enabled) {
      return reply({ error: 'Anggota ini sudah memiliki email login. Gunakan Ganti Email.' }, 409, cors);
    }
    if (currentAssignment && !currentAssignment.is_enabled) {
      return reply({ error: 'Anggota ini memiliki penugasan email nonaktif. Gunakan proses pemulihan email atau hubungi administrator.' }, 409, cors);
    }

    const { data: duplicate, error: duplicateError } = await admin
      .from('registered_emails')
      .select('member_id')
      .eq('email', email)
      .maybeSingle();
    if (duplicateError) return reply({ error: 'Gagal memeriksa duplikasi email.' }, 500, cors);
    if (duplicate) return reply({ error: 'Email tersebut sudah digunakan oleh anggota lain.' }, 409, cors);

    const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      console.error('Auth email uniqueness check failed', usersError.message);
      return reply({ error: 'Tidak dapat memeriksa apakah email sudah memiliki akun Auth.' }, 503, cors);
    }
    const authCollision = authUsers.users.find((item) => item.email?.trim().toLowerCase() === email);
    if (authCollision) return reply({ error: 'Email sudah memiliki akun Supabase Auth. Minta Super Admin melakukan rekonsiliasi akun terlebih dahulu.' }, 409, cors);

    const { data: inserted, error: insertError } = await admin
      .from('registered_emails')
      .insert({
        project_id: PROJECT_ID,
        member_id: memberId,
        email,
        system_role: null,
        is_enabled: true,
        registered_by: caller.id,
        activated_at: null,
      })
      .select('id,email,member_id,is_enabled,activated_at,created_at')
      .single();

    if (insertError) {
      console.error('registered_emails insert failed', insertError.code);
      if (insertError.code === '23505') return reply({ error: 'Email atau profil sudah memiliki penugasan. Refresh data lalu coba lagi.' }, 409, cors);
      return reply({ error: 'Email gagal disimpan ke database.' }, 500, cors);
    }

    const { error: memberUpdateError } = await admin
      .from('members')
      .update({ status: 'registered', updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('project_id', PROJECT_ID)
      .is('auth_user_id', null);
    if (memberUpdateError) {
      await admin.from('registered_emails').delete().eq('id', inserted.id);
      console.error('member status update failed', memberUpdateError.code);
      return reply({ error: 'Email gagal disinkronkan dengan status profil. Registrasi dibatalkan.' }, 500, cors);
    }

    const { error: historyError } = await admin.from('member_email_history').insert({
      project_id: PROJECT_ID,
      member_id: memberId,
      previous_email: null,
      new_email: email,
      action: 'registered',
      changed_by: caller.id,
      changed_by_name_snapshot: caller.email,
      reason,
    });
    if (historyError) {
      await admin.from('registered_emails').delete().eq('id', inserted.id);
      console.error('email history insert failed', historyError.code);
      return reply({ error: 'Riwayat audit gagal disimpan. Registrasi dibatalkan.' }, 500, cors);
    }

    const { error: logError } = await admin.from('activity_logs').insert({
      project_id: PROJECT_ID,
      actor_id: caller.id,
      action: 'member_email_registered',
      entity_type: 'member',
      entity_id: memberId,
      summary: 'Super Admin menetapkan email login anggota. Akun menunggu aktivasi.',
    });
    if (logError) console.warn('activity log insert failed', logError.code);

    // Do not create an Auth user here. The member completes password creation
    // through the verified activation flow; the Auth trigger links the user.
    return reply({
      success: true,
      action: 'registered',
      member_id: memberId,
      member_name: member.full_name,
      email: inserted.email,
      status: 'pending_activation',
      activation_required: true,
      message: 'Email login berhasil disimpan. Anggota dapat melanjutkan aktivasi akun.',
    }, 201, cors);
  } catch (error) {
    console.error('admin-register-member-email error', error instanceof Error ? error.message : 'unknown');
    return reply({ error: 'Terjadi kesalahan server saat mendaftarkan email.' }, 500, cors);
  }
});
