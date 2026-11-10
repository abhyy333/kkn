// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_ID = "f5dcc382-8cc9-465a-b919-e58d6a688eea";
const ALLOWED_ORIGINS = new Set([
  "https://kkn-beta.vercel.app",
  "https://kkn.vercel.app",
  "https://kkn-space.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) return true;
  return /^https:\/\/kkn(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
    || /^https:\/\/kkn-space(-[a-z0-9-]+)?\.vercel\.app$/.test(origin);
}

function readKey(name: string, legacyName?: string): string | null {
  const raw = Deno.env.get(name);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const value = parsed?.default ?? Object.values(parsed ?? {})[0];
      if (typeof value === "string") return value;
    } catch {
      // Legacy single-key env fallback.
    }
  }
  return legacyName ? Deno.env.get(legacyName) ?? null : null;
}

function json(body: Record<string, unknown>, status: number, origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : "https://kkn-beta.vercel.app";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
      "Vary": "Origin",
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, origin);
    return new Response("ok", { status: 200, headers: {
      "Access-Control-Allow-Origin": origin || "https://kkn-beta.vercel.app",
      "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    }});
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403, origin);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = readKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = readKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("DPL review function environment is incomplete");
    return json({ error: "Server configuration is incomplete" }, 500, origin);
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
    const user = authData?.user;
    if (authError || !user?.id || !user.email || !user.email_confirmed_at) {
      return json({ error: "A verified signed-in account is required" }, 401, origin);
    }

    let payload: { report_id?: string; decision?: string; feedback?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON request body" }, 400, origin);
    }

    const reportId = payload.report_id?.trim();
    const decision = payload.decision?.trim();
    const feedback = payload.feedback?.trim() ?? "";
    if (!reportId || !decision) {
      return json({ error: "report_id and decision are required" }, 400, origin);
    }
    if (!["approved", "revision_requested", "rejected"].includes(decision)) {
      return json({ error: "Invalid review decision" }, 400, origin);
    }
    if ((decision === "revision_requested" || decision === "rejected") && !feedback) {
      return json({ error: "A review note is required for revision requests or rejection" }, 400, origin);
    }

    const [{ data: dplAccess, error: accessError }, { data: allowlist, error: allowlistError }] = await Promise.all([
      adminClient.from("member_access")
        .select("member_id")
        .eq("project_id", PROJECT_ID)
        .eq("user_id", user.id)
        .eq("role", "dpl")
        .eq("is_active", true)
        .maybeSingle(),
      adminClient.from("registered_emails")
        .select("id,member_id")
        .eq("project_id", PROJECT_ID)
        .eq("email", user.email.toLowerCase())
        .eq("is_enabled", true)
        .maybeSingle(),
    ]);

    if (accessError || allowlistError) {
      console.error("DPL authorization lookup failed", accessError?.code || allowlistError?.code);
      return json({ error: "Unable to verify supervisor authorization" }, 500, origin);
    }
    if (!dplAccess?.member_id || allowlist?.member_id !== dplAccess.member_id) {
      return json({ error: "Only the registered project DPL can review reports" }, 403, origin);
    }

    const { data: supervisor, error: supervisorError } = await adminClient
      .from("members")
      .select("id,full_name,member_category")
      .eq("id", dplAccess.member_id)
      .eq("project_id", PROJECT_ID)
      .maybeSingle();

    if (supervisorError || supervisor?.member_category !== "supervisor") {
      return json({ error: "This account is not registered as the project's DPL" }, 403, origin);
    }

    const [{ data: normalizedReport, error: normalizedError }, { data: workspaceRecord, error: workspaceError }] = await Promise.all([
      adminClient.from("report_submissions")
        .select("id,project_id,status")
        .eq("id", reportId)
        .eq("project_id", PROJECT_ID)
        .maybeSingle(),
      adminClient.from("kkn_workspace_records")
        .select("id,project_id,record_key,payload")
        .eq("project_id", PROJECT_ID)
        .eq("module_key", "reports")
        .eq("record_key", reportId)
        .maybeSingle(),
    ]);

    if (normalizedError || workspaceError) {
      console.error("Report lookup failed", normalizedError?.code || workspaceError?.code);
      return json({ error: "Unable to load the selected report" }, 500, origin);
    }
    if (!normalizedReport && !workspaceRecord) {
      return json({ error: "Report not found" }, 404, origin);
    }

    if (normalizedReport && normalizedReport.status !== "submitted") {
      return json({ error: "Only submitted normalized reports can be reviewed" }, 409, origin);
    }

    if (workspaceRecord) {
      const currentPayload = workspaceRecord.payload || {};
      const currentStatus = String(currentPayload.status || "");
      if (!["submitted", "resubmitted", "under_review"].includes(currentStatus)) {
        return json({ error: "Only submitted workspace reports can be reviewed" }, 409, origin);
      }
    }

    let normalizedReviewId: string | null = null;
    if (normalizedReport) {
      const { data: reviewId, error: reviewError } = await adminClient.rpc("dpl_review_report", {
        p_report_id: reportId,
        p_reviewer_id: user.id,
        p_decision: decision,
        p_feedback: feedback,
      });
      if (reviewError) {
        console.error("Normalized DPL report review failed", reviewError.code);
        return json({ error: "The report review could not be saved" }, 500, origin);
      }
      normalizedReviewId = reviewId ? String(reviewId) : null;
    }

    if (workspaceRecord) {
      const currentPayload = workspaceRecord.payload || {};
      const now = new Date().toISOString();
      const uiStatus = decision === "approved"
        ? "approved_by_dpl"
        : decision === "rejected" ? "rejected" : "revision_requested";
      const revisionHistory = Array.isArray(currentPayload.revisionHistory)
        ? currentPayload.revisionHistory
        : [];
      const nextPayload = {
        ...currentPayload,
        dplNotes: feedback,
        status: uiStatus,
        reviewedBy: supervisor.full_name || user.email,
        reviewTimestamp: now,
        revisionHistory: [
          ...revisionHistory,
          {
            version: revisionHistory.length + 1,
            status: uiStatus,
            comments: feedback,
            reviewedBy: supervisor.full_name || user.email,
            timestamp: now,
          },
        ],
      };

      const { error: workspaceUpdateError } = await adminClient
        .from("kkn_workspace_records")
        .update({ payload: nextPayload, updated_by: user.id, updated_at: now })
        .eq("id", workspaceRecord.id);

      if (workspaceUpdateError) {
        console.error("Workspace report review failed", workspaceUpdateError.code);
        return json({ error: "The workspace report review could not be saved" }, 500, origin);
      }
    }

    return json({
      success: true,
      review_id: normalizedReviewId,
      status: decision,
      workspace_record_updated: Boolean(workspaceRecord),
    }, 200, origin);
  } catch (error) {
    console.error("Unexpected DPL review error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Unexpected server error while reviewing the report" }, 500, origin);
  }
});
