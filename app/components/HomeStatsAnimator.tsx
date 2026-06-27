"use client";

import { useEffect } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function animateCounter(element: HTMLElement, target: number, prefix: string, suffix: string) {
  const duration = target >= 1_000_000 ? 1800 : target >= 100_000 ? 1550 : 1300;
  const start = performance.now();

  function frame(now: number) {
    const elapsed = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 4);
    const current = Math.round(target * eased);
    element.textContent = `${prefix}${formatNumber(current)}${suffix}`;

    if (elapsed < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export default function HomeStatsAnimator() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".namaa-stats");
    if (!section || section.dataset.animated === "true") return;

    const counters = Array.from(section.querySelectorAll<HTMLElement>("article strong"));
    const values = counters.map((counter) => {
      const original = counter.textContent?.trim() || "0";
      const target = Number(original.replace(/[^0-9]/g, "")) || 0;
      const prefix = original.startsWith("+") ? "+" : "";
      const suffix = original.endsWith("+") ? "+" : "";
      counter.dataset.originalValue = original;
      counter.textContent = `${prefix}0${suffix}`;
      return { counter, target, prefix, suffix };
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        section.dataset.animated = "true";
        section.classList.add("stats-visible");

        values.forEach(({ counter, target, prefix, suffix }, index) => {
          window.setTimeout(() => animateCounter(counter, target, prefix, suffix), 180 + index * 150);
        });

        observer.disconnect();
      },
      { threshold: 0.3, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return null;
}
