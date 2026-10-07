"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LoginResult } from "@/lib/api";
import { Badge, SectionTitle } from "./ui";

function Verdict({ r }: { r: LoginResult }) {
  if (r.success && r.bypassed) {
    return { tone: "danger" as const, title: "ACCESS GRANTED - AUTHENTICATION BYPASSED", sub: `Logged in as "${r.user?.username}" without knowing the password.` };
  }
  if (r.success) {
    return { tone: "safe" as const, title: "ACCESS GRANTED", sub: `Valid credentials for "${r.user?.username}".` };
  }
  if (r.mode === "secure" && r.blocked) {
    return { tone: "safe" as const, title: "INJECTION BLOCKED", sub: "The payload was bound as a literal string. No user is literally named that." };
  }
  if ((r.rows?.length ?? 0) > 0) {
    return { tone: "danger" as const, title: "DATA EXFILTRATED", sub: r.error ?? "" };
  }
  return { tone: "warn" as const, title: "ACCESS DENIED", sub: r.error ?? "Invalid credentials" };
}

const TONES = {
  danger: "border-danger/50 shadow-danger text-danger text-glow-danger",
  safe: "border-safe/50 shadow-safe text-safe text-glow-safe",
  warn: "border-warn/40 shadow-none text-warn",
};

export function LoginOutcome({ r }: { r: LoginResult }) {
  const v = Verdict({ r });
  const rows = r.rows ?? [];
  const cols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`panel space-y-5 border p-6 ${TONES[v.tone].split(" ").slice(0, 2).join(" ")}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-muted uppercase">server verdict</p>
          <motion.h3
            initial={{ letterSpacing: "0.5em", opacity: 0 }}
            animate={{ letterSpacing: "0.08em", opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={`mt-1 font-mono text-lg font-black sm:text-xl ${TONES[v.tone].split(" ").slice(2).join(" ")}`}
          >
            {v.title}
          </motion.h3>
          <p className="mt-1 text-sm text-muted">{v.sub}</p>
        </div>
        {r.success && (
          <Link
            id="login-enter-vault"
            href="/dashboard"
            className="rounded-lg border border-neon/40 bg-neon/10 px-4 py-2 font-mono text-xs font-bold tracking-widest text-neon uppercase transition-all hover:shadow-neon"
          >
            Enter vault →
          </Link>
        )}
      </div>

      {r.detected.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
            injection signatures in input {r.mode === "secure" && "(harmless here)"}
          </p>
          <div className="flex flex-wrap gap-2">
            {r.detected.map((d, i) => (
              <motion.span key={d} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                <Badge tone={r.mode === "secure" ? "muted" : "danger"} className="normal-case tracking-normal">
                  {d}
                </Badge>
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {r.mode === "vulnerable" && r.error?.startsWith("SQLite error") && (
        <div className="rounded-lg border border-warn/40 bg-warn/5 p-3">
          <p className="font-mono text-[10px] tracking-[0.25em] text-warn uppercase">verbose error leaked to client</p>
          <p className="code-block mt-1 text-warn/90">{r.error}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <SectionTitle kicker={`${rows.length} row(s) returned to attacker`} title={<span className="text-danger">Leaked result set</span>} />
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-danger/30">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="sticky top-0 bg-abyss">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="border-b border-danger/20 px-3 py-2 font-semibold tracking-widest text-danger/80 uppercase">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="border-b border-edge/60 last:border-0 hover:bg-danger/5"
                  >
                    {cols.map((c) => (
                      <td key={c} className="max-w-[22rem] truncate px-3 py-2 text-text/80" title={String(row[c] ?? "")}>
                        {String(row[c] ?? "NULL")}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
