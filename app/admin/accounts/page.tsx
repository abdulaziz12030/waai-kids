"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import styles from "../admin.module.css";

type AccountKind = "parent" | "teacher" | "dual" | "incomplete";
type AccountFilter = "all" | AccountKind | "deleted";
type Account = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  account_kind: AccountKind;
  account_status: "active" | "deleted";
  teacher_access: boolean;
  teacher_access_enabled: boolean;
  admin_reason: string | null;
  is_platform_admin: boolean;
  family_organization_count: number;
  teacher_organization_count: number;
  membership_count: number;
  students_count: number;
};
type Dashboard = {
  admin: { role: string };
  metrics: { parent_accounts: number; teacher_accounts: number; deleted_accounts: number };
  accounts: Account[];
};

const roleMeta: Record<AccountKind, { label: string; icon: string; className: string }> = {
  parent: { label: "ولي أمر", icon: "👨‍👩‍👧‍👦", className: styles.accountParent },
  teacher: { label: "معلم", icon: "👨‍🏫", className: styles.accountTeacher },
  dual: { label: "ولي أمر + معلم", icon: "🔁", className: styles.accountDual },
  incomplete: { label: "غير مكتمل", icon: "◌", className: styles.accountIncomplete }
};

const dateFormat = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });
function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "لم يسجل الدخول";
}

function friendlyError(message: string) {
  if (message.includes("SUPER_ADMIN_REQUIRED")) return "هذه العملية متاحة للـ Super Admin فقط.";
  if (message.includes("PROTECTED_ACCOUNT")) return "هذا حساب آدمين محمي ولا يمكن إيقافه أو تعديل صلاحياته.";
  if (message.includes("CONFIRMATION_MISMATCH")) return "البريد المكتوب غير مطابق لبريد الحساب.";
  return "تعذر إكمال العملية الآن.";
}

export default function AdminAccountsPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(query = search) {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      router.replace("/login?type=family");
      return;
    }
    const result = await supabase.rpc("get_admin_dashboard", { p_search: query.trim(), p_limit: 200 });
    if (result.error || !result.data) {
      if (result.error?.message.includes("ADMIN_ACCESS_DENIED")) router.replace("/dashboard");
      else setError("تعذر تحميل الحسابات الآن.");
      setLoading(false);
      return;
    }
    setData(result.data as Dashboard);
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  const accounts = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.accounts;
    if (filter === "deleted") return data.accounts.filter((item) => item.account_status === "deleted");
    return data.accounts.filter((item) => item.account_kind === filter && item.account_status !== "deleted");
  }, [data, filter]);

  async function runAction(id: string, action: () => Promise<{ error: { message: string } | null }>, message: string) {
    setBusyId(id);
    setError("");
    setSuccess("");
    const result = await action();
    setBusyId("");
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    setSuccess(message);
    await load();
  }

  async function disableTeacher(item: Account) {
    if (!item.email) return;
    if (!window.confirm(`سيتم إيقاف صلاحية المعلم للحساب «${item.full_name || item.email}» وإلغاء وصوله للطلاب والتسميع. متابعة؟`)) return;
    const confirmation = window.prompt(`اكتب البريد كاملًا للتأكيد:\n${item.email}`, "");
    if (confirmation !== item.email) {
      setError("لم يتم التنفيذ لأن البريد غير مطابق.");
      return;
    }
    const reason = window.prompt("سبب إزالة صلاحية المعلم:", "إجراء إداري") || "إجراء إداري";
    await runAction(`teacher-${item.id}`, async () => {
      if (!supabase) return { error: { message: "SUPABASE_NOT_READY" } };
      return supabase.rpc("admin_disable_teacher_access", {
        p_user_id: item.id,
        p_confirmation: confirmation,
        p_reason: reason
      });
    }, `تم إيقاف صلاحية المعلم للحساب ${item.full_name || item.email}.`);
  }

  async function disableAccount(item: Account) {
    if (!item.email) return;
    if (!window.confirm("سيتم حذف الحساب من الاستخدام حذفًا آمنًا: إيقاف دخوله وتعطيل عضوياته، مع حفظ السجلات لمنع الحذف العرضي. متابعة؟")) return;
    const confirmation = window.prompt(`اكتب البريد كاملًا للتأكيد النهائي:\n${item.email}`, "");
    if (confirmation !== item.email) {
      setError("لم يتم التنفيذ لأن البريد غير مطابق.");
      return;
    }
    const reason = window.prompt("سبب حذف الحساب:", "طلب حذف أو إجراء إداري") || "إجراء إداري";
    await runAction(`account-${item.id}`, async () => {
      if (!supabase) return { error: { message: "SUPABASE_NOT_READY" } };
      return supabase.rpc("admin_disable_user_account", {
        p_user_id: item.id,
        p_confirmation: confirmation,
        p_reason: reason
      });
    }, `تم حذف حساب ${item.full_name || item.email} من الاستخدام وإيقاف دخوله.`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    load(search);
  }

  if (loading && !data) return <main className={styles.shell}><div className={styles.loading}>جارٍ تحميل الحسابات...</div></main>;
  if (!data) return <main className={styles.shell}><div className={styles.loading}>{error || "تعذر فتح إدارة الحسابات."}</div></main>;

  const filters: Array<[AccountFilter, string]> = [
    ["all", "كل الحسابات"],
    ["parent", "أولياء الأمور"],
    ["teacher", "المعلمون"],
    ["dual", "حساب مزدوج"],
    ["incomplete", "غير مكتمل"],
    ["deleted", "المحذوفة"]
  ];

  const metrics = [
    ["👨‍👩‍👧‍👦", data.metrics.parent_accounts, "أولياء الأمور"],
    ["👨‍🏫", data.metrics.teacher_accounts, "المعلمون"],
    ["🗑️", data.metrics.deleted_accounts, "المحذوفة"]
  ];

  return (
    <main className={styles.shell}>
      <div className={styles.console}>
        <header className={styles.topbar}>
          <div className={styles.identity}><span className={styles.brandMark}>و</span><div><h1>إدارة الحسابات</h1><p>تمييز أولياء الأمور والمعلمين والتحكم في الصلاحيات</p></div></div>
          <div className={styles.topActions}><Link className={styles.secondaryButton} href="/admin">العودة للوحة الآدمين</Link></div>
        </header>

        <section className={styles.hero}><div><span>صلاحية: {data.admin.role}</span><h2>الحسابات والصلاحيات</h2><p>يمكن للـ Super Admin إزالة صلاحية المعلم أو حذف الحساب من الاستخدام بعد كتابة البريد كاملًا للتأكيد.</p></div></section>
        <section className={styles.metrics}>{metrics.map(([icon, value, label]) => <article className={styles.metric} key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>
        <div className={styles.warningBox}><strong>الحذف الآمن:</strong> يمنع الدخول ويعطل العضويات، مع الاحتفاظ بالسجلات وسجل التدقيق لحماية المنصة من الحذف العرضي.</div>

        <form className={styles.toolbar} onSubmit={submit}><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد أو اسم الأسرة" /><button className={styles.primaryButton} type="submit">بحث وتحديث</button></form>
        <div className={styles.accountFilters}>{filters.map(([key, label]) => <button key={key} type="button" className={filter === key ? styles.activeFilter : ""} onClick={() => setFilter(key)}>{label}</button>)}</div>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <section className={styles.section}>
          <div className={styles.sectionHead}><div><h3>كل الحسابات</h3><p>يلزم إدخال البريد كاملًا قبل تنفيذ أي إجراء حساس.</p></div><span className={styles.countBadge}>{accounts.length}</span></div>
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th>الحساب</th><th>النوع</th><th>البريد</th><th>البيانات المرتبطة</th><th>الحالة</th><th>آخر دخول</th><th>الإجراءات</th></tr></thead>
            <tbody>{accounts.map((item) => {
              const role = roleMeta[item.account_kind];
              const deleted = item.account_status === "deleted";
              return <tr key={item.id} className={deleted ? styles.deletedRow : ""}>
                <td className={styles.mainCell}><strong>{item.full_name || "بدون اسم"}</strong><small>أُنشئ: {formatDate(item.created_at)}</small></td>
                <td><span className={`${styles.accountBadge} ${role.className}`}>{role.icon} {role.label}</span>{item.teacher_access && !item.teacher_access_enabled && <span className={`${styles.accountBadge} ${styles.accountSuspended}`}>صلاحية المعلم موقوفة</span>}</td>
                <td>{item.email || "—"}</td>
                <td className={styles.detailsCell}><span>أسر: {item.family_organization_count}</span><span>جهات تعليمية: {item.teacher_organization_count}</span><span>أطفال: {item.students_count}</span><span>عضويات: {item.membership_count}</span></td>
                <td>{item.is_platform_admin ? <span className={styles.protectedBadge}>آدمين محمي</span> : deleted ? <span className={`${styles.status} ${styles.statusDeleted}`}>محذوف</span> : <span className={styles.status}>نشط</span>}{!item.email_confirmed_at && !deleted && <span className={`${styles.status} ${styles.statusWarn}`}>البريد غير مؤكد</span>}{item.admin_reason && <small className={styles.reasonText}>{item.admin_reason}</small>}</td>
                <td>{formatDate(item.last_sign_in_at)}</td>
                <td><div className={styles.rowActions}>{!item.is_platform_admin && !deleted && item.teacher_access && item.teacher_access_enabled && <button className={styles.iconButton} disabled={busyId === `teacher-${item.id}`} onClick={() => disableTeacher(item)}>إزالة صلاحية المعلم</button>}{!item.is_platform_admin && !deleted && <button className={styles.dangerButton} disabled={busyId === `account-${item.id}`} onClick={() => disableAccount(item)}>حذف الحساب</button>}{deleted && <span className={styles.mutedText}>تم إيقاف دخوله</span>}</div></td>
              </tr>;
            })}</tbody>
          </table></div>
        </section>
      </div>
    </main>
  );
}
