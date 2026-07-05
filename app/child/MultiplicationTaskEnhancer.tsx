"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Stage = {
  table_number: number;
  status: "locked" | "available" | "completed";
  attempts_count: number;
  best_score: number;
};

type Program = {
  id: string;
  task_id: string;
  task_status?: string | null;
  from_table: number;
  to_table: number;
  status: "active" | "completed";
  current_table: number;
  completed_tables: number;
  total_tables: number;
  stages?: Stage[];
};

function progressPercent(program: Program) {
  if (!program.total_tables) return 0;
  return Math.min(100, Math.max(0, Math.round((program.completed_tables / program.total_tables) * 100)));
}

function renderKey(program: Program) {
  const stagesKey = (program.stages || []).map((stage) => `${stage.table_number}-${stage.best_score}-${stage.attempts_count}-${stage.status}`).join("|");
  return [program.id, program.status, program.task_status || "", program.current_table, program.completed_tables, program.total_tables, stagesKey].join(":");
}

function reportMarkup(program: Program) {
  const stages = [...(program.stages || [])].sort((a, b) => a.table_number - b.table_number);
  if (program.status !== "completed" || stages.length === 0) return "";

  const completedStages = stages.filter((stage) => stage.status === "completed");
  const average = completedStages.length
    ? Math.round(completedStages.reduce((sum, stage) => sum + Number(stage.best_score || 0), 0) / completedStages.length)
    : 0;
  const weakest = [...completedStages]
    .sort((a, b) => Number(a.best_score || 0) - Number(b.best_score || 0) || Number(b.attempts_count || 0) - Number(a.attempts_count || 0))
    .slice(0, 3);

  return `
    <details class="multiplication-task-report" open>
      <summary>
        <span>📊 تقرير الإنجاز وتقييم الجداول</span>
        <strong>${average}%</strong>
      </summary>
      <div class="multiplication-task-report-body">
        <div class="multiplication-task-report-summary">
          <span>النتيجة العامة</span>
          <strong>${average}%</strong>
          <small>متوسط أفضل نتيجة في جميع الجداول</small>
        </div>
        <div class="multiplication-table-results">
          ${stages.map((stage) => {
            const score = Math.max(0, Math.min(100, Number(stage.best_score || 0)));
            const level = score >= 80 ? "strong" : score >= 60 ? "medium" : "weak";
            return `<div class="multiplication-table-result ${level}">
              <span>جدول ${stage.table_number}</span>
              <div><i style="width:${score}%"></i></div>
              <strong>${score}%</strong>
              <small>${stage.attempts_count || 0} محاولة</small>
            </div>`;
          }).join("")}
        </div>
        <div class="multiplication-weak-tables">
          <strong>🎯 الجداول التي تحتاج مراجعة أكثر</strong>
          <div>${weakest.map((stage) => `<span>جدول ${stage.table_number} · ${stage.best_score}%</span>`).join("") || "<span>لا توجد نقاط ضعف واضحة، أداء ممتاز.</span>"}</div>
        </div>
      </div>
    </details>
  `;
}

function multiplicationPanel(program: Program) {
  const progress = progressPercent(program);
  const completed = program.status === "completed";
  const submitted = program.task_status === "submitted" || program.task_status === "approved";
  return `
    <div class="multiplication-task-progress-head">
      <strong>${completed ? "اكتملت المغامرة" : `التقدم العام · جدول ${program.current_table}`}</strong>
      <span>${progress}%</span>
    </div>
    <div class="multiplication-task-progress"><span style="width:${progress}%"></span></div>
    <div class="multiplication-task-stats">
      <span>${program.completed_tables} من ${program.total_tables} جداول مكتملة</span>
      <span>من جدول ${program.from_table} إلى ${program.to_table}</span>
    </div>
    ${completed
      ? `<div class="multiplication-task-complete">🏆 تم إنجاز مغامرة جدول الضرب بنجاح، وسيبقى التقرير محفوظًا هنا داخل مهامي.</div>`
      : '<div class="multiplication-task-lock">🔒 لا يمكن إنجاز هذه المهمة إلا بعد إنهاء كامل تحدي جدول الضرب.</div>'}
    ${reportMarkup(program)}
    <a class="multiplication-task-start" data-program-id="${program.id}" href="/child/multiplication/${program.id}">
      ${completed ? submitted ? "عرض تقرير الإنجاز" : "إرسال الإنجاز لولي الأمر" : program.completed_tables > 0 ? "متابعة التحدي" : "ابدأ التحدي"}
    </a>
  `;
}

function buildStandaloneCard(program: Program) {
  const card = document.createElement("article");
  const completed = program.status === "completed" || program.task_status === "approved";
  card.className = `child-task-card child-task-card-simple task-${completed ? "approved" : "pending"} ${completed ? "" : "task-current"} multiplication-standalone-card`;
  card.dataset.multiplicationTask = "true";
  card.dataset.multiplicationProgramId = program.id;
  card.dataset.multiplicationRenderKey = renderKey(program);
  card.innerHTML = `
    <div class="child-task-head">
      <span class="task-round-icon category-educational">${completed ? "🏆" : "✖️"}</span>
      <div>
        <div class="task-stage-row"><span class="task-status task-status-${completed ? "approved" : "pending"}">${completed ? "مكتملة" : "تعليمية"}</span></div>
        <h3>مغامرة أبطال جدول الضرب</h3>
      </div>
    </div>
    <p class="task-description">أكمل جميع مراحل جدول الضرب من ${program.from_table} إلى ${program.to_table}، وراجع تقييم كل جدول ونقاط الضعف من التقرير المحفوظ.</p>
    <div class="multiplication-task-inline">${multiplicationPanel(program)}</div>
  `;
  return card;
}

export default function MultiplicationTaskEnhancer() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let programs = new Map<string, Program>();
    let scheduled = false;

    function ensureStandaloneCard(program: Program) {
      if (document.querySelector(`[data-multiplication-program-id="${program.id}"]`)) return;
      const tasksSection = document.querySelector<HTMLElement>(".child-tasks-section");
      if (!tasksSection) return;

      tasksSection.querySelector<HTMLElement>(".child-friendly-empty")?.remove();

      let target = tasksSection.querySelector<HTMLElement>(".child-plan-groups");
      if (!target) {
        target = document.createElement("div");
        target.className = "child-plan-groups multiplication-generated-groups";
        tasksSection.appendChild(target);
      }
      target.prepend(buildStandaloneCard(program));
    }

    function enhanceCards() {
      scheduled = false;
      if (disposed || programs.size === 0) return;
      const seenPrograms = new Set<string>();

      document.querySelectorAll<HTMLElement>(".child-task-card").forEach((card) => {
        const heading = card.querySelector("h3")?.textContent?.trim();
        if (heading !== "مغامرة أبطال جدول الضرب") return;

        const existingProgramId = card.dataset.multiplicationProgramId;
        const taskId = card.getAttribute("data-task-id") || "";
        let program = existingProgramId ? [...programs.values()].find((item) => item.id === existingProgramId) : undefined;
        program = program || (taskId ? programs.get(taskId) : undefined);

        if (!program) program = [...programs.values()].find((item) => !seenPrograms.has(item.id));
        if (!program) return;

        seenPrograms.add(program.id);
        const key = renderKey(program);
        if (card.dataset.multiplicationRenderKey === key) return;

        card.dataset.multiplicationTask = "true";
        card.dataset.multiplicationProgramId = program.id;
        card.dataset.multiplicationRenderKey = key;
        card.querySelector(".child-task-submit-box")?.remove();

        let panel = card.querySelector<HTMLElement>(".multiplication-task-inline");
        if (!panel) {
          panel = document.createElement("div");
          panel.className = "multiplication-task-inline";
          card.appendChild(panel);
        }
        panel.innerHTML = multiplicationPanel(program);
      });

      [...programs.values()].forEach((program) => ensureStandaloneCard(program));
    }

    function scheduleEnhance() {
      if (scheduled || disposed) return;
      scheduled = true;
      window.requestAnimationFrame(enhanceCards);
    }

    async function loadPrograms() {
      if (!supabase) return;
      const token = localStorage.getItem("namaa_child_token");
      if (!token) return;
      const result = await supabase.rpc("get_child_multiplication_programs", { p_session_token: token });
      if (disposed || result.error) return;
      programs = new Map(((result.data || []) as Program[]).map((program) => [program.task_id, program]));
      scheduleEnhance();
    }

    function handleChallengeClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest<HTMLAnchorElement>(".multiplication-task-start");
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(link.getAttribute("href") || `/child/multiplication/${link.dataset.programId}`);
    }

    void loadPrograms();
    document.addEventListener("click", handleChallengeClick, true);
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("click", handleChallengeClick, true);
    };
  }, [router]);

  return null;
}
