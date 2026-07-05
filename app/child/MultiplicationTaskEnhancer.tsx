"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

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
};

function progressPercent(program: Program) {
  if (!program.total_tables) return 0;
  return Math.min(100, Math.max(0, Math.round((program.completed_tables / program.total_tables) * 100)));
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
      ? `<div class="multiplication-task-complete">🏆 انتهى التحدي. ${submitted ? "تم إرسال الإنجاز لولي الأمر." : "افتح صفحة التحدي واضغط إنجاز المهمة لإرسالها لولي الأمر."}</div>`
      : '<div class="multiplication-task-lock">🔒 لا يمكن إنجاز هذه المهمة إلا بعد إنهاء كامل تحدي جدول الضرب.</div>'}
    <a class="multiplication-task-start" href="/child/multiplication/${program.id}">
      ${completed ? submitted ? "عرض الإنجاز" : "إرسال الإنجاز" : program.completed_tables > 0 ? "متابعة التحدي" : "ابدأ التحدي"}
    </a>
  `;
}

function buildStandaloneCard(program: Program) {
  const card = document.createElement("article");
  card.className = "child-task-card child-task-card-simple task-pending task-current multiplication-standalone-card";
  card.dataset.multiplicationTask = "true";
  card.dataset.multiplicationProgramId = program.id;
  card.innerHTML = `
    <div class="child-task-head">
      <span class="task-round-icon category-educational">✖️</span>
      <div>
        <div class="task-stage-row"><span class="task-status task-status-pending">تعليمية</span></div>
        <h3>مغامرة أبطال جدول الضرب</h3>
      </div>
    </div>
    <p class="task-description">أكمل جميع مراحل جدول الضرب من ${program.from_table} إلى ${program.to_table}، ثم أرسل الإنجاز لولي الأمر من صفحة التحدي.</p>
    <div class="multiplication-task-inline">${multiplicationPanel(program)}</div>
  `;
  return card;
}

export default function MultiplicationTaskEnhancer() {
  useEffect(() => {
    let disposed = false;
    let programs = new Map<string, Program>();

    function ensureStandaloneCard(program: Program) {
      if (document.querySelector(`[data-multiplication-program-id=\"${program.id}\"]`)) return;
      const tasksSection = document.querySelector<HTMLElement>(".child-tasks-section");
      if (!tasksSection) return;

      const empty = tasksSection.querySelector<HTMLElement>(".child-friendly-empty");
      empty?.remove();

      let target = tasksSection.querySelector<HTMLElement>(".child-plan-groups");
      if (!target) {
        target = document.createElement("div");
        target.className = "child-plan-groups multiplication-generated-groups";
        tasksSection.appendChild(target);
      }
      target.prepend(buildStandaloneCard(program));
    }

    function enhanceCards() {
      if (disposed || programs.size === 0) return;
      const seenPrograms = new Set<string>();

      document.querySelectorAll<HTMLElement>(".child-task-card").forEach((card) => {
        const heading = card.querySelector("h3")?.textContent?.trim();
        if (heading !== "مغامرة أبطال جدول الضرب") return;

        const existingProgramId = card.dataset.multiplicationProgramId;
        const taskId = card.getAttribute("data-task-id") || "";
        let program = existingProgramId ? [...programs.values()].find((item) => item.id === existingProgramId) : undefined;
        program = program || (taskId ? programs.get(taskId) : undefined);

        if (!program) {
          const candidates = [...programs.values()].filter((item) => !seenPrograms.has(item.id));
          program = candidates[0];
        }
        if (!program) return;

        seenPrograms.add(program.id);
        card.dataset.multiplicationTask = "true";
        card.dataset.multiplicationProgramId = program.id;
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

    async function loadPrograms() {
      if (!supabase) return;
      const token = localStorage.getItem("namaa_child_token");
      if (!token) return;
      const result = await supabase.rpc("get_child_multiplication_programs", { p_session_token: token });
      if (disposed || result.error) return;
      programs = new Map(((result.data || []) as Program[]).map((program) => [program.task_id, program]));
      enhanceCards();
    }

    void loadPrograms();
    const observer = new MutationObserver(enhanceCards);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
