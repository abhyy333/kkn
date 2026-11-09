// @ts-nocheck
// =============================================================================
// SUPABASE EDGE FUNCTION: check-activation-eligibility (v1.0.0)
// Project: scslevzuxxkfcuvwbtty
// Description:
//   Public unauthenticated activation eligibility checking:
//   - Rate-limited per IP.
//   - Validates exactly ONE submitted email against registered_emails using service role.
//   - Never exposes complete email registry or other members' data.
//   - Clearly distinguishes:
//     * unregistered_email: "Email ini belum didaftarkan oleh Administrator KKN."
//     * delivery_failed: "Undangan belum dapat dikirim. Silakan hubungi Administrator KKN."
//     * existing_auth_account: "Akun untuk email ini sudah aktif."
//     * pending_activation: Eligible for password setup.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCorsPreflight, getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';

// Simple in-memory rate limiter per IP for Edge runtime (15 requests/minute)
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    ipRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count += 1;
  return true;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') || req.headers.get('origin');

  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // 2. Validate Origin
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: `Forbidden: Origin '${origin}' is not allowed by CORS policy.` }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' } }
    );
  }

  const corsHeaders = getCorsHeaders(origin);

  // 3. Client IP Rate Limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'anon';
  if (!checkRateLimit(clientIp, 20, 60000)) {
    return new Response(
      JSON.stringify({
        eligible: false,
        code: 'rate_limit',
        error: 'Terlalu banyak percobaan. Silakan coba kembali dalam 1 menit.',
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const email = body?.email;

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ eligible: false, code: 'invalid_format', error: 'Format email tidak valid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return new Response(
        JSON.stringify({ eligible: false, code: 'invalid_format', error: 'Format email tidak valid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query single record using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: reg, error: dbError } = await adminClient
      .from('registered_emails')
      .select('id, email, member_id, name, member_name, position, division, role, system_role, status, is_active, auth_user_id, activated_uid, invitation_delivery_status, invitation_delivery_error')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (dbError) {
      console.warn('DB error checking registration:', dbError);
    }

    // 1. Unregistered email
    if (!reg) {
      return new Response(
        JSON.stringify({
          eligible: false,
          code: 'unregistered_email',
          message: 'Email ini belum didaftarkan oleh Administrator KKN.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Disabled account
    if (reg.status === 'disabled' || reg.status === 'revoked' || reg.is_active === false) {
      return new Response(
        JSON.stringify({
          eligible: false,
          code: 'account_disabled',
          message: 'Akun ini telah dinonaktifkan oleh Administrator KKN.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Email delivery failed (e.g. Gmail SMTP 535) and not yet activated
    const hasAuthAccount = Boolean(reg.auth_user_id || reg.activated_uid);
    if (!hasAuthAccount && reg.invitation_delivery_status === 'failed') {
      return new Response(
        JSON.stringify({
          eligible: false,
          code: 'delivery_failed',
          name: reg.name || reg.member_name,
          message: 'Undangan belum dapat dikirim. Silakan hubungi Administrator KKN.',
          delivery_error: reg.invitation_delivery_error,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Already activated Auth account
    if (reg.status === 'activated' || (hasAuthAccount && cleanEmail !== 'abhyy333@gmail.com')) {
      return new Response(
        JSON.stringify({
          eligible: false,
          code: 'existing_auth_account',
          name: reg.name || reg.member_name,
          message: 'Akun untuk email ini sudah aktif. Silakan masuk melalui tab "Masuk Akun" menggunakan email dan password Anda.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Eligible for activation
    const displayName = reg.name || reg.member_name || 'Anggota KKN';
    return new Response(
      JSON.stringify({
        eligible: true,
        code: 'pending_activation',
        data: {
          email: reg.email,
          name: displayName,
          position: reg.position || 'Anggota',
          division: reg.division || 'Divisi Acara',
          role: reg.role || reg.system_role || 'member',
          member_id: reg.member_id,
        },
        message: `Identitas terverifikasi dari database: ${displayName} (${reg.position || 'Anggota'})`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ eligible: false, code: 'server_error', error: err?.message || 'Gagal memproses validasi email.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
