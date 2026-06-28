"use client";

import { useEffect } from "react";

export default function BrandIdentity() {
  useEffect(() => {
    document.documentElement.dataset.brand = "waai";

    document.querySelectorAll<HTMLElement>(".brand-mark, .namaa-logo-mark").forEach((mark) => {
      if (mark.textContent?.trim() === "ن") mark.textContent = "و";
    });
  }, []);

  return null;
}
