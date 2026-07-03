"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Goal = {
  id: string;
  title: string | null;
  description: string | null;
  goal_type: string;
  status: string;
  progress: number | null;
  due_date: string | null;
  decision_note: string | null;
  reward_status: string | null;
  reward_grant_note: string | null;
  task_plan_mode: string | null;
};

type Task = {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  starts_on: string | null;
  due_date: string | null;
  plan_batch_id: string | null;
  plan_step: number | null;
  plan_total: number | null;
  generated_from_goal: boolean;
  generated_from_quran_task: boolean;
  quran_mode: "recitation" | "memorization" | null;
  surah_number: number | null;
  from_ayah: number | null;
  to_ayah: number | null;
  quran_text: string | null;
  quran_plan_title: string | null;
  review_note: string | null;
};

type Data = {
  student: { full_name: string; level: { name: string; icon: string } };
  goals: Goal[];
  tasks: Task[];
};

type Tab = "home" | "tasks" | "progress" | "goals";
type Group = { key: string; goal: Goal | null; title: string; quranMode: Task["quran_mode"]; tasks: Task[] };

const goalLabels: Record<string, string> = {
  requested: "بانتظار موافقة ولي الأمر",
  pending: "بانتظار موافقة ولي الأمر",
  approved: "نشط",
  active: "نشط",
  paused: "متوقف مؤقتًا",
  completed: "مكتمل",
  rejected: "لم تتم الموافقة"
};

const taskLabels: Record<string, string> = {
  pending: "مطلوبة",
  submitted: "بانتظار المراجعة",
  approved: "مكتملة",
  rejected: "أعد المحاولة"
};

const taskIcons: Record<string, string> = {
  behavior: "🌟",
  educational: "📚",
  home: "🏠",
  other: "✨",
  quran_task: "📖"
};

const goalIcons: Record<string, string> = {
  educational: "🎓",
  behavioral: "🌱",
  financial: "💰",
  material: "🎁"
};

function today() {
  const value = new Date();
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`))
    : "غير محدد";
}

function blocked(task: Task, tasks: Task[]) {
  return Boolean(
    task.plan_batch_id &&
    task.plan_step &&
    task.plan_step > 1 &&
    tasks.some((previous) => previous.plan_step && previous.plan_step < task.plan_step! && previous.status !== "approved")
  );
}

function actionable(task: Task, tasks: Task[], currentDate: string) {
  return ["pending", "rejected"].includes(task.status) &&
    (!task.starts_on || task.starts_on <= currentDate) &&
    !blocked(task, tasks);
}

export default function ChildDashboardPage() {
  const router = useRouter();
  const currentDate = today();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [showGoal, setShowGoal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState("educational");
  const [target, setTarget] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) {
      router.replace("/child/login");
      return;
    }

    const result = await supabase.rpc("get_child_dashboard", { p_session_token: token });
    if (result.error || !result.data) {
      localStorage.removeItem("namaa_child_token");
      router.replace("/child/login");
      return;
    }

    setData(result.data as Data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const groups = useMemo<Group[]>(() => {
    if (!data) return [];
    const map = new Map<string, Group>();

    data.tasks.filter((task) => task.category !== "quran").forEach((task) => {
      const key = task.goal_id
        ? `goal:${task.goal_id}`
        : task.plan_batch_id
          ? `batch:${task.plan_batch_id}`
          : "general";
      const goal = task.goal_id ? data.goals.find((item) => item.id === task.goal_id) || null : null;
      const groupTitle = goal?.title || task.quran_plan_title || "مهام مستقلة";

      if (!map.has(key)) {
        map.set(key, { key, goal, title: groupTitle, quranMode: task.quran_mode, tasks: [] });
      }
      map.get(key)?.tasks.push(task);
    });

    return [...map.values()].map((group) => ({
      ...group,
      tasks: group.tasks.sort((first, second) => Number(first.plan_step || 999) - Number(second.plan_step || 999))
    }));
  }, [data]);

  const tasks = groups.flatMap((group) => group.tasks);
  const ready = groups.flatMap((group) => group.tasks.filter((task) => actionable(task, group.tasks, currentDate)));
  const done = tasks.filter((task) => task.status === "approved").length;
  const waiting = tasks.filter((task) => task.status === "submitted").length;
  const activeGoals = data?.goals.filter((goal) => ["approved", "active", "paused"].includes(goal.status)) || [];
  const taskProgress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const goalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / activeGoals.length)
    : 0;

  function go(nextTab: Tab) {
    setTab(nextTab);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function logout() {
    localStorage.removeItem("namaa_child_token");
    localStorage.removeItem("namaa_child_name");
    router.replace("/child/login");
  }

  async function sendGoal(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token || title.trim().length < 3) {
      setError("اكتب عنوانًا واضحًا للهدف.");
      return;
    }

    setSaving(true);
    const result = await supabase.rpc("child_request_goal", {
      p_session_token: token,
      p_title: title.trim(),
      p_description: description.trim(),
      p_goal_type: goalType,
      p_target_value: target ? Number(target) : null,
      p_required_points: 0,
      p_due_date: due || null
    });
    setSaving(false);

    if (result.error) {
      setError("تعذر إرسال الهدف الآن.");
      return;
    }

    setTitle("");
    setDescription("");
    setGoalType("educational");
    setTarget("");
    setDue("");
    setShowGoal(false);
    setMessage("تم إرسال الهدف إلى ولي الأمر للموافقة.");
    await load();
  }

  async function submitTask(taskId: string) {
    if (!supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;

    setBusy(taskId);
    const result = await supabase.rpc("child_submit_task", {
      p_session_token: token,
      p_task_id: taskId,
      p_child_note: notes[taskId] || ""
    });
    setBusy("");

    if (result.error) {
      setError(result.error.message.includes("المرحلة السابقة") ? "أكمل الجزء السابق وانتظر اعتماده أولًا." : "تعذر إرسال المهمة الآن.");
      return;
    }

    setNotes((current) => ({ ...current, [taskId]: "" }));
    setMessage("رائع! تم إرسال الجزء للمراجعة.");
    await load();
  }

  function taskCard(task: Task, groupTasks: Task[]) {
    const future = Boolean(task.starts_on && task.starts_on > currentDate);
    const locked = (future || blocked(task, groupTasks)) && !["approved", "submitted"].includes(task.status);
    const canSubmit = actionable(task, groupTasks, currentDate);
    const modeLabel = task.quran_mode === "memorization" ? "حفظ" : task.quran_mode === "recitation" ? "تلاوة" : null;

    return (
      <article className={`child-task-card child-task-card-simple task-${task.status} ${locked ? "task-locked" : ""} ${canSubmit ? "task-current" : ""}`} key={task.id}>
        <div className="child-task-head">
          <span className={`task-round-icon category-${task.category}`}>{locked ? "🔒" : taskIcons[task.category] || "✨"}</span>
          <div>
            <div className="task-stage-row">
              <span className={`task-status task-status-${task.status}`}>{locked ? "قادمة" : taskLabels[task.status] || task.status}</span>
              {modeLabel && <b className="quran-task-mode-chip">{modeLabel}</b>}
              {task.plan_step && <b>الجزء {task.plan_step} من {task.plan_total}</b>}
            </div>
            <h3>{task.title}</h3>
          </div>
          {task.due_date && <time>{formatDate(task.due_date)}</time>}
        </div>

        {task.quran_text && (
          <div className="child-quran-task-text" dir="rtl">
            <span>{modeLabel === "حفظ" ? "مقطع الحفظ" : "مقطع التلاوة"}</span>
            <p>{task.quran_text}</p>
          </div>
        )}
        {task.description && <p className="task-description">{task.description}</p>}
        {task.review_note && <div className="task-note review"><strong>ملاحظة المراجع</strong><p>{task.review_note}</p></div>}

        {canSubmit && (
          <div className="child-task-submit-box">
            <textarea rows={2} value={notes[task.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder={task.quran_mode === "memorization" ? "اكتب ملاحظة عن الحفظ أو التسميع" : "اكتب باختصار ماذا أنجزت"} />
            <button type="button" disabled={busy === task.id} onClick={() => void submitTask(task.id)}>{busy === task.id ? "جارٍ الإرسال..." : "تم الإنجاز"}</button>
          </div>
        )}

        {future && task.status !== "approved" && <div className="child-goal-note task-lock-note">يفتح في {formatDate(task.starts_on)}</div>}
        {!future && blocked(task, groupTasks) && task.status !== "approved" && <div className="child-goal-note task-lock-note">يفتح بعد اعتماد الجزء السابق.</div>}
        {task.status === "submitted" && <div className="child-goal-note">بانتظار مراجعة ولي الأمر.</div>}
        {task.status === "approved" && <div className="child-goal-note success">أحسنت، تم اعتماد هذا الجزء.</div>}
      </article>
    );
  }

  if (loading || !data) return <main className="dashboard-loading">جارٍ تجهيز حساب الطفل...</main>;

  return (
    <main className="child-app-page child-app-refresh child-dashboard-v3">
      <header className="child-app-header">
        <div><span className="section-label">حسابي</span><h1>مرحبًا {data.student.full_name} 👋</h1></div>
        <button className="quiet-button child-logout-button" type="button" onClick={logout}>خروج</button>
      </header>

      {error && <p className="form-message error-message floating-message">{error}</p>}
      {message && <p className="form-message success-message floating-message">{message}</p>}

      {tab === "home" && (
        <div className="child-tab-panel child-home-panel child-home-v3">
          <section className="child-hero-card child-welcome-card">
            <div><span className="child-level-chip">{data.student.level.icon} {data.student.level.name}</span><h2>اختر ما تريد إنجازه الآن</h2><p>كل قسم مستقل وواضح حتى تركز على خطوة واحدة في كل مرة.</p></div>
            <div className="child-today-summary"><strong>{ready.length}</strong><span>مهام جاهزة الآن</span></div>
          </section>

          <section className="child-main-sections" aria-label="أقسام حساب الطفل">
            <button type="button" className="child-main-section section-tasks" onClick={() => go("tasks")}><span>✅</span><div><strong>مهامي</strong><small>المهام المسندة من ولي الأمر أو المعلم</small></div><b>{ready.length}</b></button>
            <Link className="child-main-section section-quran" href="/child/quran"><span>📖</span><div><strong>الحفظ والبرامج</strong><small>القرآن والمتون والبرامج العلمية</small></div><b>←</b></Link>
            <button type="button" className="child-main-section section-progress" onClick={() => go("progress")}><span>🚀</span><div><strong>تقدمي</strong><small>متابعة واضحة ومحفزة لإنجازاتي</small></div><b>{taskProgress}%</b></button>
            <Link className="child-main-section section-gifts" href="/child/gifts"><span>🎁</span><div><strong>هداياي</strong><small>الهدايا وأسبابها وذكريات الإنجاز</small></div><b>←</b></Link>
            <button type="button" className="child-main-section section-goals" onClick={() => go("goals")}><span>🎯</span><div><strong>أهدافي</strong><small>اطلب هدفًا وتابع موافقة ولي الأمر</small></div><b>{data.goals.length}</b></button>
            <Link className="child-main-section section-notifications" href="/child/notifications"><span>🔔</span><div><strong>إشعاراتي</strong><small>ردود المعلم وولي الأمر والتكليفات الجديدة</small></div><b>←</b></Link>
          </section>

          {ready[0] && <section className="child-next-action-card"><div className="child-section-head"><div><span className="section-label">الخطوة التالية</span><h2>{ready[0].title}</h2></div><span>{taskIcons[ready[0].category] || "✨"}</span></div><p>{ready[0].description || (ready[0].quran_mode ? "هذا الجزء القرآني جاهز للإنجاز الآن." : "هذه المهمة جاهزة للإنجاز الآن.")}</p><button type="button" onClick={() => go("tasks")}>فتح المهمة</button></section>}
        </div>
      )}

      {tab === "tasks" && (
        <section className="child-tab-panel child-goals-section child-tasks-section child-plan-workspace child-simple-section-page">
          <div className="child-section-head"><div><span className="section-label">مهامي</span><h2>المهام المسندة إليّ</h2><p>تشمل المهام العامة ومهام التلاوة والحفظ المجزأة.</p></div><span className="section-color-icon">✅</span></div>
          {groups.length === 0 ? (
            <div className="child-friendly-empty"><span>🌤️</span><strong>لا توجد مهام الآن</strong><p>ستظهر هنا المهام التي يرسلها ولي الأمر أو المعلم.</p></div>
          ) : (
            <div className="child-plan-groups">
              {groups.map((group) => {
                const approvedCount = group.tasks.filter((task) => task.status === "approved").length;
                const progress = Math.round((approvedCount / group.tasks.length) * 100);
                const current = group.tasks.filter((task) => !((task.starts_on && task.starts_on > currentDate) || blocked(task, group.tasks)) && !["approved", "submitted"].includes(task.status));
                const upcoming = group.tasks.filter((task) => ((task.starts_on && task.starts_on > currentDate) || blocked(task, group.tasks)) && !["approved", "submitted"].includes(task.status));
                const history = group.tasks.filter((task) => ["approved", "submitted"].includes(task.status));
                const programLabel = group.quranMode === "memorization" ? "خطة حفظ" : group.quranMode === "recitation" ? "خطة تلاوة" : group.goal ? "مهام هدف" : "مهام مستقلة";

                return (
                  <section className={`child-plan-group child-task-program-card ${group.quranMode ? "child-quran-task-program" : ""}`} key={group.key}>
                    <div className="child-plan-header"><div><span>{programLabel}</span><h3>{group.title}</h3><p>{approvedCount} من {group.tasks.length} أجزاء معتمدة</p></div><strong>{progress}%</strong></div>
                    <div className="child-plan-progress"><span style={{ width: `${progress}%` }} /></div>
                    {current.length > 0 && <div className="child-task-list child-plan-task-list">{current.map((task) => taskCard(task, group.tasks))}</div>}
                    {upcoming.length > 0 && <details className="child-upcoming-tasks-fold"><summary><div className="child-upcoming-summary-main"><span>🔒</span><div><strong>الأجزاء القادمة</strong><small>تفتح حسب التاريخ وبعد اعتماد الجزء السابق</small></div></div><div className="child-upcoming-summary-side"><b>{upcoming.length}</b><span className="child-upcoming-chevron">⌄</span></div></summary><div className="child-task-list child-plan-task-list child-upcoming-task-list">{upcoming.map((task) => taskCard(task, group.tasks))}</div></details>}
                    {history.length > 0 && <details className="child-upcoming-tasks-fold child-task-history-fold"><summary><div className="child-upcoming-summary-main"><span>✅</span><div><strong>المنجزة والمراجعة</strong><small>الأجزاء التي أرسلتها أو تم اعتمادها</small></div></div><div className="child-upcoming-summary-side"><b>{history.length}</b><span className="child-upcoming-chevron">⌄</span></div></summary><div className="child-task-list child-plan-task-list">{history.map((task) => taskCard(task, group.tasks))}</div></details>}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "progress" && (
        <section className="child-tab-panel child-goals-section child-progress-page child-simple-section-page">
          <div className="child-section-head"><div><span className="section-label">تقدمي</span><h2>رحلة إنجازي</h2><p>نظرة بسيطة على ما أنجزته وما بقي أمامك.</p></div><span className="section-color-icon">🚀</span></div>
          <div className="child-progress-summary-grid"><article><span>✅</span><strong>{done}</strong><small>مهام مكتملة</small></article><article><span>⏳</span><strong>{waiting}</strong><small>بانتظار المراجعة</small></article><article><span>🎯</span><strong>{activeGoals.length}</strong><small>أهداف نشطة</small></article></div>
          <article className="child-big-progress-card"><div><span>تقدم المهام</span><strong>{taskProgress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${taskProgress}%` }} /></div><p>{tasks.length ? `أكملت ${done} من ${tasks.length} مهمة.` : "ستبدأ رحلة التقدم عند وصول أول مهمة."}</p></article>
          <article className="child-big-progress-card goal-progress-card"><div><span>متوسط تقدم الأهداف</span><strong>{goalProgress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${goalProgress}%` }} /></div><button type="button" onClick={() => go("goals")}>عرض أهدافي</button></article>
          <Link className="child-progress-program-link" href="/child/quran"><span>📖</span><div><strong>تقدم برامج الحفظ</strong><small>افتح كل برنامج لمتابعة المقاطع المتقنة والقادمة.</small></div><b>←</b></Link>
        </section>
      )}

      {tab === "goals" && (
        <section className="child-tab-panel child-goals-section child-simple-section-page">
          <div className="child-section-head"><div><span className="section-label">أهدافي</span><h2>أهدافي الحالية</h2><p>اطلب هدفًا، ثم يتولى ولي الأمر تحديد الخطة والمكافأة المناسبة.</p></div><button className="color-add-button" type="button" onClick={() => setShowGoal((current) => !current)}>{showGoal ? "إغلاق" : "+ هدف جديد"}</button></div>
          {showGoal && <div className="child-goal-request-card embedded-goal-form"><h2>ما الهدف الذي تريد تحقيقه؟ 🌟</h2><form className="auth-form" onSubmit={sendGoal}><label>عنوان الهدف<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: أريد شراء دراجة" required /></label><label>لماذا تريد هذا الهدف؟<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="اكتب وصفًا مختصرًا" /></label><label>نوع الهدف<select value={goalType} onChange={(event) => setGoalType(event.target.value)}><option value="educational">🎓 تعليمي</option><option value="behavioral">🌱 سلوكي</option><option value="financial">💰 مالي</option><option value="material">🎁 عيني</option></select></label><div className="form-grid-two"><label>القيمة المتوقعة (اختياري)<input type="number" min="0" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} /></label><label>التاريخ المقترح<input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label></div><button className="auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}</button></form></div>}
          {data.goals.length === 0 ? <div className="child-friendly-empty"><span>🌈</span><strong>لا توجد أهداف بعد</strong><p>ابدأ بطلب هدف جديد من ولي الأمر.</p></div> : <div className="goals-list">{data.goals.map((goal) => { const progress = Math.min(100, Math.max(0, Number(goal.progress || 0))); const paid = goal.reward_status === "paid"; const dueReward = goal.status === "completed" && !paid; return <article className="goal-card child-goal-card child-goal-card-simple" key={goal.id}><div className="goal-card-head"><div className="goal-title-with-icon"><span className={`goal-round-icon goal-${goal.goal_type}`}>{goalIcons[goal.goal_type] || "🎯"}</span><div><span className={`goal-status goal-status-${goal.status}`}>{goalLabels[goal.status] || goal.status}</span><h3>{goal.title || "هدف بدون عنوان"}</h3></div></div>{goal.due_date && <time>{formatDate(goal.due_date)}</time>}</div>{goal.description && <p className="goal-description">{goal.description}</p>}<div className="progress-row"><div className="progress-row-head"><span>التقدم</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>{goal.status === "rejected" && <div className="child-goal-note rejected">{goal.decision_note || "يمكنك مناقشة الهدف مع ولي الأمر وتعديله."}</div>}{dueReward && <div className="child-reward-celebration"><span>🏆</span><div><strong>أكملت الهدف!</strong><p>المكافأة تنتظر تسليم ولي الأمر.</p></div></div>}{paid && <div className="child-reward-celebration paid"><span>🎁</span><div><strong>تم منحك المكافأة</strong><p>{goal.reward_grant_note || "مبارك لك إكمال الهدف!"}</p></div></div>}</article>; })}</div>}
        </section>
      )}

      <nav className="child-bottom-nav child-bottom-nav-v3" aria-label="التنقل الرئيسي للطفل">
        <button className={tab === "home" ? "active" : ""} type="button" onClick={() => go("home")}><span>🏠</span><small>الرئيسية</small></button>
        <button className={tab === "tasks" ? "active" : ""} type="button" onClick={() => go("tasks")}><span>✅</span><small>مهامي</small>{ready.length > 0 && <b>{ready.length}</b>}</button>
        <Link href="/child/quran"><span>📖</span><small>حفظي</small></Link>
        <button className={tab === "progress" ? "active" : ""} type="button" onClick={() => go("progress")}><span>🚀</span><small>تقدمي</small></button>
        <Link href="/child/gifts"><span>🎁</span><small>هداياي</small></Link>
      </nav>
    </main>
  );
}
