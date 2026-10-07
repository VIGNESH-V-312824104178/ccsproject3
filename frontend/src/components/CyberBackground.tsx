"use client";

import { useEffect, useRef } from "react";

/** Subtle hex "data rain" on a canvas + grid + scanline. Pure client-side, no assets. */
export function CyberBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const chars = "0123456789ABCDEF";
    const size = 14;
    let cols = 0;
    let drops: number[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(window.innerWidth / size);
      drops = Array.from({ length: cols }, () => Math.random() * -60);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 60) return; // ~16 fps, cheap
      last = t;
      ctx.fillStyle = "rgba(4, 6, 12, 0.18)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = `${size - 2}px ui-monospace, monospace`;
      for (let i = 0; i < cols; i++) {
        if (i % 3 !== 0) continue; // sparse columns
        const y = drops[i] * size;
        ctx.fillStyle = Math.random() > 0.97 ? "rgba(61,255,160,0.55)" : "rgba(34,228,255,0.22)";
        ctx.fillText(chars[(Math.random() * chars.length) | 0], i * size, y);
        if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
    };
    if (!reduce) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={ref} className="absolute inset-0 opacity-40" />
      <div className="cyber-grid absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-32 animate-scan bg-gradient-to-b from-transparent via-neon/[0.04] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}
