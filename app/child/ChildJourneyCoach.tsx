"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type ChildTask = {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  achievement_points: number;
  reward_points: number;
  status: string;
  starts_on: string | null;
  due_date: string | null;
  plan_step: number | null;
  plan_total: number | null;
  generated_from_goal: boolean;
};

type ChildGoal = {
  id: string;
  title: string | null;
  status: string;
  progress: number | null;
};

type ChildDashboard = {
  student: {
    full_name: string;
    achievement_points: number;
    reward_points: number;
    level: { name: string; icon: string };
  };
  tasks: ChildTask[];
  goals: ChildGoal[];
};

const taskIcons: Record<string, string> = {
  behavior: "🌟",
  educational: "📚",
  quran: "📖",
  home: "🏠",
  other: "✨"
};

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function isBlocked(task: ChildTask, tasks: ChildTask[]) {
  if (!task.generated_from_goal || !task.plan_step || task.plan_step <= 1) return false;
  return tasks.some((item) => item.goal_id === task.goal_id && item.plan_step && item.plan_step < task.plan_step && item.status !== "approved");
}

export default function ChildJourneyCoach() {
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [data, setData] = useState<ChildDashboard | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const token = localStorage.getItem("namaa_child_token");
    if (!supabase || !token) return;
    const result = await supabase.rpc("get_child_dashboard", { p_session_token: token });
    if (!result.error && result.data) setData(result.data as ChildDashboard);
  }

  useEffect(() => {
    if (pathname !== "/child") {
      setTarget(null);
      return;
    }

    void load();
    const frame = window.requestAnimationFrame(() => {
      setTarget(document.querySelector<HTMLElement>(".child-home-panel"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  const primaryTask = useMemo(() => {
    if (!data) return null;
    const today = todayIso();
    return data.tasks.find((task) => {
      if (!["pending", "rejected"].includes(task.status)) return false;
      if (task.starts_on && task.starts_on > today) return false;
      return !isBlocked(task, data.tasks);
    }) || null;
  }, [data]);

  const currentGoal = useMemo(() => {
    if (!data) return null;
    return data.goals.find((goal) => ["approved", "active", "paused"].includes(goal.status)) || null;
  }, [data]);

  function openTab(index: number) {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".child-bottom-nav button");
    buttons[index]?.click();
  }

  function openNotifications() {
    document.querySelector<HTMLButtonElement>('button[aria-label^="الإشعارات"]')?.click();
  }

  async function submitPrimaryTask() {
    if (!primaryTask || !supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;

    setBusy(true);
    setMessage("");
    const result = await supabase.rpc("child_submit_task", {
      p_session_token: token,
      p_task_id: primaryTask.id,
      p_child_note: note.trim()
    });
    setBusy(false);

    if (result.error) {
      setMessage("تعذر إرسال المهمة الآن. حاول مرة أخرى.");
      return;
    }

    setNote("");
    setMessage("رائع! أرسلت المهمة إلى ولي الأمر للمراجعة.");
    await load();
  }

  if (pathname !== "/child" || !target || !data) return null;

  return createPortal(
    <div className="daily-journey-home">
      <section className="daily-journey-primary">
        <div className="daily-journey-heading">
          <div>
            <span className="section-label">رحلتي اليوم</span>
            <h2>{primaryTask ? "مهمتي الآن" : "أحسنت يا بطل"}</h2>
            <p>{primaryTask ? "ركّز على هذه المهمة فقط، وبعدها تصبح خطوتك التالية أوضح." : "لا توجد مهمة مطلوبة منك الآن. استمتع بإنجازك وانتظر الخطوة القادمة."}</p>
          </div>
          <span className="daily-journey-icon">{primaryTask ? taskIcons[primaryTask.category] || "✨" : "🎉"}</span>
        </div>

        {primaryTask ? (
          <div className="daily-primary-task">
            <div className="daily-task-meta">
              <span>{primaryTask.plan_step ? `المرحلة ${primaryTask.plan_step} من ${primaryTask.plan_total}` : "مهمة مستقلة"}</span>
              <b>{primaryTask.achievement_points} ⭐ + {primaryTask.reward_points} 💎</b>
            </div>
            <h3>{primaryTask.title}</h3>
            {primaryTask.description && <p>{primaryTask.description}</p>}
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="اكتب باختصار ماذا أنجزت" />
            <button type="button" disabled={busy} onClick={() => void submitPrimaryTask()}>{busy ? "جارٍ الإرسال..." : "أنجزت المهمة ✓"}</button>
          </div>
        ) : (
          <button className="daily-soft-button" type="button" onClick={() => openTab(1)}>عرض خطتي</button>
        )}
        {message && <p className="daily-journey-message">{message}</p>}
      </section>

      <section className="daily-progress-strip" aria-label="تقدمي اليوم">
        <div><span>{data.student.level.icon}</span><strong>{data.student.level.name}</strong><small>مستواي</small></div>
        <div><span>⭐</span><strong>{data.student.achievement_points || 0}</strong><small>إنجاز</small></div>
        <div><span>💎</span><strong>{data.student.reward_points || 0}</strong><small>مكافآت</small></div>
        <button type="button" onClick={() => openTab(2)}><span>🎯</span><strong>{currentGoal ? `${Math.round(Number(currentGoal.progress || 0))}%` : "—"}</strong><small>هدفي</small></button>
      </section>

      <section className="daily-shortcuts">
        <div className="daily-section-title"><span className="section-label">اختصاراتي</span><h2>إلى أين تريد الذهاب؟</h2></div>
        <div className="daily-shortcut-grid">
          <button type="button" onClick={() => openTab(1)}><span>✅</span><strong>خطتي</strong><small>كل المهام</small></button>
          <Link href="/child/quran"><span>📖</span><strong>حفظي</strong><small>القرآن والمتون</small></Link>
          <Link href="/child/gifts"><span>🎁</span><strong>جوائزي</strong><small>الهدايا والتكريم</small></Link>
          <button type="button" onClick={openNotifications}><span>🔔</span><strong>إشعاراتي</strong><small>كل الجديد</small></button>
        </div>
      </section>
    </div>,
    target
  );
}
