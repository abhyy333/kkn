import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_ID = "f5dcc382-8cc9-465a-b919-e58d6a688eea";
const ALLOWED_ORIGINS = new Set([
  "https://kkn-beta.vercel.app",
  "https://kkn.vercel.app",
  "https://kkn-space.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

const requestCounts = new Map<string, { count: number; resetAt: number }>();

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || entry.resetAt <= now) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 15) return false;
  entry.count += 1;
  return true;
}

function readSecretKey(): string | null {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const value = parsed?.default ?? Object.values(parsed ?? {})[0];
      if (typeof value === "string") return value;
    } catch {
      // Legacy environment variable fallback.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
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

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  if (!allowRequest(ip)) {
    return json({ success: false, eligible: false, status: "rate_limited", message: "Terlalu banyak percobaan. Coba kembali dalam satu menit." }, 429, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = readSecretKey();
  if (!supabaseUrl || !secretKey) {
    console.error("Activation checker missing server configuration");
    return json({ success: false, error: "Server configuration is incomplete" }, 500, headers);
  }

  let body: { email?: string; project_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Format permintaan tidak valid." }, 400, headers);
  }

  const email = normalizeEmail(body.email);
  if (!email) return json({ success: false, error: "Masukkan alamat email yang valid." }, 400, headers);
  if (body.project_id && body.project_id !== PROJECT_ID) {
    return json({ success: false, error: "Project KKN tidak dikenali." }, 404, headers);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: registration, error: registrationError } = await admin
      .from("registered_emails")
      .select("id,project_id,member_id,email,system_role,is_enabled,activated_at,created_at")
      .eq("project_id", PROJECT_ID)
      .eq("email", email)
      .maybeSingle();

    if (registrationError) {
      console.error("Registration lookup failed", registrationError.code);
      return json({ success: false, error: "Tidak dapat memeriksa registrasi email saat ini." }, 503, headers);
    }
    if (!registration || !registration.is_enabled) {
      return json({
        success: true,
        eligible: false,
        status: registration ? "disabled" : "not_registered",
        message: registration
          ? "Pendaftaran email ini sedang dinonaktifkan oleh Administrator KKN."
          : "Email ini belum didaftarkan oleh Administrator KKN.",
      }, 200, headers);
    }

    const { data: member, error: memberError } = await admin
      .from("members")
      .select("id,project_id,full_name,position_title,division,member_category,status,auth_user_id")
      .eq("id", registration.member_id)
      .eq("project_id", PROJECT_ID)
      .maybeSingle();

    if (memberError || !member) {
      console.error("Registered member lookup failed", memberError?.code);
      return json({ success: false, error: "Data anggota untuk email ini belum dapat diverifikasi." }, 503, headers);
    }
    if (member.status === "inactive") {
      return json({
        success: true,
        eligible: false,
        status: "disabled",
        message: "Status keanggotaan ini sudah tidak aktif. Hubungi Administrator KKN.",
      }, 200, headers);
    }

    const role = member.member_category === "supervisor"
      ? "dpl"
      : member.position_title === "Ketua" ? "ketua" : "member";
    const registrationData = {
      registration_id: registration.id,
      member_id: member.id,
      email: registration.email,
      name: member.full_name,
      position: member.position_title,
      division: member.division,
      role,
      system_role: registration.system_role ?? "user",
      registered_at: registration.created_at,
    };

    if (member.auth_user_id) {
      const { data: linkedUser, error: linkedUserError } = await admin.auth.admin.getUserById(member.auth_user_id);
      if (linkedUserError || !linkedUser?.user) {
        return json({
          success: true,
          eligible: false,
          status: "account_reconciliation_required",
          message: "Email terdaftar, tetapi tautan akun Auth perlu diperiksa Administrator.",
        }, 200, headers);
      }
      if ((linkedUser.user.email || "").trim().toLowerCase() !== email) {
        return json({
          success: true,
          eligible: false,
          status: "account_reconciliation_required",
          message: "Email registry dan akun Auth anggota belum cocok. Hubungi Administrator.",
        }, 200, headers);
      }
      return json({
        success: true,
        eligible: false,
        status: linkedUser.user.email_confirmed_at ? "already_active" : "confirmation_pending",
        message: linkedUser.user.email_confirmed_at
          ? "Akun untuk email ini sudah aktif. Silakan masuk melalui tab Masuk Akun."
          : "Akun sudah dibuat tetapi email belum dikonfirmasi. Periksa kotak masuk atau hubungi Administrator untuk mengirim ulang verifikasi.",
        data: registrationData,
      }, 200, headers);
    }

    // Never attempt a second sign-up when this address already has an unlinked Auth user.
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      console.error("Auth account lookup failed", usersError.message);
      return json({ success: false, error: "Tidak dapat memeriksa status akun Auth." }, 503, headers);
    }
    const orphanAuthUser = users.users.find((u) => (u.email || "").trim().toLowerCase() === email);
    if (orphanAuthUser) {
      return json({
        success: true,
        eligible: false,
        status: "account_reconciliation_required",
        message: "Email ini sudah memiliki akun Auth yang belum tertaut ke profil anggota. Jangan buat akun baru; hubungi Administrator untuk rekonsiliasi.",
        data: registrationData,
      }, 200, headers);
    }

    return json({
      success: true,
      eligible: true,
      status: "pending_activation",
      data: registrationData,
      message: `Identitas terverifikasi: ${member.full_name} (${member.position_title}).`,
    }, 200, headers);
  } catch (error) {
    console.error("Unexpected eligibility error", error instanceof Error ? error.message : "unknown");
    return json({ success: false, error: "Pemeriksaan email gagal. Silakan coba lagi." }, 503, headers);
  }
});
