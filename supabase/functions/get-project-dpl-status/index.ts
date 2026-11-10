// @ts-nocheck
// Returns the official supervisor card/status from the current KKN schema.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

const PROJECT_ID = 'f5dcc382-8cc9-465a-b919-e58d6a688eea';
const DPL_MEMBER_ID = 'c7bf53d4-1c27-424e-992a-7c7c0f98707a';

function reply(body: Record<string, unknown>, status: number, cors: Record<string,string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
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
    if (!url || !serviceKey || !anonKey) return reply({ error: 'Server configuration missing' }, 500, cors);

    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Authentication required' }, 401, cors);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession:false } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const caller = authData?.user;
    if (authError || !caller?.id || !caller.email || !caller.email_confirmed_at) return reply({ error: 'Sesi tidak valid atau email belum terverifikasi.' }, 401, cors);

    const admin = createClient(url, serviceKey, { auth: { persistSession:false, autoRefreshToken:false } });
    const { data: adminAccount, error: adminError } = await admin.from('admin_accounts')
      .select('role,is_active').eq('user_id',caller.id).maybeSingle();
    if (adminError) return reply({ error: 'Gagal memverifikasi hak akses.' }, 500, cors);
    const isSuperAdmin = adminAccount?.role === 'super_admin' && adminAccount?.is_active === true;

    if (!isSuperAdmin) {
      const { data: membership, error: membershipError } = await admin.from('member_access')
        .select('id').eq('project_id',PROJECT_ID).eq('user_id',caller.id).eq('is_active',true).maybeSingle();
      if (membershipError) return reply({ error: 'Gagal memverifikasi keanggotaan proyek.' }, 500, cors);
      if (!membership) return reply({ error: 'Akun ini tidak memiliki akses ke proyek KKN.' }, 403, cors);
    }

    const { data: member, error: memberError } = await admin.from('members')
      .select('id,project_id,full_name,position_title,division,study_program,faculty,institutional_id,member_category,status,auth_user_id')
      .eq('id',DPL_MEMBER_ID).eq('project_id',PROJECT_ID).eq('member_category','supervisor').maybeSingle();
    if (memberError) return reply({ error: 'Gagal membaca profil DPL.' }, 500, cors);
    if (!member) return reply({ error: 'Profil DPL tidak ditemukan.' }, 404, cors);

    const { data: registration, error: registrationError } = await admin.from('registered_emails')
      .select('email,is_enabled,activated_at,created_at').eq('project_id',PROJECT_ID).eq('member_id',DPL_MEMBER_ID).maybeSingle();
    if (registrationError) return reply({ error: 'Gagal membaca status registrasi DPL.' }, 500, cors);

    let authConfirmed = false;
    let linkedEmailMatches = false;
    if (member.auth_user_id) {
      const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(member.auth_user_id);
      if (authUserError || !authUserData?.user) return reply({ error: 'Tautan akun Auth DPL tidak dapat diverifikasi.' }, 409, cors);
      authConfirmed = Boolean(authUserData.user.email_confirmed_at);
      linkedEmailMatches = Boolean(registration?.email && authUserData.user.email?.toLowerCase() === registration.email.toLowerCase());
    }

    const { data: dplAccess, error: accessError } = member.auth_user_id
      ? await admin.from('member_access').select('user_id,role,is_active')
          .eq('project_id',PROJECT_ID).eq('member_id',DPL_MEMBER_ID).maybeSingle()
      : { data:null, error:null };
    if (accessError) return reply({ error: 'Gagal membaca role akses DPL.' }, 500, cors);

    const emailRegistered = Boolean(registration?.email && registration.is_enabled);
    const roleIsDpl = Boolean(dplAccess?.is_active && dplAccess.role === 'dpl' && dplAccess.user_id === member.auth_user_id);
    const isActive = Boolean(emailRegistered && member.auth_user_id && authConfirmed && linkedEmailMatches && member.status === 'active' && roleIsDpl);

    const activationStatus = !emailRegistered
      ? 'not_registered'
      : isActive
        ? 'activated'
        : member.auth_user_id && !authConfirmed
          ? 'confirmation_pending'
          : member.auth_user_id && (!linkedEmailMatches || !roleIsDpl)
            ? 'account_reconciliation_required'
            : 'pending_activation';

    const payload: Record<string, unknown> = {
      success:true,
      supervisor:{
        id:member.id,
        name:member.full_name,
        nip:member.institutional_id,
        title:member.position_title,
        position:member.position_title,
        faculty:member.faculty,
        study_program:member.study_program,
        division:member.division,
        category:member.member_category,
      },
      account:{
        email_registered:emailRegistered,
        activation_status:activationStatus,
        is_active:isActive,
        role:roleIsDpl?'dpl':null,
      },
    };

    if (isSuperAdmin) {
      payload.admin_private = {
        email:emailRegistered ? registration.email : null,
        registered_at:registration?.created_at ?? null,
        activated_at:registration?.activated_at ?? null,
        auth_user_id:member.auth_user_id,
      };
    }

    return reply(payload,200,cors);
  } catch (error) {
    console.error('get-project-dpl-status error',error instanceof Error?error.message:'unknown');
    return reply({ error:'Gagal memuat status DPL dari database.' },500,cors);
  }
});
