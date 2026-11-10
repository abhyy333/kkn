import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_ID = "f5dcc382-8cc9-465a-b919-e58d6a688eea";
const ALLOWED_ORIGINS = new Set([
  "https://kkn-beta.vercel.app",
  "https://kkn.vercel.app",
  "https://kkn-space.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function readKey(envName: string, legacyName?: string): string | null {
  const raw = Deno.env.get(envName);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const value = parsed?.default ?? Object.values(parsed ?? {})[0];
      if (typeof value === "string") return value;
    } catch {
      // Legacy environment variable fallback.
    }
  }
  return legacyName ? Deno.env.get(legacyName) ?? null : null;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) return true;
  return (
    /^https:\/\/kkn(-[a-z0-9-]+)?\.vercel\.app$/.test(origin) ||
    /^https:\/\/kkn(-[a-z0-9-]+)-abhyy333s-projects\.vercel\.app$/.test(origin) ||
    /^https:\/\/kkn(-[a-z0-9-]+)-abhyy333\.vercel\.app$/.test(origin) ||
    /^https:\/\/kkn-space(-[a-z0-9-]+)?\.vercel\.app$/.test(origin) ||
    /^https:\/\/kkn-space(-[a-z0-9-]+)-abhyy333s-projects\.vercel\.app$/.test(origin) ||
    /^https:\/\/kkn-space(-[a-z0-9-]+)-abhyy333\.vercel\.app$/.test(origin)
  );
}

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : "https://kkn-beta.vercel.app";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);
    return new Response("ok", { status: 200, headers });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Sesi Admin diperlukan. Silakan login ulang." }, 401, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = readKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = readKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("Member email registration missing server configuration");
    return json({ error: "Server configuration is incomplete" }, 500, headers);
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    const caller = authData?.user;
    if (authError || !caller?.id || !caller.email || !caller.email_confirmed_at) {
      return json({ error: "Sesi Admin tidak valid atau email belum diverifikasi." }, 401, headers);
    }

    const { data: adminAccount, error: adminAccountError } = await admin
      .from("admin_accounts")
      .select("role,is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (adminAccountError || !adminAccount?.is_active || adminAccount.role !== "super_admin") {
      return json({ error: "Hanya Super Admin aktif yang boleh mendaftarkan email anggota/DPL." }, 403, headers);
    }

    const { data: callerRegistration, error: callerRegistrationError } = await admin
      .from("registered_emails")
      .select("id")
      .eq("project_id", PROJECT_ID)
      .eq("email", caller.email.trim().toLowerCase())
      .eq("system_role", "super_admin")
      .eq("is_enabled", true)
      .maybeSingle();

    if (callerRegistrationError || !callerRegistration) {
      return json({ error: "Email Super Admin belum terdaftar aktif pada registry KKN SPACE." }, 403, headers);
    }

    let payload: { project_id?: string; member_id?: string; email?: string; confirm_member_name?: string; reason?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Format request tidak valid." }, 400, headers);
    }

    if (payload.project_id && payload.project_id !== PROJECT_ID) {
      return json({ error: "Project KKN tidak dikenali." }, 404, headers);
    }
    const memberId = typeof payload.member_id === "string" ? payload.member_id.trim() : "";
    const email = normalizeEmail(payload.email);
    const confirmedName = typeof payload.confirm_member_name === "string" ? payload.confirm_member_name.trim() : "";
    const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 500) : "Pendaftaran email oleh Super Admin";

    if (!memberId || !email || !confirmedName) {
      return json({ error: "ID anggota, email, dan konfirmasi nama wajib diisi." }, 400, headers);
    }

    const { data: member, error: memberError } = await admin
      .from("members")
      .select("id,project_id,full_name,position_title,division,member_category,status,auth_user_id")
      .eq("id", memberId)
      .eq("project_id", PROJECT_ID)
      .maybeSingle();

    if (memberError || !member) {
      return json({ error: "Profil anggota tidak ditemukan. Muat ulang daftar anggota Admin Console." }, 404, headers);
    }
    if (confirmedName.toLowerCase() !== member.full_name.trim().toLowerCase()) {
      return json({ error: `Konfirmasi nama tidak cocok. Masukkan "${member.full_name}" persis.` }, 409, headers);
    }
    if (member.auth_user_id) {
      return json({
        error: "Anggota ini sudah terhubung ke akun Auth. Gunakan tindakan Ganti Email untuk mengganti kredensial login.",
        code: "ACCOUNT_ALREADY_LINKED",
      }, 409, headers);
    }
    if (member.status === "inactive") {
      return json({ error: "Anggota tidak aktif dan tidak dapat didaftarkan untuk login." }, 409, headers);
    }

    const { data: currentRows, error: currentError } = await admin
      .from("registered_emails")
      .select("id,email,is_enabled")
      .eq("project_id", PROJECT_ID)
      .eq("member_id", memberId);

    if (currentError) {
      console.error("Existing member registration lookup failed", currentError.code);
      return json({ error: "Tidak dapat memeriksa email anggota saat ini." }, 500, headers);
    }
    if ((currentRows?.length ?? 0) > 1) {
      return json({ error: "Anggota ini memiliki lebih dari satu email login. Selesaikan data ganda terlebih dahulu." }, 409, headers);
    }

    const current = currentRows?.[0] ?? null;
    if (current && current.email.toLowerCase() !== email) {
      return json({
        error: "Anggota sudah memiliki email login berbeda. Gunakan tindakan Ganti Email agar akun lama dicabut dengan aman.",
        code: "EMAIL_ALREADY_ASSIGNED",
      }, 409, headers);
    }

    const { data: conflict, error: conflictError } = await admin
      .from("registered_emails")
      .select("member_id")
      .eq("project_id", PROJECT_ID)
      .eq("email", email)
      .maybeSingle();

    if (conflictError) {
      console.error("Email uniqueness lookup failed", conflictError.code);
      return json({ error: "Tidak dapat memeriksa keunikan email saat ini." }, 500, headers);
    }
    if (conflict && conflict.member_id !== memberId) {
      return json({ error: "Email sudah digunakan oleh anggota lain." }, 409, headers);
    }

    const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) {
      console.error("Auth user uniqueness lookup failed", authUsersError.message);
      return json({ error: "Tidak dapat memeriksa akun Auth. Coba lagi." }, 503, headers);
    }
    const orphanAuth = authUsers.users.find((item) => (item.email || "").trim().toLowerCase() === email);
    if (orphanAuth) {
      return json({
        error: "Email sudah memiliki akun Auth yang belum tertaut ke anggota. Jangan buat akun duplikat; selesaikan rekonsiliasi akun terlebih dahulu.",
        code: "AUTH_ACCOUNT_EXISTS",
      }, 409, headers);
    }

    const record = {
      project_id: PROJECT_ID,
      member_id: memberId,
      email,
      system_role: null,
      is_enabled: true,
      registered_by: caller.id,
      activated_at: null,
    };

    let saved;
    if (current?.id) {
      const { data, error } = await admin
        .from("registered_emails")
        .update(record)
        .eq("id", current.id)
        .select("id,email,member_id,project_id,is_enabled,created_at")
        .single();
      if (error) {
        console.error("Registration update failed", error.code);
        return json({ error: "Gagal menyimpan pendaftaran email ke database." }, 500, headers);
      }
      saved = data;
    } else {
      const { data, error } = await admin
        .from("registered_emails")
        .insert(record)
        .select("id,email,member_id,project_id,is_enabled,created_at")
        .single();
      if (error) {
        console.error("Registration insert failed", error.code);
        return json({ error: error.code === "23505" ? "Email sudah digunakan oleh anggota lain." : "Gagal menyimpan pendaftaran email ke database." }, error.code === "23505" ? 409 : 500, headers);
      }
      saved = data;
    }

    const { error: historyError } = await admin.from("member_email_history").insert({
      project_id: PROJECT_ID,
      member_id: memberId,
      previous_email: current?.email ?? null,
      new_email: email,
      action: "registered",
      changed_by: caller.id,
      changed_by_name_snapshot: caller.email,
      reason,
    });
    if (historyError) {
      console.error("Email registry saved but history insert failed", historyError.code);
    }

    const { error: activityError } = await admin.from("activity_logs").insert({
      project_id: PROJECT_ID,
      actor_id: caller.id,
      action: "member_email_registered",
      entity_type: "member",
      entity_id: memberId,
      summary: `Email login ${email} didaftarkan untuk ${member.full_name}. Anggota dapat membuat password sendiri melalui halaman aktivasi.`,
      actor_name_snapshot: caller.email,
      actor_email_snapshot: caller.email,
    });
    if (activityError) console.error("Registration activity log failed", activityError.code);

    const role = member.member_category === "supervisor"
      ? "dpl"
      : member.position_title === "Ketua" ? "ketua" : "member";

    return json({
      success: true,
      registration_id: saved.id,
      email,
      member_id: memberId,
      name: member.full_name,
      position: member.position_title,
      division: member.division,
      role,
      status: "pending_activation",
      registered_at: saved.created_at,
      invitation_delivery_status: "not_required",
      message: `Email ${email} berhasil disimpan pada registry resmi KKN SPACE. Anggota dapat mengaktifkan akun dengan password sendiri.`,
    }, 200, headers);
  } catch (error) {
    console.error("Unexpected registration error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Terjadi kesalahan saat menyimpan registrasi email." }, 500, headers);
  }
});
