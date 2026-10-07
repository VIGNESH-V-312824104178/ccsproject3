"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge, StatusDot } from "@/components/ui";

type Tone = "neon" | "danger" | "safe";

const MODULES: { id: string; tag: string; title: string; body: string; href: string; cta: string; tone: Tone; icon: React.ReactNode }[] = [
  {
    id: "module-sha512",
    tag: "01 / Integrity",
    title: "SHA-512 Password Hashing",
    body: "Passwords pass through a one-way SHA-512 digest on the server. Only the 128-character hex hash is written to SQLite. The plaintext never touches disk.",
    href: "/register",
    cta: "Register an identity",
    tone: "neon",
    icon: <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />,
  },
  {
    id: "module-sqli",
    tag: "02 / Web Security",
    title: "SQL Injection Lab",
    body: "Flip between a string-concatenated endpoint and a parameterized one. The executed SQL is rendered live so the attack mechanics are visible.",
    href: "/login",
    cta: "Launch the attack lab",
    tone: "danger",
    icon: <path d="M12 3 2 21h20L12 3zm0 6v5m0 3v.5" />,
  },
  {
    id: "module-aes",
    tag: "03 / Confidentiality",
    title: "AES-256-CBC Vault",
    body: "Notes are encrypted with a random IV and a per-user key before storage, then sealed with HMAC-SHA-512. Ciphertext and plaintext are shown side by side.",
    href: "/dashboard",
    cta: "Open the vault",
    tone: "safe",
    icon: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
];

const TONE: Record<Tone, { text: string; border: string; glow: string; bg: string }> = {
  neon: { text: "text-neon", border: "hover:border-neon/50", glow: "group-hover:shadow-neon", bg: "bg-neon/10" },
  danger: { text: "text-danger", border: "hover:border-danger/50", glow: "group-hover:shadow-danger", bg: "bg-danger/10" },
  safe: { text: "text-safe", border: "hover:border-safe/50", glow: "group-hover:shadow-safe", bg: "bg-safe/10" },
};

const PIPELINE = [
  { k: "input", v: "\"my secret note\"", c: "text-text" },
  { k: "HKDF-SHA512", v: "per-user 256-bit key", c: "text-violet" },
  { k: "AES-256-CBC", v: "random 16-byte IV", c: "text-neon" },
  { k: "HMAC-SHA512", v: "tamper seal", c: "text-warn" },
  { k: "SQLite", v: "Zm9vYmFy...==", c: "text-safe" },
];

export default function Home() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative pt-6 text-center sm:pt-12">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-center">
          <Badge tone="safe">
            <StatusDot tone="safe" /> systems nominal / zero external services
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mx-auto max-w-4xl text-4xl leading-tight font-black tracking-tight text-white sm:text-6xl"
        >
          The <span className="gradient-text animate-flicker">Secure Data Vault</span>
          <br />
          <span className="text-2xl font-semibold text-muted sm:text-4xl">break it, then lock it down.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        >
          A hands-on, fully offline lab for cryptographic hashing, SQL injection exploitation and defence, and symmetric
          encryption at rest. Built on Node <span className="font-mono text-neon">crypto</span>, Express and SQLite.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Link
            id="hero-cta-attack"
            href="/login"
            className="group relative overflow-hidden rounded-lg border border-danger/50 bg-danger/10 px-6 py-3 font-mono text-sm font-bold tracking-widest text-danger uppercase transition-all hover:shadow-danger"
          >
            <span className="relative z-10">{">"} Try &apos; OR 1=1 --</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-danger/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <Link
            id="hero-cta-register"
            href="/register"
            className="rounded-lg border border-neon/40 bg-neon/10 px-6 py-3 font-mono text-sm font-bold tracking-widest text-neon uppercase transition-all hover:shadow-neon"
          >
            Create account
          </Link>
        </motion.div>
      </section>

      {/* Modules */}
      <section className="grid gap-6 md:grid-cols-3">
        {MODULES.map((m, i) => {
          const t = TONE[m.tone];
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
              whileHover={{ y: -6 }}
            >
              <Link
                id={m.id}
                href={m.href}
                className={`group panel hud flex h-full flex-col p-6 transition-all duration-300 ${t.border} ${t.glow}`}
              >
                <div className={`mb-5 grid h-12 w-12 place-items-center rounded-xl border border-edge ${t.bg}`}>
                  <svg viewBox="0 0 24 24" className={`h-6 w-6 ${t.text}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {m.icon}
                  </svg>
                </div>
                <p className={`font-mono text-[11px] tracking-[0.25em] uppercase ${t.text}`}>{m.tag}</p>
                <h3 className="mt-2 text-xl font-bold text-white">{m.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{m.body}</p>
                <p className={`mt-6 flex items-center gap-2 font-mono text-xs font-semibold tracking-widest uppercase ${t.text}`}>
                  {m.cta}
                  <span className="transition-transform group-hover:translate-x-1.5">→</span>
                </p>
              </Link>
            </motion.div>
          );
        })}
      </section>

      {/* Pipeline */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="panel p-6 sm:p-8"
      >
        <p className="font-mono text-[11px] tracking-[0.3em] text-neon/80 uppercase">data-at-rest pipeline</p>
        <h2 className="mt-1 text-lg font-semibold text-white">What happens when you save a note</h2>
        <div className="mt-6 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {PIPELINE.map((p, i) => (
            <div key={p.k} className="flex flex-1 flex-col items-stretch gap-3 lg:flex-row lg:items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.12 }}
                className="flex-1 rounded-lg border border-edge bg-void/60 px-4 py-3 text-center"
              >
                <p className={`font-mono text-xs font-bold tracking-widest uppercase ${p.c}`}>{p.k}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">{p.v}</p>
              </motion.div>
              {i < PIPELINE.length - 1 && (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
                  className="self-center font-mono text-neon lg:rotate-0"
                >
                  <span className="hidden lg:inline">→</span>
                  <span className="lg:hidden">↓</span>
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
