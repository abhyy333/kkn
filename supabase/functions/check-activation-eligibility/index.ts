// @ts-nocheck
// Public activation eligibility lookup. Never exposes the registration directory.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const PROJECT_ID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit = 15, windowMs = 60_000) {
  const now = Date.now();
  const item = ipAttempts.get(ip);
  if (!item || item.resetAt <= now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (item.count >= limit) return false;
  item.count += 1;
  return true;
}

function reply(body: Record<string, unknown>, status: number, cors: Record<string,string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);
  const cors = getCorsHeaders(origin);
  if (req.method !== 'POST') return reply({ eligible: false, code: 'method_not_allowed', error: 'Method not allowed' }, 405, cors);
  if (origin && !isAllowedOrigin(origin)) return reply({ eligible: false, code: 'origin_not_allowed', error: 'Origin not allowed' }, 403, cors);

  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(ip)) return reply({
    eligible: false,
    code: 'rate_limit',
    error: 'Terlalu banyak percobaan. Coba kembali dalam satu menit.',
  }, 429, cors);

  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!url || !secret) return reply({
      eligible: false,
      code: 'server_configuration_error',
      error: 'Layanan aktivasi belum terkonfigurasi.',
    }, 500, cors);

    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ eligible: false, code: 'invalid_format', error: 'Masukkan alamat email yang valid.' }, 400, cors);
    }

    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: registration, error: registrationError } = await admin
      .from('registered_emails')
      .select('id,email,member_id,project_id,is_enabled,activated_at')
      .eq('project_id', PROJECT_ID)
      .eq('email', email)
      .maybeSingle();

    // A database error must never be interpreted as "not registered".
    if (registrationError) {
      console.error('activation registry lookup failed', registrationError.code);
      return reply({
        eligible: false,
        code: 'registry_unavailable',
        error: 'Database registrasi sedang tidak dapat diakses. Coba lagi atau hubungi Administrator.',
      }, 503, cors);
    }

    if (!registration || !registration.is_enabled || !registration.member_id) {
      return reply({
        eligible: false,
        code: 'not_registered',
        error: 'Email ini belum didaftarkan oleh Administrator KKN.',
      }, 200, cors);
    }

    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id,full_name,position_title,division,study_program,faculty,institutional_id,member_category,status,auth_user_id')
      .eq('id', registration.member_id)
      .eq('project_id', PROJECT_ID)
      .maybeSingle();

    if (memberError) {
      console.error('activation member lookup failed', memberError.code);
      return reply({
        eligible: false,
        code: 'member_lookup_unavailable',
        error: 'Data profil anggota belum dapat diverifikasi. Coba lagi.',
      }, 503, cors);
    }

    if (!member) return reply({
      eligible: false,
      code: 'member_profile_missing',
      error: 'Email terdaftar tetapi profil anggotanya tidak ditemukan. Hubungi Administrator.',
    }, 409, cors);

    if (member.status === 'inactive') return reply({
      eligible: false,
      code: 'account_disabled',
      error: 'Akun ini sedang dinonaktifkan oleh Administrator KKN.',
    }, 200, cors);

    if (member.auth_user_id) {
      const { data: linked, error: linkedError } = await admin.auth.admin.getUserById(member.auth_user_id);
      if (linkedError || !linked?.user) {
        console.error('linked auth user unavailable', linkedError?.message);
        return reply({
          eligible: false,
          code: 'account_reconciliation_required',
          error: 'Profil sudah memiliki tautan akun yang tidak dapat diverifikasi. Hubungi Administrator.',
        }, 409, cors);
      }

      if (linked.user.email?.trim().toLowerCase() !== email) {
        return reply({
          eligible: false,
          code: 'account_reconciliation_required',
          error: 'Email login tidak cocok dengan akun yang tertaut. Hubungi Administrator.',
        }, 409, cors);
      }

      return reply({
        eligible: false,
        code: linked.user.email_confirmed_at ? 'already_active' : 'confirmation_pending',
        error: linked.user.email_confirmed_at
          ? 'Akun untuk email ini sudah aktif. Silakan masuk.'
          : 'Akun sudah dibuat. Periksa email untuk menyelesaikan konfirmasi.',
      }, 200, cors);
    }

    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      console.error('Auth duplicate check failed', usersError.message);
      return reply({
        eligible: false,
        code: 'auth_lookup_unavailable',
        error: 'Status akun Auth belum dapat diperiksa. Coba lagi.',
      }, 503, cors);
    }

    const orphanAuth = users.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (orphanAuth) return reply({
      eligible: false,
      code: 'account_reconciliation_required',
      error: 'Email sudah memiliki akun Auth yang belum tertaut ke profil anggota. Hubungi Administrator.',
    }, 409, cors);

    const role = member.member_category === 'supervisor'
      ? 'dpl'
      : member.position_title === 'Ketua'
        ? 'chair'
        : member.position_title === 'Sekretaris'
          ? 'secretary'
          : member.position_title === 'Bendahara'
            ? 'treasurer'
            : 'member';

    return reply({
      eligible: true,
      code: 'pending_activation',
      data: {
        email: registration.email,
        member_id: member.id,
        name: member.full_name,
        position: member.position_title,
        division: member.division,
        study_program: member.study_program,
        faculty: member.faculty,
        institutional_id: member.institutional_id,
        member_category: member.member_category,
        role,
        system_role: member.member_category === 'supervisor' ? 'dpl' : 'user',
      },
      message: 'Email ditemukan pada daftar registrasi resmi Admin KKN.',
    }, 200, cors);
  } catch (error) {
    console.error('activation eligibility unexpected error', error instanceof Error ? error.message : 'unknown');
    return reply({
      eligible: false,
      code: 'server_error',
      error: 'Pemeriksaan email gagal. Silakan coba lagi.',
    }, 500, cors);
  }
});
