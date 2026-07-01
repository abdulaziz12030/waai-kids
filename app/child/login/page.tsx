"use client";

import { ClipboardEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PendingChildSession = {
  session_token: string;
  student_id: string;
  full_name: string;
  avatar?: string | null;
  photo_path?: string | null;
  photo_url?: string;
};

const avatarSymbols: Record<string, string> = {
  leaf: "🌿",
  star: "⭐",
  book: "📘",
  moon: "🌙"
};

export default function ChildLoginPage() {
  const router = useRouter();
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [familyCode, setFamilyCode] = useState("");
  const [familyCodeLocked, setFamilyCodeLocked] = useState(false);
  const [pinDigits, setPinDigits] = useState(["", "", "", "", "", ""]);
  const [rememberFamily, setRememberFamily] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingChild, setPendingChild] = useState<PendingChildSession | null>(null);

  const pin = useMemo(() => pinDigits.join(""), [pinDigits]);
  const hasFamilyCode = familyCode.length >= 8;

  useEffect(() => {
    const saved = localStorage.getItem("waai_family_code") || "";
    if (saved) {
      setFamilyCode(saved);
      setFamilyCodeLocked(true);
      setTimeout(() => pinRefs.current[0]?.focus(), 0);
    }
  }, []);

  function updatePinDigit(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setPinDigits((current) => current.map((value, itemIndex) => itemIndex === index ? digit : value));
    if (digit && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handlePinKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index > 0) pinRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handlePinPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const next = Array.from({ length: 6 }, (_, index) => pasted[index] || "");
    setPinDigits(next);
    pinRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const client = supabase;
    if (!client) {
      setError("تعذر الاتصال بالخدمة.");
      return;
    }

    const normalizedFamilyCode = familyCode.trim().toUpperCase();
    if (normalizedFamilyCode.length < 8 || !/^\d{6}$/.test(pin)) {
      setError("اكتب رمز الأسرة ثم الرقم السري المكوّن من 6 أرقام.");
      return;
    }

    setLoading(true);
    const result = await client.rpc("authenticate_child_simple", {
      p_family_code: normalizedFamilyCode,
      p_pin: pin
    });
    setLoading(false);

    if (result.error || !result.data?.[0]) {
      const message = result.error?.message || "بيانات الدخول غير صحيحة.";
      setError(message.includes("15 دقيقة") ? message : "رمز الأسرة أو الرقم السري غير صحيح.");
      return;
    }

    const session = result.data[0] as PendingChildSession;
    let photoUrl = "";
    if (session.photo_path) {
      const signed = await client.storage.from("child-photos").createSignedUrl(session.photo_path, 300);
      photoUrl = signed.data?.signedUrl || "";
    }

    setPendingChild({ ...session, photo_url: photoUrl });
  }

  function confirmChild() {
    if (!pendingChild) return;
    const normalizedFamilyCode = familyCode.trim().toUpperCase();

    if (rememberFamily) localStorage.setItem("waai_family_code", normalizedFamilyCode);
    else localStorage.removeItem("waai_family_code");

    localStorage.setItem("namaa_child_token", pendingChild.session_token);
    localStorage.setItem("namaa_child_name", pendingChild.full_name);
    router.push("/child");
  }

  function resetIdentity() {
    setPendingChild(null);
    setPinDigits(["", "", "", "", "", ""]);
    setTimeout(() => pinRefs.current[0]?.focus(), 0);
  }

  function changeFamilyCode() {
    localStorage.removeItem("waai_family_code");
    setFamilyCodeLocked(false);
    setFamilyCode("");
    setPinDigits(["", "", "", "", "", ""]);
    setError("");
  }

  return (
    <main className="auth-page compact-auth-page child-login-page">
      <section className="auth-panel child-login-panel simplified-child-login child-login-v2">
        <Link className="auth-brand" href="/"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>

        {!pendingChild ? (
          <>
            <div className="auth-heading child-login-heading">
              <span className="section-label">دخول الطفل</span>
              <h1>{familyCodeLocked ? "اكتب رقمك السري" : "مرحبًا بك"}</h1>
              <p>{familyCodeLocked ? "رمز الأسرة محفوظ على هذا الجهاز." : "اكتب رمز الأسرة مرة واحدة، ثم رقمك السري."}</p>
            </div>

            <form className="auth-form child-login-form" onSubmit={handleSubmit}>
              {familyCodeLocked ? (
                <div className="saved-family-code-card">
                  <span>✓</span>
                  <div><strong>جهاز العائلة</strong><small>رمز الأسرة محفوظ وجاهز.</small></div>
                  <button type="button" onClick={changeFamilyCode}>تغيير</button>
                </div>
              ) : (
                <label className="family-code-field">
                  <span>رمز الأسرة</span>
                  <div className="input-with-status">
                    <input
                      value={familyCode}
                      onChange={(event) => setFamilyCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      maxLength={10}
                      autoCapitalize="characters"
                      autoComplete="off"
                      placeholder="مثال: A1B2C3D4E5"
                      required
                    />
                    {hasFamilyCode && <b>✓</b>}
                  </div>
                </label>
              )}

              <fieldset className="child-pin-fieldset">
                <legend>رقمك السري</legend>
                <div className="child-pin-head">
                  <small>6 أرقام</small>
                  <button type="button" onClick={() => setShowPin((value) => !value)}>{showPin ? "إخفاء" : "إظهار"}</button>
                </div>
                <div className="child-pin-grid" dir="ltr">
                  {pinDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => { pinRefs.current[index] = element; }}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      aria-label={`الرقم ${index + 1}`}
                      onChange={(event) => updatePinDigit(index, event.target.value)}
                      onKeyDown={(event) => handlePinKeyDown(index, event)}
                      onPaste={handlePinPaste}
                    />
                  ))}
                </div>
              </fieldset>

              {!familyCodeLocked && (
                <label className="remember-family-option">
                  <input type="checkbox" checked={rememberFamily} onChange={(event) => setRememberFamily(event.target.checked)} />
                  <span><strong>هذا جهاز العائلة</strong><small>احفظ رمز الأسرة لتكتب رقمك السري فقط في المرة القادمة.</small></span>
                </label>
              )}

              {error && <p className="form-message error-message">{error}</p>}

              <button className="auth-submit child-login-submit" type="submit" disabled={loading || pin.length !== 6 || !hasFamilyCode}>
                {loading ? "نتحقق من حسابك..." : "متابعة"}
              </button>
            </form>

            <p className="auth-switch"><Link href="/login">دخول ولي الأمر</Link></p>
          </>
        ) : (
          <section className="child-identity-confirmation">
            <span className="section-label">هل هذا حسابك؟</span>
            <div className="child-identity-avatar">
              {pendingChild.photo_url ? <img src={pendingChild.photo_url} alt={`صورة ${pendingChild.full_name}`} /> : avatarSymbols[pendingChild.avatar || ""] || pendingChild.full_name.slice(0, 1)}
            </div>
            <h1>{pendingChild.full_name}</h1>
            <p>تأكد أن الاسم والصورة لك قبل فتح الحساب.</p>
            <button className="auth-submit" type="button" onClick={confirmChild}>نعم، هذا حسابي</button>
            <button className="quiet-button child-not-me-button" type="button" onClick={resetIdentity}>ليس حسابي</button>
          </section>
        )}
      </section>
    </main>
  );
}
