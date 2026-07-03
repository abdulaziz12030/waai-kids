"use client";

import { useEffect } from "react";

export default function GoalQuranFormBridge() {
  useEffect(() => {
    const handlers = new Map<HTMLSelectElement, EventListener>();

    function openQuranPlanner(select: HTMLSelectElement) {
      if (select.value !== "quran") return;

      const panel = document.getElementById("goal-quran-task-planner");
      if (panel && !panel.querySelector("form")) {
        panel.querySelector<HTMLButtonElement>("button")?.click();
      }
      panel?.scrollIntoView({ behavior: "smooth", block: "start" });

      window.setTimeout(() => {
        select.value = "educational";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }, 0);
    }

    function updateGenericGoalPlanner() {
      const options = Array.from(document.querySelectorAll<HTMLOptionElement>('select option[value="quran"]'));
      for (const option of options) {
        const select = option.parentElement as HTMLSelectElement | null;
        if (!select) continue;

        option.textContent = "📖 قرآن — تلاوة أو حفظ مع تقسيم الآيات";

        if (!handlers.has(select)) {
          const handler: EventListener = () => openQuranPlanner(select);
          select.addEventListener("change", handler);
          handlers.set(select, handler);
        }
      }
    }

    updateGenericGoalPlanner();
    const observer = new MutationObserver(updateGenericGoalPlanner);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const [select, handler] of handlers) {
        select.removeEventListener("change", handler);
      }
    };
  }, []);

  return null;
}
