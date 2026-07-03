"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ChildSection = "home" | "tasks" | "quran" | "progress" | "goals" | "gifts" | "notifications";

const dashboardSections: ChildSection[] = ["home", "tasks", "progress", "goals"];

function routeSection(pathname: string): ChildSection {
  if (pathname.startsWith("/child/quran")) return "quran";
  if (pathname.startsWith("/child/gifts")) return "gifts";
  if (pathname.startsWith("/child/notifications")) return "notifications";
  return "home";
}

function detectDashboardSection(): ChildSection {
  const panel = document.querySelector<HTMLElement>(".child-dashboard-v3 .child-tab-panel");
  if (!panel) return "home";
  if (panel.classList.contains("child-home-v3")) return "home";
  if (panel.classList.contains("child-tasks-section")) return "tasks";
  if (panel.classList.contains("child-progress-page")) return "progress";

  const label = panel.querySelector<HTMLElement>(".section-label")?.textContent || "";
  if (label.includes("أهداف")) return "goals";
  return "home";
}

function clickDashboardButton(label: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".child-bottom-nav-v3 button"));
  const button = buttons.find((item) => item.textContent?.includes(label));
  button?.click();
  return Boolean(button);
}

function activateDashboardSection(section: ChildSection) {
  if (!document.querySelector(".child-dashboard-v3")) return false;
  if (section === "home") return clickDashboardButton("الرئيسية");
  if (section === "tasks") return clickDashboardButton("مهامي");
  if (section === "progress") return clickDashboardButton("تقدمي");

  if (section === "goals") {
    const goalCard = document.querySelector<HTMLButtonElement>(".child-main-section.section-goals");
    if (goalCard) {
      goalCard.click();
      return true;
    }

    if (!clickDashboardButton("الرئيسية")) return false;
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".child-main-section.section-goals")?.click();
    }, 40);
    return true;
  }

  return false;
}

function scheduleDashboardSection(section: ChildSection, attempt = 0) {
  if (activateDashboardSection(section) || attempt >= 40) return;
  window.setTimeout(() => scheduleDashboardSection(section, attempt + 1), 100);
}

export default function ChildSectionNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<ChildSection>(() => routeSection(pathname));

  useEffect(() => {
    if (pathname !== "/child") {
      setActive(routeSection(pathname));
      return;
    }

    const requested = new URLSearchParams(window.location.search).get("section") as ChildSection | null;
    if (requested && dashboardSections.includes(requested)) {
      setActive(requested);
      scheduleDashboardSection(requested);
    }

    const sync = () => setActive(detectDashboardSection());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname === "/child/login") return null;

  function openDashboardSection(section: ChildSection) {
    setActive(section);

    if (pathname !== "/child") {
      router.push(section === "home" ? "/child" : `/child?section=${section}`);
      return;
    }

    scheduleDashboardSection(section);
    const nextUrl = section === "home" ? "/child" : `/child?section=${section}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  const itemClass = (section: ChildSection) => active === section ? "active" : "";

  return (
    <>
      <div className="child-unified-nav-spacer" aria-hidden="true" />
      <nav className="child-section-nav child-unified-nav" aria-label="التنقل الرئيسي لحساب الطفل">
        <button className={itemClass("home")} type="button" onClick={() => openDashboardSection("home")}>
          <span>🏠</span><small>الرئيسية</small>
        </button>
        <button className={itemClass("tasks")} type="button" onClick={() => openDashboardSection("tasks")}>
          <span>✅</span><small>مهامي</small>
        </button>
        <Link className={itemClass("quran")} href="/child/quran">
          <span>📖</span><small>حفظي</small>
        </Link>
        <button className={itemClass("progress")} type="button" onClick={() => openDashboardSection("progress")}>
          <span>🚀</span><small>تقدمي</small>
        </button>
        <button className={itemClass("goals")} type="button" onClick={() => openDashboardSection("goals")}>
          <span>🎯</span><small>أهدافي</small>
        </button>
        <Link className={itemClass("gifts")} href="/child/gifts">
          <span>🎁</span><small>هداياي</small>
        </Link>
        <Link className={itemClass("notifications")} href="/child/notifications">
          <span>🔔</span><small>إشعاراتي</small>
        </Link>
      </nav>
    </>
  );
}
