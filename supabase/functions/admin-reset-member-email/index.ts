// @ts-nocheck
// Schema-aligned member email removal/replacement.
// The only identity source is public.members + public.registered_emails.
// No client-supplied email/name is used to locate a member.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const PROJECT_ID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';
const PRIMARY_SUPER_ADMIN = 'abhyy333@gmail.com';

function response(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);
  const cors = getCorsHeaders(origin);
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405, cors);
  if (origin && !isAllowedOrigin(origin)) return response({ error: 'Origin not allowed' }, 403, cors);

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authorization = req.headers.get('Authorization');
    if (!url || !serviceKey || !anonKey) return response({ error: 'Server configuration missing' }, 500, cors);
    if (!authorization?.startsWith('Bearer ')) return response({ error: 'Authentication required' }, 401, cors);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const caller = authData?.user;
    if (authError || !caller?.id || !caller.email || !caller.email_confirmed_at) {
      return response({ error: 'Sesi Super Admin tidak valid atau belum terverifikasi.' }, 401, cors);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: adminAccount, error: adminAccountError } = await admin
      .from('admin_accounts')
      .select('role,is_active')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (adminAccountError) return response({ error: 'Tidak dapat memverifikasi hak administrator.' }, 500, cors);
    if (caller.email.toLowerCase() !== PRIMARY_SUPER_ADMIN ||
        adminAccount?.role !== 'super_admin' ||
        adminAccount?.is_active !== true) {
      return response({ error: 'Hanya Super Admin aktif yang dapat mengelola email anggota.' }, 403, cors);
    }

    const body = await req.json();
    const memberId = String(body.member_id ?? '').trim();
    const action = body.action;
    const confirmName = String(body.confirm_member_name ?? '').trim();
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
    const projectId = body.project_id || PROJECT_ID;

    if (projectId !== PROJECT_ID) return response({ error: 'Project tidak valid.' }, 404, cors);
    if (!memberId || !['remove', 'replace'].includes(action)) {
      return response({ error: 'member_id dan action remove/replace wajib diisi.' }, 400, cors);
    }

    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id,project_id,full_name,position_title,division,member_category,status,auth_user_id')
      .eq('id', memberId)
      .eq('project_id', PROJECT_ID)
      .maybeSingle();

    if (memberError) {
      console.error('members lookup failed', memberError.code);
      return response({ error: 'Gagal membaca profil anggota. Tidak ada perubahan yang dilakukan.' }, 500, cors);
    }
    if (!member) return response({ error: 'Profil anggota tidak ditemukan di roster proyek ini.' }, 404, cors);
    if (confirmName.toLowerCase() !== member.full_name.trim().toLowerCase()) {
      return response({ error: 'Konfirmasi nama anggota tidak cocok.' }, 409, cors);
    }
    if (member.auth_user_id === caller.id) {
      return response({ error: 'Akun Super Admin yang sedang digunakan tidak dapat diubah.' }, 403, cors);
    }

    const { data: targetAdmin, error: targetAdminError } = member.auth_user_id
      ? await admin.from('admin_accounts').select('role,is_active').eq('user_id', member.auth_user_id).maybeSingle()
      : { data: null, error: null };
    if (targetAdminError) return response({ error: 'Gagal memeriksa perlindungan akun admin.' }, 500, cors);
    if (targetAdmin?.role === 'super_admin' && targetAdmin?.is_active) {
      return response({ error: 'Akun Super Admin tidak dapat dihapus atau diganti melalui menu anggota.' }, 403, cors);
    }

    const { data: registration, error: registrationError } = await admin
      .from('registered_emails')
      .select('id,email,system_role,is_enabled,activated_at')
      .eq('project_id', PROJECT_ID)
      .eq('member_id', memberId)
      .maybeSingle();
    if (registrationError) return response({ error: 'Gagal membaca penugasan email. Tidak ada perubahan yang dilakukan.' }, 500, cors);

    const currentEmail = registration?.email?.trim().toLowerCase() ?? null;
    const authUserId = member.auth_user_id ?? null;
    const newEmail = action === 'replace' ? String(body.new_email ?? '').trim().toLowerCase() : null;

    if (!registration && !authUserId) {
      return response({
        success: false,
        changed: false,
        code: 'NO_EMAIL_ASSIGNMENT',
        error: 'Anggota ini belum memiliki email login terdaftar. Tidak ada data yang diubah.',
      }, 409, cors);
    }

    if (action === 'replace') {
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return response({ error: 'Format email baru tidak valid.' }, 400, cors);
      }
      if (newEmail === currentEmail) {
        return response({ error: 'Email baru sama dengan email saat ini. Tidak ada perubahan.' }, 409, cors);
      }

      const { data: collision, error: collisionError } = await admin
        .from('registered_emails')
        .select('member_id')
        .eq('email', newEmail)
        .maybeSingle();
      if (collisionError) return response({ error: 'Gagal memeriksa keunikan email.' }, 500, cors);
      if (collision) return response({ error: 'Email tersebut sudah didaftarkan untuk anggota lain.' }, 409, cors);

      const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authUsersError) return response({ error: 'Gagal memeriksa akun Auth untuk email baru.' }, 500, cors);
      const collidingAuth = authUsers.users.find((u) => u.email?.toLowerCase() === newEmail);
      if (collidingAuth && collidingAuth.id !== authUserId) {
        return response({ error: 'Email baru sudah memiliki akun Supabase Auth lain.' }, 409, cors);
      }
    }

    // Retain historical attribution before revoking the old Auth identity.
    if (authUserId) {
      const snapshotOps = [
        admin.from('report_submissions').update({
          submitted_by_name_snapshot: member.full_name,
          submitted_by_email_snapshot: currentEmail,
        }).eq('submitted_by', authUserId),
        admin.from('report_reviews').update({
          reviewer_name_snapshot: member.full_name,
          reviewer_email_snapshot: currentEmail,
        }).eq('reviewer_id', authUserId),
        admin.from('report_versions').update({
          uploaded_by_name_snapshot: member.full_name,
          uploaded_by_email_snapshot: currentEmail,
        }).eq('uploaded_by', authUserId),
        admin.from('activity_logs').update({
          actor_name_snapshot: member.full_name,
          actor_email_snapshot: currentEmail,
        }).eq('actor_id', authUserId),
      ];
      const snapshotResults = await Promise.all(snapshotOps);
      const snapshotFailure = snapshotResults.find((x) => x.error);
      if (snapshotFailure) {
        console.error('history snapshot error', snapshotFailure.error.code);
        return response({ error: 'Riwayat aktivitas belum dapat diamankan. Akun tidak diubah.' }, 500, cors);
      }

      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(authUserId);
      if (deleteAuthError) {
        console.error('delete auth failed', deleteAuthError.message);
        return response({ error: 'Akun Auth gagal dicabut. Data anggota dan email tetap dipertahankan.' }, 409, cors);
      }
    }

    const { error: accessDeleteError } = await admin
      .from('member_access')
      .delete()
      .eq('project_id', PROJECT_ID)
      .eq('member_id', memberId);
    if (accessDeleteError) {
      console.error('member_access reset failed', accessDeleteError.code);
      return response({ error: 'Akun Auth sudah dicabut, tetapi akses lama belum dapat dibersihkan. Hubungi administrator untuk rekonsiliasi.' }, 500, cors);
    }

    if (action === 'remove') {
      if (registration) {
        const { error: deleteRegistrationError } = await admin
          .from('registered_emails')
          .delete()
          .eq('id', registration.id)
          .eq('project_id', PROJECT_ID);
        if (deleteRegistrationError) {
          console.error('registration delete failed', deleteRegistrationError.code);
          return response({ error: 'Akun Auth sudah dicabut, tetapi penugasan email belum terhapus. Hubungi administrator.' }, 500, cors);
        }
      }
    } else {
      const registrationPayload = {
        email: newEmail,
        is_enabled: true,
        registered_by: caller.id,
        activated_at: null,
        system_role: registration?.system_role ?? null,
      };
      const writeResult = registration
        ? await admin.from('registered_emails').update(registrationPayload).eq('id', registration.id).eq('project_id', PROJECT_ID)
        : await admin.from('registered_emails').insert({
            project_id: PROJECT_ID,
            member_id: memberId,
            ...registrationPayload,
          });
      if (writeResult.error) {
        console.error('replacement registration write failed', writeResult.error.code);
        return response({ error: 'Akun Auth lama sudah dicabut, tetapi email baru gagal disimpan. Hubungi administrator sebelum mencoba ulang.' }, 500, cors);
      }
    }

    const { error: memberUpdateError } = await admin
      .from('members')
      .update({ auth_user_id: null, status: 'registered', updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('project_id', PROJECT_ID);
    if (memberUpdateError) {
      console.error('member unlink failed', memberUpdateError.code);
      return response({ error: 'Akun/email sudah diperbarui, tetapi status profil perlu direkonsiliasi oleh administrator.' }, 500, cors);
    }

    const { error: historyError } = await admin.from('member_email_history').insert({
      project_id: PROJECT_ID,
      member_id: memberId,
      previous_email: currentEmail,
      new_email: action === 'replace' ? newEmail : null,
      action: action === 'replace' ? 'replaced' : 'removed',
      changed_by: caller.id,
      changed_by_name_snapshot: caller.email,
      reason,
    });
    if (historyError) {
      console.error('email history write failed', historyError.code);
      return response({ error: 'Perubahan email dilakukan, tetapi riwayat audit gagal dicatat. Hubungi administrator.' }, 500, cors);
    }

    const { error: activityError } = await admin.from('activity_logs').insert({
      project_id: PROJECT_ID,
      actor_id: caller.id,
      action: action === 'replace' ? 'member_email_replaced' : 'member_email_removed',
      entity_type: 'member',
      entity_id: memberId,
      summary: action === 'replace'
        ? 'Email login anggota diganti; akun Auth lama dicabut dan anggota harus aktivasi ulang.'
        : 'Email login anggota dihapus; profil anggota dipertahankan dan status kembali menunggu aktivasi.',
    });
    if (activityError) console.warn('activity log insert failed', activityError.code);

    return response({
      success: true,
      changed: true,
      action,
      member_id: memberId,
      member_name: member.full_name,
      previous_email: currentEmail,
      new_email: action === 'replace' ? newEmail : null,
      status: 'registered',
      profile_preserved: true,
      old_auth_account_removed: Boolean(authUserId),
    }, 200, cors);
  } catch (error) {
    console.error('admin-reset-member-email unexpected error', error instanceof Error ? error.message : 'unknown');
    return response({ error: 'Terjadi kesalahan server saat mengubah email anggota.' }, 500, cors);
  }
});
