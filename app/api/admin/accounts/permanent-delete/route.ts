import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "SERVER_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: requester, error: requesterError } = await adminClient.auth.getUser(accessToken);
  if (requesterError || !requester.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: adminRole } = await adminClient
    .from("platform_admins")
    .select("role,is_active")
    .eq("user_id", requester.user.id)
    .maybeSingle();

  if (!adminRole?.is_active || adminRole.role !== "super_admin") {
    return NextResponse.json({ error: "SUPER_ADMIN_REQUIRED" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const confirmationEmail = String(body.confirmationEmail || "").trim().toLowerCase();
  const confirmationPhrase = String(body.confirmationPhrase || "").trim();
  const reason = String(body.reason || "حذف نهائي بواسطة الإدارة").trim();

  if (!userId || userId === requester.user.id) {
    return NextResponse.json({ error: "PROTECTED_ACCOUNT" }, { status: 400 });
  }

  const { data: protectedAdmin } = await adminClient
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (protectedAdmin) return NextResponse.json({ error: "PROTECTED_ACCOUNT" }, { status: 400 });

  const { data: targetResult, error: targetError } = await adminClient.auth.admin.getUserById(userId);
  const target = targetResult?.user;
  if (targetError || !target?.email) {
    return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
  }

  if (confirmationEmail !== target.email.toLowerCase()) {
    return NextResponse.json({ error: "CONFIRMATION_MISMATCH" }, { status: 400 });
  }
  if (confirmationPhrase !== "حذف نهائي") {
    return NextResponse.json({ error: "PERMANENT_DELETE_PHRASE_MISMATCH" }, { status: 400 });
  }

  const { data: control } = await adminClient
    .from("account_admin_controls")
    .select("account_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (control?.account_status !== "deleted") {
    return NextResponse.json({ error: "DELETE_FIRST_REQUIRED" }, { status: 409 });
  }

  const { data: organizations } = await adminClient
    .from("organizations")
    .select("id")
    .eq("owner_id", userId);
  const organizationIds = (organizations || []).map((item) => item.id);

  let studentsCount = 0;
  if (organizationIds.length) {
    const { count } = await adminClient
      .from("students")
      .select("id", { count: "exact", head: true })
      .in("organization_id", organizationIds);
    studentsCount = count || 0;
  }

  await adminClient.from("admin_audit_logs").insert({
    admin_user_id: requester.user.id,
    action: "permanently_delete_user",
    entity_type: "user_account",
    entity_id: userId,
    metadata: {
      email: target.email,
      organizations_deleted: organizationIds.length,
      students_deleted: studentsCount,
      reason
    }
  });

  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId, false);
  if (deleteAuthError) {
    return NextResponse.json({ error: "AUTH_DELETE_FAILED", details: deleteAuthError.message }, { status: 500 });
  }

  if (organizationIds.length) {
    await adminClient.from("organizations").delete().in("id", organizationIds);
  }
  await adminClient.from("account_admin_controls").delete().eq("user_id", userId);
  await adminClient.from("profiles").delete().eq("id", userId);

  return NextResponse.json({
    ok: true,
    email: target.email,
    organizationsDeleted: organizationIds.length,
    studentsDeleted: studentsCount
  });
}
