"use client";

import Link from "next/link";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import styles from "../admin.module.css";
import accountStyles from "./accounts.module.css";

type AccountKind = "family" | "teacher" | "incomplete";
type AccountStatus = "active" | "suspended" | "deleted";
type AccountFilter = "all" | AccountKind | AccountStatus;
type ActionResult = { error: { message: string } | null };

type Account = {
  id: string; email: string | null; full_name: string | null; created_at: string;
  last_sign_in_at: string | null; email_confirmed_at: string | null;
  account_kind: AccountKind; account_status: AccountStatus; teacher_access_enabled: boolean;
  admin_reason: string | null; is_platform_admin: boolean;
  family_organization_count: number; teacher_organization_count: number;
  membership_count: number; students_count: number;
};
type Dashboard = { admin: { role: string }; accounts: Account[] };
type Metrics = {
  total_accounts: number; active_accounts: number; suspended_accounts: number; deleted_accounts: number;
  parent_accounts: number; teacher_accounts: number; incomplete_accounts: number;
  confirmed_emails: number; unconfirmed_emails: number; signed_in_last_30_days: number; never_signed_in: number;
  families: number; educational_entities: number; students: number; active_child_sessions: number;
  active_goals: number; pending_tasks: number; gifts: number;
};
type AccessCodes = {
  family_codes: Array<{ organization_id: string; organization_name: string; family_code: string }>;
  children: Array<{ student_id: string; student_name: string; child_login_code: string; organization_name: string }>;
};

const roleMeta: Record<AccountKind, { label: string; icon: string; className: string }> = {
  family: { label: "ولي أمر", icon: "👨‍👩‍👧‍👦", className: styles.accountParent },
  teacher: { label: "معلم", icon: "👨‍🏫", className: styles.accountTeacher },
  incomplete: { label: "غير مكتمل", icon: "◌", className: styles.accountIncomplete }
};
const dateFormat = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });
const formatDate = (value: string | null) => value ? dateFormat.format(new Date(value)) : "لم يسجل الدخول";

function friendlyError(message: string) {
  if (message.includes("SUPER_ADMIN_REQUIRED")) return "هذه العملية متاحة للـ Super Admin فقط.";
  if (message.includes("PROTECTED_ACCOUNT")) return "هذا حساب آدمين محمي ولا يمكن إيقافه أو حذفه.";
  if (message.includes("CONFIRMATION_MISMATCH")) return "البريد المكتوب غير مطابق لبريد الحساب.";
  if (message.includes("DELETE_FIRST_REQUIRED")) return "يجب تنفيذ الحذف الآمن أولًا قبل الحذف النهائي.";
  if (message.includes("PERMANENT_DELETE_PHRASE_MISMATCH")) return "عبارة تأكيد الحذف النهائي غير مطابقة.";
  if (message.includes("SERVER_ADMIN_NOT_CONFIGURED")) return "مفتاح الإدارة الآمن غير مضاف إلى Vercel.";
  return "تعذر إكمال العملية الآن.";
}

export default function AdminAccountsPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [codes, setCodes] = useState<Record<string, AccessCodes>>({});
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(query = search) {
    if (!supabase) return;
    setLoading(true); setError("");
    const session = await supabase.auth.getSession();
    if (!session.data.session) { router.replace("/login?type=family"); return; }
    const [accountsResult, metricsResult] = await Promise.all([
      supabase.rpc("get_admin_accounts", { p_search: query.trim(), p_limit: 250 }),
      supabase.rpc("get_admin_account_metrics")
    ]);
    if (accountsResult.error || !accountsResult.data) {
      if (accountsResult.error?.message.includes("ADMIN_ACCESS_DENIED")) router.replace("/dashboard");
      else setError("تعذر تحميل الحسابات الآن.");
      setLoading(false); return;
    }
    setData(accountsResult.data as Dashboard);
    if (!metricsResult.error && metricsResult.data) setMetrics(metricsResult.data as Metrics);
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  const accounts = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.accounts;
    if (["active", "suspended", "deleted"].includes(filter)) return data.accounts.filter((item) => item.account_status === filter);
    return data.accounts.filter((item) => item.account_kind === filter);
  }, [data, filter]);

  async function runAction(id: string, action: () => PromiseLike<ActionResult>, message: string) {
    setBusyId(id); setError(""); setSuccess("");
    const result = await action();
    setBusyId("");
    if (result.error) { setError(friendlyError(result.error.message)); return; }
    setSuccess(message); await load();
  }

  function askForEmail(item: Account, title: string) {
    if (!item.email) return null;
    const confirmation = window.prompt(`${title}\nاكتب البريد كاملًا للتأكيد:\n${item.email}`, "");
    if (confirmation !== item.email) { setError("لم يتم التنفيذ لأن البريد المكتوب غير مطابق."); return null; }
    return confirmation;
  }

  async function showCodes(item: Account) {
    if (!supabase) return;
    if (codes[item.id]) { setCodes((current) => { const next = { ...current }; delete next[item.id]; return next; }); return; }
    setBusyId(`codes-${item.id}`);
    const result = await supabase.rpc("admin_get_account_access_codes", { p_user_id: item.id });
    setBusyId("");
    if (result.error) { setError(friendlyError(result.error.message)); return; }
    setCodes((current) => ({ ...current, [item.id]: result.data as AccessCodes }));
  }

  async function sendPasswordReset(item: Account) {
    if (!supabase || !item.email) return;
    setBusyId(`reset-${item.id}`); setError(""); setSuccess("");
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const result = await supabase.auth.resetPasswordForEmail(item.email, { redirectTo });
    setBusyId("");
    if (result.error) { setError("تعذر إرسال رابط تغيير كلمة المرور الآن."); return; }
    setSuccess(`تم إرسال رابط آمن لتغيير كلمة المرور إلى ${item.email}.`);
  }

  async function suspendAccount(item: Account) {
    const confirmation = askForEmail(item, "سيتم إيقاف الحساب مؤقتًا ومنع دخوله حتى إعادة تفعيله.");
    if (!confirmation || !supabase) return;
    const reason = window.prompt("سبب الإيقاف:", "إيقاف إداري مؤقت") || "إيقاف إداري مؤقت";
    await runAction(`suspend-${item.id}`, () => supabase.rpc("admin_suspend_user_account", { p_user_id: item.id, p_confirmation: confirmation, p_reason: reason }), `تم إيقاف حساب ${item.full_name || item.email}.`);
  }

  async function restoreAccount(item: Account) {
    const confirmation = askForEmail(item, "سيتم استعادة الحساب وإعادة السماح له بالدخول.");
    if (!confirmation || !supabase) return;
    const reason = window.prompt("سبب الاستعادة:", "استعادة بواسطة الإدارة") || "استعادة بواسطة الإدارة";
    await runAction(`restore-${item.id}`, () => supabase.rpc("admin_restore_user_account", { p_user_id: item.id, p_confirmation: confirmation, p_reason: reason }), `تمت استعادة حساب ${item.full_name || item.email}.`);
  }

  async function disableTeacher(item: Account) {
    const confirmation = askForEmail(item, "سيتم إلغاء صلاحية المعلم ووصوله إلى الطلاب والتسميع.");
    if (!confirmation || !supabase) return;
    const reason = window.prompt("سبب إزالة صلاحية المعلم:", "إجراء إداري") || "إجراء إداري";
    await runAction(`teacher-${item.id}`, () => supabase.rpc("admin_disable_teacher_access", { p_user_id: item.id, p_confirmation: confirmation, p_reason: reason }), `تم إيقاف صلاحية المعلم للحساب ${item.full_name || item.email}.`);
  }

  async function safeDelete(item: Account) {
    if (!window.confirm("سيتم حذف الحساب حذفًا آمنًا: منع دخوله وتعطيل عضوياته مع الاحتفاظ بالسجلات. متابعة؟")) return;
    const confirmation = askForEmail(item, "تأكيد الحذف الآمن");
    if (!confirmation || !supabase) return;
    const reason = window.prompt("سبب الحذف:", "طلب حذف أو إجراء إداري") || "إجراء إداري";
    await runAction(`delete-${item.id}`, () => supabase.rpc("admin_disable_user_account", { p_user_id: item.id, p_confirmation: confirmation, p_reason: reason }), `تم حذف حساب ${item.full_name || item.email} من الاستخدام.`);
  }

  async function permanentDelete(item: Account) {
    if (!item.email || !supabase) return;
    if (!window.confirm("تحذير شديد: الحذف النهائي يزيل الحساب وبيانات الأسرة والأطفال المرتبطة به ولا يمكن التراجع عنه. متابعة؟")) return;
    const confirmationEmail = askForEmail(item, "المرحلة الأولى من تأكيد الحذف النهائي");
    if (!confirmationEmail) return;
    const confirmationPhrase = window.prompt("اكتب العبارة التالية حرفيًا:\nحذف نهائي", "");
    if (confirmationPhrase !== "حذف نهائي") { setError("لم يتم الحذف لأن عبارة التأكيد غير مطابقة."); return; }
    const reason = window.prompt("سبب الحذف النهائي:", "حذف نهائي بواسطة الإدارة") || "حذف نهائي بواسطة الإدارة";
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;
    setBusyId(`permanent-${item.id}`); setError(""); setSuccess("");
    const response = await fetch("/api/admin/accounts/permanent-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: item.id, confirmationEmail, confirmationPhrase, reason })
    });
    const payload = await response.json().catch(() => ({}));
    setBusyId("");
    if (!response.ok) { setError(friendlyError(String(payload.error || "PERMANENT_DELETE_FAILED"))); return; }
    setSuccess(`تم الحذف النهائي للحساب ${item.email}.`);
    setCodes((current) => { const next = { ...current }; delete next[item.id]; return next; });
    await load();
  }

  async function copyCode(value: string) { await navigator.clipboard.writeText(value); setSuccess("تم نسخ الرمز."); }
  function submit(event: FormEvent) { event.preventDefault(); load(search); }

  if (loading && !data) return <main className={styles.shell}><div className={styles.loading}>جارٍ تحميل مركز التحكم...</div></main>;
  if (!data) return <main className={styles.shell}><div className={styles.loading}>{error || "تعذر فتح إدارة الحسابات."}</div></main>;

  const filters: Array<[AccountFilter, string]> = [
    ["all", "كل الحسابات"], ["active", "النشطة"], ["suspended", "الموقوفة"], ["deleted", "المحذوفة"],
    ["family", "أولياء الأمور"], ["teacher", "المعلمون"], ["incomplete", "غير مكتملة"]
  ];
  const metricCards = metrics ? [
    ["👥", metrics.total_accounts, "إجمالي الحسابات"], ["✅", metrics.active_accounts, "حسابات نشطة"],
    ["⏸️", metrics.suspended_accounts, "حسابات موقوفة"], ["🗑️", metrics.deleted_accounts, "حسابات محذوفة"],
    ["👨‍👩‍👧‍👦", metrics.parent_accounts, "أولياء الأمور"], ["👨‍🏫", metrics.teacher_accounts, "المعلمون"],
    ["🧒", metrics.students, "الأطفال"], ["🔐", metrics.active_child_sessions, "جلسات أطفال نشطة"],
    ["✉️", metrics.confirmed_emails, "بريد مؤكد"], ["⚠️", metrics.unconfirmed_emails, "بريد غير مؤكد"],
    ["📅", metrics.signed_in_last_30_days, "دخلوا خلال 30 يومًا"], ["○", metrics.never_signed_in, "لم يسجلوا الدخول"],
    ["🎯", metrics.active_goals, "أهداف نشطة"], ["📝", metrics.pending_tasks, "مهام بانتظار المراجعة"], ["🎁", metrics.gifts, "إجمالي الهدايا"]
  ] : [];

  return <main className={styles.shell}><div className={styles.console}>
    <header className={styles.topbar}><div className={styles.identity}><span className={styles.brandMark}>و</span><div><h1>مركز التحكم بالحسابات</h1><p>الأرقام والإيقاف والاستعادة والحذف الآمن والنهائي</p></div></div><div className={styles.topActions}><Link className={styles.secondaryButton} href="/admin">العودة للوحة الآدمين</Link></div></header>
    <section className={styles.hero}><div><span>صلاحية: {data.admin.role}</span><h2>تحكم إداري أوسع</h2><p>متابعة الأرقام والإحصاءات، عرض رموز دخول الأسرة والطفل، إيقاف الحسابات واستعادتها، والحذف النهائي على مرحلتين.</p></div></section>
    <div className={accountStyles.notice}><strong>بخصوص كلمات المرور:</strong> كلمات مرور ولي الأمر والمعلم مشفرة داخل Supabase ولا يمكن قراءتها أو عرضها حتى للآدمين. المتاح هو إرسال رابط آمن لتغييرها. أما رمز الأسرة ورمز دخول الطفل فيمكن للـ Super Admin عرضهما ونسخهما.</div>
    {metricCards.length > 0 && <section className={styles.metrics}>{metricCards.map(([icon, value, label]) => <article className={styles.metric} key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>}
    <form className={styles.toolbar} onSubmit={submit}><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد أو اسم الأسرة" /><button className={styles.primaryButton} type="submit">بحث وتحديث</button></form>
    <div className={styles.accountFilters}>{filters.map(([key, label]) => <button key={key} type="button" className={filter === key ? styles.activeFilter : ""} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {error && <p className={styles.error}>{error}</p>}{success && <p className={styles.success}>{success}</p>}
    <section className={styles.section}><div className={styles.sectionHead}><div><h3>الحسابات</h3><p>كل إجراء حساس يتطلب كتابة البريد كاملًا، والحذف النهائي يتطلب حذفًا آمنًا أولًا.</p></div><span className={styles.countBadge}>{accounts.length}</span></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الحساب</th><th>النوع</th><th>البريد</th><th>البيانات المرتبطة</th><th>الحالة</th><th>آخر دخول</th><th>الإجراءات</th></tr></thead><tbody>{accounts.map((item) => {
        const role = roleMeta[item.account_kind] || roleMeta.incomplete;
        const isDeleted = item.account_status === "deleted";
        const isSuspended = item.account_status === "suspended";
        const accessCodes = codes[item.id];
        return <Fragment key={item.id}><tr className={isDeleted ? styles.deletedRow : ""}>
          <td className={styles.mainCell}><strong>{item.full_name || "بدون اسم"}</strong><small>أُنشئ: {formatDate(item.created_at)}</small></td>
          <td><span className={`${styles.accountBadge} ${role.className}`}>{role.icon} {role.label}</span>{item.account_kind === "teacher" && !item.teacher_access_enabled && <span className={`${styles.accountBadge} ${styles.accountSuspended}`}>صلاحية المعلم موقوفة</span>}</td>
          <td>{item.email || "—"}</td>
          <td className={styles.detailsCell}><span>أسر: {item.family_organization_count}</span><span>جهات تعليمية: {item.teacher_organization_count}</span><span>أطفال: {item.students_count}</span><span>عضويات نشطة: {item.membership_count}</span></td>
          <td>{item.is_platform_admin ? <span className={styles.protectedBadge}>آدمين محمي</span> : isDeleted ? <span className={`${styles.status} ${styles.statusDeleted}`}>محذوف</span> : isSuspended ? <span className={`${styles.status} ${accountStyles.statusSuspended}`}>موقوف</span> : <span className={styles.status}>نشط</span>}{!item.email_confirmed_at && !isDeleted && <span className={`${styles.status} ${styles.statusWarn}`}>البريد غير مؤكد</span>}{item.admin_reason && <small className={styles.reasonText}>{item.admin_reason}</small>}</td>
          <td>{formatDate(item.last_sign_in_at)}</td>
          <td><div className={styles.rowActions}>
            {!item.is_platform_admin && <button className={styles.secondaryButton} disabled={busyId === `reset-${item.id}`} onClick={() => sendPasswordReset(item)}>تغيير كلمة المرور</button>}
            {!item.is_platform_admin && item.account_kind === "family" && <button className={styles.iconButton} disabled={busyId === `codes-${item.id}`} onClick={() => showCodes(item)}>{accessCodes ? "إخفاء الرموز" : "عرض الأرقام السرية"}</button>}
            {!item.is_platform_admin && item.account_status === "active" && <button className={styles.iconButton} disabled={busyId === `suspend-${item.id}`} onClick={() => suspendAccount(item)}>إيقاف مؤقت</button>}
            {!item.is_platform_admin && item.account_status === "suspended" && <button className={styles.primaryButton} disabled={busyId === `restore-${item.id}`} onClick={() => restoreAccount(item)}>استعادة الحساب</button>}
            {!item.is_platform_admin && item.account_kind === "teacher" && item.account_status === "active" && item.teacher_access_enabled && <button className={styles.iconButton} disabled={busyId === `teacher-${item.id}`} onClick={() => disableTeacher(item)}>إزالة صلاحية المعلم</button>}
            {!item.is_platform_admin && item.account_status !== "deleted" && <button className={styles.dangerButton} disabled={busyId === `delete-${item.id}`} onClick={() => safeDelete(item)}>حذف آمن</button>}
            {!item.is_platform_admin && item.account_status === "deleted" && <button className={styles.primaryButton} disabled={busyId === `restore-${item.id}`} onClick={() => restoreAccount(item)}>استعادة</button>}
            {!item.is_platform_admin && item.account_status === "deleted" && <button className={accountStyles.permanentButton} disabled={busyId === `permanent-${item.id}`} onClick={() => permanentDelete(item)}>حذف نهائي</button>}
          </div></td>
        </tr>{accessCodes && <tr><td colSpan={7}><div className={accountStyles.codesPanel}><h4>رموز الدخول الخاصة بـ {item.full_name || item.email}</h4><div className={accountStyles.codesGrid}>
          {accessCodes.family_codes.map((code) => <div className={accountStyles.codeCard} key={code.organization_id}><small>رمز الأسرة · {code.organization_name}</small><span className={accountStyles.codeValue}>{code.family_code}</span><button className={accountStyles.copyButton} onClick={() => copyCode(code.family_code)}>نسخ</button></div>)}
          {accessCodes.children.map((child) => <div className={accountStyles.codeCard} key={child.student_id}><small>رمز الطفل · {child.student_name}</small><span className={accountStyles.codeValue}>{child.child_login_code}</span><button className={accountStyles.copyButton} onClick={() => copyCode(child.child_login_code)}>نسخ</button></div>)}
          {!accessCodes.family_codes.length && !accessCodes.children.length && <span className={styles.mutedText}>لا توجد رموز دخول مرتبطة بهذا الحساب.</span>}
        </div></div></td></tr>}</Fragment>;
      })}</tbody></table></div>
    </section>
  </div></main>;
}
