"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ChildNotification = {
  id: string;
  type:
    | "gift"
    | "recognition"
    | "guardian_reply"
    | "teacher_reply"
    | "task"
    | "goal"
    | "quran"
    | "general";
  title: string;
  body: string | null;
  icon: string;
  action_type: string | null;
  action_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type ChildHomeExtras = {
  unread_count: number;
  notifications: ChildNotification[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function notificationCategory(notification: ChildNotification) {
  if (notification.type === "gift") return "هدية";
  if (notification.type === "recognition") return "تكريم";
  if (notification.type === "teacher_reply") return "المعلم";
  if (notification.type === "guardian_reply") return "ولي الأمر";
  if (notification.type === "task") return "مهمة";
  if (notification.type === "goal") return "هدف";
  if (notification.type === "quran") return "حفظ";
  return "إشعار";
}

export default function ChildNotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<ChildHomeExtras | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) {
      router.replace("/child/login");
      return;
    }
    const result = await client.rpc("get_child_home_extras", {
      p_session_token: token,
    });
    if (result.error || !result.data) {
      localStorage.removeItem("namaa_child_token");
      router.replace("/child/login");
      return;
    }
    setData(result.data as ChildHomeExtras);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(notification: ChildNotification) {
    if (notification.read_at || !supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;
    const readAt = new Date().toISOString();
    setData((current) =>
      current
        ? {
            ...current,
            unread_count: Math.max(0, current.unread_count - 1),
            notifications: current.notifications.map((item) =>
              item.id === notification.id ? { ...item, read_at: readAt } : item,
            ),
          }
        : current,
    );
    await supabase.rpc("child_mark_notification_read", {
      p_session_token: token,
      p_notification_id: notification.id,
    });
  }

  async function markAllRead() {
    if (!data?.unread_count || !supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;
    const readAt = new Date().toISOString();
    setData((current) =>
      current
        ? {
            ...current,
            unread_count: 0,
            notifications: current.notifications.map((item) => ({
              ...item,
              read_at: item.read_at || readAt,
            })),
          }
        : current,
    );
    await supabase.rpc("child_mark_all_notifications_read", {
      p_session_token: token,
    });
  }

  async function openNotification(notification: ChildNotification) {
    await markRead(notification);
    if (notification.action_type === "gift") router.push("/child/gifts");
    else if (notification.action_type === "quran") router.push("/child/quran");
    else if (
      notification.action_type === "task" ||
      notification.action_type === "goal"
    )
      router.push("/child");
  }

  if (loading || !data)
    return <main className="dashboard-loading">جارٍ تجهيز الإشعارات...</main>;

  return (
    <main className="child-notifications-page">
      <header className="child-app-header child-notifications-header">
        <div>
          <span className="section-label">🔔 مركز الإشعارات</span>
          <h1>إشعاراتي</h1>
          <p>كل جديد من ولي الأمر والمعلم والهدايا والبرامج.</p>
        </div>
        <Link className="quiet-button" href="/child">
          العودة
        </Link>
      </header>

      <section className="child-notifications-summary">
        <div>
          <span>غير مقروء</span>
          <strong>{data.unread_count}</strong>
        </div>
        {data.unread_count > 0 && (
          <button type="button" onClick={() => void markAllRead()}>
            تحديد الكل كمقروء
          </button>
        )}
      </section>

      {data.notifications.length === 0 ? (
        <section className="child-friendly-empty child-notifications-empty">
          <span>🌤️</span>
          <strong>لا توجد إشعارات بعد</strong>
          <p>ستظهر هنا المهام والهدايا وردود ولي الأمر والمعلم.</p>
        </section>
      ) : (
        <section
          className="child-notifications-list"
          aria-label="سجل إشعارات الطفل"
        >
          {data.notifications.map((notification) => (
            <button
              className={`child-notification-card ${notification.read_at ? "is-read" : "is-unread"}`}
              type="button"
              key={notification.id}
              onClick={() => void openNotification(notification)}
            >
              <span className="child-notification-icon">
                {notification.icon || "🔔"}
              </span>
              <span className="child-notification-copy">
                <span className="child-notification-meta">
                  <b>{notificationCategory(notification)}</b>
                  <time dateTime={notification.created_at}>
                    {formatDate(notification.created_at)}
                  </time>
                </span>
                <strong>{notification.title}</strong>
                {notification.body && <p>{notification.body}</p>}
              </span>
              {!notification.read_at && (
                <span
                  className="child-notification-dot"
                  aria-label="غير مقروء"
                />
              )}
              <span className="child-notification-arrow">←</span>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
