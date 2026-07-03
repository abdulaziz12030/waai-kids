import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AccountType = "family" | "teacher" | "incomplete";
type AccountStatus = "active" | "suspended" | "deleted";
type PlatformAdminRole = "none" | "viewer" | "support_admin" | "operations_admin" | "super_admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !secretKey) return null;

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function response(errorOrBody: string | Record<string, unknown>, status = 200, details?: string) {
  const body = typeof errorOrBody === "string"
    ? { error: errorOrBody, details }
    : errorOrBody;
  return NextResponse.json(body, { status });
}

function isAccountType(value: string): value is AccountType {
  return ["family", "teacher", "incomplete"].includes(value);
}

function isAccountStatus(value: string): value is AccountStatus {
  return ["active", "suspended", "deleted"].includes(value);
}

function isPlatformAdminRole(value: string): value is PlatformAdminRole {
  return ["none", "viewer", "support_admin", "operations_admin", "super_admin"].includes(value);
}

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();
  if (!adminClient) return response("SERVER_ADMIN_NOT_CONFIGURED", 503);

  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return response("UNAUTHORIZED", 401);

  const { data: requester, error: requesterError } = await adminClient.auth.getUser(accessToken);
  if (requesterError || !requester.user) return response("UNAUTHORIZED", 401);

  const { data: adminRole, error: adminRoleError } = await adminClient
    .from("platform_admins")
    .select("role,is_active")
    .eq("user_id", requester.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminRoleError || !adminRole || adminRole.role !== "super_admin") {
    return response("SUPER_ADMIN_REQUIRED", 403);
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  if (action !== "update_account") return response("UNKNOWN_ACTION", 400);

  const userId = String(body.userId || "").trim();
  const confirmationEmail = String(body.confirmationEmail || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const organizationName = String(body.organizationName || "").trim();
  const accountType = String(body.accountType || "").trim();
  const accountStatus = String(body.accountStatus || "").trim();
  const platformAdminRole = String(body.platformAdminRole || "none").trim();
  const teacherAccessEnabled = Boolean(body.teacherAccessEnabled);
  const newPassword = String(body.newPassword || "");
  const reason = String(body.reason || "إجراء إداري").trim() || "إجراء إداري";

  if (!userId) return response("ACCOUNT_NOT_FOUND", 404);
  if (fullName.length < 2) return response("FULL_NAME_REQUIRED", 400);
  if (!isAccountType(accountType)) return response("INVALID_ACCOUNT_TYPE", 400);
  if (accountType !== "incomplete" && organizationName.length < 2) {
    return response("ORGANIZATION_NAME_REQUIRED", 400);
  }
  if (!isAccountStatus(accountStatus)) return response("INVALID_ACCOUNT_STATUS", 400);
  if (!isPlatformAdminRole(platformAdminRole)) return response("INVALID_ADMIN_ROLE", 400);
  if (newPassword && (newPassword.length < 8 || newPassword.length > 128)) {
    return response("INVALID_PASSWORD_LENGTH", 400);
  }

  const { data: targetResult, error: targetError } = await adminClient.auth.admin.getUserById(userId);
  const target = targetResult?.user;
  if (targetError || !target?.email) return response("ACCOUNT_NOT_FOUND", 404, targetError?.message);
  if (target.email.toLowerCase() !== confirmationEmail) {
    return response("CONFIRMATION_MISMATCH", 400);
  }

  const { data: configuration, error: configurationError } = await adminClient.rpc(
    "admin_update_account_configuration",
    {
      p_admin_id: requester.user.id,
      p_user_id: userId,
      p_full_name: fullName,
      p_organization_name: organizationName,
      p_account_type: accountType,
      p_account_status: accountStatus,
      p_teacher_access_enabled: teacherAccessEnabled,
      p_platform_admin_role: platformAdminRole,
      p_reason: reason
    }
  );

  if (configurationError) {
    const knownError = [
      "SUPER_ADMIN_REQUIRED",
      "ACCOUNT_NOT_FOUND",
      "FULL_NAME_REQUIRED",
      "ORGANIZATION_NAME_REQUIRED",
      "INVALID_ACCOUNT_TYPE",
      "INVALID_ACCOUNT_STATUS",
      "INVALID_ADMIN_ROLE",
      "PROTECTED_SELF",
      "LAST_SUPER_ADMIN",
      "ROLE_CHANGE_HAS_STUDENTS",
      "MULTIPLE_OWNED_ORGANIZATIONS",
      "ORGANIZATION_CONFLICT"
    ].find((code) => configurationError.message.includes(code));
    return response(knownError || "ACCOUNT_UPDATE_FAILED", 409, configurationError.message);
  }

  let passwordUpdated = false;
  let passwordWarning: string | null = null;

  if (newPassword) {
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (passwordError) {
      passwordWarning = "PASSWORD_UPDATE_FAILED";
    } else {
      passwordUpdated = true;
      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: requester.user.id,
        action: "set_user_password",
        entity_type: "user_account",
        entity_id: userId,
        metadata: {
          email: target.email,
          password_length: newPassword.length,
          reason
        }
      });
    }
  }

  return response({
    ok: true,
    configuration,
    passwordUpdated,
    warning: passwordWarning
  });
}
