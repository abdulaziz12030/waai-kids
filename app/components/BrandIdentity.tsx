"use client";

import { useEffect } from "react";

const textReplacements: Array<[string, string]> = [
  ["نماء", "واعي"],
  ["NAMAA", "WAAI"],
  ["Namaa", "Waai"],
  ["namaa.sa", "waai.sa"],
  ["namaa.vercel.app", "waai.sa"]
];

const replaceBrandText = (value: string) =>
  textReplacements.reduce((result, [from, to]) => result.split(from).join(to), value);

const skippedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
const watchedAttributes = ["aria-label", "title", "alt", "placeholder"];

function updateNode(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const parent = current.parentElement;
    if (parent && !skippedTags.has(parent.tagName) && current.nodeValue) {
      const nextValue = replaceBrandText(current.nodeValue);
      if (nextValue !== current.nodeValue) current.nodeValue = nextValue;
    }
    current = walker.nextNode();
  }

  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of elements) {
    for (const attribute of watchedAttributes) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const nextValue = replaceBrandText(value);
      if (nextValue !== value) element.setAttribute(attribute, nextValue);
    }

    if (element instanceof HTMLAnchorElement && element.href) {
      const nextHref = element.href
        .replace("https://namaa.sa", "https://waai.sa")
        .replace("https://www.namaa.sa", "https://waai.sa")
        .replace("https://namaa.vercel.app", "https://waai.sa");
      if (nextHref !== element.href) element.href = nextHref;
    }
  }

  document.querySelectorAll<HTMLElement>(".brand-mark, .namaa-logo-mark").forEach((mark) => {
    if (mark.textContent?.trim() === "ن") mark.textContent = "و";
  });
}

export default function BrandIdentity() {
  useEffect(() => {
    document.documentElement.dataset.brand = "waai";
    updateNode(document.body);

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        updateNode(document.body);
        scheduled = false;
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: watchedAttributes
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
