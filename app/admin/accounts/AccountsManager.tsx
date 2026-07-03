"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import styles from "../admin.module.css";
import AccountEditorModal, { AccountEditForm, AccountStatus, PlatformAdminRole, PrimaryAccountType } from "./AccountEditorModal";

type AccountKind = "parent" | "teacher" | "dual" | "incomplete";
type AccountFilter = "all" | AccountKind | "suspended" | "deleted";

type Account = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  primary_account_type: PrimaryAccountType;
  account_kind: AccountKind;
  account_status: AccountStatus;
  teacher_access: boolean;
  teacher_access_enabled: boolean;
  admin_reason: string | null;
  is_platform_admin: boolean;
  platform_admin_role: Exclude<PlatformAdminRole, "none"> | null;
  platform_admin_active: boolean;
  organization_name: string | null;
  family_organization_count: number;
  teacher_organization_count: number;
  membership_count: number;
  teacher_link_count: number;
  students_count: number;
};

type Dashboard = {
  admin: { role: string; user_id: string };
  metrics: {
    parent_accounts: number;
    teacher_accounts: number;
    incomplete_accounts: number;
    suspended_accounts: number;
    deleted_accounts: number;
  };
  accounts: Account[];
};

const roleMeta: Record<AccountKind, { label: string; icon: string; className: string }> = {
  parent: { label: "ولي أمر", icon: "👨‍👩‍👧‍👦", className: styles.accountParent },
  teacher: { label: "معلم", icon: "👨‍🏫", className: styles.accountTeacher },
  dual: { label: "ولي أمر + معلم", icon: "🔁", className: styles.accountDual },
  incomplete: { label: "غير مكتمل", icon: "◌", className: styles.accountIncomplete }
};

const adminRoleLabels: Record<PlatformAdminRole, string> = {
  none: "ليس آدمين",
  viewer: "مشاهد",
  support_admin: "دعم فني",
  operations_admin: "مدير عمليات",
  super_admin: "Super Admin"
};

const dateFormat = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "لم يسجل الدخول";
}

function friendlyError(message: string) {
  if (message.includes("SUPER_ADMIN_REQUIRED")) return "هذه العملية متاحة للـ Super Admin فقط.";
  if (message.includes("PROTECTED_ACCOUNT")) return "هذا حساب آدمين محمي ولا يمكن حذفه.";
  if (message.includes("PROTECTED_SELF")) return "لا يمكن إيقاف حسابك الحالي أو إزالة صلاحية Super Admin منه.";
  if (message.includes("LAST_SUPER_ADMIN")) return "لا يمكن إيقاف أو تخفيض صلاحية آخر Super Admin نشط.";
  if (message.includes("CONFIRMATION_MISMATCH")) return "البريد المكتوب غير مطابق لبريد الحساب.";
  if (message.includes("PHRASE_MISMATCH")) return "عبارة التأكيد غير صحيحة.";
  if (message.includes("DELETE_FIRST_REQUIRED") || message.includes("SOFT_DELETE_REQUIRED")) return "يجب حذف الحساب من الاستخدام أولًا، ثم تنفيذ الحذف النهائي.";
  if (message.includes("SERVER_ADMIN_NOT_CONFIGURED")) return "صلاحيات إدارة الحسابات غير مهيأة على الخادم.";
  if (message.includes("ACCOUNT_NOT_FOUND")) return "الحساب غير موجود أو سبق حذفه.";
  if (message.includes("AUTH_DELETE_FAILED")) return "تعذر حذف هوية الدخول من Supabase.";
  if (message.includes("FULL_NAME_REQUIRED")) return "اكتب الاسم الكامل للحساب.";
  if (message.includes("ORGANIZATION_NAME_REQUIRED")) return "اكتب اسم الأسرة أو الجهة التعليمية.";
  if (message.includes("INVALID_PASSWORD_LENGTH")) return "كلمة المرور الجديدة يجب أن تكون بين 8 و128 حرفًا.";
  if (message.includes("ROLE_CHANGE_HAS_STUDENTS")) return "لا يمكن تغيير نوع الحساب لأنه يملك أطفالًا أو طلابًا. يجب نقلهم أو حذفهم أولًا.";
  if (message.includes("MULTIPLE_OWNED_ORGANIZATIONS")) return "الحساب يملك أكثر من جهة، لذلك يلزم معالجة الجهات أولًا قبل تغيير نوعه.";
  if (message.includes("ORGANIZATION_CONFLICT")) return "يوجد تعارض في ملكية الجهة المرتبطة بالحساب.";
  if (message.includes("ACCOUNT_UPDATE_FAILED")) return "تعذر تحديث بيانات الحساب وصلاحياته.";
  return "تعذر إكمال العملية الآن.";
}

function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(16);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

export default function AccountsManager() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState<AccountEditForm | null>(null);

  async function load(query = search) {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      router.replace("/login?type=family");
      return;
    }
    const result = await supabase.rpc("get_admin_accounts_dashboard", { p_search: query.trim(), p_limit: 300 });
    if (result.error || !result.data) {
      if (result.error?.message.includes("ADMIN_ACCESS_DENIED")) router.replace("/dashboard");
      else setError("تعذر تحميل الحسابات الآن.");
      setLoading(false);
      return;
    }
    setData(result.data as Dashboard);
    setLoading(false);
  }

  useEffect(() => { void load(""); }, []);

  const accounts = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.accounts;
    if (filter === "deleted") return data.accounts.filter((item) => item.account_status === "deleted");
    if (filter === "suspended") return data.accounts.filter((item) => item.account_status === "suspended");
    return data.accounts.filter((item) => item.account_kind === filter && item.account_status === "active");
  }, [data, filter]);

  function openEditor(item: Account) {
    setError("");
    setSuccess("");
    setEditing(item);
    setEditForm({
      fullName: item.full_name || "",
      organizationName: item.organization_name || "",
      accountType: item.primary_account_type,
      accountStatus: item.account_status,
      teacherAccessEnabled: item.primary_account_type === "teacher" && item.teacher_access_enabled,
      platformAdminRole: item.platform_admin_role || "none",
      newPassword: "",
      confirmPassword: "",
      reason: item.admin_reason || "تحديث بواسطة إدارة المنصة",
      confirmationEmail: ""
    });
  }

  function closeEditor() {
    if (busyId.startsWith("edit-")) return;
    setEditing(null);
    setEditForm(null);
  }

  function updateEdit<K extends keyof AccountEditForm>(key: K, value: AccountEditForm[K]) {
    setEditForm((current) => {
      if (!current) return current;
      if (key === "accountType") {
        const accountType = value as PrimaryAccountType;
        return { ...current, accountType, teacherAccessEnabled: accountType === "teacher" ? current.teacherAccessEnabled : false };
      }
      if (key === "accountStatus" && value !== "active") {
        return { ...current, accountStatus: value as AccountStatus, teacherAccessEnabled: false };
      }
      return { ...current, [key]: value };
    });
  }

  function fillGeneratedPassword() {
    const password = generateTemporaryPassword();
    setEditForm((current) => current ? { ...current, newPassword: password, confirmPassword: password } : current);
  }

  async function saveAccountChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editForm || !editing.email || !supabase) return;
    setError("");
    setSuccess("");

    if (editForm.confirmationEmail.trim().toLowerCase() !== editing.email.toLowerCase()) {
      setError("اكتب البريد الإلكتروني كاملًا في خانة التأكيد.");
      return;
    }
    if (editForm.newPassword !== editForm.confirmPassword) {
      setError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }
    if (editForm.newPassword && editForm.newPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
      return;
    }
    if (editForm.accountType !== editing.primary_account_type && editing.students_count > 0) {
      setError("لا يمكن تغيير نوع الحساب قبل نقل الأطفال أو الطلاب المرتبطين به.");
      return;
    }
    if (editForm.accountStatus === "deleted" && editing.account_status !== "deleted" && !window.confirm("سيتم حذف الحساب من الاستخدام وإيقاف عضوياته. سيظل الحذف النهائي خطوة مستقلة. متابعة؟")) return;

    setBusyId(`edit-${editing.id}`);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setBusyId("");
      router.replace("/login?type=family");
      return;
    }

    try {
      const request = await fetch("/api/admin/account-management", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update_account",
          userId: editing.id,
          confirmationEmail: editForm.confirmationEmail.trim(),
          fullName: editForm.fullName.trim(),
          organizationName: editForm.organizationName.trim(),
          accountType: editForm.accountType,
          accountStatus: editForm.accountStatus,
          teacherAccessEnabled: editForm.accountType === "teacher" && editForm.teacherAccessEnabled,
          platformAdminRole: editForm.platformAdminRole,
          newPassword: editForm.newPassword,
          reason: editForm.reason.trim()
        })
      });
      const payload = await request.json().catch(() => ({}));
      if (!request.ok) {
        setError(friendlyError(String(payload.error || "UNKNOWN_ERROR")));
        return;
      }
      const passwordMessage = editForm.newPassword ? payload.passwordUpdated ? " وتم تعيين كلمة المرور الجديدة." : " لكن تعذر تعيين كلمة المرور؛ أعد المحاولة." : "";
      setSuccess(`تم تحديث حساب ${editForm.fullName}.${passwordMessage}`);
      setEditing(null);
      setEditForm(null);
      await load();
    } catch {
      setError("تعذر الاتصال بخدمة إدارة الحسابات.");
    } finally {
      setBusyId("");
    }
  }

  async function disableAccount(item: Account) {
    if (!item.email || !supabase) return;
    if (!window.confirm("سيتم إيقاف دخول الحساب وتعطيل عضوياته. متابعة؟")) return;
    const confirmation = window.prompt(`اكتب البريد كاملًا للتأكيد:\n${item.email}`, "");
    if (confirmation !== item.email) return setError("لم يتم التنفيذ لأن البريد غير مطابق.");
    const reason = window.prompt("سبب حذف الحساب:", "طلب حذف أو إجراء إداري") || "إجراء إداري";
    setBusyId(`account-${item.id}`);
    const result = await supabase.rpc("admin_disable_user_account", { p_user_id: item.id, p_confirmation: confirmation, p_reason: reason });
    setBusyId("");
    if (result.error) return setError(friendlyError(result.error.message));
    setSuccess(`تم إيقاف حساب ${item.full_name || item.email}.`);
    await load();
  }

  async function permanentlyDeleteAccount(item: Account) {
    if (!item.email || !supabase) return;
    const label = item.full_name || item.email;
    if (!window.confirm(`تحذير: سيتم حذف حساب «${label}» نهائيًا مع بياناته المرتبطة. لا يمكن التراجع. متابعة؟`)) return;
    const confirmationEmail = window.prompt(`اكتب البريد كاملًا:\n${item.email}`, "");
    if (confirmationEmail !== item.email) return setError("لم يتم التنفيذ لأن البريد غير مطابق.");
    const confirmationPhrase = window.prompt("اكتب العبارة التالية حرفيًا للتأكيد:\nحذف نهائي", "");
    if (confirmationPhrase !== "حذف نهائي") return setError("لم يتم التنفيذ لأن عبارة التأكيد غير صحيحة.");
    const reason = window.prompt("سبب الحذف النهائي:", item.admin_reason || "طلب حذف أو إجراء إداري") || "إجراء إداري";

    setBusyId(`permanent-${item.id}`);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return router.replace("/login?type=family");
    try {
      const request = await fetch("/api/admin/destructive-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "permanent_delete_account", userId: item.id, confirmationEmail, confirmationPhrase, reason })
      });
      const payload = await request.json().catch(() => ({}));
      if (!request.ok) return setError(friendlyError(String(payload.error || "UNKNOWN_ERROR")));
      setSuccess(`تم حذف حساب ${label} نهائيًا.`);
      await load();
    } catch {
      setError("تعذر الاتصال بخدمة الحذف النهائي.");
    } finally {
      setBusyId("");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void load(search);
  }

  if (loading && !data) return <main className={styles.shell}><div className={styles.loading}>جارٍ تحميل الحسابات...</div></main>;
  if (!data) return <main className={styles.shell}><div className={styles.loading}>{error || "تعذر فتح إدارة الحسابات."}</div></main>;

  const filters: Array<[AccountFilter, string]> = [["all", "كل الحسابات"], ["parent", "أولياء الأمور"], ["teacher", "المعلمون"], ["incomplete", "غير مكتمل"], ["suspended", "الموقوفة"], ["deleted", "المحذوفة"]];
  const metrics = [["👨‍👩‍👧‍👦", data.metrics.parent_accounts, "أولياء الأمور"], ["👨‍🏫", data.metrics.teacher_accounts, "المعلمون"], ["◌", data.metrics.incomplete_accounts, "غير مكتمل"], ["⏸️", data.metrics.suspended_accounts, "الموقوفة"], ["🗑️", data.metrics.deleted_accounts, "المحذوفة"]];
  const canManageAccounts = data.admin.role === "super_admin";

  return (
    <main className={styles.shell}>
      <div className={styles.console}>
        <header className={styles.topbar}><div className={styles.identity}><span className={styles.brandMark}>و</span><div><h1>إدارة الحسابات</h1><p>التحكم الكامل في النوع والحالة والصلاحيات وكلمات المرور</p></div></div><div className={styles.topActions}><Link className={styles.secondaryButton} href="/admin">العودة للوحة الآدمين</Link></div></header>
        <section className={styles.hero}><div><span>صلاحية: {data.admin.role}</span><h2>الحسابات والصلاحيات</h2><p>يمكن للـSuper Admin تعديل نوع الحساب وحالته وصلاحية المعلم ودور الآدمين وتعيين كلمة مرور جديدة، مع تسجيل جميع الإجراءات.</p></div></section>
        <section className={styles.metrics}>{metrics.map(([icon, value, label]) => <article className={styles.metric} key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>
        <div className={styles.warningBox}><strong>تنبيه أمني:</strong> كلمات المرور الحالية مشفرة ولا يمكن عرضها. يستطيع الـSuper Admin فقط تعيين كلمة مرور جديدة. تغيير نوع حساب يملك أطفالًا أو عدة جهات محظور حتى لا تضيع البيانات.</div>
        <form className={styles.toolbar} onSubmit={submit}><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد أو اسم الأسرة" /><button className={styles.primaryButton} type="submit">بحث وتحديث</button></form>
        <div className={styles.accountFilters}>{filters.map(([key, label]) => <button key={key} type="button" className={filter === key ? styles.activeFilter : ""} onClick={() => setFilter(key)}>{label}</button>)}</div>
        {error && <p className={styles.error}>{error}</p>}{success && <p className={styles.success}>{success}</p>}

        <section className={styles.section}>
          <div className={styles.sectionHead}><div><h3>كل الحسابات</h3><p>افتح «إدارة كاملة» لتعديل البيانات والدور والحالة وكلمة المرور.</p></div><span className={styles.countBadge}>{accounts.length}</span></div>
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الحساب</th><th>النوع</th><th>البريد</th><th>البيانات المرتبطة</th><th>الحالة</th><th>آخر دخول</th><th>الإجراءات</th></tr></thead><tbody>{accounts.map((item) => {
            const role = roleMeta[item.account_kind];
            const deleted = item.account_status === "deleted";
            const suspended = item.account_status === "suspended";
            return <tr key={item.id} className={deleted ? styles.deletedRow : ""}>
              <td className={styles.mainCell}><strong>{item.full_name || "بدون اسم"}</strong><small>{item.organization_name || "لا توجد جهة"}</small><small>أُنشئ: {formatDate(item.created_at)}</small></td>
              <td><span className={`${styles.accountBadge} ${role.className}`}>{role.icon} {role.label}</span>{item.teacher_access && !item.teacher_access_enabled && <span className={`${styles.accountBadge} ${styles.accountSuspended}`}>صلاحية المعلم موقوفة</span>}{item.platform_admin_role && <span className={styles.protectedBadge}>{adminRoleLabels[item.platform_admin_role]}</span>}</td>
              <td>{item.email || "—"}</td>
              <td className={styles.detailsCell}><span>أسر: {item.family_organization_count}</span><span>جهات تعليمية: {item.teacher_organization_count}</span><span>أطفال: {item.students_count}</span><span>عضويات: {item.membership_count}</span></td>
              <td>{item.is_platform_admin && <span className={styles.protectedBadge}>آدمين نشط</span>}{deleted ? <span className={`${styles.status} ${styles.statusDeleted}`}>محذوف من الاستخدام</span> : suspended ? <span className={`${styles.status} ${styles.statusWarn}`}>موقوف مؤقتًا</span> : <span className={styles.status}>نشط</span>}{!item.email_confirmed_at && !deleted && <span className={`${styles.status} ${styles.statusWarn}`}>البريد غير مؤكد</span>}{item.admin_reason && <small className={styles.reasonText}>{item.admin_reason}</small>}</td>
              <td>{formatDate(item.last_sign_in_at)}</td>
              <td><div className={styles.rowActions}><button className={styles.primaryButton} type="button" disabled={!canManageAccounts} onClick={() => openEditor(item)}>إدارة كاملة</button>{!item.is_platform_admin && !deleted && <button className={styles.dangerButton} type="button" disabled={busyId === `account-${item.id}`} onClick={() => void disableAccount(item)}>حذف من الاستخدام</button>}{!item.is_platform_admin && deleted && <button className={styles.dangerButton} type="button" disabled={busyId === `permanent-${item.id}`} onClick={() => void permanentlyDeleteAccount(item)}>{busyId === `permanent-${item.id}` ? "جارٍ الحذف..." : "حذف نهائي"}</button>}</div></td>
            </tr>;
          })}</tbody></table></div>
        </section>
      </div>

      {editing && editForm && <AccountEditorModal target={editing} form={editForm} busy={busyId === `edit-${editing.id}`} onChange={updateEdit} onGeneratePassword={fillGeneratedPassword} onClose={closeEditor} onSubmit={saveAccountChanges} />}
    </main>
  );
}
