"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import GiftCelebrationModal from "../components/GiftCelebrationModal";
import type { ChildGift } from "./gifts/types";
import styles from "./ChildExperienceLayer.module.css";

type ChildNotification = {
  id: string;
  type: "gift" | "recognition" | "guardian_reply" | "teacher_reply" | "task" | "goal" | "quran" | "general";
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
  gifts: ChildGift[];
};

const emptyExtras: ChildHomeExtras = {
  unread_count: 0,
  notifications: [],
  gifts: []
};

function formatNotificationDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const differenceMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return "الآن";
  if (differenceMinutes < 60) return `منذ ${differenceMinutes} دقيقة`;
  const hours = Math.floor(differenceMinutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date);
}

export default function ChildExperienceLayer() {
  const pathname = usePathname();
  const router = useRouter();
  const autoOpened = useRef(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  const [extras, setExtras] = useState<ChildHomeExtras>(emptyExtras);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<ChildGift | null>(null);
  const [giftQueue, setGiftQueue] = useState<ChildGift[]>([]);
  const [showGiftToast, setShowGiftToast] = useState(false);

  async function markNotificationRead(notificationId: string) {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token) return;

    setExtras((current) => {
      const notifications = current.notifications.map((notification) =>
        notification.id === notificationId && !notification.read_at
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      );
      return {
        ...current,
        notifications,
        unread_count: notifications.filter((notification) => !notification.read_at).length
      };
    });

    await client.rpc("child_mark_notification_read", {
      p_session_token: token,
      p_notification_id: notificationId
    });
  }

  async function openGift(gift: ChildGift, queue: ChildGift[] = [gift], automatic = false) {
    setGiftQueue(queue);
    setSelectedGift(gift);
    setMenuOpen(false);
    if (automatic) {
      setShowGiftToast(true);
      window.setTimeout(() => setShowGiftToast(false), 3200);
    }

    const giftNotification = extras.notifications.find(
      (notification) => notification.action_type === "gift" && notification.action_id === gift.id
    );
    if (giftNotification && !giftNotification.read_at) void markNotificationRead(giftNotification.id);

    if (!supabase || gift.status === "opened") return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;

    const result = await supabase.rpc("child_open_gift", {
      p_session_token: token,
      p_gift_id: gift.id
    });

    if (!result.error) {
      setExtras((current) => ({
        ...current,
        gifts: current.gifts.map((item) =>
          item.id === gift.id
            ? { ...item, status: "opened", opened_at: result.data?.opened_at || new Date().toISOString() }
            : item
        )
      }));
    }
  }

  function closeGift() {
    if (!selectedGift) return;
    const currentIndex = giftQueue.findIndex((gift) => gift.id === selectedGift.id);
    const nextGift = currentIndex >= 0 ? giftQueue[currentIndex + 1] : null;
    setSelectedGift(null);
    if (nextGift) {
      window.setTimeout(() => void openGift(nextGift, giftQueue, true), 260);
    } else {
      setGiftQueue([]);
    }
  }

  async function markAllRead() {
    const client = supabase;
    const token = localStorage.getItem("namaa_child_token");
    if (!client || !token || extras.unread_count === 0) return;

    const readAt = new Date().toISOString();
    setExtras((current) => ({
      ...current,
      unread_count: 0,
      notifications: current.notifications.map((notification) => ({ ...notification, read_at: notification.read_at || readAt }))
    }));
    await client.rpc("child_mark_all_notifications_read", { p_session_token: token });
  }

  async function openNotification(notification: ChildNotification) {
    if (!notification.read_at) await markNotificationRead(notification.id);
    setMenuOpen(false);

    if (notification.action_type === "gift" && notification.action_id) {
      const gift = extras.gifts.find((item) => item.id === notification.action_id);
      if (gift) {
        await openGift(gift);
        return;
      }
      router.push("/child/gifts");
      return;
    }

    if (notification.action_type === "quran") {
      router.push("/child/quran");
      return;
    }

    if (notification.action_type === "task" || notification.action_type === "goal") {
      router.push("/child");
    }
  }

  useEffect(() => {
    if (pathname === "/child/login") {
      autoOpened.current = false;
      setExtras(emptyExtras);
      setSelectedGift(null);
      setGiftQueue([]);
      setMenuOpen(false);
      return;
    }

    let active = true;
    async function loadExtras() {
      const client = supabase;
      const token = localStorage.getItem("namaa_child_token");
      if (!client || !token) return;

      const result = await client.rpc("get_child_home_extras", { p_session_token: token });
      if (!active || result.error || !result.data) return;

      const next = result.data as ChildHomeExtras;
      setExtras(next);
      const freshGifts = next.gifts.filter((gift) => gift.status === "delivered");
      if (freshGifts.length > 0 && !autoOpened.current) {
        autoOpened.current = true;
        const freshNotification = next.notifications.find(
          (notification) => notification.action_type === "gift" && notification.action_id === freshGifts[0].id
        );
        if (freshNotification && !freshNotification.read_at) void markNotificationRead(freshNotification.id);
        window.setTimeout(() => void openGift(freshGifts[0], freshGifts, true), 180);
      }
    }

    void loadExtras();
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/child") {
      setHeaderTarget(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setHeaderTarget(document.querySelector<HTMLElement>(".child-app-header"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutside(event: PointerEvent) {
      if (hostRef.current && !hostRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  if (pathname === "/child/login") return null;

  const notificationCenter = (
    <div ref={hostRef} className={headerTarget ? styles.headerHost : styles.fixedHost}>
      <button
        className={`${styles.bellButton} ${extras.unread_count > 0 ? styles.hasUnread : ""}`}
        type="button"
        aria-label={`الإشعارات${extras.unread_count ? `، ${extras.unread_count} غير مقروءة` : ""}`}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        🔔
        {extras.unread_count > 0 && <span className={styles.badge}>{extras.unread_count > 99 ? "99+" : extras.unread_count}</span>}
      </button>

      {menuOpen && (
        <section className={styles.panel} aria-label="قائمة إشعارات الطفل">
          <header className={styles.panelHeader}>
            <div><strong>إشعاراتي</strong><small>{extras.unread_count ? `${extras.unread_count} إشعار غير مقروء` : "اطلعت على جميع الإشعارات"}</small></div>
            {extras.unread_count > 0 && <button type="button" onClick={() => void markAllRead()}>تحديد الكل كمقروء</button>}
          </header>

          {extras.notifications.length === 0 ? (
            <div className={styles.empty}><span>🌤️</span><strong>لا توجد إشعارات بعد</strong><p>ستظهر هنا الهدايا والتكريم والمهام وردود ولي الأمر والمعلم.</p></div>
          ) : (
            <div className={styles.list}>
              {extras.notifications.map((notification) => (
                <button
                  className={`${styles.item} ${!notification.read_at ? styles.unread : ""}`}
                  type="button"
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                >
                  <span className={styles.itemIcon}>{notification.icon || "🔔"}</span>
                  <span className={styles.itemText}>
                    <strong>{notification.title}</strong>
                    {notification.body && <p>{notification.body}</p>}
                    <time dateTime={notification.created_at}>{formatNotificationDate(notification.created_at)}</time>
                  </span>
                  {!notification.read_at && <span className={styles.unreadDot} aria-label="غير مقروء" />}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );

  const childName = typeof window !== "undefined"
    ? localStorage.getItem("namaa_child_name") || "بطل واعي"
    : "بطل واعي";

  return (
    <>
      {headerTarget ? createPortal(notificationCenter, headerTarget) : notificationCenter}
      {showGiftToast && <div className={styles.giftToast}>🎁 وصلت هدية جديدة لك… استمتع بالمفاجأة!</div>}
      {selectedGift && (
        <GiftCelebrationModal
          gift={selectedGift.gift}
          childName={childName}
          achievement={selectedGift.achievement_title}
          reason={selectedGift.reason}
          mode="delivery"
          senderName={selectedGift.sender_name}
          certificateNumber={selectedGift.certificate_number}
          giftedAt={selectedGift.gifted_at}
          priceLabel="هدية إنجاز"
          autoStart
          onClose={closeGift}
        />
      )}
    </>
  );
}
