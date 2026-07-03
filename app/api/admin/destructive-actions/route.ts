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

function response(error: string, status: number, details?: string) {
  return NextResponse.json({ error, details }, { status });
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

  if (action === "reset_gifts") {
    const confirmationPhrase = String(body.confirmationPhrase || "").trim();
    const reason = String(body.reason || "إجراء إداري").trim();
    if (confirmationPhrase !== "تصفير الهدايا") return response("PHRASE_MISMATCH", 400);

    const [{ count: giftsCount, error: giftCountError }, { count: notificationsCount, error: notificationCountError }] = await Promise.all([
      adminClient.from("child_gifts").select("id", { count: "exact", head: true }),
      adminClient.from("child_notifications").select("id", { count: "exact", head: true }).or("notification_type.eq.gift,action_type.eq.gift")
    ]);
    if (giftCountError || notificationCountError) return response("COUNT_FAILED", 500);

    const notificationDelete = await adminClient
      .from("child_notifications")
      .delete()
      .or("notification_type.eq.gift,action_type.eq.gift");
    if (notificationDelete.error) return response("NOTIFICATION_DELETE_FAILED", 500, notificationDelete.error.message);

    const giftDelete = await adminClient
      .from("child_gifts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (giftDelete.error) return response("GIFT_DELETE_FAILED", 500, giftDelete.error.message);

    const walletReset = await adminClient
      .from("family_gift_wallets")
      .update({ included_used: 0, updated_at: new Date().toISOString() })
      .gte("included_used", 0);
    if (walletReset.error) return response("WALLET_RESET_FAILED", 500, walletReset.error.message);

    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: requester.user.id,
      action: "reset_all_gifts",
      entity_type: "gift_system",
      entity_id: null,
      metadata: {
        gifts_deleted: giftsCount || 0,
        gift_notifications_deleted: notificationsCount || 0,
        coin_balances_preserved: true,
        gift_catalog_preserved: true,
        reason
      }
    });

    return NextResponse.json({
      ok: true,
      giftsDeleted: giftsCount || 0,
      notificationsDeleted: notificationsCount || 0,
      coinBalancesPreserved: true,
      giftCatalogPreserved: true
    });
  }

  if (action === "permanent_delete_account") {
    const userId = String(body.userId || "").trim();
    const confirmationEmail = String(body.confirmationEmail || "").trim().toLowerCase();
    const confirmationPhrase = String(body.confirmationPhrase || "").trim();
    const reason = String(body.reason || "حذف نهائي بواسطة الإدارة").trim();

    if (!userId || userId === requester.user.id) return response("PROTECTED_ACCOUNT", 400);
    if (confirmationPhrase !== "حذف نهائي") return response("PHRASE_MISMATCH", 400);

    const { data: protectedAdmin } = await adminClient
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (protectedAdmin) return response("PROTECTED_ACCOUNT", 400);

    const { count: historicAdminActions } = await adminClient
      .from("admin_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", userId);
    if ((historicAdminActions || 0) > 0) return response("PROTECTED_ACCOUNT", 400);

    const { data: targetResult, error: targetError } = await adminClient.auth.admin.getUserById(userId);
    const target = targetResult?.user;
    if (targetError || !target?.email) return response("ACCOUNT_NOT_FOUND", 404);
    if (confirmationEmail !== target.email.toLowerCase()) return response("CONFIRMATION_MISMATCH", 400);

    const { data: control } = await adminClient
      .from("account_admin_controls")
      .select("account_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (control?.account_status !== "deleted") return response("DELETE_FIRST_REQUIRED", 409);

    const { data: organizations, error: organizationsError } = await adminClient
      .from("organizations")
      .select("id")
      .eq("owner_id", userId);
    if (organizationsError) return response("RELATED_DATA_LOOKUP_FAILED", 500, organizationsError.message);
    const organizationIds = (organizations || []).map((item) => item.id);

    let studentsCount = 0;
    let giftsCount = 0;
    if (organizationIds.length) {
      const [{ count: studentCount }, { count: giftCount }] = await Promise.all([
        adminClient.from("students").select("id", { count: "exact", head: true }).in("organization_id", organizationIds),
        adminClient.from("child_gifts").select("id", { count: "exact", head: true }).in("organization_id", organizationIds)
      ]);
      studentsCount = studentCount || 0;
      giftsCount = giftCount || 0;
    }

    const { count: membershipsCount } = await adminClient
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (organizationIds.length) {
      const organizationDelete = await adminClient.from("organizations").delete().in("id", organizationIds);
      if (organizationDelete.error) return response("ORGANIZATION_DELETE_FAILED", 500, organizationDelete.error.message);
    }

    const creatorCleanup = await adminClient
      .from("platform_admins")
      .update({ created_by: null })
      .eq("created_by", userId);
    if (creatorCleanup.error) return response("ADMIN_REFERENCE_CLEANUP_FAILED", 500, creatorCleanup.error.message);

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId, false);
    if (deleteAuthError) return response("AUTH_DELETE_FAILED", 500, deleteAuthError.message);

    await adminClient.from("account_admin_controls").delete().eq("user_id", userId);
    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: requester.user.id,
      action: "permanently_delete_user_account",
      entity_type: "user_account",
      entity_id: userId,
      metadata: {
        email: target.email,
        organizations_deleted: organizationIds.length,
        students_deleted: studentsCount,
        gifts_deleted: giftsCount,
        memberships_deleted: membershipsCount || 0,
        reason
      }
    });

    return NextResponse.json({
      ok: true,
      email: target.email,
      organizationsDeleted: organizationIds.length,
      studentsDeleted: studentsCount,
      giftsDeleted: giftsCount,
      membershipsDeleted: membershipsCount || 0
    });
  }

  return response("UNKNOWN_ACTION", 400);
}
