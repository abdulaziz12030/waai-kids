import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8"
};

const allowedMimeTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac"
]);

const extensionByMime: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac"
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Missing Supabase environment variables");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function getValidChildSession(admin: ReturnType<typeof getAdminClient>, token: string) {
  const { data, error } = await admin
    .from("child_sessions")
    .select("student_id")
    .eq("session_token", token)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data as { student_id: string };
}

async function getSegment(admin: ReturnType<typeof getAdminClient>, segmentId: string) {
  const { data: segment, error: segmentError } = await admin
    .from("quran_segments")
    .select("id, plan_id, status")
    .eq("id", segmentId)
    .maybeSingle();

  if (segmentError || !segment) return null;

  const { data: plan, error: planError } = await admin
    .from("quran_plans")
    .select("student_id, organization_id")
    .eq("id", segment.plan_id)
    .maybeSingle();

  if (planError || !plan) return null;
  return {
    id: segment.id as string,
    status: segment.status as string,
    studentId: plan.student_id as string,
    organizationId: plan.organization_id as string
  };
}

async function createAudioUrl(admin: ReturnType<typeof getAdminClient>, segmentId: string) {
  const { data: submission, error } = await admin
    .from("quran_audio_submissions")
    .select("storage_path, duration_seconds, submitted_at")
    .eq("segment_id", segmentId)
    .maybeSingle();

  if (error || !submission) return null;

  const { data: signed, error: signedError } = await admin.storage
    .from("quran-recitation-audio")
    .createSignedUrl(submission.storage_path, 3600);

  if (signedError || !signed) return null;
  return {
    signedUrl: signed.signedUrl,
    durationSeconds: submission.duration_seconds,
    submittedAt: submission.submitted_at
  };
}

async function handleUpload(req: Request, admin: ReturnType<typeof getAdminClient>) {
  const form = await req.formData();
  const sessionToken = String(form.get("session_token") || "");
  const segmentId = String(form.get("segment_id") || "");
  const durationSeconds = Number(form.get("duration_seconds") || 0);
  const audio = form.get("audio");

  if (!sessionToken || !segmentId || !(audio instanceof File)) {
    return response({ error: "بيانات التسجيل غير مكتملة." }, 400);
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 300) {
    return response({ error: "مدة التسجيل يجب ألا تتجاوز خمس دقائق." }, 400);
  }

  if (audio.size < 1 || audio.size > 10 * 1024 * 1024) {
    return response({ error: "حجم التسجيل غير مسموح." }, 400);
  }

  const mimeType = (audio.type || "").split(";")[0].trim().toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) {
    return response({ error: "صيغة التسجيل غير مدعومة على هذا الجهاز." }, 400);
  }

  const childSession = await getValidChildSession(admin, sessionToken);
  if (!childSession) return response({ error: "جلسة الطفل غير صالحة." }, 401);

  const segment = await getSegment(admin, segmentId);
  if (!segment || segment.studentId !== childSession.student_id) {
    return response({ error: "المقطع غير متاح لهذا الطفل." }, 403);
  }

  if (!["assigned", "needs_revision", "memorized"].includes(segment.status)) {
    return response({ error: "لا يمكن إرسال تسجيل لهذا المقطع بعد اعتماده." }, 409);
  }

  const { data: previous } = await admin
    .from("quran_audio_submissions")
    .select("storage_path")
    .eq("segment_id", segmentId)
    .maybeSingle();

  const extension = extensionByMime[mimeType] || "webm";
  const storagePath = `${segment.studentId}/${segmentId}/${crypto.randomUUID()}.${extension}`;
  const bytes = await audio.arrayBuffer();
  const normalizedAudio = new Blob([bytes], { type: mimeType });

  const { error: uploadError } = await admin.storage
    .from("quran-recitation-audio")
    .upload(storagePath, normalizedAudio, {
      contentType: mimeType,
      cacheControl: "0",
      upsert: false
    });

  if (uploadError) {
    return response({ error: "تعذر رفع التسجيل الصوتي." }, 500);
  }

  const now = new Date().toISOString();
  const { error: saveError } = await admin
    .from("quran_audio_submissions")
    .upsert({
      segment_id: segmentId,
      student_id: segment.studentId,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: audio.size,
      duration_seconds: Math.round(durationSeconds),
      submitted_at: now,
      updated_at: now
    }, { onConflict: "segment_id" });

  if (saveError) {
    await admin.storage.from("quran-recitation-audio").remove([storagePath]);
    return response({ error: "تعذر حفظ بيانات التسجيل." }, 500);
  }

  const { error: segmentError } = await admin
    .from("quran_segments")
    .update({ status: "memorized", memorized_at: now })
    .eq("id", segmentId);

  if (segmentError) {
    return response({ error: "تم رفع الصوت لكن تعذر تحديث حالة المقطع." }, 500);
  }

  if (previous?.storage_path && previous.storage_path !== storagePath) {
    await admin.storage.from("quran-recitation-audio").remove([previous.storage_path]);
  }

  const audioUrl = await createAudioUrl(admin, segmentId);
  return response({ success: true, ...audioUrl });
}

async function handleChildUrl(admin: ReturnType<typeof getAdminClient>, body: Record<string, unknown>) {
  const sessionToken = String(body.session_token || "");
  const segmentId = String(body.segment_id || "");
  const childSession = await getValidChildSession(admin, sessionToken);
  if (!childSession) return response({ error: "جلسة الطفل غير صالحة." }, 401);

  const segment = await getSegment(admin, segmentId);
  if (!segment || segment.studentId !== childSession.student_id) {
    return response({ error: "غير مصرح لك بسماع هذا التسجيل." }, 403);
  }

  const audioUrl = await createAudioUrl(admin, segmentId);
  if (!audioUrl) return response({ error: "لا يوجد تسجيل صوتي لهذا المقطع." }, 404);
  return response({ success: true, ...audioUrl });
}

async function handleReviewerUrl(req: Request, admin: ReturnType<typeof getAdminClient>, body: Record<string, unknown>) {
  const segmentId = String(body.segment_id || "");
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return response({ error: "يلزم تسجيل الدخول." }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const userId = userData.user?.id;
  if (userError || !userId) return response({ error: "جلسة المستخدم غير صالحة." }, 401);

  const segment = await getSegment(admin, segmentId);
  if (!segment) return response({ error: "المقطع غير موجود." }, 404);

  const [ownerResult, membershipResult, teacherResult] = await Promise.all([
    admin.from("organizations").select("id").eq("id", segment.organizationId).eq("owner_id", userId).maybeSingle(),
    admin.from("memberships").select("id").eq("organization_id", segment.organizationId).eq("user_id", userId).eq("role", "owner").eq("is_active", true).maybeSingle(),
    admin.from("teacher_student_links").select("id").eq("student_id", segment.studentId).eq("teacher_user_id", userId).eq("status", "active").maybeSingle()
  ]);

  const allowed = Boolean(ownerResult.data || membershipResult.data || teacherResult.data);
  if (!allowed) return response({ error: "غير مصرح لك بسماع هذا التسجيل." }, 403);

  const audioUrl = await createAudioUrl(admin, segmentId);
  if (!audioUrl) return response({ error: "لا يوجد تسجيل صوتي لهذا المقطع." }, 404);
  return response({ success: true, ...audioUrl });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const admin = getAdminClient();
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      return await handleUpload(req, admin);
    }

    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "child-url") return await handleChildUrl(admin, body);
    if (action === "reviewer-url") return await handleReviewerUrl(req, admin, body);
    return response({ error: "الطلب غير معروف." }, 400);
  } catch (error) {
    console.error(error);
    return response({ error: "حدث خطأ غير متوقع أثناء معالجة التسجيل." }, 500);
  }
});
