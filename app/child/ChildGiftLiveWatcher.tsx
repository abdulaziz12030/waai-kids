"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ChildGiftLiveWatcher() {
  const pathname = usePathname();
  const knownGiftIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (pathname === "/child/login") return;
    let active = true;

    async function checkForNewGift() {
      const token = localStorage.getItem("namaa_child_token");
      if (!supabase || !token || !active) return;

      const result = await supabase.rpc("get_child_home_extras", { p_session_token: token });
      if (!active || result.error || !result.data) return;

      const gifts = Array.isArray(result.data.gifts) ? result.data.gifts : [];
      const deliveredIds = new Set<string>(
        gifts.filter((gift: { status?: string }) => gift.status === "delivered").map((gift: { id: string }) => gift.id)
      );

      if (knownGiftIds.current === null) {
        knownGiftIds.current = deliveredIds;
        return;
      }

      const hasNewGift = Array.from(deliveredIds).some((id) => !knownGiftIds.current?.has(id));
      knownGiftIds.current = deliveredIds;
      if (hasNewGift) window.location.reload();
    }

    void checkForNewGift();
    const timer = window.setInterval(() => void checkForNewGift(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
