"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ---------------- Panel ---------------- */
export function Panel({
  className = "",
  children,
  hud = false,
  ...rest
}: HTMLMotionProps<"div"> & { hud?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`panel ${hud ? "hud" : ""} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Button ---------------- */
type Variant = "neon" | "safe" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  neon: "bg-neon/10 text-neon border-neon/40 hover:bg-neon/20 hover:shadow-neon",
  safe: "bg-safe/10 text-safe border-safe/40 hover:bg-safe/20 hover:shadow-safe",
  danger: "bg-danger/10 text-danger border-danger/40 hover:bg-danger/20 hover:shadow-danger",
  ghost: "bg-transparent text-muted border-edge hover:text-text hover:border-neon/40",
};

export function Button({
  variant = "neon",
  className = "",
  loading = false,
  children,
  disabled,
  ...rest
}: HTMLMotionProps<"button"> & { variant?: Variant; loading?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-sm font-semibold tracking-wide uppercase transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children as React.ReactNode}
    </motion.button>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({
  tone = "neon",
  children,
  className = "",
}: {
  tone?: "neon" | "safe" | "danger" | "warn" | "violet" | "muted";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neon: "text-neon border-neon/30 bg-neon/5",
    safe: "text-safe border-safe/30 bg-safe/5",
    danger: "text-danger border-danger/30 bg-danger/5",
    warn: "text-warn border-warn/30 bg-warn/5",
    violet: "text-violet border-violet/30 bg-violet/5",
    muted: "text-muted border-edge bg-white/[0.02]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.15em] uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------------- Label ---------------- */
export function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
      <span>{children}</span>
      {hint && <span className="tracking-normal normal-case">{hint}</span>}
    </label>
  );
}

/* ---------------- Section heading ---------------- */
export function SectionTitle({ kicker, title, className = "" }: { kicker: string; title: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="font-mono text-[11px] tracking-[0.3em] text-neon/80 uppercase">{kicker}</p>
      <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

/* ---------------- Status dot ---------------- */
export function StatusDot({ tone = "safe" }: { tone?: "safe" | "danger" | "neon" }) {
  const c = tone === "safe" ? "bg-safe" : tone === "danger" ? "bg-danger" : "bg-neon";
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`absolute inset-0 rounded-full ${c} animate-pulse-ring`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${c}`} />
    </span>
  );
}

/* ---------------- Scramble / decrypt text effect ---------------- */
const GLYPHS = "ABCDEF0123456789#$%&*+/<>=?@[]{}";

export function ScrambleText({ text, duration = 900, className = "" }: { text: string; duration?: number; className?: string }) {
  const [out, setOut] = useState(text);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(p * text.length);
      let s = text.slice(0, revealed);
      for (let i = revealed; i < text.length; i++) {
        s += text[i] === " " || text[i] === "\n" ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setOut(s);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [text, duration]);

  return <span className={className}>{out}</span>;
}

/* ---------------- Copy button ---------------- */
export function CopyButton({ value, label = "copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="font-mono text-[10px] tracking-widest text-muted uppercase transition-colors hover:text-neon"
    >
      {copied ? "copied ✓" : label}
    </button>
  );
}
