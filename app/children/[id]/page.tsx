"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const avatarSymbols: Record<string, string> = {
  leaf: "🌿",
  star: "⭐",
  book: "📘",
  moon: "🌙"
};

const avatars = [
  { key: "leaf", label: "ورقة", symbol: "🌿" },
  { key: "star", label: "نجمة", symbol: "⭐" },
  { key: "book", label: "كتاب", symbol: "📘" },
  { key: "moon", label: "هلال", symbol: "🌙" }
];

type ProfileData = {
  birth_date?: string;
  gender?: string;
  grade_level?: string;
  avatar?: string;
  photo_path?: string;
};

async function compressImage(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز الصورة.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة.")), "image/jpeg", 0.82);
  });
}

export default function ChildProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [avatar, setAvatar] = useState("leaf");
  const [photoPath, setPhotoPath] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadChild() {
      if (!supabase) {
        setError("تعذر الاتصال بالخدمة.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const organization = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .eq("type", "family")
        .maybeSingle();

      if (!organization.data) {
        router.replace("/onboarding");
        return;
      }

      const child = await supabase
        .from("students")
        .select("id, full_name, profile_data")
        .eq("id", studentId)
        .eq("organization_id", organization.data.id)
        .maybeSingle();

      if (child.error || !child.data) {
        setError(child.error?.message || "تعذر العثور على ملف الطفل.");
        setLoading(false);
        return;
      }

      const profile = (child.data.profile_data || {}) as ProfileData;
      setFullName(child.data.full_name);
      setBirthDate(profile.birth_date || "");
      setGender(profile.gender || "");
      setGradeLevel(profile.grade_level || "");
      setAvatar(profile.avatar || (profile.photo_path ? "photo" : "leaf"));
      setPhotoPath(profile.photo_path || "");

      if (profile.photo_path) {
        const signed = await supabase.storage.from("child-photos").createSignedUrl(profile.photo_path, 60 * 60);
        if (signed.data?.signedUrl) setPhotoUrl(signed.data.signedUrl);
      }
      setLoading(false);
    }

    loadChild();
  }, [router, studentId]);

  const age = useMemo(() => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(`${birthDate}T00:00:00`);
    let years = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) years -= 1;
    return years >= 0 ? years : null;
  }, [birthDate]);

  function selectPresetAvatar(nextAvatar: string) {
    setAvatar(nextAvatar);
    setPhotoFile(null);
    setPhotoUrl("");
    setError("");
    setSuccess("سيتم اعتماد الرمز المختار عند حفظ التعديلات.");
  }

  function removeUploadedPhoto() {
    setAvatar("leaf");
    setPhotoFile(null);
    setPhotoUrl("");
    setError("");
    setSuccess("سيتم حذف الصورة واعتماد رمز الورقة عند حفظ التعديلات.");
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختر ملف صورة صالحًا.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("حجم الصورة كبير. اختر صورة أقل من 8 ميجابايت.");
      return;
    }
    setAvatar("photo");
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setError("");
    setSuccess("تم اختيار الصورة. اضغط حفظ التعديلات لاعتمادها.");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) return;
    if (fullName.trim().length < 2 || !birthDate || !gender || !gradeLevel.trim()) {
      setError("أكمل جميع البيانات الأساسية.");
      return;
    }

    setSaving(true);
    let nextPhotoPath = avatar === "photo" ? photoPath : "";

    if (avatar === "photo" && photoFile) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setSaving(false);
        setError("انتهت جلسة الدخول. سجل الدخول مرة أخرى.");
        return;
      }

      try {
        const compressed = await compressImage(photoFile);
        nextPhotoPath = `${userData.user.id}/${studentId}/profile-${Date.now()}.jpg`;
        const upload = await supabase.storage
          .from("child-photos")
          .upload(nextPhotoPath, compressed, { contentType: "image/jpeg", upsert: false });

        if (upload.error) throw upload.error;

        if (photoPath) await supabase.storage.from("child-photos").remove([photoPath]);
        const signed = await supabase.storage.from("child-photos").createSignedUrl(nextPhotoPath, 60 * 60);
        if (signed.data?.signedUrl) setPhotoUrl(signed.data.signedUrl);
      } catch (uploadError) {
        setSaving(false);
        setError(`تعذر رفع الصورة: ${uploadError instanceof Error ? uploadError.message : "خطأ غير معروف"}`);
        return;
      }
    }

    if (avatar !== "photo" && photoPath) {
      const removal = await supabase.storage.from("child-photos").remove([photoPath]);
      if (removal.error) {
        setSaving(false);
        setError(`تعذر حذف الصورة القديمة: ${removal.error.message}`);
        return;
      }
    }

    const result = await supabase
      .from("students")
      .update({
        full_name: fullName.trim(),
        profile_data: {
          birth_date: birthDate,
          gender,
          grade_level: gradeLevel.trim(),
          avatar,
          photo_path: nextPhotoPath || null
        }
      })
      .eq("id", studentId);
    setSaving(false);

    if (result.error) {
      setError(`تعذر حفظ التعديل: ${result.error.message}`);
      return;
    }

    setPhotoPath(nextPhotoPath);
    setPhotoFile(null);
    setSuccess(avatar === "photo" ? "تم حفظ صورة الطفل بنجاح." : "تم حفظ الرمز المختار وحذف الصورة المرفوعة.");
    setEditing(false);
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل ملف الطفل...</main>;

  if (error && !fullName) {
    return (
      <main className="auth-page compact-auth-page">
        <section className="auth-panel auth-status-panel">
          <p className="form-message error-message">{error}</p>
          <Link className="auth-submit link-submit" href="/dashboard">العودة إلى لوحة الأسرة</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="child-profile-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href="/dashboard">لوحة الأسرة</Link>
      </header>

      <section className="child-profile-hero">
        <div className="profile-photo-frame">
          {avatar === "photo" && photoUrl ? <img src={photoUrl} alt={`صورة ${fullName}`} /> : <span>{avatarSymbols[avatar] || fullName.slice(0, 1)}</span>}
        </div>
        <div>
          <span className="section-label">ملف الطفل</span>
          <h1>{fullName}</h1>
          <p>{gender === "female" ? "ابنة" : "ابن"} · {age !== null ? `${age} سنوات` : "العمر غير محدد"} · {gradeLevel || "الصف غير محدد"}</p>
        </div>
        <button className="quiet-button" type="button" onClick={() => setEditing((value) => !value)}>
          {editing ? "إلغاء التعديل" : "تعديل البيانات"}
        </button>
      </section>

      {editing ? (
        <section className="profile-edit-card">
          <form className="auth-form" onSubmit={handleSave}>
            <label>الاسم الكامل<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
            <div className="form-grid-two">
              <label>تاريخ الميلاد<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required /></label>
              <label>الجنس<select value={gender} onChange={(event) => setGender(event.target.value)} required><option value="">اختر</option><option value="male">ابن</option><option value="female">ابنة</option></select></label>
            </div>
            <label>الصف الدراسي<input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} required /></label>

            <fieldset className="avatar-fieldset">
              <legend>صورة رمزية للطفل</legend>
              <div className="avatar-options avatar-options-with-photo">
                <label className={avatar === "photo" ? "avatar-option photo-avatar-option selected" : "avatar-option photo-avatar-option"}>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} />
                  <span className="photo-avatar-preview">{photoUrl ? <img src={photoUrl} alt="صورة الطفل" /> : "📷"}</span>
                  <small>{photoUrl ? "صورة الطفل" : "من الألبوم"}</small>
                </label>
                {avatars.map((item) => (
                  <label className={avatar === item.key ? "avatar-option selected" : "avatar-option"} key={item.key}>
                    <input type="radio" name="avatar" checked={avatar === item.key} onChange={() => selectPresetAvatar(item.key)} />
                    <span>{item.symbol}</span>
                    <small>{item.label}</small>
                  </label>
                ))}
              </div>

              {(photoPath || photoFile || photoUrl) && (
                <div className="avatar-control-row">
                  <button className="danger-outline-button" type="button" onClick={removeUploadedPhoto}>
                    حذف الصورة المرفوعة
                  </button>
                  <p>بعد الحذف اختر أي رمز من الأعلى، ثم اضغط حفظ التعديلات.</p>
                </div>
              )}
            </fieldset>

            {error && <p className="form-message error-message">{error}</p>}
            {success && editing && <p className="form-message success-message">{success}</p>}
            <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button>
          </form>
        </section>
      ) : (
        <section className="profile-summary-grid">
          <article><span>العمر</span><strong>{age !== null ? `${age} سنوات` : "غير محدد"}</strong></article>
          <article><span>الصف الدراسي</span><strong>{gradeLevel || "غير محدد"}</strong></article>
          <article><span>النقاط الحالية</span><strong>0 نقطة</strong></article>
          <article><span>الهدف الحالي</span><strong>لا يوجد هدف بعد</strong></article>
        </section>
      )}

      {success && !editing && <p className="form-message success-message profile-success">{success}</p>}

      <section className="profile-next-card">
        <div><span className="section-label">الخطوة القادمة</span><h2>ابدأ أول هدف</h2><p>بعد اكتمال بيانات الطفل سنبدأ نظام الأهداف وفق المرحلة التالية من الخطة.</p></div>
        <button className="quiet-button" type="button" disabled>إضافة هدف قريبًا</button>
      </section>
    </main>
  );
}
