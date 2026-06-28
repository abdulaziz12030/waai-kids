"use client";

import { useEffect, useRef } from "react";
import { GiftMotionType } from "./giftPreviewConfig";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "circle" | "spark" | "heart" | "star";
};

const palettes: Record<GiftMotionType, string[]> = {
  "arabian-horse": ["#ffe29a", "#f2b65f", "#fff5d6", "#d58a38"],
  "crown-drop": ["#fff2a7", "#f4c84d", "#ffffff", "#b98912"],
  "shield-shine": ["#a8ffd2", "#62c894", "#ffffff", "#d1f5df"],
  "quran-light": ["#fff9c8", "#c7f0d5", "#ffffff", "#8dc9a6"],
  "medal-spin": ["#d6f1ff", "#f7d071", "#ffffff", "#8ac9ef"],
  "warm-hearts": ["#ffd4d5", "#fff1e2", "#ffffff", "#f29ea8"],
  "star-burst": ["#fff074", "#7de8ff", "#ff9de2", "#ffffff"],
  "letter-open": ["#fff4cf", "#c9ebd2", "#ffffff", "#e0bd72"],
  "gift-float": ["#d8ffe4", "#ffe69a", "#ffffff", "#75c796"]
};

function shapeForMotion(motion: GiftMotionType): Particle["shape"] {
  if (motion === "warm-hearts") return "heart";
  if (motion === "star-burst") return "star";
  if (motion === "arabian-horse") return "circle";
  return "spark";
}

function drawStar(context: CanvasRenderingContext2D, size: number) {
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? size : size * 0.42;
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

function drawHeart(context: CanvasRenderingContext2D, size: number) {
  context.beginPath();
  context.moveTo(0, size * 0.7);
  context.bezierCurveTo(-size * 1.15, 0, -size * 0.75, -size * 0.9, 0, -size * 0.15);
  context.bezierCurveTo(size * 0.75, -size * 0.9, size * 1.15, 0, 0, size * 0.7);
  context.closePath();
  context.fill();
}

export default function GiftParticleCanvas({ motion, active }: { motion: GiftMotionType; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = 0;
    let pointerY = 0;
    const particles: Particle[] = [];
    const colors = palettes[motion];
    const defaultShape = shapeForMotion(motion);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnParticle(burst = false) {
      const isHorse = motion === "arabian-horse";
      const shape = burst && motion !== "arabian-horse" ? defaultShape : isHorse ? "circle" : defaultShape;
      const x = burst ? width * (0.35 + Math.random() * 0.3) : Math.random() * width;
      const y = burst ? height * (0.32 + Math.random() * 0.28) : Math.random() * height;
      const speed = burst ? 2.8 + Math.random() * 4 : 0.25 + Math.random() * 0.9;
      const angle = burst ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 0.65;
      const maxLife = burst ? 75 + Math.random() * 45 : 140 + Math.random() * 130;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: isHorse ? 2 + Math.random() * 5.5 : 2.5 + Math.random() * 7,
        alpha: 0,
        life: 0,
        maxLife,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape
      });
    }

    function onPointerMove(event: PointerEvent) {
      pointerX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 18;
      pointerY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 18;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    function draw() {
      frame += 1;
      context.clearRect(0, 0, width, height);

      const targetCount = Math.min(150, Math.max(60, Math.floor(width / 8)));
      const spawnRate = motion === "star-burst" ? 3 : motion === "arabian-horse" ? 2 : 1;
      for (let index = 0; index < spawnRate; index += 1) {
        if (particles.length < targetCount) spawnParticle(frame > 120 && frame < 180 && index === 0);
      }

      if (frame === 125 || frame === 150 || frame === 175) {
        for (let burst = 0; burst < 24; burst += 1) spawnParticle(true);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life += 1;
        particle.x += particle.vx + pointerX * 0.003;
        particle.y += particle.vy + pointerY * 0.003;
        particle.rotation += particle.spin;

        const progress = particle.life / particle.maxLife;
        particle.alpha = progress < 0.14 ? progress / 0.14 : Math.max(0, 1 - (progress - 0.7) / 0.3);

        if (motion === "arabian-horse") {
          particle.vx -= 0.012;
          particle.vy -= 0.006;
        } else {
          particle.vy -= 0.002;
        }

        if (particle.life >= particle.maxLife || particle.x < -80 || particle.x > width + 80 || particle.y < -80 || particle.y > height + 80) {
          particles.splice(index, 1);
          continue;
        }

        context.save();
        context.globalAlpha = particle.alpha * 0.88;
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        context.shadowColor = particle.color;
        context.shadowBlur = particle.shape === "circle" ? 8 : 16;

        if (particle.shape === "circle") {
          context.beginPath();
          context.arc(0, 0, particle.size, 0, Math.PI * 2);
          context.fill();
        } else if (particle.shape === "heart") {
          drawHeart(context, particle.size);
        } else if (particle.shape === "star") {
          drawStar(context, particle.size);
        } else {
          context.fillRect(-particle.size * 0.22, -particle.size, particle.size * 0.44, particle.size * 2);
          context.rotate(Math.PI / 2);
          context.fillRect(-particle.size * 0.22, -particle.size, particle.size * 0.44, particle.size * 2);
        }
        context.restore();
      }

      animationFrame = window.requestAnimationFrame(draw);
    }

    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [active, motion]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
