"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type FamilySettings = {
  id: string;
  name: string;
  family_title: string | null;
  city: string | null;
  bio: string | null;
  guardian_display_name: string | null;
  logo_path: string | null;
  cover_path: string | null;
  theme_color: string;
  family_code: string;
};

export default function FamilySettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [name, setName] = useState("");
  const [familyTitle, setFamilyTitle] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [themeColor, setThemeColor] = useState("#0d7b4e");
  const [logoPath, setLogoPath] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | "">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function signUrl(path: string | null) {
    const client = supabase;
    if (!client || !path) return "";
    const result = await client.storage.from("family-media").createSignedUrl(path, 60 * 60);
    return result.data?.signedUrl || "";
  }

  async function loadSettings() {
    const client = supabase;
    if (!client) return;

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

    const result = await client.rpc("get_family_settings");
    if (result.error || !result.data) {
      setError("تعذر تحميل بيانات الأسرة.");
      setLoading(false);
      return;
    }

    const data = result.data as FamilySettings;
    setSettings(data);
    setName(data.name || "");
    setFamilyTitle(data.family_title || "");
    setCity(data.city || "");
    setBio(data.bio || "");
    setGuardianName(data.guardian_display_name || "");
    setThemeColor(data.theme_color || "#0d7b4e");
    setLogoPath(data.logo_path || "");
    setCoverPath(data.cover_path || "");
    setLogoUrl(await signUrl(data.logo_path));
    setCoverUrl(await signUrl(data.cover_path));
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") {
    const file = event.target.files?.[0];
    const client = supabase;
    if (!file || !client) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    setUploading(kind);
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${extension}`;
    const upload = await client.storage.from("family-media").upload(path, file, { upsert: false });
    setUploading("");

    if (upload.error) {
      setError("تعذر رفع الصورة. استخدم JPG أو PNG أو WebP.");
      return;
    }

    const url = await signUrl(path);
    if (kind === "logo") {
      setLogoPath(path);
      setLogoUrl(url);
    } else {
      setCoverPath(path);
      setCoverUrl(url);
    }
  }

  async function removeImage(kind: "logo" | "cover") {
    const client = supabase;
    if (!client) return;
    const path = kind === "logo" ? logoPath : coverPath;
    if (path) await client.storage.from("family-media").remove([path]);
    if (kind === "logo") {
      setLogoPath("");
      setLogoUrl("");
    } else {
      setCoverPath("");
      setCoverUrl("");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;

    if (name.trim().length < 2) {
      setError("اكتب اسمًا واضحًا للأسرة.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    const result = await client.rpc("update_family_settings", {
      p_name: name.trim(),
      p_family_title: familyTitle.trim(),
      p_city: city.trim(),
      p_bio: bio.trim(),
      p_guardian_display_name: guardianName.trim(),
      p_logo_path: logoPath,
      p_cover_path: coverPath,
      p_theme_color: themeColor
    });
    setSaving(false);

    if (result.error) {
      setError("تعذر حفظ بيانات الأسرة الآن.");
      return;
    }

    setSuccess("تم حفظ بيانات الأسرة بنجاح.");
    await loadSettings();
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل إعدادات الأسرة...</main>;

  return (
    <main className="family-settings-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href="/dashboard">لوحة الأسرة</Link>
      </header>

      <section className="family-profile-preview" style={{ "--family-color": themeColor } as React.CSSProperties}>
        <div className="family-cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined} />
        <div className="family-profile-main">
          <div className="family-logo">{logoUrl ? <img src={logoUrl} alt="شعار الأسرة" /> : "🌿"}</div>
          <div><span className="section-label">معاينة الملف</span><h1>{familyTitle || name || "أسرتي"}</h1><p>{bio || "عائلة تبني عاداتها بالإنجاز والوعي."}</p></div>
          <div className="family-code-box"><span>رمز الأسرة</span><strong>{settings?.family_code}</strong></div>
        </div>
      </section>

      <section className="family-settings-layout">
        <form className="family-settings-form auth-form" onSubmit={saveSettings}>
          <div><span className="section-label">البيانات الأساسية</span><h2>تعديل ملف الأسرة</h2></div>
          <div className="form-grid-two">
            <label>اسم الأسرة<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label>اللقب الظاهر<input value={familyTitle} onChange={(event) => setFamilyTitle(event.target.value)} placeholder="مثال: أسرة الغروي" /></label>
          </div>
          <div className="form-grid-two">
            <label>اسم ولي الأمر الظاهر<input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} /></label>
            <label>المدينة<input value={city} onChange={(event) => setCity(event.target.value)} /></label>
          </div>
          <label>نبذة الأسرة<textarea rows={4} maxLength={220} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="عبارة قصيرة تعبّر عن الأسرة" /></label>
          <label>لون هوية الأسرة<input className="family-color-input" type="color" value={themeColor} onChange={(event) => setThemeColor(event.target.value)} /></label>
          {error && <p className="form-message error-message">{error}</p>}
          {success && <p className="form-message success-message">{success}</p>}
          <button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ بيانات الأسرة"}</button>
        </form>

        <aside className="family-media-card">
          <div><span className="section-label">الصور</span><h2>شعار وغلاف الأسرة</h2></div>
          <div className="media-upload-item">
            <strong>شعار الأسرة</strong>
            <div className="media-preview square">{logoUrl ? <img src={logoUrl} alt="شعار الأسرة" /> : <span>🌿</span>}</div>
            <label className="media-upload-button"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event, "logo")} />{uploading === "logo" ? "جارٍ الرفع..." : "رفع شعار"}</label>
            {logoPath && <button type="button" onClick={() => removeImage("logo")}>حذف الشعار</button>}
          </div>
          <div className="media-upload-item">
            <strong>صورة الغلاف</strong>
            <div className="media-preview cover">{coverUrl ? <img src={coverUrl} alt="غلاف الأسرة" /> : <span>🏡</span>}</div>
            <label className="media-upload-button"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event, "cover")} />{uploading === "cover" ? "جارٍ الرفع..." : "رفع غلاف"}</label>
            {coverPath && <button type="button" onClick={() => removeImage("cover")}>حذف الغلاف</button>}
          </div>
        </aside>
      </section>
    </main>
  );
}
