"use client";

import { useEffect } from "react";

export default function QuranTaskFormBridge() {
  useEffect(() => {
    function updateGenericTaskForm() {
      const options = Array.from(document.querySelectorAll<HTMLOptionElement>('select option[value="quran"]'));
      for (const option of options) {
        const select = option.parentElement as HTMLSelectElement | null;
        if (!select || select.closest("[class*='QuranTaskPlanner']")) continue;
        option.disabled = true;
        option.textContent = "📖 قرآن — استخدم نموذج المهمة القرآنية المجزأة أعلاه";
        if (select.value === "quran") {
          select.value = "behavior";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    updateGenericTaskForm();
    const observer = new MutationObserver(updateGenericTaskForm);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
