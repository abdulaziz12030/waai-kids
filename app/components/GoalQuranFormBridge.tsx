"use client";

import { useEffect } from "react";

export default function GoalQuranFormBridge() {
  useEffect(() => {
    function updateGenericGoalPlanner() {
      const options = Array.from(document.querySelectorAll<HTMLOptionElement>('select option[value="quran"]'));
      for (const option of options) {
        if (option.dataset.goalQuranPlannerRedirect === "true") continue;
        const select = option.parentElement as HTMLSelectElement | null;
        if (!select) continue;

        option.dataset.goalQuranPlannerRedirect = "true";
        option.disabled = true;
        option.textContent = "📖 قرآن — استخدم لوحة التحويل القرآني أعلاه";

        if (select.value === "quran") {
          select.value = "educational";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    updateGenericGoalPlanner();
    const observer = new MutationObserver(updateGenericGoalPlanner);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
