"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ChildGiftFullscreen from "./ChildGiftFullscreen";
import type { ChildGift } from "./gifts/types";

export default function ChildGiftAutoDisplay() {
  const pathname = usePathname();
  const [gift, setGift] = useState<ChildGift | null>(null);
  const busyRef = useRef(false);

  async function loadNextGift() {
    if (busyRef.current || pathname === "/child/login" || !supabase) return;
    const token = localStorage.getItem("namaa_child_token");
    if (!token) return;

    const result = await supabase.rpc("get_child_home_extras", { p_session_token: token });
    if (result.error || !result.data || busyRef.current) return;

    const gifts = Array.isArray(result.data.gifts) ? result.data.gifts as ChildGift[] : [];
    const nextGift = gifts.find((item) => item.status === "delivered" && item.gift.animation_key === "arabian_horse");
    if (!nextGift) return;

    busyRef.current = true;
    setGift(nextGift);
    await supabase.rpc("child_open_gift", {
      p_session_token: token,
      p_gift_id: nextGift.id
    });
  }

  useEffect(() => {
    if (pathname === "/child/login") {
      setGift(null);
      busyRef.current = false;
      return;
    }

    void loadNextGift();
    const timer = window.setInterval(() => {
      if (!gift) void loadNextGift();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [pathname, gift]);

  function finishGift() {
    setGift(null);
    busyRef.current = false;
    window.setTimeout(() => void loadNextGift(), 200);
  }

  if (!gift) return null;
  return <ChildGiftFullscreen gift={gift} onEnded={finishGift} />;
}
