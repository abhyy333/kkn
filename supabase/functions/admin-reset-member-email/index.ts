import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://kkn-beta.vercel.app",
  "http://localhost:5173",
]);

function makeHeaders(origin: string | null) {
  const selected = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://kkn-beta.vercel.app";
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function respond(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function getDefaultKey(envName: string, legacyName?: string): string | null {
  const raw = Deno.env.get(envName);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const key = parsed?.default ?? Object.values(parsed ?? {})[0];
      if (typeof key === "string") return key;
    } catch {
      // Use legacy key fallback.
    }
  }
  return legacyName ? Deno.env.get(legacyName) ?? null : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = makeHeaders(origin);

  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Origin not allowed" }, 403, headers);
    return new Response("ok", { status: 200, headers });
  }
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, headers);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Origin not allowed" }, 403, headers);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Authentication required" }, 401, headers);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("Required function environment is missing");
    return respond({ error: "Server configuration is incomplete" }, 500, headers);
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
      return respond({ error: "A verified administrator session is required" }, 401, headers);
    }

    const { data: adminAccount, error: adminError } = await adminClient
      .from("admin_accounts")
      .select("role,is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (adminError || !adminAccount?.is_active || adminAccount.role !== "super_admin") {
      return respond({ error: "Only an active super administrator can reset member email access" }, 403, headers);
    }

    const { data: callerRegistration, error: callerRegistrationError } = await adminClient
      .from("registered_emails")
      .select("id")
      .eq("email", caller.email.toLowerCase())
      .eq("system_role", "super_admin")
      .eq("is_enabled", true)
      .maybeSingle();

    if (callerRegistrationError || !callerRegistration) {
      return respond({ error: "Administrator email is not enabled in the registration registry" }, 403, headers);
    }

    let payload: {
      project_id?: string;
      member_id?: string;
      action?: "remove" | "replace";
      new_email?: string;
      reason?: string;
      confirm_member_name?: string;
    };
    try {
      payload = await req.json();
    } catch {
      return respond({ error: "Invalid JSON request body" }, 400, headers);
    }

    const projectId = payload.project_id?.trim();
    const memberId = payload.member_id?.trim();
    const action = payload.action;
    const newEmail = action === "replace" ? normalizeEmail(payload.new_email) : null;
    const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 500) : null;

    if (!projectId || !memberId || !["remove", "replace"].includes(action ?? "")) {
      return respond({ error: "project_id, member_id, and a valid action are required" }, 400, headers);
    }
    if (action === "replace" && !newEmail) {
      return respond({ error: "Enter a valid replacement email address" }, 400, headers);
    }

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id,project_id,full_name,member_category,status,auth_user_id")
      .eq("id", memberId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (memberError || !member) return respond({ error: "Member profile not found" }, 404, headers);
    if (payload.confirm_member_name !== member.full_name) {
      return respond({ error: "Member name confirmation does not match" }, 409, headers);
    }
    if (member.auth_user_id && member.auth_user_id === caller.id) {
      return respond({ error: "You cannot reset your own super administrator account here" }, 403, headers);
    }

    const { data: targetAdmin, error: targetAdminError } = await adminClient
      .from("admin_accounts")
      .select("role,is_active")
      .eq("user_id", member.auth_user_id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (targetAdminError) return respond({ error: "Unable to verify target account privileges" }, 500, headers);
    if (targetAdmin?.is_active && targetAdmin.role === "super_admin") {
      return respond({ error: "A super administrator account cannot be reset through member email management" }, 403, headers);
    }

    const { data: registrations, error: registrationError } = await adminClient
      .from("registered_emails")
      .select("id,email,system_role,is_enabled")
      .eq("project_id", projectId)
      .eq("member_id", memberId);

    if (registrationError) return respond({ error: "Unable to load member email registration" }, 500, headers);
    if ((registrations?.length ?? 0) > 1) {
      return respond({ error: "This member has multiple email assignments. Resolve duplicate assignments first." }, 409, headers);
    }

    const currentRegistration = registrations?.[0] ?? null;
    let authUserEmail: string | null = null;

    if (member.auth_user_id) {
      const { data: targetAuth, error: targetAuthError } = await adminClient.auth.admin.getUserById(member.auth_user_id);
      if (targetAuthError || !targetAuth?.user) {
        return respond({ error: "Linked Auth account could not be found. Refresh member data before retrying." }, 409, headers);
      }
      authUserEmail = targetAuth.user.email ?? null;
    }

    // Prevent the false-success state seen when a stale UI sends a member with no email/account.
    if (!currentRegistration && !member.auth_user_id) {
      return respond({
        error: "Anggota ini belum memiliki email terdaftar atau akun login. Tidak ada data yang dihapus.",
        code: "NO_EMAIL_ASSIGNMENT",
        changed: false,
      }, 409, headers);
    }

    const previousEmail = currentRegistration?.email ?? authUserEmail;

    if (action === "replace" && newEmail) {
      if (previousEmail?.toLowerCase() === newEmail) {
        return respond({ error: "Email baru sama dengan email saat ini. Tidak ada perubahan yang diperlukan." }, 409, headers);
      }

      const { data: duplicate, error: duplicateError } = await adminClient
        .from("registered_emails")
        .select("member_id")
        .eq("email", newEmail)
        .neq("member_id", memberId)
        .maybeSingle();

      if (duplicateError) return respond({ error: "Unable to verify email uniqueness" }, 500, headers);
      if (duplicate) return respond({ error: "Email is already assigned to another member" }, 409, headers);
    }

    if (member.auth_user_id) {
      const nameSnapshot = member.full_name;
      const emailSnapshot = authUserEmail ?? previousEmail;

      const snapshots = [
        await adminClient.from("report_submissions")
          .update({ submitted_by_name_snapshot: nameSnapshot, submitted_by_email_snapshot: emailSnapshot })
          .eq("submitted_by", member.auth_user_id),
        await adminClient.from("report_reviews")
          .update({ reviewer_name_snapshot: nameSnapshot, reviewer_email_snapshot: emailSnapshot })
          .eq("reviewer_id", member.auth_user_id),
        await adminClient.from("report_versions")
          .update({ uploaded_by_name_snapshot: nameSnapshot, uploaded_by_email_snapshot: emailSnapshot })
          .eq("uploaded_by", member.auth_user_id),
        await adminClient.from("activity_logs")
          .update({ actor_name_snapshot: nameSnapshot, actor_email_snapshot: emailSnapshot })
          .eq("actor_id", member.auth_user_id),
      ];

      const snapshotError = snapshots.find((item) => item.error)?.error;
      if (snapshotError) {
        console.error("Unable to archive account attribution", snapshotError.code);
        return respond({ error: "Could not preserve activity history; no account changes were made" }, 500, headers);
      }

      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(member.auth_user_id);
      if (deleteAuthError) {
        console.error("Auth account removal failed", deleteAuthError.message);
        return respond({
          error: "Auth account could not be removed. The member profile and email assignment were left unchanged. Check whether the account owns Storage files.",
        }, 409, headers);
      }
    }

    const { error: detachError } = await adminClient
      .from("members")
      .update({ auth_user_id: null, status: "registered", updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("project_id", projectId);

    if (detachError) {
      console.error("Unable to reset member account state", detachError.code);
      return respond({ error: "Account removed, but member activation state requires administrative reconciliation" }, 500, headers);
    }

    if (action === "remove") {
      const { error: deleteRegistrationError } = await adminClient
        .from("registered_emails")
        .delete()
        .eq("project_id", projectId)
        .eq("member_id", memberId);

      if (deleteRegistrationError) {
        console.error("Unable to remove member email", deleteRegistrationError.code);
        return respond({ error: "Account reset, but email assignment removal failed" }, 500, headers);
      }
    } else if (action === "replace" && newEmail) {
      if (currentRegistration) {
        const { error: updateEmailError } = await adminClient
          .from("registered_emails")
          .update({
            email: newEmail,
            is_enabled: true,
            registered_by: caller.id,
            activated_at: null,
          })
          .eq("id", currentRegistration.id);

        if (updateEmailError) {
          console.error("Unable to replace registered email", updateEmailError.code);
          return respond({ error: "Account reset, but replacement email assignment failed" }, 500, headers);
        }
      } else {
        const { error: insertEmailError } = await adminClient
          .from("registered_emails")
          .insert({
            project_id: projectId,
            member_id: memberId,
            email: newEmail,
            system_role: null,
            is_enabled: true,
            registered_by: caller.id,
            activated_at: null,
          });

        if (insertEmailError) {
          console.error("Unable to assign replacement email", insertEmailError.code);
          return respond({ error: "Account reset, but replacement email assignment failed" }, 500, headers);
        }
      }
    }

    const { error: historyError } = await adminClient.from("member_email_history").insert({
      project_id: projectId,
      member_id: memberId,
      previous_email: previousEmail,
      new_email: action === "replace" ? newEmail : null,
      action: action === "replace" ? "replaced" : "removed",
      changed_by: caller.id,
      changed_by_name_snapshot: caller.email,
      reason,
    });

    if (historyError) {
      console.error("Unable to record email history", historyError.code);
      return respond({ error: "Email reset completed, but audit history could not be recorded. Contact administrator." }, 500, headers);
    }

    const { error: activityError } = await adminClient.from("activity_logs").insert({
      project_id: projectId,
      actor_id: caller.id,
      action: action === "replace" ? "member_email_replaced" : "member_email_removed",
      entity_type: "member",
      entity_id: memberId,
      summary: action === "replace"
        ? "Email login anggota diganti; akun lama dicabut dan aktivasi harus diulang."
        : "Email login anggota dihapus; profil dipertahankan dan status kembali menunggu aktivasi.",
    });
    if (activityError) console.error("Unable to write activity log", activityError.code);

    return respond({
      success: true,
      changed: true,
      action,
      member_id: memberId,
      member_name: member.full_name,
      previous_email: previousEmail,
      new_email: action === "replace" ? newEmail : null,
      status: "registered",
      profile_preserved: true,
      old_auth_account_removed: Boolean(member.auth_user_id),
    }, 200, headers);
  } catch (error) {
    console.error("Unexpected member email reset error", error instanceof Error ? error.message : "unknown");
    return respond({ error: "Unexpected server error while resetting member email" }, 500, headers);
  }
});
