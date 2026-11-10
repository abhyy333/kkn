import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://kkn-beta.vercel.app",
  "http://localhost:5173",
]);

const PROJECT_ID = "f5dcc382-8cc9-465a-b919-e58d6a688eea";
const DPL_MEMBER_ID = "c7bf53d4-1c27-424e-992a-7c7c0f98707a";

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

function cors(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : "https://kkn-beta.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function readKey(envName: string, legacyName?: string): string | null {
  const raw = Deno.env.get(envName);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const value = parsed?.default ?? Object.values(parsed ?? {})[0];
      if (typeof value === "string") return value;
    } catch {
      // Fall through to legacy environment variable.
    }
  }
  return legacyName ? Deno.env.get(legacyName) ?? null : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);
    return new Response("ok", { status: 200, headers });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, headers);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = readKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = readKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("DPL status endpoint configuration is incomplete");
    return json({ error: "Server configuration is incomplete" }, 500, headers);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const caller = authData?.user;

    if (authError || !caller?.id || !caller.email || !caller.email_confirmed_at) {
      return json({ error: "A verified signed-in account is required" }, 401, headers);
    }

    let requestedProjectId = PROJECT_ID;
    try {
      const body = await req.json();
      if (body?.project_id && body.project_id !== PROJECT_ID) {
        return json({ error: "Project not found or access denied" }, 404, headers);
      }
      if (body?.project_id) requestedProjectId = body.project_id;
    } catch {
      // Empty body is allowed; use the fixed KKN SPACE project.
    }

    const { data: callerMembership, error: membershipError } = await adminClient
      .from("member_access")
      .select("member_id,role,is_active")
      .eq("project_id", requestedProjectId)
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError) {
      console.error("DPL status membership lookup failed", membershipError.code);
      return json({ error: "Unable to verify project access" }, 500, headers);
    }

    const { data: adminAccount, error: adminError } = await adminClient
      .from("admin_accounts")
      .select("role,is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (adminError) {
      console.error("DPL status admin lookup failed", adminError.code);
      return json({ error: "Unable to verify administrator access" }, 500, headers);
    }

    const isSuperAdmin = Boolean(adminAccount?.is_active && adminAccount.role === "super_admin");

    if (!callerMembership && !isSuperAdmin) {
      return json({ error: "You do not have access to this KKN project" }, 403, headers);
    }

    const { data: supervisor, error: supervisorError } = await adminClient
      .from("members")
      .select("id,project_id,full_name,position_title,division,study_program,institutional_id,member_category,status,auth_user_id")
      .eq("id", DPL_MEMBER_ID)
      .eq("project_id", requestedProjectId)
      .eq("member_category", "supervisor")
      .maybeSingle();

    if (supervisorError) {
      console.error("DPL profile lookup failed", supervisorError.code);
      return json({ error: "Unable to load supervisor profile" }, 500, headers);
    }

    if (!supervisor) {
      return json({ error: "Supervisor profile not found" }, 404, headers);
    }

    const { data: registration, error: registrationError } = await adminClient
      .from("registered_emails")
      .select("email,is_enabled,activated_at")
      .eq("project_id", requestedProjectId)
      .eq("member_id", supervisor.id)
      .maybeSingle();

    if (registrationError) {
      console.error("DPL registration lookup failed", registrationError.code);
      return json({ error: "Unable to load DPL registration status" }, 500, headers);
    }

    const { data: dplAccess, error: dplAccessError } = await adminClient
      .from("member_access")
      .select("role,is_active,user_id")
      .eq("project_id", requestedProjectId)
      .eq("member_id", supervisor.id)
      .maybeSingle();

    if (dplAccessError) {
      console.error("DPL role lookup failed", dplAccessError.code);
      return json({ error: "Unable to load DPL role status" }, 500, headers);
    }

    let authConfirmed = false;
    if (supervisor.auth_user_id) {
      const { data: targetAuth, error: targetAuthError } =
        await adminClient.auth.admin.getUserById(supervisor.auth_user_id);

      if (!targetAuthError && targetAuth?.user) {
        authConfirmed = Boolean(targetAuth.user.email_confirmed_at);
      }
    }

    const hasRegistration = Boolean(registration?.email);
    const emailRegistered = Boolean(hasRegistration && registration?.is_enabled);
    const roleIsDpl = Boolean(dplAccess?.role === "dpl" && dplAccess.is_active && dplAccess.user_id === supervisor.auth_user_id);
    const isActive = Boolean(
      emailRegistered &&
      registration?.activated_at &&
      supervisor.status === "active" &&
      supervisor.auth_user_id &&
      authConfirmed &&
      roleIsDpl
    );

    const accountStatus = !hasRegistration
      ? "not_registered"
      : !registration?.is_enabled
        ? "disabled"
        : isActive
          ? "active"
          : "pending_activation";

    return json({
      success: true,
      project_id: requestedProjectId,
      supervisor: {
        id: supervisor.id,
        full_name: supervisor.full_name,
        position_title: supervisor.position_title,
        division: supervisor.division,
        study_program: supervisor.study_program,
        institutional_id: supervisor.institutional_id,
        member_category: supervisor.member_category,
      },
      account: {
        email_registered: emailRegistered,
        activation_status: accountStatus,
        is_active: isActive,
        role: roleIsDpl ? "dpl" : null,
      },
      // The email address is returned only to an active super administrator.
      ...(isSuperAdmin ? { admin_private: { email: registration?.email ?? null } } : {}),
    }, 200, headers);
  } catch (error) {
    console.error("Unexpected DPL status error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to retrieve DPL status" }, 500, headers);
  }
});
