"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ChildGiftFullscreen from "./ChildGiftFullscreen";
import type { ChildGift } from "./gifts/types";

export default function ChildGiftAutoDisplay() {
  const pathname = usePathname();
  const [gift, setGift] = useState<ChildGift | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const busyRef = useRef(false);

  async function checkForNewGift() {
    if (busyRef.current || pathname === "/child/login" || !supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;

    const result = await supabase.rpc("get_child_home_extras", { p_session_token: token });
    if (result.error || !result.data || busyRef.current) return;

    const gifts = Array.isArray(result.data.gifts) ? result.data.gifts as ChildGift[] : [];
    const delivered = gifts.filter((item) => item.status === "delivered" && item.gift.animation_key === "arabian_horse");
    const deliveredIds = new Set(delivered.map((item) => item.id));

    if (knownIdsRef.current === null) {
      knownIdsRef.current = deliveredIds;
      return;
    }

    const nextGift = delivered.find((item) => !knownIdsRef.current?.has(item.id));
    knownIdsRef.current = deliveredIds;
    if (!nextGift) return;

    busyRef.current = true;
    setGift(nextGift);
    await supabase.rpc("child_open_gift", { p_session_token: token, p_gift_id: nextGift.id });
  }

  useEffect(() => {
    if (pathname === "/child/login") {
      setGift(null);
      knownIdsRef.current = null;
      busyRef.current = false;
      return;
    }

    void checkForNewGift();
    const timer = window.setInterval(() => { if (!gift) void checkForNewGift(); }, 3000);
    return () => window.clearInterval(timer);
  }, [pathname, gift]);

  function finishGift() {
    setGift(null);
    busyRef.current = false;
    window.setTimeout(() => void checkForNewGift(), 200);
  }

  if (!gift) return null;
  return <ChildGiftFullscreen gift={gift} onEnded={finishGift} />;
}
