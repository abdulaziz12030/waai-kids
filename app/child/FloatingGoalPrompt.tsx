"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function openGoalForm(attempt = 0) {
  const button = document.querySelector<HTMLButtonElement>(".child-goals-section .color-add-button");

  if (button) {
    if (!button.textContent?.includes("إغلاق")) button.click();
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(".embedded-goal-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);
    return;
  }

  if (attempt < 30) window.setTimeout(() => openGoalForm(attempt + 1), 70);
}

export default function FloatingGoalPrompt() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname !== "/child") {
      setShow(false);
      return;
    }

    const sync = () => {
      setShow(Boolean(document.querySelector(".child-dashboard-v3 .child-home-v3")));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  function startGoal() {
    const goalCard = document.querySelector<HTMLButtonElement>(".child-main-section.section-goals");
    if (!goalCard) return;

    setShow(false);
    goalCard.click();
    window.history.replaceState(window.history.state, "", "/child?section=goals&newGoal=1");
    window.setTimeout(() => openGoalForm(), 60);
  }

  if (!show) return null;

  return (
    <button
      className="child-floating-goal-prompt"
      type="button"
      onClick={startGoal}
      aria-label="حدّد هدفك الآن؛ قد تنال تكريمًا أو هدية عند تحقيقه"
    >
      <span className="child-floating-goal-icon" aria-hidden="true">
        <span>🎯</span>
        <i>✨</i>
      </span>
      <span className="child-floating-goal-copy">
        <strong>حدّد هدفك الآن</strong>
        <small>ابدأ إنجازًا جديدًا، فقد ينتظرك تكريم أو هدية عند تحقيقه.</small>
      </span>
      <span className="child-floating-goal-action" aria-hidden="true">ابدأ ←</span>
    </button>
  );
}
