"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import styles from "./admin.module.css";

type Tab = "organizations" | "students" | "subscriptions" | "memberships" | "gifts";
type Metrics = { organizations:number; families:number; teachers:number; students:number; active_goals:number; pending_tasks:number; delivered_gifts:number; subscriptions:number; active_subscriptions:number };
type Organization = { id:string; name:string; type:string; family_title:string|null; city:string|null; family_code:string; created_at:string; owner_email:string|null; students_count:number; active_members_count:number; subscription?:{ id:string; status:string; plan_code:string; ends_at:string|null }|null };
type Student = { id:string; full_name:string; organization_name:string; achievement_points:number; reward_points:number; child_login_code:string; created_at:string; goals_count:number; tasks_count:number; gifts_count:number };
type Subscription = { id:string; organization_name:string; plan_code:string; status:string; starts_at:string; ends_at:string|null; created_at:string };
type Membership = { id:string; organization_name:string; email:string|null; role:string; display_name:string|null; is_active:boolean; created_at:string };
type Gift = { id:string; student_name:string; organization_name:string; gift_name:string; achievement_title:string; sender_name:string; status:string; coin_cost:number; gifted_at:string; opened_at:string|null };
type DashboardData = { admin:{ role:string }; metrics:Metrics; organizations:Organization[]; students:Student[]; subscriptions:Subscription[]; memberships:Membership[]; recent_gifts:Gift[] };

const dateFormat = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" });
function formatDate(value:string|null) { return value ? dateFormat.format(new Date(value)) : "—"; }

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData|null>(null);
  const [tab, setTab] = useState<Tab>("organizations");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [subscriptionStatuses, setSubscriptionStatuses] = useState<Record<string,string>>({});

  async function loadDashboard(query = search) {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      router.replace("/login?type=family");
      return;
    }
    const result = await supabase.rpc("get_admin_dashboard", { p_search: query.trim(), p_limit: 100 });
    if (result.error || !result.data) {
      if (result.error?.message.includes("ADMIN_ACCESS_DENIED")) router.replace("/dashboard");
      else setError("تعذر تحميل لوحة الإدارة الآن.");
      setLoading(false);
      return;
    }
    const next = result.data as DashboardData;
    setData(next);
    setSubscriptionStatuses(Object.fromEntries(next.subscriptions.map((item) => [item.id, item.status])));
    setLoading(false);
  }

  useEffect(() => { loadDashboard(""); }, []);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.replace("/login?type=family");
  }

  async function runAction(id:string, action:() => Promise<{ error: { message:string }|null }>, message:string) {
    setBusyId(id); setError(""); setSuccess("");
    const result = await action();
    setBusyId("");
    if (result.error) { setError("لم تكتمل العملية. تحقق من الصلاحيات ثم حاول مرة أخرى."); return; }
    setSuccess(message);
    await loadDashboard();
  }

  async function saveSubscription(item:Subscription) {
    const status = subscriptionStatuses[item.id] || item.status;
    await runAction(item.id, async () => {
      if (!supabase) return { error: { message:"SUPABASE_NOT_READY" } };
      return supabase.rpc("admin_update_subscription", { p_subscription_id:item.id, p_status:status, p_plan_code:item.plan_code, p_ends_at:item.ends_at });
    }, "تم تحديث الاشتراك وتسجيل العملية.");
  }

  async function adjustPoints(student:Student) {
    const achievement = Number(window.prompt("التغيير في نقاط الإنجاز، ويمكن إدخال رقم سالب:", "0") || 0);
    const reward = Number(window.prompt("التغيير في نقاط المكافآت، ويمكن إدخال رقم سالب:", "0") || 0);
    if (!Number.isFinite(achievement) || !Number.isFinite(reward) || (achievement === 0 && reward === 0)) return;
    const reason = window.prompt("سبب التعديل:", "تعديل إداري") || "تعديل إداري";
    await runAction(student.id, async () => {
      if (!supabase) return { error: { message:"SUPABASE_NOT_READY" } };
      return supabase.rpc("admin_adjust_student_points", { p_student_id:student.id, p_achievement_delta:achievement, p_reward_delta:reward, p_reason:reason });
    }, `تم تحديث نقاط ${student.full_name}.`);
  }

  async function revokeSessions(student:Student) {
    if (!window.confirm(`سيتم تسجيل خروج ${student.full_name} من جميع جلسات الطفل الحالية. متابعة؟`)) return;
    await runAction(`session-${student.id}`, async () => {
      if (!supabase) return { error: { message:"SUPABASE_NOT_READY" } };
      return supabase.rpc("admin_revoke_child_sessions", { p_student_id:student.id });
    }, "تم إلغاء جلسات دخول الطفل.");
  }

  async function toggleMembership(item:Membership) {
    await runAction(item.id, async () => {
      if (!supabase) return { error: { message:"SUPABASE_NOT_READY" } };
      return supabase.rpc("admin_set_membership_active", { p_membership_id:item.id, p_is_active:!item.is_active });
    }, item.is_active ? "تم إيقاف العضوية." : "تم تفعيل العضوية.");
  }

  function submitSearch(event:FormEvent) { event.preventDefault(); loadDashboard(search); }

  if (loading && !data) return <main className={styles.shell}><div className={styles.loading}>جارٍ تجهيز لوحة الإدارة...</div></main>;
  if (!data) return <main className={styles.shell}><div className={styles.loading}>{error || "تعذر فتح لوحة الإدارة."}</div></main>;

  const metricCards = [
    ["👨‍👩‍👧‍👦", data.metrics.families, "الأسر"], ["🧒", data.metrics.students, "الأطفال"],
    ["🎯", data.metrics.active_goals, "أهداف نشطة"], ["✅", data.metrics.pending_tasks, "بانتظار المراجعة"],
    ["🎁", data.metrics.delivered_gifts, "هدايا مرسلة"]
  ];

  return (
    <main className={styles.shell}>
      <div className={styles.console}>
        <header className={styles.topbar}>
          <div className={styles.identity}><span className={styles.brandMark}>و</span><div><h1>إدارة واعي كيدز</h1><p>لوحة مركزية محمية لجميع حسابات المنصة</p></div></div>
          <div className={styles.topActions}><Link className={styles.secondaryButton} href="/dashboard">لوحة الأسرة</Link><button className={styles.dangerButton} onClick={signOut}>خروج</button></div>
        </header>

        <section className={styles.hero}><div><span>الإدارة المركزية</span><h2>نظرة كاملة على المنصة</h2><p>تابع الأسر والأطفال والاشتراكات والهدايا، ونفّذ العمليات الإدارية الحساسة مع تسجيلها في سجل التدقيق.</p></div><span className={styles.roleBadge}>{data.admin.role}</span></section>

        <section className={styles.metrics}>{metricCards.map(([icon,value,label]) => <article className={styles.metric} key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>

        <form className={styles.toolbar} onSubmit={submitSearch}><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الأسرة أو الطفل أو البريد أو رمز الأسرة" /><button className={styles.primaryButton} type="submit">بحث وتحديث</button></form>
        {error && <p className={styles.error}>{error}</p>}{success && <p className={styles.success}>{success}</p>}

        <nav className={styles.tabs} aria-label="أقسام لوحة الإدارة">
          {([ ["organizations","الأسر والجهات"], ["students","الأطفال"], ["subscriptions","الاشتراكات"], ["memberships","العضويات"], ["gifts","الهدايا"] ] as [Tab,string][]).map(([key,label]) => <button className={tab === key ? styles.active : ""} type="button" onClick={() => setTab(key)} key={key}>{label}</button>)}
        </nav>

        {tab === "organizations" && <section className={styles.section}><div className={styles.sectionHead}><div><h3>الأسر والجهات</h3><p>المالك وعدد الأطفال وحالة الاشتراك.</p></div><span className={styles.countBadge}>{data.organizations.length}</span></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الجهة</th><th>النوع</th><th>المالك</th><th>الأطفال</th><th>العضويات</th><th>الاشتراك</th><th>تاريخ الإنشاء</th></tr></thead><tbody>{data.organizations.map((item) => <tr key={item.id}><td className={styles.mainCell}><strong>{item.family_title || item.name}</strong><small>{item.city || "المدينة غير محددة"} · {item.family_code}</small></td><td><span className={styles.status}>{item.type}</span></td><td>{item.owner_email || "—"}</td><td>{item.students_count}</td><td>{item.active_members_count}</td><td>{item.subscription ? `${item.subscription.plan_code} · ${item.subscription.status}` : "بدون اشتراك"}</td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table></div></section>}

        {tab === "students" && <section className={styles.section}><div className={styles.sectionHead}><div><h3>الأطفال</h3><p>النقاط والأنشطة وجلسات الدخول.</p></div><span className={styles.countBadge}>{data.students.length}</span></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الطفل</th><th>الأسرة</th><th>الإنجاز</th><th>المكافآت</th><th>الأهداف</th><th>المهام</th><th>الهدايا</th><th>الإجراءات</th></tr></thead><tbody>{data.students.map((item) => <tr key={item.id}><td className={styles.mainCell}><strong>{item.full_name}</strong><small>رمز الدخول: {item.child_login_code}</small></td><td>{item.organization_name}</td><td>{item.achievement_points}</td><td>{item.reward_points}</td><td>{item.goals_count}</td><td>{item.tasks_count}</td><td>{item.gifts_count}</td><td><div className={styles.rowActions}><button className={styles.iconButton} disabled={busyId === item.id} onClick={() => adjustPoints(item)}>تعديل النقاط</button><button className={styles.dangerButton} disabled={busyId === `session-${item.id}`} onClick={() => revokeSessions(item)}>إلغاء الجلسات</button></div></td></tr>)}</tbody></table></div></section>}

        {tab === "subscriptions" && <section className={styles.section}><div className={styles.sectionHead}><div><h3>الاشتراكات</h3><p>تغيير الحالة يتم فورًا ويسجل باسم الآدمين.</p></div><span className={styles.countBadge}>{data.subscriptions.length}</span></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الجهة</th><th>الخطة</th><th>الحالة</th><th>البداية</th><th>النهاية</th><th>حفظ</th></tr></thead><tbody>{data.subscriptions.map((item) => <tr key={item.id}><td>{item.organization_name}</td><td>{item.plan_code}</td><td><select className={styles.select} value={subscriptionStatuses[item.id] || item.status} onChange={(event) => setSubscriptionStatuses((current) => ({...current,[item.id]:event.target.value}))}><option value="trial">تجريبي</option><option value="active">نشط</option><option value="suspended">موقوف</option><option value="cancelled">ملغي</option><option value="expired">منتهي</option></select></td><td>{formatDate(item.starts_at)}</td><td>{formatDate(item.ends_at)}</td><td><button className={styles.primaryButton} disabled={busyId === item.id} onClick={() => saveSubscription(item)}>حفظ</button></td></tr>)}</tbody></table></div></section>}

        {tab === "memberships" && <section className={styles.section}><div className={styles.sectionHead}><div><h3>العضويات</h3><p>تفعيل أو إيقاف عضوية المعلمين وأعضاء الجهات.</p></div><span className={styles.countBadge}>{data.memberships.length}</span></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الاسم</th><th>الجهة</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{data.memberships.map((item) => <tr key={item.id}><td>{item.display_name || "—"}</td><td>{item.organization_name}</td><td>{item.email || "—"}</td><td>{item.role}</td><td><span className={`${styles.status} ${item.is_active ? "" : styles.statusOff}`}>{item.is_active ? "نشطة" : "موقوفة"}</span></td><td><button className={item.is_active ? styles.dangerButton : styles.secondaryButton} disabled={busyId === item.id} onClick={() => toggleMembership(item)}>{item.is_active ? "إيقاف" : "تفعيل"}</button></td></tr>)}</tbody></table></div></section>}

        {tab === "gifts" && <section className={styles.section}><div className={styles.sectionHead}><div><h3>آخر الهدايا</h3><p>حالة الفتح والمرسل وتكلفة الهدية.</p></div><span className={styles.countBadge}>{data.recent_gifts.length}</span></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الهدية</th><th>الطفل</th><th>الأسرة</th><th>الإنجاز</th><th>المرسل</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>{data.recent_gifts.map((item) => <tr key={item.id}><td>{item.gift_name}</td><td>{item.student_name}</td><td>{item.organization_name}</td><td>{item.achievement_title}</td><td>{item.sender_name}</td><td><span className={`${styles.status} ${item.opened_at ? "" : styles.statusWarn}`}>{item.opened_at ? "فُتحت" : "لم تُفتح"}</span></td><td>{formatDate(item.gifted_at)}</td></tr>)}</tbody></table></div></section>}
      </div>
    </main>
  );
}
